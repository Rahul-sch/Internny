/** Client-side API helpers with typed envelope handling. */
"use client";

import type { ApiEnvelope } from "./errors";

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public hint?: string,
    public status?: number,
  ) {
    super(message);
  }
}

async function parseEnvelope<T>(res: Response): Promise<T> {
  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiError("NETWORK", `Non-JSON response (${res.status})`);
  }
  if (!body.ok) {
    throw new ApiError(
      body.error.code,
      body.error.message,
      body.error.hint,
      res.status,
    );
  }
  return body.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
  return parseEnvelope<T>(res);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
  return parseEnvelope<T>(res);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: "same-origin" });
  return parseEnvelope<T>(res);
}
