import User from "../models/User.js";

export function parseCookies(cookieHeader) {
  const header = String(cookieHeader || "");
  const out = {};
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (!key) continue;
    out[key] = decodeURIComponent(rest.join("="));
  }
  return out;
}

export function dmRoomId(userIdA, userIdB) {
  const ids = [String(userIdA), String(userIdB)].sort();
  return `dm:${ids[0]}:${ids[1]}`;
}

/** Load both users and confirm they are mutual friends. */
export async function loadFriendPair(meId, friendUsername) {
  const safeFriend = String(friendUsername || "").trim().replace(/^@/, "");
  if (!safeFriend || !meId) return null;

  const [me, friend] = await Promise.all([
    User.findById(meId).select("_id username friends"),
    User.findOne({ username: safeFriend }).select("_id username friends isBot"),
  ]);
  if (!me || !friend) return null;

  const areFriends =
    me.friends?.some((id) => String(id) === String(friend._id)) &&
    friend.friends?.some((id) => String(id) === String(me._id));
  if (!areFriends) return null;

  return { me, friend, room: dmRoomId(me._id, friend._id) };
}
