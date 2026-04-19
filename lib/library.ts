import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const DATA_DIR = path.join(process.cwd(), "data");

export const ProfileSchema = z.object({
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  linkedin: z.object({ url: z.string(), label: z.string() }),
  github: z.object({ url: z.string(), label: z.string() }),
  education: z.array(
    z.object({
      school: z.string(),
      location: z.string(),
      degree: z.string(),
      dates: z.string(),
    }),
  ),
  experience: z.array(
    z.object({
      title: z.string(),
      dates: z.string(),
      company: z.string(),
      location: z.string(),
      bullets: z.array(z.string()),
    }),
  ),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  stack: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  bullets: z.array(z.string()),
});

export const SkillsSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      items: z.array(z.string()),
    }),
  ),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Skills = z.infer<typeof SkillsSchema>;

function readJson<T>(file: string, schema: z.ZodType<T>): T {
  const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf8");
  return schema.parse(JSON.parse(raw));
}

function writeJson(file: string, data: unknown): void {
  fs.writeFileSync(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2) + "\n",
    "utf8",
  );
}

export function loadProfile(): Profile {
  return readJson("profile.json", ProfileSchema);
}
export function saveProfile(p: Profile): void {
  writeJson("profile.json", p);
}

export function loadProjects(): Project[] {
  return readJson("projects.json", z.array(ProjectSchema));
}
export function saveProjects(p: Project[]): void {
  writeJson("projects.json", p);
}

export function loadSkills(): Skills {
  return readJson("skills.json", SkillsSchema);
}
export function saveSkills(s: Skills): void {
  writeJson("skills.json", s);
}
