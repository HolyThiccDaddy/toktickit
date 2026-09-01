import { describe, expect, it } from "vitest";
import { validateAttachment } from "../../src/tickets.js";

describe("validateAttachment", () => {
  it("accepts matching JPG, PNG, WEBP, and PDF files within 5 MB", () => {
    expect(validateAttachment({ originalname: "photo.jpg", mimetype: "image/jpeg", buffer: Buffer.from([0xff, 0xd8, 0xff]), size: 3 })).toBe(true);
    expect(validateAttachment({ originalname: "image.png", mimetype: "image/png", buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), size: 8 })).toBe(true);
    expect(validateAttachment({ originalname: "image.webp", mimetype: "image/webp", buffer: Buffer.from("RIFF0000WEBP"), size: 12 })).toBe(true);
    expect(validateAttachment({ originalname: "evidence.pdf", mimetype: "application/pdf", buffer: Buffer.from("%PDF-1.4") })).toBe(true);
  });
  it("rejects oversized files and extension, MIME, or content mismatches", () => {
    expect(validateAttachment({ originalname: "large.pdf", mimetype: "application/pdf", buffer: Buffer.from("%PDF-1.4"), size: 5_242_881 })).toBe(false);
    expect(validateAttachment({ originalname: "fake.png", mimetype: "image/png", buffer: Buffer.from("not png") })).toBe(false);
    expect(validateAttachment({ originalname: "evidence.exe", mimetype: "application/pdf", buffer: Buffer.from("%PDF-1.4") })).toBe(false);
    expect(validateAttachment({ originalname: "evidence.pdf", mimetype: "image/png", buffer: Buffer.from("%PDF-1.4") })).toBe(false);
  });
});
