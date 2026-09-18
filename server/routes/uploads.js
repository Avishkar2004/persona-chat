import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Store uploads in `server/uploads/`, or UPLOAD_DIR when a host mounts a
// persistent volume (a container's own disk is wiped on every deploy).
export const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext && ext.length < 12 ? ext : "";
    cb(null, `u_${Date.now()}_${Math.random().toString(16).slice(2)}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter(_req, file, cb) {
    const type = String(file.mimetype || "");
    const ok = type.startsWith("image/") || type.startsWith("video/") || type === "application/pdf";
    cb(ok ? null : new Error("Only image/video/pdf allowed"), ok);
  },
});

/**
 * POST /api/uploads
 * FormData: { file: <image|video|pdf> }
 *
 * Returns: { url, mime, originalName }
 */
router.post("/", requireAuth, upload.single("file"), async (req, res) => {
  const f = req.file;
  if (!f) return res.status(400).json({ message: "Missing file" });

  return res.status(201).json({
    url: `/uploads/${f.filename}`,
    mime: f.mimetype,
    originalName: f.originalname,
  });
});

export default router;

