import { useEffect, useMemo, useState } from "react";
import type { Study } from "../domain/model";
import type { KitKey } from "../domain/kit-schema";
import { availableLayouts } from "../domain/design-layout";
import { kitCoverage, missingKitKeys, keyUsage, planKit } from "../domain/kit";
import { defaultProfile, rowName } from "../domain/profiles";
export default function LayoutCoverage({
  study,
  onAdd,
  onApply,
}: {
  study: Study;
  onAdd: (keys: KitKey[]) => void;
  onApply: (keys: KitKey[], targets: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(study.kitTargets ?? []);
  const [review, setReview] = useState(false);
  useEffect(() => setSelected(study.kitTargets ?? []), [study.kitTargets]);
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
  const targets = rows
    .filter((r) => selected.includes(r.layout.id))
    .map((r) => r.layout);
  const plan = planKit(study, targets);
  const addedCount = plan.additions.reduce((n, k) => n + k.quantity, 0);
  const saved =
    JSON.stringify(study.kitTargets ?? []) === JSON.stringify(selected);
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
        <button disabled={!targets.length} onClick={() => setReview(true)}>
          構成案を確認（{targets.length}配列）
        </button>
      </div>
      <p className="kit-note">
        現在のプロファイルの用途・R・幅・高さ・形状・数量で判定します。複数配列に共通する不足は重複追加しません。格子配列・独自の無刻印キーは配列専用として判定します。
      </p>
      {review && targets.length > 0 && (
        <section className="kit-plan" aria-label="キット構成案">
          <h3>キット構成案</h3>
          <p>{targets.map((l) => l.name).join("・")}</p>
          <p aria-live="polite">
            必要 {plan.needed}キー · 既存から使用 {plan.reused}キー · 追加{" "}
            {addedCount}キー · その他 {plan.retained}キーを保持
          </p>
          <p className="kit-note">
            配列間で共用するキーは最大必要数だけ含めます。色違い・ノベルティ・今回使わない収録キーは保持します。グループ分けは構成案で、既存キーの所属は変更しません。
          </p>
          {[
            [
              "共通・ベース",
              (r: (typeof plan.rows)[number]) =>
                r.key.group !== "numpad" &&
                (targets.length === 1 || r.layoutIds.length === targets.length),
            ],
            [
              "配列ごとの差分",
              (r: (typeof plan.rows)[number]) =>
                r.key.group !== "numpad" &&
                targets.length > 1 &&
                r.layoutIds.length < targets.length,
            ],
            [
              "テンキー",
              (r: (typeof plan.rows)[number]) => r.key.group === "numpad",
            ],
          ].map(([title, predicate]) => {
            const items = plan.rows.filter(
              predicate as (r: (typeof plan.rows)[number]) => boolean,
            );
            return (
              items.length > 0 && (
                <details key={String(title)}>
                  <summary>
                    {String(title)} · {items.reduce((n, r) => n + r.needed, 0)}
                    キー
                  </summary>
                  <ul className="layout-missing-list">
                    {items.map((r) => (
                      <li
                        key={JSON.stringify([
                          r.key.identity,
                          r.key.row,
                          r.key.w,
                          r.key.h,
                        ])}
                      >
                        <span>
                          {r.key.label || "Space"} · {keyUsage(r.key)} ·{" "}
                          {rowName(r.key.row, profile)} · {r.key.w}×{r.key.h}u ·
                          必要 {r.needed} / 追加{" "}
                          {Math.max(0, r.needed - r.included)}
                          <small> {r.layouts.join("・")}</small>
                        </span>
                      </li>
                    ))}
                  </ul>
                </details>
              )
            );
          })}
          <div className="kit-actions">
            <button
              disabled={saved && !addedCount}
              onClick={() =>
                onApply(
                  plan.additions,
                  targets.map((l) => l.id),
                )
              }
            >
              {saved && !addedCount
                ? "適用済み"
                : `構成案を適用（${addedCount}キー追加）`}
            </button>
            <button onClick={() => setReview(false)}>閉じる</button>
          </div>
        </section>
      )}
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
