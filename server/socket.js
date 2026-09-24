import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import User from "./models/User.js";
import {
  getDmHistory,
  getRoomHistory,
  markDmRead,
  saveDmMessage,
  saveRoomMessage,
} from "./services/messages.js";
import { replyAsBot } from "./services/bot.js";
import { loadFriendPair, parseCookies } from "./socket/helpers.js";
import {
  addPresenceConnection,
  isUserOnline,
  removePresenceConnection,
} from "./socket/presence.js";

/** Every socket a user has open joins this room, so we can reach all their tabs. */
const userRoom = (userId) => `user:${userId}`;

/** The only rooms a client may join by name. DM and user rooms are joined server side. */
const PUBLIC_ROOMS = new Set(["general", "help"]);

/** Current friend ids, so a removed friend stops getting presence updates. */
async function currentFriendIds(userId) {
  const me = await User.findById(userId).select("friends");
  return (me?.friends || []).map(String);
}

/** Tell someone's friends that they came online or went offline. */
function broadcastPresence(io, friendIds, payload) {
  for (const friendId of friendIds || []) {
    io.to(userRoom(friendId)).emit("presence", payload);
  }
}

/** Send one socket the current status of everyone on its friends list. */
async function sendPresenceSnapshot(socket, friendIds) {
  const friends = await User.find({ _id: { $in: friendIds || [] } }).select(
    "_id username lastSeenAt isBot",
  );
  socket.emit("presenceSnapshot", {
    users: friends.map((friend) => {
      // AI friends have no sockets, and are always around to reply.
      const online = friend.isBot || isUserOnline(friend._id);
      return {
        username: friend.username,
        online,
        lastSeenAt: online ? null : friend.lastSeenAt || null,
      };
    }),
  });
}

function attachmentFromPayload(attachment) {
  const url = attachment?.url ? String(attachment.url).trim() : "";
  const mime = attachment?.mime ? String(attachment.mime).trim() : "";
  const hasAttachment = Boolean(url && mime);
  if (hasAttachment && !url.startsWith("/uploads/")) return null;
  return hasAttachment ? { url, mime } : null;
}

