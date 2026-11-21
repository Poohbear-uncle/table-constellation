import { FigureRenderer } from './FigureRenderer.js';
import { LinkOverlay } from './LinkOverlay.js';
import { GestureController } from './GestureController.js';

export class BoardCanvas {
  constructor(containerElem, sessionState, hostAuthority) {
    this.container = containerElem;
    this.state = sessionState;
    this.authority = hostAuthority;

    // Interaction flags
    this.draggingFigId = null;
    this.rotatingFigId = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.figStartPos = { x: 0, y: 0 };
    this.lastBroadcastTime = 0;
    this.snapToGrid = false;
    this.linkSourceFigId = null;

    this.renderSkeleton();
    this.gesture = new GestureController(this.container, (zoom, px, py) => {
      this.applyViewTransform(zoom, px, py);
    });

    this.bindPointerEvents();
    this.bindKeyboardShortcuts();

    // Subscribe to state changes
    this.state.subscribe(() => {
      this.render();
    });

    this.render();
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <div id="boardViewport" class="relative w-full h-full overflow-hidden select-none bg-slate-50">
        <svg id="mainSvg" viewBox="0 0 1000 1000" class="w-full h-full pointer-events-auto">
          <defs>
            <filter id="tableShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="8" stdDeviation="16" flood-opacity="0.12" flood-color="#0F172A" />
            </filter>
            <filter id="figShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.18" flood-color="#0F172A" />
            </filter>
            <marker id="arrowhead-blue" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#6366F1" />
            </marker>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="#CBD5E1" opacity="0.6"/>
            </pattern>
          </defs>

          <!-- Canvas Transform Container Group -->
          <g id="canvasTransformGroup">
            <!-- Background Clickable Layer -->
            <rect id="boardBackground" x="-2000" y="-2000" width="5000" height="5000" fill="url(#gridPattern)" />

            <!-- Table Plate Layer -->
            <g id="tableLayer"></g>

            <!-- Waiting Zone (보류 존) -->
            <g id="waitingZoneLayer" transform="translate(100, 830)">
              <rect x="0" y="0" width="800" height="130" rx="16" fill="#F1F5F9" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="6 4" opacity="0.9" />
              <text x="24" y="26" fill="#64748B" font-size="12" font-weight="700" font-family="'Pretendard', sans-serif">
                📥 보류 존 (테이블 밖 대기 영역 / 내려놓은 짐)
              </text>
            </g>

            <!-- Connecting Lines Layer -->
            <g id="linksLayer"></g>

            <!-- Figures Layer -->
            <g id="figuresLayer" filter="url(#figShadow)"></g>

            <!-- Ghost Suggestion Layer -->
            <g id="ghostLayer"></g>
          </g>
        </svg>
      </div>
    `;

    this.svg = this.container.querySelector('#mainSvg');
    this.transformGroup = this.container.querySelector('#canvasTransformGroup');
    this.tableLayer = this.container.querySelector('#tableLayer');
    this.linksLayer = this.container.querySelector('#linksLayer');
    this.figuresLayer = this.container.querySelector('#figuresLayer');
    this.ghostLayer = this.container.querySelector('#ghostLayer');
  }

  applyViewTransform(zoom, px, py) {
    this.transformGroup.setAttribute('transform', `translate(${px}, ${py}) scale(${zoom})`);
  }

  render() {
    this.renderTableSkin();
    this.renderLinks();
    this.renderFigures();
    this.renderGhost();
  }

  renderTableSkin() {
    const skin = this.state.session.tableSkin || 'round_wood';
    let html = '';

    switch (skin) {
      case 'round_wood':
        html = `
          <!-- Circular Wood Dish Table -->
          <image href="./assets/figures/table_wood_round_1.png" x="120" y="60" width="760" height="740" preserveAspectRatio="xMidYMid meet" filter="url(#tableShadow)" />
          <circle cx="500" cy="430" r="3" fill="#A16207" opacity="0.4" />
        `;
        break;

      case 'square_areca':
        html = `
          <!-- Square Areca Plate Table -->
          <image href="./assets/figures/table_square_areca.png" x="130" y="70" width="740" height="720" preserveAspectRatio="xMidYMid meet" filter="url(#tableShadow)" />
          <circle cx="500" cy="430" r="3" fill="#78350F" opacity="0.4" />
        `;
        break;

      case 'plate_basic':
        html = `
          <image href="./assets/figures/table_plate_basic.png" x="140" y="80" width="720" height="700" preserveAspectRatio="xMidYMid meet" filter="url(#tableShadow)" />
        `;
        break;

      default:
        // Clean Minimal SVG Round Table
        html = `
          <circle cx="500" cy="430" r="360" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" filter="url(#tableShadow)" />
          <circle cx="500" cy="430" r="340" fill="#F8FAFC" stroke="#F1F5F9" stroke-width="2" />
          <circle cx="500" cy="430" r="4" fill="#94A3B8" opacity="0.5" />
          <!-- Subtle Cardinal Guide Marks -->
          <line x1="500" y1="90" x2="500" y2="110" stroke="#CBD5E1" stroke-width="2" />
          <line x1="500" y1="750" x2="500" y2="770" stroke="#CBD5E1" stroke-width="2" />
          <line x1="160" y1="430" x2="180" y2="430" stroke="#CBD5E1" stroke-width="2" />
          <line x1="820" y1="430" x2="840" y2="430" stroke="#CBD5E1" stroke-width="2" />
        `;
    }

    this.tableLayer.innerHTML = html;
  }

  renderLinks() {
    this.linksLayer.innerHTML = LinkOverlay.renderLinks(this.state.session.links, this.state.session.figures);
  }

  renderFigures() {
    const selectedId = this.state.ui.selectedFigureId;
    let html = '';

    for (const [id, fig] of Object.entries(this.state.session.figures)) {
      html += FigureRenderer.render(fig, id === selectedId, false);
    }

    this.figuresLayer.innerHTML = html;
  }

  renderGhost() {
    const ghost = this.state.ui.ghostSuggestion;
    if (!ghost || !this.state.session.figures[ghost.id]) {
      this.ghostLayer.innerHTML = '';
      return;
    }

    const baseFig = this.state.session.figures[ghost.id];
    const ghostFig = { ...baseFig, x: ghost.x, y: ghost.y, angle: ghost.angle || baseFig.angle };
    this.ghostLayer.innerHTML = FigureRenderer.render(ghostFig, false, true);
  }

  // --- Interaction & Event Binding ---
  bindPointerEvents() {
    this.svg.addEventListener('pointerdown', (e) => {
      // If locked, prevent interaction
      if (this.state.session.locked || this.state.session.paused) return;

      const targetHandle = e.target.getAttribute('data-handle');
      const figureGroup = e.target.closest('.figure-element');

      if (targetHandle === 'rotate' && figureGroup) {
        // Start rotation
        const figId = figureGroup.getAttribute('data-id');
        this.rotatingFigId = figId;
        this.svg.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }

      if (figureGroup) {
        const figId = figureGroup.getAttribute('data-id');

        // Line creation tool handling
        if (this.state.ui.activeTool === 'link') {
          if (!this.linkSourceFigId) {
            this.linkSourceFigId = figId;
            this.state.setSelectedFigure(figId);
          } else if (this.linkSourceFigId !== figId) {
            // Create link between linkSourceFigId and figId
            const newLinkId = `link-${Date.now()}`;
            this.authority.dispatch({
              t: 'link.add',
              link: {
                id: newLinkId,
                from: this.linkSourceFigId,
                to: figId,
                kind: 'arrow',
                color: '#6366F1'
              }
            });
            this.linkSourceFigId = null;
            this.state.ui.activeTool = 'select';
          }
          return;
        }

        // Start figure drag
        this.draggingFigId = figId;
        this.state.setSelectedFigure(figId);
        const pt = this.gesture.screenToSvg(e.clientX, e.clientY, this.svg);
        this.dragStartPos = pt;
        const fig = this.state.getFigure(figId);
        if (fig) {
          this.figStartPos = { x: fig.x, y: fig.y };
        }
        this.svg.setPointerCapture(e.pointerId);
        e.stopPropagation();
        return;
      }

      // Check if user clicked a link delete button or link label
      const linkGroup = e.target.closest('.link-label-group');
      if (linkGroup) {
        const linkId = linkGroup.getAttribute('data-link-id');
        if (linkId) {
          this.authority.dispatch({
            t: 'link.remove',
            id: linkId
          });
        }
        e.stopPropagation();
        return;
      }

      // Background click: deselect
      if (e.target.id === 'boardBackground') {
        this.state.setSelectedFigure(null);
        this.linkSourceFigId = null;
      }
    });

    this.svg.addEventListener('pointermove', (e) => {
      if (this.rotatingFigId) {
        const fig = this.state.getFigure(this.rotatingFigId);
        if (!fig) return;

        const pt = this.gesture.screenToSvg(e.clientX, e.clientY, this.svg);
        const dx = pt.x - fig.x;
        const dy = pt.y - fig.y;
        // Angle in degrees: 0 = 12 o'clock, clockwise
        let angleDeg = Math.round((Math.atan2(dx, -dy) * 180) / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        fig.angle = angleDeg;
        this.renderFigures();

        // Throttled broadcast (every 60ms)
        const now = Date.now();
        if (now - this.lastBroadcastTime > 60) {
          this.lastBroadcastTime = now;
          this.authority.dispatch({
            t: 'fig.move',
            id: fig.id,
            x: fig.x,
            y: fig.y,
            angle: angleDeg,
            rev: fig.rev
          });
        }
        return;
      }

      if (this.draggingFigId) {
        const fig = this.state.getFigure(this.draggingFigId);
        if (!fig || fig.locked) return;

        const pt = this.gesture.screenToSvg(e.clientX, e.clientY, this.svg);
        let newX = this.figStartPos.x + (pt.x - this.dragStartPos.x);
        let newY = this.figStartPos.y + (pt.y - this.dragStartPos.y);

        if (this.snapToGrid) {
          newX = Math.round(newX / 25) * 25;
          newY = Math.round(newY / 25) * 25;
        }

        // Zone detection: y >= 830 is waiting zone
        const zone = newY >= 830 ? 'waiting' : 'table';

        fig.x = newX;
        fig.y = newY;
        fig.zone = zone;
        this.renderFigures();
        this.renderLinks();

        // Throttled broadcast
        const now = Date.now();
        if (now - this.lastBroadcastTime > 50) {
          this.lastBroadcastTime = now;
          this.authority.dispatch({
            t: 'fig.move',
            id: fig.id,
            x: newX,
            y: newY,
            angle: fig.angle,
            zone: zone,
            rev: fig.rev
          });
        }
      }
    });

    const endDragOrRotate = () => {
      if (this.rotatingFigId) {
        const fig = this.state.getFigure(this.rotatingFigId);
        if (fig) {
          // Final confirmed broadcast
          this.authority.dispatch({
            t: 'fig.move',
            id: fig.id,
            x: fig.x,
            y: fig.y,
            angle: fig.angle,
            rev: fig.rev
          });
        }
        this.rotatingFigId = null;
      }

      if (this.draggingFigId) {
        const fig = this.state.getFigure(this.draggingFigId);
        if (fig) {
          // Final confirmed broadcast
          this.authority.dispatch({
            t: 'fig.move',
            id: fig.id,
            x: fig.x,
            y: fig.y,
            angle: fig.angle,
            zone: fig.zone,
            rev: fig.rev
          });
        }
        this.draggingFigId = null;
      }
    };

    this.svg.addEventListener('pointerup', endDragOrRotate);
    this.svg.addEventListener('pointercancel', endDragOrRotate);
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in text inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const selectedId = this.state.ui.selectedFigureId;
      if (!selectedId) return;
      const fig = this.state.getFigure(selectedId);
      if (!fig) return;

      // Q / E: Rotate 15 degrees
      if (e.key === 'q' || e.key === 'Q') {
        const newAngle = (fig.angle - 15 + 360) % 360;
        this.authority.dispatch({ t: 'fig.move', id: fig.id, x: fig.x, y: fig.y, angle: newAngle });
      } else if (e.key === 'e' || e.key === 'E') {
        const newAngle = (fig.angle + 15) % 360;
        this.authority.dispatch({ t: 'fig.move', id: fig.id, x: fig.x, y: fig.y, angle: newAngle });
      }

      // Arrow keys: fine move (5px)
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 20 : 5;
        let nx = fig.x;
        let ny = fig.y;
        if (e.key === 'ArrowUp') ny -= step;
        if (e.key === 'ArrowDown') ny += step;
        if (e.key === 'ArrowLeft') nx -= step;
        if (e.key === 'ArrowRight') nx += step;
        this.authority.dispatch({ t: 'fig.move', id: fig.id, x: nx, y: ny, angle: fig.angle });
      }

      // Delete / Backspace: remove
      if (e.key === 'Delete') {
        this.authority.dispatch({ t: 'fig.remove', id: fig.id });
      }
    });
  }
}
