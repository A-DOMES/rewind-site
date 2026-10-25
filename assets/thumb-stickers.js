/* 스티커 — 썸네일 편집기에서 쓰는, 코드로 직접 그린 그림들(외부 그림 없음 → 저작권 걱정 없음)
 *
 * 스티커는 '도형'의 한 종류예요. 장.도형 = [{ 종류:'말풍선', cx, cy, w, h, 회전, 채움, 테두리색, 테두리, 투명, 층 }]
 * 그리는 법: 모양[종류](ctx, d, a, b) — 도형 가운데가 원점, a = 가로 반(w/2), b = 세로 반(h/2).
 *   채움 = 그림의 주된 색, 테두리색/테두리 = 윤곽선. 눈·입 같은 작은 부분은 고정 색을 쓴다.
 * 새 스티커를 넣으려면: ① 모양 에 그리는 함수 ② 틀 에 이름·크기·기본 색 을 적으면 끝(편집기 버튼은 틀 목록으로 자동 생성).
 * thumb-render.js 보다 먼저 불러온다. */
(function (global) {
  'use strict';
  const 검정 = '#111111', 흰색 = '#FFFFFF';

  const 틀 = {
    말풍선: { 이름: '말풍선', 비율: [0.5, 0.36], 채움: 흰색, 테두리색: 검정, 테두리비율: 0.012 },
    느낌표: { 이름: '느낌표', 비율: [0.16, 0.34], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.011 },
    물음표: { 이름: '물음표', 비율: [0.24, 0.34], 채움: '#FFE14D', 테두리색: 검정, 테두리비율: 0.011 },
    체크: { 이름: '체크', 비율: [0.3, 0.3], 채움: '#34C759', 테두리색: 검정, 테두리비율: 0.011 },
    엑스: { 이름: '엑스', 비율: [0.28, 0.28], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.011 },
    하트: { 이름: '하트', 비율: [0.3, 0.27], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.01 },
    놀람: { 이름: '놀란 얼굴', 비율: [0.3, 0.3], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    웃음: { 이름: '웃는 얼굴', 비율: [0.3, 0.3], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    불꽃: { 이름: '불꽃', 비율: [0.26, 0.34], 채움: '#FF6B1A', 테두리색: 검정, 테두리비율: 0.01 },
    번개: { 이름: '번개', 비율: [0.22, 0.34], 채움: '#FFE14D', 테두리색: 검정, 테두리비율: 0.01 },
    반짝: { 이름: '반짝', 비율: [0.3, 0.3], 채움: '#FFF6B0', 테두리색: '#FFB400', 테두리비율: 0.008 },
    곡선화살표: { 이름: '굽은 화살표', 비율: [0.36, 0.32], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.011 }
  };
  Object.values(틀).forEach(t => { t.층 = '앞'; t.스티커 = true; });

  /* ---- 그리기 도우미 ---- */
  const 선두께 = d => Math.max(0, d.테두리 || 0);
  // 지금 만든 경로를 채우고 윤곽선을 긋는다
  function 칠하기(ctx, d, 색) {
    if (색) { ctx.fillStyle = 색; ctx.fill(); }
    if (선두께(d) > 0) { ctx.lineWidth = 선두께(d); ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); }
  }
  // 두꺼운 선 모양(물음표·체크·엑스): 윤곽선 색으로 한 번 더 굵게 긋고 그 위에 본색을 긋는다
  function 굵게(ctx, d, 굵기, 경로) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (선두께(d) > 0) { ctx.beginPath(); 경로(); ctx.lineWidth = 굵기 + 선두께(d) * 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); }
    ctx.beginPath(); 경로(); ctx.lineWidth = 굵기; ctx.strokeStyle = d.채움 || 흰색; ctx.stroke();
  }
  const 타원 = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); };
  const 고정칠 = (ctx, 색) => { ctx.fillStyle = 색; ctx.fill(); };
  const 가는선 = d => Math.max(2, 선두께(d) * 0.7);

  /* ---- 모양 ---- */
  const 모양 = {
    말풍선(ctx, d, a, b) {
      const r = Math.min(a, b) * 0.5, 아래 = b * 0.55;
      ctx.beginPath();
      ctx.moveTo(-a + r, -b); ctx.lineTo(a - r, -b); ctx.quadraticCurveTo(a, -b, a, -b + r);
      ctx.lineTo(a, 아래 - r); ctx.quadraticCurveTo(a, 아래, a - r, 아래);
      ctx.lineTo(-a * 0.1, 아래); ctx.lineTo(-a * 0.7, b); ctx.lineTo(-a * 0.5, 아래);
      ctx.lineTo(-a + r, 아래); ctx.quadraticCurveTo(-a, 아래, -a, 아래 - r);
      ctx.lineTo(-a, -b + r); ctx.quadraticCurveTo(-a, -b, -a + r, -b); ctx.closePath();
      칠하기(ctx, d, d.채움);
    },
    느낌표(ctx, d, a, b) {
      ctx.beginPath();
      ctx.moveTo(-a * 0.7, -b); ctx.lineTo(a * 0.7, -b); ctx.lineTo(a * 0.32, b * 0.4); ctx.lineTo(-a * 0.32, b * 0.4); ctx.closePath();
      칠하기(ctx, d, d.채움);
      타원(ctx, 0, b * 0.8, Math.min(a * 0.34, b * 0.2), Math.min(a * 0.34, b * 0.2)); 칠하기(ctx, d, d.채움);
    },
    물음표(ctx, d, a, b) {
      const 굵기 = Math.min(a, b) * 0.62;
      굵게(ctx, d, 굵기, () => {
        ctx.moveTo(-a * 0.5, -b * 0.55); ctx.bezierCurveTo(-a * 0.5, -b * 1.05, a * 0.55, -b * 1.05, a * 0.55, -b * 0.45);
        ctx.bezierCurveTo(a * 0.55, -b * 0.02, 0, -b * 0.1, 0, b * 0.28);
      });
      const r = 굵기 * 0.62; 타원(ctx, 0, b - r, r, r); 칠하기(ctx, d, d.채움);
    },
    체크(ctx, d, a, b) {
      굵게(ctx, d, Math.min(a, b) * 0.5, () => { ctx.moveTo(-a * 0.62, b * 0.05); ctx.lineTo(-a * 0.22, b * 0.52); ctx.lineTo(a * 0.64, -b * 0.52); });
    },
    엑스(ctx, d, a, b) {
      굵게(ctx, d, Math.min(a, b) * 0.5, () => { ctx.moveTo(-a * 0.55, -b * 0.55); ctx.lineTo(a * 0.55, b * 0.55); ctx.moveTo(a * 0.55, -b * 0.55); ctx.lineTo(-a * 0.55, b * 0.55); });
    },
    하트(ctx, d, a, b) {
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {   // 하트 곡선: 가로 ±16, 세로 -17~12 를 틀에 꼭 맞게 늘린다
        const t = i / 60 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const X = x / 16 * a, Y = -(y + 2.5) / 14.5 * b; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.closePath(); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.ellipse(-a * 0.5, -b * 0.4, a * 0.13, b * 0.1, -0.7, 0, Math.PI * 2); 고정칠(ctx, 'rgba(255,255,255,.7)');
    },
    놀람(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      const 가늘 = 가는선(d);
      [-1, 1].forEach(s => {
        타원(ctx, s * a * 0.36, -b * 0.16, a * 0.2, b * 0.26); 고정칠(ctx, 흰색); ctx.lineWidth = 가늘; ctx.strokeStyle = 검정; ctx.stroke();
        타원(ctx, s * a * 0.36, -b * 0.12, a * 0.08, b * 0.11); 고정칠(ctx, 검정);
        ctx.beginPath(); ctx.moveTo(s * a * 0.62, -b * 0.58); ctx.lineTo(s * a * 0.14, -b * 0.66); ctx.lineWidth = 가늘 * 1.2; ctx.lineCap = 'round'; ctx.strokeStyle = 검정; ctx.stroke();
      });
      타원(ctx, 0, b * 0.5, a * 0.2, b * 0.26); 고정칠(ctx, 검정);
    },
    웃음(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      [-1, 1].forEach(s => { 타원(ctx, s * a * 0.36, -b * 0.2, a * 0.1, b * 0.17); 고정칠(ctx, 검정); 타원(ctx, s * a * 0.62, b * 0.15, a * 0.15, b * 0.1); 고정칠(ctx, 'rgba(255,90,120,.55)'); });
      ctx.beginPath(); ctx.moveTo(-a * 0.52, b * 0.12); ctx.quadraticCurveTo(0, b * 1.0, a * 0.52, b * 0.12); ctx.closePath();
      고정칠(ctx, 흰색); ctx.lineWidth = 가는선(d); ctx.lineJoin = 'round'; ctx.strokeStyle = 검정; ctx.stroke();
    },
    불꽃(ctx, d, a, b) {
      const 불 = () => {
        ctx.beginPath(); ctx.moveTo(a * 0.1, -b);
        ctx.bezierCurveTo(a * 0.25, -b * 0.55, a * 0.95, -b * 0.3, a * 0.85, b * 0.35);
        ctx.bezierCurveTo(a * 0.8, b * 0.8, a * 0.4, b, 0, b);
        ctx.bezierCurveTo(-a * 0.5, b, -a * 0.9, b * 0.7, -a * 0.85, b * 0.1);
        ctx.bezierCurveTo(-a * 0.82, -b * 0.2, -a * 0.5, -b * 0.3, -a * 0.4, -b * 0.62);
        ctx.bezierCurveTo(-a * 0.2, -b * 0.4, -a * 0.1, -b * 0.55, a * 0.1, -b); ctx.closePath();
      };
      불(); 칠하기(ctx, d, d.채움);
      ctx.save(); ctx.translate(0, b * 0.42); ctx.scale(0.55, 0.5); 불(); 고정칠(ctx, '#FFE14D'); ctx.restore();
    },
    번개(ctx, d, a, b) {
      const 점 = [[0.25, -1], [-0.6, 0.1], [-0.05, 0.1], [-0.3, 1], [0.65, -0.2], [0.05, -0.2], [0.55, -1]];
      ctx.beginPath(); 점.forEach(([u, v], i) => (i ? ctx.lineTo(u * a, v * b) : ctx.moveTo(u * a, v * b))); ctx.closePath();
      ctx.lineJoin = 'round'; ctx.miterLimit = 2; 칠하기(ctx, d, d.채움);
    },
    반짝(ctx, d, a, b) {
      const 별 = (x, y, s) => {
        ctx.beginPath(); ctx.moveTo(x, y - b * s);
        ctx.quadraticCurveTo(x + a * s * 0.12, y - b * s * 0.12, x + a * s, y); ctx.quadraticCurveTo(x + a * s * 0.12, y + b * s * 0.12, x, y + b * s);
        ctx.quadraticCurveTo(x - a * s * 0.12, y + b * s * 0.12, x - a * s, y); ctx.quadraticCurveTo(x - a * s * 0.12, y - b * s * 0.12, x, y - b * s); ctx.closePath();
        ctx.lineJoin = 'round'; 칠하기(ctx, d, d.채움);
      };
      별(-a * 0.15, b * 0.1, 0.78); 별(a * 0.7, -b * 0.7, 0.3); 별(a * 0.62, b * 0.72, 0.22);
    },
    곡선화살표(ctx, d, a, b) {
      const s = Math.min(a, b), 굵기 = s * 0.36, 끝 = [a * 0.3, -b * 0.4];
      const 줄기 = () => { ctx.moveTo(-a * 0.85, b * 0.85); ctx.bezierCurveTo(-a * 0.95, -b * 0.3, -a * 0.2, -b * 0.95, 끝[0], 끝[1]); };
      // 끝 방향으로 화살촉을 세운다 (줄기 끝의 접선 = 끝 - 마지막 조절점)
      const dx = 끝[0] + a * 0.2, dy = 끝[1] + b * 0.95, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, 길 = s * 0.8, 폭 = s * 0.62;
      const 머리 = () => { ctx.beginPath(); ctx.moveTo(끝[0] + ux * 길, 끝[1] + uy * 길); ctx.lineTo(끝[0] - uy * 폭, 끝[1] + ux * 폭); ctx.lineTo(끝[0] + uy * 폭, 끝[1] - ux * 폭); ctx.closePath(); };
      if (선두께(d) > 0) { ctx.beginPath(); 줄기(); ctx.lineCap = 'round'; ctx.lineWidth = 굵기 + 선두께(d) * 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); }
      머리(); ctx.lineJoin = 'round'; 칠하기(ctx, d, d.채움);
      ctx.beginPath(); 줄기(); ctx.lineCap = 'round'; ctx.lineWidth = 굵기; ctx.strokeStyle = d.채움 || 흰색; ctx.stroke();
    }
  };

  global.RewindStickers = { 틀, 모양 };
})(typeof window !== 'undefined' ? window : globalThis);
