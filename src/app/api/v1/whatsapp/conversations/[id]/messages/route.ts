import { withAuth, ok, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("read", "Conversation")) return forbidden();

  const conversation = await prisma.conversation.findFirst({
    where: { id: params!.id, clinicId },
  });
  if (!conversation) return forbidden();

  const messages = await prisma.message.findMany({
    where: { conversationId: params!.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return ok(messages);
});
