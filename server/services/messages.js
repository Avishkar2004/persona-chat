import Message from "../models/Message.js";

const HISTORY_LIMIT = 100;

export function serializeMessage(doc) {
  const createdAt = doc.createdAt ? new Date(doc.createdAt) : new Date();
  return {
    id: String(doc._id),
    roomId: doc.roomId,
    username: doc.username,
    to: doc.to || undefined,
    body: doc.body || "",
    attachment: doc.attachment || null,
    readAt: doc.readAt ? new Date(doc.readAt).getTime() : null,
    ts: createdAt.getTime(),
  };
}

/** Mark DM messages sent to viewerUsername as read (for read receipts). */
export async function markDmRead(dmRoomId, viewerUsername) {
  const readAt = new Date();
  const result = await Message.updateMany(
    {
      kind: "dm",
      roomId: dmRoomId,
      to: viewerUsername,
      username: { $ne: viewerUsername },
      readAt: null,
    },
    { $set: { readAt } },
  );

  if (!result.modifiedCount) return null;

  const docs = await Message.find({
    kind: "dm",
    roomId: dmRoomId,
    to: viewerUsername,
    username: { $ne: viewerUsername },
    readAt,
  })
    .select("_id username")
    .lean();

  return {
    readAt: readAt.getTime(),
    messageIds: docs.map((d) => String(d._id)),
  };
}

export async function saveRoomMessage({ roomId, username, body, attachment }) {
  const doc = await Message.create({
    kind: "room",
    roomId,
    username,
    body,
    attachment,
  });
  return serializeMessage(doc);
}

export async function saveDmMessage({ roomId, username, to, body, attachment }) {
  const doc = await Message.create({
    kind: "dm",
    roomId,
    username,
    to,
    body,
    attachment,
  });
  return serializeMessage(doc);
}

export async function getRoomHistory(roomId) {
  const docs = await Message.find({ kind: "room", roomId })
    .sort({ createdAt: -1 })
    .limit(HISTORY_LIMIT)
    .lean();
  return docs.reverse().map(serializeMessage);
}

export async function getDmHistory(dmRoomId, limit = HISTORY_LIMIT) {
  const docs = await Message.find({ kind: "dm", roomId: dmRoomId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return docs.reverse().map(serializeMessage);
}
