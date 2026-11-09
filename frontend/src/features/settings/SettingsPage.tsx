import * as Tabs from "@radix-ui/react-tabs";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Download, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { StatusChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { PasswordStrength } from "@/components/ui/PasswordStrength";
import { Toggle } from "@/components/ui/Toggle";
import { GithubButton } from "@/features/auth/parts";
import { PhoneVerifyDialog } from "@/features/auth/PhoneVerifyDialog";
import { PreferencesMatrix } from "@/features/notifications/PreferencesMatrix";
import { api, unwrap } from "@/lib/api/client";
import { fieldErrors, userMessage } from "@/lib/api/errors";
import { useAuth } from "@/lib/auth/auth-context";
import { tokens } from "@/lib/auth/tokens";
import { formatPhone } from "@/lib/phone";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg">{title}</h2>
        {description && <p className="text-sm text-mist">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ProfileTab() {
  const { user, refreshMe } = useAuth();
  const seeker = user?.jobSeekerProfile;
  const recruiter = user?.recruiterProfile;
  const { register, handleSubmit, formState } = useForm({
    defaultValues: {
      fullName: user?.fullName ?? "",
      headline: seeker?.headline ?? "",
      location: seeker?.location ?? "",
      jobTitle: recruiter?.jobTitle ?? "",
    },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await unwrap(
        api.PATCH("/api/v1/me", {
          body: seeker
            ? { fullName: v.fullName, headline: v.headline, location: v.location }
            : { fullName: v.fullName, jobTitle: v.jobTitle },
        }),
      );
      await refreshMe();
      toast("Profile saved");
    } catch (e) {
      toast.error(userMessage(e));
    }
  });
  return (
    <Section
      title="Profile"
      description={
        seeker ? "Shown on your skill card and to recruiters." : "Shown to candidates with your feedback."
      }
    >
      <form onSubmit={onSubmit} className="grid max-w-xl gap-4">
        <Field label="Full name">
          {({ id }) => <Input id={id} {...register("fullName", { required: true })} />}
        </Field>
        {seeker ? (
          <>
            <Field label="Headline" hint="e.g. Full-stack developer">
              {({ id }) => <Input id={id} maxLength={160} {...register("headline")} />}
            </Field>
            <Field label="Location">
              {({ id }) => <Input id={id} maxLength={120} {...register("location")} />}
            </Field>
          </>
        ) : (
          <>
            <Field label="Job title">
              {({ id }) => <Input id={id} maxLength={120} {...register("jobTitle")} />}
            </Field>
            <Field label="Company" hint="Contact the SkillProof team to change your company.">
              {({ id }) => <Input id={id} value={recruiter?.company?.name ?? ""} readOnly />}
            </Field>
          </>
        )}
        <div>
          <Button type="submit" loading={formState.isSubmitting}>
            Save profile
          </Button>
        </div>
      </form>
    </Section>
  );
}

function ContactTab() {
  const { user } = useAuth();
  const [phoneOpen, setPhoneOpen] = useState(false);
  const resend = useMutation({
    mutationFn: () => unwrap(api.POST("/api/v1/auth/email/resend")),
    onSuccess: () => toast("Verification email sent"),
    onError: (e) => toast.error(userMessage(e)),
  });
  if (!user) return null;
  return (
    <Section title="Contact" description="Recruiters never see your email or phone.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
          <div className="flex-1">
            <p className="text-sm text-mist">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          {user.emailVerified ? (
            <StatusChip tone="ok">Verified</StatusChip>
          ) : (
            <>
              <StatusChip tone="warn">Not verified</StatusChip>
              <Button size="sm" variant="glass" loading={resend.isPending} onClick={() => resend.mutate()}>
                Resend link
              </Button>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line px-4 py-3">
          <div className="flex-1">
            <p className="text-sm text-mist">Phone</p>
            <p className="font-medium">{user.phone ? formatPhone(user.phone) : "Not added"}</p>
          </div>
          {user.phone && (
            <StatusChip tone={user.phoneVerified ? "ok" : "warn"}>
              {user.phoneVerified ? "Verified" : "Not verified"}
            </StatusChip>
          )}
          <Button size="sm" variant="glass" onClick={() => setPhoneOpen(true)}>
            {user.phone ? (user.phoneVerified ? "Change number" : "Verify phone") : "Add phone"}
          </Button>
        </div>
      </div>
      <PhoneVerifyDialog open={phoneOpen} onOpenChange={setPhoneOpen} />
    </Section>
  );
}

function GithubTab() {
  const { user, refreshMe } = useAuth();
  const unlink = useMutation({
    mutationFn: () => unwrap(api.DELETE("/api/v1/auth/github")),
    onSuccess: async () => {
      await refreshMe();
      toast("GitHub unlinked");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const gh = user?.github;
  return (
    <Section
      title="GitHub"
      description="Your skill card is built from the account linked here. We read public repositories only."
    >
      {gh ? (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line px-4 py-3">
          <img src={gh.avatarUrl ?? ""} alt="" className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <p className="font-medium">@{gh.login}</p>
            <p className="text-sm text-mist">Connected</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={!user?.hasPassword}
            loading={unlink.isPending}
            onClick={() => unlink.mutate()}
          >
            Unlink GitHub
          </Button>
          {!user?.hasPassword && (
            <p className="w-full text-sm text-mist">
              Set a password first (Password tab), or you'd be locked out.
            </p>
          )}
        </div>
      ) : (
        <div className="max-w-xs">
          <GithubButton
            label="Connect GitHub"
            options={{ link: true, next: window.location.pathname }}
            onError={(m) => toast.error(m)}
          />
        </div>
      )}
    </Section>
  );
}

function PrivacyTab() {
  const { user, signOut, refreshMe } = useAuth();
  const visibility = useMutation({
    mutationFn: (cardVisible: boolean) => unwrap(api.PATCH("/api/v1/me", { body: { cardVisible } })),
    onSuccess: async () => {
      await refreshMe();
      toast("Saved");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const exportData = useMutation({
    mutationFn: () => unwrap(api.GET("/api/v1/me/export")),
    onSuccess: (data) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `skillproof-export-${user?.id}.json`,
      });
      a.click();
      URL.revokeObjectURL(url);
      toast("Your data was downloaded");
    },
    onError: (e) => toast.error(userMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () =>
      unwrap(
        // drf-spectacular never documents DELETE bodies (F-016); the view reads {password}.
        api.DELETE("/api/v1/me", { body: user?.hasPassword ? { password } : {} } as never),
      ),
    onSuccess: async () => {
      setOpen(false);
      await signOut("/");
      tokens.clear();
      toast("Your account was deleted");
      navigate("/", { replace: true });
    },
    onError: (e) => setError(fieldErrors(e).password ?? userMessage(e)),
  });
  const PHRASE = "delete my account";
  return (
    <Section title="Privacy" description="Your rights under the Kenya Data Protection Act, 2019.">
      {user?.jobSeekerProfile && (
        <div className="rounded-xl border border-line px-4 py-3">
          <Toggle
            label="Recruiters can find my card"
            description="Off hides you from recruiter search. Your share link keeps working."
            checked={user.jobSeekerProfile.cardVisible ?? true}
            disabled={visibility.isPending}
            onChange={(v) => visibility.mutate(v)}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line px-4 py-3">
        <div className="flex-1">
          <p className="font-medium">Download your data</p>
          <p className="text-sm text-mist">Everything we hold about you, as a JSON file.</p>
        </div>
        <Button size="sm" variant="glass" loading={exportData.isPending} onClick={() => exportData.mutate()}>
          <Download aria-hidden className="h-4 w-4" /> Download
        </Button>
      </div>
      {user?.role !== "admin" && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-bad/30 bg-bad/[0.05] px-4 py-3">
          <div className="flex-1">
            <p className="font-medium text-bad">Delete your account</p>
            <p className="text-sm text-mist">
              Permanently removes your account, analyses and personal data. Feedback you sent stays with its
              recipient, anonymised.
            </p>
          </div>
          <Button size="sm" variant="danger" onClick={() => setOpen(true)}>
            Delete account
          </Button>
        </div>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Delete your account?"
        description="This can't be undone. You'll be signed out everywhere."
      >
        <div className="space-y-4">
          <Field label={`Type "${PHRASE}" to confirm`}>
            {({ id }) => (
              <Input
                id={id}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          {user?.hasPassword ? (
            <Field label="Password" error={error ?? undefined}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              )}
            </Field>
          ) : (
            <p className="flex gap-2 text-sm text-mist">
              <ShieldAlert aria-hidden className="h-4 w-4 shrink-0 text-warn" /> Accounts without a password
              must have signed in with GitHub in the last 10 minutes.
              {error && <span className="text-bad">{error}</span>}
            </p>
          )}
          <Button
            variant="danger"
            className="w-full"
            disabled={confirm.trim().toLowerCase() !== PHRASE || (user?.hasPassword && !password)}
            loading={remove.isPending}
            onClick={() => {
              setError(null);
              remove.mutate();
            }}
          >
            Delete my account
          </Button>
        </div>
      </Dialog>
    </Section>
  );
}

function PasswordTab() {
  const { user } = useAuth();
  const [done, setDone] = useState(false);
  const { register, handleSubmit, watch, setError, reset, formState } = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      const pair = await unwrap(
        api.POST("/api/v1/auth/password/change", {
          body: user?.hasPassword ? v : { newPassword: v.newPassword },
        }),
      );
      tokens.set(pair); // other devices are signed out; this one keeps going with fresh tokens
      reset();
      setDone(true);
      toast("Password changed");
    } catch (e) {
      const f = fieldErrors(e);
      if (f.currentPassword) setError("currentPassword", { message: f.currentPassword });
      if (f.newPassword) setError("newPassword", { message: f.newPassword });
      if (!f.currentPassword && !f.newPassword) toast.error(userMessage(e));
    }
  });
  return (
    <Section
      title={user?.hasPassword ? "Change password" : "Set a password"}
      description="Changing it signs out your other devices."
    >
      <form onSubmit={onSubmit} className="grid max-w-md gap-4">
        {user?.hasPassword && (
          <Field label="Current password" error={formState.errors.currentPassword?.message}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="current-password"
                {...register("currentPassword", { required: true })}
              />
            )}
          </Field>
        )}
        <Field label="New password" error={formState.errors.newPassword?.message}>
          {({ id, describedBy, invalid }) => (
            <>
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                type="password"
                autoComplete="new-password"
                {...register("newPassword", { required: true, minLength: 8 })}
              />
              <PasswordStrength value={watch("newPassword")} />
            </>
          )}
        </Field>
        <div className="flex items-center gap-3">
          <Button type="submit" loading={formState.isSubmitting}>
            {user?.hasPassword ? "Change password" : "Set password"}
          </Button>
          {done && (
            <span className="inline-flex items-center gap-1 text-sm text-ok">
              <CheckCircle2 aria-hidden className="h-4 w-4" /> Done
            </span>
          )}
        </div>
      </form>
    </Section>
  );
}

const TABS = [
  { value: "profile", label: "Profile", Component: ProfileTab },
  { value: "contact", label: "Contact", Component: ContactTab },
  { value: "github", label: "GitHub", Component: GithubTab },
  { value: "notifications", label: "Notifications", Component: PreferencesMatrix },
  { value: "privacy", label: "Privacy", Component: PrivacyTab },
  { value: "password", label: "Password", Component: PasswordTab },
];

export function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get("tab")) ? (params.get("tab") as string) : "profile";
  return (
    <Tabs.Root value={tab} onValueChange={(v) => setParams({ tab: v })} className="space-y-4">
      <Tabs.List
        aria-label="Settings"
        className="glass-pill inline-flex max-w-full flex-wrap gap-1 rounded-2xl p-1"
      >
        {TABS.map((t) => (
          <Tabs.Trigger
            key={t.value}
            value={t.value}
            className="rounded-xl px-3.5 py-1.5 text-sm text-mist transition hover:text-ink data-[state=active]:bg-flare data-[state=active]:text-black"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {TABS.map(({ value, Component }) => (
        <Tabs.Content key={value} value={value}>
          <GlassPanel className="p-6">
            <Component />
          </GlassPanel>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
