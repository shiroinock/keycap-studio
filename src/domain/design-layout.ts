import { type Layout } from "./layout";
import { getLayout, type Study, type KeyOverride } from "./model";
import { layoutPresets } from "./presets";

/** Identity follows the original key function, never editable artwork or ordinal IDs. */
export function designKeyIds(layout: Layout): Map<string, string> {
  const occurrences = new Map<string, number>();
  const grid = layout.id.startsWith("preset-grid-");
  const num = layout.keys.find((k) => k.label === "Num");
  const padLabels = new Set([
    "Num",
    "/",
    "*",
    "-",
    "+",
    "Enter",
    ".",
    ..."0123456789",
  ]);
  const ids = new Map<string, string>();
  for (const key of [...layout.keys].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (grid || (!key.label && key.shape !== "space" && key.id !== "space")) {
      ids.set(key.id, JSON.stringify(["layout", layout.id, key.id]));
      continue;
    }
    const pad =
      !!num && key.x >= num.x && key.y >= num.y && padLabels.has(key.label);
    const label =
      key.shape === "space" || key.id === "space" ? "Space" : key.label;
    const base = JSON.stringify([pad ? "numpad" : "main", label]);
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    ids.set(key.id, JSON.stringify([base, occurrence]));
  }
  return ids;
}
export function switchLayout(study: Study, target: Layout): Study {
  const source = getLayout(study);
  const bank: Record<string, KeyOverride> = structuredClone(
    study.designKeys ?? {},
  );
  // The currently visible edits are authoritative, including explicit resets.
  for (const [id, identity] of designKeyIds(source)) {
    delete bank[identity];
    if (study.overrides[id])
      bank[identity] = structuredClone(study.overrides[id]);
  }
  const overrides: Record<string, KeyOverride> = {};
  for (const [id, identity] of designKeyIds(target)) {
    if (bank[identity]) overrides[id] = structuredClone(bank[identity]);
  }
  const layouts = [...(study.layouts ?? []), source, target].filter(
    (l, i, all) => all.findIndex((a) => a.id === l.id) === i,
  );
  return {
    ...study,
    schemaVersion: 3,
    layoutId: target.id,
    layout: structuredClone(target),
    layouts: structuredClone(layouts),
    designKeys: bank,
    overrides,
  };
}
export function availableLayouts(study: Study): Layout[] {
  return [
    getLayout(study),
    ...(study.layouts ?? []),
    ...layoutPresets.map((p) => p.layout),
  ].filter((l, i, all) => all.findIndex((a) => a.id === l.id) === i);
}
