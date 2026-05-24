"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, CalendarDays, CalendarRange, Clock, LayoutGrid } from "lucide-react";
import { CalendarView } from "./components/calendar-view";
import { WeekView } from "./components/week-view";
import { AppointmentModal } from "./components/appointment-modal";
import type { AppointmentData } from "./components/appointment-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function startOfWeek(d: Date) {
  const day = new Date(d);
  day.setDate(day.getDate() - day.getDay());
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfWeek(d: Date) {
  const day = new Date(d);
  day.setDate(day.getDate() + (6 - day.getDay()));
  day.setHours(23, 59, 59, 999);
  return day;
}

function startOfDay(d: Date) {
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

function endOfDay(d: Date) {
  const day = new Date(d);
  day.setHours(23, 59, 59, 999);
  return day;
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addWeeks(d: Date, n: number) {
  const day = new Date(d);
  day.setDate(day.getDate() + n * 7);
  return day;
}

function addDays(d: Date, n: number) {
  const day = new Date(d);
  day.setDate(day.getDate() + n);
  return day;
}

// ── Stats strip ───────────────────────────────────────────────────────────────

function StatsStrip({ appointments }: { appointments: AppointmentData[] }) {
  const today = new Date();
  const todayAppts = appointments.filter((a) => {
    const d = new Date(a.startAt);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  });

  const counts = {
    total: todayAppts.length,
    confirmed: todayAppts.filter((a) => a.status === "CONFIRMED").length,
    completed: todayAppts.filter((a) => a.status === "COMPLETED").length,
    noShow: todayAppts.filter((a) => a.status === "NO_SHOW").length,
  };

  return (
    <div className="flex items-center gap-4 border-b border-slate-100 bg-white px-6 py-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hoje</span>
      <div className="flex items-center gap-1">
        <span className="text-sm font-bold text-slate-900">{counts.total}</span>
        <span className="text-xs text-slate-400">consultas</span>
      </div>
      <div className="h-3 w-px bg-slate-200" />
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-xs text-slate-600">{counts.confirmed} confirmadas</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        <span className="text-xs text-slate-600">{counts.completed} concluídas</span>
      </div>
      {counts.noShow > 0 && (
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span className="text-xs text-amber-600">{counts.noShow} faltou</span>
        </div>
      )}
    </div>
  );
}

// ── View Toggle ───────────────────────────────────────────────────────────────

const VIEW_OPTIONS: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
  { mode: "month", label: "Mês", icon: <LayoutGrid size={14} /> },
  { mode: "week", label: "Semana", icon: <CalendarRange size={14} /> },
  { mode: "day", label: "Dia", icon: <Clock size={14} /> },
];

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<AppointmentData | null>(null);
  const [prefillDate, setPrefillDate] = useState<Date | null>(null);

  // ── Date range for API query ──────────────────────────────────────────────

  function getDateRange() {
    if (viewMode === "month") {
      return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
    if (viewMode === "week") {
      return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
    }
    return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
  }

  // ── Fetch appointments ────────────────────────────────────────────────────

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`/api/v1/appointments?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setAppointments(data.data ?? []);
    } catch {
      // handle silently — no crash
    } finally {
      setLoading(false);
    }
  }, [currentDate, viewMode]); // eslint-disable-line

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ── Navigation ────────────────────────────────────────────────────────────

  function handlePrev() {
    if (viewMode === "month") setCurrentDate((d) => addMonths(d, -1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, -1));
    else setCurrentDate((d) => addDays(d, -1));
  }

  function handleNext() {
    if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  function handleToday() {
    setCurrentDate(new Date());
  }

  // ── Open modals ───────────────────────────────────────────────────────────

  function openNewModal(date?: Date) {
    setSelectedAppt(null);
    setPrefillDate(date ?? null);
    setModalOpen(true);
  }

  function openApptModal(appt: AppointmentData) {
    setSelectedAppt(appt);
    setPrefillDate(null);
    setModalOpen(true);
  }

  function handleDayClick(date: Date) {
    if (viewMode === "month") {
      // Switch to day view for that date
      setCurrentDate(date);
      setViewMode("day");
    } else {
      openNewModal(date);
    }
  }

  function handleSlotClick(date: Date, hour: number) {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    openNewModal(d);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-teal-600" />
          <h1 className="text-base font-bold text-slate-900">Agenda</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {VIEW_OPTIONS.map(({ mode, label, icon }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === mode
                    ? "bg-white text-teal-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* New appointment button */}
          <button
            onClick={() => openNewModal()}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <Plus size={16} />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <StatsStrip appointments={appointments} />

      {/* Calendar area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "month" && (
          <CalendarView
            currentDate={currentDate}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            appointments={appointments}
            onDayClick={handleDayClick}
            onAppointmentClick={openApptModal}
            loading={loading}
          />
        )}

        {(viewMode === "week" || viewMode === "day") && (
          <WeekView
            currentDate={currentDate}
            mode={viewMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            appointments={appointments}
            onSlotClick={handleSlotClick}
            onAppointmentClick={openApptModal}
            loading={loading}
          />
        )}
      </div>

      {/* Appointment modal */}
      <AppointmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAppt(null);
          setPrefillDate(null);
        }}
        onSaved={fetchAppointments}
        appointment={selectedAppt}
        prefillDate={prefillDate}
      />
    </div>
  );
}
