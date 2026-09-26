import { coverage } from "../domain/coverage";
import type { Study } from "../domain/model";
export default function KitCoverage({ study }: { study: Study }) {
  const { layouts, rows } = coverage(study);
  return (
    <details className="kit-coverage">
      <summary>R・uバリエーション · {rows.length}種類</summary>
      <p>
        確認済みの配列：{layouts.map((l) => l.name).join(" / ")}
        <br />
        R表記は選択したプロファイルに合わせて集計します。共通行はR0、Spaceは専用形状です。メーカーやセットにより表記・行構成は異なります。
        <br />
        必要数は各配列の最大使用数です。刻印違いはまとめた形状の集計で、販売キットの収録・互換性を保証するものではありません。
      </p>
      <div className="kit-table-scroll">
        <table>
          <thead>
            <tr>
              <th>R</th>
              <th>幅 × 高さ</th>
              <th>形状</th>
              <th>現在の配列</th>
              <th>確認済み配列の必要数</th>
              <th>キー例</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={JSON.stringify([r.row, r.w, r.h, r.shape])}>
                <td>{r.row}</td>
                <td>
                  {r.w} × {r.h}u
                </td>
                <td>{r.shape}</td>
                <td>{r.current}</td>
                <td>{r.required}</td>
                <td>
                  {[...r.labels].slice(0, 5).join(" / ")}
                  {r.labels.size > 5 ? " …" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
