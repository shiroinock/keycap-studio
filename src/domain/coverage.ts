import { getLayout, type Study } from "./model";
import { defaultProfile, rowName, profileRowIndex } from "./profiles";
export function coverage(study: Study) {
  const current = getLayout(study);
  const layouts = [current, ...(study.layouts ?? [])].filter(
    (l, i, all) => all.findIndex((a) => a.id === l.id) === i,
  );
  const rows = new Map<
    string,
    {
      row: string;
      w: number;
      h: number;
      shape: string;
      current: number;
      required: number;
      labels: Set<string>;
    }
  >();
  for (const layout of layouts) {
    const counts = new Map<string, number>();
    for (const k of layout.keys) {
      const shape =
        k.shape === "space" || k.id === "space"
          ? "スペース"
          : k.shape === "iso-enter"
            ? "L字Enter"
            : "標準";
      const row =
        k.shape === "space" || k.id === "space"
          ? "Space"
          : rowName(
              profileRowIndex(k, layout, study.profile ?? defaultProfile),
              study.profile ?? defaultProfile,
            );
      const id = JSON.stringify([row, k.w, k.h, shape]);
      if (!rows.has(id))
        rows.set(id, {
          row,
          w: k.w,
          h: k.h,
          shape,
          current: 0,
          required: 0,
          labels: new Set(),
        });
      const item = rows.get(id)!;
      item.labels.add(k.label || "Space");
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const [id, count] of counts) {
      const item = rows.get(id)!;
      item.required = Math.max(item.required, count);
      if (layout.id === current.id) item.current = count;
    }
  }
  return {
    layouts,
    rows: [...rows.values()].sort(
      (a, b) =>
        a.row.localeCompare(b.row) ||
        a.w - b.w ||
        a.h - b.h ||
        a.shape.localeCompare(b.shape),
    ),
  };
}
