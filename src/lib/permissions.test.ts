import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canAccessSection, sectionsForRole } from "./permissions";

describe("canAccessSection (роли и разделы)", () => {
  it("ADMIN — доступ ко всем основным разделам", () => {
    expect(canAccessSection(Role.ADMIN, "finance")).toBe(true);
    expect(canAccessSection(Role.ADMIN, "projects")).toBe(true);
    expect(canAccessSection(Role.ADMIN, "accounting")).toBe(true);
  });

  it("VIEWER — нет finance и accounting", () => {
    expect(canAccessSection(Role.VIEWER, "finance")).toBe(false);
    expect(canAccessSection(Role.VIEWER, "accounting")).toBe(false);
    expect(canAccessSection(Role.VIEWER, "projects")).toBe(true);
    expect(canAccessSection(Role.VIEWER, "sales")).toBe(true);
  });

  it("MANAGER — полный доступ как у ADMIN по разделам", () => {
    expect(canAccessSection(Role.MANAGER, "finance")).toBe(true);
  });
});

describe("sectionsForRole", () => {
  it("VIEWER — ограниченный список", () => {
    const s = sectionsForRole(Role.VIEWER);
    expect(s).toContain("projects");
    expect(s).not.toContain("finance");
  });
});
