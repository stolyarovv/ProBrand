import type { Role } from "@prisma/client";

export type Section =
  | "sales"
  | "finance"
  | "accounting"
  | "projects"
  | "documents";

const ALL_SECTIONS: Section[] = [
  "sales",
  "finance",
  "accounting",
  "projects",
  "documents",
];

const SECTIONS_BY_ROLE: Record<Role, Section[]> = {
  ADMIN: ALL_SECTIONS,
  MANAGER: ALL_SECTIONS,
  VIEWER: ["sales", "projects", "documents"],
};

export function canAccessSection(role: Role, section: Section): boolean {
  return SECTIONS_BY_ROLE[role]?.includes(section) ?? false;
}

export function sectionsForRole(role: Role): Section[] {
  return SECTIONS_BY_ROLE[role] ?? [];
}
