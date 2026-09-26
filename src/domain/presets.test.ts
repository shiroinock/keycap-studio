import { describe, expect, it } from "vitest";
import { layoutPresets } from "./presets";
import { layoutSchema } from "./layout";
import { samples, parseLibrary, resolveKeys, sameLayout } from "./model";
import { serialize } from "../storage/library";
import { renderSvg } from "../renderer/svg";
describe("layout presets", () => {
  it("validates every preset and preserves geometry through saved studies", () => {
    expect(new Set(layoutPresets.map((p) => p.layout.id)).size).toBe(
      layoutPresets.length,
    );
    for (const { layout } of layoutPresets) {
      expect(layoutSchema.safeParse(layout).success, layout.name).toBe(true);
      const study = {
        ...samples[0],
        schemaVersion: layout.id === "ansi60" ? (1 as const) : (2 as const),
        layoutId: layout.id,
        layout: layout.id === "ansi60" ? undefined : structuredClone(layout),
        overrides: {},
      };
      const restored = parseLibrary(serialize([study])).studies[0];
      expect(resolveKeys(restored)).toHaveLength(layout.keys.length);
      expect(sameLayout(study, restored)).toBe(true);
      expect(renderSvg(restored).match(/data-key-id=/g)).toHaveLength(
        layout.keys.length,
      );
    }
  });
  it("keeps standard cluster gaps, long keys and profile rows correct", () => {
    const find = (id: string) =>
      layoutPresets.find((p) => p.layout.id === id)!.layout;
    const full = find("preset-fullsize_ansi-v1");
    expect(full.keys).toHaveLength(104);
    expect(full.width).toBe(22.5);
    expect(full.height).toBe(6.25);
    expect(full.keys.find((k) => k.label === "Q")).toMatchObject({
      x: 1.5,
      y: 2.25,
      row: 1,
    });
    expect(full.keys.find((k) => k.x === 21.5 && k.y === 4.25)).toMatchObject({
      label: "Enter",
      w: 1,
      h: 2,
    });
    expect(full.keys.find((k) => k.x === 18.5 && k.y === 5.25)).toMatchObject({
      label: "0",
      w: 2,
    });
    expect(find("preset-tkl_ansi-v1").keys).toHaveLength(87);
    expect(find("preset-65_ansi-v1").keys).toHaveLength(68);
    expect(find("preset-75_ansi-v1").keys).toHaveLength(84);
    expect(find("preset-96_ansi-v1").keys).toHaveLength(100);
    const hhkb = find("preset-60_hhkb-v1");
    expect(hhkb.keys).toHaveLength(60);
    expect(hhkb.keys.find((k) => k.shape === "space")).toMatchObject({
      x: 4,
      y: 4,
      w: 7,
    });
    expect(
      find("preset-numpad_5x4-v1")
        .keys.filter((k) => k.h === 2)
        .map((k) => k.label),
    ).toEqual(["+", "Enter"]);
  });
});
