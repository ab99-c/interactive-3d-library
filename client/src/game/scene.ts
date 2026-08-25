// Quiet Study Hall: مشهد دافئ وسينمائي؛ الخشب والعاج والزيتوني والنحاسي، والعالم 3D هو البطل.
import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import "@babylonjs/core/Collisions/collisionCoordinator";
// Register Ray before scene picking APIs are used; Babylon otherwise logs a side-effect warning at runtime.
import "@babylonjs/core/Culling/ray";
// Register Babylon's built-in shader sources in the bundle; otherwise Vite may serve index.html for /src/Shaders/*.fx.
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";

export type BookInfo = { id: string; title: string; category: string; description: string; spineTitle: string; volume: string };
export type BookScreenRect = { meshName: string; bookId: string; title: string; x: number; y: number; width: number; height: number };
export type GameHandle = { scene: Scene; dispose: () => void; openNearestBook: () => boolean; openBookById: (bookId: string) => boolean; openBookByMeshName: (meshName: string) => boolean; returnActiveBook: () => boolean; turnActivePage: (direction: "rtl" | "ltr") => boolean; hasActiveBook: () => boolean; getBookScreenRects: () => BookScreenRect[]; setTouchMove: (x: number, y: number) => void };

const BOOK_FORMATS = [
  { name: "Pocket", width: 0.17, height: 0.43, depth: 0.12 },
  { name: "A5", width: 0.19, height: 0.50, depth: 0.14 },
  { name: "Trade Paperback", width: 0.20, height: 0.53, depth: 0.15 },
  { name: "B5", width: 0.22, height: 0.56, depth: 0.16 },
  { name: "A4 Reference", width: 0.23, height: 0.58, depth: 0.17 },
  { name: "Square", width: 0.23, height: 0.40, depth: 0.14 },
  { name: "Planner", width: 0.20, height: 0.54, depth: 0.16 },
  { name: "Notebook", width: 0.20, height: 0.48, depth: 0.14 },
];

const BOOK_LEATHER_TEXTURE = "/manus-storage/arabic-leather-book-cover-texture_f389a004.png";

const COLORS = {
  walnut: new Color3(0.18, 0.09, 0.045),
  walnutLight: new Color3(0.34, 0.18, 0.08),
  ivory: new Color3(0.88, 0.82, 0.68),
  olive: new Color3(0.25, 0.31, 0.18),
  brass: new Color3(0.79, 0.58, 0.29),
  ink: new Color3(0.035, 0.028, 0.024),
};

