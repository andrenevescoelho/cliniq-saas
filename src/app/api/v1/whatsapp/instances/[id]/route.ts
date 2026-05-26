import { withAuth, ok, noContent, forbidden, notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { EvolutionApiProvider } from "@/modules/whatsapp/providers/evolution.provider";

const evolution = new EvolutionApiProvider();

export const DELETE = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("delete", "WhatsappInstance")) return forbidden();

  const instance = await prisma.whatsappInstance.findFirst({
    where: { id: params!.id, clinicId },
  });
  if (!instance) return notFound("Instância não encontrada");

  try { await evolution.deleteInstance(instance.instanceKey); } catch {}

  await prisma.whatsappInstance.delete({ where: { id: instance.id } });

  return noContent();
});
