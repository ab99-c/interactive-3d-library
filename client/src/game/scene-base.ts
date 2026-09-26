import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { UniversalCamera } from "@babylonjs/core/Cameras/universalCamera";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Culling/ray";
import { WorldStateStore } from "./engine/world-state";
import { parseCommand } from "./engine/command-parser";
import { createSpring, stepSpring, damp, type Spring } from "./engine/simulation";
import pageData from "./hayy-pages-data.json";
import { LIBRARY_CONFIG } from "./architecture-config";

export type PerformanceMode = "cinematic" | "light";
export type BookInfo = { id: string; title: string; section: string; callNumber: string };
type PhysicalBookState = "ON_SHELF" | "TAKING" | "HELD_RIGHT" | "OPENING" | "HELD_TWO_HANDS" | "OPEN" | "TURNING_PAGE" | "CLOSING" | "CLOSED" | "RELEASING" | "PLACED" | "RETURNING" | "RETURNED";
type BookVisual = { leftCover: Mesh; rightCover: Mesh; leftPages: Mesh; rightPages: Mesh; spine: Mesh; pageLeaves: Mesh[]; coverSpring: Spring; pageSpring: Spring; pageIndex: number; pages: string[]; width: number; height: number };
export let BOOK_COUNT = 0;
export type BookScreenRect = { meshName: string; bookId: string; title: string; x: number; y: number; width: number; height: number };
export type GameHandle = {
  scene: Scene;
  dispose: () => void;
  openNearestBook: () => boolean;
  openBookById: (bookId: string) => boolean;
  openBookByMeshName: (meshName: string) => boolean;
  takeNearestBook: () => boolean;
  releaseHeldBook: () => boolean;
  returnNearestBook: () => boolean;
  executeTextCommand: (raw: string) => boolean;
  returnActiveBook: () => boolean;
  turnActivePage: (direction: "rtl" | "ltr") => boolean;
  hasActiveBook: () => boolean;
  getBookScreenRects: () => BookScreenRect[];
  setTouchMove: (x: number, y: number) => void;
  setTouchLook: (x: number, y: number) => void;
  setPerformanceMode: (mode: PerformanceMode) => void;
  setAudioEnabled: (enabled: boolean) => void;
  getAudioEnabled: () => boolean;
};

type MaterialSet = { floor: StandardMaterial; wall: StandardMaterial; ceiling: StandardMaterial; uniform: StandardMaterial; skin: StandardMaterial; shoe: StandardMaterial };

const COLORS = {
  floor: new Color3(0.24, 0.15, 0.085),
  wall: new Color3(0.62, 0.50, 0.35),
  ceiling: new Color3(0.20, 0.12, 0.065),
  navy: new Color3(0.035, 0.08, 0.18),
  skin: new Color3(0.72, 0.45, 0.30),
  shoe: new Color3(0.025, 0.02, 0.018),
  ivory: new Color3(0.88, 0.82, 0.68),
  brass: new Color3(0.79, 0.58, 0.29),
};
const PLAYER_STORAGE_KEY = "quiet-study-hall:player-transform-v1";

function makeMaterial(scene: Scene, name: string, color: Color3) {
  const material = new StandardMaterial(name, scene);
  material.diffuseColor = color;
  material.ambientColor = color.scale(0.38);
  material.specularColor = new Color3(0.12, 0.09, 0.06);
  return material;
}

