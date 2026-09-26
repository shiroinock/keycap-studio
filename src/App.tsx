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
import { DEFAULT_SCENE, type CameraPose } from "./three/settings";
import type { Capture3D } from "./three/Keyboard3D";
const Keyboard3D = lazy(() => import("./three/Keyboard3D"));
import ImportDialog from "./components/ImportDialog";
import HexInput from "./components/HexInput";
import ExportDialog, { type ExportArtifact } from "./components/ExportDialog";
import { ansi60, type KeyRole } from "./domain/layout";
import {
  samples,
  roles,
  roleLabels,
  resolveKeys,
  duplicateStudy,
  mergeLibraries,
  parseLibrary,
  type Study,
  type KeyOverride,
} from "./domain/model";
import {
  loadLibrary,
  saveLibrary,
  serialize,
  STORAGE_KEY,
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
const noveltyNames = {
  none: "なし",
  sun: "太陽",
  moon: "月",
  spark: "星",
  wave: "波",
};
export default function App() {
  const [boot] = useState(initial);
  const [studies, setStudies] = useState<Study[]>(boot.studies);
  const [activeId, setActiveId] = useState(boot.studies[0].id);
  const [selected, setSelected] = useState("escape");
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
  const [view, setView] = useState<"edit" | "compare">("edit");
  const [compareIds, setCompareIds] = useState(
    boot.studies.slice(0, 3).map((s) => s.id),
  );
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [blocked, setBlocked] = useState(Boolean(boot.error));
  const [storageError, setStorageError] = useState(boot.error);
  const [saveState, setSaveState] = useState("保存中…");
  const [notice, setNotice] = useState("");
  const [pngWidth, setPngWidth] = useState(2844);
  const [exporting, setExporting] = useState(false);
  const [pendingImport, setPendingImport] = useState<Study[] | null>(null);
  const [artifact, setArtifact] = useState<ExportArtifact | null>(null);
  const importInput = useRef<HTMLInputElement>(null);
  const active = studies.find((s) => s.id === activeId) ?? studies[0];
  const resolved = resolveKeys(active).find((k) => k.id === selected)!;
  const override = active.overrides[selected] ?? {};
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
  function keyUpdate(patch: KeyOverride) {
    update((s) => ({
      ...s,
      overrides: {
        ...s.overrides,
        [selected]: { ...s.overrides[selected], ...patch },
      },
    }));
  }
  function add(copy: boolean) {
    if (studies.length >= 200) {
      setNotice("案は200件まで保存できます");
      return;
    }
    const next = duplicateStudy(copy ? active : samples[0]);
    if (!copy) {
      next.name = "Untitled Study";
      next.concept = "";
      next.keywords = "";
      next.overrides = {};
    }
    setStudies((all) => [...all, next]);
    setActiveId(next.id);
    setView("edit");
    setNotice(copy ? "案を複製しました" : "新しい案を作成しました");
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
      setPendingImport(parseLibrary(await file.text()).studies);
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
      setView("edit");
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
          ＋ 新しいスタディ
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
              onClick={() => setActiveId(s.id)}
              className={`study-item ${s.id === active.id ? "active" : ""}`}
            >
              <span className="study-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="study-info">
                <strong>{s.name}</strong>
                <span>ANSI 60% {s.favorite ? "· ★" : ""}</span>
              </span>
              <span className="mini-swatches">
                {roles.map((r) => (
                  <i key={r} style={{ background: s.palette[r].color }} />
                ))}
              </span>
            </button>
          ))}
          {!visible.length && (
            <p className="empty-list">条件に合う案がありません。</p>
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
                        new Blob([localStorage.getItem(STORAGE_KEY) ?? ""], {
                          type: "text/plain",
                        }),
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
        <section className="page-heading">
          <h1>キーキャップデザイン</h1>
          <button className="quiet-button" onClick={() => add(true)}>
            ⧉ 案を複製
          </button>
        </section>
        <div className="workbench-tabs">
          <div>
            <button
              className={view === "edit" ? "active" : ""}
              onClick={() => setView("edit")}
            >
              デザインを編集
            </button>
            <button
              className={view === "compare" ? "active" : ""}
              onClick={() => setView("compare")}
            >
              並べて比較 <span>{compareIds.length}</span>
            </button>
          </div>
          <span className="layout-tag">
            ANSI 60% <span>·</span> 61 KEYS
          </span>
        </div>
        <SceneToolbar
          mode={renderMode}
          onMode={setRenderMode}
          settings={sceneSettings}
          onSettings={setSceneSettings}
        />
        {view === "edit" ? (
          <>
            <section className="preview-panel">
              <div className="preview-heading">
                <div>
                  <h2>{active.name}</h2>
                </div>
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
              </div>
              <div className="keyboard-stage">
                {renderMode === "2d" ? (
                  <Keyboard
                    study={active}
                    selected={selected}
                    onSelect={setSelected}
                  />
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
                      onSelect={setSelected}
                      onReady={register3D}
                    />
                  </Suspense>
                )}
              </div>
              <div className="preview-footer">
                <span>
                  <span className="tiny-square" />{" "}
                  キーを選んで、個別にカスタマイズ
                </span>
                <span>
                  {renderMode === "2d"
                    ? "TOP VIEW / SVG"
                    : "3D / STUDIO SCULPTED"}
                </span>
              </div>
            </section>
            <div className="editor-grid">
              <section className="editor-card concept-card">
                <div className="section-title">
                  <span>01</span>
                  <h2>コンセプト</h2>
                </div>
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
              </section>
              <section className="editor-card">
                <div className="section-title">
                  <span>02</span>
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
                          legend: { ...s.legend, sublegends: e.target.checked },
                        }))
                      }
                    />{" "}
                    サブレジェンド
                  </label>
                </div>
              </section>
              <section className="editor-card key-editor">
                <div className="section-title">
                  <span>03</span>
                  <h2>キーをカスタマイズ</h2>
                </div>
                <label>
                  選択中のキー
                  <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {ansi60.keys.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label || "Space"} · {k.id} · {k.w}u
                      </option>
                    ))}
                  </select>
                </label>
                <div className="two-fields">
                  <label>
                    メイン文字
                    <input
                      maxLength={80}
                      value={resolved.main}
                      onChange={(e) => keyUpdate({ main: e.target.value })}
                    />
                  </label>
                  <label>
                    サブ文字
                    <input
                      maxLength={80}
                      value={resolved.sub}
                      onChange={(e) => keyUpdate({ sub: e.target.value })}
                    />
                  </label>
                </div>
                <div className="two-fields">
                  <label>
                    色の役割
                    <select
                      value={resolved.role}
                      onChange={(e) =>
                        keyUpdate({ role: e.target.value as KeyRole })
                      }
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {roleLabels[r]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Novelty
                    <select
                      value={resolved.novelty}
                      onChange={(e) =>
                        keyUpdate({
                          novelty: e.target.value as KeyOverride["novelty"],
                        })
                      }
                    >
                      {Object.entries(noveltyNames).map(([v, n]) => (
                        <option key={v} value={v}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="key-custom-colors">
                  <label>
                    キー色
                    <input
                      aria-label="選択キーの色"
                      type="color"
                      value={resolved.color}
                      onInput={(e) =>
                        keyUpdate({ color: e.currentTarget.value })
                      }
                    />
                  </label>
                  <label>
                    文字色
                    <input
                      aria-label="選択キーの文字色"
                      type="color"
                      value={resolved.ink}
                      onInput={(e) => keyUpdate({ ink: e.currentTarget.value })}
                    />
                  </label>
                  <button
                    className="text-button"
                    disabled={!Object.keys(override).length}
                    onClick={() =>
                      update((s) => {
                        const overrides = { ...s.overrides };
                        delete overrides[selected];
                        return { ...s, overrides };
                      })
                    }
                  >
                    このキーをリセット
                  </button>
                </div>
                {resolved.novelty !== "none" && (
                  <p className="field-note">
                    Noveltyは文字の代わりに表示します。
                  </p>
                )}
              </section>
            </div>
            <section className="export-bar">
              <div>
                <strong>画像を書き出す</strong>
                <p>
                  {renderMode === "2d"
                    ? "透明背景で出力。PNGはこの端末のフォントで描画します。"
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
                <button disabled={exporting} onClick={() => exportImage("svg")}>
                  ↓ SVG
                </button>
                <button
                  className="primary"
                  disabled={exporting || (renderMode === "3d" && !ready3D)}
                  onClick={() => exportImage("png")}
                >
                  {renderMode === "3d"
                    ? "↓ 3D PNGを書き出す"
                    : "↓ PNGを書き出す"}
                </button>
              </div>
            </section>
          </>
        ) : (
          <section className="compare-section">
            <div className="compare-heading">
              <div>
                <h2>デザインの比較</h2>
                <p>2〜4案を選択。すべて同じ倍率・同じ視点で表示します。</p>
              </div>
              <span>{compareIds.length} / 4 SELECTED</span>
            </div>
            <div className="compare-select">
              {studies.map((s) => (
                <label key={s.id}>
                  <input
                    type="checkbox"
                    checked={compareIds.includes(s.id)}
                    disabled={
                      !compareIds.includes(s.id) && compareIds.length >= 4
                    }
                    onChange={(e) =>
                      setCompareIds((ids) =>
                        e.target.checked
                          ? [...ids, s.id]
                          : ids.filter((id) => id !== s.id),
                      )
                    }
                  />
                  {s.name}
                </label>
              ))}
            </div>
            {compareIds.length < 2 && (
              <p className="compare-hint">
                比較する案を2つ以上選んでください。
              </p>
            )}
            <div className="comparison-grid">
              {compareIds
                .map((id) => studies.find((s) => s.id === id))
                .filter((s): s is Study => Boolean(s))
                .map((s) => (
                  <article className="comparison-card" key={s.id}>
                    <div className="comparison-card-title">
                      <h3>{s.name}</h3>
                      <button
                        aria-label={`${s.name}を編集`}
                        onClick={() => {
                          setActiveId(s.id);
                          setView("edit");
                        }}
                      >
                        編集 ↗
                      </button>
                    </div>
                    {renderMode === "2d" ? (
                      <Keyboard study={s} />
                    ) : (
                      <Suspense
                        fallback={
                          <div className="three-loading">
                            3Dエンジンを読み込み中…
                          </div>
                        }
                      >
                        <Keyboard3D
                          study={s}
                          settings={sceneSettings}
                          onPose={updatePose}
                          exportWidth={pngWidth}
                          onExport={(blob, name) =>
                            setArtifact({
                              blob,
                              name: `${safeName(name)}-3d.png`,
                              kind: "png",
                            })
                          }
                        />
                      </Suspense>
                    )}
                    <div className="comparison-meta">
                      <span>{s.keywords}</span>
                      <span className="mini-swatches">
                        {roles.map((r) => (
                          <i
                            key={r}
                            style={{ background: s.palette[r].color }}
                          />
                        ))}
                      </span>
                    </div>
                  </article>
                ))}
            </div>
          </section>
        )}
        <footer className="main-footer">
          <span>
            色は画面上のイメージです。製造色は現物で確認してください。
          </span>
        </footer>
      </main>
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
