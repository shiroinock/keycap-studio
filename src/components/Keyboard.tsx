import { useMemo } from "react";
import { ansi60 } from "../domain/layout";
import { type Study } from "../domain/model";
import { svgUrl, WIDTH, HEIGHT, UNIT, PAD } from "../renderer/svg";
export default function Keyboard({
  study,
  selected,
  onSelect,
}: {
  study: Study;
  selected?: string;
  onSelect?: (id: string) => void;
}) {
  const src = useMemo(() => svgUrl(study), [study]);
  return (
    <div className="keyboard" style={{ aspectRatio: `${WIDTH}/${HEIGHT}` }}>
      <img
        src={src}
        alt={`${study.name}のANSI 60%・61キーのプレビュー`}
        draggable={false}
      />
      {onSelect && (
        <div className="key-targets">
          {ansi60.keys.map((k) => (
            <button
              key={k.id}
              className={`key-target ${selected === k.id ? "selected" : ""}`}
              aria-label={`キー ${k.label || "Space"} (${k.id})`}
              aria-pressed={selected === k.id}
              onClick={() => onSelect(k.id)}
              style={{
                left: `${((PAD + k.x * UNIT + 3) / WIDTH) * 100}%`,
                top: `${((PAD + k.y * UNIT + 3) / HEIGHT) * 100}%`,
                width: `${((k.w * UNIT - 6) / WIDTH) * 100}%`,
                height: `${((k.h * UNIT - 6) / HEIGHT) * 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
