import { ansi60, validateLayout, type Layout, type LayoutKey } from "./layout";
import geometry from "./preset-geometry.json";
export interface LayoutPreset {
  layout: Layout;
  group: string;
  note: string;
}
const numberRow = ["`", ..."1234567890", "-", "=", "Backspace"];
const qRow = ["Tab", ..."QWERTYUIOP", "[", "]", "\\"];
const aRow = ["Caps", ..."ASDFGHJKL", ";", "'", "Enter"];
const zRow = ["Shift", ..."ZXCVBNM", ",", ".", "/", "Shift"];
const bottom = [
  "Ctrl",
  "Super",
  "Alt",
  "Space",
  "Alt",
  "Super",
  "Menu",
  "Ctrl",
];
const compactBottom = [
  "Ctrl",
  "Super",
  "Alt",
  "Space",
  "Alt",
  "Fn",
  "Ctrl",
  "←",
  "↓",
  "→",
];
const fn = Array.from({ length: 12 }, (_, i) => `F${i + 1}`);
const pad = [
  ["Num", "/", "*", "-"],
  ["7", "8", "9", "+"],
  ["4", "5", "6"],
  ["1", "2", "3", "Enter"],
  ["0", "."],
];
const jisNumbers = ["半角/全角", ..."1234567890", "-", "^", "¥", "Backspace"];
const jisQ = ["Tab", ..."QWERTYUIOP", "@", "[", "Enter"];
const jisA = ["Caps", ..."ASDFGHJKL", ";", ":", "]"];
const jisZ = ["Shift", ..."ZXCVBNM", ",", ".", "/", "ろ", "Shift"];
const jisBottom = [
  "Ctrl",
  "Super",
  "Alt",
  "無変換",
  "Space",
  "変換",
  "かな",
  "Alt",
  "Menu",
  "Ctrl",
];
const isoQ = [...qRow.slice(0, -1), "Enter"];
const isoA = [...aRow.slice(0, -1), "#"];
const isoZ = ["Shift", "\\", ...zRow.slice(1)];
function regionalRows(jis: boolean, full: boolean): string[][] {
  const n = jis ? jisNumbers : numberRow,
    q = jis ? jisQ : isoQ,
    a = jis ? jisA : isoA,
    z = jis ? jisZ : isoZ;
  const b = jis
    ? full
      ? [...jisBottom.slice(0, 8), "Super", ...jisBottom.slice(8)]
      : jisBottom
    : bottom;
  return [
    ["Esc", ...fn, "Print", "Scroll", "Pause"],
    [...n, "Insert", "Home", "PgUp", ...(full ? pad[0] : [])],
    [...q, "Delete", "End", "PgDn", ...(full ? pad[1] : [])],
    [...a, ...(full ? pad[2] : [])],
    [...z, "↑", ...(full ? pad[3] : [])],
    [...b, "←", "↓", "→", ...(full ? pad[4] : [])],
  ];
}
// Labels are design defaults, not firmware mappings.
const legends: Record<keyof typeof geometry, string[][]> = {
  "60_hhkb": [
    ["Esc", ..."1234567890", "-", "=", "\\", "`"],
    [...qRow.slice(0, -1), "Delete"],
    ["Ctrl", ...aRow.slice(1)],
    [...zRow.slice(0, -1), "Shift", "Fn"],
    ["Super", "Alt", "Space", "Alt", "Super"],
  ],
  "65_ansi": [
    ["Esc", ...numberRow.slice(1), "Home"],
    [...qRow, "PgUp"],
    [...aRow, "PgDn"],
    [...zRow.slice(0, -1), "Shift", "↑", "End"],
    compactBottom,
  ],
  "75_ansi": [
    ["Esc", ...fn, "Print", "Scroll", "Pause"],
    [...numberRow, "Delete"],
    [...qRow, "Home"],
    [...aRow, "PgUp"],
    [...zRow.slice(0, -1), "Shift", "↑", "PgDn"],
    compactBottom,
  ],
  "96_ansi": [
    ["Esc", ...fn, "Print", "Scroll", "Pause", "Insert", "Home", "PgUp"],
    [...numberRow, "Num", "/", "*", "-"],
    [...qRow, ...pad[1]],
    [...aRow, ...pad[2]],
    [...zRow.slice(0, -1), "Shift", "↑", ...pad[3]],
    [
      "Ctrl",
      "Super",
      "Alt",
      "Space",
      "Alt",
      "Fn",
      "Ctrl",
      "←",
      "↓",
      "→",
      "0",
      ".",
    ],
  ],
  tkl_ansi: [
    ["Esc", ...fn, "Print", "Scroll", "Pause"],
    [...numberRow, "Insert", "Home", "PgUp"],
    [...qRow, "Delete", "End", "PgDn"],
    aRow,
    [...zRow, "↑"],
    [...bottom, "←", "↓", "→"],
  ],
  fullsize_ansi: [
    ["Esc", ...fn, "Print", "Scroll", "Pause"],
    [...numberRow, "Insert", "Home", "PgUp", ...pad[0]],
    [...qRow, "Delete", "End", "PgDn", ...pad[1]],
    [...aRow, ...pad[2]],
    [...zRow, "↑", ...pad[3]],
    [...bottom, "←", "↓", "→", ...pad[4]],
  ],
  numpad_5x4: pad,
  "60_jis": [jisNumbers, jisQ, jisA, jisZ, jisBottom],
  tkl_jis: regionalRows(true, false),
  fullsize_jis: regionalRows(true, true),
  "60_iso": [numberRow, isoQ, isoA, isoZ, bottom],
  tkl_iso: regionalRows(false, false),
  fullsize_iso: regionalRows(false, true),
};
function makeKey(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  index: number,
  row: number,
): LayoutKey {
  return {
    id: `key-${String(index + 1).padStart(3, "0")}`,
    label: label === "Space" ? "" : label,
    sub: "",
    x,
    y,
    w,
    h,
    rotation: 0,
    row,
    role: /^(Esc|Enter)$/.test(label)
      ? "accent"
      : label.length === 1 && !"←↓↑→".includes(label)
        ? "base"
        : "modifier",
    shape: label === "Space" && w >= 3 ? "space" : "standard",
  };
}
function makePreset(
  source: keyof typeof geometry,
  name: string,
  group: string,
  note: string,
): LayoutPreset {
  const coords = [...geometry[source]].sort(
      (a, b) => a[1] - b[1] || a[0] - b[0],
    ),
    labels = legends[source].flat();
  if (coords.length !== labels.length)
    throw new Error(`Preset labels: ${source}`);
  const ys = [...new Set(coords.map((k) => k[1]))].sort((a, b) => a - b);
  const hasFunctionRow = ys.length === 6;
  const keys = coords.map(([x, y, w, h], i) => {
    const key = makeKey(
      labels[i],
      x,
      y,
      w,
      h,
      i,
      Math.max(0, Math.min(4, ys.indexOf(y) - (hasFunctionRow ? 1 : 0))),
    );
    if (
      (source.endsWith("_jis") || source.endsWith("_iso")) &&
      x === 13.75 &&
      w === 1.25 &&
      h === 2
    ) {
      key.x -= 0.25;
      key.w = 1.5;
      key.shape = "iso-enter";
    }
    return key;
  });
  const layout: Layout = {
    id: `preset-${source}-v1`,
    version: 1,
    name,
    pitchMm: 19.05,
    width: Math.max(...keys.map((k) => k.x + k.w)),
    height: Math.max(...keys.map((k) => k.y + k.h)),
    keys,
  };
  validateLayout(layout);
  return { layout, group, note };
}
function grid(rows: number, columns: number): LayoutPreset {
  const labels =
    rows === 4
      ? [
          ["Esc", ..."QWERTYUIOP", "Backspace"],
          ["Tab", ..."ASDFGHJKL", "'", "Enter"],
          ["Shift", ..."ZXCVBNM", ",", ".", "/", "Shift"],
          [
            "Ctrl",
            "Super",
            "Alt",
            "Fn",
            "Lower",
            "Space",
            "Space",
            "Raise",
            "←",
            "↓",
            "↑",
            "→",
          ],
        ].flat()
      : [];
  const layout: Layout = {
    id: `preset-grid-${rows}x${columns}-v1`,
    version: 1,
    name: `格子 ${rows}×${columns}`,
    pitchMm: 19.05,
    width: columns,
    height: rows,
    keys: Array.from({ length: rows * columns }, (_, i) =>
      makeKey(
        labels[i] ?? String(i + 1),
        i % columns,
        Math.floor(i / columns),
        1,
        1,
        i,
        Math.min(4, Math.floor(i / columns)),
      ),
    ),
  };
  validateLayout(layout);
  return { layout, group: "格子配列", note: "全キー1u。刻印は編集できます。" };
}
function hhkb6(): LayoutPreset {
  const preset = makePreset(
    "60_hhkb",
    "HHKB US 6u",
    "コンパクト",
    "60キー・6uスペース・HHKB英語配列。",
  );
  preset.layout.id = "preset-hhkb-6u-v1";
  const bottomKeys = preset.layout.keys.filter((k) => k.y === 4);
  const positions = [
    [1.5, 1],
    [2.5, 1.5],
    [4, 6],
    [10, 1.5],
    [11.5, 1],
  ];
  bottomKeys.forEach((k, i) => {
    k.x = positions[i][0];
    k.w = positions[i][1];
    k.label = ["Alt", "Super", "", "Super", "Alt"][i];
  });
  validateLayout(preset.layout);
  return preset;
}
export const layoutPresets: LayoutPreset[] = [
  {
    layout: ansi60,
    group: "スタンダード",
    note: "61キー・6.25uスペース。既存のANSI 60%と同じ配列。",
  },
  makePreset(
    "65_ansi",
    "ANSI 65%",
    "スタンダード",
    "68キー・6.25uスペース・隙間なし。",
  ),
  makePreset(
    "75_ansi",
    "ANSI 75%",
    "スタンダード",
    "84キー・6.25uスペース・F列あり・隙間なし。",
  ),
  makePreset(
    "tkl_ansi",
    "ANSI TKL",
    "スタンダード",
    "87キー・6.25uスペース・独立した矢印とナビゲーション。",
  ),
  makePreset(
    "96_ansi",
    "ANSI 96%",
    "スタンダード",
    "100キー・6.25uスペース・テンキー一体型。",
  ),
  makePreset(
    "fullsize_ansi",
    "ANSI フルサイズ",
    "スタンダード",
    "104キー・6.25uスペース・独立したテンキー。",
  ),
  hhkb6(),
  makePreset(
    "60_hhkb",
    "HHKB型 7u",
    "コンパクト",
    "60キー・7uスペース・両端ブロッカー。HHKB製品の6u配列とは異なります。",
  ),
  makePreset(
    "numpad_5x4",
    "テンキー",
    "コンパクト",
    "17キー・2uの0キー・縦長の＋とEnter。",
  ),
  makePreset("60_jis", "JIS 60%", "JIS", "65キー・3.75uスペース・L字Enter。"),
  makePreset("tkl_jis", "JIS TKL", "JIS", "91キー・3.75uスペース・L字Enter。"),
  makePreset(
    "fullsize_jis",
    "JIS フルサイズ",
    "JIS",
    "109キー・3.25uスペース・L字Enter。",
  ),
  makePreset(
    "60_iso",
    "ISO UK 60%",
    "ISO",
    "62キー・6.25uスペース・L字Enter。",
  ),
  makePreset(
    "tkl_iso",
    "ISO UK TKL",
    "ISO",
    "88キー・6.25uスペース・L字Enter。",
  ),
  makePreset(
    "fullsize_iso",
    "ISO UK フルサイズ",
    "ISO",
    "105キー・6.25uスペース・L字Enter。",
  ),
  grid(4, 12),
  grid(5, 12),
  grid(10, 10),
];
