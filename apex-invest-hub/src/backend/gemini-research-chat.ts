import { GoogleGenAI } from "@google/genai";
import { GoogleAuth } from "google-auth-library";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type GeminiResearchResult = {
  reply: string;
  sources: { uri: string; title?: string }[];
};

function validateTurnsForGemini(messages: ChatTurn[]): void {
  if (messages.length === 0) throw new Error("messages must not be empty");
  if (messages[messages.length - 1]?.role !== "user")
    throw new Error("last message must be from user");
  for (let i = 0; i < messages.length; i++) {
    const expectUser = i % 2 === 0;
    if (expectUser && messages[i].role !== "user") throw new Error("invalid conversation order");
    if (!expectUser && messages[i].role !== "assistant")
      throw new Error("invalid conversation order");
  }
}

function extractGroundingSources(response: {
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
    };
  }>;
}): { uri: string; title?: string }[] {
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!chunks?.length) return [];
  const out: { uri: string; title?: string }[] = [];
  for (const c of chunks) {
    const uri = c.web?.uri;
    if (uri) out.push({ uri, title: c.web?.title });
  }
  return out;
}

const SYSTEM_PREAMBLE = `You are the AI research assistant for an investor-facing platform (Reg CF listings + Wefunder campaign data merged into a research desk).

RULES:
1. When the user's question relates to companies, metrics, or themes on this platform, lead with specifics from PLATFORM CONTEXT below (names, conviction %, thesis lines, desk stats, dossier fields). Make it obvious what is from our listings versus elsewhere.
2. You can use Google Search grounding for timely public information (news, markets, competitors, general facts). Label web-based claims as coming from the broader web when they are not in PLATFORM CONTEXT.
3. If PLATFORM CONTEXT does not cover something, say that clearly instead of inventing desk data.
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

async function resolveVertexConfig(): Promise<{ project: string; location: string } | null> {
  const envProject = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = (process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1").trim();
  if (envProject) return { project: envProject, location };
  try {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const project = await auth.getProjectId();
    if (project) return { project, location };
  } catch {
    /* No ADC (e.g. Cloudflare Worker) */
  }
  return null;
}

async function createGenAiClient(): Promise<{
  ai: GoogleGenAI;
  model: string;
  mode: "vertex" | "apikey";
}> {
  const vertex = await resolveVertexConfig();
  const apiKey = (process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? "").trim();

  if (vertex) {
    const model = (
      process.env.VERTEX_GEMINI_MODEL ??
      process.env.GEMINI_VERTEX_MODEL ??
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
    const model = (process.env.GEMINI_MODEL ?? "gemini-2.0-flash").trim();
    return {
      ai: new GoogleGenAI({ apiKey }),
      model,
      mode: "apikey",
    };
  }

  throw new Error(
    "No Gemini authentication. On your machine use the same flow as vertex_google_search_demo.py: " +
      "`gcloud auth application-default login`, `gcloud config set project YOUR_PROJECT_ID`, enable Vertex AI API, " +
      "optionally GOOGLE_CLOUD_LOCATION (default us-central1). For Cloudflare Workers or hosts without ADC, set GEMINI_API_KEY.",
  );
}

/**
 * Prefers Vertex AI + Application Default Credentials; falls back to GEMINI_API_KEY (Developer API).
 * Google Search grounding is requested when supported by the model.
 */
export async function runGeminiResearchChat(
  platformContext: string,
  messages: ChatTurn[],
): Promise<GeminiResearchResult> {
  validateTurnsForGemini(messages);

  const { ai, model: modelId } = await createGenAiClient();

  const systemInstruction = `${SYSTEM_PREAMBLE}

PLATFORM CONTEXT:
---
${platformContext}
---
`;

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("model" as const),
    parts: [{ text: m.text }],
  }));
  const lastMessage = messages[messages.length - 1].text;

  const tryWithTools = async (useSearch: boolean): Promise<GeminiResearchResult> => {
    const chat = ai.chats.create({
      model: modelId,
      history,
      config: {
        systemInstruction,
        ...(useSearch ? { tools: [{ googleSearch: {} }] } : {}),
      },
    });
    const result = await chat.sendMessage({ message: lastMessage });
    const reply = result.text;
    if (!reply?.trim()) throw new Error("Empty model response");
    return { reply: reply.trim(), sources: extractGroundingSources(result) };
  };

  try {
    return await tryWithTools(true);
  } catch (first) {
    console.warn("Gemini with googleSearch failed, retrying without tools:", first);
    return await tryWithTools(false);
  }
}
