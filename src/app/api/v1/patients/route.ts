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
