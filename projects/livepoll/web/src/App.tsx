import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createTransport } from "./transport";
import type { Option, PollState } from "./types";

const nf = new Intl.NumberFormat("ko-KR");

export default function App() {
  const transport = useMemo(() => createTransport(), []);
  const [view, setView] = useState<"home" | "poll">("home");
  const [pollId, setPollId] = useState<string | null>(null);
  const [state, setState] = useState<PollState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsub = useRef<(() => void) | null>(null);

  const enter = useCallback(
    async (id: string) => {
      setError(null);
      const res = await transport.join(id);
      if (!res.ok) { setError(res.error); return; }
      unsub.current?.();
      setPollId(id);
      setState(res.state);
      setView("poll");
      unsub.current = transport.subscribe(id, setState);
    },
    [transport]
  );

  // On Pages (sim mode) drop the visitor straight into the living demo poll.
  useEffect(() => {
    if (transport.mode === "sim") enter("demo");
    return () => { unsub.current?.(); transport.dispose(); };
  }, [transport, enter]);

  const leave = () => {
    if (pollId) transport.leave(pollId);
    unsub.current?.();
    unsub.current = null;
    setView("home");
    setState(null);
    setPollId(null);
  };

  return (
    <div className="lp">
      <Header mode={transport.mode} />
      {view === "home" ? (
        <Home
          error={error}
          onCreate={async (q, opts) => {
            try { setError(null); enter(await transport.create(q, opts)); }
            catch (e) { setError((e as Error).message); }
          }}
          onJoin={enter}
        />
      ) : (
        state && (
          <Poll
            state={state}
            myVote={transport.myVote(pollId!)}
            onVote={(oid) => transport.vote(pollId!, oid)}
            onLeave={leave}
            mode={transport.mode}
          />
        )
      )}
    </div>
  );
}

function Header({ mode }: { mode: "live" | "sim" }) {
  return (
    <header className="lp-head">
      <span className="lp-brand">live<b>poll</b></span>
      <span className={"lp-badge " + mode}>
        <i className="dot" />
        {mode === "live" ? "LIVE · 서버 연결됨" : "시뮬레이션 모드"}
      </span>
    </header>
  );
}

/* ---------------- home ---------------- */
function Home({
  onCreate, onJoin, error,
}: {
  onCreate: (q: string, opts: string[]) => void;
  onJoin: (id: string) => void;
  error: string | null;
}) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState<string[]>(["", ""]);
  const [code, setCode] = useState("");

  const setOpt = (i: number, v: string) =>
    setOpts((p) => p.map((o, j) => (j === i ? v : o)));
  const addOpt = () => setOpts((p) => (p.length < 8 ? [...p, ""] : p));
  const rmOpt = (i: number) => setOpts((p) => (p.length > 2 ? p.filter((_, j) => j !== i) : p));

  const canCreate = q.trim() && opts.filter((o) => o.trim()).length >= 2;

  return (
    <div className="lp-home">
      <section className="lp-card">
        <h2>새 투표 만들기</h2>
        <input
          className="lp-input lp-q"
          placeholder="질문을 입력하세요 — 예: 점심 뭐 먹지?"
          value={q}
          maxLength={140}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="lp-opts">
          {opts.map((o, i) => (
            <div className="lp-opt-row" key={i}>
              <input
                className="lp-input"
                placeholder={`선택지 ${i + 1}`}
                value={o}
                maxLength={80}
                onChange={(e) => setOpt(i, e.target.value)}
              />
              {opts.length > 2 && (
                <button className="lp-x" onClick={() => rmOpt(i)} aria-label="선택지 삭제">×</button>
              )}
            </div>
          ))}
        </div>
        <div className="lp-home-actions">
          {opts.length < 8 && <button className="lp-ghost" onClick={addOpt}>+ 선택지 추가</button>}
          <button className="lp-primary" disabled={!canCreate} onClick={() => onCreate(q, opts)}>
            투표 만들기 →
          </button>
        </div>
      </section>

      <section className="lp-card lp-join">
        <h2>코드로 참여</h2>
        <div className="lp-opt-row">
          <input
            className="lp-input"
            placeholder="투표 코드 (예: demo)"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            onKeyDown={(e) => e.key === "Enter" && code && onJoin(code)}
          />
          <button className="lp-primary sm" disabled={!code} onClick={() => onJoin(code)}>참여</button>
        </div>
        <p className="lp-hint">힌트: <button className="lp-link" onClick={() => onJoin("demo")}>demo</button> 코드로 지금 돌아가는 투표를 볼 수 있어요.</p>
        {error && <p className="lp-error">{error}</p>}
      </section>
    </div>
  );
}

/* ---------------- poll ---------------- */
function Poll({
  state, myVote, onVote, onLeave, mode,
}: {
  state: PollState;
  myVote: string | undefined;
  onVote: (oid: string) => void;
  onLeave: () => void;
  mode: "live" | "sim";
}) {
  const [copied, setCopied] = useState(false);
  const leader = state.options.reduce<Option | undefined>(
    (a, b) => (!a || b.votes > a.votes ? b : a),
    undefined
  );
  const share = () => {
    const text = mode === "sim" ? state.id : `${location.origin}${location.pathname}?poll=${state.id}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1400);
    });
  };

  return (
    <div className="lp-poll">
      <div className="lp-poll-top">
        <button className="lp-back" onClick={onLeave}>← 새 투표</button>
        <div className="lp-live">
          <span className="lp-viewers"><i className="eye" />{nf.format(state.viewers)}명 보는 중</span>
          <button className="lp-code" onClick={share} title="공유 코드 복사">
            {copied ? "복사됨 ✓" : <>#{state.id}</>}
          </button>
        </div>
      </div>

      <h2 className="lp-question">{state.question}</h2>

      <div className="lp-bars">
        {state.options.map((o) => {
          const pct = state.totalVotes ? (o.votes / state.totalVotes) * 100 : 0;
          const mine = myVote === o.id;
          const winning = o.id === leader?.id && o.votes > 0;
          return (
            <button
              key={o.id}
              className={"lp-bar" + (mine ? " mine" : "") + (winning ? " lead" : "")}
              onClick={() => onVote(o.id)}
              aria-pressed={mine}
            >
              <span className="lp-fill" style={{ width: pct + "%" }} />
              <span className="lp-bar-label">
                {mine && <i className="check" aria-hidden>✓</i>}
                {o.label}
              </span>
              <span className="lp-bar-stat">
                <b>{Math.round(pct)}%</b>
                <span className="n">{nf.format(o.votes)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="lp-foot">
        <span>{nf.format(state.totalVotes)}표</span>
        <span className="sep">·</span>
        <span>{myVote ? "다른 항목을 눌러 언제든 바꿀 수 있어요" : "항목을 눌러 투표하세요"}</span>
      </div>
    </div>
  );
}
