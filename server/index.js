import express from "express";
import http from "http";
import connectDB from "./config/db.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth.js";
import friendsRouter from "./routes/friends.js";
import morgan from "morgan"
import { initSocket } from "./socket.js";
import uploadsRouter, { uploadDir } from "./routes/uploads.js";
import botsRouter from "./routes/bots.js";
import fs from "fs";
import { fileURLToPath } from "url";
const PORT = process.env.PORT || 8000
const app = express();

connectDB();

// A pasted WhatsApp export can run to a few MB; every other route keeps the
// 100kb default. Whichever parser runs first wins, so this must come first.
app.use("/api/bots", express.json({ limit: "10mb" }));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
const corsOrigin = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Serve uploaded images/videos
app.use("/uploads", express.static(uploadDir));

app.use("/api/auth", authRouter);
app.use("/api/friends", friendsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/bots", botsRouter);

// In production the React build is served from here too, so the app, API and
// auth cookie share one origin. Any other page URL gets index.html for the router.
const clientBuild = fileURLToPath(new URL("../client/build", import.meta.url));
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get(/^\/(?!api\/|uploads\/|static\/)/, (req, res) => {
    res.sendFile("index.html", { root: clientBuild });
  });
}

const httpServer = http.createServer(app);
initSocket(httpServer, { corsOrigin });

httpServer.listen(PORT, () => {
  console.log(`Server is up on ${PORT} (HTTP + Socket.IO)`);
});