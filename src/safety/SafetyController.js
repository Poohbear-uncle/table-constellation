// Safety & Ethics Protocols (Spec 3.4 F1 ~ F5)
export class SafetyController {
  constructor(sessionState, hostAuthority) {
    this.state = sessionState;
    this.authority = hostAuthority;
    this.initModals();
    this.bindEvents();
  }

  initModals() {
    // 1. Consent Modal
    const consentContainer = document.createElement('div');
    consentContainer.id = 'consentModalOverlay';
    consentContainer.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4';
    consentContainer.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center space-x-2 pb-3 border-b border-slate-100">
          <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base">
            🛡️
          </div>
          <div>
            <h2 class="font-bold text-slate-900 text-base">1:1 테이블 컨스텔레이션 안전 동의</h2>
            <p class="text-[11px] text-slate-500">안전하고 존중받는 세션을 위한 기본 원칙</p>
          </div>
        </div>

        <div class="py-4 space-y-3 text-xs text-slate-600 leading-relaxed">
          <div class="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <p class="font-semibold text-blue-900 mb-1">1. 코칭 전문 도구 안내</p>
            <p>본 시스템은 내면의 관계 구조를 시각화하는 코칭 도구이며, 의료적 심리치료나 정신과적 진단을 대신하지 않습니다.</p>
          </div>

          <div class="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
            <p class="font-semibold text-amber-900 mb-1">2. 언제든 멈출 권리 (일시정지)</p>
            <p>작업 도중 마음에 긴장이나 불편감이 올라올 경우 언제든지 상단의 [일시정지] 버튼을 눌러 작업을 멈추거나 중단할 수 있습니다.</p>
          </div>

          <div class="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <p class="font-semibold text-emerald-900 mb-1">3. 철저한 비밀 보장 (P2P)</p>
            <p>두 분의 브라우저 사이에 암호화된 직접 통신으로만 연결되며, 서버에 어떠한 세션 데이터나 개인정보도 저장되지 않습니다.</p>
          </div>

          <div class="p-2.5 bg-rose-50/50 rounded-xl border border-rose-100 text-[11px] text-rose-800">
            <span class="font-bold">⚠️ 위기 지원 안내:</span> 극심한 정서적 위기나 자해 생각이 있으신 경우 작업을 중단하고 즉시 전문 상담전화(<span class="font-bold underline">109</span> 또는 <span class="font-bold underline">1577-0199</span>)로 도움을 요청하세요.
          </div>
        </div>

        <div class="pt-3 border-t border-slate-100 flex flex-col space-y-3">
          <label class="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer select-none">
            <input type="checkbox" id="consentCheckbox" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"/>
            <span>위 안내 사항을 모두 확인하였으며, 이에 동의합니다.</span>
          </label>
          <button id="btnEnterSession" disabled class="w-full py-2.5 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl transition cursor-not-allowed">
            보드 입장하기
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(consentContainer);

    // 2. Pause Overlay
    const pauseContainer = document.createElement('div');
    pauseContainer.id = 'pauseModalOverlay';
    pauseContainer.className = 'fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 hidden';
    pauseContainer.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div class="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-4 animate-pulse">
          ⏸️
        </div>
        <h3 class="font-bold text-slate-900 text-lg mb-2">세션이 일시정지되었습니다</h3>
        <p class="text-xs text-slate-600 mb-6 leading-relaxed">
          잠시 호흡을 고르고 마음을 편안히 가다듬는 시간입니다.<br/>
          발바닥의 감각을 느끼며 세 번 천천히 깊은 호흡을 쉬어 보세요.
        </p>
        <button id="btnResumeSession" class="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition">
          작업 계속하기
        </button>
      </div>
    `;
    document.body.appendChild(pauseContainer);

    // 3. De-roling Wizard Modal
    const derolingContainer = document.createElement('div');
    derolingContainer.id = 'derolingModalOverlay';
    derolingContainer.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 hidden';
    derolingContainer.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div class="flex items-center space-x-2">
            <span class="text-xl">🕊️</span>
            <h3 class="font-bold text-slate-900 text-sm">역할 해제(De-roling) 및 그라운딩 의식</h3>
          </div>
          <button id="btnCloseDeroling" class="text-slate-400 hover:text-slate-600 text-lg">&times;</button>
        </div>

        <div class="space-y-4 text-xs text-slate-700" id="derolingWizardBody">
          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span class="font-bold text-blue-700 block mb-1">1단계: 상징적 도구로 되돌리기</span>
            <p class="text-slate-600 leading-relaxed mb-3">
              테이블 위의 피규어들은 고객님의 내면을 비추어 준 소중한 도구였습니다.<br/>
              이제 투사되었던 역할에서 벗어나 단순한 사물로 돌아갑니다.
            </p>
            <button id="btnReleaseAllFigures" class="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold rounded-lg transition">
              ✨ 모든 피규어 역할 해제 및 보류 존 이동
            </button>
          </div>

          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span class="font-bold text-emerald-700 block mb-1">2단계: 현실 그라운딩 (Grounding)</span>
            <ul class="list-disc list-inside space-y-1 text-slate-600">
              <li>발바닥이 바닥에 닿아 있는 단단한 감각을 느껴봅니다.</li>
              <li>깊은 호흡을 세 번 천천히 들이쉬고 내쉽니다.</li>
              <li>지금 방 안에서 보이는 사물 3가지의 이름을 속으로 불러봅니다.</li>
            </ul>
          </div>

          <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span class="font-bold text-indigo-700 block mb-1">3단계: 내일의 가장 작은 실천 과제</span>
            <textarea id="derolingCommitmentInput" rows="2" placeholder="오늘 발견한 통찰을 바탕으로 내일 시도할 작은 행동 하나를 적어보세요..." 
                      class="w-full mt-1.5 p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-indigo-500"></textarea>
          </div>
        </div>

        <div class="pt-4 mt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
          <button id="btnCompleteDeroling" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md transition">
            마무리 및 리포트 저장
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(derolingContainer);

    // 4. Crisis Modal
    const crisisContainer = document.createElement('div');
    crisisContainer.id = 'crisisModalOverlay';
    crisisContainer.className = 'fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 hidden';
    crisisContainer.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-200">
        <div class="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto mb-3">
          📞
        </div>
        <h3 class="font-bold text-slate-900 text-base mb-2">위기 상담 및 긴급 지원</h3>
        <p class="text-xs text-slate-600 mb-4 leading-relaxed">
          혼자 감당하기 어려운 마음의 고통이 있다면 24시간 언제든 전문가의 도움을 받으실 수 있습니다.
        </p>
        <div class="space-y-2 text-xs mb-5">
          <div class="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
            <span class="font-bold text-rose-900">자살예방 상담전화</span>
            <a href="tel:109" class="font-mono font-bold text-rose-600 bg-white px-2 py-0.5 rounded border border-rose-200">109</a>
          </div>
          <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
            <span class="font-bold text-blue-900">정신건강 위기상담전화</span>
            <a href="tel:1577-0199" class="font-mono font-bold text-blue-600 bg-white px-2 py-0.5 rounded border border-blue-200">1577-0199</a>
          </div>
        </div>
        <button id="btnCloseCrisis" class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition">
          닫기
        </button>
      </div>
    `;
    document.body.appendChild(crisisContainer);
  }

