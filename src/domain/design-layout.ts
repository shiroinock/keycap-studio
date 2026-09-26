import { type Layout } from "./layout";
import { getLayout, type Study, type KeyOverride } from "./model";
import { layoutPresets } from "./presets";

import { designKeyIds } from "./key-identity";
import { getKit } from "./kit";
export function switchLayout(study: Study, target: Layout): Study {
  const source = getLayout(study);
  const bank: Record<string, KeyOverride> = structuredClone(
    study.designKeys ?? {},
  );
  // The currently visible edits are authoritative, including explicit resets.
  for (const [id, identity] of designKeyIds(source)) {
    delete bank[identity];
    if (study.overrides[id])
      bank[identity] = structuredClone(study.overrides[id]);
  }
  const overrides: Record<string, KeyOverride> = {};
  for (const [id, identity] of designKeyIds(target)) {
    if (bank[identity]) overrides[id] = structuredClone(bank[identity]);
  }
  const layouts = [...(study.layouts ?? []), source, target].filter(
    (l, i, all) => all.findIndex((a) => a.id === l.id) === i,
  );
  return {
    ...study,
    schemaVersion: 3,
    kit: structuredClone(getKit(study)),
    layoutId: target.id,
    layout: structuredClone(target),
    layouts: structuredClone(layouts),
    designKeys: bank,
    overrides,
  };
}
export function availableLayouts(study: Study): Layout[] {
  return [
    getLayout(study),
    ...(study.layouts ?? []),
    ...layoutPresets.map((p) => p.layout),
  ].filter((l, i, all) => all.findIndex((a) => a.id === l.id) === i);
}
