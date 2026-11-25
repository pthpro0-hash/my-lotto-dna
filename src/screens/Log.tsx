import { useEffect, useRef, useState } from "preact/hooks";
import jsQR from "jsqr";
import { api } from "../api";
import { parseLottoQr } from "../lib/qr";
import { drawNoOnOrAfter } from "../lib/core";
import { today, useApp } from "../state";
import { Ball, Sheet, Spinner, toast, won } from "../ui";

type Toast = { kind: "ok" | "dup" | "err"; title: string; body: string };

function Scanner({ onClose, onRecorded }: { onClose: () => void; onRecorded: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<Toast[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const seen = useRef(new Set<string>());
  useEffect(() => {
    let stream: MediaStream | null = null, stop = false, busy = false;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
      } catch { setErr("카메라를 쓸 수 없어요. 브라우저의 카메라 권한을 확인하거나 '직접 입력'을 이용해 주세요."); return; }
      const tick = async () => {
        if (stop) return;
        const v = video.current;
        if (v && v.readyState >= 2 && !busy) {
          const w = 640, h = Math.round((v.videoHeight / v.videoWidth) * 640) || 640;
          canvas.width = w; canvas.height = h; ctx.drawImage(v, 0, 0, w, h);
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
          if (code?.data && !seen.current.has(code.data)) {
            seen.current.add(code.data); busy = true;
            const r = parseLottoQr(code.data); // QR 원문은 이 기기 안에서만 읽고 서버로 보내지 않음
            let t: Toast;
            if (!r.ok) t = { kind: "err", title: "로또 용지 QR이 아니에요", body: "용지 오른쪽 위 QR을 비춰 주세요" };
            else {
              try {
                const res = await api.record(r.draw_no, r.games.map((g) => ({ numbers: g.numbers, mode: g.mode })), "qr", r.dedupe_source);
                t = res.duplicate ? { kind: "dup", title: "이미 기록한 용지예요", body: res.message ?? "같은 용지는 한 번만 저장돼요" }
                  : { kind: "ok", title: `${r.draw_no}회 · ${r.games.length}게임 기록됨`, body: won(r.games.length * 1000) };
                if (!res.duplicate) { navigator.vibrate?.(60); onRecorded(); }
              } catch (e: any) { t = { kind: "err", title: "기록하지 못했어요", body: e.message }; }
            }
            setLogs((l) => [t, ...l].slice(0, 4)); busy = false;
          }
        }
        setTimeout(tick, 250);
      };
      tick();
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);
  const color = { ok: "#1F2A12", dup: "#2E2715", err: "#2A1714" };
  return (
    <Sheet onClose={onClose}>
      <div class="between"><h2>QR 연속 스캔</h2><button class="link" onClick={onClose}>닫기</button></div>
      {err ? <p class="sub">{err}</p> : <video ref={video} class="scan" playsInline muted />}
      <p class="small">용지 QR을 차례로 비추면 계속 기록돼요. QR 내용은 이 기기에서만 해석돼요.</p>
      {logs.map((t) => <div class="card" style={{ background: color[t.kind], padding: 12, gap: 2 }}><b style={{ fontSize: 14 }}>{t.title}</b><span class="small">{t.body}</span></div>)}
    </Sheet>
  );
}

function Manual({ onClose, onRecorded }: { onClose: () => void; onRecorded: () => void }) {
  const [sel, setSel] = useState<number[]>([]);
  const draw = drawNoOnOrAfter(today());
  const toggle = (n: number) => setSel(sel.includes(n) ? sel.filter((x) => x !== n) : sel.length < 6 ? [...sel, n] : sel);
  const save = async () => {
    try {
      const r = await api.record(draw, [{ numbers: [...sel].sort((a, b) => a - b), mode: "manual" }], "manual");
      toast(r.duplicate ? r.message ?? "이미 기록했어요." : `${draw}회에 1게임 기록했어요.`); onRecorded(); onClose();
    } catch (e: any) { toast(e.message); }
  };
  return (
    <Sheet onClose={onClose}>
      <div class="between"><h2>{draw}회 직접 입력</h2><button class="link" onClick={onClose}>닫기</button></div>
      <div class="picker">{Array.from({ length: 45 }, (_, i) => i + 1).map((n) => <button class={sel.includes(n) ? "on" : ""} aria-pressed={sel.includes(n)} onClick={() => toggle(n)}>{n}</button>)}</div>
      <button class="btn lime" disabled={sel.length !== 6} onClick={save}>{sel.length}/6 · 기록하기</button>
    </Sheet>
  );
}

export function Log() {
  const app = useApp();
  const [hist, setHist] = useState<any[] | null>(null);
  const [hits, setHits] = useState<any[] | null>(null);
  const [card, setCard] = useState<any>(null);
  const [sheet, setSheet] = useState<"qr" | "manual" | null>(null);
  const load = () => {
    api.history().then(setHist).catch(() => setHist([]));
    api.hits().then(setHits).catch(() => setHits([]));
    api.roundCard().then(setCard).catch(() => setCard(null));
  };
  useEffect(load, []);
  const refresh = () => { load(); app.reload(); };
  const month = new Date().toISOString().slice(0, 7);
  const spentMonth = (hist ?? []).filter((h) => String(h.draw_date).startsWith(month)).reduce((a, h) => a + (h.spent ?? 0), 0);
  const prizeYear = (hist ?? []).filter((h) => String(h.draw_date).startsWith(month.slice(0, 4))).reduce((a, h) => a + Number(h.prize_total ?? 0), 0);
  const avgHit = hits && hits.length ? hits.reduce((a, h) => a + h.hit, 0) / hits.length : null;

  return (
    <div class="page">
      <h2 style={{ fontSize: 26 }}>내 기록</h2>
      <div class="grid2">
        <button class="card" style={{ cursor: "pointer", textAlign: "left", color: "var(--text)" }} onClick={() => setSheet("qr")}><b>QR로 기록</b><span class="small">산 용지 비추기</span></button>
        <button class="card" style={{ cursor: "pointer", textAlign: "left", color: "var(--text)" }} onClick={() => setSheet("manual")}><b>직접 입력</b><span class="small">번호 6개 고르기</span></button>
      </div>

      {card && card.status !== "empty" && (
        <div class="card">
          <div class="between"><h3>{card.title}</h3><span class="small">{card.draw_date}</span></div>
          {card.winning && <div class="row" style={{ gap: 4 }}>{card.winning.numbers.map((n: number) => <Ball n={n} size={30} />)}<span class="small">+</span><Ball n={card.winning.bonus} size={30} /></div>}
          <p style={{ fontSize: 14, color: "var(--sub)" }}>{card.body}</p>
          {(card.games ?? []).map((g: any) => (
            <div class="row" style={{ gap: 4 }}>{g.numbers.map((n: number) => <span class="num" style={{ width: 30, textAlign: "center", fontSize: 13, borderRadius: 8, padding: "4px 0", background: (g.hit_numbers ?? []).includes(n) ? "var(--lime)" : "#1C1C21", color: (g.hit_numbers ?? []).includes(n) ? "var(--bg)" : "var(--muted)" }}>{n}</span>)}
              <span class="small" style={{ marginLeft: "auto" }}>{g.rank ? `${g.rank}등` : g.matched !== null ? "낙첨" : "추첨 전"}</span></div>
          ))}
        </div>
      )}

      <div class="card">
        <h3>운세 숫자 vs 실제 추첨</h3>
        <span class="small">그 주에 본 '오늘의 내 숫자'가 몇 개 맞았을까?</span>
        {hits === null ? <Spinner /> : hits.length === 0 ? <p class="small">오늘의 숫자를 본 주에 추첨이 끝나면 여기에 쌓여요.</p> : hits.map((h) => (
          <div class="row" style={{ fontSize: 13 }}>
            <span style={{ width: 56, color: "var(--muted)" }}>{h.draw_no}회</span>
            <div class="row" style={{ gap: 3, flex: 1 }}>{[0, 1, 2, 3, 4, 5].map((i) => <span style={{ width: 14, height: 14, borderRadius: "50%", background: i < h.hit ? "var(--lime)" : "#2A2A31" }} />)}</div>
            <b>{h.hit}개</b>
          </div>
        ))}
        {avgHit !== null && <p style={{ fontSize: 13, color: "var(--sub)" }}>평균 {avgHit.toFixed(2)}개. 무작위로 고른 6개의 기댓값(0.8개)과 비교해 보세요.</p>}
      </div>

      <div class="grid2">
        <div class="card" style={{ gap: 2 }}><span class="small">이번 달 지출</span><b>{won(spentMonth)}</b></div>
        <div class="card" style={{ gap: 2 }}><span class="small">올해 당첨금</span><b>{won(prizeYear)}</b></div>
      </div>

      <div class="card">
        <h3>회차별 기록</h3>
        {hist === null ? <Spinner /> : hist.length === 0 ? <p class="small">아직 기록이 없어요.</p> : hist.map((h) => (
          <div class="between" style={{ fontSize: 14, minHeight: 36 }}>
            <span>{h.draw_no}회 <span class="small">· {h.games}게임</span></span>
            <span style={{ color: h.best_rank ? "var(--lime)" : "var(--muted)", fontWeight: 700 }}>{h.status === "pending" ? "추첨 전" : h.best_rank ? `${h.best_rank}등 · ${won(Number(h.prize_total))}` : "낙첨"}</span>
          </div>
        ))}
      </div>
      <p class="foot">앱 기록은 당첨금 수령 증빙이 아니에요. 종이 용지는 꼭 보관해 주세요.</p>
      {sheet === "qr" && <Scanner onClose={() => { setSheet(null); refresh(); }} onRecorded={() => {}} />}
      {sheet === "manual" && <Manual onClose={() => setSheet(null)} onRecorded={refresh} />}
    </div>
  );
}
