import { expect, it } from "vitest";
import { samples, resolveKeys, parseLibrary, duplicateStudy } from "./model";
import { switchLayout } from "./design-layout";
import { ansi60 } from "./layout";
import { layoutPresets } from "./presets";
import { serialize } from "../storage/library";
import { coverage } from "./coverage";
import { createKeyGeometry } from "../three/profile";
import { profileIds } from "./profiles";
const preset = (id: string) =>
  layoutPresets.find((p) => p.layout.id === id)!.layout;
it("keeps a single design and shared artwork when changing layouts, including missing keys", () => {
  let s = structuredClone(samples[0]);
  s.overrides.keyQ = { main: "茶", color: "#123456" };
  const originalId = s.id;
  s = switchLayout(s, preset("preset-fullsize_jis-v1"));
  expect(s.id).toBe(originalId);
  expect(s.name).toBe(samples[0].name);
  expect(resolveKeys(s).find((k) => k.label === "Q")).toMatchObject({
    main: "茶",
    color: "#123456",
  });
  const f1 = s.layout!.keys.find((k) => k.label === "F1")!;
  s.overrides[f1.id] = { main: "音量", novelty: "sun" };
  s = switchLayout(s, ansi60);
  expect(resolveKeys(s).find((k) => k.label === "Q")!.main).toBe("茶");
  s = parseLibrary(serialize([s])).studies[0];
  s = switchLayout(s, preset("preset-fullsize_jis-v1"));
  expect(resolveKeys(s).find((k) => k.label === "F1")!.main).toBe("音量");
  const q = s.layout!.keys.find((k) => k.label === "Q")!;
  delete s.overrides[q.id];
  s = switchLayout(s, ansi60);
  expect(resolveKeys(s).find((k) => k.label === "Q")!.main).toBe("Q");
  const copy = duplicateStudy(s);
  copy.designKeys!.extra = { main: "copy" };
  expect(s.designKeys!.extra).toBeUndefined();
});
it("separates number pad keys and preserves space artwork across widths", () => {
  let s = structuredClone(samples[0]);
  s.overrides.digit1 = { main: "ONE" };
  s.overrides.space = { color: "#112233" };
  s = switchLayout(s, preset("preset-fullsize_ansi-v1"));
  expect(
    resolveKeys(s)
      .filter((k) => k.label === "1")
      .map((k) => k.main),
  ).toEqual(["ONE", "1"]);
  s = switchLayout(s, preset("preset-hhkb-6u-v1"));
  expect(resolveKeys(s).find((k) => k.shape === "space")).toMatchObject({
    w: 6,
    color: "#112233",
  });
});
it("aggregates shape requirements across checked layouts and uniform rows", () => {
  let s = switchLayout(samples[0], preset("preset-hhkb-6u-v1"));
  expect(
    coverage(s)
      .rows.filter((r) => r.shape === "スペース")
      .map((r) => r.w),
  ).toEqual([6, 6.25]);
  s = { ...s, profile: "xda" };
  expect(
    coverage(s).rows.every((r) => r.row === "R0" || r.row === "Space"),
  ).toBe(true);
  const key = ansi60.keys[0];
  const tops = profileIds
    .filter((p) => ["dsa", "xda", "oem"].includes(p))
    .map((p) => {
      const g = createKeyGeometry(key, p);
      const max = g.top.boundingBox!.max.y;
      expect(
        [...g.top.getAttribute("position").array].every(Number.isFinite),
      ).toBe(true);
      g.top.dispose();
      g.body.dispose();
      return max;
    });
  expect(new Set(tops).size).toBe(3);
  expect(parseLibrary(serialize([s])).studies[0].profile).toBe("xda");
});
