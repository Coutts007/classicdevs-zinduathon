import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useId } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { ErrorState, SkeletonBlock } from "@/components/ui/States";
import { api, unwrap } from "@/lib/api/client";
import { fieldErrors, userMessage } from "@/lib/api/errors";
import type { Job, JobStatus, JobWrite } from "@/lib/api/types";
import { EMPLOYMENT, MIN_LABELS, REMOTE } from "@/lib/labels";

import { useJob } from "./api";

type Form = {
  title: string;
  description: string;
  location: string;
  employmentType: keyof typeof EMPLOYMENT;
  remotePolicy: keyof typeof REMOTE;
  closesOn: string; // yyyy-mm-dd
  requiredSkills: { skill: string; minimumLabel: keyof typeof MIN_LABELS; weight: 1 | 2 | 3 }[];
};

const empty: Form = {
  title: "",
  description: "",
  location: "",
  employmentType: "full_time",
  remotePolicy: "onsite",
  closesOn: "",
  requiredSkills: [{ skill: "", minimumLabel: "moderate", weight: 2 }],
};

function fromJob(j: Job): Form {
  return {
    title: j.title,
    description: j.description ?? "",
    location: j.location ?? "",
    employmentType: j.employmentType ?? "full_time",
    remotePolicy: j.remotePolicy ?? "onsite",
    closesOn: j.closesAt ? j.closesAt.slice(0, 10) : "",
    requiredSkills: j.requiredSkills.map((r) => ({
      skill: r.skill,
      minimumLabel: r.minimumLabel ?? "moderate",
      weight: (r.weight ?? 1) as 1 | 2 | 3,
    })),
  };
}

function toBody(v: Form, status: JobStatus): JobWrite {
  return {
    title: v.title.trim(),
    description: v.description,
    location: v.location,
    employmentType: v.employmentType,
    remotePolicy: v.remotePolicy,
    // A closing date means "until the end of that day", in the recruiter's time zone.
    closesAt: v.closesOn ? new Date(`${v.closesOn}T23:59:59`).toISOString() : null,
    status,
    requiredSkills: v.requiredSkills
      .filter((r) => r.skill.trim())
      .map((r) => ({ skill: r.skill.trim(), minimumLabel: r.minimumLabel, weight: Number(r.weight) })),
  };
}

export function JobFormPage() {
  const { id } = useParams();
  const job = useJob(id);
  if (id && job.isPending)
    return (
      <GlassPanel className="p-6">
        <SkeletonBlock lines={8} label="Loading job" />
      </GlassPanel>
    );
  if (id && job.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(job.error)} onRetry={() => job.refetch()} />
      </GlassPanel>
    );
  return <JobForm job={job.data} />;
}

