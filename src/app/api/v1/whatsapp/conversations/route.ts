import { withAuth, ok, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, { clinicId, ability }) => {
  if (!ability.can("read", "Conversation")) return forbidden();

  const conversations = await prisma.conversation.findMany({
    where: { clinicId },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    include: {
      patient: { select: { id: true, name: true, phone: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  return ok(conversations);
});
