const base = process.env.SMOKE_BASE || "http://127.0.0.1:4000";

async function get(path) {
  const r = await fetch(base + path);
  const text = await r.text();
  return { status: r.status, body: text };
}
async function post(path, body) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  return { status: r.status, body: text };
}

function preview(s, n = 400) {
  return s.length > n ? s.slice(0, n) + `… (${s.length} bytes)` : s;
}

(async () => {
  console.log("== /health ==");
  console.log(preview((await get("/health")).body));

  console.log("\n== /api/db-health ==");
  console.log(preview((await get("/api/db-health")).body));

  console.log("\n== GET /api/startups ==");
  const list = await get("/api/startups");
  console.log("status:", list.status);
  const arr = JSON.parse(list.body);
  console.log("count:", arr.length);
  console.log("first item summary:", {
    id: arr[0]?.id,
    slug: arr[0]?.slug,
    name: arr[0]?.name,
    sector: arr[0]?.sector,
    stage: arr[0]?.stage,
    evs: arr[0]?.evs,
    ghostStatus: arr[0]?.ghostStatus,
    engagement: arr[0]?.engagement,
    tractionPoints: arr[0]?.traction?.length,
    updates: arr[0]?.updates?.length,
    badges: arr[0]?.verificationBadges?.length,
  });

  console.log("\n== GET /api/startups/lumen-health ==");
  const detail = await get("/api/startups/lumen-health");
  console.log("status:", detail.status);
  const obj = JSON.parse(detail.body);
  console.log("comments key present:", Array.isArray(obj.comments));

  console.log("\n== POST /api/startups/lumen-health/follow (twice, same user) ==");
  console.log((await post("/api/startups/lumen-health/follow", { userId: "demo-investor" })).body);
  console.log((await post("/api/startups/lumen-health/follow", { userId: "demo-investor" })).body);

  console.log("\n== POST /api/agents/due-diligence ==");
  console.log((await post("/api/agents/due-diligence", { slug: "lumen-health" })).body);

  console.log("\n== GET /api/startups/does-not-exist (404 expected) ==");
  console.log((await get("/api/startups/does-not-exist")).status);
})().catch((err) => {
  console.error("smoke failed:", err);
  process.exit(1);
});
