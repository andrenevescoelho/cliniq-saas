import { withAuth, ok, forbidden, badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { Queues } from "@/lib/queues";
import { z } from "zod";

const schema = z.object({ message: z.string().min(1) });

export const POST = withAuth(async (req, { clinicId, ability }, params) => {
  if (!ability.can("create", "Message")) return forbidden();

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest("Mensagem inválida");

  const conversation = await prisma.conversation.findFirst({
    where: { id: params!.id, clinicId },
    include: { whatsappInstance: true },
  });
  if (!conversation) return forbidden();

  const msg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      direction: "OUTBOUND",
      content: parsed.data.message,
      type: "text",
      status: "QUEUED",
      isFromBot: false,
    },
  });

  await Queues.WHATSAPP_OUTBOUND.add(`manual.${msg.id}`, {
    clinicId,
    instanceKey: conversation.whatsappInstance.instanceKey,
    to: conversation.remoteJid,
    message: parsed.data.message,
    messageId: msg.id,
  });

  // If AI was active and human sends, switch to HUMAN mode
  if (conversation.status === "BOT" || conversation.status === "WAITING_HUMAN") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: "HUMAN", aiEnabled: false },
    });
  }

  return ok(msg);
});
