import type { Study } from "./model";
import type { LayoutKey } from "./layout";
import { getKit, kitArtwork } from "./kit";
import { defaultProfile, rowName } from "./profiles";
import { esc, keyMarkup, UNIT, PAD } from "../renderer/svg";
import { resolveKeys } from "./model";
export const kitGroups = {
  base: "ベース",
  extras: "追加キー",
  numpad: "テンキー",
  novelty: "ノベルティ",
};
export type SheetLabel = { x: number; y: number; text: string; width: number };
export function kitSheet(study: Study, filter: string = "all") {
  const kit = getKit(study).filter(
    (k) => filter === "all" || k.group === filter,
  );
  const keys: LayoutKey[] = [],
    overrides: Study["overrides"] = {},
    labels: SheetLabel[] = [];
  let y = 0,
    width = 20;
  for (const group of Object.keys(kitGroups) as (keyof typeof kitGroups)[]) {
    const items = kit.filter((k) => k.group === group);
    if (!items.length) continue;
    labels.push({ x: 0, y, text: kitGroups[group], width: 6 });
    y += 0.9;
    const placed = items.every((k) => k.placement);
    if (placed) {
      const minX = Math.min(...items.map((k) => k.placement!.x)),
        minY = Math.min(...items.map((k) => k.placement!.y));
      const rowYs = new Set<number>();
      for (const k of items) {
        const x = k.placement!.x - minX + 1.4,
          py = k.placement!.y - minY + y;
        keys.push({ ...k, x, y: py, rotation: 0 });
        width = Math.max(width, x + k.w + 0.5);
        if (!rowYs.has(py)) {
          labels.push({
            x: 0,
            y: py + 0.25,
            text: rowName(k.row, study.profile ?? defaultProfile),
            width: 1.2,
          });
          rowYs.add(py);
        }
      }
      y += Math.max(...items.map((k) => k.placement!.y - minY + k.h)) + 1;
    } else {
      const rowNames = [
        ...new Set(
          items.map((k) =>
            k.shape === "space"
              ? "Space"
              : rowName(k.row, study.profile ?? defaultProfile),
          ),
        ),
      ].sort();
      for (const row of rowNames) {
        let x = 1.4,
          bandHeight = 1;
        labels.push({ x: 0, y: y + 0.25, text: row, width: 1.2 });
        for (const k of items.filter(
          (k) =>
            (k.shape === "space"
              ? "Space"
              : rowName(k.row, study.profile ?? defaultProfile)) === row,
        )) {
          if (x + k.w > 20) {
            y += bandHeight + 0.35;
            x = 1.4;
            bandHeight = 1;
            labels.push({ x: 0, y: y + 0.25, text: row, width: 1.2 });
          }
          keys.push({ ...k, x, y, rotation: 0 });
          x += k.w + 0.12;
          bandHeight = Math.max(bandHeight, k.h);
        }
        y += bandHeight + 0.45;
      }
      y += 0.7;
    }
    for (const k of items)
      overrides[k.id] = { ...kitArtwork(study, k), role: k.role };
  }
  const layout = {
    id: "kit-sheet",
    version: 1,
    name: "セット展開図",
    pitchMm: 19.05,
    width,
    height: Math.max(2, y),
    keys,
  };
  const virtual: Study = {
    ...study,
    kit: undefined,
    layoutId: layout.id,
    layout,
    overrides,
  };
  return { study: virtual, labels, kit };
}
export function renderKitSvg(study: Study, filter = "all") {
  const sheet = kitSheet(study, filter),
    layout = sheet.study.layout!;
  const w = layout.width * UNIT + 2 * PAD,
    h = layout.height * UNIT + 2 * PAD;
  const rowLabels = sheet.labels
    .map(
      (l) =>
        `<text x="${PAD + l.x * UNIT}" y="${PAD + (l.y + 0.3) * UNIT}" fill="#666" font-family="sans-serif" font-size="14">${esc(l.text)}</text>`,
    )
    .join("");
  const quantities = sheet.kit
    .filter((k) => k.quantity > 1)
    .map((k) => {
      const key = layout.keys.find((a) => a.id === k.id)!;
      return `<text x="${PAD + (key.x + key.w) * UNIT - 5}" y="${PAD + (key.y + key.h) * UNIT - 7}" fill="#555" font-family="sans-serif" font-size="10" text-anchor="end">×${k.quantity}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#e5e3df"/>${rowLabels}${resolveKeys(
    sheet.study,
  )
    .map((k) => keyMarkup(k, sheet.study))
    .join("")}${quantities}</svg>`;
}
