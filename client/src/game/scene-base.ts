import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Culling/ray";

export type PerformanceMode = "cinematic" | "light";
export type BookInfo = never;
export type BookScreenRect = { meshName: string; bookId: string; title: string; x: number; y: number; width: number; height: number };
export type GameHandle = {
  scene: Scene;
  dispose: () => void;
  openNearestBook: () => boolean;
  openBookById: (bookId: string) => boolean;
  openBookByMeshName: (meshName: string) => boolean;
  returnActiveBook: () => boolean;
  turnActivePage: (direction: "rtl" | "ltr") => boolean;
  hasActiveBook: () => boolean;
  getBookScreenRects: () => BookScreenRect[];
  setTouchMove: (x: number, y: number) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setAudioEnabled: (enabled: boolean) => void;
  getAudioEnabled: () => boolean;
};

type MaterialSet = { floor: StandardMaterial; wall: StandardMaterial; ceiling: StandardMaterial; uniform: StandardMaterial; skin: StandardMaterial; shoe: StandardMaterial };

const COLORS = {
  floor: new Color3(0.12, 0.065, 0.032),
  wall: new Color3(0.42, 0.34, 0.23),
  ceiling: new Color3(0.24, 0.12, 0.055),
  navy: new Color3(0.035, 0.08, 0.18),
  skin: new Color3(0.72, 0.45, 0.30),
  shoe: new Color3(0.025, 0.02, 0.018),
  ivory: new Color3(0.88, 0.82, 0.68),
  brass: new Color3(0.79, 0.58, 0.29),
};

function makeMaterial(scene: Scene, name: string, color: Color3) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.ambientColor = color.scale(0.38);
  material.specularColor = new Color3(0.12, 0.09, 0.06);
  return material;
}

function makeBox(scene: Scene, name: string, size: { width: number; height: number; depth: number }, position: Vector3, material: StandardMaterial, collidable = false) {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.position.copyFrom(position);
  mesh.material = material;
  mesh.checkCollisions = collidable;
  mesh.isPickable = false;
  mesh.freezeWorldMatrix();
  return mesh;
}

