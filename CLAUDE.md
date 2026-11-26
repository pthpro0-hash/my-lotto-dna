# MY LOTTO DNA — Claude Code 작업 안내

## 사용자
- 비개발자 파운더. **항상 한국어**, 결론 먼저, 노코드 대안 우선, 비교는 표/A·B안.
- 작업이 끝나면 마지막에 **완료 / 미완료 / 권장 다음 작업**을 정리.
- 같은 문제가 2번 이상 반복되면 멈추고 보고.

## 서비스 한 줄
날짜·날씨·사주·성향 등 7가지 신호로 매일 만드는 '나만의 로또 숫자'(메인) + 1~최신 회차 실제 통계·확률(메인) + 개인 기록(보조). 재미 콘텐츠, 19세 이상.

## 폴더 구성 (로컬 권장 배치)
```
작업폴더/
├─ my-lotto-dna/      ← 이 저장소 (웹앱, GitHub 공개 저장소)
└─ lotto-server/      ← 서버 코드 (lotto-server.zip 압축 해제, 공개 저장소에 올리지 말 것)
```
- 웹앱: Vite + Preact 10(11 금지: 숫자 스타일에 px가 안 붙음) + supabase-js + jsQR. 해시 라우팅(`#/today`).
- 배포: `main` 푸시 → GitHub Actions → https://pthpro0-hash.github.io/my-lotto-dna/
- 로컬 실행: `npm ci && npx vite` / 검사: `npx tsc -p . && npx vite build`

## 핵심 파일
| 파일 | 역할 |
|---|---|
| `src/lib/fortune.ts` | 운세 숫자 엔진(결정론). 원본은 `lotto-server/src/fortune.ts` — 고치면 두 곳 같게 유지 |
| `src/lib/core.ts` | 날짜·일진·오행 공용 (서버와 동일 사본) |
| `src/lib/qr.ts` | 용지 QR 해석. **기기 안에서만 실행, QR 원문을 서버로 보내지 않음** |
| `src/api.ts` | Supabase 호출 모음 (publishable 키만) |
| `src/state.tsx` | 엔진 입력 조립(프로필·날씨·통계). 재료가 다 도착한 뒤 한 번만 계산 |
| `src/screens/*.tsx` | 로그인·나(온보딩)·오늘·믹서·뽑기·통계·분석·궁합·기록 |

## 서버 (Supabase 프로젝트 `my-lotto-dna`, ref `ydiezowopnhctfxnzfrn`, 서울 리전, 무료 플랜)
- SQL: `lotto-server/sql/01~08` (08 = v2 운세·통계). 라이브에 모두 적용됨.
- 주요 RPC: `number_stats`(로그인 없이 가능), `my_fortune_profile`, `set_fortune_profile`, `combo_check`, `save_pick`, `my_fortune_hits`, `my_number_counts`, `record_ticket`, `my_round_card`, `export_my_data`, `delete_my_data`
- Edge Functions: `saju-profile`, `symbol-numbers`, `sync-draws`(pg_cron 토 21:30/22:30·일 09:00), `delete-account`
- 모든 표 RLS, 쓰기는 SECURITY DEFINER 함수로만. 생년월일 원본 저장 안 함(출생연도·별자리·일간만).
- 배포 방법(Claude Code): Supabase CLI — 사용자가 직접 `npx supabase login` 후
  `npx supabase link --project-ref ydiezowopnhctfxnzfrn`, SQL은 `npx supabase db query`/대시보드 SQL Editor, 함수는 `npx supabase functions deploy <이름>`.
  **secret 키·비밀번호·토큰은 Claude가 입력하지 않음 — 사용자가 직접.**

## 테스트 (lotto-server에서, Node 22)
`cd devenv && npm ci && cd ..` 후 `node test/fortune_test.mjs`(19) · `node test/fortune_sql_test.mjs`(19) · `node test/core_sql_test.mjs` · `node test/qr_test.mjs` 등. 전부 통과 상태.

## 문구·법적 원칙 (반드시 지킬 것)
- 구매 권유·당첨 예측 금지. '추천' 대신 '오늘의 내 숫자/운세'. 모든 숫자 화면에 확률 고지(1/8,145,060) 또는 "당첨은 무작위 추첨으로 결정됩니다".
- 공유물: "재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상".
- "곧 나올 차례" 같은 도박사의 오류 표현 금지. 쉬는 숫자엔 "쉬어도 다음 확률은 같아요".
- 'MBTI' 단어 사용 금지(국내 등록상표) → "성향 유형".

## 현재 상태 (2026-11-26)
- 완료: 엔진·서버 v2·웹앱 8화면·배포.
- 로그인 해결: 커스텀 SMTP(Resend) + 템플릿 'Magic link or OTP'·'Confirm sign up'에 `{{ .Token }}` 6자리 코드(`lotto-server/docs/email_otp_template.md`) + Login.tsx 코드 입력 중심. 휴대폰 실제 로그인 확인.
- 개인정보처리방침 `#/privacy` 배포(로그인 없이 열람). 운영자·책임자·메일은 `src/config.ts` PRIVACY.
- 기록 화면: QR 스캔 고도화(고해상도·가운데 틀 해석·2배 확대·플래시·내장 인식기), 회차별 기록 누르면 상세 펼침. 휴대폰 실기 확인 대기.
- 오늘 화면 '쉬는 중' → '안 나온 기간'으로 변경.
- 안내서(기능 요약 1장 + 매뉴얼): `docs/my-lotto-dna-guide.html`, 아티팩트 https://claude.ai/artifact/Gkeziw2zmitTEWQ3bJiQUa
- lotto-server: 로컬 git 저장소(main, 원격 없음). 비공개 GitHub 백업은 사용자 결정 대기. **공개 저장소에 올리지 말 것.**
- 할 일: 휴대폰에서 QR·상세 확인, 실제 용지 QR 검증, 동행복권 데이터 이용 약관 확인, 법률 자문.
- Supabase 'Grace period is over' 경고: 사용자가 확인함, 직접 처리 예정 — Claude가 다시 권하지 말 것.
- 참고: 2026-11-26 긴 세션에서 Claude Code가 메모리 부족으로 종료됨. 큰 작업은 새 세션에서 시작할 것.
