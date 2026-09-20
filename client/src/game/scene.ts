import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { createGameScene as createBaseGameScene } from "./scene-base";
import type { GameHandle, PerformanceMode, BookInfo, BookScreenRect } from "./scene-base";

export type { GameHandle, PerformanceMode, BookInfo, BookScreenRect } from "./scene-base";
export { BOOK_CATALOG } from "./scene-base";

const shelfRoot = (scene: Scene) => scene.meshes.filter((mesh) => mesh.name === "shelf-root") as Mesh[];

function material(scene: Scene, name: string, color: Color3, specular = new Color3(0.1, 0.07, 0.04), emissive = color.scale(0.035)) {
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = specular;
  mat.ambientColor = color.scale(0.38);
  mat.emissiveColor = emissive;
  return mat;
}

function addAndalusianArch(scene: Scene, z: number, width = 8.8) {
  const wood = material(scene, "grand-library-arch-wood", new Color3(0.26, 0.12, 0.05));
  const creamStone = material(scene, "arch-cream-stone", new Color3(0.85, 0.79, 0.68));
  const redTerracotta = material(scene, "arch-red-terracotta", new Color3(0.55, 0.16, 0.11));
  const brass = material(scene, "grand-library-arch-brass", new Color3(0.78, 0.58, 0.28));

  const pillarHeight = 5.1;
  const pillarWidth = 0.46;
  const pillarDepth = 0.5;
  const sideX = width * 0.5 - pillarWidth * 0.5;

  // Left and Right Carved Pillars
  const left = MeshBuilder.CreateBox(`library-arch-left-${z}`, { width: pillarWidth, height: pillarHeight, depth: pillarDepth }, scene);
  left.position = new Vector3(-sideX, pillarHeight * 0.5, z);
  left.material = wood;
  left.isPickable = false;
  left.freezeWorldMatrix();

  const right = MeshBuilder.CreateBox(`library-arch-right-${z}`, { width: pillarWidth, height: pillarHeight, depth: pillarDepth }, scene);
  right.position = new Vector3(sideX, pillarHeight * 0.5, z);
  right.material = wood;
  right.isPickable = false;
  right.freezeWorldMatrix();

  // Carved Brass Capitals on top of pillars
  [-sideX, sideX].forEach((x, idx) => {
    const cap = MeshBuilder.CreateBox(`library-arch-cap-${z}-${idx}`, { width: 0.60, height: 0.20, depth: 0.62 }, scene);
    cap.position = new Vector3(x, pillarHeight, z);
    cap.material = brass;
    cap.isPickable = false;
    cap.freezeWorldMatrix();
  });

  // Spanning Architrave Beam
  const beam = MeshBuilder.CreateBox(`library-arch-beam-${z}`, { width: width + 0.3, height: 0.36, depth: pillarDepth }, scene);
  beam.position = new Vector3(0, pillarHeight + 0.18, z);
  beam.material = wood;
  beam.isPickable = false;
  beam.freezeWorldMatrix();

  // Horseshoe Arch Curve
  const arch = MeshBuilder.CreateTorus(`library-arch-curve-${z}`, { diameter: width * 0.82, thickness: 0.26, tessellation: 32 }, scene);
  arch.rotation.x = Math.PI / 2;
  arch.position = new Vector3(0, pillarHeight - 0.05, z);
  arch.material = wood;
  arch.isPickable = false;
  arch.freezeWorldMatrix();

  // Alternating Bicolor Voussoir blocks along the horseshoe arch
  const voussoirCount = 13;
  for (let i = 0; i < voussoirCount; i += 1) {
    const theta = (i / (voussoirCount - 1)) * Math.PI;
    const r = width * 0.41;
    const vx = Math.cos(theta) * r;
    const vy = pillarHeight - 0.05 + Math.sin(theta) * (r * 0.85);

    const block = MeshBuilder.CreateBox(`voussoir-${z}-${i}`, { width: 0.30, height: 0.22, depth: 0.52 }, scene);
    block.position = new Vector3(vx, vy, z);
    block.rotation.z = -theta + Math.PI / 2;
    block.material = i % 2 === 0 ? redTerracotta : creamStone;
    block.isPickable = false;
    block.freezeWorldMatrix();
  }

  // Central Brass Keystone Medallion
  const keystone = MeshBuilder.CreateCylinder(`keystone-${z}`, { height: 0.54, diameter: 0.32, tessellation: 16 }, scene);
  keystone.position = new Vector3(0, pillarHeight + width * 0.34, z);
  keystone.rotation.x = Math.PI / 2;
  keystone.material = brass;
  keystone.isPickable = false;
  keystone.freezeWorldMatrix();
}

