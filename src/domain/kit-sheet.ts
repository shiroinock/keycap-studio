import type { Study } from "./model";
import type { KitKey } from "./kit-schema";
import type { LayoutKey } from "./layout";
import { layoutPresets } from "./presets";
import { getKit, kitArtwork, layoutKit, kitSignature } from "./kit";
import { defaultProfile, rowName } from "./profiles";
import { esc, keyMarkup, UNIT, PAD } from "../renderer/svg";
import { resolveKeys } from "./model";
export const kitGroups = {
  base: "ベース",
  extras: "追加キー",
  numpad: "テンキー",
  novelty: "ノベルティ",
};

// Use the original function, not the editable legend, to retain cluster membership.
const clusterSlots = [
  ["Print", "Scroll", "Pause"],
  ["Insert", "Home", "PgUp", "Delete", "End", "PgDn"],
  ["", "↑", "", "←", "↓", "→"],
];
function clusterFunction(key: KitKey) {
  if (key.w !== 1 || key.h !== 1 || key.shape !== "standard") return "";
  try {
    const [base] = JSON.parse(key.identity);
    const [area, name] = JSON.parse(base);
    if (area !== "main") return "";
    const aliases: Record<string, string> = {
      Del: "Delete",
      Ins: "Insert",
      "Page Up": "PgUp",
      "Page Down": "PgDn",
      PageUp: "PgUp",
      PageDown: "PgDn",
      Up: "↑",
      Down: "↓",
      Left: "←",
      Right: "→",
      PrintScreen: "Print",
      ScrollLock: "Scroll",
    };
    return aliases[name] ?? name;
  } catch {
    return "";
  }
}

