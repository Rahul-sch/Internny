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

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
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

/**
 * Consume an NDJSON stream, invoking `onLine` for each parsed object.
 * Throws if the response isn't OK at the HTTP level.
 */
export async function streamNdjson(
  path: string,
  body: unknown,
  onLine: (obj: unknown) => void,
): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    credentials: "same-origin",
  });
  if (!res.ok || !res.body) {
    const fallback = await res.text().catch(() => "");
    throw new ApiError(
      "STREAM",
      `Stream failed (${res.status}): ${fallback.slice(0, 200)}`,
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onLine(JSON.parse(line));
      } catch {
        /* ignore malformed chunks */
      }
    }
  }
  if (buf.trim()) {
    try {
      onLine(JSON.parse(buf.trim()));
    } catch {
      /* ignore trailing partial */
    }
  }
}
