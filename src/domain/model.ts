import {
  customArtSchema,
  artworkAssetsSchema,
  type CustomArt,
} from "./custom-art";
import { designKeyIds } from "./key-identity";
import { kitSchema } from "./kit-schema";
import {
  profileIds,
  profileRowIndex,
  defaultProfile,
  rowName,
} from "./profiles";
import { z } from "zod";
import {
  ansi60,
  layoutSchema,
  layoutSignature,
  type Layout,
  type LayoutKey,
  type KeyRole,
} from "./layout";
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
    customArt: customArtSchema.nullable().optional(),
  })
  .strict();
const pair = z.object({ color, ink: color }).strict();
export const studySchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    id: z.string().min(1).max(100),
    name: z.string().min(1).max(80),
    concept: z.string().max(1200),
    keywords: z.string().max(240),
    layoutId: z.string().min(1).max(100),
    layout: layoutSchema.optional(),
    profile: z.preprocess((value) => {
      const legacy: Record<string, string> = {
        "studio-sculpted-v2": "cherry",
        "studio-uniform": "dsa",
        "studio-low": "lsa",
      };
      return typeof value === "string" ? (legacy[value] ?? value) : value;
    }, z.enum(profileIds).optional()),
    artworkAssets: artworkAssetsSchema.optional(),
    kit: kitSchema.optional(),
    kitTargets: z
      .array(z.string().min(1).max(100))
      .max(60)
      .refine(
        (ids) => new Set(ids).size === ids.length,
        "対象配列が重複しています",
      )
      .optional(),
    variantSelections: z
      .record(
        z.string().min(1).max(100),
        z.record(z.string().min(1).max(100), z.string().min(1).max(100)),
      )
      .optional(),
    designKeys: z.record(z.string(), overrideSchema).optional(),
    layouts: z.array(layoutSchema).max(40).optional(),
    palette: z.object({ base: pair, modifier: pair, accent: pair }).strict(),
    legend: z
      .object({ align: z.enum(["left", "center"]), sublegends: z.boolean() })
      .strict(),
    overrides: z.record(z.string(), overrideSchema),
    favorite: z.boolean(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.schemaVersion === 1 && (s.layoutId !== "ansi60" || s.layout))
      ctx.addIssue({ code: "custom", message: "v1はANSI 60%専用です" });
    if (
      s.schemaVersion === 2 &&
      (!s.layout || s.layoutId !== s.layout.id || s.layout.id === "ansi60")
    )
      ctx.addIssue({ code: "custom", message: "配列データとIDが一致しません" });
    if (s.schemaVersion === 3 && (!s.layout || s.layoutId !== s.layout.id))
      ctx.addIssue({ code: "custom", message: "配列データとIDが一致しません" });
    if (s.schemaVersion !== 3 && (s.designKeys || s.layouts))
      ctx.addIssue({ code: "custom", message: "セットの共有キーはv3専用です" });
    const assets = new Set(s.artworkAssets?.map((a) => a.id) ?? []);
    const artwork = [
      ...Object.values(s.overrides),
      ...Object.values(s.designKeys ?? {}),
      ...(s.kit ?? []).map((k) => k.artwork),
    ];
    if (artwork.some((a) => a?.customArt && !assets.has(a.customArt.assetId)))
      ctx.addIssue({ code: "custom", message: "絵柄の参照先が見つかりません" });
    const layout = s.layout ?? ansi60;
    if (
      !Object.keys(s.overrides).every((id) =>
        layout.keys.some((k) => k.id === id),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "存在しないキーが指定されています",
      });
  });
export const librarySchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    studies: z.array(studySchema).max(200),
  })
  .strict()
  .refine(
    (v) => new Set(v.studies.map((s) => s.id)).size === v.studies.length,
    "案のIDが重複しています",
  )
  .refine(
    (v) => v.studies.every((s) => s.schemaVersion <= v.schemaVersion),
    "v1形式にカスタム配列は保存できません",
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
  customArt?: CustomArt | null;
  profileRow: number;
};
export const roles: KeyRole[] = ["base", "modifier", "accent"];
export const roleLabels = {
  base: "アルファ",
  modifier: "モディファイア",
  accent: "アクセント",
};
export function getLayout(study: Study): Layout {
  return study.layout ?? ansi60;
}
export function sameLayout(a: Study, b: Study): boolean {
  return layoutSignature(getLayout(a)) === layoutSignature(getLayout(b));
}
export function compatibleKitKeys(study: Study, keyId: string) {
  const layout = getLayout(study),
    k = layout.keys.find((k) => k.id === keyId);
  if (!k) return [];
  const identity = designKeyIds(layout).get(k.id);
  const shape = k.shape ?? (k.id === "space" ? "space" : "standard");
  const profile = study.profile ?? defaultProfile;
  const row = profileRowIndex(k, layout, profile);
  return (study.kit ?? []).filter(
    (a) =>
      a.identity === identity &&
      a.w === k.w &&
      a.h === k.h &&
      a.shape === shape &&
      (shape === "space" || rowName(a.row, profile) === rowName(row, profile)),
  );
}
export function selectKitVariant(
  study: Study,
  keyId: string,
  kitId: string | null,
): Study {
  if (kitId && !compatibleKitKeys(study, keyId).some((k) => k.id === kitId))
    return study;
  const selections = structuredClone(study.variantSelections ?? {});
  const layoutId = getLayout(study).id;
  selections[layoutId] ??= {};
  if (kitId) selections[layoutId][keyId] = kitId;
  else delete selections[layoutId][keyId];
  return { ...study, variantSelections: selections };
}
export function resolveKeys(study: Study): ResolvedKey[] {
  const layout = getLayout(study);
  return layout.keys.map((k) => {
    const o = study.overrides[k.id] ?? {};
    const candidates = compatibleKitKeys(study, k.id);
    const explicit = candidates.find(
      (a) => a.id === study.variantSelections?.[layout.id]?.[k.id],
    );
    const owned = explicit ?? candidates[0];
    const role = explicit?.role ?? o.role ?? owned?.role ?? k.role;
    const pair = study.palette[role];
    return {
      ...k,
      role,
      main: owned?.artwork?.main ?? o.main ?? k.label,
      sub: owned?.artwork?.sub ?? o.sub ?? k.sub,
      color: owned?.artwork?.color ?? o.color ?? pair.color,
      ink: owned?.artwork?.ink ?? o.ink ?? pair.ink,
      novelty: owned?.artwork?.novelty ?? o.novelty ?? "none",
      customArt:
        owned?.artwork?.customArt !== undefined
          ? owned.artwork.customArt
          : o.customArt,
      profileRow: profileRowIndex(
        k,
        getLayout(study),
        study.profile ?? defaultProfile,
      ),
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
