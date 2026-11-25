// 공개용 값만 둡니다. publishable 키는 브라우저에 노출되도록 설계된 키이고,
// 데이터 보호는 서버의 행 단위 보안(RLS)과 함수 권한이 담당합니다. secret 키는 절대 여기에 두지 않습니다.
export const SUPABASE_URL = "https://ydiezowopnhctfxnzfrn.supabase.co";
export const SUPABASE_KEY = "sb_publishable_-lgJDgrRncYtIF0Y-P0e7A_61TR9drL";

export const CITIES: { id: string; name: string; lat: number; lon: number }[] = [
  { id: "seoul", name: "서울", lat: 37.5665, lon: 126.978 },
  { id: "busan", name: "부산", lat: 35.1796, lon: 129.0756 },
  { id: "incheon", name: "인천", lat: 37.4563, lon: 126.7052 },
  { id: "daegu", name: "대구", lat: 35.8714, lon: 128.6014 },
  { id: "daejeon", name: "대전", lat: 36.3504, lon: 127.3845 },
  { id: "gwangju", name: "광주", lat: 35.1595, lon: 126.8526 },
  { id: "ulsan", name: "울산", lat: 35.5384, lon: 129.3114 },
  { id: "sejong", name: "세종", lat: 36.48, lon: 127.289 },
  { id: "suwon", name: "수원", lat: 37.2636, lon: 127.0286 },
  { id: "chuncheon", name: "춘천", lat: 37.8813, lon: 127.7298 },
  { id: "gangneung", name: "강릉", lat: 37.7519, lon: 128.8761 },
  { id: "cheongju", name: "청주", lat: 36.6424, lon: 127.489 },
  { id: "jeonju", name: "전주", lat: 35.8242, lon: 127.148 },
  { id: "changwon", name: "창원", lat: 35.228, lon: 128.6811 },
  { id: "pohang", name: "포항", lat: 36.019, lon: 129.3435 },
  { id: "jeju", name: "제주", lat: 33.4996, lon: 126.5312 },
];

// 개인정보처리방침에 표시할 운영자 정보. 값만 바꾸면 방침 화면에 바로 반영됩니다.
export const PRIVACY = {
  operator: "MY LOTTO DNA 운영자", // 개인 이름 또는 상호
  officer: "MY LOTTO DNA 운영자", // 개인정보 보호책임자 이름
  email: "", // 문의 메일. 비워 두면 '준비 중'으로 표시
  effective: "2026-11-26", // 시행일
};
