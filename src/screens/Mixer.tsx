import { useMemo, useState } from "preact/hooks";
import { api } from "../api";
import { computeFortune, SIGNALS, SIGNAL_LABEL, ZODIAC_NAMES, weatherGroup, type Signal } from "../lib/fortune";
import { ELEMENT_HANJA, ELEMENT_NAMES, dayGanjiIndex, ganjiHanja, ganjiName } from "../lib/core";
import { fortuneInput, saveSignals, savedSignals, today, useApp } from "../state";
import { Back, Ball, ODDS, toast } from "../ui";

const WX = { clear: "맑음", cloud: "흐림", rain: "비", snow: "눈", storm: "뇌우" };
const TYPE_KO: Record<string, string> = { E: "외향", I: "내향", S: "감각", N: "직관", T: "사고", F: "감정", J: "판단", P: "인식" };

export function Mixer() {
  const app = useApp();
  const p = app.profile;
  const [on, setOn] = useState<Record<Signal, boolean>>(() => {
    const s = savedSignals();
    return Object.fromEntries(SIGNALS.map((k) => [k, s?.[k] !== false])) as Record<Signal, boolean>;
  });
  const f = useMemo(() => computeFortune(fortuneInput(app, on)), [app, on]);
  const g = dayGanjiIndex(today());
  const detail: Record<Signal, string | null> = {
    day: `${ganjiName(g)}(${ganjiHanja(g)})일`,
    weather: app.weather && p.weather_on ? `${app.weather.city} ${Math.round(app.weather.tempC)}° ${WX[weatherGroup(app.weather.code)]}` : null,
    person: p.birth_year ? `${today().y - p.birth_year}세` : null,
    zodiac: p.zodiac !== null ? ZODIAC_NAMES[p.zodiac] : null,
    saju: p.day_element !== null ? `${ELEMENT_NAMES[p.day_element]}(${ELEMENT_HANJA[p.day_element]})` : null,
    type: p.type_code ? p.type_code.split("").filter((x) => x !== "X").map((x) => TYPE_KO[x]).join(" · ") : null,
    stats: app.stats ? `1~${app.stats.latest}회 출현·미출현` : null,
  };
  const save = async () => {
    saveSignals(on);
    try { await api.savePick("mixer", f.numbers, f.used as string[]); toast("오늘의 숫자로 저장했어요."); location.hash = "#/today"; }
    catch (e: any) { toast(e.message); }
  };

  return (
    <div class="page">
      <Back to="today" title="신호 믹서" />
      <p class="sub">7가지 신호가 45개 숫자에 각자 점수를 줘요. 켜고 끌 때마다 나만의 숫자 지문이 바뀌어요.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SIGNALS.map((s) => {
          const missing = detail[s] === null;
          const active = on[s] && !missing;
          return (
            <button class={`toggle${active ? " on" : ""}`} aria-pressed={active} onClick={() => (missing ? (location.hash = "#/me") : setOn({ ...on, [s]: !on[s] }))}>
              <span style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{SIGNAL_LABEL[s]}</span>
                <span style={{ fontSize: 12, opacity: 0.8 }}>{missing ? "정보 없음 · 눌러서 입력" : detail[s]}</span>
              </span>
              <span class="knob">{active ? "ON" : "OFF"}</span>
            </button>
          );
        })}
      </div>
      <div class="card">
        <div class="between"><h3>내 숫자 지문</h3><span class="small">진할수록 점수 높음</span></div>
        <div class="heat" aria-label="45개 숫자 점수판">
          {f.total.map((v, i) => {
            const hit = f.numbers.includes(i + 1);
            const a = 0.08 + 0.92 * v;
            return <span style={hit ? { background: "var(--lime)", color: "var(--bg)", boxShadow: "0 0 0 2px #fff" } : { background: `rgba(215,255,61,${a.toFixed(2)})`, color: a > 0.55 ? "var(--bg)" : "var(--text)" }}>{i + 1}</span>;
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h3>지금 조합으로 나온 6개 · 켠 신호 {f.used.length}개</h3>
        <div class="balls">
          {f.numbers.map((n, i) => (
            <div class="col">
              <Ball n={n} size={50} drop delay={i * 0.05} />
              <span class="num" style={{ fontSize: 12 }}>{app.stats ? `${app.stats.freq[n - 1]}회` : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <button class="btn lime" onClick={save}>이 조합을 오늘의 숫자로 저장</button>
      <p class="foot">신호는 재미를 위한 규칙이에요 · 1등 확률은 어떤 조합이든 {ODDS}</p>
    </div>
  );
}
