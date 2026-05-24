// app/api/webhooks/whatsapp/route.ts
// Receives incoming messages from Evolution API

import { NextResponse } from "next/server";
import { WhatsappService } from "@/modules/whatsapp/services/whatsapp.service";

const whatsappService = new WhatsappService();

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Evolution API sends different event types
    const { event, instance, data } = body;

    if (event === "messages.upsert") {
      const msg = data.messages?.[0];
      if (!msg || msg.key.fromMe) return NextResponse.json({ ok: true });

      await whatsappService.handleIncomingMessage({
        instanceKey: instance,
        remoteJid: msg.key.remoteJid,
        messageId: msg.key.id,
        content:
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          "",
        type: "text",
        timestamp: msg.messageTimestamp,
      });
    }

    if (event === "connection.update") {
      const { state, qr } = data;
      await import("@/lib/prisma").then(({ prisma }) =>
        prisma.whatsappInstance.updateMany({
          where: { instanceKey: instance },
          data: {
            status: state === "open" ? "CONNECTED" : "DISCONNECTED",
            qrCode: qr ?? null,
          },
        })
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WA Webhook]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
