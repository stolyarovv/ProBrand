import { ProjectArchiveState, ProjectKind, ProjectWorkType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { projectPatchBodySchema, projectPostBodySchema } from "./project";

const basePost = {
  name: "Тест",
  kind: ProjectKind.INTERNAL,
  workType: ProjectWorkType.OTHER,
};

describe("projectPostBodySchema (API POST /api/projects)", () => {
  it("внутренний проект без клиента — OK", () => {
    const r = projectPostBodySchema.safeParse(basePost);
    expect(r.success).toBe(true);
  });

  it("коммерческий без клиента — ошибка", () => {
    const r = projectPostBodySchema.safeParse({
      ...basePost,
      kind: ProjectKind.COMMERCIAL,
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toContain("коммерческого");
    }
  });

  it("дефолт валюты BYN", () => {
    const r = projectPostBodySchema.safeParse(basePost);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.currency).toBe("BYN");
  });

  it("archiveState по умолчанию ACTIVE", () => {
    const r = projectPostBodySchema.safeParse(basePost);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.archiveState).toBe(ProjectArchiveState.ACTIVE);
  });
});

describe("projectPatchBodySchema (API PATCH /api/projects/[id])", () => {
  it("только archiveState — OK", () => {
    const r = projectPatchBodySchema.safeParse({ archiveState: ProjectArchiveState.ARCHIVED });
    expect(r.success).toBe(true);
  });

  it("пустое тело — OK (валидация на уровне route: нет полей)", () => {
    const r = projectPatchBodySchema.safeParse({});
    expect(r.success).toBe(true);
  });
});
