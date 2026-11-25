// ============================================================================
// MY LOTTO DNA · 나의 상징 숫자 — 공용 계산 로직 (algo symbol-v1)
// 이 블록은 saju-profile, symbol-numbers 두 함수에 똑같이 들어갑니다.
// 수정하려면 src/core.ts를 고친 뒤 build.mjs로 두 함수 파일을 다시 만드세요.
// ============================================================================

export const ALGO_VERSION = "symbol-v1";

export const STEM_NAMES = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
export const STEM_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export const BRANCH_NAMES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"];
// 오행 순서 = 상생 순서 (목 → 화 → 토 → 금 → 수 → 목)
export const ELEMENT_NAMES = ["목", "화", "토", "금", "수"];
export const ELEMENT_HANJA = ["木", "火", "土", "金", "水"];

const DAY_MS = 86_400_000;
// 일진 기준일: 2000-01-01 = 戊午(60갑자 54번). 1900-01-01 = 甲戌(10번)과 교차 검증됨.
const GANJI_ANCHOR_UTC = Date.UTC(2000, 0, 1);
const GANJI_ANCHOR_INDEX = 54;
// 로또 1회 추첨일 (토요일)
const DRAW1_UTC = Date.UTC(2002, 11, 7);

export type Ymd = { y: number; m: number; d: number };
export type Relation = "same" | "supported" | "expressing" | "shaping" | "steadying";
export type Role = "mine" | "week" | "helper" | "free";

