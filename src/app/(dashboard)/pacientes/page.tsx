"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, Search, Plus, Phone, Mail, Calendar, Tag,
  ChevronRight, X, Loader2, UserCheck, UserX, FileText,
  ChevronLeft, Filter,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatientTag { id: string; name: string; color: string }
interface Patient {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  birthDate?: string | null;
  document?: string | null;
  gender?: string | null;
  notes?: string | null;
  isActive: boolean;
  lastVisit?: string | null;
  createdAt: string;
  tags: PatientTag[];
  _count: { appointments: number };
}
interface PatientsResponse {
  patients: Patient[];
  total: number;
  page: number;
  pages: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function age(birthDate: string) {
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const GENDER_LABEL: Record<string, string> = {
  M: "Masculino", F: "Feminino", O: "Outro",
};

// ── New Patient Modal ─────────────────────────────────────────────────────────

function NewPatientModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", birthDate: "", document: "", gender: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    if (!form.name || !form.phone) { setError("Nome e telefone são obrigatórios."); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/v1/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          birthDate: form.birthDate || undefined,
          email: form.email || undefined,
          document: form.document || undefined,
          gender: form.gender || undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message ?? "Erro"); }
      onSaved(); onClose();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  const Field = ({ label, field, type = "text", placeholder = "" }: any) => (
    <label className="block">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={(form as any)[field]}
        onChange={(e) => set(field, e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Novo Paciente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-2 gap-4 p-6">
          <div className="col-span-2"><Field label="Nome completo *" field="name" placeholder="Maria da Silva" /></div>
          <Field label="Telefone / WhatsApp *" field="phone" placeholder="11999999999" />
          <Field label="Email" field="email" type="email" placeholder="maria@email.com" />
          <Field label="CPF" field="document" placeholder="000.000.000-00" />
          <Field label="Data de nascimento" field="birthDate" type="date" />
          <label className="block">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sexo</span>
            <select
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
            >
              <option value="">Selecionar</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="O">Outro</option>
            </select>
          </label>
          <div className="col-span-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Observações</span>
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                className="mt-1 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500"
              />
            </label>
          </div>
        </div>
        {error && <p className="mx-6 mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400">
            {saving ? <><Loader2 size={14} className="animate-spin" />Salvando...</> : "Cadastrar Paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Drawer ────────────────────────────────────────────────────────────

function PatientDrawer({ patient, onClose, onUpdated }: { patient: Patient; onClose: () => void; onUpdated: () => void }) {
  const [detail, setDetail] = useState<Patient | null>(null);

  useEffect(() => {
    fetch(`/api/v1/patients/${patient.id}`)
      .then((r) => r.json())
      .then((d) => setDetail(d.data))
      .catch(() => {});
  }, [patient.id]);

  const p = detail ?? patient;

  async function toggleActive() {
    await fetch(`/api/v1/patients/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    onUpdated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-950/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Ficha do Paciente</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-sky-500 text-xl font-bold text-white shadow-lg">
              {initials(p.name)}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {p.isActive ? <><UserCheck size={11} />Ativo</> : <><UserX size={11} />Inativo</>}
                </span>
                {p._count.appointments > 0 && (
                  <span className="text-xs text-slate-400">{p._count.appointments} consultas</span>
                )}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Telefone</p>
              <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-800"><Phone size={13} className="text-slate-400" />{p.phone}</p>
            </div>
            {p.email && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-800 truncate"><Mail size={13} className="text-slate-400" />{p.email}</p>
              </div>
            )}
            {p.birthDate && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Nascimento</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-800"><Calendar size={13} className="text-slate-400" />{formatDate(p.birthDate)} · {age(p.birthDate)} anos</p>
              </div>
            )}
            {p.document && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">CPF</p>
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-slate-800"><FileText size={13} className="text-slate-400" />{p.document}</p>
              </div>
            )}
            {p.gender && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sexo</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{GENDER_LABEL[p.gender] ?? p.gender}</p>
              </div>
            )}
            {p.lastVisit && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Última visita</p>
                <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(p.lastVisit)}</p>
              </div>
            )}
          </div>

          {/* Tags */}
          {p.tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tags</p>
              <div className="flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span key={t.id} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: t.color }}>
                    <Tag size={10} />{t.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {p.notes && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Observações</p>
              <p className="text-sm text-slate-700 leading-relaxed">{p.notes}</p>
            </div>
          )}

          {/* Recent appointments */}
          {(detail as any)?.appointments?.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Últimas Consultas</p>
              <div className="space-y-2">
                {(detail as any).appointments.slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{formatDate(a.startAt)}</p>
                      <p className="text-xs text-slate-400">{a.doctor?.user?.name ?? "—"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      a.status === "CONFIRMED" ? "bg-emerald-100 text-emerald-700" :
                      a.status === "COMPLETED" ? "bg-slate-100 text-slate-600" :
                      a.status === "CANCELLED" ? "bg-red-100 text-red-600" :
                      "bg-blue-100 text-blue-700"
                    }`}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-slate-100 px-6 py-4">
          <button
            onClick={toggleActive}
            className={`w-full rounded-xl py-2.5 text-sm font-semibold transition-colors ${
              p.isActive
                ? "border border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700"
                : "bg-teal-600 text-white hover:bg-teal-700"
            }`}
          >
            {p.isActive ? "Desativar Paciente" : "Reativar Paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PacientesPage() {
  const [data, setData] = useState<PatientsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showInactive, setShowInactive] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [selected, setSelected] = useState<Patient | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        page: String(page),
        limit: "20",
        active: showInactive ? "false" : "true",
      });
      const res = await fetch(`/api/v1/patients?${params}`);
      const json = await res.json();
      setData(json.data);
    } catch { } finally { setLoading(false); }
  }, [search, page, showInactive]);

  useEffect(() => { setPage(1); }, [search, showInactive]);
  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Users size={22} className="text-teal-600" />Pacientes
            </h1>
            {data && <p className="mt-0.5 text-sm text-slate-400">{data.total} pacientes {showInactive ? "inativos" : "ativos"}</p>}
          </div>
          <button
            onClick={() => setNewModal(true)}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
          >
            <Plus size={16} />Novo Paciente
          </button>
        </div>

        {/* Search + filters */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
            <Search size={16} className="shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, email ou CPF..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            {search && <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
              showInactive ? "border-amber-300 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter size={15} />{showInactive ? "Inativos" : "Ativos"}
          </button>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-teal-500" />
            </div>
          ) : !data?.patients.length ? (
            <div className="py-16 text-center">
              <Users size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">Nenhum paciente encontrado</p>
              {search && <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo</p>}
            </div>
          ) : (
            <>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paciente</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Contato</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Consultas</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Última visita</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tags</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.patients.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelected(p)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-500 text-sm font-bold text-white">
                            {initials(p.name)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{p.name}</p>
                            {p.birthDate && <p className="text-xs text-slate-400">{age(p.birthDate)} anos</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-sm text-slate-700">{p.phone}</p>
                        {p.email && <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.email}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          {p._count.appointments}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {p.lastVisit ? formatDate(p.lastVisit) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {p.tags.slice(0, 2).map((t) => (
                            <span key={t.id} className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ backgroundColor: t.color }}>
                              {t.name}
                            </span>
                          ))}
                          {p.tags.length > 2 && <span className="text-xs text-slate-400">+{p.tags.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <ChevronRight size={16} className="text-slate-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {data.pages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3">
                  <p className="text-xs text-slate-400">
                    Página {data.page} de {data.pages} · {data.total} pacientes
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 disabled:opacity-40 hover:bg-slate-50"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {newModal && <NewPatientModal onClose={() => setNewModal(false)} onSaved={fetchPatients} />}
      {selected && <PatientDrawer patient={selected} onClose={() => setSelected(null)} onUpdated={fetchPatients} />}
    </div>
  );
}
