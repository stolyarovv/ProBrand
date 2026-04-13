"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { DealStage } from "@prisma/client";
import { useState } from "react";

export type FunnelDeal = {
  id: string;
  title: string;
  stage: DealStage;
  lostReason: string | null;
  amount: number;
  currency: string;
  client: { id: string; name: string };
};

export type ClientOption = { id: string; name: string };

const COLUMNS: { id: string; label: string; stages: DealStage[] }[] = [
  { id: "lead", label: "Лид", stages: [DealStage.LEAD, DealStage.QUALIFIED] },
  { id: "proposal", label: "Предложение отправлено", stages: [DealStage.PROPOSAL] },
  { id: "thinking", label: "Думает", stages: [DealStage.NEGOTIATION] },
  { id: "sold", label: "Продано", stages: [DealStage.WON] },
  { id: "lost", label: "Провал", stages: [DealStage.LOST] },
];

function columnIdForStage(stage: DealStage): string {
  const col = COLUMNS.find((c) => c.stages.includes(stage));
  return col?.id ?? "lead";
}

function stageForColumn(columnId: string): DealStage {
  switch (columnId) {
    case "lead":
      return DealStage.LEAD;
    case "proposal":
      return DealStage.PROPOSAL;
    case "thinking":
      return DealStage.NEGOTIATION;
    case "sold":
      return DealStage.WON;
    case "lost":
      return DealStage.LOST;
    default:
      return DealStage.LEAD;
  }
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("ru-RU")} ${currency}`;
}

type ViewMode = "funnel" | "active";

export function SalesFunnelBoard({
  initialDeals,
  initialClients,
  canEdit,
}: {
  initialDeals: FunnelDeal[];
  initialClients: ClientOption[];
  canEdit: boolean;
}) {
  const [deals, setDeals] = useState<FunnelDeal[]>(initialDeals);
  const [clients, setClients] = useState<ClientOption[]>(initialClients);
  const [view, setView] = useState<ViewMode>("funnel");
  const [lostPromptDealId, setLostPromptDealId] = useState<string | null>(null);
  const [lostReasonDraft, setLostReasonDraft] = useState("");
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [leadClientId, setLeadClientId] = useState("");
  const [leadNewName, setLeadNewName] = useState("");
  const [leadTitle, setLeadTitle] = useState("Новая сделка");
  const [leadAmount, setLeadAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commitStage(dealId: string, stage: DealStage, lostReason?: string): Promise<boolean> {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          stage === DealStage.LOST
            ? { stage, lostReason: lostReason ?? "" }
            : { stage },
        ),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; deal?: FunnelDeal };
      if (!res.ok) {
        setError(data.error ?? "Не удалось сохранить");
        return false;
      }
      if (data.deal) {
        setDeals((prev) => prev.map((d) => (d.id === dealId ? data.deal! : d)));
      }
      return true;
    } catch {
      setError("Ошибка сети");
      return false;
    } finally {
      setSaving(false);
    }
  }

  function handleDrop(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    if (!canEdit) return;
    const dealId = e.dataTransfer.getData("text/deal-id");
    if (!dealId) return;

    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    const nextStage = stageForColumn(columnId);
    if (deal.stage === nextStage) return;

    if (columnId === "lost") {
      setLostReasonDraft(deal.lostReason ?? "");
      setLostPromptDealId(dealId);
      return;
    }

    void commitStage(dealId, nextStage);
  }

  async function confirmLost() {
    if (!lostPromptDealId) return;
    const trimmed = lostReasonDraft.trim();
    if (!trimmed) {
      setError("Укажите причину провала");
      return;
    }
    setError(null);
    const ok = await commitStage(lostPromptDealId, DealStage.LOST, trimmed);
    if (ok) {
      setLostPromptDealId(null);
      setLostReasonDraft("");
    }
  }

  function resetAddLeadForm() {
    setLeadClientId("");
    setLeadNewName("");
    setLeadTitle("Новая сделка");
    setLeadAmount("");
  }

  async function submitNewLead() {
    setSaving(true);
    setError(null);
    const newName = leadNewName.trim();
    const amountNum = leadAmount.trim() === "" ? 0 : Number(leadAmount.replace(/\s/g, "").replace(",", "."));
    if (Number.isNaN(amountNum) || amountNum < 0) {
      setError("Укажите корректную сумму");
      setSaving(false);
      return;
    }
    try {
      const body =
        newName.length > 0
          ? { newClientName: newName, title: leadTitle.trim() || "Новая сделка", amount: amountNum }
          : {
              clientId: leadClientId,
              title: leadTitle.trim() || "Новая сделка",
              amount: amountNum,
            };
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; deal?: FunnelDeal };
      if (!res.ok) {
        setError(data.error ?? "Не удалось создать лид");
        setSaving(false);
        return;
      }
      if (data.deal) {
        setDeals((prev) => [data.deal!, ...prev]);
        const c = data.deal.client;
        setClients((prev) =>
          prev.some((x) => x.id === c.id)
            ? prev
            : [...prev, c].sort((a, b) => a.name.localeCompare(b.name, "ru")),
        );
      }
      setAddLeadOpen(false);
      resetAddLeadForm();
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          role="tablist"
          aria-label="Раздел продаж"
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === "funnel"}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === "funnel"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            onClick={() => setView("funnel")}
          >
            Воронка продаж
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "active"}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              view === "active"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            onClick={() => setView("active")}
          >
            Действующие клиенты
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                resetAddLeadForm();
                setAddLeadOpen(true);
              }}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              Добавить лид
            </button>
          )}
          {!canEdit && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Только просмотр: перетаскивание доступно редакторам.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {view === "active" ? (
        <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">Раздел скоро будет доступен.</p>
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto px-4 pb-2">
          <div className="flex min-h-[28rem] gap-4" style={{ minWidth: "min-content" }}>
            {COLUMNS.map((col) => {
              const inColumn = deals.filter((d) => columnIdForStage(d.stage) === col.id);
              return (
                <section
                  key={col.id}
                  className="flex w-64 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/40"
                  onDragOver={
                    canEdit
                      ? (e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      : undefined
                  }
                  onDrop={canEdit ? (e) => handleDrop(e, col.id) : undefined}
                >
                  <div className="border-b border-slate-200 px-3 py-3 dark:border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{col.label}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{inColumn.length}</p>
                  </div>
                  <ul className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {inColumn.map((deal) => (
                      <li key={deal.id}>
                        <article
                          draggable={canEdit}
                          onDragStart={
                            canEdit
                              ? (e) => {
                                  e.dataTransfer.setData("text/deal-id", deal.id);
                                  e.dataTransfer.effectAllowed = "move";
                                }
                              : undefined
                          }
                          className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 ${
                            canEdit ? "cursor-grab active:cursor-grabbing" : ""
                          }`}
                        >
                          <p className="font-medium text-slate-900 dark:text-white">{deal.client.name}</p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{deal.title}</p>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {formatMoney(deal.amount, deal.currency)}
                          </p>
                          {deal.stage === DealStage.LOST && deal.lostReason && (
                            <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-amber-800 dark:border-slate-800 dark:text-amber-200">
                              <span className="font-medium">Провал: </span>
                              {deal.lostReason}
                            </p>
                          )}
                        </article>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}

      <Dialog
        open={addLeadOpen}
        onClose={() => {
          if (!saving) {
            setAddLeadOpen(false);
            resetAddLeadForm();
            setError(null);
          }
        }}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Новый лид</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Сделка появится в колонке «Лид». Выберите клиента или введите имя нового.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="lead-client" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Клиент из списка
                </label>
                <select
                  id="lead-client"
                  value={leadClientId}
                  disabled={leadNewName.trim().length > 0}
                  onChange={(e) => setLeadClientId(e.target.value)}
                  className="mt-1 select-field disabled:opacity-50"
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
                <label htmlFor="lead-new" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Или новый клиент / компания
                </label>
                <input
                  id="lead-new"
                  type="text"
                  value={leadNewName}
                  onChange={(e) => setLeadNewName(e.target.value)}
                  placeholder="Название лида"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
                {leadNewName.trim().length > 0 && (
                  <p className="mt-1 text-xs text-slate-500">Список клиентов отключён, пока заполнено это поле.</p>
                )}
              </div>
              <div>
                <label htmlFor="lead-title" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Название сделки
                </label>
                <input
                  id="lead-title"
                  type="text"
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="lead-amount" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Сумма (опционально)
                </label>
                <input
                  id="lead-amount"
                  type="text"
                  inputMode="decimal"
                  value={leadAmount}
                  onChange={(e) => setLeadAmount(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={saving}
                onClick={() => {
                  setAddLeadOpen(false);
                  resetAddLeadForm();
                  setError(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={saving}
                onClick={() => void submitNewLead()}
              >
                Создать
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>

      <Dialog
        open={lostPromptDealId !== null}
        onClose={() => {
          if (!saving) {
            setLostPromptDealId(null);
            setLostReasonDraft("");
            setError(null);
          }
        }}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Причина провала</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Текст будет сохранён в карточке сделки.
            </p>
            <textarea
              value={lostReasonDraft}
              onChange={(e) => setLostReasonDraft(e.target.value)}
              rows={4}
              placeholder="Например: нет бюджета, выбрали другого подрядчика…"
              className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                disabled={saving}
                onClick={() => {
                  setLostPromptDealId(null);
                  setLostReasonDraft("");
                  setError(null);
                }}
              >
                Отмена
              </button>
              <button
                type="button"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                disabled={saving}
                onClick={confirmLost}
              >
                Сохранить
              </button>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
}
