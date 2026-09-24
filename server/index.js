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
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      // Files from before the type allowlist may be .html or .svg; they must not run
      // scripts. Allowed types skip this: a sandbox also blocks Chrome's PDF viewer.
      if (!/\.(png|jpg|jpeg|gif|webp|mp4|webm|mov|pdf)$/i.test(filePath)) {
        res.setHeader("Content-Security-Policy", "sandbox");
      }
    },
  }),
);

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

// Multer and body-parser errors would otherwise come back as an HTML page,
// and the client only reads `message` from a JSON body.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const tooLarge = err.code === "LIMIT_FILE_SIZE" || err.type === "entity.too.large";
  const status = tooLarge ? 413 : err.status || err.statusCode || 500;
  // `expose: false` marks internal errors, e.g. sendFile's file-system paths.
  const safe = status < 500 && err.expose !== false;
  const message = tooLarge ? "File or request is too large" : safe ? err.message : "Server error";
  res.status(status).json({ message });
});

const httpServer = http.createServer(app);
initSocket(httpServer, { corsOrigin });

httpServer.listen(PORT, () => {
  console.log(`Server is up on ${PORT} (HTTP + Socket.IO)`);
});