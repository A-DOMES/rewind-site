// 화면 좌표 계산 (순수 함수, 서버·브라우저 공용). 값은 모두 픽셀로 돌려주고, 위치 규칙은 render.js 의 자막 자리 규칙과 같다.
// 안전영역은 '가이드'일 뿐이다: 겹쳐도 만들 수 있고, 겹침은 rules.js 가 경고로만 알린다.
const 줄높이비 = 1.15;   // ASS Fontsize 한 줄이 차지하는 높이 ≈ 크기 × 1.15 (한 줄·여러 줄 모두 근사)

// 유튜브 화면 가이드. 세로(9:16): 위 13% · 아래 22% · 오른쪽 12%(세로 40~85% 버튼 줄). 가로·정사각: 가장자리 5% + 아래 재생 막대 8%
function 가이드(w, h) {
  const r = (이름, x, y, ww, hh) => ({ 이름, x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh) });
  if (w < h) return [r('위 바', 0, 0, w, h * 0.13), r('아래 설명·채널', 0, h * 0.78, w, h * 0.22), r('오른쪽 버튼', w * 0.88, h * 0.40, w * 0.12, h * 0.45)];
  return [r('왼쪽 가장자리', 0, 0, w * 0.05, h), r('오른쪽 가장자리', w * 0.95, 0, w * 0.05, h), r('위 가장자리', 0, 0, w, h * 0.05), r('아래 재생 막대', 0, h * 0.92, w, h * 0.08)];
}

// 자막이 차지하는 상자. 설정: { 위치: '아래'|'가운데'|'위', 크기(px), 줄수, 줄길이(0.5~1, 없으면 화면 폭의 76%/88%), 안전영역(bool) }
function 자막상자(w, h, 설정 = {}) {
  const 크기 = Number(설정.크기) > 0 ? Number(설정.크기) : Math.round(h * 0.058), 줄수 = Math.min(3, Math.max(1, Math.round(설정.줄수 || 1)));
  const 안전 = 설정.안전영역 ?? w < h, 위치 = ['위', '가운데'].includes(설정.위치) ? 설정.위치 : '아래';
  const 폭 = Math.round(w * (설정.줄길이 > 0 ? 설정.줄길이 : (안전 ? 0.76 : 0.88))), 높 = Math.round(크기 * 줄높이비 * 줄수);
  const x = Math.round((w - 폭) / 2);
  const y = 위치 === '위' ? Math.round(h * (안전 ? 0.13 : 0.07)) : 위치 === '가운데' ? Math.round(h / 2 - 높 / 2) : Math.round(h - h * (안전 ? 0.22 : 0.07) - 높);
  return { x, y, w: 폭, h: 높 };
}

// 글자 블록 한 개의 자리. 위치: { 기준:'위'|'가운데'|'아래', 거리(0~0.45, 화면 높이 비율), 가로(0~1, 글자 상자 중심) }, 크기 px, 줄수.
// 가로 중심이 가장자리면 글자가 잘리므로 상자가 화면 안에 들어오게 중심을 안쪽으로 당기고(보정), 줄 폭 한도(최대폭)를 돌려준다. 거리는 기준 변에서 상자 가장자리까지.
function 블록상자(w, h, 위치 = {}, 크기, 줄수 = 1) {
  const 기준 = ['위', '가운데', '아래'].includes(위치.기준) ? 위치.기준 : '아래';
  const 거리 = Math.min(0.45, Math.max(0, Number(위치.거리) || 0)), 가로 = Math.min(1, Math.max(0, Number.isFinite(Number(위치.가로)) ? Number(위치.가로) : 0.5));
  let cx = w * 가로;
  const 최대폭 = Math.min(w * 0.92, Math.max(크기 * 3, 2 * Math.min(cx, w - cx)));
  cx = Math.min(w - 최대폭 / 2, Math.max(최대폭 / 2, cx));
  const 높 = Math.round(크기 * 줄높이비 * Math.min(3, Math.max(1, 줄수)));
  const 위 = 기준 === '위' ? h * 거리 : 기준 === '아래' ? h - h * 거리 - 높 : h / 2 - 높 / 2 + h * 거리;
  const y = Math.min(h - 높, Math.max(0, Math.round(위)));
  return { cx: Math.round(cx), cy: Math.round(y + 높 / 2), 최대폭: Math.round(최대폭), x: Math.round(cx - 최대폭 / 2), y, w: Math.round(최대폭), h: 높 };
}

// 두 상자가 겹치는 면적 비율(작은 쪽 기준)
function 겹침비(a, b) {
  const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const 작은 = Math.min(a.w * a.h, b.w * b.h);
  return 작은 > 0 ? (ox * oy) / 작은 : 0;
}
const 내보내기 = { 가이드, 자막상자, 블록상자, 겹침비, 줄높이비 };
if (typeof module !== 'undefined' && module.exports) module.exports = 내보내기; else this.RWLayout = 내보내기;   // 서버(require)와 브라우저(<script>)가 같은 파일을 쓴다
