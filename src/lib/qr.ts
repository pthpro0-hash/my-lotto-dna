// ============================================================================
// 로또 용지 QR 파서 — 단말기에서만 실행(기준 구현). FlutterFlow용 Dart 판은 flutterflow/parse_lotto_qr.dart
// QR 예: http://m.dhlottery.co.kr/?v=0937q021013222940q052330344344q030913314245q132432333738q0406151823261904598894
//   v = 회차 4자리 + [선택방식 1글자 + 번호 6개×2자리] × 게임 수 + 용지 일련번호
//   선택방식: q 자동, m 수동, s 반자동 (그 밖의 글자는 unknown)
// 원칙: QR 원문·일련번호는 서버로 보내지 않음. 중복 스캔 방지용으로 일련번호 끝 3자리만 dedupe_source에 넣고,
//       서버(record_ticket)가 사용자 id와 함께 다시 해시해 저장. 신·구형 용지 실측(Phase 0) 전까지는 '검증 대기' 형식.
// ============================================================================
export type QrGame = { numbers: number[]; mode: "auto" | "manual" | "semi" | "unknown" };
export type QrResult =
  | { ok: true; draw_no: number; games: QrGame[]; dedupe_source: string }
  | { ok: false; error: "EMPTY" | "NOT_LOTTO_QR" | "BAD_FORMAT" | "BAD_DRAW" | "BAD_NUMBERS" | "BAD_GAMES" };

const MODES: Record<string, QrGame["mode"]> = { q: "auto", m: "manual", s: "semi" };

export function parseLottoQr(raw: unknown): QrResult {
  if (typeof raw !== "string" || raw.trim() === "") return { ok: false, error: "EMPTY" };
  const s = raw.trim();
  if (!/(dhlottery|nlotto)\.co\.kr/i.test(s)) return { ok: false, error: "NOT_LOTTO_QR" };
  const pm = s.match(/[?&]v=([0-9A-Za-z]+)/);
  if (!pm) return { ok: false, error: "NOT_LOTTO_QR" };
  const vm = pm[1].match(/^(\d{4})((?:[A-Za-z]\d{12})+)(\d*)$/);
  if (!vm) return { ok: false, error: "BAD_FORMAT" };
  const drawNo = Number.parseInt(vm[1], 10);
  if (!(drawNo >= 1)) return { ok: false, error: "BAD_DRAW" };
  const body = vm[2];
  const games: QrGame[] = [];
  for (let i = 0; i < body.length; i += 13) {
    const mode = MODES[body[i].toLowerCase()] ?? "unknown";
    const nums: number[] = [];
    for (let k = 0; k < 6; k++) nums.push(Number.parseInt(body.substr(i + 1 + k * 2, 2), 10));
    if (nums.some((n) => !(n >= 1 && n <= 45)) || new Set(nums).size !== 6) return { ok: false, error: "BAD_NUMBERS" };
    games.push({ numbers: nums.sort((a, b) => a - b), mode });
  }
  if (games.length < 1 || games.length > 5) return { ok: false, error: "BAD_GAMES" };
  const tail3 = vm[3].slice(-3);
  const dedupe = `qr|${drawNo}|${tail3}|` + games.map((g) => g.numbers.join(",")).join("/");
  return { ok: true, draw_no: drawNo, games, dedupe_source: dedupe };
}
