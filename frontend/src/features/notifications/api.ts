import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api, unwrap } from "@/lib/api/client";
import { qk } from "@/lib/api/query-keys";
import type { Notification } from "@/lib/api/types";

type Page = { count: number; next: string | null; previous: string | null; results: Notification[] };

/** Unread count for the bell, refreshed every 60 s. */
export function useUnreadNotifications() {
  return useQuery({
    queryKey: qk.unreadCount,
    queryFn: () =>
      unwrap(api.GET("/api/v1/notifications", { params: { query: { unread: true, page: 1, pageSize: 5 } } })),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useNotifications(unreadOnly: boolean, page: number) {
  return useQuery({
    queryKey: qk.notifications(unreadOnly, page),
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/notifications", {
          params: { query: { ...(unreadOnly ? { unread: true } : {}), page, pageSize: 20 } },
        }),
      ),
  });
}

/** Optimistic: the item looks read immediately; rolled back if the API refuses. */
export function useMarkRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      unwrap(api.POST("/api/v1/notifications/{public_id}/read", { params: { path: { public_id: id } } })),
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: ["notifications"] });
      const snapshot = client.getQueriesData<Page>({ queryKey: ["notifications"] });
      const now = new Date().toISOString();
      client.setQueriesData<Page>({ queryKey: ["notifications"] }, (old) =>
        old?.results
          ? { ...old, results: old.results.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? now } : n)) }
          : old,
      );
      return { snapshot };
    },
    onError: (_e, _id, ctx) => ctx?.snapshot.forEach(([key, data]) => client.setQueryData(key, data)),
    onSettled: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/notifications/read-all")),
    onSettled: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
