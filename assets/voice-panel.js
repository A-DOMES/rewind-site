/* 목소리·자막 설정 카드 (모든 영상 종류가 같이 쓰는 화면 부품)
 *  - new.html 의 "직접 설정하기"에서 쓴다. 선택은 명함 카드(.df-comp .ccard)로, 속도·음높이는 막대로 고른다
 *  - 색은 화면의 색 변수(--ink, --amber …)만 써서 밝게·검정·숲·와인 4가지 테마에서 그대로 읽힌다
 *  - 고른 값은 RWVoice.value() 로 꺼내 접수(body.voice)에 보낸다. 규칙은 접수 v3.26 / 렌더링 서버 voice.js 와 같다
 *  - 영상 종류별 처음 값은 KIND_DEFAULT 한 곳에서 정한다 (렌더링 서버 voice.js 의 종류기본과 같은 값)
 */
(function () {
  'use strict';

  // 종류별 처음 값. 빈 칸이면 서버가 기본값을 쓰므로, 상품쇼츠 말고는 지금 동작과 같다
  var KIND_DEFAULT = {
    '상품쇼츠': { speed: 1.12, tone: '보통', pause: '짧게', subSize: '크게', subBreak: '짧게', subPos: '하단' },
    // 그 밖의 종류: 아무것도 고르지 않은 상태가 처음 값이다(= 영상에 맞게 자동). 직접 건드린 것만 접수로 보낸다
    '_': { speed: 1.0, tone: '', pause: '', subSize: '', subBreak: '', subPos: '' }
  };
  // 종류별로 가리는 항목 (그 종류의 렌더링이 지원하지 않거나, 이미 다른 칸이 있는 것)
  //  쇼츠: JSON2Video 가 쉼·자막 크기·끊기·켜고 끄기를 지원하지 않고, 자막 위치는 기존 칸이 있다
  //  야담: 자막을 끄는 기능이 없다 / 분위기 영상: 기분·읽는 속도·자막 구성(그림+음성)은 기존 칸이 이미 있다
  var KIND_HIDE = { '상품쇼츠': [], '쇼츠': ['pause', 'subOn', 'subPos', 'subSize', 'subBreak'], '야담': ['subOn'], '수면음악': ['speed', 'tone', 'subOn'] };
  var SPEED_MIN = 0.7, SPEED_MAX = 1.5;
  var TICKS = [{ v: 0.85, short: '느림', name: '느리게' }, { v: 1.0, short: '보통', name: '보통' }, { v: 1.12, short: '조금빠름', name: '조금 빠르게' }, { v: 1.3, short: '빠름', name: '빠르게' }];
  var PITCH_MIN = -6, PITCH_MAX = 6;
  var DICT_MAX = 20;

  var I = {
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2.5 4 2.5S16 14 16 14M9 9.5h.01M15 9.5h.01"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-6 10-8"/>',
    drop: '<path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/>',
    flat: '<circle cx="12" cy="12" r="9"/><path d="M8 15h8M9 9.5h.01M15 9.5h.01"/>',
    short: '<path d="M5 12h4M15 12h4"/>',
    mid: '<path d="M4 12h5M15 12h5"/>',
    long: '<path d="M3 12h4M17 12h4"/>',
    capOn: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h6M7 11h10"/>',
    capOff: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 20 20 4"/>',
    posBottom: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 17h10"/>',
    posMid: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12h10"/>',
    posTop: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10"/>',
    sizeS: '<path d="M8 17 12 7l4 10M9.5 13h5"/>',
    sizeM: '<path d="M6.5 18 12 5l5.5 13M8.5 13.5h7"/>',
    sizeL: '<path d="M5 19 12 3l7 16M7.5 14h9"/>',
    brkShort: '<path d="M5 8h8M5 12h14M5 16h10"/>',
    brkSent: '<path d="M4 9h16M4 15h12"/>',
    play: 'M8 5v14l11-7z',
    chev: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>'
  };
  function svg(p, fill) { return '<svg viewBox="0 0 24 24" aria-hidden="true"' + (fill ? ' style="fill:currentColor;stroke:none"' : '') + '>' + (fill ? '<path d="' + p + '"/>' : p) + '</svg>'; }

  function card(name, value, title, desc, icon, checked) {
    return '<label><input type="radio" name="' + name + '" value="' + value + '"' + (checked ? ' checked' : '') + '><span class="ccard"><span class="ci">' + svg(icon) + '</span><b>' + title + '</b>' + (desc ? '<small>' + desc + '</small>' : '') + '</span></label>';
  }
  function group(label, name, cards, hint) {
    return '<div class="df-field vp-group" data-vp="' + name.replace(/^vp-/, '') + '"><label class="vp-lab" id="' + name + '-l">' + label + '</label><div class="df-comp" role="radiogroup" aria-labelledby="' + name + '-l">' + cards + '</div>' + (hint ? '<p class="df-hint">' + hint + '</p>' : '') + '</div>';
  }

  var CSS = '' +
    '.vp-speed{display:flex;flex-direction:column;gap:2px}' +
    '.vp-row{display:flex;justify-content:space-between;align-items:baseline;gap:10px}' +
    '.vp-now{font-weight:700;color:var(--amber);font-size:1rem;font-variant-numeric:tabular-nums}' +
    '.vp-range{width:100%;height:44px;margin:0;accent-color:var(--amber);cursor:pointer}' +
    '.vp-ticks{position:relative;height:22px;margin:-6px 8px 0}' +
    '.vp-ticks span{position:absolute;top:0;transform:translateX(-50%);font-size:.76rem;color:var(--ink-dim);white-space:nowrap;text-align:center}' +
    '.vp-ticks span::before{content:"";display:block;width:2px;height:6px;margin:0 auto 2px;background:var(--line-strong,var(--line));border-radius:1px}' +
    '.vp-ticks span.on{color:var(--ink);font-weight:700}.vp-ticks span.on::before{background:var(--amber)}' +
    '.vp-play{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px}' +
    '.vp-btn{min-height:44px;padding:0 18px;border-radius:22px;border:0;background:var(--amber);color:var(--on-amber);font:inherit;font-size:.95rem;font-weight:700;display:inline-flex;align-items:center;gap:8px;cursor:pointer}' +
    '.vp-btn:disabled{background:transparent;border:1px dashed var(--line-strong,var(--line));color:var(--ink-faint);cursor:not-allowed}' +
    '.vp-btn svg{width:16px;height:16px}' +
    '.vp-note{font-size:.84rem;color:var(--ink-dim)}' +
    '.vp-more{margin:2px 0 14px;border:1px solid var(--line);border-radius:12px;background:transparent}' +
    '.vp-more>summary{list-style:none;min-height:48px;padding:0 14px;display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;font-size:.95rem;font-weight:600;color:var(--ink);border-radius:12px}' +
    '.vp-more>summary::-webkit-details-marker{display:none}' +
    '.vp-more>summary:focus-visible{outline:2px solid var(--amber);outline-offset:2px}' +
    '.vp-more>summary .vp-sum{font-size:.82rem;font-weight:400;color:var(--ink-dim);text-align:right;min-width:0}' +
    '.vp-more>summary .vp-chev{flex:none;width:18px;height:18px;transition:transform .15s}.vp-more[open]>summary .vp-chev{transform:rotate(180deg)}' +
    '.vp-more>summary .vp-chev svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    '.vp-body{padding:6px 14px 4px;border-top:1px solid var(--line)}' +
    '.vp-body .df-field{margin-top:16px}' +
    '.vp-dict{display:flex;flex-direction:column;gap:8px}' +
    '.vp-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr) 40px;gap:8px;align-items:center}' +
    '.vp-pair input{min-width:0;min-height:44px}' +
    '.vp-del{min-width:40px;min-height:44px;border:0;background:transparent;color:var(--ink-faint);font-size:1.2rem;cursor:pointer;border-radius:8px}' +
    '.vp-del:hover,.vp-del:focus-visible{color:var(--ink);background:color-mix(in srgb,var(--amber) 14%,var(--bg))}' +
    '.vp-add{min-height:44px;border:1px dashed var(--line-strong,var(--line));border-radius:10px;background:transparent;color:var(--ink-dim);font:inherit;font-size:.9rem;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px}' +
    '.vp-add:hover,.vp-add:focus-visible{border-color:var(--amber);color:var(--ink)}.vp-add[hidden]{display:none}' +
    '.vp-add svg{width:16px;height:16px;fill:none;stroke:var(--amber);stroke-width:2;stroke-linecap:round}' +
    '.vp-ai{margin:0 0 14px;font-size:.82rem;line-height:1.55;color:var(--ink-dim)}' +
    '[data-vp][hidden],.vp-more[hidden]{display:none!important}' +
    '.vp-pitch-l{display:flex;justify-content:space-between;font-size:.76rem;color:var(--ink-dim);margin:-4px 8px 0}';

  function injectCss() {
    if (document.getElementById('vp-css')) return;
    var s = document.createElement('style'); s.id = 'vp-css'; s.textContent = CSS; document.head.appendChild(s);
  }

  var opts = {};
  var root = null;

  function def(kind) { return KIND_DEFAULT[kind] || KIND_DEFAULT._; }

  function sectionHtml(o) {
    opts = o || {};
    var d = def(opts.kind);
    var cls = opts.cls || '';
    var tone = group('목소리 분위기', 'vp-tone',
      card('vp-tone', '보통', '보통', '꾸밈 없이 또렷하게', I.flat, d.tone === '보통') +
      card('vp-tone', '기쁘게', '기쁘게', '밝고 들뜬 느낌', I.smile, d.tone === '기쁘게') +
      card('vp-tone', '따뜻하게', '따뜻하게', '다정하게 말해 줘요', I.sun, d.tone === '따뜻하게') +
      card('vp-tone', '차분하게', '차분하게', '낮고 안정된 느낌', I.leaf, d.tone === '차분하게') +
      card('vp-tone', '슬프게', '슬프게', '가라앉은 느낌', I.drop, d.tone === '슬프게'));
    var pause = group('문장 사이 쉼', 'vp-pause',
      card('vp-pause', '짧게', '짧게', '빠르게 이어져요', I.short, d.pause === '짧게') +
      card('vp-pause', '보통', '보통', '기본 호흡', I.mid, d.pause === '보통') +
      card('vp-pause', '길게', '길게', '여유 있게 쉬어요', I.long, d.pause === '길게'));
    var subOn = group('자막', 'vp-subOn',
      card('vp-subOn', '켜기', '자막 켜기', '말과 함께 글자가 나와요', I.capOn, true) +
      card('vp-subOn', '끄기', '자막 끄기', '목소리만 들려줘요', I.capOff, false));
    var subPos = group('자막 위치', 'vp-subPos',
      card('vp-subPos', '하단', '아래', '화면 아래쪽', I.posBottom, d.subPos === '하단') +
      card('vp-subPos', '가운데', '가운데', '화면 한가운데', I.posMid, d.subPos === '가운데') +
      card('vp-subPos', '상단', '위', '화면 위쪽', I.posTop, d.subPos === '상단'));
    var subSize = group('자막 크기', 'vp-subSize',
      card('vp-subSize', '작게', '작게', '', I.sizeS, d.subSize === '작게') +
      card('vp-subSize', '보통', '보통', '', I.sizeM, d.subSize === '보통') +
      card('vp-subSize', '크게', '크게', '', I.sizeL, d.subSize === '크게'));
    var subBreak = group('자막 끊기', 'vp-subBreak',
      card('vp-subBreak', '짧게', '짧게 끊기', '한 번에 12~14자 안팎', I.brkShort, d.subBreak === '짧게') +
      card('vp-subBreak', '문장', '문장 단위', '한 번에 길게 보여요', I.brkSent, d.subBreak === '문장'));
    var style = opts.showStyle ? group('말투', 'vp-style',
      card('vp-style', '', '기본', '', I.flat, true) +
      card('vp-style', '또렷하게', '또렷하게 끝맺기', '', I.short, false) +
      card('vp-style', '부드럽게', '부드럽게 올리기', '', I.smile, false) +
      card('vp-style', '여운', '여운 남기기', '', I.long, false), '효과는 미리 듣고 정해 주세요.') : '';

    var tickHtml = TICKS.map(function (t) { return '<span data-v="' + t.v + '" style="left:' + ((t.v - SPEED_MIN) / (SPEED_MAX - SPEED_MIN) * 100).toFixed(2) + '%">' + t.short + '</span>'; }).join('');
    return '<section class="df-sec df-voice ' + cls + '" style="--c:#ff9a78"><div class="df-sec-head"><span class="df-sec-ico">' + svg(I.mic) + '</span><div><h3>목소리와 자막</h3><p>그대로 두어도 영상에 알맞게 맞춰져 있어요. 바꾸고 싶은 것만 골라 주세요</p></div></div>' +
      '<div class="df-field vp-speed" data-vp="speed"><div class="vp-row"><label for="vp-speed">말 속도</label><span class="vp-now" id="vp-speed-now" aria-live="polite"></span></div>' +
      '<input class="vp-range" id="vp-speed" type="range" min="' + SPEED_MIN + '" max="' + SPEED_MAX + '" step="0.01" value="' + d.speed + '"><div class="vp-ticks" aria-hidden="true">' + tickHtml + '</div>' +
      '<p class="df-hint" id="vp-speed-hint"></p></div>' +
      tone +
      '<div class="vp-play" data-vp="preview"><button type="button" class="vp-btn" id="vp-preview" disabled>' + svg(I.play, true) + '미리 듣기</button><span class="vp-note" id="vp-preview-note">미리 듣기는 곧 열려요. 지금은 고른 값대로 만들어요</span></div>' +
      '<details class="vp-more" id="vp-more"><summary><span>자세히 · 음높이, 쉼, 발음 사전, 자막</span><span class="vp-sum" id="vp-sum"></span><span class="vp-chev">' + svg(I.chev) + '</span></summary><div class="vp-body">' +
      '<div class="df-field vp-speed" data-vp="pitch"><div class="vp-row"><label for="vp-pitch">음높이</label><span class="vp-now" id="vp-pitch-now"></span></div><input class="vp-range" id="vp-pitch" type="range" min="' + PITCH_MIN + '" max="' + PITCH_MAX + '" step="1" value="0"><div class="vp-pitch-l" aria-hidden="true"><span>낮게</span><span>기본</span><span>높게</span></div></div>' +
      style + pause + subOn + subPos + subSize + subBreak +
      '<div class="df-field" data-vp="dict"><label>발음 사전 <span class="opt">선택 · 최대 ' + DICT_MAX + '개</span></label><p class="df-hint" style="margin:0 0 8px">제품명·영어 이름처럼 잘못 읽는 말을 알려 주세요. 자막에는 원래 글자가 그대로 나와요.</p><div class="vp-dict" id="vp-dict"></div></div>' +
      '</div></details>' +
      '<p class="vp-ai">AI 목소리가 들어간 영상은 유튜브에 올릴 때 "변경된 콘텐츠" 표시 안내를 확인해 주세요.</p></section>';
  }

  function $(id) { return document.getElementById(id); }
  function checked(name) { var el = document.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  var kindCur = '상품쇼츠', touched = {}, touchedAny = false;
  function vis(n) { var e = document.querySelector('[data-vp="' + n + '"]'); return !!e && !e.hidden; }
  function sends(n) { return kindCur === '상품쇼츠' || !!touched[n]; }   // 상품쇼츠는 화면의 값을 모두 보내고, 다른 종류는 직접 건드린 것만 보낸다
  function nearest(v) { var best = TICKS[0]; TICKS.forEach(function (t) { if (Math.abs(t.v - v) < Math.abs(best.v - v)) best = t; }); return best; }

  function speedValue() { var n = parseFloat($('vp-speed') && $('vp-speed').value); return isFinite(n) ? Math.min(SPEED_MAX, Math.max(SPEED_MIN, n)) : 1.0; }
  function pitchValue() { var n = parseInt($('vp-pitch') && $('vp-pitch').value, 10); return isFinite(n) ? Math.min(PITCH_MAX, Math.max(PITCH_MIN, n)) : 0; }

  function dictPairs() {
    var out = [], seen = {};
    document.querySelectorAll('#vp-dict .vp-pair').forEach(function (r) {
      var w = r.querySelector('.vp-w').value.trim().replace(/\s+/g, ' '), s = r.querySelector('.vp-r').value.trim().replace(/\s+/g, ' ');
      if (!w || !s || w.length > 20 || s.length > 40 || seen[w]) return;
      seen[w] = 1; out.push([w, s]);
    });
    return out.slice(0, DICT_MAX);
  }

  function summary() {
    if (!$('vp-speed')) return '';
    var parts = [];
    if (vis('speed') && sends('speed')) parts.push(nearest(speedValue()).name);
    if (vis('tone')) { var t = checked('vp-tone'); if ((t && sends('tone')) || kindCur === '상품쇼츠') parts.push(t || '보통'); }
    if (vis('subOn')) parts.push(checked('vp-subOn') === '끄기' ? '자막 꺼짐' : '자막 켜짐');
    var extra = 0;
    if (vis('pitch') && sends('pitch')) extra++;
    if (vis('pause') && sends('pause') && checked('vp-pause')) extra++;
    if (vis('subSize') && sends('subSize') && checked('vp-subSize')) extra++;
    if (vis('subBreak') && sends('subBreak') && checked('vp-subBreak')) extra++;
    if (vis('dict') && dictPairs().length) extra++;
    if (kindCur !== '상품쇼츠' && extra) parts.push('자세히 ' + extra + '개');
    return parts.length ? parts.join(' · ') : '기본 설정';
  }

  function refresh() {
    if (!$('vp-speed')) return;
    var v = speedValue(), t = nearest(v);
    $('vp-speed-now').textContent = t.name + ' ×' + v.toFixed(2);
    var pct = Math.round((v - 1) * 100);
    $('vp-speed-hint').textContent = Math.abs(pct) < 2 ? '보통 속도예요' : (pct > 0 ? '보통보다 약 ' + pct + '% 빠르게 말해요. ' + (kindCur === '야담' ? '영상 길이는 그대로 맞춰 써요' : '같은 대본이면 영상이 그만큼 짧아져요') : '보통보다 약 ' + (-pct) + '% 느리게 말해요. ' + (kindCur === '야담' ? '영상 길이는 그대로 맞춰 써요' : '같은 대본이면 영상이 그만큼 길어져요'));
    document.querySelectorAll('.vp-ticks span').forEach(function (s) { s.classList.toggle('on', t.v === parseFloat(s.dataset.v) && Math.abs(v - t.v) < 0.06); });
    var p = pitchValue(); $('vp-pitch-now').textContent = p === 0 ? '기본' : (p > 0 ? '+' + p : String(p));
    $('vp-sum').textContent = summary();
    var off = vis('subOn') && checked('vp-subOn') === '끄기';
    ['vp-subPos', 'vp-subSize', 'vp-subBreak'].forEach(function (n) { document.querySelectorAll('input[name="' + n + '"]').forEach(function (i) { i.disabled = off; }); var g = document.getElementById(n + '-l'); if (g && g.parentNode) g.parentNode.style.opacity = off ? '.45' : ''; });
    if (typeof opts.onChange === 'function') opts.onChange(value());
  }

  function addPair(w, s) {
    var list = $('vp-dict'); if (!list) return;
    var n = list.querySelectorAll('.vp-pair').length; if (n >= DICT_MAX) return;
    var d = document.createElement('div'); d.className = 'vp-pair';
    d.innerHTML = '<input class="vp-w" type="text" maxlength="20" placeholder="단어 (예: iPhone)" aria-label="단어"><input class="vp-r" type="text" maxlength="40" placeholder="읽는 소리 (예: 아이폰)" aria-label="읽는 소리"><button type="button" class="vp-del" aria-label="이 줄 지우기">×</button>';
    if (w) d.querySelector('.vp-w').value = w; if (s) d.querySelector('.vp-r').value = s;
    list.insertBefore(d, list.querySelector('.vp-add'));
    syncAdd();
  }
  function syncAdd() {
    var list = $('vp-dict'); if (!list) return;
    var add = list.querySelector('.vp-add'), n = list.querySelectorAll('.vp-pair').length;
    add.hidden = n >= DICT_MAX;
  }

  function init(el) {
    root = el || document;
    injectCss();
    var list = $('vp-dict'); if (!list || list.dataset.ready) return;
    list.dataset.ready = '1';
    touched = {}; touchedAny = false;      // 새로 그린 화면이므로 건드린 기록도 처음부터
    var add = document.createElement('button'); add.type = 'button'; add.className = 'vp-add'; add.innerHTML = svg(I.plus) + '단어 추가';
    list.appendChild(add);
    addPair();
    list.addEventListener('click', function (e) {
      if (e.target.closest('.vp-add')) { addPair(); var ps = list.querySelectorAll('.vp-pair'); ps[ps.length - 1].querySelector('.vp-w').focus(); return; }
      var del = e.target.closest('.vp-del');
      if (del) { var pairs = list.querySelectorAll('.vp-pair'); if (pairs.length > 1) del.closest('.vp-pair').remove(); else { pairs[0].querySelector('.vp-w').value = ''; pairs[0].querySelector('.vp-r').value = ''; } syncAdd(); }
    });
    var sp = $('vp-speed');
    sp.addEventListener('input', function () {          // 눈금 가까이에서는 눈금 값으로 붙는다
      var v = parseFloat(sp.value), t = nearest(v);
      if (Math.abs(v - t.v) <= 0.025) sp.value = String(t.v);
      touched.speed = touchedAny = true;
      refresh();
    });
    root.addEventListener('change', function (e) { if (e.target && /^vp-/.test(e.target.name || e.target.id || '')) { if (e.target.name) touched[e.target.name.replace(/^vp-/, '')] = touchedAny = true; refresh(); } });
    $('vp-pitch').addEventListener('input', function () { touched.pitch = touchedAny = true; refresh(); });
    setKind(opts.kind || kindCur);
  }

  /* 접수(body.voice)로 보낼 값. 서버가 한 번 더 검사하고 범위를 맞춘다 */
  function value() {
    if (!$('vp-speed')) return null;
    var v = {}, all = kindCur === '상품쇼츠';
    if (vis('speed') && sends('speed')) v.speed = Math.round(speedValue() * 100) / 100;
    if (vis('pitch') && sends('pitch')) v.pitch = pitchValue();
    if (vis('tone')) { var t = checked('vp-tone'); if (t && sends('tone')) v.tone = t; else if (all) v.tone = '보통'; }
    if (vis('pause') && sends('pause')) { var pz = checked('vp-pause'); if (pz) v.pause = pz; }
    if (vis('subSize') && sends('subSize')) { var sz = checked('vp-subSize'); if (sz) v.subtitleSize = sz; }
    if (vis('subBreak') && sends('subBreak')) { var bk = checked('vp-subBreak'); if (bk) v.subtitleBreak = bk; }
    if (vis('subOn')) v.subtitleOff = checked('vp-subOn') === '끄기';
    if (vis('style') && sends('style')) { var st = checked('vp-style'); if (st) v.style = st; }
    if (vis('dict')) { var pairs = dictPairs(); if (pairs.length) v.pronounce = pairs; }
    return Object.keys(v).length ? v : null;
  }
  // 자막 위치는 기존 접수 항목(captionPos: 하단·가운데·상단)으로 보낸다. 자막을 끄면 보낼 것이 없다
  function captionPos() { return !vis('subPos') || !sends('subPos') || (vis('subOn') && checked('vp-subOn') === '끄기') ? '' : (checked('vp-subPos') || ''); }

  // 영상 종류가 바뀌면 보이는 항목과 처음 값을 맞춘다. 사용자가 이미 건드렸다면 값은 그대로 두고 보이는 항목만 바꾼다
  function setKind(kind) {
    kindCur = KIND_HIDE[kind] ? kind : '쇼츠';
    var hide = KIND_HIDE[kindCur] || [];
    document.querySelectorAll('[data-vp]').forEach(function (e) { e.hidden = hide.indexOf(e.getAttribute('data-vp')) >= 0; });
    var more = $('vp-more');
    if (more) { var anyIn = ['pitch', 'pause', 'subOn', 'subPos', 'subSize', 'subBreak', 'dict'].some(function (n) { return vis(n); }); more.hidden = !anyIn; }
    if ($('vp-speed')) {
      var d = def(kindCur);
      if (!touched.speed) $('vp-speed').value = String(d.speed);
      if (!touched.pitch) $('vp-pitch').value = '0';
      // 직접 건드리지 않은 항목만 이 종류의 처음 값으로 되돌린다 (건드린 것은 그대로)
      [['tone', d.tone], ['pause', d.pause], ['subSize', d.subSize], ['subBreak', d.subBreak], ['subPos', d.subPos]].forEach(function (g) {
        if (touched[g[0]]) return;
        document.querySelectorAll('input[name="vp-' + g[0] + '"]').forEach(function (i) { i.checked = !!g[1] && i.value === g[1]; });
      });
      if (hide.indexOf('subOn') >= 0) { var on = document.querySelector('input[name="vp-subOn"][value="켜기"]'); if (on) on.checked = true; delete touched.subOn; }   // 자막을 끌 수 없는 종류로 오면 켜진 상태로
    }
    refresh();
  }

  window.RWVoice = {
    setKind: setKind,
    sectionHtml: sectionHtml, init: init, value: value, summary: summary, captionPos: captionPos,
    defaults: def, previewReady: false
  };
})();
