import {
  BadgeCheck,
  Bell,
  Briefcase,
  FileBarChart2,
  Inbox,
  LayoutDashboard,
  LineChart,
  Settings,
  ShieldAlert,
  KanbanSquare,
  ScrollText,
  Send,
  Sparkles,
  Tags,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useMatches, useNavigate } from "react-router-dom";

import { PhoneVerifyDialog } from "@/features/auth/PhoneVerifyDialog";
import { NotificationBell } from "@/features/notifications/NotificationBell";

import { EmailBanner } from "./EmailBanner";
import { UserMenu } from "./UserMenu";

import { Wordmark } from "@/components/brand/Logo";
import { SpaceBackdrop } from "@/components/space/SpaceBackdrop";
import { cn } from "@/lib/utils";

type Role = "job_seeker" | "recruiter" | "admin";

const NAV: Record<Role, { to: string; label: string; short?: string; icon: typeof LayoutDashboard }[]> = {
  job_seeker: [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app/analyse", label: "Analyse", icon: Sparkles },
    { to: "/app/card", label: "My card", icon: FileBarChart2 },
    { to: "/app/history", label: "History", icon: LineChart },
    { to: "/app/inbox", label: "Inbox", icon: Inbox },
    { to: "/app/jobs", label: "Jobs", icon: Briefcase },
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/settings", label: "Settings", icon: Settings },
  ],
  recruiter: [
    { to: "/recruiter", label: "Dashboard", icon: LayoutDashboard },
    { to: "/recruiter/candidates", label: "Candidates", icon: Users },
    { to: "/recruiter/jobs", label: "Jobs", icon: Briefcase },
    { to: "/recruiter/shortlists", label: "Shortlists", icon: KanbanSquare },
    { to: "/recruiter/feedback", label: "Feedback sent", short: "Feedback", icon: Send },
    { to: "/recruiter/notifications", label: "Notifications", icon: Bell },
    { to: "/recruiter/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/recruiters", label: "Recruiters", icon: BadgeCheck },
    { to: "/admin/users", label: "Users", icon: Users },
    { to: "/admin/analyses", label: "Analyses", icon: Sparkles },
    { to: "/admin/deliveries", label: "Deliveries", icon: Send },
    { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
    { to: "/admin/skills", label: "Skills", icon: Tags },
    { to: "/admin/audit-log", label: "Audit log", short: "Audit", icon: ScrollText },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

/**
 * Floating glass sidebar + top bar over the SpaceBackdrop (role-specific items arrive with each
 * role's phase). Bottom bar on small screens.
 */
export function AppShell({ area }: { area: Role }) {
  const items = NAV[area];
  const location = useLocation();
  const navigate = useNavigate();
  // Route metadata: { handle: { title } } names the page in the top bar and <title>.
  const matches = useMatches() as { handle?: { title?: string } }[];
  const title = [...matches].reverse().find((m) => m.handle?.title)?.handle?.title ?? "Dashboard";
  const [phoneOpen, setPhoneOpen] = useState(false);
  useEffect(() => {
    document.title = `${title} · SkillProof`;
  }, [title]);
  useEffect(() => {
    // After registering with SMS feedback, verify the phone straight away.
    if ((location.state as { verifyPhone?: boolean } | null)?.verifyPhone) {
      setPhoneOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);
  const settingsPath =
    area === "job_seeker"
      ? "/app/settings"
      : area === "recruiter"
        ? "/recruiter/settings"
        : "/admin/settings";
  const notificationsPath =
    area === "admin"
      ? "/admin/notifications"
      : `${area === "job_seeker" ? "/app" : "/recruiter"}/notifications`;
  return (
    <div className="relative min-h-screen">
      <SpaceBackdrop />
      <aside className="glass-panel fixed bottom-4 left-4 top-4 z-40 hidden w-60 flex-col rounded-glass p-3 lg:flex">
        <div className="px-3 py-3">
          <Wordmark />
        </div>
        <nav aria-label="App" className="mt-4 flex flex-col gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-mist transition hover:bg-white/5 hover:text-ink",
                  isActive &&
                    "bg-flare/10 text-ink shadow-[inset_0_0_0_1px_rgb(var(--flare)/0.35),0_0_24px_-8px_rgb(var(--flare)/0.6)]",
                )
              }
            >
              <Icon aria-hidden className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="overflow-x-clip lg:pl-[17rem]">
        <header className="glass-panel sticky top-4 z-30 mx-4 mt-4 flex h-14 items-center justify-between rounded-glass px-5">
          <h1 className="text-base font-semibold">{title}</h1>
          <div className="flex items-center gap-2">
            <NotificationBell allPath={notificationsPath} />
            <UserMenu settingsPath={settingsPath} />
          </div>
        </header>
        <EmailBanner />
        <main id="main" className="p-4 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <nav
        aria-label="App"
        className="glass-panel fixed inset-x-3 bottom-3 z-40 flex justify-around rounded-glass p-2 lg:hidden"
      >
        {items.slice(0, 5).map(({ to, label, short, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] text-mist",
                isActive && "text-flare-hot",
              )
            }
          >
            <Icon aria-hidden className="h-5 w-5" />
            <span className="max-w-full truncate">{short ?? label}</span>
          </NavLink>
        ))}
      </nav>
      <PhoneVerifyDialog open={phoneOpen} onOpenChange={setPhoneOpen} />
    </div>
  );
}
