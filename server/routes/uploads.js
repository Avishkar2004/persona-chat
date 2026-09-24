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

// The extension comes from this list, never from the uploaded name: the app is
// served from this origin, so an uploaded .html or .svg would run as the viewer.
const EXT_BY_MIME = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "application/pdf": ".pdf",
};

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename(_req, file, cb) {
    const ext = EXT_BY_MIME[file.mimetype];
    cb(null, `u_${Date.now()}_${Math.random().toString(16).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
  fileFilter(_req, file, cb) {
    const ok = Object.hasOwn(EXT_BY_MIME, file.mimetype);
    const err = Object.assign(new Error("Only PNG, JPEG, GIF, WebP, MP4, WebM, MOV or PDF files are allowed"), { status: 415 });
    cb(ok ? null : err, ok);
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

