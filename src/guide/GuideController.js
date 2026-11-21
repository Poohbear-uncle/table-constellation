// Coach Exclusive Guide Controller
export class GuideController {
  constructor(containerElem, sessionState, hostAuthority) {
    this.container = containerElem;
    this.state = sessionState;
    this.authority = hostAuthority;
    this.stages = [];
    this.questions = {};
    this.templates = [];

    // CRITICAL: If not coach, do NOT render any DOM at all!
    if (this.state.role !== 'coach') {
      console.log("[GuideController] Client role detected. Coach guide panel NOT mounted.");
      return;
    }

    this.init();
  }

  async init() {
    try {
      const [stagesRes, qRes, tRes] = await Promise.all([
        fetch('./src/guide/stages.json').then(r => r.json()),
        fetch('./src/guide/questions.json').then(r => r.json()),
        fetch('./src/guide/templates.json').then(r => r.json())
      ]);
      this.stages = stagesRes;
      this.questions = qRes;
      this.templates = tRes;
    } catch (e) {
      console.warn("Failed to load guide JSON files:", e);
    }

    this.render();
    this.bindEvents();

    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'session') {
        this.updateStageDisplay();
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div id="coachGuidePanel" class="fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-blue-200 w-96 overflow-hidden flex flex-col transition-all duration-300">
        <!-- Header -->
        <div class="px-4 py-2.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between cursor-pointer select-none" id="guideHeader">
          <div class="flex items-center space-x-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="font-bold text-xs">🎓 코치 전용 가이드 & 질문 은행</span>
          </div>
          <button id="guideToggleBtn" class="text-white/80 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded">
            ▼
          </button>
        </div>

        <!-- Body -->
        <div id="guideBody" class="flex flex-col max-h-[480px] overflow-y-auto p-4 space-y-3 text-xs text-slate-700">
          
          <!-- Current Stage Card -->
          <div class="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
            <div class="flex items-center justify-between mb-1">
              <span id="guideStageBadge" class="font-bold text-blue-700 text-xs">단계 ③ 첫 배치</span>
              <span id="guideStageTime" class="text-[11px] font-semibold text-slate-500">⏱ 권장 10분</span>
            </div>
            <p id="guideStageDesc" class="text-slate-600 mb-2 leading-relaxed">
              고객이 생각으로 판단하지 않고 손이 가는 대로 피규어를 배치하도록 격려합니다.
            </p>
            <div class="bg-white p-2.5 rounded-lg border border-blue-100 shadow-2xs">
              <span class="font-bold text-blue-600 block mb-1">💬 코치 핵심 질문:</span>
              <p id="guideKeyQuestion" class="italic text-slate-800 font-medium">
                "생각하지 마시고, 손이 닿는 느낌대로 직관적으로 놓아 보세요."
              </p>
            </div>
            <!-- Stage Stepper Buttons -->
            <div class="flex items-center justify-between mt-3 pt-2 border-t border-blue-100">
              <button id="btnPrevStage" class="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 shadow-2xs">
                ◂ 이전
              </button>
              <span id="guideStageStepText" class="font-mono font-bold text-slate-500 text-[11px]">3 / 8</span>
              <button id="btnNextStage" class="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs">
                다음 단계 ▸
              </button>
            </div>
          </div>

          <!-- Tabs: Questions / Orders / Interventions / Templates -->
          <div class="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
            <button class="guide-tab-btn flex-1 py-1 rounded-md bg-white text-blue-700 shadow-2xs" data-tab="questions">질문 은행</button>
            <button class="guide-tab-btn flex-1 py-1 rounded-md text-slate-600" data-tab="orders">질서 렌즈</button>
            <button class="guide-tab-btn flex-1 py-1 rounded-md text-slate-600" data-tab="interventions">개입 기법</button>
            <button class="guide-tab-btn flex-1 py-1 rounded-md text-slate-600" data-tab="templates">템플릿</button>
          </div>

          <!-- Tab Content Area -->
          <div id="guideTabContent" class="space-y-2">
            <!-- Rendered dynamically -->
          </div>

        </div>
      </div>
    `;

    this.updateStageDisplay();
    this.renderTabContent('questions');
  }

  updateStageDisplay() {
    const curStageIdx = this.state.session.stage || 0;
    const stageData = this.stages[curStageIdx] || this.stages[0];
    if (!stageData) return;

    const badge = this.container.querySelector('#guideStageBadge');
    const time = this.container.querySelector('#guideStageTime');
    const desc = this.container.querySelector('#guideStageDesc');
    const keyQ = this.container.querySelector('#guideKeyQuestion');
    const stepText = this.container.querySelector('#guideStageStepText');

    if (badge) badge.textContent = `단계 [${stageData.stage}] ${stageData.name}`;
    if (time) time.textContent = `⏱ 권장 ${stageData.time}`;
    if (desc) desc.textContent = stageData.desc;
    if (keyQ) keyQ.textContent = `"${stageData.keyQuestion}"`;
    if (stepText) stepText.textContent = `${curStageIdx} / ${this.stages.length - 1}`;
  }

  renderTabContent(tabName) {
    const container = this.container.querySelector('#guideTabContent');
    if (!container) return;

    if (tabName === 'questions') {
      const q = this.questions.questionsByAspect || {};
      container.innerHTML = `
        <div class="space-y-2">
          <div class="border border-slate-200 rounded-lg p-2 bg-slate-50">
            <span class="font-bold text-slate-800 block mb-1">📏 거리(Distance) 질문</span>
            <ul class="list-disc list-inside space-y-1 text-slate-600">
              ${(q.distance || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div class="border border-slate-200 rounded-lg p-2 bg-slate-50">
            <span class="font-bold text-slate-800 block mb-1">👀 시선(Gaze) 질문</span>
            <ul class="list-disc list-inside space-y-1 text-slate-600">
              ${(q.gaze || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
          <div class="border border-slate-200 rounded-lg p-2 bg-slate-50">
            <span class="font-bold text-slate-800 block mb-1">👥 군집과 빈자리</span>
            <ul class="list-disc list-inside space-y-1 text-slate-600">
              ${(q.emptySpace || []).map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } else if (tabName === 'orders') {
      const l = this.questions.lensesOfOrder || {};
      container.innerHTML = `
        <div class="space-y-2">
          <div class="border border-amber-200 bg-amber-50/50 rounded-lg p-2">
            <span class="font-bold text-amber-800 block mb-1">1. 소속(Belonging)의 렌즈</span>
            <p class="text-amber-900">${(l.belonging || [])[0] || ''}</p>
          </div>
          <div class="border border-emerald-200 bg-emerald-50/50 rounded-lg p-2">
            <span class="font-bold text-emerald-800 block mb-1">2. 균형(Balance)의 렌즈</span>
            <p class="text-emerald-900">${(l.balance || [])[0] || ''}</p>
          </div>
          <div class="border border-indigo-200 bg-indigo-50/50 rounded-lg p-2">
            <span class="font-bold text-indigo-800 block mb-1">3. 순서와 위계(Order)의 렌즈</span>
            <p class="text-indigo-900">${(l.order || [])[0] || ''}</p>
          </div>
        </div>
      `;
    } else if (tabName === 'interventions') {
      const items = this.questions.interventions || [];
      container.innerHTML = `
        <div class="space-y-2">
          ${items.map(it => `
            <div class="border border-slate-200 rounded-lg p-2 bg-white shadow-2xs">
              <span class="font-bold text-blue-700 block mb-0.5">✦ ${it.title}</span>
              <p class="text-slate-600 leading-relaxed">${it.guide}</p>
            </div>
          `).join('')}
        </div>
      `;
    } else if (tabName === 'templates') {
      container.innerHTML = `
        <div class="space-y-2">
          <p class="text-slate-500 text-[11px]">주제에 맞는 템플릿을 선택하면 보드에 요소가 자동 배치됩니다.</p>
          ${this.templates.map(tpl => `
            <div class="border border-slate-200 hover:border-blue-400 p-2 rounded-lg bg-white cursor-pointer transition" data-template-id="${tpl.id}">
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-slate-800">${tpl.title}</span>
                <span class="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">${tpl.elements.length}개 요소</span>
              </div>
              <p class="text-slate-500 text-[11px]">${tpl.description}</p>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  bindEvents() {
    const toggleBtn = this.container.querySelector('#guideToggleBtn');
    const header = this.container.querySelector('#guideHeader');
    const body = this.container.querySelector('#guideBody');

    const toggle = () => {
      body.classList.toggle('hidden');
      toggleBtn.textContent = body.classList.contains('hidden') ? '▲' : '▼';
    };

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggle();
    });
    header.addEventListener('click', toggle);

    // Stage Next/Prev
    this.container.querySelector('#btnNextStage')?.addEventListener('click', () => {
      const cur = this.state.session.stage || 0;
      if (cur < this.stages.length - 1) {
        this.authority.dispatch({
          t: 'session.patch',
          patch: { stage: cur + 1 }
        });
      }
    });

    this.container.querySelector('#btnPrevStage')?.addEventListener('click', () => {
      const cur = this.state.session.stage || 0;
      if (cur > 0) {
        this.authority.dispatch({
          t: 'session.patch',
          patch: { stage: cur - 1 }
        });
      }
    });

    // Tab buttons
    this.container.querySelectorAll('.guide-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('.guide-tab-btn').forEach(b => {
          b.classList.remove('bg-white', 'text-blue-700', 'shadow-2xs');
          b.classList.add('text-slate-600');
        });
        btn.classList.add('bg-white', 'text-blue-700', 'shadow-2xs');
        btn.classList.remove('text-slate-600');
        this.renderTabContent(btn.getAttribute('data-tab'));
      });
    });

    // Template item click delegation
    this.container.addEventListener('click', (e) => {
      const tplItem = e.target.closest('[data-template-id]');
      if (tplItem) {
        const tplId = tplItem.getAttribute('data-template-id');
        const tpl = this.templates.find(t => t.id === tplId);
        if (tpl && confirm(`'${tpl.title}' 템플릿을 보드에 불러오시겠습니까? 기존 배치는 초기화됩니다.`)) {
          const newFigs = {};
          tpl.elements.forEach((el, idx) => {
            const id = `fig-${Date.now()}-${idx}`;
            newFigs[id] = {
              id,
              label: el.label,
              shape: el.shape || 'circle',
              color: el.color || '#3B82F6',
              size: el.size || 'M',
              x: el.x,
              y: el.y,
              angle: el.angle || 0,
              zone: el.zone || 'table',
              locked: false,
              perspectiveNote: '',
              tags: [],
              sentences: [],
              released: false,
              rev: 1
            };
          });

          this.authority.dispatch({
            t: 'session.patch',
            patch: {
              templateId: tplId,
              figures: newFigs,
              links: {}
            }
          });
        }
      }
    });
  }
}
