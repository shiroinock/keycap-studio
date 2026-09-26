import { describe, it, expect } from "vitest";
import { ansi60 } from "../domain/layout";
import { samples, resolveKeys } from "../domain/model";
import { createKeyGeometry, keyDimensions, keyPosition, ROWS } from "./profile";
import { textureSource } from "./artwork";
import { legendMarkup } from "../renderer/svg";
describe("3D geometry and artwork", () => {
  it("maps every key center and size from the 2D layout at the same pitch", () => {
    for (const k of ansi60.keys) {
      const [x, , z] = keyPosition(k);
      expect(x / 19.05 + 7.5).toBeCloseTo(k.x + k.w / 2);
      expect(z / 19.05 + 2.5).toBeCloseTo(k.y + k.h / 2);
      const d = keyDimensions(k);
      expect(d.width).toBeCloseTo(k.w * 19.05 - 0.9);
      expect(d.depth).toBeCloseTo(18.15);
      expect(d.width - d.topWidth).toBeCloseTo(5.2);
    }
    expect(new Set(ROWS.map((r) => r.height)).size).toBe(5);
    expect(
      keyDimensions(ansi60.keys.find((k) => k.id === "space")!).dish,
    ).toBeLessThan(0);
  });
  it("has finite indexed meshes with upward keytops and bounded, upright UVs", () => {
    for (const k of ansi60.keys) {
      const geo = createKeyGeometry(k);
      for (const g of [geo.top, geo.body]) {
        const p = g.getAttribute("position");
        expect([...p.array].every(Number.isFinite)).toBe(true);
        expect([...g.index!.array].every((i) => i >= 0 && i < p.count)).toBe(
          true,
        );
      }
      const uv = geo.top.getAttribute("uv"),
        n = geo.top.getAttribute("normal"),
        p = geo.top.getAttribute("position");
      for (let i = 0; i < uv.count; i++) {
        expect(uv.getX(i)).toBeGreaterThanOrEqual(0);
        expect(uv.getX(i)).toBeLessThanOrEqual(1);
        expect(uv.getY(i)).toBeCloseTo(
          0.5 - p.getZ(i) / geo.dimensions.topDepth,
        );
        expect(n.getY(i)).toBeGreaterThan(0);
      }
      geo.body.dispose();
      geo.top.dispose();
    }
  });
  it("joins the bevel and dish without position or normal seams, including long keys", () => {
    for (const key of [
      ansi60.keys[0],
      ansi60.keys.find((k) => k.id === "enter")!,
      ansi60.keys.find((k) => k.id === "space")!,
    ]) {
      const { body, top } = createKeyGeometry(key);
      const tp = top.getAttribute("position"),
        tn = top.getAttribute("normal"),
        bp = body.getAttribute("position"),
        bn = body.getAttribute("normal");
      const ring = (tp.count - 1) / 20;
      for (let i = 0; i < ring; i++)
        for (let axis = 0; axis < 3; axis++) {
          expect(bp.array[(bp.count - ring + i) * 3 + axis]).toBeCloseTo(
            tp.array[i * 3 + axis],
            5,
          );
          expect(bn.array[(bp.count - ring + i) * 3 + axis]).toBeCloseTo(
            tn.array[i * 3 + axis],
            5,
          );
        }
      const buv = body.getAttribute("uv1"),
        tuv = top.getAttribute("uv1");
      for (let i = 0; i < ring; i++) {
        expect(buv.getX(bp.count - ring + i)).toBeCloseTo(tuv.getX(i), 5);
        expect(buv.getY(bp.count - ring + i)).toBeCloseTo(tuv.getY(i), 5);
      }
      // The analytic surface normal must not depend on the fan's triangle direction.
      for (let i = 0; i < tp.count; i++) expect(tn.getX(i)).toBe(0);
      body.dispose();
      top.dispose();
    }
  });
  it("uses the same escaped Japanese legends and novelty artwork as SVG", () => {
    const study = structuredClone(samples[0]);
    study.overrides.enter = { main: "喫茶<&", sub: "夜の部", color: "#123456" };
    const key = resolveKeys(study).find((k) => k.id === "enter")!;
    const svg = decodeURIComponent(textureSource(key, study).split(",")[1]);
    expect(svg).toContain(legendMarkup(key, study, key.w * 60 - 6, 54));
    expect(svg).toContain("喫茶&lt;&amp;");
    expect(svg).toContain("#123456");
    study.overrides.enter.novelty = "moon";
    const novelty = resolveKeys(study).find((k) => k.id === "enter")!;
    expect(
      decodeURIComponent(textureSource(novelty, study).split(",")[1]),
    ).toContain(legendMarkup(novelty, study, key.w * 60 - 6, 54));
  });
});
