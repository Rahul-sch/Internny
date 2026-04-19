#!/usr/bin/env node
// Render a tailored resume from a synthetic tailored-JSON to verify the LaTeX
// render path end-to-end without calling Claude. Writes /tmp/smoke-resume.tex.
import { loadProfile, loadProjects, loadSkills } from "../lib/library.ts";
import { renderLatex } from "../lib/render.ts";

const profile = loadProfile();
const projects = loadProjects();
const skills = loadSkills();

const tailored = {
  summary:
    "CS senior @ VT shipping distributed systems + real-time ML at Ithena and founding MedRa Robotics",
  project_ids: ["repowhisper", "nexus", "vibeguard", "supercoder", "vettriage"],
  project_bullet_rewrites: Object.fromEntries(
    ["repowhisper", "nexus", "vibeguard", "supercoder", "vettriage"].map((id) => [
      id,
      projects.find((p) => p.id === id).bullets.slice(0, 2),
    ]),
  ),
  skill_order: ["ai_ml", "frameworks", "languages", "infrastructure"],
  skill_emphasis: Object.fromEntries(
    skills.categories.map((c) => [c.id, c.items]),
  ),
  rationale: "synthetic test",
};

const tex = renderLatex({ profile, projects, skills, tailored });
const out = "/tmp/smoke-resume.tex";
(await import("node:fs")).writeFileSync(out, tex, "utf8");
console.log(`wrote ${out} (${tex.length} bytes)`);