export type SheetLabel = { x: number; y: number; text: string; width: number };
export interface KitSheet {
  study: Study;
  labels: SheetLabel[];
  kit: KitKey[];
  sourceIds: Record<string, string>;
  missingIds: Set<string>;
}
function inventorySheet(study: Study): KitSheet {
  const inventory = getKit(study);
  const keys: LayoutKey[] = [],
    labels: SheetLabel[] = [],
    displayed: KitKey[] = [];
  const overrides: Study["overrides"] = {},
    sourceIds: Record<string, string> = {};
  const missingIds = new Set<string>(),
    used = new Set<string>();
  const shared = new Set<string>();
  let y = 0,
    width = 24.4;
  for (const [id, title] of [
    ["preset-fullsize_ansi-v1", "ANSI / 共通"],
    ["preset-fullsize_jis-v1", "JIS 差分"],
  ]) {
    const layout = layoutPresets.find((p) => p.layout.id === id)!.layout;
    const requirements = layoutKit(study, layout);
    const indices = requirements
      .map((key, i) => ({ key, i }))
      .filter(({ key }) => !shared.has(kitSignature(key, study)))
      .map(({ i }) => i);
    const minY = Math.min(...indices.map((i) => layout.keys[i].y));
    const consumed = new Map<string, number>();
    const label: SheetLabel = { x: 0, y, text: title, width: 15 };
    labels.push(label);
    const top = y + 0.9;
    let missing = 0;
    for (const i of indices) {
      const required = requirements[i];
      const owned = inventory.find(
        (k) =>
          kitSignature(k, study) === kitSignature(required, study) &&
          (consumed.get(k.id) ?? 0) < k.quantity,
      );
      const instanceId = `${id}:${i}`;
      const entry = { ...(owned ?? required), id: instanceId };
      displayed.push(entry);
      // Positions, shape and row come directly from the target layout.
      keys.push({
        ...layout.keys[i],
        id: instanceId,
        x: layout.keys[i].x + 1.4,
        y: layout.keys[i].y - minY + top,
        row: required.row,
      });
      if (owned) {
        consumed.set(owned.id, (consumed.get(owned.id) ?? 0) + 1);
        used.add(owned.id);
        sourceIds[instanceId] = owned.id;
        overrides[instanceId] = {
          ...kitArtwork(study, owned),
          role: owned.role,
        };
      } else {
        missing++;
        missingIds.add(instanceId);
        overrides[instanceId] = {
          main: required.label,
          sub: "未収録",
          color: "#d5d5d5",
          ink: "#707070",
          novelty: "none",
        };
      }
    }
    label.text += ` · 未収録 ${missing}`;
    for (const rowY of [...new Set(indices.map((i) => layout.keys[i].y))]) {
      const key = requirements[layout.keys.findIndex((k) => k.y === rowY)];
      labels.push({
        x: 0,
        y: top + rowY - minY + 0.25,
        text: rowName(key.row, study.profile ?? defaultProfile),
        width: 1.2,
      });
    }
    width = Math.max(width, layout.width + 1.9);
    y = top + layout.height - minY + 0.7;
    for (const key of requirements) shared.add(kitSignature(key, study));
  }
  // Retain every unshown size, row and novelty as an editable inventory item below.
  const remaining = inventory.filter((k) => !used.has(k.id));
  if (remaining.length) {
    const extra = kitSheet({ ...study, kit: remaining }, "inventory");
    labels.push({ x: 0, y, text: "その他の収録キー", width: 10 });
    y += 0.8;
    for (const key of extra.study.layout!.keys) {
      const instanceId = `extra:${key.id}`;
      keys.push({ ...key, id: instanceId, y: key.y + y });
      displayed.push({
        ...remaining.find((k) => k.id === key.id)!,
        id: instanceId,
      });
      sourceIds[instanceId] = key.id;
      overrides[instanceId] = extra.study.overrides[key.id];
    }
    labels.push(...extra.labels.map((l) => ({ ...l, y: l.y + y })));
    width = Math.max(width, extra.study.layout!.width);
    y += extra.study.layout!.height;
  }
  const layout = {
    id: "kit-sheet",
    version: 1,
    name: "収録キー一覧",
    pitchMm: 19.05,
    width,
    height: y,
    keys,
  };
  return {
    study: { ...study, kit: undefined, layoutId: layout.id, layout, overrides },
    labels,
    kit: displayed,
    sourceIds,
    missingIds,
  };
}
export function kitSheet(study: Study, filter: string = "all"): KitSheet {
  if (filter === "all") return inventorySheet(study);
  const kit = getKit(study).filter(
    (k) => filter === "inventory" || k.group === filter,
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
      const clusterKeys = items.filter(
        (k) =>
          clusterSlots.some((slots) => slots.includes(clusterFunction(k))) &&
          clusterFunction(k) !== "",
      );
      const ordinary = items.filter((k) => !clusterKeys.includes(k));
      const clusterX = ordinary.length ? width - 3.5 : 1.4;
      let clusterY = y;
      const occupied: LayoutKey[] = [];
      for (const slots of clusterSlots) {
        const buckets = slots.map((name) =>
          clusterKeys.filter((k) => clusterFunction(k) === name),
        );
        const variants = Math.max(...buckets.map((bucket) => bucket.length));
        for (let variant = 0; variant < variants; variant++) {
          buckets.forEach((bucket, slot) => {
            const k = bucket[variant];
            if (!k) return;
            const key = {
              ...k,
              x: clusterX + (slot % 3),
              y: clusterY + Math.floor(slot / 3),
              rotation: 0,
            };
            keys.push(key);
            occupied.push(key);
          });
          clusterY += Math.ceil(slots.length / 3) + 0.5;
        }
      }
      const rowNames = [
        ...new Set(
          ordinary.map((k) =>
            k.shape === "space"
              ? "Space"
              : rowName(k.row, study.profile ?? defaultProfile),
          ),
        ),
      ].sort();
      for (const row of rowNames) {
        labels.push({ x: 0, y: y + 0.25, text: row, width: 1.2 });
        for (const k of ordinary.filter(
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
              (group === "numpad"
                ? Math.max(5.4, 1.4 + k.w)
                : clusterKeys.length
                  ? clusterX - 0.6
                  : width - 0.5) +
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
  return {
    study: virtual,
    labels,
    kit,
    sourceIds: Object.fromEntries(kit.map((k) => [k.id, k.id])),
    missingIds: new Set(),
  };
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
