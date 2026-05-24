// modules/ai/services/ai-agent.service.ts
import OpenAI from "openai";
import { prisma } from "../../../lib/prisma";
import { Queues } from "../../../lib/queues";
import { AppointmentService } from "../../appointment/services/appointment.service";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CLINIC_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "check_available_slots",
      description: "Verifica horários disponíveis na agenda",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data YYYY-MM-DD" },
          scheduleId: { type: "string" },
        },
        required: ["date"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Agenda uma consulta para o paciente",
      parameters: {
        type: "object",
        properties: {
          patientName: { type: "string" },
          patientPhone: { type: "string" },
          startAt: { type: "string" },
          endAt: { type: "string" },
          scheduleId: { type: "string" },
          notes: { type: "string" },
        },
        required: ["patientName", "patientPhone", "startAt", "endAt", "scheduleId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_next_appointment",
      description: "Retorna próximo agendamento do paciente",
      parameters: {
        type: "object",
        properties: { phone: { type: "string" } },
        required: ["phone"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_clinic_info",
      description: "Retorna informações da clínica",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfere para atendente humano",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
      },
    },
  },
];

class ClinicToolExecutor {
  constructor(
    private clinicId: string,
    private conversationId: string,
    private patientPhone: string
  ) {}

  async execute(name: string, args: Record<string, unknown>) {
    switch (name) {
      case "check_available_slots":
        return this.checkSlots(args.date as string, args.scheduleId as string);
      case "book_appointment":
        return this.bookAppointment(args);
      case "get_next_appointment":
        return this.getNextAppointment(args.phone as string);
      case "get_clinic_info":
        return this.getClinicInfo();
      case "transfer_to_human":
        return this.transferToHuman(args.reason as string);
      default:
        return { error: "Unknown tool" };
    }
  }

  private async checkSlots(date: string, scheduleId?: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { clinicId: this.clinicId, isActive: true },
    });
    if (!schedule) return { slots: [] };

    const svc = new AppointmentService();
    const slots = await svc.getAvailableSlots(
      this.clinicId,
      scheduleId ?? schedule.id,
      new Date(date)
    );

    return {
      scheduleId: scheduleId ?? schedule.id,
      slots: slots.slice(0, 8).map((s) => ({
        startAt: s.startAt.toISOString(),
        label: s.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      })),
    };
  }

  private async bookAppointment(args: Record<string, unknown>) {
    let patient = await prisma.patient.findFirst({
      where: { clinicId: this.clinicId, phone: args.patientPhone as string },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          clinicId: this.clinicId,
          name: args.patientName as string,
          phone: args.patientPhone as string,
        },
      });
    }

    const svc = new AppointmentService();
    const appointment = await svc.create(this.clinicId, {
      patientId: patient.id,
      scheduleId: args.scheduleId as string,
      startAt: new Date(args.startAt as string),
      endAt: new Date(args.endAt as string),
      notes: (args.notes as string) ?? "Agendado via WhatsApp",
    });

    return {
      success: true,
      date: appointment.startAt.toLocaleDateString("pt-BR"),
      time: appointment.startAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  private async getNextAppointment(phone: string) {
    const patient = await prisma.patient.findFirst({
      where: { clinicId: this.clinicId, phone: { contains: phone.slice(-9) } },
    });
    if (!patient) return { found: false };

    const appointment = await prisma.appointment.findFirst({
      where: {
        clinicId: this.clinicId,
        patientId: patient.id,
        startAt: { gte: new Date() },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      orderBy: { startAt: "asc" },
    });

    if (!appointment) return { found: false };

    return {
      found: true,
      date: appointment.startAt.toLocaleDateString("pt-BR"),
      time: appointment.startAt.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  }

  private async getClinicInfo() {
    return prisma.clinic.findUnique({
      where: { id: this.clinicId },
      select: { name: true, phone: true, address: true },
    });
  }

  private async transferToHuman(reason?: string) {
    await prisma.conversation.update({
      where: { id: this.conversationId },
      data: { status: "WAITING_HUMAN" },
    });

    await Queues.NOTIFICATIONS_EMAIL.add("human.transfer", {
      clinicId: this.clinicId,
      conversationId: this.conversationId,
      reason,
    });

    return { transferred: true };
  }
}

export class AiAgentService {
  async processMessage(job: {
    clinicId: string;
    conversationId: string;
    content: string;
    remoteJid: string;
  }) {
    const aiConfig = await prisma.aiConfig.findUnique({
      where: { clinicId: job.clinicId },
    });

    if (!aiConfig?.isEnabled) return;

    if (aiConfig.monthlyUsed >= aiConfig.monthlyLimit) {
      await prisma.conversation.update({
        where: { id: job.conversationId },
        data: { status: "WAITING_HUMAN" },
      });
      return;
    }

    const history = await prisma.message.findMany({
      where: { conversationId: job.conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: aiConfig.systemPrompt },
      ...history.map((m) => ({
        role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
    ];

    const phone = job.remoteJid.replace("@s.whatsapp.net", "");
    const executor = new ClinicToolExecutor(job.clinicId, job.conversationId, phone);

    let response = await openai.chat.completions.create({
      model: aiConfig.model,
      messages,
      tools: CLINIC_TOOLS,
      tool_choice: "auto",
    });

    let iterations = 0;
    while (response.choices[0].finish_reason === "tool_calls" && iterations < 3) {
      const toolCalls = response.choices[0].message.tool_calls ?? [];
      messages.push(response.choices[0].message);

      for (const tc of toolCalls) {
        const args = JSON.parse(tc.function.arguments);
        const result = await executor.execute(tc.function.name, args);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      response = await openai.chat.completions.create({
        model: aiConfig.model,
        messages,
        tools: CLINIC_TOOLS,
      });

      iterations++;
    }

    const replyText = response.choices[0].message.content;
    if (!replyText) return;

    await prisma.message.create({
      data: {
        conversationId: job.conversationId,
        direction: "OUTBOUND",
        content: replyText,
        isFromBot: true,
        status: "QUEUED",
      },
    });

    const instance = await prisma.whatsappInstance.findFirst({
      where: { clinicId: job.clinicId, isActive: true },
    });

    if (instance) {
      await Queues.WHATSAPP_OUTBOUND.add(`ai.reply.${Date.now()}`, {
        clinicId: job.clinicId,
        instanceKey: instance.instanceKey,
        to: job.remoteJid,
        message: replyText,
      });
    }

    await prisma.aiConfig.update({
      where: { clinicId: job.clinicId },
      data: { monthlyUsed: { increment: 1 } },
    });
  }
}
