// Host Authority Manager: Op Processor & Conflict Resolver
export class HostAuthority {
  constructor(sessionState, syncAdapter) {
    this.state = sessionState;
    this.sync = syncAdapter;
    this.role = sessionState.role;
    this.isHost = (this.role === 'coach');

    // Register op receiver from sync adapter
    this.sync.onOp((op, fromRole) => {
      this.handleRemoteOp(op, fromRole);
    });
  }

  // Local Op Dispatcher
  dispatch(op) {
    // 1. Process locally first
    this.applyOp(op, this.role);

    // 2. Broadcast to peer via SyncAdapter
    this.sync.send(op);
  }

  // Remote Op Handler
  handleRemoteOp(op, fromRole) {
    if (!op || !op.t) return;

    if (op.t === 'sync.request_full' && this.isHost) {
      // Client requested initial full state snapshot
      this.sync.send({
        t: 'sync.full',
        session: this.state.session
      });
      return;
    }

    if (op.t === 'sync.full') {
      this.state.replaceFullState(op.session);
      return;
    }

    // Apply remote op to local session state
    this.applyOp(op, fromRole);
  }

  // Apply Op to State
  applyOp(op, fromRole) {
    const s = this.state.session;

    switch (op.t) {
      case 'fig.add': {
        if (!op.fig || !op.fig.id) break;
        this.state.saveHistory();
        s.figures[op.fig.id] = { ...op.fig, rev: (op.fig.rev || 0) + 1 };
        this.state.notify('figures', { action: 'add', figure: s.figures[op.fig.id] });
        break;
      }

      case 'fig.move': {
        const fig = s.figures[op.id];
        if (!fig) break;
        // Check revision conflict
        if (op.rev !== undefined && op.rev < fig.rev) {
          // Stale op, ignore
          break;
        }
        fig.x = op.x;
        fig.y = op.y;
        if (op.angle !== undefined) fig.angle = op.angle;
        if (op.zone !== undefined) fig.zone = op.zone;
        fig.rev = (fig.rev || 0) + 1;
        this.state.notify('figures', { action: 'move', figure: fig });
        break;
      }

      case 'fig.patch': {
        const fig = s.figures[op.id];
        if (!fig) break;
        this.state.saveHistory();
        Object.assign(fig, op.patch);
        fig.rev = (fig.rev || 0) + 1;
        this.state.notify('figures', { action: 'patch', figure: fig });
        break;
      }

      case 'fig.remove': {
        if (!s.figures[op.id]) break;
        this.state.saveHistory();
        delete s.figures[op.id];
        // Remove connected links
        for (const [lid, link] of Object.entries(s.links)) {
          if (link.from === op.id || link.to === op.id) {
            delete s.links[lid];
          }
        }
        if (this.state.ui.selectedFigureId === op.id) {
          this.state.ui.selectedFigureId = null;
        }
        this.state.notify('figures', { action: 'remove', id: op.id });
        break;
      }

      case 'link.add': {
        if (!op.link || !op.link.id) break;
        s.links[op.link.id] = op.link;
        this.state.notify('links', { action: 'add', link: op.link });
        break;
      }

      case 'link.remove': {
        if (!s.links[op.id]) break;
        delete s.links[op.id];
        this.state.notify('links', { action: 'remove', id: op.id });
        break;
      }

      case 'snap.add': {
        if (!op.snap) break;
        s.snapshots.push(op.snap);
        this.state.notify('snapshots', { action: 'add', snapshot: op.snap });
        break;
      }

      case 'session.patch': {
        if (!op.patch) break;
        Object.assign(s, op.patch);
        this.state.notify('session', op.patch);
        break;
      }

      case 'suggest': {
        // Coach suggests ghost placement
        this.state.setGhostSuggestion({
          id: op.id,
          x: op.x,
          y: op.y,
          angle: op.angle
        });
        break;
      }

      case 'suggest.respond': {
        const ghost = this.state.ui.ghostSuggestion;
        if (ghost && ghost.id === op.id) {
          if (op.accept && s.figures[op.id]) {
            // Apply suggestion as actual move
            this.dispatch({
              t: 'fig.move',
              id: ghost.id,
              x: ghost.x,
              y: ghost.y,
              angle: ghost.angle
            });
          }
          this.state.setGhostSuggestion(null);
        }
        break;
      }
    }
  }
}
