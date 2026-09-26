import { OrthographicCamera, PerspectiveCamera } from "three";
import type { CameraPose } from "./settings";
export const PHOTO_FOV = 32;
export function configureCamera(
  camera: OrthographicCamera | PerspectiveCamera,
  pose: CameraPose,
  aspect: number,
) {
  if (camera instanceof OrthographicCamera) {
    camera.left = -90 * aspect;
    camera.right = 90 * aspect;
    camera.top = 90;
    camera.bottom = -90;
  } else {
    camera.aspect = aspect;
    camera.fov = PHOTO_FOV;
  }
  camera.near = 0.1;
  camera.far = 2000;
  camera.position.set(...pose.position);
  camera.zoom = pose.zoom;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}
