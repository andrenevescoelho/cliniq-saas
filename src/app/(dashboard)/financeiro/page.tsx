"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard, Plus, Search, Filter, X, Loader2,
  CheckCircle, Clock, AlertCircle, XCircle,
  TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight,
  QrCode, Copy, ExternalLink,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";
type PaymentMethod = "PIX" | "CREDIT_CARD" | "DEBIT_CARD" | "CASH" | "INSURANCE" | "LINK";

interface Payment {
  id: string;
  description: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  dueDate?: string | null;
  paidAt?: string | null;
  pixCode?: string | null;
  pixQrCode?: string | null;
  paymentLink?: string | null;
  notes?: string | null;
  createdAt: string;
  patient?: { id: string; name: string } | null;
}

interface PaymentsResponse {
  payments: Payment[];
  total: number;
  page: number;
  pages: number;
  summary: { totalPaid: number; totalPending: number; totalOverdue: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: any }> = {
  PENDING:   { label: "Pendente",   color: "bg-amber-50 text-amber-700 border-amber-200",    icon: Clock },
  PAID:      { label: "Pago",       color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
  OVERDUE:   { label: "Atrasado",   color: "bg-red-50 text-red-700 border-red-200",           icon: AlertCircle },
  CANCELLED: { label: "Cancelado",  color: "bg-slate-50 text-slate-500 border-slate-200",     icon: XCircle },
  REFUNDED:  { label: "Estornado",  color: "bg-purple-50 text-purple-700 border-purple-200",  icon: XCircle },
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  PIX: "PIX", CREDIT_CARD: "Cartão Crédito", DEBIT_CARD: "Cartão Débito",
  CASH: "Dinheiro", INSURANCE: "Convênio", LINK: "Link",
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

// ── New Payment Modal ─────────────────────────────────────────────────────────

function NewPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    description: "", amount: "", method: "PIX" as PaymentMethod,
    dueDate: "", patientSearch: "", patientId: "", notes: "",
  });
  const [patients, setPatients] = useState<{ id: string; name: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (form.patientSearch.length < 2) { setPatients([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/v1/patients?search=${encodeURIComponent(form.patientSearch)}&limit=5`)
        .then((r) => r.json()).then((d) => setPatients(d.data?.patients ?? [])).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [form.patientSearch]);

  function set(field: string, value: string) { setForm((f) => ({ ...f, [field]: value })); }

  async function handleSubmit() {
    if (!form.description || !form.amount) { setError("Descrição e valor são obrigatórios."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/v1/financial/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: form.description,
          amount: parseFloat(form.amount.replace(",", ".")),
          method: form.method,
          dueDate: form.dueDate || undefined,
          patientId: form.patientId || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Erro"); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Nova Cobrança</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          {/* Patient search */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Paciente (opcional)</label>
            {form.patientId ? (
              <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5">
                <p className="text-sm font-medium text-teal-900">{form.patientSearch}</p>
                <button onClick={() => set("patientId", "") && set("patientSearch", "")} className="text-teal-500 hover:text-teal-700"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={form.patientSearch}
                  onChange={(e) => { set("patientSearch", e.target.value); setShowDropdown(true); }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                />
                {showDropdown && patients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {patients.map((p) => (
                      <button key={p.id} onClick={() => { setForm((f) => ({ ...f, patientId: p.id, patientSearch: p.name })); setShowDropdown(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50">{p.name}</button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descrição *</label>
            <input type="text" placeholder="Ex: Consulta ortopedia" value={form.description} onChange={(e) => set("description", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Valor (R$) *</label>
              <input type="text" placeholder="0,00" value={form.amount} onChange={(e) => set("amount", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Vencimento</label>
              <input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Forma de pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              {(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "INSURANCE", "LINK"] as PaymentMethod[]).map((m) => (
                <button key={m} onClick={() => set("method", m)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-all ${form.method === m ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:border-teal-300"}`}>
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400">
            {saving ? <><Loader2 size={14} className="animate-spin" />Gerando...</> : "Criar Cobrança"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PIX Modal ────────────────────────────────────────────────────────────────

function PixModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    if (payment.pixCode) { navigator.clipboard.writeText(payment.pixCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">PIX Copia e Cola</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
            <QrCode size={32} className="text-teal-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">{formatBRL(payment.amount)}</p>
            <p className="text-sm text-slate-500">{payment.description}</p>
          </div>
          {payment.pixCode ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="break-all text-xs font-mono text-slate-600">{payment.pixCode}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Código PIX não gerado ainda.</p>
          )}
          <div className="flex gap-2">
            {payment.pixCode && (
              <button onClick={copy} className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${copied ? "bg-emerald-100 text-emerald-700" : "bg-teal-600 text-white hover:bg-teal-700"}`}>
                <Copy size={14} />{copied ? "Copiado!" : "Copiar código"}
              </button>
            )}
            {payment.paymentLink && (
              <a href={payment.paymentLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                <ExternalLink size={14} />Link
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [data, setData] = useState<PaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [newModal, setNewModal] = useState(false);
  const [pixPayment, setPixPayment] = useState<Payment | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      const res = await fetch(`/api/v1/financial/payments?${params}`);
      const json = await res.json();
      setData(json.data);
    } catch {} finally { setLoading(false); }
  }, [page, search, filterStatus]);

  useEffect(() => { setPage(1); }, [search, filterStatus]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  async function markPaid(id: string) {
    await fetch(`/api/v1/financial/payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PAID" }),
    });
    fetchPayments();
  }

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <CreditCard size={22} className="text-teal-600" />Financeiro
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">Cobranças, PIX e pagamentos</p>
          </div>
          <button onClick={() => setNewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700">
            <Plus size={16} />Nova Cobrança
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="mb-6 grid grid-cols-3 gap-4">
            {[
              { label: "Recebido no mês", value: summary.totalPaid, color: "from-emerald-500 to-teal-600", icon: TrendingUp, trend: "positivo" },
              { label: "Pendente", value: summary.totalPending, color: "from-amber-400 to-orange-500", icon: Clock, trend: "neutral" },
              { label: "Atrasado", value: summary.totalOverdue, color: "from-red-400 to-rose-600", icon: TrendingDown, trend: "negativo" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{formatBRL(s.value)}</p>
                  </div>
                  <div className={`rounded-xl bg-gradient-to-br ${s.color} p-2.5 text-white shadow-sm`}>
                    <s.icon size={18} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <Search size={16} className="text-slate-400" />
            <input type="text" placeholder="Buscar por descrição ou paciente..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
            {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
            <Filter size={15} className="text-slate-400" />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-sm text-slate-700 outline-none">
              <option value="all">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="OVERDUE">Atrasado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-teal-500" /></div>
          ) : !data?.payments.length ? (
            <div className="py-16 text-center">
              <DollarSign size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhuma cobrança encontrada</p>
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {["Descrição", "Paciente", "Valor", "Método", "Vencimento", "Status", "Ações"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.payments.map((p) => {
                    const cfg = STATUS_CONFIG[p.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-medium text-slate-800">{p.description}</p>
                          <p className="text-xs text-slate-400">{formatDate(p.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{p.patient?.name ?? <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-slate-900">{formatBRL(p.amount)}</p>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">{METHOD_LABEL[p.method]}</td>
                        <td className="px-4 py-3.5 text-sm text-slate-500">
                          {p.dueDate ? formatDate(p.dueDate) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                            <StatusIcon size={11} />{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            {(p.method === "PIX" || p.pixCode) && (
                              <button onClick={() => setPixPayment(p)}
                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                <QrCode size={13} />
                              </button>
                            )}
                            {p.status === "PENDING" && (
                              <button onClick={() => markPaid(p.id)}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
                                Marcar pago
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                  <p className="text-xs text-slate-400">Página {data.page} de {data.pages}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"><ChevronLeft size={14} /></button>
                    <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                      className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40 hover:bg-slate-50"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {newModal && <NewPaymentModal onClose={() => setNewModal(false)} onSaved={fetchPayments} />}
      {pixPayment && <PixModal payment={pixPayment} onClose={() => setPixPayment(null)} />}
    </div>
  );
}
