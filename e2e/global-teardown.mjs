import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const statePath = resolve(tmpdir(), "toktickit-e2e-processes.json");

function killTree(pid) {
  return new Promise((resolveKill) => {
    if (!pid) return resolveKill();
    execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => resolveKill());
  });
}

export default async function globalTeardown() {
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    await Promise.all((state.pids ?? []).map((pid) => killTree(pid)));
  } finally {
    await rm(statePath, { force: true });
  }
}
