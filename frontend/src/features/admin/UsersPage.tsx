import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Select } from "@/components/ui/Field";
import { api, unwrap } from "@/lib/api/client";
import { fieldErrors, userMessage } from "@/lib/api/errors";
import type { AdminUser, Role } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/auth-context";
import { ago } from "@/lib/format";

import { ListPanel } from "./parts";
import { useUrlState } from "./url-state";

const ROLE: Record<Role, string> = { job_seeker: "Job seeker", recruiter: "Recruiter", admin: "Admin" };
type Change = {
  user: AdminUser;
  body: { isActive?: boolean; role?: Role };
  title: string;
  description: string;
};

export function UsersPage() {
  const { user: me } = useAuth();
  const client = useQueryClient();
  const { get, page, set, setPage } = useUrlState();
  const [text, setText] = useState(get("q"));
  useEffect(() => {
    const t = setTimeout(() => text.trim() !== get("q") && set({ q: text.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce on typing only
  }, [text]);
  const role = get("role") as Role | "";
  const active = get("active");
  const list = useQuery({
    queryKey: ["admin", "users", get("q"), role, active, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/users", {
          params: {
            query: {
              page,
              ...(get("q") ? { search: get("q") } : {}),
              ...(role ? { role } : {}),
              ...(active ? { isActive: active === "true" } : {}),
            },
          },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  const [change, setChange] = useState<Change | null>(null);
  const update = useMutation({
    mutationFn: (c: Change) =>
      unwrap(
        api.PATCH("/api/v1/admin/users/{public_id}", {
          params: { path: { public_id: c.user.id } },
          body: c.body,
        }),
      ),
    onSuccess: (_d, c) => {
      toast(c.title.replace("?", ""));
      void client.invalidateQueries({ queryKey: ["admin"] });
      setChange(null);
    },
    onError: (e) => {
      const f = fieldErrors(e);
      toast.error(f.role ?? f.id ?? userMessage(e));
    },
  });
  const name = (u: AdminUser) => u.fullName || u.email;
  return (
    <>
      <ListPanel
        query={list}
        page={page}
        onPage={setPage}
        empty={{ title: "No users match", description: "Try another search or filter." }}
        toolbar={
          <>
            <div className="relative w-full sm:w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-mist"
              />
              <Input
                type="search"
                aria-label="Search users"
                placeholder="Name or email"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              aria-label="Role"
              value={role}
              onChange={(e) => set({ role: e.target.value })}
              className="w-40"
            >
              <option value="">All roles</option>
              {Object.entries(ROLE).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Status"
              value={active}
              onChange={(e) => set({ active: e.target.value })}
              className="w-40"
            >
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Suspended</option>
            </Select>
          </>
        }
      >
        {(rows) => (
          <DataTable
            caption="Users"
            rows={rows}
            rowKey={(u) => u.id}
            columns={[
              {
                key: "user",
                header: "User",
                sortValue: (u) => name(u).toLowerCase(),
                cell: (u) => (
                  <div>
                    <p className="font-medium">{u.fullName || "–"}</p>
                    <p className="text-xs text-mist">
                      {u.email}
                      {u.githubLogin && <> · @{u.githubLogin}</>}
                      {u.company && <> · {u.company}</>}
                    </p>
                  </div>
                ),
              },
              {
                key: "role",
                header: "Role",
                sortValue: (u) => u.role,
                cell: (u) => (
                  <Select
                    aria-label={`Role for ${name(u)}`}
                    value={u.role}
                    disabled={u.id === me?.id}
                    onChange={(e) => {
                      const next = e.target.value as Role;
                      setChange({
                        user: u,
                        body: { role: next },
                        title: `Change role to ${ROLE[next]}?`,
                        description: `${name(u)} becomes a ${ROLE[next].toLowerCase()}. Their access switches to that area within a few minutes, when their session next refreshes.`,
                      });
                    }}
                    className="h-9 w-36 py-0 text-sm"
                  >
                    {Object.entries(ROLE).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                ),
              },
              {
                key: "verified",
                header: "Verified",
                cell: (u) => (
                  <span className="text-xs text-mist">
                    Email {u.emailVerified ? "✓" : "✗"} · Phone {u.phoneVerified ? "✓" : u.phone ? "✗" : "–"}
                    {u.approvalStatus && <> · {u.approvalStatus}</>}
                  </span>
                ),
              },
              {
                key: "joined",
                header: "Joined",
                sortValue: (u) => u.dateJoined,
                cell: (u) => ago(u.dateJoined),
              },
              {
                key: "seen",
                header: "Last sign-in",
                sortValue: (u) => u.lastLogin ?? "",
                cell: (u) => (u.lastLogin ? ago(u.lastLogin) : "Never"),
              },
              {
                key: "status",
                header: "Status",
                className: "text-right",
                cell: (u) => (
                  <div className="flex items-center justify-end gap-2">
                    <StatusChip tone={u.isActive ? "ok" : "bad"}>
                      {u.isActive ? "Active" : "Suspended"}
                    </StatusChip>
                    {u.id !== me?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setChange({
                            user: u,
                            body: { isActive: !u.isActive },
                            title: u.isActive ? `Suspend ${name(u)}?` : `Reactivate ${name(u)}?`,
                            description: u.isActive
                              ? "They're signed out everywhere and can't sign in until reactivated. Nothing is deleted."
                              : "They can sign in again.",
                          })
                        }
                      >
                        {u.isActive ? "Suspend" : "Reactivate"}
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        )}
      </ListPanel>
      <Dialog
        open={Boolean(change)}
        onOpenChange={(o) => !o && setChange(null)}
        title={change?.title ?? ""}
        description={change?.description}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setChange(null)}>
            Cancel
          </Button>
          <Button
            variant={change?.body.isActive === false ? "danger" : "primary"}
            loading={update.isPending}
            onClick={() => change && update.mutate(change)}
          >
            Confirm
          </Button>
        </div>
      </Dialog>
    </>
  );
}
