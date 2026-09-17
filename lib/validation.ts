import { z } from "zod";
import { ItemPriority, ItemStatus, ItemType } from "@prisma/client";

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(120),
  code: z.string().min(2).max(10).regex(/^[A-Z0-9]+$/, "Solo mayúsculas y números"),
  description: z.string().max(2000).optional(),
});

export const createModuleSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1).max(120),
});

export const createItemSchema = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  type: z.nativeEnum(ItemType),
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
  priority: z.nativeEnum(ItemPriority).default(ItemPriority.MEDIUM),
});

export const patchItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10_000).nullable().optional(),
  priority: z.nativeEnum(ItemPriority).optional(),
  status: z.nativeEnum(ItemStatus).optional(),
  moduleId: z.string().uuid().nullable().optional(),
});

export const captureQuickSchema = z.object({
  text: z.string().min(1).max(5000),
  source: z.string().default("USER_CAPTURE"),
});

export const captureInterpretSchema = z.object({
  text: z.string().min(1).max(5000),
});

export const captureConfirmSchema = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().uuid().nullable().optional(),
  type: z.nativeEnum(ItemType),
  priority: z.nativeEnum(ItemPriority),
  title: z.string().min(1).max(200),
  description: z.string().max(10_000).optional(),
  interpretationId: z.string().uuid().optional(),
});

export const activityStartSchema = z.object({
  projectId: z.string().uuid(),
  moduleId: z.string().uuid().optional(),
  label: z.string().max(200).optional(),
});

export const activityStopSchema = z.object({
  activityId: z.string().uuid().optional(),
});

export const quickEventSchema = z.object({
  eventType: z.string().min(1).max(50),
  value: z.number().optional(),
  unit: z.string().max(20).optional(),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

export const createRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  defaultBranch: z.string().default("main"),
  projectId: z.string().uuid().optional(),
  tokenEnvVar: z.string().default("GITHUB_TOKEN"),
});
