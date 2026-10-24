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
      // 색감: 원본 사진을 한 번 보정한 결과(캐시)를 그린다. 옵션.원본이면 보정 없이(전/후 비교), 옵션.보정크기는 처리할 긴 변(끄는 중엔 작게)
      ctx.drawImage(옵션.원본 ? img : 보정이미지(img, bg.보정, 옵션.보정크기), p.dx, p.dy, p.dw, p.dh);
      if (!옵션.원본) 비네팅그리기(ctx, W, H, bg.보정);
    }
    const 어둡게 = 범위(Number(bg.어둡게) || 0, 0, 0.8);
    if (어둡게 > 0) { ctx.fillStyle = `rgba(0,0,0,${어둡게})`; ctx.fillRect(0, 0, W, H); }

    // 아래쪽 그늘 (자동 생성의 5겹 사각형과 같은 모양)
    const g = 장.그늘 || { 시작: 0.5, 끝불투명도: 0.55 };
    if (g.끝불투명도 > 0) {
      // 위에서 투명 → 아래로 갈수록 끝불투명도까지 부드럽게 어두워진다
      const 시작 = Math.max(0, g.시작) * H;
      const gr = ctx.createLinearGradient(0, 시작, 0, H);
      gr.addColorStop(0, 'rgba(0,0,0,0)');
      gr.addColorStop(0.5, `rgba(0,0,0,${(g.끝불투명도 * 0.6).toFixed(3)})`);
      gr.addColorStop(1, `rgba(0,0,0,${g.끝불투명도})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 시작, W, H - 시작);
    }

    // 글씨
    (장.글씨 || []).forEach(t => {
      const f = 글꼴목록[t.font] || 글꼴목록['Black Han Sans'];
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
    });
    ctx.restore();
  }

  /* ---------- 색감(보정): 배경 사진에만 적용. 값이 없거나 모두 0이면 예전과 똑같이 그린다 ----------
   * 슬라이더 값은 모두 -100~100(가운데 0). 프리셋은 같은 키 + 내부용(페이드·분할색·자동)을 쓰고,
   * 프리셋 값 × 강도(0~1) + 사용자 슬라이더 값 = 실제 값 (라이트룸 방식).
   * 데이터: 장.배경.보정 = { 프리셋, 강도, 밝기, 대비, 밝은곳, 어두운곳, 색온도, 색조, 채도, 선명, 비네팅 } */
  const 보정키 = ['밝기', '대비', '밝은곳', '어두운곳', '색온도', '색조', '채도', '선명', '비네팅'];
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
    return (보정키.some(x => v[x]) || v.페이드 || v.분할강도 || v.자동) ? v : null;
  }

  const 보정캐시 = new WeakMap();   // 원본 이미지 → Map(값·크기 → 보정한 캔버스)
  const 분포캐시 = new WeakMap();   // 원본 이미지 → 자동 보정용 [어두운 끝, 밝은 끝]
  // 원본 이미지를 긴 변 최대변(기본 1920) 안에서 한 번 보정해 캔버스로. 실패하면 원본을 그대로 돌려준다(보정 없이 그림)
  function 보정이미지(img, 보정, 최대변) {
    const v = 보정값(보정);
    if (!img || !v || !(v.자동 || v.페이드 || v.분할강도 || 보정키.some(x => x !== '비네팅' && v[x]))) return img;
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

  function 픽셀보정(p, w, h, v, 끝) {
    // 1) 채널별 표: 자동(분포 펴기) → 색온도·색조 → 밝기(중간 톤 감마) → 대비 → 페이드(검정 띄우기)
    const 온 = v.색온도 / 100, 조 = v.색조 / 100;
    const 이동 = [온 * 28 + 조 * 10, -조 * 20, -온 * 28 + 조 * 10];   // R, G, B (색온도 +는 노랑, 색조 +는 분홍·-는 초록)
    const 감마 = Math.pow(2, -v.밝기 / 100);
    const 대 = v.대비 >= 0 ? 1 + v.대비 / 100 : 1 + v.대비 / 140;
    const 페 = v.페이드 / 100 * 45;
    const 표 = [0, 1, 2].map(ch => {
      const t = new Uint8ClampedArray(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        if (끝) c += ((c - 끝[0]) / Math.max(1, 끝[1] - 끝[0]) * 255 - c) * v.자동;
        c += 이동[ch];
        c = 255 * Math.pow(Math.min(1, Math.max(0, c / 255)), 감마);
        c = (c - 128) * 대 + 128;
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

  // 배경을 캔버스에 놓는 위치: 가득 채우기(cover) + 확대 + 초점 이동
  function 배경배치(설계, 장, img) {
    const W = 설계.캔버스.w, H = 설계.캔버스.h, bg = 장.배경 || {};
    if (!img || !img.naturalWidth) return { dx: 0, dy: 0, dw: W, dh: H };
    const 확대 = Math.max(1, Number(bg.확대) || 1);
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
      font: b.글꼴 || 'Black Han Sans', weight: (글꼴목록[b.글꼴] || 글꼴목록['Black Han Sans']).weight, align: 'center', 상자: 상자번호 || 0
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

  global.RewindThumb = { 글꼴목록, 글꼴준비, 이미지불러오기, 배경주소, 배경배치, 영역변환, 그리기, 줄너비, 상자목록, 상자글씨, 블록에서글씨, 블록채우기, 파일로,
    보정키, 보정프리셋, 보정값, 보정이미지 };
})(window);