function JobForm({ job }: { job?: Job }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const listId = useId();
  const skills = useQuery({
    queryKey: ["skills", "catalogue"],
    queryFn: () => unwrap(api.GET("/api/v1/skills", { params: { query: { pageSize: 100 } } })),
    staleTime: 10 * 60_000,
  });
  const { register, control, handleSubmit, setError, reset, formState } = useForm<Form>({
    defaultValues: job ? fromJob(job) : empty,
  });
  useEffect(() => {
    if (job) reset(fromJob(job));
  }, [job, reset]);
  const rows = useFieldArray({ control, name: "requiredSkills" });
  const save = useMutation({
    mutationFn: (body: JobWrite) =>
      job
        ? unwrap(api.PATCH("/api/v1/jobs/{public_id}", { params: { path: { public_id: job.id } }, body }))
        : unwrap(api.POST("/api/v1/jobs", { body })),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["jobs"] });
      toast(saved.status === "open" ? "Job published" : "Draft saved");
      navigate(`/recruiter/jobs/${saved.id}`);
    },
    onError: (e) => {
      const f = fieldErrors(e);
      (["title", "description", "location", "requiredSkills"] as const).forEach(
        (k) => f[k] && setError(k === "requiredSkills" ? "root" : k, { message: f[k] }),
      );
      if (f.closesAt) setError("closesOn", { message: f.closesAt });
      if (!Object.keys(f).length) toast.error(userMessage(e));
    },
  });
  const submit = (status: JobStatus) => handleSubmit((v) => save.mutate(toBody(v, status)));
  const e = formState.errors;
  const published = job?.status === "open";
  return (
    <div className="space-y-3">
      <Link
        to={job ? `/recruiter/jobs/${job.id}` : "/recruiter/jobs"}
        className="inline-flex items-center gap-1 text-sm text-mist hover:text-ink"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" /> {job ? job.title : "Jobs"}
      </Link>
      <GlassPanel
        as="form"
        className="max-w-3xl space-y-6 p-6"
        onSubmit={submit(published ? "open" : "draft")}
      >
        <Field label="Title" error={e.title?.message}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              maxLength={120}
              {...register("title", { required: "Give the job a title." })}
            />
          )}
        </Field>
        <Field label="Description" error={e.description?.message}>
          {({ id, describedBy }) => (
            <Textarea id={id} aria-describedby={describedBy} rows={6} {...register("description")} />
          )}
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" error={e.location?.message}>
            {({ id }) => <Input id={id} maxLength={120} placeholder="Nairobi" {...register("location")} />}
          </Field>
          <Field label="Closes on" hint="Optional" error={e.closesOn?.message}>
            {({ id, describedBy }) => (
              <Input id={id} aria-describedby={describedBy} type="date" {...register("closesOn")} />
            )}
          </Field>
          <Field label="Employment type">
            {({ id }) => (
              <Select id={id} {...register("employmentType")}>
                {Object.entries(EMPLOYMENT).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Work setting">
            {({ id }) => (
              <Select id={id} {...register("remotePolicy")}>
                {Object.entries(REMOTE).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">Required skills</legend>
          <p className="text-sm text-mist">
            Candidates are ranked by proven skill against these. Weight 3 counts three times as much as weight
            1.
          </p>
          <datalist id={listId}>
            {skills.data?.results.map((s) => (
              <option key={s.slug} value={s.name} />
            ))}
          </datalist>
          {rows.fields.map((row, i) => (
            <div key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-end gap-2">
              <Field label={`Skill ${i + 1}`}>
                {({ id }) => (
                  <Input
                    id={id}
                    list={listId}
                    placeholder="e.g. Django"
                    {...register(`requiredSkills.${i}.skill`)}
                  />
                )}
              </Field>
              <Field label="At least">
                {({ id }) => (
                  <Select id={id} className="w-32" {...register(`requiredSkills.${i}.minimumLabel`)}>
                    {Object.entries(MIN_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Weight">
                {({ id }) => (
                  <Select
                    id={id}
                    className="w-20"
                    {...register(`requiredSkills.${i}.weight`, { valueAsNumber: true })}
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                  </Select>
                )}
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Remove skill ${i + 1}`}
                onClick={() => rows.remove(i)}
                className="mb-1"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {e.root?.message && (
            <p role="alert" className="text-sm text-bad">
              {e.root.message}
            </p>
          )}
          <Button
            type="button"
            variant="glass"
            size="sm"
            disabled={rows.fields.length >= 15}
            onClick={() => rows.append({ skill: "", minimumLabel: "moderate", weight: 1 })}
          >
            <Plus aria-hidden className="h-4 w-4" /> Add skill
          </Button>
        </fieldset>
        <div className="flex flex-wrap gap-3 border-t border-line pt-5">
          {published ? (
            <Button type="submit" loading={save.isPending}>
              Save changes
            </Button>
          ) : (
            <>
              <Button type="button" loading={save.isPending} onClick={submit("open")}>
                Publish
              </Button>
              <Button type="submit" variant="glass" disabled={save.isPending}>
                Save as draft
              </Button>
            </>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
