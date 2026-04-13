"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ProjectArchiveState, ProjectKind, ProjectStatus, ProjectWorkType } from "@prisma/client";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/format-money";

export type ProjectListItem = {
  id: string;
  name: string;
  kind: ProjectKind;
  workType: ProjectWorkType;
  archiveState: ProjectArchiveState;
  status: ProjectStatus;
  budgetPlanned: number | null;
  currency: string;
  createdAt: string;
  client: { id: string; name: string } | null;
  owner: { id: string; label: string } | null;
  taskCount: number;
  timeEntryCount: number;
};

export type OrgMemberOption = { id: string; label: string };
export type ClientOption = { id: string; name: string };

const KIND_LABELS: Record<ProjectKind, string> = {
  [ProjectKind.COMMERCIAL]: "Коммерческий",
  [ProjectKind.INTERNAL]: "Внутренний",
};

const WORK_TYPE_LABELS: Record<ProjectWorkType, string> = {
  [ProjectWorkType.BRANDING]: "Брендинг",
  [ProjectWorkType.WEB_DEVELOPMENT]: "Веб-разработка",
  [ProjectWorkType.CONSULTING]: "Консалтинг",
  [ProjectWorkType.SUPPORT]: "Поддержка",
  [ProjectWorkType.MARKETING]: "Маркетинг",
  [ProjectWorkType.DESIGN]: "Дизайн",
  [ProjectWorkType.OTHER]: "Прочее",
};

const ARCHIVE_LABELS: Record<ProjectArchiveState, string> = {
  [ProjectArchiveState.ACTIVE]: "Актив",
  [ProjectArchiveState.ARCHIVED]: "Архив",
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  [ProjectStatus.PLANNED]: "Запланирован",
  [ProjectStatus.ACTIVE]: "Активен",
  [ProjectStatus.ON_HOLD]: "На паузе",
  [ProjectStatus.COMPLETED]: "Завершён",
  [ProjectStatus.CANCELLED]: "Отменён",
};

