import { withAuth, ok, created, badRequest, forbidden } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  description: z.string().min(1),
  amount: z.number().positive(),
  method: z.enum(["PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH", "INSURANCE", "LINK"]).default("PIX"),
  dueDate: z.string().optional().transform((v) => v ? new Date(v) : undefined),
  patientId: z.string().optional(),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export const GET = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("read", "Payment")) return forbidden();

  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page")) || 1;
  const limit = Number(searchParams.get("limit")) || 20;
  const status = searchParams.get("status") as any ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  const where: any = {
    clinicId,
    ...(status && { status }),
    ...(search && {
      OR: [
        { description: { contains: search, mode: "insensitive" } },
        { patient: { name: { contains: search, mode: "insensitive" } } },
      ],
    }),
  };

  const [payments, total, paid, pending, overdue] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { patient: { select: { id: true, name: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where: { clinicId, status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId, status: "PENDING" }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { clinicId, status: "OVERDUE" }, _sum: { amount: true } }),
  ]);

  return ok({
    payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })),
    total,
    page,
    pages: Math.ceil(total / limit),
    summary: {
      totalPaid: Number(paid._sum.amount ?? 0),
      totalPending: Number(pending._sum.amount ?? 0),
      totalOverdue: Number(overdue._sum.amount ?? 0),
    },
  });
});

export const POST = withAuth(async (req, { clinicId, ability }) => {
  if (!ability.can("create", "Payment")) return forbidden();

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest("Dados inválidos", parsed.error.flatten());

  const payment = await prisma.payment.create({
    data: { clinicId, ...parsed.data },
    include: { patient: { select: { id: true, name: true } } },
  });

  return created({ ...payment, amount: Number(payment.amount) });
});
