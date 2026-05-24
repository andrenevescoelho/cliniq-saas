# ClinIQ — Arquitetura SaaS de Automação Clínica

## Visão Geral

ClinIQ é uma plataforma SaaS multi-tenant focada em automação inteligente para clínicas.
**Não é** um prontuário médico — é uma plataforma de relacionamento, automação e atendimento.

---

## Stack

| Camada        | Tecnologia                          |
|---------------|-------------------------------------|
| Frontend      | Next.js 14 App Router + TypeScript  |
| Estilização   | Tailwind CSS + shadcn/ui            |
| ORM           | Prisma 5                            |
| Banco         | PostgreSQL 16                       |
| Auth          | NextAuth v5 (Auth.js)               |
| Cache/Filas   | Redis (BullMQ)                      |
| Automações    | N8N                                 |
| IA            | OpenAI GPT-4o / Gemini              |
| WhatsApp      | Evolution API                       |
| Pagamentos    | Stripe + Pagar.me (PIX)             |
| Containers    | Docker Compose                      |
| Email         | Resend                              |
| Storage       | S3 / Cloudflare R2                  |

---

## Estratégia Multi-Tenant

### Modelo: Schema Compartilhado com Row-Level Isolation

Cada recurso possui `clinic_id`. A query layer sempre filtra por clínica.
Isso permite escalar para milhares de clínicas sem complexidade operacional.

```
Usuário → JWT com { clinicId, userId, role }
         ↓
Middleware → verifica clinicId
         ↓
Prisma Client → where: { clinicId } em todo acesso
```

### Futuramente (v2+)
- Subdomínio por clínica: `clinica-abc.cliniq.com.br`
- Schema separado por clínica (enterprise tier)
- Tenant database isolation para clínicas grandes

---

## RBAC — Roles e Permissões

```
SUPER_ADMIN     → Acesso à plataforma toda (Anthropic-level)
CLINIC_OWNER    → Dono da clínica, acesso total ao tenant
CLINIC_ADMIN    → Admin da clínica, sem billing
DOCTOR          → Agenda própria, pacientes, sem financeiro
RECEPTIONIST    → Agenda, pacientes, sem relatórios financeiros
FINANCIAL       → Módulo financeiro, relatórios, sem agenda
```

### Permissões granulares (Subjects + Actions)

```typescript
type Action = 'create' | 'read' | 'update' | 'delete' | 'manage'
type Subject =
  | 'Patient' | 'Appointment' | 'Schedule'
  | 'WhatsApp' | 'Financial' | 'Report'
  | 'User' | 'Clinic' | 'Automation' | 'AI'
```

---

## Módulos do Sistema

```
┌─────────────────────────────────────────────────────┐
│                    ClinIQ Platform                  │
├──────────┬──────────┬──────────┬────────────────────┤
│  Tenant  │  Auth    │  Users   │     Patients       │
├──────────┼──────────┼──────────┼────────────────────┤
│ Schedule │ WhatsApp │    AI    │    Financial       │
├──────────┼──────────┼──────────┼────────────────────┤
│Automation│  Audit   │ Dashboard│    Billing         │
└──────────┴──────────┴──────────┴────────────────────┘
```

Cada módulo tem:
- `/modules/{module}/domain/` — entidades e tipos
- `/modules/{module}/repository/` — acesso a dados
- `/modules/{module}/service/` — regras de negócio
- `/modules/{module}/api/` — rotas Next.js

---

## Fluxo de Autenticação

```
Login → NextAuth → JWT (clinicId + userId + role)
     → Middleware verifica tenant
     → CASL ability gerada por role
     → Componentes verificam can('read', 'Patient')
```

---

## Estratégia de Filas (BullMQ + Redis)

### Filas principais

| Fila                  | Uso                                    |
|-----------------------|----------------------------------------|
| `whatsapp.outbound`   | Envio de mensagens WA                  |
| `appointments.reminders` | Lembretes 24h/1h antes              |
| `ai.conversations`    | Processar respostas IA                 |
| `financial.charges`   | Cobranças automáticas                  |
| `notifications.email` | Emails transacionais                   |
| `audit.events`        | Gravar logs de auditoria               |
| `patients.retention`  | Campanhas de retorno                   |

