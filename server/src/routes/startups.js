import { Router } from "express";
import { Startup, StartupFollow } from "../models/index.js";
import { mapStartupListResponse, mapStartupDetailResponse } from "../services/startupMapper.js";

const router = Router();

router.get("/", async (_req, res, next) => {
  try {
    const docs = await Startup.find().sort({ createdAt: 1 });
    const data = await mapStartupListResponse(docs);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.get("/:slug", async (req, res, next) => {
  try {
    const doc = await Startup.findOne({ slug: req.params.slug });
    if (!doc) return res.status(404).json({ error: "Startup not found" });
    const data = await mapStartupDetailResponse(doc);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.post("/:slug/follow", async (req, res, next) => {
  try {
    const { userId } = req.body ?? {};
    if (typeof userId !== "string" || !userId.trim()) {
      return res.status(400).json({ error: "Invalid payload", details: "userId is required" });
    }

    const startup = await Startup.findOne({ slug: req.params.slug });
    if (!startup) return res.status(404).json({ error: "Startup not found" });

    await StartupFollow.updateOne(
      { startupSlug: startup.slug, userId: userId.trim() },
      { $setOnInsert: { startupSlug: startup.slug, userId: userId.trim() } },
      { upsert: true },
    );
    const followers = await StartupFollow.countDocuments({ startupSlug: startup.slug });
    res.json({ startup: startup.slug, followers });
  } catch (err) {
    next(err);
  }
});

export default router;
