/* 직접 그려서 오려내기 — 사진 위에 손(또는 마우스)으로 그린 부분만 남긴다. 이 기기 안에서만 처리하고 서버로 보내지 않는다.
 *
 * RewindLasso.열기(사진)   → 그리기 창을 띄운다. 끝나면 { 마스크(캔버스), AI(참/거짓) } 또는 취소하면 null
 * RewindLasso.자르기(사진, 마스크) → 마스크에서 하얀 부분만 남긴 투명 배경 캔버스(가장자리 2% 여백). 남은 게 없으면 null
 *
 * 그리는 방법 두 가지: 둘러싸기(올가미 — 손을 떼면 저절로 닫혀 안쪽이 선택) / 칠하기(붓 — 칠한 곳이 선택). 여러 번 그리면 합쳐진다.
 * 편집기(editor.html)의 사진 오려내기 흐름이 이 결과를 그대로 '오려낸 사진 조각'으로 등록한다. */
(function (global) {
  'use strict';
  const 최대변 = 1600;   // 결과 사진의 긴 변 한도(자동 오려내기와 같다)
  const 범위 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const 스타일 = `
  dialog.rw-lasso { max-width: 720px; width: calc(100% - 20px); padding: 16px; }
  .rw-lasso h3 { margin: 0 0 4px; }
  .rw-lasso .rl-hint { margin: 0 0 10px; font-size: .84rem; }
  .rw-lasso .rl-stage { display: flex; justify-content: center; background: #050505; border-radius: 12px; padding: 6px; touch-action: none; }
  .rw-lasso canvas { display: block; height: auto; max-width: 100%; border-radius: 6px; touch-action: none; cursor: crosshair; background: repeating-conic-gradient(#2b2b2b 0 25%, #3a3a3a 0 50%) 0 0 / 16px 16px; }
  .rw-lasso .rl-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 0; }
  .rw-lasso .rl-tools .chip { height: 34px; }
  .rw-lasso .rl-size { display: flex; align-items: center; gap: 8px; flex: 1 1 160px; min-width: 150px; font-size: .84rem; color: var(--ink-dim); }
  .rw-lasso .rl-size input { flex: 1; }
  .rw-lasso .rl-ai { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; font-size: .86rem; line-height: 1.4; }
  .rw-lasso .rl-ai small { display: block; color: var(--ink-dim); }
  .rw-lasso .rl-ai .chip, .rw-fine .rl-tools .chip { height: 34px; }
  `;

  function 창만들기() {
    if (!document.getElementById('rw-lasso-css')) { const s = document.createElement('style'); s.id = 'rw-lasso-css'; s.textContent = 스타일; document.head.appendChild(s); }
    const d = document.createElement('dialog');
    d.className = 'rw-lasso'; d.setAttribute('aria-labelledby', 'rl-title');
    d.innerHTML = `
      <h3 id="rl-title">오려낼 부분을 그려 주세요</h3>
      <p class="rl-hint" id="rl-hint"></p>
      <div class="rl-stage"><canvas aria-label="오려낼 부분을 그리는 사진"></canvas></div>
      <div class="rl-tools">
        <span class="chips" role="group" aria-label="그리는 방법">
          <button type="button" class="chip" data-mode="lasso" aria-pressed="true">⭕ 둘러싸기</button>
          <button type="button" class="chip" data-mode="brush" aria-pressed="false">🖌 칠하기</button>
        </span>
        <label class="rl-size" hidden>붓 크기 <input type="range" min="1" max="30" value="8" aria-label="붓 크기"></label>
        <span class="chips"><button type="button" class="chip" data-act="undo">↶ 한 획 취소</button><button type="button" class="chip" data-act="clear">모두 지우기</button></span>
      </div>
      <div class="rl-ai"><span class="chips" role="group" aria-label="오려내는 정도">
        <button type="button" class="chip" data-ai="1" aria-pressed="true">🎯 물체만 정확히</button>
        <button type="button" class="chip" data-ai="0" aria-pressed="false">✂️ 그린 모양 그대로</button></span>
        <small id="rl-aihint"></small></div>
      <div class="dlg-row"><button type="button" class="btn" data-act="cancel">취소</button><button type="button" class="btn primary" data-act="ok" disabled>오려내기</button></div>`;
    document.body.appendChild(d);
    return d;
  }

  // 획 목록으로 마스크 그리기 (좌표는 0~1 비율이라 어떤 크기에도 그릴 수 있다)
  function 마스크그리기(ctx, 획들, W, H) {
    ctx.fillStyle = ctx.strokeStyle = '#fff'; ctx.lineCap = ctx.lineJoin = 'round';
    획들.forEach(h => {
      const p = h.점;
      if (h.종류 === 'lasso') {
        if (p.length < 3) return;
        ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.closePath(); ctx.fill();
      } else {
        const r = Math.max(1, h.반지름 * Math.min(W, H));
        if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0] * W, p[0][1] * H, r, 0, Math.PI * 2); ctx.fill(); return; }
        ctx.lineWidth = r * 2; ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H))); ctx.stroke();
      }
    });
  }

  function 열기(사진) {
    const iw = 사진.naturalWidth || 사진.width, ih = 사진.naturalHeight || 사진.height;
    if (!iw || !ih) return Promise.resolve(null);
    return new Promise(끝 => {
      const 창 = 창만들기(), 캔 = 창.querySelector('canvas'), x = 캔.getContext('2d');
      const 도구 = { 방법: 'lasso', 크기: 8, 획: [], 지금: null, 마우스: null, AI: true };
      // 화면에 보이는 크기: 창 안에 들어가게 (가로 최대 680, 세로 최대 화면의 58%)
      const 최대가로 = Math.min(680, Math.max(240, window.innerWidth - 80)), 최대세로 = Math.max(200, window.innerHeight * 0.58);
      const k = Math.min(최대가로 / iw, 최대세로 / ih), cw = Math.max(120, Math.round(iw * k)), ch = Math.max(120, Math.round(ih * k));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      캔.width = Math.round(cw * dpr); 캔.height = Math.round(ch * dpr); 캔.style.width = cw + 'px'; 캔.style.height = ch + 'px';
      const 사진캔 = document.createElement('canvas'); 사진캔.width = 캔.width; 사진캔.height = 캔.height;   // 큰 원본을 움직일 때마다 다시 줄이지 않게 한 번만 그려 둔다
      사진캔.getContext('2d').drawImage(사진, 0, 0, 캔.width, 캔.height);
      const 마스크캔 = document.createElement('canvas'); 마스크캔.width = 캔.width; 마스크캔.height = 캔.height;
      const 색칠캔 = document.createElement('canvas'); 색칠캔.width = 캔.width; 색칠캔.height = 캔.height;
      const $ = s => 창.querySelector(s);

      const 반지름 = () => (도구.크기 / 100) * 0.5;   // 붓 반지름 = 짧은 변의 비율
      function 보이기() {
        x.clearRect(0, 0, 캔.width, 캔.height); x.drawImage(사진캔, 0, 0);
        const 전부 = 도구.지금 ? [...도구.획, 도구.지금] : 도구.획;
        const m = 마스크캔.getContext('2d'); m.clearRect(0, 0, 캔.width, 캔.height); 마스크그리기(m, 전부, 캔.width, 캔.height);
        if (전부.length) {
          // 선택되지 않은 바깥은 어둡게, 선택된 안쪽은 그대로 보여 준다
          const c = 색칠캔.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, 캔.width, 캔.height);
          c.fillStyle = 'rgba(0,0,0,.62)'; c.fillRect(0, 0, 캔.width, 캔.height); c.globalCompositeOperation = 'destination-out'; c.drawImage(마스크캔, 0, 0);
          x.drawImage(색칠캔, 0, 0);
        }
        // 지금 그리는 선(올가미는 시작점으로 닫히는 선도 점선으로)
        if (도구.지금 && 도구.지금.점.length > 1) {
          const p = 도구.지금.점; x.save(); x.lineJoin = x.lineCap = 'round'; x.lineWidth = Math.max(2, 2 * dpr);
          x.strokeStyle = '#FFE14D'; x.beginPath(); p.forEach(([a, b], i) => (i ? x.lineTo(a * 캔.width, b * 캔.height) : x.moveTo(a * 캔.width, b * 캔.height))); x.stroke();
          if (도구.지금.종류 === 'lasso') { x.setLineDash([6 * dpr, 6 * dpr]); x.lineTo(p[0][0] * 캔.width, p[0][1] * 캔.height); x.stroke(); }
          x.restore();
        }
        if (도구.방법 === 'brush' && 도구.마우스) {   // 붓 크기 미리 보기 동그라미
          x.save(); x.lineWidth = Math.max(1.5, dpr); x.strokeStyle = '#FFE14D'; x.beginPath();
          x.arc(도구.마우스[0] * 캔.width, 도구.마우스[1] * 캔.height, 반지름() * Math.min(캔.width, 캔.height), 0, Math.PI * 2); x.stroke(); x.restore();
        }
        $('[data-act="ok"]').disabled = !도구.획.length;
        $('[data-act="undo"]').disabled = !도구.획.length; $('[data-act="clear"]').disabled = !도구.획.length;
      }
      function 힌트() {
        $('#rl-hint').textContent = 도구.AI
          ? (도구.방법 === 'lasso' ? '오려낼 물체를 동그라미로 대충 둘러 그리세요. 물체보다 조금 커도 괜찮아요. 손을 떼면 저절로 닫혀요.' : '오려낼 물체 위를 대충 칠하세요. 칠한 범위 안에서 물체의 윤곽을 찾아요.')
          : (도구.방법 === 'lasso' ? '남기고 싶은 모양을 따라 둘러 그리세요. 손을 떼면 저절로 닫혀요. 그린 모양 그대로 잘려요.' : '남기고 싶은 부분을 칠하세요. 칠한 곳만 남아요.');
        $('#rl-aihint').textContent = 도구.AI ? '처음 쓸 때는 AI 모델(약 55MB)을 받느라 조금 걸려요.' : 'AI 없이 바로 잘려요.';
        창.querySelectorAll('[data-ai]').forEach(b => b.setAttribute('aria-pressed', String((b.dataset.ai === '1') === 도구.AI)));
        $('.rl-size').hidden = 도구.방법 !== 'brush';
        창.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === 도구.방법)));
      }
      const 위치 = e => { const r = 캔.getBoundingClientRect(); return [범위((e.clientX - r.left) / r.width, 0, 1), 범위((e.clientY - r.top) / r.height, 0, 1)]; };
      let 그리는중 = null;
      캔.addEventListener('pointerdown', e => {
        if (e.button != null && e.button > 0) return;
        if (그리는중 != null) return;   // 한 손가락으로 그리는 중에 다른 손가락이 닿아도 지금 획을 지킨다
        e.preventDefault(); 캔.setPointerCapture(e.pointerId); 그리는중 = e.pointerId;
        도구.지금 = { 종류: 도구.방법, 점: [위치(e)], 반지름: 반지름() }; 보이기();
      });
      캔.addEventListener('pointermove', e => {
        도구.마우스 = 위치(e);
        if (그리는중 === e.pointerId && 도구.지금) {
          const p = 도구.지금.점, [a, b] = 위치(e), 끝 = p[p.length - 1];
          if (Math.hypot((a - 끝[0]) * cw, (b - 끝[1]) * ch) >= 2) p.push([a, b]);   // 2px 넘게 움직일 때만 점을 더한다
        }
        보이기();
      });
      캔.addEventListener('pointerleave', () => { 도구.마우스 = null; if (!도구.지금) 보이기(); });
      const 마침 = e => {
        if (그리는중 !== e.pointerId) return; 그리는중 = null;
        const h = 도구.지금; 도구.지금 = null;
        const 쓸만함 = h && (h.종류 === 'brush' || h.점.length >= 3);   // 올가미는 점이 3개는 있어야 면이 된다
        if (쓸만함) 도구.획.push(h);
        보이기();
      };
      캔.addEventListener('pointerup', 마침); 캔.addEventListener('pointercancel', 마침);

      $('.rl-size input').addEventListener('input', e => { 도구.크기 = Number(e.target.value); 보이기(); });
      창.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { 도구.방법 = b.dataset.mode; 힌트(); 보이기(); }));
      창.querySelectorAll('[data-ai]').forEach(b => b.addEventListener('click', () => { 도구.AI = b.dataset.ai === '1'; 힌트(); }));
      $('[data-act="undo"]').addEventListener('click', () => { 도구.획.pop(); 보이기(); });
      $('[data-act="clear"]').addEventListener('click', () => { 도구.획 = []; 보이기(); });
      let 결과 = null;
      $('[data-act="cancel"]').addEventListener('click', () => 창.close());
      $('[data-act="ok"]').addEventListener('click', () => {
        if (!도구.획.length) return;
        const m = document.createElement('canvas'), s = Math.min(1, 최대변 / Math.max(iw, ih)); m.width = Math.max(1, Math.round(iw * s)); m.height = Math.max(1, Math.round(ih * s));
        마스크그리기(m.getContext('2d'), 도구.획, m.width, m.height);
        결과 = { 마스크: m, AI: 도구.AI }; 창.close();
      });
      창.addEventListener('close', () => { 창.remove(); 끝(결과); });
      힌트(); 보이기(); 창.showModal();
    });
  }

  // 마스크(흑백 캔버스, 하얀 곳 = 남길 곳)대로 사진을 오려 낸다. 가장자리는 아주 조금 부드럽게
  function 자르기(사진, 마스크) {
    const iw = 사진.naturalWidth || 사진.width, ih = 사진.naturalHeight || 사진.height;
    const s = Math.min(1, 최대변 / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const 작업 = document.createElement('canvas'); 작업.width = w; 작업.height = h;
    const x = 작업.getContext('2d', { willReadFrequently: true });
    x.drawImage(사진, 0, 0, w, h);
    const 부드럽 = Math.max(1, Math.min(3, Math.round(Math.max(w, h) / 700)));
    const 흐림 = document.createElement('canvas'); 흐림.width = w; 흐림.height = h;
    const bx = 흐림.getContext('2d');
    try { bx.filter = `blur(${부드럽}px)`; } catch (e) { /* filter 를 못 쓰는 브라우저는 그대로(가장자리가 약간 각져 보일 뿐) */ }
    bx.drawImage(마스크, 0, 0, w, h);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(흐림, 0, 0); x.globalCompositeOperation = 'source-over';
    const 알파 = x.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1, 칸 = 0;
    for (let yy = 0, i = 3; yy < h; yy++) for (let xx = 0; xx < w; xx++, i += 4) {
      if (알파[i] > 20) { 칸++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    }
    if (x1 < 0 || 칸 < w * h * 0.0005) return null;   // 남은 게 없거나 점 하나 크기
    const 여 = Math.round(Math.max(w, h) * 0.02);
    x0 = Math.max(0, x0 - 여); y0 = Math.max(0, y0 - 여); x1 = Math.min(w - 1, x1 + 여); y1 = Math.min(h - 1, y1 + 여);
    const 결과 = document.createElement('canvas'); 결과.width = x1 - x0 + 1; 결과.height = y1 - y0 + 1;
    결과.getContext('2d').drawImage(작업, x0, y0, 결과.width, 결과.height, 0, 0, 결과.width, 결과.height);
    return 결과;
  }

  const 다듬기스타일 = `
  dialog.rw-fine { max-width: 720px; width: calc(100% - 20px); padding: 16px; }
  .rw-fine h3 { margin: 0 0 4px; }
  .rw-fine .rl-hint { margin: 0 0 10px; font-size: .84rem; }
  .rw-fine .rl-stage { display: flex; justify-content: center; background: #050505; border-radius: 12px; padding: 6px; touch-action: none; }
  .rw-fine canvas { display: block; height: auto; max-width: 100%; border-radius: 6px; touch-action: none; cursor: crosshair; background: repeating-conic-gradient(#2b2b2b 0 25%, #3a3a3a 0 50%) 0 0 / 16px 16px; }
  .rw-fine .rl-tools { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 10px 0 0; }
  .rw-fine .rl-size { display: flex; align-items: center; gap: 8px; flex: 1 1 160px; min-width: 150px; font-size: .84rem; color: var(--ink-dim); }
  .rw-fine .rl-size input { flex: 1; }
  `;

  // 오려낸 결과를 미리 보고 붓으로 다듬는다. 마스크는 열기/오려내기가 만든 것(원래 사진과 같은 비율, 하얀색/투명도 = 남길 곳).
  // 확인하면 다듬은 마스크(캔버스)를, 그만두면 null 을 돌려준다
  function 다듬기(사진, 마스크) {
    const iw = 사진.naturalWidth || 사진.width, ih = 사진.naturalHeight || 사진.height;
    if (!iw || !ih || !마스크) return Promise.resolve(마스크 || null);
    return new Promise(끝 => {
      if (!document.getElementById('rw-fine-css')) { const st = document.createElement('style'); st.id = 'rw-fine-css'; st.textContent = 다듬기스타일; document.head.appendChild(st); }
      const 창 = document.createElement('dialog'); 창.className = 'rw-fine'; 창.setAttribute('aria-labelledby', 'rf-title');
      창.innerHTML = `
        <h3 id="rf-title">이대로 오려낼까요?</h3>
        <p class="rl-hint">남길 곳은 또렷하게, 빠질 곳은 흐리게 보여요. 어긋난 곳은 붓으로 고치세요.</p>
        <div class="rl-stage"><canvas aria-label="오려낸 결과 미리보기"></canvas></div>
        <div class="rl-tools">
          <span class="chips" role="group" aria-label="붓 종류">
            <button type="button" class="chip" data-t="del" aria-pressed="true">➖ 더 지우기</button>
            <button type="button" class="chip" data-t="add" aria-pressed="false">➕ 더 살리기</button></span>
          <label class="rl-size">붓 크기 <input type="range" min="1" max="30" value="8" aria-label="붓 크기"></label>
          <span class="chips"><button type="button" class="chip" data-act="undo">↶ 한 획 취소</button></span>
        </div>
        <div class="dlg-row"><button type="button" class="btn" data-act="cancel">처음으로</button><button type="button" class="btn primary" data-act="ok">이대로 쓰기</button></div>`;
      document.body.appendChild(창);
      const 캔 = 창.querySelector('canvas'), x = 캔.getContext('2d'), $ = q => 창.querySelector(q);
      const 최대가로 = Math.min(680, Math.max(240, window.innerWidth - 80)), 최대세로 = Math.max(200, window.innerHeight * 0.58);
      const k = Math.min(최대가로 / iw, 최대세로 / ih), cw = Math.max(120, Math.round(iw * k)), ch = Math.max(120, Math.round(ih * k));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      캔.width = Math.round(cw * dpr); 캔.height = Math.round(ch * dpr); 캔.style.width = cw + 'px'; 캔.style.height = ch + 'px';
      const 사진캔 = document.createElement('canvas'); 사진캔.width = 캔.width; 사진캔.height = 캔.height; 사진캔.getContext('2d').drawImage(사진, 0, 0, 캔.width, 캔.height);
      const 흐린캔 = document.createElement('canvas'); 흐린캔.width = 캔.width; 흐린캔.height = 캔.height;   // 빠진 곳이 어렴풋이 보이게 흐리게 깔아 둔다
      { const c = 흐린캔.getContext('2d'); c.globalAlpha = 0.35; c.drawImage(사진캔, 0, 0); }
      const 임시 = document.createElement('canvas'); 임시.width = 캔.width; 임시.height = 캔.height;
      const 마스크작업 = document.createElement('canvas'); 마스크작업.width = 캔.width; 마스크작업.height = 캔.height;
      const 도구 = { 종류: 'del', 크기: 8, 획: [], 지금: null, 마우스: null };
      const 반지름 = () => (도구.크기 / 100) * 0.5;
      // 획을 마스크 위에 적용: 지우기는 구멍을 내고, 살리기는 하얗게 채운다
      function 획적용(c, 획들, W, H) {
        c.lineCap = c.lineJoin = 'round';
        획들.forEach(h => {
          const p = h.점, r = Math.max(1, h.반지름 * Math.min(W, H));
          c.globalCompositeOperation = h.종류 === 'add' ? 'source-over' : 'destination-out'; c.fillStyle = c.strokeStyle = '#fff';
          if (p.length === 1) { c.beginPath(); c.arc(p[0][0] * W, p[0][1] * H, r, 0, Math.PI * 2); c.fill(); return; }
          c.lineWidth = r * 2; c.beginPath(); p.forEach(([a, b], i) => (i ? c.lineTo(a * W, b * H) : c.moveTo(a * W, b * H))); c.stroke();
        });
        c.globalCompositeOperation = 'source-over';
      }
      function 보이기() {
        const m = 마스크작업.getContext('2d'); m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, 마스크작업.width, 마스크작업.height);
        m.drawImage(마스크, 0, 0, 마스크작업.width, 마스크작업.height);
        획적용(m, 도구.지금 ? [...도구.획, 도구.지금] : 도구.획, 마스크작업.width, 마스크작업.height);
        const t = 임시.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, 임시.width, 임시.height);
        t.drawImage(사진캔, 0, 0); t.globalCompositeOperation = 'destination-in'; t.drawImage(마스크작업, 0, 0); t.globalCompositeOperation = 'source-over';
        x.clearRect(0, 0, 캔.width, 캔.height); x.drawImage(흐린캔, 0, 0); x.drawImage(임시, 0, 0);
        if (도구.마우스) { x.save(); x.lineWidth = Math.max(1.5, dpr); x.strokeStyle = 도구.종류 === 'add' ? '#7CFF9B' : '#FF7C7C'; x.beginPath(); x.arc(도구.마우스[0] * 캔.width, 도구.마우스[1] * 캔.height, 반지름() * Math.min(캔.width, 캔.height), 0, Math.PI * 2); x.stroke(); x.restore(); }
        $('[data-act="undo"]').disabled = !도구.획.length;
      }
      const 위치 = e => { const r = 캔.getBoundingClientRect(); return [범위((e.clientX - r.left) / r.width, 0, 1), 범위((e.clientY - r.top) / r.height, 0, 1)]; };
      let 그리는중 = null;
      캔.addEventListener('pointerdown', e => {
        if ((e.button != null && e.button > 0) || 그리는중 != null) return;
        e.preventDefault(); 캔.setPointerCapture(e.pointerId); 그리는중 = e.pointerId;
        도구.지금 = { 종류: 도구.종류, 점: [위치(e)], 반지름: 반지름() }; 보이기();
      });
      캔.addEventListener('pointermove', e => {
        도구.마우스 = 위치(e);
        if (그리는중 === e.pointerId && 도구.지금) { const p = 도구.지금.점, [a, b] = 위치(e), 끝점 = p[p.length - 1]; if (Math.hypot((a - 끝점[0]) * cw, (b - 끝점[1]) * ch) >= 2) p.push([a, b]); }
        보이기();
      });
      캔.addEventListener('pointerleave', () => { 도구.마우스 = null; if (!도구.지금) 보이기(); });
      const 마침 = e => { if (그리는중 !== e.pointerId) return; 그리는중 = null; if (도구.지금) 도구.획.push(도구.지금); 도구.지금 = null; 보이기(); };
      캔.addEventListener('pointerup', 마침); 캔.addEventListener('pointercancel', 마침); 캔.addEventListener('lostpointercapture', 마침);
      창.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.stopPropagation(); 도구.획.pop(); 보이기(); } });
      $('.rl-size input').addEventListener('input', e => { 도구.크기 = Number(e.target.value); 보이기(); });
      창.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => { 도구.종류 = b.dataset.t; 창.querySelectorAll('[data-t]').forEach(z => z.setAttribute('aria-pressed', String(z === b))); 보이기(); }));
      $('[data-act="undo"]').addEventListener('click', () => { 도구.획.pop(); 보이기(); });
      let 결과 = null;
      $('[data-act="cancel"]').addEventListener('click', () => 창.close());
      $('[data-act="ok"]').addEventListener('click', () => {
        const m = document.createElement('canvas'); m.width = 마스크.width; m.height = 마스크.height;
        const c = m.getContext('2d'); c.drawImage(마스크, 0, 0); 획적용(c, 도구.획, m.width, m.height);
        결과 = m; 창.close();
      });
      창.addEventListener('close', () => { 창.remove(); 끝(결과); });
      보이기(); 창.showModal();
    });
  }

  global.RewindLasso = { 열기, 자르기, 다듬기 };
})(window);
