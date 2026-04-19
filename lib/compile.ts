import { execa } from "execa";
import fs from "node:fs";
import path from "node:path";
import { AppError } from "./errors";
import { env } from "./env";

const GENERATED_DIR = path.join(process.cwd(), "generated");

type CompileResult = {
  texPath: string;
  pdfPath: string;
};

export async function writeTex(jobId: string, tex: string): Promise<string> {
  const dir = path.join(GENERATED_DIR, jobId);
  fs.mkdirSync(dir, { recursive: true });
  const texPath = path.join(dir, "resume.tex");
  fs.writeFileSync(texPath, tex, "utf8");
  return texPath;
}

export async function compilePdf(texPath: string): Promise<CompileResult> {
  const bin = resolveTectonic();
  const outdir = path.dirname(texPath);
  try {
    await execa(bin, ["-o", outdir, "--keep-logs", "--chatter=minimal", texPath], {
      timeout: 120_000,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stderr = (err as { stderr?: string }).stderr ?? "";
    throw new AppError(
      "COMPILE_FAILED",
      `tectonic failed: ${msg}`,
      stderr.slice(0, 500),
      500,
    );
  }
  const pdfPath = texPath.replace(/\.tex$/, ".pdf");
  if (!fs.existsSync(pdfPath)) {
    throw new AppError("COMPILE_FAILED", "tectonic produced no PDF", undefined, 500);
  }
  return { texPath, pdfPath };
}

function resolveTectonic(): string {
  const overridden = env().TECTONIC_BIN;
  if (overridden && fs.existsSync(overridden)) return overridden;
  const candidates = [
    "/opt/homebrew/bin/tectonic",
    "/usr/local/bin/tectonic",
    "tectonic",
  ];
  for (const c of candidates) {
    if (c === "tectonic") return c; // last resort: hope it's on PATH
    if (fs.existsSync(c)) return c;
  }
  throw new AppError(
    "TECTONIC_MISSING",
    "tectonic binary not found",
    "Run `brew install tectonic` or set TECTONIC_BIN in .env.local",
    500,
  );
}
