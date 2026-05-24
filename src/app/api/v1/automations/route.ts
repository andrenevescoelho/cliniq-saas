import { withAuth, ok, created, badRequest, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum([
    "APPOINTMENT_CREATED", "APPOINTMENT_CONFIRMED", "APPOINTMENT_CANCELLED",
    "APPOINTMENT_REMINDER_24H", "APPOINTMENT_REMINDER_1H", "APPOINTMENT_NO_SHOW",
    "PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PATIENT_INACTIVE", "PATIENT_BIRTHDAY", "CUSTOM",
  ]),
  actions: z.array(z.any()).default([]),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).default("DRAFT"),
});

export const GET = withAuth(async (_req, { clinicId, ability }) => {
  if (!ability.can("read", "Automation")) return forbidden();

  const automations = await prisma.automation.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
  });

  return ok(automations);
});

export const POST = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("create", "Automation")) return forbidden();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const automation = await prisma.automation.create({
    data: { clinicId, ...parsed.data },
  });

  return created(automation);
});
