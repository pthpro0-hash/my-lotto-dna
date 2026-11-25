// ============================================================================
// MY LOTTO DNA · 오늘의 로또 운세 엔진 (fortune-v1)
// 7가지 신호가 1~45 각 숫자에 점수를 주고, 합계 상위 6개를 '오늘의 내 숫자'로 고릅니다.
//  - 같은 사람 · 같은 날 · 같은 신호 → 항상 같은 결과 (결정론)
//  - 사람마다 다른 씨앗(seedKey)으로 작은 흔들림을 더해, 조건이 같아도 숫자는 사람마다 다름
//  - 어떤 결과도 당첨 확률을 바꾸지 않음. 화면 문구는 '재미'로만 표현
// 웹앱(브라우저)에서 실행합니다. 의존: core.ts (날짜·일진·오행)
// ============================================================================
import {
  BRANCH_NAMES, ELEMENT_HANJA, ELEMENT_NAMES, STEM_HANJA, STEM_NAMES,
  type Ymd, dayGanjiIndex, elementOfNumber, elementOfStem, generatedBy, mulberry32, relationOf,
} from "./core.ts";

export const FORTUNE_VERSION = "fortune-v1";
export let SHARPNESS = 3; // 클수록 점수 높은 숫자에 몰림
export const SIGNALS = ["day", "weather", "person", "zodiac", "saju", "type", "stats"] as const;
export type Signal = (typeof SIGNALS)[number];
export const SIGNAL_LABEL: Record<Signal, string> = {
  day: "날짜 일진", weather: "날씨", person: "나이", zodiac: "생일 별자리",
  saju: "사주 오행", type: "성향 유형", stats: "역대 통계",
};
export const ZODIAC_NAMES = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
// 지지의 오행: 자수 축토 인목 묘목 진토 사화 오화 미토 신금 유금 술토 해수
const BRANCH_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

export type Weather = { code: number; tempC: number; city?: string };
export type Stats = { freq: number[]; last: number[]; latest: number };
export type FortuneInput = {
  date: Ymd;                    // 한국 날짜
  seedKey: string;              // 사람마다 다른 값 (사용자 id 등). 화면에 노출하지 않음
  enabled?: Partial<Record<Signal, boolean>>;
  weather?: Weather | null;
  birthYear?: number | null;
  zodiac?: number | null;       // 0 양자리 ~ 11 물고기자리
  dayElement?: number | null;   // 사주 일간의 오행 0 목 ~ 4 수
  dayStem?: number | null;
  typeCode?: string | null;     // 예: ENFP, 모르는 축은 X
  stats?: Stats | null;
};
export type Reason = { n: number; signal: Signal | "seed"; title: string; text: string; tags: string[] };
export type FortuneOutput = {
  version: string;
  numbers: number[];            // 오름차순 6개
  reasons: Reason[];            // numbers 순서와 같음
  total: number[];              // 45개 합계 점수 (믹서 히트맵용, 0~1로 정규화)
  used: Signal[];               // 실제로 점수를 준 신호
  funIndex: number;             // 35~97
  headline: string;
  summary: string;
  dayLabel: string;             // 예: 계묘(癸卯)일
};

// ---------------------------------------------------------------- 씨앗
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}
const ymdKey = (d: Ymd) => `${d.y}-${d.m}-${d.d}`;
// 받침 있는 오행(목·금) → 이/을, 없는 오행(화·토·수) → 가/를
const HAS_BATCHIM = [true, false, false, true, false];
const iga = (e: number) => (HAS_BATCHIM[e] ? "이" : "가");
const eulreul = (e: number) => (HAS_BATCHIM[e] ? "을" : "를");
const N = Array.from({ length: 45 }, (_, i) => i + 1);

export function zodiacOf(month: number, day: number): number {
  const starts = [321, 420, 521, 622, 723, 823, 923, 1023, 1122, 1222, 120, 219];
  const md = month * 100 + day;
  for (let i = 0; i < 12; i++) {
    const s = starts[i], e = starts[(i + 1) % 12];
    if (s < e ? md >= s && md < e : md >= s || md < e) return i;
  }
  return 9;
}

export function weatherGroup(code: number): "clear" | "cloud" | "rain" | "snow" | "storm" {
  if (code <= 1) return "clear";
  if (code <= 48) return "cloud";
  if (code >= 95) return "storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  return "rain";
}
const WEATHER_WORD = { clear: "맑음", cloud: "흐림", rain: "비", snow: "눈", storm: "뇌우" };

// ---------------------------------------------------------------- 신호별 점수 (원점수, 이유 문구)
type Raw = { score: number[]; why: (n: number) => string } | null;
const zeros = () => new Array(45).fill(0);

