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

it("keeps navigation and arrow clusters intact across rows and legend edits", () => {
  const seed = getKit(samples[0])[0];
  const names = [
    "A",
    "Insert",
    "Home",
    "PgUp",
    "Delete",
    "End",
    "PgDn",
    "↑",
    "←",
    "↓",
    "→",
    "Print",
    "Scroll",
    "Pause",
  ];
  const kit = names.map((label, i) => ({
    ...seed,
    id: String(i),
    label,
    identity: JSON.stringify([JSON.stringify(["main", label]), 0]),
    row: i % 5,
    group: "extras" as const,
    placement: undefined,
    artwork: { main: "custom" },
  }));
  const keys = kitSheet({ ...samples[0], kit }).study.layout!.keys;
  const k = (name: string) => keys.find((key) => key.label === name)!;
  expect(keys).toHaveLength(kit.length);
  expect(k("Home").x - k("Insert").x).toBeCloseTo(1);
  expect(k("PgUp").x - k("Insert").x).toBeCloseTo(2);
  expect(k("Delete").y - k("Insert").y).toBeCloseTo(1);
  expect(k("End").x).toBeCloseTo(k("Home").x);
  expect(k("PgDn").x).toBeCloseTo(k("PgUp").x);
  expect(k("↑").x).toBeCloseTo(k("↓").x);
  expect(k("↓").y - k("↑").y).toBeCloseTo(1);
  expect(k("→").x - k("←").x).toBeCloseTo(2);
  expect(k("Scroll").y).toBeCloseTo(k("Print").y);
  // Missing members remain gaps, and duplicate R variants remain present.
  const partial = kit.filter((key) => !["Home", "↑"].includes(key.label));
  const duplicate = {
    ...partial.find((key) => key.label === "End")!,
    id: "extra-end",
    row: 4,
  };
  const partialKeys = kitSheet({ ...samples[0], kit: [...partial, duplicate] })
    .study.layout!.keys;
  expect(partialKeys).toHaveLength(partial.length + 1);
  const ends = partialKeys.filter((key) => key.label === "End");
  expect(ends[0].y).not.toBe(ends[1].y);
  for (let i = 0; i < partialKeys.length; i++)
    for (const b of partialKeys.slice(i + 1)) {
      const a = partialKeys[i];
      expect(
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 &&
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6,
      ).toBe(false);
    }
});

it("composes a full-size kit around the base with JIS on its right", () => {
  let study = switchLayout(samples[0], preset("preset-fullsize_jis-v1"));
  study = {
    ...study,
    kit: addKitKeys(
      study,
      kitCoverage(study)
        .filter((r) => r.missing)
        .map((r) => ({
          ...r.key,
          quantity: r.missing,
          group: r.key.group === "numpad" ? "numpad" : "extras",
          placement: undefined,
        })),
    ),
  };
  const sheet = kitSheet(study),
    keys = sheet.study.layout!.keys;
  const k = (name: string, group?: string) =>
    keys.find(
      (k) =>
        k.label === name &&
        (!group || study.kit!.find((a) => a.id === k.id)!.group === group),
    )!;
  const base = keys.filter(
    (key) => study.kit!.find((a) => a.id === key.id)!.group === "base",
  );
  const right = Math.max(...base.map((k) => k.x + k.w));
  const bottom = Math.max(...base.map((k) => k.y + k.h));
  expect(k("F1").y + 1).toBeLessThanOrEqual(k("1", "base").y);
  expect(k("半角/全角").x).toBeGreaterThan(right);
  expect(k("無変換").y).toBeCloseTo(k("Shift", "extras").y + 1);
  expect(k("Home").x).toBeGreaterThan(k("半角/全角").x);
  expect(k("Home").x).toBeLessThan(k("Num").x);
  expect(k("↑").x).toBeLessThan(k("Num").x);
  expect(k("Shift", "extras").y).toBeGreaterThanOrEqual(bottom);
  const jisSpace = keys.find((k) => k.shape === "space" && k.w === 3.25)!;
  expect(jisSpace.x).toBeCloseTo(base.find((k) => k.shape === "space")!.x);
  const bottomRow = [k("無変換"), jisSpace, k("変換"), k("かな")];
  for (let i = 1; i < bottomRow.length; i++) {
    expect(bottomRow[i].y).toBeCloseTo(bottomRow[0].y);
    expect(bottomRow[i].x).toBeCloseTo(bottomRow[i - 1].x + bottomRow[i - 1].w);
  }
  const otherSpace = {
    ...study.kit!.find((k) => k.shape === "space")!,
    id: "six-u",
    w: 6,
    group: "extras" as const,
    placement: undefined,
  };
  const variantSheet = kitSheet({ ...study, kit: [...study.kit!, otherSpace] });
  const variant = variantSheet.study.layout!.keys.find(
    (k) => k.id === "six-u",
  )!;
  const baseSpace = base.find((k) => k.shape === "space")!;
  expect(variant.x).toBeCloseTo(baseSpace.x);
  expect(variant.y).toBeGreaterThan(baseSpace.y);
  expect(new Set(keys.map((k) => k.id))).toEqual(
    new Set(study.kit!.map((k) => k.id)),
  );
  for (let i = 0; i < keys.length; i++)
    for (const b of keys.slice(i + 1)) {
      const a = keys[i];
      expect(
        Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1e-6 &&
          Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1e-6,
      ).toBe(false);
    }
});