function formatCreated(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ProjectsBoard({
  initialProjects,
  initialClients,
  members,
  canEdit,
}: {
  initialProjects: ProjectListItem[];
  initialClients: ClientOption[];
  members: OrgMemberOption[];
  canEdit: boolean;
}) {
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [clients, setClients] = useState<ClientOption[]>(initialClients);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProjectKind>(ProjectKind.COMMERCIAL);
  const [workType, setWorkType] = useState<ProjectWorkType>(ProjectWorkType.OTHER);
  const [clientId, setClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("BYN");
  const [archiveState, setArchiveState] = useState<ProjectArchiveState>(ProjectArchiveState.ACTIVE);

  function resetCreateForm() {
    setName("");
    setKind(ProjectKind.COMMERCIAL);
    setWorkType(ProjectWorkType.OTHER);
    setClientId("");
    setNewClientName("");
    setOwnerId("");
    setBudget("");
    setCurrency("BYN");
    setArchiveState(ProjectArchiveState.ACTIVE);
  }

  async function patchProject(projectId: string, body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: ProjectListItem;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return;
      }
      if (data.project) {
        setProjects((prev) => prev.map((p) => (p.id === projectId ? data.project! : p)));
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  async function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        kind,
        workType,
        archiveState,
        currency: currency.trim().toUpperCase() || "BYN",
      };
      if (ownerId) {
        payload.ownerId = ownerId;
      }
      const b = budget.trim();
      if (b !== "") {
        payload.budgetPlanned = Number.parseFloat(b.replace(/\s/g, "").replace(",", "."));
      }
      if (kind === ProjectKind.COMMERCIAL) {
        if (newClientName.trim()) {
          payload.newClientName = newClientName.trim();
        } else if (clientId) {
          payload.clientId = clientId;
        }
      } else if (clientId) {
        payload.clientId = clientId;
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        project?: ProjectListItem;
      };
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать проект");
        return;
      }
      if (data.project) {
        setProjects((prev) => [data.project!, ...prev]);
        if (newClientName.trim() && data.project.client) {
          setClients((prev) => {
            if (prev.some((c) => c.id === data.project!.client!.id)) {
              return prev;
            }
            return [...prev, data.project!.client!].sort((a, b) => a.name.localeCompare(b.name, "ru"));
          });
        }
        setCreateOpen(false);
        resetCreateForm();
      }
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Каждая строка — отдельный проект. Ответственный, тип и категорию можно менять в списке.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              resetCreateForm();
              setCreateOpen(true);
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            Создать проект
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden border-b border-slate-200 bg-slate-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,0.65fr)] lg:gap-3">
          <span>Проект</span>
          <span>Ответственный</span>
          <span>Тип проекта</span>
          <span>Коммерческий / внутренний</span>
          <span>Актив / архив</span>
          <span>Бюджет</span>
          <span>Создан</span>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {projects.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">Проектов пока нет.</li>
          ) : (
            projects.map((p) => (
              <li key={p.id} className="px-4 py-4">
                <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.8fr)_minmax(0,0.65fr)] lg:items-center lg:gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{p.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {p.client ? p.client.name : "Без клиента"}
                      {" · "}
                      {STATUS_LABELS[p.status]}
                      {" · "}
                      задач: {p.taskCount}, время: {p.timeEntryCount}
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Ответственный</label>
                    <select
                      value={p.owner?.id ?? ""}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        const v = e.target.value;
                        void patchProject(p.id, { ownerId: v === "" ? null : v });
                      }}
                      className="select-field"
                    >
                      <option value="">— не назначен —</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Тип проекта</label>
                    <select
                      value={p.workType}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        void patchProject(p.id, { workType: e.target.value as ProjectWorkType });
                      }}
                      className="select-field"
                    >
                      {(Object.keys(WORK_TYPE_LABELS) as ProjectWorkType[]).map((key) => (
                        <option key={key} value={key}>
                          {WORK_TYPE_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Коммерческий / внутренний</label>
                    <select
                      value={p.kind}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        void patchProject(p.id, { kind: e.target.value as ProjectKind });
                      }}
                      className="select-field"
                    >
                      {(Object.keys(KIND_LABELS) as ProjectKind[]).map((key) => (
                        <option key={key} value={key}>
                          {KIND_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Актив / архив</label>
                    <select
                      value={p.archiveState}
                      disabled={!canEdit || saving}
                      onChange={(e) => {
                        void patchProject(p.id, {
                          archiveState: e.target.value as ProjectArchiveState,
                        });
                      }}
                      className="select-field"
                    >
                      {(Object.keys(ARCHIVE_LABELS) as ProjectArchiveState[]).map((key) => (
                        <option key={key} value={key}>
                          {ARCHIVE_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Бюджет</label>
                    {canEdit ? (
                      <BudgetField
                        disabled={saving}
                        initial={p.budgetPlanned}
                        currency={p.currency}
                        onCommit={(num) => {
                          void patchProject(p.id, { budgetPlanned: num });
                        }}
                      />
                    ) : (
                      <p className="py-2 text-sm text-slate-800 dark:text-slate-200">
                        {formatMoney(p.budgetPlanned, p.currency)}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 lg:hidden">Дата создания</label>
                    <p className="py-2 text-sm text-slate-700 dark:text-slate-300">{formatCreated(p.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <Dialog
        open={createOpen}
        onClose={() => {
          if (!saving) {
            setCreateOpen(false);
            resetCreateForm();
            setError(null);
          }
        }}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Новый проект</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Для коммерческого проекта укажите клиента. Внутренний может быть без заказчика.
            </p>
            <form onSubmit={submitCreate} className="mt-4 space-y-3">
              <div>
                <label htmlFor="proj-name" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Название
                </label>
                <input
                  id="proj-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="proj-kind" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Коммерческий / внутренний
                </label>
                <select
                  id="proj-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as ProjectKind)}
                  className="mt-1 select-field"
                >
                  {(Object.keys(KIND_LABELS) as ProjectKind[]).map((key) => (
                    <option key={key} value={key}>
                      {KIND_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              {kind === ProjectKind.COMMERCIAL && (
                <>
                  <div>
                    <label
                      htmlFor="proj-client"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      Клиент из списка
                    </label>
                    <select
                      id="proj-client"
                      value={clientId}
                      disabled={newClientName.trim().length > 0}
                      onChange={(e) => setClientId(e.target.value)}
                      className="mt-1 select-field"
                    >
                      <option value="">— не выбран —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="proj-new-client"
                      className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                    >
                      Или новый клиент
                    </label>
                    <input
                      id="proj-new-client"
                      type="text"
                      value={newClientName}
                      onChange={(e) => setNewClientName(e.target.value)}
                      placeholder="Название компании"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </>
              )}
              {kind === ProjectKind.INTERNAL && (
                <div>
                  <label
                    htmlFor="proj-client-int"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Клиент (необязательно)
                  </label>
                  <select
                    id="proj-client-int"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 select-field"
                  >
                    <option value="">— нет —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="proj-owner" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Ответственный
                </label>
                <select
                  id="proj-owner"
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="mt-1 select-field"
                >
                  <option value="">— не назначен —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="proj-wt" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Тип проекта
                </label>
                <select
                  id="proj-wt"
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value as ProjectWorkType)}
                  className="mt-1 select-field"
                >
                  {(Object.keys(WORK_TYPE_LABELS) as ProjectWorkType[]).map((key) => (
                    <option key={key} value={key}>
                      {WORK_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="proj-archive" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Актив / архив
                </label>
                <select
                  id="proj-archive"
                  value={archiveState}
                  onChange={(e) => setArchiveState(e.target.value as ProjectArchiveState)}
                  className="mt-1 select-field"
                >
                  {(Object.keys(ARCHIVE_LABELS) as ProjectArchiveState[]).map((key) => (
                    <option key={key} value={key}>
                      {ARCHIVE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="proj-budget"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Бюджет
                  </label>
                  <input
                    id="proj-budget"
                    type="text"
                    inputMode="decimal"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <div>
                  <label
                    htmlFor="proj-cur"
                    className="block text-xs font-medium text-slate-600 dark:text-slate-400"
                  >
                    Валюта
                  </label>
                  <input
                    id="proj-cur"
                    type="text"
                    maxLength={3}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreateForm();
                    setError(null);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-60"
                >
                  {saving ? "Сохранение…" : "Создать"}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}

function BudgetField({
  initial,
  currency,
  disabled,
  onCommit,
}: {
  initial: number | null;
  currency: string;
  disabled: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(initial != null ? String(initial) : "");

  useEffect(() => {
    setText(initial != null ? String(initial) : "");
  }, [initial]);

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const t = text.trim();
        if (t === "") {
          if (initial != null) {
            onCommit(null);
          }
          return;
        }
        const n = Number.parseFloat(t.replace(/\s/g, "").replace(",", "."));
        if (Number.isNaN(n)) {
          setText(initial != null ? String(initial) : "");
          return;
        }
        if (initial !== n) {
          onCommit(n);
        }
      }}
      placeholder={formatMoney(null, currency)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
    />
  );
}
