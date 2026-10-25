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
    곡선화살표: { 이름: '굽은 화살표', 비율: [0.36, 0.32], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.011 },
    화남: { 이름: '화난 얼굴', 비율: [0.3, 0.3], 채움: '#FF5A3C', 테두리색: 검정, 테두리비율: 0.01 },
    울음: { 이름: '우는 얼굴', 비율: [0.3, 0.3], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    하트눈: { 이름: '하트 눈', 비율: [0.3, 0.3], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    선글라스: { 이름: '선글라스', 비율: [0.3, 0.3], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    생각풍선: { 이름: '생각풍선', 비율: [0.42, 0.34], 채움: 흰색, 테두리색: 검정, 테두리비율: 0.011 },
    깨진하트: { 이름: '깨진 하트', 비율: [0.3, 0.27], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.01 },
    왕관: { 이름: '왕관', 비율: [0.34, 0.28], 채움: '#FFC933', 테두리색: 검정, 테두리비율: 0.01 },
    전구: { 이름: '전구', 비율: [0.26, 0.34], 채움: '#FFE14D', 테두리색: 검정, 테두리비율: 0.01 },
    돋보기: { 이름: '돋보기', 비율: [0.3, 0.3], 채움: '#BFE9FF', 테두리색: 검정, 테두리비율: 0.011 },
    동전: { 이름: '동전', 비율: [0.28, 0.28], 채움: '#FFC933', 테두리색: 검정, 테두리비율: 0.01 },
    트로피: { 이름: '트로피', 비율: [0.3, 0.34], 채움: '#FFC933', 테두리색: 검정, 테두리비율: 0.01 },
    로켓: { 이름: '로켓', 비율: [0.24, 0.36], 채움: '#F2F4F7', 테두리색: 검정, 테두리비율: 0.01 },
    선물: { 이름: '선물상자', 비율: [0.3, 0.3], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.01 },
    시계: { 이름: '시계', 비율: [0.28, 0.28], 채움: 흰색, 테두리색: 검정, 테두리비율: 0.012 },
    자물쇠: { 이름: '자물쇠', 비율: [0.26, 0.32], 채움: '#FFC933', 테두리색: 검정, 테두리비율: 0.01 },
    경고: { 이름: '경고 표지', 비율: [0.32, 0.28], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.011 },
    금지: { 이름: '금지 표지', 비율: [0.3, 0.3], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.01 },
    눈: { 이름: '눈', 비율: [0.36, 0.22], 채움: '#4A90D9', 테두리색: 검정, 테두리비율: 0.01 },
    폭탄: { 이름: '폭탄', 비율: [0.28, 0.32], 채움: '#3A3A3A', 테두리색: 검정, 테두리비율: 0.01 },
    물방울: { 이름: '물방울', 비율: [0.2, 0.28], 채움: '#4FC3F7', 테두리색: 검정, 테두리비율: 0.01 },
    해: { 이름: '해', 비율: [0.32, 0.32], 채움: '#FFD60A', 테두리색: 검정, 테두리비율: 0.01 },
    손가락: { 이름: '가리키는 손', 비율: [0.4, 0.26], 채움: '#FFD7B0', 테두리색: 검정, 테두리비율: 0.011 },
    라벨NEW: { 이름: 'NEW', 비율: [0.28, 0.12], 채움: '#FF3B30', 테두리색: 검정, 테두리비율: 0.009 },
    라벨HOT: { 이름: 'HOT', 비율: [0.26, 0.12], 채움: '#FF6B1A', 테두리색: 검정, 테두리비율: 0.009 },
    라벨필독: { 이름: '필독', 비율: [0.26, 0.12], 채움: '#0A84FF', 테두리색: 검정, 테두리비율: 0.009 },
    라벨1위: { 이름: '1위', 비율: [0.26, 0.12], 채움: '#FFC933', 테두리색: 검정, 테두리비율: 0.009 }
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

  // 하트 모양 경로(가운데 cx,cy / 가로·세로 반 ha,hb). 색을 주면 칠하고, d 를 주면 윤곽선도 긋는다
  function 하트경로(ctx, cx, cy, ha, hb, 색, d) {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60 * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const X = cx + x / 16 * ha, Y = cy - (y + 2.5) / 14.5 * hb; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
    }
    ctx.closePath(); if (d) 칠하기(ctx, d, 색); else 고정칠(ctx, 색);
  }
  // 구름 경로: 가로 ±a, 세로는 b 만큼 늘려 oy 만큼 내려서
  function 구름경로(ctx, a, b, oy) {
    const Y = v => oy + v * b;
    ctx.beginPath(); ctx.moveTo(-a * 0.55, Y(0.6));
    ctx.bezierCurveTo(-a * 1.15, Y(0.6), -a * 1.1, Y(-0.15), -a * 0.6, Y(-0.1));
    ctx.bezierCurveTo(-a * 0.65, Y(-0.75), a * 0.05, Y(-0.95), a * 0.3, Y(-0.5));
    ctx.bezierCurveTo(a * 0.65, Y(-0.85), a * 1.15, Y(-0.3), a * 0.85, Y(0.05));
    ctx.bezierCurveTo(a * 1.2, Y(0.3), a * 1.0, Y(0.6), a * 0.6, Y(0.6)); ctx.closePath();
  }
  function 라벨(ctx, d, a, b, 글, 글자색) {
    const r = Math.min(a, b) * 0.5;
    ctx.beginPath(); ctx.moveTo(-a + r, -b); ctx.lineTo(a - r, -b); ctx.quadraticCurveTo(a, -b, a, -b + r); ctx.lineTo(a, b - r); ctx.quadraticCurveTo(a, b, a - r, b);
    ctx.lineTo(-a + r, b); ctx.quadraticCurveTo(-a, b, -a, b - r); ctx.lineTo(-a, -b + r); ctx.quadraticCurveTo(-a, -b, -a + r, -b); ctx.closePath(); 칠하기(ctx, d, d.채움);
    const 글자수 = Math.max(2, [...글].length * (/[A-Za-z0-9]/.test(글) ? 0.62 : 0.95)), px = Math.min(b * 1.25, (a * 1.6) / 글자수);
    const 밝기 = (() => { const m = /^#?([0-9a-f]{6})$/i.exec(String(d.채움 || '')); if (!m) return null; const v = parseInt(m[1], 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; })();
    if (밝기 !== null) 글자색 = 밝기 > 0.62 ? 검정 : 흰색;   // 바꾼 채움 색 위에서도 글씨가 보이게
    ctx.fillStyle = 글자색; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `400 ${Math.round(px)}px "Black Han Sans", "Noto Sans KR", sans-serif`; ctx.fillText(글, 0, b * 0.06);
  }

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
    },

    /* ---- 얼굴 더 ---- */
    화남(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      const 가늘 = 가는선(d) * 1.4;
      ctx.lineCap = 'round'; ctx.lineWidth = 가늘; ctx.strokeStyle = 검정;
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * a * 0.7, -b * 0.52); ctx.lineTo(s * a * 0.16, -b * 0.24); ctx.stroke(); 타원(ctx, s * a * 0.36, -b * 0.02, a * 0.09, b * 0.13); 고정칠(ctx, 검정); });
      ctx.beginPath(); ctx.moveTo(-a * 0.4, b * 0.62); ctx.quadraticCurveTo(0, b * 0.22, a * 0.4, b * 0.62); ctx.stroke();
    },
    울음(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      ctx.lineCap = 'round'; ctx.lineWidth = 가는선(d) * 1.4; ctx.strokeStyle = 검정;
      [-1, 1].forEach(s => {
        ctx.beginPath(); ctx.moveTo(s * a * 0.55, -b * 0.08); ctx.quadraticCurveTo(s * a * 0.35, -b * 0.36, s * a * 0.15, -b * 0.08); ctx.stroke();
        타원(ctx, s * a * 0.5, b * 0.28, a * 0.11, b * 0.22); 고정칠(ctx, '#4FC3F7'); ctx.lineWidth = 가는선(d) * 0.6; ctx.stroke(); ctx.lineWidth = 가는선(d) * 1.4;
      });
      ctx.beginPath(); ctx.moveTo(-a * 0.32, b * 0.68); ctx.quadraticCurveTo(0, b * 0.35, a * 0.32, b * 0.68); ctx.stroke();
    },
    하트눈(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      [-1, 1].forEach(s => 하트경로(ctx, s * a * 0.4, -b * 0.15, a * 0.26, b * 0.24, '#FF3B30'));
      ctx.beginPath(); ctx.moveTo(-a * 0.52, b * 0.12); ctx.quadraticCurveTo(0, b * 1.0, a * 0.52, b * 0.12); ctx.closePath();
      고정칠(ctx, 흰색); ctx.lineWidth = 가는선(d); ctx.lineJoin = 'round'; ctx.strokeStyle = 검정; ctx.stroke();
    },
    선글라스(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      ctx.lineCap = 'round'; ctx.lineWidth = 가는선(d) * 1.3; ctx.strokeStyle = 검정;
      ctx.beginPath(); ctx.moveTo(-a * 0.08, -b * 0.16); ctx.quadraticCurveTo(0, -b * 0.26, a * 0.08, -b * 0.16); ctx.stroke();
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * a * 0.4, -b * 0.08, a * 0.3, b * 0.22, 0, 0, Math.PI * 2); 고정칠(ctx, 검정); ctx.beginPath(); ctx.moveTo(s * a * 0.25, -b * 0.18); ctx.lineTo(s * a * 0.42, -b * 0.18); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke(); ctx.strokeStyle = 검정; });
      ctx.beginPath(); ctx.moveTo(-a * 0.42, b * 0.35); ctx.quadraticCurveTo(0, b * 0.85, a * 0.42, b * 0.35); ctx.stroke();
    },
    깨진하트(ctx, d, a, b) {
      하트경로(ctx, 0, 0, a, b, d.채움, d);
      ctx.lineCap = ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, Math.min(a, b) * 0.12); ctx.strokeStyle = 검정;
      ctx.beginPath(); ctx.moveTo(a * 0.05, -b * 0.55); ctx.lineTo(-a * 0.2, -b * 0.12); ctx.lineTo(a * 0.18, b * 0.12); ctx.lineTo(-a * 0.06, b * 0.62); ctx.stroke();
    },
    생각풍선(ctx, d, a, b) {
      구름경로(ctx, a, b * 0.72, -b * 0.28); 칠하기(ctx, d, d.채움);
      [[-a * 0.5, b * 0.62, 0.11], [-a * 0.7, b * 0.88, 0.07]].forEach(([x, y, r]) => { 타원(ctx, x, y, Math.min(a, b) * r * 1.6, Math.min(a, b) * r * 1.6); 칠하기(ctx, d, d.채움); });
    },

    /* ---- 사물 ---- */
    왕관(ctx, d, a, b) {
      ctx.beginPath();
      [[-0.85, 0.65], [-0.85, -0.2], [-0.45, 0.15], [0, -0.7], [0.45, 0.15], [0.85, -0.2], [0.85, 0.65]].forEach(([u, v], i) => (i ? ctx.lineTo(u * a, v * b) : ctx.moveTo(u * a, v * b)));
      ctx.closePath(); ctx.lineJoin = 'round'; 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.moveTo(-a * 0.85, b * 0.38); ctx.lineTo(a * 0.85, b * 0.38); ctx.lineWidth = 선두께(d) || 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke();
      [[-0.85, -0.3], [0, -0.82], [0.85, -0.3]].forEach(([u, v]) => { 타원(ctx, u * a, v * b, Math.min(a, b) * 0.14, Math.min(a, b) * 0.14); 칠하기(ctx, d, '#FF3B30'); });
    },
    전구(ctx, d, a, b) {
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(2, 선두께(d)); ctx.strokeStyle = '#FFB400';
      [[-0.95, -0.55], [0.95, -0.55], [0, -1.05]].forEach(([u, v]) => { ctx.beginPath(); ctx.moveTo(u * a * 0.8, v * b * 0.8 - b * 0.05); ctx.lineTo(u * a * 0.98, v * b * 0.98 - b * 0.05); ctx.stroke(); });
      타원(ctx, 0, -b * 0.25, a * 0.62, b * 0.58); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.moveTo(-a * 0.3, b * 0.2); ctx.lineTo(-a * 0.3, b * 0.6); ctx.lineTo(a * 0.3, b * 0.6); ctx.lineTo(a * 0.3, b * 0.2); ctx.closePath(); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.rect(-a * 0.32, b * 0.6, a * 0.64, b * 0.32); 칠하기(ctx, d, '#9AA0A6');
      ctx.beginPath(); ctx.moveTo(-a * 0.2, b * 0.2); ctx.lineTo(-a * 0.2, -b * 0.15); ctx.lineTo(-a * 0.05, -b * 0.3); ctx.lineTo(a * 0.1, -b * 0.15); ctx.lineTo(a * 0.2, -b * 0.3); ctx.lineWidth = 가는선(d) * 0.8; ctx.strokeStyle = 검정; ctx.stroke();
    },
    돋보기(ctx, d, a, b) {
      const s = Math.min(a, b), cx = -a * 0.22, cy = -b * 0.22, r = s * 0.62;
      굵게(ctx, { ...d, 채움: '#8B5A2B' }, s * 0.26, () => { ctx.moveTo(cx + r * 0.72, cy + r * 0.72); ctx.lineTo(a * 0.82, b * 0.82); });
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); 고정칠(ctx, d.채움 || '#BFE9FF');
      ctx.lineWidth = s * 0.17 + 선두께(d) * 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); ctx.lineWidth = s * 0.17; ctx.strokeStyle = '#E8ECEF'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, Math.PI * 1.1, Math.PI * 1.55); ctx.lineWidth = s * 0.07; ctx.lineCap = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
    },
    동전(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      타원(ctx, 0, 0, a * 0.78, b * 0.78); ctx.lineWidth = Math.max(2, 선두께(d) * 0.7); ctx.strokeStyle = '#B8860B'; ctx.stroke();
      ctx.fillStyle = '#9A6B00'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${Math.round(Math.min(a, b) * 1.15)}px "Noto Sans KR", sans-serif`; ctx.fillText('₩', 0, b * 0.05);
    },
    트로피(ctx, d, a, b) {
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * a * 0.62, -b * 0.5, a * 0.22, b * 0.3, 0, 0, Math.PI * 2); ctx.lineWidth = Math.min(a, b) * 0.13 + 선두께(d) * 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); ctx.lineWidth = Math.min(a, b) * 0.13; ctx.strokeStyle = d.채움 || '#FFC933'; ctx.stroke(); });
      ctx.beginPath(); ctx.rect(-a * 0.14, b * 0.35, a * 0.28, b * 0.35); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.rect(-a * 0.42, b * 0.66, a * 0.84, b * 0.3); 칠하기(ctx, d, '#B8860B');
      ctx.beginPath(); ctx.moveTo(-a * 0.52, -b * 0.95); ctx.lineTo(a * 0.52, -b * 0.95); ctx.lineTo(a * 0.46, -b * 0.1); ctx.quadraticCurveTo(a * 0.4, b * 0.4, 0, b * 0.42); ctx.quadraticCurveTo(-a * 0.4, b * 0.4, -a * 0.46, -b * 0.1); ctx.closePath(); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.moveTo(-a * 0.3, -b * 0.75); ctx.lineTo(-a * 0.26, -b * 0.15); ctx.lineWidth = Math.min(a, b) * 0.07; ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.stroke();
    },
    로켓(ctx, d, a, b) {
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(-a * 0.24, b * 0.6); ctx.lineTo(0, b); ctx.lineTo(a * 0.24, b * 0.6); ctx.closePath(); 칠하기(ctx, d, '#FF9F0A');
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.moveTo(s * a * 0.4, b * 0.05); ctx.lineTo(s * a * 0.85, b * 0.7); ctx.lineTo(s * a * 0.36, b * 0.55); ctx.closePath(); 칠하기(ctx, d, '#FF3B30'); });
      ctx.beginPath(); ctx.moveTo(0, -b);
      ctx.bezierCurveTo(a * 0.7, -b * 0.55, a * 0.55, b * 0.2, a * 0.36, b * 0.66); ctx.lineTo(-a * 0.36, b * 0.66); ctx.bezierCurveTo(-a * 0.55, b * 0.2, -a * 0.7, -b * 0.55, 0, -b); ctx.closePath(); 칠하기(ctx, d, d.채움);
      타원(ctx, 0, -b * 0.25, Math.min(a, b) * 0.2, Math.min(a, b) * 0.2); 칠하기(ctx, d, '#4FC3F7');
    },
    선물(ctx, d, a, b) {
      ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.rect(-a * 0.78, -b * 0.12, a * 1.56, b * 1.0); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.rect(-a * 0.9, -b * 0.42, a * 1.8, b * 0.34); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.rect(-a * 0.13, -b * 0.42, a * 0.26, b * 1.3); 칠하기(ctx, d, '#FFE14D');
      [-1, 1].forEach(s => { ctx.beginPath(); ctx.ellipse(s * a * 0.3, -b * 0.62, a * 0.3, b * 0.2, s * -0.5, 0, Math.PI * 2); 칠하기(ctx, d, '#FFE14D'); });
      타원(ctx, 0, -b * 0.46, a * 0.11, b * 0.1); 칠하기(ctx, d, '#FFE14D');
    },
    시계(ctx, d, a, b) {
      타원(ctx, 0, 0, a, b); 칠하기(ctx, d, d.채움);
      ctx.lineCap = 'round'; ctx.strokeStyle = 검정; ctx.lineWidth = Math.max(2, 선두께(d) * 0.7);
      for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6, r1 = i % 3 ? 0.84 : 0.76; ctx.beginPath(); ctx.moveTo(Math.sin(t) * a * r1, -Math.cos(t) * b * r1); ctx.lineTo(Math.sin(t) * a * 0.92, -Math.cos(t) * b * 0.92); ctx.stroke(); }
      ctx.lineWidth = Math.max(3, Math.min(a, b) * 0.1);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -b * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a * 0.4, b * 0.18); ctx.stroke();
      타원(ctx, 0, 0, Math.min(a, b) * 0.09, Math.min(a, b) * 0.09); 고정칠(ctx, '#FF3B30');
    },
    자물쇠(ctx, d, a, b) {
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -b * 0.2, a * 0.48, Math.PI, 0); ctx.lineTo(a * 0.48, b * 0.05); ctx.moveTo(-a * 0.48, -b * 0.2); ctx.lineTo(-a * 0.48, b * 0.05);
      ctx.lineWidth = Math.min(a, b) * 0.2 + 선두께(d) * 2; ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); ctx.lineWidth = Math.min(a, b) * 0.2; ctx.strokeStyle = '#C8CDD2'; ctx.stroke();
      const r = Math.min(a, b) * 0.2;
      ctx.beginPath(); ctx.moveTo(-a * 0.85 + r, -b * 0.1); ctx.lineTo(a * 0.85 - r, -b * 0.1); ctx.quadraticCurveTo(a * 0.85, -b * 0.1, a * 0.85, -b * 0.1 + r); ctx.lineTo(a * 0.85, b * 0.9 - r); ctx.quadraticCurveTo(a * 0.85, b * 0.9, a * 0.85 - r, b * 0.9);
      ctx.lineTo(-a * 0.85 + r, b * 0.9); ctx.quadraticCurveTo(-a * 0.85, b * 0.9, -a * 0.85, b * 0.9 - r); ctx.lineTo(-a * 0.85, -b * 0.1 + r); ctx.quadraticCurveTo(-a * 0.85, -b * 0.1, -a * 0.85 + r, -b * 0.1); ctx.closePath(); 칠하기(ctx, d, d.채움);
      타원(ctx, 0, b * 0.35, Math.min(a, b) * 0.13, Math.min(a, b) * 0.13); 고정칠(ctx, 검정);
      ctx.beginPath(); ctx.moveTo(0, b * 0.4); ctx.lineTo(0, b * 0.68); ctx.lineWidth = Math.min(a, b) * 0.12; ctx.strokeStyle = 검정; ctx.stroke();
    },
    경고(ctx, d, a, b) {
      ctx.beginPath(); ctx.moveTo(0, -b); ctx.lineTo(a, b * 0.88); ctx.lineTo(-a, b * 0.88); ctx.closePath(); ctx.lineJoin = 'round'; 칠하기(ctx, d, d.채움);
      ctx.fillStyle = 검정; ctx.beginPath(); ctx.moveTo(-a * 0.1, -b * 0.35); ctx.lineTo(a * 0.1, -b * 0.35); ctx.lineTo(a * 0.06, b * 0.3); ctx.lineTo(-a * 0.06, b * 0.3); ctx.closePath(); ctx.fill();
      타원(ctx, 0, b * 0.58, Math.min(a, b) * 0.1, Math.min(a, b) * 0.1); 고정칠(ctx, 검정);
    },
    금지(ctx, d, a, b) {
      const R = Math.min(a, b) * 0.72, 굵기 = Math.min(a, b) * 0.3;
      굵게(ctx, d, 굵기, () => { ctx.moveTo(R, 0); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.moveTo(-R * 0.7, -R * 0.7); ctx.lineTo(R * 0.7, R * 0.7); });
    },
    눈(ctx, d, a, b) {
      const 눈매 = () => { ctx.beginPath(); ctx.moveTo(-a, 0); ctx.quadraticCurveTo(0, -b * 1.9, a, 0); ctx.quadraticCurveTo(0, b * 1.9, -a, 0); ctx.closePath(); };
      눈매(); 칠하기(ctx, d, 흰색);
      ctx.save(); 눈매(); ctx.clip();
      타원(ctx, 0, 0, Math.min(a * 0.46, b * 0.9), Math.min(a * 0.46, b * 0.9)); 고정칠(ctx, d.채움 || '#4A90D9');
      타원(ctx, 0, 0, Math.min(a * 0.2, b * 0.4), Math.min(a * 0.2, b * 0.4)); 고정칠(ctx, 검정);
      타원(ctx, -a * 0.12, -b * 0.28, Math.min(a * 0.08, b * 0.16), Math.min(a * 0.08, b * 0.16)); 고정칠(ctx, 흰색);
      ctx.restore();
      눈매(); if (선두께(d) > 0) { ctx.lineWidth = 선두께(d); ctx.strokeStyle = d.테두리색 || 검정; ctx.stroke(); }
    },
    폭탄(ctx, d, a, b) {
      const r = Math.min(a * 0.82, b * 0.72);
      ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a * 0.15, -b * 0.45); ctx.quadraticCurveTo(a * 0.5, -b * 0.95, a * 0.62, -b * 0.7); ctx.lineWidth = Math.max(3, 선두께(d) * 1.5); ctx.strokeStyle = '#8B5A2B'; ctx.stroke();
      타원(ctx, 0, b * 0.22, r, r); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.rect(-r * 0.25, -b * 0.55, r * 0.5, r * 0.3); 칠하기(ctx, d, d.채움);
      타원(ctx, -r * 0.38, b * 0.02, r * 0.18, r * 0.12); 고정칠(ctx, 'rgba(255,255,255,.55)');
      ctx.beginPath(); ctx.moveTo(a * 0.66, -b * 1.0); ctx.lineTo(a * 0.72, -b * 0.8); ctx.lineTo(a * 0.9, -b * 0.76); ctx.lineTo(a * 0.74, -b * 0.66); ctx.lineTo(a * 0.7, -b * 0.5); ctx.lineTo(a * 0.58, -b * 0.66); ctx.lineTo(a * 0.4, -b * 0.7); ctx.lineTo(a * 0.56, -b * 0.8); ctx.closePath(); 고정칠(ctx, '#FFE14D');
    },
    물방울(ctx, d, a, b) {
      ctx.beginPath(); ctx.moveTo(0, -b);
      ctx.bezierCurveTo(a * 0.15, -b * 0.55, a * 0.85, -b * 0.15, a * 0.85, b * 0.35); ctx.bezierCurveTo(a * 0.85, b * 0.8, a * 0.45, b, 0, b);
      ctx.bezierCurveTo(-a * 0.45, b, -a * 0.85, b * 0.8, -a * 0.85, b * 0.35); ctx.bezierCurveTo(-a * 0.85, -b * 0.15, -a * 0.15, -b * 0.55, 0, -b); ctx.closePath(); 칠하기(ctx, d, d.채움);
      ctx.beginPath(); ctx.ellipse(-a * 0.35, b * 0.35, a * 0.12, b * 0.22, 0.25, 0, Math.PI * 2); 고정칠(ctx, 'rgba(255,255,255,.65)');
    },
    해(ctx, d, a, b) {
      const s = Math.min(a, b);
      굵게(ctx, d, s * 0.14, () => { for (let i = 0; i < 12; i++) { const t = i * Math.PI / 6; ctx.moveTo(Math.cos(t) * a * 0.72, Math.sin(t) * b * 0.72); ctx.lineTo(Math.cos(t) * a * 0.96, Math.sin(t) * b * 0.96); } });
      타원(ctx, 0, 0, a * 0.55, b * 0.55); 칠하기(ctx, d, d.채움);
    },
    손가락(ctx, d, a, b) {   // 오른쪽을 가리키는 손: 손바닥 + 말아 쥔 손가락 셋 + 엄지 + 쭉 뻗은 집게손가락
      const 둥글 = (x0, y0, x1, y1, r) => { ctx.beginPath(); ctx.moveTo(x0 + r, y0); ctx.lineTo(x1 - r, y0); ctx.quadraticCurveTo(x1, y0, x1, y0 + r); ctx.lineTo(x1, y1 - r); ctx.quadraticCurveTo(x1, y1, x1 - r, y1); ctx.lineTo(x0 + r, y1); ctx.quadraticCurveTo(x0, y1, x0, y1 - r); ctx.lineTo(x0, y0 + r); ctx.quadraticCurveTo(x0, y0, x0 + r, y0); ctx.closePath(); };
      const 칠 = (...v) => { 둥글(...v); 칠하기(ctx, d, d.채움); };
      ctx.lineJoin = 'round';
      칠(-a * 0.97, -b * 0.5, -a * 0.2, b * 0.9, b * 0.28);   // 손바닥
      [-0.1, 0.2, 0.5].forEach(y => 칠(-a * 0.5, b * y, a * 0.32, b * (y + 0.32), b * 0.15));   // 말아 쥔 손가락 셋
      칠(-a * 0.45, -b * 0.55, a * 0.98, -b * 0.14, b * 0.2);   // 쭉 뻗은 집게손가락
    },

    /* ---- 글씨 라벨 ---- */
    라벨NEW(ctx, d, a, b) { 라벨(ctx, d, a, b, 'NEW', 흰색); },
    라벨HOT(ctx, d, a, b) { 라벨(ctx, d, a, b, 'HOT', 흰색); },
    라벨필독(ctx, d, a, b) { 라벨(ctx, d, a, b, '필독', 흰색); },
    라벨1위(ctx, d, a, b) { 라벨(ctx, d, a, b, '1위', 검정); }
  };

  global.RewindStickers = { 틀, 모양 };
})(typeof window !== 'undefined' ? window : globalThis);
