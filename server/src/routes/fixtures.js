import { Router } from "express";
import {
  AppConfig,
  MessageThread,
  CashTransaction,
  TopInvestor,
} from "../models/index.js";

const router = Router();

router.get("/discover-categories", async (_req, res, next) => {
  try {
    const doc = await AppConfig.findOne({ key: "discover_categories" }).lean();
    if (!doc?.payload) return res.status(404).json({ error: "Not seeded" });
    res.json(doc.payload);
  } catch (err) {
    next(err);
  }
});

router.get("/demo-user", async (_req, res, next) => {
  try {
    const doc = await AppConfig.findOne({ key: "demo_user" }).lean();
    if (!doc?.payload) return res.status(404).json({ error: "Not seeded" });
    res.json(doc.payload);
  } catch (err) {
    next(err);
  }
});

router.get("/messages", async (_req, res, next) => {
  try {
    const threads = await MessageThread.find().sort({ createdAt: 1 }).lean();
    const messagesByThread = {};
    const threadRows = threads.map((t) => {
      const { messages = [], _id, __v, createdAt, updatedAt, ...rest } = t;
      messagesByThread[rest.id] = messages;
      return rest;
    });
    res.json({ threads: threadRows, messagesByThread });
  } catch (err) {
    next(err);
  }
});

router.get("/cash-transactions", async (_req, res, next) => {
  try {
    const rows = await CashTransaction.find().sort({ date: -1 }).lean();
    res.json(
      rows.map(({ _id, __v, createdAt, updatedAt, ...r }) => r),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/top-investors", async (_req, res, next) => {
  try {
    const rows = await TopInvestor.find().sort({ rank: 1 }).lean();
    res.json(rows.map(({ _id, __v, createdAt, updatedAt, ...r }) => r));
  } catch (err) {
    next(err);
  }
});

export default router;
