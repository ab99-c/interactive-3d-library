import type { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene as createBaseGameScene } from "./scene-base";

export type { GameHandle, PerformanceMode, BookInfo, BookScreenRect } from "./scene-base";

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement) {
  return createBaseGameScene(engine, canvas);
}
