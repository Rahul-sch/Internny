/**
 * Centralized, validated access to server-side env vars.
 * Any missing variable throws at module load so we fail fast in dev.
 */
import { z } from "zod";

const schema = z.object({
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  TECTONIC_BIN: z.string().optional(),
});

let cached: z.infer<typeof schema> | null = null;

export function env() {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${msg}`);
  }
  cached = parsed.data;
  return cached;
}
