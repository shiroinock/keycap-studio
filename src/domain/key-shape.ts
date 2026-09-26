import type { LayoutKey } from "./layout";
export type KeyShape = Pick<LayoutKey, "x" | "y" | "w" | "h" | "shape">;
/** ISO/JIS Enter: 1.5u top bar, 1.25u lower stem, total height 2u. */
export function keyRects(k: KeyShape) {
  return k.shape === "iso-enter"
    ? [
        { x: k.x, y: k.y, w: 1.5, h: 1 },
        { x: k.x + 0.25, y: k.y + 1, w: 1.25, h: 1 },
      ]
    : [{ x: k.x, y: k.y, w: k.w, h: k.h }];
}
/** Clockwise in screen coordinates; inset also widens the concave notch. */
export function enterOutline(unit: number, inset: number): [number, number][] {
  return [
    [inset, inset],
    [1.5 * unit - inset, inset],
    [1.5 * unit - inset, 2 * unit - inset],
    [0.25 * unit + inset, 2 * unit - inset],
    [0.25 * unit + inset, unit - inset],
    [inset, unit - inset],
  ];
}
export function enterClipPath(unit: number, inset: number) {
  return `polygon(${enterOutline(unit, inset)
    .map(
      ([x, y]) =>
        `${((x - inset) / (1.5 * unit - 2 * inset)) * 100}% ${((y - inset) / (2 * unit - 2 * inset)) * 100}%`,
    )
    .join(",")})`;
}
