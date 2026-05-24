import { withAuth, ok, noContent, forbidden, badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "DRAFT"]).optional(),
});

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Automation")) return forbidden();

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos");

  await prisma.automation.updateMany({
    where: { id: params!.id, clinicId },
    data: parsed.data,
  });

  return ok({ updated: true });
});

export const DELETE = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("delete", "Automation")) return forbidden();

  await prisma.automation.deleteMany({
    where: { id: params!.id, clinicId },
  });

  return noContent();
});
