import { useEffect, useRef, useState } from "preact/hooks";
import { api } from "../api";
import { Ball, toast } from "../ui";

const RESEND_WAIT = 60; // Supabase: 같은 주소는 60초에 한 번만 보낼 수 있음

export function Login() {
  const [adult, setAdult] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => { if (sent) codeRef.current?.focus(); }, [sent]);

  const send = async () => {
    setBusy(true);
    try {
      await api.sendCode(email.trim());
      setSent(true); setCode(""); setWait(RESEND_WAIT);
      toast("인증번호를 메일로 보냈어요.");
    } catch (e: any) { toast(e.message); } finally { setBusy(false); }
  };
  const verify = async (value = code) => {
    if (value.length < 6 || busy) return;
    setBusy(true);
    try { await api.verifyCode(email.trim(), value); }
    catch (e: any) { toast(e.message); setCode(""); codeRef.current?.focus(); } finally { setBusy(false); }
  };
  const onCode = (raw: string) => {
    const v = raw.replace(/\D/g, "").slice(0, 8);
    setCode(v);
    if (v.length === 6) verify(v); // 6자리 다 입력하면 바로 확인
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
              <input class="input" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter" && adult && validEmail && !busy) send(); }} />
            </label>
            <button class="btn lime" disabled={!adult || !validEmail || busy} onClick={send}>{busy ? "보내는 중…" : "인증번호 받기"}</button>
          </>
        ) : (
          <>
            <div class="card">
              <h3>메일로 받은 6자리 숫자를 입력해 주세요</h3>
              <p class="sub"><b style={{ color: "var(--lime)" }}>{email}</b>로 인증번호를 보냈어요. 어느 기기에서 메일을 열어도, 이 화면에 숫자만 입력하면 돼요.</p>
              <p class="small">메일이 안 보이면 스팸함도 확인해 주세요. 번호는 잠시 후 만료돼요.</p>
            </div>
            <label class="field">인증번호
              <input ref={codeRef} class="input num" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={8} placeholder="000000" value={code} onInput={(e) => onCode((e.target as HTMLInputElement).value)} onKeyDown={(e) => { if (e.key === "Enter") verify(); }} style={{ fontSize: 26, letterSpacing: 8, textAlign: "center" }} />
            </label>
            <button class="btn lime" disabled={code.length < 6 || busy} onClick={() => verify()}>{busy ? "확인 중…" : "시작하기"}</button>
            <div class="row" style={{ justifyContent: "space-between" }}>
              <button class="link" disabled={wait > 0 || busy} onClick={send} style={{ opacity: wait > 0 ? 0.5 : 1 }}>{wait > 0 ? `다시 보내기 (${wait}초)` : "인증번호 다시 보내기"}</button>
              <button class="link" onClick={() => { setSent(false); setCode(""); }}>메일 주소 바꾸기</button>
            </div>
          </>
        )}
        <p class="foot">기록·조회·재미 콘텐츠 서비스예요. 복권 판매나 구매 대행은 하지 않아요.<br />어떤 숫자든 1등 확률은 1/8,145,060로 같습니다 · 도박 문제 상담 1336</p>
      </div>
    </div>
  );
}
