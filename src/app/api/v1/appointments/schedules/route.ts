// app/api/v1/appointments/schedules/route.ts
import { withAuth, ok, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, { clinicId, ability }) => {
  if (!ability.can("read", "Appointment")) return forbidden();

  const schedules = await prisma.schedule.findMany({
    where: { clinicId, isActive: true },
    select: {
      id: true,
      name: true,
      slotMinutes: true,
      clinicUserId: true,
    },
    orderBy: { name: "asc" },
  });

  return ok(schedules);
});
