import type { ComponentChildren } from "preact";
import { PRIVACY } from "../config";
import { Back } from "../ui";

function Sec({ n, title, children }: { n: number; title: string; children: ComponentChildren }) {
  return (
    <section class="card privacy">
      <h3>{n}. {title}</h3>
      {children}
    </section>
  );
}

export function Privacy({ back }: { back: string }) {
  const mail = PRIVACY.email || "준비 중 (곧 안내할게요)";
  return (
    <div class="page">
      <Back to={back} title="개인정보처리방침" />
      <p class="sub">MY LOTTO DNA(운영자: {PRIVACY.operator}, 이하 '서비스')는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 관련 고충을 빠르게 처리하기 위해 이 방침을 공개합니다. 서비스는 <b>꼭 필요한 정보만, 가능한 한 적게</b> 받습니다.</p>

      <Sec n={1} title="처리하는 개인정보와 목적">
        <table class="ptable">
          <thead><tr><th>항목</th><th>목적</th><th>구분</th></tr></thead>
          <tbody>
            <tr><td>이메일 주소</td><td>로그인 인증번호 발송, 계정 식별</td><td>필수</td></tr>
            <tr><td>만 19세 이상 확인 여부</td><td>이용 연령 확인</td><td>필수</td></tr>
            <tr><td>닉네임, 성별</td><td>화면 표시, 내 숫자 만들기</td><td>선택</td></tr>
            <tr><td>출생연도, 띠·별자리, 일간(오행)</td><td>사주·별자리 신호로 내 숫자 만들기</td><td>선택</td></tr>
            <tr><td>성향 유형(4글자)</td><td>성향 신호로 내 숫자 만들기</td><td>선택</td></tr>
            <tr><td>관심 도시(시·도 단위)</td><td>도시 날씨 신호</td><td>선택</td></tr>
            <tr><td>저장한 숫자, 기록한 용지 번호·회차·금액·메모</td><td>개인 기록, 당첨 결과 비교</td><td>선택</td></tr>
            <tr><td>동의 기록, 서비스 이용 기록</td><td>동의 증빙, 화면 개인화</td><td>자동</td></tr>
          </tbody>
        </table>
        <p class="small"><b>생년월일·태어난 시각 원본은 저장하지 않아요.</b> 계산에만 잠깐 쓰고 출생연도·띠·별자리·일간만 남깁니다. 궁합 화면에 넣는 상대방 정보는 이 기기 안에서만 계산하고 서버로 보내지 않아요. 용지 QR은 기기 안에서만 해석하고 QR 원문은 보내지 않아요.</p>
        <p class="small">위치 정보(GPS)는 받지 않아요. 날씨는 이용자가 고른 도시의 중심 좌표로만 조회합니다.</p>
      </Sec>

      <Sec n={2} title="보유 기간과 파기">
        <p class="sub">계정을 삭제하면 위 정보를 <b>바로 삭제</b>합니다. '기록·프로필 전체 삭제'를 누르면 계정(이메일)과 동의 기록만 남기고 나머지를 지웁니다. 동의 기록은 동의·삭제 사실을 증명하기 위해 계정 삭제 때까지 보관합니다. 법령에 따라 보관해야 하는 정보는 현재 없습니다.</p>
        <p class="small">접속 기록(IP 주소, 접속 시각 등)은 보안을 위해 아래 위탁 업체가 자동으로 남기며, 각 업체 정책에 따라 짧은 기간 뒤 삭제됩니다. 전자 파일은 복구할 수 없는 방법으로 지웁니다.</p>
      </Sec>

      <Sec n={3} title="제3자 제공">
        <p class="sub">이용자의 개인정보를 다른 회사나 사람에게 제공하지 않습니다. 법령에 근거가 있거나 수사기관이 법 절차에 따라 요청하는 경우만 예외입니다.</p>
      </Sec>

      <Sec n={4} title="처리 위탁과 국외 이전">
        <p class="sub">서비스 운영을 위해 아래 업체에 처리를 맡깁니다. 서비스 이용(로그인 등)에 꼭 필요해서, 이용 시점에 네트워크로 전송됩니다.</p>
        <div class="pvendors">
          <div><b>Supabase, Inc.</b> <span class="small">(미국 법인 · 데이터는 대한민국 서울 리전에 저장)</span><br />맡기는 일·항목: 회원 인증, 데이터 저장 · 위 1번 전체<br />보유 기간: 계정 삭제 시까지</div>
          <div><b>Resend, Inc.</b> <span class="small">(미국)</span><br />맡기는 일·항목: 로그인 인증번호 메일 발송 · 이메일 주소<br />보유 기간: 발송 기록은 업체 정책에 따름</div>
          <div><b>GitHub, Inc.</b> <span class="small">(미국)</span><br />맡기는 일·항목: 웹사이트 제공 · 접속 기록(IP)<br />보유 기간: 업체 정책에 따름</div>
        </div>
        <p class="small">국외 이전을 원하지 않으면 서비스 가입을 하지 않거나 계정을 삭제할 수 있습니다. 다만 이 경우 로그인이 필요한 기능은 쓸 수 없어요. 날씨 조회(Open-Meteo, 스위스)에는 도시 좌표만 보내고 개인정보는 보내지 않습니다.</p>
      </Sec>

      <Sec n={5} title="이용자의 권리와 행사 방법">
        <p class="sub">언제든 내 정보를 보고, 고치고, 지우고, 처리를 멈추라고 요청할 수 있어요.</p>
        <ul class="plist">
          <li>보기·고치기: '나' 화면</li>
          <li>내려받기: '나' → 데이터 관리 → 내 데이터 내려받기</li>
          <li>지우기: '나' → 데이터 관리 → 기록·프로필 전체 삭제 / 계정 삭제</li>
          <li>그 밖의 요청: 아래 문의 메일</li>
        </ul>
      </Sec>

      <Sec n={6} title="안전하게 지키기 위한 조치">
        <ul class="plist">
          <li>모든 통신 암호화(HTTPS)</li>
          <li>데이터베이스 행 단위 접근 제한: 본인 정보만 볼 수 있음</li>
          <li>쓰기는 검증된 서버 함수로만 허용</li>
          <li>비밀번호 없이 1회용 인증번호로 로그인</li>
          <li>관리용 키는 서버에만 보관</li>
          <li>꼭 필요한 정보만 수집하고, 생년월일 원본은 저장하지 않음</li>
        </ul>
      </Sec>

      <Sec n={7} title="쿠키와 기기 저장소">
        <p class="sub">광고·추적 쿠키는 쓰지 않아요. 로그인 상태와 화면 설정(오늘 고른 신호, 통계 임시 저장 등)을 이 기기의 브라우저 저장소에 보관합니다. 브라우저 설정에서 사이트 데이터를 지우면 삭제되고, 다시 로그인하면 됩니다.</p>
      </Sec>

      <Sec n={8} title="만 19세 미만">
        <p class="sub">서비스는 만 19세 이상만 이용할 수 있어요. 만 19세 미만이 가입한 사실을 알게 되면 해당 정보를 바로 삭제합니다.</p>
      </Sec>

      <Sec n={9} title="개인정보 보호책임자와 문의">
        <p class="sub">책임자: {PRIVACY.officer}<br />문의 메일: {PRIVACY.email ? <a href={`mailto:${PRIVACY.email}`} style={{ color: "var(--lime)" }}>{PRIVACY.email}</a> : mail}</p>
        <p class="small">개인정보 침해 신고·상담은 아래 기관에도 할 수 있어요.</p>
        <ul class="plist">
          <li>개인정보침해신고센터 (국번 없이) 118 · privacy.kisa.or.kr</li>
          <li>개인정보분쟁조정위원회 1833-6972 · kopico.go.kr</li>
          <li>대검찰청 1301 · 경찰청 182</li>
        </ul>
      </Sec>

      <Sec n={10} title="방침의 변경">
        <p class="sub">내용이 바뀌면 시행 7일 전에 이 화면으로 알려드려요. 이용자 권리에 중요한 변경은 30일 전에 알려드립니다.</p>
        <p class="small">시행일: {PRIVACY.effective}</p>
      </Sec>

      <p class="foot">재미로 보는 콘텐츠 · 당첨과 무관 · 19세 이상</p>
    </div>
  );
}
