# 살아있는 투표 — Livepoll

데이터베이스 없이 **메모리 + WebSocket**만으로 굴러가는 실시간 투표.
백엔드는 Express + Socket.IO, 프론트는 React + Vite, 전부 TypeScript.

**Live demo:** https://lamgul.github.io/projects/livepoll/
(Pages 배포본은 브라우저 안 시뮬레이터로 돌아갑니다 — 봇들이 실제로 투표합니다.)

## 왜 DB가 없나

라이브 투표는 몇 분이면 끝나는 이벤트다. 끝나면 결과도 대개 의미가 없다. 그래서
전체 데이터셋을 `Map` 하나에 담고, 모든 변경은 O(1)이며, 오래된 투표는 주기적으로
쓸어낸다. 재시작하면 다 날아간다 — 그게 이 설계의 거래 조건이다. 자세한 이야기는
[회고 글](https://lamgul.github.io/writing/state-without-a-database.html).

## 구조

```
server/          Express + Socket.IO (인메모리)
  src/types.ts     공유 와이어 프로토콜
  src/pollStore.ts Map 기반 스토어 — 투표 생성/집계/정리
  src/gateway.ts   소켓 이벤트 ↔ 스토어, room = 관중석
  src/index.ts     부트스트랩 (+ /health)
web/             React + Vite 클라이언트
  src/transport.ts LiveTransport(진짜 소켓) | SimTransport(시뮬레이터)
  src/simServer.ts 브라우저 안 가짜 서버 + 봇 투표자
  src/App.tsx      UI (생성 · 참여 · 실시간 막대)
app/             web/를 빌드한 정적 산출물 (Pages가 서빙, 페이지에 iframe 임베드)
```

핵심은 `transport.ts`의 한 겹이다. 앱은 자기가 진짜 Socket.IO와 말하는지
브라우저 안 시뮬레이터와 말하는지 모른다. 그 seam 덕분에 같은 빌드가
개발 땐 라이브로, Pages에선 자급자족 데모로 돈다.

## 로컬에서 진짜로 돌리기

```bash
# 1) 서버
cd server && npm i && npm run dev          # → http://localhost:4000

# 2) 클라이언트 (다른 터미널)
cd web && npm i
echo "VITE_SERVER_URL=http://localhost:4000" > .env
npm run dev                                # → http://localhost:5173
```

이제 탭을 두 개 열어 한쪽에서 만든 투표 코드로 다른 쪽에서 참여해 보면,
표가 양쪽에서 실시간으로 오르내린다.

## 데모(정적) 다시 빌드

```bash
cd web && npm run build     # → ../app 로 출력 (base: './', 상대경로)
```
