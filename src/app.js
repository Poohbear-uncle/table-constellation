import { i18n } from './i18n/i18n.js';
import { PeerJsAdapter } from './sync/PeerJsAdapter.js';
import { SessionState } from './session/SessionState.js';
import { HostAuthority } from './session/HostAuthority.js';
import { BoardCanvas } from './board/BoardCanvas.js';
import { GuideController } from './guide/GuideController.js';
import { SafetyController } from './safety/SafetyController.js';
import { ExportManager } from './export/ExportManager.js';

export class App {
  constructor() {
    this.roomId = null;
    this.role = 'coach';
    this.sync = null;
    this.state = null;
    this.authority = null;
    this.board = null;
    this.guide = null;
    this.safety = null;
    this.exporter = null;
  }

  async init() {
    await i18n.init();
    this.parseRoute();

    this.state = new SessionState(this.roomId, this.role);
    this.sync = new PeerJsAdapter();
    this.authority = new HostAuthority(this.state, this.sync);
    this.exporter = new ExportManager(this.state);
    window.exportManager = this.exporter;

    this.sync.connect(this.roomId, this.role);

    this.renderLayout();

    const canvasContainer = document.getElementById('canvasMount');
    this.board = new BoardCanvas(canvasContainer, this.state, this.authority);

    const guideContainer = document.getElementById('guideMount');
    this.guide = new GuideController(guideContainer, this.state, this.authority);

    this.safety = new SafetyController(this.state, this.authority);

    this.bindTopBarEvents();
    this.bindPaletteEvents();
    this.bindInspectorEvents();
    this.bindTimelineEvents();
    this.bindMobileDrawerEvents();
    this.setupSyncStatusListener();
  }

