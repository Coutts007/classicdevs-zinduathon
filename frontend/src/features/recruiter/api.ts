import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { FeedbackStatus, JobStatus, Shortlist, ShortlistStage } from "@/lib/api/types";

export type CandidateQuery = {
  skills?: string;
  minLabel?: "emerging" | "moderate" | "strong";
  minScore?: number;
  openToWork?: boolean;
  search?: string;
  ordering?: "-signalScore" | "-analysedAt";
  page?: number;
};

export function useCandidates(query: CandidateQuery) {
  return useQuery({
    queryKey: qk.candidates(query),
    queryFn: () => unwrap(api.GET("/api/v1/candidates", { params: { query: { ...query, pageSize: 20 } } })),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(login: string) {
  return useQuery({
    queryKey: qk.candidate(login),
    queryFn: () =>
      unwrap(api.GET("/api/v1/candidates/{github_login}", { params: { path: { github_login: login } } })),
  });
}

export function useJobs(status: JobStatus | "" = "", page = 1) {
  return useQuery({
    queryKey: qk.jobs(status, page),
    queryFn: () =>
      unwrap(api.GET("/api/v1/jobs", { params: { query: { page, ...(status ? { status } : {}) } } })),
    placeholderData: keepPreviousData,
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: qk.job(id ?? "new"),
    queryFn: () => unwrap(api.GET("/api/v1/jobs/{public_id}", { params: { path: { public_id: id! } } })),
    enabled: Boolean(id),
  });
}

export function useMatches(id: string, page = 1, minMatch = 0) {
  return useQuery({
    queryKey: qk.matches(id, page, minMatch),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/jobs/{public_id}/matches", {
          params: {
            path: { public_id: id },
            query: { page, pageSize: 20, ...(minMatch ? { minMatch } : {}) },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** All shortlist entries (the board shows every stage at once; pages are fetched until done). */
export function useShortlists() {
  return useQuery({
    queryKey: qk.shortlists(),
    queryFn: async () => {
      const all: Shortlist[] = [];
      for (let page = 1; page <= 20; page++) {
        const data = await unwrap(api.GET("/api/v1/shortlists", { params: { query: { page } } }));
        all.push(...data.results);
        if (!data.next) break;
      }
      return all;
    },
  });
}

export function useAddToShortlist(login: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { jobPostingId?: string | null; stage?: ShortlistStage; notifyCandidate?: boolean }) =>
      unwrap(api.POST("/api/v1/shortlists", { body: { githubLogin: login, ...body } })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["shortlists"] });
      void client.invalidateQueries({ queryKey: qk.candidate(login) });
      toast("Added to your shortlist");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
}

type StageChange = {
  id: string;
  stage?: ShortlistStage;
  note?: string;
  notifyCandidate?: boolean;
  feedbackMessage?: string;
};

/** Move / annotate an entry. Optimistic on the board list, rolled back on error. */
export function useUpdateShortlist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: StageChange) =>
      unwrap(api.PATCH("/api/v1/shortlists/{public_id}", { params: { path: { public_id: id } }, body })),
    onMutate: async ({ id, stage, note }) => {
      await client.cancelQueries({ queryKey: qk.shortlists() });
      const before = client.getQueryData<Shortlist[]>(qk.shortlists());
      client.setQueryData<Shortlist[]>(qk.shortlists(), (old) =>
        old?.map((e) =>
          e.id === id ? { ...e, ...(stage ? { stage } : {}), ...(note !== undefined ? { note } : {}) } : e,
        ),
      );
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(qk.shortlists(), ctx.before);
      toast.error(userMessage(e));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["shortlists"] });
      void client.invalidateQueries({ queryKey: ["candidates", "detail"] });
      void client.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
}

export function useRemoveShortlist() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE("/api/v1/shortlists/{public_id}", { params: { path: { public_id: id } } })),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: qk.shortlists() });
      const before = client.getQueryData<Shortlist[]>(qk.shortlists());
      client.setQueryData<Shortlist[]>(qk.shortlists(), (old) => old?.filter((e) => e.id !== id));
      return { before };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.before) client.setQueryData(qk.shortlists(), ctx.before);
      toast.error(userMessage(e));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ["shortlists"] });
      void client.invalidateQueries({ queryKey: ["candidates", "detail"] });
    },
  });
}

export function useSendFeedback(login: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (body: { status: FeedbackStatus; message: string; jobPostingId?: string | null }) =>
      unwrap(
        api.POST("/api/v1/candidates/{github_login}/feedback", {
          params: { path: { github_login: login } },
          body,
        }),
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.candidate(login) });
      void client.invalidateQueries({ queryKey: ["feedback"] });
    },
  });
}
