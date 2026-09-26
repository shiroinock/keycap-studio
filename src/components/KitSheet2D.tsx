import { useRef, useState, type PointerEvent } from "react";
import { enterClipPath } from "../domain/key-shape";
import type { KitSheet } from "../domain/kit-sheet";
import { boxSelection } from "../domain/kit-selection";
import { UNIT, PAD } from "../renderer/svg";
export default function KitSheet2D({
  sheet,
  svg,
  selected,
  onSelect,
  onBox,
}: {
  sheet: KitSheet;
  svg: string;
  selected: string[];
  onSelect: (id: string, shift: boolean, toggle: boolean) => void;
  onBox: (ids: string[], additive: boolean) => void;
}) {
  const layout = sheet.study.layout!,
    width = layout.width * UNIT + PAD * 2,
    height = layout.height * UNIT + PAD * 2;
  const start = useRef<{ x: number; y: number; additive: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);
  const [box, setBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  function point(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * width,
      y: ((e.clientY - r.top) / r.height) * height,
    };
  }
  return (
    <div
      className="kit-flat"
      style={{ aspectRatio: `${width}/${height}`, touchAction: "none" }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        const p = point(e);
        start.current = {
          ...p,
          additive: e.shiftKey || e.metaKey || e.ctrlKey,
        };
        suppressClick.current = false;
      }}
      onPointerMove={(e) => {
        const a = start.current;
        if (!a) return;
        const p = point(e);
        if (Math.hypot(p.x - a.x, p.y - a.y) < 6) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        suppressClick.current = true;
        setBox({
          x: Math.min(a.x, p.x),
          y: Math.min(a.y, p.y),
          w: Math.abs(p.x - a.x),
          h: Math.abs(p.y - a.y),
        });
      }}
      onPointerUp={(e) => {
        const a = start.current;
        if (a && suppressClick.current) {
          const p = point(e);
          onBox(
            boxSelection(layout.keys, sheet.sourceIds, {
              x: (Math.min(a.x, p.x) - PAD) / UNIT,
              y: (Math.min(a.y, p.y) - PAD) / UNIT,
              w: Math.abs(p.x - a.x) / UNIT,
              h: Math.abs(p.y - a.y) / UNIT,
            }),
            a.additive,
          );
        }
        start.current = null;
        setBox(null);
      }}
      onPointerCancel={() => {
        start.current = null;
        setBox(null);
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <img
        draggable={false}
        src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)}
        alt="収録キーのセット展開図"
      />
      {layout.keys.map((k) => (
        <button
          key={k.id}
          className={`kit-hit ${selected.includes(sheet.sourceIds[k.id]) ? "selected" : ""}`}
          aria-pressed={selected.includes(sheet.sourceIds[k.id])}
          aria-label={`${sheet.missingIds.has(k.id) ? "未収録キーを追加" : "収録キー"} ${k.label || "Space"} ${k.w}u ${k.id}`}
          onClick={(e) => onSelect(k.id, e.shiftKey, e.metaKey || e.ctrlKey)}
          style={{
            clipPath:
              k.shape === "iso-enter" ? enterClipPath(UNIT, 0) : undefined,
            left: `${(100 * (PAD + k.x * UNIT)) / width}%`,
            top: `${(100 * (PAD + k.y * UNIT)) / height}%`,
            width: `${(100 * k.w * UNIT) / width}%`,
            height: `${(100 * k.h * UNIT) / height}%`,
          }}
        />
      ))}
      {box && (
        <div
          className="kit-selection-box"
          style={{
            left: `${(box.x / width) * 100}%`,
            top: `${(box.y / height) * 100}%`,
            width: `${(box.w / width) * 100}%`,
            height: `${(box.h / height) * 100}%`,
          }}
        />
      )}
    </div>
  );
}
