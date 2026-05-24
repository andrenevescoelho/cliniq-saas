// app/api/v1/appointments/[id]/route.ts
import { withAuth, ok, badRequest, forbidden, notFound } from "@/lib/api";
import { AppointmentService } from "@/modules/appointment/services/appointment.service";
import { z } from "zod";

const service = new AppointmentService();

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm") }),
  z.object({ action: z.literal("cancel"), reason: z.string().optional() }),
]);

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Appointment")) return forbidden();

  const id = params?.id;
  if (!id) return badRequest("ID obrigatório");

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const { action } = parsed.data;

  if (action === "confirm") {
    const updated = await service.confirm(clinicId, id);
    return ok(updated);
  }

  if (action === "cancel") {
    const reason = "reason" in parsed.data ? parsed.data.reason : undefined;
    const updated = await service.cancel(clinicId, id, reason);
    return ok(updated);
  }

  return badRequest("Ação inválida");
});

export const GET = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("read", "Appointment")) return forbidden();

  const id = params?.id;
  if (!id) return badRequest("ID obrigatório");

  const { prisma } = await import("@/lib/prisma");

  const appointment = await prisma.appointment.findFirst({
    where: { id, clinicId },
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      doctor: { include: { user: { select: { name: true } } } },
      schedule: { select: { name: true, slotMinutes: true } },
    },
  });

  if (!appointment) return notFound("Agendamento não encontrado");

  return ok(appointment);
});