export const BOOK_CATALOG: BookInfo[] = [
  { id: "hayy-ibn-yaqdhan", title: "حي بن يقظان", category: "الفلسفة", description: "رحلة فكرية كلاسيكية عن الإنسان والطبيعة والبحث عن الحقيقة.", spineTitle: "حي بن يقظان", volume: "١" },
  { id: "atlas", title: "Atlas of Quiet Places", category: "الاستكشاف", description: "خرائط لأماكن لا تظهر إلا لمن يمشي ببطء.", spineTitle: "موسوعة السكينة", volume: "٢" },
  { id: "craft", title: "The Craft of Light", category: "التصميم", description: "ملاحظات عن الضوء، الظل، واللحظة التي يصير فيها المكان ذاكرة.", spineTitle: "صناعة النور", volume: "٣" },
  { id: "garden", title: "A Garden in Winter", category: "الأدب", description: "حكاية قصيرة عن بذرة خبأها أحدهم بين صفحات كتاب.", spineTitle: "حديقة الشتاء", volume: "٤" },
  { id: "voices", title: "Voices Between Shelves", category: "المقالات", description: "أصوات القراء، بعد أن يغادر الجميع وتبقى المصابيح مضاءة.", spineTitle: "أصوات الرفوف", volume: "٥" },
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
    mat.bumpTexture = texture;
    mat.bumpTexture.level = 0.22;
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
  context.fillStyle = "#29140d";
  context.fillRect(8, 8, 240, 496);
  context.strokeStyle = "#e4b96f";
  context.lineWidth = 8;
  context.strokeRect(12, 12, 232, 488);
  context.fillStyle = "#0b0b0a";
  context.fillRect(12, 12, 232, 62);
  context.fillRect(12, 438, 232, 62);
  context.strokeStyle = "#d3a34e";
  context.lineWidth = 5;
  context.strokeRect(22, 22, 212, 42);
  context.strokeRect(22, 448, 212, 42);
  context.fillStyle = "#d9aa55";
  context.font = "bold 28px Georgia";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("۞  ۞  ۞", 128, 43);
  context.fillText("۞  ۞  ۞", 128, 469);
  context.save();
  context.translate(128, 255);
  context.rotate(-Math.PI / 2);
  context.direction = "rtl";
  context.fillStyle = "#f4d486";
  context.font = "bold 31px Georgia";
  context.fillText(book.spineTitle, 0, -4);
  context.restore();
  context.fillStyle = "#f1cc72";
  context.font = "bold 22px Georgia";
  context.fillText(`الجزء ${book.volume}`, 128, 405);
  context.fillStyle = "#1a0d08";
  context.fillRect(62, 365, 132, 48);
  context.strokeStyle = "#d8aa58";
  context.lineWidth = 4;
  context.strokeRect(62, 365, 132, 48);
  context.fillStyle = "#f4d486";
  context.font = "bold 25px Georgia";
  context.fillText(book.volume, 128, 389);
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

function addShelf(scene: Scene, shelfIndex: number, x: number, z: number, rotationY: number, wood: StandardMaterial, olive: StandardMaterial, brass: StandardMaterial, shadow: ShadowGenerator, titleMaterials: Map<string, StandardMaterial>) {
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
      const bookColors = [new Color3(0.34, 0.075, 0.045), new Color3(0.24, 0.075, 0.035), new Color3(0.32, 0.11, 0.055), new Color3(0.075, 0.17, 0.12), new Color3(0.28, 0.055, 0.075)];
      [0.72, 1.72, 2.72, 3.72].forEach((y, row) => {
    for (let i = 0; i < 14; i += 1) {
      const format = BOOK_FORMATS[(shelfIndex + row + i) % BOOK_FORMATS.length];
      const bookWidth = format.width;
      const bookHeight = format.height;
      const bookDepth = format.depth;
      const bookLean = ((i % 5) - 2) * 0.018;
      // Every physical volume represents the same public-domain Arabic work requested by the user.
      const bookInfo = BOOK_CATALOG[0];
      const leatherColor = bookColors[(i + row) % bookColors.length];
      const bookMaterial = material(scene, `book-mat-${shelfIndex}-${row}-${i}`, leatherColor);
      const leatherMaterial = material(scene, `book-leather-${shelfIndex}-${row}-${i}`, leatherColor, BOOK_LEATHER_TEXTURE);
      // Place the book directly on the board below this row, with only a tiny clearance.
      const shelfTopY = y - 0.17 + 0.08;
      const bookPosition = new Vector3(-2.00 + i * 0.30, shelfTopY + bookHeight * 0.5 + 0.008, -0.04);
      const book = box(scene, `book-${shelfIndex}-${row}-${i}`, { width: bookWidth, height: bookHeight, depth: bookDepth }, bookPosition, bookMaterial, false);
      book.parent = root;
      const roundedSpine = MeshBuilder.CreateCylinder(`book-rounded-spine-${shelfIndex}-${row}-${i}`, { diameter: Math.min(bookDepth * 0.9, 0.28), height: bookHeight * 0.94, tessellation: 16 }, scene);
      roundedSpine.position = new Vector3(bookPosition.x - bookWidth * 0.46, bookPosition.y, bookPosition.z);
      roundedSpine.material = leatherMaterial;
      roundedSpine.parent = root;
      roundedSpine.isPickable = false;
      const spineStrip = box(scene, `book-spine-strip-${shelfIndex}-${row}-${i}`, { width: Math.max(bookWidth * 0.12, 0.045), height: bookHeight * 0.94, depth: bookDepth * 1.04 }, new Vector3(bookPosition.x - bookWidth * 0.45, bookPosition.y, bookPosition.z), bookMaterial, false);
      spineStrip.material = leatherMaterial;
      spineStrip.parent = root;
      const pages = box(scene, `book-pages-${row}-${i}`, { width: Math.max(bookWidth * 0.68, 0.2), height: bookHeight * 0.82, depth: bookDepth * 0.78 }, new Vector3(bookPosition.x + 0.035, bookPosition.y, bookPosition.z + 0.012), material(scene, `book-pages-mat-${row}-${i}`, new Color3(0.92, 0.83, 0.63)), false);
      pages.parent = root;
      const coverTop = box(scene, `book-cover-top-${row}-${i}`, { width: bookWidth * 1.06, height: 0.045, depth: bookDepth * 1.08 }, new Vector3(bookPosition.x, bookPosition.y + bookHeight * 0.48, bookPosition.z), leatherMaterial, false);
      coverTop.parent = root;
      const coverBottom = box(scene, `book-cover-bottom-${row}-${i}`, { width: bookWidth * 1.06, height: 0.045, depth: bookDepth * 1.08 }, new Vector3(bookPosition.x, bookPosition.y - bookHeight * 0.48, bookPosition.z), leatherMaterial, false);
      coverBottom.parent = root;
      const frontCover = box(scene, `book-front-cover-${shelfIndex}-${row}-${i}`, { width: bookWidth * 1.04, height: bookHeight * 1.02, depth: 0.035 }, new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.014), leatherMaterial, false);
      frontCover.parent = root;
      // Closed books carry a hidden physical reading spread that unfolds in front of the cover.
      const makeReadingMaterial = (pageNumber: string, side: "left" | "right") => {
        const pageMaterial = material(scene, `book-reading-pages-${shelfIndex}-${row}-${i}-${side}`, new Color3(0.96, 0.88, 0.70));
        const pageTexture = new DynamicTexture(`book-reading-text-${shelfIndex}-${row}-${i}-${side}`, { width: 512, height: 512 }, scene, true);
        const pageContext = pageTexture.getContext() as unknown as CanvasRenderingContext2D;
        pageContext.fillStyle = "#f1dfb3"; pageContext.fillRect(0, 0, 512, 512);
        pageContext.strokeStyle = "#9a6b35"; pageContext.lineWidth = 7; pageContext.strokeRect(16, 16, 480, 480);
        pageContext.direction = "rtl"; pageContext.textAlign = "right"; pageContext.fillStyle = "#3a2014";
        pageContext.font = "bold 30px Noto Sans Arabic"; pageContext.fillText("حي بن يقظان", 462, 64);
        pageContext.font = "bold 19px Noto Sans Arabic";
        const lines = ["تأمل حيّ بن يقظان العالم من حوله،", "وسأل عن سرّ الحياة والحقيقة،", "ثم تابع بحثه بهدوء بين الطبيعة", "والنور والمعرفة."];
        lines.forEach((line, lineIndex) => pageContext.fillText(line, 462, 132 + lineIndex * 43));
        pageContext.strokeStyle = "#c49a5a"; pageContext.lineWidth = 2; pageContext.beginPath(); pageContext.moveTo(52, 396); pageContext.lineTo(460, 396); pageContext.stroke();
        pageContext.textAlign = "center"; pageContext.font = "bold 23px serif"; pageContext.fillText(pageNumber, 256, 458);
        pageTexture.update(); pageMaterial.diffuseTexture = pageTexture; return pageMaterial;
      };
      const leftReadingMaterial = makeReadingMaterial("١", "left");
      const rightReadingMaterial = makeReadingMaterial("٢", "right");
      // The reading spread uses square pages, like a compact illuminated manuscript.
      const openPageSize = Math.max(bookHeight * 1.02, 0.48);
      const openPageWidth = openPageSize;
      const openPageHeight = openPageSize;
      const openLeftPage = box(scene, `book-open-left-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, depth: 0.018 }, new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.12), leftReadingMaterial, false);
      const openRightPage = box(scene, `book-open-right-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, depth: 0.018 }, new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.125), rightReadingMaterial, false);
      const turningPage = box(scene, `book-turning-page-${shelfIndex}-${row}-${i}`, { width: openPageWidth, height: openPageHeight, depth: 0.014 }, new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.14), rightReadingMaterial, false);
      [openLeftPage, openRightPage, turningPage].forEach((page) => { page.parent = root; page.isVisible = false; page.isPickable = false; });
      const titlePlate = MeshBuilder.CreatePlane(`book-title-${row}-${i}`, { width: Math.max(bookWidth * 0.9, 0.20), height: bookHeight * 0.86, sideOrientation: Mesh.DOUBLESIDE }, scene);
      titlePlate.position = new Vector3(bookPosition.x, bookPosition.y, bookPosition.z + bookDepth * 0.5 + 0.046);
      titlePlate.material = createTitleMaterial(scene, bookInfo, titleMaterials);
      titlePlate.parent = root;
      const labelMaterial = i % 3 === 0 ? brass : material(scene, `book-label-mat-${row}-${i}`, COLORS.ivory);
      const spineLabel = box(scene, `book-label-${row}-${i}`, { width: bookWidth * 0.72, height: 0.055, depth: 0.025 }, new Vector3(bookPosition.x, bookPosition.y - bookHeight * 0.26, bookPosition.z + bookDepth * 0.5 + 0.032), labelMaterial, false);
      spineLabel.parent = root;
      const spineBand = box(scene, `book-band-${row}-${i}`, { width: bookWidth * 0.9, height: 0.035, depth: 0.03 }, new Vector3(bookPosition.x, bookPosition.y + bookHeight * 0.32, bookPosition.z + bookDepth * 0.5 + 0.035), brass, false);
      spineBand.parent = root;
      const bindingBandTop = box(scene, `book-binding-top-${shelfIndex}-${row}-${i}`, { width: Math.max(bookWidth * 0.15, 0.05), height: 0.035, depth: bookDepth * 1.08 }, new Vector3(bookPosition.x - bookWidth * 0.45, bookPosition.y + bookHeight * 0.34, bookPosition.z), brass, false);
      const bindingBandMid = box(scene, `book-binding-mid-${shelfIndex}-${row}-${i}`, { width: Math.max(bookWidth * 0.15, 0.05), height: 0.035, depth: bookDepth * 1.08 }, new Vector3(bookPosition.x - bookWidth * 0.45, bookPosition.y, bookPosition.z), brass, false);
      const bindingBandBottom = box(scene, `book-binding-bottom-${shelfIndex}-${row}-${i}`, { width: Math.max(bookWidth * 0.15, 0.05), height: 0.035, depth: bookDepth * 1.08 }, new Vector3(bookPosition.x - bookWidth * 0.45, bookPosition.y - bookHeight * 0.34, bookPosition.z), brass, false);
      [bindingBandTop, bindingBandMid, bindingBandBottom].forEach((band) => { band.parent = root; });
      const frontZ = bookPosition.z + bookDepth * 0.5 + 0.038;
      const frameTop = box(scene, `book-frame-top-${row}-${i}`, { width: bookWidth * 0.78, height: 0.018, depth: 0.022 }, new Vector3(bookPosition.x, bookPosition.y + bookHeight * 0.38, frontZ), brass, false);
      const frameBottom = box(scene, `book-frame-bottom-${row}-${i}`, { width: bookWidth * 0.78, height: 0.018, depth: 0.022 }, new Vector3(bookPosition.x, bookPosition.y - bookHeight * 0.38, frontZ), brass, false);
      const frameLeft = box(scene, `book-frame-left-${row}-${i}`, { width: 0.018, height: bookHeight * 0.76, depth: 0.022 }, new Vector3(bookPosition.x - bookWidth * 0.38, bookPosition.y, frontZ), brass, false);
      const frameRight = box(scene, `book-frame-right-${row}-${i}`, { width: 0.018, height: bookHeight * 0.76, depth: 0.022 }, new Vector3(bookPosition.x + bookWidth * 0.38, bookPosition.y, frontZ), brass, false);
      [frameTop, frameBottom, frameLeft, frameRight].forEach((frame) => { frame.parent = root; });
      const bookParts = [book, roundedSpine, spineStrip, pages, coverTop, coverBottom, frontCover, openLeftPage, openRightPage, turningPage, titlePlate, spineLabel, spineBand, bindingBandTop, bindingBandMid, bindingBandBottom, frameTop, frameBottom, frameLeft, frameRight];
      bookParts.forEach((target) => {
        target.rotation.y = bookLean;
        target.metadata = { book: bookInfo, format: format.name, openPageWidth, openPageHeight, bookParts, bookRestPosition: target.position.clone(), bookRestRotation: target.rotation.clone(), bookRestVisible: target.isVisible, bookPulled: false, bookOpened: false, readingPage: target === openLeftPage || target === openRightPage, pageSide: target === openLeftPage ? "left" : target === openRightPage ? "right" : undefined, turningPage: target === turningPage, closedCover: target === frontCover || target === titlePlate || target === spineLabel || target === spineBand || target === frameTop || target === frameBottom || target === frameLeft || target === frameRight };
        // Only the main volume is pickable; decorative binding parts move with it but do not create duplicate hits.
        target.isPickable = target === book || target === openLeftPage || target === openRightPage;
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
  // Mouse-look tuning: keyboard input stays with Babylon, while passive mouse movement turns the view without click or pointer lock.
  camera.inputs.removeByType("FreeCameraMouseInput");
  camera.inputs.removeByType("FreeCameraKeyboardMoveInput");
  // Movement tuning: responsive starts/stops, comfortable walking speed, and easier mouse look in every direction.
  camera.speed = 0.3;
  camera.angularSensibility = 2500;
  camera.inertia = 0.42;
  camera.applyGravity = true;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.6, 0.9, 0.6);
  camera.keysUp = [87, 38]; camera.keysDown = [83, 40]; camera.keysLeft = [65, 37]; camera.keysRight = [68, 39];
  let lastMouseX: number | null = null;
  let lastMouseY: number | null = null;
  const touchMove = new Vector3(0, 0, 0);
  const pressedKeys = new Set<string>();
  const onMouseMove = (event: MouseEvent) => {
    const deltaX = event.movementX || (lastMouseX === null ? 0 : event.clientX - lastMouseX);
    const deltaY = event.movementY || (lastMouseY === null ? 0 : event.clientY - lastMouseY);
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
    camera.rotation.y += deltaX * 0.0025;
    camera.rotation.x = Math.max(-1.25, Math.min(1.25, camera.rotation.x + deltaY * 0.0025));
  };
  const resetMouseReference = () => { lastMouseX = null; lastMouseY = null; };
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mouseleave", resetMouseReference);
  let touchLookId: number | null = null;
  let lastTouchX = 0;
  let lastTouchY = 0;
  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchLookId = touch.identifier;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (touchLookId === null) return;
    const touch = Array.from(event.touches).find((item) => item.identifier === touchLookId);
    if (!touch) return;
    const deltaX = touch.clientX - lastTouchX;
    const deltaY = touch.clientY - lastTouchY;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
    camera.rotation.y += deltaX * 0.004;
    camera.rotation.x = Math.max(-1.25, Math.min(1.25, camera.rotation.x + deltaY * 0.004));
    event.preventDefault();
  };
  const onTouchEnd = (event: TouchEvent) => {
    if (!Array.from(event.touches).some((touch) => touch.identifier === touchLookId)) touchLookId = null;
  };
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
  scene.onBeforeRenderObservable.add(() => {
    let moveX = touchMove.x;
    let moveZ = touchMove.z;
    if (pressedKeys.has("w") || pressedKeys.has("arrowup")) moveZ += 1;
    if (pressedKeys.has("s") || pressedKeys.has("arrowdown")) moveZ -= 1;
    if (pressedKeys.has("a") || pressedKeys.has("arrowleft")) moveX -= 1;
    if (pressedKeys.has("d") || pressedKeys.has("arrowright")) moveX += 1;
    const length = Math.hypot(moveX, moveZ);
    if (length < 0.001) return;
    if (length > 1) { moveX /= length; moveZ /= length; }
    const forward = camera.getDirection(Vector3.Forward());
    forward.y = 0;
    if (forward.lengthSquared() > 0.001) forward.normalize();
    const right = camera.getDirection(Vector3.Right());
    right.y = 0;
    if (right.lengthSquared() > 0.001) right.normalize();
    camera.cameraDirection.addInPlace(forward.scale(moveZ * camera.speed));
    camera.cameraDirection.addInPlace(right.scale(moveX * camera.speed));
  });
  // Keep every control scheme inside the playable library floor, including the mobile joystick.
  const roomBounds = { minX: -10.3, maxX: 10.3, minY: 1.15, maxY: 4.7, minZ: -11.9, maxZ: 10.2 };
  scene.onBeforeRenderObservable.add(() => {
    const before = camera.position.clone();
    camera.position.x = Math.max(roomBounds.minX, Math.min(roomBounds.maxX, camera.position.x));
    camera.position.y = Math.max(roomBounds.minY, Math.min(roomBounds.maxY, camera.position.y));
    camera.position.z = Math.max(roomBounds.minZ, Math.min(roomBounds.maxZ, camera.position.z));
    if (camera.position.x !== before.x && Math.sign(camera.cameraDirection.x) === Math.sign(camera.position.x - before.x)) camera.cameraDirection.x = 0;
    if (camera.position.y !== before.y && Math.sign(camera.cameraDirection.y) === Math.sign(camera.position.y - before.y)) camera.cameraDirection.y = 0;
    if (camera.position.z !== before.z && Math.sign(camera.cameraDirection.z) === Math.sign(camera.position.z - before.z)) camera.cameraDirection.z = 0;
  });

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
  addShelf(scene, 0, -6.8, -5.8, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 1, 6.8, -5.8, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 2, -6.8, 1.0, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 3, 6.8, 1.0, 0, wood, olive, brass, shadow, titleMaterials);
  addShelf(scene, 4, 0, -10.8, Math.PI / 2, wood, olive, brass, shadow, titleMaterials);

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

  let activeBookParts: any[] | null = null;
  let activeBookId: string | null = null;
  let activePullObserver: any = null;
  let activeOpenObserver: any = null;
  let activeTurnObserver: any = null;
  let audioContext: AudioContext | null = null;
  const emitBookState = () => window.dispatchEvent(new CustomEvent("library:book-state", { detail: { active: Boolean(activeBookParts), bookId: activeBookId } }));
  const getAudioContext = () => {
    const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContext) audioContext = new AudioContextConstructor();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  };
  const playBookSound = (kind: "pull" | "return") => {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === "pull" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "pull" ? 180 : 300, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "pull" ? 420 : 150, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "pull" ? 0.055 : 0.04, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.24);
  };
  const returnActiveBookToShelf = () => {
    if (activePullObserver) {
      scene.onBeforeRenderObservable.remove(activePullObserver);
      activePullObserver = null;
    }
    if (activeOpenObserver) {
      scene.onBeforeRenderObservable.remove(activeOpenObserver);
      activeOpenObserver = null;
    }
    if (activeTurnObserver) {
      scene.onBeforeRenderObservable.remove(activeTurnObserver);
      activeTurnObserver = null;
    }
    if (!activeBookParts) return false;
    activeBookParts.forEach((part) => {
      const restPosition = part.metadata?.bookRestPosition;
      const restRotation = part.metadata?.bookRestRotation;
      if (restPosition) part.position = restPosition.clone();
      if (restRotation) part.rotation = restRotation.clone();
      if (typeof part.metadata?.bookRestVisible === "boolean") part.isVisible = part.metadata.bookRestVisible;
      part.metadata = { ...part.metadata, bookPulled: false, bookOpened: false };
    });
    activeBookParts = null;
    activeBookId = null;
    emitBookState();
    return true;
  };
  const openBookSpread = (parts: any[]) => {
    const pages = parts.filter((part) => part.metadata?.readingPage);
    const closedCoverParts = parts.filter((part) => part.metadata?.closedCover);
    if (!pages.length) return;
    const center = parts[0].position.clone().add(new Vector3(0, 0, 0.12));
    const width = Number(parts[0].metadata?.openPageWidth ?? (parts[0].metadata?.format === "Pocket" ? 0.22 : 0.25));
    const pageTargets = [center.add(new Vector3(-width * 0.58, 0, 0.02)), center.add(new Vector3(width * 0.58, 0, 0.025))];
    const pageStarts = pages.map((page) => page.position.clone());
    const startedAt = performance.now();
    closedCoverParts.forEach((part) => { part.isVisible = false; });
    pages.forEach((page) => { page.isVisible = true; page.metadata = { ...page.metadata, bookOpened: true }; });
    activeOpenObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 420, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      pages.forEach((page, index) => { page.position = Vector3.Lerp(pageStarts[index], pageTargets[index], eased); });
      if (progress >= 1 && activeOpenObserver) {
        pages.forEach((page, index) => { page.position = pageTargets[index].clone(); });
        scene.onBeforeRenderObservable.remove(activeOpenObserver);
        activeOpenObserver = null;
      }
    });
  };

  const turnActivePage = (direction: "rtl" | "ltr") => {
    if (!activeBookParts || activeOpenObserver || activeTurnObserver) return false;
    const turningPage = activeBookParts.find((part) => part.metadata?.turningPage);
    const rightPage = activeBookParts.find((part) => part.metadata?.readingPage && part.name.includes("open-right"));
    const leftPage = activeBookParts.find((part) => part.metadata?.readingPage && part.name.includes("open-left"));
    if (!turningPage || !rightPage || !leftPage) return false;
    const start = (direction === "rtl" ? rightPage : leftPage).position.clone();
    const end = (direction === "rtl" ? leftPage : rightPage).position.clone();
    const startedAt = performance.now();
    turningPage.position = start.clone();
    turningPage.rotation.y = 0;
    turningPage.isVisible = true;
    activeTurnObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 620, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      turningPage.position = Vector3.Lerp(start, end, eased);
      turningPage.rotation.y = (direction === "rtl" ? -1 : 1) * Math.PI * eased;
      if (progress >= 1 && activeTurnObserver) {
        turningPage.position = end.clone();
        turningPage.rotation.y = 0;
        turningPage.isVisible = false;
        scene.onBeforeRenderObservable.remove(activeTurnObserver);
        activeTurnObserver = null;
        playBookSound("pull");
      }
    });
    return true;
  };

  const pullBookOut = (parts: any[]) => {
    if (!parts?.length || activeBookParts === parts) return;
    if (returnActiveBookToShelf()) playBookSound("return");
    const startPositions = parts.map((part) => part.position.clone());
    const bookWorldPosition = parts[0].getAbsolutePosition();
    const towardPlayerWorld = camera.globalPosition.subtract(bookWorldPosition);
    towardPlayerWorld.y = 0;
    if (towardPlayerWorld.lengthSquared() < 0.0001) towardPlayerWorld.z = 1;
    towardPlayerWorld.normalize();
    const pullDistance = 1.35;
    const verticalToFace = Math.max(-0.45, Math.min(0.55, camera.globalPosition.y - bookWorldPosition.y - 0.15));
    const pullVectorWorld = towardPlayerWorld.scale(pullDistance);
    pullVectorWorld.y = verticalToFace;
    const root = parts[0].parent;
    const rootInverse = root?.getWorldMatrix().clone().invert();
    const towardPlayerLocal = rootInverse ? Vector3.TransformNormal(pullVectorWorld, rootInverse) : pullVectorWorld;
    const targetPositions = startPositions.map((start) => start.add(towardPlayerLocal));
    const startedAt = performance.now();
    activeBookParts = parts;
    activeBookId = parts.find((part) => part.metadata?.book)?.metadata?.book?.id ?? null;
    emitBookState();
    playBookSound("pull");
    parts.forEach((part) => { part.metadata = { ...part.metadata, bookPulled: true }; });
    activePullObserver = scene.onBeforeRenderObservable.add(() => {
      const progress = Math.min((performance.now() - startedAt) / 360, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      parts.forEach((part, index) => {
        part.position = Vector3.Lerp(startPositions[index], targetPositions[index], eased);
      });
      if (progress >= 1 && activePullObserver) {
        // Keep the selected book pulled out after the animation; only explicit return or a new selection resets it.
        parts.forEach((part, index) => {
          part.position = targetPositions[index].clone();
          part.metadata = { ...part.metadata, bookPulled: true };
        });
        scene.onBeforeRenderObservable.remove(activePullObserver);
        activePullObserver = null;
        openBookSpread(parts);
      }
    });
  };

  const openBook = (mesh: any) => {
    let current = mesh;
    while (current) {
      if (current.metadata?.book && current.metadata?.pageSide && activeBookId === current.metadata.book.id) {
        return turnActivePage(current.metadata.pageSide === "right" ? "rtl" : "ltr");
      }
      if (current.metadata?.book) {
        if (activeBookId === current.metadata.book.id) {
          const returned = returnActiveBookToShelf();
          if (returned) playBookSound("return");
          return returned;
        }
        pullBookOut(current.metadata.bookParts ?? [current]);
        return true;
      }
      current = current.parent;
    }
    return false;
  };
  const isBookMesh = (mesh: any) => {
    let current = mesh;
    while (current) {
      if (current.metadata?.book) return true;
      current = current.parent;
    }
    return false;
  };
  const pickBookAt = (x: number, y: number) => {
    const hits = scene.multiPick(x, y, isBookMesh) ?? [];
    const firstBookHit = hits.find((hit) => hit.hit && hit.pickedMesh);
    if (firstBookHit?.pickedMesh) return firstBookHit.pickedMesh;
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const screenCandidates = scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book);
    let closest: any = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    screenCandidates.forEach((mesh) => {
      const screen = Vector3.Project(mesh.getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const distance = Math.hypot(screen.x - x, screen.y - y);
      if (distance < closestDistance && distance < 92) { closest = mesh; closestDistance = distance; }
    });
    return closest;
  };
  const inspectAt = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = engine.getRenderWidth() / Math.max(rect.width, 1);
    const scaleY = engine.getRenderHeight() / Math.max(rect.height, 1);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const activeSpread = activeBookParts?.some((part) => part.metadata?.bookOpened && part.metadata?.readingPage);
    if (activeSpread && activeBookParts?.[0]) {
      const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
      const projectedCenter = Vector3.Project(activeBookParts[0].getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const spreadRadius = Math.max(150, Number(activeBookParts[0].metadata?.openPageWidth ?? 0.5) * 420);
      if (Math.hypot(projectedCenter.x - x, projectedCenter.y - y) < spreadRadius) {
        return turnActivePage(x >= projectedCenter.x ? "rtl" : "ltr");
      }
    }
    const pickedBook = pickBookAt(x, y);
    if (pickedBook) return openBook(pickedBook);
    return false;
  };
  const onCanvasClick = (event: MouseEvent) => inspectAt(event.clientX, event.clientY);
  canvas.addEventListener("click", onCanvasClick);
  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      pressedKeys.add(key);
      event.preventDefault();
      return;
    }
    if (!["e", "E", "Enter", " "].includes(event.key)) return;
    event.preventDefault();
    const centerBook = pickBookAt(engine.getRenderWidth() / 2, engine.getRenderHeight() / 2);
    if (centerBook && openBook(centerBook)) return;
    openNearestBook();
  };
  const onKeyUp = (event: KeyboardEvent) => {
    pressedKeys.delete(event.key.toLowerCase());
  };
  const onWindowBlur = () => {
    pressedKeys.clear();
    touchMove.set(0, 0, 0);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onWindowBlur);

  const openNearestBook = () => {
    const candidates = scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book);
    if (!candidates.length) return false;
    const nearest = candidates.reduce((closest, candidate) => Vector3.DistanceSquared(candidate.getAbsolutePosition(), camera.position) < Vector3.DistanceSquared(closest.getAbsolutePosition(), camera.position) ? candidate : closest);
    return openBook(nearest);
  };
  const openBookById = (bookId: string) => {
    const target = scene.meshes.find((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book?.id === bookId);
    return openBook(target);
  };
  const openBookByMeshName = (meshName: string) => openBook(scene.getMeshByName(meshName));
  const returnActiveBook = () => {
    const returned = returnActiveBookToShelf();
    if (returned) playBookSound("return");
    return returned;
  };
  const hasActiveBook = () => Boolean(activeBookParts);
  const getBookScreenRects = (): BookScreenRect[] => {
    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    return scene.meshes.filter((mesh) => /^book-\d+-\d+-\d+$/.test(mesh.name) && mesh.metadata?.book).map((mesh) => {
      const projected = Vector3.Project(mesh.getAbsolutePosition(), Matrix.Identity(), scene.getTransformMatrix(), viewport);
      const distance = Vector3.Distance(mesh.getAbsolutePosition(), camera.position);
      const scale = Math.min(2.4, Math.max(0.7, 4.2 / Math.max(distance, 1)));
      return { meshName: mesh.name, bookId: mesh.metadata.book.id, title: mesh.metadata.book.title, x: projected.x / engine.getRenderWidth() * canvas.clientWidth, y: projected.y / engine.getRenderHeight() * canvas.clientHeight, width: 28 * scale, height: 58 * scale };
    }).filter((rect) => rect.x > -rect.width && rect.x < canvas.clientWidth + rect.width && rect.y > -rect.height && rect.y < canvas.clientHeight + rect.height);
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

  const dispose = () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onWindowBlur); canvas.removeEventListener("click", onCanvasClick); canvas.removeEventListener("mousemove", onMouseMove); canvas.removeEventListener("mouseleave", resetMouseReference); canvas.removeEventListener("touchstart", onTouchStart); canvas.removeEventListener("touchmove", onTouchMove); canvas.removeEventListener("touchend", onTouchEnd); canvas.removeEventListener("touchcancel", onTouchEnd); scene.onPointerObservable.clear(); scene.dispose(); };
  const setTouchMove = (x: number, y: number) => { touchMove.x = Math.max(-1, Math.min(1, x)); touchMove.z = Math.max(-1, Math.min(1, y)); };
  return { scene, dispose, openNearestBook, openBookById, openBookByMeshName, returnActiveBook, turnActivePage, hasActiveBook, getBookScreenRects, setTouchMove };
}
