# 정규식 철길 — Rail

정규식을 직접 파싱해 철도 다이어그램(railroad diagram)으로 그리는 시각화 도구.
**의존성 0.** 재귀 하강 파서도, 레이아웃 엔진도 손으로 짰다.

**Live:** https://lamgul.github.io/projects/rail/

## 어떻게 도는가

```
src/parser.ts   문자열 → AST. 재귀 하강, 토크나이저 없음, 위치 담은 에러.
src/build.ts    AST → 다이어그램 트리 (리터럴 병합, 수량자 합성).
src/diagram.ts  width/up/down 모델 + 큐빅 베지어 레일 → SVG 문자열.
src/main.ts     입력 디바운스 · 예시 · 에러 표시.
dist/           위를 컴파일한 ESM (Pages가 그대로 서빙).
```

세 가지가 재미있었다:

1. **문법이 코드가 된다.** 정규식의 우선순위(선택 < 연속 < 수량자 < 원자)를
   함수 하나씩으로 옮기면 그게 파서다.
2. **수량자는 합성으로 공짜.** `*` = `optional(oneOrMore(x))`. 조각이 자기를
   `width/up/down` 세 숫자로만 설명하니 조립이 그냥 된다.
3. **arc 대신 베지어.** SVG arc의 sweep 플래그와 두 번 싸운 뒤 큐빅 베지어로
   바꿨다. 코드는 짧아지고 레일은 부드러워졌다.

## 지원 범위

리터럴 · 문자 클래스 `[...]` · 이스케이프 `\d \w \s …` · 그룹 `( ) (?:) (?=) (?!) (?<=) (?<!) (?<name>)`
· 선택 `|` · 수량자 `* + ? {m,n}` (lazy 포함) · 앵커 `^ $ \b`.
역참조와 유니코드 속성은 의도적으로 뺐다 — 트리가 그래프가 되는 순간이라.

## 빌드

```bash
npm i && npm run build     # tsc → dist/
```

TypeScript만 있으면 된다. 자세한 이야기는
[회고 글](https://lamgul.github.io/writing/parsing-regex-by-hand.html).
