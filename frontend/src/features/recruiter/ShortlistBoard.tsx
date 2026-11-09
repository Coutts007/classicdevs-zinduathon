import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { GripVertical, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { GlassPanel } from "@/components/glass/Glass";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { userMessage } from "@/lib/api/errors";
import type { Shortlist, ShortlistStage } from "@/lib/api/types";
import { ago } from "@/lib/format";
import { STAGE_ORDER, STAGES } from "@/lib/labels";
import { cn } from "@/lib/utils";

import { useJobs, useRemoveShortlist, useShortlists, useUpdateShortlist } from "./api";

type Move = (entry: Shortlist, stage: ShortlistStage) => void;

function EntryCard({ entry, onMove, overlay }: { entry: Shortlist; onMove: Move; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: entry.id, data: { entry } });
  const remove = useRemoveShortlist();
  const c = entry.candidate;
  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      className={cn(
        "glass-card group relative flex gap-2 rounded-card p-3",
        isDragging && !overlay && "opacity-30",
        overlay && "rotate-1 shadow-float ring-1 ring-flare/50",
      )}
    >
      <button
        type="button"
        aria-label={`Drag ${c.name || c.githubLogin}`}
        className="-ml-1 mt-0.5 h-6 shrink-0 cursor-grab touch-none rounded text-mist hover:text-ink active:cursor-grabbing"
        {...(overlay ? {} : { ...attributes, ...listeners })}
      >
        <GripVertical aria-hidden className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1">
        <Link
          to={`/recruiter/candidates/${c.githubLogin}`}
          className="line-clamp-2 block font-medium leading-snug hover:text-flare-hot"
        >
          {c.name || `@${c.githubLogin}`}
        </Link>
        {c.headline && <p className="line-clamp-2 text-xs text-mist">{c.headline}</p>}
        <p className="mt-1.5 line-clamp-2 text-xs text-mist">
          {entry.jobPosting?.title ?? "General"} · {ago(entry.updatedAt)}
        </p>
      </div>
      {!overlay && (
        <Menu.Root>
          <Menu.Trigger
            aria-label={`Actions for ${c.name || c.githubLogin}`}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-mist hover:bg-white/10 hover:text-ink"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Content
              align="end"
              sideOffset={4}
              className="glass-panel glass-scrim z-50 min-w-44 rounded-xl p-1 text-sm shadow-float"
            >
              <Menu.Label className="px-3 py-1.5 text-xs text-mist">Move to</Menu.Label>
              {STAGE_ORDER.filter((s) => s !== entry.stage).map((s) => (
                <Menu.Item
                  key={s}
                  onSelect={() => onMove(entry, s)}
                  className="cursor-pointer rounded-lg px-3 py-2 outline-none data-[highlighted]:bg-white/10"
                >
                  {STAGES[s].label}
                </Menu.Item>
              ))}
              <Menu.Separator className="my-1 h-px bg-line" />
              <Menu.Item
                onSelect={() => remove.mutate(entry.id, { onSuccess: () => toast("Removed from shortlist") })}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-bad outline-none data-[highlighted]:bg-bad/10"
              >
                <Trash2 aria-hidden className="h-4 w-4" /> Remove
              </Menu.Item>
            </Menu.Content>
          </Menu.Portal>
        </Menu.Root>
      )}
    </div>
  );
}

