import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const middlewarePath = path.join(__dirname, "../../src/middleware.ts");

/**
 * Статические проверки middleware (pen-test обзор).
 * `/api` не в matcher — авторизация в route handlers через getServerSession.
 */
describe("middleware (src/middleware.ts)", () => {
  it("исходник содержит защиту /projects и /sales", () => {
    const src = readFileSync(middlewarePath, "utf8");
    expect(src).toContain("/projects/:path*");
    expect(src).toContain("/sales/:path*");
  });

  it("matcher не объявляет защиту /api (авторизация в handlers)", () => {
    const src = readFileSync(middlewarePath, "utf8");
    expect(src).not.toContain('"/api');
  });
});
