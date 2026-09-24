import type { Vector3 } from "@babylonjs/core/Maths/math.vector";

export type TransformSnapshot = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w?: number };
  scale: { x: number; y: number; z: number };
};

export type InteractiveObjectState = "idle" | "held" | "moving" | "placed" | "open";

export type InteractiveObject = {
  id: string;
  type: string;
  name: string;
  model: string;
  originalTransform: TransformSnapshot;
  currentTransform: TransformSnapshot;
  state: InteractiveObjectState;
  parent?: string;
  holder?: string;
  surface?: string;
  isHeld: boolean;
  isMoving: boolean;
  isPlaced: boolean;
  isOnShelf: boolean;
  isOpen: boolean;
  lastAction?: string;
  timestamp: number;
  metadata: Record<string, unknown>;
};

export type WorldState = {
  version: 1;
  objects: Record<string, InteractiveObject>;
  activeActions: string[];
  timestamp: number;
};

export type EngineEvent = {
  type: string;
  objectId?: string;
  actionId?: string;
  payload?: Record<string, unknown>;
  timestamp: number;
};

export type StructuredCommand = {
  intent: "TAKE_OBJECT" | "PLACE_OBJECT" | "RETURN_OBJECT" | "OPEN_OBJECT" | "CLOSE_OBJECT" | "UNDO" | "REDO";
  objectQuery?: string;
  targetQuery?: string;
  raw: string;
};

export type TransformLike = {
  position: Vector3;
  rotation: Vector3;
  scaling: Vector3;
};
