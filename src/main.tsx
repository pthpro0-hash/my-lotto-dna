import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import type { Session } from "@supabase/supabase-js";
import "./style.css";
import { api, sb, weatherOf, type FullStats, type Profile } from "./api";
import { Ctx, type AppState } from "./state";
import { Nav, Spinner, ToastHost } from "./ui";
import type { Weather } from "./lib/fortune";
import { Login } from "./screens/Login";
import { Me } from "./screens/Me";
import { Today } from "./screens/Today";
import { Mixer } from "./screens/Mixer";
import { Pick } from "./screens/Pick";
import { Stats } from "./screens/Stats";
import { Check } from "./screens/Check";
import { Duo } from "./screens/Duo";
import { Log } from "./screens/Log";
import { Privacy } from "./screens/Privacy";

function useRoute() {
  // 로그인 메일 링크로 돌아오면 주소에 토큰(#access_token=…)이 붙음 → 화면 이름으로 쓰지 않음
  const get = () => { const h = location.hash.replace(/^#\/?/, ""); return !h || h.includes("access_token") || h.includes("error") ? "today" : h; };
  const [r, setR] = useState(get());
  useEffect(() => { const f = () => { setR(get()); window.scrollTo(0, 0); }; addEventListener("hashchange", f); return () => removeEventListener("hashchange", f); }, []);
  return r;
}

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [stats, setStats] = useState<FullStats | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [counts, setCounts] = useState<number[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [statsReady, setStatsReady] = useState(false);
  const [wxReady, setWxReady] = useState(false);
  const route = useRoute();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    api.stats().then(setStats).catch(() => {}).finally(() => setStatsReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    try {
      const p = await api.profile();
      // 숫자는 모든 재료(날씨·통계)가 도착한 뒤 한 번만 계산해야 화면에서 바뀌지 않음. 날씨는 최대 4초만 기다림
      const wx = p?.city && p.weather_on ? await Promise.race([weatherOf(p.city), new Promise<null>((r) => setTimeout(() => r(null), 4000))]) : null;
      setWeather(wx);
      setWxReady(true);
      setProfile(p);
      setFailed(false);
      api.counts().then(setCounts).catch(() => {});
    } catch { setFailed(true); }
  }, []);
  useEffect(() => { if (session) reload(); else if (session === null) setProfile(undefined); }, [session?.user.id]);

  if (route === "privacy") return <Privacy back={session ? "me" : ""} />; // 로그인 없이도 볼 수 있어야 함
  if (session === undefined) return <Spinner />;
  if (!session) return <Login />;
  if (failed) return <div class="page"><p class="sub">정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p><button class="btn ghost" onClick={reload}>다시 시도</button></div>;
  if (profile === undefined || !statsReady || !wxReady) return <Spinner />;

  const blank: Profile = { onboarded: false, age_confirmed: false, nickname: null, gender: null, birth_year: null, zodiac: null, city: "seoul", weather_on: true, type_code: null, day_stem: null, day_element: null };
  const state: AppState = { session, profile: profile ?? blank, stats, weather, counts, reload };
  const first = !profile || !profile.onboarded || !profile.age_confirmed;
  const [name, arg] = route.split("/");
  let screen;
  if (first) screen = <Me first />;
  else if (name === "me") screen = <Me first={false} />;
  else if (name === "mixer") screen = <Mixer />;
  else if (name === "pick") screen = <Pick />;
  else if (name === "stats") screen = <Stats />;
  else if (name === "check") screen = <Check preset={arg ? arg.split("-").map(Number) : undefined} />;
  else if (name === "duo") screen = <Duo />;
  else if (name === "log") screen = <Log />;
  else screen = <Today />;
  const tab = first ? "me" : ["mixer", "duo"].includes(name) ? "today" : name === "check" ? "stats" : ["today", "stats", "pick", "log", "me"].includes(name) ? name : "today";

  return (
    <Ctx.Provider value={state}>
      <div key={route + (first ? "f" : "")}>{screen}</div>
      {!first && <Nav cur={tab} />}
    </Ctx.Provider>
  );
}

function Root() { return <div class="app"><App /><ToastHost /></div>; }
render(<Root />, document.getElementById("root")!);

if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("./sw.js").catch(() => {});
