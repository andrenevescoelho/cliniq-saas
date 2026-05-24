"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
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
import type { UserRole } from "@prisma/client";

interface DashboardUser {
  name?: string | null;
  email?: string | null;
  role: UserRole;
}

interface DashboardShellProps {
  children: React.ReactNode;
  user: DashboardUser;
}

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

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "ClinIQ";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function Sidebar({
  collapsed,
  onToggle,
  user,
}: {
  collapsed: boolean;
  onToggle: () => void;
  user: DashboardUser;
}) {
  const pathname = usePathname();
  const initials = getInitials(user.name, user.email);

  return (
    <aside
      className={`fixed left-0 top-0 z-30 flex h-full flex-col bg-slate-900 text-white transition-all duration-300 ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-sky-600 shadow-lg">
              <Stethoscope size={16} />
            </div>
            <span className="font-bold tracking-tight text-white">ClinIQ</span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-sky-600">
            <Stethoscope size={16} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-800"
            aria-label="Recolher menu"
            title="Recolher menu"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all ${
                isActive
                  ? "bg-teal-600 text-white shadow-sm shadow-teal-950/50"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate text-sm font-medium">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="ml-auto rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
              {collapsed && item.badge && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-sky-500" />
              )}
              {collapsed && (
                <div className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg bg-slate-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-2 pb-4 pt-3">
        {!collapsed ? (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-slate-800"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-xs font-bold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{user.name || user.email}</p>
              <p className="truncate text-[11px] text-slate-400">{user.role}</p>
            </div>
            <LogOut size={14} className="shrink-0 text-slate-500" />
          </button>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-xs font-bold"
            aria-label="Sair"
            title="Sair"
          >
            {initials}
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-20 rounded-full border border-slate-700 bg-slate-800 p-1 text-slate-400 transition-colors hover:text-white"
          aria-label="Expandir menu"
          title="Expandir menu"
        >
          <Menu size={12} />
        </button>
      )}
    </aside>
  );
}

function Topbar({ user }: { user: DashboardUser }) {
  const initials = getInitials(user.name, user.email);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6">
      <div className="flex max-w-md flex-1 items-center gap-3">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar pacientes, agendamentos..."
          className="flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          className="relative rounded-lg p-2 transition-colors hover:bg-slate-50"
          aria-label="Notificações"
          title="Notificações"
        >
          <Bell size={18} className="text-slate-500" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="h-8 w-px bg-slate-100" />
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-sky-600 text-xs font-bold text-white">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-800">{user.name || "ClinIQ"}</p>
            <p className="text-[11px] text-slate-400">{user.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} user={user} />
      <div
        className={`flex min-w-0 flex-1 flex-col transition-all duration-300 ${
          collapsed ? "ml-16" : "ml-60"
        }`}
      >
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
