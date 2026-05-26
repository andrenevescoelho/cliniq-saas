import { withAuth, ok, forbidden, notFound } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { EvolutionApiProvider } from "@/modules/whatsapp/providers/evolution.provider";

const evolution = new EvolutionApiProvider();

export const GET = withAuth(async (_req, { clinicId, ability }, params) => {
  if (!ability.can("read", "WhatsappInstance")) return forbidden();

  const instance = await prisma.whatsappInstance.findFirst({
    where: { id: params!.id, clinicId },
  });
  if (!instance) return notFound("Instância não encontrada");

  const status = await evolution.getStatus(instance.instanceKey);

  // Sync isActive with real connection state
  const isConnected = status?.instance?.state === "open";
  if (isConnected !== instance.isActive) {
    await prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { isActive: isConnected },
    });
  }

  return ok({ ...status, instanceId: instance.id, isActive: isConnected });
});
