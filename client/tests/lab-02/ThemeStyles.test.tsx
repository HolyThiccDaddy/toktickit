import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const styles = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("Zen Green theme styles", () => {
  it("defines the required palette tokens", () => {
    expect(styles).toContain("--zen-green: #006b3c");
    expect(styles).toContain("--zen-green-hover: #0b7a46");
    expect(styles).toContain("--zen-pale: #eaf6ef");
    expect(styles).toContain("--zen-body: #f5f7f6");
  });

  it("keeps the button, badge, and form state classes in the shared stylesheet", () => {
    expect(styles).toContain(".btn-zen");
    expect(styles).toContain(".btn-outline-zen");
    expect(styles).toContain(".status-badge");
    expect(styles).toContain(".priority-urgent");
    expect(styles).toContain(".required-marker");
  });
});
