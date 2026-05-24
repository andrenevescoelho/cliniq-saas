"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

type LoginStatus = "idle" | "loading" | "error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@cliniq.com.br");
  const [password, setPassword] = useState("admin123");
  const [clinicSlug, setClinicSlug] = useState("clinica-demo");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<LoginStatus>("idle");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");

    const result = await signIn("credentials", {
      email,
      password,
      clinicSlug,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setStatus("error");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
        <section className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.24),transparent_32%),linear-gradient(135deg,#0f172a_0%,#111827_48%,#134e4a_100%)]" />
          <div className="relative flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-400 text-slate-950 shadow-lg shadow-teal-950/30">
                <Stethoscope size={21} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">ClinIQ</p>
                <p className="text-xs text-teal-100/70">Automação clínica inteligente</p>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-teal-50">
                <ShieldCheck size={14} />
                Multi-tenant com RBAC por clínica
              </p>
              <h1 className="text-5xl font-bold leading-tight tracking-normal">
                Atendimento, agenda e financeiro no mesmo ritmo da sua clínica.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-200">
                Entre para acompanhar pacientes, mensagens do WhatsApp, automações de IA
                e indicadores operacionais em um painel único.
              </p>
            </div>

            <div className="grid max-w-xl grid-cols-3 gap-3 text-sm text-slate-200">
              <div className="border-l border-teal-300/50 pl-4">
                <p className="text-2xl font-bold text-white">24h</p>
                <p className="mt-1 text-xs text-slate-300">lembretes automáticos</p>
              </div>
              <div className="border-l border-sky-300/50 pl-4">
                <p className="text-2xl font-bold text-white">IA</p>
                <p className="mt-1 text-xs text-slate-300">triagem e respostas</p>
              </div>
              <div className="border-l border-emerald-300/50 pl-4">
                <p className="text-2xl font-bold text-white">PIX</p>
                <p className="mt-1 text-xs text-slate-300">cobranças integradas</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-slate-50 px-4 py-10 text-slate-950 sm:px-6">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500 text-white">
                <Stethoscope size={21} />
              </div>
              <div>
                <p className="text-lg font-bold tracking-tight">ClinIQ</p>
                <p className="text-xs text-slate-500">Automação clínica inteligente</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div>
                <p className="text-sm font-medium text-teal-700">Acesso seguro</p>
                <h2 className="mt-1 text-2xl font-bold tracking-normal text-slate-950">
                  Entrar no painel
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Use as credenciais demo ou os dados da sua clínica.
                </p>
              </div>

              <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Email</span>
                  <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
                    <Mail size={17} className="text-slate-400" />
                    <input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      required
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="admin@cliniq.com.br"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Senha</span>
                  <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
                    <LockKeyhole size={17} className="text-slate-400" />
                    <input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="admin123"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </span>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Clínica</span>
                  <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
                    <Building2 size={17} className="text-slate-400" />
                    <input
                      value={clinicSlug}
                      onChange={(event) => setClinicSlug(event.target.value)}
                      type="text"
                      autoComplete="organization"
                      className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      placeholder="clinica-demo"
                    />
                  </span>
                </label>

                {status === "error" && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    Não foi possível entrar. Confira email, senha e clínica.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {status === "loading" ? "Entrando..." : "Entrar"}
                  <ArrowRight size={17} />
                </button>
              </form>

              <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
                <p className="font-semibold text-slate-700">Credenciais demo</p>
                <p>admin@cliniq.com.br / admin123 / clinica-demo</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