function addCeilingBeams(scene: Scene) {
  const wood = material(scene, "grand-library-ceiling", new Color3(0.19, 0.085, 0.035));
  [-11, -7, -3, 1, 5, 9].forEach((z, index) => {
    const beam = MeshBuilder.CreateBox(`library-ceiling-beam-${index}`, { width: 23.2, height: 0.30, depth: 0.40 }, scene);
    beam.position = new Vector3(0, 6.72, z);
    beam.material = wood;
    beam.isPickable = false;
    beam.freezeWorldMatrix();
  });
}

function addMoroccanCarpet(scene: Scene) {
  const carpet = MeshBuilder.CreateGround("moroccan-grand-carpet", { width: 3.6, height: 21, subdivisions: 2 }, scene);
  carpet.position = new Vector3(0, 0.015, -0.5);
  carpet.isPickable = false;
  carpet.freezeWorldMatrix();

  const mat = new StandardMaterial("moroccan-carpet-mat", scene);
  const tex = new DynamicTexture("moroccan-carpet-tex", { width: 256, height: 1024 }, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;

  // Background deep Moroccan ruby
  ctx.fillStyle = "#691419";
  ctx.fillRect(0, 0, 256, 1024);

  // Outer gold borders
  ctx.strokeStyle = "#c89439";
  ctx.lineWidth = 7;
  ctx.strokeRect(9, 9, 238, 1006);

  ctx.strokeStyle = "#1a2744";
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, 220, 988);

  ctx.strokeStyle = "#ddb35c";
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 208, 976);

  // Central geometric medallions repeat along carpet
  for (let y = 70; y < 975; y += 110) {
    ctx.save();
    ctx.translate(128, y);

    // Outer diamond
    ctx.fillStyle = "#1c2b48";
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(60, 0);
    ctx.lineTo(0, 42);
    ctx.lineTo(-60, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#e8bd63";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Inner gold star diamond
    ctx.fillStyle = "#8a1b22";
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(38, 0);
    ctx.lineTo(0, 28);
    ctx.lineTo(-38, 0);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#f3d182";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center rosette
    ctx.fillStyle = "#cca044";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Fringes on top and bottom
  ctx.fillStyle = "#efe3cb";
  ctx.fillRect(9, 0, 238, 9);
  ctx.fillRect(9, 1015, 238, 9);

  tex.update();
  mat.diffuseTexture = tex;
  mat.specularColor = new Color3(0.04, 0.03, 0.02);
  carpet.material = mat;
}

function addChandelier(scene: Scene, z: number) {
  const brass = material(scene, "grand-chandelier-brass", new Color3(0.78, 0.58, 0.28), new Color3(0.5, 0.4, 0.2));
  const glass = material(scene, "grand-chandelier-glass", new Color3(0.95, 0.78, 0.42));
  glass.emissiveColor = new Color3(0.65, 0.48, 0.18);

  const root = new TransformNode(`chandelier-${z}`, scene);
  root.position = new Vector3(0, 4.8, z);

  // Vertical suspension rod from high ceiling
  const rod = MeshBuilder.CreateCylinder(`chandelier-rod-${z}`, { height: 2.1, diameter: 0.05, tessellation: 8 }, scene);
  rod.position = new Vector3(0, 1.05, 0);
  rod.material = brass;
  rod.isPickable = false;
  rod.freezeWorldMatrix();
  rod.parent = root;

  // Main brass circular ring wheel
  const mainRing = MeshBuilder.CreateTorus(`chandelier-main-ring-${z}`, { diameter: 1.9, thickness: 0.08, tessellation: 32 }, scene);
  mainRing.position = new Vector3(0, 0, 0);
  mainRing.material = brass;
  mainRing.isPickable = false;
  mainRing.freezeWorldMatrix();
  mainRing.parent = root;

  // Upper tiered brass ring
  const upperRing = MeshBuilder.CreateTorus(`chandelier-upper-ring-${z}`, { diameter: 0.95, thickness: 0.06, tessellation: 24 }, scene);
  upperRing.position = new Vector3(0, 0.65, 0);
  upperRing.material = brass;
  upperRing.isPickable = false;
  upperRing.freezeWorldMatrix();
  upperRing.parent = root;

  // Diagonal support spokes
  for (let i = 0; i < 4; i += 1) {
    const angle = (i * Math.PI) / 2;
    const spoke = MeshBuilder.CreateCylinder(`chandelier-spoke-${z}-${i}`, { height: 0.85, diameter: 0.03, tessellation: 8 }, scene);
    spoke.position = new Vector3(Math.cos(angle) * 0.7, 0.32, Math.sin(angle) * 0.7);
    spoke.rotation.z = Math.cos(angle) * 0.45;
    spoke.rotation.x = -Math.sin(angle) * 0.45;
    spoke.material = brass;
    spoke.isPickable = false;
    spoke.freezeWorldMatrix();
    spoke.parent = root;
  }

  // 8 Lanterns around the main ring
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    const lx = Math.cos(angle) * 0.95;
    const lz = Math.sin(angle) * 0.95;

    const lanternCup = MeshBuilder.CreateCylinder(`lantern-cup-${z}-${i}`, { height: 0.08, diameter: 0.18, tessellation: 12 }, scene);
    lanternCup.position = new Vector3(lx, -0.04, lz);
    lanternCup.material = brass;
    lanternCup.isPickable = false;
    lanternCup.freezeWorldMatrix();
    lanternCup.parent = root;

    const lanternGlass = MeshBuilder.CreateCylinder(`lantern-glass-${z}-${i}`, { height: 0.28, diameter: 0.14, tessellation: 12 }, scene);
    lanternGlass.position = new Vector3(lx, 0.12, lz);
    lanternGlass.material = glass;
    lanternGlass.isPickable = false;
    lanternGlass.freezeWorldMatrix();
    lanternGlass.parent = root;

    const lanternCap = MeshBuilder.CreateCylinder(`lantern-cap-${z}-${i}`, { height: 0.1, diameterTop: 0.02, diameterBottom: 0.18, tessellation: 12 }, scene);
    lanternCap.position = new Vector3(lx, 0.28, lz);
    lanternCap.material = brass;
    lanternCap.isPickable = false;
    lanternCap.freezeWorldMatrix();
    lanternCap.parent = root;
  }

  // Warm atmospheric point light
  const light = new PointLight(`chandelier-light-${z}`, new Vector3(0, 4.6, z), scene);
  light.diffuse = new Color3(1.0, 0.83, 0.54);
  light.specular = new Color3(0.5, 0.38, 0.16);
  light.intensity = 2.6;
  light.range = 17;
}

