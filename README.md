# 1:1 테이블 컨스텔레이션 (Table Constellation)

> **사회구성주의 코칭(Social Constructionism) & 체계적 컨스텔레이션(Systemic Constellation) 인터랙티브 웹 캔버스**

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![GitHub Pages](https://img.shields.io/badge/Deployment-GitHub%20Pages-success.svg)
![P2P Realtime](https://img.shields.io/badge/P2P-PeerJS%20WebRTC-indigo.svg)

---

## 🌟 프로젝트 소개

코치와 고객이 1:1로 원격 브라우저에서 만나 디지털 테이블 위에 피규어를 배치·회전·관찰하며 내면의 관계 구조를 탐색하는 **1:1 테이블 컨스텔레이션 코칭 웹 시스템**입니다.

- **서버/DB 없는 Privacy by Design**: 브라우저 간 WebRTC DataChannel(P2P) 직접 통신으로 세션 데이터가 서버에 저장되지 않습니다.
- **고객 주도권 보장**: 피규어 이동 및 배치의 주도권은 100% 고객에게 있습니다.
- **코치 전용 가이드 패널**: 0~8단계 진행 표시줄, 현상학적 관찰 질문 은행(거리, 시선, 군집, 빈자리), 사랑의 질서 렌즈, 개입 기법 7종, 템플릿 7종 내장 (고객 화면 DOM 원천 격리).
- **피규어 렌더링 하이브리드 지원**: SVG 추상 피규어(인체형, 원형, 사각형, 별, 다이아몬드, 관찰자) 및 3D 원목 플레이트/구슬 스킨 지원.
- **철저한 안전 윤리 장치**: 사전 동의 모달, 원클릭 일시정지(휴식 오버레이), 역할 해제(De-roling) 마법사 및 현실 그라운딩, 위기 지원 안내(109 / 1577-0199).
- **보고서 내보내기**: SVG 고해상도 PNG 캡처, JSON 백업/복원, Markdown 종합 세션 리포트 다운로드.

---

## 🚀 빠른 시작

### 1. 로컬에서 실행하기
본 저장소를 다운로드한 후, 브라우저(Chrome, Edge 등)에서 `index.html`을 더블클릭하면 즉시 실행됩니다. (별도의 npm 빌드 불필요)

### 2. 온라인 사용 (GitHub Pages)
배포 URL: `https://poohbear-uncle.github.io/table-constellation/`

---

## 📁 디렉토리 구조

```
table-constellation/
├─ index.html                     # 자체 완결형 진입점 (단일 SPA, file:/// 및 웹 지원)
├─ table-constellation-system-spec.md # 상세 시스템 설계서
├─ DECISIONS.md                   # 아키텍처 및 디자인 결정 기록
├─ assets/
│   ├─ css/style.css              # 애니메이션 및 스크롤바 스타일
│   └─ figures/                   # 29종 테이블 판 및 피규어 에셋
├─ src/
│   ├─ board/                     # SVG 보드 렌더러, 피규어 컨트롤러, 인터랙션
│   ├─ session/                   # 세션 상태 머신, 호스트 권위 모델
│   ├─ sync/                      # WebRTC PeerJS 동기화 계층
│   ├─ guide/                     # 단계, 질문 은행, 템플릿 7종 JSON
│   ├─ safety/                    # 동의, 일시정지, 역할 해제 마법사
│   ├─ export/                    # PNG, JSON, Markdown 리포트 생성기
│   └─ i18n/                      # 다국어 리소스 (한국어 기본, 영어)
└─ .github/workflows/deploy.yml   # GitHub Pages 자동 배포 워크플로
```

---

## 📄 라이선스
MIT License
