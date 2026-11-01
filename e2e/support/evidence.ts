import { mkdirSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";

// Isolate a rework run's captures without overwriting earlier-lab evidence.
export function evidencePath(original: string) {
  const root = process.env.TOKTICKIT_E2E_SCREENSHOTS;
  if (!root) return original;
  const normalized = original.replaceAll("\\", "/");
  const marker = normalized.lastIndexOf("artifacts/");
  if (marker < 0) throw new Error("Screenshot evidence must be inside artifacts/.");
  const relative = normalized.slice(marker + "artifacts/".length);
  if (relative.split("/").includes("..")) throw new Error("Invalid evidence path.");
  const target = resolve(root, relative);
  const directory = /[\\/]$/.test(original);
  mkdirSync(directory ? target : dirname(target), { recursive: true });
  return directory ? `${target}${sep}` : target;
}
