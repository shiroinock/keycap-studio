import { useEffect, useRef, useState } from "react";
import { parseKLE } from "../domain/kle";
import type { Layout } from "../domain/layout";
import type { Study } from "../domain/model";
import Keyboard from "./Keyboard";
export default function KLEImportDialog({
  template,
  onCancel,
  onImport,
}: {
  template: Study;
  onCancel: () => void;
  onImport: (layout: Layout) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const [raw, setRaw] = useState(""),
    [layout, setLayout] = useState<Layout | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  const change = (s: string) => {
    setRaw(s);
    setLayout(null);
    setError("");
  };
  return (
    <dialog
      ref={ref}
      className="modal kle-modal"
      aria-labelledby="kle-title"
      onCancel={onCancel}
    >
      <h2 id="kle-title">KLE配列を読み込む</h2>
      <p>
        回転なしの長方形キーとJIS/ISO
        Enterに対応。JSONファイルを選ぶか、JSONを貼り付けてください。
      </p>
      <button onClick={() => input.current?.click()}>
        KLE JSONファイルを選択
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setLayout(null);
          try {
            if (file.size > 200_000)
              throw new Error("KLE JSONは200KB以下にしてください");
            change(await file.text());
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      />
      <label>
        KLE JSON
        <textarea
          autoFocus
          value={raw}
          onChange={(e) => change(e.target.value)}
          placeholder={'[["Esc", "1", "2"], ["Tab", "Q", "W"]]'}
          spellCheck={false}
        />
      </label>
      <button
        disabled={!raw.trim()}
        onClick={() => {
          try {
            setLayout(parseKLE(raw));
            setError("");
          } catch (e) {
            setLayout(null);
            setError((e as Error).message);
          }
        }}
      >
        配列を確認
      </button>
      {error && (
        <p role="alert" className="import-error">
          {error}
        </p>
      )}
      {layout && (
        <section className="kle-preview">
          <label>
            配列名
            <input
              maxLength={80}
              value={layout.name}
              onChange={(e) => setLayout({ ...layout, name: e.target.value })}
            />
          </label>
          <p>
            {layout.keys.length}キー · {layout.width} × {layout.height}u ·
            19.05mmピッチ
          </p>
          <div
            style={{
              maxWidth: Math.min(
                700,
                (250 * (layout.width * 60 + 48)) / (layout.height * 60 + 48),
              ),
              margin: "auto",
            }}
          >
            <Keyboard
              study={{
                ...template,
                schemaVersion: 2,
                layoutId: layout.id,
                layout,
                overrides: {},
              }}
            />
          </div>
          <p>
            現在のパレットで新しい案を作成します。KLEの色・文字の配置や書式・プロファイル指定は取り込みません。文字はメイン／サブの最大2つ、行形状は上から順に割り当てます。
          </p>
        </section>
      )}
      <div className="modal-actions">
        <button onClick={onCancel}>キャンセル</button>
        <button
          className="primary"
          disabled={!layout?.name.trim()}
          onClick={() =>
            layout && onImport({ ...layout, name: layout.name.trim() })
          }
        >
          この配列で案を作成
        </button>
      </div>
    </dialog>
  );
}