  parseRoute() {
    const hash = window.location.hash || '';
    const match = hash.match(/#\/room\/([a-zA-Z0-9_-]+)/);

    if (match && match[1]) {
      this.roomId = match[1];
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
      this.role = params.get('role') === 'client' ? 'client' : 'coach';
    } else {
      this.roomId = Math.random().toString(36).substring(2, 9);
      this.role = 'coach';
      window.location.hash = `#/room/${this.roomId}`;
    }
  }

  renderLayout() {
    const appElem = document.getElementById('app');
    appElem.innerHTML = `
      <div class="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 antialiased select-none overflow-hidden relative">
        
        <!-- Mobile Orientation Tip (floating) -->
        <div id="orientationTip" class="fixed top-14 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white text-[11px] px-3.5 py-1.5 rounded-full shadow-2xl z-50 flex items-center space-x-2 md:hidden transition">
          <span>💡 스마트폰을 가로로 돌리면 테이블이 더 넓게 보입니다</span>
          <button onclick="document.getElementById('orientationTip').remove()" class="text-slate-400 hover:text-white font-bold text-sm ml-1">&times;</button>
        </div>

        <!-- ================= DESKTOP HEADER (hidden md:flex) ================= -->
        <header class="hidden md:flex bg-white border-b border-slate-200 shadow-2xs z-30 shrink-0 px-4 py-2 items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                TC
              </div>
              <div>
                <h1 class="font-bold text-sm text-slate-900 leading-tight">1:1 테이블 컨스텔레이션</h1>
                <p class="text-[10px] text-slate-500">Systemic & Constructionist Table Board</p>
              </div>
            </div>

            <!-- Role Badge -->
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${this.role === 'coach' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
              ${this.role === 'coach' ? '👑 코치 (호스트)' : '🌱 고객 (게스트)'}
            </span>

            <!-- Connection Status -->
            <div class="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" id="statusBadge">
              <span class="w-2 h-2 rounded-full bg-amber-500 animate-pulse" id="statusDot"></span>
              <span id="statusText">룸 연결 중...</span>
            </div>

            <!-- Room ID & Invite Copy -->
            <button id="btnCopyInvite" class="flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition">
              <span>📋 고객 초대 링크 복사</span>
            </button>
          </div>

          <!-- Center: Topic Input Bar -->
          <div class="flex-1 max-w-md mx-4">
            <div class="relative flex items-center">
              <span class="absolute left-3 text-slate-400 text-xs">🎯</span>
              <input type="text" id="topicInput" placeholder="오늘의 코칭 질문/주제를 한 문장으로 입력하세요..." 
                     class="w-full text-xs font-semibold pl-8 pr-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-none focus:bg-white focus:border-blue-500 transition"/>
            </div>
          </div>

          <!-- Right Action Controls -->
          <div class="flex items-center space-x-2">
            <select id="skinSelect" class="text-xs bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 font-medium text-slate-700 focus:outline-none">
              <option value="round_wood">🪵 원목 원형 테이블</option>
              <option value="square_areca">🌿 사각 아레카 테이블</option>
              <option value="plate_basic">⚪ 기본 원형 테이블</option>
              <option value="default">📐 미니멀 SVG 테이블</option>
            </select>

            <div class="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button id="btnUndo" class="p-1.5 text-slate-600 hover:text-slate-900 rounded" title="실행 취소">↶</button>
              <button id="btnRedo" class="p-1.5 text-slate-600 hover:text-slate-900 rounded" title="다시 실행">↷</button>
            </div>

            <button id="btnExportPng" class="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-2xs flex items-center space-x-1">
              <span>📷 PNG</span>
            </button>
            <button id="btnExportReport" class="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium shadow-2xs flex items-center space-x-1">
              <span>📝 리포트</span>
            </button>

            <button id="btnPause" class="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold transition flex items-center space-x-1">
              <span>⏸️ 일시정지</span>
            </button>
            <button id="btnFinishSession" class="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center space-x-1">
              <span>🕊️ 마무리</span>
            </button>
          </div>
        </header>

        <!-- ================= MOBILE HEADER (flex md:hidden) ================= -->
        <header class="flex md:hidden flex-col bg-white border-b border-slate-200 shadow-xs z-30 shrink-0 px-3 py-2 space-y-2">
          <!-- Row 1: Logo, Role, Status Dot, Copy, Finish -->
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-1.5">
              <div class="w-6 h-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">TC</div>
              <span class="font-bold text-xs text-slate-900">컨스텔레이션</span>
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-bold ${this.role === 'coach' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}">
                ${this.role === 'coach' ? '코치' : '고객'}
              </span>
            </div>

            <!-- Compact Status Badge -->
            <div class="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200" id="mobileStatusBadge">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" id="mobileStatusDot"></span>
              <span id="mobileStatusText">연결 대기</span>
            </div>

            <!-- Quick Action Icons -->
            <div class="flex items-center space-x-1">
              <button id="btnMobileCopyInvite" class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs" title="초대 링크 복사">📋</button>
              <button id="btnMobilePause" class="p-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs" title="일시정지">⏸️</button>
              <button id="btnMobileFinish" class="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shadow-xs">마무리</button>
            </div>
          </div>

          <!-- Row 2: Topic Input + Drawer Buttons -->
          <div class="flex items-center space-x-1.5">
            <div class="relative flex-1">
              <input type="text" id="mobileTopicInput" placeholder="코칭 주제를 입력하세요..." 
                     class="w-full text-xs font-semibold pl-2 pr-2 py-1 rounded-lg bg-slate-100 border border-slate-200 focus:outline-none focus:bg-white focus:border-blue-500"/>
            </div>
            <button id="btnTogglePaletteDrawer" class="px-2.5 py-1 bg-blue-600 text-white font-bold text-xs rounded-lg shadow-xs shrink-0 flex items-center space-x-1">
              <span>🎴 피규어</span>
            </button>
            <button id="btnToggleInspectorDrawer" class="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shrink-0 flex items-center space-x-1">
              <span>⚙️ 속성</span>
            </button>
            <button id="btnToggleTimelineDrawer" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shrink-0" title="스냅샷">
              <span>📸</span>
            </button>
          </div>
        </header>

        <!-- ================= MAIN WORKSPACE ================= -->
        <div class="flex-1 flex overflow-hidden relative w-full h-full">
          
          <!-- LEFT: Figure Palette (Desktop: Sidebar / Mobile: Drawer Modal) -->
          <div id="paletteBackdrop" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden"></div>
          <aside id="paletteDrawer" class="fixed md:static inset-y-0 left-0 z-50 md:z-20 w-72 md:w-64 bg-white border-r border-slate-200 shadow-2xl md:shadow-2xs flex flex-col shrink-0 transition-transform duration-300 -translate-x-full md:translate-x-0">
            <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 md:bg-white">
              <span class="font-bold text-xs text-slate-800">🎴 피규어 팔레트</span>
              <button id="btnClosePaletteDrawer" class="md:hidden text-slate-400 hover:text-slate-600 font-bold text-base p-1">&times;</button>
            </div>

            <!-- Tabs -->
            <div class="px-3 pt-2">
              <div class="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                <button id="paletteTabSvg" class="flex-1 py-1 rounded-md bg-white text-blue-700 shadow-2xs">추상 피규어</button>
                <button id="paletteTabImg" class="flex-1 py-1 rounded-md text-slate-600">구슬·크리스탈</button>
              </div>
            </div>

            <!-- Content -->
            <div class="flex-1 overflow-y-auto p-3 space-y-4">
              <div id="paletteSvgSection" class="space-y-3">
                <div class="grid grid-cols-3 gap-2">
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="person">
                    <span class="text-2xl mb-1">👤</span>
                    <span class="text-[11px] font-semibold text-slate-700">사람형</span>
                  </button>
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="circle">
                    <span class="text-2xl mb-1">🔘</span>
                    <span class="text-[11px] font-semibold text-slate-700">원형</span>
                  </button>
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="square">
                    <span class="text-2xl mb-1">⏹️</span>
                    <span class="text-[11px] font-semibold text-slate-700">사각형</span>
                  </button>
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="star">
                    <span class="text-2xl mb-1">⭐</span>
                    <span class="text-[11px] font-semibold text-slate-700">별(목표)</span>
                  </button>
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="diamond">
                    <span class="text-2xl mb-1">💎</span>
                    <span class="text-[11px] font-semibold text-slate-700">가치(자원)</span>
                  </button>
                  <button class="palette-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-shape="observer">
                    <span class="text-2xl mb-1">👁️</span>
                    <span class="text-[11px] font-semibold text-slate-700">관찰자</span>
                  </button>
                </div>
              </div>

              <div id="paletteImgSection" class="hidden grid grid-cols-3 gap-2">
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_ball_me.png" data-label="나(Me)">
                  <img src="./assets/figures/fig_ball_me.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">나(Me)</span>
                </button>
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_ball_01.png" data-label="구슬 1">
                  <img src="./assets/figures/fig_ball_01.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">구슬 1</span>
                </button>
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_ball_02.png" data-label="구슬 2">
                  <img src="./assets/figures/fig_ball_02.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">구슬 2</span>
                </button>
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_ball_03.png" data-label="구슬 3">
                  <img src="./assets/figures/fig_ball_03.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">구슬 3</span>
                </button>
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_crystal_red.png" data-label="레드 크리스탈">
                  <img src="./assets/figures/fig_crystal_red.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">크리스탈</span>
                </button>
                <button class="palette-img-item flex flex-col items-center p-2 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition" data-img="./assets/figures/fig_sphere_blue.png" data-label="블루 스피어">
                  <img src="./assets/figures/fig_sphere_blue.png" class="w-10 h-10 object-contain mb-1" />
                  <span class="text-[10px] font-bold text-slate-700">블루 구</span>
                </button>
              </div>

              <div class="pt-3 border-t border-slate-100 space-y-2">
                <span class="font-bold text-[11px] text-slate-500 block">보드 도구</span>
                <button id="btnToolLink" class="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition">
                  <span>↗️ 두 피규어 관계선 잇기</span>
                </button>
                <label class="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer pt-1">
                  <input type="checkbox" id="cbSnapGrid" class="rounded text-blue-600 focus:ring-blue-500 border-slate-300"/>
                  <span>격자 스냅 맞춤</span>
                </label>
              </div>
            </div>
          </aside>

          <!-- CENTER: 2D Interactive Board Canvas Mount (Always 100% full width and height!) -->
          <main class="flex-1 relative overflow-hidden bg-slate-100/60 w-full h-full" id="canvasMount">
          </main>

          <!-- RIGHT: Inspector (Desktop: Sidebar / Mobile: Drawer Modal) -->
          <div id="inspectorBackdrop" class="fixed inset-0 bg-slate-900/50 z-40 hidden md:hidden"></div>
          <aside id="inspectorDrawer" class="fixed md:static inset-y-0 right-0 z-50 md:z-20 w-80 bg-white border-l border-slate-200 shadow-2xl md:shadow-2xs flex flex-col shrink-0 transition-transform duration-300 translate-x-full md:translate-x-0">
            <div class="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50 md:bg-white">
              <span class="font-bold text-xs text-slate-800">선택된 피규어 속성</span>
              <div class="flex items-center space-x-2">
                <span id="inspectorFigId" class="font-mono text-[10px] text-slate-400">선택 없음</span>
                <button id="btnCloseInspectorDrawer" class="md:hidden text-slate-400 hover:text-slate-600 font-bold text-base p-1">&times;</button>
              </div>
            </div>

            <!-- Empty State -->
            <div id="inspectorEmptyState" class="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <span class="text-3xl mb-2">🎯</span>
              <p class="text-xs font-medium">테이블이나 보류 존의<br/>피규어를 클릭하세요.</p>
            </div>

            <!-- Active Form -->
            <div id="inspectorActiveState" class="hidden flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-700">
              <div>
                <label class="font-bold text-slate-800 block mb-1">피규어 이름 (최대 20자)</label>
                <input type="text" id="propLabel" maxlength="20" class="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500"/>
              </div>

              <div>
                <label class="font-bold text-slate-800 block mb-1">크기</label>
                <div class="flex items-center space-x-2">
                  <button class="prop-size-btn flex-1 py-1.5 rounded-lg border border-slate-200 font-bold" data-size="S">S (소)</button>
                  <button class="prop-size-btn flex-1 py-1.5 rounded-lg border border-slate-200 font-bold" data-size="M">M (중)</button>
                  <button class="prop-size-btn flex-1 py-1.5 rounded-lg border border-slate-200 font-bold" data-size="L">L (대)</button>
                </div>
              </div>

              <div>
                <label class="font-bold text-slate-800 block mb-1">색상</label>
                <div class="flex items-center space-x-2 flex-wrap gap-y-2" id="colorPaletteContainer"></div>
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="font-bold text-slate-800">시선 방향 (각도)</label>
                  <span id="propAngleVal" class="font-mono font-bold text-blue-600">0°</span>
                </div>
                <input type="range" id="propAngleRange" min="0" max="359" class="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg"/>
                <span class="text-[10px] text-slate-400">터치 슬라이더 또는 Q/E 키로 회전</span>
              </div>

              <div class="pt-2 border-t border-slate-100">
                <label class="font-bold text-slate-800 block mb-1">
                  👁️ 관점 메모 <span class="font-normal text-[11px] text-slate-500">(이 피규어의 시선)</span>
                </label>
                <textarea id="propPerspectiveNote" rows="3" placeholder="이 피규어의 자리에 서면 세상이 어떻게 보이고 무엇이 필요한가요?" 
                          class="w-full p-2.5 border border-slate-200 rounded-lg text-xs leading-relaxed focus:outline-none focus:border-blue-500"></textarea>
              </div>

              <div>
                <label class="font-bold text-slate-800 block mb-1">신체감각 / 감정 태그</label>
                <div class="flex flex-wrap gap-1 mb-2" id="tagsListContainer"></div>
                <div class="flex items-center space-x-1">
                  <input type="text" id="newTagInput" placeholder="새 태그..." class="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-xs"/>
                  <button id="btnAddTag" class="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-md">추가</button>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-100">
                <label class="font-bold text-slate-800 block mb-1">💬 시도해 본 해결 문장</label>
                <div class="space-y-1.5 mb-2" id="sentencesContainer"></div>
                <div class="flex items-center space-x-1">
                  <input type="text" id="newSentenceInput" placeholder="이 피규어를 향해 건넬 문장..." class="flex-1 px-2 py-1.5 border border-slate-200 rounded-md text-xs"/>
                  <button id="btnAddSentence" class="px-2.5 py-1.5 bg-blue-50 text-blue-700 font-bold rounded-md">등록</button>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button id="btnToggleZone" class="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition">
                  보류 존 이동
                </button>
                <button id="btnDeleteFig" class="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg transition">
                  삭제
                </button>
              </div>
            </div>
          </aside>

        </div>

        <!-- ================= DESKTOP BOTTOM TIMELINE (hidden md:flex) ================= -->
        <footer class="hidden md:flex bg-white border-t border-slate-200 px-4 py-2 items-center justify-between z-30 shrink-0 h-16">
          <div class="flex items-center space-x-2">
            <span class="font-bold text-xs text-slate-800">📸 스냅샷 타임라인</span>
            <button id="btnTakeSnapshot" class="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg border border-blue-200 flex items-center space-x-1">
              <span>+ 현재 배치 저장</span>
            </button>
          </div>

          <div class="flex-1 flex items-center space-x-2 overflow-x-auto px-4" id="snapshotStrip">
            <span class="text-xs text-slate-400 italic">저장된 스냅샷이 없습니다. 중요한 순간에 스냅샷을 남겨보세요.</span>
          </div>

          <div class="text-[11px] text-slate-400">
            <span>💡 휠: 줌 확대/축소 | Alt+드래그: 화면 이동</span>
          </div>
        </footer>

        <!-- Mobile Timeline Modal -->
        <div id="mobileTimelineModal" class="fixed inset-0 bg-slate-900/60 z-50 hidden flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-4 max-h-[70vh] flex flex-col">
            <div class="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <span class="font-bold text-xs text-slate-800">📸 스냅샷 타임라인</span>
              <button id="btnCloseMobileTimeline" class="text-slate-400 hover:text-slate-600 font-bold text-lg">&times;</button>
            </div>
            <button id="btnMobileTakeSnapshot" class="w-full py-2 mb-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs">
              + 현재 배치 스냅샷 저장
            </button>
            <div class="flex-1 overflow-y-auto space-y-2" id="mobileSnapshotList">
              <span class="text-xs text-slate-400 italic">저장된 스냅샷이 없습니다.</span>
            </div>
          </div>
        </div>

        <!-- Coach Guide Panel Mount (Floating) -->
        <div id="guideMount"></div>

      </div>
    `;
  }

  setupSyncStatusListener() {
    const badge = document.getElementById('statusBadge');
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');

    const mBadge = document.getElementById('mobileStatusBadge');
    const mDot = document.getElementById('mobileStatusDot');
    const mText = document.getElementById('mobileStatusText');

    this.sync.onStatusChange((status, msg) => {
      const updatePill = (b, d, t, isMobile) => {
        if (!b || !d || !t) return;
        t.textContent = isMobile ? (status === 'connected' ? '연결됨' : (status === 'waiting' ? '대기 중' : '재연결 중')) : (msg || status);

        switch (status) {
          case 'connected':
            b.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200';
            d.className = 'w-2 h-2 rounded-full bg-emerald-500';
            break;
          case 'waiting':
          case 'connecting':
          case 'reconnecting':
            b.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200';
            d.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
            break;
          case 'disconnected':
          case 'error':
            b.className = 'flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200';
            d.className = 'w-2 h-2 rounded-full bg-rose-500';
            break;
        }
      };

      updatePill(badge, dot, text, false);
      updatePill(mBadge, mDot, mText, true);
    });
  }

  bindMobileDrawerEvents() {
    const paletteDrawer = document.getElementById('paletteDrawer');
    const paletteBackdrop = document.getElementById('paletteBackdrop');
    const btnOpenPalette = document.getElementById('btnTogglePaletteDrawer');
    const btnClosePalette = document.getElementById('btnClosePaletteDrawer');

    const openPalette = () => {
      paletteDrawer.classList.remove('-translate-x-full');
      paletteBackdrop.classList.remove('hidden');
    };
    const closePalette = () => {
      paletteDrawer.classList.add('-translate-x-full');
      paletteBackdrop.classList.add('hidden');
    };

    btnOpenPalette?.addEventListener('click', openPalette);
    btnClosePalette?.addEventListener('click', closePalette);
    paletteBackdrop?.addEventListener('click', closePalette);

    paletteDrawer?.querySelectorAll('.palette-item, .palette-img-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.innerWidth < 768) closePalette();
      });
    });

    const inspectorDrawer = document.getElementById('inspectorDrawer');
    const inspectorBackdrop = document.getElementById('inspectorBackdrop');
    const btnOpenInspector = document.getElementById('btnToggleInspectorDrawer');
    const btnCloseInspector = document.getElementById('btnCloseInspectorDrawer');

    const openInspector = () => {
      inspectorDrawer.classList.remove('translate-x-full');
      inspectorBackdrop.classList.remove('hidden');
    };
    const closeInspector = () => {
      inspectorDrawer.classList.add('translate-x-full');
      inspectorBackdrop.classList.add('hidden');
    };

    btnOpenInspector?.addEventListener('click', openInspector);
    btnCloseInspector?.addEventListener('click', closeInspector);
    inspectorBackdrop?.addEventListener('click', closeInspector);

    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'select') {
        if (ui.selectedFigureId && window.innerWidth < 768) {
          openInspector();
        }
      }
    });

    const timelineModal = document.getElementById('mobileTimelineModal');
    const btnOpenTimeline = document.getElementById('btnToggleTimelineDrawer');
    const btnCloseTimeline = document.getElementById('btnCloseMobileTimeline');
    btnOpenTimeline?.addEventListener('click', () => timelineModal.classList.remove('hidden'));
    btnCloseTimeline?.addEventListener('click', () => timelineModal.classList.add('hidden'));

    document.getElementById('btnMobileCopyInvite')?.addEventListener('click', () => {
      const clientUrl = `${window.location.origin}${window.location.pathname}#/room/${this.roomId}?role=client`;
      navigator.clipboard.writeText(clientUrl).then(() => {
        alert(`고객 전용 초대 링크가 복사되었습니다:\n${clientUrl}`);
      });
    });

    document.getElementById('btnMobilePause')?.addEventListener('click', () => this.safety.showPause());
    document.getElementById('btnMobileFinish')?.addEventListener('click', () => this.safety.showDeroling());

    const mobileTopicInput = document.getElementById('mobileTopicInput');
    mobileTopicInput?.addEventListener('change', () => {
      this.authority.dispatch({
        t: 'session.patch',
        patch: { topic: mobileTopicInput.value }
      });
    });

    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'session') {
        if (mobileTopicInput && document.activeElement !== mobileTopicInput) {
          mobileTopicInput.value = session.topic || '';
        }
      }
    });
  }

  bindTopBarEvents() {
    document.getElementById('btnCopyInvite')?.addEventListener('click', () => {
      const clientUrl = `${window.location.origin}${window.location.pathname}#/room/${this.roomId}?role=client`;
      navigator.clipboard.writeText(clientUrl).then(() => {
        alert(`고객 전용 초대 링크가 복사되었습니다:\n${clientUrl}`);
      });
    });

    const topicInput = document.getElementById('topicInput');
    topicInput?.addEventListener('change', () => {
      this.authority.dispatch({
        t: 'session.patch',
        patch: { topic: topicInput.value }
      });
    });

    const skinSelect = document.getElementById('skinSelect');
    skinSelect?.addEventListener('change', () => {
      this.authority.dispatch({
        t: 'session.patch',
        patch: { tableSkin: skinSelect.value }
      });
    });

    document.getElementById('btnUndo')?.addEventListener('click', () => this.state.undo());
    document.getElementById('btnRedo')?.addEventListener('click', () => this.state.redo());

    document.getElementById('btnExportPng')?.addEventListener('click', () => this.exporter.exportPng());
    document.getElementById('btnExportReport')?.addEventListener('click', () => this.exporter.exportMarkdownReport());

    document.getElementById('btnPause')?.addEventListener('click', () => this.safety.showPause());
    document.getElementById('btnFinishSession')?.addEventListener('click', () => this.safety.showDeroling());

    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'session') {
        if (topicInput && document.activeElement !== topicInput) {
          topicInput.value = session.topic || '';
        }
        if (skinSelect) {
          skinSelect.value = session.tableSkin || 'round_wood';
        }
      }
    });
  }

  bindPaletteEvents() {
    const tabSvg = document.getElementById('paletteTabSvg');
    const tabImg = document.getElementById('paletteTabImg');
    const secSvg = document.getElementById('paletteSvgSection');
    const secImg = document.getElementById('paletteImgSection');

    tabSvg?.addEventListener('click', () => {
      tabSvg.className = 'flex-1 py-1 rounded-md bg-white text-blue-700 shadow-2xs';
      tabImg.className = 'flex-1 py-1 rounded-md text-slate-600';
      secSvg.classList.remove('hidden');
      secImg.classList.add('hidden');
    });

    tabImg?.addEventListener('click', () => {
      tabImg.className = 'flex-1 py-1 rounded-md bg-white text-blue-700 shadow-2xs';
      tabSvg.className = 'flex-1 py-1 rounded-md text-slate-600';
      secImg.classList.remove('hidden');
      secSvg.classList.add('hidden');
    });

    document.querySelectorAll('.palette-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const shape = btn.getAttribute('data-shape');
        const id = `fig-${Date.now()}`;
        const defaultNames = {
          person: '사람',
          circle: '요소',
          square: '상황',
          star: '목표',
          diamond: '자원',
          observer: '관찰자'
        };

        this.authority.dispatch({
          t: 'fig.add',
          fig: {
            id,
            label: defaultNames[shape] || '피규어',
            shape,
            color: '#3B82F6',
            size: 'M',
            x: 500,
            y: 430,
            angle: 0,
            zone: 'table',
            locked: false,
            perspectiveNote: '',
            tags: [],
            sentences: [],
            released: false,
            rev: 1
          }
        });
        this.state.setSelectedFigure(id);
      });
    });

    document.querySelectorAll('.palette-img-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const imgSrc = btn.getAttribute('data-img');
        const label = btn.getAttribute('data-label') || '구슬';
        const id = `fig-${Date.now()}`;

        this.authority.dispatch({
          t: 'fig.add',
          fig: {
            id,
            label,
            shape: 'image_custom',
            imageSrc: imgSrc,
            color: '#6366F1',
            size: 'M',
            x: 500,
            y: 430,
            angle: 0,
            zone: 'table',
            locked: false,
            perspectiveNote: '',
            tags: [],
            sentences: [],
            released: false,
            rev: 1
          }
        });
        this.state.setSelectedFigure(id);
      });
    });

    const btnToolLink = document.getElementById('btnToolLink');
    btnToolLink?.addEventListener('click', () => {
      if (this.state.ui.activeTool === 'link') {
        this.state.ui.activeTool = 'select';
        btnToolLink.className = 'w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition';
      } else {
        this.state.ui.activeTool = 'link';
        btnToolLink.className = 'w-full py-2 px-3 bg-blue-600 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow-sm';
      }
    });

    const cbSnapGrid = document.getElementById('cbSnapGrid');
    cbSnapGrid?.addEventListener('change', () => {
      if (this.board) this.board.snapToGrid = cbSnapGrid.checked;
    });
  }

  bindInspectorEvents() {
    const emptyState = document.getElementById('inspectorEmptyState');
    const activeState = document.getElementById('inspectorActiveState');
    const propId = document.getElementById('inspectorFigId');
    const propLabel = document.getElementById('propLabel');
    const propAngleRange = document.getElementById('propAngleRange');
    const propAngleVal = document.getElementById('propAngleVal');
    const propPerspectiveNote = document.getElementById('propPerspectiveNote');
    const colorContainer = document.getElementById('colorPaletteContainer');
    const tagsContainer = document.getElementById('tagsListContainer');
    const sentencesContainer = document.getElementById('sentencesContainer');
    const btnToggleZone = document.getElementById('btnToggleZone');
    const btnDeleteFig = document.getElementById('btnDeleteFig');

    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#475569'];
    colorContainer.innerHTML = colors.map(c => `
      <button class="w-7 h-7 rounded-full border-2 border-white shadow-2xs hover:scale-110 transition color-chip" data-color="${c}" style="background-color: ${c}"></button>
    `).join('');

    const updateInspector = () => {
      const fig = this.state.getSelectedFigure();
      if (!fig) {
        emptyState.classList.remove('hidden');
        activeState.classList.add('hidden');
        propId.textContent = '선택 없음';
        return;
      }

      emptyState.classList.add('hidden');
      activeState.classList.remove('hidden');
      propId.textContent = `#${fig.id}`;
      propLabel.value = fig.label || '';
      propAngleRange.value = fig.angle || 0;
      propAngleVal.textContent = `${fig.angle || 0}°`;
      propPerspectiveNote.value = fig.perspectiveNote || '';
      btnToggleZone.textContent = fig.zone === 'table' ? '보류 존으로 내리기' : '테이블로 올리기';

      document.querySelectorAll('.prop-size-btn').forEach(b => {
        if (b.getAttribute('data-size') === fig.size) {
          b.className = 'prop-size-btn flex-1 py-1.5 rounded-lg border border-blue-500 bg-blue-50 text-blue-700 font-bold';
        } else {
          b.className = 'prop-size-btn flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-bold';
        }
      });

      tagsContainer.innerHTML = (fig.tags || []).map((t, idx) => `
        <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
          ${t}
          <button class="ml-1 text-slate-400 hover:text-rose-500" data-remove-tag="${idx}">&times;</button>
        </span>
      `).join('');

      sentencesContainer.innerHTML = (fig.sentences || []).map((s, idx) => `
        <div class="p-2 bg-blue-50/50 border border-blue-100 rounded-lg text-slate-800 text-[11px] flex items-center justify-between">
          <span>"${s.text}"</span>
          <button class="text-slate-400 hover:text-rose-500 font-bold" data-remove-sentence="${idx}">&times;</button>
        </div>
      `).join('');
    };

    propLabel?.addEventListener('input', () => {
      const fig = this.state.getSelectedFigure();
      if (fig) {
        this.authority.dispatch({
          t: 'fig.patch',
          id: fig.id,
          patch: { label: propLabel.value }
        });
      }
    });

    propAngleRange?.addEventListener('input', () => {
      const fig = this.state.getSelectedFigure();
      if (fig) {
        const val = parseInt(propAngleRange.value, 10);
        propAngleVal.textContent = `${val}°`;
        this.authority.dispatch({
          t: 'fig.move',
          id: fig.id,
          x: fig.x,
          y: fig.y,
          angle: val
        });
      }
    });

    document.querySelectorAll('.prop-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const fig = this.state.getSelectedFigure();
        if (fig) {
          this.authority.dispatch({
            t: 'fig.patch',
            id: fig.id,
            patch: { size: btn.getAttribute('data-size') }
          });
        }
      });
    });

    colorContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.color-chip');
      if (chip) {
        const fig = this.state.getSelectedFigure();
        if (fig) {
          this.authority.dispatch({
            t: 'fig.patch',
            id: fig.id,
            patch: { color: chip.getAttribute('data-color') }
          });
        }
      }
    });

    propPerspectiveNote?.addEventListener('change', () => {
      const fig = this.state.getSelectedFigure();
      if (fig) {
        this.authority.dispatch({
          t: 'fig.patch',
          id: fig.id,
          patch: { perspectiveNote: propPerspectiveNote.value }
        });
      }
    });

    document.getElementById('btnAddTag')?.addEventListener('click', () => {
      const input = document.getElementById('newTagInput');
      const val = input.value.trim();
      const fig = this.state.getSelectedFigure();
      if (val && fig) {
        const tags = [...(fig.tags || []), val];
        this.authority.dispatch({
          t: 'fig.patch',
          id: fig.id,
          patch: { tags }
        });
        input.value = '';
      }
    });

    tagsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-tag]');
      if (btn) {
        const idx = parseInt(btn.getAttribute('data-remove-tag'), 10);
        const fig = this.state.getSelectedFigure();
        if (fig && fig.tags) {
          const tags = fig.tags.filter((_, i) => i !== idx);
          this.authority.dispatch({
            t: 'fig.patch',
            id: fig.id,
            patch: { tags }
          });
        }
      }
    });

    document.getElementById('btnAddSentence')?.addEventListener('click', () => {
      const input = document.getElementById('newSentenceInput');
      const val = input.value.trim();
      const fig = this.state.getSelectedFigure();
      if (val && fig) {
        const sentences = [...(fig.sentences || []), { id: `sent-${Date.now()}`, text: val, by: this.role }];
        this.authority.dispatch({
          t: 'fig.patch',
          id: fig.id,
          patch: { sentences }
        });
        input.value = '';
      }
    });

    sentencesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-sentence]');
      if (btn) {
        const idx = parseInt(btn.getAttribute('data-remove-sentence'), 10);
        const fig = this.state.getSelectedFigure();
        if (fig && fig.sentences) {
          const sentences = fig.sentences.filter((_, i) => i !== idx);
          this.authority.dispatch({
            t: 'fig.patch',
            id: fig.id,
            patch: { sentences }
          });
        }
      }
    });

    btnToggleZone?.addEventListener('click', () => {
      const fig = this.state.getSelectedFigure();
      if (fig) {
        const newZone = fig.zone === 'table' ? 'waiting' : 'table';
        const newY = newZone === 'waiting' ? 880 : 430;
        this.authority.dispatch({
          t: 'fig.move',
          id: fig.id,
          x: fig.x,
          y: newY,
          angle: fig.angle,
          zone: newZone
        });
      }
    });

    btnDeleteFig?.addEventListener('click', () => {
      const fig = this.state.getSelectedFigure();
      if (fig && confirm(`'${fig.label}' 피규어를 보드에서 삭제하시겠습니까?`)) {
        this.authority.dispatch({
          t: 'fig.remove',
          id: fig.id
        });
      }
    });

    this.state.subscribe(() => {
      updateInspector();
    });
  }

  bindTimelineEvents() {
    const strip = document.getElementById('snapshotStrip');
    const mList = document.getElementById('mobileSnapshotList');
    const btnTake = document.getElementById('btnTakeSnapshot');
    const btnMobileTake = document.getElementById('btnMobileTakeSnapshot');

    const updateTimeline = () => {
      const snaps = this.state.session.snapshots || [];
      if (snaps.length === 0) {
        if (strip) strip.innerHTML = `<span class="text-xs text-slate-400 italic">저장된 스냅샷이 없습니다. 중요한 순간에 스냅샷을 남겨보세요.</span>`;
        if (mList) mList.innerHTML = `<span class="text-xs text-slate-400 italic">저장된 스냅샷이 없습니다.</span>`;
        return;
      }

      const html = snaps.map((s, idx) => `
        <div class="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl cursor-pointer shrink-0 transition flex items-center space-x-2" data-snapshot-idx="${idx}">
          <div class="w-2 h-2 rounded-full bg-blue-500"></div>
          <div>
            <span class="font-bold text-xs text-slate-800 block">${s.name}</span>
            <span class="font-mono text-[9px] text-slate-400">${s.at.slice(11, 19)}</span>
          </div>
        </div>
      `).join('');

      if (strip) strip.innerHTML = html;
      if (mList) mList.innerHTML = html;
    };

    const takeSnap = () => {
      const defaultName = `스냅샷 ${this.state.session.snapshots.length + 1}`;
      const name = prompt('스냅샷 이름을 입력하세요:', defaultName);
      if (name) {
        this.authority.dispatch({
          t: 'snap.add',
          snap: {
            id: `snap-${Date.now()}`,
            name,
            at: new Date().toISOString(),
            stage: this.state.session.stage,
            figures: JSON.parse(JSON.stringify(this.state.session.figures)),
            links: JSON.parse(JSON.stringify(this.state.session.links))
          }
        });
      }
    };

    btnTake?.addEventListener('click', takeSnap);
    btnMobileTake?.addEventListener('click', takeSnap);

    const handleRestore = (e) => {
      const item = e.target.closest('[data-snapshot-idx]');
      if (item) {
        const idx = parseInt(item.getAttribute('data-snapshot-idx'), 10);
        const snap = this.state.session.snapshots[idx];
        if (snap && confirm(`[${snap.name}] 스냅샷 상태로 보드를 되돌리시겠습니까?`)) {
          this.authority.dispatch({
            t: 'session.patch',
            patch: {
              figures: JSON.parse(JSON.stringify(snap.figures)),
              links: JSON.parse(JSON.stringify(snap.links))
            }
          });
          document.getElementById('mobileTimelineModal')?.classList.add('hidden');
        }
      }
    };

    strip?.addEventListener('click', handleRestore);
    mList?.addEventListener('click', handleRestore);

    this.state.subscribe((session, ui, changeType) => {
      if (changeType === 'snapshots') {
        updateTimeline();
      }
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
