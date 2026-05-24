# ClinIQ — SaaS de Automação Clínica

> Plataforma multi-tenant de automação inteligente para clínicas
> WhatsApp · IA · Agenda · Financeiro · Automações

---

## 🚀 Quick Start

```bash
# 1. Clone e configure
cp .env.example .env
# Edite .env com suas credenciais

# 2. Suba a infraestrutura
docker-compose up -d postgres redis

# 3. Instale dependências
npm install

# 4. Configure o banco
npm run db:generate
npm run db:migrate
npm run db:seed

# 5. Inicie o app
npm run dev

# 6. (Opcional) Inicie workers em outro terminal
npm run workers

# 7. (Opcional) Suba tudo com Docker
docker-compose up -d
```

**Acesso**: http://localhost:3000
**Credenciais demo**: admin@cliniq.com.br / admin123

---

## 🏗️ Arquitetura

```
ClinIQ
├── Next.js 14 (App Router)     — Frontend + API Routes
├── PostgreSQL 16                — Banco principal (multi-tenant)
├── Redis + BullMQ               — Filas e cache
├── N8N                          — Automações visuais
├── Evolution API                — WhatsApp
└── OpenAI GPT-4o                — IA conversacional
```

Ver [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) para documentação completa.

---

## 📁 Estrutura

```
src/
├── app/              Next.js App Router
├── modules/          Domínios (Clean Architecture)
│   ├── auth/         Autenticação + RBAC
│   ├── patient/      Pacientes
│   ├── appointment/  Agenda
│   ├── whatsapp/     WhatsApp + Evolution API
│   ├── ai/           Agente IA
│   ├── financial/    Financeiro + PIX
│   └── automation/   Automações
├── workers/          BullMQ Workers
├── lib/              Utilitários core
└── components/       UI Components
```

---

## 🔑 RBAC — Roles

| Role           | Acesso                              |
|----------------|-------------------------------------|
| CLINIC_OWNER   | Tudo                                |
| CLINIC_ADMIN   | Tudo exceto billing                 |
| DOCTOR         | Agenda própria + Pacientes          |
| RECEPTIONIST   | Agenda + Pacientes + WhatsApp       |
| FINANCIAL      | Financeiro + Relatórios             |

---

## 🤖 IA — Como funciona

1. Paciente manda mensagem no WhatsApp
2. Evolution API envia webhook para `/api/webhooks/whatsapp`
3. Sistema cria/atualiza conversa no banco
4. Job é adicionado na fila `ai.conversations`
5. Worker AI processa com OpenAI + Function Calling
6. IA pode: verificar slots, agendar, buscar informações
7. Resposta é enviada de volta via WhatsApp

---

## 📦 Workers

```bash
# Filas disponíveis
whatsapp.outbound       → Envio de mensagens WA
appointments.reminders  → Lembretes 24h/1h
ai.conversations        → Processamento IA
financial.charges       → Cobranças automáticas
notifications.email     → Emails
audit.events            → Logs de auditoria
patients.retention      → Campanhas retorno
```

---

## 🔧 Serviços Docker

| Serviço    | Porta | Acesso                        |
|------------|-------|-------------------------------|
| App        | 3000  | http://localhost:3000         |
| PostgreSQL | 5432  | cliniq:cliniq_secret          |
| Redis      | 6379  | :redis_secret                 |
| N8N        | 5678  | http://localhost:5678         |
| Evolution  | 8080  | http://localhost:8080         |

---

## 📚 Documentação

- [Arquitetura](docs/ARCHITECTURE.md)
- [Estrutura de Pastas](docs/FOLDER_STRUCTURE.md)
- [Prisma Schema](prisma/schema.prisma)

---

## 🗺️ Roadmap MVP

- [x] Estrutura base + Multi-tenant
- [x] Auth + RBAC com CASL
- [x] Prisma Schema completo
- [x] Módulos: Patient, Appointment, WhatsApp, AI, Financial
- [x] BullMQ Workers
- [x] Evolution API integration
- [x] OpenAI Agent com Function Calling
- [x] Dashboard UI
- [ ] Login page
- [ ] Agenda Calendar View
- [ ] WhatsApp Inbox UI
- [ ] Financeiro PIX
- [ ] Automations builder (N8N embed)