function makeCoverMaterial(scene: Scene, name: string, color: Color3, accent: string) {
  const material = makeMaterial(scene, name, color);
  material.specularColor = new Color3(0.28, 0.24, 0.20);
  const texture = new DynamicTexture(`${name}-art`, { width: 256, height: 384 }, scene, true);
  const context = texture.getContext();
  context.fillStyle = `#${accent}`;
  context.fillRect(0, 0, 256, 384);
  context.strokeStyle = "rgba(232,198,122,0.82)";
  context.lineWidth = 7;
  context.strokeRect(15, 15, 226, 354);
  context.strokeStyle = "rgba(232,198,122,0.32)";
  context.lineWidth = 2;
  context.strokeRect(29, 29, 198, 326);
  context.fillStyle = "rgba(236,220,180,0.95)";
  context.font = "bold 20px Georgia";
  (context as unknown as CanvasRenderingContext2D).textAlign = "center";
  context.fillText("QUIET STUDY", 128, 112);
  context.font = "bold 25px Georgia";
  context.fillText("LIBRARY", 128, 145);
  context.fillStyle = "rgba(120,190,255,0.9)";
  context.beginPath();
  context.arc(128, 242, 48, 0, Math.PI * 2);
  context.strokeStyle = "rgba(120,190,255,0.72)";
  context.lineWidth = 2;
  context.stroke();
  for (let index = 0; index < 10; index += 1) {
    const x = 82 + ((index * 37) % 92);
    const y = 205 + ((index * 29) % 74);
    context.fillStyle = "rgba(120,190,255,0.88)";
    context.fillRect(x, y, 4, 4);
  }
  texture.update();
  material.diffuseTexture = texture;
  material.diffuseColor = Color3.White();
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

function addReferenceBookcases(scene: Scene, worldState: WorldStateStore) {
  const wood = makeMaterial(scene, "reference-bookcase-walnut", new Color3(0.28, 0.105, 0.028));
  const bookColors = [
    new Color3(0.88, 0.87, 0.76), new Color3(0.62, 0.78, 0.32), new Color3(0.93, 0.29, 0.10),
    new Color3(0.86, 0.25, 0.48), new Color3(0.20, 0.46, 0.72), new Color3(0.76, 0.57, 0.20),
    new Color3(0.16, 0.52, 0.35), new Color3(0.12, 0.10, 0.16),
  ].map((color, index) => makeMaterial(scene, `reference-book-${index}`, color));
  const pageMaterial = makeMaterial(scene, "book-page-ivory", new Color3(0.92, 0.87, 0.72));
  const coverMaterial = makeMaterial(scene, "book-cover-highlight", new Color3(0.46, 0.22, 0.08));
  const coverArtMaterials = bookColors.map((material, index) => makeCoverMaterial(scene, `book-cover-art-${index}`, material.diffuseColor, ["152640", "203b58", "3b2635", "293b2d", "51331f", "1d2d48", "422d2a", "27313f"][index]));
  const catalog = [
    ["مقدمة ابن خلدون", "التاريخ", "HIS"], ["رسالة الغفران", "الأدب", "LIT"], ["كليلة ودمنة", "التراث", "HER"], ["حي بن يقظان", "الفلسفة", "PHI"],
    ["نهج البلاغة", "التراث", "HER"], ["الأغاني", "الأدب", "LIT"], ["جمهرة اللغة", "اللغة", "LAN"], ["البيان والتبيين", "الأدب", "LIT"],
    ["طوق الحمامة", "التراث", "HER"], ["العقد الفريد", "التاريخ", "HIS"], ["الحيوان", "اللغة", "LAN"], ["الشفا", "الفلسفة", "PHI"],
    ["الأمالي", "الأدب", "LIT"], ["سير أعلام النبلاء", "التاريخ", "HIS"], ["المعلقات", "الأدب", "LIT"], ["رحلة المعرفة", "الأرشيف", "ARC"],
  ] as const;
  let bookSerial = 0;
  const bookVisuals = new Map<string, BookVisual>();
  const makeBook = (name: string, position: Vector3, width: number, height: number, lean: number, material: StandardMaterial) => {
    const book = MeshBuilder.CreateBox(name, { width: 0.045, height, depth: 0.25 }, scene);
    book.position = position;
    book.rotation.z = lean;
    book.material = material;
    book.isPickable = true;
    book.checkCollisions = false;
    const [title, section, prefix] = catalog[bookSerial % catalog.length];
    book.metadata = { book: { id: `reference-book-${bookSerial}`, title, section, callNumber: `${prefix}-${String(101 + (bookSerial % 899)).padStart(3, "0")}` } satisfies BookInfo, bookRoot: true };
    const bookInfo = book.metadata.book as BookInfo;
    const leftCover = MeshBuilder.CreateBox(`${name}-left-cover`, { width: width * 0.5 + 0.025, height: height + 0.045, depth: 0.035 }, scene);
    const rightCover = MeshBuilder.CreateBox(`${name}-right-cover`, { width: width * 0.5 + 0.025, height: height + 0.045, depth: 0.035 }, scene);
    const leftPages = MeshBuilder.CreateBox(`${name}-left-pages`, { width: Math.max(0.08, width * 0.5 - 0.035), height: height - 0.035, depth: 0.19 }, scene);
    const rightPages = MeshBuilder.CreateBox(`${name}-right-pages`, { width: Math.max(0.08, width * 0.5 - 0.035), height: height - 0.035, depth: 0.19 }, scene);
    leftCover.parent = book; rightCover.parent = book; leftPages.parent = book; rightPages.parent = book;
    leftCover.position.set(-width * 0.25, 0, 0.15); rightCover.position.set(width * 0.25, 0, 0.15);
    leftPages.position.set(-width * 0.25, 0, 0); rightPages.position.set(width * 0.25, 0, 0);
    leftCover.material = coverArtMaterials[bookSerial % coverArtMaterials.length] ?? coverMaterial; rightCover.material = material; leftPages.material = pageMaterial; rightPages.material = pageMaterial;
    [leftCover, rightCover, leftPages, rightPages].forEach((part) => { part.metadata = { book: bookInfo, bookRoot: false }; });
    leftCover.isPickable = false; rightCover.isPickable = false; leftPages.isPickable = false; rightPages.isPickable = false;
    const pageLeaves = [0, 1, 2, 3].map((index) => {
      const leaf = MeshBuilder.CreateBox(`${name}-leaf-${index}`, { width: Math.max(0.08, width * 0.5 - 0.08), height: height - 0.08, depth: 0.012 }, scene);
      leaf.parent = book;
      leaf.position.set(index < 2 ? -width * 0.25 : width * 0.25, 0, 0.11 + (index % 2) * 0.006);
      leaf.material = pageMaterial; leaf.isPickable = false; leaf.setEnabled(false); return leaf;
    });
    const visual: BookVisual = { leftCover, rightCover, leftPages, rightPages, spine: book, pageLeaves, coverSpring: createSpring(0, 120, 20), pageSpring: createSpring(0, 210, 26), pageIndex: 0, pages: pageData.pages, width, height };
    book.metadata.bookVisual = visual;
    bookVisuals.set(bookInfo.id, visual);
    const saved = worldState.register({ id: bookInfo.id, type: "book", name: bookInfo.title, model: "procedural-book", transform: book, metadata: bookInfo, onShelf: true });
    if (saved.currentTransform.position.x !== saved.originalTransform.position.x || saved.currentTransform.position.z !== saved.originalTransform.position.z) {
      book.position.set(saved.currentTransform.position.x, saved.currentTransform.position.y, saved.currentTransform.position.z);
      book.rotation.set(saved.currentTransform.rotation.x, saved.currentTransform.rotation.y, saved.currentTransform.rotation.z);
      book.scaling.set(saved.currentTransform.scale.x, saved.currentTransform.scale.y, saved.currentTransform.scale.z);
    }
    bookSerial += 1;
    book.freezeWorldMatrix();
  };
  const world = (centerX: number, centerZ: number, rotation: number, x: number, z: number, y: number) => {
    const local = Vector3.TransformCoordinates(new Vector3(x, y, z), Matrix.RotationY(rotation));
    return new Vector3(centerX + local.x, local.y, centerZ + local.z);
  };
  const addCase = (centerX: number, centerZ: number, width: number, rotation: number, id: string) => {
    const collider = makeBox(scene, `bookcase-${id}-collision`, { width: width + 0.56, height: 6.45, depth: 0.82 }, world(centerX, centerZ, rotation, 0, 0, 3.2), wood, true);
    collider.isVisible = false;
    collider.rotation.y = rotation;
    collider.freezeWorldMatrix();
    makeBox(scene, `bookcase-${id}-left`, { width: 0.28, height: 6.45, depth: 0.48 }, world(centerX, centerZ, rotation, -width * 0.5, 0, 3.2), wood, false);
    makeBox(scene, `bookcase-${id}-right`, { width: 0.28, height: 6.45, depth: 0.48 }, world(centerX, centerZ, rotation, width * 0.5, 0, 3.2), wood, false);
    [0.78, 2.02, 3.26, 4.50, 5.74].forEach((y, row) => {
      const shelf = makeBox(scene, `bookcase-${id}-shelf-${row}`, { width, height: 0.14, depth: 0.62 }, world(centerX, centerZ, rotation, 0, 0, y), wood, false);
      shelf.rotation.y = rotation;
      let x = -width * 0.5 + 0.16;
      let index = row * 13 + id.length;
      while (x < width * 0.5 - 0.16) {
        const widthPattern = [0.22, 0.28, 0.34, 0.25, 0.38, 0.30][index % 6];
        const heightPattern = [0.68, 0.83, 0.94, 0.76, 0.88][(index + row) % 5];
        const lean = index % 11 === 3 ? 0.13 : index % 17 === 8 ? -0.11 : 0;
        const bookWidth = Math.min(widthPattern, width * 0.5 - 0.16 - x);
        if (bookWidth < 0.12) break;
        makeBook(`reference-book-${id}-${row}-${index}`, world(centerX, centerZ, rotation, x + bookWidth * 0.5, 0.33, y + 0.07 + heightPattern * 0.5), bookWidth, heightPattern, lean, bookColors[index % bookColors.length]);
        x += bookWidth + 0.025;
        index += 1;
      }
    });
  };
  addCase(-5.1, -12.72, 9.7, 0, "back-left");
  addCase(5.1, -12.72, 9.7, 0, "back-right");
  [-8.7, -2.9, 2.9, 8.7].forEach((z, index) => addCase(-10.55, z, 4.6, Math.PI / 2, `left-${index}`));
  [ -8.7, -2.9, 2.9, 8.7 ].forEach((z, index) => addCase(10.55, z, 4.6, -Math.PI / 2, `right-${index}`));
  [-5.6, 0, 5.6].forEach((z, index) => addCase(-5.0, z, 4.2, 0, `island-left-${index}`));
  [-5.6, 0, 5.6].forEach((z, index) => addCase(5.0, z, 4.2, 0, `island-right-${index}`));
  BOOK_COUNT = bookSerial;
  window.dispatchEvent(new CustomEvent("library:catalog-ready", { detail: { count: BOOK_COUNT } }));
  return bookVisuals;
}

function addUniversityShell(scene: Scene, materials: MaterialSet) {
  const { building, floors, entrance, reception, centralHall } = LIBRARY_CONFIG;
  const wallHeight = floors.second + building.floorHeight - floors.basement;
  const shellCenterY = floors.basement + wallHeight * 0.5;
  [floors.basement, floors.ground, floors.first, floors.second].forEach((level, index) => {
    makeBox(scene, `library-floor-${index}`, { width: building.width, height: building.floorThickness, depth: building.length }, new Vector3(0, level - building.floorThickness * 0.5, 0), materials.floor, true);
  });
  makeBox(scene, "university-north-wall", { width: building.width, height: wallHeight, depth: building.wallThickness }, new Vector3(0, shellCenterY, building.maxZ), materials.wall, true);
  makeBox(scene, "university-west-wall", { width: building.wallThickness, height: wallHeight, depth: building.length }, new Vector3(building.minX, shellCenterY, 0), materials.wall, true);
  makeBox(scene, "university-east-wall", { width: building.wallThickness, height: wallHeight, depth: building.length }, new Vector3(building.maxX, shellCenterY, 0), materials.wall, true);
  const sideWidth = (building.width - entrance.width) * 0.5;
  makeBox(scene, "university-south-west", { width: sideWidth, height: wallHeight, depth: building.wallThickness }, new Vector3(-(building.width + entrance.width) * 0.25, shellCenterY, building.minZ), materials.wall, true);
  makeBox(scene, "university-south-east", { width: sideWidth, height: wallHeight, depth: building.wallThickness }, new Vector3((building.width + entrance.width) * 0.25, shellCenterY, building.minZ), materials.wall, true);
  makeBox(scene, "entrance-left-door", { width: entrance.width * 0.48, height: 2.4, depth: 0.12 }, new Vector3(-entrance.width * 0.25, 1.2, building.minZ + 0.08), materials.ceiling, false);
  makeBox(scene, "entrance-right-door", { width: entrance.width * 0.48, height: 2.4, depth: 0.12 }, new Vector3(entrance.width * 0.25, 1.2, building.minZ + 0.08), materials.ceiling, false);
  makeBox(scene, "entrance-mat", { width: entrance.width, height: 0.02, depth: entrance.depth }, new Vector3(0, 0.02, building.minZ + entrance.depth * 0.5), materials.ceiling, false);
  makeBox(scene, "reception-desk", { width: reception.width, height: 1.05, depth: 0.8 }, new Vector3(0, 0.55, building.minZ + 8), materials.wall, true);
  makeBox(scene, "reception-sign", { width: reception.width * 0.72, height: 0.18, depth: 0.06 }, new Vector3(0, 1.35, building.minZ + 7.55), materials.ceiling, false);
  makeBox(scene, "central-hall-inlay", { width: centralHall.width, height: 0.025, depth: centralHall.length }, new Vector3(0, 0.03, -5), materials.ceiling, false);
  const columnMaterial = makeMaterial(scene, "library-column-walnut", new Color3(0.31, 0.13, 0.045));
  const glassMaterial = makeMaterial(scene, "library-window-glass", new Color3(0.18, 0.32, 0.38));
  glassMaterial.alpha = 0.42;
  [-18, -9, 0, 9, 18].forEach((x) => {
    makeBox(scene, `north-column-${x}`, { width: 0.42, height: wallHeight, depth: 0.42 }, new Vector3(x, shellCenterY, building.maxZ - 0.34), columnMaterial, true);
    makeBox(scene, `north-window-${x}`, { width: 3.8, height: 2.35, depth: 0.035 }, new Vector3(x, 6.1, building.maxZ - 0.18), glassMaterial, false);
  });
  [-14, 0, 14].forEach((z) => {
    makeBox(scene, `west-column-${z}`, { width: 0.42, height: wallHeight, depth: 0.42 }, new Vector3(building.minX + 0.34, shellCenterY, z), columnMaterial, true);
    makeBox(scene, `east-column-${z}`, { width: 0.42, height: wallHeight, depth: 0.42 }, new Vector3(building.maxX - 0.34, shellCenterY, z), columnMaterial, true);
  });
}

function addCoreFacilities(scene: Scene, materials: MaterialSet) {
  const { building, floors, reading, study, stairs, elevator } = LIBRARY_CONFIG;
  const tableMaterial = materials.wall;
  const seatMaterial = materials.uniform;
  const addTable = (name: string, x: number, z: number, y = 0) => {
    makeBox(scene, `${name}-top`, { width: 2.4, height: 0.12, depth: 1.0 }, new Vector3(x, y + 0.78, z), tableMaterial, true);
    makeBox(scene, `${name}-leg-a`, { width: 0.10, height: 0.76, depth: 0.10 }, new Vector3(x - 0.92, y + 0.38, z - 0.34), tableMaterial, true);
    makeBox(scene, `${name}-leg-b`, { width: 0.10, height: 0.76, depth: 0.10 }, new Vector3(x + 0.92, y + 0.38, z - 0.34), tableMaterial, true);
    [-0.78, 0.78].forEach((offset, index) => makeBox(scene, `${name}-chair-${index}`, { width: 0.42, height: 0.72, depth: 0.42 }, new Vector3(x + offset, y + 0.36, z + 0.85), seatMaterial, true));
  };
  [-4, 0, 4].forEach((x, index) => addTable(`reading-table-${index}`, x, 22));
  [-4, 0, 4].forEach((x, index) => makeBox(scene, `study-desk-${index}`, { width: study.deskWidth, height: 0.75, depth: study.deskDepth }, new Vector3(x, 0.4, 15), tableMaterial, true));
  const stairStepCount = 12;
  [-(building.width * 0.5 - 5), building.width * 0.5 - 5].forEach((x, side) => {
    for (let step = 0; step < stairStepCount; step += 1) {
      const y = step * (floors.first / stairStepCount);
      makeBox(scene, `stair-${side}-${step}`, { width: stairs.width, height: Math.max(0.16, y + 0.16), depth: 0.45 }, new Vector3(x, y * 0.5, 3 + step * 0.45), tableMaterial, true);
    }
    makeBox(scene, `stair-${side}-rail`, { width: 0.08, height: 1.1, depth: 5.8 }, new Vector3(x + (side ? 0.75 : -0.75), 1.0, 5.6), seatMaterial, true);
  });
  makeBox(scene, "elevator-shaft", { width: elevator.width + 0.5, height: 12.6, depth: elevator.depth + 0.5 }, new Vector3(18, 4.2, 0), tableMaterial, true);
  makeBox(scene, "elevator-door", { width: elevator.doorWidth, height: 2.1, depth: 0.10 }, new Vector3(18, 1.05, -1.15), seatMaterial, false);
  makeBox(scene, "reading-zone-marker", { width: reading.width, height: 0.02, depth: reading.length }, new Vector3(0, 0.02, 22), materials.ceiling, false);
  ["GENERAL", "REFERENCE", "PERIODICALS", "SPECIAL COLLECTIONS"].forEach((label, index) => {
    makeBox(scene, `section-sign-${label.toLowerCase().replaceAll(" ", "-")}`, { width: 2.2, height: 0.18, depth: 0.06 }, new Vector3(-9 + index * 6, 2.7, -11.7), materials.ceiling, false);
  });
  const signMaterial = makeMaterial(scene, "section-sign-ink", new Color3(0.035, 0.07, 0.12));
  const signs: Array<[string, number, number, number]> = [
    ["MAIN HALL", 0, 2.8, 7.5], ["READING AREA", -8, 2.8, 21.8], ["REFERENCE", 8, 2.8, 21.8],
  ];
  signs.forEach(([label, x, y, z], index) => {
    const sign = makeBox(scene, `library-sign-${index}-${label.toLowerCase().replaceAll(" ", "-")}`, { width: 2.8, height: 0.52, depth: 0.06 }, new Vector3(x, y, z), signMaterial, false);
    sign.isPickable = false;
  });
}

function createPlayer(scene: Scene, materials: MaterialSet) {
  const root = new Mesh("player-root", scene);
  root.position = new Vector3(0, 0, LIBRARY_CONFIG.entrance.southZ + 5.5);
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
  return { root, torso, head, leftArm, rightArm, parts: [torso, head, leftArm, rightArm, leftLeg, rightLeg, leftShoe, rightShoe] };
}

function createFirstPersonHands(scene: Scene, camera: UniversalCamera, materials: MaterialSet) {
  const makeHand = (name: string, position: Vector3) => {
    const hand = MeshBuilder.CreateBox(name, { width: 0.26, height: 0.18, depth: 0.24 }, scene);
    hand.parent = camera;
    hand.position.copyFrom(position);
    hand.material = materials.skin;
    hand.isPickable = false;
    hand.checkCollisions = false;
    const cuff = MeshBuilder.CreateBox(`${name}-cuff`, { width: 0.34, height: 0.20, depth: 0.26 }, scene);
    cuff.parent = hand;
    cuff.position.z = -0.17;
    cuff.material = materials.uniform;
    cuff.isPickable = false;
    [-0.09, -0.03, 0.03, 0.09].forEach((offset, index) => {
      const finger = MeshBuilder.CreateBox(`${name}-finger-${index}`, { width: 0.045, height: 0.10, depth: 0.14 }, scene);
      finger.parent = hand;
      finger.position.set(offset, -0.02, 0.13);
      finger.material = materials.skin;
      finger.isPickable = false;
    });
    return hand;
  };
  return {
    left: makeHand("first-person-left-hand", new Vector3(-0.42, -0.38, 0.82)),
    right: makeHand("first-person-right-hand", new Vector3(0.42, -0.38, 0.82)),
  };
}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  const worldState = new WorldStateStore();
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

  // University shell and entrance, then the existing reference-style bookcases.
  addUniversityShell(scene, materials);
  addCoreFacilities(scene, materials);
  const bookVisuals = addReferenceBookcases(scene, worldState);

  const ambient = new HemisphericLight("ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.86;
  ambient.diffuse = COLORS.ivory;
  ambient.groundColor = new Color3(0.12, 0.08, 0.05);
  const ceilingLight = new PointLight("ceiling-light", new Vector3(0, 5.4, 1), scene);
  ceilingLight.diffuse = COLORS.brass;
  ceilingLight.intensity = 3.8;
  ceilingLight.range = 22;
  [-14, 0, 14].forEach((x, index) => {
    const light = new PointLight(`reading-light-${index}`, new Vector3(x, 3.6, 20), scene);
    light.diffuse = new Color3(1.0, 0.72, 0.42);
    light.intensity = 1.2;
    light.range = 12;
  });
  [-12, 0, 12].forEach((x, index) => {
    const light = new PointLight(`hall-light-${index}`, new Vector3(x, 3.5, 0), scene);
    light.diffuse = new Color3(1.0, 0.84, 0.60);
    light.intensity = 0.85;
    light.range = 10;
  });

  const player = createPlayer(scene, materials);
  try {
    const savedPlayer = JSON.parse(window.localStorage.getItem(PLAYER_STORAGE_KEY) ?? "null") as { position?: { x: number; y: number; z: number }; rotationY?: number } | null;
    if (savedPlayer?.position && Number.isFinite(savedPlayer.position.x) && Number.isFinite(savedPlayer.position.z)) {
      player.root.position.set(savedPlayer.position.x, Math.max(0, savedPlayer.position.y), savedPlayer.position.z);
      const savedYaw = savedPlayer.rotationY;
      player.root.rotation.y = typeof savedYaw === "number" && Number.isFinite(savedYaw) ? savedYaw : 0;
    }
  } catch { /* use the configured spawn */ }
  const camera = new UniversalCamera("first-person-camera", player.root.position.add(new Vector3(0, 1.72, 0)), scene);
  camera.parent = player.root;
  camera.position.set(0, 1.72, 0);
  camera.rotation.set(-0.08, 0, 0);
  camera.minZ = 0.1;
  camera.maxZ = 100;
  camera.fov = 0.82;
  scene.activeCamera = camera;
  player.root.isVisible = false;
  const hands = createFirstPersonHands(scene, camera, materials);

  const pressed = new Set<string>();
  const touchMove = { x: 0, z: 0 };
  let yaw = player.root.rotation.y;
  let pitch = -0.08;
  let lastPointerX: number | null = null;
  let lastPointerY: number | null = null;
  let performanceMode: PerformanceMode = "cinematic";
  let audioEnabled = true;
  let velocityY = 0;
  let lastMoveEventAt = 0;
  let lastPlayerSaveAt = 0;
  let walkTime = 0;
  let activeBook: BookInfo | null = null;
  let heldBookId: string | null = null;
  let activePageIndex = 0;
  let handSpread = 1.18;
  const physicalBookStates = new Map<string, PhysicalBookState>();
  let physicalInteraction: { phase: "approach" | "reach" | "pull" | "open" | "close" | "return"; bookId: string; elapsed: number; start?: Vector3 } | null = null;

  const publishPage = (book: BookInfo, visual: BookVisual) => {
    const text = visual.pages[visual.pageIndex % visual.pages.length] ?? "هذه الصفحة هادئة مثل القاعة.";
    window.dispatchEvent(new CustomEvent("library:book-page", { detail: { bookId: book.id, pageIndex: visual.pageIndex, pageCount: visual.pages.length, text } }));
  };
  const setBookOpen = (book: BookInfo, opened: boolean) => {
    const visual = bookVisuals.get(book.id);
    if (!visual) return;
    if (opened) handSpread = 1.18;
    visual.coverSpring.target = opened ? 1.18 : 0;
    visual.pageSpring.target = 0;
    visual.pageLeaves.forEach((leaf, index) => leaf.setEnabled(opened && index === activePageIndex % visual.pageLeaves.length));
    if (opened) publishPage(book, visual);
  };

  const announceBook = (book: BookInfo) => {
    activeBook = book;
    activePageIndex = bookVisuals.get(book.id)?.pageIndex ?? 0;
    if (heldBookId === book.id) {
      const mesh = bookMeshes().find((candidate) => candidate.metadata?.book?.id === book.id);
      if (mesh) {
        mesh.unfreezeWorldMatrix();
        mesh.parent = camera;
        mesh.position.set(0, -0.08, 0.78);
        mesh.rotation.set(0, 0, 0);
        physicalBookStates.set(book.id, "OPENING");
        physicalInteraction = { phase: "open", bookId: book.id, elapsed: 0 };
      }
    }
    setBookOpen(book, true);
    window.dispatchEvent(new CustomEvent("library:book-state", { detail: { active: true } }));
    window.dispatchEvent(new CustomEvent("library:book-preview", { detail: book }));
    window.dispatchEvent(new CustomEvent("library:book-opened", { detail: { type: "book-opened", bookId: book.id, title: book.title } }));
    return true;
  };
  const bookMeshes = () => {
    const meshes = scene.meshes.filter((mesh) => Boolean(mesh.metadata?.book && mesh.metadata?.bookRoot));
    meshes.forEach((mesh) => {
      const book = mesh.metadata.book as BookInfo;
      if (!physicalBookStates.has(book.id)) physicalBookStates.set(book.id, "ON_SHELF");
    });
    return meshes;
  };
  const syncBookState = (mesh: AbstractMesh, book: BookInfo, patch: Record<string, unknown> = {}) => {
    worldState.updateTransform(book.id, { position: mesh.getAbsolutePosition(), rotation: mesh.rotation, scaling: mesh.scaling }, patch as never);
    window.dispatchEvent(new CustomEvent("library:book-physical-state", { detail: { bookId: book.id, state: physicalBookStates.get(book.id), ...patch } }));
  };
  const openBookByMeshName = (meshName: string) => {
    const mesh = scene.getMeshByName(meshName);
    const book = mesh?.metadata?.book as BookInfo | undefined;
    return book && heldBookId === book.id ? announceBook(book) : false;
  };
  const openNearestBook = () => {
    const nearest = heldBookId ? bookMeshes().find((candidate) => candidate.metadata?.book?.id === heldBookId) : undefined;
    const book = nearest?.metadata?.book as BookInfo | undefined;
    return book ? announceBook(book) : false;
  };
  const openBookById = (bookId: string) => {
    const mesh = bookMeshes().find((candidate) => candidate.metadata?.book?.id === bookId);
    const book = mesh?.metadata?.book as BookInfo | undefined;
    return book && heldBookId === book.id ? announceBook(book) : false;
  };
  const lookedAtBook = () => {
    const picked = scene.pick(scene.getEngine().getRenderWidth() * 0.5, scene.getEngine().getRenderHeight() * 0.5);
    const mesh = picked?.pickedMesh;
    if (!mesh?.metadata?.book) return undefined;
    return Vector3.Distance(mesh.getAbsolutePosition(), player.root.getAbsolutePosition()) <= 1.5 ? mesh : undefined;
  };
  const nearestBookMesh = () => bookMeshes().sort((a, b) => Vector3.DistanceSquared(a.getAbsolutePosition(), player.root.getAbsolutePosition()) - Vector3.DistanceSquared(b.getAbsolutePosition(), player.root.getAbsolutePosition()))[0];
  const resolveBookRoot = (mesh: AbstractMesh | null | undefined) => {
    const book = mesh?.metadata?.book as BookInfo | undefined;
    return book ? bookMeshes().find((candidate) => candidate.metadata?.book?.id === book.id) : undefined;
  };
  const beginTake = (candidate: AbstractMesh | undefined) => {
    if (heldBookId || physicalInteraction) return false;
    const book = candidate?.metadata?.book as BookInfo | undefined;
    if (!candidate || !book || Vector3.Distance(candidate.getAbsolutePosition(), player.root.getAbsolutePosition()) > 1.5 || !["ON_SHELF", "PLACED", "RETURNED"].includes(physicalBookStates.get(book.id) ?? "ON_SHELF")) {
      window.dispatchEvent(new CustomEvent("library:command-failed", { detail: { message: "الكتاب بعيد أو غير قابل للوصول." } }));
      return false;
    }
    physicalBookStates.set(book.id, "TAKING");
    physicalInteraction = { phase: "approach", bookId: book.id, elapsed: 0 };
    syncBookState(candidate, book, { state: "moving", isMoving: true, lastAction: "TAKE_APPROACH" });
    return true;
  };
  const takeNearestBook = () => beginTake(lookedAtBook());
  const releaseHeldBook = () => {
    if (!heldBookId) return false;
    const mesh = bookMeshes().find((candidate) => candidate.metadata?.book?.id === heldBookId);
    const book = mesh?.metadata?.book as BookInfo | undefined;
    if (!mesh || !book) return false;
    mesh.unfreezeWorldMatrix();
    mesh.parent = null;
    mesh.position.copyFrom(player.root.position.add(new Vector3(Math.sin(yaw) * 1.15, 1.05, Math.cos(yaw) * 1.15)));
    mesh.rotation.set(0, player.root.rotation.y, 0);
    mesh.checkCollisions = false;
    physicalBookStates.set(book.id, "PLACED");
    worldState.updateTransform(book.id, mesh, { state: "placed", isHeld: false, isPlaced: true, isOnShelf: false, holder: undefined, surface: "floor", lastAction: "RELEASE" });
    heldBookId = null;
    window.dispatchEvent(new CustomEvent("library:object-released", { detail: { objectId: book.id } }));
    return true;
  };
  const returnNearestBook = () => {
    const targetId = heldBookId;
    if (!targetId) return false;
    const mesh = bookMeshes().find((candidate) => candidate.metadata?.book?.id === targetId);
    const saved = worldState.get(targetId);
    if (!mesh || !saved) return false;
    const originalPosition = new Vector3(saved.originalTransform.position.x, saved.originalTransform.position.y, saved.originalTransform.position.z);
    if (Vector3.Distance(player.root.position, originalPosition) > 3.2) {
      window.dispatchEvent(new CustomEvent("library:command-failed", { detail: { message: "قرب الكتاب من مكانه الأصلي قبل ما ترجّعو للرف." } }));
      return false;
    }
    physicalBookStates.set(targetId, "RETURNING");
    physicalInteraction = { phase: "return", bookId: targetId, elapsed: 0, start: mesh.getAbsolutePosition().clone() };
    return true;
  };
  const executeTextCommand = (raw: string) => {
    const command = parseCommand(raw);
    if (!command) {
      window.dispatchEvent(new CustomEvent("library:command-failed", { detail: { message: "مافهمتش الأمر. جرّب: خذ الكتاب، أفلت الكتاب، أو رجّع الكتاب." } }));
      return false;
    }
    window.dispatchEvent(new CustomEvent("library:command-received", { detail: command }));
    let result = false;
    if (command.intent === "TAKE_OBJECT") result = takeNearestBook();
    if (command.intent === "PLACE_OBJECT") result = releaseHeldBook();
    if (command.intent === "RETURN_OBJECT") result = returnNearestBook();
    if (command.intent === "OPEN_OBJECT") result = openNearestBook();
    if (command.intent === "CLOSE_OBJECT") result = closeBook();
    if (!result) window.dispatchEvent(new CustomEvent("library:command-failed", { detail: { message: "الأمر غير ممكن حالياً: تحقق من المسافة وحالة الكتاب." } }));
    else window.dispatchEvent(new CustomEvent("library:command-executed", { detail: command }));
    return result;
  };
  const closeBook = () => {
    if (!activeBook) return false;
    const closingBook = activeBook;
    const visual = bookVisuals.get(closingBook.id);
    if (visual) visual.coverSpring.target = 0;
    if (heldBookId === closingBook.id) {
      physicalBookStates.set(closingBook.id, "CLOSING");
      physicalInteraction = { phase: "close", bookId: closingBook.id, elapsed: 0 };
    }
    setBookOpen(activeBook, false);
    activeBook = null;
    window.dispatchEvent(new CustomEvent("library:book-state", { detail: { active: false } }));
    window.dispatchEvent(new CustomEvent("library:book-preview", { detail: null }));
    return true;
  };
  const turnActivePage = (direction: "rtl" | "ltr") => {
    if (!activeBook) return false;
    const visual = bookVisuals.get(activeBook.id);
    if (!visual) return false;
    const nextIndex = direction === "rtl" ? Math.min(visual.pages.length - 1, visual.pageIndex + 1) : Math.max(0, visual.pageIndex - 1);
    if (nextIndex === visual.pageIndex) return false;
    visual.pageSpring.value = direction === "rtl" ? 0.98 : -0.98;
    visual.pageSpring.velocity = 0;
    visual.pageSpring.target = 0;
    visual.pageIndex = nextIndex;
    activePageIndex = nextIndex;
    visual.pageLeaves.forEach((leaf, index) => leaf.setEnabled(index === nextIndex % visual.pageLeaves.length));
    publishPage(activeBook, visual);
    window.dispatchEvent(new CustomEvent("library:page-turned", { detail: { type: "page-turned", bookId: activeBook.id, direction, pageIndex: nextIndex } }));
    return true;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if ((key === "arrowleft" || key === "arrowright") && activeBook && physicalBookStates.get(activeBook.id) === "OPEN") {
      handSpread = Math.max(0.28, Math.min(1.18, handSpread + (key === "arrowright" ? 0.12 : -0.12)));
      const visual = bookVisuals.get(activeBook.id);
      if (visual) visual.coverSpring.target = handSpread;
      if (handSpread <= 0.3) closeBook();
      return;
    }
    if (key === "e") { if (heldBookId) openNearestBook(); else takeNearestBook(); return; }
    if (key === "g") { takeNearestBook(); return; }
    if (key === "f") { releaseHeldBook(); return; }
    if (key === "r") { returnNearestBook(); return; }
    pressed.add(key);
  };
  const onKeyUp = (event: KeyboardEvent) => pressed.delete(event.key.toLowerCase());
  const onBlur = () => pressed.clear();
  const onPointerMove = (event: MouseEvent) => {
    if (lastPointerX === null || lastPointerY === null) {
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      return;
    }
    const deltaX = event.clientX - lastPointerX;
    if (activeBook && physicalBookStates.get(activeBook.id) === "OPEN") {
      handSpread = Math.max(0.28, Math.min(1.18, handSpread + deltaX * 0.006));
      const visual = bookVisuals.get(activeBook.id);
      if (visual) visual.coverSpring.target = handSpread;
      if (handSpread <= 0.3) closeBook();
    } else {
      yaw += deltaX * 0.003;
      pitch = Math.max(-0.38, Math.min(0.22, pitch + (event.clientY - lastPointerY) * 0.002));
    }
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  };
  const resetPointer = () => { lastPointerX = null; lastPointerY = null; };
  const interactAtClientPoint = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    const picked = scene.pick((clientX - rect.left) * (scene.getEngine().getRenderWidth() / rect.width), (clientY - rect.top) * (scene.getEngine().getRenderHeight() / rect.height));
    const mesh = resolveBookRoot(picked?.pickedMesh);
    const book = mesh?.metadata?.book as BookInfo | undefined;
    if (!book || !mesh) return;
    if (Vector3.Distance(mesh.getAbsolutePosition(), player.root.getAbsolutePosition()) > 1.5) {
      window.dispatchEvent(new CustomEvent("library:command-failed", { detail: { message: "قرب من الكتاب حتى 1.5 متر باش تتفاعل معاه." } }));
      return;
    }
    if (heldBookId === book.id) announceBook(book);
    else beginTake(mesh);
  };
  const onPointerDown = (event: PointerEvent) => {
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    if (event.button === 0 && !(activeBook && physicalBookStates.get(activeBook.id) === "OPEN")) interactAtClientPoint(event.clientX, event.clientY);
  };
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove as EventListener);
  canvas.addEventListener("pointerup", resetPointer);
  canvas.addEventListener("pointercancel", resetPointer);
  canvas.addEventListener("mouseleave", resetPointer);

  const setTouchLook = (x: number, y: number) => {
    if (activeBook && physicalBookStates.get(activeBook.id) === "OPEN") return;
    yaw += x * 0.003;
    pitch = Math.max(-0.38, Math.min(0.22, pitch + y * 0.002));
  };

  scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(engine.getDeltaTime() / 1000, 0.05);
    bookVisuals.forEach((visual) => {
      const cover = stepSpring(visual.coverSpring, dt);
      const page = stepSpring(visual.pageSpring, dt);
      visual.leftCover.rotation.y = damp(visual.leftCover.rotation.y, cover, 18, dt);
      visual.rightCover.rotation.y = damp(visual.rightCover.rotation.y, -cover, 18, dt);
      visual.leftPages.rotation.y = damp(visual.leftPages.rotation.y, cover * 0.92, 16, dt);
      visual.rightPages.rotation.y = damp(visual.rightPages.rotation.y, -cover * 0.92, 16, dt);
      visual.leftCover.position.x = damp(visual.leftCover.position.x, -visual.width * (0.25 + cover * 0.16), 14, dt);
      visual.rightCover.position.x = damp(visual.rightCover.position.x, visual.width * (0.25 + cover * 0.16), 14, dt);
      visual.leftPages.position.x = damp(visual.leftPages.position.x, -visual.width * (0.25 + cover * 0.13), 14, dt);
      visual.rightPages.position.x = damp(visual.rightPages.position.x, visual.width * (0.25 + cover * 0.13), 14, dt);
      visual.pageLeaves.forEach((leaf, index) => {
        const side = index < 2 ? -1 : 1;
        leaf.position.x = damp(leaf.position.x, side * visual.width * (0.25 + cover * 0.11), 16, dt);
        leaf.rotation.y = damp(leaf.rotation.y, index === activePageIndex % visual.pageLeaves.length ? page * side : 0, 22, dt);
      });
    });
    const interactionBusy = Boolean(physicalInteraction);
    if (physicalInteraction) {
      const active = physicalInteraction;
      const mesh = bookMeshes().find((candidate) => candidate.metadata?.book?.id === active.bookId);
      const book = mesh?.metadata?.book as BookInfo | undefined;
      if (!mesh || !book) physicalInteraction = null;
      else {
        active.elapsed += dt;
        const toBook = mesh.position.subtract(player.root.position);
        toBook.y = 0;
        if (active.phase === "approach") {
          const distance = toBook.length();
          if (distance > 1.9) {
            toBook.normalize();
            player.root.moveWithCollisions(toBook.scale(Math.min(2.0 * dt, distance - 1.75)));
          }
          player.root.rotation.y = damp(player.root.rotation.y, Math.atan2(toBook.x, toBook.z), 10, dt);
          player.torso.rotation.z = damp(player.torso.rotation.z, Math.max(-0.12, Math.min(0.12, toBook.x * -0.035)), 8, dt);
          if (distance <= 2.0 || active.elapsed > 2.5) { active.phase = "reach"; active.elapsed = 0; }
        } else if (active.phase === "reach") {
          player.rightArm.rotation.z = damp(player.rightArm.rotation.z, -0.72, 12, dt);
          player.rightArm.rotation.x = damp(player.rightArm.rotation.x, -0.22, 12, dt);
          hands.right.position.x = damp(hands.right.position.x, 0.34, 12, dt);
          hands.right.position.y = damp(hands.right.position.y, -0.28, 12, dt);
          hands.right.position.z = damp(hands.right.position.z, 0.72, 12, dt);
          if (active.elapsed > 0.42) { active.phase = "pull"; active.elapsed = 0; active.start = mesh.position.clone(); mesh.unfreezeWorldMatrix(); mesh.checkCollisions = false; }
        } else if (active.phase === "pull") {
          const progress = Math.min(1, active.elapsed / 0.48);
          const handTarget = camera.position.add(new Vector3(0.42, -0.38, 0.78));
          const shelfExit = (active.start ?? mesh.position).add(new Vector3(0, 0, 0.55));
          mesh.position.copyFrom(Vector3.Lerp(active.start ?? mesh.position, shelfExit, Math.min(1, progress * 2)));
          if (progress > 0.5) mesh.position.copyFrom(Vector3.Lerp(shelfExit, handTarget, (progress - 0.5) * 2));
          mesh.rotation.y = damp(mesh.rotation.y, player.root.rotation.y, 12, dt);
          if (progress >= 1) {
            mesh.parent = hands.right;
            mesh.position.set(0, 0, 0.18);
            mesh.rotation.set(0, 0, 0);
            heldBookId = book.id;
            physicalBookStates.set(book.id, "HELD_RIGHT");
            syncBookState(mesh, book, { state: "held", isHeld: true, isMoving: false, isOnShelf: false, holder: "player", holdHand: "right", lastAction: "TAKE" });
            window.dispatchEvent(new CustomEvent("library:object-grabbed", { detail: { objectId: book.id, title: book.title, holdHand: "right" } }));
            physicalInteraction = null;
          }
        } else if (active.phase === "open") {
          hands.left.position.x = damp(hands.left.position.x, -0.36, 10, dt);
          hands.left.position.y = damp(hands.left.position.y, -0.22, 10, dt);
          hands.left.position.z = damp(hands.left.position.z, 0.72, 10, dt);
          hands.right.position.x = damp(hands.right.position.x, 0.36, 10, dt);
          hands.right.position.y = damp(hands.right.position.y, -0.22, 10, dt);
          hands.right.position.z = damp(hands.right.position.z, 0.72, 10, dt);
          mesh.parent = camera;
          mesh.position.x = damp(mesh.position.x, 0, 12, dt);
          mesh.position.y = damp(mesh.position.y, -0.12, 12, dt);
          mesh.position.z = damp(mesh.position.z, 0.76, 12, dt);
          if (active.elapsed > 0.62) {
            physicalBookStates.set(book.id, "OPEN");
            syncBookState(mesh, book, { state: "open", isHeld: true, isOpen: true, holder: "player", holdMode: "TWO_HANDS", leftHandHolding: true, rightHandHolding: true, lastAction: "OPEN" });
            physicalInteraction = null;
          }
        } else if (active.phase === "close") {
          hands.left.position.x = damp(hands.left.position.x, -0.42, 10, dt);
          hands.left.position.y = damp(hands.left.position.y, -0.38, 10, dt);
          hands.right.position.x = damp(hands.right.position.x, 0.42, 10, dt);
          hands.right.position.y = damp(hands.right.position.y, -0.38, 10, dt);
          if (active.elapsed > 0.7) {
            mesh.parent = hands.right;
            mesh.position.set(0, 0, 0.18);
            mesh.rotation.set(0, 0, 0);
            physicalBookStates.set(book.id, "HELD_RIGHT");
            syncBookState(mesh, book, { state: "held", isHeld: true, isOpen: false, holdMode: "RIGHT_HAND", leftHandHolding: false, rightHandHolding: true, lastAction: "CLOSE" });
            physicalInteraction = null;
          }
        } else if (active.phase === "return") {
          const saved = worldState.get(book.id);
          if (!saved) { physicalInteraction = null; }
          else {
            const progress = Math.min(1, active.elapsed / 0.7);
            const originalPosition = new Vector3(saved.originalTransform.position.x, saved.originalTransform.position.y, saved.originalTransform.position.z);
            mesh.parent = null;
            mesh.position.copyFrom(Vector3.Lerp(active.start ?? mesh.getAbsolutePosition(), originalPosition, progress));
            mesh.rotation.y = damp(mesh.rotation.y, saved.originalTransform.rotation.y, 10, dt);
            if (progress >= 1) {
              mesh.position.copyFrom(originalPosition);
              mesh.rotation.set(saved.originalTransform.rotation.x, saved.originalTransform.rotation.y, saved.originalTransform.rotation.z);
              mesh.checkCollisions = false;
              physicalBookStates.set(book.id, "RETURNED");
              worldState.resetObject(book.id);
              heldBookId = null;
              physicalInteraction = null;
              window.dispatchEvent(new CustomEvent("library:object-returned", { detail: { objectId: book.id } }));
            }
          }
        }
      }
    }
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new Vector3(forward.z, 0, -forward.x);
    const input = new Vector3(0, 0, 0);
    const pageMode = Boolean(activeBook && physicalBookStates.get(activeBook.id) === "OPEN");
    if (pressed.has("w") || (!pageMode && pressed.has("arrowup"))) input.addInPlace(forward);
    if (pressed.has("s") || (!pageMode && pressed.has("arrowdown"))) input.subtractInPlace(forward);
    if (pressed.has("d") || (!pageMode && pressed.has("arrowright"))) input.addInPlace(right);
    if (pressed.has("a") || (!pageMode && pressed.has("arrowleft"))) input.subtractInPlace(right);
    input.x += touchMove.x;
    input.z += touchMove.z;
    if (!interactionBusy && input.lengthSquared() > 0.001) {
      input.normalize();
      const speed = pressed.has("shift") ? 4.2 : 2.35;
      player.root.moveWithCollisions(input.scale(speed * dt));
      yaw = Math.atan2(input.x, input.z);
      player.root.rotation.y = yaw;
      walkTime += dt * (pressed.has("shift") ? 11 : 8);
      const now = performance.now();
      if (now - lastMoveEventAt > 700) {
        lastMoveEventAt = now;
        window.dispatchEvent(new CustomEvent("library:walked", { detail: { type: "walked" } }));
      }
    }
    velocityY += -9.8 * dt;
    player.root.moveWithCollisions(new Vector3(0, velocityY * dt, 0));
    if (player.root.position.y <= 0) { player.root.position.y = 0; velocityY = 0; }
    const minX = LIBRARY_CONFIG.building.minX + 0.6; const maxX = LIBRARY_CONFIG.building.maxX - 0.6;
    const minZ = LIBRARY_CONFIG.building.minZ + 0.6; const maxZ = LIBRARY_CONFIG.building.maxZ - 0.6;
    player.root.position.x = Math.max(minX, Math.min(maxX, player.root.position.x));
    player.root.position.z = Math.max(minZ, Math.min(maxZ, player.root.position.z));
    player.root.rotation.y = yaw;
    const walking = input.lengthSquared() > 0.001 && !interactionBusy;
    const bob = walking ? Math.sin(walkTime) * 0.012 : 0;
    camera.position.y = damp(camera.position.y, 1.72 + bob, 9, dt);
    camera.rotation.x = pitch;
    camera.rotation.y = 0;
    const now = performance.now();
    if (now - lastPlayerSaveAt > 900) {
      lastPlayerSaveAt = now;
      try { window.localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ position: player.root.position, rotationY: player.root.rotation.y })); } catch { /* session-only fallback */ }
      window.dispatchEvent(new CustomEvent("library:player-moved", { detail: { x: player.root.position.x, z: player.root.position.z } }));
    }
  });

  const dispose = () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    canvas.removeEventListener("mousemove", onPointerMove);
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove as EventListener);
    canvas.removeEventListener("pointerup", resetPointer);
    canvas.removeEventListener("pointercancel", resetPointer);
    canvas.removeEventListener("mouseleave", resetPointer);
    camera.detachControl();
    scene.dispose();
  };
  return {
    scene,
    dispose,
    openNearestBook,
    openBookById,
    openBookByMeshName,
    takeNearestBook,
    releaseHeldBook,
    returnNearestBook,
    executeTextCommand,
    returnActiveBook: closeBook,
    turnActivePage,
    hasActiveBook: () => Boolean(activeBook),
    getBookScreenRects: () => [],
    setTouchMove: (x, z) => { touchMove.x = Math.max(-1, Math.min(1, x)); touchMove.z = Math.max(-1, Math.min(1, z)); },
    setTouchLook,
    setPerformanceMode: (mode) => { performanceMode = mode; scene.getLightByName("ceiling-light")!.intensity = mode === "light" ? 2.8 : 3.8; },
    setAudioEnabled: (enabled) => { audioEnabled = enabled; },
    getAudioEnabled: () => audioEnabled,
  };
}
