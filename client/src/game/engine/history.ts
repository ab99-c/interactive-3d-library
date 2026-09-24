import type { WorldState } from "./types";

export type HistoryEntry = { label: string; before: WorldState; after: WorldState; timestamp: number };

export class ActionHistory {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  record(entry: Omit<HistoryEntry, "timestamp">) {
    this.undoStack.push({ ...entry, timestamp: Date.now() });
    this.redoStack = [];
  }

  undo(current: WorldState) {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push({ ...entry, after: current });
    return entry.before;
  }

  redo(current: WorldState) {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push({ ...entry, before: current });
    return entry.after;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }
}
