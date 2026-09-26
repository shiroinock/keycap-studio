import { expect, it } from "vitest";
import { samples } from "./model";
import { restoreStudy } from "./library-actions";
import { loadLibrary, saveLibrary } from "../storage/library";
it("persists an empty library without reverting to missing storage", () => {
  const store = new Map<string, string>();
  saveLibrary(
    {
      setItem: (k, v) => {
        store.set(k, v);
      },
    },
    [],
  );
  expect(loadLibrary({ getItem: (k) => store.get(k) ?? null })).toEqual([]);
  expect(loadLibrary({ getItem: () => null })).toBeNull();
});
it("restores position and complete data without overwriting edits to other sets", () => {
  const edited = { ...samples[0], name: "edited after deletion" };
  const result = restoreStudy([edited, samples[2]], {
    study: samples[1],
    index: 1,
  });
  expect(result.studies).toEqual([edited, samples[1], samples[2]]);
  expect(result.studies[1]).not.toBe(samples[1]);
  expect(restoreStudy([], { study: samples[0], index: 0 }).studies).toEqual([
    samples[0],
  ]);
});
it("preserves imported ID collisions and enforces the library limit", () => {
  const result = restoreStudy([samples[0]], { study: samples[0], index: 0 });
  expect(result.id).not.toBe(samples[0].id);
  expect(result.studies[1]).toEqual(samples[0]);
  expect(() =>
    restoreStudy(Array(200).fill(samples[0]), { study: samples[1], index: 1 }),
  ).toThrow();
});
