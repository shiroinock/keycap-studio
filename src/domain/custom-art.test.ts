import { expect, it } from "vitest";
import { defaultArt } from "./custom-art";
import { samples, parseLibrary, resolveKeys, duplicateStudy } from "./model";
import { serialize } from "../storage/library";
import { renderSvg, legendMarkup } from "../renderer/svg";
import { textureSource } from "../three/artwork";
import { layoutPresets } from "./presets";
import { switchLayout } from "./design-layout";
import { getKit, kitArtwork } from "./kit";
const png =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
function fixture() {
  const s = structuredClone(samples[0]);
  s.artworkAssets = [{ id: "test", name: "test.png", dataUrl: png }];
  s.overrides.escape = {
    customArt: { ...defaultArt("test"), rotation: 45, x: 0.4 },
  };
  return s;
}
it("preserves custom art through layout switching, copying and JSON", () => {
  const s = fixture();
  const jis = layoutPresets.find(
    (p) => p.layout.id === "preset-fullsize_jis-v1",
  )!.layout;
  const next = switchLayout(s, jis);
  expect(resolveKeys(next).find((k) => k.label === "Esc")?.customArt).toEqual(
    s.overrides.escape.customArt,
  );
  const restored = parseLibrary(serialize([next])).studies[0];
  expect(restored.artworkAssets).toEqual(s.artworkAssets);
  expect(duplicateStudy(s).artworkAssets).toEqual(s.artworkAssets);
});
it("uses shared artwork for SVG and 3D textures and allows removing it from a kit variant", () => {
  const s = fixture(),
    key = resolveKeys(s)[0];
  const markup = legendMarkup(key, s, 54, 54);
  expect(markup).toContain(png);
  expect(markup).toContain("rotate(45");
  expect(renderSvg(s)).toContain(markup);
  expect(decodeURIComponent(textureSource(key, s))).toContain(markup);
  const kit = getKit(s);
  kit[0].artwork = { customArt: null };
  s.kit = kit;
  expect(kitArtwork(s, kit[0]).customArt).toBeNull();
  expect(resolveKeys(s)[0].customArt).toBeNull();
  expect(renderSvg(s)).not.toContain(png);
});
it("rejects external image URLs, missing assets and invalid transforms", () => {
  const s = fixture();
  for (const patch of [{ rotation: 999 }, { x: -1 }, { assetId: "missing" }]) {
    const broken = structuredClone(s);
    broken.overrides.escape.customArt = { ...defaultArt("test"), ...patch };
    expect(() => parseLibrary(serialize([broken]))).toThrow();
  }
  s.artworkAssets![0].dataUrl = "https://example.com/tracking.png";
  expect(() => parseLibrary(serialize([s]))).toThrow();
});
