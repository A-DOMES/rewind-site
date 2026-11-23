// [2026-11-23] 말 속도 한 곳(민구 님 '같은 규칙은 한 곳'): 대본 글자 수 ↔ 영상 길이. 서버·사이트(assets/shared/pace.js 사본)가 같이 쓴다.
//  초당글자(cps) 숫자는 관리자 설정 한 곳(초당글자_gemini — 사이트설정_조회 voice.cps, 접수가 행 '초당글자' 칸에 적어 뒤 단계가 같은 값을 씀).
//  세는 법 = 공백 포함 글자 수, 장면 쉼 포함 실측(92행: 203자 → 31초 ≈ 6.5~6.7). n8n 은 이 파일을 못 불러와 같은 식을 쓴다 — test/pace_test.js 가 같은지 확인.
function 초당값(cps) { const n = Number(cps); return n >= 3 && n <= 12 ? n : 6.05; }
function 속도값(s) { const n = Number(s); return n > 0 ? Math.min(2, Math.max(0.5, Math.round(n * 100) / 100)) : 1; }
// 글자 수 → 영상 길이(분, 초 단위 반올림 → 소수 셋째 자리), 최소 0.25분
function 영상분(글자수, cps, 말속도 = 1) { const 초 = Math.round(Math.max(0, Number(글자수) || 0) / (초당값(cps) * 속도값(말속도))); return Math.max(0.25, Math.round(초 / 60 * 1000) / 1000); }
// 영상 길이(초) → 대본 글자 수
function 대본글자(초, cps, 말속도 = 1) { return Math.max(0, Math.round((Number(초) || 0) * 초당값(cps) * 속도값(말속도))); }
const 말속도내보내기 = { 초당값, 속도값, 영상분, 대본글자 };
if (typeof module !== 'undefined' && module.exports) module.exports = 말속도내보내기; else this.RWPace = 말속도내보내기;
