// lib/queues.ts
// BullMQ queue definitions — no Next.js dependencies
// Safe to import in workers, services, and API routes

import { Queue, type QueueOptions } from "bullmq";

const connection = { url: process.env.REDIS_URL! };
const defaultOpts: QueueOptions = { connection };

export const Queues = {
  WHATSAPP_OUTBOUND: new Queue("whatsapp.outbound", defaultOpts),
  APPOINTMENT_REMINDERS: new Queue("appointments.reminders", defaultOpts),
  AI_CONVERSATIONS: new Queue("ai.conversations", defaultOpts),
  FINANCIAL_CHARGES: new Queue("financial.charges", defaultOpts),
  NOTIFICATIONS_EMAIL: new Queue("notifications.email", defaultOpts),
  AUDIT_EVENTS: new Queue("audit.events", defaultOpts),
  PATIENT_RETENTION: new Queue("patients.retention", defaultOpts),
} as const;

export type QueueName = keyof typeof Queues;

// ── Job payload types ────────────────────────────────────

export interface WhatsappOutboundJob {
  clinicId: string;
  instanceKey: string;
  to: string;
  message: string;
  type?: "text" | "image" | "audio";
  mediaUrl?: string;
}

export interface AppointmentReminderJob {
  clinicId: string;
  appointmentId: string;
  patientId: string;
  reminderType: "24h" | "1h";
}

export interface AiConversationJob {
  clinicId: string;
  conversationId: string;
  messageId: string;
  content: string;
  remoteJid: string;
}

export interface AuditEventJob {
  clinicId?: string;
  userId?: string;
  action: string;
  subject: string;
  subjectId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
}

export interface PatientRetentionJob {
  clinicId: string;
  patientId: string;
}
