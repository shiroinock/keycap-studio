import type { Layout } from "./layout";
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