function sigDay(d: Ymd): Raw {
  const g = dayGanjiIndex(d);
  const se = elementOfStem(g % 10), be = BRANCH_ELEMENT[g % 12];
  const s = zeros();
  N.forEach((n, i) => {
    if (elementOfNumber(n) === se) s[i] += 1;
    if (elementOfNumber(n) === be) s[i] += 0.6;
    if (n % 10 === d.d % 10) s[i] += 0.5;
  });
  const name = `${STEM_NAMES[g % 10]}${BRANCH_NAMES[g % 12]}일`;
  return { score: s, why: (n) => elementOfNumber(n) === se ? `${name}의 ${ELEMENT_NAMES[se]}(${ELEMENT_HANJA[se]}) 기운을 닮은 숫자예요.` : n % 10 === d.d % 10 ? `오늘 날짜(${d.d}일)와 끝자리가 같은 숫자예요.` : `${name}의 바탕 기운(${ELEMENT_NAMES[be]})을 닮았어요.` };
}

function sigWeather(w: Weather | null | undefined): Raw {
  if (!w) return null;
  const g = weatherGroup(w.code), s = zeros();
  const t = Math.min(45, Math.max(1, Math.abs(Math.round(w.tempC)) || 1));
  N.forEach((n, i) => {
    if (g === "clear" && n >= 21 && n <= 30) s[i] += 1;
    if (g === "cloud" && n >= 31 && n <= 40) s[i] += 1;
    if (g === "rain" && elementOfNumber(n) === 4) s[i] += 1;
    if (g === "snow" && (n >= 41 || elementOfNumber(n) === 3)) s[i] += 1;
    if (g === "storm" && elementOfNumber(n) === 1) s[i] += 1;
    if (n === t) s[i] += 1.2;
  });
  const word = WEATHER_WORD[g];
  return { score: s, why: (n) => n === t ? `오늘 기온 ${Math.round(w.tempC)}°에서 온 숫자예요.` : `${w.city ?? "오늘"} 날씨 '${word}'에 어울리는 숫자대예요.` };
}

function sigPerson(d: Ymd, birthYear: number | null | undefined): Raw {
  if (!birthYear) return null;
  const age = d.y - birthYear;
  if (age < 19 || age > 110) return null;
  const lo = Math.floor(age / 10) * 10, s = zeros();
  N.forEach((n, i) => {
    if (n >= lo && n <= lo + 9) s[i] += 1;
    if (n === age) s[i] += 1.5;
    if (n === age % 45 || n === (age % 10) * 4 + 1) s[i] += 0.4;
  });
  return { score: s, why: (n) => n === age ? `올해 ${age}세, 나이 그대로의 숫자예요.` : `${lo}대 나이대가 고른 숫자예요.` };
}

function sigZodiac(z: number | null | undefined): Raw {
  if (z === null || z === undefined || z < 0 || z > 11) return null;
  const s = zeros();
  N.forEach((n, i) => { if ((n - 1) % 12 === z) s[i] += 1; if (n === z + 1) s[i] += 0.5; });
  return { score: s, why: () => `${ZODIAC_NAMES[z]}의 순번(${z + 1})이 12칸마다 돌아오는 자리예요.` };
}

function sigSaju(e: number | null | undefined): Raw {
  if (e === null || e === undefined) return null;
  const help = generatedBy(e), s = zeros();
  N.forEach((n, i) => { if (elementOfNumber(n) === e) s[i] += 1; if (elementOfNumber(n) === help) s[i] += 0.6; });
  return { score: s, why: (n) => elementOfNumber(n) === e ? `내 사주 오행 ${ELEMENT_NAMES[e]}(${ELEMENT_HANJA[e]})을 닮은 숫자예요.` : `나를 돕는 ${ELEMENT_NAMES[help]}(${ELEMENT_HANJA[help]}) 기운의 숫자예요.` };
}

const TYPE_RULES: Record<string, [string, (n: number) => boolean]> = {
  E: ["외향: 큰 수(23~45)", (n) => n >= 23], I: ["내향: 작은 수(1~22)", (n) => n <= 22],
  S: ["감각: 짝수", (n) => n % 2 === 0], N: ["직관: 홀수", (n) => n % 2 === 1],
  T: ["사고: 3의 배수", (n) => n % 3 === 0], F: ["감정: 3의 배수가 아닌 수", (n) => n % 3 !== 0],
  J: ["판단: 끝자리 0~4", (n) => n % 10 <= 4], P: ["인식: 끝자리 5~9", (n) => n % 10 >= 5],
};
function sigType(code: string | null | undefined): Raw {
  const c = (code ?? "").toUpperCase();
  if (!/^[EIX][SNX][TFX][JPX]$/.test(c) || c === "XXXX") return null;
  const letters = c.split("").filter((x) => x !== "X");
  const s = zeros();
  N.forEach((n, i) => letters.forEach((l) => { if (TYPE_RULES[l][1](n)) s[i] += 1; }));
  return { score: s, why: (n) => { const hit = letters.filter((l) => TYPE_RULES[l][1](n)).map((l) => TYPE_RULES[l][0].split(":")[0]); return `성향 ${hit.join("·")} 조건을 모두 만족한 숫자예요.`; } };
}

