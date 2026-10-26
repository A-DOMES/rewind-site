/* 영상 꾸미기(RWCompose): 템플릿 고르기 → 글자·크기·줄 조절 → 결과를 콜백으로 돌려준다.
 * 값은 서버 영상구성과 같은 이름(템플릿·자막모양·글꼴·자막크기·줄수·줄길이·핵심색). 건드린 값만 돌려준다(안 건드린 것은 서버 기본·템플릿 기본).
 * 좌표·가이드는 서버와 같은 shared/layout.js(RWLayout), 템플릿은 shared/templates-shorts.json 사본을 쓴다. 고객 글자는 항상 textContent 로만 넣는다.
 */
(function () {
  'use strict';
  var VER = '?v=20261030';
  var 기본 = { 자막모양: '굵은흰', 글꼴: 'Noto Sans CJK KR', 자막크기: 77, 줄수: 1, 줄길이: 0.76, 핵심색: '없음' };
  // 글자 모양: 서버 styles.js 모양들과 같은 이름(site_sync_test 가 맞는지 본다). 세 번째 값은 미리보기용 겉모습
  var 모양들 = [['굵은흰', '굵은 흰색', { c: '#fff', s: '1.2px #000', w: 800 }], ['굵은노랑', '굵은 노랑', { c: '#ffe600', s: '1.2px #000', w: 800 }], ['차분흰', '차분한 흰색', { c: '#fff', s: '0.5px #000', w: 500 }], ['뉴스박스', '뉴스 박스', { c: '#fff', s: '0', w: 800, bg: 'rgba(0,0,0,.75)' }],
    ['굵은하늘', '굵은 하늘색', { c: '#4dc3ff', s: '1.2px #000', w: 800 }], ['굵은분홍', '굵은 분홍', { c: '#ff4d8d', s: '1.2px #000', w: 800 }], ['부드러운그림자', '부드러운 그림자', { c: '#fff', s: '0', w: 800, sh: '0 .06em .16em rgba(0,0,0,.9)' }], ['흰박스', '흰 박스', { c: '#141414', s: '0', w: 800, bg: '#fff' }], ['노랑박스', '노랑 박스', { c: '#141414', s: '0', w: 800, bg: '#ffe600' }]];
  function 모양겉(id) { var m = 모양들.find(function (x) { return x[0] === id; }); return (m || 모양들[0])[2]; }
  var 두꺼운글꼴 = ['Black Han Sans', 'Do Hyeon', 'Jua'];   // 이미 굵은 글꼴: 굵게를 켜지 않는다(서버 굵게끔과 같음)
  function 글꼴불러오기() {   // 미리보기용 웹폰트(영상은 서버 글꼴을 쓴다). 한 번만
    if (document.getElementById('cz-fonts')) return;
    var l = document.createElement('link'); l.id = 'cz-fonts'; l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Do+Hyeon&family=Jua&family=Gowun+Batang:wght@400;700&family=Noto+Sans+KR:wght@500;800&family=Noto+Serif+KR:wght@400;700&display=swap'; document.head.appendChild(l);
  }
  var 글꼴들 = [['Noto Sans CJK KR', '고딕', "'Noto Sans KR','Noto Sans CJK KR',sans-serif"], ['Noto Serif KR', '명조', "'Noto Serif KR','Noto Serif CJK KR',serif"], ['Black Han Sans', '굵은 제목', "'Black Han Sans','Noto Sans KR',sans-serif"], ['Do Hyeon', '도현체', "'Do Hyeon','Noto Sans KR',sans-serif"], ['Jua', '주아체', "'Jua','Noto Sans KR',sans-serif"], ['Gowun Batang', '고운바탕', "'Gowun Batang','Noto Serif KR',serif"]];
  var 핵심들 = [['없음', '없음', ''], ['분홍', '분홍', '#ff4d8d'], ['노랑', '노랑', '#ffe14d'], ['초록', '초록', '#2ee6a6'], ['하늘', '하늘', '#4dc3ff'], ['주황', '주황', '#ff9a3d'], ['보라', '보라', '#b58cff'], ['빨강', '빨강', '#ff4d4d'], ['연두', '연두', '#9be83d'], ['민트', '민트', '#4dffe0'], ['흰색', '흰색', '#ffffff']];   // 앞의 세 가지가 기본. 서버 핵심색표와 같은 이름·색(site_sync_test)
  var 헥스 = /^#[0-9a-f]{6}$/i;
  function 밝기(h) { var n = parseInt(h.slice(1), 16), f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); }
  var 위치들 = [['위', '위'], ['가운데', '가운데'], ['아래', '아래']];
  var 화면설명 = { '자동': '알아서 정해 줘요', '제목고정형': '위에 제목 띠', '전체화면형': '장면 가득', '자막바형': '아래 띠 자막', '가운데영상형': '가운데 영상' };
  // 화면 구성 그림(아주 작은 세로 화면). 고정된 도형만 쓴다(고객 글자 없음). 색은 compose.css 의 .cz-lay 클래스가 정한다
  var 화면그림 = {
    '제목고정형': '<rect class="bd" x="0" y="0" width="54" height="19"/><rect class="ac" x="12" y="5" width="30" height="3.2" rx="1.6"/><rect class="ac" x="17" y="11" width="20" height="3.2" rx="1.6"/><rect class="ph" x="0" y="19" width="54" height="77"/><circle class="sn" cx="38" cy="38" r="6"/><path class="hl" d="M0 76 L16 56 L28 68 L38 58 L54 78 L54 96 L0 96Z"/><rect class="tx" x="10" y="56" width="34" height="3.4" rx="1.7"/><rect class="tx" x="15" y="63" width="24" height="3.4" rx="1.7"/>',
    '전체화면형': '<rect class="ph" x="0" y="0" width="54" height="96"/><circle class="sn" cx="38" cy="22" r="7"/><path class="hl" d="M0 70 L16 46 L28 60 L38 48 L54 72 L54 96 L0 96Z"/><rect class="tx" x="10" y="66" width="34" height="3.4" rx="1.7"/><rect class="tx" x="15" y="73" width="24" height="3.4" rx="1.7"/>',
    '자막바형': '<rect class="ph" x="0" y="0" width="54" height="96"/><circle class="sn" cx="38" cy="22" r="7"/><path class="hl" d="M0 70 L16 46 L28 60 L38 48 L54 72 L54 96 L0 96Z"/><rect class="bar" x="0" y="60" width="54" height="22"/><rect class="dk" x="9" y="65" width="36" height="3.4" rx="1.7"/><rect class="dk" x="15" y="72" width="24" height="3.4" rx="1.7"/>',
    '가운데영상형': '<rect class="ph blur" x="0" y="0" width="54" height="96"/><rect class="ac" x="12" y="6" width="30" height="3.2" rx="1.6"/><rect class="ac" x="17" y="12" width="20" height="3.2" rx="1.6"/><rect class="mid" x="0" y="23" width="54" height="34"/><circle class="sn" cx="38" cy="33" r="5"/><path class="hl" d="M0 57 L14 44 L24 52 L34 45 L54 57Z"/><rect class="tx" x="10" y="46" width="34" height="3.2" rx="1.6"/><rect class="tx" x="15" y="52" width="24" height="3.2" rx="1.6"/>' };
  var 샘플기본 = '보기보다 훨씬 많이 들어가요. 하루 종일 들고 다녀도 어깨가 편해요';
  var 템플릿목록 = null, 불러옴 = null;
  // 제목 줄 나누기·폭 추정: 서버 render.js 의 문구줄(10자 이하 한 줄, 아니면 가운데 공백/반반)·글줄폭과 같은 규칙의 근사
  function 제목줄(문구) {
    var ch = Array.from(String(문구 || '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()).slice(0, 18); if (ch.length <= 10) return [ch.join('')];
    var 최적 = -1, 차 = 1e9; ch.forEach(function (c, i) { if (c === ' ') { var a = i, b = ch.length - i - 1; if (a >= 1 && b >= 1 && a <= 10 && b <= 10 && Math.abs(a - b) < 차) { 차 = Math.abs(a - b); 최적 = i; } } });
    if (최적 > 0) return [ch.slice(0, 최적).join(''), ch.slice(최적 + 1).join('')];
    var m = Math.ceil(ch.length / 2); return [ch.slice(0, m).join('').trim(), ch.slice(m).join('').trim()];
  }
  function 제목폭(줄) { return Array.from(줄).reduce(function (a, c) { return a + (/[가-힣ㄱ-ㅎㅏ-ㅣ\u3000-\u9fff]/.test(c) ? 0.66 : /[A-Z]/.test(c) ? 0.46 : /[a-z]/.test(c) ? 0.38 : c === ' ' ? 0.3 : 0.5); }, 0) * 1.06; }

  function 템플릿불러오기() {
    if (불러옴) return 불러옴;
    var 읽기 = function (f) { return fetch('./assets/shared/' + f + VER).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }); };
    불러옴 = Promise.all([읽기('templates-shorts.json'), 읽기('templates-long.json')]).then(function (t) { return (템플릿목록 = [].concat(Array.isArray(t[0]) ? t[0] : [], Array.isArray(t[1]) ? t[1] : [])); });
    return 불러옴;
  }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var 수 = function (x, a, b, d) { x = Number(x); return Number.isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };

  // 고른 값 + 템플릿 기본 + 기본값 → 실제로 보이는 값
  var 현재가로 = false;   // 가로 영상은 줄 길이 기본이 화면 폭의 88%(서버와 같음)
  function 합치기(선택, 종류) {
    var t = (템플릿목록 || []).find(function (x) { return x.id === 선택.템플릿 && (!종류 || x.종류.indexOf(종류) >= 0); });
    var 값 = Object.assign({}, 기본, 현재가로 ? { 줄길이: 0.88 } : {}, t ? t.기본 : {});
    ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색', '자막거리', '자막가로', '자막끄기', '제목높이', '제목크기', '제목위', '제목가로'].forEach(function (k) { if (선택[k] !== undefined) 값[k] = 선택[k]; });
    if (t && t.허용스타일 && t.허용스타일.indexOf(값.자막모양) < 0) 값.자막모양 = t.기본.자막모양;
    return { 값: 값, 템플릿: t || null };
  }

  function 요약(선택, 보조) {
    선택 = 선택 || {}; 보조 = 보조 || {};
    var 조각 = [];
    if (보조.화면구성 && 보조.화면구성 !== '자동') 조각.push(보조.화면구성.replace('형', ''));
    if (보조.자막위치 && 보조.자막위치 !== '하단' && 보조.자막위치 !== '자동') 조각.push('자막 ' + 보조.자막위치);
    var t = (템플릿목록 || []).find(function (x) { return x.id === 선택.템플릿; });
    if (선택.템플릿) 조각.push(t ? t.이름 : '템플릿');
    if (선택.자막모양) 조각.push((모양들.find(function (x) { return x[0] === 선택.자막모양; }) || [0, 선택.자막모양])[1]);
    if (선택.자막크기) 조각.push('크기 ' + 선택.자막크기);
    if (선택.제목높이 !== undefined || 선택.제목크기 !== undefined || 선택.제목위 !== undefined || 선택.제목가로 !== undefined) 조각.push('제목 모양 바꿈');
    if (선택.줄수) 조각.push(선택.줄수 + '줄');
    if (선택.자막위치 && 선택.자막위치 !== '아래') 조각.push('자막 ' + 선택.자막위치);
    if (선택.자막끄기) 조각.push('자막 끄기');
    else if (선택.자막거리 !== undefined || 선택.자막가로 !== undefined) 조각.push('자막 자리 바꿈');
    if (선택.블록 && 선택.블록.length) 조각.push('고정 글자 ' + 선택.블록.length + '개');
    return 조각.length ? 조각.join(' · ') : '기본 모양 (바꾸지 않았어요)';
  }

  function open(opt) {
    opt = opt || {};
    var 종류 = opt.종류 || '쇼츠', 가로 = opt.화면 === '가로'; 현재가로 = 가로;
    var 화면목록 = (Array.isArray(opt.화면목록) ? opt.화면목록 : []).filter(function (x) { return x.값 !== '자동'; }); if (!화면목록.length) 화면목록 = [{ 값: '전체화면형' }];   // '자동'은 고르는 칸에서 뺐다
    function 기본화면() { var 후보 = 종류 === '상품쇼츠' ? ['가운데영상형', '제목고정형'] : ['제목고정형']; for (var i = 0; i < 후보.length; i++) if (화면목록.some(function (x) { return x.값 === 후보[i] && !x.꺼짐; })) return 후보[i]; return (화면목록.filter(function (x) { return !x.꺼짐; })[0] || 화면목록[0]).값; }
    var 화면 = 화면목록.some(function (x) { return x.값 === opt.화면구성 && !x.꺼짐; }) ? opt.화면구성 : 기본화면(), 문구샘플 = String(opt.문구 || '').trim() || '화면 위 제목 문구';
    function 화면가능(v) { return 화면목록.some(function (x) { return x.값 === v && !x.꺼짐; }); }
    var 화면바꿈 = false; var 선택 = Object.assign({}, opt.값 || {}); var 자막위치 = opt.자막위치 || '아래'; var 처음위치 = 자막위치, 위치바꿈 = false, 초기화함 = false; var 가이드켜짐 = true;
    var 샘플 = String(opt.샘플 || '').trim() || 샘플기본;
    글꼴불러오기();
    var 이전포커스 = document.activeElement;
    var W = 가로 ? 1920 : 1080, H = 가로 ? 1080 : 1920;

    var ov = el('div', 'cz-ov'); ov.setAttribute('role', 'presentation');
    var dlg = el('div', 'cz-dlg'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'cz-title');
    var head = el('div', 'cz-head'); var ht = el('div'); var h2 = el('h2', '', '영상 꾸미기'); h2.id = 'cz-title'; ht.appendChild(h2); ht.appendChild(el('small', '', '마음에 드는 모양을 고르고, 필요하면 조금만 고쳐 보세요'));
    var x = el('button', 'cz-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '닫기'); head.appendChild(ht); head.appendChild(x);
    var pv = el('div', 'cz-pv'); var phone = el('div', 'cz-phone' + (가로 ? ' cz-wide' : '')); var bg = el('div', 'cz-bg'); phone.appendChild(bg);
    var gbox = el('div'); gbox.style.cssText = 'position:absolute;inset:0'; phone.appendChild(gbox);
    var ttl = el('div'); ttl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:18.4%;background:#15110e;display:none;overflow:hidden'; var ttx = el('div'); ttx.style.cssText = 'position:absolute;transform:translateX(-50%);text-align:center;font-weight:800;white-space:pre'; ttl.appendChild(ttx); phone.appendChild(ttl);
    var ctr = el('div', 'cz-ctr'); ctr.style.display = 'none'; phone.insertBefore(ctr, gbox);
    var sub = el('div', 'cz-sub'); phone.appendChild(sub); var blk = el('div'); blk.style.cssText = 'position:absolute;inset:0;pointer-events:none'; phone.appendChild(blk);
    var tools = el('div', 'cz-pvtools'); var gl = el('label'); var gc = el('input'); gc.type = 'checkbox'; gc.checked = true; gl.appendChild(gc); gl.appendChild(document.createTextNode(' 유튜브가 쓰는 자리 점선으로 보기')); tools.appendChild(gl);
    var warn = el('ul', 'cz-warn'); warn.setAttribute('aria-live', 'polite');
    pv.appendChild(phone); pv.appendChild(tools); pv.appendChild(warn); pv.appendChild(el('p', 'cz-note', '실제 영상은 조금 다를 수 있어요. 점선 자리를 침범해도 만들 수 있어요.'));
    var body = el('div', 'cz-body');
    var foot = el('div', 'cz-foot'); var reset = el('button', 'cz-btn', '처음 모양으로'); reset.type = 'button'; var ok = el('button', 'cz-btn cz-main', '적용하기'); ok.type = 'button'; foot.appendChild(reset); foot.appendChild(ok);
    dlg.appendChild(head); dlg.appendChild(pv); dlg.appendChild(body); dlg.appendChild(foot); ov.appendChild(dlg);

    function 그리기미리보기() {
      var m = 합치기(선택, 종류), v = m.값;
      var 제목형 = !가로 && 화면 === '제목고정형', 띠형 = !가로 && 화면 === '자막바형', 가운데형 = !가로 && 화면 === '가운데영상형';
      ttl.style.display = 제목형 || 가운데형 ? 'block' : 'none';
      var 줄들 = 제목줄(문구샘플), 상자 = RWLayout.제목상자(W, H, { 줄수: 줄들.length, 최대폭: Math.max.apply(null, 줄들.map(제목폭).concat([1])), 띠: 제목형, 높이: v.제목높이, 크기: v.제목크기, 위: v.제목위, 가로: v.제목가로 });
      ttl.style.background = 가운데형 ? 'transparent' : '#15110e'; ttl.style.height = 가운데형 ? '20%' : (상자.띠 / H * 100) + '%';
      ttx.textContent = 줄들.join('\n'); ttx.style.color = 가운데형 ? '#fff' : '#ffe600'; ttx.style.textShadow = 가운데형 ? '0 1px 4px rgba(0,0,0,.8)' : 'none';
      ttx.style.fontSize = (상자.크기 * 0.66 / W * 100) + 'cqw'; ttx.style.lineHeight = (상자.크기 / W * 100) + 'cqw';   // ASS 의 크기는 줄 높이, 한글 폭은 그 0.66배(서버 render.js 글자폭과 같음)
       ttx.style.left = (상자.x / W * 100) + '%'; ttx.style.top = ((제목형 ? 상자.위 : H * 0.133) / H * 100) + '%';
      ctr.style.display = 가운데형 ? 'block' : 'none'; bg.style.filter = 가운데형 ? 'blur(5px) brightness(.7)' : ''; bg.style.transform = 가운데형 ? 'scale(1.12)' : '';
      var box = RWLayout.자막상자(W, H, { 위치: 자막위치, 크기: v.자막크기 * Math.min(W, H) / 1080, 줄수: v.줄수, 줄길이: v.줄길이, 거리: v.자막거리, 가로: v.자막가로, 안전영역: !가로 });
      sub.style.cssText = 'left:' + ((box.x + box.w / 2) / W * 100) + '%;top:' + (box.y / H * 100) + '%;width:' + (box.w / W * 100) + '%;height:' + (box.h / H * 100) + '%;font-size:' + (v.자막크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;display:' + (v.자막끄기 ? 'none' : 'flex') + ';flex-direction:column;justify-content:flex-end;overflow:hidden;';   // 줄 칸을 잡고 글은 아래 칸부터 채운다
      sub.style.fontFamily = (글꼴들.find(function (g) { return g[0] === v.글꼴; }) || 글꼴들[0])[2];
      var 겉 = 모양겉(v.자막모양);
      sub.style.fontWeight = 두꺼운글꼴.indexOf(v.글꼴) >= 0 ? '500' : String(겉.w);
      sub.style.color = 겉.c;
      sub.style.webkitTextStroke = 겉.s; sub.style.paintOrder = 'stroke fill'; sub.style.textShadow = 겉.sh || 'none';
      if (띠형) { v = Object.assign({}, v, { 자막모양: '굵은흰' }); }
      sub.textContent = ''; var 글줄 = el('div'); 글줄.style.cssText = 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + v.줄수 + ';overflow:hidden;width:fit-content;align-self:center;max-width:100%;background:' + (띠형 ? '#e2a23c' : (겉.bg || 'none')) + (띠형 ? ';color:#1a1410;-webkit-text-stroke:0;padding:.3em .6em;width:100%' : ''); sub.appendChild(글줄);
      var 핵 = 핵심들.find(function (h) { return h[0] === v.핵심색; }), 핵색 = 헥스.test(v.핵심색) ? v.핵심색 : (핵 && 핵[2]);
      var 줄 = 샘플.split(/(\s+)/); var 강조 = false;
      줄.forEach(function (w, i) { var s = el('span', '', w); if (핵색 && i === 2) s.style.color = 핵색; 글줄.appendChild(s); });
      gbox.textContent = '';
      if (가이드켜짐) RWLayout.가이드(W, H).forEach(function (g) { var d = el('div', 'cz-g'); d.style.cssText = 'left:' + (g.x / W * 100) + '%;top:' + (g.y / H * 100) + '%;width:' + (g.w / W * 100) + '%;height:' + (g.h / H * 100) + '%'; d.appendChild(el('span', '', g.이름)); gbox.appendChild(d); });
      blk.textContent = '';
      var 문제들 = 블록검사(), 블록경고 = [];
      블록목록().forEach(function (b, i) {
        var 글자 = (window.RWPhrase ? RWPhrase.블록글정리(b.글) : String(b.글 || '').trim()); if (!글자 || 문제들[i]) return;
        var px = b.크기 * Math.min(W, H) / 1080, bs = RWLayout.블록상자(W, H, b.위치, px, Math.max(1, Math.ceil([].concat(글자).join('').length * 0.66 * px / (W * 0.9))));
        var d = el('div', 'cz-sub', 글자); d.style.cssText = 'left:' + (bs.cx / W * 100) + '%;top:' + (bs.y / H * 100) + '%;width:' + (bs.w / W * 100) + '%;font-size:' + (b.크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;font-weight:' + 모양겉(b.모양).w + ';color:' + (헥스.test(b.색 || '') ? b.색 : 모양겉(b.모양).c) + ';-webkit-text-stroke:' + 모양겉(b.모양).s + ';paint-order:stroke fill;text-shadow:' + (모양겉(b.모양).sh || 'none') + ';background:' + (모양겉(b.모양).bg || 'none') + ';font-family:' + (글꼴들.find(function (g) { return g[0] === b.글꼴; }) || 글꼴들[0])[2];
        blk.appendChild(d);
        if (RWLayout.가이드(W, H).some(function (g) { return RWLayout.겹침비(bs, g) > 0.1; })) 블록경고.push('고정 글자 ' + (i + 1) + '번이 유튜브가 쓰는 자리와 겹쳐요. 그대로 만들 수 있어요');
      });
      warn.textContent = '';
      var 글 = 블록경고;
      if (핵색 && 밝기(핵색) < 0.12) 글.push('단어 색이 어두워서 어두운 장면에서는 잘 안 보일 수 있어요');
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
      var c1 = 카드('모양 고르기', '골라 두면 아래 값이 알맞게 채워져요');
      var g = el('div', 'cz-grid'); c1.appendChild(g);
      var 직접 = el('button', 'cz-opt'); 직접.type = 'button'; 직접.appendChild(el('b', '', '직접 꾸미기')); 직접.appendChild(el('small', '', '템플릿 없이 아래에서 하나씩 정해요'));
      직접.addEventListener('click', function () { delete 선택.템플릿; 갱신(); }); g.appendChild(직접); 눌림목록.push(function () { 직접.setAttribute('aria-pressed', String(!선택.템플릿)); });
      (템플릿목록 || []).filter(function (t) { return t.종류.indexOf(종류) >= 0; }).forEach(function (t) {
        var b = el('button', 'cz-opt'); b.type = 'button'; b.appendChild(el('b', '', t.이름)); var s = el('span', 'cz-sample', '가나다'); s.style.color = 모양겉(t.기본.자막모양).c === '#fff' || 모양겉(t.기본.자막모양).bg ? 'var(--ink)' : 모양겉(t.기본.자막모양).c; s.style.fontFamily = (글꼴들.find(function (g) { return g[0] === t.기본.글꼴; }) || 글꼴들[0])[2]; b.appendChild(s); b.appendChild(el('small', '', t.설명));
        b.addEventListener('click', function () { 선택.템플릿 = t.id; if (화면가능(t.화면구성)) { 화면 = t.화면구성; 화면바꿈 = true; } ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색'].forEach(function (k) { delete 선택[k]; }); if (!위치바꿈) 자막위치 = t.자막위치 || 자막위치; 갱신(); });
        g.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(선택.템플릿 === t.id)); });
      });
      if (화면목록.length > 1 && !가로) {   // 화면 구성: 미리보기 아래에 그림 카드로 둔다
        var 판 = el('section', 'cz-lay'); 판.appendChild(el('h3', '', '화면 구성')); var 줄 = el('div', 'cz-lay-row'); 줄.style.gridTemplateColumns = 'repeat(' + Math.min(4, 화면목록.length) + ', minmax(0, 1fr))'; 줄.setAttribute('role', 'group'); 줄.setAttribute('aria-label', '화면 구성'); 판.appendChild(줄);
        화면목록.forEach(function (it) {
          var b = el('button', 'cz-lay-b'); b.type = 'button'; b.disabled = !!it.꺼짐; b.title = 화면설명[it.값] || '';
          var 그림 = el('span', 'cz-lay-pic'); 그림.innerHTML = '<svg viewBox="0 0 54 96" aria-hidden="true" focusable="false">' + (화면그림[it.값] || '<rect class="ph" width="54" height="96"/>') + '</svg>';
          b.appendChild(그림); b.appendChild(el('b', '', it.값.replace('형', ''))); b.appendChild(el('small', '', 화면설명[it.값] || ''));
          b.addEventListener('click', function () { 화면 = it.값; 화면바꿈 = true; 갱신(); }); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(화면 === it.값)); }); 줄.appendChild(b);
        });
        pv.appendChild(판);
      }
      // 제목 설정: 위쪽 제목 띠(제목고정형)·제목 글자(제목고정형·가운데영상형). 슬라이더는 모두 가운데가 기본이다
      var c1b = 카드('제목 설정', '위쪽 문구의 띠와 글자'); var 제목행들 = [];
      function 제목슬라이더(이름, 키, 기본, 변환, 역변환, 띠만) {
        var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = -50; sl.max = 50; sl.step = 1; sl.setAttribute('aria-label', '제목 ' + 이름 + ' (가운데가 기본)');
        sl.addEventListener('input', function () { if (Number(sl.value) === 0) delete 선택[키]; else 선택[키] = 변환(Number(sl.value)); 갱신(); }); r.appendChild(sl); c1b.appendChild(r);   // 가운데(0)는 건드리지 않은 것과 같다
        눌림목록.push(function () { var v = 합치기(선택, 종류).값[키]; sl.value = String(v === undefined ? 0 : Math.round(수(역변환(v), -50, 50, 0))); });
        제목행들.push({ r: r, 띠만: !!띠만 });
      }
      var 선형 = function (기준, 아래폭, 위폭) { return [function (v) { return Math.round((기준 + v * (v < 0 ? 아래폭 : 위폭) / 50) * 1000) / 1000; }, function (x) { return (x - 기준) / ((x < 기준 ? 아래폭 : 위폭) / 50); }]; };
      var 높이식 = 선형(0.184, 0.084, 0.116), 크기식 = 선형(1, 0.5, 0.3);
      제목슬라이더('띠 높이', '제목높이', 0.184, 높이식[0], 높이식[1], true);
      제목슬라이더('글자 크기', '제목크기', 1, 크기식[0], 크기식[1]);
      제목슬라이더('위·아래', '제목위', 0.5, function (v) { return Math.round((0.5 + v / 100) * 100) / 100; }, function (x) { return (x - 0.5) * 100; }, true);
      제목슬라이더('왼쪽·오른쪽', '제목가로', 0.5, function (v) { return Math.round((0.5 + v / 100) * 100) / 100; }, function (x) { return (x - 0.5) * 100; });
      c1b.appendChild(el('p', 'cz-hint', '띠 높이를 바꾸면 글자가 띠에 맞춰져요. 글자는 띠 밖으로 나가지 않아요'));
      눌림목록.push(function () { var 보임 = !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'); c1b.style.display = 보임 ? '' : 'none'; 제목행들.forEach(function (h) { h.r.style.display = h.띠만 && 화면 !== '제목고정형' ? 'none' : ''; }); });
      var c2 = 카드('자막 글자 모양');
      var gm = el('div', 'cz-grid'); c2.appendChild(gm);
      모양들.forEach(function (m) { var b = el('button', 'cz-opt'); b.type = 'button'; var s = el('span', 'cz-sample', '가나다'); s.style.fontWeight = String(m[2].w); s.style.color = m[2].c === '#fff' ? 'var(--ink)' : m[2].c; s.style.textShadow = m[2].c === '#fff' ? 'none' : '0 0 1px #0006'; if (m[2].bg) { s.style.background = m[2].bg === 'rgba(0,0,0,.75)' ? '#000a' : m[2].bg; s.style.color = m[2].bg === 'rgba(0,0,0,.75)' ? '#fff' : m[2].c; s.style.padding = '0 6px'; s.style.borderRadius = '4px'; } b.appendChild(s); b.appendChild(el('small', '', m[1]));
        b.addEventListener('click', function () { 선택.자막모양 = m[0]; 갱신(); }); gm.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(합치기(선택, 종류).값.자막모양 === m[0])); }); });
      var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '글꼴')); r1.appendChild(Object.assign(el('div', 'cz-chips'), {})); c2.appendChild(r1);
      칩묶음(r1.lastChild, 글꼴들, function () { return 합치기(선택, 종류).값.글꼴; }, function (v) { 선택.글꼴 = v; }, '글꼴');
      var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '단어 색')); c2.appendChild(r2); var cw = el('div', 'cz-chips'); r2.appendChild(cw);
      var 현재핵 = function () { return 합치기(선택, 종류).값.핵심색; };
      핵심들.forEach(function (h) { var b = el('button', 'cz-chip'); b.type = 'button'; b.title = h[1]; if (h[2]) { var d = el('span'); d.style.cssText = 'display:inline-block;width:.9em;height:.9em;border-radius:50%;margin-right:.35em;vertical-align:-.1em;border:1px solid #0004;background:' + h[2]; b.appendChild(d); } b.appendChild(document.createTextNode(h[1])); b.addEventListener('click', function () { 선택.핵심색 = h[0]; 갱신(); }); cw.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(현재핵() === h[0])); }); });
      var 직접색 = el('label', 'cz-chip'); 직접색.style.cursor = 'pointer'; 직접색.appendChild(document.createTextNode('직접 고르기 ')); var ci = el('input'); ci.type = 'color'; ci.value = '#ff4d8d'; ci.setAttribute('aria-label', '단어 색 직접 고르기'); ci.style.cssText = 'width:1.6em;height:1.2em;padding:0;border:0;background:none;vertical-align:middle;cursor:pointer'; 직접색.appendChild(ci);
      ci.addEventListener('input', function () { 선택.핵심색 = ci.value.toUpperCase(); 갱신(); }); cw.appendChild(직접색); 눌림목록.push(function () { 직접색.setAttribute('aria-pressed', String(헥스.test(현재핵()))); if (헥스.test(현재핵())) ci.value = 현재핵().toLowerCase(); });
      c2.appendChild(el('p', 'cz-hint', '대본에서 중요한 단어에 이 색이 칠해져요'));
      var c3 = 카드('자막 크기와 줄', '가운데가 기본이에요');
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
      var c4 = 카드('자막 위치', '자막이 나올 자리');
      var rp = el('div', 'cz-chips'); c4.appendChild(rp);
      칩묶음(rp, 위치들, function () { return 자막위치; }, function (v) { 자막위치 = v; 위치바꿈 = true; }, '자막 위치');
      function 자막슬라이더(이름, 키, 읽기, 쓰기, 최소, 최대, 보임) {
        var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = 최소; sl.max = 최대; sl.setAttribute('aria-label', '자막 ' + 이름);
        sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 그리기미리보기(); }); r.appendChild(sl); c4.appendChild(r);
        눌림목록.push(function () { sl.value = String(읽기()); r.style.display = 보임 && !보임() ? 'none' : ''; sl.disabled = !!합치기(선택, 종류).값.자막끄기; });
      }
      var 기본거리 = function () { return Math.round((자막위치 === '위' ? (가로 ? 0.07 : 0.13) : (가로 ? 0.07 : 0.22)) * 100); };
      자막슬라이더('위·아래 거리', '자막거리', function () { return 선택.자막거리 !== undefined ? Math.round(선택.자막거리 * 100) : 기본거리(); }, function (v) { 선택.자막거리 = v / 100; }, 0, 45, function () { return 자막위치 !== '가운데'; });
      자막슬라이더('왼쪽·오른쪽', '자막가로', function () { return 선택.자막가로 !== undefined ? Math.round(선택.자막가로 * 100) : 50; }, function (v) { 선택.자막가로 = v / 100; }, 0, 100);
      var rk = el('div', 'cz-row'); rk.appendChild(el('label', '', '자막')); var ck = el('div', 'cz-chips'); rk.appendChild(ck); c4.appendChild(rk);
      [[false, '보이기'], [true, '끄기']].forEach(function (it) { var b = el('button', 'cz-chip', it[1]); b.type = 'button'; b.addEventListener('click', function () { if (it[0]) 선택.자막끄기 = true; else delete 선택.자막끄기; 갱신(); }); ck.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(!!선택.자막끄기 === it[0])); }); });
      c4.appendChild(el('p', 'cz-hint', '자막을 끄면 목소리만 나오고 고정 글자는 그대로 보여요'));
      var c5 = 카드('고정 글자', '영상 내내 보이는 글 · 최대 4개 (선택)');
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
          var r3 = el('div', 'cz-row'); r3.appendChild(el('label', '', '글자 색')); var 색칸 = el('div', 'cz-chips'); r3.appendChild(색칸);
          var 기본색 = el('button', 'cz-chip', '모양 기본'); 기본색.type = 'button'; 기본색.setAttribute('aria-pressed', String(!헥스.test(b.색 || ''))); 기본색.addEventListener('click', function () { delete b.색; 블록그리기(); 그리기미리보기(); }); 색칸.appendChild(기본색);
          var 직접 = el('label', 'cz-chip'); 직접.style.cursor = 'pointer'; 직접.setAttribute('aria-pressed', String(헥스.test(b.색 || ''))); 직접.appendChild(document.createTextNode('직접 고르기 ')); var 입 = el('input'); 입.type = 'color'; 입.value = 헥스.test(b.색 || '') ? b.색.toLowerCase() : '#ffffff'; 입.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' 글자 색 직접 고르기'); 입.style.cssText = 'width:1.6em;height:1.2em;padding:0;border:0;background:none;vertical-align:middle;cursor:pointer';
          입.addEventListener('input', function () { b.색 = 입.value.toUpperCase(); 직접.setAttribute('aria-pressed', 'true'); 기본색.setAttribute('aria-pressed', 'false'); 그리기미리보기(); }); 직접.appendChild(입); 색칸.appendChild(직접); 칸.appendChild(r3);
          var 삭 = el('button', 'cz-btn', '이 글자 지우기'); 삭.type = 'button'; 삭.addEventListener('click', function () { 블록목록().splice(i, 1); 블록그리기(); 갱신(); 적용상태(); }); 칸.appendChild(삭);
          목록칸.appendChild(칸);
        });
      }
      추가.addEventListener('click', function () { if (블록목록().length >= 4) return; 블록목록().push({ 글: '', 위치: { 기준: '위', 거리: 0.15, 가로: 0.5 }, 크기: 60, 모양: '굵은흰', 글꼴: 'Noto Sans CJK KR' }); 블록그리기(); 갱신(); 적용상태(); });
      블록그리기();
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
    reset.addEventListener('click', function () { 선택 = {}; 화면 = 기본화면(); 화면바꿈 = false; 자막위치 = '아래'; 위치바꿈 = false; 초기화함 = true; 갱신(); });
    function 적용상태() { var 막힘 = 블록검사().some(Boolean); ok.disabled = 막힘; ok.style.opacity = 막힘 ? '.5' : ''; ok.title = 막힘 ? '고정 글자의 쓸 수 없는 표현을 먼저 고쳐 주세요' : ''; }
    ok.addEventListener('click', function () { if (ok.disabled) return;
      if (선택.블록) { 선택.블록 = 선택.블록.filter(function (b) { return String(b.글 || '').trim(); }).map(function (b) { return Object.assign({ 글: String(b.글).trim(), 위치: b.위치, 크기: b.크기, 모양: b.모양, 글꼴: b.글꼴 }, 헥스.test(b.색 || '') ? { 색: b.색 } : {}); }); if (!선택.블록.length) delete 선택.블록; }
      var m = 합치기(선택, 종류); 닫기({ compose: Object.assign({}, 선택), 자막위치: 자막위치, 화면구성: 화면바꿈 ? 화면 : (opt.화면구성 || 화면), 위치바뀜: 자막위치 !== 처음위치, 초기화: 초기화함 && !Object.keys(선택).length && 자막위치 === '아래' }); });
    document.addEventListener('keydown', 키);
    var 이전스크롤 = document.body.style.overflow; document.body.style.overflow = 'hidden'; dlg.tabIndex = -1;
    document.body.appendChild(ov); dlg.focus();
    템플릿불러오기().then(function () { 만들기(); 갱신(); 적용상태(); x.focus(); });
  }

  window.RWCompose = { open: open, 요약: 요약, 불러오기: 템플릿불러오기, 합치기: 합치기 };
})();
