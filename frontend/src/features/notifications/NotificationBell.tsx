import * as Popover from "@radix-ui/react-popover";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ago } from "@/lib/format";
import { cn } from "@/lib/utils";

import { useMarkAllRead, useMarkRead, useUnreadNotifications } from "./api";

/** Bell with unread count (polled every 60 s) and a popover of the latest unread items. */
export function NotificationBell({ allPath }: { allPath: string }) {
  const unread = useUnreadNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const navigate = useNavigate();
  const count = unread.data?.count ?? 0;
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={count ? `Notifications, ${count} unread` : "Notifications"}
        className="relative grid h-9 w-9 place-items-center rounded-full text-mist hover:bg-white/10 hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="tabular absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-flare px-1 text-[10px] font-bold text-black">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="glass-panel glass-scrim z-50 w-[min(92vw,360px)] rounded-2xl p-2 shadow-float"
        >
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="font-semibold">Notifications</p>
            {count > 0 && (
              <button
                type="button"
                onClick={() => markAll.mutate()}
                className="inline-flex items-center gap-1 text-xs text-flare-hot hover:underline"
              >
                <CheckCheck aria-hidden className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          {unread.data?.results.length ? (
            <ul className="max-h-80 overflow-auto">
              {unread.data.results.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      markRead.mutate(n.id);
                      if (n.linkPath)
                        navigate(
                          n.linkPath === "/inbox" ? allPath.replace(/notifications$/, "inbox") : n.linkPath,
                        );
                    }}
                    className={cn("w-full rounded-xl px-3 py-2.5 text-left hover:bg-white/[0.06]")}
                  >
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="line-clamp-2 text-sm text-mist">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-mist">{ago(n.createdAt)}</p>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-mist">You're all caught up.</p>
          )}
          <Link
            to={allPath}
            className="mt-1 block rounded-xl px-3 py-2 text-center text-sm text-flare-hot hover:bg-white/[0.06]"
          >
            See all notifications
          </Link>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
