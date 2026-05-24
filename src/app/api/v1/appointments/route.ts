// app/api/v1/appointments/route.ts
import { withAuth, ok, created, badRequest, forbidden } from "@/lib/api";
import { AppointmentService } from "@/modules/appointment/services/appointment.service";
import { z } from "zod";

const service = new AppointmentService();

const createSchema = z.object({
  patientId: z.string(),
  scheduleId: z.string(),
  doctorId: z.string().optional(),
  startAt: z.string().transform((v) => new Date(v)),
  endAt: z.string().transform((v) => new Date(v)),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("read", "Appointment")) return forbidden();

  const { searchParams } = new URL(req.url);
  const appointments = await service.list(clinicId, {
    startDate: searchParams.get("start") ? new Date(searchParams.get("start")!) : undefined,
    endDate: searchParams.get("end") ? new Date(searchParams.get("end")!) : undefined,
    scheduleId: searchParams.get("scheduleId") ?? undefined,
    doctorId: searchParams.get("doctorId") ?? undefined,
    patientId: searchParams.get("patientId") ?? undefined,
    status: (searchParams.get("status") as any) ?? undefined,
  });

  return ok(appointments);
});

export const POST = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("create", "Appointment")) return forbidden();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const appointment = await service.create(clinicId, parsed.data);
  return created(appointment);
});
