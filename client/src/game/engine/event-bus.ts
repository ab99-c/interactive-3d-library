import type { EngineEvent } from "./types";

type Listener = (event: EngineEvent) => void;

export class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(type: string, listener: Listener) {
    const current = this.listeners.get(type) ?? new Set<Listener>();
    current.add(listener);
    this.listeners.set(type, current);
    return () => this.off(type, listener);
  }

  off(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, payload: Omit<EngineEvent, "type" | "timestamp"> = {}) {
    const event: EngineEvent = { type, ...payload, timestamp: Date.now() };
    this.listeners.get(type)?.forEach((listener) => listener(event));
    this.listeners.get("*")?.forEach((listener) => listener(event));
    return event;
  }

  clear() {
    this.listeners.clear();
  }
}
