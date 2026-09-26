import { useEffect, useRef, useState } from "react";
import { layoutPresets } from "../domain/presets";
import type { Layout } from "../domain/layout";
import type { Study } from "../domain/model";
import Keyboard from "./Keyboard";
export default function PresetDialog({
  template,
  onCancel,
  onCreate,
}: {
  template: Study;
  onCancel: () => void;
  onCreate: (layout: Layout) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState(layoutPresets[0].layout.id);
  const preset = layoutPresets.find((p) => p.layout.id === id)!;
  const { layout } = preset;
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    return () => d.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal kle-modal"
      aria-labelledby="preset-title"
      onCancel={onCancel}
    >
      <h2 id="preset-title">配列プリセット</h2>
      <label>
        配列
        <select autoFocus value={id} onChange={(e) => setId(e.target.value)}>
          {[...new Set(layoutPresets.map((p) => p.group))].map((group) => (
            <optgroup key={group} label={group}>
              {layoutPresets
                .filter((p) => p.group === group)
                .map((p) => (
                  <option key={p.layout.id} value={p.layout.id}>
                    {p.layout.name} · {p.layout.keys.length}キー
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </label>
      <p>{preset.note}</p>
      <p>
        {layout.width} × {layout.height}u · 19.05mmピッチ
      </p>
      <div
        style={{
          maxWidth: Math.min(
            700,
            (300 * (layout.width * 60 + 48)) / (layout.height * 60 + 48),
          ),
          margin: "auto",
        }}
      >
        <Keyboard
          study={{
            ...template,
            schemaVersion: layout.id === "ansi60" ? 1 : 2,
            layoutId: layout.id,
            layout: layout.id === "ansi60" ? undefined : layout,
            overrides: {},
          }}
        />
      </div>
      <p>現在のパレットで新しい案を作成します。</p>
      <details>
        <summary>収録範囲</summary>
        <p>
          代表的な配列の一例です。同じサイズ名でも機種によってキー幅・配置は異なります。JIS・ISOの特殊形状、Aliceなどの回転キーは未対応です。別の長方形配列はKLE
          JSONで読み込めます。
        </p>
      </details>
      <div className="modal-actions">
        <button onClick={onCancel}>キャンセル</button>
        <button className="primary" onClick={() => onCreate(layout)}>
          この配列で案を作成
        </button>
      </div>
    </dialog>
  );
}
