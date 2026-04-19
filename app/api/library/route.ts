/**
 * GET   /api/library — returns { profile, projects, skills }
 * PATCH /api/library — updates any subset { profile?, projects?, skills? }
 */
import { z } from "zod";
import { fail, ok, withErrorEnvelope } from "@/lib/errors";
import {
  ProfileSchema,
  ProjectSchema,
  SkillsSchema,
  loadProfile,
  loadProjects,
  loadSkills,
  saveProfile,
  saveProjects,
  saveSkills,
} from "@/lib/library";

export const runtime = "nodejs";

export async function GET() {
  return withErrorEnvelope(async () =>
    ok({
      profile: loadProfile(),
      projects: loadProjects(),
      skills: loadSkills(),
    }),
  );
}

const PatchBody = z
  .object({
    profile: ProfileSchema.optional(),
    projects: z.array(ProjectSchema).optional(),
    skills: SkillsSchema.optional(),
  })
  .refine((v) => v.profile || v.projects || v.skills, {
    message: "Provide at least one of profile, projects, skills",
  });

export async function PATCH(req: Request) {
  return withErrorEnvelope(async () => {
    const raw = await req.json().catch(() => null);
    const parsed = PatchBody.safeParse(raw);
    if (!parsed.success) return fail("VALIDATION", parsed.error.issues[0].message, 400);
    if (parsed.data.profile) saveProfile(parsed.data.profile);
    if (parsed.data.projects) saveProjects(parsed.data.projects);
    if (parsed.data.skills) saveSkills(parsed.data.skills);
    return ok({ saved: true });
  });
}
