import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";

export const ballColor = (n: number) => (n <= 10 ? "#FBC400" : n <= 20 ? "#69C8F2" : n <= 30 ? "#FF7272" : n <= 40 ? "#B4B4B4" : "#B0D840");

export function Ball(p: { n: number | null; size?: number; drop?: boolean; delay?: number; sel?: boolean; onClick?: () => void; label?: string }) {
  const size = p.size ?? 52;
  const style: Record<string, string | number> = {
    width: size, height: size, fontSize: Math.round(size * 0.4),
    background: p.n ? `radial-gradient(circle at 32% 28%, rgba(255,255,255,.75) 0, rgba(255,255,255,0) 42%), ${ballColor(p.n)}` : "transparent",
    animationDelay: `${p.delay ?? 0}s`, cursor: p.onClick ? "pointer" : "default",
  };
  const cls = `ball${p.drop ? " drop" : ""}${p.sel ? " sel" : ""}${p.n ? "" : " empty"}`;
  return p.onClick
    ? <button class={cls} style={style} onClick={p.onClick} aria-label={p.label ?? `${p.n}번`}>{p.n ?? "?"}</button>
    : <span class={cls} style={style} aria-label={p.n ? `${p.n}번` : "아직 안 열림"}>{p.n ?? "?"}</span>;
}

const TABS = [["today", "오늘"], ["stats", "통계"], ["pick", "뽑기"], ["log", "기록"], ["me", "나"]];
export function Nav({ cur }: { cur: string }) {
  return (
    <nav class="nav" aria-label="주요 메뉴">
      {TABS.map(([id, label]) => <a href={`#/${id}`} class={cur === id ? "on" : ""} aria-current={cur === id ? "page" : undefined}>{label}</a>)}
    </nav>
  );
}

export function Back({ to, title }: { to: string; title: string }) {
  return (
    <div class="row" style={{ marginLeft: -12 }}>
      <a href={`#/${to}`} aria-label="뒤로" style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F5F5F7" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </a>
      <h2>{title}</h2>
    </div>
  );
}

let toastSet: ((m: string | null) => void) | null = null;
export function toast(msg: string) { toastSet?.(msg); }
export function ToastHost() {
  const [m, setM] = useState<string | null>(null);
  useEffect(() => { toastSet = setM; return () => { toastSet = null; }; }, []);
  useEffect(() => { if (!m) return; const t = setTimeout(() => setM(null), 3200); return () => clearTimeout(t); }, [m]);
  return m ? <div class="toast" role="status">{m}</div> : null;
}

export function Sheet({ children, onClose }: { children: ComponentChildren; onClose: () => void }) {
  return <div class="sheet" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}><div role="dialog" aria-modal="true">{children}</div></div>;
}

export function Spinner() { return <div class="spinner" role="status" aria-label="불러오는 중" />; }
export const won = (n: number) => `${Math.round(n).toLocaleString("ko-KR")}원`;
export const ODDS = "1/8,145,060";
