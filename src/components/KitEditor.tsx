import { enterClipPath } from "../domain/key-shape";
import { lazy, Suspense, useMemo, useState } from "react";
import type { Study } from "../domain/model";
import {
  getKit,
  kitCoverage,
  addKitKeys,
  kitArtwork,
  keyUsage,
  layoutKit,
} from "../domain/kit";
import { kitKeySchema, type KitKey } from "../domain/kit-schema";
import { kitSheet, renderKitSvg, kitGroups } from "../domain/kit-sheet";
import { defaultProfile, rowName, profiles } from "../domain/profiles";
import { availableLayouts } from "../domain/design-layout";
import { DEFAULT_SCENE, TOP } from "../three/settings";
import SceneToolbar from "./SceneToolbar";
import type { ExportArtifact } from "./ExportDialog";
import { safeName, UNIT, PAD } from "../renderer/svg";
const Keyboard3D = lazy(() => import("../three/Keyboard3D"));
export default function KitEditor({
  study,
  onChange,
  onExport,
}: {
  study: Study;
  onChange: (kit: KitKey[]) => void;
  onExport: (a: ExportArtifact) => void;
}) {
  const kit = getKit(study),
    requirements = kitCoverage(study),
    missing = requirements.filter((r) => r.missing);
  const [mode, setMode] = useState<"2d" | "3d">("3d"),
    [filter, setFilter] = useState("all");
  const [scene, setScene] = useState({
    ...DEFAULT_SCENE,
    pose: TOP,
    projection: "orthographic" as const,
  } as typeof DEFAULT_SCENE);
  const [selected, setSelected] = useState<string | null>(null),
    [error, setError] = useState(""),
    [undo, setUndo] = useState<KitKey[] | null>(null);
  const [adding, setAdding] = useState(false);
  const sheet = useMemo(() => kitSheet(study, filter), [study, filter]);
  const svg = useMemo(() => renderKitSvg(study, filter), [study, filter]);
  const entry = kit.find((k) => k.id === selected),
    art = entry ? kitArtwork(study, entry) : null;
  const choices = useMemo(() => {
    const all = availableLayouts(study).flatMap((l) => layoutKit(study, l));
    return all.filter(
      (k, i) => all.findIndex((a) => a.identity === k.identity) === i,
    );
  }, [study]);
  const profile = study.profile ?? defaultProfile;
  const rowOptions = [
    ...new Map(
      [-1, 0, 1, 2, 3, 4]
        .filter((r) => r !== -1 || profiles[profile].functionRow)
        .map((r) => [rowName(r, profile), r]),
    ).entries(),
  ];
  const [draft, setDraft] = useState<KitKey>(() => ({
    ...layoutKit(study)[0],
    id: "new",
    placement: undefined,
    group: "extras",
  }));
  const draftRow =
    rowOptions.find(([name]) => name === rowName(draft.row, profile))?.[1] ??
    rowOptions[0][1];
  function commit(next: KitKey[]) {
    setUndo(structuredClone(kit));
    onChange(next);
    setError("");
  }
  function patch(p: Partial<KitKey>) {
    if (!entry) return;
    const candidate = { ...entry, ...p };
    const parsed = kitKeySchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    commit(kit.map((k) => (k.id === entry.id ? parsed.data : k)));
  }
  function add(keys: KitKey[]) {
    try {
      const next = addKitKeys(study, keys);
      commit(next);
      setAdding(false);
      setFilter("all");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const groups = Object.entries(kitGroups);
  return (
    <section className="kit-editor">
      <header className="kit-heading">
        <h2>{study.name} · セット展開図</h2>
        <span>
          {kit.reduce((n, k) => n + k.quantity, 0)}キー / {kit.length}種類
        </span>
      </header>
      <div className="kit-actions">
        <label>
          表示キット{" "}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">すべて</option>
            {groups.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => setAdding(!adding)}>＋ キーを追加</button>
        <button
          disabled={!undo}
          onClick={() => {
            if (undo) {
              onChange(undo);
              setUndo(null);
            }
          }}
        >
          収録キーの変更を戻す
        </button>
        <button
          onClick={() =>
            onExport({
              blob: new Blob([svg], { type: "image/svg+xml" }),
              name: safeName(study.name) + "-kit.svg",
              kind: "svg",
            })
          }
        >
          展開図SVG
        </button>
      </div>
      <p className="kit-status">
        {missing.length ? (
          <>
            現在の配列に不足：{missing.reduce((n, r) => n + r.missing, 0)}キー{" "}
            <button
              onClick={() =>
                add(
                  missing.map((r) => ({
                    ...r.key,
                    quantity: r.missing,
                    group: r.key.group === "numpad" ? "numpad" : "extras",
                    placement: undefined,
                  })),
                )
              }
            >
              不足分をセットに追加
            </button>
          </>
        ) : (
          <>現在の配列の全キーを収録しています</>
        )}
      </p>
      <details className="kit-missing">
        <summary>配列の収録状況（{requirements.length}種類）</summary>
        <div className="kit-table-scroll">
          <table>
            <thead>
              <tr>
                <th>キー</th>
                <th>区分</th>
                <th>R</th>
                <th>u</th>
                <th>収録 / 必要</th>
                <th>追加</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => (
                <tr key={r.signature}>
                  <td>
                    {kitArtwork(study, r.key).main || r.key.label || "Space"}
                  </td>
                  <td>{keyUsage(r.key)}</td>
                  <td>{rowName(r.key.row, profile)}</td>
                  <td>
                    {r.key.w} × {r.key.h}
                  </td>
                  <td>
                    {r.included} / {r.needed}
                  </td>
                  <td>
                    {r.missing > 0 && (
                      <button
                        aria-label={`${r.key.label || "Space"} ${r.key.w}uを追加`}
                        onClick={() =>
                          add([
                            {
                              ...r.key,
                              quantity: r.missing,
                              group:
                                r.key.group === "numpad" ? "numpad" : "extras",
                              placement: undefined,
                            },
                          ])
                        }
                      >
                        ＋ {r.missing}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      {adding && (
        <form
          className="kit-add"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = kitKeySchema.safeParse({
              ...draft,
              identity:
                draft.identity === "custom"
                  ? JSON.stringify([JSON.stringify(["main", draft.label]), 0])
                  : draft.identity,
              row: draftRow,
              id: crypto.randomUUID(),
              placement: undefined,
            });
            if (!parsed.success) {
              setError(parsed.error.issues[0].message);
              return;
            }
            add([parsed.data]);
          }}
        >
          <h3>収録キーを追加</h3>
          <label>
            元キー
            <select
              value={draft.identity}
              onChange={(e) => {
                const key = choices.find((k) => k.identity === e.target.value);
                setDraft(
                  key
                    ? {
                        ...key,
                        id: "new",
                        group: "extras",
                        placement: undefined,
                      }
                    : {
                        ...draft,
                        identity: "custom",
                        label: "",
                        artwork: undefined,
                      },
                );
              }}
            >
              <option value="custom">カスタムキー</option>
              {choices.map((k) => (
                <option key={k.identity} value={k.identity}>
                  {k.label || "Space"} · {keyUsage(k)}
                </option>
              ))}
            </select>
          </label>
          {draft.identity === "custom" && (
            <label>
              キー名
              <input
                required
                maxLength={80}
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              />
            </label>
          )}
          <label>
            追加先
            <select
              value={draft.group}
              onChange={(e) =>
                setDraft({ ...draft, group: e.target.value as KitKey["group"] })
              }
            >
              {groups.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            追加するR
            <select
              value={draftRow}
              onChange={(e) =>
                setDraft({ ...draft, row: Number(e.target.value) })
              }
            >
              {rowOptions.map(([name, row]) => (
                <option key={name} value={row}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label>
            追加する形状
            <select
              value={draft.shape}
              onChange={(e) => {
                const shape = e.target.value as KitKey["shape"];
                setDraft({
                  ...draft,
                  shape,
                  ...(shape === "iso-enter"
                    ? { w: 1.5, h: 2 }
                    : shape === "space"
                      ? { w: Math.max(1, draft.w), h: 1 }
                      : {}),
                });
              }}
            >
              <option value="standard">標準</option>
              <option value="space">スペース</option>
              <option value="iso-enter">L字Enter</option>
            </select>
          </label>
          <label>
            追加する幅（u）
            <input
              type="number"
              min={draft.shape === "space" ? 1 : 0.5}
              max={10}
              step={0.25}
              required
              disabled={draft.shape === "iso-enter"}
              value={draft.w}
              onChange={(e) =>
                setDraft({ ...draft, w: Number(e.target.value) })
              }
            />
          </label>
          <label>
            追加する高さ（u）
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.25}
              required
              disabled={draft.shape !== "standard"}
              value={draft.h}
              onChange={(e) =>
                setDraft({ ...draft, h: Number(e.target.value) })
              }
            />
          </label>
          <label>
            追加する個数
            <input
              type="number"
              min={1}
              max={200}
              step={1}
              required
              value={draft.quantity}
              onChange={(e) =>
                setDraft({ ...draft, quantity: Number(e.target.value) })
              }
            />
          </label>
          <button type="submit" className="primary">
            セットに追加
          </button>
          <button type="button" onClick={() => setAdding(false)}>
            閉じる
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      <SceneToolbar
        mode={mode}
        onMode={setMode}
        settings={scene}
        onSettings={setScene}
      />
      {!sheet.kit.length ? (
        <p className="kit-empty">
          収録キーがありません。「キーを追加」から追加できます。
        </p>
      ) : mode === "2d" ? (
        <div
          className="kit-flat"
          style={{
            aspectRatio: `${sheet.study.layout!.width * UNIT + PAD * 2}/${sheet.study.layout!.height * UNIT + PAD * 2}`,
          }}
        >
          <img
            src={"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg)}
            alt="収録キーのセット展開図"
          />
          {sheet.study.layout!.keys.map((k) => (
            <button
              key={k.id}
              className={selected === k.id ? "kit-hit selected" : "kit-hit"}
              aria-label={`収録キー ${
                kitArtwork(
                  study,
                  kit.find((a) => a.id === k.id)!,
                ).main || "Space"
              } ${k.w}u ${k.id}`}
              onClick={() => setSelected(k.id)}
              style={{
                clipPath:
                  k.shape === "iso-enter" ? enterClipPath(UNIT, 0) : undefined,
                left: `${(100 * (PAD + k.x * UNIT)) / (sheet.study.layout!.width * UNIT + PAD * 2)}%`,
                top: `${(100 * (PAD + k.y * UNIT)) / (sheet.study.layout!.height * UNIT + PAD * 2)}%`,
                width: `${(100 * k.w * UNIT) / (sheet.study.layout!.width * UNIT + PAD * 2)}%`,
                height: `${(100 * k.h * UNIT) / (sheet.study.layout!.height * UNIT + PAD * 2)}%`,
              }}
            />
          ))}
        </div>
      ) : (
        <Suspense fallback={<p>展開図を読み込み中…</p>}>
          <Keyboard3D
            study={sheet.study}
            bare
            annotations={sheet.labels}
            aspect={
              (sheet.study.layout!.width * UNIT + PAD * 2) /
              (sheet.study.layout!.height * UNIT + PAD * 2)
            }
            settings={scene}
            onPose={(pose) => setScene((s) => ({ ...s, pose }))}
            onSelect={setSelected}
            onExport={(blob) =>
              onExport({
                blob,
                name: safeName(study.name) + "-kit.png",
                kind: "png",
              })
            }
          />
        </Suspense>
      )}
      <div className="kit-selection">
        <label>
          収録キーを選択
          <select
            value={entry?.id ?? ""}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">展開図のキーをクリック</option>
            {kit.map((k) => (
              <option key={k.id} value={k.id}>
                {kitArtwork(study, k).main || k.label || "Space"} ·{" "}
                {keyUsage(k)} · {rowName(k.row, profile)} · {k.w}×{k.h}u ·{" "}
                {kitGroups[k.group]}
              </option>
            ))}
          </select>
        </label>
        {entry && art && (
          <div className="kit-key-fields">
            <label>
              収録キーの刻印
              <input
                maxLength={80}
                value={art.main}
                onChange={(e) =>
                  patch({ artwork: { ...entry.artwork, main: e.target.value } })
                }
              />
            </label>
            <label>
              収録キーのサブ文字
              <input
                maxLength={80}
                value={art.sub}
                onChange={(e) =>
                  patch({ artwork: { ...entry.artwork, sub: e.target.value } })
                }
              />
            </label>
            <label>
              収録キーの色
              <input
                type="color"
                value={art.color}
                onChange={(e) =>
                  patch({
                    artwork: { ...entry.artwork, color: e.target.value },
                  })
                }
              />
            </label>
            <label>
              収録キーの文字色
              <input
                type="color"
                value={art.ink}
                onChange={(e) =>
                  patch({ artwork: { ...entry.artwork, ink: e.target.value } })
                }
              />
            </label>
            <label>
              収録キーのNovelty
              <select
                value={art.novelty}
                onChange={(e) =>
                  patch({
                    artwork: {
                      ...entry.artwork,
                      novelty: e.target.value as typeof art.novelty,
                    },
                  })
                }
              >
                {["none", "sun", "moon", "spark", "wave"].map((v, i) => (
                  <option key={v} value={v}>
                    {["なし", "太陽", "月", "星", "波"][i]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              収録グループ
              <select
                value={entry.group}
                onChange={(e) =>
                  patch({
                    group: e.target.value as KitKey["group"],
                    placement: undefined,
                  })
                }
              >
                {groups.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              収録キーのR
              <select
                value={
                  rowOptions.find(
                    ([n]) => n === rowName(entry.row, profile),
                  )?.[1] ?? rowOptions[0][1]
                }
                onChange={(e) =>
                  patch({ row: Number(e.target.value), placement: undefined })
                }
              >
                {rowOptions.map(([name, row]) => (
                  <option key={name} value={row}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              収録キーの幅（u）
              <input
                type="number"
                min={0.5}
                max={10}
                step={0.25}
                disabled={entry.shape === "iso-enter"}
                value={entry.w}
                onChange={(e) =>
                  patch({ w: Number(e.target.value), placement: undefined })
                }
              />
            </label>
            <label>
              収録数
              <input
                type="number"
                min={1}
                max={200}
                step={1}
                value={entry.quantity}
                onChange={(e) => patch({ quantity: Number(e.target.value) })}
              />
            </label>
            <button
              onClick={() =>
                add([
                  {
                    ...entry,
                    group: "novelty",
                    placement: undefined,
                    quantity: 1,
                    artwork: { ...art, novelty: "spark" },
                  },
                ])
              }
            >
              ノベルティとして複製
            </button>
            <button
              onClick={() => {
                commit(kit.filter((k) => k.id !== entry.id));
                setSelected(null);
              }}
            >
              セットから除外
            </button>
          </div>
        )}
      </div>
      <p className="kit-note">
        同一種類は1枚で表示し、2個以上は2D図の×数で示します。収録判定はキーの用途・R・u・形状・数量で行います。
      </p>
    </section>
  );
}
