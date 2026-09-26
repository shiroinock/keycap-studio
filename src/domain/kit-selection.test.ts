import { expect, it } from "vitest";
import { samples, parseLibrary } from "./model";
import { getKit } from "./kit";
import { kitSheet } from "./kit-sheet";
import { serialize } from "../storage/library";
import {
  patchKitSelection,
  sheetOrder,
  rangeSelection,
  boxSelection,
} from "./kit-selection";
it("updates only selected properties and preserves legends, variants, quantities and unrelated keys", () => {
  const study = structuredClone(samples[0]);
  const kit = getKit(study);
  kit[0] = {
    ...kit[0],
    quantity: 2,
    artwork: { main: "茶", novelty: "moon", ink: "#123456" },
  };
  const before = structuredClone(kit);
  const next = patchKitSelection(kit, [kit[0].id, kit[2].id], {
    color: "#abcdef",
    group: "novelty",
  });
  expect(next[0].artwork).toEqual({ ...before[0].artwork, color: "#abcdef" });
  expect(next[0].quantity).toBe(2);
  expect(next[0].placement).toBeUndefined();
  expect(next[1]).toBe(kit[1]);
  expect(kit).toEqual(before);
  expect(
    parseLibrary(serialize([{ ...study, kit: next }])).studies[0].kit,
  ).toEqual(next);
  expect(() =>
    patchKitSelection(kit, [kit[0].id], { ink: "invalid" }),
  ).toThrow();
});
it("selects in visual order, handles reverse ranges and excludes missing keys", () => {
  const sheet = kitSheet(samples[0], "all");
  const keys = sheet.study.layout!.keys;
  const order = sheetOrder(keys, sheet.sourceIds);
  expect(order.length).toBe(new Set(order).size);
  expect(rangeSelection(order, order[4], order[1])).toEqual(order.slice(1, 5));
  expect(rangeSelection(order, "removed", order[2])).toEqual([order[2]]);
  const whole = boxSelection(keys, sheet.sourceIds, {
    x: 0,
    y: 0,
    w: 100,
    h: 100,
  });
  expect(new Set(whole)).toEqual(new Set(Object.values(sheet.sourceIds)));
  expect(whole.every(Boolean)).toBe(true);
  const key = keys.find((k) => sheet.sourceIds[k.id])!;
  expect(
    boxSelection(keys, sheet.sourceIds, {
      x: key.x + 0.1,
      y: key.y + 0.1,
      w: 0.1,
      h: 0.1,
    }),
  ).toEqual([sheet.sourceIds[key.id]]);
});
