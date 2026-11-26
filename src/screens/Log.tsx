import { useEffect, useRef, useState } from "preact/hooks";
import jsQR from "jsqr";
import { api } from "../api";
import { parseLottoQr } from "../lib/qr";
import { drawNoOnOrAfter } from "../lib/core";
import { today, useApp } from "../state";
import { Ball, Sheet, Spinner, toast, won } from "../ui";

type Toast = { kind: "ok" | "dup" | "err"; title: string; body: string };

// 휴대폰 내장 QR 인식기(안드로이드 크롬 등). 없으면 jsQR로 직접 해석
declare const BarcodeDetector: any;
const hasNative = typeof (globalThis as any).BarcodeDetector === "function";

function Scanner({ onClose, onRecorded }: { onClose: () => void; onRecorded: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [logs, setLogs] = useState<Toast[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [flash, setFlash] = useState<Toast["kind"] | null>(null);
  const [zoom, setZoom] = useState<{ min: number; max: number; cur: number } | null>(null);
  const [torch, setTorch] = useState<boolean | null>(null); // null = 기기가 지원 안 함
  const seen = useRef(new Set<string>());

  const applyZoom = async (z: number) => {
    const t = trackRef.current; if (!t || !zoom) return;
    const v = Math.min(zoom.max, Math.max(zoom.min, z));
    try { await t.applyConstraints({ advanced: [{ zoom: v } as any] }); setZoom({ ...zoom, cur: v }); } catch { /* 지원 안 하면 무시 */ }
  };
  const toggleTorch = async () => {
    const t = trackRef.current; if (!t || torch === null) return;
    try { await t.applyConstraints({ advanced: [{ torch: !torch } as any] }); setTorch(!torch); } catch { /* 무시 */ }
  };

  useEffect(() => {
    let stream: MediaStream | null = null, stop = false, busy = false, pass = 0, last = 0;
    const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const detector = hasNative ? (() => { try { return new BarcodeDetector({ formats: ["qr_code"] }); } catch { return null; } })() : null;

    const handle = async (data: string) => {
      if (seen.current.has(data)) return;
      seen.current.add(data); busy = true;
      const r = parseLottoQr(data); // QR 원문은 이 기기 안에서만 읽고 서버로 보내지 않음
      let t: Toast;
      if (!r.ok) t = { kind: "err", title: "로또 용지 QR이 아니에요", body: "용지 오른쪽 위 QR을 비춰 주세요" };
      else {
        try {
          const res = await api.record(r.draw_no, r.games.map((g) => ({ numbers: g.numbers, mode: g.mode })), "qr", r.dedupe_source);
          t = res.duplicate ? { kind: "dup", title: "이미 기록한 용지예요", body: res.message ?? "같은 용지는 한 번만 저장돼요" }
            : { kind: "ok", title: `${r.draw_no}회 · ${r.games.length}게임 기록됨`, body: won(r.games.length * 1000) };
          if (!res.duplicate) { navigator.vibrate?.(60); onRecorded(); }
        } catch (e: any) { t = { kind: "err", title: "기록하지 못했어요", body: e.message }; seen.current.delete(data); }
      }
      setLogs((l) => [t, ...l].slice(0, 4));
      setFlash(t.kind); setTimeout(() => setFlash(null), 700);
      setTimeout(() => { busy = false; }, 600); // 같은 화면이 연달아 잡히는 것 방지
    };

    // jsQR: 화면 가운데(안내 틀)를 원본 해상도로 잘라 읽고, 세 번에 한 번은 전체 화면도 읽음
    const decodeJs = (v: HTMLVideoElement): string | null => {
      const vw = v.videoWidth, vh = v.videoHeight;
      if (!vw || !vh) return null;
      pass++;
      let sx = 0, sy = 0, sw = vw, sh = vh;
      if (pass % 3 !== 0) {
        const side = Math.round(Math.min(vw, vh) * (pass % 3 === 1 ? 0.6 : 0.85));
        sx = Math.round((vw - side) / 2); sy = Math.round((vh - side) / 2); sw = sh = side;
      }
      const scale = Math.min(1, 900 / Math.max(sw, sh));
      const w = Math.round(sw * scale), h = Math.round(sh * scale);
      canvas.width = w; canvas.height = h;
      ctx.drawImage(v, sx, sy, sw, sh, 0, 0, w, h);
      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
      return code?.data || null;
    };

    const loop = async (now: number) => {
      if (stop) return;
      const v = video.current;
      const gap = detector ? 80 : 110;
      if (v && v.readyState >= 2 && !busy && now - last >= gap) {
        last = now;
        try {
          let data: string | null = null;
          if (detector) { const found = await detector.detect(v); data = found?.[0]?.rawValue || null; }
          else data = decodeJs(v);
          if (data) await handle(data);
        } catch { /* 한 프레임 실패는 무시하고 다음 프레임 */ }
      }
      requestAnimationFrame(loop);
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        const track = stream.getVideoTracks()[0];
        trackRef.current = track;
        const caps: any = (track as any).getCapabilities?.() ?? {};
        // 계속 자동 초점
        if (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous")) {
          try { await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] }); } catch { /* 무시 */ }
        }
        // 확대 지원 기기는 2배로 시작: 조금 떨어져서 찍어도 QR이 크게 잡히고 초점이 맞음
        if (caps.zoom && caps.zoom.max > caps.zoom.min) {
          const start = Math.min(caps.zoom.max, Math.max(caps.zoom.min, 2));
          try { await track.applyConstraints({ advanced: [{ zoom: start } as any] }); } catch { /* 무시 */ }
          setZoom({ min: caps.zoom.min, max: Math.min(caps.zoom.max, 4), cur: start });
        }
        if (caps.torch) setTorch(false);
        if (!video.current) return;
        video.current.srcObject = stream; await video.current.play();
      } catch { setErr("카메라를 쓸 수 없어요. 브라우저의 카메라 권한을 확인하거나 '직접 입력'을 이용해 주세요."); return; }
      requestAnimationFrame(loop);
    })();
    return () => { stop = true; stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const color = { ok: "#1F2A12", dup: "#2E2715", err: "#2A1714" };
  const frame = flash === "ok" ? "var(--lime)" : flash === "dup" ? "#FBC400" : flash === "err" ? "#FF7272" : "rgba(255,255,255,.85)";
  return (
    <Sheet onClose={onClose}>
      <div class="between"><h2>QR 연속 스캔</h2><button class="link" onClick={onClose}>닫기</button></div>
      {err ? <p class="sub">{err}</p> : (
        <div class="scanbox">
          <video ref={video} class="scan" playsInline muted autoPlay />
          <div class="scanframe" style={{ borderColor: frame }} aria-hidden="true" />
          {(zoom || torch !== null) && (
            <div class="scantools">
              {zoom && [1, 1.5, 2, 3].filter((z) => z >= zoom.min && z <= zoom.max).map((z) => (
                <button class={Math.abs(zoom.cur - z) < 0.05 ? "on" : ""} onClick={() => applyZoom(z)} aria-label={`${z}배 확대`}>{z}x</button>
              ))}
              {torch !== null && <button class={torch ? "on" : ""} onClick={toggleTorch}>플래시</button>}
            </div>
          )}
        </div>
      )}
      <p class="small">QR을 <b style={{ color: "var(--text)" }}>네모 틀 안</b>에 맞춰 주세요. 흐리면 휴대폰을 <b style={{ color: "var(--text)" }}>한 뼘(15~20cm)</b> 떨어뜨려 보세요. 너무 가까우면 초점이 안 맞아요. 여러 장을 차례로 비추면 계속 기록되고, QR 내용은 이 기기에서만 해석돼요.</p>
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

// 한 회차의 당첨번호 + 내 게임별 번호(맞은 숫자 강조) + 등수
function RoundBody({ card }: { card: any }) {
  return (
    <>
      {card.winning && <div class="row" style={{ gap: 4 }}>{card.winning.numbers.map((n: number) => <Ball n={n} size={30} />)}<span class="small">+</span><Ball n={card.winning.bonus} size={30} /></div>}
      {card.body && <p style={{ fontSize: 14, color: "var(--sub)" }}>{card.body}</p>}
      {(card.games ?? []).map((g: any) => (
        <div class="row" style={{ gap: 4 }}>{g.numbers.map((n: number) => <span class="num" style={{ width: 30, textAlign: "center", fontSize: 13, borderRadius: 8, padding: "4px 0", background: (g.hit_numbers ?? []).includes(n) ? "var(--lime)" : "#1C1C21", color: (g.hit_numbers ?? []).includes(n) ? "var(--bg)" : "var(--muted)" }}>{n}</span>)}
          <span class="small" style={{ marginLeft: "auto", color: g.rank ? "var(--lime)" : undefined, fontWeight: g.rank ? 700 : undefined }}>{g.rank ? `${g.rank}등` : g.matched !== null ? "낙첨" : "추첨 전"}</span></div>
      ))}
    </>
  );
}

export function Log() {
  const app = useApp();
  const [hist, setHist] = useState<any[] | null>(null);
  const [hits, setHits] = useState<any[] | null>(null);
  const [card, setCard] = useState<any>(null);
  const [sheet, setSheet] = useState<"qr" | "manual" | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<number, any>>({}); // undefined = 불러오는 중, null = 실패
  const toggle = (drawNo: number) => {
    if (open === drawNo) { setOpen(null); return; }
    setOpen(drawNo);
    if (detail[drawNo]) return;
    setDetail((m) => { const n = { ...m }; delete n[drawNo]; return n; });
    api.roundCard(drawNo).then((c) => setDetail((m) => ({ ...m, [drawNo]: c }))).catch(() => setDetail((m) => ({ ...m, [drawNo]: null })));
  };
  const load = () => {
    setDetail({});
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
          <RoundBody card={card} />
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
        {hist === null ? <Spinner /> : hist.length === 0 ? <p class="small">아직 기록이 없어요.</p> : hist.map((h) => {
          const isOpen = open === h.draw_no, d = detail[h.draw_no];
          return (
            <div class="histrow">
              <button class="between histbtn" aria-expanded={isOpen} onClick={() => toggle(h.draw_no)}>
                <span>{h.draw_no}회 <span class="small">· {h.games}게임</span></span>
                <span class="row" style={{ gap: 6 }}>
                  <span style={{ color: h.best_rank ? "var(--lime)" : "var(--muted)", fontWeight: 700 }}>{h.status === "pending" ? "추첨 전" : h.best_rank ? `${h.best_rank}등 · ${won(Number(h.prize_total))}` : "낙첨"}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true" style={{ color: "var(--muted)", transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </button>
              {isOpen && (
                <div class="histdetail">
                  {d === undefined ? <Spinner /> : d === null ? <p class="small">상세 내역을 불러오지 못했어요. 다시 눌러 주세요.</p> : (
                    <>
                      {d.draw_date && <span class="small">{d.draw_date} 추첨</span>}
                      <RoundBody card={d} />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p class="foot">앱 기록은 당첨금 수령 증빙이 아니에요. 종이 용지는 꼭 보관해 주세요.</p>
      {sheet === "qr" && <Scanner onClose={() => { setSheet(null); refresh(); }} onRecorded={() => {}} />}
      {sheet === "manual" && <Manual onClose={() => setSheet(null)} onRecorded={refresh} />}
    </div>
  );
}
