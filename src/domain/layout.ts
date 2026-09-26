import { z } from "zod";
export type KeyRole = "base" | "modifier" | "accent";
export interface LayoutKey {
  id: string;
  label: string;
  sub: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  row: number;
  role: KeyRole;
  shape?: "standard" | "space";
}
export interface Layout {
  id: string;
  version: number;
  name: string;
  pitchMm: number;
  width: number;
  height: number;
  keys: LayoutKey[];
}
type Entry = [string, string, number?, string?, KeyRole?];
const rows: Entry[][] = [
  [
    ["escape", "Esc", 1, "", "accent"],
    ["digit1", "1", 1, "!"],
    ["digit2", "2", 1, "@"],
    ["digit3", "3", 1, "#"],
    ["digit4", "4", 1, "$"],
    ["digit5", "5", 1, "%"],
    ["digit6", "6", 1, "^"],
    ["digit7", "7", 1, "&"],
    ["digit8", "8", 1, "*"],
    ["digit9", "9", 1, "("],
    ["digit0", "0", 1, ")"],
    ["minus", "-", 1, "_"],
    ["equal", "=", 1, "+"],
    ["backspace", "Backspace", 2, "", "modifier"],
  ],
  [
    ["tab", "Tab", 1.5, "", "modifier"],
    ..."QWERTYUIOP".split("").map((c) => [`key${c}`, c] as Entry),
    ["bracketLeft", "[", 1, "{"],
    ["bracketRight", "]", 1, "}"],
    ["backslash", "\\", 1.5, "|", "modifier"],
  ],
  [
    ["capsLock", "Caps", 1.75, "", "modifier"],
    ..."ASDFGHJKL".split("").map((c) => [`key${c}`, c] as Entry),
    ["semicolon", ";", 1, ":"],
    ["quote", "'", 1, '"'],
    ["enter", "Enter", 2.25, "", "accent"],
  ],
  [
    ["shiftLeft", "Shift", 2.25, "", "modifier"],
    ..."ZXCVBNM".split("").map((c) => [`key${c}`, c] as Entry),
    ["comma", ",", 1, "<"],
    ["period", ".", 1, ">"],
    ["slash", "/", 1, "?"],
    ["shiftRight", "Shift", 2.75, "", "modifier"],
  ],
  [
    ["controlLeft", "Ctrl", 1.25, "", "modifier"],
    ["metaLeft", "Super", 1.25, "", "modifier"],
    ["altLeft", "Alt", 1.25, "", "modifier"],
    ["space", "", 6.25],
    ["altRight", "Alt", 1.25, "", "modifier"],
    ["metaRight", "Super", 1.25, "", "modifier"],
    ["menu", "Menu", 1.25, "", "modifier"],
    ["controlRight", "Ctrl", 1.25, "", "modifier"],
  ],
];
export const ansi60: Layout = {
  id: "ansi60",
  version: 1,
  name: "ANSI 60%",
  pitchMm: 19.05,
  width: 15,
  height: 5,
  keys: rows.flatMap((entries, y) => {
    let x = 0;
    return entries.map(([id, label, w = 1, sub = "", role = "base"]) => {
      const key = { id, label, sub, x, y, w, h: 1, rotation: 0, row: y, role };
      x += w;
      return key;
    });
  }),
};
export function validateLayout(layout: Layout): void {
  if (
    !Number.isFinite(layout.pitchMm) ||
    layout.pitchMm !== 19.05 ||
    !Number.isFinite(layout.width) ||
    !Number.isFinite(layout.height) ||
    layout.width <= 0 ||
    layout.height <= 0 ||
    layout.width > 40 ||
    layout.height > 20
  )
    throw new Error("配列は40u×20u以内・19.05mmピッチにしてください");
  if (!layout.keys.length || layout.keys.length > 200)
    throw new Error("キー数は1〜200個にしてください");
  const ids = new Set<string>();
  for (const k of layout.keys) {
    if (!k.id || ids.has(k.id)) throw new Error("キーIDが重複しています");
    ids.add(k.id);
    if (
      ![k.x, k.y, k.w, k.h, k.rotation, k.row].every(Number.isFinite) ||
      k.x < 0 ||
      k.y < 0 ||
      k.w < 0.5 ||
      k.h < 0.5 ||
      k.w > 10 ||
      k.h > 10 ||
      k.x + k.w > layout.width + 1e-6 ||
      k.y + k.h > layout.height + 1e-6
    )
      throw new Error("キーの座標・寸法が不正です（幅・高さは0.5〜10u）");
    if (k.rotation !== 0) throw new Error("回転したキーには未対応です");
    if (!Number.isInteger(k.row) || k.row < 0 || k.row > 4)
      throw new Error("キーのプロファイル行が不正です");
  }
  for (let i = 0; i < layout.keys.length; i++)
    for (let j = i + 1; j < layout.keys.length; j++) {
      const a = layout.keys[i],
        b = layout.keys[j];
      if (
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 &&
        Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6
      )
        throw new Error(`キーが重なっています：${a.id} / ${b.id}`);
    }
}
const layoutKeySchema = z
  .object({
    id: z.string().min(1).max(100),
    label: z.string().max(80),
    sub: z.string().max(80),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    rotation: z.number().refine((v): boolean => v === 0),
    row: z.number().int().min(0).max(4),
    role: z.enum(["base", "modifier", "accent"]),
    shape: z.enum(["standard", "space"]).optional(),
  })
  .strict();
export const layoutSchema = z
  .object({
    id: z.string().min(1).max(100),
    version: z
      .number()
      .int()
      .refine((v): boolean => v === 1),
    name: z.string().min(1).max(80),
    pitchMm: z.number().refine((v): boolean => v === 19.05),
    width: z.number(),
    height: z.number(),
    keys: z.array(layoutKeySchema).min(1).max(200),
  })
  .strict()
  .superRefine((layout, ctx) => {
    try {
      validateLayout(layout);
    } catch (e) {
      ctx.addIssue({ code: "custom", message: (e as Error).message });
    }
  });
export function layoutSignature(layout: Layout): string {
  return JSON.stringify([
    layout.pitchMm,
    layout.width,
    layout.height,
    layout.keys.map((k) => [
      k.id,
      k.x,
      k.y,
      k.w,
      k.h,
      k.rotation,
      k.row,
      k.shape ?? (k.id === "space" ? "space" : "standard"),
    ]),
  ]);
}
validateLayout(ansi60);
