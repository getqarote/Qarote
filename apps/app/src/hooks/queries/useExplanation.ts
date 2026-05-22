import { useQuery } from "@tanstack/react-query";

import { getApiUrl } from "@/lib/runtimeConfig";

function getBaseUrl(): string {
  return getApiUrl() ?? "";
}

interface ExplanationData {
  id: string;
  workspaceId: string;
  incidentFindingId: string | null;
  configFindingId: string | null;
  traceEventId: string | null;
  promptVersion: string;
  provider: string;
  model: string;
  content: string;
  inputTokens: number;
  outputTokens: number;
  createdBy: string | null;
  createdAt: string;
  supersededBy: string | null;
  supersededAt: string | null;
  creator: { name: string; firstName: string; lastName: string } | null;
}

async function fetchExplanation(id: string): Promise<ExplanationData> {
  const res = await fetch(
    `${getBaseUrl()}/api/llm/explanations/${encodeURIComponent(id)}`,
    { credentials: "include" }
  );
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<ExplanationData>;
}

export function useExplanation(id: string) {
  return useQuery({
    queryKey: ["llm-explanation", id],
    queryFn: () => fetchExplanation(id),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
