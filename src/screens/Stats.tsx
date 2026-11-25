import { useState } from "preact/hooks";
import { useApp } from "../state";
import { Spinner } from "../ui";

export function Stats() {
  const { stats: st } = useApp();
  const [tab, setTab] = useState<"freq" | "gap">("freq");
  if (!st) return <div class="page"><Spinner /></div>;
  const freq = tab === "freq";
  const vals = freq ? st.freq : st.last.map((l) => st.latest - l);
  const hi = Math.max(...vals), lo = freq ? Math.min(...vals) - 10 : 0;
  const order = vals.map((v, i) => [v, i + 1]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  const top = order[0], second = order[1], bottom = order[order.length - 1];
  const pct = (n: number) => ((n / st.total) * 100).toFixed(1) + "%";
  const firstAll = st.first_auto + st.first_manual + st.first_semi || 1;
  const oddMax = Math.max(...st.odd);

  return (
    <div class="page">
      <div><h2 style={{ fontSize: 26 }}>통계 랩</h2><p class="small" style={{ marginTop: 4 }}>1~{st.latest}회 전체 · 매주 토요일 밤 자동 갱신</p></div>
      <div class="seg">
        <button class={freq ? "on" : ""} onClick={() => setTab("freq")}>출현 횟수</button>
        <button class={!freq ? "on" : ""} onClick={() => setTab("gap")}>안 나온 기간</button>
      </div>
      <div class="card">
        <h3>{freq ? "번호별 출현 횟수 (당첨번호 6개 기준)" : "마지막 출현 후 지난 회차 수"}</h3>
        <div class="hbars" role="img" aria-label={freq ? `가장 많이 나온 숫자 ${top[1]}번 ${top[0]}회` : `가장 오래 쉰 숫자 ${top[1]}번 ${top[0]}회`}>
          {vals.map((v) => <i style={{ height: `${Math.max(3, Math.round(((v - lo) / (hi - lo || 1)) * 120))}px`, background: v === hi ? "var(--orange)" : "var(--lime)" }} />)}
        </div>
        <div class="between small"><span>1</span><span>10</span><span>20</span><span>30</span><span>40</span><span>45</span></div>
        <div class="grid2">
          <div class="card" style={{ padding: 10, gap: 2 }}><span class="small">{freq ? "가장 많이" : "가장 오래 쉼"}</span><b>{top[1]}번 {top[0]}{freq ? "회" : "회째"}</b></div>
          <div class="card" style={{ padding: 10, gap: 2 }}><span class="small">{freq ? "가장 적게" : "그다음"}</span><b>{freq ? `${bottom[1]}번 ${bottom[0]}회` : `${second[1]}번 ${second[0]}회째`}</b></div>
        </div>
      </div>
      <div class="card">
        <h3>홀수 개수별 회차</h3>
        {st.odd.map((n, k) => (
          <div class="row" style={{ fontSize: 12 }}>
            <span style={{ width: 40, color: "var(--muted)" }}>홀{k}</span>
            <div class="bar" style={{ height: 10 }}><i style={{ width: `${(n / oddMax) * 100}%`, background: k === 3 ? "var(--lime)" : "#4A4A55" }} /></div>
            <span style={{ width: 84, textAlign: "right" }}>{n}회 · {pct(n)}</span>
          </div>
        ))}
      </div>
      <div class="grid3">
        <div class="card" style={{ padding: 12, gap: 4 }}><span class="small">6개 합계 평균</span><span class="num" style={{ fontSize: 22 }}>{st.sum_avg}</span><span class="small">100~175: {pct(st.sum_mid)}</span></div>
        <div class="card" style={{ padding: 12, gap: 4 }}><span class="small">연속번호 포함</span><span class="num" style={{ fontSize: 22 }}>{pct(st.consec)}</span><span class="small">{st.consec}회</span></div>
        <div class="card" style={{ padding: 12, gap: 4 }}><span class="small">1등 중 자동</span><span class="num" style={{ fontSize: 22 }}>{((st.first_auto / firstAll) * 100).toFixed(1)}%</span><span class="small">수동 {((st.first_manual / firstAll) * 100).toFixed(1)}%</span></div>
      </div>
      <a class="btn lime" href="#/check">내 번호를 통계에 넣어보기</a>
      <p class="foot">통계는 지난 기록이에요. 매 회차는 독립이라 다음 추첨 확률은 바뀌지 않아요.</p>
    </div>
  );
}
