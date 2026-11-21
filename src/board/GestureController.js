// Gesture Controller: Wheel Zoom, Pan, Drag, and Touch Pinch
export class GestureController {
  constructor(canvasContainer, onTransformChange) {
    this.container = canvasContainer;
    this.onTransformChange = onTransformChange;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.startPanX = 0;
    this.startPanY = 0;

    this.initEvents();
  }

  initEvents() {
    // Wheel Zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const newZoom = Math.min(Math.max(this.zoom * zoomFactor, 0.4), 3.0);
      this.zoom = newZoom;
      this.triggerUpdate();
    }, { passive: false });

    // Middle click or Alt+Drag pan
    this.container.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || (e.button === 0 && (e.altKey || e.target.id === 'boardBackground' || e.target.id === 'mainSvg'))) {
        this.isPanning = true;
        this.startPanX = e.clientX - this.panX;
        this.startPanY = e.clientY - this.panY;
        this.container.style.cursor = 'grabbing';
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.startPanX;
      this.panY = e.clientY - this.startPanY;
      this.triggerUpdate();
    });

    window.addEventListener('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.container.style.cursor = 'default';
      }
    });
  }

  resetTransform() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.triggerUpdate();
  }

  triggerUpdate() {
    this.onTransformChange(this.zoom, this.panX, this.panY);
  }

  // Convert screen client coordinates to SVG logical coordinates (0~1000)
  screenToSvg(clientX, clientY, svgElem) {
    const rect = svgElem.getBoundingClientRect();
    const pt = svgElem.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svgElem.getScreenCTM().inverse());
    return { x: Math.round(svgP.x), y: Math.round(svgP.y) };
  }
}
