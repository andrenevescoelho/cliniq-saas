// prisma/seed.ts — Database seed for development

import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Plans ────────────────────────────────────────────
  const starter = await prisma.plan.upsert({
    where: { slug: "STARTER" },
    create: {
      name: "Starter",
      slug: "STARTER",
      priceMonthly: 197,
      priceYearly: 1970,
      maxUsers: 3,
      maxWhatsapp: 1,
      maxAiMessages: 500,
      features: { agenda: true, whatsapp: true, ai: true, financial: false, reports: false },
    },
    update: {},
  });

  const growth = await prisma.plan.upsert({
    where: { slug: "GROWTH" },
    create: {
      name: "Growth",
      slug: "GROWTH",
      priceMonthly: 397,
      priceYearly: 3970,
      maxUsers: 10,
      maxWhatsapp: 3,
      maxAiMessages: 2000,
      features: { agenda: true, whatsapp: true, ai: true, financial: true, reports: true },
    },
    update: {},
  });

  // ── Demo Clinic ───────────────────────────────────────
  const clinic = await prisma.clinic.upsert({
    where: { slug: "clinica-demo" },
    create: {
      name: "Clínica Demo",
      slug: "clinica-demo",
      email: "demo@cliniq.com.br",
      phone: "11999999999",
      timezone: "America/Sao_Paulo",
      settings: {
        appointmentDuration: 30,
        allowOnlineScheduling: true,
        aiEnabled: true,
      },
    },
    update: {},
  });

  // ── Subscription ──────────────────────────────────────
  await prisma.subscription.upsert({
    where: { clinicId: clinic.id },
    create: {
      clinicId: clinic.id,
      planId: growth.id,
      status: "TRIALING",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  // ── AI Config ─────────────────────────────────────────
  await prisma.aiConfig.upsert({
    where: { clinicId: clinic.id },
    create: {
      clinicId: clinic.id,
      systemPrompt: `Você é a assistente virtual da Clínica Demo. 
Seu nome é Sofia.
Você é simpática, profissional e eficiente.
Ajude pacientes a agendar consultas, confirmar horários e tirar dúvidas.
Horários de atendimento: segunda a sexta das 8h às 18h, sábado das 8h às 12h.
Especialidades: Clínica Geral, Pediatria, Ginecologia.
Quando não souber responder algo, transfira para um atendente humano.`,
      welcomeMessage: "Olá! 👋 Sou a Sofia, assistente da Clínica Demo. Como posso ajudar você hoje?",
      model: "gpt-4o-mini",
      monthlyLimit: 2000,
    },
    update: {},
  });

  // ── Users ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@cliniq.com.br" },
    create: { name: "Dr. Carlos Admin", email: "admin@cliniq.com.br", passwordHash },
    update: {},
  });

  const doctorUser = await prisma.user.upsert({
    where: { email: "medico@cliniq.com.br" },
    create: { name: "Dra. Maria Silva", email: "medico@cliniq.com.br", passwordHash },
    update: {},
  });

  const receptionist = await prisma.user.upsert({
    where: { email: "recepcionista@cliniq.com.br" },
    create: { name: "Ana Recepção", email: "recepcionista@cliniq.com.br", passwordHash },
    update: {},
  });

  // ── Clinic Users ──────────────────────────────────────
  await prisma.clinicUser.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: adminUser.id } },
    create: { clinicId: clinic.id, userId: adminUser.id, role: UserRole.CLINIC_OWNER },
    update: {},
  });

  await prisma.clinicUser.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: doctorUser.id } },
    create: { clinicId: clinic.id, userId: doctorUser.id, role: UserRole.DOCTOR },
    update: {},
  });

  await prisma.clinicUser.upsert({
    where: { clinicId_userId: { clinicId: clinic.id, userId: receptionist.id } },
    create: { clinicId: clinic.id, userId: receptionist.id, role: UserRole.RECEPTIONIST },
    update: {},
  });

  // ── Schedule ──────────────────────────────────────────
  await prisma.schedule.upsert({
    where: { id: "schedule-demo-001" },
    create: {
      id: "schedule-demo-001",
      clinicId: clinic.id,
      name: "Agenda Principal",
      slotMinutes: 30,
      workingHours: {
        mon: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
        tue: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
        wed: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
        thu: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "18:00" }],
        fri: [{ start: "08:00", end: "12:00" }, { start: "14:00", end: "17:00" }],
        sat: [{ start: "08:00", end: "12:00" }],
      },
    },
    update: {},
  });

  // ── Demo Patients ─────────────────────────────────────
  const patients = [
    { name: "Ana Paula Souza", phone: "11987654321", email: "ana@email.com" },
    { name: "Roberto Lima", phone: "11976543210", email: "roberto@email.com" },
    { name: "Fernanda Costa", phone: "11965432109", email: "fernanda@email.com" },
  ];

  for (const p of patients) {
    await prisma.patient.upsert({
      where: { id: `patient-${p.phone}` },
      create: { id: `patient-${p.phone}`, clinicId: clinic.id, ...p },
      update: {},
    });
  }

  console.log("✅ Seed completed!");
  console.log("\n🔑 Credentials:");
  console.log("  Admin: admin@cliniq.com.br / admin123");
  console.log("  Médico: medico@cliniq.com.br / admin123");
  console.log("  Recepcionista: recepcionista@cliniq.com.br / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
