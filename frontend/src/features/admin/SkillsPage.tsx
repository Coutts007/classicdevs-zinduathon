import * as Tabs from "@radix-ui/react-tabs";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Input, Select } from "@/components/ui/Field";
import { api, unwrap } from "@/lib/api/client";
import { fieldErrors, userMessage } from "@/lib/api/errors";
import type { AdminSkill, DependencyMapping, Ecosystem } from "@/lib/api/types";

import { ListPanel } from "./parts";
import { useUrlState } from "./url-state";

const CATEGORIES = {
  language: "Language",
  framework: "Framework",
  practice: "Practice",
  tool: "Tool",
} as const;
type Category = keyof typeof CATEGORIES;
const ECOSYSTEMS: Record<Ecosystem, string> = { npm: "npm", pypi: "PyPI", go: "Go", maven: "Maven" };

const firstError = (e: unknown) => Object.values(fieldErrors(e))[0] ?? userMessage(e);
const splitAliases = (v: string) =>
  v
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

function SkillRowEditor({ skill, onDone }: { skill: AdminSkill; onDone: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(skill.name);
  const [category, setCategory] = useState(skill.category as Category);
  const [aliases, setAliases] = useState(skill.aliases.join(", "));
  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH("/api/v1/admin/skills/{slug}", {
          params: { path: { slug: skill.slug } },
          body: { name: name.trim(), category, aliases: splitAliases(aliases) },
        }),
      ),
    onSuccess: () => {
      toast(`${name} saved. It applies from the next analysis.`);
      void client.invalidateQueries({ queryKey: ["admin", "skills"] });
      onDone();
    },
    onError: (e) => toast.error(firstError(e)),
  });
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Input
        aria-label="Skill name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-9 w-40"
      />
      <Select
        aria-label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="h-9 w-36 py-0 text-sm"
      >
        {Object.entries(CATEGORIES).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <Input
        aria-label="Aliases, comma separated"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        className="h-9 min-w-48 flex-1"
      />
      <Button size="sm" type="submit" loading={save.isPending} aria-label="Save skill">
        <Check aria-hidden className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={onDone} aria-label="Cancel editing">
        <X aria-hidden className="h-4 w-4" />
      </Button>
    </form>
  );
}

function AddSkill() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("framework");
  const [aliases, setAliases] = useState("");
  const add = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST("/api/v1/admin/skills", {
          body: { name: name.trim(), category, aliases: splitAliases(aliases) },
        }),
      ),
    onSuccess: () => {
      toast(`${name} added. It applies from the next analysis.`);
      setName("");
      setAliases("");
      void client.invalidateQueries({ queryKey: ["admin", "skills"] });
    },
    onError: (e) => toast.error(firstError(e)),
  });
  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) add.mutate();
      }}
    >
      <Input
        aria-label="New skill name"
        placeholder="New skill, e.g. FastAPI"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-10 w-48"
      />
      <Select
        aria-label="New skill category"
        value={category}
        onChange={(e) => setCategory(e.target.value as Category)}
        className="h-10 w-36 py-0 text-sm"
      >
        {Object.entries(CATEGORIES).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <Input
        aria-label="New skill aliases"
        placeholder="Aliases, comma separated"
        value={aliases}
        onChange={(e) => setAliases(e.target.value)}
        className="h-10 min-w-48 flex-1"
      />
      <Button type="submit" size="sm" loading={add.isPending} disabled={!name.trim()}>
        <Plus aria-hidden className="h-4 w-4" /> Add skill
      </Button>
    </form>
  );
}

