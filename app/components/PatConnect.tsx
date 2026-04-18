/**
 * PAT entry form. After successful /connect, wipes the local PAT copy
 * (server session is now the source of truth) and advances the wizard.
 */
"use client";

import { useState } from "react";
import Image from "next/image";
import { apiPost, ApiError } from "@/lib/api";
import { useStore } from "@/lib/store";

type ConnectResponse = {
  login: string;
  avatarUrl: string;
  name: string;
  publicRepoCount: number;
  totalPrivateRepos?: number;
};

export function PatConnect() {
  const { user, setUser, setStep, resetAll } = useStore();
  const [pat, setPat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiPost<ConnectResponse>("/api/github/connect", {
        pat: pat.trim(),
      });
      setUser(data);
      setPat(""); // wipe local copy — server session is now authoritative
      setStep("repos");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.hint
            ? `${err.message} — ${err.hint}`
            : err.message
          : "Unexpected error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/session/destroy", { method: "POST" });
    resetAll();
  }

  if (user) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <Image
            src={user.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="rounded-full"
            unoptimized
          />
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-neutral-500">
              @{user.login} · {user.publicRepoCount} public
              {user.totalPrivateRepos != null
                ? ` · ${user.totalPrivateRepos} private`
                : ""}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-sm text-red-600 hover:underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleConnect}
      className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div>
        <h2 className="text-lg font-semibold">1 · Connect GitHub</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Paste a{" "}
          <a
            className="underline"
            href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=InternShippy"
            target="_blank"
            rel="noreferrer"
          >
            Personal Access Token
          </a>{" "}
          with <code>repo</code> + <code>read:user</code>. It&apos;s stored
          encrypted and expires in 2h.
        </p>
      </div>
      <input
        type="password"
        required
        autoComplete="off"
        placeholder="ghp_… or github_pat_…"
        value={pat}
        onChange={(e) => setPat(e.target.value)}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950"
      />
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || pat.trim().length < 20}
        className="w-full rounded-md bg-neutral-900 px-4 py-2 font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {loading ? "Validating…" : "Connect"}
      </button>
    </form>
  );
}
