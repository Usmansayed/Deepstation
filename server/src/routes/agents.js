import { Router } from "express";
import { Startup } from "../models/index.js";
import { toBackendStartup } from "../services/startupMapper.js";
import { runDueDiligenceAgent } from "../lib/engine.js";

const router = Router();

router.post("/due-diligence", async (req, res, next) => {
  try {
    const { slug } = req.body ?? {};
    if (typeof slug !== "string" || !slug.trim()) {
      return res.status(400).json({ error: "Invalid payload", details: "slug is required" });
    }
    const doc = await Startup.findOne({ slug: slug.trim() });
    if (!doc) return res.status(404).json({ error: "Startup not found" });
    res.json(runDueDiligenceAgent(toBackendStartup(doc)));
  } catch (err) {
    next(err);
  }
});

export default router;
