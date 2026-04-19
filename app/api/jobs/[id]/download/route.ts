/**
 * GET /api/jobs/[id]/download?format=tex|pdf
 */
import fs from "node:fs";
import path from "node:path";
import { db, type JobRow } from "@/lib/db";
import { AppError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const format = new URL(req.url).searchParams.get("format") ?? "pdf";
  if (format !== "tex" && format !== "pdf") {
    return Response.json(
      { ok: false, error: { code: "VALIDATION", message: "format must be tex or pdf" } },
      { status: 400 },
    );
  }

  const job = db().prepare(`SELECT * FROM jobs WHERE id = ?`).get(id) as
    | JobRow
    | undefined;
  if (!job) {
    return Response.json(
      { ok: false, error: { code: "NOT_FOUND", message: "Job not found" } },
      { status: 404 },
    );
  }

  const filePath = format === "tex" ? job.tex_path : job.pdf_path;
  if (!filePath || !fs.existsSync(filePath)) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: `No ${format} file yet — click Generate first.`,
        },
      },
      { status: 404 },
    );
  }

  const data = fs.readFileSync(filePath);
  const slug = `${job.company}-${job.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `rahul-bainsla-${slug || job.id}.${format}`;
  return new Response(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type":
        format === "pdf" ? "application/pdf" : "application/x-tex; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
