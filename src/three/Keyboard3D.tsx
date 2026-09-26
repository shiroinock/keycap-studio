import {
  Component,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  CanvasTexture,
  SRGBColorSpace,
  OrthographicCamera,
  Vector2,
  PerspectiveCamera,
  DataTexture,
  ACESFilmicToneMapping,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { configureCamera, PHOTO_FOV } from "./camera";
import ContactShadow from "./ContactShadow";
import { studioEnvironment, createGrainTexture } from "./studio";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { resolveKeys, type Study, type ResolvedKey } from "../domain/model";
import { textureSource } from "./artwork";
import { createKeyGeometry, keyPosition, PROFILE_NAME } from "./profile";
import { VIEW_ASPECT, type CameraPose, type SceneSettings } from "./settings";
export type Capture3D = (width: number) => Promise<Blob>;
interface Props {
  study: Study;
  settings: SceneSettings;
  onPose: (pose: CameraPose) => void;
  onSelect?: (id: string) => void;
  onReady?: (fn: Capture3D | null) => void;
  onExport?: (blob: Blob, name: string) => void;
  exportWidth?: number;
}
const Cap = memo(function Cap({
  data,
  study,
  roughness,
  grain,
  register,
  onFail,
  onSelect,
}: {
  data: ResolvedKey;
  study: Study;
  roughness: number;
  grain: DataTexture;
  register: (id: string, ready: boolean) => void;
  onFail: () => void;
  onSelect?: Props["onSelect"];
}) {
  const { invalidate } = useThree();
  const geometry = useMemo(
    () => createKeyGeometry(data),
    [data.w, data.h, data.row, data.id],
  );
  const [texture, setTexture] = useState<CanvasTexture | null>(null);
  const source = textureSource(data, study);
  useEffect(() => {
    let cancelled = false;
    let tex: CanvasTexture | undefined;
    register(data.id, false);
    setTexture(null);
    const img = new Image();
    img.src = source;
    img
      .decode()
      .then(() => {
        if (cancelled) return;
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("文字の描画ができません");
        ctx.drawImage(img, 0, 0);
        tex = new CanvasTexture(canvas);
        tex.colorSpace = SRGBColorSpace;
        tex.anisotropy = 4;
        setTexture(tex);
        register(data.id, true);
        invalidate();
      })
      .catch(() => {
        if (!cancelled) {
          register(data.id, false);
          onFail();
        }
      });
    return () => {
      cancelled = true;
      tex?.dispose();
    };
  }, [source, data.id, register, invalidate, onFail]);
  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.top.dispose();
    },
    [geometry],
  );
  return (
    <group
      position={keyPosition(data)}
      onClick={(e) => {
        if (e.delta < 5) {
          e.stopPropagation();
          onSelect?.(data.id);
        }
      }}
    >
      <mesh geometry={geometry.body} castShadow receiveShadow>
        <meshPhysicalMaterial
          bumpMap={grain}
          bumpScale={roughness > 0.5 ? 0.018 : 0.008}
          roughnessMap={grain}
          ior={1.46}
          envMapIntensity={0.65}
          color={data.color}
          roughness={roughness}
          metalness={0}
        />
      </mesh>
      <mesh geometry={geometry.top} castShadow receiveShadow>
        <meshPhysicalMaterial
          bumpMap={grain}
          bumpScale={roughness > 0.5 ? 0.018 : 0.008}
          roughnessMap={grain}
          ior={1.46}
          envMapIntensity={0.65}
          key={texture?.uuid ?? "loading"}
          color={texture ? "#ffffff" : data.color}
          map={texture}
          roughness={roughness}
          metalness={0}
        />
      </mesh>
    </group>
  );
});
function Scene({
  study,
  settings,
  onPose,
  onSelect,
  onReady,
  onCount,
  onFail,
}: {
  study: Study;
  settings: SceneSettings;
  onPose: Props["onPose"];
  onSelect: Props["onSelect"];
  onReady: Props["onReady"];
  onCount: (n: number) => void;
  onFail: () => void;
}) {
  const { camera, gl, scene, size, invalidate } = useThree();
  const grain = useMemo(createGrainTexture, []);
  const caseGeometry = useMemo(
    () => new RoundedBoxGeometry(294, 8, 104, 4, 2.3),
    [],
  );
  useEffect(
    () => () => {
      grain.dispose();
      caseGeometry.dispose();
    },
    [grain, caseGeometry],
  );
  useEffect(() => {
    const environment = studioEnvironment(gl, settings.lighting);
    scene.environment = environment.texture;
    invalidate();
    return () => {
      scene.environment = null;
      environment.dispose();
    };
  }, [gl, scene, settings.lighting, invalidate]);
  const controls = useRef<OrbitControls | null>(null);
  const poseRef = useRef(onPose);
  poseRef.current = onPose;
  const readyKeys = useRef(new Set<string>());
  const [readyCount, setReadyCount] = useState(0);
  const register = useCallback((id: string, ready: boolean) => {
    if (ready) readyKeys.current.add(id);
    else readyKeys.current.delete(id);
    setReadyCount(readyKeys.current.size);
  }, []);
  const keys = useMemo(() => resolveKeys(study), [study]);
  useEffect(() => {
    onCount(readyCount);
  }, [readyCount, onCount]);
  useEffect(() => {
    const control = new OrbitControls(camera, gl.domElement);
    controls.current = control;
    control.enablePan = false;
    control.enableDamping = false;
    control.minPolarAngle = 0.001;
    control.maxPolarAngle = Math.PI * 0.46;
    control.minDistance = 170;
    control.maxDistance = 620;
    control.minZoom = 0.65;
    control.maxZoom = 2.5;
    control.target.set(0, 0, 0);
    const changed = () => {
      poseRef.current({
        position: [camera.position.x, camera.position.y, camera.position.z],
        zoom: (camera as OrthographicCamera).zoom,
      });
      invalidate();
    };
    control.addEventListener("change", changed);
    const lost = (event: Event) => {
      event.preventDefault();
      onFail();
    };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      control.removeEventListener("change", changed);
      control.dispose();
      controls.current = null;
      gl.domElement.removeEventListener("webglcontextlost", lost);
    };
  }, [camera, gl, invalidate, onFail]);
  useEffect(() => {
    configureCamera(
      camera as OrthographicCamera | PerspectiveCamera,
      settings.pose,
      size.width / size.height,
    );
    // Do not call controls.update here: it emits change and would feed other views back into this one.
    invalidate();
  }, [camera, size, settings.pose, invalidate]);
  useEffect(() => {
    if (readyCount !== 61) {
      onReady?.(null);
      return;
    }
    let capturing = false;
    const capture: Capture3D = async (width) => {
      if (![1896, 2844, 3792].includes(width))
        throw new Error("出力サイズが不正です");
      if (capturing) throw new Error("書き出し中です");
      capturing = true;
      const previousSize = gl.getSize(new Vector2()),
        dpr = gl.getPixelRatio();
      const start = performance.now();
      try {
        gl.setPixelRatio(1);
        gl.setSize(width, Math.round(width / VIEW_ASPECT), false);
        gl.render(scene, camera);
        const blob = await new Promise<Blob>((resolve, reject) =>
          gl.domElement.toBlob(
            (b) =>
              b ? resolve(b) : reject(new Error("PNGの生成に失敗しました")),
            "image/png",
          ),
        );
        console.info(
          `3D PNG ${width}px: ${Math.round(performance.now() - start)}ms`,
        );
        return blob;
      } finally {
        gl.setPixelRatio(dpr);
        gl.setSize(previousSize.x, previousSize.y, false);
        invalidate();
        capturing = false;
      }
    };
    onReady?.(capture);
    return () => onReady?.(null);
  }, [readyCount, onReady, gl, scene, camera, invalidate]);
  const lighting = settings.lighting;
  return (
    <>
      <color attach="background" args={["#e5e3df"]} />
      <fog attach="fog" args={["#e5e3df", 650, 1800]} />
      <hemisphereLight intensity={0.12} color="#e8efff" groundColor="#47433d" />
      <directionalLight
        position={lighting === "raking" ? [-180, 75, 35] : [-110, 210, 140]}
        intensity={lighting === "soft" ? 1.1 : 1.6}
        color="#fff4e7"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-195}
        shadow-camera-right={195}
        shadow-camera-top={125}
        shadow-camera-bottom={-125}
        shadow-camera-near={1}
        shadow-camera-far={650}
        shadow-bias={-0.00012}
        shadow-normalBias={0.08}
        shadow-radius={lighting === "soft" ? 5 : 3}
      />
      <mesh
        position={[0, -4.8, 0]}
        geometry={caseGeometry}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#363a3d"
          metalness={0.25}
          roughness={0.42}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -8.85, 0]}
        receiveShadow
      >
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#e5e3df" roughness={0.95} />
      </mesh>
      <ContactShadow />
      {keys.map((key) => (
        <Cap
          key={key.id}
          data={key}
          study={study}
          roughness={settings.material === "matte" ? 0.68 : 0.38}
          grain={grain}
          register={register}
          onFail={onFail}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}
class Boundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFail: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function Keyboard3D({
  study,
  settings,
  onPose,
  onSelect,
  onReady,
  onExport,
  exportWidth = 2844,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const capture = useRef<Capture3D | null>(null);
  const register = useCallback(
    (fn: Capture3D | null) => {
      capture.current = fn;
      onReady?.(fn);
    },
    [onReady],
  );
  const fail = useCallback(() => {
    setFailed(true);
    register(null);
  }, [register]);
  useEffect(() => () => onReady?.(null), [onReady]);
  const fallback = (
    <div className="three-fallback" role="status">
      <strong>3Dプレビューを利用できません</strong>
      <p>
        上の「2D」で編集・保存を続けられます。WebGL対応ブラウザで再度お試しください。
      </p>
    </div>
  );
  return (
    <div className="three-panel" aria-label={`${study.name}の3Dプレビュー`}>
      <div className="three-canvas" style={{ aspectRatio: VIEW_ASPECT }}>
        {failed ? (
          fallback
        ) : (
          <Boundary fallback={fallback} onFail={fail}>
            <Canvas
              key={settings.projection}
              orthographic={settings.projection === "orthographic"}
              shadows="percentage"
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{
                position: [130, 240, 260],
                zoom: 1,
                fov: PHOTO_FOV,
                near: 0.1,
                far: 1500,
              }}
              fallback={fallback}
              onCreated={({ gl }) => {
                gl.toneMapping = ACESFilmicToneMapping;
                gl.toneMappingExposure = 0.9;
              }}
              gl={{
                antialias: true,
                alpha: false,
                powerPreference: "high-performance",
              }}
            >
              <Scene
                study={study}
                settings={settings}
                onPose={onPose}
                onSelect={onSelect}
                onReady={register}
                onCount={setReady}
                onFail={fail}
              />
            </Canvas>
          </Boundary>
        )}
      </div>
      <div className="three-caption">
        <span>
          {PROFILE_NAME} · {ready}/61 KEYS
        </span>
        <span>
          {settings.projection === "perspective" ? "PHOTO" : "ORTHO"} ·{" "}
          {settings.lighting} / {settings.material}
        </span>
        {onExport && (
          <button
            disabled={ready !== 61 || busy || failed}
            onClick={async () => {
              if (!capture.current) return;
              setBusy(true);
              setError("");
              try {
                onExport(await capture.current(exportWidth), study.name);
              } catch {
                setError("PNGの書き出しに失敗しました");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "出力中…" : "3D PNG"}
          </button>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
