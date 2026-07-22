<div align="center">

# 안성진 — 백엔드 개발자 포트폴리오

**표면이 아니라 근본을 고칩니다. 인터페이스와 인프라 사이의 모든 것.**

[**→ lamgul.github.io**](https://lamgul.github.io/)  ·  NestJS · Spring · Python · YOLO · vLLM · AWS

[![links](https://github.com/lamgul/lamgul.github.io/actions/workflows/links.yml/badge.svg)](https://github.com/lamgul/lamgul.github.io/actions/workflows/links.yml)

![포트폴리오 미리보기](assets/img/og.png)

</div>

---

프레임워크 없이 손으로 짠 정적 사이트입니다. **실무 사례**(실제 경력)와, 궁금해서 만든
**실험 프로젝트**(인터랙티브 데모)로 이뤄져 있습니다. 백엔드가 필요한 실험도 GitHub Pages
한 곳에서 동작하도록, 브라우저 안 시뮬레이터로 살아 움직입니다.

## 실무 사례 · Case Studies

증상 → 원인 → 접근 → 결과로 정리한 실제 문제 해결 기록입니다.

| 사례 | 한 줄 | 결과 |
|------|-------|------|
| [SafeIn 산업안전 시스템](cases/safein.html) | 컨셉만 있던 요구에서 백엔드 단독 설계 · AI 다국어 번역 서빙 | 핵심 도메인 8+ · 15개 언어 |
| [7일마다 죽던 서버](cases/memory-leak.html) | 힙덤프 분석으로 멀티스레드 동기화 누락 발견 | 장애주기 7일→30일+ |
| [YOLO 차량감지](cases/vehicle-detection.html) | 루프 센서를 카메라로, 2주 MVP | 2023 사업계획 반영 |
| [전력사용량 예측](cases/power-forecast.html) | 도메인 지식으로 파생 변수 설계 | AI 부문 리더보드 10위 |
| [정산 시스템 모듈화](cases/settlement-refactor.html) | Template Method + Strategy | 코드 40%↓ |
| [DDD 크롤링 파이프라인](cases/crawling-pipeline.html) | Pipe&Filter + Adapter | 신규 소스 무수정 추가 |
| [민원 200건을 30건으로](cases/incident-process.html) | JIRA 기반 체계화 | 월 200+ → 30 미만 |
| [레거시 아키텍처 개선](cases/legacy-usecase.html) | 신뢰를 쌓고 UseCase 구조 제안 | 점진적 리팩토링 |
| [서버 보안 하드닝](cases/server-hardening.html) | ServerTokens로 버전 노출 제거 | 무중단 반영 |

## 실험 · Experiments

회사 일과 별개로, 순전히 궁금해서 만든 인터랙티브 데모.

- [활자 실험실](projects/type-playground/) — 가변 폰트 5축 실시간 조작 (Vanilla JS)
- [살아있는 투표](projects/livepoll/) — DB 없이 메모리+WebSocket 실시간 투표 (React · Express · Socket.IO)
- [정규식 철길](projects/rail/) — 손으로 짠 파서로 정규식을 철도 다이어그램으로 (TypeScript)
- [새벽의 커밋](projects/commit-rhythm/) — 커밋 리듬 데이터 스토리 (D3.js)
- [흐름](projects/flowfield/) — 값 노이즈 제너러티브 캔버스 (Canvas 2D)

## 글 · Writing

- [이 사이트를 배포하며 부딪힌 다섯 개의 벽](writing/shipping-this-portfolio.html) — 실제 디버깅 기록
- [데이터베이스 없이 상태를 버티기](writing/state-without-a-database.html)
- [정규식을 손으로 파싱하기](writing/parsing-regex-by-hand.html)
- [가변 폰트로 UI에 숨을 불어넣기](writing/variable-fonts-in-ui.html)

## 로컬에서 보기

```bash
python -m http.server 8000     # 정적 부분 전체 → http://localhost:8000
```

빌드가 필요한 실험:

```bash
cd projects/livepoll/server && npm i && npm run dev   # 실시간 백엔드
cd projects/livepoll/web && npm i && npm run dev      # React 클라이언트
cd projects/rail && npm i && npm run build            # TS 파서 컴파일
```

## 구조

```
├── index.html            허브 (실무 사례 + 실험)
├── about.html            이력 · CV (인쇄 시 깔끔한 이력서로)
├── cases/                실무 사례 9건
├── projects/             인터랙티브 실험 5종
├── writing/              개발 기록 4편
└── assets/               css(디자인 시스템) · js · fonts · img
```

## 콜로폰

Fraunces · Inter · JetBrains Mono(자체 호스팅), 한글은 Pretendard.
분석 도구 없음, 쿠키 없음. 프레임워크 없음. 서울에서 손으로 짬.

<div align="center"><sub>© 2025 안성진 · <a href="mailto:lamgul@naver.com">lamgul@naver.com</a> · <a href="https://github.com/lamgul">github.com/lamgul</a></sub></div>