/** Socket.IO for public rooms and friend DMs (messages stored in MongoDB). */
export function initSocket(httpServer, { corsOrigin }) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.on("connection", (socket) => {
    socket.data.userId = null;
    socket.data.username = null;
    socket.data.roomId = null;
    socket.data.dmRoomId = null;
    socket.data.friendIds = [];
    socket.data.presenceCounted = false;

    try {
      const cookies = parseCookies(socket.handshake.headers?.cookie);
      const token = cookies.token;
      const secret = process.env.JWT_SECRET;
      if (token && secret) {
        const payload = jwt.verify(token, secret);
        socket.data.userId = payload.sub;
      }
    } catch {
      // unauthenticated socket
    }

    async function goOnline() {
      const me = await User.findById(socket.data.userId).select(
        "_id username friends",
      );
      // The socket can drop while that query is in flight. Counting it now
      // would leave the user online forever, because the disconnect handler
      // has already run and found nothing to decrement.
      if (!me || !socket.connected) return;

      socket.data.username = me.username;
      socket.data.friendIds = (me.friends || []).map(String);
      socket.data.presenceCounted = true;
      socket.join(userRoom(me._id));

      if (addPresenceConnection(me._id)) {
        broadcastPresence(io, socket.data.friendIds, {
          username: me.username,
          online: true,
          lastSeenAt: null,
        });
      }

      await sendPresenceSnapshot(socket, socket.data.friendIds);
    }

    if (socket.data.userId) {
      goOnline().catch(() => {
        // Presence is best effort — the rest of the socket still works.
      });
    }

    // Accepting or removing a friend changes who this socket cares about.
    socket.on("presenceSync", async () => {
      if (!socket.data.userId) return;
      try {
        const me = await User.findById(socket.data.userId).select("friends");
        if (!me) return;
        socket.data.friendIds = (me.friends || []).map(String);
        await sendPresenceSnapshot(socket, socket.data.friendIds);
      } catch {
        // ignore
      }
    });

    socket.on("joinRoom", async ({ roomId } = {}) => {
      const safeRoomId = String(roomId || "").trim();
      if (!PUBLIC_ROOMS.has(safeRoomId) || !socket.data.userId) return;

      try {
        const me = await User.findById(socket.data.userId).select("_id username");
        if (!me) return;

        socket.data.username = me.username;
        socket.data.roomId = safeRoomId;
        socket.join(safeRoomId);

        const history = await getRoomHistory(safeRoomId);
        socket.emit("roomHistory", { roomId: safeRoomId, messages: history });

        io.to(safeRoomId).emit("userJoined", { roomId: safeRoomId, username: me.username });
      } catch {
        // ignore
      }
    });

    socket.on("sendMessage", async ({ roomId, body, attachment } = {}) => {
      const safeRoomId = String(roomId || "").trim();
      const safeBody = String(body || "").trim();
      const safeAttachment = attachmentFromPayload(attachment);
      if (!PUBLIC_ROOMS.has(safeRoomId) || (!safeBody && !safeAttachment)) return;
      if (safeBody.length > 2000) return;
      if (!socket.data.userId) return;

      try {
        const message = await saveRoomMessage({
          roomId: safeRoomId,
          username: socket.data.username || "Anonymous",
          body: safeBody,
          attachment: safeAttachment,
        });
        io.to(safeRoomId).emit("message", message);
      } catch {
        // ignore
      }
    });

    socket.on("typing", ({ roomId, isTyping } = {}) => {
      const safeRoomId = String(roomId || "").trim();
      if (!PUBLIC_ROOMS.has(safeRoomId) || !socket.data.username) return;
      socket.to(safeRoomId).emit("typing", {
        roomId: safeRoomId,
        username: socket.data.username,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("joinDm", async ({ friendUsername } = {}) => {
      try {
        const pair = await loadFriendPair(socket.data.userId, friendUsername);
        if (!pair) return;

        socket.data.username = pair.me.username;
        socket.data.dmRoomId = pair.room;
        socket.join(pair.room);

        const history = await getDmHistory(pair.room);
        socket.emit("dmHistory", {
          friendUsername: pair.friend.username,
          messages: history,
        });

        // Not marked read here: joining happens on reconnect and while the chat
        // is hidden. The client sends dmMarkRead once the chat is on screen.

        io.to(pair.room).emit("dmUserJoined", {
          roomId: pair.room,
          username: pair.me.username,
        });
      } catch {
        // ignore
      }
    });

    socket.on("dmMessage", async ({ friendUsername, body, attachment } = {}) => {
      try {
        const safeBody = String(body || "").trim();
        const safeAttachment = attachmentFromPayload(attachment);
        if (!safeBody && !safeAttachment) return;
        if (safeBody.length > 2000) return;

        const pair = await loadFriendPair(socket.data.userId, friendUsername);
        if (!pair) return;

        const message = await saveDmMessage({
          roomId: pair.room,
          username: pair.me.username,
          to: pair.friend.username,
          body: safeBody,
          attachment: safeAttachment,
        });
        // User rooms too, so it arrives even when that chat is not open.
        io.to(pair.room)
          .to(userRoom(pair.me._id))
          .to(userRoom(pair.friend._id))
          .emit("dmMessage", message);

        // Not awaited: the reply takes seconds and must not hold up this handler.
        if (pair.friend.isBot) {
          replyAsBot({ io, pair }).catch((err) => {
            console.error("[bot] reply failed:", err?.message || err);
          });
        }
      } catch {
        // ignore
      }
    });

    socket.on("dmMarkRead", async ({ friendUsername } = {}) => {
      try {
        const pair = await loadFriendPair(socket.data.userId, friendUsername);
        if (!pair) return;

        const read = await markDmRead(pair.room, pair.me.username);
        if (!read) return;

        io.to(pair.room).emit("dmReadReceipt", {
          readBy: pair.me.username,
          messageIds: read.messageIds,
          readAt: read.readAt,
        });
      } catch {
        // ignore
      }
    });

    socket.on("dmTyping", async ({ friendUsername, isTyping } = {}) => {
      try {
        const pair = await loadFriendPair(socket.data.userId, friendUsername);
        if (!pair) return;
        socket.to(pair.room).emit("dmTyping", {
          roomId: pair.room,
          username: pair.me.username,
          isTyping: Boolean(isTyping),
        });
      } catch {
        // ignore
      }
    });

    socket.on("disconnect", async () => {
      const { roomId, username, userId, friendIds } = socket.data;
      if (roomId && username) {
        io.to(roomId).emit("userLeft", { roomId, username });
      }

      // Only the last tab going means the person actually left.
      if (!socket.data.presenceCounted) return;
      if (!removePresenceConnection(userId)) return;

      const lastSeenAt = new Date();
      let notify = friendIds;
      try {
        await User.updateOne({ _id: userId }, { $set: { lastSeenAt } });
        notify = await currentFriendIds(userId);
      } catch {
        // ignore
      }
      // A refresh can reconnect while those queries run.
      if (isUserOnline(userId)) return;
      broadcastPresence(io, notify, { username, online: false, lastSeenAt });
    });
  });

  return io;
}
