import { Serial } from "@ijprest/kle-serial";
import { validateLayout, type Layout, type LayoutKey } from "./layout";
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const numeric = new Set([
  "x",
  "y",
  "w",
  "h",
  "x2",
  "y2",
  "w2",
  "h2",
  "r",
  "rx",
  "ry",
  "a",
  "f",
  "f2",
]);
const flags = new Set(["d", "g", "l", "n"]);
const strings = new Set(["c", "t", "p", "sm", "sb", "st"]);
export function parseKLE(raw: string): Layout {
  if (raw.length > 200_000)
    throw new Error("KLE JSONは200KB以下にしてください");
  let rows: unknown;
  try {
    rows = JSON.parse(raw);
  } catch {
    throw new Error(
      "KLEの「Download JSON」で保存したJSON、または外側を [ ] で囲んだ有効なJSONを使ってください",
    );
  }
  if (!Array.isArray(rows) || !rows.length || rows.length > 201)
    throw new Error("KLEの行配列が必要です");
  let count = 0;
  const rawLegendCounts: number[] = [];
  rows.forEach((row, i) => {
    if (i === 0 && object(row)) return;
    if (!Array.isArray(row))
      throw new Error(`${i + 1}行目：キーの配列が必要です`);
    row.forEach((item) => {
      if (typeof item === "string") {
        count++;
        const labels = item.split("\n");
        rawLegendCounts.push(labels.filter(Boolean).length);
        if (labels.length > 12 || labels.filter(Boolean).length > 2)
          throw new Error("文字はメイン・サブの2つまでです");
        if (item.length > 1000) throw new Error("レジェンドが長すぎます");
        return;
      }
      if (!object(item))
        throw new Error(`${i + 1}行目：キー文字列か属性オブジェクトが必要です`);
      for (const [key, value] of Object.entries(item)) {
        if (numeric.has(key)) {
          if (
            typeof value !== "number" ||
            !Number.isFinite(value) ||
            Math.abs(value) > 100
          )
            throw new Error(`${key}は範囲内の数値にしてください`);
          if (
            ["w", "h", "w2", "h2"].includes(key) &&
            (value < 0.5 || value > 10)
          )
            throw new Error("キーの幅・高さは0.5〜10uにしてください");
          if (
            key === "a" &&
            (!Number.isInteger(value) || value < 0 || value > 7)
          )
            throw new Error("KLEの文字配置 a は0〜7です");
          if (key === "r" && value !== 0)
            throw new Error("回転したキーには未対応です（r）");
        } else if (flags.has(key)) {
          if (typeof value !== "boolean")
            throw new Error(`${key}は真偽値にしてください`);
          if (value)
            throw new Error(
              "デカール・ゴースト・段付きキー・突起には未対応です",
            );
        } else if (strings.has(key)) {
          if (typeof value !== "string")
            throw new Error(`${key}は文字列にしてください`);
        } else if (key === "fa") {
          if (
            !Array.isArray(value) ||
            !value.every((v) => typeof v === "number" && Number.isFinite(v))
          )
            throw new Error("faは数値配列にしてください");
        } else throw new Error(`未対応のキー属性：${key}`);
      }
    });
  });
  if (count < 1 || count > 200)
    throw new Error("キー数は1〜200個にしてください");
  let keyboard;
  try {
    keyboard = Serial.deserialize(rows);
  } catch {
    throw new Error("KLEの行・属性の並びを確認してください");
  }
  const minX = Math.min(...keyboard.keys.map((k) => k.x + Math.min(0, k.x2))),
    minY = Math.min(...keyboard.keys.map((k) => k.y));
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  const keys: LayoutKey[] = keyboard.keys.map((k, i) => {
    if (k.rotation_angle !== 0)
      throw new Error(`${i + 1}番目：回転キーには未対応です`);
    const nonRect =
      k.x2 !== 0 ||
      k.y2 !== 0 ||
      k.width2 !== k.width ||
      k.height2 !== k.height;
    const isoEnter =
      (k.width === 1.25 &&
        k.height === 2 &&
        k.x2 === -0.25 &&
        k.y2 === 0 &&
        k.width2 === 1.5 &&
        k.height2 === 1) ||
      (k.width === 1.5 &&
        k.height === 1 &&
        k.x2 === 0.25 &&
        k.y2 === 0 &&
        k.width2 === 1.25 &&
        k.height2 === 2);
    if (nonRect && !isoEnter)
      throw new Error(
        `${i + 1}番目：この非長方形キーには未対応です（対応：JIS/ISO Enter）`,
      );
    if (k.decal || k.ghost || k.stepped || k.nub)
      throw new Error(`${i + 1}番目：装飾・段付きキーには未対応です`);
    if (k.labels.slice(9).some(Boolean))
      throw new Error(`${i + 1}番目：側面のレジェンドには未対応です`);
    const labels = k.labels.slice(0, 9).filter(Boolean);
    if (labels.length !== rawLegendCounts[i])
      throw new Error(
        `${i + 1}番目：この文字配置ではレジェンドを取り込めません`,
      );
    if (labels.length > 2)
      throw new Error(`${i + 1}番目：文字はメイン・サブの2つまでです`);
    if (labels.some((s) => s.length > 80))
      throw new Error(`${i + 1}番目：80文字以内のレジェンドにしてください`);
    // KLE positions are read top-to-bottom. With two legends the upper is sub, lower is main.
    const label = labels.at(-1) ?? "",
      sub = labels.length === 2 ? labels[0] : "";
    const shape = isoEnter
      ? "iso-enter"
      : k.width >= 3 && (!label.trim() || /^space$/i.test(label))
        ? "space"
        : "standard";
    const role = /^(esc(ape)?|enter|return)$/i.test(label)
      ? "accent"
      : k.width !== 1 ||
          k.height !== 1 ||
          /^(tab|caps.*|shift|ctrl|control|alt|super|win|menu|backspace)$/i.test(
            label,
          )
        ? "modifier"
        : "base";
    return {
      id: `key-${String(i + 1).padStart(3, "0")}`,
      label,
      sub,
      x: round(k.x + (isoEnter ? Math.min(0, k.x2) : 0) - minX),
      y: round(k.y - minY),
      w: isoEnter ? 1.5 : k.width,
      h: isoEnter ? 2 : k.height,
      rotation: 0,
      row: Math.min(4, Math.max(0, Math.floor(k.y - minY))),
      role,
      shape,
    };
  });
  const layout: Layout = {
    id: "",
    version: 1,
    name: (typeof keyboard.meta.name === "string" && keyboard.meta.name.trim()
      ? keyboard.meta.name
      : "Imported layout"
    ).slice(0, 80),
    pitchMm: 19.05,
    width: round(Math.max(...keys.map((k) => k.x + k.w))),
    height: round(Math.max(...keys.map((k) => k.y + k.h))),
    keys,
  };
  validateLayout(layout);
  // Stable identifier for the immutable imported layout. Comparison also checks the full geometry.
  let hash = 2166136261;
  for (const c of JSON.stringify([layout.width, layout.height, keys]))
    hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  layout.id = `kle-${hash.toString(16).padStart(8, "0")}`;
  return layout;
}
