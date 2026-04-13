import { ProjectArchiveState, ProjectKind, ProjectWorkType } from "@prisma/client";
import { z } from "zod";

export const projectPostBodySchema = z
  .object({
    name: z.string().min(1).max(300),
    kind: z.nativeEnum(ProjectKind),
    workType: z.nativeEnum(ProjectWorkType),
    clientId: z.string().cuid().optional().nullable(),
    newClientName: z.string().min(1).max(200).optional(),
    ownerId: z.string().cuid().optional().nullable(),
    budgetPlanned: z.coerce.number().min(0).optional().nullable(),
    currency: z.string().length(3).optional().default("BYN"),
    archiveState: z.nativeEnum(ProjectArchiveState).optional().default(ProjectArchiveState.ACTIVE),
  })
  .superRefine((data, ctx) => {
    if (data.kind === ProjectKind.COMMERCIAL) {
      const hasNew = !!(data.newClientName && data.newClientName.trim());
      const hasId = !!data.clientId;
      if (!hasNew && !hasId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Для коммерческого проекта выберите клиента или укажите нового",
          path: ["clientId"],
        });
      }
      if (hasNew && hasId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Укажите только один вариант: клиент из списка или новое имя",
          path: ["newClientName"],
        });
      }
    }
  });

export const projectPatchBodySchema = z.object({
  ownerId: z.string().cuid().optional().nullable(),
  kind: z.nativeEnum(ProjectKind).optional(),
  workType: z.nativeEnum(ProjectWorkType).optional(),
  archiveState: z.nativeEnum(ProjectArchiveState).optional(),
  budgetPlanned: z.coerce.number().min(0).optional().nullable(),
});
