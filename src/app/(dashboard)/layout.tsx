"use client";

// app/(dashboard)/layout.tsx — Dashboard Layout with Sidebar

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  MessageSquare,
  CreditCard,
  Zap,
  BarChart3,
  Settings,
  ChevronLeft,
  Bell,
  Search,
  LogOut,
  Stethoscope,
  Menu,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: "Overview", href: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Agenda", href: "/agenda", icon: <CalendarDays size={18} /> },
  { label: "Pacientes", href: "/pacientes", icon: <Users size={18} /> },
  { label: "WhatsApp", href: "/whatsapp", icon: <MessageSquare size={18} />, badge: 12 },
  { label: "Financeiro", href: "/financeiro", icon: <CreditCard size={18} /> },
  { label: "Automações", href: "/automacoes", icon: <Zap size={18} /> },
  { label: "Relatórios", href: "/relatorios", icon: <BarChart3 size={18} /> },
  { label: "Configurações", href: "/configuracoes", icon: <Settings size={18} /> },
];

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-slate-900 text-white flex flex-col transition-all duration-300 z-30 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Stethoscope size={16} />
            </div>
            <span className="font-bold text-white tracking-tight">ClinIQ</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto">
            <Stethoscope size={16} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${
                isActive
                  ? "bg-violet-600 text-white shadow-sm shadow-violet-900/50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-violet-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-violet-500 rounded-full" />
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-2 pb-4 border-t border-slate-800 pt-3">
        {!collapsed ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold shrink-0">
              DC
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Dr. Carlos</p>
              <p className="text-[11px] text-slate-400 truncate">CLINIC_ADMIN</p>
            </div>
            <LogOut size={14} className="text-slate-500 shrink-0" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xs font-bold mx-auto cursor-pointer">
            DC
          </div>
        )}
      </div>

      {/* Collapsed toggle */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 bg-slate-800 border border-slate-700 rounded-full p-1 text-slate-400 hover:text-white transition-colors"
        >
          <Menu size={12} />
        </button>
      )}
    </aside>
  );
}

function Topbar() {
  return (
    <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar pacientes, agendamentos..."
          className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
        />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-slate-50 transition-colors">
          <Bell size={18} className="text-slate-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="h-8 w-px bg-slate-100" />
        <div className="flex items-center gap-2 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            DC
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800">Clínica Saúde+</p>
            <p className="text-[11px] text-slate-400">Plano Growth</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
