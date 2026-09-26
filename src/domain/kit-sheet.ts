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
  const panels: {
    group: string;
    start: number;
    end: number;
    keys: LayoutKey[];
    labels: SheetLabel[];
  }[] = [];
  let y = 0,
    width = 24.4; // 22.5u full-size keyboard plus row labels and outer margin.
  for (const group of Object.keys(kitGroups) as (keyof typeof kitGroups)[]) {
    const items = kit.filter((k) => k.group === group);
    if (!items.length) continue;
    const start = y,
      keyStart = keys.length,
      labelStart = labels.length;
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
      const occupied: LayoutKey[] = [];
      for (const row of rowNames) {
        labels.push({ x: 0, y: y + 0.25, text: row, width: 1.2 });
        for (const k of items.filter(
          (k) =>
            (k.shape === "space"
              ? "Space"
              : rowName(k.row, study.profile ?? defaultProfile)) === row,
        )) {
          // A tall key reserves only its own columns on following rows.
          // Keep the 1u row pitch so a 2u key visibly spans exactly two rows.
          let x = 1.4;
          while (true) {
            const blocker = occupied.find(
              (a) =>
                x < a.x + a.w - 1e-6 &&
                x + k.w > a.x + 1e-6 &&
                y < a.y + a.h - 1e-6 &&
                y + k.h > a.y + 1e-6,
            );
            if (blocker) {
              x = blocker.x + blocker.w;
              continue;
            }
            if (
              x + k.w <=
              (group === "numpad" ? Math.max(5.4, 1.4 + k.w) : width - 0.5) +
                1e-6
            )
              break;
            y += 1;
            x = 1.4;
            labels.push({ x: 0, y: y + 0.25, text: row, width: 1.2 });
          }
          const key = { ...k, x, y, rotation: 0 };
          keys.push(key);
          occupied.push(key);
        }
        y += 1;
      }
      y = Math.max(y, ...occupied.map((k) => k.y + k.h));
      y += 0.7;
    }
    panels.push({
      group,
      start,
      end: y,
      keys: keys.slice(keyStart),
      labels: labels.slice(labelStart),
    });
    for (const k of items)
      overrides[k.id] = { ...kitArtwork(study, k), role: k.role };
  }
  const base = panels.find((p) => p.group === "base");
  const numpad = panels.find((p) => p.group === "numpad");
  if (base && numpad) {
    const right = Math.max(...base.keys.map((k) => k.x + k.w)) + 0.6;
    const padWidth = Math.max(...numpad.keys.map((k) => k.x + k.w));
    if (
      right + padWidth <= width - 0.5 &&
      numpad.end - numpad.start <= base.end - base.start
    ) {
      const dy = base.start - numpad.start;
      for (const k of numpad.keys) {
        k.x += right;
        k.y += dy;
      }
      for (const label of numpad.labels) {
        label.x += right;
        label.y += dy;
      }
      const height = numpad.end - numpad.start;
      for (const p of panels.filter((p) => p.start >= numpad.end)) {
        for (const k of p.keys) k.y -= height;
        for (const label of p.labels) label.y -= height;
      }
      y -= height;
    }
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
