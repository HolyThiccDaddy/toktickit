import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom has no viewport media-query implementation. Individual mobile tests
// override this desktop default; production uses the browser's native API.
if (!window.matchMedia) Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn((media: string) => ({ media, matches: false, onchange: null, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })),
});
