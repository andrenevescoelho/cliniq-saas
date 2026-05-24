import { withAuth, ok, badRequest } from "@/lib/api";
import { AppointmentService } from "@/modules/appointment/services/appointment.service";

const service = new AppointmentService();

export const GET = withAuth(async (req, { clinicId }) => {
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get("scheduleId");
  const date = searchParams.get("date");

  if (!scheduleId || !date) return badRequest("scheduleId e date são obrigatórios");

  const slots = await service.getAvailableSlots(clinicId, scheduleId, new Date(date));
  return ok(slots);
});
