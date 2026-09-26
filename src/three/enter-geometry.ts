import {
  BufferGeometry,
  Float32BufferAttribute,
  ShapeUtils,
  Vector2,
} from "three";
import { enterOutline } from "../domain/key-shape";
/** Concave Enter needs polygon triangulation, never a fan across the missing corner. */
export function createEnterGeometry(
  pitch: number,
  height: number,
  tilt: number,
  topInset = 3.05,
) {
  const width = 1.5 * pitch,
    depth = 2 * pitch;
  const topY = (z: number) => height + tilt * z;
  // Round the outline without changing its vertex correspondence between rings.
  function contour(inset: number) {
    const corners = enterOutline(pitch, inset),
      points: Vector2[] = [];
    corners.forEach(([x, y], i) => {
      const c = new Vector2(x, y),
        prev = new Vector2(...corners[(i + 5) % 6]),
        next = new Vector2(...corners[(i + 1) % 6]);
      const radius = Math.min(
        0.65,
        c.distanceTo(prev) / 4,
        c.distanceTo(next) / 4,
      );
      const a = prev.sub(c).normalize().multiplyScalar(radius).add(c),
        b = next.sub(c).normalize().multiplyScalar(radius).add(c);
      for (let j = 0; j <= 6; j++) {
        const t = j / 6;
        points.push(
          a
            .clone()
            .multiplyScalar((1 - t) ** 2)
            .addScaledVector(c, 2 * t * (1 - t))
            .addScaledVector(b, t * t),
        );
      }
    });
    return points;
  }
  function geometry(
    rings: { inset: number; drop: number; base?: number }[],
    fill: boolean,
  ) {
    const pos: number[] = [],
      uv: number[] = [],
      grain: number[] = [],
      idx: number[] = [];
    const n = contour(rings[0].inset).length;
    rings.forEach((r) =>
      contour(r.inset).forEach((p) => {
        const x = p.x - width / 2,
          z = p.y - depth / 2,
          y = r.base ?? topY(z) - r.drop;
        pos.push(x, y, z);
        uv.push(
          (p.x - topInset) / (width - 2 * topInset),
          1 - (p.y - topInset) / (depth - 2 * topInset),
        );
        grain.push((x + y) / 4, (z + y) / 4);
      }),
    );
    for (let r = 0; r < rings.length - 1; r++)
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n,
          a = r * n + i,
          b = r * n + j,
          c = (r + 1) * n + i,
          d = (r + 1) * n + j;
        idx.push(a, c, b, b, c, d);
      }
    if (fill)
      for (const [a, b, c] of ShapeUtils.triangulateShape(
        contour(topInset),
        [],
      ))
        idx.push(a, c, b);
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
    g.setAttribute("uv1", new Float32BufferAttribute(grain, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const normals = g.getAttribute("normal"),
      start = fill ? 0 : pos.length / 3 - n;
    for (let i = start; i < pos.length / 3; i++)
      normals.setXYZ(
        i,
        0,
        1 / Math.hypot(1, tilt),
        -tilt / Math.hypot(1, tilt),
      );
    g.computeBoundingBox();
    return g;
  }
  const rings: { inset: number; drop: number; base?: number }[] = [
    { inset: 0.75, drop: 0, base: 0.1 },
    { inset: 0.45, drop: 0, base: 0.7 },
  ];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    rings.push({ inset: topInset - 0.65 * (1 - t), drop: 1.1 * (1 - t) ** 2 });
  }
  return {
    body: geometry(rings, false),
    top: geometry([{ inset: topInset, drop: 0 }], true),
  };
}
