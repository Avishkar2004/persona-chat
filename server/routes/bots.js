import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { createBot, deleteBot, previewNames } from "../controllers/botsController.js";

const router = Router();

router.post("/preview", requireAuth, previewNames);
router.post("/", requireAuth, createBot);
router.delete("/:id", requireAuth, deleteBot);

export default router;
