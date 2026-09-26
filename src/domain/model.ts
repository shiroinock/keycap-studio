import { z } from "zod";
import { ansi60, type LayoutKey, type KeyRole } from "./layout";
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text = z.string().max(80);
export const noveltyIds = ["none", "sun", "moon", "spark", "wave"] as const;
const overrideSchema = z
  .object({
    main: text.optional(),
    sub: text.optional(),
    role: z.enum(["base", "modifier", "accent"]).optional(),
    color: color.optional(),
    ink: color.optional(),
    novelty: z.enum(noveltyIds).optional(),
  })
  .strict();
const pair = z.object({ color, ink: color }).strict();
export const studySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    concept: z.string().max(1200),
    keywords: z.string().max(240),
    layoutId: z.literal("ansi60"),
    palette: z.object({ base: pair, modifier: pair, accent: pair }).strict(),
    legend: z
      .object({ align: z.enum(["left", "center"]), sublegends: z.boolean() })
      .strict(),
    overrides: z
      .record(z.string(), overrideSchema)
      .refine(
        (o) =>
          Object.keys(o).every((id) => ansi60.keys.some((k) => k.id === id)),
        "存在しないキーが指定されています",
      ),
    favorite: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();
export const librarySchema = z
  .object({
    schemaVersion: z.literal(1),
    studies: z.array(studySchema).min(1).max(200),
  })
  .strict()
  .refine(
    (v) => new Set(v.studies.map((s) => s.id)).size === v.studies.length,
    "案のIDが重複しています",
  );
export type Study = z.infer<typeof studySchema>;
export type KeyOverride = z.infer<typeof overrideSchema>;
export type Library = z.infer<typeof librarySchema>;
export type ResolvedKey = LayoutKey & {
  main: string;
  sub: string;
  color: string;
  ink: string;
  novelty: (typeof noveltyIds)[number];
  profileRow: number;
};
export const roles: KeyRole[] = ["base", "modifier", "accent"];
export const roleLabels = {
  base: "アルファ",
  modifier: "モディファイア",
  accent: "アクセント",
};
export function resolveKeys(study: Study): ResolvedKey[] {
  return ansi60.keys.map((k) => {
    const o = study.overrides[k.id] ?? {};
    const role = o.role ?? k.role;
    const pair = study.palette[role];
    return {
      ...k,
      role,
      main: o.main ?? k.label,
      sub: o.sub ?? k.sub,
      color: o.color ?? pair.color,
      ink: o.ink ?? pair.ink,
      novelty: o.novelty ?? "none",
      profileRow: k.row,
    };
  });
}
export function parseLibrary(raw: string): Library {
  if (raw.length > 2_000_000) throw new Error("JSONは2MB以下にしてください");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("JSONの形式が正しくありません");
  }
  const result = librarySchema.safeParse(value);
  if (!result.success)
    throw new Error(
      "読み込めないデータです。形式・バージョン・色・キー参照・ID重複を確認してください。",
    );
  return result.data;
}
export function duplicateStudy(study: Study): Study {
  const now = new Date().toISOString();
  return {
    ...structuredClone(study),
    id: crypto.randomUUID(),
    name: `${study.name.slice(0, 74)} のコピー`,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}
export function mergeLibraries(current: Study[], incoming: Study[]): Study[] {
  if (current.length + incoming.length > 200)
    throw new Error("保存できる案は200件までです");
  const ids = new Set(current.map((s) => s.id));
  return [
    ...current,
    ...incoming.map((study) => {
      const copy = structuredClone(study);
      if (ids.has(copy.id)) {
        copy.id = crypto.randomUUID();
        copy.name = `${copy.name.slice(0, 72)}（読込）`;
      }
      ids.add(copy.id);
      return copy;
    }),
  ];
}
const date = "2026-09-27T00:00:00.000Z";
const seed = (
  id: string,
  name: string,
  concept: string,
  keywords: string,
  colors: string[],
): Study => ({
  schemaVersion: 1,
  id,
  name,
  concept,
  keywords,
  layoutId: "ansi60",
  palette: {
    base: { color: colors[0], ink: colors[3] },
    modifier: { color: colors[1], ink: colors[3] },
    accent: { color: colors[2], ink: colors[4] },
  },
  legend: { align: "left", sublegends: true },
  overrides: { escape: { novelty: "spark", main: "" } },
  favorite: false,
  createdAt: date,
  updatedAt: date,
});
export const samples: Study[] = [
  seed(
    "seed-tide",
    "Tidal Notes",
    "海辺の観測所。曇り空、潮風、古い測定器の静かな配色。",
    "coastal / quiet / instrument",
    ["#E5EBE5", "#B8CDCA", "#28676A", "#304C4C", "#F3F1E7"],
  ),
  seed(
    "seed-amber",
    "After Hours",
    "閉店後の喫茶店。温かい照明とエスプレッソの余韻。",
    "coffee / warm / evening",
    ["#EFE4D3", "#D5B799", "#B95836", "#503B31", "#FFF4DD"],
  ),
  seed(
    "seed-orbit",
    "Lunar Archive",
    "月面基地の記録端末。冷たいグレーにライムの操作ボタン。",
    "space / technical / archive",
    ["#DEE0E6", "#B5B8CA", "#D7E994", "#353C52", "#353C52"],
  ),
];
