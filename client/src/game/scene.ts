import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { createGameScene as createBaseGameScene } from "./scene-base";
import type { GameHandle, PerformanceMode, BookInfo, BookScreenRect } from "./scene-base";

export type { GameHandle, PerformanceMode, BookInfo, BookScreenRect } from "./scene-base";
export { BOOK_CATALOG } from "./scene-base";

const shelfRoot = (scene: Scene) => scene.meshes.filter((mesh) => mesh.name === "shelf-root") as Mesh[];

function material(scene: Scene, name: string, color: Color3) {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.1, 0.07, 0.04);
  mat.ambientColor = color.scale(0.38);
  mat.emissiveColor = color.scale(0.035);
  return mat;
}

function addArch(scene: Scene, z: number, width = 9.2) {
  const wood = material(scene, "grand-library-arch", new Color3(0.28, 0.13, 0.055));
  const brass = material(scene, "grand-library-arch-brass", new Color3(0.55, 0.34, 0.13));
  const pillarHeight = 4.9;
  const pillarWidth = 0.42;
  const pillarDepth = 0.5;
  const sideX = width * 0.5 - pillarWidth * 0.5;
  const left = MeshBuilder.CreateBox(`library-arch-left-${z}`, { width: pillarWidth, height: pillarHeight, depth: pillarDepth }, scene);
  left.position = new Vector3(-sideX, pillarHeight * 0.5, z);
  left.material = wood;
  left.isPickable = false;
  const right = left.clone(`library-arch-right-${z}`);
  if (right) right.position.x = sideX;
  const beam = MeshBuilder.CreateBox(`library-arch-beam-${z}`, { width, height: 0.42, depth: pillarDepth }, scene);
  beam.position = new Vector3(0, pillarHeight - 0.05, z);
  beam.material = wood;
  beam.isPickable = false;
  const arch = MeshBuilder.CreateTorus(`library-arch-curve-${z}`, { diameter: width * 0.82, thickness: 0.24, tessellation: 32, arc: 0.5 }, scene);
  arch.rotation.x = Math.PI / 2;
  arch.position = new Vector3(0, pillarHeight - 0.06, z);
  arch.material = wood;
  arch.isPickable = false;
  const capLeft = MeshBuilder.CreateBox(`library-arch-cap-left-${z}`, { width: 0.58, height: 0.16, depth: 0.62 }, scene);
  capLeft.position = new Vector3(-sideX, pillarHeight, z);
  capLeft.material = brass;
  capLeft.isPickable = false;
  const capRight = capLeft.clone(`library-arch-cap-right-${z}`);
  if (capRight) capRight.position.x = sideX;
}

function addCeilingBeams(scene: Scene) {
  const wood = material(scene, "grand-library-ceiling", new Color3(0.19, 0.085, 0.035));
  [-11, -7, -3, 1, 5, 9].forEach((z, index) => {
    const beam = MeshBuilder.CreateBox(`library-ceiling-beam-${index}`, { width: 23.2, height: 0.22, depth: 0.38 }, scene);
    beam.position = new Vector3(0, 6.65, z);
    beam.material = wood;
    beam.isPickable = false;
  });
}

function arrangeGrandLibrary(scene: Scene) {
  const roots = shelfRoot(scene);
  const layouts = [
    { x: -5.65, z: -3.2, rotation: 0 },
    { x: 5.65, z: -3.2, rotation: 0 },
    { x: -5.65, z: 3.7, rotation: 0 },
    { x: 5.65, z: 3.7, rotation: 0 },
    { x: 0, z: -10.7, rotation: Math.PI / 2 },
  ];
  roots.forEach((root, index) => {
    const layout = layouts[index] ?? layouts[layouts.length - 1];
    root.position.x = layout.x;
    root.position.y = 0;
    root.position.z = layout.z;
    root.rotation.y = layout.rotation;
    root.isVisible = true;
    root.getChildMeshes().forEach((part) => {
      part.isVisible = true;
      part.isPickable = part.name.startsWith("book-") && Boolean(part.metadata?.book);
    });
  });
  addArch(scene, -5.8);
  addArch(scene, 1.2);
  addArch(scene, 8.2);
  addCeilingBeams(scene);
  const camera = scene.activeCamera as UniversalCamera | null;
  if (camera) {
    camera.position = new Vector3(0, 1.75, 10.6);
    camera.rotation.y = Math.PI;
    camera.rotation.x = -0.035;
  }
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const handle = await createBaseGameScene(engine, canvas);
  arrangeGrandLibrary(handle.scene);
  return handle;
}
