// Link & Distance Measurement Overlay
export class LinkOverlay {
  static classifyDistance(dist) {
    if (dist < 150) return { level: 'near', text: '가까움' };
    if (dist <= 350) return { level: 'medium', text: '중간' };
    return { level: 'far', text: '멂' };
  }

  static renderLinks(links, figures) {
    let svg = '';

    for (const [id, link] of Object.entries(links)) {
      const fromFig = figures[link.from];
      const toFig = figures[link.to];
      if (!fromFig || !toFig) continue;

      const dx = toFig.x - fromFig.x;
      const dy = toFig.y - fromFig.y;
      const dist = Math.hypot(dx, dy);
      const midX = (fromFig.x + toFig.x) / 2;
      const midY = (fromFig.y + toFig.y) / 2;
      const distInfo = this.classifyDistance(dist);

      const color = link.color || '#6366F1';
      const marker = link.kind === 'arrow' ? 'url(#arrowhead-blue)' : '';

      svg += `
        <g id="link-${id}" class="link-element select-none" data-id="${id}">
          <line x1="${fromFig.x}" y1="${fromFig.y}" x2="${toFig.x}" y2="${toFig.y}" 
                stroke="${color}" stroke-width="2.5" stroke-dasharray="6 4" marker-end="${marker}" />
          <!-- Distance Pill Label with One-Click '×' Delete Button -->
          <g transform="translate(${midX}, ${midY})" pointer-events="auto" class="cursor-pointer link-label-group" data-link-id="${id}" title="클릭하여 관계선 삭제">
            <rect x="-42" y="-11" width="84" height="22" rx="11" fill="#FFFFFF" stroke="${color}" stroke-width="1.8" filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.1))" />
            <text x="-8" y="4" text-anchor="middle" fill="#1E293B" font-size="10" font-weight="700">
              ${link.label || distInfo.text}
            </text>
            <!-- Delete X Button -->
            <g class="btn-delete-link hover:scale-125 transition-transform" transform="translate(26, 0)">
              <circle cx="0" cy="0" r="7" fill="#FEE2E2" stroke="#EF4444" stroke-width="1" />
              <text x="0" y="3" text-anchor="middle" fill="#EF4444" font-size="10" font-weight="900">&times;</text>
            </g>
          </g>
        </g>
      `;
    }

    return svg;
  }
}
