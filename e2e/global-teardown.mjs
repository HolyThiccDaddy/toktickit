import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { statePath } from "./support/runtime.mjs";

function killTree(pid) {
  return new Promise((resolveKill) => {
    if (!pid) return resolveKill();
    execFile("taskkill", ["/PID", String(pid), "/T", "/F"], { windowsHide: true }, () => resolveKill());
  });
}

export default async function globalTeardown() {
  try {
    let state;
    try {
      state = JSON.parse(await readFile(statePath, "utf8"));
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    await Promise.all((state.pids ?? []).map((pid) => killTree(pid)));
  } finally {
    await rm(statePath, { force: true });
  }
}
