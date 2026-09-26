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
} from "three";
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
  register,
  onFail,
  onSelect,
}: {
  data: ResolvedKey;
  study: Study;
  roughness: number;
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
        <meshStandardMaterial
          color={data.color}
          roughness={roughness}
          metalness={0}
        />
      </mesh>
      <mesh geometry={geometry.top} castShadow receiveShadow>
        <meshStandardMaterial
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
    const cam = camera as OrthographicCamera;
    const halfHeight = 90,
      aspect = size.width / size.height;
    cam.left = -halfHeight * aspect;
    cam.right = halfHeight * aspect;
    cam.top = halfHeight;
    cam.bottom = -halfHeight;
    cam.near = 0.1;
    cam.far = 1500;
    cam.position.set(...settings.pose.position);
    cam.zoom = settings.pose.zoom;
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
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
      <color attach="background" args={["#eeeeec"]} />
      <ambientLight intensity={lighting === "soft" ? 1.2 : 0.65} />
      <directionalLight
        position={lighting === "raking" ? [-180, 55, 15] : [-100, 200, -80]}
        intensity={lighting === "soft" ? 1.5 : 2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-190}
        shadow-camera-right={190}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-far={650}
        shadow-bias={-0.0004}
        shadow-normalBias={0.12}
      />
      <directionalLight position={[120, 80, 150]} intensity={0.5} />
      <mesh position={[0, -4, 0]} receiveShadow>
        <boxGeometry args={[293, 7, 103]} />
        <meshStandardMaterial color="#92928f" roughness={0.8} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -7.6, 0]}
        receiveShadow
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#eeeeec" roughness={1} />
      </mesh>
      {keys.map((key) => (
        <Cap
          key={key.id}
          data={key}
          study={study}
          roughness={settings.material === "matte" ? 0.68 : 0.28}
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
              orthographic
              shadows="percentage"
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{
                position: [130, 240, 260],
                zoom: 1,
                near: 0.1,
                far: 1500,
              }}
              fallback={fallback}
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
