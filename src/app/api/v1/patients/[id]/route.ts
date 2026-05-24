import { withAuth, ok, noContent, badRequest, forbidden } from "@/lib/api";
import { PatientService } from "@/modules/patient/services/patient.service";
import { z } from "zod";

const service = new PatientService();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  birthDate: z.string().optional().transform((value) => value ? new Date(value) : undefined),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("read", "Patient")) return forbidden();

  const patient = await service.getById(clinicId, params!.id);
  return ok(patient);
});

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Patient")) return forbidden();

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const patient = await service.update(clinicId, params!.id, parsed.data);
  return ok(patient);
});

export const DELETE = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("delete", "Patient")) return forbidden();

  await service.delete(clinicId, params!.id);
  return noContent();
});
