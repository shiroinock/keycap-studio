import { OrthographicCamera, PerspectiveCamera } from "three";
import type { CameraPose } from "./settings";
export const PHOTO_FOV = 32;
export function configureCamera(
  camera: OrthographicCamera | PerspectiveCamera,
  pose: CameraPose,
  aspect: number,
  frameScale = 1,
) {
  if (camera instanceof OrthographicCamera) {
    camera.left = -90 * frameScale * aspect;
    camera.right = 90 * frameScale * aspect;
    camera.top = 90 * frameScale;
    camera.bottom = -90 * frameScale;
  } else {
    camera.aspect = aspect;
    camera.fov = PHOTO_FOV;
  }
  camera.near = 0.1;
  camera.far = 2000 * frameScale;
  camera.position.set(...pose.position).multiplyScalar(frameScale);
  camera.zoom = pose.zoom;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

export function layoutFrameScale(layout: { width: number; height: number }) {
  return Math.max(0.4, layout.width / 15, layout.height / 5);
}
