"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  FileText,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Stethoscope,
  Phone,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppointmentSlot {
  startAt: string;
  endAt: string;
}

export interface AppointmentData {
  id: string;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "RESCHEDULED";
  title?: string | null;
  notes?: string | null;
  patient: { id: string; name: string; phone: string };
  doctor?: { user: { name: string } } | null;
  schedule: { name: string; slotMinutes: number };
}

interface Patient {
  id: string;
  name: string;
  phone: string;
}

interface Schedule {
  id: string;
  name: string;
  slotMinutes: number;
}

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  // When viewing/editing an existing appointment
  appointment?: AppointmentData | null;
  // When creating new (slot pre-filled from calendar click)
  prefillDate?: Date | null;
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  SCHEDULED: { label: "Agendado", color: "bg-blue-100 text-blue-700", icon: Clock },
  CONFIRMED: { label: "Confirmado", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  COMPLETED: { label: "Concluído", color: "bg-slate-100 text-slate-600", icon: CheckCircle },
  CANCELLED: { label: "Cancelado", color: "bg-red-100 text-red-700", icon: XCircle },
  NO_SHOW: { label: "Não compareceu", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  RESCHEDULED: { label: "Reagendado", color: "bg-purple-100 text-purple-700", icon: Calendar },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: Date) {
  return d.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AppointmentModal({
  open,
  onClose,
  onSaved,
  appointment,
  prefillDate,
}: AppointmentModalProps) {
  const isViewing = !!appointment;

  // Form state
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");

  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = prefillDate ?? new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      setPatientSearch("");
      setSelectedPatient(null);
      setSelectedScheduleId("");
      setSlots([]);
      setSelectedSlot(null);
      setTitle("");
      setNotes("");
      setError("");
      setSaving(false);
    } else if (prefillDate) {
      setSelectedDate(
        `${prefillDate.getFullYear()}-${pad(prefillDate.getMonth() + 1)}-${pad(prefillDate.getDate())}`
      );
    }
  }, [open, prefillDate]);

  // Load schedules on mount
  useEffect(() => {
    if (!open || isViewing) return;
    fetch("/api/v1/appointments/schedules")
      .then((r) => r.json())
      .then((d) => setSchedules(d.data ?? []))
      .catch(() => {});
  }, [open, isViewing]);

  // Search patients with debounce
  useEffect(() => {
    if (!patientSearch || patientSearch.length < 2) {
      setPatients([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/v1/patients?search=${encodeURIComponent(patientSearch)}&limit=6`)
        .then((r) => r.json())
        .then((d) => setPatients(d.data ?? []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  // Load slots when schedule + date change
  const loadSlots = useCallback(async () => {
    if (!selectedScheduleId || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const r = await fetch(
        `/api/v1/appointments/slots?scheduleId=${selectedScheduleId}&date=${selectedDate}`
      );
      const d = await r.json();
      setSlots(d.data ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedScheduleId, selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!selectedPatient || !selectedScheduleId || !selectedSlot) {
      setError("Preencha paciente, agenda e horário.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/v1/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          scheduleId: selectedScheduleId,
          startAt: selectedSlot.startAt,
          endAt: selectedSlot.endAt,
          title: title || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erro ao salvar");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Cancel appointment ────────────────────────────────────────────────────

  async function handleCancel() {
    if (!appointment) return;
    if (!confirm("Cancelar este agendamento?")) return;
    try {
      await fetch(`/api/v1/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      onSaved();
      onClose();
    } catch {
      setError("Erro ao cancelar.");
    }
  }

  // ── Confirm appointment ───────────────────────────────────────────────────

  async function handleConfirm() {
    if (!appointment) return;
    try {
      await fetch(`/api/v1/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      onSaved();
      onClose();
    } catch {
      setError("Erro ao confirmar.");
    }
  }

  if (!open) return null;

  // ── View mode ─────────────────────────────────────────────────────────────

  if (isViewing && appointment) {
    const cfg = STATUS_CONFIG[appointment.status];
    const StatusIcon = cfg.icon;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.color}`}>
                <StatusIcon size={12} />
                {cfg.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-6">
            {appointment.title && (
              <h2 className="text-lg font-semibold text-slate-900">{appointment.title}</h2>
            )}

            {/* Patient */}
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                <User size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{appointment.patient.name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Phone size={11} />
                  {appointment.patient.phone}
                </p>
              </div>
            </div>

            {/* Date/time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Data</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {new Date(appointment.startAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Horário</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
                </p>
              </div>
            </div>

            {/* Doctor + Schedule */}
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Stethoscope size={14} className="text-slate-400" />
              <span>
                {appointment.doctor?.user.name ?? "—"} &middot;{" "}
                <span className="text-slate-400">{appointment.schedule.name}</span>
              </span>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="rounded-xl border border-slate-100 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Obs.</p>
                <p className="mt-1 text-sm text-slate-700">{appointment.notes}</p>
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          {(appointment.status === "SCHEDULED" || appointment.status === "CONFIRMED") && (
            <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
              {appointment.status === "SCHEDULED" && (
                <button
                  onClick={handleConfirm}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                >
                  <CheckCircle size={15} />
                  Confirmar
                </button>
              )}
              <button
                onClick={handleCancel}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:border-red-200 hover:text-red-700"
              >
                <XCircle size={15} />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Create mode ───────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Novo Agendamento</h2>
            <p className="text-xs text-slate-400">{formatDate(new Date(selectedDate + "T12:00:00"))}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4 p-6">
          {/* Patient search */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Paciente <span className="text-red-500">*</span>
            </label>
            {selectedPatient ? (
              <div className="flex items-center justify-between rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-200 text-teal-700">
                    <User size={13} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-teal-900">{selectedPatient.name}</p>
                    <p className="text-xs text-teal-600">{selectedPatient.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedPatient(null);
                    setPatientSearch("");
                  }}
                  className="rounded-md p-1 text-teal-500 hover:bg-teal-100"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                  <User size={15} className="shrink-0 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou telefone..."
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => setShowPatientDropdown(true)}
                    className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
                {showPatientDropdown && patients.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPatient(p);
                          setPatientSearch(p.name);
                          setShowPatientDropdown(false);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                          <User size={13} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-400">{p.phone}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Date + Schedule row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Data <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <Calendar size={15} className="shrink-0 text-slate-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Agenda <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
                <Stethoscope size={15} className="shrink-0 text-slate-400" />
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-slate-900 outline-none"
                >
                  <option value="">Selecionar...</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Slots */}
          {selectedScheduleId && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Horário <span className="text-red-500">*</span>
              </label>
              {loadingSlots ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-teal-500" />
                </div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-slate-100 bg-slate-50 py-3 text-center text-sm text-slate-400">
                  Nenhum horário disponível para esta data
                </p>
              ) : (
                <div className="grid max-h-36 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                  {slots.map((slot) => {
                    const time = formatTime(slot.startAt);
                    const isSelected = selectedSlot?.startAt === slot.startAt;
                    return (
                      <button
                        key={slot.startAt}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-lg border py-2 text-xs font-semibold transition-all ${
                          isSelected
                            ? "border-teal-500 bg-teal-500 text-white shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Title (optional) */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Título <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20">
              <FileText size={15} className="shrink-0 text-slate-400" />
              <input
                type="text"
                placeholder="Ex: Consulta de retorno"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Observações <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Anotações para o médico..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedPatient || !selectedScheduleId || !selectedSlot}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Salvando...
              </>
            ) : (
              "Confirmar Agendamento"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
