import { Router } from "express";
import { AiResearchCompany, AiResearchDossier } from "../models/index.js";
import { buildMongoResearchContext, runGeminiResearchChat } from "../services/geminiResearchChat.js";

const router = Router();

function companyCardFields(doc) {
  const o = doc.toObject ? doc.toObject({ versionKey: false }) : { ...doc };
  return {
    id: o.id,
    name: o.name,
    ticker: o.ticker,
    sector: o.sector,
    image: o.image,
    confidence: o.confidence,
    risk: o.risk,
    timing: o.timing,
    thesis: o.thesis,
    trend: o.trend,
  };
}

router.get("/", async (_req, res, next) => {
  try {
    const companies = await AiResearchCompany.find().sort({ name: 1 });
    if (companies.length === 0) {
      return res.json({ companies: [], activityFeed: [], reasoningTimeline: [] });
    }
    const first = companies[0].toObject({ versionKey: false });
    res.json({
      companies: companies.map((c) => companyCardFields(c)),
      activityFeed: first.activityFeed ?? [],
      reasoningTimeline: first.reasoningTimeline ?? [],
    });
  } catch (err) {
    next(err);
  }
});

router.post("/chat", async (req, res, next) => {
  try {
    const { messages, companyId } = req.body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array is required" });
    }
    if (messages.length > 40) return res.status(400).json({ error: "too many messages" });
    for (const m of messages) {
      if (!m || (m.role !== "user" && m.role !== "assistant")) {
        return res.status(400).json({ error: "each message needs role user|assistant" });
      }
      if (typeof m.text !== "string" || m.text.length < 1 || m.text.length > 24_000) {
        return res.status(400).json({ error: "invalid message text" });
      }
    }
    if (messages[messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "last message must be from user" });
    }
    for (let i = 0; i < messages.length; i++) {
      const wantUser = i % 2 === 0;
      if (wantUser && messages[i].role !== "user") return res.status(400).json({ error: "invalid turn order" });
      if (!wantUser && messages[i].role !== "assistant") return res.status(400).json({ error: "invalid turn order" });
    }

    const companies = await AiResearchCompany.find().sort({ name: 1 });
    if (companies.length === 0) {
      return res.status(503).json({ error: "research catalog is empty" });
    }
    const first = companies[0].toObject({ versionKey: false });
    const activityFeed = first.activityFeed ?? [];
    const reasoningTimeline = first.reasoningTimeline ?? [];
    const companyCards = companies.map((c) => companyCardFields(c));

    let dossierDoc = null;
    if (companyId && typeof companyId === "string" && companyId.trim()) {
      const id = companyId.trim();
      dossierDoc = await AiResearchDossier.findOne({ id }).lean();
      if (!dossierDoc && id !== "__default__") {
        dossierDoc = await AiResearchDossier.findOne({ id: "__default__" }).lean();
      }
    }

    const platformContext = buildMongoResearchContext(
      companyCards,
      activityFeed,
      reasoningTimeline,
      dossierDoc,
    );
    const out = await runGeminiResearchChat(platformContext, messages);
    res.json({ reply: out.reply, sources: out.sources });
  } catch (err) {
    console.error("ai-research chat:", err);
    const status = err.message?.includes("API key") ? 401 : 502;
    res.status(status).json({ error: err.message || "Gemini request failed" });
  }
});

router.get("/dossiers/:companyId", async (req, res, next) => {
  try {
    const id = req.params.companyId;
    let doc = await AiResearchDossier.findOne({ id }).lean();
    if (!doc && id !== "__default__") {
      doc = await AiResearchDossier.findOne({ id: "__default__" }).lean();
    }
    if (!doc) return res.status(404).json({ error: "Dossier not found" });
    const { _id, __v, createdAt, updatedAt, ...rest } = doc;
    res.json(rest);
  } catch (err) {
    next(err);
  }
});

export default router;
