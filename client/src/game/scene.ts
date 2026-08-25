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
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ActionManager } from "@babylonjs/core/Actions/actionManager";
import { ExecuteCodeAction } from "@babylonjs/core/Actions/directActions";
import { PointerEventTypes } from "@babylonjs/core/Events/pointerEvents";
import "@babylonjs/core/Collisions/collisionCoordinator";
// Register Babylon's built-in shader sources in the bundle; otherwise Vite may serve index.html for /src/Shaders/*.fx.
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";

export type BookInfo = { id: string; title: string; category: string; description: string };
export type GameHandle = { scene: Scene; dispose: () => void; openNearestBook: () => boolean };

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

function createTitleMaterial(scene: Scene, book: BookInfo, cache: Map<string, StandardMaterial>) {
  const existing = cache.get(book.id);
  if (existing) return existing;
  const texture = new DynamicTexture(`book-title-${book.id}`, { width: 256, height: 512 }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 256, 512);
  context.fillStyle = "#1a1009";
  context.fillRect(8, 8, 240, 496);
  context.strokeStyle = "#e4b96f";
  context.lineWidth = 8;
  context.strokeRect(12, 12, 232, 488);
  context.fillStyle = "#fff0c2";
  context.font = "bold 34px Georgia";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const words = book.title.toUpperCase().split(" ");
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > 10 && line) { lines.push(line); line = word; } else line = candidate;
  });
  if (line) lines.push(line);
  const startY = 205 - (lines.length - 1) * 24;
  lines.slice(0, 6).forEach((value, index) => context.fillText(value, 128, startY + index * 46));
  context.fillStyle = "#f0c66d";
  context.fillRect(42, 350, 172, 8);
  context.font = "bold 20px Georgia";
  context.fillStyle = "#ffe6a5";
  context.fillText(book.category.toUpperCase(), 128, 405);
  context.font = "bold 17px Georgia";
  context.fillStyle = "#d7a65b";
  context.fillText(`VOL. ${book.id.toUpperCase()}`, 128, 452);
  texture.update();
  const titleMaterial = new StandardMaterial(`book-title-mat-${book.id}`, scene);
  titleMaterial.diffuseTexture = texture;
  titleMaterial.emissiveColor = new Color3(0.42, 0.24, 0.08);
  titleMaterial.specularColor = new Color3(0.05, 0.03, 0.02);
  titleMaterial.backFaceCulling = false;
  titleMaterial.useAlphaFromDiffuseTexture = true;
  cache.set(book.id, titleMaterial);
  return titleMaterial;
}

