"use client";

// app/(dashboard)/page.tsx — Dashboard Overview
// Modern clinical SaaS dashboard

import { useState, useEffect } from "react";
import {
  CalendarDays,
  Users,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  Sparkles,
  Activity,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: string | number;
  change: string;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: string;
}

interface AppointmentRow {
  id: string;
  patientName: string;
  time: string;
  doctor: string;
  status: "CONFIRMED" | "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
}

// ── Mock data (replace with SWR/API calls) ───────────────

const mockStats: StatCard[] = [
  {
    label: "Consultas Hoje",
    value: 14,
    change: "+3 vs ontem",
    trend: "up",
    icon: <CalendarDays size={20} />,
    color: "from-violet-500 to-purple-600",
  },
  {
    label: "Pacientes Ativos",
    value: "1.284",
    change: "+12 este mês",
    trend: "up",
    icon: <Users size={20} />,
    color: "from-sky-500 to-blue-600",
  },
  {
    label: "Faturamento Mês",
    value: "R$ 24.800",
    change: "+8% vs mês anterior",
    trend: "up",
    icon: <TrendingUp size={20} />,
    color: "from-emerald-500 to-teal-600",
  },
  {
    label: "Msgs WhatsApp",
    value: 348,
    change: "92 pendentes",
    trend: "neutral",
    icon: <MessageSquare size={20} />,
    color: "from-amber-500 to-orange-500",
  },
];

const mockAppointments: AppointmentRow[] = [
  { id: "1", patientName: "Ana Paula Souza", time: "08:00", doctor: "Dr. Carlos", status: "CONFIRMED" },
  { id: "2", patientName: "Roberto Lima", time: "08:30", doctor: "Dra. Maria", status: "COMPLETED" },
  { id: "3", patientName: "Fernanda Costa", time: "09:00", doctor: "Dr. Carlos", status: "SCHEDULED" },
  { id: "4", patientName: "Marcos Oliveira", time: "09:30", doctor: "Dra. Maria", status: "NO_SHOW" },
  { id: "5", patientName: "Juliana Mendes", time: "10:00", doctor: "Dr. Carlos", status: "CONFIRMED" },
  { id: "6", patientName: "Paulo Rodrigues", time: "10:30", doctor: "Dra. Maria", status: "CANCELLED" },
];

// ── Status Badge ─────────────────────────────────────────

const statusConfig = {
  CONFIRMED: { label: "Confirmado", classes: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: <CheckCircle size={12} /> },
  SCHEDULED: { label: "Agendado", classes: "bg-blue-50 text-blue-700 ring-blue-200", icon: <Clock size={12} /> },
  COMPLETED: { label: "Concluído", classes: "bg-slate-50 text-slate-600 ring-slate-200", icon: <CheckCircle size={12} /> },
  CANCELLED: { label: "Cancelado", classes: "bg-red-50 text-red-700 ring-red-200", icon: <XCircle size={12} /> },
  NO_SHOW: { label: "Faltou", classes: "bg-amber-50 text-amber-700 ring-amber-200", icon: <AlertCircle size={12} /> },
};

function StatusBadge({ status }: { status: AppointmentRow["status"] }) {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${cfg.classes}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Mini Bar Chart ───────────────────────────────────────

const weekData = [
  { day: "Seg", value: 12 },
  { day: "Ter", value: 18 },
  { day: "Qua", value: 9 },
  { day: "Qui", value: 21 },
  { day: "Sex", value: 14 },
  { day: "Sáb", value: 6 },
];

function MiniBarChart() {
  const max = Math.max(...weekData.map((d) => d.value));
  return (
    <div className="flex items-end gap-1.5 h-16">
      {weekData.map((d) => (
        <div key={d.day} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm bg-violet-500/80 transition-all duration-500"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="text-[10px] text-slate-400 font-medium">{d.day}</span>
        </div>
      ))}
    </div>
  );
}

// ── AI Activity Feed ─────────────────────────────────────

const aiActivities = [
  { text: "Agendamento automático para Ana Costa", time: "2min", type: "schedule" },
  { text: "Lembrete enviado para 8 pacientes", time: "15min", type: "reminder" },
  { text: "Triagem concluída: Roberto Silva", time: "28min", type: "triage" },
  { text: "Campanha de retorno: 23 inativos", time: "1h", type: "retention" },
];

// ── Main Dashboard ───────────────────────────────────────

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("Olá");
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    const now = new Date();

    setCurrentDate(
      now.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "America/Sao_Paulo",
      })
    );

    const h = now.getHours();
    if (h < 12) setGreeting("Bom dia");
    else if (h < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500 font-medium">
              {currentDate}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
              {greeting}, Dr. Carlos 👋
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2">
            <Sparkles size={16} className="text-violet-600" />
            <span className="text-sm font-medium text-violet-700">IA ativa · 92 msgs processadas hoje</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {mockStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm`}>
                  {stat.icon}
                </div>
              </div>
              <p className={`text-xs mt-3 font-medium ${
                stat.trend === "up" ? "text-emerald-600" :
                stat.trend === "down" ? "text-red-500" : "text-slate-400"
              }`}>
                {stat.trend === "up" && "↑ "}
                {stat.trend === "down" && "↓ "}
                {stat.change}
              </p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Appointments List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
              <div>
                <h2 className="font-semibold text-slate-900">Consultas de Hoje</h2>
                <p className="text-xs text-slate-400 mt-0.5">14 agendadas · 3 confirmadas</p>
              </div>
              <button className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1 transition-colors">
                Ver agenda <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="divide-y divide-slate-50">
              {mockAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <span className="text-sm font-mono font-semibold text-slate-400 w-12 shrink-0">
                    {appt.time}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {appt.patientName}
                    </p>
                    <p className="text-xs text-slate-400">{appt.doctor}</p>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">

            {/* Weekly Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">Consultas na Semana</h2>
                  <p className="text-xs text-slate-400">80 total · meta 90</p>
                </div>
                <Activity size={16} className="text-violet-500" />
              </div>
              <MiniBarChart />
            </div>

            {/* AI Activity Feed */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles size={15} className="text-violet-500" />
                  Automação IA
                </h2>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  ● Ativa
                </span>
              </div>
              <div className="space-y-3">
                {aiActivities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700">{activity.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{activity.time} atrás</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg">
              <h2 className="font-semibold text-sm mb-3">Ações Rápidas</h2>
              <div className="space-y-2">
                {[
                  { label: "Novo Agendamento", href: "/agenda" },
                  { label: "Cadastrar Paciente", href: "/pacientes/novo" },
                  { label: "Gerar Link PIX", href: "/financeiro" },
                  { label: "Ver Inbox WhatsApp", href: "/whatsapp" },
                ].map((action) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm font-medium"
                  >
                    {action.label}
                    <ArrowUpRight size={13} className="opacity-70" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
