import { useState, type ChangeEvent } from "react";
import {
  defaultArt,
  type ArtworkAsset,
  type CustomArt,
} from "../domain/custom-art";
import { importArtwork } from "../artwork/import";
export default function CustomArtwork({
  assets,
  value,
  onAssets,
  onChange,
}: {
  assets: ArtworkAsset[];
  value?: CustomArt | null;
  onAssets: (assets: ArtworkAsset[]) => void;
  onChange: (value: CustomArt | null) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (assets.length >= 12) throw new Error("絵柄は1セット12点までです");
      const asset = await importArtwork(file);
      onAssets([...assets, asset]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "画像の取り込みに失敗しました");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset className="custom-artwork">
      <legend>オリジナルの絵柄</legend>
      <label className="art-upload">
        SVG・透過PNGを追加
        <input
          type="file"
          accept=".svg,.png,image/svg+xml,image/png"
          disabled={busy || assets.length >= 12}
          onChange={upload}
        />
      </label>
      <small>
        {busy
          ? "取り込み中…"
          : "このセットに保存 · 最大12点 · 1MB以下 · 最大512pxで保存"}
      </small>
      {error && <p role="alert">{error}</p>}
      <div className="art-library" aria-label="絵柄ライブラリ">
        {assets.map((a) => (
          <button
            type="button"
            key={a.id}
            title={a.name}
            aria-label={`絵柄を使用: ${a.name}`}
            aria-pressed={value?.assetId === a.id}
            onClick={() => onChange(defaultArt(a.id))}
          >
            <img src={a.dataUrl} alt="" />
            <span>{a.name}</span>
          </button>
        ))}
      </div>
      {value && (
        <>
          <p>絵柄は刻印の代わりに表示します。色は元画像を使用します。</p>
          {(
            [
              ["x", "横位置", 0, 1, 0.01],
              ["y", "縦位置", 0, 1, 0.01],
              ["scale", "大きさ", 0.1, 2, 0.05],
              ["rotation", "回転", -180, 180, 1],
            ] as const
          ).map(([field, label, min, max, step]) => (
            <label key={field}>
              {label}
              <input
                aria-label={`絵柄の${label}`}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value[field]}
                onChange={(e) =>
                  onChange({ ...value, [field]: Number(e.target.value) })
                }
              />
              <output>
                {field === "rotation"
                  ? `${value[field]}°`
                  : `${Math.round(value[field] * 100)}%`}
              </output>
            </label>
          ))}
          <button
            type="button"
            onClick={() => onChange(defaultArt(value.assetId))}
          >
            配置を中央に戻す
          </button>
          <button type="button" onClick={() => onChange(null)}>
            このキーの絵柄を外す
          </button>
        </>
      )}
    </fieldset>
  );
}
