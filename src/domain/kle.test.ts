import { it, expect } from "vitest";
import { parseKLE } from "./kle";
import {
  samples,
  resolveKeys,
  parseLibrary,
  duplicateStudy,
  sameLayout,
  type Study,
} from "./model";
import {
  serialize,
  loadLibrary,
  saveLibrary,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "../storage/library";
import { renderSvg, svgDimensions, pngDimensions } from "../renderer/svg";
import { createKeyGeometry, keyPosition } from "../three/profile";
import { configureCamera, layoutFrameScale } from "../three/camera";
import { ANGLED, TOP, VIEW_ASPECT } from "../three/settings";
import { PerspectiveCamera, OrthographicCamera, Vector3 } from "three";
const fixture = [
  { name: "テスト配列" },
  ["Esc", { w: 1.5 }, "Tab", { x: 0.5, h: 2 }, "Enter"],
  [{ x: 0.25 }, "Q", "W"],
  [{ y: 0.25, w: 3 }, "Space"],
];
const custom = (): Study => {
  const layout = parseKLE(JSON.stringify(fixture));
  return {
    ...structuredClone(samples[0]),
    schemaVersion: 2,
    id: "custom-test",
    layoutId: layout.id,
    layout,
    overrides: {},
  };
};
it("interprets KLE offsets, row reset and one-shot key dimensions", () => {
  const layout = custom().layout!;
  expect(layout.keys.map((k) => [k.x, k.y, k.w, k.h])).toEqual([
    [0, 0, 1, 1],
    [1, 0, 1.5, 1],
    [3, 0, 1, 2],
    [0.25, 1, 1, 1],
    [1.25, 1, 1, 1],
    [0, 2.25, 3, 1],
  ]);
  expect([layout.width, layout.height]).toEqual([4, 3.25]);
  expect(layout.keys.map((k) => k.row)).toEqual([0, 0, 0, 1, 1, 2]);
  expect(layout.keys.at(-1)?.shape).toBe("space");
  expect(parseKLE(JSON.stringify(fixture)).id).toBe(layout.id);
});
it("normalizes shifted clusters and maps Japanese and shifted legends to plain text", () => {
  const layout = parseKLE(
    JSON.stringify([[{ rx: 2, ry: 3, a: 4 }, "!\n1", "喫茶", "<b>"]]),
  );
  expect(layout.keys[0]).toMatchObject({ x: 0, y: 0, label: "1", sub: "!" });
  expect(layout.keys[1].label).toBe("喫茶");
  const s = { ...custom(), layout, layoutId: layout.id };
  expect(renderSvg(s)).toContain("&lt;b&gt;");
});
it("rejects unsupported shapes and malformed geometry with useful reasons", () => {
  for (const [input, message] of [
    [[[{ r: 15 }, "A"]], "回転"],
    [[[{ w: 0 }, "A"]], "幅"],
    [[[{ x2: -0.25, w2: 1.5 }, "Enter"]], "非長方形"],
    [[[{ d: true }, "A"]], "未対応"],
    [[["A", { x: -1 }, "B"]], "重な"],
    [[[]], "キー数"],
    [[[{ a: 8 }, "A"]], "文字配置"],
    [[[{ w: "2" }, "A"]], "数値"],
    [[[{ unknown: 1 }, "A"]], "未対応"],
    [[[{ x: 50 }, "A", { x: 50 }, "B"]], "40u"],
    [[Array(201).fill("A")], "200"],
  ] as const)
    expect(() => parseKLE(JSON.stringify(input))).toThrow(message);
  expect(() => parseKLE("not JSON")).toThrow("JSON");
});
it("round trips embedded layouts and overrides, preserving legacy data during migration", () => {
  const s = custom();
  s.overrides["key-003"] = { main: "決定", color: "#123456" };
  const copy = duplicateStudy(s);
  copy.layout!.keys[0].label = "Changed";
  expect(s.layout!.keys[0].label).toBe("Esc");
  expect(parseLibrary(serialize([samples[0], s])).studies).toEqual([
    samples[0],
    s,
  ]);
  const old = JSON.stringify({ schemaVersion: 1, studies: samples });
  const map = new Map([[LEGACY_STORAGE_KEY, old]]);
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
  expect(loadLibrary(storage)).toEqual(samples);
  saveLibrary(storage, [s]);
  expect(map.get(LEGACY_STORAGE_KEY)).toBe(old);
  expect(map.has(STORAGE_KEY)).toBe(true);
  expect(loadLibrary(storage)).toEqual([s]);
  expect(sameLayout(s, duplicateStudy(s))).toBe(true);
  expect(sameLayout(s, samples[0])).toBe(false);
  const changed = duplicateStudy(s);
  changed.layout!.keys[0].x = 0.1;
  expect(sameLayout(s, changed)).toBe(false);
  for (const bad of [
    { ...s, layoutId: "wrong" },
    { ...s, layout: undefined },
    { ...s, overrides: { unknown: { main: "A" } } },
    {
      ...s,
      layout: { ...s.layout!, keys: [s.layout!.keys[0], s.layout!.keys[0]] },
    },
  ])
    expect(() => parseLibrary(serialize([bad]))).toThrow();
});
it("uses the same key positions and dimensions for SVG and 3D, with safe PNG dimensions", () => {
  const s = custom(),
    layout = s.layout!,
    svg = renderSvg(s);
  expect(svgDimensions(s)).toEqual({ width: 288, height: 243 });
  expect(svg.match(/data-key-id=/g)).toHaveLength(6);
  expect(svg).toContain('transform="translate(207 27)"');
  for (const key of resolveKeys(s)) {
    const [x, , z] = keyPosition(key, layout);
    expect(x).toBeCloseTo((key.x + key.w / 2 - layout.width / 2) * 19.05);
    expect(z).toBeCloseTo((key.y + key.h / 2 - layout.height / 2) * 19.05);
    const g = createKeyGeometry(key);
    expect(g.dimensions.depth).toBeCloseTo(key.h * 19.05 - 0.9);
    g.body.dispose();
    g.top.dispose();
  }
  const tall = parseKLE(
      JSON.stringify(Array.from({ length: 20 }, () => ["A"])),
    ),
    vertical = { ...s, layout: tall, layoutId: tall.id };
  const png = pngDimensions(vertical, 3792);
  expect(png.height).toBeLessThanOrEqual(8192);
  expect(png.width * png.height).toBeLessThanOrEqual(16_010_000);
});
it("fits compact, wide, tall and 100-key layouts in both default camera presets", () => {
  for (const raw of [
    fixture,
    Array.from({ length: 10 }, () => Array(10).fill("A")),
    [Array(40).fill("A")],
    Array.from({ length: 20 }, () => ["A"]),
  ]) {
    const layout = parseKLE(JSON.stringify(raw));
    for (const [cam, pose] of [
      [new PerspectiveCamera(), ANGLED],
      [new OrthographicCamera(), TOP],
    ] as const) {
      configureCamera(cam, pose, VIEW_ASPECT, layoutFrameScale(layout));
      let max = 0;
      for (const key of layout.keys) {
        const geo = createKeyGeometry(key),
          offset = new Vector3(...keyPosition(key, layout));
        for (const part of [geo.body, geo.top]) {
          const p = part.getAttribute("position");
          for (let i = 0; i < p.count; i++) {
            const point = new Vector3()
              .fromBufferAttribute(p, i)
              .add(offset)
              .project(cam);
            max = Math.max(max, Math.abs(point.x), Math.abs(point.y));
          }
          part.dispose();
        }
      }
      expect(max).toBeLessThan(1);
    }
  }
});
