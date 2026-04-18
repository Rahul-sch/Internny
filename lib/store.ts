/**
 * Client-side Zustand store. Memory-only, no persistence to localStorage.
 *
 * The PAT lives here transiently for the "connect" step only; once posted
 * to /api/github/connect the client-held copy is wiped and the server-side
 * Redis entry becomes the source of truth.
 */
"use client";

import { create } from "zustand";
import type { RepoDigest, RepoMeta } from "./github/types";

export type WizardStep =
  | "connect"
  | "repos"
  | "jd"
  | "template"
  | "review";

type ConnectedUser = {
  login: string;
  avatarUrl: string;
  name: string;
  publicRepoCount: number;
  totalPrivateRepos?: number;
};

type State = {
  step: WizardStep;
  user: ConnectedUser | null;
  repos: RepoMeta[];
  digests: Record<string, RepoDigest>;
  summaryProgress: { completed: number; total: number } | null;
  summaryErrors: Array<{ fullName: string; message: string }>;
  jdRaw: string;
  templateRaw: string;

  setStep: (s: WizardStep) => void;
  setUser: (u: ConnectedUser | null) => void;
  setRepos: (r: RepoMeta[]) => void;
  addDigest: (d: RepoDigest) => void;
  setSummaryProgress: (p: { completed: number; total: number } | null) => void;
  addSummaryError: (e: { fullName: string; message: string }) => void;
  setJd: (s: string) => void;
  setTemplate: (s: string) => void;
  resetAll: () => void;
};

const initial = {
  step: "connect" as WizardStep,
  user: null,
  repos: [] as RepoMeta[],
  digests: {} as Record<string, RepoDigest>,
  summaryProgress: null as State["summaryProgress"],
  summaryErrors: [] as State["summaryErrors"],
  jdRaw: "",
  templateRaw: "",
};

export const useStore = create<State>((set) => ({
  ...initial,
  setStep: (step) => set({ step }),
  setUser: (user) => set({ user }),
  setRepos: (repos) => set({ repos }),
  addDigest: (d) =>
    set((s) => ({ digests: { ...s.digests, [d.fullName]: d } })),
  setSummaryProgress: (p) => set({ summaryProgress: p }),
  addSummaryError: (e) =>
    set((s) => ({ summaryErrors: [...s.summaryErrors, e] })),
  setJd: (jdRaw) => set({ jdRaw }),
  setTemplate: (templateRaw) => set({ templateRaw }),
  resetAll: () => set({ ...initial }),
}));