function SkillsTab() {
  const { page, setPage } = useUrlState();
  const [editing, setEditing] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["admin", "skills", page],
    queryFn: () => unwrap(api.GET("/api/v1/admin/skills", { params: { query: { page } } })),
    placeholderData: keepPreviousData,
  });
  return (
    <ListPanel
      query={list}
      page={page}
      onPage={setPage}
      toolbar={<AddSkill />}
      empty={{ title: "No skills yet", description: "Add the first one above." }}
    >
      {(rows) => (
        <DataTable
          caption="Skill catalogue"
          rows={rows}
          rowKey={(s) => s.slug}
          columns={[
            {
              key: "skill",
              header: "Skill",
              sortValue: (s) => s.name.toLowerCase(),
              cell: (s) =>
                editing === s.slug ? (
                  <SkillRowEditor skill={s} onDone={() => setEditing(null)} />
                ) : (
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="font-mono text-xs text-mist">{s.slug}</p>
                  </div>
                ),
            },
            {
              key: "category",
              header: "Category",
              sortValue: (s) => s.category,
              cell: (s) => (editing === s.slug ? null : (CATEGORIES[s.category as Category] ?? s.category)),
            },
            {
              key: "aliases",
              header: "Aliases",
              cell: (s) =>
                editing === s.slug ? null : <span className="text-mist">{s.aliases.join(", ") || "–"}</span>,
            },
            {
              key: "edit",
              header: "Edit",
              className: "text-right",
              cell: (s) =>
                editing === s.slug ? null : (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => setEditing(s.slug)}
                  >
                    <Pencil aria-hidden className="h-4 w-4" />
                  </Button>
                ),
            },
          ]}
        />
      )}
    </ListPanel>
  );
}

function MappingSkill({ m }: { m: DependencyMapping }) {
  const client = useQueryClient();
  const listId = useId();
  const [value, setValue] = useState(m.skill);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Opened by the user's click on "change": move focus into the field they asked to edit, once.
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);
  const catalogue = useQuery({
    queryKey: ["skills", "catalogue"],
    queryFn: () => unwrap(api.GET("/api/v1/skills", { params: { query: { pageSize: 100 } } })),
    staleTime: 10 * 60_000,
    enabled: editing,
  });
  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PATCH("/api/v1/admin/dependency-mappings/{ecosystem}/{package}", {
          params: { path: { ecosystem: m.ecosystem, package: m.packageName } },
          body: { skill: value.trim() },
        }),
      ),
    onSuccess: () => {
      toast(`${m.packageName} now counts as ${value}`);
      setEditing(false);
      void client.invalidateQueries({ queryKey: ["admin", "mappings"] });
    },
    onError: (e) => toast.error(firstError(e)),
  });
  if (!editing)
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 hover:text-flare-hot"
        aria-label={`Change skill for ${m.packageName} (${m.skill})`}
      >
        {m.skill} <Pencil aria-hidden className="h-3.5 w-3.5 text-mist" />
      </button>
    );
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <datalist id={listId}>
        {catalogue.data?.results.map((s) => (
          <option key={s.slug} value={s.name} />
        ))}
      </datalist>
      <Input
        aria-label={`Skill for ${m.packageName}`}
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-44"
        ref={inputRef}
      />
      <Button size="sm" type="submit" loading={save.isPending} aria-label="Save mapping">
        <Check aria-hidden className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={() => setEditing(false)} aria-label="Cancel">
        <X aria-hidden className="h-4 w-4" />
      </Button>
    </form>
  );
}