// ---------------------------------------------------------------- 날짜·일진
export function ymdToUtc(v: Ymd): number {
  return Date.UTC(v.y, v.m - 1, v.d);
}
export function utcToYmd(ms: number): Ymd {
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}
export function addDays(v: Ymd, n: number): Ymd {
  return utcToYmd(ymdToUtc(v) + n * DAY_MS);
}
export function ymdString(v: Ymd): string {
  return `${v.y}-${String(v.m).padStart(2, "0")}-${String(v.d).padStart(2, "0")}`;
}
export function parseYmd(s: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  const v = { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
  const back = utcToYmd(ymdToUtc(v));
  if (back.y !== v.y || back.m !== v.m || back.d !== v.d) return null; // 2월 30일 같은 날짜 거르기
  return v;
}
/** 양력 날짜의 일진(60갑자 순번, 갑자 = 0) */
export function dayGanjiIndex(v: Ymd): number {
  const days = Math.round((ymdToUtc(v) - GANJI_ANCHOR_UTC) / DAY_MS);
  return (((GANJI_ANCHOR_INDEX + days) % 60) + 60) % 60;
}
export function ganjiName(idx: number): string {
  return STEM_NAMES[idx % 10] + BRANCH_NAMES[idx % 12];
}
export function ganjiHanja(idx: number): string {
  const B = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  return STEM_HANJA[idx % 10] + B[idx % 12];
}
export function elementOfStem(stem: number): number {
  return Math.floor(stem / 2);
}

// ---------------------------------------------------------------- 오행 관계
export const generates = (e: number) => (e + 1) % 5; // e가 생하는 오행
export const generatedBy = (e: number) => (e + 4) % 5; // e를 생하는 오행 (도움 오행)
export const controls = (e: number) => (e + 2) % 5; // e가 극하는 오행

/** 나의 오행(me)과 이번 주 오행(week)의 관계 */
export function relationOf(me: number, week: number): Relation {
  if (me === week) return "same";
  if (generates(week) === me) return "supported"; // 이번 주가 나를 생함
  if (generates(me) === week) return "expressing"; // 내가 이번 주를 생함
  if (controls(me) === week) return "shaping"; // 내가 이번 주를 극함
  return "steadying"; // 이번 주가 나를 극함
}

// ---------------------------------------------------------------- 하도 오행수
// 끝자리: 수 1·6, 화 2·7, 목 3·8, 금 4·9, 토 5·0 → n % 5 로 판정
const POOL_MOD = [3, 2, 0, 4, 1]; // 목, 화, 토, 금, 수
export function elementOfNumber(n: number): number {
  return POOL_MOD.indexOf(n % 5);
}
export function poolOf(element: number | null): number[] {
  const all = Array.from({ length: 45 }, (_, i) => i + 1);
  if (element === null) return all;
  return all.filter((n) => n % 5 === POOL_MOD[element]);
}

// ---------------------------------------------------------------- 회차
export function drawDate(drawNo: number): Ymd {
  return utcToYmd(DRAW1_UTC + (drawNo - 1) * 7 * DAY_MS);
}
/** '이번 주 기운' 기준일 = 그 회차 주의 첫날(일요일). 추첨일과 운을 직접 잇지 않기 위해 (규제 검수 반영) */
export function weekBaseDate(drawNo: number): Ymd {
  return addDays(drawDate(drawNo), -6);
}
/** 주어진 날짜(한국 날짜) 당일 또는 그 이후 첫 토요일의 회차 */
export function drawNoOnOrAfter(v: Ymd): number {
  const days = Math.round((ymdToUtc(v) - DRAW1_UTC) / DAY_MS);
  return Math.max(1, Math.ceil(days / 7) + 1);
}
export function todayKst(nowMs: number = Date.now()): Ymd {
  return utcToYmd(nowMs + 9 * 3_600_000);
}

// ---------------------------------------------------------------- 사주 (A안: 일간)
export type DayProfile = {
  day_ganji: number;
  day_stem: number;
  day_branch: number;
  day_element: number;
  yin_yang: "yang" | "yin";
  label: string; // 예: 병화(丙火)
};
export function dayProfile(solar: Ymd): DayProfile {
  const g = dayGanjiIndex(solar);
  const stem = g % 10;
  const el = elementOfStem(stem);
  return {
    day_ganji: g,
    day_stem: stem,
    day_branch: g % 12,
    day_element: el,
    yin_yang: stem % 2 === 0 ? "yang" : "yin",
    label: `${STEM_NAMES[stem]}${ELEMENT_NAMES[el]}(${STEM_HANJA[stem]}${ELEMENT_HANJA[el]})`,
  };
}

// ---------------------------------------------------------------- 성격 유형
/** 4글자, 모르는 축은 X (예: ENXP). 전부 X면 입력 없음으로 봄 */
export function normalizeType(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (!/^[EIX][SNX][TFX][JPX]$/.test(c) || c === "XXXX") return null;
  return c;
}

// ---------------------------------------------------------------- 해시·난수
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export async function rngFrom(text: string): Promise<() => number> {
  const hex = await sha256Hex(text);
  return mulberry32(parseInt(hex.slice(0, 8), 16));
}

// ---------------------------------------------------------------- 숫자 생성
export type GenerateInput = {
  userId: string;
  drawNo: number;
  dayStem: number | null; // 일간 (사주 없으면 null)
  weakElement: number | null; // B안 보완 오행 (A안은 null)
  typeCode: string | null; // 성격 유형 (없으면 null)
  includeMyNumber: boolean;
  slotRoles?: Role[]; // 테스트 비교용 (운영에서는 쓰지 않음)
};
export type Pick = {
  value: number;
  slot: number; // 0~5, 뽑은 순서
  role: Role;
  element: number | null; // 사주 없으면 null
  traits: string[]; // 가중치를 실제로 올린 성격 축 (E, I, S, N, T, F)
  signature: boolean;
};
export type GeneratedSet = {
  picks: Pick[]; // 항상 6개
  settingsHash: string;
  drawNo: number;
  weekStem: number;
  relation: Relation | null;
  hasType: boolean;
  algoVersion: string;
};

// 6번째는 1~45 전체에서 성격 유형으로 고르는 자리 (같은 세트 중복·쏠림 방지, 시뮬레이션으로 결정)
export const SLOT_ROLES: Role[] = ["mine", "week", "helper", "mine", "helper", "free"];

export function settingsString(i: GenerateInput): string {
  return [i.includeMyNumber ? 1 : 0, i.dayStem ?? "-", i.weakElement ?? "-", normalizeType(i.typeCode) ?? "----"].join("|");
}

function traitWeights(n: number, type: string | null, picked: number[]): { w: number; traits: string[] } {
  let w = 1;
  const traits: string[] = [];
  if (!type) return { w, traits };
  const odd = n % 2 === 1;
  if (type[0] === "E" && odd) { w *= 1.5; traits.push("E"); }
  if (type[0] === "I" && !odd) { w *= 1.5; traits.push("I"); }
  if (type[1] === "S" && n <= 22) { w *= 1.5; traits.push("S"); }
  if (type[1] === "N" && n >= 23) { w *= 1.5; traits.push("N"); }
  if (picked.length > 0) {
    if (type[2] === "T" && picked.every((p) => Math.abs(p - n) >= 8)) { w *= 1.5; traits.push("T"); }
    if (type[2] === "F" && picked.some((p) => Math.abs(p - n) <= 5)) { w *= 1.5; traits.push("F"); }
  }
  return { w, traits };
}

function weightedPick(cands: number[], type: string | null, picked: number[], rng: () => number) {
  const scored = cands.map((n) => ({ n, ...traitWeights(n, type, picked) }));
  const total = scored.reduce((s, c) => s + c.w, 0);
  let r = rng() * total;
  for (const c of scored) {
    r -= c.w;
    if (r < 0) return c;
  }
  return scored[scored.length - 1];
}

export async function generateSymbolSet(input: GenerateInput): Promise<GeneratedSet> {
  const type = normalizeType(input.typeCode);
  const hasSaju = input.dayStem !== null && input.dayStem !== undefined;
  if (!hasSaju && !type) throw Object.assign(new Error("사주나 성격 유형 중 하나는 있어야 합니다"), { code: "NO_INPUT" });

  const weekStem = dayGanjiIndex(weekBaseDate(input.drawNo)) % 10;
  const mine = hasSaju ? elementOfStem(input.dayStem as number) : null;
  const week = hasSaju ? elementOfStem(weekStem) : null;
  let helper: number | null = null;
  if (mine !== null) {
    helper = input.weakElement !== null && input.weakElement !== mine ? input.weakElement : generatedBy(mine);
  }
  const elementFor = (role: Role): number | null =>
    role === "mine" ? mine : role === "week" ? week : role === "helper" ? helper : null;

  const settingsHash = (await sha256Hex(settingsString(input))).slice(0, 16);
  const rng = await rngFrom(`${input.userId}|${input.drawNo}|${settingsHash}|${ALGO_VERSION}`);
  const roles: Role[] = hasSaju ? (input.slotRoles ?? SLOT_ROLES) : ["free", "free", "free", "free", "free", "free"];
  const picks: Pick[] = [];
  const pickedValues = () => picks.map((p) => p.value);

  // J: 매주 같은 시그니처 숫자를 첫 자리에 고정 (회차와 무관한 시드)
  if (type && type[3] === "J") {
    const sigRng = await rngFrom(`${input.userId}|signature|${input.dayStem ?? "-"}|${ALGO_VERSION}`);
    const c = weightedPick(poolOf(elementFor(roles[0])), type, [], sigRng);
    picks.push({ value: c.n, slot: 0, role: roles[0], element: elementFor(roles[0]), traits: c.traits, signature: true });
  }

  for (let slot = picks.length; slot < 6; slot++) {
    const role = roles[slot];
    const el = elementFor(role);
    const cands = poolOf(el).filter((n) => !pickedValues().includes(n));
    const c = weightedPick(cands, type, pickedValues(), rng);
    picks.push({ value: c.n, slot, role, element: el, traits: c.traits, signature: false });
  }

  return {
    picks,
    settingsHash,
    drawNo: input.drawNo,
    weekStem,
    relation: mine !== null && week !== null ? relationOf(mine, week) : null,
    hasType: type !== null,
    algoVersion: ALGO_VERSION,
  };
}

// ---------------------------------------------------------------- 화면용 결과
export type DisplayNumber = { value: number; element: string | null; role: Role | "my_number"; tags: string[] };

const ROLE_LABEL: Record<string, string> = { mine: "나의 기운", week: "이번 주", helper: "도움" };
const TRAIT_LABEL: Record<string, string> = {
  E: "E·홀수", I: "I·짝수", S: "S·작은 숫자", N: "N·큰 숫자", T: "T·넓은 간격", F: "F·가까운 간격",
};

/** 저장된 6개 중 앞 N개를 보여주고, '나의 숫자 포함'이면 N번째를 나의 숫자로 바꿈 */
export async function toDisplay(
  set: GeneratedSet,
  n: number,
  opts: { userId: string; includeMyNumber: boolean; myNumbers: number[] },
): Promise<{ numbers: DisplayNumber[]; myNumberAvailable: boolean }> {
  const shown = set.picks.slice(0, n);
  const out: DisplayNumber[] = shown.map((p) => ({
    value: p.value,
    element: ELEMENT_NAMES[elementOfNumber(p.value)],
    role: p.role,
    tags: [
      ...(p.element === null ? [set.hasType ? "성격 숫자" : "자유 숫자"] : [`${ELEMENT_NAMES[p.element]}·${ROLE_LABEL[p.role]}`]),
      ...p.traits.map((t) => TRAIT_LABEL[t]),
      ...(p.signature ? ["고정 숫자"] : []),
    ],
  }));
  const myNumberAvailable = opts.myNumbers.length > 0;
  if (opts.includeMyNumber && myNumberAvailable) {
    const before = shown.slice(0, n - 1).map((p) => p.value);
    const cands = [...new Set(opts.myNumbers)].filter((x) => x >= 1 && x <= 45 && !before.includes(x)).sort((a, b) => a - b);
    if (cands.length > 0) {
      const r = await rngFrom(`${opts.userId}|${set.drawNo}|${set.settingsHash}|my-number|${n}`);
      const v = cands[Math.floor(r() * cands.length)];
      out[n - 1] = { value: v, element: ELEMENT_NAMES[elementOfNumber(v)], role: "my_number", tags: ["나의 숫자"] };
    }
  }
  out.sort((a, b) => a.value - b.value);
  return { numbers: out, myNumberAvailable };
}

// ---------------------------------------------------------------- 해석 문장
// 기본 문장 v2 (검수팀 3명 검수 반영, 2026-11-25). DB의 symbol_copy_templates(reviewed = true)가 있으면 그 값이 우선합니다.
export const EASY_ELEMENT = ["나무", "불", "흙", "쇠", "물"];
export const DEFAULT_COPY: Record<string, string> = {
  "stem.0": "곧게 뻗는 큰 나무, 갑목(甲木)의 기운을 가진 사람이에요.",
  "stem.1": "꺾여도 다시 서는 풀꽃, 을목(乙木)의 기운을 가진 사람이에요.",
  "stem.2": "환하게 비추는 태양, 병화(丙火)의 기운을 가진 사람이에요.",
  "stem.3": "어둠을 밝히는 촛불, 정화(丁火)의 기운을 가진 사람이에요.",
  "stem.4": "든든하게 버티는 큰 산, 무토(戊土)의 기운을 가진 사람이에요.",
  "stem.5": "씨앗을 품어 기르는 논밭, 기토(己土)의 기운을 가진 사람이에요.",
  "stem.6": "거칠어도 단단한 바위, 경금(庚金)의 기운을 가진 사람이에요.",
  "stem.7": "섬세하게 빛나는 보석, 신금(辛金)의 기운을 가진 사람이에요.",
  "stem.8": "깊고 넓은 큰 바다, 임수(壬水)의 기운을 가진 사람이에요.",
  "stem.9": "조용히 스며드는 빗물, 계수(癸水)의 기운을 가진 사람이에요.",
  "metaphor.0": "큰 나무", "metaphor.1": "풀꽃", "metaphor.2": "태양", "metaphor.3": "촛불", "metaphor.4": "큰 산",
  "metaphor.5": "논밭", "metaphor.6": "바위", "metaphor.7": "보석", "metaphor.8": "큰 바다", "metaphor.9": "빗물",
  "line2": "{week} 기운이 이번 주의 기준이에요. 내 기운과는 '{label}' 관계라 두 기운의 숫자를 함께 넣었어요.",
  "line2.same": "{week} 기운이 이번 주의 기준이에요. 내 기운과 같은 오행이라 내 기운의 숫자를 하나 더 넣었어요.",
  "relation.same.label": "나란한",
  "relation.supported.label": "이어받는",
  "relation.expressing.label": "이어 주는",
  "relation.shaping.label": "이끄는",
  "relation.steadying.label": "다잡는",
  "line3.two": "{a}, {b} 골랐어요.",
  "line3.one": "{a} 골랐어요.",
  "axis.E": "밖으로 뻗는 E라 홀수를 조금 더",
  "axis.I": "안으로 모으는 I라 짝수를 조금 더",
  "axis.S": "눈앞을 보는 S라 작은 숫자(1~22)를 조금 더",
  "axis.N": "멀리 보는 N이라 큰 숫자(23~45)를 조금 더",
  "axis.T": "차분히 따지는 T라 숫자 사이를 넓게 띄워",
  "axis.F": "곁을 챙기는 F라 숫자 사이를 가깝게 모아",
  "axis.J": "미리 계획하는 J라 고정 숫자 하나를 두고",
  "axis.P": "그때그때 정하는 P라 새로운 숫자 위주로",
  "hint.no_type": "성격 유형을 넣으면 숫자를 고른 방식도 함께 알려 드려요.",
  "footer": "재미로 만든 숫자이며 추첨 결과를 예측하지 않아요. 어떤 번호를 골라도 1등 확률은 똑같이 8,145,060분의 1이에요. 19세 이상 이용.",
  "share.notice": "재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상",
  "quiz.notice": "간단한 퀴즈 결과이며 공인 성격검사가 아니에요.",
};

function fill(t: string, vars: Record<string, string>): string {
  return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

export function buildCopy(
  args: { dayStem: number | null; weekStem: number; relation: Relation | null; typeCode: string | null },
  copy: Record<string, string> = DEFAULT_COPY,
): { header: string; lines: string[]; footer: string; hint: string | null; relationLabel: string | null } {
  const c = { ...DEFAULT_COPY, ...copy };
  const type = normalizeType(args.typeCode);
  const lines: string[] = [];
  let relationLabel: string | null = null;
  if (args.dayStem !== null) {
    lines.push(c[`stem.${args.dayStem}`]);
    if (args.relation) {
      relationLabel = c[`relation.${args.relation}.label`];
      const ws = args.weekStem, we = elementOfStem(ws);
      const week = `${STEM_NAMES[ws]}${ELEMENT_NAMES[we]}(${EASY_ELEMENT[we]})`;
      lines.push(fill(args.relation === "same" ? c["line2.same"] : c.line2, { week, label: relationLabel }));
    }
  }
  if (type) {
    // 우선순위 E/I > S/N > T/F > J/P, 최대 2개
    const order = [0, 1, 2, 3].filter((i) => type[i] !== "X");
    const phrases = order.slice(0, 2).map((i) => c[`axis.${type[i]}`]);
    if (phrases.length === 2 && phrases[0].endsWith("조금 더")) phrases[1] = phrases[1].replace(/를 조금 더$/, "도 조금 더");
    lines.push(phrases.length === 2 ? fill(c["line3.two"], { a: phrases[0], b: phrases[1] }) : fill(c["line3.one"], { a: phrases[0] }));
  }
  const letters = type ? type.replace(/X/g, "") : "";
  const stemPart = args.dayStem !== null
    ? `${c[`metaphor.${args.dayStem}`]} ${STEM_NAMES[args.dayStem]}${ELEMENT_NAMES[elementOfStem(args.dayStem)]}(${STEM_HANJA[args.dayStem]}${ELEMENT_HANJA[elementOfStem(args.dayStem)]})`
    : null;
  const header = [stemPart, letters || null].filter(Boolean).join(" × ");
  return { header, lines, footer: c.footer, hint: type ? null : c["hint.no_type"], relationLabel };
}

// ---------------------------------------------------------------- API 키 (새 키 우선, 레거시 대체)
// Supabase는 anon/service_role 키를 2027년 초 폐기 예정 → SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS(JSON)를 먼저 씁니다.
export function supabaseKeys(env: { get(k: string): string | undefined }): { publishable?: string; secret?: string } {
  const pick = (jsonText: string | undefined, legacy: string | undefined): string | undefined => {
    if (jsonText) {
      try {
        const d = JSON.parse(jsonText);
        const v = d?.default ?? Object.values(d ?? {})[0];
        if (typeof v === "string" && v) return v;
      } catch { /* 형식이 다르면 레거시 키로 */ }
    }
    return legacy || undefined;
  };
  return {
    publishable: pick(env.get("SUPABASE_PUBLISHABLE_KEYS"), env.get("SUPABASE_ANON_KEY")),
    secret: pick(env.get("SUPABASE_SECRET_KEYS"), env.get("SUPABASE_SERVICE_ROLE_KEY")),
  };
}

// ---------------------------------------------------------------- 공통 HTTP
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
};
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" } });
}
