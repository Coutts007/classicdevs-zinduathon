import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useProgressGlow } from "@/components/space/progress-glow";
import { api, unwrap } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { AnalysisDetail } from "@/lib/api/types";

export const POLL_MS = 1500;
const running = (a?: AnalysisDetail) => a?.status === "queued" || a?.status === "running";

/** Poll one analysis every 1.5 s until it completes or fails; paused while the tab is hidden. */
export function useAnalysisPolling(id: string | null) {
  const { setStep } = useProgressGlow();
  const query = useQuery({
    queryKey: qk.analysis(id ?? "none"),
    queryFn: () => unwrap(api.GET("/api/v1/analyses/{public_id}", { params: { path: { public_id: id! } } })),
    enabled: Boolean(id),
    refetchInterval: (q) => (running(q.state.data) ? POLL_MS : false),
    refetchIntervalInBackground: false,
  });
  // The backdrop glow follows the steps and settles when the card appears.
  const data = query.data;
  useEffect(() => {
    if (!data) return;
    setStep(data.status === "completed" ? 5 : data.status === "failed" ? 0 : Math.max(1, data.progressStep));
  }, [data, setStep]);
  useEffect(() => () => setStep(0), [setStep]);
  return query;
}

/**
 * POST /analyses: 202 → poll the new id; 200 → a fresh card was reused; 409 → resume the one
 * already running (we look it up in the history).
 */
export function useStartAnalysis() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: async (force: boolean) => {
      const { data, error, response } = await api.POST("/api/v1/analyses", { body: { force } });
      if (response.status === 409) {
        const list = await unwrap(api.GET("/api/v1/analyses", { params: { query: { page: 1 } } }));
        const current = list.results.find((a) => a.status === "queued" || a.status === "running");
        if (current) return { id: current.id, reused: false };
      }
      if (!response.ok || !data) throw (await import("@/lib/api/errors")).toApiError(response.status, error);
      if ("card" in data) {
        queryClient.setQueryData(qk.analysis(data.id), data);
        return { id: data.id, reused: true };
      }
      return { id: data.id, reused: false };
    },
    onSuccess: ({ id }) => {
      setActiveId(id);
      queryClient.invalidateQueries({ queryKey: ["analyses", "list"] });
    },
  });
  return {
    ...mutation,
    activeId,
    setActiveId,
    isConflict: mutation.error instanceof ApiError && mutation.error.code === "analysis_in_progress",
  };
}
