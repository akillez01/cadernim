import { z } from "zod";

const bookletItemSchema = z.object({
  hymnId: z.string().min(1),
  targetKey: z.string().min(1)
});

const bookletSpecSchema = z.object({
  items: z.array(bookletItemSchema).min(1).max(80)
});

export type BookletSpec = z.infer<typeof bookletSpecSchema>;

export function decodeBookletSpec(encoded: string | undefined): BookletSpec | null {
  if (!encoded) {
    return null;
  }

  try {
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(decoded);
    const safe = bookletSpecSchema.safeParse(parsed);

    if (!safe.success) {
      return null;
    }

    return safe.data;
  } catch {
    return null;
  }
}
