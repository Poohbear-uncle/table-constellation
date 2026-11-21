// Session Export Manager: PNG Canvas, JSON Backup/Restore, Markdown Report
export class ExportManager {
  constructor(sessionState) {
    this.state = sessionState;
  }

  // 1. Export High-Res PNG from SVG
  async exportPng() {
    const svgElem = document.getElementById('mainSvg');
    if (!svgElem) return;

    try {
      const svgClone = svgElem.cloneNode(true);
      // Clean up transform on clone for direct 1000x1000 export
      const gTransform = svgClone.querySelector('#canvasTransformGroup');
      if (gTransform) gTransform.removeAttribute('transform');

      const svgData = new XMLSerializer().serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1200;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
          const a = document.createElement('a');
          const dateStr = new Date().toISOString().slice(0, 10);
          a.download = `table-constellation-${this.state.roomId}-${dateStr}.png`;
          a.href = URL.createObjectURL(blob);
          a.click();
        }, 'image/png');
      };
      img.src = url;
    } catch (err) {
      console.error('PNG export failed:', err);
      alert('이미지 내보내기 중 오류가 발생했습니다.');
    }
  }

  // 2. Export Session JSON
  exportJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.state.session, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `constellation-${this.state.roomId}-backup.json`);
    a.click();
  }

  // 3. Import Session JSON
  importJson(file, authority) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && parsed.schemaVersion === 1) {
          authority.dispatch({
            t: 'session.patch',
            patch: parsed
          });
          alert('세션 데이터를 성공적으로 불러왔습니다.');
        } else {
          alert('올바른 세션 JSON 파일 형식이 아닙니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  }

  // 4. Export Markdown Structured Coaching Report
  exportMarkdownReport() {
    const s = this.state.session;
    const dateStr = new Date().toLocaleString('ko-KR');

    let md = `# [세션 리포트] 1:1 테이블 컨스텔레이션 코칭 기록\n\n`;
    md += `> **세션 일시:** ${dateStr}  \n`;
    md += `> **룸 ID:** \`${s.roomId}\`  \n`;
    md += `> **진행 템플릿:** ${s.templateId}  \n\n`;

    md += `## 1. 코칭 주제 및 목표 질문\n`;
    md += `> "${s.topic || '자유 탐색'}"\n\n`;

    md += `## 2. 배치된 핵심 요소 및 관점 기록\n\n`;
    md += `| 피규어 라벨 | 형태 | 크기 | 위치(X,Y) | 시선 각도 | 상태/영역 |\n`;
    md += `|---|---|---|---|---|---|\n`;

    const figuresList = Object.values(s.figures);
    for (const fig of figuresList) {
      const zoneName = fig.zone === 'table' ? '테이블 위' : '보류 존(대기)';
      md += `| **${fig.label}** | ${fig.shape} | ${fig.size} | (${fig.x}, ${fig.y}) | ${fig.angle}° | ${zoneName} |\n`;
    }
    md += `\n`;

    md += `### 피규어별 관점 메모 (내면의 소리)\n\n`;
    let hasNotes = false;
    for (const fig of figuresList) {
      if (fig.perspectiveNote || (fig.tags && fig.tags.length > 0)) {
        hasNotes = true;
        md += `#### ✦ ${fig.label}\n`;
        if (fig.tags && fig.tags.length > 0) {
          md += `- **신체감각/감정 태그:** \`${fig.tags.join('`, `')}\`\n`;
        }
        if (fig.perspectiveNote) {
          md += `- **관점 메모:** "${fig.perspectiveNote}"\n`;
        }
        md += `\n`;
      }
    }
    if (!hasNotes) {
      md += `*작성된 관점 메모가 없습니다.*\n\n`;
    }

    md += `## 3. 세션 중 시도된 해결 문장 (Sentences)\n\n`;
    let sentenceCount = 0;
    for (const fig of figuresList) {
      if (fig.sentences && fig.sentences.length > 0) {
        for (const sent of fig.sentences) {
          sentenceCount++;
          md += `- **[${fig.label}를 향하여]** "${sent.text}"\n`;
        }
      }
    }
    if (sentenceCount === 0) {
      md += `*기록된 해결 문장이 없습니다.*\n\n`;
    }

    md += `## 4. 최종 해결 이미지 및 스냅샷\n`;
    md += `- 기록된 스냅샷 수: **${s.snapshots.length}개**\n`;
    s.snapshots.forEach((snap, idx) => {
      md += `  - [스냅샷 ${idx + 1}] ${snap.name} (${snap.at})\n`;
    });
    md += `\n`;

    md += `## 5. 일상에서의 실천 과제 (Commitment)\n`;
    md += `> "${s.commitment || '자유로운 일상 복귀 및 관찰'}"\n\n`;

    md += `---\n`;
    md += `*본 리포트는 개인정보 보호 원칙에 따라 서버에 저장되지 않고 사용자 로컬에 직접 생성되었습니다.*\n`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `table-constellation-report-${s.roomId}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  }
}
