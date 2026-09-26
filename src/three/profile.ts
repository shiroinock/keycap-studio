import { BufferGeometry, Float32BufferAttribute } from "three";
import type { ResolvedKey } from "../domain/model";
import { ansi60 } from "../domain/layout";
export const PROFILE_ID = "studio-sculpted-v1";
export const PROFILE_NAME = "Studio Sculpted v1（概形）";
// Original visual study, millimetres. Not a manufacturer-compatible CAD model.
export const ROWS = [
  { height: 10.8, tilt: -0.13 },
  { height: 9.5, tilt: -0.08 },
  { height: 8.4, tilt: 0 },
  { height: 8.7, tilt: 0.1 },
  { height: 9.6, tilt: 0.16 },
];
export function keyDimensions(
  key: Pick<ResolvedKey, "w" | "h" | "row" | "id">,
) {
  const row = ROWS[key.row];
  if (!row) throw new Error("プロファイルの行が不正です");
  const width = key.w * ansi60.pitchMm - 0.9,
    depth = key.h * ansi60.pitchMm - 0.9;
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(depth) ||
    width <= 6 ||
    depth <= 6
  )
    throw new Error("キー寸法が不正です");
  return {
    width,
    depth,
    topWidth: width - 5.2,
    topDepth: depth - 5.2,
    height: key.id === "space" ? 8.5 : row.height,
    tilt: key.id === "space" ? 0.08 : row.tilt,
    dish: key.id === "space" ? -0.4 : 0.7,
  };
}
export function keyPosition(
  key: Pick<ResolvedKey, "x" | "y" | "w" | "h">,
): [number, number, number] {
  return [
    (key.x + key.w / 2 - ansi60.width / 2) * ansi60.pitchMm,
    0,
    (key.y + key.h / 2 - ansi60.height / 2) * ansi60.pitchMm,
  ];
}
function perimeter(w: number, d: number, r: number) {
  const points: [number, number][] = [];
  // Counterclockwise in x/z viewed from +y? Mesh winding is set explicitly below.
  for (let corner = 0; corner < 4; corner++) {
    const cx = corner === 0 || corner === 3 ? w / 2 - r : -w / 2 + r;
    const cz = corner < 2 ? d / 2 - r : -d / 2 + r;
    for (let step = 0; step <= 8; step++) {
      const angle = ((corner * 90 + (step * 90) / 8) * Math.PI) / 180;
      points.push([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);
    }
  }
  return points;
}
export function createKeyGeometry(
  key: Pick<ResolvedKey, "w" | "h" | "row" | "id">,
) {
  const d = keyDimensions(key);
  const surface = (_x: number, z: number) =>
    d.height + d.tilt * z - d.dish * (1 - (z / (d.topDepth / 2)) ** 2);
  function build(
    rings: {
      w: number;
      depth: number;
      radius: number;
      y: (x: number, z: number) => number;
    }[],
    top: boolean,
  ) {
    const p: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    const n = 36;
    rings.forEach((r) =>
      perimeter(r.w, r.depth, r.radius).forEach(([x, z]) => {
        p.push(x, r.y(x, z), z);
        uv.push(x / d.topWidth + 0.5, 0.5 - z / d.topDepth);
      }),
    );
    for (let ring = 0; ring < rings.length - 1; ring++)
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n,
          a = ring * n + i,
          b = ring * n + j,
          c = (ring + 1) * n + i,
          e = (ring + 1) * n + j;
        indices.push(a, c, b, b, c, e);
      }
    if (top) {
      const center = p.length / 3;
      p.push(0, surface(0, 0), 0);
      uv.push(0.5, 0.5);
      const last = (rings.length - 1) * n;
      for (let i = 0; i < n; i++)
        indices.push(last + i, center, last + ((i + 1) % n));
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    g.computeBoundingBox();
    return g;
  }
  const body = build(
    [
      { w: d.width - 0.7, depth: d.depth - 0.7, radius: 1.3, y: () => 0.1 },
      { w: d.width, depth: d.depth, radius: 1.5, y: () => 0.7 },
      {
        w: d.topWidth + 0.65,
        depth: d.topDepth + 0.65,
        radius: 1.5,
        y: (x, z) => surface(x, z) - 0.65,
      },
      { w: d.topWidth, depth: d.topDepth, radius: 1.7, y: surface },
    ],
    false,
  );
  const top = build(
    Array.from({ length: 9 }, (_, i) => {
      const scale = 1 - i * 0.11;
      return {
        w: d.topWidth * scale,
        depth: d.topDepth * scale,
        radius: Math.min(1.7 * scale, (d.topDepth * scale) / 2),
        y: surface,
      };
    }),
    true,
  );
  return { body, top, dimensions: d };
}
