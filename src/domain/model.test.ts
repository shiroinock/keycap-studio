import { describe, it, expect } from "vitest";
import { ansi60, validateLayout } from "./layout";
import {
  samples,
  parseLibrary,
  resolveKeys,
  duplicateStudy,
  mergeLibraries,
} from "./model";
import { renderSvg } from "../renderer/svg";
import { serialize, saveLibrary, loadLibrary } from "../storage/library";
describe("ANSI 60% geometry", () => {
  it("has the standard 61 keys with five complete 15u rows", () => {
    expect(ansi60.keys).toHaveLength(61);
    expect(
      [0, 1, 2, 3, 4].map((y) => ansi60.keys.filter((k) => k.y === y).length),
    ).toEqual([14, 14, 13, 12, 8]);
    for (let row = 0; row < 5; row++) {
      const keys = ansi60.keys.filter((k) => k.y === row);
      expect(keys.reduce((sum, k) => sum + k.w, 0)).toBe(15);
      keys.slice(1).forEach((k, i) => expect(k.x).toBe(keys[i].x + keys[i].w));
    }
    expect(ansi60.keys.find((k) => k.id === "enter")?.w).toBe(2.25);
    expect(ansi60.keys.find((k) => k.id === "space")?.w).toBe(6.25);
  });
  it("rejects invalid geometry and duplicate keys", () => {
    for (const patch of [{ w: 0 }, { x: NaN }, { x: 15 }, { h: -1 }])
      expect(() =>
        validateLayout({ ...ansi60, keys: [{ ...ansi60.keys[0], ...patch }] }),
      ).toThrow();
    expect(() =>
      validateLayout({ ...ansi60, keys: [ansi60.keys[0], ansi60.keys[0]] }),
    ).toThrow();
  });
});
describe("portable study data", () => {
  it("round trips Japanese text and key overrides", () => {
    const study = structuredClone(samples[0]);
    study.name = "深夜の喫茶店";
    study.overrides.enter = {
      main: "温かい",
      sub: "お茶",
      color: "#abcdef",
      novelty: "moon",
    };
    expect(parseLibrary(serialize([study])).studies).toEqual([study]);
    const resolved = resolveKeys(study).find((k) => k.id === "enter")!;
    expect(resolved).toMatchObject({
      main: "温かい",
      sub: "お茶",
      color: "#abcdef",
      novelty: "moon",
      w: 2.25,
    });
  });
  it("rejects corrupted data, unknown versions, key references, duplicate IDs, colors", () => {
    expect(() => parseLibrary("{bad")).toThrow();
    const invalid = [
      { schemaVersion: 99, studies: samples },
      { schemaVersion: 1, studies: [samples[0], samples[0]] },
      {
        schemaVersion: 1,
        studies: [{ ...samples[0], overrides: { unknown: { main: "A" } } }],
      },
      {
        schemaVersion: 1,
        studies: [
          {
            ...samples[0],
            palette: {
              ...samples[0].palette,
              base: { color: "url(evil)", ink: "#ffffff" },
            },
          },
        ],
      },
      {
        schemaVersion: 1,
        studies: [{ ...samples[0], layoutId: "unavailable" }],
      },
    ];
    invalid.forEach((v) =>
      expect(() => parseLibrary(JSON.stringify(v))).toThrow(),
    );
  });
  it("duplicates and imports without aliasing or overwriting existing designs", () => {
    const original = structuredClone(samples[0]),
      before = structuredClone(original);
    const copy = duplicateStudy(original);
    copy.palette.base.color = "#000000";
    copy.overrides.escape.main = "new";
    expect(original).toEqual(before);
    expect(copy.id).not.toBe(original.id);
    const merged = mergeLibraries([original], [original]);
    expect(merged).toHaveLength(2);
    expect(merged[1].id).not.toBe(original.id);
    expect(merged[0]).toEqual(before);
  });
});
describe("SVG output", () => {
  it("is deterministic and contains exactly 61 correctly positioned keys", () => {
    const svg = renderSvg(samples[0]);
    expect(svg).toBe(renderSvg(samples[0]));
    expect(svg.match(/data-key-id=/g)).toHaveLength(61);
    expect(svg).toContain('data-key-id="enter" transform="translate(792 147)"');
    expect(svg).toContain('viewBox="0 0 948 348"');
  });
  it("escapes markup in names and legends", () => {
    const study = structuredClone(samples[0]);
    study.name = "<script>bad</script>";
    study.overrides.enter = { main: '<img onerror="bad">&', sub: "日本語" };
    const svg = renderSvg(study);
    expect(svg).not.toContain("<script>");
    expect(svg).not.toContain("<img");
    expect(svg).toContain("&lt;img");
    expect(svg).toContain("日本語");
  });
});
describe("long and malformed legends", () => {
  it("bounds long labels and handles XML-invalid characters safely", () => {
    const study = structuredClone(samples[0]);
    study.name = "bad\uD800";
    study.overrides.keyA = { main: "語".repeat(80), sub: "\u0000<日本語>" };
    const svg = renderSvg(study);
    expect(svg).toContain('textLength="34"');
    expect(svg).not.toContain("\u0000");
    expect(svg).not.toContain("\uD800");
    expect(() => encodeURIComponent(svg)).not.toThrow();
  });
});
describe("storage failure boundaries", () => {
  it("does not write while loading corrupt data", () => {
    let written = false;
    const storage = {
      getItem: () => "{broken",
      setItem: () => {
        written = true;
      },
    };
    expect(() => loadLibrary(storage)).toThrow();
    expect(written).toBe(false);
  });
  it("surfaces quota and permission failures", () => {
    expect(() =>
      saveLibrary(
        {
          setItem: () => {
            throw new Error("quota");
          },
        },
        samples,
      ),
    ).toThrow("quota");
    expect(() =>
      loadLibrary({
        getItem: () => {
          throw new Error("denied");
        },
      }),
    ).toThrow("denied");
  });
  it("persists and reloads a library", () => {
    let saved: string | null = null;
    const storage = {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    expect(loadLibrary(storage)).toBeNull();
    saveLibrary(storage, samples);
    expect(loadLibrary(storage)).toEqual(samples);
  });
});
