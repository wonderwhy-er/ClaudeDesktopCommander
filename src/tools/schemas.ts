import { z } from "zod";

console.error("Loading schemas.ts");

// Config tools schemas
export const GetConfigArgsSchema = z.object({});

export const GetConfigValueArgsSchema = z.object({
  key: z.string(),
});

export const SetConfigValueArgsSchema = z.object({
  key: z.string(),
  value: z.any(),
});

export const UpdateConfigArgsSchema = z.object({
  config: z.record(z.any()),
});

// Terminal tools schemas
export const ExecuteCommandArgsSchema = z.object({
  command: z.string(),
  timeout_ms: z.number().optional(),
  shell: z.string().optional(),
});

export const ReadOutputArgsSchema = z.object({
  pid: z.number(),
});

export const ForceTerminateArgsSchema = z.object({
  pid: z.number(),
});

export const ListSessionsArgsSchema = z.object({});

export const KillProcessArgsSchema = z.object({
  pid: z.number(),
});

export const BlockCommandArgsSchema = z.object({
  command: z.string(),
});

export const UnblockCommandArgsSchema = z.object({
  command: z.string(),
});

// Filesystem tools schemas
export const ReadFileArgsSchema = z.object({
  path: z.string(),
});

export const ReadMultipleFilesArgsSchema = z.object({
  paths: z.array(z.string()),
});

export const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

export const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const ListDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const MoveFileArgsSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

export const SearchFilesArgsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
});

export const GetFileInfoArgsSchema = z.object({
  path: z.string(),
});

// Edit tools schemas
export const EditBlockArgsSchema = z.object({
  blockContent: z.string(),
});