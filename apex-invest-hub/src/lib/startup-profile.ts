import defaultProfile from "../../../data/startup_profiles/_default.json";
import type { ApiStartup } from "./api";
import type { StartupProfile } from "./data-schemas";

export function getFallbackStartupProfile(): StartupProfile {
  return defaultProfile as StartupProfile;
}

/** Prefer `profile` embedded on startup detail API; fall back to bundled default (worker / offline). */
export function profileForStartupPage(s: ApiStartup | null): StartupProfile {
  if (s?.profile) {
    const { slug: _slug, ...rest } = s.profile;
    return rest as StartupProfile;
  }
  return getFallbackStartupProfile();
}

export type { StartupProfile };
