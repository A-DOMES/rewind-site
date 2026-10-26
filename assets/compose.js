/* 영상 꾸미기(RWCompose): 템플릿 고르기 → 글자·크기·줄 조절 → 결과를 콜백으로 돌려준다.
 * 값은 서버 영상구성과 같은 이름(템플릿·자막모양·글꼴·자막크기·줄수·줄길이·핵심색). 건드린 값만 돌려준다(안 건드린 것은 서버 기본·템플릿 기본).
 * 좌표·가이드는 서버와 같은 shared/layout.js(RWLayout), 템플릿은 shared/templates-shorts.json 사본을 쓴다. 고객 글자는 항상 textContent 로만 넣는다.
 */
(function () {
  'use strict';
  var VER = '?v=20261026';
  var 기본 = { 자막모양: '굵은흰', 글꼴: 'Noto Sans CJK KR', 자막크기: 77, 줄수: 1, 줄길이: 0.76, 핵심색: '없음' };
  var 모양들 = [['굵은흰', '굵은 흰색'], ['굵은노랑', '굵은 노랑'], ['차분흰', '차분한 흰색'], ['뉴스박스', '뉴스 박스']];
  var 글꼴들 = [['Noto Sans CJK KR', '고딕', "'Noto Sans KR','Noto Sans CJK KR',sans-serif"], ['Noto Serif KR', '명조', "'Noto Serif KR','Noto Serif CJK KR',serif"], ['Black Han Sans', '굵은 제목', "'Black Han Sans','Noto Sans KR',sans-serif"]];
  var 핵심들 = [['없음', '없음', ''], ['분홍', '분홍', '#ff4d8d'], ['노랑', '노랑', '#ffe14d'], ['초록', '초록', '#2ee6a6']];
  var 위치들 = [['위', '위'], ['가운데', '가운데'], ['아래', '아래']];
  var 샘플기본 = '보기보다 훨씬 많이 들어가요. 하루 종일 들고 다녀도 어깨가 편해요';
  var 템플릿목록 = null, 불러옴 = null;

  function 템플릿불러오기() {
    if (불러옴) return 불러옴;
    불러옴 = fetch('./assets/shared/templates-shorts.json' + VER).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (t) { return (템플릿목록 = Array.isArray(t) ? t : []); });
    return 불러옴;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var 수 = function (x, a, b, d) { x = Number(x); return Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };

  // 고른 값 + 템플릿 기본 + 기본값 → 실제로 보이는 값
  function 합치기(선택, 종류) {
    var t = (템플릿목록 || []).find(function (x) { return x.id === 선택.템플릿 && (!종류 || x.종류.indexOf(종류) >= 0); });
    var 값 = Object.assign({}, 기본, t ? t.기본 : {});
    ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색'].forEach(function (k) { if (선택[k] !== undefined) 값[k] = 선택[k]; });
    if (t && t.허용스타일 && t.허용스타일.indexOf(값.자막모양) < 0) 값.자막모양 = t.기본.자막모양;
    return { 값: 값, 템플릿: t || null };
  }

  function 요약(선택) {
    선택 = 선택 || {};
    var 조각 = [];
    var t = (템플릿목록 || []).find(function (x) { return x.id === 선택.템플릿; });
    if (선택.템플릿) 조각.push(t ? t.이름 : '템플릿');
    if (선택.자막모양) 조각.push(선택.자막모양 === '뉴스박스' ? '뉴스 박스' : 선택.자막모양);
    if (선택.자막크기) 조각.push('크기 ' + 선택.자막크기);
    if (선택.줄수) 조각.push(선택.줄수 + '줄');
    if (선택.블록 && 선택.블록.length) 조각.push('고정 글자 ' + 선택.블록.length + '개');
    return 조각.length ? 조각.join(' · ') : '기본 모양 (바꾸지 않았어요)';
  }

  function open(opt) {
    opt = opt || {};
    var 종류 = opt.종류 || '쇼츠', 가로 = opt.화면 === '가로';
    var 선택 = Object.assign({}, opt.값 || {}); var 자막위치 = opt.자막위치 || '아래'; var 처음위치 = 자막위치, 위치바꿈 = false, 초기화함 = false; var 가이드켜짐 = true;
    var 샘플 = String(opt.샘플 || '').trim() || 샘플기본;
    var 이전포커스 = document.activeElement;
    var W = 가로 ? 1920 : 1080, H = 가로 ? 1080 : 1920;

    var ov = el('div', 'cz-ov'); ov.setAttribute('role', 'presentation');
    var dlg = el('div', 'cz-dlg'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'cz-title');
    var head = el('div', 'cz-head'); var ht = el('div'); var h2 = el('h2', '', '영상 꾸미기'); h2.id = 'cz-title'; ht.appendChild(h2); ht.appendChild(el('small', '', '마음에 드는 모양을 고르고, 필요하면 조금만 고쳐 보세요'));
    var x = el('button', 'cz-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '닫기'); head.appendChild(ht); head.appendChild(x);
    var pv = el('div', 'cz-pv'); var phone = el('div', 'cz-phone' + (가로 ? ' cz-wide' : '')); var bg = el('div', 'cz-bg'); phone.appendChild(bg);
    var gbox = el('div'); gbox.style.cssText = 'position:absolute;inset:0'; phone.appendChild(gbox);
    var sub = el('div', 'cz-sub'); phone.appendChild(sub); var blk = el('div'); blk.style.cssText = 'position:absolute;inset:0;pointer-events:none'; phone.appendChild(blk);
    var tools = el('div', 'cz-pvtools'); var gl = el('label'); var gc = el('input'); gc.type = 'checkbox'; gc.checked = true; gl.appendChild(gc); gl.appendChild(document.createTextNode(' 유튜브가 쓰는 자리 점선으로 보기')); tools.appendChild(gl);
    var warn = el('ul', 'cz-warn'); warn.setAttribute('aria-live', 'polite');
    pv.appendChild(phone); pv.appendChild(tools); pv.appendChild(warn); pv.appendChild(el('p', 'cz-note', '실제 영상은 조금 다를 수 있어요. 점선 자리를 침범해도 만들 수 있어요.'));
    var body = el('div', 'cz-body');
    var foot = el('div', 'cz-foot'); var reset = el('button', 'cz-btn', '처음 모양으로'); reset.type = 'button'; var ok = el('button', 'cz-btn cz-main', '적용하기'); ok.type = 'button'; foot.appendChild(reset); foot.appendChild(ok);
    dlg.appendChild(head); dlg.appendChild(pv); dlg.appendChild(body); dlg.appendChild(foot); ov.appendChild(dlg);

    function 그리기미리보기() {
      var m = 합치기(선택, 종류), v = m.값;
      var box = RWLayout.자막상자(W, H, { 위치: 자막위치, 크기: v.자막크기 * Math.min(W, H) / 1080, 줄수: v.줄수, 줄길이: v.줄길이, 안전영역: !가로 });
      sub.style.cssText = 'left:50%;top:' + (box.y / H * 100) + '%;width:' + (box.w / W * 100) + '%;font-size:' + (v.자막크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + v.줄수 + ';overflow:hidden;';
      sub.style.fontFamily = (글꼴들.find(function (g) { return g[0] === v.글꼴; }) || 글꼴들[0])[2];
      sub.style.fontWeight = v.자막모양 === '차분흰' || v.글꼴 === 'Black Han Sans' ? '500' : '800';
      sub.style.color = v.자막모양 === '굵은노랑' ? '#ffe600' : '#fff';
      sub.style.webkitTextStroke = v.자막모양 === '뉴스박스' ? '0' : (v.자막모양 === '차분흰' ? '0.5px #000' : '1.2px #000'); sub.style.paintOrder = 'stroke fill';
      sub.style.background = v.자막모양 === '뉴스박스' ? 'rgba(0,0,0,.75)' : 'none';
      sub.textContent = '';
      var 핵 = 핵심들.find(function (h) { return h[0] === v.핵심색; });
      var 줄 = 샘플.split(/(\s+)/); var 강조 = false;
      줄.forEach(function (w, i) { var s = el('span', '', w); if (핵 && 핵[2] && i === 2) s.style.color = 핵[2]; sub.appendChild(s); });
      gbox.textContent = '';
      if (가이드켜짐) RWLayout.가이드(W, H).forEach(function (g) { var d = el('div', 'cz-g'); d.style.cssText = 'left:' + (g.x / W * 100) + '%;top:' + (g.y / H * 100) + '%;width:' + (g.w / W * 100) + '%;height:' + (g.h / H * 100) + '%'; d.appendChild(el('span', '', g.이름)); gbox.appendChild(d); });
      blk.textContent = '';
      var 문제들 = 블록검사(), 블록경고 = [];
      블록목록().forEach(function (b, i) {
        var 글자 = (window.RWPhrase ? RWPhrase.블록글정리(b.글) : String(b.글 || '').trim()); if (!글자 || 문제들[i]) return;
        var px = b.크기 * Math.min(W, H) / 1080, bs = RWLayout.블록상자(W, H, b.위치, px, Math.max(1, Math.ceil([].concat(글자).join('').length * 0.66 * px / (W * 0.9))));
        var d = el('div', 'cz-sub', 글자); d.style.cssText = 'left:' + (bs.cx / W * 100) + '%;top:' + (bs.y / H * 100) + '%;width:' + (bs.w / W * 100) + '%;font-size:' + (b.크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;font-weight:' + (b.모양 === '차분흰' ? 500 : 800) + ';color:' + (b.모양 === '굵은노랑' ? '#ffe600' : '#fff') + ';-webkit-text-stroke:' + (b.모양 === '뉴스박스' ? 0 : 1.2) + 'px #000;paint-order:stroke fill;background:' + (b.모양 === '뉴스박스' ? 'rgba(0,0,0,.75)' : 'none') + ';font-family:' + (글꼴들.find(function (g) { return g[0] === b.글꼴; }) || 글꼴들[0])[2];
        blk.appendChild(d);
        if (RWLayout.가이드(W, H).some(function (g) { return RWLayout.겹침비(bs, g) > 0.1; })) 블록경고.push('고정 글자 ' + (i + 1) + '번이 유튜브가 쓰는 자리와 겹쳐요. 그대로 만들 수 있어요');
      });
      warn.textContent = '';
      var 글 = 블록경고;
      if (v.자막크기 * Math.min(W, H) / 1080 < H * 0.036) 글.push('글자가 작아서 휴대폰에서 읽기 어려울 수 있어요');
      var 겹친 = RWLayout.가이드(W, H).filter(function (g) { return RWLayout.겹침비(box, g) > 0.1; }).map(function (g) { return g.이름; });
      if (겹친.length) 글.push('자막이 유튜브가 쓰는 자리(' + 겹친.join('·') + ')와 겹쳐요. 그대로 만들 수 있어요');
      글.forEach(function (t) { warn.appendChild(el('li', '', t)); });
    }
    function 기준값() { return 합치기({ 템플릿: 선택.템플릿 }, 종류).값; }   // 슬라이더 가운데 = 템플릿(없으면 기본) 값
    function 블록목록() { return 선택.블록 || (선택.블록 = []); }
    function 블록검사() {   // 블록마다 문제 문구('' = 괜찮음). 서버와 같은 phrase.js 규칙을 쓴다
      var 앞 = [], 결과 = [];
      블록목록().forEach(function (b) {
        var 글 = window.RWPhrase ? RWPhrase.블록글정리(b.글) : String(b.글 || '').trim(), 문제 = '';
        if (글 && window.RWPhrase && (RWPhrase.블록금지됨(글, '광고') || RWPhrase.블록금지됨(앞.concat(글).join(' '), '광고'))) 문제 = '쓸 수 없는 표현이에요 (광고·가격·주소·연락처·계좌 등). 고쳐 주세요';
        else if (글) 앞.push(글);
        결과.push(문제);
      });
      return 결과;
    }
    function 갱신() { 그리기미리보기(); 눌림갱신(); }
    var 눌림목록 = [];
    function 눌림갱신() { 눌림목록.forEach(function (f) { f(); }); }

    function 카드(제목, 작은글) { var c = el('section', 'cz-card'); var h = el('h3', '', 제목); if (작은글) h.appendChild(el('small', '', 작은글)); c.appendChild(h); body.appendChild(c); return c; }
    function 칩묶음(c, 목록, 읽기, 쓰기, 이름) {
      var wrap = el('div', 'cz-chips'); wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 이름);
      목록.forEach(function (it) { var b = el('button', 'cz-chip', it[1]); b.type = 'button'; b.addEventListener('click', function () { 쓰기(it[0]); 갱신(); }); wrap.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(읽기() === it[0])); }); });
      c.appendChild(wrap);
    }

    function 만들기() {
      body.textContent = ''; 눌림목록 = [];
      var c1 = 카드('1. 모양 고르기', '골라 두면 아래 값이 알맞게 채워져요');
      var g = el('div', 'cz-grid'); c1.appendChild(g);
      var 직접 = el('button', 'cz-opt'); 직접.type = 'button'; 직접.appendChild(el('b', '', '직접 꾸미기')); 직접.appendChild(el('small', '', '템플릿 없이 아래에서 하나씩 정해요'));
      직접.addEventListener('click', function () { delete 선택.템플릿; 갱신(); }); g.appendChild(직접); 눌림목록.push(function () { 직접.setAttribute('aria-pressed', String(!선택.템플릿)); });
      (템플릿목록 || []).filter(function (t) { return t.종류.indexOf(종류) >= 0; }).forEach(function (t) {
        var b = el('button', 'cz-opt'); b.type = 'button'; b.appendChild(el('b', '', t.이름)); var s = el('span', 'cz-sample', '가나다'); s.style.color = t.기본.자막모양 === '굵은노랑' ? '#ffe600' : 'var(--ink)'; b.appendChild(s); b.appendChild(el('small', '', t.설명));
        b.addEventListener('click', function () { 선택.템플릿 = t.id; ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색'].forEach(function (k) { delete 선택[k]; }); if (!위치바꿈) 자막위치 = t.자막위치 || 자막위치; 갱신(); });
        g.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(선택.템플릿 === t.id)); });
      });
      var c2 = 카드('2. 글자 모양');
      var gm = el('div', 'cz-grid'); c2.appendChild(gm);
      모양들.forEach(function (m) { var b = el('button', 'cz-opt'); b.type = 'button'; var s = el('span', 'cz-sample', '가나다'); s.style.fontWeight = m[0] === '차분흰' ? '500' : '800'; s.style.color = m[0] === '굵은노랑' ? '#ffe600' : 'var(--ink)'; if (m[0] === '뉴스박스') { s.style.background = '#000a'; s.style.padding = '0 6px'; s.style.borderRadius = '4px'; } b.appendChild(s); b.appendChild(el('small', '', m[1]));
        b.addEventListener('click', function () { 선택.자막모양 = m[0]; 갱신(); }); gm.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(합치기(선택, 종류).값.자막모양 === m[0])); }); });
      var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '글꼴')); r1.appendChild(Object.assign(el('div', 'cz-chips'), {})); c2.appendChild(r1);
      칩묶음(r1.lastChild, 글꼴들, function () { return 합치기(선택, 종류).값.글꼴; }, function (v) { 선택.글꼴 = v; }, '글꼴');
      var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '단어 색')); c2.appendChild(r2); var cw = el('div', 'cz-chips'); r2.appendChild(cw);
      칩묶음(cw, 핵심들, function () { return 합치기(선택, 종류).값.핵심색; }, function (v) { 선택.핵심색 = v; }, '핵심 단어 색');
      c2.appendChild(el('p', 'cz-hint', '대본에서 중요한 단어에 이 색이 칠해져요'));
      var c3 = 카드('3. 크기와 줄', '가운데가 기본이에요');
      // 크기: 숫자 + 슬라이더(가운데=기본 77, 오른쪽=크게)
      var rs = el('div', 'cz-row'); rs.appendChild(el('label', '', '글자 크기')); var sl = el('input'); sl.type = 'range'; sl.min = -50; sl.max = 50; sl.step = 1; sl.setAttribute('aria-label', '글자 크기 (가운데가 기본)'); var nm = el('input'); nm.type = 'number'; nm.min = 20; nm.max = 200; nm.setAttribute('aria-label', '글자 크기 숫자'); rs.appendChild(sl); rs.appendChild(nm); c3.appendChild(rs);
      sl.addEventListener('input', function () { 선택.자막크기 = Math.round(수(기준값().자막크기 + Number(sl.value) * 0.84, 20, 200, 77)); 갱신(); });
      nm.addEventListener('input', function () { if (nm.value !== '') { 선택.자막크기 = Math.round(수(nm.value, 20, 200, 77)); 그리기미리보기(); sl.value = String(수((선택.자막크기 - 기준값().자막크기) / 0.84, -50, 50, 0)); } });
      nm.addEventListener('change', 갱신);
      눌림목록.push(function () { var s = 합치기(선택, 종류).값.자막크기; sl.value = String(수((s - 기준값().자막크기) / 0.84, -50, 50, 0)); if (document.activeElement !== nm) nm.value = String(s); });
      var rl = el('div', 'cz-row'); rl.appendChild(el('label', '', '줄 수')); var cl = el('div', 'cz-chips'); rl.appendChild(cl); c3.appendChild(rl);
      칩묶음(cl, [[1, '1줄'], [2, '2줄'], [3, '3줄']], function () { return 합치기(선택, 종류).값.줄수; }, function (v) { 선택.줄수 = v; }, '줄 수');
      var rw = el('div', 'cz-row'); rw.appendChild(el('label', '', '한 줄 길이')); var sw = el('input'); sw.type = 'range'; sw.min = -50; sw.max = 50; sw.step = 1; sw.setAttribute('aria-label', '한 줄 길이 (가운데가 기본)'); var nw = el('input'); nw.type = 'number'; nw.min = 50; nw.max = 100; nw.setAttribute('aria-label', '한 줄 길이 (화면 폭의 %)'); rw.appendChild(sw); rw.appendChild(nw); rw.appendChild(el('span', 'cz-hint', '% (화면 폭)')); c3.appendChild(rw);
      sw.addEventListener('input', function () { 선택.줄길이 = Math.round(수(기준값().줄길이 + Number(sw.value) * 0.0048, 0.5, 1, 0.76) * 100) / 100; 갱신(); });
      nw.addEventListener('input', function () { if (nw.value !== '') { 선택.줄길이 = Math.round(수(nw.value, 50, 100, 76)) / 100; 그리기미리보기(); sw.value = String(수((선택.줄길이 - 기준값().줄길이) / 0.0048, -50, 50, 0)); } });
      nw.addEventListener('change', 갱신);
      눌림목록.push(function () { var l = 합치기(선택, 종류).값.줄길이; sw.value = String(수((l - 기준값().줄길이) / 0.0048, -50, 50, 0)); if (document.activeElement !== nw) nw.value = String(Math.round(l * 100)); });
      var c5 = 카드('4. 고정 글자', '영상 내내 보이는 글 · 최대 4개 (선택)');
      var 목록칸 = el('div'); 목록칸.style.cssText = 'display:grid;gap:12px'; c5.appendChild(목록칸);
      var 추가 = el('button', 'cz-btn', '+ 글자 추가'); 추가.type = 'button'; c5.appendChild(추가);
      function 블록그리기() {
        목록칸.textContent = ''; 추가.disabled = 블록목록().length >= 4; 추가.style.opacity = 추가.disabled ? '.5' : '';
        블록목록().forEach(function (b, i) {
          var 칸 = el('div', 'cz-card'); 칸.style.background = 'var(--bg-input)';
          var 입력 = el('input'); 입력.type = 'text'; 입력.maxLength = 40; 입력.value = b.글 || ''; 입력.placeholder = '예: 봄맞이 우리 가게'; 입력.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' 내용'); 입력.style.cssText = 'min-height:44px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-md);padding:0 12px;font:inherit;width:100%;box-sizing:border-box';
          var 문제칸 = el('p', 'cz-hint'); 문제칸.style.color = 'var(--err)'; 문제칸.setAttribute('role', 'alert');
          입력.addEventListener('input', function () { b.글 = 입력.value; 문제칸.textContent = 블록검사()[i] || ''; 그리기미리보기(); 적용상태(); });
          칸.appendChild(입력); 칸.appendChild(문제칸); 문제칸.textContent = 블록검사()[i] || '';
          var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '자리')); var c = el('div', 'cz-chips'); r1.appendChild(c); 칸.appendChild(r1);
          [['위', '위'], ['가운데', '가운데'], ['아래', '아래']].forEach(function (it) { var k = el('button', 'cz-chip', it[1]); k.type = 'button'; k.setAttribute('aria-pressed', String(b.위치.기준 === it[0])); k.addEventListener('click', function () { b.위치.기준 = it[0]; 블록그리기(); 그리기미리보기(); }); c.appendChild(k); });
          function 슬라이더(이름, 읽기, 쓰기, 최소, 최대) { var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = 최소; sl.max = 최대; sl.value = 읽기(); sl.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' ' + 이름); sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 그리기미리보기(); }); r.appendChild(sl); 칸.appendChild(r); }
          슬라이더('위·아래 거리', function () { return Math.round(b.위치.거리 * 100); }, function (v) { b.위치.거리 = v / 100; }, 0, 45);
          슬라이더('왼쪽·오른쪽', function () { return Math.round(b.위치.가로 * 100); }, function (v) { b.위치.가로 = v / 100; }, 0, 100);
          var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '글자 크기')); var nm = el('input'); nm.type = 'number'; nm.min = 20; nm.max = 200; nm.value = b.크기; nm.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' 크기'); nm.addEventListener('input', function () { b.크기 = Math.round(수(nm.value, 20, 200, 60)); 그리기미리보기(); }); r2.appendChild(nm);
          var 모 = el('div', 'cz-chips'); 모양들.forEach(function (m) { var k = el('button', 'cz-chip', m[1]); k.type = 'button'; k.setAttribute('aria-pressed', String(b.모양 === m[0])); k.addEventListener('click', function () { b.모양 = m[0]; 블록그리기(); 그리기미리보기(); }); 모.appendChild(k); }); r2.appendChild(모); 칸.appendChild(r2);
          var 삭 = el('button', 'cz-btn', '이 글자 지우기'); 삭.type = 'button'; 삭.addEventListener('click', function () { 블록목록().splice(i, 1); 블록그리기(); 갱신(); 적용상태(); }); 칸.appendChild(삭);
          목록칸.appendChild(칸);
        });
      }
      추가.addEventListener('click', function () { if (블록목록().length >= 4) return; 블록목록().push({ 글: '', 위치: { 기준: '위', 거리: 0.15, 가로: 0.5 }, 크기: 60, 모양: '굵은흰', 글꼴: 'Noto Sans CJK KR' }); 블록그리기(); 갱신(); 적용상태(); });
      블록그리기();
      var c4 = 카드('5. 자막 위치');
      var rp = el('div', 'cz-chips'); c4.appendChild(rp);
      칩묶음(rp, 위치들, function () { return 자막위치; }, function (v) { 자막위치 = v; 위치바꿈 = true; }, '자막 위치');
    }

    function 닫기(결과) { document.removeEventListener('keydown', 키); document.body.style.overflow = 이전스크롤; ov.remove(); if (이전포커스 && 이전포커스.focus) 이전포커스.focus(); if (결과 && typeof opt.onDone === 'function') opt.onDone(결과); }
    function 키(e) {
      if (e.key === 'Escape') { e.preventDefault(); 닫기(null); return; }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(dlg.querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    x.addEventListener('click', function () { 닫기(null); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) 닫기(null); });
    gc.addEventListener('change', function () { 가이드켜짐 = gc.checked; 그리기미리보기(); });
    reset.addEventListener('click', function () { 선택 = {}; 자막위치 = '아래'; 위치바꿈 = false; 초기화함 = true; 갱신(); });
    function 적용상태() { var 막힘 = 블록검사().some(Boolean); ok.disabled = 막힘; ok.style.opacity = 막힘 ? '.5' : ''; ok.title = 막힘 ? '고정 글자의 쓸 수 없는 표현을 먼저 고쳐 주세요' : ''; }
    ok.addEventListener('click', function () { if (ok.disabled) return;
      if (선택.블록) { 선택.블록 = 선택.블록.filter(function (b) { return String(b.글 || '').trim(); }).map(function (b) { return { 글: String(b.글).trim(), 위치: b.위치, 크기: b.크기, 모양: b.모양, 글꼴: b.글꼴 }; }); if (!선택.블록.length) delete 선택.블록; }
      var m = 합치기(선택, 종류); 닫기({ compose: Object.assign({}, 선택), 자막위치: 자막위치, 화면구성: m.템플릿 ? m.템플릿.화면구성 : null, 위치바뀜: 자막위치 !== 처음위치, 초기화: 초기화함 && !Object.keys(선택).length && 자막위치 === '아래' }); });
    document.addEventListener('keydown', 키);
    var 이전스크롤 = document.body.style.overflow; document.body.style.overflow = 'hidden'; dlg.tabIndex = -1;
    document.body.appendChild(ov); dlg.focus();
    템플릿불러오기().then(function () { 만들기(); 갱신(); 적용상태(); x.focus(); });
  }

  window.RWCompose = { open: open, 요약: 요약, 불러오기: 템플릿불러오기, 합치기: 합치기 };
})();
