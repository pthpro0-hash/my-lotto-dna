import { useState } from "preact/hooks";
import { computeDuo, zodiacOf, ZODIAC_NAMES, type FortuneInput } from "../lib/fortune";
import { ELEMENT_HANJA, ELEMENT_NAMES, dayProfile, parseYmd } from "../lib/core";
import { fortuneInput, today, useApp } from "../state";
import { Back, Ball, toast } from "../ui";

const AXES: [string, string][] = [["E", "I"], ["S", "N"], ["T", "F"], ["J", "P"]];
const KO: Record<string, string> = { E: "외향", I: "내향", S: "감각", N: "직관", T: "사고", F: "감정", J: "판단", P: "인식", X: "모름" };

export function Duo() {
  const app = useApp();
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [type, setType] = useState(["X", "X", "X", "X"]);
  const [res, setRes] = useState<ReturnType<typeof computeDuo> | null>(null);
  const me = app.profile;

  const run = () => {
    const b = parseYmd(birth);
    if (!b) { toast("상대의 생년월일을 넣어 주세요."); return; }
    // 상대 정보는 이 화면에서만 계산하고 저장·전송하지 않음
    const other: FortuneInput = {
      date: today(), seedKey: `duo|${name.trim() || "친구"}|${birth}`, birthYear: b.y, zodiac: zodiacOf(b.m, b.d),
      dayElement: dayProfile(b).day_element, typeCode: type.join("") === "XXXX" ? null : type.join(""),
    };
    setRes(computeDuo(today(), fortuneInput(app), other));
  };
  const b = parseYmd(birth);
  const other = b ? { z: ZODIAC_NAMES[zodiacOf(b.m, b.d)], e: dayProfile(b).day_element } : null;
  const color = { a: "var(--lime)", b: "var(--orange)", both: "#FFFFFF" };
  const share = async () => {
    if (!res) return;
    const text = `${me.nickname ?? "나"} × ${name || "친구"} 숫자 궁합 ${res.score}점 — ${res.title}\n둘만의 숫자 ${res.numbers.map((x) => x.n).join(" · ")}\n재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상`;
    try { if (navigator.share) await navigator.share({ text, url: location.origin + location.pathname }); else { await navigator.clipboard.writeText(text); toast("복사했어요."); } } catch { /* 취소 */ }
  };

  return (
    <div class="page">
      <Back to="today" title="궁합 숫자" />
      <p class="sub">친구·가족·연인과 숫자 지문을 겹쳐 둘만의 6개를 만들어요. 상대 정보는 저장하지 않아요.</p>
      <div class="grid2">
        <div class="card" style={{ gap: 4 }}><span class="small">나</span><b>{me.nickname ?? "나"}</b><span class="small">{me.zodiac !== null ? ZODIAC_NAMES[me.zodiac] : ""}{me.day_element !== null ? ` · ${ELEMENT_NAMES[me.day_element]}(${ELEMENT_HANJA[me.day_element]})` : ""}</span></div>
        <div class="card" style={{ gap: 4, borderColor: "var(--orange)", borderStyle: "dashed" }}><span class="small">상대</span><b>{name || "친구"}</b><span class="small">{other ? `${other.z} · ${ELEMENT_NAMES[other.e]}(${ELEMENT_HANJA[other.e]})` : "생일을 넣어 주세요"}</span></div>
      </div>
      <div class="card">
        <label class="field">상대 이름 (선택)<input class="input" maxLength={12} value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
        <label class="field">상대 생년월일 (양력)<input class="input" type="date" min="1920-01-01" max="2026-12-31" value={birth} onInput={(e) => setBirth((e.target as HTMLInputElement).value)} /></label>
        <div class="field">상대 성향 (모르면 그대로)
          {AXES.map(([a, b2], i) => <div class="chips">{[a, b2, "X"].map((v) => <button class={`chip${type[i] === v ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setType(type.map((t, k) => (k === i ? v : t)))}>{KO[v]}</button>)}</div>)}
        </div>
        <button class="btn orange" onClick={run}>궁합 보기</button>
      </div>
      {res && (
        <div class="card" style={{ alignItems: "center", textAlign: "center", padding: 20 }} aria-live="polite">
          <span class="small">숫자 궁합</span>
          <span class="num" style={{ fontSize: 56, lineHeight: 1, color: "var(--orange)" }}>{res.score}</span>
          <h3 style={{ fontSize: 20, fontWeight: 900 }}>{res.title}</h3>
          <p class="sub">{res.text}</p>
          <div class="row" style={{ gap: 6 }}>{res.numbers.map((x, i) => <span style={{ borderRadius: "50%", padding: 3, background: color[x.who] }}><Ball n={x.n} size={42} drop delay={i * 0.07} /></span>)}</div>
          <div class="row small" style={{ gap: 12 }}><span style={{ color: "var(--lime)" }}>● 나</span><span style={{ color: "var(--orange)" }}>● 상대</span><span style={{ color: "#fff" }}>● 둘 다</span></div>
          <button class="btn ghost" onClick={share}>카톡·메시지로 공유</button>
        </div>
      )}
      <p class="foot">재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상</p>
    </div>
  );
}
