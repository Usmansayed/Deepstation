import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { showAppWidget } from "@/lib/feature-widget";
import { ShellSearch } from "@/components/shell-search";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Bell,
  BriefcaseBusiness,
  Building2,
  CircleHelp,
  MessageSquare,
  Search,
  Settings,
  UserRound,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ShellSection =
  | "activity"
  | "deals"
  | "research"
  | "portfolio"
  | "cash"
  | "profile"
  | "messages";

const sidebarItems: Array<{
  key: ShellSection;
  label: string;
  icon: LucideIcon;
  to: "/" | "/discover" | "/ai-research" | "/portfolio" | "/cash" | "/profile" | "/messages";
}> = [
  { key: "activity", label: "Activity", icon: Zap, to: "/" },
  { key: "deals", label: "Deals", icon: Search, to: "/discover" },
  { key: "research", label: "AI Research", icon: BrainCircuit, to: "/ai-research" },
  { key: "portfolio", label: "Portfolio", icon: BriefcaseBusiness, to: "/portfolio" },
  { key: "cash", label: "Cash", icon: Building2, to: "/cash" },
  { key: "profile", label: "Profile", icon: UserRound, to: "/profile" },
  { key: "messages", label: "Messages", icon: MessageSquare, to: "/messages" },
];

export function AppShell({
  activeSection,
  children,
  mainClassName,
  contentClassName,
}: {
  activeSection: ShellSection;
  children: React.ReactNode;
  mainClassName?: string;
  contentClassName?: string;
}) {
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(3);
  const [theme, setTheme] = useState("light");
  const [desktopNotif, setDesktopNotif] = useState(true);
  const [emailSummaries, setEmailSummaries] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      return;
    }
    if (theme === "light") {
      root.classList.remove("dark");
      return;
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      if (mq.matches) root.classList.add("dark");
      else root.classList.remove("dark");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-muted/25 lg:flex">
        <div className="border-b border-border px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center bg-foreground font-heading text-xs font-bold text-background"
              aria-hidden
            >
              U
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold text-foreground">Usman</p>
              <p className="truncate text-xs text-muted-foreground">Investor</p>
            </div>
          </div>
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3 font-heading">
            {sidebarItems.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-sm px-2 py-2 text-sm font-semibold tracking-tight transition-colors ${
                  activeSection === item.key
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                }`}
              >
                <item.icon size={16} strokeWidth={2} className="shrink-0" />
                <span>{item.label}</span>
              </Link>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                  type="button"
                >
                  <CircleHelp size={16} strokeWidth={2} className="shrink-0" />
                  Help
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Help Center</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" hash="how-it-works">
                    How it works
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/messages">Live chat &amp; inbox</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/cash">Funding &amp; transfers</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </nav>
        <div className="border-t border-border px-3 py-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left font-heading text-sm font-semibold tracking-tight text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
                  type="button"
                >
                  <Settings size={16} strokeWidth={2} />
                  Settings
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-60">
                <DropdownMenuLabel>Preferences</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                  <DropdownMenuRadioItem value="light">Light Theme</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">Dark Theme</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">System Theme</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={desktopNotif}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setDesktopNotif(on);
                    showAppWidget(on ? "Desktop alerts on" : "Desktop alerts off", "Preference saved on this device.");
                  }}
                >
                  Desktop Notifications
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={emailSummaries}
                  onCheckedChange={(v) => {
                    const on = v === true;
                    setEmailSummaries(on);
                    showAppWidget(on ? "Weekly summaries on" : "Weekly summaries off", "You can change this anytime.");
                  }}
                >
                  Email Summaries
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </aside>

      <main className={`min-w-0 lg:pl-56 ${mainClassName ?? "flex-1 px-4 py-4 lg:px-5"}`}>
          <div className={contentClassName ?? "mx-auto w-full min-w-0 max-w-[1180px]"}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex flex-1 items-center gap-3">
                <ShellSearch />
                <div className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
                  <span className="font-semibold text-foreground">Explore</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground">
                        Venture Vault
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                      <DropdownMenuItem asChild>
                        <Link to="/discover" search={{ q: "saved" }}>
                          Saved &amp; watchlist
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/portfolio">Portfolio positions</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/ai-research">AI research desk</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to="/founder"
                  className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-primary"
                >
                  Raise Capital
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="relative text-muted-foreground hover:text-foreground"
                      aria-label="Open notifications"
                    >
                      <Bell size={16} />
                      {notificationCount > 0 && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/discover" search={{ q: "climate" }}>
                        New climate deals match your thesis
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/cash">Transfer to Venture Flow Cash completed</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/portfolio">Quarterly portfolio snapshot ready</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setNotificationCount(0)}>
                      Mark all as read
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  U
                </span>
              </div>
            </div>
            {children}
          </div>
        </main>
    </div>
  );
}
