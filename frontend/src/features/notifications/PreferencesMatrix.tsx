import * as Switch from "@radix-ui/react-switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ErrorState, SkeletonBlock } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { userMessage } from "@/lib/api/errors";
import { qk } from "@/lib/api/query-keys";
import type { PreferenceChange, PreferenceMatrix } from "@/lib/api/types";

/** The API returns camelCase keys (renderer) but expects snake_case enum values in updates. */
const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const KIND_LABEL: Record<string, string> = {
  analysisCompleted: "Analysis finished",
  analysisFailed: "Analysis failed",
  recruiterFeedback: "Recruiter feedback",
  shortlisted: "Shortlisted or moved forward",
  profileViewedDigest: "Weekly profile views",
  recruiterApproved: "Account approved",
  recruiterRejected: "Account not approved",
};
const CHANNELS = [
  { key: "inApp", label: "In-app" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
] as const;

export function PreferencesMatrix() {
  const client = useQueryClient();
  const prefs = useQuery({
    queryKey: qk.preferences,
    queryFn: () => unwrap(api.GET("/api/v1/me/notification-preferences")),
  });
  const save = useMutation({
    mutationFn: (change: PreferenceChange) =>
      unwrap(api.PUT("/api/v1/me/notification-preferences", { body: { preferences: [change] } })),
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey: qk.preferences });
      const before = client.getQueryData<PreferenceMatrix>(qk.preferences);
      const kindKey = Object.keys(before?.matrix ?? {}).find((k) => snake(k) === change.kind);
      const channelKey = change.channel === "in_app" ? "inApp" : change.channel;
      if (before && kindKey)
        client.setQueryData<PreferenceMatrix>(qk.preferences, {
          ...before,
          matrix: {
            ...before.matrix,
            [kindKey]: { ...before.matrix[kindKey], [channelKey]: change.enabled },
          },
        });
      return { before };
    },
    onError: (e, _c, ctx) => {
      if (ctx?.before) client.setQueryData(qk.preferences, ctx.before);
      toast.error(userMessage(e));
    },
    onSuccess: (data) => client.setQueryData(qk.preferences, data),
  });

  if (prefs.isPending) return <SkeletonBlock lines={5} label="Loading preferences" />;
  if (prefs.isError)
    return <ErrorState description={userMessage(prefs.error)} onRetry={() => prefs.refetch()} />;
  const { matrix, smsReady } = prefs.data;
  return (
    <div>
      {!smsReady && (
        <p className="mb-4 rounded-xl border border-line bg-white/[0.03] px-4 py-3 text-sm text-mist">
          SMS needs a verified phone number. Verify it in the Contact tab.
        </p>
      )}
      <table className="w-full text-sm">
        <caption className="sr-only">Notification preferences by kind and channel</caption>
        <thead>
          <tr className="text-left text-mist">
            <th scope="col" className="pb-3 font-medium">
              Notification
            </th>
            {CHANNELS.map((c) => (
              <th key={c.key} scope="col" className="pb-3 text-center font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {Object.entries(matrix).map(([kind, channels]) => (
            <tr key={kind}>
              <th scope="row" className="py-3 pr-3 text-left font-normal">
                {KIND_LABEL[kind] ?? kind}
              </th>
              {CHANNELS.map((c) => {
                if (!(c.key in channels))
                  return (
                    <td key={c.key} className="text-center text-mist" aria-label="Not available">
                      –
                    </td>
                  );
                const disabled = c.key === "sms" && !smsReady;
                const checked = Boolean(channels[c.key]);
                return (
                  <td key={c.key} className="text-center">
                    <Switch.Root
                      aria-label={`${KIND_LABEL[kind] ?? kind}: ${c.label}`}
                      checked={checked && !disabled}
                      disabled={disabled || save.isPending}
                      onCheckedChange={(enabled) =>
                        save.mutate({
                          kind: snake(kind) as PreferenceChange["kind"],
                          channel: (c.key === "inApp" ? "in_app" : c.key) as PreferenceChange["channel"],
                          enabled,
                        })
                      }
                      className="relative inline-block h-6 w-11 rounded-full border border-line bg-white/10 align-middle transition disabled:opacity-40 data-[state=checked]:border-flare data-[state=checked]:bg-flare"
                    >
                      <Switch.Thumb className="block h-5 w-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[22px]" />
                    </Switch.Root>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