function addStudyStation(scene: Scene, z: number, hasAstrolabe: boolean) {
  const walnut = material(scene, "study-walnut", new Color3(0.22, 0.11, 0.05), new Color3(0.2, 0.14, 0.08));
  const brass = material(scene, "study-brass", new Color3(0.78, 0.58, 0.28), new Color3(0.4, 0.3, 0.1));
  const greenGlass = material(scene, "banker-shade", new Color3(0.06, 0.40, 0.18), new Color3(0.6, 0.7, 0.5));
  greenGlass.emissiveColor = new Color3(0.04, 0.22, 0.10);
  const parchment = material(scene, "study-parchment", new Color3(0.92, 0.84, 0.68));
  const ceramicBlue = material(scene, "ceramic-ink", new Color3(0.12, 0.24, 0.48), new Color3(0.3, 0.3, 0.4));
  const leatherRed = material(scene, "study-book-red", new Color3(0.38, 0.08, 0.06));

  const root = new TransformNode(`study-station-${z}`, scene);
  root.position = new Vector3(0, 0, z);

  // Desk Top
  const deskTop = MeshBuilder.CreateBox(`desk-top-${z}`, { width: 3.2, height: 0.14, depth: 1.5 }, scene);
  deskTop.position = new Vector3(0, 1.05, 0);
  deskTop.material = walnut;
  deskTop.isPickable = false;
  deskTop.parent = root;

  // Turned Legs with Brass Ferrules
  [-1.4, 1.4].forEach((lx) => {
    [-0.6, 0.6].forEach((lz) => {
      const leg = MeshBuilder.CreateCylinder(`desk-leg-${z}-${lx}-${lz}`, { height: 0.98, diameter: 0.12, tessellation: 12 }, scene);
      leg.position = new Vector3(lx, 0.49, lz);
      leg.material = walnut;
      leg.isPickable = false;
      leg.parent = root;

      const ferrule = MeshBuilder.CreateCylinder(`desk-ferrule-${z}-${lx}-${lz}`, { height: 0.08, diameter: 0.13, tessellation: 12 }, scene);
      ferrule.position = new Vector3(lx, 0.04, lz);
      ferrule.material = brass;
      ferrule.isPickable = false;
      ferrule.parent = root;
    });
  });

  // Scholar Chairs on north and south sides
  [-1.05, 1.05].forEach((cz, cIndex) => {
    const chair = new TransformNode(`chair-${z}-${cIndex}`, scene);
    chair.position = new Vector3(0, 0, cz);
    chair.rotation.y = cIndex === 0 ? 0 : Math.PI;
    chair.parent = root;

    const seat = MeshBuilder.CreateBox(`chair-seat-${z}-${cIndex}`, { width: 0.72, height: 0.08, depth: 0.68 }, scene);
    seat.position = new Vector3(0, 0.62, 0);
    seat.material = walnut;
    seat.isPickable = false;
    seat.parent = chair;

    const cushion = MeshBuilder.CreateBox(`chair-cushion-${z}-${cIndex}`, { width: 0.66, height: 0.05, depth: 0.62 }, scene);
    cushion.position = new Vector3(0, 0.67, 0);
    cushion.material = material(scene, "velvet-olive", new Color3(0.20, 0.28, 0.16));
    cushion.isPickable = false;
    cushion.parent = chair;

    const backrest = MeshBuilder.CreateBox(`chair-back-${z}-${cIndex}`, { width: 0.70, height: 0.72, depth: 0.06 }, scene);
    backrest.position = new Vector3(0, 1.05, -0.32);
    backrest.material = walnut;
    backrest.isPickable = false;
    backrest.parent = chair;

    [-0.3, 0.3].forEach((cx) => {
      [-0.28, 0.28].forEach((czLeg) => {
        const chairLeg = MeshBuilder.CreateCylinder(`chair-leg-${z}-${cIndex}-${cx}-${czLeg}`, { height: 0.58, diameter: 0.06, tessellation: 8 }, scene);
        chairLeg.position = new Vector3(cx, 0.29, czLeg);
        chairLeg.material = walnut;
        chairLeg.isPickable = false;
        chairLeg.parent = chair;
      });
    });
  });

  // Banker's Reading Lamp
  const lampBase = MeshBuilder.CreateCylinder(`lamp-base-${z}`, { height: 0.04, diameter: 0.22, tessellation: 16 }, scene);
  lampBase.position = new Vector3(-0.9, 1.14, -0.2);
  lampBase.material = brass;
  lampBase.isPickable = false;
  lampBase.parent = root;

  const lampStem = MeshBuilder.CreateCylinder(`lamp-stem-${z}`, { height: 0.36, diameter: 0.03, tessellation: 8 }, scene);
  lampStem.position = new Vector3(-0.9, 1.32, -0.2);
  lampStem.material = brass;
  lampStem.isPickable = false;
  lampStem.parent = root;

  const lampShade = MeshBuilder.CreateCylinder(`lamp-shade-${z}`, { height: 0.22, diameter: 0.14, tessellation: 16 }, scene);
  lampShade.rotation.z = Math.PI / 2;
  lampShade.position = new Vector3(-0.9, 1.48, -0.16);
  lampShade.material = greenGlass;
  lampShade.isPickable = false;
  lampShade.parent = root;

  const lampLight = new PointLight(`desk-lamp-light-${z}`, new Vector3(0, 1.45, z - 0.16), scene);
  lampLight.diffuse = new Color3(1.0, 0.90, 0.70);
  lampLight.intensity = 1.1;
  lampLight.range = 3.5;

  // Open Manuscript Parchment Spread
  const openManuscriptLeft = MeshBuilder.CreatePlane(`manuscript-left-${z}`, { width: 0.44, height: 0.58 }, scene);
  openManuscriptLeft.position = new Vector3(-0.21, 1.13, 0);
  openManuscriptLeft.rotation.x = Math.PI / 2;
  openManuscriptLeft.rotation.y = 0.03;
  openManuscriptLeft.material = parchment;
  openManuscriptLeft.isPickable = false;
  openManuscriptLeft.parent = root;

  const openManuscriptRight = MeshBuilder.CreatePlane(`manuscript-right-${z}`, { width: 0.44, height: 0.58 }, scene);
  openManuscriptRight.position = new Vector3(0.21, 1.13, 0);
  openManuscriptRight.rotation.x = Math.PI / 2;
  openManuscriptRight.rotation.y = -0.03;
  openManuscriptRight.material = parchment;
  openManuscriptRight.isPickable = false;
  openManuscriptRight.parent = root;

  // Ceramic Inkwell & Feather Quill
  const inkwell = MeshBuilder.CreateCylinder(`inkwell-${z}`, { height: 0.11, diameterTop: 0.09, diameterBottom: 0.13, tessellation: 12 }, scene);
  inkwell.position = new Vector3(0.68, 1.18, -0.22);
  inkwell.material = ceramicBlue;
  inkwell.isPickable = false;
  inkwell.parent = root;

  const quill = MeshBuilder.CreateCylinder(`quill-${z}`, { height: 0.32, diameterTop: 0.005, diameterBottom: 0.015, tessellation: 6 }, scene);
  quill.position = new Vector3(0.72, 1.30, -0.20);
  quill.rotation.z = -0.38;
  quill.rotation.x = 0.25;
  quill.material = material(scene, "quill-feather", new Color3(0.88, 0.85, 0.78));
  quill.isPickable = false;
  quill.parent = root;

  if (hasAstrolabe) {
    // Historic Andalusian Brass Astrolabe (أسطرلاب أندلسي)
    const astrolabeStand = MeshBuilder.CreateCylinder(`astrolabe-stand-${z}`, { height: 0.06, diameter: 0.24, tessellation: 16 }, scene);
    astrolabeStand.position = new Vector3(1.0, 1.15, 0.18);
    astrolabeStand.material = brass;
    astrolabeStand.isPickable = false;
    astrolabeStand.parent = root;

    const astrolabeRod = MeshBuilder.CreateCylinder(`astrolabe-rod-${z}`, { height: 0.28, diameter: 0.03, tessellation: 8 }, scene);
    astrolabeRod.position = new Vector3(1.0, 1.28, 0.18);
    astrolabeRod.material = brass;
    astrolabeRod.isPickable = false;
    astrolabeRod.parent = root;

    // Main graduated Mater plate tilted gracefully
    const astrolabeMater = MeshBuilder.CreateCylinder(`astrolabe-mater-${z}`, { height: 0.02, diameter: 0.36, tessellation: 24 }, scene);
    astrolabeMater.position = new Vector3(1.0, 1.46, 0.18);
    astrolabeMater.rotation.x = 0.25;
    astrolabeMater.rotation.y = -0.32;
    astrolabeMater.material = brass;
    astrolabeMater.isPickable = false;
    astrolabeMater.parent = root;

    // Outer graduated ring
    const astrolabeRing = MeshBuilder.CreateTorus(`astrolabe-ring-${z}`, { diameter: 0.37, thickness: 0.022, tessellation: 24 }, scene);
    astrolabeRing.position = astrolabeMater.position;
    astrolabeRing.rotation = astrolabeMater.rotation;
    astrolabeRing.material = brass;
    astrolabeRing.isPickable = false;
    astrolabeRing.parent = root;

    // Top suspension ring (Kursi & Shackle)
    const astrolabeKursi = MeshBuilder.CreateTorus(`astrolabe-kursi-${z}`, { diameter: 0.08, thickness: 0.016, tessellation: 16 }, scene);
    astrolabeKursi.position = new Vector3(1.0, 1.66, 0.14);
    astrolabeKursi.material = brass;
    astrolabeKursi.isPickable = false;
    astrolabeKursi.parent = root;
  } else {
    // Stack of 3 antique leather folios
    [0, 1, 2].forEach((bIndex) => {
      const stackedBook = MeshBuilder.CreateBox(`stacked-book-${z}-${bIndex}`, { width: 0.36, height: 0.07, depth: 0.48 }, scene);
      stackedBook.position = new Vector3(0.95, 1.16 + bIndex * 0.072, 0.12);
      stackedBook.rotation.y = 0.12 - bIndex * 0.08;
      stackedBook.material = bIndex === 1 ? leatherRed : walnut;
      stackedBook.isPickable = false;
      stackedBook.parent = root;
    });

    // Rolled parchment scroll
    const scroll = MeshBuilder.CreateCylinder(`scroll-${z}`, { height: 0.42, diameter: 0.08, tessellation: 12 }, scene);
    scroll.position = new Vector3(-0.95, 1.16, 0.32);
    scroll.rotation.z = Math.PI / 2;
    scroll.rotation.y = 0.22;
    scroll.material = parchment;
    scroll.isPickable = false;
    scroll.parent = root;
  }
}

