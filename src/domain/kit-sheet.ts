import type { Study } from "./model";
import type { KitKey } from "./kit-schema";
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
function fullKitSheet(study: Study) {
  const kit = getKit(study);
  const keys: LayoutKey[] = [];
  const labels: SheetLabel[] = [];
  const overrides: Study["overrides"] = {};
  const functionKeys = kit.filter(
    (k) =>
      k.group !== "novelty" && /^F([1-9]|1[0-2])$/.test(clusterFunction(k)),
  );
  const navigation = kit.filter(
    (k) =>
      k.group !== "novelty" &&
      clusterSlots.some((slots) => slots.includes(clusterFunction(k))) &&
      clusterFunction(k) !== "",
  );
  const special = new Set([...functionKeys, ...navigation].map((k) => k.id));
  const base = kit.filter((k) => k.group === "base" && !special.has(k.id));
  // Individual group views use the same compact row packer, without composing another overview.
  function panel(
    items: KitKey[],
    group: KitKey["group"],
    x: number,
    y: number,
  ) {
    if (!items.length) return y;
    const part = kitSheet(
      { ...study, kit: items.map((k) => ({ ...k, group })) },
      group,
    );
    for (const k of part.study.layout!.keys)
      keys.push({ ...k, x: k.x + x, y: k.y + y });
    for (const label of part.labels) {
      if (group === "numpad" && label.text !== kitGroups.numpad) continue;
      labels.push({
        ...label,
        x: label.x + x + (group === "numpad" ? 1.4 : 0),
        y: label.y + y,
      });
    }
    return Math.max(...part.study.layout!.keys.map((k) => k.y + k.h + y));
  }
  const fCounts = new Map<string, number>();
  for (const k of functionKeys) {
    const name = clusterFunction(k),
      n = Number(name.slice(1)) - 1;
    const variant = fCounts.get(name) ?? 0;
    fCounts.set(name, variant + 1);
    keys.push({
      ...k,
      x: 3.4 + n + Math.floor(n / 4) * 0.5,
      y: 0.9 + variant,
      rotation: 0,
    });
  }
  const fHeight = Math.max(0, ...fCounts.values());
  const topRows = Math.max(
    fHeight,
    navigation.some((k) => clusterSlots[0].includes(clusterFunction(k)))
      ? 1
      : 0,
  );
  const baseTop = topRows ? topRows + 0.5 : 0;
  const baseEnd = panel(base, "base", 0, baseTop);
  const baseKeys = keys.filter((k) => base.some((b) => b.id === k.id));
  const baseRight = Math.max(16.4, ...baseKeys.map((k) => k.x + k.w));
  const mainY = baseTop + 0.9;
  const extras = kit.filter((k) => k.group === "extras" && !special.has(k.id));
  const jisNames = new Set([
    "半角/全角",
    "^",
    "¥",
    "@",
    ":",
    "]",
    "ろ",
    "無変換",
    "変換",
    "かな",
  ]);
  const jis = extras.filter(
    (k) =>
      k.shape !== "space" &&
      (jisNames.has(k.label) ||
        k.shape === "iso-enter" ||
        (k.label === "Backspace" && k.w === 1)),
  );
  const jisKeys: LayoutKey[] = [];
  const jisX = baseRight + 0.5;
  for (const k of jis) {
    let x = jisX;
    const py = mainY + Math.max(0, k.row);
    while (true) {
      const hit = jisKeys.find(
        (a) =>
          x < a.x + a.w - 1e-6 &&
          x + k.w > a.x + 1e-6 &&
          py < a.y + a.h - 1e-6 &&
          py + k.h > a.y + 1e-6,
      );
      if (!hit) break;
      x = hit.x + hit.w;
    }
    const placed = { ...k, x, y: py, rotation: 0 };
    jisKeys.push(placed);
    keys.push(placed);
  }
  if (jis.length) labels.push({ x: jisX, y: baseTop, text: "JIS", width: 3 });
  const navX = jis.length
    ? Math.max(...jisKeys.map((k) => k.x + k.w)) + 0.5
    : jisX;
  let sideEnd = Math.max(baseEnd, ...jisKeys.map((k) => k.y + k.h));
  // Keep the familiar print row, navigation block and inverted T in the middle column.
  const navStarts = [0.9, mainY, mainY + 3];
  const overflowStart = mainY + 5.5;
  let overflowY = overflowStart;
  clusterSlots.forEach((slots, cluster) => {
    const buckets = slots.map((name) =>
      navigation.filter((k) => clusterFunction(k) === name),
    );
    for (
      let variant = 0;
      variant < Math.max(...buckets.map((b) => b.length));
      variant++
    ) {
      const top = variant ? overflowY : navStarts[cluster];
      buckets.forEach((bucket, slot) => {
        const k = bucket[variant];
        if (!k) return;
        const placed = {
          ...k,
          x: navX + (slot % 3),
          y: top + Math.floor(slot / 3),
          rotation: 0,
        };
        keys.push(placed);
        sideEnd = Math.max(sideEnd, placed.y + placed.h);
      });
      if (variant) overflowY += Math.ceil(slots.length / 3) + 0.5;
    }
  });
  const numpad = kit.filter((k) => k.group === "numpad" && !special.has(k.id));
  sideEnd = Math.max(
    sideEnd,
    panel(numpad, "numpad", navX + 3.5 - 1.4, baseTop),
  );
  const spaces = extras.filter((k) => k.shape === "space");
  const bottom = extras.filter(
    (k) => k.shape !== "space" && k.row >= 3 && !jis.includes(k),
  );
  const rest = extras.filter(
    (k) => !spaces.includes(k) && !bottom.includes(k) && !jis.includes(k),
  );
  let lowerY = baseEnd + 0.3;
  // Limit these rows to the main typing block, then align spacebar alternatives to its spacebar.
  function below(items: KitKey[], space = false) {
    if (!items.length) return;
    const left = space
      ? (baseKeys.find((k) => k.shape === "space")?.x ?? 4.4)
      : 1.4;
    const packed = kitSheet(
      { ...study, kit: items.map((k) => ({ ...k, placement: undefined })) },
      "extras",
    );
    const rowGroups = new Map<number, LayoutKey[]>();
    for (const k of packed.study.layout!.keys) {
      const row = rowGroups.get(k.y) ?? [];
      row.push(k);
      rowGroups.set(k.y, row);
    }
    for (const row of rowGroups.values()) {
      let x = left,
        rowHeight = 1;
      labels.push({
        x: 0,
        y: lowerY + 0.25,
        text: space
          ? "Space"
          : rowName(row[0].row, study.profile ?? defaultProfile),
        width: 1.2,
      });
      for (const k of row) {
        if (x + k.w > baseRight && x > left) {
          lowerY += rowHeight;
          x = left;
          rowHeight = 1;
        }
        keys.push({ ...k, x, y: lowerY });
        x += k.w;
        rowHeight = Math.max(rowHeight, k.h);
      }
      lowerY += rowHeight;
    }
  }
  below(bottom);
  below(spaces, true);
  // Other row variants follow below the main block; the existing packer retains tall-key spans.
  lowerY = panel(rest, "extras", 0, Math.max(lowerY, sideEnd) + 0.3);
  const novelty = kit.filter((k) => k.group === "novelty");
  panel(novelty, "novelty", 0, Math.max(lowerY, sideEnd) + 0.5);
  for (const k of kit)
    overrides[k.id] = { ...kitArtwork(study, k), role: k.role };
  const layout = {
    id: "kit-sheet",
    version: 1,
    name: "セット展開図",
    pitchMm: 19.05,
    width: Math.max(24.4, ...keys.map((k) => k.x + k.w + 0.5)),
    height: Math.max(2, ...keys.map((k) => k.y + k.h + 0.7)),
    keys,
  };
  return {
    study: {
      ...study,
      kit: undefined,
      layoutId: layout.id,
      layout,
      overrides,
    } as Study,
    labels,
    kit,
  };
}

export function kitSheet(study: Study, filter: string = "all") {
  if (
    filter === "all" &&
    getKit(study).some(
      (k) =>
        k.group === "base" &&
        !/^F\d+$/.test(clusterFunction(k)) &&
        !clusterSlots.flat().includes(clusterFunction(k)),
    )
  )
    return fullKitSheet(study);

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
