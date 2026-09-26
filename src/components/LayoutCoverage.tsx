import { useMemo, useState } from "react";
import type { Study } from "../domain/model";
import type { KitKey } from "../domain/kit-schema";
import { availableLayouts } from "../domain/design-layout";
import { kitCoverage, missingKitKeys, keyUsage } from "../domain/kit";
import { defaultProfile, rowName } from "../domain/profiles";
export default function LayoutCoverage({
  study,
  onAdd,
}: {
  study: Study;
  onAdd: (keys: KitKey[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [onlyMissing, setOnlyMissing] = useState(false);
  const rows = useMemo(
    () =>
      availableLayouts(study).map((layout) => {
        const missing = kitCoverage(study, layout).filter((r) => r.missing);
        return {
          layout,
          missing,
          count: missing.reduce((n, r) => n + r.missing, 0),
        };
      }),
    [study],
  );
  const additions = missingKitKeys(
    study,
    rows.filter((r) => selected.includes(r.layout.id)).map((r) => r.layout),
  );
  const profile = study.profile ?? defaultProfile;
  return (
    <section className="layout-coverage" aria-label="対応配列一覧">
      <div className="kit-actions">
        <strong aria-live="polite">
          {rows.filter((r) => !r.count).length} / {rows.length}配列をカバー
        </strong>
        <label>
          <input
            type="checkbox"
            checked={onlyMissing}
            onChange={(e) => setOnlyMissing(e.target.checked)}
          />{" "}
          不足がある配列のみ
        </label>
        <button disabled={!additions.length} onClick={() => onAdd(additions)}>
          選択した配列の不足を追加（
          {additions.reduce((n, k) => n + k.quantity, 0)}キー）
        </button>
      </div>
      <p className="kit-note">
        現在のプロファイルの用途・R・幅・高さ・形状・数量で判定します。複数配列に共通する不足は重複追加しません。格子配列・独自の無刻印キーは配列専用として判定します。
      </p>
      <div className="kit-table-scroll">
        <table>
          <thead>
            <tr>
              <th>選択</th>
              <th>配列</th>
              <th>収録 / 必要</th>
              <th>対応状況</th>
              <th>不足キー</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((r) => !onlyMissing || r.count)
              .map(({ layout, missing, count }) => (
                <tr key={layout.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`${layout.name}を選択`}
                      checked={selected.includes(layout.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, layout.id]
                            : selected.filter((id) => id !== layout.id),
                        )
                      }
                    />
                  </td>
                  <th scope="row">
                    {layout.name}
                    {layout.id === study.layoutId ? "（プレビュー中）" : ""}
                  </th>
                  <td>
                    {layout.keys.length - count} / {layout.keys.length}
                  </td>
                  <td>{count ? `不足 ${count}キー` : "対応済み"}</td>
                  <td>
                    {count > 0 && (
                      <details>
                        <summary>
                          {layout.name}の不足を見る（{missing.length}種類）
                        </summary>
                        <button
                          onClick={() => onAdd(missingKitKeys(study, [layout]))}
                        >
                          {layout.name}の不足をすべて追加
                        </button>
                        <ul className="layout-missing-list">
                          {missing.map((r) => (
                            <li key={r.signature}>
                              <span>
                                {r.key.label || "Space"} · {keyUsage(r.key)} ·{" "}
                                {rowName(r.key.row, profile)} · {r.key.w}×
                                {r.key.h}u
                                {r.key.shape === "iso-enter"
                                  ? " · L字"
                                  : r.key.shape === "space"
                                    ? " · スペース"
                                    : ""}{" "}
                                · 収録 {r.included} / 必要 {r.needed}
                              </span>
                              <button
                                aria-label={`${layout.name}: ${r.key.label || "Space"} ${rowName(r.key.row, profile)} ${r.key.w}×${r.key.h}u ${keyUsage(r.key)}を${r.missing}個追加`}
                                onClick={() =>
                                  onAdd([
                                    {
                                      ...r.key,
                                      quantity: r.missing,
                                      group:
                                        r.key.group === "numpad"
                                          ? "numpad"
                                          : "extras",
                                      placement: undefined,
                                    },
                                  ])
                                }
                              >
                                ＋{r.missing}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {onlyMissing && rows.every((r) => !r.count) && (
        <p>すべての配列をカバーしています。</p>
      )}
    </section>
  );
}
