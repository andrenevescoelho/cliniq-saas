"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Search, Send, Bot, RefreshCw, Loader2, X, Phone,
  CheckCheck, Plus, Settings, Inbox, Wifi, WifiOff, QrCode,
  Trash2, AlertCircle, CheckCircle, Clock, Smartphone,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  id: string;
  remoteJid: string;
  status: "OPEN" | "BOT" | "WAITING_HUMAN" | "HUMAN" | "CLOSED";
  aiEnabled: boolean;
  lastMessageAt: string | null;
  patient?: { id: string; name: string; phone: string } | null;
  messages?: Message[];
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: string;
  status: string;
  isFromBot: boolean;
  createdAt: string;
}

interface WaInstance {
  id: string;
  name: string;
  instanceKey: string;
  isActive: boolean;
  status?: string;
  qrCode?: string | null;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CONV_STATUS = {
  OPEN:          { label: "Aberta",      color: "bg-blue-100 text-blue-700",      dot: "bg-blue-400" },
  BOT:           { label: "IA Ativa",    color: "bg-violet-100 text-violet-700",  dot: "bg-violet-400" },
  WAITING_HUMAN: { label: "Aguardando",  color: "bg-amber-100 text-amber-700",    dot: "bg-amber-400" },
  HUMAN:         { label: "Atendimento", color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  CLOSED:        { label: "Fechada",     color: "bg-slate-100 text-slate-500",    dot: "bg-slate-300" },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function contactName(conv: Conversation) {
  if (conv.patient?.name) return conv.patient.name;
  return conv.remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", " (grupo)");
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

// ══════════════════════════════════════════════════════════════════
// CONFIGURAÇÕES TAB
// ══════════════════════════════════════════════════════════════════

function QrCodeModal({ instance, onClose, onConnected }: {
  instance: WaInstance;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<NodeJS.Timeout>();

  async function fetchQr() {
    try {
      const res = await fetch(`/api/v1/whatsapp/instances/${instance.id}/qrcode`);
      const d = await res.json();
      const base64 = d.data?.base64 ?? d.data?.qrcode?.base64 ?? null;
      setQr(base64);
      setLoading(false);
    } catch {
      setError("Erro ao buscar QR Code. Verifique se a Evolution API está online.");
      setLoading(false);
    }
  }

  async function checkStatus() {
    try {
      const res = await fetch(`/api/v1/whatsapp/instances/${instance.id}/status`);
      const d = await res.json();
      if (d.data?.isActive) {
        setConnected(true);
        clearInterval(pollRef.current);
        setTimeout(() => { onConnected(); onClose(); }, 2000);
      }
    } catch {}
  }

  useEffect(() => {
    fetchQr();
    // Poll status every 3s
    pollRef.current = setInterval(checkStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl text-center">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-900">Conectar WhatsApp</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          {connected ? (
            <div className="py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <p className="mt-3 font-semibold text-emerald-700">WhatsApp Conectado!</p>
              <p className="text-sm text-slate-400 mt-1">Fechando...</p>
            </div>
          ) : loading ? (
            <div className="py-8">
              <Loader2 size={24} className="mx-auto animate-spin text-teal-500" />
              <p className="mt-3 text-sm text-slate-500">Gerando QR Code...</p>
            </div>
          ) : error ? (
            <div className="py-6">
              <AlertCircle size={32} className="mx-auto text-red-400" />
              <p className="mt-3 text-sm text-red-600">{error}</p>
              <button onClick={fetchQr} className="mt-3 text-sm text-teal-600 hover:underline">Tentar novamente</button>
            </div>
          ) : qr ? (
            <>
              <div className="rounded-xl border-2 border-slate-100 p-3 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`data:image/png;base64,${qr}`} alt="QR Code WhatsApp" className="h-52 w-52" />
              </div>
              <div className="rounded-xl bg-slate-50 p-3 text-left space-y-1">
                <p className="text-xs font-semibold text-slate-700">Como conectar:</p>
                <p className="text-xs text-slate-500">1. Abra o WhatsApp no celular</p>
                <p className="text-xs text-slate-500">2. Toque em ⋮ → Dispositivos vinculados</p>
                <p className="text-xs text-slate-500">3. Toque em "Vincular um dispositivo"</p>
                <p className="text-xs text-slate-500">4. Escaneie este QR Code</p>
              </div>
              <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                <Clock size={11} />Verificando conexão automaticamente...
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400 py-6">QR Code não disponível</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfigTab() {
  const [instances, setInstances] = useState<WaInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [qrInstance, setQrInstance] = useState<WaInstance | null>(null);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});

  const fetchInstances = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/instances");
      const d = await res.json();
      setInstances(d.data ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInstances(); }, [fetchInstances]);

  // Check status of each instance
  useEffect(() => {
    if (!instances.length) return;
    instances.forEach(async (inst) => {
      try {
        const res = await fetch(`/api/v1/whatsapp/instances/${inst.id}/status`);
        const d = await res.json();
        setStatuses((prev) => ({ ...prev, [inst.id]: d.data?.isActive ?? false }));
      } catch {}
    });
  }, [instances]);

  async function createInstance() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/whatsapp/instances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.message ?? "Erro ao criar instância");
        return;
      }
      setNewName("");
      setShowForm(false);
      fetchInstances();
    } catch { alert("Erro ao criar instância"); }
    finally { setCreating(false); }
  }

  async function deleteInstance(id: string, name: string) {
    if (!confirm(`Excluir a instância "${name}"? Isso desconectará o WhatsApp.`)) return;
    await fetch(`/api/v1/whatsapp/instances/${id}`, { method: "DELETE" });
    fetchInstances();
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-2xl space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-slate-900">Instâncias WhatsApp</h2>
          <p className="mt-1 text-sm text-slate-400">
            Cada instância conecta um número de WhatsApp ao ClinIQ via Evolution API.
          </p>
        </div>

        {/* Evolution API status notice */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Evolution API</p>
              <p className="mt-0.5 text-xs text-amber-700">
                Certifique-se que a variável <code className="rounded bg-amber-100 px-1">EVOLUTION_API_URL</code> está configurada no <code className="rounded bg-amber-100 px-1">.env</code> apontando para <code className="rounded bg-amber-100 px-1">http://cliniq_evolution:8080</code> e que a <code className="rounded bg-amber-100 px-1">EVOLUTION_API_KEY</code> está correta.
              </p>
            </div>
          </div>
        </div>

        {/* Instances list */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-teal-500" />
          </div>
        ) : instances.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
            <Smartphone size={32} className="mx-auto mb-3 text-slate-300" />
            <p className="font-medium text-slate-500">Nenhuma instância criada</p>
            <p className="mt-1 text-sm text-slate-400">Crie uma instância para conectar seu WhatsApp</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const isConnected = statuses[inst.id] ?? inst.isActive;
              return (
                <div key={inst.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${isConnected ? "bg-emerald-50" : "bg-slate-50"}`}>
                    <Smartphone size={22} className={isConnected ? "text-emerald-500" : "text-slate-400"} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{inst.name}</p>
                      <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {isConnected ? <><Wifi size={10} />Conectado</> : <><WifiOff size={10} />Desconectado</>}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400 font-mono truncate">{inst.instanceKey}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Webhook: <code className="text-teal-600">/api/webhooks/whatsapp</code>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isConnected && (
                      <button
                        onClick={() => setQrInstance(inst)}
                        className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        <QrCode size={13} />Conectar
                      </button>
                    )}
                    {isConnected && (
                      <button
                        onClick={() => setQrInstance(inst)}
                        className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        <QrCode size={13} />Reconectar
                      </button>
                    )}
                    <button
                      onClick={() => deleteInstance(inst.id, inst.name)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New instance form */}
        {showForm ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-5 space-y-3">
            <p className="text-sm font-semibold text-slate-700">Nova Instância</p>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ex: Recepção, Dr. Carlos, Financeiro..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createInstance()}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500"
                autoFocus
              />
              <button
                onClick={createInstance}
                disabled={creating || !newName.trim()}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {creating ? <Loader2 size={14} className="animate-spin" /> : "Criar"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Após criar, clique em <strong>Conectar</strong> e escaneie o QR Code com o WhatsApp.
            </p>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-semibold text-slate-500 transition-colors hover:border-teal-300 hover:text-teal-600"
          >
            <Plus size={16} />Nova Instância
          </button>
        )}

        {/* Webhook info */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">URL do Webhook</p>
          <code className="block text-sm text-teal-700 break-all">
            {typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/whatsapp
          </code>
          <p className="text-xs text-slate-400">
            Configure este endereço na Evolution API para receber mensagens. O webhook já está configurado automaticamente ao criar uma instância.
          </p>
        </div>
      </div>

      {qrInstance && (
        <QrCodeModal
          instance={qrInstance}
          onClose={() => setQrInstance(null)}
          onConnected={fetchInstances}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// INBOX TAB
// ══════════════════════════════════════════════════════════════════

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === "OUTBOUND";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isOut ? "rounded-br-sm bg-teal-600 text-white" : "rounded-bl-sm bg-white text-slate-800 shadow-sm border border-slate-100"
      }`}>
        {msg.isFromBot && !isOut && (
          <div className="mb-1 flex items-center gap-1">
            <Bot size={10} className="text-violet-400" />
            <span className="text-[10px] font-semibold text-violet-500">IA</span>
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        <p className={`mt-1 text-right text-[10px] ${isOut ? "text-teal-200" : "text-slate-400"}`}>
          {formatTime(msg.createdAt)}
          {isOut && msg.status === "READ" && <CheckCheck size={12} className="inline ml-1" />}
        </p>
      </div>
    </div>
  );
}

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const cfg = CONV_STATUS[conv.status];
  const name = contactName(conv);
  const lastMsg = conv.messages?.[conv.messages.length - 1];
  return (
    <button onClick={onClick}
      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${active ? "bg-teal-50 border-r-2 border-teal-500" : ""}`}>
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-600">
          {initials(name)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          {conv.lastMessageAt && <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(conv.lastMessageAt)}</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">{lastMsg ? lastMsg.content : "Sem mensagens"}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
          {conv.aiEnabled && <Bot size={11} className="text-violet-400" />}
        </div>
      </div>
    </button>
  );
}

function InboxTab() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/conversations");
      const d = await res.json();
      setConversations(d.data ?? []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  useEffect(() => { const t = setInterval(fetchConversations, 10_000); return () => clearInterval(t); }, [fetchConversations]);

  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    fetch(`/api/v1/whatsapp/conversations/${active.id}/messages`)
      .then((r) => r.json()).then((d) => setMessages(d.data ?? [])).catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [active?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    setMessages((prev) => [...prev, { id: `tmp-${Date.now()}`, direction: "OUTBOUND", content: text, type: "text", status: "QUEUED", isFromBot: false, createdAt: new Date().toISOString() }]);
    try {
      await fetch(`/api/v1/whatsapp/conversations/${active.id}/send`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }),
      });
    } catch {} finally { setSending(false); }
  }

  async function toggleAI() {
    if (!active) return;
    const newVal = !active.aiEnabled;
    setActive({ ...active, aiEnabled: newVal });
    await fetch(`/api/v1/whatsapp/conversations/${active.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ aiEnabled: newVal }),
    });
    fetchConversations();
  }

  const filtered = conversations.filter((c) => {
    const name = contactName(c).toLowerCase();
    return name.includes(search.toLowerCase()) && (filterStatus === "all" || c.status === filterStatus);
  });

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-100">
        <div className="border-b border-slate-100 p-3 space-y-2">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input type="text" placeholder="Buscar conversa..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="flex gap-1">
            {[{ key: "all", label: "Todas" }, { key: "WAITING_HUMAN", label: "Aguardando" }, { key: "BOT", label: "IA" }, { key: "HUMAN", label: "Humano" }].map(({ key, label }) => (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${filterStatus === key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-teal-500" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center"><MessageSquare size={28} className="mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-400">Nenhuma conversa</p></div>
          ) : filtered.map((conv) => <ConvItem key={conv.id} conv={conv} active={active?.id === conv.id} onClick={() => setActive(conv)} />)}
        </div>
      </div>

      {/* Chat */}
      {active ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-500 text-sm font-bold text-white">{initials(contactName(active))}</div>
              <div>
                <p className="font-semibold text-slate-900">{contactName(active)}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone size={11} />{active.remoteJid.replace("@s.whatsapp.net", "")}
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${CONV_STATUS[active.status].color}`}>{CONV_STATUS[active.status].label}</span>
                </div>
              </div>
            </div>
            <button onClick={toggleAI} className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${active.aiEnabled ? "bg-violet-100 text-violet-700 hover:bg-violet-200" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              <Bot size={13} />{active.aiEnabled ? "IA Ativa" : "IA Pausada"}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-4">
            {loadingMsgs ? <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-teal-500" /></div>
              : messages.length === 0 ? <div className="py-12 text-center"><MessageSquare size={28} className="mx-auto mb-2 text-slate-300" /><p className="text-sm text-slate-400">Sem mensagens</p></div>
              : <>{messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}<div ref={bottomRef} /></>}
          </div>
          <div className="border-t border-slate-100 bg-white px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                <textarea rows={1} value={reply} onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
              </div>
              <button onClick={handleSend} disabled={!reply.trim() || sending}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {active.aiEnabled && <p className="mt-2 flex items-center gap-1 text-xs text-violet-500"><Bot size={11} />IA respondendo automaticamente.</p>}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50/50">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50"><MessageSquare size={28} className="text-teal-500" /></div>
            <p className="font-semibold text-slate-700">Selecione uma conversa</p>
            <p className="mt-1 text-sm text-slate-400">Escolha uma conversa na lista ao lado</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════

type Tab = "inbox" | "config";

export default function WhatsAppPage() {
  const [tab, setTab] = useState<Tab>("inbox");

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-white">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-slate-100 px-4 pt-2">
        <button onClick={() => setTab("inbox")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === "inbox" ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <Inbox size={15} />Conversas
        </button>
        <button onClick={() => setTab("config")}
          className={`flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${tab === "config" ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
          <Settings size={15} />Configurações
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {tab === "inbox" ? <InboxTab /> : <ConfigTab />}
      </div>
    </div>
  );
}
