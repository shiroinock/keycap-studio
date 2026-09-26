import { kitKeySchema, type KitKey } from "./kit-schema";
import type { LayoutKey } from "./layout";
export type BulkKitPatch = {
  color?: string;
  ink?: string;
  group?: KitKey["group"];
};
export function patchKitSelection(
  kit: KitKey[],
  ids: string[],
  patch: BulkKitPatch,
) {
  const selected = new Set(ids);
  return kit.map((key) => {
    if (!selected.has(key.id)) return key;
    return kitKeySchema.parse({
      ...key,
      ...(patch.group !== undefined
        ? { group: patch.group, placement: undefined }
        : {}),
      ...(patch.color !== undefined || patch.ink !== undefined
        ? {
            artwork: {
              ...key.artwork,
              ...(patch.color !== undefined ? { color: patch.color } : {}),
              ...(patch.ink !== undefined ? { ink: patch.ink } : {}),
            },
          }
        : {}),
    });
  });
}
export function sheetOrder(keys: LayoutKey[], sources: Record<string, string>) {
  return [
    ...new Set(
      [...keys]
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .map((k) => sources[k.id])
        .filter(Boolean),
    ),
  ];
}
export function rangeSelection(
  order: string[],
  anchor: string | null,
  target: string,
) {
  const a = anchor ? order.indexOf(anchor) : -1,
    b = order.indexOf(target);
  return a < 0 || b < 0
    ? [target]
    : order.slice(Math.min(a, b), Math.max(a, b) + 1);
}
export function boxSelection(
  keys: LayoutKey[],
  sources: Record<string, string>,
  box: { x: number; y: number; w: number; h: number },
) {
  return [
    ...new Set(
      keys
        .filter(
          (k) =>
            k.x < box.x + box.w &&
            k.x + k.w > box.x &&
            k.y < box.y + box.h &&
            k.y + k.h > box.y,
        )
        .map((k) => sources[k.id])
        .filter(Boolean),
    ),
  ];
}
