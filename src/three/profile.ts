import { BufferGeometry, Float32BufferAttribute } from "three";
import type { ResolvedKey } from "../domain/model";
import { ansi60, type Layout } from "../domain/layout";
export const PROFILE_ID = "studio-sculpted-v2";
export const PROFILE_NAME = "Studio Sculpted v2（概形）";
// Original visual study, millimetres. Not manufacturer-compatible CAD.
export const ROWS = [
  { height: 10.8, tilt: -0.13 },
  { height: 9.5, tilt: -0.08 },
  { height: 8.4, tilt: 0 },
  { height: 8.7, tilt: 0.1 },
  { height: 9.6, tilt: 0.16 },
];
export function keyDimensions(
  key: Pick<ResolvedKey, "w" | "h" | "row" | "id" | "shape">,
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
    height: key.shape === "space" || key.id === "space" ? 8.5 : row.height,
    tilt: key.shape === "space" || key.id === "space" ? 0.08 : row.tilt,
    dish: key.shape === "space" || key.id === "space" ? -0.4 : 0.7,
  };
}
export function keyPosition(
  key: Pick<ResolvedKey, "x" | "y" | "w" | "h">,
  layout: Layout = ansi60,
): [number, number, number] {
  return [
    (key.x + key.w / 2 - layout.width / 2) * layout.pitchMm,
    0,
    (key.y + key.h / 2 - layout.height / 2) * layout.pitchMm,
  ];
}
export function createKeyGeometry(
  key: Pick<ResolvedKey, "w" | "h" | "row" | "id" | "shape">,
) {
  const d = keyDimensions(key);
  const surface = (z: number) =>
    d.height + d.tilt * z - d.dish * (1 - (z / (d.topDepth / 2)) ** 2);
  const normal = (z: number) => {
    const dz = d.tilt + (8 * d.dish * z) / d.topDepth ** 2,
      length = Math.hypot(1, dz);
    return [0, 1 / length, -dz / length];
  };
  // Subdivide straight edges as well as corners: a long spacebar must not become a single giant triangle.
  const steps = [Math.ceil(d.topWidth / 2), Math.ceil(d.topDepth / 2)];
  function perimeter(w: number, depth: number, r: number) {
    const points: [number, number][] = [];
    for (let corner = 0; corner < 4; corner++) {
      const cx = corner === 0 || corner === 3 ? w / 2 - r : -w / 2 + r;
      const cz = corner < 2 ? depth / 2 - r : -depth / 2 + r;
      for (let i = 0; i <= 8; i++) {
        const angle = ((corner + i / 8) * Math.PI) / 2;
        points.push([cx + Math.cos(angle) * r, cz + Math.sin(angle) * r]);
      }
      const a = points[points.length - 1];
      const b: [number, number] =
        corner === 0
          ? [-w / 2 + r, depth / 2]
          : corner === 1
            ? [-w / 2, -depth / 2 + r]
            : corner === 2
              ? [w / 2 - r, -depth / 2]
              : [w / 2, depth / 2 - r];
      const count = steps[corner % 2];
      for (let i = 1; i < count; i++)
        points.push([
          a[0] + ((b[0] - a[0]) * i) / count,
          a[1] + ((b[1] - a[1]) * i) / count,
        ]);
    }
    return points;
  }
  type Ring = {
    w: number;
    depth: number;
    radius: number;
    y: (z: number) => number;
  };
  function build(rings: Ring[], top: boolean) {
    const p: number[] = [],
      uv: number[] = [],
      grainUV: number[] = [],
      indices: number[] = [];
    const n = perimeter(rings[0].w, rings[0].depth, rings[0].radius).length;
    rings.forEach((r) =>
      perimeter(r.w, r.depth, r.radius).forEach(([x, z]) => {
        const y = r.y(z);
        p.push(x, y, z);
        uv.push(x / d.topWidth + 0.5, 0.5 - z / d.topDepth);
        // Independent physical-scale grain coordinates, unaffected by legend UV or key width.
        grainUV.push((x + y) / 4, (z + y) / 4);
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
      p.push(0, surface(0), 0);
      uv.push(0.5, 0.5);
      grainUV.push(surface(0) / 4, surface(0) / 4);
      const last = (rings.length - 1) * n;
      for (let i = 0; i < n; i++)
        indices.push(last + i, center, last + ((i + 1) % n));
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.setAttribute("uv1", new Float32BufferAttribute(grainUV, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    const normals = g.getAttribute("normal");
    // Analytic dish normals eliminate fan-shaped specular facets, and share the exact normal at the bevel seam.
    const start = top ? 0 : p.length / 3 - n;
    for (let i = start; i < p.length / 3; i++) {
      const [x, y, z] = normal(p[i * 3 + 2]);
      normals.setXYZ(i, x, y, z);
    }
    g.computeBoundingBox();
    return g;
  }
  const bodyRings: Ring[] = [
    { w: d.width - 0.6, depth: d.depth - 0.6, radius: 1.3, y: () => 0.1 },
    { w: d.width - 0.12, depth: d.depth - 0.12, radius: 1.5, y: () => 0.35 },
    { w: d.width, depth: d.depth, radius: 1.55, y: () => 0.7 },
    {
      w: d.topWidth + 1.3,
      depth: d.topDepth + 1.3,
      radius: 1.8,
      y: (z) => surface(z) - 1.1,
    },
  ];
  // Quadratic fillet rolls the sloping wall into the dished top over eight bands.
  for (let i = 1; i <= 8; i++) {
    const t = i / 8,
      offset = 1.3 * (1 - t) ** 2 + 1.3 * t * (1 - t),
      drop = 1.1 * (1 - t) ** 2;
    bodyRings.push({
      w: d.topWidth + offset,
      depth: d.topDepth + offset,
      radius: 1.65 + 0.15 * (1 - t),
      y: (z) => surface(z) - drop,
    });
  }
  const body = build(bodyRings, false);
  const top = build(
    Array.from({ length: 20 }, (_, i) => {
      const scale = 1 - i * 0.049;
      return {
        w: d.topWidth * scale,
        depth: d.topDepth * scale,
        radius: 1.65 * scale,
        y: surface,
      };
    }),
    true,
  );
  return { body, top, dimensions: d };
}
