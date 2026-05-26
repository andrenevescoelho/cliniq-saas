// modules/ai/services/ai-agent.service.ts
import { prisma } from "../../../lib/prisma";
import { Queues } from "../../../lib/queues";
import { AppointmentService } from "../../appointment/services/appointment.service";

// ── Tool definitions (provider-agnostic) ─────────────────────────────────────

const TOOLS_SPEC = [
  {
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
  {
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
  {
    name: "cancel_appointment",
    description: "Cancela o próximo agendamento do paciente",
    parameters: {
      type: "object",
      properties: {
        phone: { type: "string" },
        reason: { type: "string" },
      },
      required: ["phone"],
    },
  },
  {
    name: "get_next_appointment",
    description: "Retorna próximo agendamento do paciente",
    parameters: {
      type: "object",
      properties: { phone: { type: "string" } },
      required: ["phone"],
    },
  },
  {
    name: "get_clinic_info",
    description: "Retorna informações da clínica",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "transfer_to_human",
    description: "Transfere para atendente humano quando não souber responder",
    parameters: {
      type: "object",
      properties: { reason: { type: "string" } },
    },
  },
];

// ── Tool Executor ─────────────────────────────────────────────────────────────

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
      case "cancel_appointment":
        return this.cancelAppointment(args.phone as string, args.reason as string);
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
    if (!schedule) return { slots: [], message: "Nenhuma agenda disponível" };

    const svc = new AppointmentService();
    const slots = await svc.getAvailableSlots(
      this.clinicId,
      scheduleId ?? schedule.id,
      new Date(date)
    );

    return {
      scheduleId: scheduleId ?? schedule.id,
      date,
      slots: slots.slice(0, 8).map((s) => ({
        startAt: s.startAt.toISOString(),
        endAt: s.endAt.toISOString(),
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
      time: appointment.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      appointmentId: appointment.id,
    };
  }

  private async cancelAppointment(phone: string, reason?: string) {
    const patient = await prisma.patient.findFirst({
      where: { clinicId: this.clinicId, phone: { contains: phone.slice(-9) } },
    });
    if (!patient) return { success: false, message: "Paciente não encontrado" };

    const appointment = await prisma.appointment.findFirst({
      where: {
        clinicId: this.clinicId,
        patientId: patient.id,
        startAt: { gte: new Date() },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      orderBy: { startAt: "asc" },
    });

    if (!appointment) return { success: false, message: "Nenhum agendamento encontrado" };

    const svc = new AppointmentService();
    await svc.cancel(this.clinicId, appointment.id, reason);

    return {
      success: true,
      date: appointment.startAt.toLocaleDateString("pt-BR"),
      time: appointment.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
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
      time: appointment.startAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: appointment.status,
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
      data: { status: "WAITING_HUMAN", aiEnabled: false },
    });
    return { transferred: true, reason };
  }
}

// ── OpenAI Provider ───────────────────────────────────────────────────────────

async function runOpenAI(
  model: string,
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  executor: ClinicToolExecutor
): Promise<string | null> {
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const openaiTools = TOOLS_SPEC.map((t) => ({
    type: "function" as const,
    function: t,
  }));

  let messages: any[] = [
    { role: "system", content: systemPrompt },
    ...history,
  ];

  let response = await openai.chat.completions.create({
    model,
    messages,
    tools: openaiTools,
    tool_choice: "auto",
  });

  let iterations = 0;
  while (response.choices[0].finish_reason === "tool_calls" && iterations < 3) {
    const toolCalls = response.choices[0].message.tool_calls ?? [];
    messages.push(response.choices[0].message);

    for (const tc of toolCalls) {
      const args = JSON.parse(tc.function.arguments);
      const result = await executor.execute(tc.function.name, args);
      messages.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
    }

    response = await openai.chat.completions.create({ model, messages, tools: openaiTools });
    iterations++;
  }

  return response.choices[0].message.content;
}

// ── Gemini Provider ───────────────────────────────────────────────────────────

async function runGemini(
  model: string,
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[],
  executor: ClinicToolExecutor
): Promise<string | null> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  const geminiTools = [{
    functionDeclarations: TOOLS_SPEC.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }];

  const geminiModel = genAI.getGenerativeModel({
    model: model || "gemini-1.5-flash",
    systemInstruction: systemPrompt,
    tools: geminiTools as any,
  });

  const geminiHistory = history.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const chat = geminiModel.startChat({ history: geminiHistory });
  const lastMessage = history[history.length - 1]?.content ?? "";

  let result = await chat.sendMessage(lastMessage);

  let iterations = 0;
  while (iterations < 3) {
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const toolCalls = parts.filter((p: any) => p.functionCall);

    if (!toolCalls.length) break;

    const toolResponses = await Promise.all(
      toolCalls.map(async (p: any) => {
        console.log("[TOOL]", p.functionCall.name, JSON.stringify(p.functionCall.args ?? {}));
        console.log("[TOOL]", p.functionCall.name, JSON.stringify(p.functionCall.args ?? {}));
        const toolResult = await executor.execute(p.functionCall.name, p.functionCall.args ?? {});
        return {
          functionResponse: {
            name: p.functionCall.name,
            response: toolResult,
          },
        };
      })
    );

    result = await chat.sendMessage(toolResponses as any);
    iterations++;
  }

  const textPart = result.response.candidates?.[0]?.content?.parts?.find((p: any) => p.text);
  return textPart?.text ?? null;
}

// ── Main Service ──────────────────────────────────────────────────────────────

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

    const messages = history.map((m) => ({
      role: (m.direction === "INBOUND" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    }));

    const phone = job.remoteJid.replace("@s.whatsapp.net", "");
    const executor = new ClinicToolExecutor(job.clinicId, job.conversationId, phone);

    let replyText: string | null = null;

    try {
      if (aiConfig.provider === "gemini") {
        replyText = await runGemini(aiConfig.model, aiConfig.systemPrompt, messages, executor);
      } else {
        replyText = await runOpenAI(aiConfig.model, aiConfig.systemPrompt, messages, executor);
      }
    } catch (err: any) {
      console.error(`[AI] ${aiConfig.provider} error:`, err.message);
      return;
    }

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

    console.log(`[AI] ${aiConfig.provider} replied to ${phone}`);
  }
}