function AddMapping() {
  const client = useQueryClient();
  const listId = useId();
  const [ecosystem, setEcosystem] = useState<Ecosystem>("npm");
  const [pkg, setPkg] = useState("");
  const [skill, setSkill] = useState("");
  const catalogue = useQuery({
    queryKey: ["skills", "catalogue"],
    queryFn: () => unwrap(api.GET("/api/v1/skills", { params: { query: { pageSize: 100 } } })),
    staleTime: 10 * 60_000,
  });
  const add = useMutation({
    mutationFn: () =>
      unwrap(
        api.POST("/api/v1/admin/dependency-mappings", {
          body: { ecosystem, packageName: pkg.trim(), skill: skill.trim() },
        }),
      ),
    onSuccess: () => {
      toast(`${pkg} → ${skill} added`);
      setPkg("");
      setSkill("");
      void client.invalidateQueries({ queryKey: ["admin", "mappings"] });
    },
    onError: (e) => toast.error(firstError(e)),
  });
  return (
    <form
      className="flex w-full flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (pkg.trim() && skill.trim()) add.mutate();
      }}
    >
      <Select
        aria-label="New mapping ecosystem"
        value={ecosystem}
        onChange={(e) => setEcosystem(e.target.value as Ecosystem)}
        className="h-10 w-32 py-0 text-sm"
      >
        {Object.entries(ECOSYSTEMS).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <Input
        aria-label="Package name"
        placeholder="Package, e.g. fastapi"
        value={pkg}
        onChange={(e) => setPkg(e.target.value)}
        className="h-10 w-48"
      />
      <datalist id={listId}>
        {catalogue.data?.results.map((s) => (
          <option key={s.slug} value={s.name} />
        ))}
      </datalist>
      <Input
        aria-label="Maps to skill"
        placeholder="Skill"
        list={listId}
        value={skill}
        onChange={(e) => setSkill(e.target.value)}
        className="h-10 w-44"
      />
      <Button type="submit" size="sm" loading={add.isPending} disabled={!pkg.trim() || !skill.trim()}>
        <Plus aria-hidden className="h-4 w-4" /> Add mapping
      </Button>
    </form>
  );
}

function MappingsTab() {
  const { get, page, set, setPage } = useUrlState();
  const ecosystem = get("ecosystem") as Ecosystem | "";
  const list = useQuery({
    queryKey: ["admin", "mappings", ecosystem, page],
    queryFn: () =>
      unwrap(
        api.GET("/api/v1/admin/dependency-mappings", {
          params: { query: { page, ...(ecosystem ? { ecosystem } : {}) } },
        }),
      ),
    placeholderData: keepPreviousData,
  });
  return (
    <ListPanel
      query={list}
      page={page}
      onPage={setPage}
      empty={{
        title: "No mappings",
        description: "Map a package (e.g. pypi django) to a skill so analyses count it.",
      }}
      toolbar={
        <>
          <Select
            aria-label="Filter by ecosystem"
            value={ecosystem}
            onChange={(e) => set({ ecosystem: e.target.value })}
            className="h-10 w-40 py-0 text-sm"
          >
            <option value="">All ecosystems</option>
            {Object.entries(ECOSYSTEMS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <AddMapping />
        </>
      }
    >
      {(rows) => (
        <DataTable
          caption="Dependency mappings"
          rows={rows}
          rowKey={(m) => `${m.ecosystem}/${m.packageName}`}
          columns={[
            {
              key: "eco",
              header: "Ecosystem",
              sortValue: (m) => m.ecosystem,
              cell: (m) => ECOSYSTEMS[m.ecosystem],
            },
            {
              key: "pkg",
              header: "Package",
              sortValue: (m) => m.packageName,
              cell: (m) => <span className="font-mono text-xs">{m.packageName}</span>,
            },
            {
              key: "skill",
              header: "Counts as",
              sortValue: (m) => m.skill,
              cell: (m) => <MappingSkill m={m} />,
            },
          ]}
        />
      )}
    </ListPanel>
  );
}

export function SkillsPage() {
  const { get, set } = useUrlState();
  const tab = get("tab") === "mappings" ? "mappings" : "skills";
  return (
    <Tabs.Root
      value={tab}
      onValueChange={(v) => set({ tab: v === "skills" ? null : v, ecosystem: null })}
      className="space-y-4"
    >
      <Tabs.List aria-label="Catalogue" className="glass-pill inline-flex gap-1 rounded-2xl p-1">
        {[
          ["skills", "Skills"],
          ["mappings", "Dependency mappings"],
        ].map(([v, l]) => (
          <Tabs.Trigger
            key={v}
            value={v!}
            className="rounded-xl px-3.5 py-1.5 text-sm text-mist transition hover:text-ink data-[state=active]:bg-flare data-[state=active]:text-black"
          >
            {l}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <p className="text-sm text-mist">Changes apply from the next analysis; no deploy needed.</p>
      <Tabs.Content value="skills">
        <SkillsTab />
      </Tabs.Content>
      <Tabs.Content value="mappings">
        <MappingsTab />
      </Tabs.Content>
    </Tabs.Root>
  );
}
