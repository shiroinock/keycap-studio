import {
  Scene,
  Mesh,
  PlaneGeometry,
  MeshBasicMaterial,
  Color,
  BackSide,
  BoxGeometry,
  PMREMGenerator,
  DataTexture,
  RepeatWrapping,
  RGBAFormat,
  UnsignedByteType,
  LinearMipmapLinearFilter,
  LinearFilter,
  type WebGLRenderer,
} from "three";
import type { SceneSettings } from "./settings";
// Local softboxes: no remote HDRI, no asset license or network dependency.
export function studioEnvironment(
  gl: WebGLRenderer,
  lighting: SceneSettings["lighting"],
) {
  const room = new Scene();
  const shell = new Mesh(
    new BoxGeometry(1000, 800, 1000),
    new MeshBasicMaterial({ color: "#747575", side: BackSide }),
  );
  room.add(shell);
  const softbox = (
    position: [number, number, number],
    width: number,
    height: number,
    power: number,
    color: string,
  ) => {
    const mat = new MeshBasicMaterial({
      color: new Color(color).multiplyScalar(power),
    });
    const mesh = new Mesh(new PlaneGeometry(width, height), mat);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
  };
  softbox(
    lighting === "raking" ? [-350, 110, 70] : [-220, 360, 180],
    lighting === "soft" ? 500 : 300,
    350,
    lighting === "soft" ? 4 : 7,
    "#fff5e8",
  );
  softbox([270, 180, -220], 160, 330, 4, "#edf3ff");
  softbox([0, 390, -100], 360, 80, 3, "#ffffff");
  const pmrem = new PMREMGenerator(gl),
    target = pmrem.fromScene(room, 0.04, 1, 1800, { size: 128 });
  room.traverse((o) => {
    if (o instanceof Mesh) {
      o.geometry.dispose();
      (o.material as MeshBasicMaterial).dispose();
    }
  });
  pmrem.dispose();
  return target;
}
export function createGrainTexture() {
  const size = 128,
    data = new Uint8Array(size * size * 4);
  let seed = 947;
  for (let i = 0; i < size * size; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const value = 180 + (seed >>> 24) * 0.29;
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  const texture = new DataTexture(
    data,
    size,
    size,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.channel = 1;
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}