function addShelf(scene: Scene, x: number, z: number, rotationY: number, wood: StandardMaterial, olive: StandardMaterial, brass: StandardMaterial, shadow: ShadowGenerator, titleMaterials: Map<string, StandardMaterial>) {
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
      const bookWidth = 0.32 + (i % 3) * 0.045;
      const bookHeight = 0.7 + (i % 2) * 0.12;
      const bookInfo = books[(row + i) % books.length];
      const bookMaterial = material(scene, `book-mat-${row}-${i}`, bookColors[(i + row) % bookColors.length]);
      const bookPosition = new Vector3(-1.7 + i * 0.45, y + 0.4, -0.1);
      const book = box(scene, `book-${row}-${i}`, { width: bookWidth, height: bookHeight, depth: 0.82 }, bookPosition, bookMaterial, false);
      book.parent = root;
      const pages = box(scene, `book-pages-${row}-${i}`, { width: Math.max(bookWidth * 0.68, 0.2), height: bookHeight * 0.82, depth: 0.72 }, new Vector3(bookPosition.x + 0.035, bookPosition.y, bookPosition.z + 0.04), material(scene, `book-pages-mat-${row}-${i}`, new Color3(0.92, 0.83, 0.63)), false);
      pages.parent = root;
      const coverTop = box(scene, `book-cover-top-${row}-${i}`, { width: bookWidth * 1.06, height: 0.045, depth: 0.86 }, new Vector3(bookPosition.x, bookPosition.y + bookHeight * 0.48, bookPosition.z), bookMaterial, false);
      coverTop.parent = root;
      const coverBottom = box(scene, `book-cover-bottom-${row}-${i}`, { width: bookWidth * 1.06, height: 0.045, depth: 0.86 }, new Vector3(bookPosition.x, bookPosition.y - bookHeight * 0.48, bookPosition.z), bookMaterial, false);
      coverBottom.parent = root;
      const titlePlate = MeshBuilder.CreatePlane(`book-title-${row}-${i}`, { width: Math.max(bookWidth * 0.9, 0.26), height: bookHeight * 0.84, sideOrientation: Mesh.DOUBLESIDE }, scene);
      titlePlate.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + 0.535);
      titlePlate.material = createTitleMaterial(scene, bookInfo, titleMaterials);
      titlePlate.parent = root;
      const labelMaterial = i % 3 === 0 ? brass : material(scene, `book-label-mat-${row}-${i}`, COLORS.ivory);
      const spineLabel = box(scene, `book-label-${row}-${i}`, { width: bookWidth * 0.72, height: 0.055, depth: 0.025 }, new Vector3(bookPosition.x, bookPosition.y - bookHeight * 0.26, bookPosition.z + 0.555), labelMaterial, false);
      spineLabel.parent = root;
      const spineBand = box(scene, `book-band-${row}-${i}`, { width: bookWidth * 0.9, height: 0.035, depth: 0.03 }, new Vector3(bookPosition.x, bookPosition.y + bookHeight * 0.32, bookPosition.z + 0.56), brass, false);
      spineBand.parent = root;
      const bookParts = [book, pages, coverTop, coverBottom, titlePlate, spineLabel, spineBand];
      bookParts.forEach((target) => {
        target.metadata = { book: bookInfo, bookParts, bookRestPosition: target.position.clone(), bookPulled: false };
        target.isPickable = true;
        target.actionManager = new ActionManager(scene);
        target.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => window.dispatchEvent(new CustomEvent("library:book", { detail: bookInfo }))));
      });
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
  const titleMaterials = new Map<string, StandardMaterial>();

  box(scene, "floor", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, -0.15, 0), floor);
  box(scene, "back-wall", { width: 24, height: 7, depth: 0.3 }, new Vector3(0, 3.5, -13.5), wall);
  box(scene, "left-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(-12, 3.5, 0), wall);
  box(scene, "right-wall", { width: 0.3, height: 7, depth: 28 }, new Vector3(12, 3.5, 0), wall);
  box(scene, "ceiling", { width: 24, height: 0.25, depth: 28 }, new Vector3(0, 7, 0), woodLight, false);
  addShelf(scene, -6.8, -5.8, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 6.8, -5.8, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, -6.8, 1.0, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 6.8, 1.0, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 0, -10.8, Math.PI / 2, wood, olive, brass, shadow, titleMaterials);

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

  const pullBookOut = (parts: any[]) => {
    if (!parts?.length || parts.some((part) => part.metadata?.bookPulled)) return;
    const startPositions = parts.map((part) => part.position.clone());
    const pullDistance = 0.72;
    const startedAt = performance.now();
    parts.forEach((part) => { part.metadata = { ...part.metadata, bookPulled: true }; });
    const observer = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 360, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      parts.forEach((part, index) => {
        const start = startPositions[index];
        part.position = new Vector3(start.x, start.y, start.z + pullDistance * eased);
      });
      if (progress >= 1) scene.onBeforeRenderObservable.remove(observer);
    });
  };

  const openBook = (mesh: any) => {
    let current = mesh;
    while (current) {
      if (current.metadata?.book) {
        pullBookOut(current.metadata.bookParts ?? [current]);
        window.dispatchEvent(new CustomEvent("library:book", { detail: current.metadata.book }));
        return true;
      }
      current = current.parent;
    }
    return false;
  };
  const onPointer = (pointerInfo: any) => {
    const pickedMesh = pointerInfo?.pickInfo?.pickedMesh ?? scene.pick(scene.pointerX, scene.pointerY)?.pickedMesh;
    if (pointerInfo?.pickInfo?.hit || pickedMesh) openBook(pickedMesh);
  };
  scene.onPointerObservable.add(onPointer, PointerEventTypes.POINTERPICK);
  const inspectAt = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = engine.getRenderWidth() / Math.max(rect.width, 1);
    const scaleY = engine.getRenderHeight() / Math.max(rect.height, 1);
    const pick = scene.pick((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    if (pick?.hit) return openBook(pick.pickedMesh);
    return false;
  };
  const onCanvasPointer = (event: PointerEvent) => {
    if (event.button !== 0) return;
    inspectAt(event.clientX, event.clientY);
  };
  const onCanvasClick = (event: MouseEvent) => inspectAt(event.clientX, event.clientY);
  canvas.addEventListener("pointerdown", onCanvasPointer);
  canvas.addEventListener("click", onCanvasClick);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!["e", "E", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const centerPick = scene.pick(engine.getRenderWidth() / 2, engine.getRenderHeight() / 2);
    if (centerPick?.hit && openBook(centerPick.pickedMesh)) return;
    openNearestBook();
  };
  window.addEventListener("keydown", onKeyDown);

  const openNearestBook = () => {
      const candidates = scene.meshes.filter((mesh) => /^book-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book);
    if (!candidates.length) return false;
    const nearest = candidates.reduce((closest, candidate) => Vector3.DistanceSquared(candidate.getAbsolutePosition(), camera.position) < Vector3.DistanceSquared(closest.getAbsolutePosition(), camera.position) ? candidate : closest);
    return openBook(nearest);
  };

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

  const dispose = () => { window.removeEventListener("keydown", onKeyDown); canvas.removeEventListener("pointerdown", onCanvasPointer); canvas.removeEventListener("click", onCanvasClick); scene.onPointerObservable.clear(); scene.dispose(); };
  return { scene, dispose, openNearestBook };
}
