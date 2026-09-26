import { it, expect } from "vitest";
import { samples, parseLibrary, resolveKeys, duplicateStudy } from "./model";
import { getKit, kitCoverage, addKitKeys } from "./kit";
import { switchLayout } from "./design-layout";
import { layoutPresets } from "./presets";
import { serialize } from "../storage/library";
import { kitSheet, renderKitSvg } from "./kit-sheet";
import { createKeyGeometry } from "../three/profile";
const preset = (id: string) =>
  layoutPresets.find((p) => p.layout.id === id)!.layout;
it("keeps inventory separate from previews and adds only missing variants", () => {
  let s = switchLayout(samples[0], preset("preset-hhkb-6u-v1"));
  expect(getKit(s)).toHaveLength(61);
  const missing = kitCoverage(s).filter((r) => r.missing);
  expect(missing.some((r) => r.key.shape === "space" && r.key.w === 6)).toBe(
    true,
  );
  s = {
    ...s,
    kit: addKitKeys(
      s,
      missing.map((r) => ({
        ...r.key,
        quantity: r.missing,
        group: "extras",
        placement: undefined,
      })),
    ),
  };
  expect(kitCoverage(s).every((r) => r.missing === 0)).toBe(true);
  expect(getKit(s).some((k) => k.shape === "space" && k.w === 6.25)).toBe(true);
  const restored = parseLibrary(serialize([s])).studies[0];
  expect(restored.kit).toEqual(s.kit);
  const copy = duplicateStudy(s);
  copy.kit![0].quantity = 99;
  expect(s.kit![0].quantity).toBe(1);
});
it("retains kit-specific artwork in previews and separate visual variants", () => {
  let s = { ...structuredClone(samples[0]), kit: getKit(samples[0]) };
  const q = s.kit.find((k) => k.label === "Q")!;
  q.artwork = { main: "茶", color: "#123456" };
  expect(resolveKeys(s).find((k) => k.label === "Q")).toMatchObject({
    main: "茶",
    color: "#123456",
  });
  s = {
    ...s,
    kit: addKitKeys(s, [
      {
        ...q,
        id: "alternate",
        group: "novelty",
        placement: undefined,
        artwork: { main: "茶", color: "#abcdef", novelty: "spark" },
      },
    ]),
  };
  const sheet = kitSheet(s);
  expect(
    resolveKeys(sheet.study)
      .filter((k) => k.label === "Q")
      .map((k) => k.color),
  ).toEqual(["#123456", "#abcdef"]);
  const svg = renderKitSvg(s);
  expect(svg).toContain("ノベルティ");
  expect(svg).toContain("#abcdef");
});
it("packs tall extra keys without overlap and renders stored F-row entries after changing profile", () => {
  let s = switchLayout(
    { ...samples[0], profile: "mt3" },
    preset("preset-fullsize_jis-v1"),
  );
  s = {
    ...s,
    kit: addKitKeys(
      s,
      kitCoverage(s)
        .filter((r) => r.missing)
        .map((r) => ({
          ...r.key,
          quantity: r.missing,
          group: "extras",
          placement: undefined,
        })),
    ),
  };
  const sheet = kitSheet({ ...s, profile: "cherry" });
  const keys = sheet.study.layout!.keys;
  for (let i = 0; i < keys.length; i++)
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i],
        b = keys[j];
      // Original base has no L-shaped keys; packed extras have disjoint bounding boxes.
      if (a.shape === "iso-enter" || b.shape === "iso-enter") continue;
      expect(
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 &&
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6,
      ).toBe(false);
    }
  for (const k of resolveKeys(sheet.study).filter((k) => k.row === -1)) {
    const g = createKeyGeometry(k, "cherry");
    expect(
      [...g.top.getAttribute("position").array].every(Number.isFinite),
    ).toBe(true);
    g.top.dispose();
    g.body.dispose();
  }
});
it("validates kit geometry and preserves an intentionally empty kit", () => {
  const s = { ...samples[0], kit: [] };
  expect(getKit(parseLibrary(serialize([s])).studies[0])).toEqual([]);
  expect(kitCoverage(s).every((r) => r.missing === 1)).toBe(true);
  const bad = {
    ...samples[0],
    kit: [{ ...getKit(samples[0])[0], shape: "iso-enter", w: 1, h: 1 }],
  };
  expect(() =>
    parseLibrary(JSON.stringify({ schemaVersion: 3, studies: [bad] })),
  ).toThrow();
});

it("uses full-size width and fills the next row beside spanning keys", () => {
  const seed = getKit(samples[0])[0];
  const kit = [
    {
      ...seed,
      id: "tall",
      group: "extras" as const,
      placement: undefined,
      row: 1,
      w: 1,
      h: 2,
    },
    {
      ...seed,
      id: "short",
      group: "extras" as const,
      placement: undefined,
      row: 1,
      w: 1,
      h: 1,
    },
    {
      ...seed,
      id: "next",
      group: "extras" as const,
      placement: undefined,
      row: 2,
      w: 1,
      h: 1,
    },
    {
      ...seed,
      id: "third",
      group: "extras" as const,
      placement: undefined,
      row: 3,
      w: 1,
      h: 1,
    },
  ];
  const layout = kitSheet({ ...samples[0], kit }).study.layout!;
  const [tall, short, next, third] = layout.keys;
  expect(layout.width).toBeGreaterThanOrEqual(22.5 + 1.4);
  expect(next.y - tall.y).toBeCloseTo(1);
  expect(next.x).toBeCloseTo(short.x);
  expect(third.x).toBeCloseTo(tall.x);
  expect(third.y - tall.y).toBeCloseTo(2);
});
