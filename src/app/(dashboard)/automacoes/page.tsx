"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Plus, Play, Pause, Trash2, Loader2, X, ChevronRight, Activity } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type AutomationStatus = "ACTIVE" | "INACTIVE" | "DRAFT";
type AutomationTrigger =
  | "APPOINTMENT_CREATED" | "APPOINTMENT_CONFIRMED" | "APPOINTMENT_CANCELLED"
  | "APPOINTMENT_REMINDER_24H" | "APPOINTMENT_REMINDER_1H" | "APPOINTMENT_NO_SHOW"
  | "PAYMENT_RECEIVED" | "PAYMENT_OVERDUE" | "PATIENT_INACTIVE" | "PATIENT_BIRTHDAY" | "CUSTOM";

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  trigger: AutomationTrigger;
  status: AutomationStatus;
  executionCount: number;
  lastExecutedAt?: string | null;
  createdAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const TRIGGER_CONFIG: Record<AutomationTrigger, { label: string; color: string; emoji: string }> = {
  APPOINTMENT_CREATED:     { label: "Consulta criada",       color: "bg-blue-100 text-blue-700",    emoji: "📅" },
  APPOINTMENT_CONFIRMED:   { label: "Consulta confirmada",   color: "bg-emerald-100 text-emerald-700", emoji: "✅" },
  APPOINTMENT_CANCELLED:   { label: "Consulta cancelada",    color: "bg-red-100 text-red-700",      emoji: "❌" },
  APPOINTMENT_REMINDER_24H:{ label: "Lembrete 24h",          color: "bg-violet-100 text-violet-700", emoji: "🔔" },
  APPOINTMENT_REMINDER_1H: { label: "Lembrete 1h",           color: "bg-violet-100 text-violet-700", emoji: "⏰" },
  APPOINTMENT_NO_SHOW:     { label: "Não compareceu",        color: "bg-amber-100 text-amber-700",  emoji: "👻" },
  PAYMENT_RECEIVED:        { label: "Pagamento recebido",    color: "bg-emerald-100 text-emerald-700", emoji: "💰" },
  PAYMENT_OVERDUE:         { label: "Pagamento atrasado",    color: "bg-red-100 text-red-700",      emoji: "⚠️" },
  PATIENT_INACTIVE:        { label: "Paciente inativo",      color: "bg-slate-100 text-slate-600",  emoji: "💤" },
  PATIENT_BIRTHDAY:        { label: "Aniversário",           color: "bg-pink-100 text-pink-700",    emoji: "🎂" },
  CUSTOM:                  { label: "Personalizado",         color: "bg-indigo-100 text-indigo-700", emoji: "⚙️" },
};

const STATUS_CONFIG: Record<AutomationStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "Ativa",   color: "bg-emerald-100 text-emerald-700" },
  INACTIVE: { label: "Pausada", color: "bg-slate-100 text-slate-500" },
  DRAFT:    { label: "Rascunho", color: "bg-amber-100 text-amber-700" },
};

// Templates for quick creation
const TEMPLATES = [
  { name: "Lembrete 24h antes", description: "Envia mensagem WhatsApp 24h antes da consulta", trigger: "APPOINTMENT_REMINDER_24H" as AutomationTrigger },
  { name: "Lembrete 1h antes", description: "Envia mensagem WhatsApp 1h antes da consulta", trigger: "APPOINTMENT_REMINDER_1H" as AutomationTrigger },
  { name: "Confirmação de agendamento", description: "Confirma o agendamento via WhatsApp assim que criado", trigger: "APPOINTMENT_CREATED" as AutomationTrigger },
  { name: "Após cancelamento", description: "Envia link de reagendamento após cancelamento", trigger: "APPOINTMENT_CANCELLED" as AutomationTrigger },
  { name: "Cobrança atrasada", description: "Notifica paciente sobre pagamento em atraso", trigger: "PAYMENT_OVERDUE" as AutomationTrigger },
  { name: "Reativação de inativos", description: "Campanha para pacientes sem consulta há 90 dias", trigger: "PATIENT_INACTIVE" as AutomationTrigger },
  { name: "Feliz aniversário", description: "Mensagem automática no aniversário do paciente", trigger: "PATIENT_BIRTHDAY" as AutomationTrigger },
  { name: "No-show", description: "Mensagem de reagendamento para quem faltou", trigger: "APPOINTMENT_NO_SHOW" as AutomationTrigger },
];

// ── New Automation Modal ──────────────────────────────────────────────────────

function NewAutomationModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [step, setStep] = useState<"template" | "form">("template");
  const [form, setForm] = useState({ name: "", description: "", trigger: "APPOINTMENT_REMINDER_24H" as AutomationTrigger });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setForm({ name: t.name, description: t.description, trigger: t.trigger });
    setStep("form");
  }

  async function handleSubmit() {
    if (!form.name) { setError("Nome é obrigatório."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/v1/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, actions: [], status: "DRAFT" }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Erro"); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">
            {step === "template" ? "Escolher template" : "Configurar Automação"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        {step === "template" ? (
          <div className="p-4">
            <p className="mb-3 text-sm text-slate-500 px-2">Escolha um ponto de partida ou crie do zero:</p>
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {TEMPLATES.map((t) => {
                const cfg = TRIGGER_CONFIG[t.trigger];
                return (
                  <button key={t.trigger} onClick={() => selectTemplate(t)}
                    className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 p-3 text-left transition-all hover:border-teal-300 hover:bg-teal-50/50">
                    <span className="text-xl">{cfg.emoji}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-tight">{t.description}</p>
                    </div>
                  </button>
                );
              })}
              <button onClick={() => setStep("form")}
                className="flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-slate-200 p-3 text-left transition-all hover:border-teal-300 hover:bg-teal-50/50">
                <span className="text-xl">⚙️</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Do zero</p>
                  <p className="text-xs text-slate-400 mt-0.5">Configurar manualmente</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Lembrete 24h" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição</label>
              <input type="text" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Gatilho</label>
              <select value={form.trigger} onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value as AutomationTrigger }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500">
                {Object.entries(TRIGGER_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.emoji} {cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">
                💡 A automação será criada como <strong>Rascunho</strong>. Configure as ações pelo N8N e ative quando estiver pronta.
              </p>
            </div>
            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        )}

        {step === "form" && (
          <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
            <button onClick={() => setStep("template")} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Voltar</button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400">
              {saving ? <><Loader2 size={14} className="animate-spin" />Criando...</> : "Criar Automação"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AutomacoesPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newModal, setNewModal] = useState(false);

  const fetchAutomations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/automations");
      const json = await res.json();
      setAutomations(json.data ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

  async function toggleStatus(a: Automation) {
    const newStatus = a.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setAutomations((prev) => prev.map((x) => x.id === a.id ? { ...x, status: newStatus } : x));
    await fetch(`/api/v1/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function deleteAutomation(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/v1/automations/${id}`, { method: "DELETE" });
  }

  const active = automations.filter((a) => a.status === "ACTIVE").length;
  const totalRuns = automations.reduce((s, a) => s + a.executionCount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Zap size={22} className="text-teal-600" />Automações
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              {active} ativas · {totalRuns.toLocaleString("pt-BR")} execuções totais
            </p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
            <Plus size={16} />Nova Automação
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: "Ativas", value: active, color: "text-emerald-600" },
            { label: "Total", value: automations.length, color: "text-slate-700" },
            { label: "Execuções", value: totalRuns.toLocaleString("pt-BR"), color: "text-teal-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm text-center">
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
              <p className="mt-1 text-xs font-medium text-slate-400 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-teal-500" /></div>
        ) : automations.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Zap size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">Nenhuma automação criada</p>
            <p className="mt-1 text-sm text-slate-400">Crie sua primeira automação para economizar tempo</p>
            <button onClick={() => setNewModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              <Plus size={14} />Criar agora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {automations.map((a) => {
              const trig = TRIGGER_CONFIG[a.trigger];
              const stat = STATUS_CONFIG[a.status];
              return (
                <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-2xl">
                    {trig.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{a.name}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${stat.color}`}>{stat.label}</span>
                    </div>
                    {a.description && <p className="mt-0.5 text-sm text-slate-400 truncate">{a.description}</p>}
                    <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                      <span className={`rounded-full px-2 py-0.5 font-medium ${trig.color}`}>{trig.label}</span>
                      <span className="flex items-center gap-1"><Activity size={11} />{a.executionCount} execuções</span>
                      {a.lastExecutedAt && <span>Última: {new Date(a.lastExecutedAt).toLocaleDateString("pt-BR")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleStatus(a)}
                      title={a.status === "ACTIVE" ? "Pausar" : "Ativar"}
                      className={`rounded-lg p-2 transition-colors ${
                        a.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {a.status === "ACTIVE" ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button onClick={() => deleteAutomation(a.id)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {newModal && <NewAutomationModal onClose={() => setNewModal(false)} onSaved={fetchAutomations} />}
    </div>
  );
}
