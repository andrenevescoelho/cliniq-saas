// modules/appointment/services/appointment.service.ts
import { prisma } from "../../../lib/prisma";
import { Queues } from "../../../lib/queues";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import type { AppointmentStatus } from "@prisma/client";

export interface CreateAppointmentDto {
  patientId: string;
  scheduleId: string;
  doctorId?: string;
  startAt: Date;
  endAt: Date;
  title?: string;
  notes?: string;
}

export class AppointmentService {
  async list(
    clinicId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      scheduleId?: string;
      doctorId?: string;
      status?: AppointmentStatus;
      patientId?: string;
    }
  ) {
    return prisma.appointment.findMany({
      where: {
        clinicId,
        ...(filters.startDate && { startAt: { gte: filters.startDate } }),
        ...(filters.endDate && { startAt: { lte: filters.endDate } }),
        ...(filters.scheduleId && { scheduleId: filters.scheduleId }),
        ...(filters.doctorId && { doctorId: filters.doctorId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.patientId && { patientId: filters.patientId }),
      },
      include: {
        patient: { select: { id: true, name: true, phone: true } },
        doctor: { include: { user: { select: { name: true } } } },
        schedule: { select: { name: true, slotMinutes: true } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  async create(clinicId: string, dto: CreateAppointmentDto) {
    const conflict = await prisma.appointment.findFirst({
      where: {
        clinicId,
        scheduleId: dto.scheduleId,
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
        startAt: { lt: dto.endAt },
        endAt: { gt: dto.startAt },
      },
    });

    if (conflict) {
      throw new ValidationError("Horário indisponível. Conflito com outro agendamento.");
    }

    const appointment = await prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        scheduleId: dto.scheduleId,
        doctorId: dto.doctorId,
        startAt: dto.startAt,
        endAt: dto.endAt,
        title: dto.title,
        notes: dto.notes,
      },
      include: {
        patient: true,
        doctor: { include: { user: true } },
      },
    });

    const now = new Date();
    const reminder24h = new Date(dto.startAt.getTime() - 24 * 60 * 60 * 1000);
    const reminder1h = new Date(dto.startAt.getTime() - 60 * 60 * 1000);

    if (reminder24h > now) {
      await Queues.APPOINTMENT_REMINDERS.add(
        `reminder.24h.${appointment.id}`,
        { clinicId, appointmentId: appointment.id, patientId: dto.patientId, reminderType: "24h" },
        { delay: reminder24h.getTime() - now.getTime(), jobId: `reminder-24h-${appointment.id}` }
      );
    }

    if (reminder1h > now) {
      await Queues.APPOINTMENT_REMINDERS.add(
        `reminder.1h.${appointment.id}`,
        { clinicId, appointmentId: appointment.id, patientId: dto.patientId, reminderType: "1h" },
        { delay: reminder1h.getTime() - now.getTime(), jobId: `reminder-1h-${appointment.id}` }
      );
    }

    await Queues.AUDIT_EVENTS.add("appointment.created", {
      clinicId,
      action: "CREATE",
      subject: "Appointment",
      subjectId: appointment.id,
      after: appointment,
    });

    return appointment;
  }

  async confirm(clinicId: string, id: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId, status: "SCHEDULED" },
    });
    if (!appointment) throw new NotFoundError("Agendamento");

    return prisma.appointment.update({
      where: { id },
      data: { status: "CONFIRMED", confirmedAt: new Date() },
    });
  }

  async cancel(clinicId: string, id: string, reason?: string) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
      include: { patient: true },
    });
    if (!appointment) throw new NotFoundError("Agendamento");

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: "CANCELLED", cancelReason: reason },
    });

    await Promise.allSettled([
      Queues.APPOINTMENT_REMINDERS.remove(`reminder-24h-${id}`),
      Queues.APPOINTMENT_REMINDERS.remove(`reminder-1h-${id}`),
    ]);

    await Queues.WHATSAPP_OUTBOUND.add(`cancel.notify.${id}`, {
      clinicId,
      to: appointment.patient.phone,
      message: `Olá ${appointment.patient.name}! Seu agendamento de ${appointment.startAt.toLocaleDateString("pt-BR")} foi cancelado.${reason ? ` Motivo: ${reason}.` : ""} Entre em contato para reagendar.`,
    });

    return updated;
  }

  async reschedule(clinicId: string, id: string, dto: { startAt: Date; endAt: Date }) {
    const appointment = await prisma.appointment.findFirst({
      where: { id, clinicId, status: { notIn: ["CANCELLED", "COMPLETED"] } },
    });
    if (!appointment) throw new NotFoundError("Agendamento");

    await prisma.appointment.update({ where: { id }, data: { status: "RESCHEDULED" } });

    return this.create(clinicId, {
      patientId: appointment.patientId,
      scheduleId: appointment.scheduleId,
      doctorId: appointment.doctorId ?? undefined,
      startAt: dto.startAt,
      endAt: dto.endAt,
      notes: appointment.notes ?? undefined,
    });
  }

  async getAvailableSlots(clinicId: string, scheduleId: string, date: Date) {
    const schedule = await prisma.schedule.findFirst({
      where: { id: scheduleId, clinicId },
    });
    if (!schedule) throw new NotFoundError("Agenda");

    const dayName = date
      .toLocaleDateString("en-US", { weekday: "short" })
      .toLowerCase();
    const workingHours = schedule.workingHours as Record<
      string,
      { start: string; end: string }[]
    >;
    const dayHours = workingHours[dayName];
    if (!dayHours?.length) return [];

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.appointment.findMany({
      where: {
        clinicId,
        scheduleId,
        startAt: { gte: dayStart, lte: dayEnd },
        status: { notIn: ["CANCELLED", "RESCHEDULED"] },
      },
      select: { startAt: true, endAt: true },
    });

    const slots: { startAt: Date; endAt: Date }[] = [];
    const slotMs = schedule.slotMinutes * 60 * 1000;

    for (const period of dayHours) {
      const [sh, sm] = period.start.split(":").map(Number);
      const [eh, em] = period.end.split(":").map(Number);
      let current = new Date(date);
      current.setHours(sh, sm, 0, 0);
      const end = new Date(date);
      end.setHours(eh, em, 0, 0);

      while (current.getTime() + slotMs <= end.getTime()) {
        const slotEnd = new Date(current.getTime() + slotMs);
        const busy = existing.some((e) => e.startAt < slotEnd && e.endAt > current);
        if (!busy) slots.push({ startAt: new Date(current), endAt: slotEnd });
        current = slotEnd;
      }
    }

    return slots;
  }
}
