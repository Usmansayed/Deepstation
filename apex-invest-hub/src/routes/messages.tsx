import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  Mail,
  MoreHorizontal,
  Phone,
  Search,
  SendHorizonal,
  Settings,
  Video,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getMessagesFixture } from "@/lib/api";
import { showAppWidget } from "@/lib/feature-widget";
import messagesFallback from "../../../data/platform/messages.json";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ChatMessage = {
  id: string;
  text: string;
  mine: boolean;
  time: string;
};

type MessageThread = {
  id: string;
  name: string;
  role: string;
  preview: string;
  time: string;
  unread?: number;
  avatarSeed: string;
  pinned?: boolean;
  mutedUntil?: string | null;
  archived?: boolean;
};

const initialThreads: MessageThread[] = messagesFallback.threads as MessageThread[];
const initialMessagesByThread: Record<string, ChatMessage[]> =
  messagesFallback.messagesByThread as Record<string, ChatMessage[]>;

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});

function MessagesPage() {
  const [threadList, setThreadList] = useState<MessageThread[]>(initialThreads);
  const [messagesByThread, setMessagesByThread] = useState<Record<string, ChatMessage[]>>(
    initialMessagesByThread,
  );
  const [activeTab, setActiveTab] = useState<"all" | "requests">("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialThreads[0]?.id ?? null);

  useEffect(() => {
    let cancelled = false;
    getMessagesFixture()
      .then((data) => {
        if (cancelled) return;
        const threads = data.threads as MessageThread[];
        setThreadList(threads);
        setMessagesByThread(data.messagesByThread as Record<string, ChatMessage[]>);
        setSelectedId(threads[0]?.id ?? null);
      })
      .catch((err) => {
        console.error("Failed to load messages fixture", err);
        if (cancelled) return;
        setThreadList(initialThreads);
        setMessagesByThread(initialMessagesByThread);
        setSelectedId(initialThreads[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [draft, setDraft] = useState("");
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => threadList.find((thread) => thread.id === selectedId) ?? null,
    [selectedId, threadList],
  );
  const selectedMessages = selected ? messagesByThread[selected.id] ?? [] : [];

  const visibleThreads = useMemo(
    () =>
      threadList
        .filter((thread) => !thread.archived)
        .filter((thread) =>
          query === "" ? true : thread.name.toLowerCase().includes(query.toLowerCase()),
        ),
    [query, threadList],
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [selectedId, selectedMessages.length]);

  const openThread = (id: string) => {
    setSelectedId(id);
    setThreadList((current) =>
      current.map((thread) =>
        thread.id === id ? { ...thread, unread: 0 } : thread,
      ),
    );
  };

  const formatThreadTime = () =>
    new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  const sendMessage = () => {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      mine: true,
      time: `Today ${formatThreadTime()}`,
    };

    setMessagesByThread((current) => ({
      ...current,
      [selected.id]: [...(current[selected.id] ?? []), newMessage],
    }));
    setThreadList((current) =>
      current.map((thread) =>
        thread.id === selected.id
          ? { ...thread, preview: text, time: "now", unread: 0 }
          : thread,
      ),
    );
    setDraft("");

    // Simulate a lightweight interactive reply for realism.
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        text: "Thanks, got it. Our team is checking this now and will follow up shortly.",
        mine: false,
        time: `Today ${formatThreadTime()}`,
      };
      setMessagesByThread((current) => ({
        ...current,
        [selected.id]: [...(current[selected.id] ?? []), reply],
      }));
      setThreadList((current) =>
        current.map((thread) =>
          thread.id === selected.id
            ? { ...thread, preview: reply.text, time: "now", unread: 0 }
            : thread,
        ),
      );
    }, 1200);
  };

  return (
    <AppShell
      activeSection="messages"
      mainClassName="flex-1 px-3 pt-4 pb-0 lg:px-4"
      contentClassName="mx-auto w-full min-w-0 max-w-none"
    >
      <div className="h-[calc(100vh-6.75rem)] overflow-hidden rounded-2xl border border-border bg-card">
        <div className="grid h-full grid-cols-1 md:grid-cols-[360px_1fr]">
          <aside className="border-r border-border">
            <div className="border-b border-border px-5 py-4">
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-3xl font-bold">Inbox</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1.5 hover:bg-muted" type="button" aria-label="Message settings">
                        <Settings size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuLabel>Message Settings</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuCheckboxItem
                        checked={messageNotifications}
                        onCheckedChange={(checked) => setMessageNotifications(checked === true)}
                      >
                        Message Notifications
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuCheckboxItem
                        checked={desktopAlerts}
                        onCheckedChange={(checked) => setDesktopAlerts(checked === true)}
                      >
                        Desktop Alerts
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() =>
                          showAppWidget("Retention policy", "Demo: threads are kept for 90 days on this workspace.")
                        }
                      >
                        Message retention (demo)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-md p-1.5 hover:bg-muted" type="button" aria-label="Notifications">
                        <Mail size={16} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuLabel>Recent Alerts</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => openThread("2")}
                      >
                        Jerome Bell sent a follow-up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openThread("5")}
                      >
                        Kim Arnone viewed your message
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openThread("4")}
                      >
                        Courtney Henry mentioned you
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={15} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search"
                  className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="border-b border-border px-5 py-3">
              <div className="inline-flex rounded-full bg-muted p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`rounded-full px-3 py-1 ${activeTab === "all" ? "bg-foreground text-white" : "text-muted-foreground"}`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("requests")}
                  className={`rounded-full px-3 py-1 ${activeTab === "requests" ? "bg-foreground text-white" : "text-muted-foreground"}`}
                >
                  Requests
                </button>
              </div>
            </div>

            {activeTab === "requests" ? (
              <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                <p>No message requests right now.</p>
                <button
                  className="mt-4 rounded-full bg-[#10213f] px-5 py-2 text-xs font-semibold text-white"
                  type="button"
                  onClick={() => setSelectedId(null)}
                >
                  New Message
                </button>
              </div>
            ) : (
              <div className="max-h-[58vh] overflow-y-auto">
                {visibleThreads.length === 0 ? (
                  <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                    No conversations yet.
                  </div>
                ) : (
                  visibleThreads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => openThread(thread.id)}
                      className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition-colors ${
                        selectedId === thread.id ? "bg-muted/60" : "hover:bg-muted/30"
                      }`}
                    >
                      <img
                        src={`https://picsum.photos/seed/${thread.avatarSeed}/88/88`}
                        alt={thread.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{thread.name}</p>
                          <span className="text-xs text-muted-foreground">{thread.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{thread.role}</p>
                        <p className="truncate text-sm text-muted-foreground">{thread.preview}</p>
                      </div>
                      {thread.unread ? (
                        <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs">{thread.unread}</span>
                      ) : (
                        <CheckCheck size={14} className="text-primary" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </aside>

          <section className="flex min-h-[60vh] flex-col">
            {!selected ? (
              <div className="flex h-full flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 rounded-full border border-border bg-muted p-3 text-muted-foreground">
                  <Mail size={22} />
                </div>
                <h2 className="text-4xl font-bold">Start Conversation</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose from existing conversations or open a new chat.
                </p>
              </div>
            ) : (
              <>
                <header className="flex items-center justify-between border-b border-border px-5 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://picsum.photos/seed/${selected.avatarSeed}/88/88`}
                      alt={selected.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    <div>
                      <h2 className="font-semibold">{selected.name}</h2>
                      <p className="text-xs text-muted-foreground">{selected.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <button
                      className="rounded-md border border-border p-2 hover:bg-muted"
                      type="button"
                      onClick={() =>
                        showAppWidget("Voice bridge (demo)", "Connecting you to a simulated conference line for this founder.")
                      }
                    >
                      <Phone size={15} />
                    </button>
                    <button
                      className="rounded-md border border-border p-2 hover:bg-muted"
                      type="button"
                      onClick={() =>
                        showAppWidget("Video session (demo)", "Opening a secure 1:1 video room — hackathon simulation only.")
                      }
                    >
                      <Video size={15} />
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-md border border-border p-2 hover:bg-muted" type="button">
                          <MoreHorizontal size={15} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            if (!selected) return;
                            const nextPinned = !selected.pinned;
                            setThreadList((current) =>
                              current.map((thread) =>
                                thread.id === selected.id ? { ...thread, pinned: nextPinned } : thread,
                              ),
                            );
                            showAppWidget(
                              nextPinned ? "Pinned" : "Unpinned",
                              `${selected.name} ${nextPinned ? "moved to your priority tray" : "removed from priority tray"}.`,
                            );
                          }}
                        >
                          {selected?.pinned ? "Unpin conversation" : "Pin conversation"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (!selected) return;
                            const until = new Date(Date.now() + 8 * 3600 * 1000).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            });
                            setThreadList((current) =>
                              current.map((thread) =>
                                thread.id === selected.id ? { ...thread, mutedUntil: until } : thread,
                              ),
                            );
                            showAppWidget("Muted 8 hours", `Alerts from ${selected.name} pause until ${until}.`);
                          }}
                        >
                          Mute for 8 hours
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            if (!selected) return;
                            setThreadList((current) =>
                              current.map((thread) =>
                                thread.id === selected.id ? { ...thread, archived: true } : thread,
                              ),
                            );
                            setSelectedId(null);
                            showAppWidget("Archived", `${selected.name} moved to archive.`);
                          }}
                        >
                          Archive chat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </header>

                <div ref={scrollRef} className="flex flex-1 flex-col gap-4 overflow-y-auto bg-[#fbfcff] px-5 py-4">
                  {selectedMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      text={message.text}
                      mine={message.mine}
                      time={message.time}
                    />
                  ))}
                </div>

                <footer className="border-t border-border bg-white px-4 pb-2 pt-3">
                  <div className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      className="h-9 flex-1 bg-transparent text-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={draft.trim().length === 0}
                      className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1">
                        <SendHorizonal size={13} />
                        Send
                      </span>
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ text, mine, time }: { text: string; mine?: boolean; time: string }) {
  return (
    <div className={`max-w-[72%] rounded-xl px-3 py-2 text-sm ${mine ? "ml-auto bg-[#ebf4ff]" : "bg-white"}`}>
      <p className="mb-1 text-[11px] text-muted-foreground">{time}</p>
      <p>{text}</p>
    </div>
  );
}