function createPlayer(scene: Scene, materials: MaterialSet) {
  const root = new Mesh("player-root", scene);
  root.position = new Vector3(0, 0, 7.5);
  root.ellipsoid = new Vector3(0.42, 1.0, 0.42);
  root.ellipsoidOffset = new Vector3(0, 1.0, 0);
  root.checkCollisions = true;
  root.isVisible = false;

  const torso = makeBox(scene, "player-torso", { width: 0.72, height: 1.05, depth: 0.42 }, new Vector3(0, 1.45, 0), materials.uniform);
  torso.parent = root;
  const head = makeBox(scene, "player-head", { width: 0.52, height: 0.52, depth: 0.52 }, new Vector3(0, 2.28, 0), materials.skin);
  head.parent = root;
  const leftArm = makeBox(scene, "player-left-arm", { width: 0.20, height: 0.90, depth: 0.22 }, new Vector3(-0.48, 1.42, 0), materials.uniform);
  leftArm.parent = root;
  const rightArm = makeBox(scene, "player-right-arm", { width: 0.20, height: 0.90, depth: 0.22 }, new Vector3(0.48, 1.42, 0), materials.uniform);
  rightArm.parent = root;
  const leftLeg = makeBox(scene, "player-left-leg", { width: 0.25, height: 0.95, depth: 0.28 }, new Vector3(-0.20, 0.48, 0), materials.uniform);
  leftLeg.parent = root;
  const rightLeg = makeBox(scene, "player-right-leg", { width: 0.25, height: 0.95, depth: 0.28 }, new Vector3(0.20, 0.48, 0), materials.uniform);
  rightLeg.parent = root;
  const leftShoe = makeBox(scene, "player-left-shoe", { width: 0.30, height: 0.16, depth: 0.46 }, new Vector3(-0.20, 0.06, 0.08), materials.shoe);
  leftShoe.parent = root;
  const rightShoe = makeBox(scene, "player-right-shoe", { width: 0.30, height: 0.16, depth: 0.46 }, new Vector3(0.20, 0.06, 0.08), materials.shoe);
  rightShoe.parent = root;
  return { root, parts: [torso, head, leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe] };
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.18, 0);
  scene.clearColor.set(0.035, 0.025, 0.018, 1);

  const materials: MaterialSet = {
    floor: makeMaterial(scene, "floor", COLORS.floor),
    wall: makeMaterial(scene, "plaster", COLORS.wall),
    ceiling: makeMaterial(scene, "ceiling", COLORS.ceiling),
    uniform: makeMaterial(scene, "player-navy-uniform", COLORS.navy),
    skin: makeMaterial(scene, "player-skin", COLORS.skin),
    shoe: makeMaterial(scene, "player-shoe", COLORS.shoe),
  };

  // The only meshes in the room: the 24 x 28 floor, four walls, and ceiling.
  makeBox(scene, "floor", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, -0.15, 0), materials.floor, true);
  makeBox(scene, "back-wall", { width: 24, height: 7, depth: 0.3 }, new Vector3(0, 3.5, -13.5), materials.wall, true);
  makeBox(scene, "left-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(-12, 3.5, 0), materials.wall, true);
  makeBox(scene, "right-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(12, 3.5, 0), materials.wall, true);
  makeBox(scene, "ceiling", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, 7, 0), materials.ceiling, false);

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.86;
  ambient.diffuse = COLORS.ivory;
  ambient.groundColor = new Color3(0.12, 0.08, 0.05);
  const ceilingLight = new PointLight("ceiling-light", new Vector3(0, 5.4, 1), scene);
  ceilingLight.diffuse = COLORS.brass;
  ceilingLight.intensity = 3.8;
  ceilingLight.range = 22;

  const player = createPlayer(scene, materials);
  const camera = new UniversalCamera("third-person-camera", new Vector3(0.65, 3.1, 3.7), scene);
  camera.setTarget(new Vector3(0, 1.25, 7.5));
  camera.attachControl(canvas, true);
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.fov = 0.82;
  scene.activeCamera = camera;

  const pressed = new Set<string>();
  const touchMove = { x: 0, z: 0 };
  let yaw = Math.PI;
  let pitch = -0.08;
  let lastPointerX: number | null = null;
  let lastPointerY: number | null = null;
  let performanceMode: PerformanceMode = "cinematic";
  let audioEnabled = true;
  let velocityY = 0;
  let lastMoveEventAt = 0;

  const onKeyDown = (event: KeyboardEvent) => pressed.add(event.key.toLowerCase());
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key.toLowerCase());
  const onBlur = () => pressed.clear();
  const onPointerMove = (event: MouseEvent) => {
    if (lastPointerX === null || lastPointerY === null) {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      return;
    }
    yaw += (event.clientX - lastPointerX) * 0.003;
    pitch = Math.max(-0.38, Math.min(0.22, pitch + (event.clientY - lastPointerY) * 0.002));
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  };
  const resetPointer = () => { lastPointerX = null; lastPointerY = null; };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("mouseleave", resetPointer);

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new Vector3(forward.z, 0, -forward.x);
    const input = new Vector3(0, 0, 0);
    if (pressed.has("w")) input.addInPlace(forward);
    if (pressed.has("s")) input.subtractInPlace(forward);
    if (pressed.has("d")) input.addInPlace(right);
    if (pressed.has("a")) input.subtractInPlace(right);
    input.x += touchMove.x;
    input.z += touchMove.z;
    if (input.lengthSquared() > 0.001) {
      input.normalize();
      const speed = pressed.has("shift") ? 4.2 : 2.35;
      player.root.moveWithCollisions(input.scale(speed * dt));
      player.root.rotation.y = Math.atan2(input.x, input.z);
      const now = performance.now();
      if (now - lastMoveEventAt > 700) {
        lastMoveEventAt = now;
        window.dispatchEvent(new CustomEvent("library:walked", { detail: { type: "walked" } }));
      }
    }
    velocityY += -9.8 * dt;
    player.root.moveWithCollisions(new Vector3(0, velocityY * dt, 0));
    if (player.root.position.y <= 0) { player.root.position.y = 0; velocityY = 0; }
    const minX = -10.8; const maxX = 10.8; const minZ = -12.1; const maxZ = 12.1;
    player.root.position.x = Math.max(minX, Math.min(maxX, player.root.position.x));
    player.root.position.z = Math.max(minZ, Math.min(maxZ, player.root.position.z));
    const target = player.root.position.add(new Vector3(0, 1.25, 0));
    const shoulder = Vector3.TransformCoordinates(new Vector3(0.75, 1.55, -4.1), Matrix.RotationY(yaw));
    camera.position = Vector3.Lerp(camera.position, target.add(shoulder), Math.min(1, dt * 8));
    camera.setTarget(target.add(new Vector3(0, pitch, 0)));
  });

  const noBook = () => false;
  const dispose = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    canvas.removeEventListener("mousemove", onPointerMove);
    canvas.removeEventListener("mouseleave", resetPointer);
    camera.detachControl();
    scene.dispose();
  };
  return {
    scene,
    dispose,
    openNearestBook: noBook,
    openBookById: noBook,
    openBookByMeshName: noBook,
    returnActiveBook: noBook,
    turnActivePage: noBook,
    hasActiveBook: () => false,
    getBookScreenRects: () => [],
    setTouchMove: (x, z) => { touchMove.x = Math.max(-1, Math.min(1, x)); touchMove.z = Math.max(-1, Math.min(1, z)); },
    setPerformanceMode: (mode) => { performanceMode = mode; scene.getLightByName("ceiling-light")!.intensity = mode === "light" ? 2.8 : 3.8; },
    setAudioEnabled: (enabled) => { audioEnabled = enabled; },
    getAudioEnabled: () => audioEnabled,
  };
}
