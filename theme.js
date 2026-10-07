/* 리와인드 화면 색상(테마) - 모든 화면이 함께 쓰는 파일
   - 밝게 → 검정 → 숲 → 와인 순으로 버튼 하나를 누를 때마다 돌아가요.
   - 처음 방문하면 기기 설정(밝음/어두움)을 따라가요. 한 번 고르면 그 선택을 기억해요(rw_theme).
   - 숲·와인 색은 이 파일에만 있어요. 색을 바꾸려면 아래 PALETTE만 고치면 모든 화면에 적용돼요. */
(function () {
  'use strict';
  var KEY = 'rw_theme';
  var ORDER = ['light', 'dark', 'forest', 'wine'];
  var NAME = { light: '밝게', dark: '검정', forest: '숲', wine: '와인' };
  var FULL = { light: '밝게', dark: '검정', forest: '숲 초록', wine: '와인' };
  var SWATCH = { light: ['#f6f1e9', '#9a600a'], dark: ['#171412', '#e2a23c'], forest: ['#12261f', '#e8b44c'], wine: ['#2a1219', '#f0b45a'] };

  /* 숲·와인 팔레트 (어두운 바탕 + 같은 황색 포인트). 화면마다 쓰는 변수 이름이 달라서 한 번에 모두 정의해요 */
  var PALETTE = {
    forest: {
      bg: '#12261f', raised: '#1a3329', input: '#1d382d', line: '#2f4d40', strong: '#3f6454', deep: '#0b1814',
      ink: '#f3f7ef', dim: '#d3e0d0', faint: '#a9bfb1',
      amber: '#e8b44c', hover: '#f2c466', amberDim: '#5a4a22', wash: '#1d3027', onAmber: '#14100a', olive: '#c9b36a',
      blue: '#8cc0e8', green: '#b7d99a', err: '#f0a090', ok: '#8fcf6a', side: '#0e1f19', errWash: '#3d2a22', greenWash: '#1d3a24',
      sel: '#1f3a2d', changed: 'rgba(232,180,76,.12)', ntBg: '#e8b44c', ntFg: '#14100a'
    },
    wine: {
      bg: '#2a1219', raised: '#371a22', input: '#3f1f28', line: '#552a35', strong: '#6d3a47', deep: '#1c0b10',
      ink: '#fbf1ee', dim: '#ead3cf', faint: '#c7a1a1',
      amber: '#f0b45a', hover: '#f7c777', amberDim: '#5e4222', wash: '#331a21', onAmber: '#1a1410', olive: '#d6b070',
      blue: '#9cc0e8', green: '#b0d49a', err: '#ff9d8c', ok: '#9fd47a', side: '#210e14', errWash: '#4a2024', greenWash: '#26361f',
      sel: '#44212b', changed: 'rgba(240,180,90,.12)', ntBg: '#fbf1ee', ntFg: '#5a1f2d'
    }
  };

  function block(name, p) {
    return 'html:root[data-theme="' + name + '"]{color-scheme:dark;' +
      '--bg:' + p.bg + ';--bg-raised:' + p.raised + ';--bg-input:' + p.input + ';--line:' + p.line + ';--line-strong:' + p.strong + ';--bg-deep:' + p.deep + ';--film:' + p.deep + ';--stage:' + p.deep + ';' +
      '--ink:' + p.ink + ';--ink-dim:' + p.dim + ';--ink-faint:' + p.faint + ';' +
      '--amber:' + p.amber + ';--amber-hover:' + p.hover + ';--amber-dim:' + p.amberDim + ';--amber-wash:' + p.wash + ';--on-amber:' + p.onAmber + ';--olive:' + p.olive + ';' +
      '--gold:' + p.amber + ';--gold-dim:' + p.amberDim + ';--on-gold:' + p.onAmber + ';--focus:' + p.amber + ';' +
      '--blue:' + p.blue + ';--green:' + p.green + ';--err:' + p.err + ';--ok:' + p.ok + ';--done:' + p.ok + ';--sel:' + p.sel + ';--changed-bg:' + p.changed + ';--card-shadow:none;' +
      '--status-plan:' + p.blue + ';--status-making:' + p.blue + ';--status-review:' + p.amber + ';--status-final:' + p.blue + ';--status-done:' + p.ok + ';--status-error:' + p.err + ';' +
      /* 대본 화면(script·longscript)이 쓰는 이름 */
      '--raised:' + p.raised + ';--input:' + p.input + ';--line2:' + p.strong + ';--side:' + p.side + ';--dim:' + p.dim + ';--faint:' + p.faint + ';--wash:' + p.wash + ';' +
      '--err-wash:' + p.errWash + ';--green-wash:' + p.greenWash + ';--shadow:0 12px 40px rgba(0,0,0,.6);' +
      '--nt-bg:' + p.ntBg + ';--nt-fg:' + p.ntFg + '}';
  }


  /* 어두운 바탕을 글자 그대로 박아 둔 몇몇 면(사이드바·말풍선·가는 선 등)을 숲·와인 색으로 맞춘다. 검정·밝게 테마는 건드리지 않는다 */
  var SEL = function (x) { return 'html:root[data-theme="forest"] ' + x + ',html:root[data-theme="wine"] ' + x; };
  var RULES =
    SEL('.sidebar') + '{background:var(--side);border-right-color:var(--line)}' +
    SEL('.side-item.active') + ',' + SEL('.side-item:hover') + '{background:var(--bg-raised)}' +
    SEL('.msg .avatar') + '{background-color:var(--line);box-shadow:0 0 0 1px var(--line-strong)}' +
    SEL('.msg.bot .avatar') + '{background-color:var(--bg-deep)}' +
    SEL('.msg.user .bubble') + ',' + SEL('.amsg.user .bubble') + '{background:color-mix(in srgb,var(--amber) 14%,var(--bg));border-color:color-mix(in srgb,var(--amber) 38%,var(--bg))}' +
    SEL('.direct-form-wrap') + '{background:var(--side)}' +
    SEL('.split-resizer') + '{background:var(--line)}' +
    SEL('.split-resizer::after') + '{background:var(--line-strong)}' +
    SEL('header.shell') + '{border-bottom-color:var(--line)}' +
    SEL('.hero .facts') + '{border-top-color:var(--line)}' +
    SEL('section.alt') + '{border-color:var(--line)}' +
    SEL('footer') + ',' + SEL('.footer-bottom') + '{border-top-color:var(--line)}' +
    SEL('.timecode') + '{background:var(--bg-raised);border-color:var(--line)}' +
    SEL('.choice.featured') + '{background:var(--amber-wash)}' +
    SEL('.reel-row:hover') + '{background:var(--bg-raised)}';

  var CSS = RULES + block('forest', PALETTE.forest) + block('wine', PALETTE.wine) +
    /* 버튼 하나(지금 색 + 이름). 화면마다 있던 동그란 아이콘 3개 대신 쓴다 */
    '.theme-switch{display:inline-flex;align-items:center;flex-shrink:0;padding:3px;border:1px solid var(--line);border-radius:999px;background:var(--bg-raised)}' +
    'html body .theme-switch button.theme-cycle{width:auto;height:36px;min-width:0;border-radius:999px;padding:0 12px 0 8px;display:inline-flex;align-items:center;gap:8px;background:transparent;color:var(--ink);border:0;font:inherit;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap}' +
    'html body .acc-theme .theme-switch button.theme-cycle{height:30px;font-size:.78rem}' +
    'html body .theme-switch button.theme-cycle:hover,html body .theme-switch button.theme-cycle:focus-visible{background:color-mix(in srgb,var(--amber) 14%,transparent)}' +
    '.theme-switch .tc-dot{flex:none;width:20px;height:20px;border-radius:50%;box-shadow:0 0 0 1.5px var(--ink-faint)}' +
    '.rw-theme-toast{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:10px;padding:10px 18px;border-radius:999px;background:var(--ink);color:var(--bg);font:600 .88rem/1.3 "IBM Plex Sans KR",-apple-system,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.35);pointer-events:none;opacity:0;transition:opacity .18s}' +
    '.rw-theme-toast.on{opacity:1}' +
    '.rw-theme-toast .tc-dot{width:16px;height:16px;border-radius:50%;box-shadow:0 0 0 1.5px var(--bg)}' +
    '@media (prefers-reduced-motion:reduce){.rw-theme-toast{transition:none}}';

  function injectCss() {
    if (document.getElementById('rw-theme-css')) return;
    var s = document.createElement('style'); s.id = 'rw-theme-css'; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function stored() { try { return localStorage.getItem(KEY) || 'system'; } catch (e) { return 'system'; } }
  function systemIsLight() { try { return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches); } catch (e) { return false; } }
  /* 지금 화면에 실제로 보이는 테마 (기기 설정 따르기면 기기의 밝음/어두움) */
  function current() {
    var t = stored();
    if (ORDER.indexOf(t) < 0) t = systemIsLight() ? 'light' : 'dark';
    return t;
  }
  function apply(t) { document.documentElement.setAttribute('data-theme', t); }

  /* 가장 먼저(깜빡임 없이) 저장된 선택을 적용 */
  apply(stored());
  injectCss();

  function dotStyle(t) { var c = SWATCH[t]; return 'background:linear-gradient(135deg,' + c[0] + ' 52%,' + c[1] + ' 52%)'; }
  function render() {
    var t = current();
    var next = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    var boxes = document.querySelectorAll('.theme-switch');
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      box.setAttribute('role', 'group'); box.setAttribute('aria-label', '화면 색상');
      box.innerHTML = '<button type="button" class="theme-cycle" aria-label="화면 색상: 지금 ' + FULL[t] + '. 누르면 ' + FULL[next] + '" title="누르면 ' + FULL[next] + '"><span class="tc-dot" style="' + dotStyle(t) + '"></span><span class="tc-name">' + NAME[t] + '</span></button>';
    }
  }

  var toastEl = null, toastTimer = 0;
  function toast(t) {
    if (!toastEl) {
      toastEl = document.createElement('div'); toastEl.className = 'rw-theme-toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.innerHTML = '<span class="tc-dot" style="' + dotStyle(t) + '"></span><span>화면 색상: ' + FULL[t] + '</span>';
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1400);
  }

  function cycle() {
    var t = current();
    var next = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length];
    try { localStorage.setItem(KEY, next); } catch (e) {}
    apply(next); render(); toast(next);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.theme-switch .theme-cycle');
    if (b) { e.preventDefault(); cycle(); }
  }, true);   /* 메뉴 안에서 클릭 전달을 막아도 동작하도록 캡처 단계에서 받는다 */
  /* 다른 탭에서 바꿔도 따라가요 */
  window.addEventListener('storage', function (e) { if (e.key === KEY) { apply(stored()); render(); } });
  function ready() { render(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  window.rwTheme = { order: ORDER, current: current, cycle: cycle };
})();