function Column({ stage, entries, onMove }: { stage: ShortlistStage; entries: Shortlist[]; onMove: Move }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${STAGES[stage].label}, ${entries.length}`}
      className={cn(
        "glass-panel flex min-h-60 w-72 shrink-0 flex-col rounded-glass p-3 transition lg:w-auto",
        isOver && "ring-2 ring-flare/60",
      )}
    >
      <h2 className="flex items-center justify-between px-1 pb-3 text-sm font-semibold">
        {STAGES[stage].label}
        <span className="tabular rounded-full bg-white/10 px-2 py-0.5 text-xs text-mist">
          {entries.length}
        </span>
      </h2>
      <ul className="flex flex-1 flex-col gap-2">
        {entries.map((e) => (
          <li key={e.id}>
            <EntryCard entry={e} onMove={onMove} />
          </li>
        ))}
        {entries.length === 0 && (
          <li className="grid flex-1 place-items-center rounded-card border border-dashed border-line p-4 text-center text-xs text-mist">
            Drop candidates here
          </li>
        )}
      </ul>
    </section>
  );
}

/** Arrow keys jump straight to the next column's centre instead of nudging 25 px at a time. */
const columnJump: KeyboardCoordinateGetter = (event, { context }) => {
  const { collisionRect, droppableRects } = context;
  if (!collisionRect) return undefined;
  const dir =
    event.code === "ArrowRight" || event.code === "ArrowDown"
      ? 1
      : event.code === "ArrowLeft" || event.code === "ArrowUp"
        ? -1
        : 0;
  if (!dir) return undefined;
  event.preventDefault();
  const x = collisionRect.left + collisionRect.width / 2;
  const centres = [...droppableRects.values()]
    .map((r) => ({ x: r.left + r.width / 2, y: r.top + Math.min(80, r.height / 2) }))
    .sort((a, b) => a.x - b.x);
  const next = dir > 0 ? centres.find((c) => c.x > x + 4) : [...centres].reverse().find((c) => c.x < x - 4);
  return next ? { x: next.x - collisionRect.width / 2, y: next.y - collisionRect.height / 2 } : undefined;
};

const announcements = (all: Shortlist[]): Announcements => {
  const name = (id: string | number) => {
    const c = all.find((e) => e.id === id)?.candidate;
    return c ? c.name || c.githubLogin : "candidate";
  };
  const col = (id: string | number | undefined) =>
    id ? (STAGES[id as ShortlistStage]?.label ?? id) : "no column";
  return {
    onDragStart: ({ active }) => `Picked up ${name(active.id)}.`,
    onDragOver: ({ active, over }) => `${name(active.id)} is over ${col(over?.id)}.`,
    onDragEnd: ({ active, over }) => (over ? `${name(active.id)} moved to ${col(over.id)}.` : "Not moved."),
    onDragCancel: ({ active }) => `Moving ${name(active.id)} was cancelled.`,
  };
};

/** Shortlist board: drag between stages (mouse, touch, keyboard) or use each card's "Move to" menu. */
export function ShortlistBoard() {
  const [params, setParams] = useSearchParams();
  const jobFilter = params.get("job") ?? "";
  const list = useShortlists();
  const jobs = useJobs();
  const update = useUpdateShortlist();
  const [dragging, setDragging] = useState<Shortlist | null>(null);
  const [interview, setInterview] = useState<Shortlist | null>(null);
  const [message, setMessage] = useState("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnJump }),
  );

  const move: Move = (entry, stage) => {
    if (stage === entry.stage) return;
    if (stage === "interview") {
      setMessage("");
      setInterview(entry);
      return;
    }
    update.mutate({ id: entry.id, stage }, { onSuccess: () => toast(`Moved to ${STAGES[stage].label}`) });
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const entry = list.data?.find((e) => e.id === active.id);
    if (entry && over) move(entry, over.id as ShortlistStage);
  };
  const confirmInterview = (send: boolean) => {
    if (!interview) return;
    update.mutate(
      {
        id: interview.id,
        stage: "interview",
        ...(send && message.trim() ? { feedbackMessage: message.trim() } : {}),
      },
      {
        onSuccess: () =>
          toast(send && message.trim() ? "Moved to Interview and feedback sent" : "Moved to Interview"),
      },
    );
    setInterview(null);
  };

  if (list.isPending)
    return (
      <div className="grid gap-3 lg:grid-cols-5">
        {STAGE_ORDER.map((s) => (
          <Skeleton key={s} className="h-60 rounded-glass" />
        ))}
      </div>
    );
  if (list.isError)
    return (
      <GlassPanel>
        <ErrorState description={userMessage(list.error)} onRetry={() => list.refetch()} />
      </GlassPanel>
    );
  const entries = list.data.filter((e) => !jobFilter || (e.jobPosting?.id ?? "none") === jobFilter);
  if (list.data.length === 0)
    return (
      <GlassPanel>
        <EmptyState
          title="Your shortlist is empty"
          description="Shortlist people from a candidate's card or a job's matches."
          action={
            <Link to="/recruiter/candidates">
              <Button>Find candidates</Button>
            </Link>
          }
        />
      </GlassPanel>
    );
  return (
    <div className="space-y-4">
      <div className="flex w-fit items-center gap-2 text-sm text-mist">
        <label htmlFor="board-job">Job</label>
        <Select
          id="board-job"
          value={jobFilter}
          onChange={(e) => setParams(e.target.value ? { job: e.target.value } : {})}
          className="h-9 w-auto py-0 text-sm"
        >
          <option value="">All jobs</option>
          <option value="none">General (no job)</option>
          {jobs.data?.results.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </Select>
      </div>
      <DndContext
        sensors={sensors}
        accessibility={{
          announcements: announcements(list.data),
          screenReaderInstructions: {
            draggable:
              "To move a candidate, press Space or Enter, use the left and right arrow keys to choose a column, then press Space or Enter again. Or use the actions menu on the card.",
          },
        }}
        onDragStart={({ active }) => setDragging(list.data.find((e) => e.id === active.id) ?? null)}
        onDragCancel={() => setDragging(null)}
        onDragEnd={onDragEnd}
      >
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {STAGE_ORDER.map((s) => (
            <Column
              key={s}
              stage={s}
              entries={entries.filter((e) => (e.stage ?? "saved") === s)}
              onMove={move}
            />
          ))}
        </div>
        <DragOverlay>{dragging && <EntryCard entry={dragging} onMove={move} overlay />}</DragOverlay>
      </DndContext>
      <Dialog
        open={Boolean(interview)}
        onOpenChange={(o) => !o && setInterview(null)}
        title="Move to Interview"
        description={`Send ${interview?.candidate.name || "them"} a note about next steps? They get it in their inbox, and by email and SMS if they've turned those on.`}
      >
        <div className="space-y-4">
          <Field label="Message (optional)" hint={`${message.trim().length}/1000`}>
            {({ id, describedBy }) => (
              <Textarea
                id={id}
                aria-describedby={describedBy}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="We'd like to invite you to an interview. Are you free on…"
              />
            )}
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => confirmInterview(false)}>
              Just move
            </Button>
            <Button
              disabled={!message.trim() || message.trim().length > 1000}
              onClick={() => confirmInterview(true)}
            >
              Move and send
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
