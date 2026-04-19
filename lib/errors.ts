/**
 * Structured error envelope for all API routes.
 * Clients can switch on `error.code` to drive UX.
 */
import { NextResponse } from "next/server";

export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "DUPLICATE"
  | "LLM_TIMEOUT"
  | "LLM_SCHEMA_MISMATCH"
  | "TECTONIC_MISSING"
  | "COMPILE_FAILED"
  | "INTERNAL";

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public hint?: string,
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export type ApiEnvelope<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; hint?: string } };

export function ok<T>(data: T): NextResponse<ApiEnvelope<T>> {
  return NextResponse.json({ ok: true, data });
}

export function fail(
  code: ErrorCode,
  message: string,
  status = 400,
  hint?: string,
): NextResponse<ApiEnvelope<never>> {
  return NextResponse.json(
    { ok: false, error: { code, message, hint } },
    { status },
  );
}

/** Wrap a route handler to convert thrown errors into envelopes. */
export function withErrorEnvelope<T>(
  handler: () => Promise<NextResponse<ApiEnvelope<T>>>,
): Promise<NextResponse<ApiEnvelope<T>>> {
  return handler().catch((err: unknown) => {
    if (err instanceof AppError) {
      return fail(err.code, err.message, err.status, err.hint);
    }
    console.error("[api] unhandled error:", err);
    return fail(
      "INTERNAL",
      err instanceof Error ? err.message : "Unknown server error",
      500,
    );
  });
}
