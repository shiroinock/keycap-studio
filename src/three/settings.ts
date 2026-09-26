export type CameraPose = { position: [number, number, number]; zoom: number };
export type SceneSettings = {
  pose: CameraPose;
  lighting: "studio" | "soft" | "raking";
  material: "matte" | "satin";
};
export const ANGLED: CameraPose = { position: [130, 240, 260], zoom: 1 };
export const TOP: CameraPose = { position: [0, 350, 0.001], zoom: 1 };
export const DEFAULT_SCENE: SceneSettings = {
  pose: ANGLED,
  lighting: "studio",
  material: "matte",
};
export const VIEW_ASPECT = 2.2;