function sigStats(st: Stats | null | undefined): Raw {
  if (!st || st.freq?.length !== 45) return null;
  const mx = Math.max(...st.freq), mn = Math.min(...st.freq), s = zeros();
  N.forEach((n, i) => {
    s[i] += mx > mn ? ((st.freq[i] - mn) / (mx - mn)) * 0.8 : 0;
    const gap = st.latest - st.last[i];
    if (gap >= 15) s[i] += 0.7;
  });
  return { score: s, why: (n) => { const gap = st.latest - st.last[n - 1]; return gap >= 15 ? `${gap}회째 쉬고 있는 숫자예요. (쉬어도 다음 확률은 같아요)` : `1~${st.latest}회 동안 ${st.freq[n - 1]}번 나온 숫자예요.`; } };
}

// ---------------------------------------------------------------- 합치기
export function computeFortune(inp: FortuneInput): FortuneOutput {
  const on = (s: Signal) => inp.enabled?.[s] !== false;
  const raws: Record<Signal, Raw> = {
    day: on("day") ? sigDay(inp.date) : null,
    weather: on("weather") ? sigWeather(inp.weather) : null,
    person: on("person") ? sigPerson(inp.date, inp.birthYear) : null,
    zodiac: on("zodiac") ? sigZodiac(inp.zodiac) : null,
    saju: on("saju") ? sigSaju(inp.dayElement) : null,
    type: on("type") ? sigType(inp.typeCode) : null,
    stats: on("stats") ? sigStats(inp.stats) : null,
  };
  const used = SIGNALS.filter((s) => raws[s] !== null);
  const base = `${FORTUNE_VERSION}|${inp.seedKey}|${ymdKey(inp.date)}`;
  // 신호마다 합이 1이 되게 정규화 → 어느 한 신호가 결과를 독차지하지 않음
  const norm: Record<string, number[]> = {};
  for (const s of used) {
    const sc = raws[s]!.score, sum = sc.reduce((a, b) => a + b, 0) || 1;
    norm[s] = sc.map((v) => v / sum);
  }
  // 점수 높은 숫자일수록 잘 뽑히되, 사람마다 다른 씨앗으로 '가중 추첨' → 조건이 같아도 사람마다 다른 6개
  const total = N.map((_, i) => used.reduce((a, s) => a + norm[s][i], 0));
  const tmaxRaw = Math.max(...total) || 1;
  const w = total.map((v) => (used.length ? Math.pow(v / tmaxRaw, SHARPNESS) : 1) + 0.02);
  const rnd = mulberry32(hash32(base + "|pick|" + used.join(",")));
  const pool = [...N], ws = [...w], numbers: number[] = [];
  for (let k = 0; k < 6; k++) {
    const sum = ws.reduce((a, b) => a + b, 0);
    let r = rnd() * sum, j = 0;
    while (j < ws.length - 1 && (r -= ws[j]) > 0) j++;
    numbers.push(pool[j]); pool.splice(j, 1); ws.splice(j, 1);
  }
  numbers.sort((a, b) => a - b);

  const reasons: Reason[] = numbers.map((n) => {
    if (used.length === 0) return { n, signal: "stats" as Signal, title: `${n}번 · 순수 무작위`, text: "켜진 신호가 없어 무작위로 골랐어요.", tags: [] };
    const contrib = used.map((s) => [norm[s][n - 1], s] as [number, Signal]).sort((a, b) => b[0] - a[0]);
    const top = contrib[0][1];
    if (contrib[0][0] <= 1 / 45) return { n, signal: "seed" as any, title: `${n}번 · 나만의 씨앗`, text: "오늘 나에게만 주어진 씨앗이 골라준 숫자예요.", tags: ["나만의 씨앗"] };
    const tags = contrib.filter((c) => c[0] > 1 / 45).map((c) => SIGNAL_LABEL[c[1]]);
    return { n, signal: top, title: `${n}번 · ${SIGNAL_LABEL[top]}`, text: raws[top]!.why(n), tags: tags.length ? tags : [SIGNAL_LABEL[top]] };
  });

  const g = dayGanjiIndex(inp.date);
  const dayEl = elementOfStem(g % 10);
  const dayLabel = `${STEM_NAMES[g % 10]}${BRANCH_NAMES[g % 12]}(${STEM_HANJA[g % 10]}${["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][g % 12]})일`;
  const fr = mulberry32(hash32(base + "|fun"));
  let fun = 62 + Math.round((fr() - 0.5) * 16);
  let headline = `${ELEMENT_NAMES[dayEl]}(${ELEMENT_HANJA[dayEl]}) 기운이 흐르는 하루`;
  let summary = `오늘은 ${dayLabel}. 숫자에 ${ELEMENT_NAMES[dayEl]}의 결이 묻어나요.`;
  if (inp.dayElement !== null && inp.dayElement !== undefined && on("saju")) {
    const me = inp.dayElement, rel = relationOf(me, dayEl);
    const bonus = { supported: 20, same: 12, expressing: 8, shaping: 4, steadying: -4 }[rel];
    fun += bonus;
    const meW = `${ELEMENT_NAMES[me]}(${ELEMENT_HANJA[me]})`, dW = `${ELEMENT_NAMES[dayEl]}(${ELEMENT_HANJA[dayEl]})`;
    headline = { supported: `${dW} 기운이 나를 밀어주는 날`, same: `나와 같은 ${dW}의 날, 숫자가 편해요`, expressing: `내 ${meW}${iga(me)} 밖으로 흐르는 날`, shaping: `내가 흐름을 잡는 날`, steadying: `한 박자 쉬어가는 날` }[rel];
    summary = `${meW} 사주에 ${dayLabel}의 ${dW} 기운이 만났어요.`;
  }
  if (inp.weather && on("weather")) fun += weatherGroup(inp.weather.code) === "clear" ? 6 : weatherGroup(inp.weather.code) === "storm" ? -3 : 0;
  fun = Math.max(35, Math.min(97, fun));
  const tmax = Math.max(...total), tmin = Math.min(...total);
  return {
    version: FORTUNE_VERSION, numbers, reasons, used, funIndex: fun, headline, summary, dayLabel,
    total: total.map((v) => (tmax > tmin ? (v - tmin) / (tmax - tmin) : 0)),
  };
}

