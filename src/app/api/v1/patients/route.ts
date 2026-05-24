// app/api/v1/patients/route.ts
import { withAuth, ok, created, badRequest } from "@/lib/api";
import { PatientService } from "@/modules/patient/services/patient.service";
import { z } from "zod";

const service = new PatientService();

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  birthDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  document: z.string().optional(),
  gender: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("read", "Patient")) return badRequest("Sem permissão");

  const { searchParams } = new URL(req.url);
  const result = await service.list(clinicId, {
    search: searchParams.get("search") ?? undefined,
    isActive: searchParams.get("active") !== "false",
    page: Number(searchParams.get("page")) || 1,
    limit: Number(searchParams.get("limit")) || 20,
  });

  return ok(result);
});

export const POST = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("create", "Patient")) return badRequest("Sem permissão");

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const patient = await service.create(clinicId, parsed.data);
  return created(patient);
});

// app/api/v1/patients/[id]/route.ts
import { withAuth, ok, noContent, notFound, badRequest, forbidden } from "@/lib/api";
import { PatientService } from "@/modules/patient/services/patient.service";
import { z } from "zod";

const svc = new PatientService();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  birthDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const GET_BY_ID = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("read", "Patient")) return forbidden();
  const patient = await svc.getById(clinicId, params!.id);
  return ok(patient);
});

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Patient")) return forbidden();
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());
  const patient = await svc.update(clinicId, params!.id, parsed.data);
  return ok(patient);
});

export const DELETE = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("delete", "Patient")) return forbidden();
  await svc.delete(clinicId, params!.id);
  return noContent();
});
