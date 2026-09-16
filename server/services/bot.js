import User from "../models/User.js";
import { generateText } from "./llm.js";
import { getDmHistory, markDmRead, saveDmMessage } from "./messages.js";

/**
 * How an AI friend answers a DM: read the message, pause, type, then send one
 * to four short bubbles at human speed.
 */

const REPLY_MODEL = () => process.env.BOT_REPLY_MODEL || "gemini-3.5-flash";

const CONTEXT_MESSAGES = 30;
const MAX_BUBBLES = 4;
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

/** room → { again } for the reply currently being written in that room. */
const inFlight = new Map();
/** ownerId → timestamps of recent replies. */
const recentReplies = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const randomBetween = (min, max) => min + Math.random() * (max - min);

function withinRateLimit(ownerId) {
  const key = String(ownerId);
  const now = Date.now();
  const recent = (recentReplies.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    recentReplies.set(key, recent);
    return false;
  }
  recent.push(now);
  recentReplies.set(key, recent);
  return true;
}

function describeAttachment(attachment) {
  const mime = String(attachment?.mime || "");
  if (mime.startsWith("image/")) return "[sent a photo]";
  if (mime.startsWith("video/")) return "[sent a video]";
  if (mime === "application/pdf") return "[sent a PDF]";
  return "[sent a file]";
}

/** DM history as alternating user/assistant turns, starting with the user. */
function toConversation(history, botUsername) {
  const turns = [];
  for (const m of history) {
    const role = m.username === botUsername ? "assistant" : "user";
    const content = [m.attachment ? describeAttachment(m.attachment) : "", m.body]
      .filter(Boolean)
      .join("\n");
    if (!content) continue;

    const last = turns[turns.length - 1];
    if (last?.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns[0]?.role === "assistant") turns.shift();
  return turns;
}

function currentTime() {
  return new Date().toLocaleString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** One bubble per non-empty line, minus any "Name:" the model adds anyway. */
function toBubbles(text, botUsername) {
  const prefix = new RegExp(`^@?${botUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:\\s*`, "i");
  return text
    .split("\n")
    .map((line) => line.trim().replace(prefix, "").trim())
    .filter(Boolean)
    .slice(0, MAX_BUBBLES);
}

/** Blue ticks: the bot "opens" every message waiting for it. */
async function markReadAsBot({ io, room, botUsername }) {
  const read = await markDmRead(room, botUsername);
  if (!read) return;
  io.to(room).emit("dmReadReceipt", {
    readBy: botUsername,
    messageIds: read.messageIds,
    readAt: read.readAt,
  });
}

async function replyOnce({ io, pair }) {
  const { room, me: owner } = pair;
  const bot = await User.findById(pair.friend._id).select("username botOwner +botPersona");
  if (!bot?.botPersona || String(bot.botOwner) !== String(owner._id)) return;

  const typing = (isTyping) =>
    io.to(room).emit("dmTyping", { roomId: room, username: bot.username, isTyping });

  await markReadAsBot({ io, room, botUsername: bot.username });

  // Messages sent during this pause land in the history below, which is what
  // turns three quick texts into one answer.
  await sleep(randomBetween(800, 2000));

  const history = await getDmHistory(room, CONTEXT_MESSAGES);
  const conversation = toConversation(history, bot.username);
  // Nothing new since the bot last spoke (e.g. a queued re-run already answered).
  if (conversation[conversation.length - 1]?.role !== "user") return;
  if (!withinRateLimit(owner._id)) return;

  typing(true);
  const typingSince = Date.now();

  try {
    const text = await generateText({
      model: REPLY_MODEL(),
      system: bot.botPersona.replaceAll("{{now}}", currentTime()),
      messages: conversation,
      maxTokens: 300,
      thinking: "MINIMAL",
    });

    const bubbles = toBubbles(text, bot.username);
    // Deleted while we were waiting on the model.
    if (!bubbles.length || !(await User.exists({ _id: bot._id }))) return;

    for (const [i, body] of bubbles.entries()) {
      const typeFor = clamp(body.length * 45, 700, 3000);
      // The model call already looked like typing for the first bubble.
      await sleep(i === 0 ? Math.max(0, typeFor - (Date.now() - typingSince)) : typeFor);
      if (i > 0) typing(true);

      const message = await saveDmMessage({
        roomId: room,
        username: bot.username,
        to: owner.username,
        body,
        attachment: null,
      });
      io.to(room).emit("dmMessage", message);
    }
  } finally {
    typing(false);
  }
}

/**
 * Answer the latest human message in a bot DM. One reply runs per room; a
 * message that arrives mid-reply queues exactly one more pass, which answers
 * everything that came in meanwhile.
 */
export async function replyAsBot({ io, pair }) {
  const running = inFlight.get(pair.room);
  if (running) {
    running.again = true;
    await markReadAsBot({ io, room: pair.room, botUsername: pair.friend.username });
    return;
  }

  const state = { again: false };
  inFlight.set(pair.room, state);
  try {
    do {
      state.again = false;
      await replyOnce({ io, pair });
    } while (state.again);
  } finally {
    inFlight.delete(pair.room);
  }
}