### Workers (processos separados)

```
workers/
├── whatsapp.worker.ts
├── appointments.worker.ts
├── ai.worker.ts
├── financial.worker.ts
└── notifications.worker.ts
```

---

## Estratégia de IA

### Casos de uso MVP

1. **Triagem inicial**: Bot WhatsApp responde, coleta queixa
2. **Agendamento por IA**: Entende mensagem livre → agenda consulta
3. **Recuperação de pacientes**: Identifica inativos → envia mensagem personalizada
4. **Respostas automáticas**: FAQ da clínica, horários, valores

### Arquitetura IA

```
Mensagem WA → Evolution API Webhook
           → Fila ai.conversations
           → Worker AI
           → LangChain + OpenAI
           → Tools: { checkSchedule, bookAppointment, getPatientInfo }
           → Resposta WA
```

---

## Eventos e Webhooks

### Eventos internos (EventEmitter / Redis Pub-Sub)

```
appointment.created     → dispara lembrete, notifica paciente
appointment.confirmed   → atualiza status, notifica médico
appointment.cancelled   → libera slot, notifica, oferece reagendamento
payment.received        → atualiza status, libera serviço
patient.inactive        → envia campanha retorno
whatsapp.message.in     → roteia para humano ou IA
```

### Webhooks externos

- Evolution API → `/api/webhooks/whatsapp`
- Stripe → `/api/webhooks/stripe`
- N8N → `/api/webhooks/n8n/{clinicId}/{event}`

---

## Estratégia de Billing (SaaS)

### Planos

| Plano    | Clínicas | Usuários | WA | IA Msgs/mês | Preço     |
|----------|----------|----------|----|-------------|-----------|
| Starter  | 1        | 3        | 1  | 500         | R$ 197    |
| Growth   | 1        | 10       | 3  | 2.000       | R$ 397    |
| Scale    | 1        | ilimitado| 5  | 10.000      | R$ 797    |
| Enterprise| custom  | custom   | custom | custom  | custom    |

### Implementação

- Stripe para cartão recorrente
- Pagar.me para PIX recorrente (mercado BR)
- Feature flags por plano no JWT
- Metering de uso de IA por clinicId

---

## Telas do Dashboard (MVP)

```
/dashboard
├── / (overview)
├── /agenda (calendar view)
├── /pacientes (lista + perfil)
├── /whatsapp (inbox)
├── /financeiro (cobranças + PIX)
├── /automacoes (fluxos N8N)
├── /configuracoes
│   ├── /clinica
│   ├── /usuarios
│   ├── /whatsapp
│   └── /integrações
└── /relatorios
```

---

## O que NÃO construir no MVP

❌ Prontuário médico completo (LGPD/CFM complexo)
❌ Prescrição digital
❌ Telemedicina
❌ Marketplace de clínicas
❌ App mobile nativo
❌ Multi-idioma
❌ BI avançado / Data warehouse
❌ Integrações com planos de saúde
❌ Schema separado por tenant (premature optimization)

---

## Roadmap Técnico

### MVP (Meses 1-3)
- Multi-tenant base + Auth + RBAC
- Agenda + Pacientes CRUDs
- WhatsApp via Evolution API
- IA básica (agendamento + FAQ)
- Financeiro PIX simples
- Dashboard métricas básicas
- Lembretes automáticos

### V1 (Meses 4-6)
- N8N visual automations
- Relatórios avançados
- Módulo de retenção IA
- App companion (PWA)
- Integração múltiplos WA por clínica
- Billing com Stripe

### V2 (Meses 7-12)
- Subdomínios por clínica
- Marketplace de automações
- API pública para integrações
- White-label
- Microserviços (IA, WA separados)

---

## Estratégia de Escala

```
Fase 1 (< 100 clínicas):  Monolito modular, 1 servidor
Fase 2 (< 1000 clínicas): Separar workers, Redis cluster
Fase 3 (> 1000 clínicas): Microserviços: AI-service, WA-service
                           Multi-region PostgreSQL
                           CDN para assets
```
