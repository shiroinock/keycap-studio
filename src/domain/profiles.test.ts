import { it, expect } from "vitest";
import { profileIds, profiles, rowName } from "./profiles";
import { ansi60 } from "./layout";
import { samples, resolveKeys, parseLibrary } from "./model";
import { switchLayout } from "./design-layout";
import { layoutPresets } from "./presets";
import { createKeyGeometry, keyDimensions } from "../three/profile";
import { serialize } from "../storage/library";
it("renders and round trips every profile, including spherical tops and shaped Enter", () => {
  const layout = layoutPresets.find(
    (p) => p.layout.id === "preset-fullsize_jis-v1",
  )!.layout;
  for (const profile of profileIds) {
    const study = { ...switchLayout(samples[0], layout), profile };
    expect(parseLibrary(serialize([study])).studies[0].profile).toBe(profile);
    for (const k of resolveKeys(study).filter(
      (k) =>
        k.label === "F1" ||
        k.label === "A" ||
        k.shape === "space" ||
        k.shape === "iso-enter",
    )) {
      const { top, body } = createKeyGeometry(k, profile);
      for (const g of [top, body]) {
        expect(
          [...g.getAttribute("position").array].every(Number.isFinite),
          profile,
        ).toBe(true);
        expect(g.boundingBox!.min.y, profile).toBeGreaterThanOrEqual(0);
      }
      expect(
        [...top.getAttribute("normal").array].every(Number.isFinite),
        profile,
      ).toBe(true);
      top.dispose();
      body.dispose();
    }
    if (!profile.startsWith("studio"))
      expect(profiles[profile].source).toMatch(/^https:/);
  }
});
it("uses spherical curvature for DSA/XDA, wider XDA tops, and distinct function rows", () => {
  const key = ansi60.keys[0];
  expect(keyDimensions(key, "xda").topWidth).toBeGreaterThan(
    keyDimensions(key, "dsa").topWidth,
  );
  const dsa = createKeyGeometry(key, "dsa"),
    oem = createKeyGeometry(key, "oem");
  expect(
    [...dsa.top.getAttribute("normal").array]
      .filter((_, i) => i % 3 === 0)
      .some((x) => Math.abs(x) > 0.01),
  ).toBe(true);
  expect(
    [...oem.top.getAttribute("normal").array]
      .filter((_, i) => i % 3 === 0)
      .every((x) => x === 0),
  ).toBe(true);
  expect(rowName(-1, "mt3")).toBe("R0");
  expect(rowName(-1, "kat")).toBe("R5");
  expect(rowName(0, "dsa")).toBe("R3");
  dsa.top.dispose();
  dsa.body.dispose();
  oem.top.dispose();
  oem.body.dispose();
});

it("migrates removed Studio profiles without losing designs", () => {
  for (const [old, current] of [
    ["studio-sculpted-v2", "cherry"],
    ["studio-uniform", "dsa"],
    ["studio-low", "lsa"],
  ]) {
    const json = JSON.stringify({
      schemaVersion: 1,
      studies: [{ ...samples[0], profile: old }],
    });
    const restored = parseLibrary(json).studies[0];
    expect(restored.profile).toBe(current);
    expect(restored.overrides).toEqual(samples[0].overrides);
  }
  expect(profileIds.some((id) => id.startsWith("studio"))).toBe(false);
});
