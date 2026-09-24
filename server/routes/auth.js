import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  };
}

function signToken(userId) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET");
  return jwt.sign({}, secret, { subject: String(userId), expiresIn: "7d" });
}

router.post("/register", async (req, res) => {
  try {
    const { email, username, password } = req.body ?? {};

    if (!email || !username || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password too short" });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedUsername = String(username).trim();
    // Reserved for AI friend accounts.
    if (normalizedEmail.endsWith("@bots.local")) {
      return res.status(400).json({ message: "That email can’t be used" });
    }

    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    }).select("_id");
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash,
    });

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());
    return res.status(201).json({
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (err) {
    // Two signups for the same name can both pass the check above.
    if (err?.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body ?? {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const login = String(emailOrUsername).trim();
    const maybeEmail = login.toLowerCase();

    const user = await User.findOne({
      $or: [{ email: maybeEmail }, { username: login }],
    }).select("+passwordHash email username isBot");

    // AI friends are accounts, but nobody may sign in as one.
    if (!user || user.isBot) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user._id);
    res.cookie("token", token, cookieOptions());
    return res.json({
      user: { id: user._id, email: user.email, username: user.username },
    });
  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      email: req.user.email,
      username: req.user.username,
    },
  });
});

export default router;