function addRusticLadder(scene: Scene, id: string, x: number, z: number, height: number, leanAngleZ: number) {
  const wood = material(scene, "rustic-ladder-wood", new Color3(0.40, 0.22, 0.10));
  const tie = material(scene, "rustic-ladder-tie", new Color3(0.68, 0.54, 0.34));

  const root = new TransformNode(`rustic-ladder-${id}`, scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.z = leanAngleZ;

  const width = 0.54;
  [-width * 0.5, width * 0.5].forEach((lx) => {
    const rail = MeshBuilder.CreateBox(`ladder-rail-${id}-${lx}`, { width: 0.07, height, depth: 0.08 }, scene);
    rail.position = new Vector3(lx, height * 0.5, 0);
    rail.material = wood;
    rail.isPickable = false;
    rail.freezeWorldMatrix();
    rail.parent = root;
  });

  const stepSpacing = 0.34;
  for (let y = 0.32; y < height - 0.18; y += stepSpacing) {
    const rung = MeshBuilder.CreateCylinder(`ladder-rung-${id}-${y.toFixed(2)}`, { height: width - 0.02, diameter: 0.042, tessellation: 8 }, scene);
    rung.position = new Vector3(0, y, 0);
    rung.rotation.z = Math.PI / 2;
    rung.material = wood;
    rung.isPickable = false;
    rung.freezeWorldMatrix();
    rung.parent = root;

    // Rustic peg/tie bindings on the sides matching the reference picture
    [-width * 0.5, width * 0.5].forEach((tx) => {
      const peg = MeshBuilder.CreateSphere(`ladder-peg-${id}-${y.toFixed(2)}-${tx}`, { diameter: 0.035, segments: 4 }, scene);
      peg.position = new Vector3(tx, y, 0.03);
      peg.material = tie;
      peg.isPickable = false;
      peg.freezeWorldMatrix();
      peg.parent = root;
    });
  }
}

function addReadingFootstool(scene: Scene, id: string, x: number, z: number, rotationY: number) {
  const wood = material(scene, "rustic-stool-wood", new Color3(0.42, 0.23, 0.11), new Color3(0.08, 0.05, 0.03), new Color3(0.12, 0.06, 0.02));

  const root = new TransformNode(`footstool-${id}`, scene);
  root.position = new Vector3(x, 0, z);
  root.rotation.y = rotationY;

  // Stool top seat
  const seat = MeshBuilder.CreateBox(`stool-seat-${id}`, { width: 0.44, height: 0.07, depth: 0.28 }, scene);
  seat.position = new Vector3(0, 0.26, 0);
  seat.material = wood;
  seat.isPickable = false;
  seat.freezeWorldMatrix();
  seat.parent = root;

  // 4 splayed rustic legs
  const legOffsets = [
    { x: -0.15, z: -0.09, rotZ: 0.14, rotX: -0.14 },
    { x: 0.15, z: -0.09, rotZ: -0.14, rotX: -0.14 },
    { x: -0.15, z: 0.09, rotZ: 0.14, rotX: 0.14 },
    { x: 0.15, z: 0.09, rotZ: -0.14, rotX: 0.14 },
  ];

  legOffsets.forEach((l, idx) => {
    const leg = MeshBuilder.CreateBox(`stool-leg-${id}-${idx}`, { width: 0.048, height: 0.25, depth: 0.048 }, scene);
    leg.position = new Vector3(l.x, 0.125, l.z);
    leg.rotation.z = l.rotZ;
    leg.rotation.x = l.rotX;
    leg.material = wood;
    leg.isPickable = false;
    leg.freezeWorldMatrix();
    leg.parent = root;
  });
}

function addWallDecor(scene: Scene) {
  const wood = material(scene, "pilaster-wood", new Color3(0.24, 0.12, 0.055));
  const brass = material(scene, "sconce-brass", new Color3(0.78, 0.58, 0.28));
  const lanternGlass = material(scene, "sconce-glass", new Color3(0.95, 0.80, 0.45));
  lanternGlass.emissiveColor = new Color3(0.75, 0.52, 0.20);

  [-8, -3, 2, 7].forEach((z, idx) => {
    [-11.85, 11.85].forEach((x, sideIdx) => {
      // Carved wooden pilaster column
      const pilaster = MeshBuilder.CreateBox(`pilaster-${idx}-${sideIdx}`, { width: 0.42, height: 6.8, depth: 0.28 }, scene);
      pilaster.position = new Vector3(x, 3.4, z);
      pilaster.material = wood;
      pilaster.isPickable = false;
      pilaster.freezeWorldMatrix();

      // Decorative corbel capital
      const capital = MeshBuilder.CreateBox(`pilaster-cap-${idx}-${sideIdx}`, { width: 0.54, height: 0.24, depth: 0.36 }, scene);
      capital.position = new Vector3(x, 6.7, z);
      capital.material = brass;
      capital.isPickable = false;
      capital.freezeWorldMatrix();

      // Brass wall sconce arm
      const arm = MeshBuilder.CreateCylinder(`sconce-arm-${idx}-${sideIdx}`, { height: 0.38, diameter: 0.03, tessellation: 8 }, scene);
      arm.position = new Vector3(x + (sideIdx === 0 ? 0.22 : -0.22), 3.8, z);
      arm.rotation.z = sideIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
      arm.material = brass;
      arm.isPickable = false;
      arm.freezeWorldMatrix();

      // Glowing lantern
      const lantern = MeshBuilder.CreateCylinder(`sconce-lantern-${idx}-${sideIdx}`, { height: 0.32, diameter: 0.16, tessellation: 12 }, scene);
      lantern.position = new Vector3(x + (sideIdx === 0 ? 0.40 : -0.40), 3.9, z);
      lantern.material = lanternGlass;
      lantern.isPickable = false;
      lantern.freezeWorldMatrix();

      // Soft amber wall light
      const wallLight = new PointLight(`sconce-light-${idx}-${sideIdx}`, lantern.position.clone(), scene);
      wallLight.diffuse = new Color3(1.0, 0.78, 0.45);
      wallLight.intensity = 0.65;
      wallLight.range = 5.5;
    });
  });
}

function arrangeGrandLibrary(scene: Scene) {
  const roots = shelfRoot(scene);
  const layouts = [
    // Left and right wings face the central aisle.
    { x: -8.0, z: -8.2, rotation: Math.PI / 2 }, { x: -8.0, z: -2.7, rotation: Math.PI / 2 },
    { x: -8.0, z: 2.7, rotation: Math.PI / 2 }, { x: -8.0, z: 8.2, rotation: Math.PI / 2 },
    { x: 8.0, z: -8.2, rotation: -Math.PI / 2 }, { x: 8.0, z: -2.7, rotation: -Math.PI / 2 },
    { x: 8.0, z: 2.7, rotation: -Math.PI / 2 }, { x: 8.0, z: 8.2, rotation: -Math.PI / 2 },
    // North and south archives face the long central aisle.
    { x: -8.0, z: -12.0, rotation: 0 }, { x: -2.7, z: -12.0, rotation: 0 },
    { x: 2.7, z: -12.0, rotation: 0 }, { x: 8.0, z: -12.0, rotation: 0 },
    { x: -8.0, z: 12.0, rotation: Math.PI }, { x: -2.7, z: 12.0, rotation: Math.PI },
    { x: 2.7, z: 12.0, rotation: Math.PI }, { x: 8.0, z: 12.0, rotation: Math.PI },
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

  // Architectural elements
  addAndalusianArch(scene, -6.8);
  addAndalusianArch(scene, 0.0);
  addAndalusianArch(scene, 6.8);
  addCeilingBeams(scene);
  addWallDecor(scene);

  // Atmospheric Carpets & Lighting
  addMoroccanCarpet(scene);
  addChandelier(scene, -6.8);
  addChandelier(scene, 0.0);
  addChandelier(scene, 6.8);

  // Historic Research & Manuscript Stations
  addStudyStation(scene, -3.4, true);  // Astronomy with Astrolabe & Banker's lamp
  addStudyStation(scene, 3.4, false);  // Philosophy with Folios, Scroll & Candlestick

  // Rustic Library Ladders (Matching user reference image)
  addRusticLadder(scene, "tall-left", -4.4, 0.6, 4.3, 0.16);
  addRusticLadder(scene, "short-mid", -4.2, -4.2, 2.3, 0.18);
  addRusticLadder(scene, "right-aisle", 4.4, 1.8, 3.8, -0.16);

  // Rustic Reading Footstools (Matching user reference image)
  addReadingFootstool(scene, "stool-1", -3.6, 2.2, 0.22);
  addReadingFootstool(scene, "stool-2", -3.4, -2.4, -0.18);
  addReadingFootstool(scene, "stool-3", 3.6, -1.2, 0.35);
  addReadingFootstool(scene, "stool-4", 3.5, 3.2, -0.12);

}

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const handle = await createBaseGameScene(engine, canvas);
  arrangeGrandLibrary(handle.scene);
  return handle;
}
