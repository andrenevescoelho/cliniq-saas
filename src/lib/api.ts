// lib/api.ts — Next.js API helpers (App Router only, NOT for workers)
import { NextResponse } from "next/server";
import { auth } from "./auth";
import { buildAbilityFor, type AppAbility } from "@/modules/auth/utils/ability";
import type { UserRole } from "@prisma/client";

// Re-export error classes so imports from @/lib/api still work
export { AppError, NotFoundError, ForbiddenError, ValidationError } from "./errors";

// ── Standard API Responses ───────────────────────────────

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(message: string, errors?: unknown) {
  return NextResponse.json({ success: false, message, errors }, { status: 400 });
}

export function unauthorized(message = "Não autorizado") {
  return NextResponse.json({ success: false, message }, { status: 401 });
}

export function forbidden(message = "Acesso negado") {
  return NextResponse.json({ success: false, message }, { status: 403 });
}

export function notFound(message = "Recurso não encontrado") {
  return NextResponse.json({ success: false, message }, { status: 404 });
}

export function serverError(message = "Erro interno do servidor") {
  return NextResponse.json({ success: false, message }, { status: 500 });
}

// ── Authenticated Route Wrapper ──────────────────────────

export interface RouteContext {
  clinicId: string;
  userId: string;
  role: UserRole;
  ability: AppAbility;
}

type RouteHandler = (
  req: Request,
  context: RouteContext,
  params?: Record<string, string>
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (
    req: Request,
    { params }: { params?: Record<string, string> } = {}
  ) => {
    try {
      const session = await auth();
      if (!session?.user?.id) return unauthorized();

      const { id: userId, clinicId, role } = session.user;
      if (!clinicId || !role) return forbidden();

      const ability = buildAbilityFor(role);
      return await handler(req, { clinicId, userId, role, ability }, params);
    } catch (error: any) {
      // Map AppError subclasses to correct HTTP responses
      if (error?.statusCode === 404) return notFound(error.message);
      if (error?.statusCode === 403) return forbidden(error.message);
      if (error?.statusCode === 422) return badRequest(error.message);
      console.error("[withAuth]", error);
      return serverError();
    }
  };
}
