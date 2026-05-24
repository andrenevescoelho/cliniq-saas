import { withAuth, ok, forbidden, badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "REFUNDED"]).optional(),
  notes: z.string().optional(),
});

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Payment")) return forbidden();

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos");

  const data: any = { ...parsed.data };
  if (parsed.data.status === "PAID") data.paidAt = new Date();

  const payment = await prisma.payment.updateMany({
    where: { id: params!.id, clinicId },
    data,
  });

  return ok(payment);
});
