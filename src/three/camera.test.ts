import { expect, it } from "vitest";
import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { configureCamera } from "./camera";
import { ANGLED, TOP, VIEW_ASPECT } from "./settings";
import { ansi60 } from "../domain/layout";
import { createKeyGeometry, keyPosition } from "./profile";
it("fits all 61 keys and the case within the default photo and top-view frame", () => {
  for (const [cam, pose] of [
    [new PerspectiveCamera(), ANGLED],
    [new OrthographicCamera(), TOP],
  ] as const) {
    configureCamera(cam, pose, VIEW_ASPECT);
    const points: Vector3[] = [];
    for (const key of ansi60.keys) {
      const g = createKeyGeometry(key),
        offset = new Vector3(...keyPosition(key));
      for (const part of [g.body, g.top]) {
        const p = part.getAttribute("position");
        for (let i = 0; i < p.count; i++)
          points.push(new Vector3().fromBufferAttribute(p, i).add(offset));
        part.dispose();
      }
    }
    for (const x of [-147, 147])
      for (const y of [-8.8, -0.8])
        for (const z of [-52, 52]) points.push(new Vector3(x, y, z));
    for (const point of points) {
      point.project(cam);
      expect(Math.abs(point.x)).toBeLessThan(0.98);
      expect(Math.abs(point.y)).toBeLessThan(0.98);
      expect(point.z).toBeGreaterThan(-1);
      expect(point.z).toBeLessThan(1);
    }
  }
});
it("preserves the shared pose when configuring comparison cameras at different pixel sizes", () => {
  const a = new PerspectiveCamera(),
    b = new PerspectiveCamera();
  const pose = {
    position: [190, 190, 280] as [number, number, number],
    zoom: 1.2,
  };
  configureCamera(a, pose, 880 / 400);
  configureCamera(b, pose, 440 / 200);
  expect(a.projectionMatrix.elements).toEqual(b.projectionMatrix.elements);
  expect(a.matrixWorld.elements).toEqual(b.matrixWorld.elements);
});
