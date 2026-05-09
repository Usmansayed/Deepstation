/**
 * Run from the server directory: npm test
 * Requires server/.env with MONGODB_URI for the connection test (otherwise that test is skipped).
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";

const URI = (process.env.MONGODB_URI || "").trim();

function explainError(err) {
  const o = {
    name: err?.name,
    code: err?.code,
    message: err?.message,
  };
  const hints = [];
  const msg = String(o.message || "");

  if (o.name === "MongooseServerSelectionError" || msg.includes("Server selection timed out")) {
    hints.push("Server did not respond in time — is MongoDB running locally, or is Atlas reachable from this network?");
    hints.push("For Atlas: Network Access → allow your IP (or 0.0.0.0/0 for dev only).");
  }
  if (msg.includes("authentication failed") || o.code === 8000 || msg.includes("bad auth")) {
    hints.push("Check username/password; URL-encode special characters in the password.");
  }
  if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
    hints.push("Check the hostname in MONGODB_URI (copy from Atlas → Connect → Drivers).");
  }
  if (msg.includes("ECONNREFUSED")) {
    hints.push("Nothing listening on that host:port — start local mongod or fix the port in the URI.");
  }

  return { ...o, hints };
}

describe("MongoDB connection", () => {
  before(() => {
    mongoose.set("strictQuery", true);
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it("loads dotenv / MONGODB_URI is non-empty when .env is configured", () => {
    if (!URI) {
      console.warn(
        "\n[skip] MONGODB_URI is empty. Copy server/.env.example → server/.env and set your connection string.\n",
      );
    }
    assert.ok(true);
  });

  it("connects and responds to ping", async (t) => {
    if (!URI) {
      t.skip("Set MONGODB_URI in server/.env to run this test");
      return;
    }

    const timeoutMs = Number(process.env.MONGO_TEST_TIMEOUT_MS) || 12_000;

    try {
      await mongoose.connect(URI, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
      });
      assert.equal(mongoose.connection.readyState, 1, "readyState should be connected");

      const admin = mongoose.connection.db?.admin();
      assert.ok(admin, "admin handle should exist");
      const ping = await admin.command({ ping: 1 });
      assert.equal(ping.ok, 1, "ping should return { ok: 1 }");

      console.log("\n[ok] MongoDB:", {
        db: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
      });
    } catch (err) {
      const detail = explainError(err);
      console.error("\n[fail] MongoDB connection diagnostic:\n", JSON.stringify(detail, null, 2));
      throw err;
    }
  });
});
