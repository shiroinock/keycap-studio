import { z } from "zod";
export const kitKeySchema = z
  .object({
    id: z.string().min(1).max(100),
    identity: z.string().min(1).max(500),
    label: z.string().max(80),
    sub: z.string().max(80),
    role: z.enum(["base", "modifier", "accent"]),
    w: z.number().min(0.5).max(10),
    h: z.number().min(0.5).max(10),
    row: z.number().int().min(-1).max(4),
    shape: z.enum(["standard", "space", "iso-enter"]),
    group: z.enum(["base", "extras", "numpad", "novelty"]).default("extras"),
    placement: z
      .object({ x: z.number().min(0).max(40), y: z.number().min(0).max(20) })
      .strict()
      .optional(),
    artwork: z
      .object({
        main: z.string().max(80).optional(),
        sub: z.string().max(80).optional(),
        color: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        ink: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional(),
        novelty: z.enum(["none", "sun", "moon", "spark", "wave"]).optional(),
      })
      .strict()
      .optional(),
    quantity: z.number().int().min(1).max(200),
  })
  .strict()
  .superRefine((k, ctx) => {
    if (k.shape === "iso-enter" && (k.w !== 1.5 || k.h !== 2))
      ctx.addIssue({ code: "custom", message: "L字Enterは1.5×2uです" });
    if (k.shape === "space" && (k.h !== 1 || k.w < 1))
      ctx.addIssue({
        code: "custom",
        message: "スペースは幅1u以上・高さ1uです",
      });
  });
export const kitSchema = z
  .array(kitKeySchema)
  .max(600)
  .refine(
    (keys) => new Set(keys.map((k) => k.id)).size === keys.length,
    "収録キーのIDが重複しています",
  );
export type KitKey = z.infer<typeof kitKeySchema>;
