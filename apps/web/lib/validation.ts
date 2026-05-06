import { z } from "zod";

export const hymnPayloadSchema = z.object({
  title: z.string().min(2),
  number: z.coerce.number().int().positive(),
  author: z.string().min(2),
  originalKey: z.string().min(1),
  defaultBpm: z.coerce.number().int().positive(),
  timeSignature: z.string().min(3),
  category: z.string().min(2),
  tags: z.array(z.string()).default([])
});

export const sessionPayloadSchema = z.object({
  hymnId: z.string().min(1),
  selectedKey: z.string().min(1),
  selectedBpm: z.coerce.number().int().positive(),
  accompanimentType: z.enum([
    "melody",
    "melody_metronome",
    "melody_chords",
    "melody_guitar",
    "melody_pad"
  ]),
  loopStart: z.coerce.number().int().positive().optional().nullable(),
  loopEnd: z.coerce.number().int().positive().optional().nullable()
});

export const notePayloadSchema = z.object({
  content: z.string().min(1).max(2500)
});

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128)
});
