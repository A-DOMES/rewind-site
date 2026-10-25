/* 사진 오려내기: 사진에서 사람·물건만 남기고 배경을 투명하게 (브라우저 안에서만 처리. 사진은 서버로 가지 않는다)
 * 모델: assets/cutout/silueta.onnx (U²-Net 경량판) · 실행기: assets/cutout/ort.wasm.min.js (ONNX Runtime Web)
 * 사용: RewindCutout.오려내기(이미지 또는 캔버스, { 진행: (글, 비율) => {} }) → 캔버스(RGBA, 대상만 잘라 냄) 또는 null(대상을 찾지 못함)
 * 처음 한 번만 실행기와 모델(약 55MB)을 받는다. 브라우저가 저장해 두므로 다음부터는 바로 시작한다. */
(function (global) {
  'use strict';
  const 기준주소 = (() => {
    const s = document.currentScript && document.currentScript.src;
    return (s ? s.replace(/[^/]*$/, '') : './assets/') + 'cutout/';
  })();
  const 모델 = { 파일: 'silueta.onnx', 크기: 320, 평균: [0.485, 0.456, 0.406], 편차: [0.229, 0.224, 0.225] };
  const 작업최대변 = 1600;   // 결과 그림의 긴 변 (썸네일에 올리기에 충분하고 메모리를 아낀다)
  let 세션약속 = null;

  const 범위 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function 스크립트불러오기(src) {
    return new Promise((ok, no) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => no(new Error('AI 실행 파일을 받지 못했어요. 인터넷 연결을 확인해 주세요.'));
      document.head.appendChild(s);
    });
  }
  // 모델 파일을 받으면서 진행률을 알린다
  async function 모델받기(진행) {
    let r;
    try { r = await fetch(기준주소 + 모델.파일); } catch (e) { throw new Error('AI 모델을 받지 못했어요. 인터넷 연결을 확인해 주세요.'); }
    if (!r.ok) throw new Error('AI 모델을 받지 못했어요. 인터넷 연결을 확인해 주세요.');
    const 전체 = Number(r.headers.get('content-length')) || 0;
    if (!r.body || !r.body.getReader || !전체) return new Uint8Array(await r.arrayBuffer());
    const 읽개 = r.body.getReader(), 조각 = []; let 받음 = 0;
    for (;;) {
      const { done, value } = await 읽개.read();
      if (done) break;
      조각.push(value); 받음 += value.length;
      if (진행) 진행(`AI 모델을 받는 중이에요 ${Math.min(100, Math.round(받음 / 전체 * 100))}%`, 받음 / 전체);
    }
    const 전부 = new Uint8Array(받음); let 위치 = 0;
    조각.forEach(c => { 전부.set(c, 위치); 위치 += c.length; });
    return 전부;
  }
  function 준비(진행) {
    if (!세션약속) {
      세션약속 = (async () => {
        if (!global.ort) { if (진행) 진행('AI 실행 파일을 받는 중이에요', 0); await 스크립트불러오기(기준주소 + 'ort.wasm.min.js'); }
        global.ort.env.wasm.wasmPaths = 기준주소;
        global.ort.env.wasm.numThreads = 1;   // 함께 쓰는 메모리(SharedArrayBuffer) 없이도 돌도록 한 줄기로
        global.ort.env.wasm.proxy = false;
        const 바이트 = await 모델받기(진행);
        if (진행) 진행('AI를 준비하는 중이에요', 1);
        try { return await global.ort.InferenceSession.create(바이트, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' }); }
        catch (e) { throw new Error('AI를 시작하지 못했어요. 브라우저를 새로 열거나 다른 사진으로 해 보세요.'); }
      })().catch(e => { 세션약속 = null; throw e; });   // 실패하면 다음에 다시 시도할 수 있게
    }
    return 세션약속;
  }

  // 낮은 해상도 마스크에서 덩어리를 찾아, 가장 큰 덩어리의 15% 이상인 것만 남긴다 (배경의 작은 잡티 제거)
  function 덩어리남기기(m, n) {
    const 라벨 = new Int32Array(n * n), 크기들 = [0]; let 개수 = 0; const 줄 = new Int32Array(n * n);
    for (let s = 0; s < n * n; s++) {
      if (m[s] <= 0.5 || 라벨[s]) continue;
      개수++; let 머리 = 0, 꼬리 = 0, 면적 = 0; 줄[꼬리++] = s; 라벨[s] = 개수;
      while (머리 < 꼬리) {
        const p = 줄[머리++]; 면적++; const x = p % n, y = (p / n) | 0;
        if (x > 0 && m[p - 1] > 0.5 && !라벨[p - 1]) { 라벨[p - 1] = 개수; 줄[꼬리++] = p - 1; }
        if (x < n - 1 && m[p + 1] > 0.5 && !라벨[p + 1]) { 라벨[p + 1] = 개수; 줄[꼬리++] = p + 1; }
        if (y > 0 && m[p - n] > 0.5 && !라벨[p - n]) { 라벨[p - n] = 개수; 줄[꼬리++] = p - n; }
        if (y < n - 1 && m[p + n] > 0.5 && !라벨[p + n]) { 라벨[p + n] = 개수; 줄[꼬리++] = p + n; }
      }
      크기들.push(면적);
    }
    const 가장큰 = Math.max(0, ...크기들), 남김 = 크기들.map(a => a >= 가장큰 * 0.15);
    let 남은면적 = 0;
    for (let i = 0; i < n * n; i++) { if (라벨[i] && !남김[라벨[i]]) m[i] = 0; else if (라벨[i]) 남은면적++; }
    return 남은면적 / (n * n);
  }

  async function 오려내기(원본, 옵션) {
    옵션 = 옵션 || {};
    const iw = 원본.naturalWidth || 원본.width, ih = 원본.naturalHeight || 원본.height;
    if (!iw || !ih) throw new Error('사진을 읽지 못했어요.');
    const 세션 = await 준비(옵션.진행);
    if (옵션.진행) 옵션.진행('사람과 물건을 찾는 중이에요', 1);
    await new Promise(ok => setTimeout(ok, 30));   // 화면에 안내가 먼저 보이게
    const s = Math.min(1, 작업최대변 / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const 작업 = document.createElement('canvas'); 작업.width = w; 작업.height = h;
    const x = 작업.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);   // 투명한 사진은 흰 바탕 위에 놓고 본다(투명 부분이 검게 읽히지 않게)
    x.drawImage(원본, 0, 0, w, h);
    // 1) 모델 입력: 320×320, 가장 밝은 값으로 나누고 평균·편차로 맞춘다
    const N = 모델.크기, 입력캔 = document.createElement('canvas'); 입력캔.width = N; 입력캔.height = N;
    const ix = 입력캔.getContext('2d', { willReadFrequently: true }); ix.imageSmoothingQuality = 'high'; ix.drawImage(작업, 0, 0, N, N);
    const px = ix.getImageData(0, 0, N, N).data; let 최대 = 1e-6;
    for (let i = 0; i < px.length; i += 4) 최대 = Math.max(최대, px[i], px[i + 1], px[i + 2]);
    const 입력 = new Float32Array(3 * N * N);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) for (let c = 0; c < 3; c++) 입력[c * N * N + p] = (px[i + c] / 최대 - 모델.평균[c]) / 모델.편차[c];
    const 이름 = 세션.inputNames[0];
    const 결과 = await 세션.run({ [이름]: new global.ort.Tensor('float32', 입력, [1, 3, N, N]) });
    const 출력 = 결과[세션.outputNames[0]].data;
    // 2) 마스크: 0~1로 맞추고 잡티를 지운 뒤, 경계를 또렷하게 (0.25~0.75를 0~1로)
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < 출력.length; i++) { lo = Math.min(lo, 출력[i]); hi = Math.max(hi, 출력[i]); }
    const m = new Float32Array(N * N);
    for (let i = 0; i < m.length; i++) m[i] = (출력[i] - lo) / Math.max(hi - lo, 1e-6);
    if (hi - lo < 0.2 * Math.max(hi, 1e-6) || hi - lo < 1e-3) return null;   // 마스크에 대상과 배경의 차이가 거의 없다(한 색뿐인 사진 등)
    const 비율 = 덩어리남기기(m, N);
    if (비율 < 0.005 || 비율 > 0.97) return null;   // 대상이 없거나 사진 전체가 대상
    const 마스크캔 = document.createElement('canvas'); 마스크캔.width = N; 마스크캔.height = N;
    const mx = 마스크캔.getContext('2d'), md = mx.createImageData(N, N);
    for (let i = 0; i < m.length; i++) { const t = 범위((m[i] - 0.25) / 0.5, 0, 1), v = t * t * (3 - 2 * t); md.data[i * 4 + 3] = Math.round(v * 255); }
    mx.putImageData(md, 0, 0);
    // 3) 원래 크기로 키운 마스크를 사진의 투명도로 쓴다
    const 큰마스크 = document.createElement('canvas'); 큰마스크.width = w; 큰마스크.height = h;
    const bx = 큰마스크.getContext('2d'); bx.imageSmoothingQuality = 'high'; bx.drawImage(마스크캔, 0, 0, w, h);
    const 사진데이터 = x.getImageData(0, 0, w, h), 알파 = bx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let yy = 0, i = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++, i += 4) {
      const a = 알파[i + 3]; 사진데이터.data[i + 3] = a;
      if (a > 20) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    }
    if (x1 < 0) return null;
    x.putImageData(사진데이터, 0, 0);
    // 4) 남은 부분만 잘라 낸다 (가장자리 2% 여백)
    const 여 = Math.round(Math.max(w, h) * 0.02);
    x0 = Math.max(0, x0 - 여); y0 = Math.max(0, y0 - 여); x1 = Math.min(w - 1, x1 + 여); y1 = Math.min(h - 1, y1 + 여);
    const 결과캔 = document.createElement('canvas'); 결과캔.width = x1 - x0 + 1; 결과캔.height = y1 - y0 + 1;
    결과캔.getContext('2d').drawImage(작업, x0, y0, 결과캔.width, 결과캔.height, 0, 0, 결과캔.width, 결과캔.height);
    return 결과캔;
  }

  global.RewindCutout = { 준비, 오려내기 };
})(window);
