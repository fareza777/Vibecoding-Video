import { z } from "zod";

export const vibeActionSchema = z.object({
  type: z.enum([
    "trim",
    "split",
    "effect",
    "speed",
    "volume",
    "text-overlay",
    "move-clip",
    "delete-clip",
    "set-playhead",
    "transition",
    "export",
  ]),
  description: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
});

export const vibeResponseSchema = z.object({
  message: z.string().min(1),
  actions: z.array(vibeActionSchema).default([]),
});

export type VibeResponseParsed = z.infer<typeof vibeResponseSchema>;