import {
  compatibleKitKeys,
  getLayout,
  selectKitVariant,
  type Study,
} from "../domain/model";
import { kitArtwork } from "../domain/kit";
import { kitGroups } from "../domain/kit-sheet";
export default function KitVariantPicker({
  study,
  keyId,
  onChange,
}: {
  study: Study;
  keyId: string;
  onChange: (study: Study) => void;
}) {
  const candidates = compatibleKitKeys(study, keyId);
  const saved = study.variantSelections?.[getLayout(study).id]?.[keyId];
  const selected = candidates.some((k) => k.id === saved) ? saved : "";
  return (
    <div className="variant-picker">
      <label>
        この配列で使用する収録キー
        <select
          value={selected}
          onChange={(e) =>
            onChange(selectKitVariant(study, keyId, e.target.value || null))
          }
        >
          <option value="">自動（先頭の互換キー）</option>
          {candidates.map((k, i) => {
            const art = kitArtwork(study, k);
            return (
              <option key={k.id} value={k.id}>
                {i + 1}. {art.main || k.label || "Space"} · {kitGroups[k.group]}{" "}
                · {art.color}
                {art.novelty !== "none" ? ` · ${art.novelty}` : ""}
              </option>
            );
          })}
        </select>
      </label>
      <div className="variant-options">
        {candidates.map((k, i) => {
          const art = kitArtwork(study, k);
          return (
            <button
              key={k.id}
              type="button"
              aria-pressed={selected === k.id}
              aria-label={`バリエーション ${i + 1}: ${art.main || k.label || "Space"} ${kitGroups[k.group]} ${art.color}`}
              onClick={() => onChange(selectKitVariant(study, keyId, k.id))}
            >
              <span
                className="variant-swatch"
                style={{ backgroundColor: art.color, color: art.ink }}
              >
                {art.novelty === "none"
                  ? art.main || "Space"
                  : { sun: "☀", moon: "☾", spark: "✧", wave: "〜" }[
                      art.novelty
                    ]}
              </span>
              <span>{kitGroups[k.group]}</span>
            </button>
          );
        })}
      </div>
      <p className="field-note">
        {saved && !selected
          ? "選択したキーは削除または寸法・Rが変更されたため、現在は自動選択です。"
          : candidates.length
            ? "選択はこの配列に保存されます。色・刻印の編集は選択した収録キーに反映します。"
            : "互換の収録キーがありません。セット展開図で追加できます。"}
      </p>
    </div>
  );
}
