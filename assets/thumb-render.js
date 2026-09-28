/* 리와인드 썸네일 그리기 (편집 창·프로젝트 화면 공용)
 * 썸네일설계(JSON)의 한 장을 캔버스에 그린다. 자동 생성(JSON2Video)과 같은 규칙:
 *  배경(가득 채우기 + 확대·초점) → 어둡게 → 아래쪽 그늘 → 글씨(테두리 + 채우기)
 * 이미지 파일은 어디에도 저장하지 않고, 필요할 때 브라우저에서 다시 그린다.
 */
(function (global) {
  'use strict';

  const 글꼴목록 = {
    'Black Han Sans': { css: "'Black Han Sans'", weight: '400', 이름: '블랙한산스' },
    'Noto Sans KR': { css: "'Noto Sans KR'", weight: '900', 이름: '노토 산스 굵게' },
    'Do Hyeon': { css: "'Do Hyeon'", weight: '400', 이름: '도현' },
    'Jua': { css: "'Jua'", weight: '400', 이름: '주아' }
  };
  const 글꼴주소 = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Noto+Sans+KR:wght@900&display=swap';

  function 글꼴준비() {
    if (!document.querySelector('link[data-rw-thumb-fonts]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = 글꼴주소; l.setAttribute('data-rw-thumb-fonts', '1');
      document.head.appendChild(l);
    }
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const 샘플 = '가나다 ABC 123';
    return Promise.all(Object.values(글꼴목록).map(f => document.fonts.load(`${f.weight} 64px ${f.css}`, 샘플).catch(() => null)))
      .then(() => undefined);
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
      ctx.drawImage(img, p.dx, p.dy, p.dw, p.dh);
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

  // 블록(문구 묶음) → 글씨 배열. 편집 창은 블록만 바꾸고, 그릴 때는 글씨 배열을 쓴다.
  function 블록에서글씨(설계, 장) {
    const W = 설계.캔버스.w;
    const b = 장.블록;
    const 줄 = (장.문구 && 장.문구.줄) || [];
    const 줄높이 = Math.round(b.size * (b.줄간격 || 1.15));
    const 폭 = Math.round(W * 0.96);
    return 줄.map((text, i) => ({
      text, x: Math.round(b.cx - 폭 / 2), y: Math.round(b.y + i * 줄높이), w: 폭, h: 줄높이,
      size: Math.round(b.size), color: (i + 1) === b.강조줄 ? b.강조색 : b.글자색,
      outline: b.테두리색, outlineWidth: Math.round(b.테두리), shadow: !!b.그림자,
      font: b.글꼴 || 'Black Han Sans', weight: (글꼴목록[b.글꼴] || 글꼴목록['Black Han Sans']).weight, align: 'center'
    }));
  }

  // 예전 설계(블록 없음)도 편집할 수 있게 글씨 배열에서 블록을 만든다
  function 블록채우기(설계) {
    (설계.장면 || []).forEach(장 => {
      if (장.블록 || !(장.글씨 && 장.글씨.length)) return;
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

  global.RewindThumb = { 글꼴목록, 글꼴준비, 이미지불러오기, 배경주소, 배경배치, 영역변환, 그리기, 줄너비, 블록에서글씨, 블록채우기, 파일로 };
})(window);
