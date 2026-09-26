import KitVariantPicker from "./components/KitVariantPicker";
import { restoreStudy, type DeletedStudy } from "./domain/library-actions";
import KitEditor from "./components/KitEditor";
import KitCoverage from "./components/KitCoverage";
import { profiles, profileIds, defaultProfile } from "./domain/profiles";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import Keyboard from "./components/Keyboard";
import SceneToolbar from "./components/SceneToolbar";
import { DEFAULT_SCENE, ANGLED, type CameraPose } from "./three/settings";
import type { Capture3D } from "./three/Keyboard3D";
const Keyboard3D = lazy(() => import("./three/Keyboard3D"));
import { availableLayouts, switchLayout } from "./domain/design-layout";
import PresetDialog from "./components/PresetDialog";
import KLEImportDialog from "./components/KLEImportDialog";
import ImportDialog from "./components/ImportDialog";
import HexInput from "./components/HexInput";
import ExportDialog, { type ExportArtifact } from "./components/ExportDialog";
import { layoutSignature, type Layout } from "./domain/layout";
import {
  samples,
  getLayout,
  roles,
  roleLabels,
  duplicateStudy,
  mergeLibraries,
  parseLibrary,
  type Study,
} from "./domain/model";
import {
  loadLibrary,
  saveLibrary,
  serialize,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
} from "./storage/library";
import { download, pngBlob, renderSvg, safeName } from "./renderer/svg";
function initial() {
  try {
    return {
      studies: loadLibrary(localStorage) ?? structuredClone(samples),
      error: "",
    };
  } catch {
    return {
      studies: structuredClone(samples),
      error:
        "保存データを読み込めませんでした。元データを保護するため、自動保存を停止しています。元データを退避してから保存を再開してください。",
    };
  }
}
export default function App() {
  const [boot] = useState(initial);
  const [studies, setStudies] = useState<Study[]>(boot.studies);
  const [activeId, setActiveId] = useState(boot.studies[0]?.id ?? "");
  const [renderMode, setRenderMode] = useState<"2d" | "3d">("2d");
  const [sceneSettings, setSceneSettings] = useState(DEFAULT_SCENE);
  const export3D = useRef<Capture3D | null>(null);
  const [ready3D, setReady3D] = useState(false);
  const register3D = useCallback((fn: Capture3D | null) => {
    export3D.current = fn;
    setReady3D(Boolean(fn));
  }, []);
  const updatePose = useCallback(
    (pose: CameraPose) => setSceneSettings((s) => ({ ...s, pose })),
    [],
  );
  const [reviewTarget, setReviewTarget] = useState<"layout" | "kit">("layout");
  const [reviewKey, setReviewKey] = useState("");
  const [stage, setStage] = useState<"setup" | "design" | "review">("setup");
  const [inspectorHost, setInspectorHost] = useState<HTMLDivElement | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [blocked, setBlocked] = useState(Boolean(boot.error));
  const [storageError, setStorageError] = useState(boot.error);
  const [saveState, setSaveState] = useState("保存中…");
  const [deleted, setDeleted] = useState<DeletedStudy[]>([]);
  const [notice, setNotice] = useState("");
  const [pngWidth, setPngWidth] = useState(2844);
  const [exporting, setExporting] = useState(false);
  const [kleOpen, setKleOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Study[] | null>(null);
  const [artifact, setArtifact] = useState<ExportArtifact | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const active =
    studies.find((s) => s.id === activeId) ?? studies[0] ?? samples[0];
  const layout = getLayout(active),
    layoutKey = layoutSignature(layout);
  useEffect(() => {
    setSceneSettings((s) => ({
      ...s,
      pose: ANGLED,
      projection: "perspective",
    }));
  }, [layoutKey]);
  useEffect(() => {
    if (blocked) return;
    setSaveState("保存中…");
    const persist = () => {
      try {
        saveLibrary(localStorage, studies);
        setSaveState("このブラウザに保存済み");
        setStorageError("");
      } catch {
        setSaveState("未保存");
        setStorageError(
          "保存できませんでした。容量やブラウザ設定を確認し、JSONでバックアップしてください。",
        );
      }
    };
    const timer = setTimeout(persist, 250);
    window.addEventListener("pagehide", persist);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", persist);
    };
  }, [studies, blocked]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5500);
    return () => clearTimeout(timer);
  }, [notice]);
  function update(fn: (s: Study) => Study) {
    setStudies((all) =>
      all.map((s) =>
        s.id === active.id
          ? { ...fn(s), updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }
  function add(copy: boolean) {
    if (studies.length >= 200) {
      setNotice("案は200件まで保存できます");
      return;
    }
    const next = duplicateStudy(active);
    if (!copy) {
      next.name = "新しいセット";
      next.concept = "";
      next.keywords = "";
      next.overrides = {};
      next.kit = [];
      next.artworkAssets = undefined;
      next.favorite = false;
      next.kitTargets = undefined;
      next.variantSelections = undefined;
      next.designKeys = next.schemaVersion === 3 ? {} : undefined;
      next.layouts = next.schemaVersion === 3 ? [getLayout(next)] : undefined;
    }
    setStudies((all) => [...all, next]);
    setActiveId(next.id);
    setStage(copy ? "design" : "setup");
    setNotice(copy ? "案を複製しました" : "新しい案を作成しました");
  }
  function deleteActive() {
    const index = studies.findIndex((s) => s.id === active.id);
    if (index < 0) return;
    const remaining = studies.filter((s) => s.id !== active.id);
    setDeleted((items) => [...items, { study: active, index }]);
    setStudies(remaining);
    setActiveId(remaining[Math.min(index, remaining.length - 1)]?.id ?? "");
    setNotice("");
  }
  function undoDelete() {
    const entry = deleted.at(-1);
    if (!entry) return;
    try {
      const restored = restoreStudy(studies, entry);
      setStudies(restored.studies);
      setActiveId(restored.id);
      setDeleted((items) => items.slice(0, -1));
      setSearch("");
      setFavoritesOnly(false);
      setNotice("セットを復元しました");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  function importLayout(layout: Layout) {
    if (
      (active.layouts?.length ?? 0) >= 40 &&
      !active.layouts?.some((l) => l.id === layout.id)
    ) {
      setNotice("ひとつのデザインに保持できる配列は40種類までです");
      return;
    }
    update((s) => switchLayout(s, layout));
    setKleOpen(false);
    setPresetOpen(false);
    setNotice(layout.name + "に切り替えました");
  }
  async function exportImage(kind: "svg" | "png") {
    setExporting(true);
    try {
      const blob =
        kind === "svg"
          ? new Blob([renderSvg(active)], {
              type: "image/svg+xml;charset=utf-8",
            })
          : renderMode === "3d"
            ? await (export3D.current
                ? export3D.current(pngWidth)
                : Promise.reject(new Error("3Dの準備中です")))
            : await pngBlob(active, pngWidth);
      setArtifact({
        blob,
        name: `${safeName(active.name)}${renderMode === "3d" && kind === "png" ? "-3d" : ""}.${kind}`,
        kind,
      });
    } catch {
      setNotice("画像の書き出しに失敗しました。もう一度お試しください。");
    } finally {
      setExporting(false);
    }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("JSONは2MB以下にしてください");
      const incoming = parseLibrary(await file.text()).studies;
      if (!incoming.length) throw new Error("このJSONにセットはありません");
      setPendingImport(incoming);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "読み込みに失敗しました",
      );
    }
  }
  function applyImport() {
    if (!pendingImport) return;
    try {
      const merged = mergeLibraries(studies, pendingImport);
      setStudies(merged);
      setActiveId(merged[studies.length].id);
      setPendingImport(null);
      setNotice("JSONから案を追加しました。既存の案は保持しています。");
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  const visible = studies.filter(
    (s) =>
      (!favoritesOnly || s.favorite) &&
      `${s.name} ${s.concept} ${s.keywords}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#">
          <span className="brand-mark">
            k<span>·</span>
          </span>
          <span>
            keycap<span className="brand-light">studio</span>
          </span>
        </a>
        <div className="library-heading">
          <h2>デザインライブラリ</h2>
          <span>{studies.length.toString().padStart(2, "0")}</span>
        </div>
        <button className="new-study" onClick={() => add(false)}>
          ＋ 新しいセット
        </button>
        <input
          className="search"
          aria-label="案を検索"
          placeholder="名前・コンセプトで検索"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="library-filter">
          <button
            className={!favoritesOnly ? "active" : ""}
            onClick={() => setFavoritesOnly(false)}
          >
            すべて
          </button>
          <button
            className={favoritesOnly ? "active" : ""}
            onClick={() => setFavoritesOnly(true)}
          >
            ★ お気に入り
          </button>
        </div>
        <nav aria-label="デザイン一覧" className="study-list">
          {visible.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setActiveId(s.id);
                setStage("design");
              }}
              className={`study-item ${s.id === active.id ? "active" : ""}`}
            >
              <span className="study-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="study-info">
                <strong>{s.name}</strong>
                <span>
                  {getLayout(s).name} {s.favorite ? "· ★" : ""}
                </span>
              </span>
              <span className="mini-swatches">
                {roles.map((r) => (
                  <i key={r} style={{ background: s.palette[r].color }} />
                ))}
              </span>
            </button>
          ))}
          {!visible.length && (
            <p className="empty-list">
              {studies.length
                ? "条件に合う案がありません。"
                : "セットはありません。"}
            </p>
          )}
        </nav>
        <div className="sidebar-footer">
          <p>
            保存先はこのブラウザです。
            <br />
            JSONでバックアップできます。
          </p>
          <button
            onClick={() =>
              setArtifact({
                blob: new Blob([serialize(studies)], {
                  type: "application/json",
                }),
                name: "keycap-studio-backup.json",
                kind: "json",
              })
            }
          >
            ↓ JSONバックアップ
          </button>
          <button onClick={() => importInput.current?.click()}>
            ↑ JSONを読み込む
          </button>
          <input
            ref={importInput}
            type="file"
            accept=".json,application/json"
            onChange={importFile}
            hidden
            aria-label="JSONファイル"
          />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className={`save-status ${storageError ? "error" : ""}`}>
            <span className="live-dot" />
            {blocked ? "自動保存停止中" : saveState}
          </div>
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            <p>{storageError}</p>
            {blocked && (
              <>
                <button
                  onClick={() => {
                    try {
                      download(
                        new Blob(
                          [
                            localStorage.getItem(STORAGE_KEY) ??
                              localStorage.getItem(LEGACY_STORAGE_KEY) ??
                              "",
                          ],
                          {
                            type: "text/plain",
                          },
                        ),
                        "keycap-studio-recovery.txt",
                      );
                    } catch {
                      setNotice("元データにアクセスできません");
                    }
                  }}
                >
                  元データを退避
                </button>
                <button
                  onClick={() => {
                    setBlocked(false);
                    setStorageError("");
                  }}
                >
                  表示中の案で保存を再開
                </button>
              </>
            )}
          </div>
        )}
        {deleted.length > 0 && (
          <div className="deletion-banner" role="status">
            <div>
              「{deleted.at(-1)!.study.name}」を削除しました。
              <small>
                再読み込みまで取り消せます（残り{deleted.length}件）。
              </small>
            </div>
            <button onClick={undoDelete}>削除を取り消す</button>
          </div>
        )}
        {!studies.length ? (
          <section className="empty-library">
            <h1>セットはありません</h1>
            <button className="new-study" onClick={() => add(false)}>
              新しいセットを作成
            </button>
            <button onClick={() => importInput.current?.click()}>
              JSONを読み込む
            </button>
          </section>
        ) : (
          <>
            <section className="page-heading">
              <h1>{active.name}</h1>
              <div className="set-actions">
                <button
                  className={`star-button ${active.favorite ? "on" : ""}`}
                  aria-label="お気に入り"
                  aria-pressed={active.favorite}
                  onClick={() =>
                    update((s) => ({ ...s, favorite: !s.favorite }))
                  }
                >
                  {active.favorite ? "★" : "☆"}
                </button>
                <details className="set-menu">
                  <summary>セットの操作</summary>
                  <div>
                    {" "}
                    <button className="quiet-button" onClick={deleteActive}>
                      セットを削除
                    </button>
                    <button className="quiet-button" onClick={() => add(true)}>
                      セットを複製
                    </button>
                  </div>
                </details>
              </div>
            </section>
            <nav className="workflow-nav" aria-label="セット作成の工程">
              {(
                [
                  ["setup", "構成"],
                  ["design", "デザイン"],
                  ["review", "確認・出力"],
                ] as const
              ).map(([id, label], i) => (
                <button
                  key={id}
                  aria-current={stage === id ? "step" : undefined}
                  onClick={() => setStage(id)}
                >
                  <span>{i + 1}</span>
                  {label}
                </button>
              ))}
            </nav>
            {stage === "setup" && (
              <section className="setup-intro">
                <label>
                  セット名
                  <input
                    value={active.name}
                    maxLength={80}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        name: e.target.value || "新しいセット",
                      }))
                    }
                  />
                </label>
                <label>
                  プロファイル
                  <select
                    value={active.profile ?? defaultProfile}
                    onChange={(e) =>
                      update((s) => ({
                        ...s,
                        profile: e.target.value as typeof defaultProfile,
                      }))
                    }
                  >
                    {[
                      ...new Set(
                        profileIds.map((id) => profiles[id].group ?? "その他"),
                      ),
                    ].map((group) => (
                      <optgroup key={group} label={group}>
                        {profileIds
                          .filter(
                            (id) => (profiles[id].group ?? "その他") === group,
                          )
                          .map((id) => (
                            <option key={id} value={id}>
                              {profiles[id].name}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
                <button
                  className="import-layout"
                  disabled={!studies.length}
                  onClick={() => setPresetOpen(true)}
                >
                  配列の一覧
                </button>
                <button
                  className="import-layout"
                  disabled={!studies.length}
                  onClick={() => setKleOpen(true)}
                >
                  KLE配列を追加
                </button>
              </section>
            )}
            {stage === "setup" && (
              <>
                <details className="profile-info">
                  <summary>プロファイルの仕様・参照元</summary>
                  <p>
                    {profiles[active.profile ?? defaultProfile].name} ·{" "}
                    {profiles[active.profile ?? defaultProfile].uniform
                      ? "均一"
                      : "段差あり"}{" "}
                    · 外観確認用の概形
                  </p>
                  <p>
                    公開資料を参考に高さ・傾斜・天面を近似しています。実測CADではありません。選択した配列の全キーへ形状を適用しますが、実製品のR・u収録や取付互換性を示すものではありません。
                  </p>
                  {profiles[active.profile ?? defaultProfile].source && (
                    <a
                      href={profiles[active.profile ?? defaultProfile].source}
                      target="_blank"
                      rel="noreferrer"
                    >
                      メーカー・設計者の資料
                    </a>
                  )}
                </details>
              </>
            )}
            <div
              className={`workflow-workspace ${stage === "design" ? "design-stage" : ""}`}
            >
              <aside className="design-inspector" hidden={stage !== "design"}>
                <details className="editor-card concept-card">
                  <summary>セットの説明</summary>

                  <label>
                    スタディ名
                    <input
                      value={active.name}
                      maxLength={80}
                      onChange={(e) =>
                        update((s) => ({
                          ...s,
                          name: e.target.value || "Untitled",
                        }))
                      }
                    />
                  </label>
                  <label>
                    ストーリー
                    <textarea
                      rows={3}
                      maxLength={1200}
                      value={active.concept}
                      onChange={(e) =>
                        update((s) => ({ ...s, concept: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    キーワード
                    <input
                      value={active.keywords}
                      maxLength={240}
                      onChange={(e) =>
                        update((s) => ({ ...s, keywords: e.target.value }))
                      }
                      placeholder="quiet / city / midnight"
                    />
                  </label>
                </details>
                <section className="editor-card">
                  <div className="section-title">
                    <h2>カラーパレット</h2>
                  </div>
                  <div className="palette-head">
                    <span>キーの役割</span>
                    <span>キー色 / 文字色</span>
                  </div>
                  {roles.map((role) => (
                    <div className="palette-row" key={role}>
                      <span
                        className="palette-preview"
                        style={{
                          background: active.palette[role].color,
                          color: active.palette[role].ink,
                        }}
                      >
                        Aa
                      </span>
                      <span className="palette-name">
                        {roleLabels[role]}
                        <HexInput
                          label={`${roleLabels[role]}のHEX`}
                          value={active.palette[role].color}
                          onChange={(color) =>
                            update((s) => ({
                              ...s,
                              palette: {
                                ...s.palette,
                                [role]: { ...s.palette[role], color },
                              },
                            }))
                          }
                        />
                      </span>
                      <label className="color-input">
                        <span className="sr-only">
                          {roleLabels[role]}のキー色
                        </span>
                        <input
                          type="color"
                          value={active.palette[role].color}
                          onInput={(e) => {
                            const color = e.currentTarget.value;
                            update((s) => ({
                              ...s,
                              palette: {
                                ...s.palette,
                                [role]: { ...s.palette[role], color },
                              },
                            }));
                          }}
                        />
                      </label>
                      <label className="color-input">
                        <span className="sr-only">
                          {roleLabels[role]}の文字色
                        </span>
                        <input
                          type="color"
                          value={active.palette[role].ink}
                          onInput={(e) => {
                            const ink = e.currentTarget.value;
                            update((s) => ({
                              ...s,
                              palette: {
                                ...s.palette,
                                [role]: { ...s.palette[role], ink },
                              },
                            }));
                          }}
                        />
                      </label>
                    </div>
                  ))}
                  <div className="legend-options">
                    <label>
                      文字の位置
                      <select
                        value={active.legend.align}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            legend: {
                              ...s.legend,
                              align: e.target.value as "left" | "center",
                            },
                          }))
                        }
                      >
                        <option value="left">左寄せ</option>
                        <option value="center">中央</option>
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={active.legend.sublegends}
                        onChange={(e) =>
                          update((s) => ({
                            ...s,
                            legend: {
                              ...s.legend,
                              sublegends: e.target.checked,
                            },
                          }))
                        }
                      />{" "}
                      サブレジェンド
                    </label>
                  </div>
                </section>
                <div ref={setInspectorHost} />
              </aside>

              <div className="workflow-canvas">
                {stage === "review" && (
                  <label className="review-target">
                    確認・出力するもの
                    <select
                      value={reviewTarget}
                      onChange={(e) =>
                        setReviewTarget(e.target.value as "layout" | "kit")
                      }
                    >
                      <option value="layout">配列への装着イメージ</option>
                      <option value="kit">セットの展開図</option>
                    </select>
                  </label>
                )}
                {stage !== "setup" && (
                  <SceneToolbar
                    mode={renderMode}
                    onMode={setRenderMode}
                    settings={sceneSettings}
                    onSettings={setSceneSettings}
                  />
                )}
                <div hidden={stage === "review" && reviewTarget === "layout"}>
                  <KitEditor
                    key={active.id}
                    study={active}
                    mode={
                      stage === "design" ||
                      (stage === "review" && reviewTarget === "kit")
                        ? renderMode
                        : "2d"
                    }
                    purpose={stage}
                    active={stage === "design"}
                    inspectorHost={inspectorHost}
                    onContinue={() => setStage("design")}
                    onMode={setRenderMode}
                    scene={sceneSettings}
                    onScene={setSceneSettings}
                    onAssetsChange={(artworkAssets) =>
                      update((s) => ({ ...s, artworkAssets }))
                    }
                    onChange={(kit, kitTargets) =>
                      update((s) => ({ ...s, kit, kitTargets }))
                    }
                    onExport={setArtifact}
                  />
                </div>
                {stage === "review" && reviewTarget === "layout" && (
                  <>
                    <label>
                      プレビュー配列
                      <select
                        value={layout.id}
                        onChange={(e) => {
                          const target = availableLayouts(active).find(
                            (l) => l.id === e.target.value,
                          );
                          if (target) importLayout(target);
                        }}
                      >
                        {availableLayouts(active).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} · {l.keys.length}キー
                          </option>
                        ))}
                      </select>
                    </label>
                    <KitCoverage study={active} />
                    <section className="preview-panel">
                      <div className="preview-heading">
                        <div>
                          <h2>{active.name}</h2>
                        </div>
                      </div>
                      <div className="keyboard-stage">
                        {renderMode === "2d" ? (
                          <Keyboard study={active} />
                        ) : (
                          <Suspense
                            fallback={
                              <div className="three-loading">
                                3Dエンジンを読み込み中…
                              </div>
                            }
                          >
                            <Keyboard3D
                              study={active}
                              settings={sceneSettings}
                              onPose={updatePose}
                              onReady={register3D}
                            />
                          </Suspense>
                        )}
                      </div>
                      <div className="preview-footer">
                        <span>
                          <span className="tiny-square" />{" "}
                          配列に装着した状態を確認
                        </span>
                        <span>
                          {renderMode === "2d"
                            ? "TOP VIEW / SVG"
                            : "3D / STUDIO SCULPTED"}
                        </span>
                      </div>
                    </section>
                    <details className="review-variants">
                      <summary>配列ごとの使用バリエーション</summary>
                      <label>
                        確認するキー
                        <select
                          value={
                            layout.keys.some((k) => k.id === reviewKey)
                              ? reviewKey
                              : layout.keys[0].id
                          }
                          onChange={(e) => setReviewKey(e.target.value)}
                        >
                          {layout.keys.map((k) => (
                            <option key={k.id} value={k.id}>
                              {k.label || "Space"} · {k.w}×{k.h}u
                            </option>
                          ))}
                        </select>
                      </label>
                      <KitVariantPicker
                        study={active}
                        keyId={
                          layout.keys.some((k) => k.id === reviewKey)
                            ? reviewKey
                            : layout.keys[0].id
                        }
                        onChange={(next) => update(() => next)}
                      />
                    </details>
                    <section className="export-bar">
                      <div>
                        <strong>画像を書き出す</strong>
                        <p>
                          {renderMode === "2d"
                            ? "透明背景で出力。縦長の配列はPNGサイズを自動調整します。"
                            : "3Dは現在の視点・照明でPNG出力。SVGは2Dの出力です。"}
                        </p>
                      </div>
                      <div className="export-actions">
                        <label className="sr-only" htmlFor="png-width">
                          PNG出力幅
                        </label>
                        <select
                          id="png-width"
                          value={pngWidth}
                          onChange={(e) => setPngWidth(Number(e.target.value))}
                        >
                          <option value={1896}>PNG · 1896 px</option>
                          <option value={2844}>PNG · 2844 px</option>
                          <option value={3792}>PNG · 3792 px</option>
                        </select>
                        <button
                          disabled={exporting}
                          onClick={() => exportImage("svg")}
                        >
                          ↓ SVG
                        </button>
                        <button
                          className="primary"
                          disabled={
                            exporting || (renderMode === "3d" && !ready3D)
                          }
                          onClick={() => exportImage("png")}
                        >
                          {renderMode === "3d"
                            ? "↓ 3D PNGを書き出す"
                            : "↓ PNGを書き出す"}
                        </button>
                      </div>
                    </section>
                  </>
                )}
                {stage === "design" && (
                  <div className="workflow-next">
                    <button onClick={() => setStage("setup")}>
                      構成を見直す
                    </button>
                    <button
                      className="primary"
                      onClick={() => setStage("review")}
                    >
                      確認・出力へ →
                    </button>
                  </div>
                )}
                {stage === "review" && (
                  <div className="workflow-next">
                    <button onClick={() => setStage("design")}>
                      デザインに戻る
                    </button>
                    <button
                      onClick={() =>
                        setArtifact({
                          blob: new Blob([serialize([active])], {
                            type: "application/json",
                          }),
                          name: safeName(active.name) + ".json",
                          kind: "json",
                        })
                      }
                    >
                      このセットのJSONを保存
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <footer className="main-footer">
          <span>
            色は画面上のイメージです。製造色は現物で確認してください。
          </span>
        </footer>
      </main>
      {presetOpen && (
        <PresetDialog
          template={active}
          onCancel={() => setPresetOpen(false)}
          onCreate={importLayout}
        />
      )}
      {kleOpen && (
        <KLEImportDialog
          template={active}
          onCancel={() => setKleOpen(false)}
          onImport={importLayout}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="通知を閉じる">
            ×
          </button>
        </div>
      )}
      {artifact && (
        <ExportDialog artifact={artifact} onClose={() => setArtifact(null)} />
      )}
      {pendingImport && (
        <ImportDialog
          studies={pendingImport}
          onCancel={() => setPendingImport(null)}
          onImport={applyImport}
        />
      )}
    </div>
  );
}
