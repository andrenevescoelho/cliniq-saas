// modules/whatsapp/services/whatsapp.service.ts
import { prisma } from "../../../lib/prisma";
import { Queues } from "../../../lib/queues";
import { NotFoundError } from "../../../lib/errors";
import { EvolutionApiProvider } from "../providers/evolution.provider";

export class WhatsappService {
  private evolution = new EvolutionApiProvider();

  async createInstance(clinicId: string, name: string) {
    const instanceKey = `cliniq_${clinicId}_${Date.now()}`;
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhooks/whatsapp`;

    const instance = await prisma.whatsappInstance.create({
      data: { clinicId, name, instanceKey, webhookUrl },
    });

    await this.evolution.createInstance(instanceKey, webhookUrl);
    return instance;
  }

  async getQrCode(clinicId: string, instanceId: string) {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { id: instanceId, clinicId },
    });
    if (!instance) throw new NotFoundError("Instância WhatsApp");
    return this.evolution.getQrCode(instance.instanceKey);
  }

  async sendMessage(clinicId: string, to: string, message: string, instanceId?: string) {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { clinicId, ...(instanceId ? { id: instanceId } : {}), isActive: true },
    });
    if (!instance) throw new NotFoundError("Instância WhatsApp ativa");

    await Queues.WHATSAPP_OUTBOUND.add(`msg.${Date.now()}`, {
      clinicId,
      instanceKey: instance.instanceKey,
      to,
      message,
    });
  }

  async handleIncomingMessage(payload: {
    instanceKey: string;
    remoteJid: string;
    messageId: string;
    content: string;
    type: string;
    timestamp: number;
  }) {
    const instance = await prisma.whatsappInstance.findFirst({
      where: { instanceKey: payload.instanceKey },
    });
    if (!instance) return;

    let conversation = await prisma.conversation.findFirst({
      where: { whatsappInstanceId: instance.id, remoteJid: payload.remoteJid },
    });

    if (!conversation) {
      const phone = payload.remoteJid
        .replace("@s.whatsapp.net", "")
        .replace(/\D/g, "");
      const patient = await prisma.patient.findFirst({
        where: {
          clinicId: instance.clinicId,
          phone: { contains: phone.slice(-9) },
        },
      });

      conversation = await prisma.conversation.create({
        data: {
          clinicId: instance.clinicId,
          whatsappInstanceId: instance.id,
          remoteJid: payload.remoteJid,
          patientId: patient?.id,
          status: "BOT",
        },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        externalId: payload.messageId,
        direction: "INBOUND",
        content: payload.content,
        type: payload.type,
        status: "DELIVERED",
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    if (conversation.status === "BOT" && conversation.aiEnabled) {
      await Queues.AI_CONVERSATIONS.add(`ai.${conversation.id}.${Date.now()}`, {
        clinicId: instance.clinicId,
        conversationId: conversation.id,
        messageId: payload.messageId,
        content: payload.content,
        remoteJid: payload.remoteJid,
      });
    }
  }
}
