import * as Menu from "@radix-ui/react-dropdown-menu";
import { BookOpen, ChevronDown, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth/auth-context";
import { env } from "@/lib/env";

const ROLE_LABEL = { job_seeker: "Job seeker", recruiter: "Recruiter", admin: "Admin" } as const;

export function UserMenu({ settingsPath }: { settingsPath: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  const name = user.fullName || user.email;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const item =
    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none data-[highlighted]:bg-white/10";
  return (
    <Menu.Root>
      <Menu.Trigger
        className="glass-pill flex h-10 items-center gap-2 rounded-full pl-1 pr-3 text-sm hover:bg-white/10"
        aria-label="Account menu"
      >
        {user.github?.avatarUrl ? (
          <img src={user.github.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-flare/20 text-xs font-bold text-flare-hot"
          >
            {initials}
          </span>
        )}
        <span className="hidden max-w-[10rem] truncate sm:block">{name}</span>
        <span className="hidden rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-mist md:block">
          {user.role ? ROLE_LABEL[user.role] : ""}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 text-mist" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="glass-panel glass-scrim z-50 min-w-[220px] rounded-2xl p-1.5 shadow-float"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-xs text-mist">{user.email}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-white/10" />
          <Menu.Item className={item} onSelect={() => navigate(settingsPath)}>
            <Settings aria-hidden className="h-4 w-4" /> Settings
          </Menu.Item>
          {user.role === "admin" && (
            <Menu.Item className={item} onSelect={() => window.open(env.apiDocsUrl, "_blank", "noopener")}>
              <BookOpen aria-hidden className="h-4 w-4" /> API docs
            </Menu.Item>
          )}
          <Menu.Item
            className={item}
            onSelect={async () => {
              // Leave the protected area first; otherwise the guard sends us to /login?next=…
              navigate("/", { replace: true });
              await signOut();
              toast("Signed out");
            }}
          >
            <LogOut aria-hidden className="h-4 w-4" /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
