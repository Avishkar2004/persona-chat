import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { buildPersona } from "../services/botProfile.js";
import { countSenders, parseChatLog } from "../services/chatLog.js";
import { dmRoomId } from "../socket/helpers.js";

const MIN_MESSAGES = 30;
const MAX_DISPLAY_NAME = 32;

function readChatLog(body) {
  const chatLog = typeof body?.chatLog === "string" ? body.chatLog : "";
  return chatLog.trim() ? parseChatLog(chatLog) : null;
}

/** "Gayatri N." → "Gayatri_N", then "Gayatri_N_2" if that is taken. */
async function uniqueUsername(displayName) {
  let base = displayName
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 28);
  if (base.length < 3) base = `${base || "ai"}_friend`.slice(0, 28);

  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? base : `${base}_${n}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  return `${base.slice(0, 20)}_${crypto.randomBytes(3).toString("hex")}`;
}

export async function previewNames(req, res) {
  try {
    const messages = readChatLog(req.body);
    if (!messages?.length) {
      return res
        .status(400)
        .json({ message: "No messages found. Paste a WhatsApp chat export." });
    }
    return res.json({ names: countSenders(messages) });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function createBot(req, res) {
  try {
    const displayName = String(req.body?.displayName || "").trim();
    const personName = String(req.body?.personName || "").trim();
    if (!displayName || displayName.length > MAX_DISPLAY_NAME) {
      return res
        .status(400)
        .json({ message: `Give it a name up to ${MAX_DISPLAY_NAME} characters` });
    }
    if (!personName) {
      return res.status(400).json({ message: "Pick whose texting style to copy" });
    }

    const messages = readChatLog(req.body);
    if (!messages?.length) {
      return res
        .status(400)
        .json({ message: "No messages found. Paste a WhatsApp chat export." });
    }

    const count = messages.filter((m) => m.name === personName).length;
    if (count < MIN_MESSAGES) {
      return res
        .status(400)
        .json({ message: `Need at least ${MIN_MESSAGES} messages from ${personName}` });
    }

    let botPersona;
    try {
      botPersona = await buildPersona({
        messages,
        personName,
        displayName,
        ownerUsername: req.user.username,
      });
    } catch (err) {
      console.error("[bots] analysis failed:", err?.message || err);
      return res
        .status(502)
        .json({ message: "Couldn’t read that chat right now. Try again in a minute." });
    }

    const bot = await User.create({
      email: `bot-${crypto.randomBytes(8).toString("hex")}@bots.local`,
      username: await uniqueUsername(displayName),
      // Nobody knows this password, and login refuses bots regardless.
      passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12),
      isBot: true,
      botOwner: req.user._id,
      botPersona,
      friends: [req.user._id],
    });
    await User.updateOne({ _id: req.user._id }, { $addToSet: { friends: bot._id } });

    return res
      .status(201)
      .json({ bot: { id: bot._id, username: bot.username, isBot: true } });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}

export async function deleteBot(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ message: "AI friend not found" });
    }

    const bot = await User.findOne({ _id: id, isBot: true, botOwner: req.user._id }).select(
      "_id",
    );
    if (!bot) return res.status(404).json({ message: "AI friend not found" });

    await Promise.all([
      Message.deleteMany({ kind: "dm", roomId: dmRoomId(req.user._id, bot._id) }),
      User.updateOne({ _id: req.user._id }, { $pull: { friends: bot._id } }),
    ]);
    await User.deleteOne({ _id: bot._id });

    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
}
