"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare, Search, Send, Bot, User, Clock,
  CheckCheck, RefreshCw, Circle, Loader2, X, Phone,
  UserCheck, Wifi, WifiOff,
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
  _count?: { messages: number };
}

interface Message {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  content: string;
  type: string;
  status: string;
  isFromBot: boolean;
  createdAt: string;
  sentAt?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  OPEN:          { label: "Aberta",        color: "bg-blue-100 text-blue-700",    dot: "bg-blue-400" },
  BOT:           { label: "IA Ativa",      color: "bg-violet-100 text-violet-700", dot: "bg-violet-400" },
  WAITING_HUMAN: { label: "Aguardando",    color: "bg-amber-100 text-amber-700",  dot: "bg-amber-400" },
  HUMAN:         { label: "Atendimento",   color: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-400" },
  CLOSED:        { label: "Fechada",       color: "bg-slate-100 text-slate-500",  dot: "bg-slate-300" },
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

// ── Message Bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.direction === "OUTBOUND";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-1`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
        isOut
          ? "rounded-br-sm bg-teal-600 text-white"
          : "rounded-bl-sm bg-white text-slate-800 shadow-sm border border-slate-100"
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

// ── Conversation Item ─────────────────────────────────────────────────────────

function ConvItem({ conv, active, onClick }: { conv: Conversation; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[conv.status];
  const name = contactName(conv);
  const lastMsg = conv.messages?.[conv.messages.length - 1];

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${active ? "bg-teal-50 border-r-2 border-teal-500" : ""}`}
    >
      <div className="relative shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-bold text-slate-600">
          {initials(name)}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${cfg.dot}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
          {conv.lastMessageAt && (
            <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(conv.lastMessageAt)}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-400">
          {lastMsg ? lastMsg.content : "Sem mensagens"}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
          {conv.aiEnabled && <Bot size={11} className="text-violet-400" title="IA ativa" />}
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WhatsAppPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Fetch conversations ───────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/whatsapp/conversations");
      const d = await res.json();
      setConversations(d.data ?? []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Poll for new messages every 10s
  useEffect(() => {
    const interval = setInterval(fetchConversations, 10_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // ── Load messages for active conversation ─────────────────────────────────

  useEffect(() => {
    if (!active) return;
    setLoadingMsgs(true);
    fetch(`/api/v1/whatsapp/conversations/${active.id}/messages`)
      .then((r) => r.json())
      .then((d) => setMessages(d.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [active?.id]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────

  async function handleSend() {
    if (!reply.trim() || !active || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply("");
    // Optimistic
    const tmp: Message = {
      id: `tmp-${Date.now()}`,
      direction: "OUTBOUND",
      content: text,
      type: "text",
      status: "QUEUED",
      isFromBot: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tmp]);

    try {
      await fetch(`/api/v1/whatsapp/conversations/${active.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
    } catch {}
    finally { setSending(false); }
  }

  // ── Toggle AI ─────────────────────────────────────────────────────────────

  async function toggleAI() {
    if (!active) return;
    const newVal = !active.aiEnabled;
    setActive({ ...active, aiEnabled: newVal });
    await fetch(`/api/v1/whatsapp/conversations/${active.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiEnabled: newVal }),
    });
    fetchConversations();
  }

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = conversations.filter((c) => {
    const name = contactName(c).toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) ||
      c.remoteJid.includes(search);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white">

      {/* Sidebar */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-100">
        {/* Header */}
        <div className="border-b border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 font-bold text-slate-900">
              <MessageSquare size={18} className="text-teal-600" />WhatsApp
            </h1>
            <button onClick={fetchConversations} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Buscar conversa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Status filters */}
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
          {[
            { key: "all", label: "Todas" },
            { key: "WAITING_HUMAN", label: "Aguardando" },
            { key: "BOT", label: "IA" },
            { key: "HUMAN", label: "Humano" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filterStatus === key
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-teal-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <MessageSquare size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-400">Nenhuma conversa</p>
            </div>
          ) : (
            filtered.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                active={active?.id === conv.id}
                onClick={() => setActive(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {active ? (
        <div className="flex flex-1 flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-sky-500 text-sm font-bold text-white">
                {initials(contactName(active))}
              </div>
              <div>
                <p className="font-semibold text-slate-900">{contactName(active)}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Phone size={11} />
                  {active.remoteJid.replace("@s.whatsapp.net", "")}
                  <span className={`rounded-full px-2 py-0.5 font-semibold ${STATUS_CONFIG[active.status].color}`}>
                    {STATUS_CONFIG[active.status].label}
                  </span>
                </div>
              </div>
            </div>

            {/* AI toggle */}
            <button
              onClick={toggleAI}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                active.aiEnabled
                  ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              <Bot size={13} />
              {active.aiEnabled ? "IA Ativa" : "IA Pausada"}
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-slate-50/50 px-6 py-4">
            {loadingMsgs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={20} className="animate-spin text-teal-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare size={28} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-400">Sem mensagens ainda</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-100 bg-white px-6 py-4">
            <div className="flex items-end gap-3">
              <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-teal-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-500/20">
                <textarea
                  rows={1}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Digite uma mensagem... (Enter para enviar)"
                  className="w-full resize-none bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm transition-colors hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            {active.aiEnabled && (
              <p className="mt-2 flex items-center gap-1 text-xs text-violet-500">
                <Bot size={11} />
                IA respondendo automaticamente. Envie uma mensagem para assumir o atendimento.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center bg-slate-50/50">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
              <MessageSquare size={28} className="text-teal-500" />
            </div>
            <p className="font-semibold text-slate-700">Selecione uma conversa</p>
            <p className="mt-1 text-sm text-slate-400">Escolha uma conversa na lista ao lado para começar</p>
          </div>
        </div>
      )}
    </div>
  );
}
