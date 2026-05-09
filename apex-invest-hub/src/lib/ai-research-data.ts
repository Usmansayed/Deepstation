import { useEffect, useState } from "react";
import type { AiResearchCompany, AiResearchIndex } from "./data-schemas";
import { getAiResearchDossierPayload, getAiResearchIndex } from "./api";

let indexPromise: Promise<AiResearchIndex> | null = null;

export function prefetchAiResearchIndex(): Promise<AiResearchIndex> {
  indexPromise ??= getAiResearchIndex();
  return indexPromise;
}

export function useAiResearchIndex(): {
  data: AiResearchIndex | null;
  error: Error | null;
  companies: AiResearchCompany[];
} {
  const [data, setData] = useState<AiResearchIndex | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    prefetchAiResearchIndex()
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e : new Error(String(e))));
  }, []);

  return {
    data,
    error,
    companies: data?.companies ?? [],
  };
}

export async function fetchDossierForCompany(companyId: string) {
  return getAiResearchDossierPayload(companyId);
}
