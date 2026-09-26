import { it, expect } from "vitest";
import {
  samples,
  compatibleKitKeys,
  selectKitVariant,
  resolveKeys,
  parseLibrary,
  duplicateStudy,
} from "./model";
import { getKit, addKitKeys } from "./kit";
import { switchLayout } from "./design-layout";
import { layoutPresets } from "./presets";
import { serialize } from "../storage/library";
import { renderSvg } from "../renderer/svg";
it("saves a variant per layout and preserves inventory and unrelated selections", () => {
  let s = { ...structuredClone(samples[0]), kit: getKit(samples[0]) };
  const esc = s.kit.find((k) => k.label === "Esc")!;
  s.kit = addKitKeys(s, [
    {
      ...esc,
      group: "novelty",
      artwork: { color: "#ff0055", main: "Alt Esc", novelty: "moon" },
      placement: undefined,
    },
  ]);
  const alternate = s.kit.at(-1)!;
  const key = resolveKeys(s).find((k) => k.label === "Esc")!;
  const beforeKit = JSON.stringify(s.kit);
  const chosen = selectKitVariant(s, key.id, alternate.id);
  expect(resolveKeys(chosen).find((k) => k.id === key.id)).toMatchObject({
    color: "#ff0055",
    main: "Alt Esc",
    novelty: "moon",
  });
  expect(renderSvg(chosen)).toContain("#ff0055");
  expect(JSON.stringify(chosen.kit)).toBe(beforeKit);
  const target = layoutPresets.find(
    (p) => p.layout.id === "preset-fullsize_ansi-v1",
  )!.layout;
  const changed = switchLayout(chosen, target);
  expect(resolveKeys(changed).find((k) => k.label === "Esc")!.color).not.toBe(
    "#ff0055",
  );
  const original =
    chosen.layout ??
    layoutPresets.find((p) => p.layout.id === "ansi60")!.layout;
  const back = switchLayout(changed, original);
  expect(resolveKeys(back).find((k) => k.label === "Esc")!.color).toBe(
    "#ff0055",
  );
  const saved = parseLibrary(serialize([back])).studies[0];
  expect(saved.variantSelections).toEqual(back.variantSelections);
  expect(resolveKeys(saved).find((k) => k.label === "Esc")!.color).toBe(
    "#ff0055",
  );
  const copy = duplicateStudy(saved);
  copy.variantSelections![original.id][key.id] = esc.id;
  expect(saved.variantSelections![original.id][key.id]).toBe(alternate.id);
  expect(
    resolveKeys(selectKitVariant(saved, key.id, null)).find(
      (k) => k.label === "Esc",
    )!.color,
  ).not.toBe("#ff0055");
});
it("rejects incompatible variants and falls back after deletion or size change", () => {
  const s = { ...structuredClone(samples[0]), kit: getKit(samples[0]) };
  const key = resolveKeys(s).find((k) => k.label === "Esc")!;
  const esc = compatibleKitKeys(s, key.id)[0];
  const space = s.kit.find((k) => k.shape === "space")!;
  expect(selectKitVariant(s, key.id, space.id)).toBe(s);
  const selected = selectKitVariant(s, key.id, esc.id);
  expect(
    compatibleKitKeys(
      {
        ...selected,
        kit: selected.kit!.map((k) => (k.id === esc.id ? { ...k, w: 2 } : k)),
      },
      key.id,
    ),
  ).toEqual([]);
  const removed = {
    ...selected,
    kit: selected.kit!.filter((k) => k.id !== esc.id),
  };
  expect(() =>
    resolveKeys(parseLibrary(serialize([removed])).studies[0]),
  ).not.toThrow();
});
