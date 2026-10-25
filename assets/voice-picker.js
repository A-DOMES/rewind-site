/* 목소리 고르기 화면 (고객용) — assets/voice-catalog.js 의 목록을 읽어 카드로 보여 준다.
 * 사용: RWVoicePicker.mount(요소, { 종류: '쇼츠', 성별: '남', 값: '', 바뀜: id => {} })
 *   값 ''(빈 문자열) = "자동 추천"(영상 종류와 성별에 어울리는 목소리를 시스템이 고름). 아니면 고른 음성ID.
 * 돌려주는 것: { 값(), 성별설정(g), 종류설정(k), 소리멈춤() }  — 화면을 닫을 때 소리멈춤()을 부른다.
 * 색·크기는 사이트의 변수(--ink, --line, --accent …)를 쓰고 없으면 기본값으로 보인다. */
(function (global) {
  'use strict';
  const C = global.RWVoiceCatalog;
  const 칩들 = [['all', '전체'], ['calm', '차분'], ['bright', '밝은'], ['strong', '힘 있는'], ['soft', '부드러운'], ['cute', '귀여운']];
  const 스타일 = `
  .rwvp { --_ink: var(--ink,#222); --_dim: var(--ink-dim,#777); --_line: var(--line,#ddd); --_bg: var(--bg-raised,#fff); --_ac: var(--accent,#c68a12); --_on: var(--on-gold,#fff); display: grid; gap: 12px; color: var(--_ink); }
  .rwvp .vp-auto { display: flex; gap: 10px; align-items: center; padding: 12px 14px; border: 1px solid var(--_line); border-radius: var(--r-lg,14px); background: var(--_bg); cursor: pointer; }
  .rwvp .vp-auto[aria-pressed="true"], .rwvp .vp-card[aria-pressed="true"] { border-color: var(--_ac); box-shadow: 0 0 0 1px var(--_ac) inset; }
  .rwvp .vp-auto b, .rwvp .vp-card b { display: block; font-size: var(--fs-sm,.9rem); }
  .rwvp small { color: var(--_dim); font-size: var(--fs-xs,.82rem); }
  .rwvp .vp-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .rwvp .vp-chip { border: 1px solid var(--_line); background: var(--_bg); color: var(--_ink); border-radius: 999px; padding: 6px 14px; font: inherit; font-size: var(--fs-sm,.9rem); cursor: pointer; min-height: 36px; }
  .rwvp .vp-chip[aria-pressed="true"] { background: var(--_ac); border-color: var(--_ac); color: var(--_on); }
  .rwvp .vp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }
  .rwvp .vp-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--_line); border-radius: var(--r-lg,14px); background: var(--_bg); cursor: pointer; text-align: left; font: inherit; color: inherit; }
  .rwvp .vp-play { flex: none; width: 40px; height: 40px; border-radius: 50%; border: 1px solid var(--_line); background: transparent; color: var(--_ink); display: grid; place-items: center; cursor: pointer; }
  .rwvp .vp-play svg { width: 16px; height: 16px; fill: currentColor; }
  .rwvp .vp-play[aria-pressed="true"] { background: var(--_ac); color: var(--_on); border-color: var(--_ac); }
  .rwvp .vp-empty { color: var(--_dim); font-size: var(--fs-sm,.9rem); padding: 8px 2px; }`;
  const 재생 = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>', 정지 = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>';

  function mount(el, 옵션) {
    if (!el || !C) return null;
    if (!document.getElementById('rwvp-css')) { const s = document.createElement('style'); s.id = 'rwvp-css'; s.textContent = 스타일; document.head.appendChild(s); }
    옵션 = 옵션 || {};
    const 상태 = { 종류: 옵션.종류 || '쇼츠', 성별: 옵션.성별 === '여' ? '여' : '남', 값: 옵션.값 || '', 분위기: 'all', 듣는중: '' };
    const 소리 = new Audio(); 소리.preload = 'none';
    el.classList.add('rwvp');

    function 소리멈춤() { try { 소리.pause(); } catch (e) {} 상태.듣는중 = ''; }
    소리.addEventListener('ended', () => { 상태.듣는중 = ''; 그리기(); });
    소리.addEventListener('error', () => { 상태.듣는중 = ''; 그리기(); });
    function 듣기(v) {
      if (상태.듣는중 === v.id) { 소리멈춤(); return 그리기(); }
      소리.pause(); 소리.src = v.샘플; 상태.듣는중 = v.id;
      const p = 소리.play(); if (p && p.catch) p.catch(() => { 상태.듣는중 = ''; 그리기(); });
      그리기();
    }
    function 고름(id) { 상태.값 = id; if (옵션.바뀜) 옵션.바뀜(id); 그리기(); }
    const 자동 = () => C.찾기(C.추천값(상태.종류, 상태.성별));
    function 그리기() {
      el.innerHTML = '';
      const a = document.createElement('div'); a.className = 'vp-auto'; a.setAttribute('role', 'button'); a.tabIndex = 0; a.setAttribute('aria-pressed', String(!상태.값));
      const 추 = 자동();
      a.innerHTML = '<div style="flex:1"><b>자동으로 어울리는 목소리</b><small>' + (상태.종류 ? 상태.종류 + ' 영상에 맞춰 골라 드려요' : '영상에 맞춰 골라 드려요') + '</small></div>' + (추 ? '<button type="button" class="vp-play" aria-label="자동 추천 목소리 미리 듣기" aria-pressed="' + (상태.듣는중 === 추.id) + '">' + (상태.듣는중 === 추.id ? 정지 : 재생) + '</button>' : '');
      a.addEventListener('click', e => { if (e.target.closest('.vp-play')) { if (추) 듣기(추); return; } 고름(''); });
      a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 고름(''); } });
      el.appendChild(a);
      const 성 = document.createElement('div'); 성.className = 'vp-row'; 성.setAttribute('role', 'group'); 성.setAttribute('aria-label', '성별');
      [['남', '남자'], ['여', '여자']].forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vp-chip'; b.textContent = t; b.setAttribute('aria-pressed', String(상태.성별 === k)); b.addEventListener('click', () => { 상태.성별 = k; 그리기(); }); 성.appendChild(b); });
      el.appendChild(성);
      const 분 = document.createElement('div'); 분.className = 'vp-row'; 분.setAttribute('role', 'group'); 분.setAttribute('aria-label', '분위기');
      칩들.forEach(([k, t]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'vp-chip'; b.textContent = t; b.setAttribute('aria-pressed', String(상태.분위기 === k)); b.addEventListener('click', () => { 상태.분위기 = k; 그리기(); }); 분.appendChild(b); });
      el.appendChild(분);
      const g = document.createElement('div'); g.className = 'vp-grid';
      const 목록 = C.목록.filter(v => v.성별 === 상태.성별 && (상태.분위기 === 'all' || v.분위기 === 상태.분위기));
      if (!목록.length) { const e = document.createElement('div'); e.className = 'vp-empty'; e.textContent = '이 분위기의 목소리는 아직 없어요.'; el.appendChild(e); }
      목록.forEach(v => {
        const c = document.createElement('div'); c.className = 'vp-card'; c.setAttribute('role', 'button'); c.tabIndex = 0; c.setAttribute('aria-pressed', String(상태.값 === v.id));
        c.innerHTML = '<button type="button" class="vp-play" aria-label="' + v.이름 + ' 미리 듣기" aria-pressed="' + (상태.듣는중 === v.id) + '">' + (상태.듣는중 === v.id ? 정지 : 재생) + '</button><div><b>' + v.이름 + '</b><small>' + v.나이대 + '</small></div>';
        c.addEventListener('click', e => { if (e.target.closest('.vp-play')) { 듣기(v); return; } 고름(v.id); });
        c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 고름(v.id); } });
        g.appendChild(c);
      });
      el.appendChild(g);
    }
    그리기();
    return {
      값: () => 상태.값,
      실제값: () => 상태.값 || C.추천값(상태.종류, 상태.성별),
      성별설정(g) { 상태.성별 = g === '여' ? '여' : '남'; 그리기(); },
      종류설정(k) { 상태.종류 = k || '쇼츠'; 그리기(); },
      소리멈춤
    };
  }
  global.RWVoicePicker = { mount };
})(window);
