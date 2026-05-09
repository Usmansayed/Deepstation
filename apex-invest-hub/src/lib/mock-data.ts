import startupsData from "../../../data/startups.json";

export type Stage = "Pre-seed" | "Seed" | "Series A" | "Series B";

export type Update = {
  id: string;
  date: string;
  type: "milestone" | "product" | "traction" | "team" | "fundraise";
  title: string;
  body: string;
};

export type TractionPoint = { month: string; revenue: number; users: number };

export type Founder = {
  name: string;
  role: string;
  bio: string;
  linkedin?: string;
  verified: boolean;
};

export type Startup = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  /** Pitch deck / list UI (emoji in mock) */
  logo: string;
  heroImage?: string;
  sector: string;
  stage: Stage;
  location: string;
  founded: string;
  /** USD */
  raising: number;
  valuation: number;
  raised: number;
  /** 0-100 */
  credibility: number;
  /** 0-100 */
  momentum: number;
  followers: number;
  founders: Founder[];
  updates: Update[];
  traction: TractionPoint[];
  highlights: string[];
};

export const startups: Startup[] = startupsData as Startup[];

export const getStartup = (slug: string) => startups.find((s) => s.slug === slug);

export const formatMoney = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
};
