import { ANGLED, TOP, type SceneSettings } from "../three/settings";
export default function SceneToolbar({
  mode,
  onMode,
  settings,
  onSettings,
}: {
  mode: "2d" | "3d";
  onMode: (v: "2d" | "3d") => void;
  settings: SceneSettings;
  onSettings: (v: SceneSettings) => void;
}) {
  return (
    <div className="scene-toolbar">
      <div className="mode-switch" aria-label="プレビューの種類">
        <button aria-pressed={mode === "2d"} onClick={() => onMode("2d")}>
          2D
        </button>
        <button aria-pressed={mode === "3d"} onClick={() => onMode("3d")}>
          3D
        </button>
      </div>
      {mode === "3d" && (
        <>
          <button
            onClick={() =>
              onSettings({ ...settings, pose: TOP, projection: "orthographic" })
            }
          >
            上面
          </button>
          <button
            onClick={() =>
              onSettings({
                ...settings,
                pose: ANGLED,
                projection: "perspective",
              })
            }
          >
            斜め
          </button>
          <button
            aria-label="3Dを縮小"
            onClick={() =>
              onSettings({
                ...settings,
                pose: {
                  ...settings.pose,
                  zoom: Math.max(0.65, settings.pose.zoom / 1.2),
                },
              })
            }
          >
            −
          </button>
          <button
            aria-label="3Dを拡大"
            onClick={() =>
              onSettings({
                ...settings,
                pose: {
                  ...settings.pose,
                  zoom: Math.min(2.5, settings.pose.zoom * 1.2),
                },
              })
            }
          >
            ＋
          </button>
          <label>
            カメラ
            <select
              value={settings.projection}
              onChange={(e) =>
                onSettings({
                  ...settings,
                  projection: e.target.value as SceneSettings["projection"],
                })
              }
            >
              <option value="perspective">写真</option>
              <option value="orthographic">平行投影</option>
            </select>
          </label>
          <label>
            照明
            <select
              value={settings.lighting}
              onChange={(e) =>
                onSettings({
                  ...settings,
                  lighting: e.target.value as SceneSettings["lighting"],
                })
              }
            >
              <option value="studio">スタジオ</option>
              <option value="soft">柔らかい光</option>
              <option value="raking">サイドライト</option>
            </select>
          </label>
          <label>
            質感
            <select
              value={settings.material}
              onChange={(e) =>
                onSettings({
                  ...settings,
                  material: e.target.value as SceneSettings["material"],
                })
              }
            >
              <option value="matte">マット</option>
              <option value="satin">サテン</option>
            </select>
          </label>
          <span className="scene-help">ドラッグで回転 · スクロールで拡大</span>
        </>
      )}
    </div>
  );
}
