import { useMemo, useState } from "preact/hooks";
import { api } from "../api";
import { computeFortune, randomSix, type Reason } from "../lib/fortune";
import { mulberry32 } from "../lib/core";
import { fortuneInput, todayFortune, todayKey, useApp } from "../state";
import { Ball, toast } from "../ui";

type Mode = "fortune" | "stats" | "random";

function streak(): number {
  try {
    const days: string[] = JSON.parse(localStorage.getItem("pick_days") ?? "[]");
    let n = 0; const d = new Date();
    for (;;) { const k = new Date(d.getTime() - n * 86400000 + 9 * 3600000).toISOString().slice(0, 10); if (days.includes(k)) n++; else break; }
    return n;
  } catch { return 0; }
}
function markDay() {
  try { const days: string[] = JSON.parse(localStorage.getItem("pick_days") ?? "[]"); if (!days.includes(todayKey())) localStorage.setItem("pick_days", JSON.stringify([...days, todayKey()].slice(-60))); } catch { /* 무시 */ }
}

export function Pick() {
  const app = useApp();
  const [mode, setMode] = useState<Mode>("fortune");
  const [k, setK] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [days, setDays] = useState(streak());
  const set = useMemo(() => {
    if (mode === "fortune") { const f = todayFortune(app); return { nums: f.numbers, reasons: f.reasons as Reason[] }; }
    if (mode === "stats") {
      const inp = fortuneInput(app, { day: false, weather: false, person: false, zodiac: false, saju: false, type: false, stats: true });
      const f = computeFortune({ ...inp, seedKey: inp.seedKey + "|stats|" + nonce });
      return { nums: f.numbers, reasons: f.reasons as Reason[] };
    }
    const c = new Uint32Array(1); crypto.getRandomValues(c);
    const nums = randomSix(mulberry32(c[0]));
    return { nums, reasons: nums.map((n) => ({ n, signal: "seed", title: `${n}번 · 순수 랜덤`, text: "추첨기처럼 아무 이유 없이 나온 공이에요.", tags: [] }) as Reason) };
  }, [mode, nonce, app]);
  // 열리는 순서는 섞어서 (오름차순으로 열리면 재미가 덜함)
  const order = useMemo(() => { const r = mulberry32(set.nums.reduce((a, b) => a * 31 + b, 7)); return [...set.nums].sort(() => r() - 0.5); }, [set]);
  const last = k > 0 ? set.reasons.find((r) => r.n === order[k - 1]) : null;

  const next = async () => {
    if (k >= 6) { setK(0); setNonce(nonce + 1); return; }
    const nk = k + 1; setK(nk);
    if (nk === 6) {
      markDay(); setDays(streak());
      api.savePick(mode, set.nums, []).catch(() => {});
    }
  };
  const share = async () => {
    const text = `오늘 내가 뽑은 로또 숫자 ${set.nums.join(" · ")}\n재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상`;
    try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast("복사했어요."); } } catch { /* 취소 */ }
  };

  return (
    <div class="page">
      <h2 style={{ fontSize: 26 }}>운세 뽑기</h2>
      <div class="seg">
        {([["fortune", "오늘의 운세"], ["stats", "통계 반영"], ["random", "순수 랜덤"]] as [Mode, string][]).map(([id, l]) => <button class={mode === id ? "on" : ""} onClick={() => { setMode(id); setK(0); setNonce(nonce + 1); }}>{l}</button>)}
      </div>
      <div class="card" style={{ padding: "24px 16px", alignItems: "center", gap: 18 }}>
        <div class="balls" style={{ width: "100%" }}>
          {order.map((n, i) => (
            <div class="col">
              <Ball n={i < k ? n : null} size={46} drop={i < k} />
              <span class="num" style={{ fontSize: 12, minHeight: 16 }}>{i < k && app.stats ? `${app.stats.freq[n - 1]}회` : ""}</span>
            </div>
          ))}
        </div>
        <div style={{ minHeight: 72, textAlign: "center", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }} aria-live="polite">
          <div style={{ fontSize: 20, fontWeight: 900, color: "var(--lime)" }}>{last ? last.title : "공 6개가 기다리고 있어요"}</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: "var(--sub)" }}>{last ? last.text : "버튼을 누를 때마다 하나씩 열려요 · 공 아래는 역대 출현 횟수"}</div>
        </div>
        <button class="btn orange" onClick={next}>{k >= 6 ? "처음부터 다시 뽑기" : `${k + 1}번째 공 열기`}</button>
      </div>
      {k >= 6 && (
        <div class="grid2">
          <button class="btn ghost" onClick={share}>공유하기</button>
          <a class="btn ghost" href={`#/check/${set.nums.join("-")}`}>통계로 분석</a>
        </div>
      )}
      <div class="card" style={{ flexDirection: "row", alignItems: "center" }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#D7FF3D" stroke-width="2" aria-hidden="true" style={{ flex: "none" }}><path d="M12 2l2.4 7H22l-6 4.5 2.3 7.5L12 16.5 5.7 21 8 13.5 2 9h7.6z" /></svg>
        <span style={{ fontSize: 13, color: "var(--sub)" }}>{days >= 7 ? `'꾸준한 손' 배지 획득! ${days}일 연속 뽑는 중` : `7일 연속 뽑으면 '꾸준한 손' 배지. 지금 ${days}일째예요.`}</span>
      </div>
      <p class="foot">재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상<br />당첨은 무작위 추첨으로 결정됩니다</p>
    </div>
  );
}
