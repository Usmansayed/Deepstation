import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  BrainCircuit,
  FileText,
  Loader2,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { postAiResearchChat, type AiResearchChatMessage } from "@/lib/api";

export type AiResearchAssistantFloatingProps = {
  companyId?: string;
  title?: string;
  subtitle?: string;
  fabLabel?: string;
  activityFeed: string[];
  reasoningTimeline: string[];
  initialMessages?: AiResearchChatMessage[];
};

const defaultSeeds: AiResearchChatMessage[] = [
  {
    role: "assistant",
    text: "I’m grounded in this desk’s listings and Wefunder-linked data first, then the open web when you need freshness. Ask for comparisons, risks, or a downside case.",
  },
];

/** Gemini `startChat` history must alternate user/model starting with user — strip UI-only intro assistants. */
function toApiMessages(msgs: AiResearchChatMessage[]): AiResearchChatMessage[] {
  const firstUser = msgs.findIndex((m) => m.role === "user");
  if (firstUser === -1) return [];
  const tail = msgs.slice(firstUser);
  for (let i = 0; i < tail.length; i++) {
    const wantUser = i % 2 === 0;
    if (wantUser && tail[i].role !== "user") return [];
    if (!wantUser && tail[i].role !== "assistant") return [];
  }
  if (tail[tail.length - 1]?.role !== "user") return [];
  return tail;
}

export function AiResearchAssistantFloating({
  companyId,
  title = "Research assistant",
  subtitle,
  fabLabel = "AI Assistant",
  activityFeed,
  reasoningTimeline,
  initialMessages,
}: AiResearchAssistantFloatingProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "signals" | "reports">("chat");
  const [messages, setMessages] = useState<AiResearchChatMessage[]>(
    () => initialMessages ?? defaultSeeds,
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && tab === "chat") endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, tab, loading]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    const next: AiResearchChatMessage[] = [...messages, { role: "user", text }];
    const apiPayload = toApiMessages(next);
    if (apiPayload.length === 0) {
      setError("Could not build a valid chat payload.");
      return;
    }
    setMessages(next);
    if (!preset) setInput("");
    setLoading(true);
    setError(null);
    try {
      const { reply } = await postAiResearchChat({ messages: apiPayload, companyId });
      setMessages((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[45] cursor-default border-0 bg-black/20 p-0 backdrop-blur-[2px] dark:bg-black/40"
          aria-label="Dismiss assistant"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        className={
          open
            ? "pointer-events-none fixed bottom-5 right-5 top-5 z-50 flex max-w-[calc(100vw-1.25rem)] flex-col items-stretch sm:top-6"
            : "pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col items-end"
        }
      >
        {open ? (
          <section
            className="pointer-events-auto flex h-full min-h-0 w-[calc(100vw-1.25rem)] max-w-[32rem] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl dark:shadow-black/40 sm:max-w-none md:w-[min(33.333vw,42rem)]"
            aria-label="AI research assistant panel"
            onClick={(e) => e.stopPropagation()}
          >
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-4 pb-3 pt-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                {title}
              </p>
              {subtitle ? (
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
              ) : null}
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Desk data first · Google Search when needed
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted"
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex shrink-0 gap-1 border-b border-border/60 px-3 py-2">
            {(["chat", "signals", "reports"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  tab === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/70"
                }`}
              >
                {key === "chat" ? "Chat" : key === "signals" ? "Signals" : "Reports"}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-sm">
            {tab === "chat" && (
              <div className="space-y-3">
                {messages.map((line, idx) => (
                  <div
                    key={`${idx}-${line.text.slice(0, 24)}`}
                    className={`rounded-2xl px-3.5 py-2.5 ${
                      line.role === "assistant"
                        ? "border border-border/50 bg-muted/35 text-foreground"
                        : "ml-6 bg-primary text-primary-foreground"
                    }`}
                  >
                    {line.role === "assistant" ? (
                      <div
                        className="assistant-markdown prose prose-sm dark:prose-invert max-w-none break-words text-[13px] leading-snug text-foreground prose-p:my-2 prose-p:leading-snug prose-strong:font-semibold prose-strong:text-foreground prose-h2:mb-2 prose-h2:mt-0 prose-h2:text-base prose-h2:font-semibold prose-h3:mb-1.5 prose-h3:mt-3 prose-h3:border-b prose-h3:border-border/50 prose-h3:pb-1 prose-h3:text-sm prose-h3:font-semibold [&_h3:first-of-type]:mt-2 prose-ul:my-2 prose-ul:list-outside prose-ul:pl-4 prose-ol:my-2 prose-ol:pl-4 prose-li:my-1 prose-li:marker:text-muted-foreground prose-li:pl-1 [&_ul]:mt-1 [&_ul]:space-y-0.5 [&_ul]:pl-4 [&_li>ul]:mt-1 [&_hr]:my-4 [&_hr]:border-border/60"
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{line.text}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{line.text}</p>
                    )}
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden />
                    Querying Gemini…
                  </div>
                ) : null}
                {error ? (
                  <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                ) : null}
                <div ref={endRef} />
              </div>
            )}
            {tab === "signals" && (
              <div className="space-y-2">
                {activityFeed.slice(0, 8).map((text) => (
                  <SignalRow key={text} icon={TrendingUp} text={text} />
                ))}
              </div>
            )}
            {tab === "reports" && (
              <div className="space-y-2">
                {reasoningTimeline.slice(0, 8).map((text) => (
                  <SignalRow key={text} icon={FileText} text={text} />
                ))}
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-border/60 bg-muted/20 p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {["Compare two listings", "Key risks", "Downside case"].map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => send(prompt)}
                  className="rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-muted disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                disabled={loading}
                className="h-10 flex-1 rounded-xl border border-border/60 bg-background px-3 text-sm outline-none ring-primary/15 focus:ring-2 disabled:opacity-60"
                placeholder="Ask about this desk or a company…"
              />
              <button
                type="button"
                disabled={loading || input.trim().length === 0}
                onClick={() => void send()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
                aria-label="Send"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUpRight size={18} />
                )}
              </button>
            </div>
          </footer>
        </section>
        ) : null}

        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:opacity-95"
          >
            <BrainCircuit size={18} />
            {fabLabel}
          </button>
        ) : null}
      </div>
    </>
  );
}

function SignalRow({ icon: Icon, text }: { icon: typeof TrendingUp; text: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/25 px-3 py-2">
      <p className="flex gap-2 text-xs leading-snug text-foreground">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        {text}
      </p>
    </div>
  );
}
