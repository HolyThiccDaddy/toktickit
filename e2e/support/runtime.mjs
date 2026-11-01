import { tmpdir } from "node:os";
import { resolve } from "node:path";

function localPort(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value < 1024 || value > 65535) throw new Error(`${name} must be a local application port.`);
  return value;
}

export const frontendPort = localPort("TOKTICKIT_E2E_FRONTEND_PORT", 5173);
export const backendPort = localPort("TOKTICKIT_E2E_BACKEND_PORT", 3002);
export const frontendUrl = `http://127.0.0.1:${frontendPort}`;
export const backendUrl = `http://127.0.0.1:${backendPort}`;
export const statePath = resolve(tmpdir(), `toktickit-e2e-${frontendPort}-${backendPort}-processes.json`);
