import { useState } from "preact/hooks";
import { api } from "../api";
import { Ball, toast } from "../ui";

export function Login() {
  const [adult, setAdult] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const send = async () => {
    setBusy(true);
    try { await api.sendCode(email.trim()); setSent(true); toast("로그인 메일을 보냈어요."); }
    catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const verify = async () => {
    setBusy(true);
    try { await api.verifyCode(email.trim(), code.trim()); }
    catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };

  return (
    <div class="page" style={{ paddingBottom: 32, minHeight: "100dvh" }}>
      <div class="glow" aria-hidden="true" />
      <div class="row" style={{ gap: 6, marginTop: 24 }}>
        {[3, 14, 27, 33, 44].map((n, i) => <Ball n={n} size={34} drop delay={0.1 + i * 0.08} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h1>세상에 하나뿐인<br />내 로또 숫자</h1>
        <p class="sub">날짜·날씨·사주·성향까지 7가지 신호로 매일 나만의 숫자를 만들어요. 1,251회 실제 통계도 함께.</p>
      </div>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {!sent ? (
          <>
            <label class="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult((e.target as HTMLInputElement).checked)} />만 19세 이상입니다 (필수)</label>
            <label class="field">이메일
              <input class="input" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} />
            </label>
            <button class="btn lime" disabled={!adult || !validEmail || busy} onClick={send}>{busy ? "보내는 중…" : "로그인 메일 받기"}</button>
          </>
        ) : (
          <>
            <div class="card">
              <h3>메일함을 확인해 주세요</h3>
              <p class="sub">{email}로 보낸 메일의 <b style={{ color: "var(--lime)" }}>로그인 버튼</b>을 이 기기에서 누르면 바로 시작돼요. 메일에 숫자 인증번호가 있다면 아래에 입력해도 돼요.</p>
              <p class="small">메일이 안 보이면 스팸함도 확인해 주세요.</p>
            </div>
            <label class="field">인증번호 (메일에 있을 때만)
              <input class="input num" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onInput={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, ""))} style={{ fontSize: 22, letterSpacing: 6 }} />
            </label>
            <button class="btn lime" disabled={code.length < 6 || busy} onClick={verify}>{busy ? "확인 중…" : "시작하기"}</button>
            <button class="link" onClick={() => { setSent(false); setCode(""); }}>메일 주소 다시 입력</button>
          </>
        )}
        <p class="foot">기록·조회·재미 콘텐츠 서비스예요. 복권 판매나 구매 대행은 하지 않아요.<br />어떤 숫자든 1등 확률은 1/8,145,060로 같습니다 · 도박 문제 상담 1336</p>
      </div>
    </div>
  );
}
