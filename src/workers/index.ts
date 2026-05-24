// workers/index.ts — Main workers entrypoint
// Run: npm run workers

import { Worker, Queue } from "bullmq";
import { prisma } from "../lib/prisma";
import { AiAgentService } from "../modules/ai/services/ai-agent.service";
import { EvolutionApiProvider } from "../modules/whatsapp/providers/evolution.provider";

const connection = { url: process.env.REDIS_URL! };

// ── WhatsApp Outbound Worker ─────────────────────────────
const whatsappWorker = new Worker(
  "whatsapp.outbound",
  async (job) => {
    const evolution = new EvolutionApiProvider();
    await evolution.sendText({
      instanceKey: job.data.instanceKey,
      to: job.data.to,
      message: job.data.message,
    });
    console.log(`[WA] Sent to ${job.data.to}`);
  },
  {
    connection,
    concurrency: 5,
    limiter: { max: 30, duration: 60_000 },
  }
);

// ── Appointment Reminders Worker ─────────────────────────
const remindersWorker = new Worker(
  "appointments.reminders",
  async (job) => {
    const { clinicId, appointmentId, reminderType } = job.data;

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      include: { patient: true, schedule: true },
    });

    if (!appointment || appointment.status === "CANCELLED") return;

    const dateStr = appointment.startAt.toLocaleDateString("pt-BR");
    const timeStr = appointment.startAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const message =
      reminderType === "24h"
        ? `Olá ${appointment.patient.name}! 👋\n\nLembramos que você tem consulta *amanhã, ${dateStr} às ${timeStr}*.\n\nPara confirmar, responda *SIM*. Para cancelar, responda *NÃO*.`
        : `Olá ${appointment.patient.name}! ⏰\n\nSua consulta é *hoje às ${timeStr}*. Estamos te esperando! 🏥`;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { clinicId, isActive: true },
    });

    if (instance) {
      const outboundQ = new Queue("whatsapp.outbound", { connection });
      await outboundQ.add(`reminder.${appointmentId}`, {
        clinicId,
        instanceKey: instance.instanceKey,
        to: appointment.patient.phone,
        message,
      });
    }

    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { reminderSent: true },
    });

    console.log(`[Reminder] ${reminderType} → ${appointment.patient.phone}`);
  },
  { connection }
);

// ── AI Conversations Worker ──────────────────────────────
const aiWorker = new Worker(
  "ai.conversations",
  async (job) => {
    const aiService = new AiAgentService();
    await aiService.processMessage(job.data);
    console.log(`[AI] Processed conversation ${job.data.conversationId}`);
  },
  { connection, concurrency: 3 }
);

// ── Audit Events Worker ──────────────────────────────────
const auditWorker = new Worker(
  "audit.events",
  async (job) => {
    const { clinicId, userId, action, subject, subjectId, before, after, ipAddress } = job.data;
    await prisma.auditLog.create({
      data: {
        clinicId,
        userId,
        action,
        subject,
        subjectId,
        before,
        after,
        ipAddress,
      },
    });
  },
  { connection, concurrency: 10 }
);

// ── Patient Retention Worker ─────────────────────────────
const retentionWorker = new Worker(
  "patients.retention",
  async (job) => {
    const { clinicId, patientId } = job.data;

    const patient = await prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });
    if (!patient) return;

    const instance = await prisma.whatsappInstance.findFirst({
      where: { clinicId, isActive: true },
    });
    if (!instance) return;

    const outboundQ = new Queue("whatsapp.outbound", { connection });
    await outboundQ.add(`retention.${patientId}`, {
      clinicId,
      instanceKey: instance.instanceKey,
      to: patient.phone,
      message: `Olá ${patient.name}! 😊\n\nSaudades de você por aqui! Que tal agendar uma consulta de retorno? 👨‍⚕️\n\nResponda *AGENDAR* e te ajudamos em instantes!`,
    });

    console.log(`[Retention] → patient ${patientId}`);
  },
  { connection }
);

// ── Error handlers & startup ─────────────────────────────
const allWorkers = [whatsappWorker, remindersWorker, aiWorker, auditWorker, retentionWorker];

allWorkers.forEach((worker) => {
  worker.on("failed", (job, err) => {
    console.error(`[${worker.name}] Job ${job?.id} failed:`, err.message);
  });
  worker.on("error", (err) => {
    console.error(`[${worker.name}] Error:`, err.message);
  });
});

console.log("✅ Workers started:", allWorkers.map((w) => w.name).join(", "));

process.on("SIGTERM", async () => {
  console.log("Shutting down workers...");
  await Promise.all(allWorkers.map((w) => w.close()));
  await prisma.$disconnect();
  process.exit(0);
});
