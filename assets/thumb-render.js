/* 리와인드 썸네일 그리기 (편집 창·프로젝트 화면 공용)
 * 썸네일설계(JSON)의 한 장을 캔버스에 그린다. 자동 생성(JSON2Video)과 같은 규칙:
 *  배경(가득 채우기 + 확대·초점) → 어둡게 → 아래쪽 그늘 → 글씨(테두리 + 채우기)
 * 이미지 파일은 어디에도 저장하지 않고, 필요할 때 브라우저에서 다시 그린다.
 */
(function (global) {
  'use strict';

  // 분류 = 편집 창 글꼴 버튼 묶음 제목. 모두 Google Fonts(OFL, 상업 이용 가능)
  const 글꼴목록 = {
    'Black Han Sans': { css: "'Black Han Sans'", weight: '400', 이름: '블랙한산스', 분류: '굵고 강하게' },
    'Noto Sans KR': { css: "'Noto Sans KR'", weight: '900', 이름: '노토 산스 굵게', 분류: '굵고 강하게' },
    'Bagel Fat One': { css: "'Bagel Fat One'", weight: '400', 이름: '베이글 팻', 분류: '굵고 강하게' },
    'Gasoek One': { css: "'Gasoek One'", weight: '400', 이름: '가석', 분류: '굵고 강하게' },
    'Gothic A1': { css: "'Gothic A1'", weight: '900', 이름: '고딕 A1 블랙', 분류: '굵고 강하게' },
    'Do Hyeon': { css: "'Do Hyeon'", weight: '400', 이름: '도현', 분류: '친근하게' },
    'Jua': { css: "'Jua'", weight: '400', 이름: '주아', 분류: '친근하게' },
    'Nanum Brush Script': { css: "'Nanum Brush Script'", weight: '400', 이름: '나눔 붓글씨', 분류: '손글씨' },
    'East Sea Dokdo': { css: "'East Sea Dokdo'", weight: '400', 이름: '동해독도', 분류: '손글씨' },
    'Noto Serif KR': { css: "'Noto Serif KR'", weight: '900', 이름: '노토 세리프 굵게', 분류: '진지·고급' },
    'Song Myung': { css: "'Song Myung'", weight: '400', 이름: '송명', 분류: '진지·고급' },
    'Yeon Sung': { css: "'Yeon Sung'", weight: '400', 이름: '연성', 분류: '레트로' },
    'Gugi': { css: "'Gugi'", weight: '400', 이름: '구기', 분류: '레트로' }
  };
  const 글꼴주소 = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Noto+Sans+KR:wght@900'
    + '&family=Bagel+Fat+One&family=Gasoek+One&family=Gothic+A1:wght@900&family=Nanum+Brush+Script&family=East+Sea+Dokdo'
    + '&family=Noto+Serif+KR:wght@900&family=Song+Myung&family=Yeon+Sung&family=Gugi&display=swap';

  // 쓸글꼴(글꼴 키 배열)을 주면 그 글꼴만 기다리고 나머지는 뒤에서 받는다. 안 주면 전부 기다린다(예전 동작)
  function 글꼴준비(쓸글꼴) {
    if (!document.querySelector('link[data-rw-thumb-fonts]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 글꼴주소; l.setAttribute('data-rw-thumb-fonts', '1');
      document.head.appendChild(l);
    }
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const 샘플 = '가나다 ABC 123';
    const 받기 = f => document.fonts.load(`${f.weight} 64px ${f.css}`, 샘플).catch(() => null);
    const 전부 = Object.values(글꼴목록);
    const 대상 = Array.isArray(쓸글꼴) ? [...new Set(['Black Han Sans', ...쓸글꼴])].map(k => 글꼴목록[k]).filter(Boolean) : 전부;
    전부.filter(f => !대상.includes(f)).forEach(받기);
    return Promise.all(대상.map(받기)).then(() => undefined);
  }

  // 이미지 불러오기: 먼저 직접(CORS 허용 시), 막히면 중계 함수(proxy)로 받은 data URL 사용
  const 캐시 = new Map();
  function 이미지불러오기(url, proxy) {
    if (!url) return Promise.resolve(null);
    if (캐시.has(url)) return 캐시.get(url);
    const 직접 = src => new Promise((ok, no) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        // 불러와도 캔버스가 '오염'되면 내려받기가 막히므로 미리 확인
        try { const c = document.createElement('canvas'); c.width = c.height = 2; const x = c.getContext('2d'); x.drawImage(img, 0, 0, 2, 2); x.getImageData(0, 0, 1, 1); ok(img); }
        catch (e) { no(e); }
      };
      img.onerror = no;
      img.src = src;
    });
    const p = 직접(url).catch(() => {
      if (!proxy) return null;
      return Promise.resolve(proxy(url)).then(dataUrl => dataUrl ? 직접(dataUrl) : null).catch(() => null);
    });
    캐시.set(url, p);
    p.then(v => { if (!v) 캐시.delete(url); });
    return p;
  }

  function 배경주소(bg) {
    if (!bg) return '';
    if (bg.종류 === '내사진') return bg.지문 ? 'local:' + bg.지문 : '';   // 고객 기기에만 있는 사진 (서버에 없음)
    if (bg.종류 === '영상장면') return isFinite(Number(bg.시점)) ? 'frame:' + Number(bg.시점).toFixed(1) : '';   // 브라우저가 영상에서 뽑은 장면
    if (bg.종류 === 'image') return bg.src || '';
    return bg.정지이미지 || '';   // 영상 구간 배경은 자동 생성 때 만든 '글씨 없는 정지 이미지'를 쓴다
  }

  // 한 장 그리기. imgs: { [url]: HTMLImageElement }
  function 그리기(ctx, 설계, 장, img, 옵션) {
    옵션 = 옵션 || {};
    const W = 설계.캔버스.w, H = 설계.캔버스.h;
    const 배율 = 옵션.배율 || 1;
    ctx.save();
    ctx.setTransform(배율, 0, 0, 배율, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, W, H);

    const bg = 장.배경 || {};
    if (img) {
      const p = 배경배치(설계, 장, img);
      // 축소(확대 < 1)로 생긴 빈 곳: 흐리게(기본, 같은 사진을 흐리게 깔기) / 검정 / 흰색
      if (p.dw < W - 0.5 || p.dh < H - 0.5) 빈곳채우기(ctx, W, H, 옵션.원본 ? img : 보정이미지(img, bg.보정, 옵션.보정크기), bg.채우기);
      // 색감: 원본 사진을 한 번 보정한 결과(캐시)를 그린다. 옵션.원본이면 보정 없이(전/후 비교), 옵션.보정크기는 처리할 긴 변(끄는 중엔 작게)
      ctx.drawImage(옵션.원본 ? img : 보정이미지(img, bg.보정, 옵션.보정크기), p.dx, p.dy, p.dw, p.dh);
      if (!옵션.원본) 비네팅그리기(ctx, W, H, bg.보정);
    }
    // 덮개: + 는 검게(어둡게), - 는 하얗게(밝게) 덮는다 (글씨가 잘 보이게)
    const 어둡게 = 범위(Number(bg.어둡게) || 0, -0.8, 0.8);
    if (어둡게 > 0) { ctx.fillStyle = `rgba(0,0,0,${어둡게})`; ctx.fillRect(0, 0, W, H); }
    else if (어둡게 < 0) { ctx.fillStyle = `rgba(255,255,255,${-어둡게})`; ctx.fillRect(0, 0, W, H); }

    // 아래쪽 그늘 (자동 생성의 5겹 사각형과 같은 모양)
    const g = 장.그늘 || { 시작: 0.5, 끝불투명도: 0.55 };
    if (g.끝불투명도) {
      // 위에서 투명 → 아래로 갈수록 끝불투명도까지 부드럽게 어두워진다 (음수면 같은 모양으로 밝아진다)
      const 시작 = Math.max(0, g.시작) * H;
      const 색 = g.끝불투명도 > 0 ? '0,0,0' : '255,255,255', 세기 = Math.abs(g.끝불투명도);
      const gr = ctx.createLinearGradient(0, 시작, 0, H);
      gr.addColorStop(0, `rgba(${색},0)`);
      gr.addColorStop(0.5, `rgba(${색},${(세기 * 0.6).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${색},${세기})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 시작, W, H - 시작);
    }

    // 도형: 층이 '뒤'인 것은 글씨 아래, 그 밖(앞)은 글씨 위에 그린다
    const 도형들 = Array.isArray(장.도형) ? 장.도형 : [];
    도형들.forEach(d => { if (d && d.층 === '뒤') 도형그리기(ctx, d); });

    // 글씨
    (장.글씨 || []).forEach(t => {
      const f = 글꼴목록[t.font] || 글꼴목록['Black Han Sans'];
      ctx.save();
      // 회전: 글씨 상자 전체(여러 줄)의 가운데를 축으로 함께 돈다
      if (t.회전) { ctx.translate(t.중심x, t.중심y); ctx.rotate(t.회전 * Math.PI / 180); ctx.translate(-t.중심x, -t.중심y); }
      ctx.font = `${f.weight} ${t.size}px ${f.css}, 'Noto Sans KR', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = t.x + t.w / 2, cy = t.y + t.h / 2 + t.size * 0.04;
      if (t.shadow) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = t.size * 0.18; ctx.shadowOffsetY = t.size * 0.06;
        ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.fillText(t.text, cx, cy);
        ctx.restore();
      }
      if (t.outlineWidth > 0) {
        ctx.lineJoin = 'round'; ctx.miterLimit = 2;
        ctx.lineWidth = t.outlineWidth * 2;
        ctx.strokeStyle = t.outline || '#111';
        ctx.strokeText(t.text, cx, cy);
      }
      ctx.fillStyle = t.color || '#fff';
      ctx.fillText(t.text, cx, cy);
      ctx.restore();
    });
    도형들.forEach(d => { if (d && d.층 !== '뒤') 도형그리기(ctx, d); });
    ctx.restore();
  }

  /* ---------- 도형 (화살표·동그라미·네모·직선·별·번쩍) ----------
   * 데이터: 장.도형 = [{ 종류, cx, cy, w, h, 회전(도), 채움('' = 없음), 테두리색, 테두리(px), 투명(10~100), 층('앞'|'뒤') }]
   * 좌표는 썸네일 틀(설계.캔버스) 기준이라 편집 창·받기·작은 그림이 모두 같은 모양으로 그려진다. 모든 도형은 코드로 직접 그린다(외부 그림 없음). */
  const 도형틀 = {
    화살표: { 이름: '화살표', 비율: [0.42, 0.24], 채움: '#FF3B30', 테두리색: '#111111', 테두리비율: 0.011, 층: '앞' },
    동그라미: { 이름: '동그라미', 비율: [0.36, 0.36], 채움: '', 테두리색: '#FF3B30', 테두리비율: 0.02, 층: '앞' },
    네모: { 이름: '네모', 비율: [0.55, 0.3], 채움: '', 테두리색: '#FFE14D', 테두리비율: 0.017, 층: '앞' },
    직선: { 이름: '직선', 비율: [0.45, 0], 채움: '', 테두리색: '#FF3B30', 테두리비율: 0.02, 층: '앞' },
    별: { 이름: '별', 비율: [0.3, 0.3], 채움: '#FFE14D', 테두리색: '#111111', 테두리비율: 0.009, 층: '앞' },
    번쩍: { 이름: '번쩍', 비율: [0.38, 0.38], 채움: '#FFE14D', 테두리색: '#111111', 테두리비율: 0.009, 층: '앞' }
  };

  // 새 도형: 틀 크기의 짧은 쪽을 기준으로 크기·두께를 정한다. 순번만큼 살짝 비켜 놓아 겹쳐 쌓이지 않게 한다
  function 도형만들기(종류, 캔버스, 순번) {
    const t = 도형틀[종류]; if (!t) return null;
    const W = 캔버스.w, H = 캔버스.h, 기준 = Math.min(W, H);
    const 두께 = Math.max(2, Math.round(기준 * t.테두리비율));
    const 비껴 = ((순번 || 0) % 6) * 기준 * 0.035;
    return {
      종류, cx: Math.round(W / 2 + 비껴), cy: Math.round(H * 0.45 + 비껴),
      w: Math.round(기준 * t.비율[0]), h: 종류 === '직선' ? 두께 : Math.round(기준 * t.비율[1]), 회전: 0,
      채움: t.채움, 테두리색: t.테두리색, 테두리: 두께, 투명: 100, 층: t.층
    };
  }

  // 다각형 도형(화살표·별·번쩍)의 꼭짓점 (도형 가운데가 원점인 좌표)
  function 도형꼭짓점(d) {
    const a = d.w / 2, b = d.h / 2;
    if (d.종류 === '화살표') {
      const 머리 = a - Math.min(d.h * 0.6, d.w * 0.6), 몸 = d.h * 0.2;
      return [[-a, -몸], [머리, -몸], [머리, -b], [a, 0], [머리, b], [머리, 몸], [-a, 몸]];
    }
    const 별 = d.종류 === '별', 개수 = 별 ? 10 : 32, out = [];
    for (let i = 0; i < 개수; i++) {
      const 각 = -Math.PI / 2 + i * Math.PI * 2 / 개수;
      const 반지름 = i % 2 === 0 ? 1 : (별 ? 0.42 : (i % 4 === 1 ? 0.7 : 0.78));
      out.push([Math.cos(각) * 반지름 * a, Math.sin(각) * 반지름 * b]);
    }
    return out;
  }

  function 도형경로(ctx, d) {
    const a = d.w / 2, b = d.h / 2;
    ctx.beginPath();
    if (d.종류 === '동그라미') {
      ctx.ellipse(0, 0, Math.max(1, a), Math.max(1, b), 0, 0, Math.PI * 2);
    } else if (d.종류 === '네모') {
      const r = Math.min(d.w, d.h) * 0.1;
      ctx.moveTo(-a + r, -b); ctx.lineTo(a - r, -b); ctx.quadraticCurveTo(a, -b, a, -b + r); ctx.lineTo(a, b - r);
      ctx.quadraticCurveTo(a, b, a - r, b); ctx.lineTo(-a + r, b); ctx.quadraticCurveTo(-a, b, -a, b - r);
      ctx.lineTo(-a, -b + r); ctx.quadraticCurveTo(-a, -b, -a + r, -b); ctx.closePath();
    } else if (d.종류 === '직선') {
      ctx.moveTo(-a, 0); ctx.lineTo(a, 0);
    } else {
      도형꼭짓점(d).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
    }
  }

  /* ---------- 오려낸 사진 (도형의 한 종류: { 종류:'사진', 사진: 조각번호, cx, cy, w, h, 회전, 테두리색(윤곽선), 테두리(윤곽 굵기 px), 투명, 층 })
   * 그림 자체는 이 기기 메모리에만 있다(서버로 보내지 않는다): 조각등록(번호, 캔버스)으로 넣어 두고 번호로 불러 쓴다. */
  const 조각들 = new Map(), 윤곽캐시 = new Map(), 알파캐시 = new WeakMap();
  function 조각등록(번호, 캔버스) { 조각들.set(번호, 캔버스); }
  const 조각찾기 = 번호 => 조각들.get(번호) || null;
  function 조각지우기(번호) { const c = 조각들.get(번호); 조각들.delete(번호); [...윤곽캐시.keys()].forEach(k => { if (k.startsWith(번호 + '|')) 윤곽캐시.delete(k); }); if (c) 알파캐시.delete(c); }
  // 새 오려낸 사진: 틀 높이의 70% 안, 너비의 60% 안으로 맞춰 오른쪽에 놓는다 (글씨는 아래쪽·왼쪽에 놓이는 일이 많다). 윤곽선은 흰색
  function 사진조각만들기(번호, 틀, 순번) {
    const c = 조각찾기(번호); if (!c) return null;
    const W = 틀.w, H = 틀.h, 기준 = Math.min(W, H), k = Math.min(H * 0.7 / c.height, W * 0.6 / c.width), 비껴 = ((순번 || 0) % 6) * 기준 * 0.035;
    return { 종류: '사진', 사진: 번호, cx: Math.round(W * 0.68 + 비껴), cy: Math.round(H * 0.5 + 비껴), w: Math.round(c.width * k), h: Math.round(c.height * k), 회전: 0,
      채움: '', 테두리색: '#FFFFFF', 테두리: Math.max(2, Math.round(기준 * 0.01)), 투명: 100, 층: '뒤' };
  }
  // 윤곽선 + 사진을 합친 그림. 화면에 실제로 찍히는 크기(배율)에 맞춰 2의 거듭제곱 해상도로 만들어, 크기를 끌어 바꾸는 동안에도 거의 다시 만들지 않는다
  function 사진합성(d, c, 배율) {
    const 긴 = Math.max(d.w, d.h), 필요 = 긴 * 범위(배율 || 1, 0.05, 4);
    let 기준 = 128; while (기준 < 필요 && 기준 < 2048) 기준 *= 2;
    const 단위 = 긴 / 기준;                               // 합성 그림의 1픽셀 = 틀 좌표 몇 칸
    const rb = Math.min(Math.round(기준 * 0.5), Math.max(0, Math.round((d.테두리 || 0) / 단위))), 색 = d.테두리색 || '#FFFFFF';
    const 키 = `${d.사진}|${기준}|${rb}|${색}|${Math.round(d.w * 10 / 긴)}|${Math.round(d.h * 10 / 긴)}`;
    let 합 = 윤곽캐시.get(키);
    if (!합) {
      const iw = Math.max(1, Math.round(d.w / 단위)), ih = Math.max(1, Math.round(d.h / 단위));
      합 = document.createElement('canvas'); 합.width = iw + rb * 2; 합.height = ih + rb * 2;
      const x = 합.getContext('2d'); x.imageSmoothingQuality = 'high';
      if (rb > 0) {
        const 모양 = document.createElement('canvas'); 모양.width = 합.width; 모양.height = 합.height;
        const m = 모양.getContext('2d'); m.imageSmoothingQuality = 'high'; m.drawImage(c, rb, rb, iw, ih); m.globalCompositeOperation = 'source-in'; m.fillStyle = 색; m.fillRect(0, 0, 모양.width, 모양.height);
        // 반지름 1/3·2/3·1 세 겹으로 둥글게 찍는다 (가는 머리카락·손가락 둘레에도 틈이 없게). 굵을수록 촘촘히
        const 칸 = Math.min(56, Math.max(16, Math.ceil(rb * 2.2)));
        for (let ring = 1; ring <= 3; ring++) for (let i = 0; i < 칸; i++) { const a = (i + (ring % 2) * 0.5) / 칸 * Math.PI * 2, rr = rb * ring / 3; x.drawImage(모양, Math.cos(a) * rr, Math.sin(a) * rr); }
      }
      x.drawImage(c, rb, rb, iw, ih);
      윤곽캐시.set(키, 합);
      while (윤곽캐시.size > 16) { const 옛 = 윤곽캐시.keys().next().value, 그림 = 윤곽캐시.get(옛); 윤곽캐시.delete(옛); 그림.width = 0; 그림.height = 0; }
    }
    return { 합, 단위, rb, iw: 합.width - rb * 2, ih: 합.height - rb * 2 };
  }
  function 사진그리기(ctx, d) {
    const c = 조각찾기(d.사진); if (!c) return;
    const t = ctx.getTransform ? ctx.getTransform() : null, 배율 = t ? Math.hypot(t.a, t.b) : 1;
    const { 합, rb, iw, ih } = 사진합성(d, c, 배율), ux = d.w / iw, uy = d.h / ih;   // 합성 그림 1픽셀 = 틀 좌표 ux × uy
    ctx.save();
    ctx.translate(d.cx, d.cy);
    if (d.회전) ctx.rotate(d.회전 * Math.PI / 180);
    ctx.globalAlpha = 범위((Number(d.투명) || 100) / 100, 0.1, 1);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(합, -d.w / 2 - rb * ux, -d.h / 2 - rb * uy, 합.width * ux, 합.height * uy);
    ctx.restore();
  }
  // 사진은 그림이 있는 곳만 눌린 것으로 본다 (투명한 곳을 끌면 배경이 움직이게). 가는 팔·손가락도 잡히도록 주변 몇 칸까지 본다
  function 사진맞음(d, p, 여유) {
    const c = 조각찾기(d.사진);
    if (!c) { const q = 점회전(p, { x: d.cx, y: d.cy }, -(d.회전 || 0)); return Math.abs(q.x - d.cx) <= d.w / 2 + (여유 || 0) && Math.abs(q.y - d.cy) <= d.h / 2 + (여유 || 0); }   // 그림이 사라진 도형도 눌러서 지울 수 있게
    let 표 = 알파캐시.get(c);
    if (!표) {
      const k = Math.min(1, 96 / Math.max(c.width, c.height)), aw = Math.max(1, Math.round(c.width * k)), ah = Math.max(1, Math.round(c.height * k));
      const t = document.createElement('canvas'); t.width = aw; t.height = ah; const x = t.getContext('2d', { willReadFrequently: true }); x.drawImage(c, 0, 0, aw, ah);
      표 = { aw, ah, a: x.getImageData(0, 0, aw, ah).data }; 알파캐시.set(c, 표);
    }
    const q = 점회전(p, { x: d.cx, y: d.cy }, -(d.회전 || 0)), u = (q.x - d.cx) / d.w + 0.5, v = (q.y - d.cy) / d.h + 0.5;
    const 반 = Math.ceil(((여유 || 0) + (d.테두리 || 0)) / Math.max(1, d.w) * 표.aw) + 1;
    if (u < -0.2 || u > 1.2 || v < -0.2 || v > 1.2) return false;
    const cx = Math.round(u * 표.aw), cy = Math.round(v * 표.ah);
    for (let dy = -반; dy <= 반; dy++) for (let dx = -반; dx <= 반; dx++) {
      const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= 표.aw || Y >= 표.ah) continue;
      if (표.a[(Y * 표.aw + X) * 4 + 3] > 40) return true;
    }
    return false;
  }

  function 도형그리기(ctx, d) {
    if (!d || !(d.w > 0)) return;
    if (d.종류 === '사진') return 사진그리기(ctx, d);
    ctx.save();
    ctx.translate(d.cx, d.cy);
    if (d.회전) ctx.rotate(d.회전 * Math.PI / 180);
    ctx.globalAlpha = 범위((Number(d.투명) || 100) / 100, 0.1, 1);
    도형경로(ctx, d);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.miterLimit = 2;
    if (d.채움 && d.종류 !== '직선') { ctx.fillStyle = d.채움; ctx.fill(); }
    const 두께 = d.종류 === '직선' ? Math.max(2, d.테두리 || 2) : (d.테두리 || 0);
    if (두께 > 0) { ctx.lineWidth = 두께; ctx.strokeStyle = d.테두리색 || '#111'; ctx.stroke(); }
    ctx.restore();
  }

  // 점 p를 c를 축으로 deg도 돌린다
  function 점회전(p, c, deg) {
    const r = deg * Math.PI / 180, co = Math.cos(r), si = Math.sin(r), x = p.x - c.x, y = p.y - c.y;
    return { x: c.x + x * co - y * si, y: c.y + x * si + y * co };
  }

  // 점 p(틀 좌표)가 도형을 눌렀는지. 속이 빈 동그라미·네모·직선은 선 근처만 눌린 것으로 본다(안쪽을 끌면 배경이 움직이게)
  function 도형맞음(d, p, 여유) {
    if (d.종류 === '사진') return 사진맞음(d, p, 여유);
    const q = 점회전(p, { x: d.cx, y: d.cy }, -(d.회전 || 0)), x = q.x - d.cx, y = q.y - d.cy, e = 여유 || 0;
    const a = d.w / 2, b = d.h / 2, 띠 = Math.max((d.테두리 || 0) / 2, 8) + e;
    if (d.종류 === '직선') return Math.abs(x) <= a + e && Math.abs(y) <= Math.max((d.테두리 || 2) / 2, 8) + e;
    if (d.종류 === '동그라미') {
      const f = (x / Math.max(1, a)) ** 2 + (y / Math.max(1, b)) ** 2 - 1;
      if (d.채움 && f <= 0) return true;
      // 타원까지의 대략적인 거리 = |f| / |기울기| (길쭉한 타원도 끝 쪽에서 과하게 넓어지지 않는다)
      const 기울기 = Math.hypot(2 * x / Math.max(1, a * a), 2 * y / Math.max(1, b * b)) || 1;
      return Math.abs(f) / 기울기 <= 띠;
    }
    if (d.종류 === '네모' && !d.채움) {
      const 안 = Math.abs(x) <= a + e && Math.abs(y) <= b + e;
      return 안 && (Math.abs(x) >= a - 띠 || Math.abs(y) >= b - 띠);
    }
    if (d.종류 === '화살표' || d.종류 === '별' || d.종류 === '번쩍') {   // 모양 안쪽(또는 가장자리 e 이내)만 눌린 것으로 본다
      const 점 = 도형꼭짓점(d);
      let 안 = false, 가까움 = Infinity;
      for (let i = 0, j = 점.length - 1; i < 점.length; j = i++) {
        const [xi, yi] = 점[i], [xj, yj] = 점[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) 안 = !안;
        const dx = xj - xi, dy = yj - yi, t = Math.max(0, Math.min(1, ((x - xi) * dx + (y - yi) * dy) / (dx * dx + dy * dy || 1)));
        가까움 = Math.min(가까움, Math.hypot(x - (xi + t * dx), y - (yi + t * dy)));
      }
      return 안 || 가까움 <= e + (d.테두리 || 0) / 2;
    }
    return Math.abs(x) <= a + e && Math.abs(y) <= b + e;
  }

  /* ---------- 색감(보정): 배경 사진에만 적용. 값이 없거나 모두 0이면 예전과 똑같이 그린다 ----------
   * 슬라이더 값은 모두 -100~100(가운데 0). 프리셋은 같은 키 + 내부용(페이드·분할색·자동)을 쓰고,
   * 프리셋 값 × 강도(0~1) + 사용자 슬라이더 값 = 실제 값 (라이트룸 방식).
   * 데이터: 장.배경.보정 = { 프리셋, 강도, 밝기, 대비, 밝은곳, 어두운곳, 색온도, 색조, 채도, 선명, 비네팅, 입자, 번짐, 곡선:[어두운 쪽,가운데,밝은 쪽] }
   * 입자: +는 필름 입자, −는 매끈하게. 번짐: +는 빛 번짐(은은하게 퍼지는 빛), −는 흐리게. 곡선: 세 점의 위아래 이동(−100~100) */
  const 보정키 = ['밝기', '대비', '밝은곳', '어두운곳', '색온도', '색조', '채도', '선명', '비네팅', '입자', '번짐'];
  const 보정프리셋 = {
    자동: { 이름: '자동', 자동: true },
    선명: { 이름: '선명하게', 대비: 15, 채도: 15, 선명: 45 },
    시네마: { 이름: '시네마틱', 대비: 20, 채도: -10, 밝은곳: -10, 어두운곳: 10, 비네팅: 25, 분할: { 어두운: [-14, 4, 18], 밝은: [18, 4, -14] } },
    따뜻: { 이름: '따뜻하게', 색온도: 35, 채도: 8 },
    차갑: { 이름: '차갑게', 색온도: -35, 채도: -5 },
    빈티지: { 이름: '빈티지', 대비: -15, 채도: -35, 색온도: 25, 비네팅: 20, 페이드: 35 },
    야담: { 이름: '야담', 밝기: -15, 대비: 20, 채도: -45, 색온도: 40, 비네팅: 45 },
    흑백: { 이름: '흑백', 채도: -100, 대비: 20 },
    강렬: { 이름: '강렬하게', 대비: 35, 채도: 35, 선명: 30, 비네팅: 15 }
  };

  // 보정 데이터 → 실제로 쓸 값. 바꿀 것이 없으면 null
  function 보정값(보정) {
    if (!보정 || typeof 보정 !== 'object') return null;
    const p = 보정프리셋[보정.프리셋] || null;
    const k = p ? 범위(Number(보정.강도 ?? 1), 0, 1) : 0;
    const v = {};
    보정키.forEach(x => { v[x] = 범위((p ? Number(p[x]) || 0 : 0) * k + (Number(보정[x]) || 0), -100, 100); });
    v.페이드 = p && p.페이드 ? p.페이드 * k : 0;
    v.분할 = p && p.분할 ? p.분할 : null;
    v.분할강도 = v.분할 ? k : 0;
    v.자동 = p && p.자동 ? k : 0;
    // 곡선: 세 점. 어두운 쪽→밝은 쪽으로 계속 올라가야 하므로 앞 점보다 낮아지지 않게 맞춘다
    const 점 = Array.isArray(보정.곡선) ? [0, 1, 2].map(i => 범위(Number(보정.곡선[i]) || 0, -100, 100)) : [0, 0, 0];
    v.곡선 = 점.some(x => x) ? 점 : null;
    return (보정키.some(x => v[x]) || v.페이드 || v.분할강도 || v.자동 || v.곡선) ? v : null;
  }

  const 보정캐시 = new WeakMap();   // 원본 이미지 → Map(값·크기 → 보정한 캔버스)
  const 분포캐시 = new WeakMap();   // 원본 이미지 → 자동 보정용 [어두운 끝, 밝은 끝]
  // 원본 이미지를 긴 변 최대변(기본 1920) 안에서 한 번 보정해 캔버스로. 실패하면 원본을 그대로 돌려준다(보정 없이 그림)
  function 보정이미지(img, 보정, 최대변) {
    const v = 보정값(보정);
    if (!img || !v || !(v.자동 || v.페이드 || v.분할강도 || v.곡선 || 보정키.some(x => x !== '비네팅' && v[x]))) return img;
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) return img;
    const s = Math.min(1, (최대변 || 1920) / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const 키 = JSON.stringify(v) + '|' + w;
    let 묶음 = 보정캐시.get(img);
    if (!묶음) { 묶음 = new Map(); 보정캐시.set(img, 묶음); }
    if (묶음.has(키)) return 묶음.get(키);
    try {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h);
      if (v.자동 && !분포캐시.has(img)) 분포캐시.set(img, 분포(d.data));
      픽셀보정(d.data, w, h, v, v.자동 ? 분포캐시.get(img) : null);
      x.putImageData(d, 0, 0);
      묶음.set(키, c);
      // 메모리: 큰 결과(긴 변 1000 이상)는 이미지마다 2개, 전체는 12개까지. 지울 때 캔버스 메모리도 푼다
      const 지우기 = k => { const 옛 = 묶음.get(k); 묶음.delete(k); if (옛 && 옛 !== c) { 옛.width = 0; 옛.height = 0; } };
      const 큰것 = [...묶음.keys()].filter(k => 묶음.get(k).width >= 1000 || 묶음.get(k).height >= 1000);
      while (큰것.length > 2) 지우기(큰것.shift());
      while (묶음.size > 12) 지우기(묶음.keys().next().value);
      return c;
    } catch (e) { return img; }
  }

  // 자동 보정: 밝기 분포의 아래·위 0.5%를 끝으로 잡아 사이를 펴 준다
  function 분포(p) {
    const 칸 = new Uint32Array(256); let n = 0;
    for (let i = 0; i < p.length; i += 4) { 칸[Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2])]++; n++; }
    const 찾기 = 목표 => { let 합 = 0; for (let i = 0; i < 256; i++) { 합 += 칸[i]; if (합 >= 목표) return i; } return 255; };
    const 아래 = 찾기(n * 0.005), 위 = 찾기(n * 0.995);
    return 위 - 아래 < 20 ? [0, 255] : [아래, 위];
  }

  // 곡선: 점 4~5개를 부드럽게 잇고(꺾이거나 튀지 않게 단조 보간) 0~255 → 0~255 표로 만든다
  function 곡선표(점) {
    const xs = [0, 0.25, 0.5, 0.75, 1], ys = [0, ...점.map((d, i) => 범위(xs[i + 1] + d / 100 * 0.25, 0, 1)), 1];
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1]);
    const n = xs.length, 기울기 = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) 기울기[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);
    m[0] = 기울기[0]; m[n - 1] = 기울기[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = 기울기[i - 1] * 기울기[i] <= 0 ? 0 : (기울기[i - 1] + 기울기[i]) / 2;
    for (let i = 0; i < n - 1; i++) {   // Fritsch–Carlson: 한 구간에서 기울기가 너무 크면 줄인다
      if (기울기[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / 기울기[i], b = m[i + 1] / 기울기[i], r = a * a + b * b;
      if (r > 9) { const t = 3 / Math.sqrt(r); m[i] = t * a * 기울기[i]; m[i + 1] = t * b * 기울기[i]; }
    }
    const 표 = new Float32Array(256);
    for (let k = 0; k < 256; k++) {
      const x = k / 255; let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
      const hh = xs[i + 1] - xs[i], t = (x - xs[i]) / hh, t2 = t * t, t3 = t2 * t;
      표[k] = 255 * 범위((2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hh * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hh * m[i + 1], 0, 1);
    }
    return 표;
  }

  // 가로·세로 상자 흐림 (실행 시간이 반지름과 상관없는 누적합 방식). 세 번 겹치면 가우시안과 거의 같다
  function 상자흐림(p, w, h, r, 번) {
    const 길 = Math.max(w, h), 줄 = new Float32Array(길 + 2 * r + 2);
    for (let n = 0; n < (번 || 3); n++) for (let 세로 = 0; 세로 < 2; 세로++) {
      const 안 = 세로 ? w : h, 바깥 = 세로 ? h : w, 걸음 = 세로 ? w * 4 : 4, 줄걸음 = 세로 ? 4 : w * 4;
      for (let ch = 0; ch < 3; ch++) for (let a = 0; a < 안; a++) {
        const 시작 = a * 줄걸음 + ch;
        let 합 = 0;
        for (let i = -r; i <= r; i++) 합 += p[시작 + Math.min(바깥 - 1, Math.max(0, i)) * 걸음];
        for (let i = 0; i < 바깥; i++) {
          줄[i] = 합 / (2 * r + 1);
          합 += p[시작 + Math.min(바깥 - 1, i + r + 1) * 걸음] - p[시작 + Math.max(0, i - r) * 걸음];
        }
        for (let i = 0; i < 바깥; i++) p[시작 + i * 걸음] = 줄[i];
      }
    }
  }
  // 같은 자리에서는 늘 같은 값이 나오는 잡음(-1~1): 미리보기와 받은 파일의 입자가 같은 모양이 되게
  function 잡음(x, y) {
    let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); n = n ^ (n >>> 16);
    return ((n >>> 0) / 4294967295) * 2 - 1;
  }

  function 픽셀보정(p, w, h, v, 끝) {
    // 1) 채널별 표: 자동(분포 펴기) → 색온도·색조 → 밝기(중간 톤 감마) → 대비 → 페이드(검정 띄우기)
    const 온 = v.색온도 / 100, 조 = v.색조 / 100;
    const 이동 = [온 * 28 + 조 * 10, -조 * 20, -온 * 28 + 조 * 10];   // R, G, B (색온도 +는 노랑, 색조 +는 분홍·-는 초록)
    const 감마 = Math.pow(2, -v.밝기 / 100);
    const 대 = v.대비 >= 0 ? 1 + v.대비 / 100 : 1 + v.대비 / 140;
    const 페 = v.페이드 / 100 * 45;
    const 곡 = v.곡선 ? 곡선표(v.곡선) : null;
    const 표 = [0, 1, 2].map(ch => {
      const t = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        if (끝) c += ((c - 끝[0]) / Math.max(1, 끝[1] - 끝[0]) * 255 - c) * v.자동;
        c += 이동[ch];
        c = 255 * Math.pow(Math.min(1, Math.max(0, c / 255)), 감마);
        c = (c - 128) * 대 + 128;
        if (곡) c = 곡[Math.round(Math.min(255, Math.max(0, c)))];
        t[i] = 페 + c * (1 - 페 / 255);
      }
      return t;
    });
    // 2) 밝기에 따라: 밝은 곳·어두운 곳, 분할색(시네마틱: 어두운 곳 청록·밝은 곳 주황), 채도
    const 밝은 = v.밝은곳 / 100 * 60, 어두운 = v.어두운곳 / 100 * 60, 채 = 1 + v.채도 / 100;
    const 분 = v.분할강도 ? v.분할 : null, 분k = v.분할강도;
    const 더함 = 밝은 || 어두운 || 분 || v.채도;
    for (let i = 0; i < p.length; i += 4) {
      let r = 표[0][p[i]], g = 표[1][p[i + 1]], b = 표[2][p[i + 2]];
      if (더함) {
        const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const wh = L > 0.4 ? Math.pow((L - 0.4) / 0.6, 1.5) : 0, ws = L < 0.6 ? Math.pow((0.6 - L) / 0.6, 1.5) : 0;
        const 빛 = 밝은 * wh + 어두운 * ws;
        r += 빛; g += 빛; b += 빛;
        if (분) { r += (분.어두운[0] * ws + 분.밝은[0] * wh) * 분k; g += (분.어두운[1] * ws + 분.밝은[1] * wh) * 분k; b += (분.어두운[2] * ws + 분.밝은[2] * wh) * 분k; }
        if (채 !== 1) { const 회 = 0.299 * r + 0.587 * g + 0.114 * b; r = 회 + (r - 회) * 채; g = 회 + (g - 회) * 채; b = 회 + (b - 회) * 채; }
      }
      p[i] = r; p[i + 1] = g; p[i + 2] = b;
    }
    // 3) 선명하게(+) / 부드럽게(-): 3×3 평균과의 차이를 더하거나 평균 쪽으로 섞는다
    if (v.선명) {
      const a = v.선명 / 100, 원 = new Uint8ClampedArray(p), 가로 = new Uint16Array(p.length);
      for (let y = 0; y < h; y++) {   // 가로 3칸 합 (가장자리는 자기 자신을 한 번 더)
        const 줄 = y * w * 4;
        for (let x = 0; x < w; x++) {
          const i = 줄 + x * 4, l = 줄 + Math.max(0, x - 1) * 4, r = 줄 + Math.min(w - 1, x + 1) * 4;
          가로[i] = 원[l] + 원[i] + 원[r]; 가로[i + 1] = 원[l + 1] + 원[i + 1] + 원[r + 1]; 가로[i + 2] = 원[l + 2] + 원[i + 2] + 원[r + 2];
        }
      }
      const 줄폭 = w * 4;
      for (let y = 0; y < h; y++) {   // 세로 3칸 합 → 평균, 차이를 더하거나(선명) 평균 쪽으로 섞기(부드럽게)
        const 위 = Math.max(0, y - 1) * 줄폭, 가운데 = y * 줄폭, 아래 = Math.min(h - 1, y + 1) * 줄폭;
        for (let x = 0; x < 줄폭; x += 4) for (let ch = 0; ch < 3; ch++) {
          const i = 가운데 + x + ch, 평균 = (가로[위 + x + ch] + 가로[i] + 가로[아래 + x + ch]) / 9, c = 원[i];
          p[i] = a > 0 ? c + (c - 평균) * a * 1.2 : c + (평균 - c) * -a;
        }
      }
    }
    // 4) 번짐: −는 사진 전체를 흐리게, +는 밝은 곳이 은은하게 퍼지는 빛 번짐(밝은 부분만 흐려서 위에 겹쳐 밝힌다)
    if (v.번짐) {
      const a = Math.abs(v.번짐) / 100, 큰변 = Math.max(w, h);
      if (v.번짐 < 0) {
        // 반지름이 1칸보다 작은 구간은 원본과 섞어서, 0 근처에서도 조금씩 부드럽게 변한다
        const 반지름 = 큰변 * 0.012 * a, 섞음 = Math.min(1, 반지름), 흐림 = new Uint8ClampedArray(p);
        상자흐림(흐림, w, h, Math.max(1, Math.round(반지름)));
        for (let i = 0; i < p.length; i += 4) for (let ch = 0; ch < 3; ch++) p[i + ch] += (흐림[i + ch] - p[i + ch]) * 섞음;
      } else {
        const 빛 = new Uint8ClampedArray(p.length);
        for (let i = 0; i < p.length; i += 4) {
          const L = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255, 무게 = L > 0.5 ? Math.min(1, (L - 0.5) / 0.4) : 0;
          빛[i] = p[i] * 무게; 빛[i + 1] = p[i + 1] * 무게; 빛[i + 2] = p[i + 2] * 무게;
        }
        상자흐림(빛, w, h, Math.max(2, Math.round(큰변 * 0.02)));
        const 세 = a * 1.1;
        for (let i = 0; i < p.length; i += 4) for (let ch = 0; ch < 3; ch++) p[i + ch] = 255 - (255 - p[i + ch]) * (255 - 빛[i + ch] * 세) / 255;   // 스크린 합성
      }
    }
    // 5) 입자: +는 필름 입자(밝기만 흔들어 색이 번지지 않게, 어두운·밝은 끝은 덜), −는 살짝 흐린 사진을 섞어 매끈하게
    if (v.입자 > 0) {
      const 세 = v.입자 / 100 * 38, 칸 = Math.max(1, Math.round(Math.max(w, h) / 1000));
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, L = (0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]) / 255;
        const d = 잡음(Math.floor(x / 칸), Math.floor(y / 칸)) * 세 * (0.35 + 0.65 * (1 - Math.abs(L - 0.5) * 2));
        p[i] += d; p[i + 1] += d; p[i + 2] += d;
      }
    } else if (v.입자 < 0) {
      const a = -v.입자 / 100, 흐림 = new Uint8ClampedArray(p); 상자흐림(흐림, w, h, Math.max(1, Math.round(Math.max(w, h) * 0.002)), 2);
      for (let i = 0; i < p.length; i += 4) for (let ch = 0; ch < 3; ch++) p[i + ch] += (흐림[i + ch] - p[i + ch]) * a * 0.8;
    }
  }

  // 가장자리 어둡게(+) / 밝게(-): 썸네일 틀 기준이라 확대·자르기와 상관없이 같은 모양
  function 비네팅그리기(ctx, W, H, 보정) {
    const v = 보정값(보정);
    if (!v || !v.비네팅) return;
    const 세기 = Math.abs(v.비네팅) / 100 * 0.75;
    const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) / 2);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(1, v.비네팅 > 0 ? `rgba(0,0,0,${세기.toFixed(3)})` : `rgba(255,255,255,${(세기 * 0.8).toFixed(3)})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // 축소했을 때 빈 곳 채우기. 흐리게 = 사진을 아주 작게 줄였다가 크게 늘려 흐린 바탕을 만든다(모든 브라우저 같은 결과)
  const 흐림캐시 = new WeakMap();
  function 빈곳채우기(ctx, W, H, src, 방식) {
    if (방식 === '검정' || 방식 === '흰색') { ctx.fillStyle = 방식 === '검정' ? '#000' : '#fff'; ctx.fillRect(0, 0, W, H); return; }
    const iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height;
    if (!iw || !ih) return;
    let 묶음 = 흐림캐시.get(src); if (!묶음) { 묶음 = new Map(); 흐림캐시.set(src, 묶음); }
    const 키 = W + 'x' + H;
    let 작은 = 묶음.get(키);
    if (!작은) {
      작은 = document.createElement('canvas'); 작은.width = Math.max(2, Math.round(W / 40)); 작은.height = Math.max(2, Math.round(H / 40));
      // 2단계로 줄인다(한 번에 1/40로 줄이면 색이 얼룩진다): 먼저 1/8 크기, 다음 1/40 크기
      const 중간 = document.createElement('canvas'); 중간.width = Math.max(2, Math.round(W / 8)); 중간.height = Math.max(2, Math.round(H / 8));
      const s = Math.max(중간.width / iw, 중간.height / ih), m = 중간.getContext('2d');
      m.imageSmoothingQuality = 'high';
      m.drawImage(src, (중간.width - iw * s) / 2, (중간.height - ih * s) / 2, iw * s, ih * s);
      const x = 작은.getContext('2d'); x.imageSmoothingQuality = 'high';
      x.drawImage(중간, 0, 0, 작은.width, 작은.height);
      묶음.set(키, 작은);
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(작은, 0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 배경을 캔버스에 놓는 위치: 가득 채우기(cover) + 확대 + 초점 이동
  function 배경배치(설계, 장, img) {
    const W = 설계.캔버스.w, H = 설계.캔버스.h, bg = 장.배경 || {};
    if (!img || !img.naturalWidth) return { dx: 0, dy: 0, dw: W, dh: H };
    const 확대 = 범위(Number(bg.확대) || 1, 0.25, 4);   // 0.25~1은 축소(빈 곳은 그리기에서 채움)
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 확대;
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const fx = 범위(Number(bg.초점x ?? 0.5), 0, 1), fy = 범위(Number(bg.초점y ?? 0.5), 0, 1);
    return { dx: (W - dw) * fx, dy: (H - dh) * fy, dw, dh };
  }

  // 얼굴·피사체 영역(원본 이미지 기준 0~1)을 지금 캔버스 위치로 바꾼다 (확대·이동을 반영)
  function 영역변환(설계, 장, img, f) {
    const p = 배경배치(설계, 장, img);
    return { x: p.dx + f.x * p.dw, y: p.dy + f.y * p.dh, w: f.w * p.dw, h: f.h * p.dh };
  }

  // 글씨 한 줄의 실제 너비 (넘침 확인용)
  function 줄너비(ctx, t) {
    const f = 글꼴목록[t.font] || 글꼴목록['Black Han Sans'];
    ctx.save();
    ctx.font = `${f.weight} ${t.size}px ${f.css}, 'Noto Sans KR', sans-serif`;
    const w = ctx.measureText(t.text).width + (t.outlineWidth || 0) * 2;
    ctx.restore();
    return w;
  }

  // 글씨 상자 목록: 첫 상자는 장 자체(장.문구·장.블록, 자동 생성과 같은 자리), 나머지는 장.추가상자
  function 상자목록(장) { return [장, ...((장 && Array.isArray(장.추가상자)) ? 장.추가상자 : [])]; }

  // 상자 하나(문구 + 블록) → 글씨 배열
  function 상자글씨(설계, 상자, 상자번호) {
    const W = 설계.캔버스.w;
    const b = 상자.블록;
    if (!b) return [];
    const 줄 = (상자.문구 && 상자.문구.줄) || [];
    const 줄높이 = Math.round(b.size * (b.줄간격 || 1.15));
    const 폭 = Math.round(W * 0.96);
    return 줄.map((text, i) => ({
      text, x: Math.round(b.cx - 폭 / 2), y: Math.round(b.y + i * 줄높이), w: 폭, h: 줄높이,
      size: Math.round(b.size), color: (i + 1) === b.강조줄 ? b.강조색 : b.글자색,
      outline: b.테두리색, outlineWidth: Math.round(b.테두리), shadow: !!b.그림자,
      font: b.글꼴 || 'Black Han Sans', weight: (글꼴목록[b.글꼴] || 글꼴목록['Black Han Sans']).weight, align: 'center', 상자: 상자번호 || 0,
      회전: 범위(Number(b.회전) || 0, -180, 180), 중심x: b.cx, 중심y: b.y + 줄.length * 줄높이 / 2
    }));
  }

  // 장의 모든 상자 → 글씨 배열 (그릴 때 쓰는 배열. 편집 창은 상자만 바꾸고 이 배열을 다시 만든다)
  function 블록에서글씨(설계, 장) {
    return 상자목록(장).flatMap((상자, i) => 상자글씨(설계, 상자, i));
  }

  // 예전 설계(블록 없음)도 편집할 수 있게 글씨 배열에서 블록을 만든다
  function 블록채우기(설계) {
    (설계.장면 || []).forEach(장 => {
      if (장.블록 || !(장.글씨 && 장.글씨.length)) return;
      장.글씨 = 장.글씨.filter(g => !g.상자);
      const t = 장.글씨[0];
      const 강조 = 장.글씨.findIndex(g => g.color && g.color.toUpperCase() !== '#FFFFFF') + 1;
      장.블록 = { cx: t.x + t.w / 2, y: t.y, size: t.size, 줄간격: t.h / t.size, 강조줄: 강조,
        글자색: '#FFFFFF', 강조색: 강조 ? 장.글씨[강조 - 1].color : '#FFE14D', 테두리색: t.outline || '#111111',
        테두리: t.outlineWidth || 8, 그림자: false, 글꼴: t.font || 'Black Han Sans' };
      if (!장.문구) 장.문구 = {};
      장.문구.줄 = 장.글씨.map(g => g.text);
    });
    return 설계;
  }

  // 캔버스를 파일로 (PNG 또는 JPG)
  function 파일로(canvas, 형식, 품질) {
    return new Promise((ok, no) => {
      try { canvas.toBlob(b => b ? ok(b) : no(new Error('파일을 만들지 못했어요')), 형식 || 'image/png', 품질); }
      catch (e) { no(e); }
    });
  }

  function 범위(v, a, b) { return Math.min(b, Math.max(a, isFinite(v) ? v : a)); }

  global.RewindThumb = { 도형틀, 도형만들기, 도형그리기, 도형맞음, 조각등록, 조각찾기, 조각지우기, 사진조각만들기, 점회전, 글꼴목록, 글꼴준비, 이미지불러오기, 배경주소, 배경배치, 영역변환, 그리기, 줄너비, 상자목록, 상자글씨, 블록에서글씨, 블록채우기, 파일로,
    보정키, 보정프리셋, 보정값, 보정이미지, 곡선표 };
})(window);