  bindEvents() {
    // Consent Agreement
    const consentCb = document.getElementById('consentCheckbox');
    const enterBtn = document.getElementById('btnEnterSession');
    const consentModal = document.getElementById('consentModalOverlay');

    consentCb?.addEventListener('change', () => {
      if (consentCb.checked) {
        enterBtn.disabled = false;
        enterBtn.className = 'w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer';
      } else {
        enterBtn.disabled = true;
        enterBtn.className = 'w-full py-2.5 bg-slate-300 text-slate-500 font-bold text-xs rounded-xl transition cursor-not-allowed';
      }
    });

    enterBtn?.addEventListener('click', () => {
      consentModal.classList.add('hidden');
      const role = this.state.role;
      const patchConsent = { ...this.state.session.consent, [role]: true };
      this.authority.dispatch({
        t: 'session.patch',
        patch: { consent: patchConsent }
      });
    });

    // Pause Resume
    const pauseModal = document.getElementById('pauseModalOverlay');
    const resumeBtn = document.getElementById('btnResumeSession');
    resumeBtn?.addEventListener('click', () => {
      this.authority.dispatch({
        t: 'session.patch',
        patch: { paused: false }
      });
    });

    // Deroling Close & Release All
    const derolingModal = document.getElementById('derolingModalOverlay');
    document.getElementById('btnCloseDeroling')?.addEventListener('click', () => {
      derolingModal.classList.add('hidden');
    });

    document.getElementById('btnReleaseAllFigures')?.addEventListener('click', () => {
      const figs = this.state.session.figures;
      for (const [id, f] of Object.entries(figs)) {
        this.authority.dispatch({
          t: 'fig.patch',
          id,
          patch: { released: true, zone: 'waiting', y: 880 }
        });
      }
      alert('모든 피규어의 역할이 해제되어 보류 존으로 이동했습니다.');
    });

    document.getElementById('btnCompleteDeroling')?.addEventListener('click', () => {
      const commitment = document.getElementById('derolingCommitmentInput').value;
      if (commitment) {
        this.authority.dispatch({
          t: 'session.patch',
          patch: { commitment }
        });
      }
      derolingModal.classList.add('hidden');
      // Trigger report download
      if (window.exportManager) {
        window.exportManager.exportMarkdownReport();
      }
    });

    // Crisis Close
    const crisisModal = document.getElementById('crisisModalOverlay');
    document.getElementById('btnCloseCrisis')?.addEventListener('click', () => {
      crisisModal.classList.add('hidden');
    });

    // Listen to session state for pause toggle
    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'session') {
        if (session.paused) {
          pauseModal.classList.remove('hidden');
        } else {
          pauseModal.classList.add('hidden');
        }
      }
    });
  }

  showPause() {
    this.authority.dispatch({
      t: 'session.patch',
      patch: { paused: true }
    });
  }

  showDeroling() {
    document.getElementById('derolingModalOverlay').classList.remove('hidden');
  }

  showCrisis() {
    document.getElementById('crisisModalOverlay').classList.remove('hidden');
  }
}
