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
  const ids = new Set<string>();
  if (
    !Number.isFinite(layout.pitchMm) ||
    layout.pitchMm <= 0 ||
    !Number.isFinite(layout.width) ||
    !Number.isFinite(layout.height) ||
    layout.width <= 0 ||
    layout.height <= 0
  )
    throw new Error("配列の寸法が不正です");
  for (const k of layout.keys) {
    if (!k.id || ids.has(k.id)) throw new Error("キーIDが重複しています");
    ids.add(k.id);
    if (
      ![k.x, k.y, k.w, k.h, k.rotation].every(Number.isFinite) ||
      k.x < 0 ||
      k.y < 0 ||
      k.w <= 0 ||
      k.h <= 0 ||
      k.x + k.w > layout.width ||
      k.y + k.h > layout.height
    )
      throw new Error("キーの座標・寸法が不正です");
  }
}
validateLayout(ansi60);
