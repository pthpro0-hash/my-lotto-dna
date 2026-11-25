import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import type { FullStats, Profile } from "./api";
import { todayKst, ymdString, type Ymd } from "./lib/core";
import { computeFortune, SIGNALS, type FortuneInput, type Signal, type Weather } from "./lib/fortune";

export type AppState = {
  session: Session; profile: Profile; stats: FullStats | null; weather: Weather | null; counts: number[] | null;
  reload: () => Promise<void>;
};
export const Ctx = createContext<AppState | null>(null);
export const useApp = () => useContext(Ctx)!;

export const today = (): Ymd => todayKst();
export const todayKey = () => ymdString(today());

// 믹서에서 저장한 '오늘의 신호 조합' (오늘 하루만 유효)
export function savedSignals(): Partial<Record<Signal, boolean>> | null {
  try { const v = JSON.parse(localStorage.getItem("mix_" + todayKey()) ?? "null"); return v; } catch { return null; }
}
export function saveSignals(on: Partial<Record<Signal, boolean>>) {
  try { localStorage.setItem("mix_" + todayKey(), JSON.stringify(on)); } catch { /* 무시 */ }
}

export function fortuneInput(s: AppState, enabled?: Partial<Record<Signal, boolean>>): FortuneInput {
  const p = s.profile;
  return {
    date: today(), seedKey: s.session.user.id, enabled: enabled ?? savedSignals() ?? undefined,
    weather: p.weather_on ? s.weather : null, birthYear: p.birth_year, zodiac: p.zodiac,
    dayElement: p.day_element, dayStem: p.day_stem, typeCode: p.type_code,
    stats: s.stats ? { freq: s.stats.freq, last: s.stats.last, latest: s.stats.latest } : null,
  };
}
export const todayFortune = (s: AppState) => computeFortune(fortuneInput(s));
export const usedSignals = (on?: Partial<Record<Signal, boolean>> | null) => SIGNALS.filter((x) => on?.[x] !== false);
