import { execFile as execFileCallback, spawn } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const statePath = resolve(tmpdir(), "toktickit-e2e-processes.json");
const backendUrl = "http://127.0.0.1:3002";
const frontendUrl = "http://127.0.0.1:5173";
const execFile = promisify(execFileCallback);

function start(command, args, cwd, env) {
  return spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "ignore",
    windowsHide: true,
  });
}

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`E2E service exited before becoming ready: ${url}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The service is still starting.
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Timed out waiting for E2E service: ${url}`);
}

export default async function globalSetup() {
  if (process.platform === "win32") {
    await execFile(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm --prefix server run build"], { cwd: repoRoot, windowsHide: true });
  } else {
    await execFile("npm", ["--prefix", "server", "run", "build"], { cwd: repoRoot, windowsHide: true });
  }
  await access(resolve(repoRoot, "server/dist/src/index.js"));
  await execFile("node", ["e2e/support/reset-test-db.mjs"], { cwd: repoRoot, windowsHide: true });
  const backend = start("node", ["dist/src/index.js"], resolve(repoRoot, "server"), {
    DOTENV_CONFIG_PATH: ".env.test",
    PORT: "3002",
    TOKTICKIT_UPLOAD_ROOT: "./tmp/e2e-uploads",
  });
  const frontend = start("node", ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1"], resolve(repoRoot, "client"), {
    VITE_API_URL: backendUrl,
  });
  backend.unref();
  frontend.unref();
  await writeFile(statePath, JSON.stringify({ pids: [backend.pid, frontend.pid] }), "utf8");
  await waitFor(`${backendUrl}/api/health`, backend);
  await waitFor(frontendUrl, frontend);
}
