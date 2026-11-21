// Figure SVG Renderer: Shapes, Gaze Vectors, Rotation Handles, and Physical Image Skins
export class FigureRenderer {
  static SIZES = {
    S: 22,
    M: 32,
    L: 44
  };

  static render(fig, isSelected = false, isGhost = false) {
    const r = this.SIZES[fig.size || 'M'] || 32;
    const opacity = isGhost ? 0.45 : (fig.released ? 0.4 : 1.0);
    const strokeDash = isGhost ? 'stroke-dasharray="4 4"' : '';
    const angle = fig.angle || 0;

    // SVG Group containing the figure, rotated around (0,0)
    let shapeSvg = '';

    if (fig.imageSrc) {
      // Physical Ball / Crystal Image Skin
      shapeSvg = `
        <image href="${fig.imageSrc}" x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid meet" />
        <!-- Distinct Gaze Pointer for Images -->
        <path d="M 0 ${-r - 12} L -7 ${-r + 2} L 7 ${-r + 2} Z" fill="#EF4444" stroke="#FFFFFF" stroke-width="1.5" filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.4))" />
      `;
    } else {
      switch (fig.shape) {
        case 'person':
          shapeSvg = `
            <!-- Shoulders / Body -->
            <path d="M ${-r * 0.8} ${r * 0.75} C ${-r * 0.8} ${r * 0.2}, ${r * 0.8} ${r * 0.2}, ${r * 0.8} ${r * 0.75} Z" fill="${fig.color}" />
            <!-- Head -->
            <circle cx="0" cy="${-r * 0.15}" r="${r * 0.45}" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2" />
            <!-- Clear Nose / Gaze Indicator (Pointing to 12 o'clock) -->
            <path d="M 0 ${-r * 0.9} L -6 ${-r * 0.4} L 6 ${-r * 0.4} Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.2" />
          `;
          break;

        case 'circle':
          shapeSvg = `
            <circle cx="0" cy="0" r="${r * 0.75}" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2.5" />
            <!-- Gaze Arrow Pointer -->
            <path d="M 0 ${-r * 1.05} L -7 ${-r * 0.6} L 7 ${-r * 0.6} Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.5" />
          `;
          break;

        case 'square':
          shapeSvg = `
            <rect x="${-r * 0.7}" y="${-r * 0.7}" width="${r * 1.4}" height="${r * 1.4}" rx="${r * 0.25}" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2.5" />
            <path d="M 0 ${-r * 1.05} L -6 ${-r * 0.65} L 6 ${-r * 0.65} Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.5" />
          `;
          break;

        case 'star': {
          const outerR = r * 0.85;
          const innerR = r * 0.4;
          let points = [];
          for (let i = 0; i < 10; i++) {
            const rad = (i * Math.PI) / 5 - Math.PI / 2;
            const curR = i % 2 === 0 ? outerR : innerR;
            points.push(`${curR * Math.cos(rad)},${curR * Math.sin(rad)}`);
          }
          shapeSvg = `
            <polygon points="${points.join(' ')}" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2" />
            <path d="M 0 ${-r * 1.15} L -6 ${-r * 0.75} L 6 ${-r * 0.75} Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.5" />
          `;
          break;
        }

        case 'diamond':
          shapeSvg = `
            <polygon points="0,${-r * 0.9} ${r * 0.75},0 0,${r * 0.9} ${-r * 0.75},0" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2" />
            <path d="M 0 ${-r * 1.15} L -6 ${-r * 0.8} L 6 ${-r * 0.8} Z" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1.5" />
          `;
          break;

        case 'observer':
          // Metaphoric Eye Symbol for Meta-Observer
          shapeSvg = `
            <path d="M ${-r * 0.9} 0 Q 0 ${-r * 0.7} ${r * 0.9} 0 Q 0 ${r * 0.7} ${-r * 0.9} 0 Z" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2.5" />
            <circle cx="0" cy="0" r="${r * 0.35}" fill="#FFFFFF" />
            <!-- Pupil looking forward -->
            <circle cx="0" cy="${-r * 0.1}" r="${r * 0.2}" fill="#0F172A" />
            <path d="M 0 ${-r * 1.05} L -6 ${-r * 0.65} L 6 ${-r * 0.65} Z" fill="#3B82F6" stroke="#FFFFFF" stroke-width="1.2" />
          `;
          break;

        default:
          shapeSvg = `<circle cx="0" cy="0" r="${r * 0.75}" fill="${fig.color}" stroke="#FFFFFF" stroke-width="2" />`;
      }
    }

    // Selection Ring and Rotation Knob
    let selectionOverlay = '';
    if (isSelected && !isGhost) {
      const knobDist = r + 24;
      selectionOverlay = `
        <!-- Selection Highlight Ring (Clean, static, tightly focused around figure) -->
        <circle cx="0" cy="0" r="${r + 8}" fill="none" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4 3" opacity="0.9" />
        
        <!-- Rotation Stem & Knob (Interactive rotation handle) -->
        <line x1="0" y1="${-r - 5}" x2="0" y2="${-knobDist}" stroke="#3B82F6" stroke-width="2" />
        <circle cx="0" cy="${-knobDist}" r="7" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2" class="cursor-grab hover:scale-125 transition-transform" data-handle="rotate" />
      `;
    }

    // Label Badge rendered horizontally below the figure (doesn't rotate with angle so it remains easily readable)
    const labelText = fig.label || '피규어';
    const labelY = r + 18;

    return `
      <g id="fig-group-${fig.id}" class="figure-element cursor-move select-none" transform="translate(${fig.x}, ${fig.y})" data-id="${fig.id}" opacity="${opacity}">
        <!-- Rotatable Figure Core -->
        <g transform="rotate(${angle})" ${strokeDash}>
          ${shapeSvg}
          ${selectionOverlay}
        </g>

        <!-- Unrotated Text Label Pill (Always upright for clarity) -->
        <g transform="translate(0, ${labelY})" pointer-events="none">
          <rect x="${-labelText.length * 6 - 8}" y="-10" width="${labelText.length * 12 + 16}" height="20" rx="10" fill="rgba(15, 23, 42, 0.85)" />
          <text x="0" y="4" text-anchor="middle" fill="#FFFFFF" font-size="11" font-weight="600" font-family="'Pretendard', sans-serif">
            ${labelText}
          </text>
        </g>
      </g>
    `;
  }
}
