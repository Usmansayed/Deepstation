import "dotenv/config";
import cors from "cors";
import express from "express";
import { connectDb, getConnectionState } from "./db.js";
import startupsRouter from "./routes/startups.js";
import agentsRouter from "./routes/agents.js";
import fixturesRouter from "./routes/fixtures.js";
import aiResearchRouter from "./routes/aiResearch.js";
import { imageProxyHandler } from "./routes/imageProxy.js";

const PORT = Number(process.env.PORT) || 4000;
const MONGODB_URI = (process.env.MONGODB_URI || "").trim();

const app = express();
app.use(cors());
app.use(express.json());

function requireDb(_req, res, next) {
  const conn = getConnectionState();
  if (conn.readyState !== 1) {
    return res.status(503).json({
      error: "Database not connected",
      mongodb: conn,
    });
  }
  next();
}

/** Set when connect attempt fails (message only — never the full URI). */
let lastDbError = null;

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "deepstation-api", port: PORT });
});

app.get("/api/image-proxy", imageProxyHandler);

app.get("/api/db-health", (_req, res) => {
  const conn = getConnectionState();
  const configured = Boolean(MONGODB_URI);
  const connected = conn.readyState === 1;
  const ok = configured && connected;
  res.status(ok ? 200 : 503).json({
    ok,
    configured,
    mongodb: conn,
    ...(lastDbError ? { error: lastDbError } : {}),
    hints: !configured
      ? ["Create server/.env from .env.example and set MONGODB_URI, then restart."]
      : !connected
        ? ["Check MongoDB is running (local) or Atlas IP allowlist / credentials (cloud). See server terminal logs."]
        : [],
  });
});

app.use("/api/startups", requireDb, startupsRouter);
app.use("/api/agents", requireDb, agentsRouter);
app.use("/api/fixtures", requireDb, fixturesRouter);
app.use("/api/ai-research", requireDb, aiResearchRouter);

app.use((err, _req, res, _next) => {
  console.error("API error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

function main() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`API listening on http://localhost:${PORT}`);
    console.log(`  GET http://localhost:${PORT}/health`);
    console.log(`  GET http://localhost:${PORT}/api/db-health`);

    if (!MONGODB_URI) {
      console.warn("MONGODB_URI is not set — copy server/.env.example to server/.env and add your URI.");
      return;
    }

    lastDbError = null;
    connectDb(MONGODB_URI)
      .then(() => {
        console.log("MongoDB connected:", getConnectionState());
      })
      .catch((err) => {
        lastDbError = err.message || String(err);
        console.error("MongoDB connection failed (server keeps running):", lastDbError);
      });
  });
}

main();
