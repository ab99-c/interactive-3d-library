// Quiet Study Hall: مشهد دافئ وسينمائي؛ الخشب والعاج والزيتوني والنحاسي، والعالم 3D هو البطل.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";
import "@babylonjs/core/Collisions/collisionCoordinator";

export type BookInfo = { id: string; title: string; category: string; description: string };
export type GameHandle = { scene: Scene; dispose: () => void };

const COLORS = {
  walnut: new Color3(0.18, 0.09, 0.045),
  walnutLight: new Color3(0.34, 0.18, 0.08),
  ivory: new Color3(0.88, 0.82, 0.68),
  olive: new Color3(0.25, 0.31, 0.18),
  brass: new Color3(0.79, 0.58, 0.29),
  ink: new Color3(0.035, 0.028, 0.024),
};

const books: BookInfo[] = [
  { id: "atlas", title: "Atlas of Quiet Places", category: "Exploration", description: "خرائط لأماكن لا تظهر إلا لمن يمشي ببطء." },
  { id: "craft", title: "The Craft of Light", category: "Design", description: "ملاحظات عن الضوء، الظل، واللحظة التي يصير فيها المكان ذاكرة." },
  { id: "garden", title: "A Garden in Winter", category: "Literature", description: "حكاية قصيرة عن بذرة خبأها أحدهم بين صفحات كتاب." },
  { id: "voices", title: "Voices Between Shelves", category: "Essays", description: "أصوات القراء، بعد أن يغادر الجميع وتبقى المصابيح مضاءة." },
];

function material(scene: Scene, name: string, color: Color3, textureUrl?: string) {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.ambientColor = color.scale(0.38);
  mat.emissiveColor = color.scale(0.045);
  mat.specularColor = new Color3(0.12, 0.09, 0.06);
  if (textureUrl) {
    const texture = new Texture(textureUrl, scene);
    texture.uScale = 2;
    texture.vScale = 2;
    mat.diffuseTexture = texture;
  }
  return mat;
}

function box(scene: Scene, name: string, size: { width: number; height: number; depth: number }, position: Vector3, mat: StandardMaterial, collidable = true) {
  const mesh = MeshBuilder.CreateBox(name, size, scene);
  mesh.position = position;
  mesh.material = mat;
  mesh.checkCollisions = collidable;
  mesh.receiveShadows = true;
  return mesh;
}

