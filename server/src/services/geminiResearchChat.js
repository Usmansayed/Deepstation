import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

function validateTurns(messages) {
  if (!messages.length) throw new Error("messages must not be empty");
  if (messages[messages.length - 1].role !== "user") throw new Error("last message must be from user");
  for (let i = 0; i < messages.length; i++) {
    const wantUser = i % 2 === 0;
    if (wantUser && messages[i].role !== "user") throw new Error("invalid conversation order");
    if (!wantUser && messages[i].role !== "assistant") throw new Error("invalid conversation order");
  }
}

function extractGroundingSources(response) {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks?.length) return [];
  const out = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (uri) out.push({ uri, title: c.web?.title });
  }
  return out;
}

const SYSTEM_PREAMBLE = `You are the AI research assistant for an investor-facing platform (Reg CF listings + research dossiers stored in this product database).

RULES:
1. When the user's question relates to companies, metrics, or themes on this platform, lead with specifics from PLATFORM CONTEXT below (names, conviction %, thesis lines, activity feed). Make it obvious what is from our catalog versus elsewhere.
2. You can use Google Search grounding for timely public information (news, markets, competitors, general facts). Label web-based claims as coming from the broader web when they are not in PLATFORM CONTEXT.
3. If PLATFORM CONTEXT does not cover something, say that clearly instead of inventing catalog data.
4. Be concise. No filler.

OUTPUT FORMAT (answers render in a narrow chat panel — follow this every time):
- Use markdown structure: short intro (1–2 sentences), then ### section headings. Do not dump one dense paragraph for everything.
- For multiple companies or listings: use a markdown bullet list. Each company is ONE top-level bullet with a bold title line, then NESTED sub-bullets for facts.
  Example shape:
  - **Vertex Grid (VGS)**
    - Sector: Climate infra
    - Conviction: 87%
    - Desk read: accumulation window / timing note
- Do NOT put several companies on one line with "|", "·", or comma-chains. Do NOT use pseudo-table inline rows — they wrap badly on mobile-width panels.
- Prefer **bold** labels (e.g. **Conviction:**) over decorative punctuation.
- When mixing desk data and web search, add a small ### From the desk vs ### From the web (or label lines) so the split is obvious.
- If you give risks or next steps, use a separate ### section with bullets.`;

async function resolveVertexConfig() {
  const envProject = (process.env.GOOGLE_CLOUD_PROJECT || "").trim();
  const location = (process.env.GOOGLE_CLOUD_LOCATION || "us-central1").trim();
  if (envProject) return { project: envProject, location };
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const project = await auth.getProjectId();
    if (project) return { project, location };
  } catch (err) {
    console.warn("Could not resolve GCP project from ADC:", err?.message || err);
  }
  return null;
}

async function createGenAiClient() {
  const vertex = await resolveVertexConfig();
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();

  if (vertex) {
    const model = (
      process.env.VERTEX_GEMINI_MODEL ||
      process.env.GEMINI_VERTEX_MODEL ||
      "gemini-2.5-flash"
    ).trim();
    return {
      ai: new GoogleGenAI({
        vertexai: true,
        project: vertex.project,
        location: vertex.location,
      }),
      model,
      mode: "vertex",
    };
  }

  if (apiKey) {
    const model = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
    return {
      ai: new GoogleGenAI({ apiKey }),
      model,
      mode: "apikey",
    };
  }

  throw new Error(
    "No Gemini authentication. Use the same setup as vertex_google_search_demo.py: run " +
      "`gcloud auth application-default login`, set your project with `gcloud config set project YOUR_PROJECT_ID`, " +
      "enable the Vertex AI API, optionally set GOOGLE_CLOUD_LOCATION (default us-central1), then restart this server. " +
      "Or set GEMINI_API_KEY for the Gemini Developer API instead.",
  );
}

/**
 * Vertex AI (ADC / gcloud) when a GCP project is available; otherwise Gemini API key.
 * @param {string} platformContext
 * @param {{ role: string, text: string }[]} messages
 */
export async function runGeminiResearchChat(platformContext, messages) {
  validateTurns(messages);
  const { ai, model: modelId } = await createGenAiClient();

  const systemInstruction = `${SYSTEM_PREAMBLE}

PLATFORM CONTEXT:
---
${platformContext}
---
`;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
  const lastMessage = messages[messages.length - 1].text;

  const runOnce = async (useSearch) => {
    const chat = ai.chats.create({
      model: modelId,
      history,
      config: {
        systemInstruction,
        ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
    const response = await chat.sendMessage({ message: lastMessage });
    const reply = response.text;
    if (!reply?.trim()) throw new Error("Empty model response");
    return { reply: reply.trim(), sources: extractGroundingSources(response) };
  };

  try {
    return await runOnce(true);
  } catch (err) {
    console.warn("Gemini with googleSearch failed, retrying without tools:", err);
    return await runOnce(false);
  }
}

/**
 * @param {object[]} companies
 * @param {string[]} activityFeed
 * @param {string[]} reasoningTimeline
 * @param {object | null} dossierDoc
 */
export function buildMongoResearchContext(companies, activityFeed, reasoningTimeline, dossierDoc) {
  const lines = [];
  lines.push("## Platform research desk (DeepStation — MongoDB catalog)");
  lines.push(`Indexed companies: ${companies.length}.`);
  lines.push("");
  lines.push("### Indexed companies (prioritize when the user is on this platform)");
  for (const c of companies.slice(0, 48)) {
    const thesis = (c.thesis ?? "").replace(/\s+/g, " ").trim();
    lines.push(
      `- **${c.name}** (id: \`${c.id}\`, ticker ${c.ticker ?? "—"}) · ${c.sector ?? "—"} · conviction ${c.confidence ?? "—"}% · ${c.risk ?? "—"} risk · timing: ${c.timing ?? "—"} · trend ${c.trend ?? "—"} · thesis: ${thesis.length > 220 ? `${thesis.slice(0, 219)}…` : thesis}`,
    );
  }
  lines.push("");
  lines.push("### Activity feed");
  for (const t of (activityFeed ?? []).slice(0, 14)) lines.push(`- ${t}`);
  lines.push("");
  lines.push("### Reasoning timeline");
  for (const t of (reasoningTimeline ?? []).slice(0, 10)) lines.push(`- ${t}`);

  if (dossierDoc) {
    const { _id, __v, createdAt, updatedAt, memo, intel, id, ...rest } = dossierDoc;
    lines.push("");
    lines.push(`## Focus company dossier (id: \`${id}\`)`);
    const blob = JSON.stringify({ memo, intel, ...rest }, null, 2);
    lines.push(blob.length > 14_000 ? `${blob.slice(0, 13_999)}…` : blob);
  }

  return lines.join("\n");
}
