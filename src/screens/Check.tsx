import { useEffect, useState } from "preact/hooks";
import { api } from "../api";
import { todayFortune, useApp } from "../state";
import { Back, ODDS, Spinner, toast, won } from "../ui";

// 1게임의 등수별 확률 (6/45)
const P3 = (20 * 9139) / 8145060, P4 = (15 * 741) / 8145060;

export function Check({ preset }: { preset?: number[] }) {
  const app = useApp();
  const [vals, setVals] = useState<string[]>(() => (preset && preset.length === 6 ? preset : todayFortune(app).numbers).map(String));
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const nums = vals.map(Number);
  const valid = nums.every((n) => Number.isInteger(n) && n >= 1 && n <= 45) && new Set(nums).size === 6;

  const run = async () => {
    if (!valid) { toast("1~45 사이 서로 다른 숫자 6개를 넣어 주세요."); return; }
    setBusy(true);
    try { setRes(await api.combo(nums)); } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  useEffect(() => { run(); }, []);

  const st = app.stats;
  const by: number[] = res?.by_match ?? [];
  const r = res?.rank ?? {};
  const total = res?.total ?? 0;
  const returned = (r["5"] ?? 0) * 5000 + (r["4"] ?? 0) * 50000;
  const big = (r["1"] ?? 0) + (r["2"] ?? 0) + (r["3"] ?? 0);

  return (
    <div class="page">
      <Back to="stats" title="내 번호 분석" />
      <div class="card">
        <span class="small">분석할 6개</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0,1fr))", gap: 6 }}>
          {vals.map((v, i) => <input class="input num" aria-label={`번호 ${i + 1}`} inputMode="numeric" maxLength={2} value={v} style={{ textAlign: "center", fontSize: 20, color: "var(--lime)", padding: 0 }}
            onInput={(e) => setVals(vals.map((x, k) => (k === i ? (e.target as HTMLInputElement).value.replace(/\D/g, "") : x)))} />)}
        </div>
        <button class="btn ghost" style={{ height: 44 }} disabled={busy} onClick={run}>{busy ? "분석 중…" : "다시 분석"}</button>
      </div>
      {!res ? <Spinner /> : (
        <>
          <div class="card">
            <h3>이 6개로 1회부터 매주 샀다면?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6, textAlign: "center" }}>
              {[["4개 이상", by[4] + by[5] + by[6], "var(--orange)"], ["3개 (5등)", by[3], "var(--lime)"], ["2개", by[2], "var(--text)"], ["1개 이하", by[0] + by[1], "var(--text)"]].map(([l, n, c]) => (
                <div style={{ background: "#111114", borderRadius: 10, padding: "10px 4px" }}><div class="num" style={{ fontSize: 20, color: c as string }}>{Number(n).toLocaleString()}</div><div class="small">{l}</div></div>
              ))}
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--sub)" }}>
              {total.toLocaleString()}회 동안 {won(total * 1000)}을 쓰고 4·5등으로 {won(returned)}을 돌려받았을 거예요{big ? ` (1~3등 ${big}회는 당첨금이 회차마다 달라 빼고 계산)` : ""}.
              {res.best >= 3 ? ` 마지막 최고 기록(${res.best}개)은 ${res.best_last_draw}회.` : ""}
            </p>
          </div>
          <div class="card">
            <h3>조합 모양</h3>
            <div class="between" style={{ fontSize: 14 }}><span class="small">홀짝</span><span>홀 {res.odd} : 짝 {6 - res.odd}{st ? ` · 역대 ${((st.odd[res.odd] / st.total) * 100).toFixed(1)}%가 이 모양` : ""}</span></div>
            <div class="between" style={{ fontSize: 14 }}><span class="small">합계</span><span>{res.sum} · {res.sum >= 100 && res.sum <= 175 ? "흔한 구간(100~175)" : "드문 구간"}</span></div>
            <div class="between" style={{ fontSize: 14 }}><span class="small">연속번호</span><span>{res.consec ? "있음" : "없음"}{st ? ` · 역대 ${(((res.consec ? st.consec : st.total - st.consec) / st.total) * 100).toFixed(1)}%가 ${res.consec ? "있음" : "없음"}` : ""}</span></div>
          </div>
          <div class="card" style={{ borderColor: "var(--lime)" }}>
            <h3 style={{ color: "var(--lime)" }}>확률 현실 체크</h3>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>1등 확률 {ODDS}. 매주 1게임씩 사면 1등까지 평균 <b style={{ color: "var(--lime)" }}>약 15만 6천 년</b>이 걸려요.</p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--sub)" }}>{total.toLocaleString()}회 동안 5등 기댓값은 약 {(total * P3).toFixed(0)}회, 4등은 약 {(total * P4).toFixed(1)}회. 이 번호는 5등 {by[3]}회, 4등 {by[4]}회였어요.</p>
          </div>
        </>
      )}
      <p class="foot">과거 결과는 다음 추첨에 영향을 주지 않아요</p>
    </div>
  );
}