function addShelf(scene: Scene, x: number, z: number, rotationY: number, wood: StandardMaterial, olive: StandardMaterial, brass: StandardMaterial, shadow: ShadowGenerator) {
  const root = new Mesh("shelf-root", scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.y = rotationY;
  const parts = [
    box(scene, "shelf-side", { width: 0.25, height: 4.7, depth: 1.2 }, new Vector3(-2.1, 2.35, 0), wood),
    box(scene, "shelf-side", { width: 0.25, height: 4.7, depth: 1.2 }, new Vector3(2.1, 2.35, 0), wood),
    box(scene, "shelf-top", { width: 4.45, height: 0.24, depth: 1.2 }, new Vector3(0, 4.62, 0), wood),
    ...[0.55, 1.55, 2.55, 3.55].map((y) => box(scene, "shelf-board", { width: 4.35, height: 0.16, depth: 1.12 }, new Vector3(0, y, 0), wood)),
    box(scene, "shelf-marker", { width: 0.7, height: 0.28, depth: 0.05 }, new Vector3(0, 4.25, -0.62), olive, false),
  ];
  parts.forEach((part) => { part.parent = root; shadow.addShadowCaster(part); });
  const bookColors = [COLORS.brass, new Color3(0.34, 0.12, 0.09), COLORS.olive, new Color3(0.08, 0.14, 0.2), COLORS.ivory];
  [0.72, 1.72, 2.72, 3.72].forEach((y, row) => {
    for (let i = 0; i < 8; i += 1) {
      const bookWidth = 0.26 + (i % 3) * 0.04;
      const bookHeight = 0.7 + (i % 2) * 0.12;
      const bookMaterial = material(scene, `book-mat-${row}-${i}`, bookColors[(i + row) % bookColors.length]);
      const book = box(scene, `book-${row}-${i}`, { width: bookWidth, height: bookHeight, depth: 0.82 }, new Vector3(-1.7 + i * 0.45, y + 0.4, -0.1), bookMaterial, false);
      book.parent = root;
      const labelMaterial = i % 3 === 0 ? brass : material(scene, `book-label-mat-${row}-${i}`, COLORS.ivory);
      const spineLabel = box(scene, `book-label-${row}-${i}`, { width: bookWidth * 0.72, height: 0.08, depth: 0.025 }, new Vector3(-1.7 + i * 0.45, y + 0.42, -0.525), labelMaterial, false);
      spineLabel.parent = root;
      const spineBand = box(scene, `book-band-${row}-${i}`, { width: bookWidth * 0.9, height: 0.035, depth: 0.03 }, new Vector3(-1.7 + i * 0.45, y + 0.68, -0.53), brass, false);
      spineBand.parent = root;
      book.metadata = { book: books[(row + i) % books.length] };
      book.actionManager = new ActionManager(scene);
      book.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => window.dispatchEvent(new CustomEvent("library:book", { detail: book.metadata.book }))));
      shadow.addShadowCaster(book);
    }
  });
  const shelfLight = new PointLight("shelf-light", new Vector3(x, 4.4, z), scene);
  shelfLight.parent = root;
  shelfLight.diffuse = COLORS.brass;
  shelfLight.intensity = 0.12;
  shelfLight.range = 5;
  return root;
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.028, 0.024, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new Vector3(0, -0.11, 0);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.018;
  scene.fogColor = new Color3(0.07, 0.055, 0.04);

  const camera = new UniversalCamera("player-camera", new Vector3(0, 1.75, 10), scene);
  scene.activeCamera = camera;
  camera.minZ = 0.1;
  camera.rotation.y = Math.PI;
  camera.attachControl(canvas, true);
  camera.speed = 0.22;
  camera.angularSensibility = 3800;
  camera.inertia = 0.72;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.6, 0.9, 0.6);
  camera.keysUp = [87, 38]; camera.keysDown = [83, 40]; camera.keysLeft = [65, 37]; camera.keysRight = [68, 39];

  const hemi = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.86; hemi.diffuse = COLORS.ivory; hemi.groundColor = new Color3(0.12, 0.08, 0.05);
  const ceilingLight = new PointLight("ceiling-light", new Vector3(0, 5.4, 1), scene);
  ceilingLight.diffuse = COLORS.brass; ceilingLight.intensity = 3.8; ceilingLight.range = 22;
  const aisleLight = new PointLight("aisle-fill", new Vector3(0, 3.7, -6), scene);
  aisleLight.diffuse = new Color3(1, 0.78, 0.5); aisleLight.intensity = 1.7; aisleLight.range = 15;
  const shadow = new ShadowGenerator(1024, ceilingLight);
  shadow.useBlurExponentialShadowMap = true; shadow.blurKernel = 24;

  const wood = material(scene, "walnut", COLORS.walnut, "/manus-storage/walnut-shelf-texture_c5b61c55.png");
  const woodLight = material(scene, "wood-light", COLORS.walnutLight);
  const floor = material(scene, "floor", new Color3(0.12, 0.065, 0.032), "/manus-storage/walnut-shelf-texture_c5b61c55.png");
  const wall = material(scene, "plaster", new Color3(0.42, 0.34, 0.23));
  const ivory = material(scene, "ivory", COLORS.ivory);
  const olive = material(scene, "olive", COLORS.olive);
  const brass = material(scene, "brass", COLORS.brass);

  box(scene, "floor", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, -0.15, 0), floor);
  box(scene, "back-wall", { width: 24, height: 7, depth: 0.3 }, new Vector3(0, 3.5, -13.5), wall);
  box(scene, "left-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(-12, 3.5, 0), wall);
  box(scene, "right-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(12, 3.5, 0), wall);
  box(scene, "ceiling", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, 7, 0), woodLight, false);
  addShelf(scene, -6.8, -5.8, 0, wood, olive, brass, shadow);
  addShelf(scene, 6.8, -5.8, 0, wood, olive, brass, shadow);
  addShelf(scene, -6.8, 1.0, 0, wood, olive, brass, shadow);
  addShelf(scene, 6.8, 1.0, 0, wood, olive, brass, shadow);
  addShelf(scene, 0, -10.8, Math.PI / 2, wood, olive, brass, shadow);

  const table = box(scene, "reading-table", { width: 4.8, height: 0.26, depth: 2.2 }, new Vector3(0, 2, 0), woodLight);
  shadow.addShadowCaster(table);
  [-1.8, 1.8].forEach((x) => [-0.72, 0.72].forEach((z) => box(scene, "table-leg", { width: 0.22, height: 2, depth: 0.22 }, new Vector3(x, 1, z), woodLight)));
  box(scene, "catalog", { width: 1.1, height: 0.13, depth: 0.75 }, new Vector3(0, 2.2, 0), ivory, false);
  const tableLamp = new PointLight("reading-lamp", new Vector3(0, 3.3, 0), scene);
  tableLamp.diffuse = COLORS.brass; tableLamp.intensity = 1.2; tableLamp.range = 6;
  const lampShade = MeshBuilder.CreateCylinder("lamp-shade", { diameterTop: 0.3, diameterBottom: 0.75, height: 0.55 }, scene);
  lampShade.position = new Vector3(0, 3.05, 0); lampShade.material = brass; lampShade.isPickable = false;

  const rug = box(scene, "rug", { width: 8, height: 0.03, depth: 5 }, new Vector3(0, 0.02, 1.2), material(scene, "rug-mat", new Color3(0.18, 0.19, 0.12)), false);
  rug.rotation.y = 0.02;
  const plaque = box(scene, "welcome-plaque", { width: 3.4, height: 1.2, depth: 0.08 }, new Vector3(0, 4.3, -13.28), ivory, false);
  plaque.metadata = { decorative: true };

  const onPointer = () => {
    const pick = scene.pick(scene.pointerX, scene.pointerY);
    if (pick?.hit && pick.pickedMesh?.metadata?.book) {
      window.dispatchEvent(new CustomEvent("library:book", { detail: pick.pickedMesh.metadata.book }));
    }
  };
  scene.onPointerObservable.add(onPointer);

  const demo = new URLSearchParams(window.location.search).has("demo");
  if (demo) {
    let t = 0;
    scene.onBeforeRenderObservable.add(() => {
      t += engine.getDeltaTime() / 1000;
      camera.position.x = Math.sin(t * 0.16) * 4.2;
      camera.position.z = 7.5 - t * 0.12;
      camera.rotation.y = Math.sin(t * 0.16) * 0.24;
      camera.rotation.x = -0.04;
      if (camera.position.z < -6) { camera.position.z = 7.5; t = 0; }
    });
  }

  const dispose = () => { scene.onPointerObservable.clear(); scene.dispose(); };
  return { scene, dispose };
}
