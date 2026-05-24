"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppointmentData } from "./appointment-modal";

// ── Types ─────────────────────────────────────────────────────────────────────

interface WeekViewProps {
  currentDate: Date;
  mode: "week" | "day";
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  appointments: AppointmentData[];
  onSlotClick: (date: Date, hour: number) => void;
  onAppointmentClick: (appt: AppointmentData) => void;
  loading: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00
const DAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const STATUS_COLOR: Record<AppointmentData["status"], string> = {
  SCHEDULED: "bg-blue-100 border-blue-400 text-blue-800",
  CONFIRMED: "bg-emerald-100 border-emerald-500 text-emerald-900",
  COMPLETED: "bg-slate-100 border-slate-300 text-slate-600",
  CANCELLED: "bg-red-50 border-red-300 text-red-500 opacity-50 line-through",
  NO_SHOW: "bg-amber-50 border-amber-400 text-amber-700 opacity-60",
  RESCHEDULED: "bg-purple-50 border-purple-400 text-purple-700",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function minutesSinceMidnight(date: Date) {
  return date.getHours() * 60 + date.getMinutes();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WeekView({
  currentDate,
  mode,
  onPrev,
  onNext,
  onToday,
  appointments,
  onSlotClick,
  onAppointmentClick,
  loading,
}: WeekViewProps) {
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current hour on mount
  useEffect(() => {
    if (scrollRef.current) {
      const hour = new Date().getHours();
      const scrollTo = ((hour - 7) / HOURS.length) * scrollRef.current.scrollHeight;
      scrollRef.current.scrollTop = Math.max(0, scrollTo - 120);
    }
  }, []);

  // Days to show
  const days = useMemo(() => {
    if (mode === "day") return [new Date(currentDate)];
    const week = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(week, i));
  }, [currentDate, mode]);

  // Header label
  const headerLabel = useMemo(() => {
    if (mode === "day") {
      return currentDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const start = days[0];
    const end = days[6];
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} – ${end.getDate()} de ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`;
    }
    return `${start.getDate()} ${MONTH_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  }, [mode, currentDate, days]);

  // Pixel height per hour slot
  const HOUR_HEIGHT = 64; // px

  // Position appointment as absolute within the column
  function getApptStyle(appt: AppointmentData) {
    const start = new Date(appt.startAt);
    const end = new Date(appt.endAt);
    const startMin = minutesSinceMidnight(start) - 7 * 60;
    const durationMin = (end.getTime() - start.getTime()) / 60000;
    const top = (startMin / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMin / 60) * HOUR_HEIGHT, 20);
    return { top, height };
  }

  // Current time indicator — client-only to avoid SSR/hydration mismatch
  const [nowPosition, setNowPosition] = useState<number | null>(null);

  useEffect(() => {
    function calcPosition() {
      const now = new Date();
      if (!days.some((d) => isSameDay(d, now))) {
        setNowPosition(null);
        return;
      }
      const min = minutesSinceMidnight(now) - 7 * 60;
      if (min < 0 || min > HOURS.length * 60) {
        setNowPosition(null);
        return;
      }
      setNowPosition((min / 60) * HOUR_HEIGHT);
    }

    calcPosition();
    const interval = setInterval(calcPosition, 60_000);
    return () => clearInterval(interval);
  }, [days]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900 capitalize">{headerLabel}</h2>
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
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={onNext}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div
        className="grid border-b border-slate-100"
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div /> {/* spacer for time column */}
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className="py-2 text-center">
              <p className={`text-xs font-medium uppercase tracking-wide ${isToday ? "text-teal-600" : "text-slate-400"}`}>
                {DAY_SHORT[day.getDay()]}
              </p>
              <p
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? "bg-teal-600 text-white" : "text-slate-700"
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div
          className="relative grid"
          style={{
            gridTemplateColumns: `56px repeat(${days.length}, 1fr)`,
            height: `${HOURS.length * HOUR_HEIGHT}px`,
          }}
        >
          {/* Time labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                className="absolute right-2 flex items-center"
                style={{ top: ((h - 7) * HOUR_HEIGHT) - 8, height: HOUR_HEIGHT }}
              >
                <span className="text-[11px] font-medium text-slate-400">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startAt), day));
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-slate-100 ${isToday ? "bg-teal-50/20" : ""}`}
              >
                {/* Hour grid lines */}
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 cursor-pointer border-t border-slate-100 transition-colors hover:bg-teal-50/40"
                    style={{ top: (h - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(day, h)}
                  />
                ))}

                {/* Half-hour lines */}
                {HOURS.map((h) => (
                  <div
                    key={`${h}-half`}
                    className="absolute left-0 right-0 border-t border-slate-50"
                    style={{ top: (h - 7) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && nowPosition !== null && (
                  <div
                    className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                    style={{ top: nowPosition }}
                  >
                    <div className="h-2 w-2 rounded-full bg-teal-500 shadow-sm" />
                    <div className="h-px flex-1 bg-teal-500 opacity-70" />
                  </div>
                )}

                {/* Appointments */}
                {dayAppts.map((appt) => {
                  const { top, height } = getApptStyle(appt);
                  // Check if within visible range
                  if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null;

                  return (
                    <button
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt);
                      }}
                      className={`absolute left-1 right-1 z-10 overflow-hidden rounded-lg border-l-2 px-2 py-1 text-left shadow-sm transition-all hover:z-20 hover:shadow-md ${STATUS_COLOR[appt.status]}`}
                      style={{ top, height: Math.max(height, 24) }}
                    >
                      <p className="truncate text-[11px] font-bold leading-tight">
                        {new Date(appt.startAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="truncate text-[11px] leading-tight opacity-80">
                        {appt.patient.name.split(" ").slice(0, 2).join(" ")}
                      </p>
                      {height > 40 && appt.title && (
                        <p className="truncate text-[10px] opacity-60">{appt.title}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
