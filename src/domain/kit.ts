import { getLayout, type Study } from "./model";
import type { Layout } from "./layout";
import { designKeyIds } from "./key-identity";
import { defaultProfile, profileRowIndex, rowName } from "./profiles";
import type { KitKey } from "./kit-schema";
export function layoutKit(
  study: Study,
  layout: Layout = getLayout(study),
): KitKey[] {
  const identities = designKeyIds(layout);
  return layout.keys.map((k, i) => ({
    id: `kit-${i}-${layout.id}`.slice(0, 100),
    identity: identities.get(k.id)!,
    label: k.label,
    sub: k.sub,
    role: k.role,
    w: k.w,
    h: k.h,
    row: profileRowIndex(k, layout, study.profile ?? defaultProfile),
    shape: k.shape ?? (k.id === "space" ? "space" : "standard"),
    quantity: 1,
    group: identities.get(k.id)!.includes("numpad") ? "numpad" : "base",
    placement: { x: k.x, y: k.y },
  }));
}
/** An uninitialized legacy design starts with its first layout, not the union of previews. */
export function getKit(study: Study): KitKey[] {
  return study.kit ?? layoutKit(study, study.layouts?.[0] ?? getLayout(study));
}
export function kitSignature(key: KitKey, study: Study) {
  return JSON.stringify([
    key.identity,
    key.w,
    key.h,
    key.shape,
    key.shape === "space"
      ? "Space"
      : rowName(key.row, study.profile ?? defaultProfile),
  ]);
}
export function kitCoverage(study: Study) {
  const inventory = new Map<string, number>();
  for (const k of getKit(study)) {
    const signature = kitSignature(k, study);
    inventory.set(signature, (inventory.get(signature) ?? 0) + k.quantity);
  }
  const needs = new Map<string, { key: KitKey; needed: number }>();
  for (const key of layoutKit(study)) {
    const signature = kitSignature(key, study),
      existing = needs.get(signature);
    if (existing) existing.needed += key.quantity;
    else needs.set(signature, { key, needed: key.quantity });
  }
  return [...needs.entries()].map(([signature, { key, needed }]) => ({
    signature,
    key,
    needed,
    included: inventory.get(signature) ?? 0,
    missing: Math.max(0, needed - (inventory.get(signature) ?? 0)),
  }));
}
export function addKitKeys(study: Study, keys: KitKey[]): KitKey[] {
  const kit = structuredClone(getKit(study));
  for (const key of keys) {
    const match = kit.find(
      (k) =>
        kitSignature(k, study) === kitSignature(key, study) &&
        JSON.stringify(k.artwork ?? {}) === JSON.stringify(key.artwork ?? {}) &&
        k.group === key.group,
    );
    if (match) {
      if (match.quantity + key.quantity > 200)
        throw new Error("同じキーは200個までです");
      match.quantity += key.quantity;
    } else kit.push({ ...structuredClone(key), id: crypto.randomUUID() });
  }
  if (kit.length > 600) throw new Error("収録キーは600種類までです");
  return kit;
}
export function kitArtwork(study: Study, key: KitKey) {
  const active = designKeyIds(getLayout(study));
  const currentId = [...active].find(
    ([, identity]) => identity === key.identity,
  )?.[0];
  const override = currentId
    ? study.overrides[currentId]
    : study.designKeys?.[key.identity];
  const pair = study.palette[override?.role ?? key.role];
  return {
    main: key.artwork?.main ?? override?.main ?? key.label,
    sub: key.artwork?.sub ?? override?.sub ?? key.sub,
    color: key.artwork?.color ?? override?.color ?? pair.color,
    ink: key.artwork?.ink ?? override?.ink ?? pair.ink,
    novelty: key.artwork?.novelty ?? override?.novelty ?? "none",
  };
}
export function keyUsage(key: KitKey) {
  try {
    const [base, index] = JSON.parse(key.identity);
    if (base === "layout") return "配列専用";
    const [cluster, label] = JSON.parse(base);
    if (cluster === "numpad") return "テンキー";
    if (["Shift", "Ctrl", "Alt", "Super"].includes(label))
      return index === 0 ? "左側" : "右側";
  } catch {
    /* Custom key identities may be opaque. */
  }
  return "メイン";
}
