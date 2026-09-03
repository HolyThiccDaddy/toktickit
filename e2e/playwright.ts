import { createRequire } from "node:module";

// E2E specs intentionally live outside client/ so the Lab 2 contract can use testDir: "../e2e".
// Resolve Playwright from client/package.json rather than relying on a root node_modules folder.
const requireClient = createRequire(new URL("../client/package.json", import.meta.url));
const playwright = requireClient("@playwright/test") as {
  expect: typeof import("@playwright/test").expect;
  test: typeof import("@playwright/test").test;
};

export const expect = playwright.expect;
export const test = playwright.test;
