// Central Session State Store with Reactive Event Listeners
export class SessionState {
  constructor(roomId, role) {
    this.roomId = roomId;
    this.role = role; // 'coach' | 'client'
    this.listeners = new Set();
    
    // Core Session Data (Spec 3.7)
    this.session = {
      schemaVersion: 1,
      roomId: roomId,
      createdAt: new Date().toISOString(),
      topic: "",
      templateId: "free",
      stage: 0,
      locked: false,
      paused: false,
      tableSkin: "round_wood", // 'default' | 'round_wood' | 'square_areca' | 'plate_basic'
      figures: {},
      links: {},
      snapshots: [],
      notes: "",
      commitment: "",
      consent: { coach: false, client: false }
    };

    // UI-only state (not synchronized over network)
    this.ui = {
      selectedFigureId: null,
      selectedLinkIds: [],
      activeTool: 'select', // 'select' | 'link' | 'rotate'
      zoom: 1.0,
      panX: 0,
      panY: 0,
      ghostSuggestion: null // { id, x, y, angle }
    };

    // Undo / Redo history stacks (stores figures snapshots)
    this.undoStack = [];
    this.redoStack = [];

    // Try restoring from LocalStorage if coach
    this.restoreLocalBackup();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(changeType = 'update', detail = null) {
    for (const l of this.listeners) {
      try {
        l(this.session, this.ui, changeType, detail);
      } catch (e) {
        console.error("SessionState listener error:", e);
      }
    }
    this.saveLocalBackup();
  }

  // Local Storage Autosave (Spec G4, 3.10)
  saveLocalBackup() {
    try {
      const key = `constellation_backup_${this.roomId}`;
      localStorage.setItem(key, JSON.stringify(this.session));
    } catch (e) {
      console.warn("LocalStorage save error:", e);
    }
  }

  restoreLocalBackup() {
    try {
      const key = `constellation_backup_${this.roomId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.schemaVersion === 1) {
          this.session = Object.assign(this.session, parsed);
          console.log("[SessionState] Restored local backup for room:", this.roomId);
        }
      }
    } catch (e) {
      console.warn("LocalStorage restore error:", e);
    }
  }

  clearLocalBackup() {
    try {
      const key = `constellation_backup_${this.roomId}`;
      localStorage.removeItem(key);
    } catch (e) {}
  }

  // --- Snapshot & History Management ---
  saveHistory() {
    // Keep max 20 undo states
    const snapshot = JSON.stringify(this.session.figures);
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 20) this.undoStack.shift();
    this.redoStack = []; // clear redo on new action
  }

  undo() {
    if (this.undoStack.length === 0) return null;
    const current = JSON.stringify(this.session.figures);
    this.redoStack.push(current);
    const prev = JSON.parse(this.undoStack.pop());
    this.session.figures = prev;
    this.notify('figures', { action: 'undo' });
    return prev;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const current = JSON.stringify(this.session.figures);
    this.undoStack.push(current);
    const next = JSON.parse(this.redoStack.pop());
    this.session.figures = next;
    this.notify('figures', { action: 'redo' });
    return next;
  }

  // --- Getters & Helpers ---
  getFigure(id) {
    return this.session.figures[id] || null;
  }

  getSelectedFigure() {
    return this.ui.selectedFigureId ? this.getFigure(this.ui.selectedFigureId) : null;
  }

  setSelectedFigure(id) {
    this.ui.selectedFigureId = id;
    this.notify('select', { figureId: id });
  }

  setGhostSuggestion(suggestion) {
    this.ui.ghostSuggestion = suggestion;
    this.notify('ghost', suggestion);
  }

  // Full state replacement (used on initial sync)
  replaceFullState(newSession) {
    if (!newSession) return;
    this.session = Object.assign(this.session, newSession);
    this.notify('full_sync');
  }
}
