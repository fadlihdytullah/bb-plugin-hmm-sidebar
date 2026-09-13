import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

const collectionId = z.string().trim().min(1).max(200);
const projectId = z.string().trim().min(1).max(500);
const orderedIds = z
  .array(z.string().trim().min(1).max(500))
  .max(10_000)
  .superRefine((ids, context) => {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "Ids must be unique" });
    }
  });

const collectionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    position: z.number().int().nonnegative(),
    projectIds: z.array(z.string()),
  })
  .strict();

export const rpcContract = defineRpcContract({
  collections_list: {
    input: z.object({}).strict(),
    output: z.object({ collections: z.array(collectionSchema) }).strict(),
  },
  collections_create: {
    input: z.object({ name: z.string().trim().min(1).max(120) }).strict(),
    output: collectionSchema,
  },
  collections_rename: {
    input: z
      .object({ collectionId, name: z.string().trim().min(1).max(120) })
      .strict(),
    output: collectionSchema,
  },
  collections_delete: {
    input: z.object({ collectionId }).strict(),
    output: z.object({ deleted: z.boolean() }).strict(),
  },
  collections_reorder: {
    input: z.object({ collectionIds: orderedIds }).strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
  projects_move: {
    input: z
      .object({
        projectId,
        collectionId: collectionId.nullable(),
        position: z.number().int().nonnegative().max(10_000),
      })
      .strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
  projects_rename: {
    input: z
      .object({ projectId, name: z.string().trim().min(1).max(120) })
      .strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
  projects_delete: {
    input: z.object({ projectId }).strict(),
    output: z.object({ deleted: z.literal(true) }).strict(),
  },
  projects_clear_threads: {
    input: z.object({ projectId }).strict(),
    output: z
      .object({
        deletedCount: z.number().int().nonnegative(),
        preservedCount: z.number().int().nonnegative(),
      })
      .strict(),
  },
  chats_clear: {
    input: z.object({}).strict(),
    output: z
      .object({
        deletedCount: z.number().int().nonnegative(),
        preservedCount: z.number().int().nonnegative(),
      })
      .strict(),
  },
  projects_reorder: {
    input: z
      .object({ collectionId, projectIds: orderedIds })
      .strict(),
    output: z.object({ ok: z.literal(true) }).strict(),
  },
});

export type Collection = z.infer<typeof collectionSchema>;
