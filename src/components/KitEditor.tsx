import HexInput from "./HexInput";
import LayoutCoverage from "./LayoutCoverage";
import KitSheet2D from "./KitSheet2D";
import {
  patchKitSelection,
  rangeSelection,
  sheetOrder,
} from "../domain/kit-selection";
import { layoutPresets } from "../domain/presets";
import { kitSignature } from "../domain/kit";
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
  onChange: (kit: KitKey[], targets?: string[]) => void;
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
  const [selection, setSelection] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const selected = selection.filter((id) => kit.some((k) => k.id === id));
  const setSelected = (id: string | null) => {
    setSelection(id ? [id] : []);
    setAnchor(id);
  };
  const [bulkColor, setBulkColor] = useState("#b76b46");
  const [bulkInk, setBulkInk] = useState("#ffffff");
  const [bulkGroup, setBulkGroup] = useState<KitKey["group"]>("extras");
  const [fields, setFields] = useState({
    color: false,
    ink: false,
    group: false,
  });
  const [error, setError] = useState(""),
    [undo, setUndo] = useState<{ kit: KitKey[]; targets?: string[] } | null>(
      null,
    );
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<"sheet" | "coverage">("sheet");
  const sheet = useMemo(() => kitSheet(study, filter), [study, filter]);
  const svg = useMemo(() => renderKitSvg(study, filter), [study, filter]);
  const entry =
      selected.length === 1 ? kit.find((k) => k.id === selected[0]) : undefined,
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
  function commit(next: KitKey[], targets = study.kitTargets) {
    setUndo({ kit: structuredClone(kit), targets: study.kitTargets });
    onChange(next, targets);
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
  function selectSheetKey(id: string, shift = false, toggle = false) {
    const sourceId = sheet.sourceIds[id];
    if (sourceId) {
      if (shift)
        setSelection(
          rangeSelection(
            sheetOrder(sheet.study.layout!.keys, sheet.sourceIds),
            anchor,
            sourceId,
          ),
        );
      else if (toggle) {
        setSelection((ids) =>
          ids.includes(sourceId)
            ? ids.filter((id) => id !== sourceId)
            : [...ids, sourceId],
        );
        setAnchor(sourceId);
      } else setSelected(sourceId);
    } else {
      if (shift || toggle) return;
      const key = sheet.kit.find((k) => k.id === id);
      if (key)
        add([
          {
            ...key,
            group: key.group === "numpad" ? "numpad" : "extras",
            placement: undefined,
          },
        ]);
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
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setSelected(null);
            }}
          >
            <option value="all">収録キー一覧（すべて）</option>
            {groups.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={() => {
            setAdding(!adding);
            setView("sheet");
          }}
        >
          ＋ キーを追加
        </button>
        <button
          disabled={!undo}
          onClick={() => {
            if (undo) {
              onChange(undo.kit, undo.targets);
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
      <div className="kit-actions" aria-label="セットの表示">
        <button
          aria-pressed={view === "sheet"}
          onClick={() => setView("sheet")}
        >
          収録キー
        </button>
        <button
          aria-pressed={view === "coverage"}
          onClick={() => setView("coverage")}
        >
          対応配列
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {view === "coverage" && (
        <LayoutCoverage
          study={study}
          onAdd={add}
          onApply={(keys, targets) => {
            try {
              commit(addKitKeys(study, keys), targets);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      )}
      <div hidden={view !== "sheet"}>
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
                                  r.key.group === "numpad"
                                    ? "numpad"
                                    : "extras",
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
                  const key = choices.find(
                    (k) => k.identity === e.target.value,
                  );
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
                  onChange={(e) =>
                    setDraft({ ...draft, label: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              追加先
              <select
                value={draft.group}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    group: e.target.value as KitKey["group"],
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

        {filter === "all" && (
          <p className="kit-note">
            ANSIを土台に、JISで用途・R・寸法・形状が異なるキーだけを実配列の位置に揃えて下へ表示します。グレーの未収録キーはクリックで追加できます。
          </p>
        )}
        <div className="kit-bulk-select">
          <label>
            まとめて選択
            <select
              value=""
              onChange={(e) => {
                const value = e.target.value;
                const visible = new Set(Object.values(sheet.sourceIds));
                let matches = kit.filter((k) => visible.has(k.id));
                if (value === "modifier")
                  matches = matches.filter((k) => k.role === "modifier");
                else if (value.startsWith("row:"))
                  matches = matches.filter(
                    (k) => rowName(k.row, profile) === value.slice(4),
                  );
                else if (value.startsWith("group:"))
                  matches = matches.filter((k) => k.group === value.slice(6));
                else if (value === "jis") {
                  const ansi = layoutKit(
                    study,
                    layoutPresets.find(
                      (p) => p.layout.id === "preset-fullsize_ansi-v1",
                    )!.layout,
                  );
                  const jis = layoutKit(
                    study,
                    layoutPresets.find(
                      (p) => p.layout.id === "preset-fullsize_jis-v1",
                    )!.layout,
                  );
                  const shared = new Set(
                    ansi.map((k) => kitSignature(k, study)),
                  );
                  const difference = new Set(
                    jis
                      .map((k) => kitSignature(k, study))
                      .filter((sig) => !shared.has(sig)),
                  );
                  matches = matches.filter((k) =>
                    difference.has(kitSignature(k, study)),
                  );
                }
                setSelection(matches.map((k) => k.id));
                setAnchor(matches[0]?.id ?? null);
                setMode("2d");
              }}
            >
              <option value="">選択条件</option>
              <option value="all">表示中の収録キーすべて</option>
              <option value="modifier">修飾キー</option>
              <option value="jis">JIS追加キー</option>
              {rowOptions.map(([name]) => (
                <option key={name} value={"row:" + name}>
                  {name}
                </option>
              ))}
              {groups.map(([id, name]) => (
                <option key={id} value={"group:" + id}>
                  {name}キット
                </option>
              ))}
            </select>
          </label>
          <strong aria-live="polite">{selected.length}種類を選択</strong>
          <button disabled={!selected.length} onClick={() => setSelected(null)}>
            選択を解除
          </button>
          <p>
            2DでShift＋クリック：連続選択 · ⌘ / Ctrl＋クリック：追加・解除 ·
            ドラッグ：範囲選択
          </p>
        </div>
        {selected.length > 0 && (
          <form
            className="kit-bulk-edit"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                commit(
                  patchKitSelection(kit, selected, {
                    ...(fields.color ? { color: bulkColor } : {}),
                    ...(fields.ink ? { ink: bulkInk } : {}),
                    ...(fields.group ? { group: bulkGroup } : {}),
                  }),
                );
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <h3>選択した{selected.length}種類を一括編集</h3>
            <label>
              <input
                type="checkbox"
                checked={fields.color}
                onChange={(e) =>
                  setFields({ ...fields, color: e.target.checked })
                }
              />
              キー色を変更
            </label>
            <input
              aria-label="一括キー色"
              type="color"
              disabled={!fields.color}
              value={bulkColor}
              onChange={(e) => setBulkColor(e.target.value)}
            />
            {fields.color && (
              <HexInput
                label="一括キー色HEX"
                value={bulkColor}
                onChange={setBulkColor}
              />
            )}
            <label>
              <input
                type="checkbox"
                checked={fields.ink}
                onChange={(e) =>
                  setFields({ ...fields, ink: e.target.checked })
                }
              />
              刻印色を変更
            </label>
            <input
              aria-label="一括刻印色"
              type="color"
              disabled={!fields.ink}
              value={bulkInk}
              onChange={(e) => setBulkInk(e.target.value)}
            />
            {fields.ink && (
              <HexInput
                label="一括刻印色HEX"
                value={bulkInk}
                onChange={setBulkInk}
              />
            )}
            <label>
              <input
                type="checkbox"
                checked={fields.group}
                onChange={(e) =>
                  setFields({ ...fields, group: e.target.checked })
                }
              />
              所属キットを変更
            </label>
            <select
              aria-label="一括所属キット"
              disabled={!fields.group}
              value={bulkGroup}
              onChange={(e) => setBulkGroup(e.target.value as KitKey["group"])}
            >
              {groups.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!Object.values(fields).some(Boolean)}
            >
              選択したキーに適用
            </button>
          </form>
        )}
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
          <KitSheet2D
            sheet={sheet}
            svg={svg}
            selected={selected}
            onSelect={selectSheetKey}
            onBox={(ids, additive) => {
              setSelection((old) =>
                additive ? [...new Set([...old, ...ids])] : ids,
              );
              setAnchor(ids[0] ?? null);
            }}
          />
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
              onSelect={selectSheetKey}
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
                    patch({
                      artwork: { ...entry.artwork, main: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                収録キーのサブ文字
                <input
                  maxLength={80}
                  value={art.sub}
                  onChange={(e) =>
                    patch({
                      artwork: { ...entry.artwork, sub: e.target.value },
                    })
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
                    patch({
                      artwork: { ...entry.artwork, ink: e.target.value },
                    })
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
          {filter === "all"
            ? "共通キーは1回だけ表示します。JIS差分の空欄は、上の共通キーを使用する位置です。"
            : "同一種類は1枚で表示し、2個以上は2D図の×数で示します。"}
          収録判定はキーの用途・R・u・形状・数量で行います。
        </p>
      </div>
    </section>
  );
}
