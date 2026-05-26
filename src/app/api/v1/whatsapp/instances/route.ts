import { withAuth, ok, created, badRequest, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { EvolutionApiProvider } from "@/modules/whatsapp/providers/evolution.provider";
import { z } from "zod";

const evolution = new EvolutionApiProvider();

const createSchema = z.object({
  name: z.string().min(1),
});

export const GET = withAuth(async (_req, { clinicId, ability }) => {
  if (!ability.can("read", "WhatsappInstance")) return forbidden();

  const instances = await prisma.whatsappInstance.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
  });

  return ok(instances);
});

export const POST = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("create", "WhatsappInstance")) return forbidden();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const instanceKey = `cliniq_${clinicId.slice(0, 8)}_${Date.now()}`;
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp`;

  const instance = await prisma.whatsappInstance.create({
    data: {
      clinicId,
      name: parsed.data.name,
      instanceKey,
      webhookUrl,
      isActive: false,
    },
  });

  try {
    await evolution.createInstance(instanceKey, webhookUrl);
  } catch (e: any) {
    await prisma.whatsappInstance.delete({ where: { id: instance.id } });
    return badRequest(`Erro ao criar instância na Evolution API: ${e.message}`);
  }

  return created(instance);
});
