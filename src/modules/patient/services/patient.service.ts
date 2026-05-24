// modules/patient/services/patient.service.ts
import { prisma } from "../../../lib/prisma";
import { Queues } from "../../../lib/queues";
import { NotFoundError } from "../../../lib/errors";
import type { Prisma } from "@prisma/client";

export interface PatientFilters {
  search?: string;
  isActive?: boolean;
  tags?: string[];
  page?: number;
  limit?: number;
}

export class PatientService {
  async list(clinicId: string, filters: PatientFilters = {}) {
    const { search, isActive = true, tags, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {
      clinicId,
      isActive,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
          { document: { contains: search } },
        ],
      }),
      ...(tags?.length && { tags: { some: { name: { in: tags } } } }),
    };

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: { tags: true, _count: { select: { appointments: true } } },
      }),
      prisma.patient.count({ where }),
    ]);

    return { patients, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getById(clinicId: string, id: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, clinicId },
      include: {
        tags: true,
        appointments: {
          orderBy: { startAt: "desc" },
          take: 10,
          include: { doctor: { include: { user: true } } },
        },
        payments: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    });
    if (!patient) throw new NotFoundError("Paciente");
    return patient;
  }

  async findByPhone(clinicId: string, phone: string) {
    return prisma.patient.findFirst({ where: { clinicId, phone } });
  }

  async create(clinicId: string, data: Omit<Prisma.PatientCreateInput, "clinic">) {
    const patient = await prisma.patient.create({
      data: { ...data, clinic: { connect: { id: clinicId } } },
    });

    await Queues.AUDIT_EVENTS.add("patient.created", {
      clinicId,
      action: "CREATE",
      subject: "Patient",
      subjectId: patient.id,
      after: patient,
    });

    return patient;
  }

  async update(clinicId: string, id: string, data: Prisma.PatientUpdateInput) {
    const before = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!before) throw new NotFoundError("Paciente");

    const patient = await prisma.patient.update({ where: { id }, data });

    await Queues.AUDIT_EVENTS.add("patient.updated", {
      clinicId,
      action: "UPDATE",
      subject: "Patient",
      subjectId: id,
      before: before as any,
      after: patient as any,
    });

    return patient;
  }

  async delete(clinicId: string, id: string) {
    const patient = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!patient) throw new NotFoundError("Paciente");
    return prisma.patient.update({ where: { id }, data: { isActive: false } });
  }

  async triggerRetentionCampaign(clinicId: string, inactiveDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - inactiveDays);

    const inactive = await prisma.patient.findMany({
      where: {
        clinicId,
        isActive: true,
        OR: [{ lastVisit: { lt: cutoff } }, { lastVisit: null }],
      },
      take: 100,
    });

    for (const patient of inactive) {
      await Queues.PATIENT_RETENTION.add(
        `retention.${patient.id}`,
        { clinicId, patientId: patient.id },
        { delay: Math.random() * 3_600_000 }
      );
    }

    return { queued: inactive.length };
  }
}
