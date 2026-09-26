import { expect, it } from "vitest";
import { Vector3 } from "three";
import { layoutPresets } from "./presets";
import { validateLayout } from "./layout";
import { parseKLE } from "./kle";
import { createKeyGeometry } from "../three/profile";
const find = (id: string) =>
  layoutPresets.find((p) => p.layout.id === id)!.layout;
it("includes HHKB 6u and six regional layouts with correct clusters", () => {
  const hhkb = find("preset-hhkb-6u-v1");
  expect(hhkb.keys).toHaveLength(60);
  expect(hhkb.keys.filter((k) => k.y === 4).map((k) => [k.x, k.w])).toEqual([
    [1.5, 1],
    [2.5, 1.5],
    [4, 6],
    [10, 1.5],
    [11.5, 1],
  ]);
  for (const [source, count] of [
    ["60_jis", 65],
    ["tkl_jis", 91],
    ["fullsize_jis", 109],
    ["60_iso", 62],
    ["tkl_iso", 88],
    ["fullsize_iso", 105],
  ] as const) {
    const layout = find("preset-" + source + "-v1");
    expect(layout.keys).toHaveLength(count);
    expect(layout.keys.filter((k) => k.shape === "iso-enter")).toHaveLength(1);
    expect(layout.keys.find((k) => k.shape === "iso-enter")).toMatchObject({
      x: 13.5,
      w: 1.5,
      h: 2,
      label: "Enter",
    });
  }
});
it("accepts a key beside the Enter stem but rejects an actual overlap", () => {
  const layout = structuredClone(find("preset-60_iso-v1"));
  expect(() => validateLayout(layout)).not.toThrow();
  const adjacent = layout.keys.find((k) => k.label === "#")!;
  adjacent.w += 0.1;
  expect(() => validateLayout(layout)).toThrow();
});
it("imports both standard KLE encodings of ISO Enter", () => {
  const a = parseKLE(
    JSON.stringify([
      [{ x: 0.25, w: 1.25, h: 2, x2: -0.25, w2: 1.5, h2: 1 }, "Enter"],
    ]),
  );
  const b = parseKLE(
    JSON.stringify([[{ w: 1.5, h: 1, x2: 0.25, w2: 1.25, h2: 2 }, "Enter"]]),
  );
  for (const layout of [a, b]) {
    expect(layout.keys[0]).toMatchObject({
      x: 0,
      y: 0,
      w: 1.5,
      h: 2,
      shape: "iso-enter",
    });
    expect([layout.width, layout.height]).toEqual([1.5, 2]);
  }
});
it("triangulates an upward Enter top without filling its lower-left notch", () => {
  const key = find("preset-60_iso-v1").keys.find(
    (k) => k.shape === "iso-enter",
  )!;
  const { top, body } = createKeyGeometry(key);
  const p = top.getAttribute("position"),
    indices = top.index!;
  const vertex = (i: number) => new Vector3().fromBufferAttribute(p, i);
  for (let i = 0; i < indices.count; i += 3) {
    const a = vertex(indices.getX(i)),
      b = vertex(indices.getX(i + 1)),
      c = vertex(indices.getX(i + 2));
    expect(b.clone().sub(a).cross(c.clone().sub(a)).y).toBeGreaterThan(0);
    for (let u = 0; u <= 10; u++)
      for (let v = 0; v <= 10 - u; v++) {
        const q = a
          .clone()
          .multiplyScalar(u / 10)
          .addScaledVector(b, v / 10)
          .addScaledVector(c, 1 - (u + v) / 10);
        expect(q.x < -0.5 * 19.05 && q.z > 0).toBe(false);
      }
  }
  const bp = body.getAttribute("position");
  expect([...bp.array].every(Number.isFinite)).toBe(true);
  for (let i = 0; i < p.count; i++) {
    expect(
      vertex(i).distanceTo(
        new Vector3().fromBufferAttribute(bp, bp.count - p.count + i),
      ),
    ).toBeLessThan(0.00001);
  }
  top.dispose();
  body.dispose();
});
