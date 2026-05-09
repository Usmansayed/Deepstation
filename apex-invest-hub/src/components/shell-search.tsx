"use client";

import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { BrainCircuit, Building2, LayoutGrid, Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { getStartups } from "@/lib/api";
import type { ApiStartup } from "@/lib/api";

export function ShellSearch() {
  const navigate = useNavigate();
  const discoverQ = useRouterState({
    select: (s) =>
      s.location.pathname === "/discover" && typeof s.location.search === "object" && s.location.search
        ? String((s.location.search as { q?: string }).q ?? "").trim()
        : "",
  });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [startups, setStartups] = useState<ApiStartup[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setQuery(discoverQ);
  }, [open, discoverQ]);

  useEffect(() => {
    if (!open || startups !== null) return;
    void getStartups()
      .then(setStartups)
      .catch(() => setStartups([]));
  }, [open, startups]);

  const goDiscover = (q: string) => {
    const t = q.trim();
    navigate({ to: "/discover", search: t ? { q: t } : {} });
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-full max-w-sm items-center gap-2 rounded-md border border-border bg-background px-3 text-left text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary/20"
        aria-label="Open search"
      >
        <Search className="pointer-events-none shrink-0 text-muted-foreground" size={14} />
        <span className="truncate">Search companies…</span>
        <kbd className="ml-auto hidden shrink-0 rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
          Ctrl K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <span className="sr-only">Search companies, open profiles, or jump to AI research memos</span>
        <CommandInput placeholder="Type a name, sector, or tagline…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>
            {startups === null ? "Loading listings…" : "No matches — try another term or browse Discover."}
          </CommandEmpty>
          <CommandGroup heading="Shortcuts">
            <CommandItem
              value="discover browse all listings"
              onSelect={() => {
                goDiscover(query);
              }}
            >
              <LayoutGrid className="text-muted-foreground" />
              <span>{query ? `Discover: “${query}”` : "Browse Discover"}</span>
            </CommandItem>
            <CommandItem
              value="ai research desk"
              onSelect={() => {
                navigate({ to: "/ai-research" });
                setOpen(false);
              }}
            >
              <BrainCircuit className="text-muted-foreground" />
              AI Research desk
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Company profiles">
            {(startups ?? []).map((s) => (
              <CommandItem
                key={s.slug}
                value={`${s.name} ${s.slug} ${s.sector} ${s.tagline} ${s.description.slice(0, 120)}`}
                onSelect={() => {
                  navigate({ to: "/startup/$slug", params: { slug: s.slug } });
                  setOpen(false);
                }}
              >
                <Building2 className="text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate font-medium text-foreground">{s.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {s.sector} · {s.tagline}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="AI research (listing-sourced)">
            {(startups ?? []).map((s) => (
              <CommandItem
                key={`${s.slug}-ai`}
                value={`ai research memo ${s.name} ${s.slug} ${s.sector}`}
                onSelect={() => {
                  navigate({ to: "/ai-research/$companyId", params: { companyId: s.slug } });
                  setOpen(false);
                }}
              >
                <BrainCircuit className="text-muted-foreground" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-foreground">AI memo · {s.name}</span>
                  <span className="truncate text-xs text-muted-foreground">Same data as Reg CF scrape in /data</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
