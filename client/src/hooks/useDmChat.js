import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { appendMessage } from "../lib/messages";

function toUiMessage(raw, myUsername) {
  const mine = raw.username === myUsername;
  const friendKey = mine ? raw.to : raw.username;
  return {
    ui: {
      id: raw.id,
      author: raw.username,
      body: raw.body || "",
      attachment: raw.attachment || null,
      ts: raw.ts,
      mine,
      read: Boolean(raw.readAt),
    },
    friendKey,
  };
}

/**
 * DM threads, typing, and Socket.IO events for friend conversations.
 *
 * `active` is whether the selected chat is on screen. Only then is it marked
 * read, so the friend's "Seen" means you actually saw it.
 */
export function useDmChat({ socketRef, username, selectedFriend, active }) {
  const [threads, setThreads] = useState({});
  const [typingUser, setTypingUser] = useState("");

  const usernameRef = useRef(username);
  const selectedFriendRef = useRef(selectedFriend);
  const activeRef = useRef(active);
  const typingTimerRef = useRef(null);

  const messages = useMemo(
    () => (selectedFriend?.username ? threads[selectedFriend.username] || [] : []),
    [threads, selectedFriend?.username],
  );

  useEffect(() => {
    usernameRef.current = username;
  }, [username]);

  useEffect(() => {
    selectedFriendRef.current = selectedFriend;
  }, [selectedFriend]);

  // "Seen" has to mean seen: only while this chat is on screen and the browser
  // tab is in front. Loading history or getting a message is not enough.
  const markRead = useCallback(() => {
    const socket = socketRef.current;
    const friend = selectedFriendRef.current;
    if (!activeRef.current || document.visibilityState !== "visible") return;
    if (!socket?.connected || !friend?.username) return;
    socket.emit("dmMarkRead", { friendUsername: friend.username });
  }, [socketRef]);

  const joinActiveDm = useCallback(() => {
    const socket = socketRef.current;
    const friend = selectedFriendRef.current;
    if (!socket?.connected || !friend?.username) return;
    setTypingUser("");
    socket.emit("joinDm", { friendUsername: friend.username });
  }, [socketRef]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onDmHistory = ({ friendUsername, messages }) => {
      const friend = selectedFriendRef.current;
      if (!friendUsername || !friend || friend.username !== friendUsername) return;
      setThreads((prev) => ({
        ...prev,
        [friendUsername]: (messages || []).map((m) => {
          const { ui } = toUiMessage(m, usernameRef.current);
          return ui;
        }),
      }));
      markRead();
    };

    const onDmMessage = (message) => {
      if (!message) return;
      const { ui, friendKey } = toUiMessage(message, usernameRef.current);
      setThreads((prev) => ({
        ...prev,
        [friendKey]: appendMessage(prev[friendKey] || [], ui),
      }));

      // markRead covers the open chat only, so a message from anyone else
      // must not trigger it.
      if (!ui.mine && friendKey === selectedFriendRef.current?.username) {
        markRead();
      }
    };

    const onDmReadReceipt = ({ readBy, messageIds, readAt }) => {
      if (!readBy || !messageIds?.length) return;
      const ids = new Set(messageIds);
      setThreads((prev) => {
        const list = prev[readBy];
        if (!list?.length) return prev;
        return {
          ...prev,
          [readBy]: list.map((m) =>
            m.mine && ids.has(m.id) ? { ...m, read: true, readAt } : m,
          ),
        };
      });
    };

    const onDmTyping = (payload) => {
      if (!payload) return;
      if (payload.username === usernameRef.current) return;
      const friend = selectedFriendRef.current;
      if (!friend || payload.username !== friend.username) return;
      // Their composer sends this on every keystroke, but a tab closed
      // mid-draft never sends isTyping:false. Time out instead of waiting.
      clearTimeout(typingTimerRef.current);
      if (payload.isTyping) {
        typingTimerRef.current = setTimeout(() => setTypingUser(""), 5000);
      }
      setTypingUser(payload.isTyping ? payload.username : "");
    };

    const onDisconnect = () => setTypingUser("");

    socket.on("dmHistory", onDmHistory);
    socket.on("dmMessage", onDmMessage);
    socket.on("dmReadReceipt", onDmReadReceipt);
    socket.on("dmTyping", onDmTyping);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("dmHistory", onDmHistory);
      socket.off("dmMessage", onDmMessage);
      socket.off("dmReadReceipt", onDmReadReceipt);
      socket.off("dmTyping", onDmTyping);
      socket.off("disconnect", onDisconnect);
      clearTimeout(typingTimerRef.current);
    };
  }, [socketRef, markRead]);

  useEffect(() => {
    joinActiveDm();
  }, [selectedFriend?.username, joinActiveDm]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("connect", joinActiveDm);
    return () => socket.off("connect", joinActiveDm);
  }, [socketRef, joinActiveDm]);

  // The chat just came on screen, so whatever is in it has been seen. This runs
  // after the selectedFriend effect above, so it marks the new friend's chat.
  useEffect(() => {
    activeRef.current = active;
    if (active) markRead();
  }, [active, markRead]);

  // A chat left open in a background tab is read when you switch back to it.
  useEffect(() => {
    document.addEventListener("visibilitychange", markRead);
    return () => document.removeEventListener("visibilitychange", markRead);
  }, [markRead]);

  function emitTyping(isTyping) {
    const friend = selectedFriendRef.current;
    const socket = socketRef.current;
    if (!socket?.connected || !friend?.username) return;
    socket.emit("dmTyping", { friendUsername: friend.username, isTyping });
  }

  /** Returns false when offline, so the caller keeps the draft. */
  function sendMessage({ body, attachment }) {
    const friend = selectedFriendRef.current;
    const socket = socketRef.current;
    if (!socket?.connected || !friend?.username) return false;
    socket.emit("dmMessage", {
      friendUsername: friend.username,
      body,
      attachment,
    });
    socket.emit("dmTyping", { friendUsername: friend.username, isTyping: false });
    return true;
  }

  function clearThread(friendUsername) {
    setThreads((prev) => {
      const next = { ...prev };
      delete next[friendUsername];
      return next;
    });
  }

  return {
    messages,
    typingUser,
    emitTyping,
    sendMessage,
    clearThread,
  };
}
