import { useEffect, useMemo, useState } from "preact/hooks";
import { api } from "../api";
import { weatherGroup } from "../lib/fortune";
import { todayFortune, todayKey, useApp } from "../state";
import { Ball, ODDS } from "../ui";

const MODES = [["all", "역대 출현"], ["rank", "순위"], ["gap", "쉬는 중"], ["recent", "최근 20회"]] as const;
const WX = { clear: "맑음", cloud: "흐림", rain: "비", snow: "눈", storm: "뇌우" };

export function Today() {
  const app = useApp();
  const f = useMemo(() => todayFortune(app), [app]);
  const [sel, setSel] = useState(0);
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("all");
  const st = app.stats;

  // 하루 한 번, 오늘의 숫자를 기록 (운세 vs 실제 추첨 비교용)
  useEffect(() => {
    const k = "saved_today_" + todayKey(), v = f.numbers.join(",");
    if (localStorage.getItem(k) === v) return;
    api.savePick("today", f.numbers, f.used as string[]).then(() => localStorage.setItem(k, v)).catch(() => {});
  }, [f]);

  const rank = useMemo(() => {
    if (!st) return null;
    return st.freq.map((c) => 1 + st.freq.filter((x) => x > c).length); // 같은 횟수는 같은 순위
  }, [st]);
  const stat = (n: number): [string, boolean] => {
    if (!st || !rank) return ["", false];
    const i = n - 1, gap = st.latest - st.last[i];
    if (mode === "all") return [`${st.freq[i]}회`, rank[i] <= 3 || rank[i] >= 43];
    if (mode === "rank") return [`${rank[i]}위`, rank[i] <= 3 || rank[i] >= 43];
    if (mode === "gap") return [`${gap}회째`, gap >= 20];
    return [`${st.recent20[i]}번`, st.recent20[i] >= 4];
  };
  const longest = st ? st.last.map((l, i) => [st.latest - l, i + 1]).sort((a, b) => b[0] - a[0])[0] : null;
  const note = {
    all: "공 아래 = 1~" + (st?.latest ?? "") + "회에 나온 횟수 · 내 N번 = 내가 기록한 게임에 넣은 횟수",
    rank: "45개 숫자 중 역대 출현 순위",
    gap: "마지막으로 나온 뒤 지난 회차 · 오래 쉬어도 다음 확률은 같아요",
    recent: "최근 20회 동안 나온 횟수",
  }[mode];
  const why = f.reasons[sel];
  const name = app.profile.nickname ? `${app.profile.nickname} 님의` : "오늘 나의";
  const d = new Date();

  return (
    <div class="page">
      <div class="glow" aria-hidden="true" />
      <div class="between">
        <span class="pill">{d.getMonth() + 1}.{d.getDate()} · {f.dayLabel}</span>
        {app.weather && app.profile.weather_on && <span class="pill">{app.weather.city} {Math.round(app.weather.tempC)}° {WX[weatherGroup(app.weather.code)]}</span>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1>{name}<br />숫자는 이거예요</h1>
        <p class="sub">{f.headline}. {f.summary}</p>
      </div>

      <div class="chips" role="tablist" aria-label="공 아래 통계">
        {MODES.map(([id, l]) => <button role="tab" aria-selected={mode === id} class={`chip${mode === id ? " on" : ""}`} onClick={() => setMode(id)}>{l}</button>)}
      </div>

      <div class="balls">
        {f.numbers.map((n, i) => {
          const [t, hot] = stat(n);
          return (
            <div class="col" style={{ width: 54 }}>
              <Ball n={n} drop delay={0.2 + i * 0.09} sel={i === sel} onClick={() => setSel(i)} label={`${n}번, 이유 보기`} />
              <span class="num" style={{ fontSize: 13, color: hot ? "var(--orange)" : "var(--text)", whiteSpace: "nowrap" }}>{t}</span>
              <span style={{ fontSize: 11, color: "var(--dim)", whiteSpace: "nowrap" }}>내 {app.counts?.[n - 1] ?? 0}번</span>
            </div>
          );
        })}
      </div>

      <div class="card" aria-live="polite">
        <div class="between"><h3>{why.title}</h3><span class="small">숫자를 눌러 보세요</span></div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--sub)" }}>{why.text}</p>
        <div class="chips">{why.tags.map((t) => <span class="tag">{t}</span>)}</div>
        <p class="small">{note}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div class="between"><span class="small" style={{ color: "var(--muted)", fontSize: 13 }}>오늘의 재미 지수</span><span class="small">신호 {f.used.length}개 반영</span></div>
        <div class="row" style={{ gap: 12 }}>
          <span class="num" style={{ fontSize: 40, letterSpacing: -1, lineHeight: 1 }}>{f.funIndex}</span>
          <div class="bar"><i style={{ width: `${f.funIndex}%` }} /></div>
        </div>
      </div>

      <div class="grid2">
        <a href="#/mixer" class="btn lime" style={{ height: 104, flexDirection: "column", alignItems: "flex-start", padding: 16, borderRadius: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>신호 믹서</span><span style={{ fontSize: 12, fontWeight: 500 }}>7가지 신호로 숫자 바꾸기</span>
        </a>
        <a href="#/pick" class="btn ghost" style={{ height: 104, flexDirection: "column", alignItems: "flex-start", padding: 16, borderRadius: 20 }}>
          <span style={{ fontSize: 16, fontWeight: 900 }}>운세 뽑기</span><span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>한 개씩 열어보기</span>
        </a>
      </div>
      <a href="#/duo" class="between" style={{ height: 52, borderBottom: "1px solid rgba(255,255,255,.08)", color: "var(--text)", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
        <span>친구와 궁합 숫자</span><span style={{ color: "var(--orange)" }}>›</span>
      </a>
      {longest && (
        <a href="#/stats" style={{ color: "var(--text)", textDecoration: "none", display: "flex", flexDirection: "column", gap: 4 }}>
          <span class="small" style={{ color: "var(--muted)" }}>오늘의 통계 한 줄</span>
          <span style={{ fontSize: 15, lineHeight: 1.5 }}>{longest[1]}번은 <b style={{ color: "var(--orange)" }}>{longest[0]}회째</b> 안 나오는 중. 지금 쉬고 있는 숫자 중 가장 길어요.</span>
        </a>
      )}
      <div class="row" style={{ gap: 10 }}>
        <span class="num" style={{ fontSize: 15 }}>{ODDS}</span>
        <span class="small">어떤 숫자든 1등 확률은 같아요. 운세는 재미로.</span>
      </div>
    </div>
  );
}