// ---------------------------------------------------------------- 궁합 숫자
export type DuoOutput = { score: number; title: string; text: string; numbers: { n: number; who: "a" | "b" | "both" }[] };
export function computeDuo(date: Ymd, a: FortuneInput, b: FortuneInput): DuoOutput {
  const fa = computeFortune({ ...a, date, enabled: { ...a.enabled, stats: false, weather: false } });
  const fb = computeFortune({ ...b, date, enabled: { ...b.enabled, stats: false, weather: false } });
  const sum = fa.total.map((v, i) => v + fb.total[i]);
  const order = sum.map((v, i) => [v, i + 1] as [number, number]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  const pick = order.slice(0, 6).map((x) => x[1]).sort((x, y) => x - y);
  const keys = [a.seedKey, b.seedKey].sort().join("|");
  const r = mulberry32(hash32(`${FORTUNE_VERSION}|duo|${keys}|${ymdKey(date)}`));
  let score = 70 + Math.round((r() - 0.5) * 20);
  let title = "서로 다른 결이 만나는 사이", text = "둘의 숫자를 반씩 섞었어요.";
  const ea = a.dayElement, eb = b.dayElement;
  if (ea !== null && ea !== undefined && eb !== null && eb !== undefined) {
    const rel = relationOf(ea, eb);
    const A = `${ELEMENT_NAMES[ea]}(${ELEMENT_HANJA[ea]})`, B = `${ELEMENT_NAMES[eb]}(${ELEMENT_HANJA[eb]})`;
    if (rel === "expressing") { score += 18; title = `${A}${iga(ea)} ${B}${eulreul(eb)} 키우는 사이`; text = "한쪽이 다른 쪽을 밀어주는 상생 조합이에요."; }
    else if (rel === "supported") { score += 18; title = `${B}${iga(eb)} ${A}${eulreul(ea)} 키우는 사이`; text = "한쪽이 다른 쪽을 밀어주는 상생 조합이에요."; }
    else if (rel === "same") { score += 10; title = `같은 ${A}끼리`; text = "닮은 기운이라 숫자도 많이 겹쳐요."; }
    else { score -= 2; title = "서로 다듬어 주는 사이"; text = "부딪히며 균형을 맞추는 조합이에요."; }
  }
  score = Math.max(40, Math.min(99, score));
  const topA = new Set(fa.numbers), topB = new Set(fb.numbers);
  const numbers = pick.map((n) => ({ n, who: (fa.total[n - 1] >= 0.5 && fb.total[n - 1] >= 0.5) || (topA.has(n) && topB.has(n)) ? "both" as const : fa.total[n - 1] >= fb.total[n - 1] ? "a" as const : "b" as const }));
  return { score, title, text, numbers };
}

// ---------------------------------------------------------------- 순수 무작위 (뽑기 '순수 랜덤')
export function randomSix(rand: () => number = Math.random): number[] {
  const pool = [...N];
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  return pool.slice(0, 6).sort((a, b) => a - b);
}
