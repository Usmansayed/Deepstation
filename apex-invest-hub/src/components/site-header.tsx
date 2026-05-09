import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 glass border-b">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-block w-7 h-7 rounded-md bg-gradient-primary shadow-glow" />
          <span>FounderProof</span>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <Link to="/discover" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Discover</Link>
          <Link to="/portfolio" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Portfolio</Link>
          <Link to="/founder" activeProps={{ className: "text-foreground" }} className="hover:text-foreground transition-colors">Founder Studio</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/discover" className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/portfolio" className="inline-flex items-center rounded-lg bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-glow hover:opacity-90 transition">
            Open Portfolio
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t mt-24">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block w-5 h-5 rounded bg-gradient-primary" />
          <span>FounderProof — verified execution intelligence</span>
        </div>
        <div>Demo build with simulated verified data.</div>
      </div>
    </footer>
  );
}
