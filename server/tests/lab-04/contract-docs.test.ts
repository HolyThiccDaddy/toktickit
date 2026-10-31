import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const contractRoot = resolve(process.cwd(), "../docs/lab-04");

describe("Lab 4 contract documents", () => {
  it("keeps all four contracts present and cross-linked", async () => {
    const names = ["specification.md", "api-spec.md", "ui-spec.md", "tests.md"];
    const documents = await Promise.all(names.map(async (name) => [name, await readFile(resolve(contractRoot, name), "utf8")] as const));
    const text = new Map(documents);
    expect(text.get("specification.md")).toContain("## 10. Acceptance criteria");
    expect(text.get("api-spec.md")).toContain("Action Taken resources");
    expect(text.get("ui-spec.md")).toContain("## 8. Evidence checklist");
    expect(text.get("tests.md")).toContain("## 5. Release evidence checklist");
    expect([...text.values()].every((content) => content.includes("Lab 4"))).toBe(true);
  });
});
