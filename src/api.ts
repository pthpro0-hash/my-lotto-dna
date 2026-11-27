import { createClient } from "@supabase/supabase-js";
import { CITIES, SUPABASE_KEY, SUPABASE_URL } from "./config";
import type { Stats, Weather } from "./lib/fortune";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" } });

// 서버 오류 코드를 사람이 읽는 말로
const MESSAGES: Record<string, string> = {
  AGE_REQUIRED: "만 19세 이상만 이용할 수 있어요.",
  BAD_NUMBERS: "1~45 사이 서로 다른 숫자 6개를 골라 주세요.",
  BAD_DRAW_NO: "아직 판매 중이 아니거나 없는 회차예요.",
  BAD_TYPE: "성향 유형을 다시 골라 주세요.",
  NOT_AUTHENTICATED: "다시 로그인해 주세요.",
};
export class ApiError extends Error { code: string; constructor(code: string, msg?: string) { super(msg ?? MESSAGES[code] ?? "잠시 후 다시 시도해 주세요."); this.code = code; } }
function toErr(e: any): ApiError {
  const raw = String(e?.message ?? e ?? "");
  const code = Object.keys(MESSAGES).find((k) => raw.includes(k)) ?? (/JWT|auth/i.test(raw) ? "NOT_AUTHENTICATED" : "UNKNOWN");
  return new ApiError(code, MESSAGES[code] ?? (navigator.onLine ? "잠시 후 다시 시도해 주세요." : "인터넷 연결을 확인해 주세요."));
}
async function rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw toErr(error);
  return data as T;
}
function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  try {
    const hit = JSON.parse(localStorage.getItem(key) ?? "null");
    if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.v as T);
  } catch { /* 저장소를 못 쓰는 환경은 그냥 새로 받음 */ }
  return load().then((v) => { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch { /* 무시 */ } return v; });
}

export type Profile = {
  onboarded: boolean; age_confirmed: boolean; nickname: string | null; gender: string | null; birth_year: number | null;
  zodiac: number | null; city: string | null; weather_on: boolean; type_code: string | null; day_stem: number | null; day_element: number | null;
};
export type FullStats = Stats & { total: number; recent20: number[]; odd: number[]; sum_avg: number; sum_mid: number; consec: number; first_auto: number; first_manual: number; first_semi: number };

export const api = {
  sendCode: async (email: string) => { const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname } }); if (error) throw new ApiError("OTP", error.message.includes("rate") ? "잠시 후 다시 요청해 주세요." : "메일을 보내지 못했어요. 주소를 확인해 주세요."); },
  verifyCode: async (email: string, token: string) => { const { error } = await sb.auth.verifyOtp({ email, token, type: "email" }); if (error) throw new ApiError("OTP", "인증번호가 맞지 않거나 시간이 지났어요."); },
  signOut: () => sb.auth.signOut(),
  profile: () => rpc<Profile | null>("my_fortune_profile"),
  onboard: () => rpc("complete_onboarding", { p_age_confirmed: true, p_axes: ["analysis", "story"], p_buys_fixed: "sometimes", p_fixed_sets: [] }),
  setProfile: (p: { nickname: string | null; gender: string | null; birthYear: number | null; zodiac: number | null; city: string | null; weatherOn: boolean; typeCode: string | null }) =>
    rpc("set_fortune_profile", { p_nickname: p.nickname, p_gender: p.gender, p_birth_year: p.birthYear, p_zodiac: p.zodiac, p_city: p.city, p_weather_on: p.weatherOn, p_type_code: p.typeCode }),
  saju: async (body: Record<string, unknown>) => {
    const { data, error } = await sb.functions.invoke("saju-profile", { body });
    if (error) throw toErr(error);
    return data;
  },
  stats: () => cached<FullStats>("stats_v1", 3 * 3600_000, () => rpc<FullStats>("number_stats")),
  counts: () => rpc<number[]>("my_number_counts"),
  hits: () => rpc<{ draw_no: number; draw_date: string; numbers: number[]; hit: number }[]>("my_fortune_hits", { p_limit: 8 }),
  savePick: (source: string, numbers: number[], signals: string[]) => rpc("save_pick", { p_source: source, p_numbers: numbers, p_signals: signals }),
  combo: (numbers: number[]) => rpc<any>("combo_check", { p_numbers: numbers }),
  record: (drawNo: number, games: { numbers: number[]; mode: string }[], source: "qr" | "manual" | "fixed", dedupe?: string) =>
    rpc<any>("record_ticket", { p_draw_no: drawNo, p_games: games, p_source: source, p_dedupe_key: dedupe ?? null }),
  history: async () => { const { data, error } = await sb.from("my_history").select("*").order("draw_no", { ascending: false }).limit(20); if (error) throw toErr(error); return data ?? []; },
  // 올해(한국 날짜 기준) 추첨 회차 전체의 지출·당첨금 합계용. 목록(최근 20회차)과 따로 불러와 연초 기록이 빠지지 않게 함
  yearHistory: async (fromDrawNo: number, toDrawNo: number) => {
    const { data, error } = await sb.from("my_history").select("draw_no,draw_date,spent,prize_total,status").gte("draw_no", fromDrawNo).lte("draw_no", toDrawNo);
    if (error) throw toErr(error);
    return (data ?? []) as { draw_no: number; draw_date: string; spent: number; prize_total: number | string; status: string }[];
  },
  roundCard: (drawNo?: number) => rpc<any>("my_round_card", drawNo ? { p_draw_no: drawNo } : {}),
  exportData: () => rpc<any>("export_my_data"),
  deleteData: () => rpc("delete_my_data"),
  deleteAccount: async () => { const { error } = await sb.functions.invoke("delete-account", { body: { confirm: "DELETE" } }); if (error) throw toErr(error); await sb.auth.signOut(); },
};

// 날씨: Open-Meteo (키 없음). 도시 중심 좌표만 사용, 1시간 캐시
export async function weatherOf(cityId: string | null): Promise<Weather | null> {
  const c = CITIES.find((x) => x.id === cityId);
  if (!c) return null;
  try {
    return await cached<Weather>(`wx_${c.id}`, 3600_000, async () => {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`);
      if (!r.ok) throw new Error("weather");
      const j = await r.json();
      return { code: Number(j.current.weather_code), tempC: Number(j.current.temperature_2m), city: c.name };
    });
  } catch { return null; }
}
