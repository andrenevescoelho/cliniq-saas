import { withAuth, ok, forbidden, badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  aiEnabled: z.boolean().optional(),
  status: z.enum(["OPEN", "BOT", "WAITING_HUMAN", "HUMAN", "CLOSED"]).optional(),
});

export const PATCH = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("update", "Conversation")) return forbidden();

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos");

  const conversation = await prisma.conversation.updateMany({
    where: { id: params!.id, clinicId },
    data: parsed.data,
  });

  return ok(conversation);
});
