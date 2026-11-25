import { useState } from "preact/hooks";
import { api } from "../api";
import { CITIES } from "../config";
import { ZODIAC_NAMES, zodiacOf } from "../lib/fortune";
import { ELEMENT_HANJA, ELEMENT_NAMES } from "../lib/core";
import { useApp } from "../state";
import { toast } from "../ui";

const AXES: [string, string, string, string][] = [["E", "외향", "I", "내향"], ["S", "감각", "N", "직관"], ["T", "사고", "F", "감정"], ["J", "판단", "P", "인식"]];

export function Me({ first }: { first: boolean }) {
  const app = useApp();
  const p = app.profile;
  const [nickname, setNickname] = useState(p.nickname ?? "");
  const [gender, setGender] = useState<string | null>(p.gender);
  const [birth, setBirth] = useState("");
  const [lunar, setLunar] = useState(false);
  const [time, setTime] = useState("");
  const [type, setType] = useState<string[]>((p.type_code ?? "XXXX").split(""));
  const [city, setCity] = useState(p.city ?? "seoul");
  const [weatherOn, setWeatherOn] = useState(p.weather_on ?? true);
  const [adult, setAdult] = useState(!first);
  const [busy, setBusy] = useState(false);

  const by = birth ? Number(birth.slice(0, 4)) : p.birth_year;
  const age = by ? new Date().getFullYear() - by : null;
  const tooYoung = age !== null && age < 19;

  const save = async () => {
    setBusy(true);
    try {
      if (first || !p.age_confirmed) await api.onboard();
      let zodiac = p.zodiac, birthYear = p.birth_year;
      if (birth) {
        const [y, m, d] = birth.split("-").map(Number);
        birthYear = y;
        zodiac = lunar ? p.zodiac : zodiacOf(m, d); // 음력이면 별자리는 서버 변환 결과(양력)로 다시 계산
        const r: any = await api.saju({ calendar: lunar ? "lunar" : "solar", date: birth, is_leap_month: false, time: time || null, boundary_choice: "birth_day", save_raw: false, mode: "A" });
        if (r?.solar_date) { const [, sm, sd] = String(r.solar_date).split("-").map(Number); zodiac = zodiacOf(sm, sd); }
      }
      const code = type.join("");
      await api.setProfile({ nickname: nickname.trim() || null, gender, birthYear, zodiac, city, weatherOn, typeCode: code === "XXXX" ? null : code });
      await app.reload();
      toast(first ? "내 숫자 지문을 만들었어요." : "저장했어요.");
      location.hash = "#/today";
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  const exportData = async () => {
    try {
      const data = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a"); a.href = url; a.download = "my-lotto-dna-data.json"; a.click(); URL.revokeObjectURL(url);
    } catch (e: any) { toast(e.message); }
  };
  const del = async (account: boolean) => {
    if (!confirm(account ? "계정과 모든 기록을 지울까요? 되돌릴 수 없어요." : "기록과 프로필을 모두 지울까요? 되돌릴 수 없어요.")) return;
    try { if (account) await api.deleteAccount(); else { await api.deleteData(); await app.reload(); } toast("삭제했어요."); } catch (e: any) { toast(e.message); }
  };

  const hasBirth = birth !== "" || p.birth_year != null;
  const filled = 2 + (hasBirth ? 1 : 0) + (birth !== "" || p.zodiac != null ? 1 : 0) + (birth !== "" || p.day_element != null ? 1 : 0) + (type.some((t) => t !== "X") ? 1 : 0) + (weatherOn ? 1 : 0); // 날짜 일진·역대 통계는 항상 켜짐

  return (
    <div class="page">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1>{first ? <>세상에 하나뿐인<br />내 숫자 만들기</> : "나"}</h1>
        <div class="row small"><div class="bar"><i style={{ width: `${(filled / 7) * 100}%` }} /></div>신호 {filled} / 7</div>
      </div>

      <div class="card">
        <h3>기본 정보</h3>
        <label class="field">닉네임 (선택)
          <input class="input" maxLength={12} value={nickname} placeholder="화면에 부를 이름" onInput={(e) => setNickname((e.target as HTMLInputElement).value)} />
        </label>
        <div class="field">성별 (숫자 섞는 순서에만 쓰여요)
          <div class="chips">{[["f", "여성"], ["m", "남성"], ["n", "선택 안 함"]].map(([v, l]) => <button class={`chip${gender === v ? " on" : ""}`} onClick={() => setGender(v)}>{l}</button>)}</div>
        </div>
        <label class="field">생년월일 {p.birth_year && !birth ? `(저장됨: ${p.birth_year}년생 · ${p.zodiac !== null ? ZODIAC_NAMES[p.zodiac] : ""}${p.day_element !== null ? ` · ${ELEMENT_NAMES[p.day_element]}(${ELEMENT_HANJA[p.day_element]})` : ""})` : ""}
          <input class="input" type="date" min="1920-01-01" max="2010-12-31" value={birth} onInput={(e) => setBirth((e.target as HTMLInputElement).value)} />
        </label>
        <div class="chips">
          <button class={`chip${!lunar ? " on" : ""}`} onClick={() => setLunar(false)}>양력</button>
          <button class={`chip${lunar ? " on" : ""}`} onClick={() => setLunar(true)}>음력</button>
        </div>
        <label class="field">태어난 시각 (선택)
          <input class="input" type="time" value={time} onInput={(e) => setTime((e.target as HTMLInputElement).value)} />
        </label>
        {tooYoung && <p class="small danger">만 19세 이상만 이용할 수 있어요.</p>}
        <p class="small">생년월일은 나이·별자리·사주 오행으로 바꿔 저장하고, 날짜 자체는 저장하지 않아요.</p>
      </div>

      <div class="card">
        <h3>성향 유형 (모르면 비워 두세요)</h3>
        {AXES.map(([a, al, b, bl], i) => (
          <div class="chips">
            {[[a, al], [b, bl], ["X", "모름"]].map(([v, l]) => <button class={`chip${type[i] === v ? " on" : ""}`} style={{ flex: 1 }} onClick={() => setType(type.map((t, k) => (k === i ? v : t)))}>{l}</button>)}
          </div>
        ))}
      </div>

      <div class="card">
        <h3>오늘 날씨 반영</h3>
        <div class="between">
          <select class="input" style={{ flex: 1 }} value={city} onChange={(e) => setCity((e.target as HTMLSelectElement).value)} aria-label="도시">
            {CITIES.map((c) => <option value={c.id}>{c.name}</option>)}
          </select>
          <button class={`chip${weatherOn ? " on" : ""}`} onClick={() => setWeatherOn(!weatherOn)} aria-pressed={weatherOn}>{weatherOn ? "켜짐" : "꺼짐"}</button>
        </div>
        <p class="small">도시 단위 날씨만 써요. 내 위치는 쓰지 않아요.</p>
      </div>

      {first && <label class="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult((e.target as HTMLInputElement).checked)} />만 19세 이상입니다 (필수)</label>}
      <button class="btn lime" disabled={busy || !adult || tooYoung} onClick={save}>{busy ? "저장 중…" : first ? "내 숫자 지문 만들기" : "저장"}</button>

      {!first && (
        <div class="card">
          <h3>데이터 관리</h3>
          <button class="link" onClick={exportData}>내 데이터 내려받기 (JSON)</button>
          <button class="link" onClick={() => api.signOut()}>로그아웃</button>
          <button class="link danger" onClick={() => del(false)}>기록·프로필 전체 삭제</button>
          <button class="link danger" onClick={() => del(true)}>계정 삭제</button>
          <a class="link" href="#/privacy">개인정보처리방침</a>
        </div>
      )}
      <p class="foot">재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상 · 도박 문제 상담 1336{first && <><br /><a href="#/privacy" style={{ color: "var(--muted)", textDecoration: "underline" }}>개인정보처리방침</a></>}</p>
    </div>
  );
}
