src/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Auth routes (unauthenticated)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   ├── (dashboard)/                  # Dashboard (authenticated)
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── page.tsx                  # Overview
│   │   ├── agenda/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── pacientes/
│   │   │   ├── page.tsx
│   │   │   ├── novo/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── whatsapp/
│   │   │   ├── page.tsx              # Inbox
│   │   │   └── [conversationId]/page.tsx
│   │   ├── financeiro/
│   │   │   ├── page.tsx
│   │   │   └── cobrancas/page.tsx
│   │   ├── automacoes/
│   │   │   └── page.tsx
│   │   ├── relatorios/
│   │   │   └── page.tsx
│   │   └── configuracoes/
│   │       ├── clinica/page.tsx
│   │       ├── usuarios/page.tsx
│   │       ├── whatsapp/page.tsx
│   │       └── integracoes/page.tsx
│   └── api/                          # API Routes
│       ├── auth/[...nextauth]/route.ts
│       ├── webhooks/
│       │   ├── whatsapp/route.ts
│       │   ├── stripe/route.ts
│       │   └── n8n/[clinicId]/[event]/route.ts
│       └── v1/                       # REST API (future public API)
│           ├── clinics/
│           ├── patients/
│           ├── appointments/
│           ├── payments/
│           └── conversations/
│
├── modules/                          # Domain modules (Clean Architecture)
│   ├── auth/
│   │   ├── domain/types.ts
│   │   ├── services/auth.service.ts
│   │   └── utils/ability.ts          # CASL ability builder
│   ├── clinic/
│   │   ├── domain/clinic.entity.ts
│   │   ├── repositories/clinic.repository.ts
│   │   └── services/clinic.service.ts
│   ├── patient/
│   │   ├── domain/patient.entity.ts
│   │   ├── repositories/patient.repository.ts
│   │   └── services/patient.service.ts
│   ├── appointment/
│   │   ├── domain/appointment.entity.ts
│   │   ├── repositories/appointment.repository.ts
│   │   └── services/appointment.service.ts
│   ├── whatsapp/
│   │   ├── domain/conversation.entity.ts
│   │   ├── providers/evolution.provider.ts
│   │   ├── repositories/conversation.repository.ts
│   │   └── services/whatsapp.service.ts
│   ├── ai/
│   │   ├── domain/ai-config.entity.ts
│   │   ├── providers/openai.provider.ts
│   │   ├── tools/appointment.tool.ts
│   │   ├── tools/patient.tool.ts
│   │   └── services/ai-agent.service.ts
│   ├── financial/
│   │   ├── domain/payment.entity.ts
│   │   ├── providers/pix.provider.ts
│   │   ├── repositories/payment.repository.ts
│   │   └── services/payment.service.ts
│   └── automation/
│       ├── domain/automation.entity.ts
│       ├── repositories/automation.repository.ts
│       └── services/automation.service.ts
│
├── workers/                          # BullMQ Workers
│   ├── index.ts                      # Workers entrypoint
│   ├── queues.ts                     # Queue definitions
│   ├── whatsapp.worker.ts
│   ├── appointments.worker.ts
│   ├── ai.worker.ts
│   ├── financial.worker.ts
│   └── notifications.worker.ts
│
├── components/                       # Shared UI components
│   ├── ui/                           # shadcn/ui components
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   └── dashboard-layout.tsx
│   ├── shared/
│   │   ├── data-table.tsx
│   │   ├── page-header.tsx
│   │   ├── stats-card.tsx
│   │   └── empty-state.tsx
│   └── domain/                       # Domain-specific components
│       ├── appointment/
│       ├── patient/
│       └── whatsapp/
│
├── lib/                              # Core utilities
│   ├── prisma.ts                     # Prisma singleton
│   ├── redis.ts                      # Redis client
│   ├── auth.ts                       # NextAuth config
│   ├── api.ts                        # API response helpers
│   ├── errors.ts                     # Error classes
│   ├── logger.ts                     # Pino logger
│   └── tenant.ts                     # Tenant context helpers
│
├── hooks/                            # React hooks
│   ├── use-clinic.ts
│   ├── use-ability.ts
│   └── use-realtime.ts
│
└── types/                            # Global TypeScript types
    ├── next-auth.d.ts
    ├── api.ts
    └── index.ts
