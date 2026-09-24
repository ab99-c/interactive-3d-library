import type { TransformLike, TransformSnapshot, InteractiveObject, WorldState } from "./types";
import { EventBus } from "./event-bus";

export const WORLD_STATE_STORAGE_KEY = "quiet-study-hall:world-state-v1";

const snapshot = (transform: TransformLike): TransformSnapshot => ({
  position: { x: transform.position.x, y: transform.position.y, z: transform.position.z },
  rotation: { x: transform.rotation.x, y: transform.rotation.y, z: transform.rotation.z },
  scale: { x: transform.scaling.x, y: transform.scaling.y, z: transform.scaling.z },
});

export class WorldStateStore {
  readonly events: EventBus;
  private state: WorldState;

  constructor(events = new EventBus()) {
    this.events = events;
    this.state = this.load();
  }

  private load(): WorldState {
    try {
      const raw = window.localStorage.getItem(WORLD_STATE_STORAGE_KEY);
      if (!raw) return { version: 1, objects: {}, activeActions: [], timestamp: Date.now() };
      const parsed = JSON.parse(raw) as Partial<WorldState>;
      return { version: 1, objects: parsed.objects ?? {}, activeActions: parsed.activeActions ?? [], timestamp: Date.now() };
    } catch {
      return { version: 1, objects: {}, activeActions: [], timestamp: Date.now() };
    }
  }

  private persist() {
    this.state.timestamp = Date.now();
    try { window.localStorage.setItem(WORLD_STATE_STORAGE_KEY, JSON.stringify(this.state)); } catch { /* session-only fallback */ }
  }

  register(input: { id: string; type: string; name: string; model: string; transform: TransformLike; metadata?: Record<string, unknown>; onShelf?: boolean }) {
    const current = this.state.objects[input.id];
    const initial = snapshot(input.transform);
    const object: InteractiveObject = current ?? {
      id: input.id,
      type: input.type,
      name: input.name,
      model: input.model,
      originalTransform: initial,
      currentTransform: initial,
      state: "idle",
      isHeld: false,
      isMoving: false,
      isPlaced: false,
      isOnShelf: input.onShelf ?? false,
      isOpen: false,
      timestamp: Date.now(),
      metadata: input.metadata ?? {},
    };
    object.name = input.name;
    object.metadata = { ...object.metadata, ...input.metadata };
    this.state.objects[input.id] = object;
    this.persist();
    this.events.emit("WORLD_STATE_CHANGED", { objectId: input.id, payload: { reason: current ? "restored" : "registered" } });
    return object;
  }

  get(id: string) { return this.state.objects[id]; }
  all() { return Object.values(this.state.objects); }

  updateTransform(id: string, transform: TransformLike, patch: Partial<InteractiveObject> = {}) {
    const object = this.state.objects[id];
    if (!object) return false;
    object.currentTransform = snapshot(transform);
    Object.assign(object, patch, { timestamp: Date.now() });
    this.persist();
    this.events.emit("WORLD_STATE_CHANGED", { objectId: id, payload: { reason: "transform-updated" } });
    return true;
  }

  resetObject(id: string) {
    const object = this.state.objects[id];
    if (!object) return false;
    object.currentTransform = object.originalTransform;
    object.state = "idle";
    object.isHeld = false;
    object.isMoving = false;
    object.isPlaced = false;
    object.isOnShelf = true;
    object.holder = undefined;
    object.surface = undefined;
    object.lastAction = "RETURN";
    object.timestamp = Date.now();
    this.persist();
    this.events.emit("OBJECT_RETURN_COMPLETED", { objectId: id });
    return true;
  }

  exportState(): WorldState { return structuredClone(this.state); }

  clear() {
    this.state = { version: 1, objects: {}, activeActions: [], timestamp: Date.now() };
    try { window.localStorage.removeItem(WORLD_STATE_STORAGE_KEY); } catch { /* ignore */ }
    this.events.emit("WORLD_STATE_CHANGED", { payload: { reason: "cleared" } });
  }
}
