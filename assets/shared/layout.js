// 화면 좌표 계산 (순수 함수, 서버·브라우저 공용). 값은 모두 픽셀로 돌려주고, 위치 규칙은 render.js 의 자막 자리 규칙과 같다.
// 안전영역은 '가이드'일 뿐이다: 겹쳐도 만들 수 있고, 겹침은 rules.js 가 경고로만 알린다.
const 줄높이비 = 1.15;   // ASS Fontsize 한 줄이 차지하는 높이 ≈ 크기 × 1.15 (한 줄·여러 줄 모두 근사)

// 유튜브 화면 가이드. 세로(9:16): 위 13% · 아래 22% · 오른쪽 12%(세로 40~85% 버튼 줄). 가로·정사각: 가장자리 5% + 아래 재생 막대 8%
function 가이드(w, h) {
  const r = (이름, x, y, ww, hh) => ({ 이름, x: Math.round(x), y: Math.round(y), w: Math.round(ww), h: Math.round(hh) });
  if (w < h) return [r('위 바', 0, 0, w, h * 0.13), r('아래 설명·채널', 0, h * 0.78, w, h * 0.22), r('오른쪽 버튼', w * 0.88, h * 0.40, w * 0.12, h * 0.45)];
  return [r('왼쪽 가장자리', 0, 0, w * 0.05, h), r('오른쪽 가장자리', w * 0.95, 0, w * 0.05, h), r('위 가장자리', 0, 0, w, h * 0.05), r('아래 재생 막대', 0, h * 0.92, w, h * 0.08)];
}

// 자막이 차지하는 상자(줄수만큼의 칸. 글은 아래쪽 칸부터 채운다). 설정: { 위치: '아래'|'가운데'|'위', 크기(px), 줄수, 줄길이(0.5~1, 없으면 화면 폭의 76%/88%), 거리(0~0.45), 가로(0~1, 0.5=가운데), 안전영역(bool) }
function 자막상자(w, h, 설정 = {}) {
  const 크기 = Number(설정.크기) > 0 ? Number(설정.크기) : Math.round(h * 0.058), 줄수 = Math.min(3, Math.max(1, Math.round(설정.줄수 || 1)));
  const 안전 = 설정.안전영역 ?? w < h, 위치 = ['위', '가운데'].includes(설정.위치) ? 설정.위치 : '아래';
  const 폭 = Math.round(w * (설정.줄길이 > 0 ? 설정.줄길이 : (안전 ? 0.76 : 0.88))), 높 = Math.round(크기 * 줄높이비 * 줄수);
  const 거리 = Number.isFinite(Number(설정.거리)) && 설정.거리 !== null && 설정.거리 !== '' ? Math.min(0.45, Math.max(0, Number(설정.거리))) : null;   // 위·아래 가장자리에서(화면 높이 비율)
  const 가로 = Number.isFinite(Number(설정.가로)) && 설정.가로 !== null && 설정.가로 !== '' ? Math.min(1, Math.max(0, Number(설정.가로))) : 0.5;
  const x = Math.round(Math.min(w - 폭, Math.max(0, w * 가로 - 폭 / 2)));
  const y = 위치 === '위' ? Math.round(h * (거리 !== null ? 거리 : (안전 ? 0.13 : 0.07))) : 위치 === '가운데' ? Math.round(h / 2 - 높 / 2) : Math.round(h - h * (거리 !== null ? 거리 : (안전 ? 0.22 : 0.07)) - 높);
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
// 화면 위 제목 상자. 서버(ASS)와 사이트 미리보기가 같은 식을 쓴다. 옵션: { 줄수, 최대폭(글자 크기 1일 때 가장 넓은 줄의 폭), 띠(제목고정형이면 true), 높이(띠 높이, 화면 높이 비율 0.1~0.3, 없으면 0.184),
// 크기(맞춰진 크기에 곱하는 배율 0.5~1.3), 위(띠 안 세로 자리 0~1, 0.5 = 한가운데), 세로(글자 가운데의 화면 세로 비율 0.02~0.98, 있으면 위보다 우선. 띠가 있으면 띠 안에서만 움직인다), 가로(글자 가운데 x 비율 0~1, 없으면 가운데) }. 아무 값도 없으면 예전과 똑같은 결과다
function 제목상자(w, h, 옵션) {
  const o = 옵션 || {}, 줄수 = Math.max(1, Math.round(o.줄수) || 1), 최대 = Math.max(0.5, Number(o.최대폭) || 1);
  const 숫자 = x => (x === null || x === undefined || x === '') ? NaN : Number(x);   // null·빈 문자열이 0 으로 읽히지 않게
  const 높이값 = o.띠 && 숫자(o.높이) >= 0.1 && 숫자(o.높이) <= 0.3 && Math.abs(숫자(o.높이) - 0.184) > 0.0005 ? 숫자(o.높이) : null;   // 0.184(가운데)는 값을 안 준 것과 같다
  const 띠 = o.띠 ? Math.round(h * (높이값 || 0.184)) : 0;
  let 크기 = Math.floor(Math.min(w * (높이값 ? 0.16 : 0.115), w * 0.84 / 최대));
  if (띠 && 높이값) 크기 = Math.min(크기, Math.floor(띠 * 0.78 / 줄수));   // 띠 높이에 글자를 맞춘다
  const 배율 = 숫자(o.크기) >= 0.5 && 숫자(o.크기) <= 1.3 ? 숫자(o.크기) : 1;
  if (배율 !== 1) { 크기 = Math.floor(크기 * 배율); 크기 = Math.min(크기, Math.floor(w * 0.94 / 최대)); if (띠) 크기 = Math.min(크기, Math.floor(띠 * 0.96 / 줄수)); }
  크기 = Math.max(12, 크기);
  const 높이 = 줄수 * 크기, 비 = 숫자(o.위) >= 0 && 숫자(o.위) <= 1 ? 숫자(o.위) : 0.5;
  const 세로 = 숫자(o.세로) >= 0.02 && 숫자(o.세로) <= 0.98 ? 숫자(o.세로) : null;
  const 여유 = Math.round(크기 * 0.18);   // 글자 줄 칸의 위·아래 빈틈: 글자가 띠 가장자리에 닿을 수 있게 그만큼 더 쓴다
  const 위 = (세로 !== null && 띠)   // 띠가 없는 모양(가운데영상형)은 영상 칸이 제목에 맞춰 놓이므로 세로를 쓰지 않는다
    ? Math.round(Math.min(Math.max(세로 * h - 높이 / 2, -여유), 띠 - 높이 + 여유))
    : (띠 ? Math.round((띠 - 높이) * 비 + (2 * 비 - 1) * 여유) : null);
  const 폭 = 최대 * 크기, 가운데 = 숫자(o.가로) >= 0 && 숫자(o.가로) <= 1 ? 숫자(o.가로) : null;
  const x = 가운데 === null ? Math.round(w / 2) : Math.round(Math.min(Math.max(가운데 * w, 폭 / 2 + w * 0.02), w - 폭 / 2 - w * 0.02));
  return { 띠, 크기, 높이, 위, x };
}
const 내보내기 = { 가이드, 자막상자, 블록상자, 겹침비, 줄높이비, 제목상자 };
if (typeof module !== 'undefined' && module.exports) module.exports = 내보내기; else this.RWLayout = 내보내기;   // 서버(require)와 브라우저(<script>)가 같은 파일을 쓴다
