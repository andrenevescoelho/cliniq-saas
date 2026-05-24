"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { AppointmentData } from "./appointment-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CalendarViewProps {
  currentDate: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  appointments: AppointmentData[];
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appt: AppointmentData) => void;
  loading: boolean;
}

// ── Status dot colors ────────────────────────────────────────────────────────

const STATUS_DOT: Record<AppointmentData["status"], string> = {
  SCHEDULED: "bg-blue-400",
  CONFIRMED: "bg-emerald-500",
  COMPLETED: "bg-slate-400",
  CANCELLED: "bg-red-400",
  NO_SHOW: "bg-amber-400",
  RESCHEDULED: "bg-purple-400",
};

const STATUS_BAR: Record<AppointmentData["status"], string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  CONFIRMED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-slate-50 text-slate-500 border-slate-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200 line-through opacity-60",
  NO_SHOW: "bg-amber-50 text-amber-700 border-amber-200 opacity-70",
  RESCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarView({
  currentDate,
  onPrev,
  onNext,
  onToday,
  appointments,
  onDayClick,
  onAppointmentClick,
  loading,
}: CalendarViewProps) {
  const today = new Date();

  // Build grid — 6 weeks, starting Sunday
  const cells = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrev = new Date(year, month, 0).getDate();

    const grid: { date: Date; isCurrentMonth: boolean }[] = [];

    // Prev month trailing days
    for (let i = firstDay - 1; i >= 0; i--) {
      grid.push({ date: new Date(year, month - 1, daysInPrev - i), isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ date: new Date(year, month, d), isCurrentMonth: true });
    }
    // Next month leading days (fill to 42)
    let next = 1;
    while (grid.length < 42) {
      grid.push({ date: new Date(year, month + 1, next++), isCurrentMonth: false });
    }
    return grid;
  }, [currentDate]);

  // Group appointments by date key
  const apptsByDay = useMemo(() => {
    const map = new Map<string, AppointmentData[]>();
    for (const appt of appointments) {
      const d = new Date(appt.startAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(appt);
    }
    return map;
  }, [appointments]);

  function getDayAppts(date: Date) {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return apptsByDay.get(key) ?? [];
  }

  return (
    <div className="flex flex-col h-full">
      {/* Month/Nav header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">
            {MONTH_NAMES[currentDate.getMonth()]}{" "}
            <span className="font-normal text-slate-400">{currentDate.getFullYear()}</span>
          </h2>
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-teal-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Hoje
          </button>
          <button
            onClick={onPrev}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {DAY_NAMES.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid flex-1 grid-cols-7 grid-rows-6 divide-x divide-y divide-slate-100">
        {cells.map(({ date, isCurrentMonth }, idx) => {
          const dayAppts = getDayAppts(date);
          const isToday = isSameDay(date, today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const MAX_VISIBLE = 3;
          const visibleAppts = dayAppts.slice(0, MAX_VISIBLE);
          const overflow = dayAppts.length - MAX_VISIBLE;

          return (
            <div
              key={idx}
              onClick={() => onDayClick(date)}
              className={`group relative flex min-h-[100px] cursor-pointer flex-col gap-1 p-2 transition-colors ${
                !isCurrentMonth
                  ? "bg-slate-50/50 opacity-50"
                  : isWeekend
                  ? "bg-slate-50/40"
                  : "bg-white"
              } hover:bg-teal-50/30`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    isToday
                      ? "bg-teal-600 text-white"
                      : isCurrentMonth
                      ? "text-slate-700 group-hover:text-teal-700"
                      : "text-slate-400"
                  }`}
                >
                  {date.getDate()}
                </span>
                {/* Add button on hover */}
                {isCurrentMonth && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(date);
                    }}
                    className="hidden rounded-md p-0.5 text-slate-400 transition-colors hover:bg-teal-100 hover:text-teal-600 group-hover:flex"
                    title="Novo agendamento"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {/* Appointment chips */}
              <div className="flex flex-col gap-0.5">
                {visibleAppts.map((appt) => (
                  <button
                    key={appt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appt);
                    }}
                    className={`flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-opacity hover:opacity-80 ${STATUS_BAR[appt.status]}`}
                  >
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[appt.status]}`} />
                    <span className="truncate">
                      {formatTime(appt.startAt)} {appt.patient.name.split(" ")[0]}
                    </span>
                  </button>
                ))}

                {overflow > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDayClick(date);
                    }}
                    className="rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-slate-400 hover:text-teal-600"
                  >
                    +{overflow} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
