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
  var 읽는효과들 = [['끔', '끔'], ['색', '색칠'], ['색+커짐', '색칠 + 커짐'], ['색+튀어오름', '색칠 + 튀어오름']];   // 서버 render.js 효과목록과 같은 이름
  var 헥스 = /^#[0-9a-f]{6}$/i;
  // ---------- 색 휠 (리졸브식) ----------
  // 둘레 각도 = 색상, 중심에서의 거리 = 채도, 아래 막대 = 밝기. 안에서는 HSV 를 들고 있다가 바깥 색이 달라졌을 때만 다시 맞춘다(손잡이가 튀지 않게).
  // 서버가 받는 값은 #RRGGBB(대문자) 뿐이라 쓰기에는 항상 그 모양만 내보낸다. 잘못 적은 글은 쓰지 않고 칸만 빨갛게 한다.
  function hsv로hex(h, s, v) {
    var c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    return '#' + [r, g, b].map(function (q) { var n = Math.round((q + m) * 255); return (n < 16 ? '0' : '') + n.toString(16); }).join('').toUpperCase();
  }
  function hex로hsv(hex, 앞) {   // 앞 = 이전 {h,s,v}: 무채색이면 색상을 그대로 둔다
    var n = parseInt(hex.slice(1), 16), r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, h = 앞 ? 앞.h : 0;
    if (d > 0.0001) h = mx === r ? 60 * (((g - b) / d + 6) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
    return { h: h, s: mx === 0 ? 0 : d / mx, v: mx };
  }
  function 정리hex(t) {   // '#abc'·'abc'·'AABBCC' → '#AABBCC', 아니면 ''
    t = String(t || '').trim().replace(/^#/, ''); if (/^[0-9a-f]{3}$/i.test(t)) t = t.replace(/(.)/g, '$1$1'); return /^[0-9a-f]{6}$/i.test(t) ? '#' + t.toUpperCase() : '';
  }
  function 색휠(옵션) {   // 옵션: { 이름, 쓰기(hex), 기본으로() } → { box, 맞추기(hex) }
    var 상태 = { h: 0, s: 0, v: 1 }, 지금hex = '#FFFFFF', 박 = el('div', 'cz-cw'), 링 = el('div', 'cz-cw-ring'), 그늘 = el('i', 'cz-cw-shade'), 점 = el('i', 'cz-cw-dot');
    링.tabIndex = 0; 링.setAttribute('role', 'application'); 링.setAttribute('aria-label', 옵션.이름 + ' 색상과 채도 (화살표로 움직여요)'); 링.appendChild(그늘); 링.appendChild(점);
    var 줄 = el('div', 'cz-cw-side'), 막 = el('input', 'cz-cw-v'); 막.type = 'range'; 막.min = 0; 막.max = 100; 막.setAttribute('aria-label', 옵션.이름 + ' 밝기');
    var 입줄 = el('label', 'cz-cw-hexrow'); 입줄.appendChild(el('span', '', 'HEX')); var 입 = el('input', 'cz-cw-hex'); 입.type = 'text'; 입.maxLength = 7; 입.spellcheck = false; 입.setAttribute('aria-label', 옵션.이름 + ' 코드 (#RRGGBB)'); 입줄.appendChild(입);
    var 기 = el('button', 'cz-btn cz-cw-rst', '기본으로'); 기.type = 'button'; 줄.appendChild(막); 줄.appendChild(입줄); 줄.appendChild(기); 박.appendChild(링); 박.appendChild(줄);
    var 수칸들 = [];   // 색 페이지용: 색상·채도·밝기 숫자칸(글자를 끌면 값이 바뀌고, 두 번 누르면 기본값) + 되돌리기 ↺
    if (옵션.페이지형) {
      박.classList.add('cz-cw-pg'); 기.textContent = '↺'; 기.title = '이 색을 기본으로'; 기.setAttribute('aria-label', 옵션.이름 + ' 기본으로'); 기.className = 'cz-cw-undo'; 박.insertBefore(기, 링);
      var 기본조각 = function () { var h = typeof 옵션.기본hex === 'function' ? 옵션.기본hex() : 옵션.기본hex; return hex로hsv(정리hex(h) || '#808080', null); };
      var 수줄 = el('div', 'cz-cw-nums');
      [['h', '색상', 359, 1], ['s', '채도', 100, 100], ['v', '밝기', 100, 100]].forEach(function (k) {
        var 칸 = el('label', 'cz-cw-n'), 글 = el('span', '', k[1]), 숫 = el('input'); 숫.type = 'text'; 숫.inputMode = 'numeric'; 숫.maxLength = 3; 숫.setAttribute('aria-label', 옵션.이름 + ' ' + k[1] + ' (' + (k[2]) + ' 까지, 글자를 끌거나 두 번 눌러 되돌려요)'); 칸.appendChild(글); 칸.appendChild(숫);
        var 읽기 = function () { return Math.round(상태[k[0]] * k[3]); }, 쓰기 = function (n) { n = Math.max(0, Math.min(k[2], n)); 상태[k[0]] = n / k[3]; 내보내기(); };
        var 시작 = null; 글.addEventListener('pointerdown', function (e) { 시작 = { x: e.clientX, n: 읽기() }; try { 글.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); });
        글.addEventListener('pointermove', function (e) { if (시작) 쓰기(Math.round(시작.n + (e.clientX - 시작.x) * (k[2] / 150))); }); 글.addEventListener('pointerup', function () { 시작 = null; }); 글.addEventListener('pointercancel', function () { 시작 = null; });
        글.addEventListener('click', function (e) { e.preventDefault(); });   // 끈 뒤 숫자칸으로 포커스가 가서 폰 키보드가 뜨지 않게
        글.addEventListener('dblclick', function () { var 기본 = 기본조각(); 쓰기(Math.round(기본[k[0]] * k[3])); });
        var 고침;
        숫.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); 숫.blur(); } else if (e.key === 'Escape') { e.stopPropagation(); 고침 = false; 숫.value = String(읽기()); 숫.blur(); } });
        고침 = false; 숫.addEventListener('input', function () { 고침 = true; });
        숫.addEventListener('blur', function () { var n = parseInt(숫.value, 10); if (고침 && !isNaN(n) && n !== 읽기()) 쓰기(n); 고침 = false; 숫.value = String(읽기()); });
        수줄.appendChild(칸); 수칸들.push(function () { if (!(document.activeElement === 숫 && 고침)) 숫.value = String(읽기()); });
      });
      var 막줄 = el('div', 'cz-cw-barrow'), 막되 = el('button', 'cz-cw-undo', '↺'); 막되.type = 'button'; 막되.title = '밝기 기본으로'; 막되.setAttribute('aria-label', 옵션.이름 + ' 밝기 기본으로'); 막되.addEventListener('click', function () { 상태.v = 기본조각().v; 내보내기(); }); 막줄.appendChild(막); 막줄.appendChild(막되);
      줄.insertBefore(막줄, 줄.firstChild); 박.insertBefore(수줄, 줄);   // 기본으로 버튼은 휠 위 ↺, 막대 줄에는 밝기 ↺
    }
    function 그리기() {
      var rad = 링.clientWidth / 2 || 56, a = 상태.h * Math.PI / 180; 점.style.left = (50 + 50 * 상태.s * Math.sin(a)) + '%'; 점.style.top = (50 - 50 * 상태.s * Math.cos(a)) + '%';
      그늘.style.background = 'rgba(0,0,0,' + (1 - 상태.v) + ')'; 막.value = String(Math.round(상태.v * 100)); 막.style.setProperty('--cw', hsv로hex(상태.h, 상태.s, 1));
      점.style.background = 지금hex; if (document.activeElement !== 입) { 입.value = 지금hex; 입.classList.remove('cz-bad'); }
      수칸들.forEach(function (f) { f(); });
    }
    function 내보내기() { 지금hex = hsv로hex(상태.h, 상태.s, 상태.v); 그리기(); 옵션.쓰기(지금hex); }
    function 끌기점(e) { var r = 링.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), 반 = r.width / 2; 상태.s = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 반); if (상태.s > 0.02) 상태.h = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360; 내보내기(); }
    var 누름 = false; 링.addEventListener('pointerdown', function (e) { 누름 = true; try { 링.setPointerCapture(e.pointerId); } catch (x) {} 링.focus(); 끌기점(e); e.preventDefault(); });
    링.addEventListener('pointermove', function (e) { if (누름) 끌기점(e); }); 링.addEventListener('pointerup', function () { 누름 = false; }); 링.addEventListener('pointercancel', function () { 누름 = false; });
    링.addEventListener('keydown', function (e) {
      var 배 = e.shiftKey ? 5 : 1, 바뀜 = true;
      if (e.key === 'ArrowLeft') 상태.h = (상태.h - 3 * 배 + 360) % 360; else if (e.key === 'ArrowRight') 상태.h = (상태.h + 3 * 배) % 360; else if (e.key === 'ArrowUp') 상태.s = Math.min(1, 상태.s + 0.03 * 배); else if (e.key === 'ArrowDown') 상태.s = Math.max(0, 상태.s - 0.03 * 배); else 바뀜 = false;
      if (바뀜) { e.preventDefault(); e.stopPropagation(); 내보내기(); }
    });
    막.addEventListener('input', function () { 상태.v = Number(막.value) / 100; 내보내기(); });
    function 입력반영(h) { 입.classList.remove('cz-bad'); 상태 = hex로hsv(h, 상태); 지금hex = h; 그리기(); 옵션.쓰기(h); }
    입.addEventListener('input', function () {   // 6자리가 다 찼을 때만 반영한다(치는 중간값이 미리보기에서 번쩍이지 않게). 3자리 줄임(#fa0)은 Enter·칸을 벗어날 때 반영
      var 원 = 입.value.trim().replace(/^#/, ''), h = 원.length === 6 ? 정리hex(원) : ''; if (h) { 입력반영(h); return; }
      입.classList.toggle('cz-bad', !/^[0-9a-f]{0,6}$/i.test(원) || 원.length > 6);
    });
    입.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var h = 정리hex(입.value); if (h) { e.preventDefault(); 입력반영(h); } else 입.classList.add('cz-bad'); } });
    입.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); 입.value = 지금hex; 입.classList.remove('cz-bad'); 입.blur(); } });
    입.addEventListener('blur', function () { var h = 정리hex(입.value); if (h && h !== 지금hex) 입력반영(h); 입.value = 지금hex; 입.classList.remove('cz-bad'); });
    기.addEventListener('click', function () { 옵션.기본으로(); });
    function 맞추기(hex) { var h = 정리hex(hex); if (!h) return; if (h !== 지금hex) { 상태 = hex로hsv(h, 상태); 지금hex = h; } 그리기(); }
    그리기(); return { box: 박, 맞추기: 맞추기 };
  }
  function 이름색(x) {   // 핵심색·읽는색은 '분홍' 같은 이름일 수도 있다 → 보여줄 #색(없으면 '')
    if (헥스.test(x || '')) return x; var h = 핵심들.filter(function (q) { return q[0] === x; })[0]; return h && h[2] ? h[2] : '';
  }
  function 밝기(h) { var n = parseInt(h.slice(1), 16), f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(n >> 16 & 255) + 0.7152 * f(n >> 8 & 255) + 0.0722 * f(n & 255); }
  var 위치들 = [['위', '위'], ['가운데', '가운데'], ['아래', '아래']];
  var 화면설명 = { '자동': '알아서 정해 줘요', '제목고정형': '위에 제목 띠', '전체화면형': '장면 가득', '자막바형': '아래 띠 자막', '가운데영상형': '가운데 영상' };
  // 화면 구성 그림(아주 작은 세로 화면). 고정된 도형만 쓴다(고객 글자 없음). 색은 compose.css 의 .cz-lay 클래스가 정한다
  var 화면그림 = {
    '제목고정형': '<rect class="bd" x="0" y="0" width="54" height="19"/><rect class="ac" x="12" y="5" width="30" height="3.2" rx="1.6"/><rect class="ac" x="17" y="11" width="20" height="3.2" rx="1.6"/><rect class="ph" x="0" y="19" width="54" height="77"/><circle class="sn" cx="38" cy="38" r="6"/><path class="hl" d="M0 76 L16 56 L28 68 L38 58 L54 78 L54 96 L0 96Z"/><rect class="tx" x="10" y="56" width="34" height="3.4" rx="1.7"/><rect class="tx" x="15" y="63" width="24" height="3.4" rx="1.7"/>',
    '전체화면형': '<rect class="ph" x="0" y="0" width="54" height="96"/><circle class="sn" cx="38" cy="22" r="7"/><path class="hl" d="M0 70 L16 46 L28 60 L38 48 L54 72 L54 96 L0 96Z"/><rect class="tx" x="10" y="66" width="34" height="3.4" rx="1.7"/><rect class="tx" x="15" y="73" width="24" height="3.4" rx="1.7"/>',
    '자막바형': '<rect class="ph" x="0" y="0" width="54" height="96"/><circle class="sn" cx="38" cy="22" r="7"/><path class="hl" d="M0 70 L16 46 L28 60 L38 48 L54 72 L54 96 L0 96Z"/><rect class="bar" x="0" y="60" width="54" height="22"/><rect class="dk" x="9" y="65" width="36" height="3.4" rx="1.7"/><rect class="dk" x="15" y="72" width="24" height="3.4" rx="1.7"/>',
    '가운데영상형': '<rect class="ph blur" x="0" y="0" width="54" height="96"/><rect class="bd" x="0" y="0" width="54" height="19"/><rect class="ac" x="12" y="5" width="30" height="3.2" rx="1.6"/><rect class="ac" x="17" y="11" width="20" height="3.2" rx="1.6"/><rect class="mid" x="0" y="23" width="54" height="34"/><circle class="sn" cx="38" cy="33" r="5"/><path class="hl" d="M0 57 L14 44 L24 52 L34 45 L54 57Z"/><rect class="tx" x="10" y="46" width="34" height="3.2" rx="1.6"/><rect class="tx" x="15" y="52" width="24" height="3.2" rx="1.6"/>' };
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
    ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색', '자막색', '자막거리', '자막가로', '자막끄기', '제목높이', '제목크기', '제목위', '제목세로', '제목가로', '제목띠색', '제목글자색', '가운데색', '가운데아래', '읽는효과', '읽는색'].forEach(function (k) { if (선택[k] !== undefined) 값[k] = 선택[k]; });
    if (t && t.허용스타일 && t.허용스타일.indexOf(값.자막모양) < 0) 값.자막모양 = t.기본.자막모양;
    return { 값: 값, 템플릿: t || null };
  }

  function 요약(선택, 보조) {
    선택 = 선택 || {}; 보조 = 보조 || {};
    var 조각 = [];
    if (선택.화면비 === '세로') 조각.push('세로 9:16');
    if (보조.화면구성 && 보조.화면구성 !== '자동') 조각.push(보조.화면구성.replace('형', ''));
    if (보조.자막위치 && 보조.자막위치 !== '하단' && 보조.자막위치 !== '자동') 조각.push('자막 ' + 보조.자막위치);
    var t = (템플릿목록 || []).find(function (x) { return x.id === 선택.템플릿; });
    if (선택.템플릿) 조각.push(t ? t.이름 : '템플릿');
    if (선택.자막모양) 조각.push((모양들.find(function (x) { return x[0] === 선택.자막모양; }) || [0, 선택.자막모양])[1]);
    if (선택.자막크기) 조각.push('크기 ' + 선택.자막크기);
    if (선택.읽는효과 && 선택.읽는효과 !== '끔') 조각.push('읽는 글자 ' + 선택.읽는효과);
    if (선택.제목높이 !== undefined || 선택.제목크기 !== undefined || 선택.제목위 !== undefined || 선택.제목세로 !== undefined || 선택.제목가로 !== undefined || 선택.제목띠색 !== undefined || 선택.가운데색 !== undefined || 선택.가운데아래 !== undefined || 선택.제목글자색 !== undefined) 조각.push('제목 모양 바꿈');
    if (선택.줄수) 조각.push(선택.줄수 + '줄');
    if (선택.자막위치 && 선택.자막위치 !== '아래') 조각.push('자막 ' + 선택.자막위치);
    if (선택.자막끄기) 조각.push('자막 끄기');
    else if (선택.자막거리 !== undefined || 선택.자막가로 !== undefined) 조각.push('자막 자리 바꿈');
    if (선택.블록 && 선택.블록.length) 조각.push('문구 ' + 선택.블록.length + '개');
    if (선택.장면별 && Object.keys(선택.장면별).length) 조각.push('장면 설정 ' + Object.keys(선택.장면별).length + '개');
    return 조각.length ? 조각.join(' · ') : '기본 모양 (바꾸지 않았어요)';
  }

  function open(opt) {
    opt = opt || {};
    var 종류 = opt.종류 || '쇼츠', 가로 = opt.화면 === '가로'; 현재가로 = 가로;
    var 화면목록 = (Array.isArray(opt.화면목록) ? opt.화면목록 : []).filter(function (x) { return x.값 !== '자동'; }); if (!화면목록.length) 화면목록 = [{ 값: '전체화면형' }];   // '자동'은 고르는 칸에서 뺐다
    function 기본화면() { var 후보 = 종류 === '상품쇼츠' ? ['가운데영상형', '제목고정형'] : ['제목고정형']; for (var i = 0; i < 후보.length; i++) if (화면목록.some(function (x) { return x.값 === 후보[i] && !x.꺼짐; })) return 후보[i]; return (화면목록.filter(function (x) { return !x.꺼짐; })[0] || 화면목록[0]).값; }
    var 화면 = 화면목록.some(function (x) { return x.값 === opt.화면구성 && !x.꺼짐; }) ? opt.화면구성 : 기본화면(), 문구샘플 = String(opt.문구 || '').trim() || '화면 위 제목 문구';
    function 화면가능(v) { return 화면목록.some(function (x) { return x.값 === v && !x.꺼짐; }); }
    var 제작방식 = opt.제작방식 || null, 제작값 = 제작방식 ? 제작방식.값 : '', 제작바꿈 = false;
    var 화면바꿈 = false; var 선택 = Object.assign({}, opt.값 || {}); var 자막위치 = opt.자막위치 || '아래'; var 처음위치 = 자막위치, 위치바꿈 = false, 초기화함 = false; var 가이드켜짐 = true;
    var 샘플 = String(opt.샘플 || '').trim() || 샘플기본; var 자막방식 = ['구절형', '문장형', '단어형'].indexOf(opt.자막방식) >= 0 ? opt.자막방식 : '구절형', 자막방식바꿈 = false; var 시간받음 = /^(\d+(?:\.\d+)?)s$/.exec(String(opt.문구시간 || '')), 문구시간 = 시간받음 ? '초' : 'all', 문구초 = 시간받음 ? Math.min(60, Number(시간받음[1])) : 3, 문구시간쓰기 = opt.문구시간 !== undefined;   // 문구가 보이는 시간은 상품쇼츠만: 계속 보이기 / 처음 N초만(0이면 안 보임). 예전 값 '3s' 도 받는다
    // 재생 위치가 장면을 넘어가면 그 장면의 사진과 대본 문장으로 바꾼다(실제 영상이 이렇게 이어진다는 것을 보여 주는 근사치: 대본을 장면 수만큼 문장 단위로 나눈다)
    var 샘플원본 = 샘플, 대본문장 = (String(opt.대본 || '').match(/[^.!?。！？]+[.!?。！？]*/g) || []).map(function (x) { return x.trim(); }).filter(Boolean), 지난장 = 0;
    function 장면대본(장, 수) { if (!대본문장.length) return 샘플원본; var a = Math.floor((장 - 1) * 대본문장.length / 수), b = Math.max(a + 1, Math.floor(장 * 대본문장.length / 수)); return 대본문장.slice(a, b).join(' ') || 샘플원본; }
    function 그림틀(장) {   // 장면 번호의 그림 → { 틀: 배경 값, 있음 }
      var 사진목록 = T.사진; if (!Array.isArray(사진목록) || !사진목록.length) return null;
      var 주소 = String(사진목록[장 - 1] || ''), 있음 = /^(blob:|https:\/\/|data:image\/)/.test(주소);
      return { 틀: 있음 ? '#222 center / cover no-repeat url("' + 주소.replace(/["\\\n]/g, encodeURIComponent) + '")' : '', 있음: 있음 };
    }
    function 장면그림(장) {
      var g = 그림틀(장); if (!g) return;
      bg.style.background = g.틀; ctr.style.background = g.틀 || '#222';
      if (g.있음) bg.removeAttribute('data-ph'); else bg.setAttribute('data-ph', ((Array.isArray(opt.자료) ? opt.자료 : [])[장 - 1] || {}).영상 ? '영상 장면' : '사진 장면');
    }
    // 편집 화면은 '고른 장면'(편집장), 결과 화면은 '재생 위치의 장면'(재생장)을 보여 준다(리졸브의 소스·타임라인 뷰어처럼 따로 움직인다)
    var 편집장 = 1, 재생장 = 1, 재생장시작 = 0, 편집고르기 = function () {};
    function 편집장면적용(장, 수) {
      if (영상종류 !== '쇼츠' || 장 === 지난장) return; 지난장 = 장;
      샘플 = 장면대본(장, 수); 장면그림(장); 그리기미리보기();
    }
    function 장면바뀜(장) {   // 재생 위치가 장면을 넘어갈 때: 결과 화면만 바뀐다
      if (장 === 재생장) return; 재생장 = 장; 재생장시작 = performance.now(); 결과갱신();
    }
    // 결과 복제본을 재생 위치의 장면(그림·대본 문장·읽는 글자 효과)으로 맞춘다. 편집 화면은 건드리지 않는다
    function 결과장면맞춤(c) {
      if (영상종류 !== '쇼츠') return;
      var 수n = Math.max(1, 클립목록.length || 1);
      if (재생장 === 편집장 && !재생중) return;
      var g = 그림틀(재생장), cb = c.querySelector('.cz-bg'), cc = c.querySelector('.cz-ctr');
      if (g && cb) { cb.style.background = g.틀; if (g.있음) cb.removeAttribute('data-ph'); else cb.setAttribute('data-ph', ((Array.isArray(opt.자료) ? opt.자료 : [])[재생장 - 1] || {}).영상 ? '영상 장면' : '사진 장면'); }
      if (g && cc) cc.style.background = g.틀 || '#222';
      var cs = c.querySelector('.cz-sub'), 줄 = cs && cs.firstElementChild; if (!줄) return;
      var v = 합치기(선택, 종류).값, 문장 = 장면대본(재생장, 수n), 보임 = (v.줄수 === 1 && /[.!?]/.test(문장)) ? 문장.slice(0, 문장.search(/[.!?]/) + 1) : 문장;
      var 핵 = 핵심들.find(function (h) { return h[0] === v.핵심색; }), 핵색값 = 헥스.test(v.핵심색 || '') ? v.핵심색 : (핵 && 핵[2]) || '';
      [].forEach.call(줄.children, function (sp, i) { sp.style.color = (핵색값 && i === 2) ? 핵색값 : ''; sp.style.transform = ''; sp.style.display = ''; });   // 편집 폰에서 칠해 둔 읽는 글자 색을 걷어낸다(결과는 재생 시간으로 따로 칠한다)
      if (재생장 !== 편집장) { 줄.textContent = ''; 보임.split(/(\s+)/).forEach(function (w, i) { var sp = el('span', '', w); if (핵색값 && i === 2) sp.style.color = 핵색값; 줄.appendChild(sp); }); }
      if (!재생중) return;
      var 효과 = v.읽는효과 || '끔'; if (효과 === '끔') return;
      var 색 = 헥스.test(v.읽는색 || '') ? v.읽는색 : ((핵심들.find(function (h) { return h[0] === v.읽는색; }) || [])[2] || '#ffe14d'), 움직임 = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      var 경과 = performance.now() - 재생장시작, 순번 = 0;
      [].forEach.call(줄.children, function (sp) {
        if (!sp.textContent.trim()) return; var 지금 = 경과 >= 250 + 순번 * 380 && 경과 < 250 + (순번 + 1) * 380; 순번++;
        if (!지금) return; sp.style.color = 색;
        if (움직임 && 효과.indexOf('커') >= 0) { sp.style.display = 'inline-block'; sp.style.transform = 'scale(1.12)'; }
        if (움직임 && 효과.indexOf('튀') >= 0) { sp.style.display = 'inline-block'; sp.style.transformOrigin = '50% 100%'; sp.style.transform = 'scale(1.04,1.24)'; }
      });
    }
    function 문구초값() { return 문구시간쓰기 && 문구시간 === '초' ? 문구초 : null; }   // null = 계속
    글꼴불러오기();
    var 이전포커스 = document.activeElement;
    var W = 가로 ? 1920 : 1080, H = 가로 ? 1080 : 1920;

    var ov = el('div', 'cz-ov'); ov.setAttribute('role', 'presentation');
    var dlg = el('div', 'cz-dlg'); dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'cz-title');
    var head = el('div', 'cz-head'); var ht = el('div'); var h2 = el('h2', '', '영상 꾸미기'); h2.id = 'cz-title'; ht.appendChild(h2); ht.appendChild(el('small', '', '마음에 드는 모양을 고르고, 필요하면 조금만 고쳐 보세요'));
    var x = el('button', 'cz-x', '×'); x.type = 'button'; x.setAttribute('aria-label', '닫기'); head.appendChild(ht); head.appendChild(x);
    var pv = el('div', 'cz-pv'); var phone = el('div', 'cz-phone' + (가로 ? ' cz-wide' : '')); var bg = el('div', 'cz-bg'); phone.appendChild(bg);
    var 그림주소 = /^(blob:|https:\/\/|data:image\/)/.test(String(opt.배경그림 || '')) ? String(opt.배경그림).replace(/["\\\n]/g, encodeURIComponent) : '';   // 앞 단계에서 올린 첫 사진(있으면 미리보기 배경)
    if (그림주소) bg.style.background = '#222 center / cover no-repeat url("' + 그림주소 + '")';
    var gbox = el('div'); gbox.style.cssText = 'position:absolute;inset:0'; phone.appendChild(gbox);
    var ttl = el('div'); ttl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:18.4%;background:#15110e;display:none;overflow:hidden'; var ttx = el('div'); ttx.style.cssText = 'position:absolute;transform:translateX(-50%);text-align:center;font-weight:800;white-space:pre'; phone.appendChild(ttl); phone.appendChild(ttx);
    var 띠손잡이 = el('div', 'cz-bandh'); 띠손잡이.style.display = 'none'; phone.appendChild(띠손잡이);
    var ctr = el('div', 'cz-ctr'); ctr.style.display = 'none'; phone.insertBefore(ctr, gbox); if (그림주소) ctr.style.background = '#222 center / cover no-repeat url("' + 그림주소 + '")';
    var 칸손잡이 = el('div', 'cz-bandh'); 칸손잡이.style.display = 'none'; phone.appendChild(칸손잡이); var 칸상태 = { 위: 0.235, 아래: 0.595 };
    var sub = el('div', 'cz-sub'); phone.appendChild(sub); var blk = el('div'); blk.style.cssText = 'position:absolute;inset:0;pointer-events:none'; phone.appendChild(blk);
    var tools = el('div', 'cz-pvtools'); var gl = el('label'); var gc = el('input'); gc.type = 'checkbox'; gc.checked = true; gl.appendChild(gc); gl.appendChild(document.createTextNode(' 점선')); gl.title = '유튜브가 쓰는 자리를 점선으로 보여 줘요'; tools.appendChild(gl);
    var 다시 = el('button', 'cz-btn'); 다시.type = 'button'; 다시.textContent = '▶ 읽는 효과 다시 보기'; 다시.style.cssText = 'min-height:44px;display:none'; tools.appendChild(다시);
    var 재생줄 = el('div', 'cz-tp'); 재생줄.setAttribute('role', 'group'); 재생줄.setAttribute('aria-label', '재생');
    var 처음버튼 = el('button', 'cz-tpb', '⏮'), 재생버튼 = el('button', 'cz-tpb cz-tpb-main', '▶'), 끝버튼 = el('button', 'cz-tpb', '⏭'), 재생시간 = el('span', 'cz-tpt', '0:00');
    처음버튼.type = 재생버튼.type = 끝버튼.type = 'button'; 처음버튼.setAttribute('aria-label', '처음으로'); 재생버튼.setAttribute('aria-label', '재생'); 끝버튼.setAttribute('aria-label', '끝으로');
    재생줄.appendChild(처음버튼); 재생줄.appendChild(재생버튼); 재생줄.appendChild(끝버튼); 재생줄.appendChild(재생시간); tools.insertBefore(재생줄, tools.firstChild);
    var 위치옮김 = function () {}, 재생중 = false, 재생틀 = 0, 재생전 = 0;
    var warn = el('ul', 'cz-warn'); warn.setAttribute('aria-live', 'polite');
    var 머리비 = 0, 뷰시각 = el('small', 'cz-vt', ''), 클립목록 = [], 효과조각 = [];   // 재생 위치(0~1)와 미리보기 위쪽 줄의 시각 글자
    var 뷰머리 = el('div', 'cz-vhead'); 뷰머리.appendChild(el('b', '', '미리보기')); var 뷰비 = el('span', '', 가로 ? '16:9 가로' : '9:16 세로'); 뷰비.appendChild(뷰시각); 뷰머리.appendChild(el('span', 'cz-vnote', '제목·자막·문구는 끌어서 옮길 수 있어요 · 실제 영상은 조금 다를 수 있어요')); 뷰머리.appendChild(뷰비); pv.appendChild(뷰머리);   // 리졸브의 뷰어 머리줄
    // 미리보기 둘: 왼쪽 「편집」(점선·끌기·선택 테두리) · 오른쪽 「결과」(같은 화면을 복제해 깨끗하게 보여 줌). 그리는 코드는 하나뿐이고, 편집 쪽이 바뀌면 결과가 따라 바뀐다(읽는 효과 움직임도 같이)
    var 넓은화면 = window.matchMedia ? window.matchMedia('(min-width: 901px)') : { matches: true };
    var stage = el('div', 'cz-stage'), 편집칸 = el('div', 'cz-pane cz-pane-e'), 결과칸 = el('div', 'cz-pane cz-pane-r'), 보기 = (가로 && 넓은화면.matches) ? '나란히' : '편집';
    stage.dataset.v = 보기; if (가로) stage.classList.add('cz-stage-w');
    if (가로) {   // 가로 영상은 폭이 모자라 한 번에 하나만: 위쪽 탭으로 바꾼다
      var 탭줄 = el('div', 'cz-pane-tabs'); ['나란히', '편집', '결과'].forEach(function (이름) { var b = el('button', 'cz-pane-l' + (이름 === '나란히' ? ' cz-pane-both' : ''), 이름); b.type = 'button'; b.dataset.v = 이름; b.setAttribute('aria-pressed', String(이름 === 보기)); b.addEventListener('click', function () { 보기 = 이름; stage.dataset.v = 이름; [].forEach.call(탭줄.children, function (n) { n.setAttribute('aria-pressed', String(n.dataset.v === 이름)); }); 결과갱신(); }); 탭줄.appendChild(b); }); stage.appendChild(탭줄);
    } else { 편집칸.appendChild(el('span', 'cz-pane-l', '편집')); 결과칸.appendChild(el('span', 'cz-pane-l', '결과')); }
    var 편집정보 = el('div', 'cz-pane-info'); 편집정보.setAttribute('aria-live', 'off');   // 편집 화면 옆 빈 자리: 고른 장면의 시간 정보(읽기 전용, 값은 오른쪽 속성에서 손본다)
    편집칸.appendChild(편집정보); 편집칸.appendChild(phone);
    // 구간 바(리졸브의 트림 막대): 영상 장면이 원본에서 쓸 구간. 양쪽 손잡이를 끌거나 화살표 키로 맞춘다. 값은 오른쪽 속성의 같은 칸과 하나로 이어진다
    var 구간바 = el('div', 'cz-trim'), 구간바연결 = null; 구간바.hidden = true;
    var 트랙 = el('div', 'cz-trim-t'), 구간띠 = el('i', 'cz-trim-r'), 손잡이 = [el('b', 'cz-trim-h'), el('b', 'cz-trim-h')], 구간글 = el('div', 'cz-trim-l'), 구간시 = el('span'), 구간길 = el('em'), 구간끝 = el('span');
    손잡이.forEach(function (h, n) { h.tabIndex = 0; h.setAttribute('role', 'slider'); h.setAttribute('aria-label', n ? '쓸 구간 끝' : '쓸 구간 시작'); h.dataset.k = n ? '끝' : '시작'; 트랙.appendChild(h); }); 트랙.insertBefore(구간띠, 트랙.firstChild);
    구간글.appendChild(구간시); 구간글.appendChild(구간길); 구간글.appendChild(구간끝); 구간바.appendChild(트랙); 구간바.appendChild(구간글); 편집칸.appendChild(구간바);
    function 구간바그리기() {
      if (!구간바연결) { 구간바.hidden = true; return; }
      var v = 구간바연결.읽기(), 시 = v[0], 끝 = v[1], 눈 = Math.max(0.5, v[2]); 구간바.hidden = false;
      구간띠.style.left = (시 / 눈 * 100) + '%'; 구간띠.style.width = Math.max(0.5, (끝 - 시) / 눈 * 100) + '%';
      손잡이[0].style.left = (시 / 눈 * 100) + '%'; 손잡이[1].style.left = (끝 / 눈 * 100) + '%';
      [[0, 시], [1, 끝]].forEach(function (d) { 손잡이[d[0]].setAttribute('aria-valuemin', d[0] ? String(시 + 0.5) : '0'); 손잡이[d[0]].setAttribute('aria-valuemax', d[0] ? String(눈) : String(끝 - 0.5)); 손잡이[d[0]].setAttribute('aria-valuenow', String(d[1])); 손잡이[d[0]].setAttribute('aria-valuetext', d[1] + '초'); });
      구간시.textContent = 분초(시); 구간끝.textContent = 분초(끝); 구간길.textContent = (Math.round((끝 - 시) * 10) / 10) + 's';
    }
    손잡이.forEach(function (h) {
      var 끌림 = false, 값 = function (e) { var r = 트랙.getBoundingClientRect(), v = 구간바연결.읽기(); return Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / Math.max(1, r.width))) * Math.max(0.5, v[2]) * 10) / 10; };
      h.addEventListener('pointerdown', function (e) { if (!구간바연결 || e.button !== 0) return; 끌림 = true; try { h.setPointerCapture(e.pointerId); } catch (x) {} e.preventDefault(); h.focus(); });
      h.addEventListener('pointermove', function (e) { if (끌림 && 구간바연결) 구간바연결.쓰기(h.dataset.k, 값(e)); });
      var 끝냄 = function () { 끌림 = false; }; h.addEventListener('pointerup', 끝냄); h.addEventListener('pointercancel', 끝냄); h.addEventListener('lostpointercapture', 끝냄);
      h.addEventListener('keydown', function (e) { if (!구간바연결 || e.ctrlKey || e.altKey || e.metaKey || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; e.preventDefault(); e.stopPropagation(); var v = 구간바연결.읽기(), 지금 = h.dataset.k === '시작' ? v[0] : v[1], 걸음 = e.shiftKey ? 1 : 0.1; 구간바연결.쓰기(h.dataset.k, Math.round((지금 + ((e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -걸음 : 걸음)) * 10) / 10); });
    });
    stage.appendChild(편집칸); stage.appendChild(결과칸);
    var 결과폰 = null, 결과예약 = 0;
    function 결과갱신() {
      if (결과예약) return; 결과예약 = requestAnimationFrame(function () {
        결과예약 = 0; if (가로 && 보기 === '편집') return; if (!결과칸.offsetParent) return;   // 안 보이는 동안(휴대폰·가로의 편집 탭)은 복제하지 않는다
        var c = phone.cloneNode(true); c.classList.add('cz-result'); c.classList.remove('cz-sel-out'); c.setAttribute('aria-hidden', 'true'); c.inert = true; [].forEach.call(c.querySelectorAll('[tabindex],[role]'), function (n) { n.removeAttribute('tabindex'); n.removeAttribute('role'); }); [].forEach.call(c.querySelectorAll('[id]'), function (n) { n.removeAttribute('id'); }); 결과장면맞춤(c);
        if (결과폰) 결과칸.replaceChild(c, 결과폰); else 결과칸.insertBefore(c, ctlR.parentNode === 결과칸 ? ctlR : null); 결과폰 = c;
      });
    }
    var 결과관찰 = null; try { 결과관찰 = new MutationObserver(결과갱신); 결과관찰.observe(phone, { subtree: true, attributes: true, childList: true, characterData: true }); } catch (x) {}
    결과갱신();
    pv.appendChild(stage); pv.appendChild(tools); pv.appendChild(warn);
    // 데스크톱 세로 영상: 재생 버튼은 「결과」 폰 오른쪽 아래, 점선은 「편집」 폰 왼쪽 아래에 붙는다(폭이 모자라면 폰 아래로). 휴대폰·가로는 예전처럼 아래 줄
    var 저장 = (function () { try { var o = JSON.parse(localStorage.getItem('rw_cz_layout') || '{}'); o = o && typeof o === 'object' && !Array.isArray(o) ? o : {}; var 한계값 = function (v, lo, hi) { v = Number(v); return v >= lo && v <= hi ? Math.round(v) : 0; }; return { 접힘: o.접힘 === true, lib: 한계값(o.lib, 200, 700), insp: 한계값(o.insp, 200, 700), 독: 한계값(o.독, 130, 700) }; } catch (e) { return { 접힘: false, lib: 0, insp: 0, 독: 0 }; } })();
    function 저장하기(k, v) { try { 저장[k] = v; localStorage.setItem('rw_cz_layout', JSON.stringify(저장)); } catch (e) {} }
    var ctlR = el('div', 'cz-ctl cz-ctl-r'), ctlE = el('div', 'cz-ctl cz-ctl-e'), 접기 = el('button', 'cz-tbtn cz-fold', '결과 접기'); 접기.type = 'button'; ctlR.appendChild(접기);
    var 결과접힘 = 저장.접힘 === true, 넓은 = window.matchMedia ? window.matchMedia('(min-width: 901px)') : { matches: true };
    function 컨트롤놓기() {
      var 옆 = 넓은.matches && !가로;
      if (옆) { ctlR.insertBefore(재생줄, ctlR.firstChild); ctlE.appendChild(gl); (결과접힘 ? 편집칸 : 결과칸).appendChild(ctlR); 편집칸.appendChild(ctlE); }
      else { tools.insertBefore(재생줄, tools.firstChild); tools.insertBefore(gl, 다시); if (ctlR.parentNode) ctlR.remove(); if (ctlE.parentNode) ctlE.remove(); }
      tools.classList.toggle('cz-tools-min', 옆);       stage.classList.toggle('cz-r-off', 옆 && 결과접힘); 접기.textContent = 결과접힘 ? '결과 보기' : '결과 접기'; 접기.setAttribute('aria-expanded', String(!결과접힘)); 폭판정();
    }
    function 폭판정() {   // 폰 둘과 옆 버튼이 pv 안에 들어가면 옆에 붙이고, 아니면 폰 아래로
      var 옆 = 넓은.matches && !가로, h = Math.min(window.innerHeight, 940), 폭 = Math.max(90, Math.min(520, (h - dock.offsetHeight - 146) * 0.5625));
      stage.classList.toggle('cz-side', 옆 && pv.clientWidth >= (결과접힘 ? 폭 + 2 * 130 : 2 * 폭 + 2 * 140 + 260));
    }
    접기.addEventListener('click', function () { 결과접힘 = !결과접힘; 저장하기('접힘', 결과접힘); 컨트롤놓기(); if (!결과접힘) 결과갱신(); 접기.focus(); });
    var 넓은바뀜 = function () { if (가로 && !넓은.matches && 보기 === '나란히') { 보기 = '편집'; stage.dataset.v = 보기; [].forEach.call(stage.querySelectorAll('.cz-pane-tabs > button'), function (n) { n.setAttribute('aria-pressed', String(n.dataset.v === 보기)); }); } 컨트롤놓기(); 결과갱신(); }; try { if (넓은.addEventListener) 넓은.addEventListener('change', 넓은바뀜); else if (넓은.addListener) 넓은.addListener(넓은바뀜); } catch (x) {}
    var 폭관찰 = null; try { 폭관찰 = new ResizeObserver(폭판정); 폭관찰.observe(pv); } catch (x) {}
    var lib = el('aside', 'cz-lib'); lib.setAttribute('aria-label', '구성과 모양'); var body = el('div', 'cz-body'); var tl = el('section', 'cz-tl'); tl.setAttribute('aria-label', '타임라인(앞 단계에서 정한 값)');
    var insp = el('aside', 'cz-insp'); insp.setAttribute('aria-label', '속성');   // 오른쪽 속성(Inspector): 재생 위치의 장면 정보(읽기 전용)
    var acts = el('div', 'cz-head-acts'); var reset = el('button', 'cz-btn', '처음 모양으로'); reset.type = 'button'; var ok = el('button', 'cz-btn cz-main', '적용하기'); ok.type = 'button'; acts.appendChild(reset); acts.appendChild(ok);   // 위쪽 줄 오른쪽(닫기 왼쪽)
    head.insertBefore(acts, x);
    // 「파일」 메뉴(웹 브라우저의 파일 메뉴처럼): 가져오기 · 처음 모양으로 · 적용하기. 가져오기 동작은 왼쪽 작업장이 만들 때 파일동작 에 달아 둔다
    var 파일동작 = {}, 파일메뉴닫기 = function () {};
    (function () {
      var 틀 = el('div', 'cz-fm-wrap'), 단추 = el('button', 'cz-fm-b', '파일'), 상자 = el('div', 'cz-fm'); 단추.type = 'button'; 단추.setAttribute('aria-haspopup', 'menu'); 단추.setAttribute('aria-expanded', 'false'); 상자.setAttribute('role', 'menu'); 상자.hidden = true;
      var 항목들 = [];
      function 닫음(포커스) { if (상자.hidden) return; 상자.hidden = true; 단추.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', 밖, true); if (포커스) 단추.focus(); }
      function 밖(e) { if (!틀.contains(e.target)) 닫음(false); }
      function 열기() {
        상자.textContent = ''; 항목들 = [];
        [['사진·영상을 컴퓨터에서 가져오기', 파일동작.컴퓨터], ['사진·영상을 주소로 가져오기', 파일동작.주소], null, ['처음 모양으로', function () { reset.click(); }], ['적용하기', function () { ok.click(); }, ok.disabled]].forEach(function (d) {
          if (!d) { 상자.appendChild(el('hr', 'cz-fm-hr')); return; }
          var b = el('button', 'cz-fm-i', d[0]); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.disabled = !d[1] || !!d[2]; b.addEventListener('click', function () { 닫음(d[0].indexOf('주소로') < 0); d[1](); }); 상자.appendChild(b); 항목들.push(b);   // 닫고 나면 포커스를 「파일」 단추로 돌린다(주소 입력 칸으로 가는 항목만 예외)
        });
        상자.hidden = false; 단추.setAttribute('aria-expanded', 'true'); document.addEventListener('pointerdown', 밖, true);
      }
      단추.addEventListener('click', function () { if (상자.hidden) { 열기(); var 첫 = 항목들.find(function (b) { return !b.disabled; }); if (첫) 첫.focus(); } else 닫음(true); });
      틀.addEventListener('keydown', function (e) {
        if (상자.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); 닫음(true); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); var 켜짐 = 항목들.filter(function (b) { return !b.disabled; }), k = 켜짐.indexOf(document.activeElement); if (!켜짐.length) return; 켜짐[(k + (e.key === 'ArrowDown' ? 1 : 켜짐.length - 1) + (k < 0 ? (e.key === 'ArrowDown' ? 0 : 1) : 0)) % 켜짐.length].focus(); }
        if (e.key === 'Tab') 닫음(false);
      });
      파일메뉴닫기 = function () { 닫음(false); };
      틀.appendChild(단추); 틀.appendChild(상자); head.insertBefore(틀, head.firstChild);
    })();
    var dock = el('section', 'cz-dock'), 그립 = el('div', 'cz-dockgrip'), 독몸 = el('div', 'cz-dockbody'); 그립.setAttribute('role', 'separator'); 그립.setAttribute('aria-orientation', 'horizontal'); 그립.setAttribute('aria-label', '아래 칸 높이 (끌거나 위·아래 화살표)'); 그립.tabIndex = 0; 독몸.appendChild(body); 독몸.appendChild(tl); dock.appendChild(그립); dock.appendChild(독몸);
    dlg.appendChild(head); dlg.appendChild(lib); dlg.appendChild(pv); dlg.appendChild(insp); dlg.appendChild(dock); ov.appendChild(dlg);
    // 왼쪽·오른쪽 칸 폭을 끌어서 바꾼다(리졸브의 패널 경계). 마지막 폭은 기억한다
    [['lib', '--lib-w', '왼쪽 칸 폭'], ['insp', '--insp-w', '오른쪽 칸 폭']].forEach(function (d) {
      var 칸 = d[0] === 'lib' ? lib : insp, g = el('div', 'cz-colgrip cz-colgrip-' + d[0]); g.setAttribute('role', 'separator'); g.setAttribute('aria-orientation', 'vertical'); g.setAttribute('aria-label', d[2] + ' (끌거나 좌·우 화살표)'); g.tabIndex = 0; g.setAttribute('aria-valuemin', '200'); dlg.appendChild(g);
      function 놓기(px) { var 다른 = (d[0] === 'lib' ? insp : lib).offsetWidth, 상한 = Math.max(200, Math.min(dlg.clientWidth * 0.36, dlg.clientWidth - 380 - 다른)); px = Math.round(Math.max(200, Math.min(상한, px))); dlg.style.setProperty(d[1], px + 'px'); g.setAttribute('aria-valuenow', String(px)); 저장하기(d[0], px); 폭판정(); }
      if (저장[d[0]] > 0) dlg.style.setProperty(d[1], Math.max(200, Math.min(저장[d[0]], Math.max(200, window.innerWidth * 0.3))) + 'px');   // 저장값이 지금 창보다 크면 줄여 쓴다
      g.addEventListener('pointerdown', function (e) { if (e.button) return; e.preventDefault(); var x0 = e.clientX, w0 = 칸.offsetWidth; g.setPointerCapture(e.pointerId);
        var 이동 = function (ev) { 놓기(w0 + (d[0] === 'lib' ? ev.clientX - x0 : x0 - ev.clientX)); }, 끝 = function () { g.removeEventListener('pointermove', 이동); g.removeEventListener('pointerup', 끝); g.removeEventListener('pointercancel', 끝); };
        g.addEventListener('pointermove', 이동); g.addEventListener('pointerup', 끝); g.addEventListener('pointercancel', 끝); });
      g.addEventListener('keydown', function (e) { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); var 더 = (e.key === 'ArrowRight') === (d[0] === 'lib'); 놓기(칸.offsetWidth + (더 ? 24 : -24)); });
    });
    if (저장.독 > 0) dlg.style.setProperty('--dock-h', Math.max(130, Math.min(저장.독, Math.round(window.innerHeight * 0.4))) + 'px');
    컨트롤놓기();

    function 그리기미리보기() {
      var m = 합치기(선택, 종류), v = m.값;
      var 제목형 = !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'), 띠형 = !가로 && 화면 === '자막바형', 가운데형 = !가로 && 화면 === '가운데영상형';
      ttl.style.display = 제목형 || 가운데형 ? 'block' : 'none';
      var 줄들 = 제목줄(문구샘플), 상자 = RWLayout.제목상자(W, H, { 줄수: 줄들.length, 최대폭: Math.max.apply(null, 줄들.map(제목폭).concat([1])), 띠: 제목형, 높이: v.제목높이, 크기: v.제목크기, 위: v.제목위, 세로: v.제목세로, 가로: v.제목가로 });
      ttl.style.background = 헥스.test(v.제목띠색 || '') ? v.제목띠색 : '#15110e'; ttl.style.height = (상자.띠 / H * 100) + '%';
      ttx.textContent = 줄들.join('\n'); ttx.style.display = 제목형 || 가운데형 ? 'block' : 'none'; ttx.style.color = 헥스.test(v.제목글자색 || '') ? v.제목글자색 : '#fff200'; ttx.style.textShadow = 'none';
      제목상태 = { 세로범위: 제목형 ? [(상자.높이 / 2 - Math.round(상자.크기 * 0.18)) / H, (상자.띠 - 상자.높이 / 2 + Math.round(상자.크기 * 0.18)) / H] : [(H * 0.133 + 상자.높이 / 2) / H, (H * 0.133 + 상자.높이 / 2) / H], 상자: 상자, 제목형: 제목형, 기본세로: 제목형 ? 상자.띠 / 2 / H : (H * 0.133 + 상자.높이 / 2) / H, 폭: Math.max.apply(null, 줄들.map(제목폭).concat([1])) * 상자.크기 };
      띠손잡이.style.display = 제목형 ? 'block' : 'none'; 띠손잡이.style.top = (상자.띠 / H * 100) + '%';
      ttx.style.fontSize = (상자.크기 * 0.66 / W * 100) + 'cqw'; ttx.style.lineHeight = (상자.크기 / W * 100) + 'cqw';   // ASS 의 크기는 줄 높이, 한글 폭은 그 0.66배(서버 render.js 글자폭과 같음)
       ttx.style.left = (상자.x / W * 100) + '%'; ttx.style.top = ((상자.위 !== null ? 상자.위 : H * 0.133) / H * 100) + '%';
      if (가운데형) {   // 영상 칸: 위는 문구 아래(서버와 같은 식), 아래 끝은 꾸미기에서 정한 값(없으면 화면 아래 안전선 78% — 유튜브 설명·채널 칸이 시작되는 자리)
        var 위비 = Math.max(0.235, 상자.띠 / H + 0.012), 아래비 = typeof v.가운데아래 === 'number' ? Math.max(위비 + 0.12, Math.min(0.9, v.가운데아래)) : Math.max(위비 + 0.12, 0.78);
        칸상태 = { 위: 위비, 아래: 아래비 }; ctr.style.top = (위비 * 100) + '%'; ctr.style.height = ((아래비 - 위비) * 100) + '%'; 칸손잡이.style.top = (아래비 * 100) + '%';
      }
      칸손잡이.style.display = 가운데형 ? 'block' : 'none';
      var 제목칸 = 제목형 && !가운데형;   // 제목고정형: 사진은 띠 아래부터 화면 맨 아래까지(서버 render.js 의 제목칸모드와 같다). 제목을 처음 몇 초만 보이게 하면 예전처럼 전체에 깔고 띠가 덮는다
      bg.style.top = 제목칸 ? (상자.띠 / H * 100) + '%' : ''; bg.style.height = 제목칸 ? ((H - 상자.띠) / H * 100) + '%' : '';
      ctr.style.display = 가운데형 ? 'block' : 'none'; var 띠 = 가운데형 && 헥스.test(v.가운데색 || '') ? v.가운데색 : ''; bg.style.filter = 가운데형 && !띠 ? 'blur(5px) brightness(.7)' : ''; bg.style.visibility = 띠 ? 'hidden' : ''; phone.style.background = 띠 || ''; bg.style.transform = 가운데형 ? 'scale(1.12)' : '';
      var box = RWLayout.자막상자(W, H, { 위치: 자막위치, 크기: v.자막크기 * Math.min(W, H) / 1080, 줄수: v.줄수, 줄길이: v.줄길이, 거리: v.자막거리, 가로: v.자막가로, 안전영역: !가로 });
      sub.style.cssText = 'left:' + ((box.x + box.w / 2) / W * 100) + '%;top:' + (box.y / H * 100) + '%;width:' + (box.w / W * 100) + '%;height:' + (box.h / H * 100) + '%;font-size:' + (v.자막크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;display:' + (v.자막끄기 ? 'none' : 'flex') + ';flex-direction:column;justify-content:flex-end;overflow:hidden;';   // 줄 칸을 잡고 글은 아래 칸부터 채운다
      if (가운데형 && !v.자막끄기) {   // 가운데영상형: 서버(render.js)와 같은 식 — 자막은 영상 칸 안(위·가운데·아래 끝)에 놓이고, 아래는 화면 아래 안전선(78%)을 넘지 않는다
        var 칸위 = 칸상태.위 * H, 칸아래 = 칸상태.아래 * H, 칸여백 = Math.round((칸아래 - 칸위) * 0.05);
        var 자막y = 자막위치 === '위' ? 칸위 + 칸여백 : 자막위치 === '가운데' ? 칸위 + (칸아래 - 칸위) / 2 - box.h / 2 : Math.min(칸아래 - 칸여백, H * 0.78) - box.h;
        sub.style.top = (자막y / H * 100) + '%'; box = Object.assign({}, box, { y: 자막y });
      }
      sub.style.fontFamily = (글꼴들.find(function (g) { return g[0] === v.글꼴; }) || 글꼴들[0])[2];
      var 겉 = 모양겉(v.자막모양); if (헥스.test(v.자막색 || '')) 겉 = Object.assign({}, 겉, { c: v.자막색 });   // 자막 글자색(모양의 색만 덮는다)
      sub.style.fontWeight = 두꺼운글꼴.indexOf(v.글꼴) >= 0 ? '500' : String(겉.w);
      sub.style.color = 겉.c;
      sub.style.webkitTextStroke = 겉.s; sub.style.paintOrder = 'stroke fill'; sub.style.textShadow = 겉.sh || 'none';
      if (띠형) { v = Object.assign({}, v, { 자막모양: '굵은흰' }); }
      sub.textContent = ''; var 글줄 = el('div'); 글줄.style.cssText = 'display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:' + v.줄수 + ';overflow:hidden;width:fit-content;align-self:center;max-width:100%;background:' + (띠형 ? '#e2a23c' : (겉.bg || 'none')) + (띠형 ? ';color:#1a1410;-webkit-text-stroke:0;padding:.3em .6em;width:100%' : ''); sub.appendChild(글줄);
      var 핵 = 핵심들.find(function (h) { return h[0] === v.핵심색; }), 핵색 = 헥스.test(v.핵심색) ? v.핵심색 : (핵 && 핵[2]);
      var 보임샘플 = (v.줄수 === 1 && /[.!?]/.test(샘플)) ? 샘플.slice(0, 샘플.search(/[.!?]/) + 1) : 샘플; var 줄 = 보임샘플.split(/(\s+)/); var 강조 = false;
      var 단어칸 = []; 줄.forEach(function (w, i) { var s = el('span', '', w); if (핵색 && i === 2) s.style.color = 핵색; 글줄.appendChild(s); if (w.trim()) 단어칸.push({ s: s, 처음색: s.style.color }); }); 읽는단어 = 단어칸;
      gbox.textContent = '';
      if (가이드켜짐) RWLayout.가이드(W, H).forEach(function (g) { var d = el('div', 'cz-g'); d.style.cssText = 'left:' + (g.x / W * 100) + '%;top:' + (g.y / H * 100) + '%;width:' + (g.w / W * 100) + '%;height:' + (g.h / H * 100) + '%'; if (g.w < g.h * 0.5) d.classList.add('cz-g-v'); d.appendChild(el('span', '', g.이름)); gbox.appendChild(d); });
      blk.textContent = '';
      var 문제들 = 블록검사(), 블록경고 = [];
      블록목록().forEach(function (b, i) {
        var 글자 = (window.RWPhrase ? RWPhrase.블록글정리(b.글) : String(b.글 || '').trim()); if (!글자 || 문제들[i]) return;
        var px = b.크기 * Math.min(W, H) / 1080, bs = RWLayout.블록상자(W, H, b.위치, px, Math.max(1, Math.ceil([].concat(글자).join('').length * 0.66 * px / (W * 0.9))));
        var d = el('div', 'cz-sub', 글자); d.style.cssText = 'left:' + (bs.cx / W * 100) + '%;top:' + (bs.y / H * 100) + '%;width:' + (bs.w / W * 100) + '%;font-size:' + (b.크기 * 0.8 / 1080 * 100 * (가로 ? 0.5625 : 1)) + 'cqw;font-weight:' + 모양겉(b.모양).w + ';color:' + (헥스.test(b.색 || '') ? b.색 : 모양겉(b.모양).c) + ';-webkit-text-stroke:' + 모양겉(b.모양).s + ';paint-order:stroke fill;text-shadow:' + (모양겉(b.모양).sh || 'none') + ';background:' + (모양겉(b.모양).bg || 'none') + ';font-family:' + (글꼴들.find(function (g) { return g[0] === b.글꼴; }) || 글꼴들[0])[2];
        blk.appendChild(d);
        d.dataset.블록 = String(i); 끌기(d, function (dx, dy) { b.위치.가로 = 한계(b.위치.가로 + dx, 0, 1); if (b.위치.기준 !== '가운데') b.위치.거리 = 한계(b.위치.거리 + (b.위치.기준 === '위' ? dy : -dy), 0, 0.45); }, '문구 ' + (i + 1), function (n, t) { if (t === 'click') 선택하기('블록', i); });
        if (RWLayout.가이드(W, H).some(function (g) { return RWLayout.겹침비(bs, g) > 0.1; })) 블록경고.push('문구 ' + (i + 1) + '번이 유튜브가 쓰는 자리와 겹쳐요. 그대로 만들 수 있어요');
      });
      warn.textContent = '';
      var 글 = 블록경고;
      if (핵색 && 밝기(핵색) < 0.12) 글.push('단어 색이 어두워서 어두운 장면에서는 잘 안 보일 수 있어요');
      if (v.자막크기 * Math.min(W, H) / 1080 < H * 0.036) 글.push('글자가 작아서 휴대폰에서 읽기 어려울 수 있어요');
      if (헥스.test(v.자막색 || '') && 겉.bg) { var 박스 = /^#[0-9a-f]{3}$/i.test(겉.bg) ? '#' + 겉.bg.slice(1).replace(/./g, '$&$&') : (/^#[0-9a-f]{6}$/i.test(겉.bg) ? 겉.bg : '#000000'), 큰 = Math.max(밝기(박스), 밝기(v.자막색)) + 0.05, 작 = Math.min(밝기(박스), 밝기(v.자막색)) + 0.05; if (큰 / 작 < 3) 글.push('자막 글자색이 박스 색과 비슷해서 잘 안 보일 수 있어요'); }
      if (제목형 || 가운데형) { var 띠색 = 헥스.test(v.제목띠색 || '') ? v.제목띠색 : '#15110e', 제글색 = 헥스.test(v.제목글자색 || '') ? v.제목글자색 : '#fff200', 밝 = Math.max(밝기(띠색), 밝기(제글색)) + 0.05, 어 = Math.min(밝기(띠색), 밝기(제글색)) + 0.05; if (밝 / 어 < 3) 글.push('제목 글자색과 띠 색이 비슷해서 제목이 잘 안 보일 수 있어요'); }
      if (v.읽는효과 && v.읽는효과 !== '끔') { var 읽색 = 헥스.test(v.읽는색 || '') ? v.읽는색 : ((핵심들.find(function (h) { return h[0] === v.읽는색; }) || [])[2] || ''); if (읽색 && 밝기(읽색) < 0.12) 글.push('읽는 글자 색이 어두워서 어두운 장면에서는 잘 안 보일 수 있어요'); }
      var 겹친 = RWLayout.가이드(W, H).filter(function (g) { return RWLayout.겹침비(box, g) > 0.1; }).map(function (g) { return g.이름; });
      if (겹친.length) 글.push('자막이 유튜브가 쓰는 자리(' + 겹친.join('·') + ')와 겹쳐요. 그대로 만들 수 있어요');
      글.forEach(function (t) { warn.appendChild(el('li', '', t)); });
      선택클래스();
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
    var 블록다시 = function () {}, 블록색다시 = function () {};   // 만들기() 안의 블록그리기를 가리킨다
    var 제목상태 = null;   // 마지막으로 그린 제목 상자(끌기가 쓴다)
    var 한계 = function (x, a, b) { return Math.min(b, Math.max(a, x)); }, 둘째 = function (x) { return Math.round(x * 100) / 100; };
    // ---------- 요소 선택 (컷을 누르면 아래 칸이 따라가요) ----------
    // 선택 = { 종류, 번호 }. 미리보기 요소는 값을 바꿀 때마다 다시 그려지므로 요소가 아니라 '이름표'로 기억하고, 그릴 때마다 테두리를 다시 입힌다.
    // 선택해도 값은 하나도 바뀌지 않는다: 해당 탭으로 옮기고 그 요소의 색 휠을 열어 줄 뿐이다. 모든 설정은 탭에서 그대로 할 수 있다.
    var 고름 = null, 탭이동 = function () {}, 선택줄칩 = {}, 선택알림 = null;
    var 띠있음 = function () { return !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'); };
    var 대상표 = {
      '제목띠': { 이름: '제목 띠', 탭: '제목', 가능: function () { return 띠있음(); } },
      '제목글자': { 이름: '제목 글자', 탭: '제목', 가능: function () { return 띠있음(); } },
      '자막': { 이름: '자막', 탭: '자막', 가능: function () { return !v0().자막끄기; } },
      '블록': { 이름: '문구', 탭: '문구', 가능: function (n) { return n < 블록목록().length; } },
      '바깥': { 이름: '위·아래 빈 곳', 탭: '제목', 가능: function () { return 화면 === '가운데영상형' && !가로; } }
    };
    function 선택이름() { return 고름 ? 대상표[고름.종류].이름 + (고름.종류 === '블록' ? ' ' + (고름.번호 + 1) : '') : ''; }
    function 선택하기(종류, 번호) {
      var t = 대상표[종류]; if (!t || !t.가능(번호)) return;
      var 라벨 = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('aria-label');
      고름 = { 종류: 종류, 번호: 번호 || 0 }; 탭이동(t.탭); 선택바갱신(); 그리기미리보기();
      if (라벨 && (!document.activeElement || document.activeElement === document.body)) { var 다시 = dlg.querySelector('[aria-label="' + 라벨 + '"]'); if (다시) 다시.focus(); }   // 미리보기를 다시 그리면 포커스를 잃으므로 같은 요소로 되돌린다
      if (선택알림) 선택알림.textContent = '선택: ' + 선택이름();
    }
    function 선택풀기() { if (!고름) return false; 고름 = null; 선택바갱신(); 그리기미리보기(); if (선택알림) 선택알림.textContent = '선택을 풀었어요'; return true; }
    function 선택바갱신() {   // 없어진 대상(구성 전환·블록 삭제)을 고르고 있으면 풀고, 칩의 보임·눌림을 맞춘다
      if (고름 && !대상표[고름.종류].가능(고름.번호)) { 고름 = null; 선택클래스(); if (선택알림) 선택알림.textContent = '선택을 풀었어요'; }
      Object.keys(선택줄칩).forEach(function (k) { if (k === '__해제') return; var c = 선택줄칩[k], 종류 = c.dataset.종류, 번호 = Number(c.dataset.번호 || 0), 가능 = 대상표[종류].가능(번호); c.style.display = 가능 ? '' : 'none'; c.setAttribute('aria-pressed', String(!!고름 && 고름.종류 === 종류 && 고름.번호 === 번호)); });
      if (선택줄칩.__해제) 선택줄칩.__해제.style.display = 고름 ? '' : 'none';
    }
    function 선택클래스() {   // 그릴 때마다 호출: 선택한 요소에 주황 테두리 클래스를 다시 입힌다
      [].forEach.call(phone.querySelectorAll('.cz-sel'), function (n) { n.classList.remove('cz-sel'); }); phone.classList.remove('cz-sel-out'); if (!고름) return;
      if (고름.종류 === '제목띠') ttl.classList.add('cz-sel'); else if (고름.종류 === '제목글자') ttx.classList.add('cz-sel'); else if (고름.종류 === '자막') sub.classList.add('cz-sel'); else if (고름.종류 === '바깥') phone.classList.add('cz-sel-out');
      else if (고름.종류 === '블록') { var 대상 = [].slice.call(blk.children).filter(function (n) { return n.dataset.블록 === String(고름.번호); })[0]; if (대상) 대상.classList.add('cz-sel'); }
    }
    // 미리보기 끌기: 눌러서 끌면 색·크기 칸과 같은 값이 바뀐다. 방향키로도 움직인다. 끄는 동안 요소가 다시 그려져도 이어지도록 문서에서 움직임을 듣는다
    function 끌기(요소, 이동, 이름, 눌림) {   // 눌림: 끌지 않고 눌렀다 뗀(클릭) 때 부르는 함수. 움직임이 문턱(5px) 아래면 값은 하나도 바꾸지 않는다
      요소.classList.add('cz-drag'); 요소.tabIndex = 0; 요소.setAttribute('role', 'button'); 요소.setAttribute('aria-label', 이름 + ' (끌거나 방향키로 옮겨요)'); 요소.style.pointerEvents = 'auto';
      요소.addEventListener('pointerdown', function (e) {
        if (e.button !== undefined && e.button !== 0) return; e.preventDefault(); var 이전x = e.clientX, 이전y = e.clientY, 시작x = e.clientX, 시작y = e.clientY, 움직였음 = false;
        function 움직임(m) { if (!움직였음) { if (Math.abs(m.clientX - 시작x) < 5 && Math.abs(m.clientY - 시작y) < 5) return; 움직였음 = true; phone.classList.add('cz-dragging'); } var r = phone.getBoundingClientRect(); 이동((m.clientX - 이전x) / r.width, (m.clientY - 이전y) / r.height); 이전x = m.clientX; 이전y = m.clientY; 그리기미리보기(); 눌림갱신(); }
        function 끝(ev) { document.removeEventListener('pointermove', 움직임); document.removeEventListener('pointerup', 끝); document.removeEventListener('pointercancel', 끝); phone.classList.remove('cz-dragging'); 끌기중단 = null; if (!움직였음) { if (눌림 && !(ev && ev.type === 'pointercancel')) 눌림(요소, 'click'); return; } 끌기정리(); 블록다시(); 갱신(); }
        끌기중단 = function () { document.removeEventListener('pointermove', 움직임); document.removeEventListener('pointerup', 끝); document.removeEventListener('pointercancel', 끝); 끌기중단 = null; };
        document.addEventListener('pointermove', 움직임); document.addEventListener('pointerup', 끝); document.addEventListener('pointercancel', 끝);
      });
      요소.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && 눌림) { e.preventDefault(); e.stopPropagation(); 눌림(요소, 'click'); return; } var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return; e.preventDefault(); e.stopPropagation(); 이동(d[0] * 0.01, d[1] * 0.01); 끌기정리(); 블록다시(); 갱신(); var 다시찾기 = dlg.querySelector('[aria-label="' + 이름 + ' (끌거나 방향키로 옮겨요)"]'); if (다시찾기 && document.activeElement !== 다시찾기) 다시찾기.focus(); });   // 다시 그려진 요소로 포커스를 돌려 방향키를 이어서 누를 수 있게
    }
    function 끌기정리() {   // 끌기가 끝나면 값을 반올림하고, 기본값과 같으면 지워서 건드리지 않은 것으로 되돌린다
      [['제목가로', 0.5, 100], ['자막가로', 0.5, 100], ['제목높이', 0.184, 1000]].forEach(function (k) { var x = 선택[k[0]]; if (x === undefined) return; x = Math.round(x * k[2]) / k[2]; if (Math.abs(x - k[1]) < (k[0] === '제목높이' ? 0.003 : 0.005)) delete 선택[k[0]]; else 선택[k[0]] = x; });
      if (선택.제목세로 !== undefined && 제목상태) { var 세 = Math.round(선택.제목세로 * 1000) / 1000; if (Math.abs(세 - 제목상태.기본세로) < 0.004) delete 선택.제목세로; else 선택.제목세로 = 세; }
      if (선택.자막거리 !== undefined) { var 기본 = 자막위치 === '위' ? (가로 ? 0.07 : 0.13) : (가로 ? 0.07 : 0.22), d = Math.round(선택.자막거리 * 100) / 100; if (Math.abs(d - 기본) < 0.005) delete 선택.자막거리; else 선택.자막거리 = d; }
      블록목록().forEach(function (b) { b.위치.가로 = Math.round(b.위치.가로 * 100) / 100; b.위치.거리 = Math.round(b.위치.거리 * 100) / 100; });
    }
    var 끌기중단 = null;
    function 자막이동(dx, dy) {
      var v = 합치기(선택, 종류).값; if (v.자막끄기) return;
      if (자막위치 !== '가운데' && 화면 !== '가운데영상형') { var 기준 = 자막위치 === '위' ? (가로 ? 0.07 : 0.13) : (가로 ? 0.07 : 0.22), d = v.자막거리 !== undefined ? v.자막거리 : 기준; 선택.자막거리 = 한계(d + (자막위치 === '위' ? dy : -dy), 0, 0.45); }
      var 반 = 한계((v.줄길이 || 0.76) / 2, 0.25, 0.5); 선택.자막가로 = 한계((v.자막가로 !== undefined ? v.자막가로 : 0.5) + dx, 반, 1 - 반);   // 자막 상자는 화면 안에 갇히므로 갈 수 있는 범위만 쓴다
    }
    function 제목이동(dx, dy) {
      var v = 합치기(선택, 종류).값, t = 제목상태; if (!t) return;
      var 지금 = v.제목세로 !== undefined ? v.제목세로 : t.기본세로; 선택.제목세로 = 한계(지금 + dy, t.세로범위[0], t.세로범위[1]); delete 선택.제목위;   // 글자는 띠 안(맨 위 ~ 맨 아래)에서 자유롭게 옮긴다
      var 반폭 = 한계((t.폭 / 2 + W * 0.02) / W, 0, 0.5); 선택.제목가로 = 한계((v.제목가로 !== undefined ? v.제목가로 : 0.5) + dx, 반폭, 1 - 반폭);
    }
    function 칸이동(dx, dy) { var v = 합치기(선택, 종류).값; 선택.가운데아래 = Math.round(한계((typeof v.가운데아래 === 'number' ? Math.max(칸상태.위 + 0.12, v.가운데아래) : 칸상태.아래) + dy, 칸상태.위 + 0.12, 0.9) * 1000) / 1000; }
    function 띠이동(dx, dy) { var v = 합치기(선택, 종류).값, h = 한계((v.제목높이 !== undefined ? v.제목높이 : 0.184) + dy, 0.1, 0.3); 선택.제목높이 = h; }
    var 읽는단어 = [], 읽는타이머 = [];
    function 읽기멈춤() { 읽는타이머.forEach(clearTimeout); 읽는타이머 = []; }
    function 읽기재생() {   // 읽는 글자 효과 미리보기: 샘플 문장을 단어마다 차례로 칠한다. 한 번 보여 주고 멈춘다
      읽기멈춤(); var v = 합치기(선택, 종류).값, 효과 = v.읽는효과 || '끔'; 읽는단어.forEach(function (d) { d.s.style.color = d.처음색; d.s.style.transform = ''; d.s.style.display = ''; });
      if (효과 === '끔') return;
      var 색 = 헥스.test(v.읽는색 || '') ? v.읽는색 : ((핵심들.find(function (h) { return h[0] === v.읽는색; }) || [])[2] || '#ffe14d');
      var 움직임 = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches), 한단어 = 380;
      읽는단어.forEach(function (d, i) {
        읽는타이머.push(setTimeout(function () { d.s.style.color = 색; if (움직임 && 효과.indexOf('커') >= 0) { d.s.style.display = 'inline-block'; d.s.style.transform = 'scale(1.12)'; } if (움직임 && 효과.indexOf('튀') >= 0) { d.s.style.display = 'inline-block'; d.s.style.transformOrigin = '50% 100%'; d.s.style.transform = 'scale(1.04,1.24)'; } }, 250 + i * 한단어));
        읽는타이머.push(setTimeout(function () { d.s.style.color = d.처음색; d.s.style.transform = ''; }, 250 + (i + 1) * 한단어));
      });
    }
    var 지난읽기 = '';
    function 갱신() { 그리기미리보기(); 눌림갱신(); var v = 합치기(선택, 종류).값, 서명 = (v.읽는효과 || '') + '|' + (v.읽는색 || ''); if (서명 !== 지난읽기) { 지난읽기 = 서명; 읽기재생(); } }   // 효과·색을 바꾼 순간에만 처음부터 한 번 재생
    다시.addEventListener('click', 읽기재생);
    function 재생멈춤() { 재생중 = false; if (재생틀) cancelAnimationFrame(재생틀); 재생틀 = 0; 재생버튼.textContent = '▶'; 재생버튼.setAttribute('aria-label', '재생'); }
    function 재생시작() {
      var 총 = Number(T.길이초) > 0 ? Number(T.길이초) : (영상종류 === '쇼츠' ? 30 : 1800), 훑기 = Math.min(총, 20);   // 긴 영상은 20초에 훑어 본다
      if (머리비 >= 0.999) 위치옮김(0);
      재생중 = true; 재생버튼.textContent = '⏸'; 재생버튼.setAttribute('aria-label', '멈춤'); 재생전 = 0; 재생장시작 = performance.now();
      var 틱 = function (now) { if (!재생중) return; if (!재생전) 재생전 = now; var 다 = Math.min(0.1, (now - 재생전) / 1000); 재생전 = now; var 다음 = 머리비 + 다 / 훑기; 위치옮김(다음); if ((합치기(선택, 종류).값.읽는효과 || '끔') !== '끔') 결과갱신(); if (다음 >= 1) { 재생멈춤(); return; } 재생틀 = requestAnimationFrame(틱); };
      재생틀 = requestAnimationFrame(틱);
    }
    재생버튼.addEventListener('click', function () { if (재생중) 재생멈춤(); else 재생시작(); });
    처음버튼.addEventListener('click', function () { 재생멈춤(); 위치옮김(0); }); 끝버튼.addEventListener('click', function () { 재생멈춤(); 위치옮김(1); });
    var 눌림목록 = [];
    function 눌림갱신() { 눌림목록.forEach(function (f) { f(); }); 값표시(); }
    function 채움(sl) {   // 가운데가 기본인 슬라이더는 가운데에서 좌우로 색이 채워진다(리졸브처럼). 한쪽 끝이 기본인 슬라이더는 그대로 둔다
      var a = Number(sl.min), b = Number(sl.max); if (!(a === -b || (a === 0 && b === 100))) return;
      sl.classList.add('cz-bi'); var p = (Number(sl.value) - a) / (b - a) * 100; sl.style.setProperty('--a', Math.min(50, p) + '%'); sl.style.setProperty('--b', Math.max(50, p) + '%');
      if (!sl.__bi) { sl.__bi = 1; sl.addEventListener('input', function () { 채움(sl); }); }
    }
    function 숫자다루기(sl, 숫자, 이름, 되돌림) {   // 리졸브처럼: 이름·숫자를 좌우로 끌면 값이 바뀌고, 두 번 누르면 처음 값, 숫자를 한 번 누르면 직접 입력
      var 바꿈 = function (n) { var a = Number(sl.min), z = Number(sl.max), st = Number(sl.step) || 1; n = Math.min(z, Math.max(a, Math.round(n / st) * st)); if (String(n) === sl.value) return; sl.value = String(n); sl.dispatchEvent(new Event('input', { bubbles: true })); };
      var 대기 = 0;
      var 끌기시작 = function (손잡이, 눌러입력) {
        손잡이.classList.add('cz-scrub'); 손잡이.addEventListener('dblclick', function (e) { e.preventDefault(); clearTimeout(대기); 되돌림(); });
        손잡이.addEventListener('pointerdown', function (e) {
          if (e.button) return; var x0 = e.clientX, v0 = Number(sl.value), 움직임 = false, 폭 = Math.max(1, Number(sl.max) - Number(sl.min));
          var 이동 = function (ev) { var dx = ev.clientX - x0; if (!움직임 && Math.abs(dx) < 4) return; 움직임 = true; 바꿈(v0 + dx * 폭 / 240); };
          var 끝 = function () { document.removeEventListener('pointermove', 이동); document.removeEventListener('pointerup', 끝); document.removeEventListener('pointercancel', 끝); if (움직임) sl.dispatchEvent(new Event('change', { bubbles: true })); else if (눌러입력) { clearTimeout(대기); 대기 = setTimeout(입력열기, 380); } };
          document.addEventListener('pointermove', 이동); document.addEventListener('pointerup', 끝); document.addEventListener('pointercancel', 끝);
        });
      };
      var 입력열기 = function () {
        var i = el('input', 'cz-numin'); i.type = 'number'; i.min = sl.min; i.max = sl.max; i.step = sl.step || '1'; i.value = sl.value; i.setAttribute('aria-label', (이름 ? 이름.textContent : '') + ' 숫자로 입력'); 숫자.style.display = 'none'; 숫자.parentNode.insertBefore(i, 숫자); i.focus(); i.select();
        var 닫음 = false, 마침 = function (적용, 출처) { if (닫음) return; 닫음 = true; if (적용 && i.value !== '' && isFinite(Number(i.value))) { 바꿈(Number(i.value)); sl.dispatchEvent(new Event('change', { bubbles: true })); } i.remove(); 숫자.style.display = ''; if (출처 !== 'blur') 숫자.focus(); };
        i.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); 마침(true); } else if (e.key === 'Escape') { e.preventDefault(); 마침(false); } });
        i.addEventListener('blur', function () { 마침(true, 'blur'); });
      };
      if (이름) 끌기시작(이름, false); 숫자.tabIndex = 0; 숫자.setAttribute('role', 'button'); 숫자.title = '끌어서 조절 · 눌러서 입력 · 두 번 누르면 처음 값'; 숫자.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); 입력열기(); } }); 끌기시작(숫자, true);
    }
    function 값표시() {   // 슬라이더마다 숫자와 '처음 값으로' 버튼을 붙인다(가운데가 기본). 되돌리기는 건드리지 않은 상태로 돌아간다
      body.querySelectorAll('.cz-row input[type=range]:not(.cz-cw-v)').forEach(function (sl) {   // 색 휠의 밝기 막대는 숫자·되돌리기를 따로 갖는다(휠 안)
        if (!sl.__o) {
          var o = el('output', 'cz-val'), b = el('button', 'cz-rst', '↺'); b.type = 'button'; b.title = '처음 값으로'; b.setAttribute('aria-label', '처음 값으로 되돌리기');
          var 되돌림 = function () { if (sl.__reset) sl.__reset(); else { sl.value = '0'; sl.dispatchEvent(new Event('input', { bubbles: true })); sl.dispatchEvent(new Event('change', { bubbles: true })); } };
          b.addEventListener('click', 되돌림);
          숫자다루기(sl, o, sl.parentNode.querySelector('label'), 되돌림);
          sl.parentNode.appendChild(o); sl.parentNode.appendChild(b); sl.__o = o;
          sl.addEventListener('input', function () { var v = Number(sl.value); o.textContent = Number(sl.min) < 0 ? (v > 0 ? '+' : '') + v : String(v); });
        }
        var v = Number(sl.value); sl.__o.textContent = Number(sl.min) < 0 ? (v > 0 ? '+' : '') + v : String(v);
        채움(sl);
      });
    }

    var 카드그림 = { '화면 구성': 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 9h6v6H9z', '영상 제작 방식': 'M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4', '문구가 보이는 시간': 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z', '자막 방식': 'M5 7h14M5 12h14M5 17h9', '모양 고르기': 'M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', '제목 설정': 'M5 6h14M12 6v13M9 19h6', '자막 글자 모양': 'M4 7h16v10H4zM8 12h8M10 15h4', '읽는 글자 효과': 'M4 18l5-5 4 4 7-9M4 6h6', '자막 크기와 줄': 'M5 7h14M5 12h10M5 17h14', '자막 위치': 'M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10zM12 11.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z', '문구': 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7' };
    function 카드(제목, 작은글, 탭) {
      var c = el('section', 'cz-card'); c.dataset.tab = 탭 || '*'; /* '*' = 모든 탭에서 보이는 카드(모양 고르기) */ var top = el('div', 'cz-ch'); var ic = el('i', 'cz-ico'); ic.setAttribute('aria-hidden', 'true');
      ic.innerHTML = '<svg viewBox="0 0 24 24"><path d="' + (카드그림[제목] || 'M5 12h14') + '"/></svg>'; top.appendChild(ic);
      var h = el('h3', '', 제목); if (작은글) h.appendChild(el('small', '', 작은글)); top.appendChild(h);
      var 화살 = el('span', 'cz-chev', '⌄'); 화살.setAttribute('aria-hidden', 'true'); top.appendChild(화살); top.setAttribute('role', 'button'); top.tabIndex = 0; top.setAttribute('aria-expanded', 'true'); top.title = '눌러서 접고 펴기';   // 카드 머리를 누르면 접힌다(편집기 패널처럼)
      var 접기 = function () { var 닫음 = c.classList.toggle('cz-fold'); top.setAttribute('aria-expanded', String(!닫음)); };
      top.addEventListener('click', 접기); top.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 접기(); } });
      c.appendChild(top); body.appendChild(c); return c;
    }
    function 칩묶음(c, 목록, 읽기, 쓰기, 이름) {
      var wrap = el('div', 'cz-chips'); wrap.setAttribute('role', 'group'); wrap.setAttribute('aria-label', 이름);
      목록.forEach(function (it) { var b = el('button', 'cz-chip', it[1]); b.type = 'button'; b.addEventListener('click', function () { 쓰기(it[0]); 갱신(); }); wrap.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(읽기() === it[0])); }); });
      c.appendChild(wrap);
    }

    // ===== 타임라인(읽기 전용): 앞 단계에서 정한 길이·사진·소리·자막 방식을 리졸브의 트랙처럼 보여 준다. 길이에 따라 눈금과 트랙이 달라진다 =====
    var 영상종류 = 종류 === '야담' ? '야담' : (종류 === '수면' ? '수면' : '쇼츠');
    var T = opt.타임라인 || {};
    function 시간글(초) { 초 = Math.round(초); if (초 >= 3600) { var h = Math.floor(초 / 3600), m = Math.round((초 % 3600) / 60); if (m === 60) { h += 1; m = 0; } return h + '시간' + (m ? ' ' + m + '분' : ''); } if (초 >= 60) { var mm = Math.floor(초 / 60), ss = 초 % 60; return ss ? mm + ':' + (ss < 10 ? '0' : '') + ss : mm + '분'; } return 초 + '초'; }
    function 눈금간격(초) { var 후보 = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]; for (var i = 0; i < 후보.length; i++) if (초 / 후보[i] <= 10) return 후보[i]; return 7200; }
    function 트랙줄(이름, 칸) { var 줄 = el('div', 'cz-trk'); 줄.appendChild(el('span', 'cz-trk-n', 이름)); var 레인 = el('div', 'cz-lane'); 줄.appendChild(레인); tl.appendChild(줄); return 레인; }
    function 조각(레인, 시작, 끝, 길이, 글, 클래스, 배경) { var p = el('i', 'cz-seg' + (클래스 ? ' ' + 클래스 : '')); p.style.left = (시작 / 길이 * 100) + '%'; p.style.width = Math.max(0.3, (끝 - 시작) / 길이 * 100) + '%'; if (글) p.appendChild(el('span', '', 글)); if (배경) p.style.backgroundImage = 'url("' + 배경 + '")'; 레인.appendChild(p); return p; }
    function 분초(초) { var m = Math.floor(초 / 60), r = 초 - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); }
    var 속성키 = '';
    // ── 효과음(쇼츠): 렌더링(Queue처리 v38)과 같은 규칙. 장면이 바뀌는 순간(앞 장면 끝에서 lead초 앞, 장면 안에서만)에 전환음, 앞에서부터 max개까지.
    //    고객이 바꾼 값은 선택.효과음 = { '<전환 번호>': { 끔, 번호, 음량 } } 에 둔다(전환 번호 e = 장면 e → e+1). 타임라인의 자리 기준이라 장면을 옮겨도 그 자리에 남는다.
    //    관리자 값은 사이트설정(sfx)에서 받는다. 받지 못하면 효과음 줄은 안내만 보여 준다(있다·없다를 단정하지 않는다).
    function 효과음설정() { var s = T.효과음 || {}, 수 = function (v, d, lo, hi) { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
      return { 받음: !!T.효과음, 켜짐: !!T.효과음 && s.auto !== false, 앞: 수(s.lead, 0.15, 0, 1), 최대: Math.floor(수(s.max, 6, 0, 20)), 음량: 수(s.vol, 0.6, 0, 2), 목록: Array.isArray(s.list) ? s.list.filter(function (x) { return x && /^sfx:[a-z0-9_-]{1,50}$/.test(String(x.id || '')); }) : [] }; }
    function 효과음있는장면(장, 수) { var S = 효과음설정(); return 영상종류 === '쇼츠' && S.켜짐 && 수 >= 2 && 장 >= 1 && 장 < 수 && 장 <= S.최대; }
    function 효과음값(e) { return (선택.효과음 && 선택.효과음[e]) || {}; }
    var 효과포커스 = '';   // 효과음 칸을 바꾼 뒤 다시 그려도 같은 칸에 포커스를 돌려준다(키보드 사용)
    var 효과듣기 = null;   // 미리 듣기 재생기(하나만). 효과음 파일은 렌더 서버가 10분짜리 임시 주소로 넘겨 준다
    function 효과음멈춤() { if (효과듣기) { try { 효과듣기.pause(); } catch (x) {} 효과듣기 = null; } }
    function 효과음듣기(id, 음량, 버튼) {
      var S = 효과음설정(), x = S.목록.filter(function (t) { return t.id === id; })[0] || S.목록.filter(function (t) { return t.kind === 'whoosh'; })[0] || S.목록[0];   // 자동이면 전환음(whoosh) 하나를 예로 들려준다
      효과음멈춤(); if (!x) { 알리기('들어 볼 효과음이 없어요'); return; }
      var a = new Audio('https://a-domes--rewind-render-upload-api.modal.run/sfx?id=' + encodeURIComponent(x.id));
      a.volume = Math.max(0, Math.min(1, 음량));   // 브라우저 재생은 1(원래 크기)까지: 그보다 크게 고른 값은 미리 듣기에서 같은 크기로 들린다 효과듣기 = a; if (버튼) 버튼.classList.add('on');
      var 끝 = function () { if (버튼) 버튼.classList.remove('on'); if (효과듣기 === a) 효과듣기 = null; };
      a.addEventListener('ended', 끝); a.addEventListener('error', function () { 끝(); 알리기('효과음을 불러오지 못했어요'); });
      var p = a.play(); if (p && p.catch) p.catch(function () { 끝(); });
    }
    function 효과음이름(id) { var x = 효과음설정().목록.filter(function (t) { return t.id === id; })[0], k = 효과음설정().목록.indexOf(x); return x ? (x.name || ((x.kind || '소리') + ' ' + (k + 1))) : ''; }
    function 속성그리기(장, 수, 길이) {   // 재생 위치가 있는 장면의 정보. 값은 앞 단계에서 정한 것이라 여기서는 보기만 한다
      var 키 = [장, 수, 길이, T.소리, v0().자막끄기, 자막방식].join('|'); if (키 === 속성키 && insp.firstChild) return;   // 재생 중 매 프레임 다시 그리면 입력 칸을 잡을 수 없다: 장면·값이 바뀔 때만 그린다
      var 옛영상 = insp.querySelector('video'); if (옛영상) { try { 옛영상.pause(); 옛영상.removeAttribute('src'); 옛영상.load(); } catch (x) {} }   // 이전 영상은 멈추고 받던 것도 끊는다
      속성키 = 키; insp.textContent = ''; 구간바연결 = null; 구간바그리기();
      var 머리 = el('div', 'cz-insp-h'); 머리.appendChild(el('b', '', '속성')); 머리.appendChild(el('span', '', '장면 ' + 장 + ' / ' + 수)); insp.appendChild(머리);
      var 몸 = el('div', 'cz-insp-b'), 시작 = 길이 * (장 - 1) / 수, 끝 = 길이 * 장 / 수, 사진 = (T.사진 || [])[장 - 1], 자료 = (Array.isArray(opt.자료) ? opt.자료 : [])[장 - 1];
      if (!/^(blob:|https:\/\/|data:image\/)/.test(사진 || '') && 자료) { var 빈 = el('div', 'cz-insp-img cz-insp-ph' + (가로 ? '' : ' cz-v'), 자료.영상 ? '영상' : '사진'); 몸.appendChild(빈); if (자료.이름) 몸.appendChild(el('p', 'cz-insp-name', 자료.이름)); }
      if (/^(blob:|https:\/\/|data:image\/)/.test(사진 || '')) { var 그림 = el('div', 'cz-insp-img' + (가로 ? '' : ' cz-v')); 그림.style.backgroundImage = 'url("' + String(사진).replace(/["\\\n]/g, encodeURIComponent) + '")'; 몸.appendChild(그림); if (자료 && 자료.이름) 몸.appendChild(el('p', 'cz-insp-name', String(자료.이름))); }
      var 줄들 = [['시작', 분초(시작)], ['끝', 분초(끝)], ['길이', (끝 - 시작).toFixed(1) + 's'], ['소리', T.소리 || (영상종류 === '수면' ? '배경 음악' : '목소리')], ['자막', 영상종류 === '수면' ? '없음' : (v0().자막끄기 ? '끔' : (자막방식 || '구절형'))]];
      줄들.forEach(function (r) { var d = el('div', 'cz-insp-r'); d.appendChild(el('span', '', r[0])); d.appendChild(el('b', '', r[1])); 몸.appendChild(d); });
      if (자료 && 자료.영상 && typeof opt.구간바꿈 === 'function') {   // 영상 장면: 쓸 구간. 재생할 수 있는 영상은 보면서 손잡이(시작·끝)로 정하고, 아니면 숫자로 정한다
        var 구 = el('div', 'cz-insp-set'); 구.appendChild(el('div', 'cz-insp-sh', '쓸 구간'));
        var 번호 = 장 - 1, 시초 = Number(자료.시작) >= 0 ? Number(자료.시작) : 0, 끝초 = Number(자료.끝) > 시초 ? Number(자료.끝) : 시초 + 10, 총 = 0, 최대컷 = 60;
        var 앞구간 = [시초, 끝초]; var 영 = null, 막시 = el('input', 'cz-insp-rng'), 막끝 = el('input', 'cz-insp-rng'), 글 = el('div', 'cz-insp-r'), 소수 = function (n) { return Math.round(n * 10) / 10; };
        var 반영 = function () { 구간기록(번호, 앞구간[0], 앞구간[1], 시초, 끝초); 앞구간 = [시초, 끝초]; 자료.시작 = 시초; 자료.끝 = 끝초; try { opt.구간바꿈(번호, 시초, 끝초); } catch (x) {} 글자(); var 격 = lib.querySelector('.cz-wb-grid'), 칸 = 격 && 격.children[번호]; if (칸) { var 라 = 칸.querySelector('.cz-wb-r'); if (!라) { 라 = el('i', 'cz-wb-r', ''); 칸.appendChild(라); } 라.textContent = 소수(시초) + '–' + 소수(끝초) + 's'; } };
        var 시칸 = el('input', 'cz-insp-num'), 끝칸 = el('input', 'cz-insp-num');
        function 글자() { 구간바그리기(); 글.textContent = ''; 글.appendChild(el('span', '', '길이')); 글.appendChild(el('b', '', 소수(끝초 - 시초) + 's')); 시칸.value = String(소수(시초)); 끝칸.value = String(소수(끝초)); if (총) { 막시.value = String(시초); 막끝.value = String(끝초); } }
        var 내림 = function (n) { return Math.floor(n * 10 + 1e-9) / 10; };
        function 보정(기준) {   // 시작 < 끝, 한 컷 0.5~60초, 영상 길이 안(끝은 내림: 영상 길이를 넘지 않게)
          if (총) { 시초 = Math.min(Math.max(0, 시초), Math.max(0, 총 - 0.5)); 끝초 = Math.min(끝초, 총); }
          if (끝초 - 시초 < 0.5) { if (기준 === '끝') { 끝초 = Math.max(끝초, 0.5); 시초 = Math.max(0, 끝초 - 0.5); } else 끝초 = 시초 + 0.5; }
          if (끝초 - 시초 > 최대컷) { if (기준 === '끝') 시초 = 끝초 - 최대컷; else 끝초 = 시초 + 최대컷; }
          시초 = Math.max(0, 소수(시초)); 끝초 = 내림(끝초); if (끝초 - 시초 < 0.4) 끝초 = 소수(시초 + 0.5);
        }
        function 맞추기(기준) { 보정(기준); 반영(); }
        var 버튼줄 = null;
        if (자료.재생주소) {
          영 = el('video', 'cz-insp-vid'); 영.controls = true; 영.preload = 'metadata'; 영.playsInline = true; 영.muted = false; 영.setAttribute('referrerpolicy', 'no-referrer'); 영.src = 자료.재생주소; 구.appendChild(영);
          영.addEventListener('loadedmetadata', function () { if (isFinite(영.duration) && 영.duration > 0) { 총 = 영.duration; [막시, 막끝].forEach(function (m) { m.min = '0'; m.max = String(내림(총)); m.disabled = false; }); var 앞시 = 시초, 앞끝 = 끝초; if (시초 >= 총) 시초 = 0; 보정('시작'); if (시초 !== 앞시 || 끝초 !== 앞끝) 반영(); else 글자(); 영.currentTime = 시초; } });   // 열기만 해서는 카드 값을 바꾸지 않는다(범위를 벗어난 값만 고친다)
          영.addEventListener('error', function () { var p = el('p', 'cz-hint', '이 영상은 여기서 재생할 수 없어요. 아래 숫자로 정해 주세요.'); 구.insertBefore(p, 영); 영.remove(); 영 = null; 막시.disabled = true; 막끝.disabled = true; if (버튼줄) { 버튼줄.remove(); 버튼줄 = null; } });
          영.addEventListener('pause', function () { 영.dataset.미리 = ''; });
          영.addEventListener('timeupdate', function () { if (!영.paused && 영.dataset.미리 === '1' && 영.currentTime >= 끝초) { 영.pause(); 영.dataset.미리 = ''; } });
        } else { 구.appendChild(el('p', 'cz-hint', '이 영상은 여기서 볼 수 없어요(구글 드라이브 등). 숫자로 정해 주세요.')); }
        [[막시, '쓸 구간 시작', '시작'], [막끝, '쓸 구간 끝', '끝']].forEach(function (x) { var m = x[0]; m.type = 'range'; m.step = '0.1'; m.min = '0'; m.max = '60'; m.value = x[2] === '시작' ? String(시초) : String(끝초); m.disabled = !영; m.setAttribute('aria-label', x[1]); });
        막시.addEventListener('input', function () { 막시.setAttribute('aria-valuetext', 막시.value + '초'); 시초 = Number(막시.value); 맞추기('시작'); if (영) 영.currentTime = 시초; });
        막끝.addEventListener('input', function () { 막끝.setAttribute('aria-valuetext', 막끝.value + '초'); 끝초 = Number(막끝.value); 맞추기('끝'); if (영) 영.currentTime = Math.max(0, 끝초 - 0.1); });
        var 줄시 = el('div', 'cz-insp-r cz-insp-in'); 줄시.appendChild(el('span', '', '구간 시작')); 줄시.appendChild(막시); 줄시.appendChild(시칸);
        var 줄끝 = el('div', 'cz-insp-r cz-insp-in'); 줄끝.appendChild(el('span', '', '구간 끝')); 줄끝.appendChild(막끝); 줄끝.appendChild(끝칸);
        [[시칸, '시작', '시작 초'], [끝칸, '끝', '끝 초']].forEach(function (x) { var n = x[0]; n.type = 'number'; n.min = '0'; n.step = '0.1'; n.setAttribute('aria-label', x[2]); n.addEventListener('change', function () { var v = Number(n.value); if (String(n.value).trim() === '' || !isFinite(v)) { 글자(); return; } if (x[1] === '시작') 시초 = v; else 끝초 = v; 맞추기(x[1]); if (영 && 영.readyState) 영.currentTime = x[1] === '시작' ? 시초 : Math.max(0, 끝초 - 0.1); }); });
        구.appendChild(줄시); 구.appendChild(줄끝); 구.appendChild(글);
        if (영) {
          버튼줄 = el('div', 'cz-insp-btns');
          [['지금 위치를 시작으로', function () { if (!영) return; 시초 = 소수(영.currentTime); if (끝초 <= 시초) 끝초 = 시초 + 소수(Math.min(10, Math.max(0.5, 총 - 시초))); 맞추기('시작'); }], ['지금 위치를 끝으로', function () { if (!영) return; 끝초 = 소수(영.currentTime); 맞추기('끝'); }], ['구간 재생', function () { if (!영) return; 영.currentTime = 시초; 영.dataset.미리 = '1'; 영.play(); }]].forEach(function (x) { var b = el('button', 'cz-btn', x[0]); b.type = 'button'; b.addEventListener('click', x[1]); 버튼줄.appendChild(b); });
          구.appendChild(버튼줄);
        }
        var 눈추정 = Math.max(60, Math.ceil((끝초 + 5) / 10) * 10);   // 영상 길이를 모를 때의 막대 눈금(끝을 끌어도 눈금이 흔들리지 않게 처음에 정한다)
        구간바연결 = { 읽기: function () { return [시초, 끝초, Math.max(총 || 눈추정, 끝초)]; }, 쓰기: function (기준, v) { if (!isFinite(v)) return; v = 기준 === '시작' ? Math.min(v, 끝초 - 0.5) : Math.max(v, 시초 + 0.5); if (기준 === '시작') 시초 = v; else 끝초 = v; 맞추기(기준); if (영 && 영.readyState) 영.currentTime = 기준 === '시작' ? 시초 : Math.max(0, 끝초 - 0.1); } };
        글자(); 몸.insertBefore(구, 몸.firstChild);   // 위쪽에 둔다(패널이 짧아도 바로 보이게)
        if (영) Array.prototype.slice.call(몸.querySelectorAll('.cz-insp-img, .cz-insp-name')).forEach(function (x) { x.remove(); });   // 재생기가 있으면 자리 표시 그림은 뺀다
      }
      if (영상종류 === '쇼츠') {   // 장면별 설정: 움직임(사진 장면만)·음량. 기본값이면 지워서 건드리지 않은 것으로 둔다
        var 칸 = el('div', 'cz-insp-set'); 칸.appendChild(el('div', 'cz-insp-sh', '장면 설정'));
        var 지금 = function () { return (선택.장면별 && 선택.장면별[장]) || {}; };
        var 쓰기 = function (키, 값) { var 모두 = Object.assign({}, 선택.장면별 || {}), 이것 = Object.assign({}, 모두[장] || {}); if (값 === undefined) delete 이것[키]; else 이것[키] = 값; if (Object.keys(이것).length) 모두[장] = 이것; else delete 모두[장]; if (Object.keys(모두).length) 선택.장면별 = 모두; else delete 선택.장면별; };
        var 움직임들 = ['줌인', '줌아웃', '왼쪽', '오른쪽', '위', '아래', '없음'];
        var 되돌림 = function (할일, 켜짐) { var b = el('button', 'cz-insp-rs', '↺'); b.type = 'button'; b.title = '기본값으로'; b.disabled = !켜짐(); b.addEventListener('click', 할일); return b; };
        if (!(자료 && 자료.영상)) {
          var 줄1 = el('div', 'cz-insp-r cz-insp-in'); 줄1.appendChild(el('span', '', '움직임'));
          var 고름1 = el('select', 'cz-insp-sel'); 고름1.setAttribute('aria-label', '움직임');
          var 기본옵션 = el('option', '', '자동'); 기본옵션.value = ''; 고름1.appendChild(기본옵션);
          움직임들.forEach(function (m) { var o = el('option', '', m); o.value = m; 고름1.appendChild(o); });
          고름1.value = 지금().움직임 || '';
          var 되1 = 되돌림(function () { 쓰기('움직임', undefined); 고름1.value = ''; 되1.disabled = true; }, function () { return !!지금().움직임; });
          고름1.addEventListener('change', function () { 쓰기('움직임', 고름1.value || undefined); 되1.disabled = !고름1.value; });
          줄1.appendChild(고름1); 줄1.appendChild(되1); 칸.appendChild(줄1);
        }
        var 줄2 = el('div', 'cz-insp-r cz-insp-in'); 줄2.appendChild(el('span', '', '음량'));
        var 막대 = el('input', 'cz-insp-rng'); 막대.type = 'range'; 막대.min = '-50'; 막대.max = '50'; 막대.step = '1'; 막대.setAttribute('aria-label', '음량');   // 가운데 = 기본(100%), 왼쪽 = 작게(0~100%), 오른쪽 = 크게(~150%)
        var 값을막대 = function (v) { return v < 1 ? Math.round((v - 1) * 50) : Math.round((v - 1) * 100); };
        var 막대를값 = function (n) { return n < 0 ? 1 + n / 50 : 1 + n / 100; };
        var 퍼센트 = el('b', 'cz-insp-pc'); 막대.value = String(지금().음량 !== undefined ? 값을막대(지금().음량) : 0);
        var 퍼센트갱신 = function () { 퍼센트.textContent = Math.round(막대를값(Number(막대.value)) * 100) + '%'; };
        var 되2 = 되돌림(function () { 쓰기('음량', undefined); 막대.value = '0'; 퍼센트갱신(); 되2.disabled = true; }, function () { return 지금().음량 !== undefined; });
        막대.addEventListener('input', function () { var n = Number(막대.value); 쓰기('음량', n === 0 ? undefined : Math.round(막대를값(n) * 100) / 100); 퍼센트갱신(); 되2.disabled = n === 0; });
        퍼센트갱신(); 줄2.appendChild(막대); 줄2.appendChild(퍼센트); 줄2.appendChild(되2); 칸.appendChild(줄2);
        몸.appendChild(칸);
        if (효과음있는장면(장, 수)) 효과음칸그리기(몸, 장);
      }
      insp.appendChild(몸);
    }
    function 효과음칸그리기(몸, 장) {   // 장면 장 → 장+1 로 넘어갈 때 나오는 전환음: 사용·소리·음량. 바꾸면 되돌리기(Ctrl+Z)에 남는다(효과음 값만 되돌린다)
      var S = 효과음설정(), 지금 = function () { return 효과음값(장); };
      var 바꾸기 = function (고칠것, 포커스) {   // 고칠것: { 끔|번호|음량: 값 | undefined }. 기본값이면 지워서 건드리지 않은 것으로 둔다
        var 전 = 선택.효과음 && 선택.효과음[장] ? JSON.parse(JSON.stringify(선택.효과음[장])) : undefined, 뒤 = Object.assign({}, 전 || {});
        Object.keys(고칠것).forEach(function (k) { if (고칠것[k] === undefined) delete 뒤[k]; else 뒤[k] = 고칠것[k]; });
        if (!Object.keys(뒤).length) 뒤 = undefined; if (JSON.stringify(전) === JSON.stringify(뒤)) return;
        var 넣기 = function (v) { var 모두 = Object.assign({}, 선택.효과음 || {}); if (v === undefined) delete 모두[장]; else 모두[장] = JSON.parse(JSON.stringify(v)); if (Object.keys(모두).length) 선택.효과음 = 모두; else delete 선택.효과음; 속성키 = ''; 타임라인그리기(); };
        효과음멈춤(); 효과포커스 = 포커스 || ''; 넣기(뒤); 기록하기({ 이름: '효과음', undo: function () { 넣기(전); }, redo: function () { 넣기(뒤); } });
      };
      var 칸 = el('div', 'cz-insp-set cz-insp-sfx'); 칸.appendChild(el('div', 'cz-insp-sh', '효과음 · 장면 ' + 장 + ' → ' + (장 + 1)));
      var 꺼짐 = !!지금().끔;
      var 줄0 = el('div', 'cz-insp-r cz-insp-in'); 줄0.appendChild(el('span', '', '사용'));
      var 켬 = el('button', 'cz-insp-tg' + (꺼짐 ? '' : ' on'), 꺼짐 ? 'OFF' : 'ON'); 켬.type = 'button'; 켬.dataset.f = 'tg'; 켬.setAttribute('aria-pressed', 꺼짐 ? 'false' : 'true'); 켬.setAttribute('aria-label', '효과음 사용');
      켬.addEventListener('click', function () { 바꾸기({ 끔: 꺼짐 ? undefined : true }, 'tg'); });
      줄0.appendChild(켬); 칸.appendChild(줄0);
      var 줄1 = el('div', 'cz-insp-r cz-insp-in'); 줄1.appendChild(el('span', '', '소리'));
      var 고름 = el('select', 'cz-insp-sel'); 고름.dataset.f = 'sel'; 고름.setAttribute('aria-label', '효과음 소리'); 고름.disabled = 꺼짐;
      var 자동 = el('option', '', '자동'); 자동.value = ''; 고름.appendChild(자동);
      S.목록.forEach(function (x) { var o = el('option', '', 효과음이름(x.id) + (x.sec ? ' · ' + x.sec + 's' : '')); o.value = x.id; 고름.appendChild(o); });
      if (지금().번호 && !S.목록.some(function (x) { return x.id === 지금().번호; })) { var 옛 = el('option', '', '목록에 없는 소리 → 자동'); 옛.value = 지금().번호; 고름.appendChild(옛); }
      고름.value = 지금().번호 || '';
      var 되1 = el('button', 'cz-insp-rs', '↺'); 되1.type = 'button'; 되1.dataset.f = 'r1'; 되1.title = '기본값으로'; 되1.disabled = !지금().번호; 되1.addEventListener('click', function () { 바꾸기({ 번호: undefined }, 'sel'); });
      고름.addEventListener('change', function () { 바꾸기({ 번호: 고름.value || undefined }, 'sel'); });
      var 듣 = el('button', 'cz-insp-play', '▶'); 듣.type = 'button'; 듣.dataset.f = 'pl'; 듣.title = '미리 듣기'; 듣.setAttribute('aria-label', '효과음 미리 듣기'); 듣.disabled = 꺼짐 || !S.목록.length;
      듣.addEventListener('click', function () { if (효과듣기 && 듣.classList.contains('on')) { 효과음멈춤(); 듣.classList.remove('on'); return; } 효과음듣기(고름.value, 막대를값(Number(막대.value)), 듣); });
      줄1.appendChild(고름); 줄1.appendChild(듣); 줄1.appendChild(되1); 칸.appendChild(줄1);
      // 음량: 가운데 = 관리자 기본 음량(vol), 왼쪽 끝 = 0, 오른쪽 끝 = 2(렌더 상한). 표시는 기본 대비 %(기본이 0이면 실제 크기 %)
      var 기본 = S.음량, 값 = 지금().음량 !== undefined ? 지금().음량 : 기본;
      var 막대를값 = function (n) { return n <= 0 ? 기본 * (1 + n / 50) : 기본 + (2 - 기본) * n / 50; }, 값을막대 = function (v) { return v <= 기본 ? (기본 > 0 ? Math.round((v / 기본 - 1) * 50) : 0) : (기본 < 2 ? Math.round((v - 기본) / (2 - 기본) * 50) : 0); };
      var 줄2 = el('div', 'cz-insp-r cz-insp-in'); 줄2.appendChild(el('span', '', '음량'));
      var 막대 = el('input', 'cz-insp-rng'); 막대.type = 'range'; 막대.min = '-50'; 막대.max = '50'; 막대.step = '1'; 막대.dataset.f = 'rng'; 막대.setAttribute('aria-label', '효과음 음량'); 막대.disabled = 꺼짐;
      막대.value = String(Math.max(-50, Math.min(50, 값을막대(값))));
      var 퍼센트 = el('b', 'cz-insp-pc'), 퍼센트갱신 = function () { var v = 막대를값(Number(막대.value)); 퍼센트.textContent = Math.round((기본 > 0 ? v / 기본 : v) * 100) + '%'; };
      var 되2 = el('button', 'cz-insp-rs', '↺'); 되2.type = 'button'; 되2.dataset.f = 'r2'; 되2.title = '기본값으로'; 되2.disabled = 지금().음량 === undefined; 되2.addEventListener('click', function () { 바꾸기({ 음량: undefined }, 'rng'); });
      막대.addEventListener('input', 퍼센트갱신);
      막대.addEventListener('change', function () { var n = Number(막대.value); 바꾸기({ 음량: n === 0 ? undefined : Math.round(Math.min(2, Math.max(0, 막대를값(n))) * 100) / 100 }, 'rng'); });   // 놓을 때 한 번만 기록
      퍼센트갱신(); 줄2.appendChild(막대); 줄2.appendChild(퍼센트); 줄2.appendChild(되2); 칸.appendChild(줄2);
      몸.appendChild(칸);
      if (효과포커스) { var f = 칸.querySelector('[data-f="' + 효과포커스 + '"]'); 효과포커스 = ''; if (f && !f.disabled) try { f.focus(); } catch (x) {} else if (f) try { 켬.focus(); } catch (x) {} }
    }
    var 줌 = 1, 줌단계 = [1, 1.5, 2, 3, 4, 6, 8];   // 타임라인 확대 단계(1 = 한눈에 보기)

    // ── 편집 기록(되돌리기·다시하기)과 장면 편집 도구(나누기·삭제·복사·붙여넣기) ── 장면 = 앞 단계의 사진·영상 카드. 제목·자막·소리는 대본·목소리에서 자동으로 만들어져 직접 자르지 않는다
    var 되돌림통 = [], 다시통 = [], 붙여넣을틀 = null, 도구버튼 = {}, 도구글 = '', 장면옮기기 = null;
    function 편집가능() { return 영상종류 === '쇼츠' && Array.isArray(opt.자료) && opt.자료.length > 0 && typeof opt.자료떼기 === 'function' && typeof opt.자료붙이기 === 'function' && typeof opt.자료복제 === 'function'; }
    function 도구갱신() { var n = 클립목록.length; if (도구버튼.되돌리기) 도구버튼.되돌리기.disabled = !되돌림통.length; if (도구버튼.다시하기) 도구버튼.다시하기.disabled = !다시통.length; if (도구버튼.삭제) 도구버튼.삭제.disabled = n <= 1; if (도구버튼.붙여넣기) 도구버튼.붙여넣기.disabled = !붙여넣을틀; if (도구버튼.글) 도구버튼.글.textContent = 도구글; }
    function 알리기(글) { 도구글 = 글 || ''; if (도구버튼.글) 도구버튼.글.textContent = 도구글; }
    function 기록하기(c) { 되돌림통.push(c); if (되돌림통.length > 50) 되돌림통.shift(); 다시통.length = 0; 도구갱신(); }
    function 기록지우기() { 되돌림통.length = 0; 다시통.length = 0; 도구갱신(); }
    function 되돌리기() { var c = 되돌림통.pop(); if (!c) { 알리기('되돌릴 것이 없어요'); return; } c.undo(); 다시통.push(c); 알리기('되돌렸어요 · ' + c.이름); 도구갱신(); }
    function 다시하기() { var c = 다시통.pop(); if (!c) { 알리기('다시 할 것이 없어요'); return; } c.redo(); 되돌림통.push(c); 알리기('다시 했어요 · ' + c.이름); 도구갱신(); }
    function 장면별옮김(f) { if (!선택.장면별) return; var 새 = {}; Object.keys(선택.장면별).forEach(function (k) { var n = f(Number(k)); if (n > 0) 새[n] = 선택.장면별[k]; }); if (Object.keys(새).length) 선택.장면별 = 새; else delete 선택.장면별; }   // f(번호) → 새 번호(0이면 버림). 창 안의 장면 설정을 카드 번호에 맞춘다(저장해 둔 것은 호스트가 같은 규칙으로 맞춘다)
    function 장면별끼움(j, 항목) { 장면별옮김(function (n) { return n >= j + 1 ? n + 1 : n; }); if (항목 !== undefined) { 선택.장면별 = 선택.장면별 || {}; 선택.장면별[j + 1] = 항목; } }   // j번째 자리에 새 장면
    function 장면별뺌(j) { var 항 = 선택.장면별 ? 선택.장면별[j + 1] : undefined; 장면별옮김(function (n) { return n === j + 1 ? 0 : n > j + 1 ? n - 1 : n; }); return 항; }   // j번째 장면이 빠짐(그 설정을 돌려준다)
    function 편집끝(장) { if (장) 편집장 = 장; 지난장 = 0; if (window.__rwPoolNow) window.__rwPoolNow(true); 갱신(); 도구갱신(); }
    function 구간기록(i, 옛s, 옛e, 새s, 새e) {   // 쓸 구간을 바꾼 기록. 슬라이더를 끄는 동안(0.9초 안)은 하나로 묶는다
      if (!편집가능() || (옛s === 새s && 옛e === 새e)) return;
      var 위 = 되돌림통[되돌림통.length - 1], 지금 = Date.now();
      if (위 && 위.구간 === i && 지금 - 위.때 < 900) { 위.새 = [새s, 새e]; 위.때 = 지금; 다시통.length = 0; 도구갱신(); return; }
      var c = { 이름: '쓸 구간', 구간: i, 때: 지금, 옛: [옛s, 옛e], 새: [새s, 새e] };
      c.undo = function () { opt.구간바꿈(i, c.옛[0], c.옛[1]); 편집끝(i + 1); }; c.redo = function () { opt.구간바꿈(i, c.새[0], c.새[1]); 편집끝(i + 1); };
      기록하기(c);
    }
    function 삭제하기(i) {   // → '' 또는 안내 글. 카드는 버리지 않고 떼어 두었다가 되돌리기 때 다시 끼운다. 다른 장면의 설정은 건드리지 않고 번호만 맞춘다
      var 카드 = opt.자료떼기(i);
      if (카드 === 'busy') { 기록지우기(); opt.자료빼기(i); 장면별뺌(i); 편집끝(i + 1); return ''; }   // 올리는 중인 카드: 되돌릴 수 없는 예전 방식
      if (!카드) return '마지막 장면은 지울 수 없어요';
      var 항목 = 장면별뺌(i);
      기록하기({ 이름: '삭제', undo: function () { opt.자료붙이기(카드, i); 장면별끼움(i, 항목); 편집끝(i + 1); }, redo: function () { opt.자료떼기(i); 장면별뺌(i); 편집끝(i + 1); } });
      편집끝(i + 1); return '';
    }
    function 복제끼우기(원, j, 이름, 고칠일) {   // 원(번호 또는 틀)을 j 자리에 끼우고 기록한다. 고칠일(): 끼운 뒤 더 할 일(구간 나누기). → '' 또는 안내 글
      var 원설정 = typeof 원 === 'number' && 선택.장면별 && 선택.장면별[원 + 1] !== undefined ? JSON.parse(JSON.stringify(선택.장면별[원 + 1])) : undefined;
      var r = opt.자료복제(원, j); if (!r || !r.카드) return (r && r.오류) || '복사하지 못했어요';
      장면별끼움(j, 원설정);
      var 카드 = r.카드, 후 = 고칠일 ? 고칠일(카드) : null;
      기록하기({ 이름: 이름, undo: function () { if (후) 후.undo(); opt.자료떼기(j); 장면별뺌(j); 편집끝(j); }, redo: function () { opt.자료붙이기(카드, j); if (후) 후.redo(); 장면별끼움(j, 원설정); 편집끝(j + 1); } });
      편집끝(j + 1); return '';
    }
    function 나누기() {   // 재생 위치의 장면을 둘로: 영상은 쓸 구간을 그 지점에서 갈라 두 장면, 사진은 같은 사진 두 장면
      if (!편집가능()) return; var 수n = 클립목록.length, 머리 = 머리비 * 수n, i = Math.min(수n - 1, Math.max(0, Math.floor(머리 + 1e-9))), f = 머리 - i;
      var g = (Array.isArray(opt.자료) ? opt.자료 : [])[i]; if (!g) return;
      if (!g.영상) { 알리기(복제끼우기(i, i + 1, '나누기') || '나눴어요 · 같은 사진 두 장면'); return; }
      var s = Number(g.시작) >= 0 ? Number(g.시작) : 0, e = Number(g.끝) > s ? Number(g.끝) : s + 10, m = Math.round((s + (e - s) * Math.min(0.999, Math.max(0.001, f))) * 10) / 10;
      if (m - s < 0.5 || e - m < 0.5) { 알리기('나눈 조각이 0.5초보다 짧아져요. 재생 위치를 장면 안쪽에 놓아 주세요'); return; }
      var 문제 = 복제끼우기(i, i + 1, '나누기', function (카드) { opt.구간바꿈(i, s, m); opt.구간바꿈(i + 1, m, e); return { undo: function () { opt.구간바꿈(i, s, e); }, redo: function () { opt.구간바꿈(i, s, m); opt.구간바꿈(i + 1, m, e); } }; });
      알리기(문제 || '나눴어요 · ' + 분초(m)); }
    function 삭제도구() { if (!편집가능()) return; 알리기(삭제하기(편집장 - 1) || '지웠어요 · 되돌리기로 살릴 수 있어요'); }
    function 복사하기() { if (!편집가능()) return; var 틀 = opt.자료복사 ? opt.자료복사(편집장 - 1) : null; if (!틀) { 알리기('올리는 중인 장면은 복사할 수 없어요'); return; } 붙여넣을틀 = 틀; 알리기('복사했어요 · 장면 ' + 편집장); 도구갱신(); }
    function 붙여넣기() { if (!편집가능() || !붙여넣을틀) { 알리기('복사한 장면이 없어요'); return; } 알리기(복제끼우기(붙여넣을틀, 편집장, '붙여넣기') || '붙여넣었어요 · 선택한 장면 뒤'); }
    function 타임라인그리기() {
      var 옛왼쪽 = tl.scrollLeft; tl.style.setProperty('--tz', String(줌));
      tl.textContent = '';
      var 길이 = Number(T.길이초) > 0 ? Number(T.길이초) : (영상종류 === '쇼츠' ? 30 : 1800), 긴 = 길이 > 180;
      var 머리 = el('div', 'cz-tl-h'); 머리.appendChild(el('b', '', '타임라인')); 머리.appendChild(el('span', '', '전체 약 ' + 시간글(길이) + ' · ' + ({ 쇼츠: '쇼츠', 야담: '야담', 수면: '수면음악' }[영상종류]) + (T.장면수 ? ' · 장면 ' + T.장면수 : ''))); var 도구 = el('div', 'cz-tl-tools'); 도구.setAttribute('role', 'toolbar'); 도구.setAttribute('aria-label', '타임라인 도구');
      [['이전 장면', '⏮', function () { 장면가기(-1); }], ['다음 장면', '⏭', function () { 장면가기(1); }], ['축소', '−', function () { 줌바꿈(-1); }], ['확대', '+', function () { 줌바꿈(1); }]].forEach(function (d) { var b = el('button', 'cz-tbtn', d[1]); b.type = 'button'; b.title = d[0]; if (d[1] === '−' || d[1] === '+') b.classList.add('cz-zoom'); b.setAttribute('aria-label', d[0]); b.addEventListener('click', d[2]); if (d[1] === '−') b.disabled = 줌 <= 줌단계[0]; if (d[1] === '+') b.disabled = 줌 >= 줌단계[줌단계.length - 1]; 도구.appendChild(b); });
      도구버튼 = {};
      if (편집가능()) {   // 편집 도구(리졸브의 타임라인 도구): 나누기 · 삭제 · 복사 · 붙여넣기 · 되돌리기 · 다시하기
        var 편집줄 = el('div', 'cz-tl-tools cz-tl-edit'); 편집줄.setAttribute('role', 'toolbar'); 편집줄.setAttribute('aria-label', '편집 도구');
        [['되돌리기', 되돌리기, 'Ctrl+Z', ''], ['다시하기', 다시하기, 'Ctrl+Shift+Z', ''], ['나누기', 나누기, 'S', ' · 재생 위치의 장면'], ['삭제', 삭제도구, 'Delete', ' · 고른 장면'], ['복사', 복사하기, 'Ctrl+C', ' · 고른 장면'], ['붙여넣기', 붙여넣기, 'Ctrl+V', ' · 고른 장면 뒤']].forEach(function (d) { var b = el('button', 'cz-tbtn cz-tbtn-t', d[0]); b.type = 'button'; b.title = d[0] + d[3] + ' (' + d[2] + ')'; b.dataset.n = d[0]; b.setAttribute('aria-keyshortcuts', d[2]); b.addEventListener('click', function () { d[1](); var 새 = tl.querySelector('.cz-tl-edit [data-n="' + d[0] + '"]'); if (새 && !새.disabled) 새.focus(); }); 도구버튼[d[0]] = b; 편집줄.appendChild(b); });
        머리.appendChild(편집줄); 도구버튼.글 = el('span', 'cz-tl-msg', 도구글); 도구버튼.글.setAttribute('role', 'status'); 머리.appendChild(도구버튼.글);
      }
      머리.appendChild(도구); tl.appendChild(머리); 도구갱신();
      var 눈금줄 = el('div', 'cz-trk cz-ruler'); 눈금줄.appendChild(el('span', 'cz-trk-n', '')); var 눈금 = el('div', 'cz-lane'); 눈금줄.appendChild(눈금);
      var 간격 = 눈금간격(길이); for (var t = 0; t <= 길이 + 1e-6; t += 간격) { var k = el('i', 'cz-tick' + (t / 길이 > 0.94 ? ' cz-tick-end' : '')); k.style.left = (t / 길이 * 100) + '%'; k.appendChild(el('span', '', 시간글(t))); 눈금.appendChild(k); }
      var 헤드 = el('i', 'cz-play'); 눈금.appendChild(헤드); tl.appendChild(눈금줄);
      var 두는곳 = function (f) {   // 재생 위치선: 눈금·트랙을 눌러 옮긴다(리졸브의 플레이헤드). 위치는 다시 그려도 남고, 미리보기 위쪽 줄에 시각·장면이 나온다
        머리비 = Math.min(1, Math.max(0, f)); 헤드.style.left = (머리비 * 100) + '%';
        var 초 = 머리비 * 길이, 장 = Math.min(수, Math.floor(머리비 * 수) + 1);
        뷰시각.textContent = ' · ' + 시간글(초) + (영상종류 === '쇼츠' ? ' · 장면 ' + 장 : ''); 재생시간.textContent = 시간글(초) + ' / ' + 시간글(길이);
        클립목록.forEach(function (c, n) { c.classList.toggle('cz-t-cur', n === 장 - 1); });
        장면바뀜(장);
      };
      위치옮김 = 두는곳;
      편집고르기 = function (n) {   // 고른 장면: 편집 화면과 속성이 따라온다(재생 위치는 그대로)
        n = Math.min(수, Math.max(1, Math.round(n) || 1)); 편집장 = n;
        클립목록.forEach(function (c, k) { c.classList.toggle('cz-t-sel', k === n - 1); }); 효과조각.forEach(function (q) { q.classList.toggle('cz-t-sel', Number(q.dataset.n) === n); });
        속성그리기(n, 수, 길이); 편집장면적용(n, 수); 결과갱신();
        편집정보.textContent = ''; if (영상종류 === '쇼츠') { [['장면', n + ' / ' + 수], ['시작', 분초(길이 * (n - 1) / 수)], ['끝', 분초(길이 * n / 수)], ['길이', (길이 / 수).toFixed(1) + 's']].forEach(function (d) { var r = el('div'); r.appendChild(el('span', '', d[0])); r.appendChild(el('b', '', d[1])); 편집정보.appendChild(r); }); }
      };
      var 이동중 = false, 슬롯 = 0, 표시선 = el('i', 'cz-t-drop'); 표시선.hidden = true;
      var 눌린클립 = -1, 눌린효과 = 0, 눌린자리 = 0, 끌고있음 = false, 위치계산 = function (e) { var r = 눈금.getBoundingClientRect(); 두는곳((e.clientX - r.left) / Math.max(1, r.width)); };
      if (tl.__핸들) tl.__핸들.forEach(function (h) { tl.removeEventListener(h[0], h[1]); }); tl.__핸들 = [];   // 다시 그릴 때 옛 핸들러를 걷어낸다(쌓이지 않게)
      var 달기 = function (t, f) { tl.addEventListener(t, f); tl.__핸들.push([t, f]); };
      달기('pointerdown', function (e) { if (e.target.closest('.cz-trk-n') || e.target.closest('.cz-tl-h')) return; var 효과 = e.target.closest('.cz-t-sfx'); if (효과) { 눌린효과 = Number(효과.dataset.n); 눌린자리 = e.clientX; 끌고있음 = false; 눌린클립 = -1; try { tl.setPointerCapture(e.pointerId); } catch (x) {} return; }   // 효과음 조각: 누르면 그 장면을 골라 속성에 효과음 칸을 연다(재생선은 그대로)
        var 클립 = e.target.closest('.cz-t-clip'); 눌린클립 = 클립 ? 클립목록.indexOf(클립) : -1; 눌린자리 = e.clientX;
        if (눌린클립 >= 0) { try { tl.setPointerCapture(e.pointerId); } catch (x) {} return; }   // 클립 위: 움직임이 작으면 장면 고르기, 끌면 재생선 이동
        끌고있음 = true; 위치계산(e); try { tl.setPointerCapture(e.pointerId); } catch (x) {} });
      var 이동끝내기 = function () { if (이동중 && 클립목록[눌린클립]) 클립목록[눌린클립].classList.remove('cz-t-drag'); 표시선.hidden = true; 이동중 = false; };
      달기('pointermove', function (e) {
        if (눌린클립 >= 0 && 편집가능() && !끌고있음) {   // 장면 조각을 끌면 순서가 바뀐다(리졸브처럼). 재생선 이동은 눈금을 끈다
          if (!이동중 && Math.abs(e.clientX - 눌린자리) > 4) { 이동중 = true; 클립목록[눌린클립].classList.add('cz-t-drag'); if (!표시선.parentNode) 클립목록[눌린클립].parentNode.appendChild(표시선); }
          if (이동중) { var 레 = 클립목록[눌린클립].parentNode.getBoundingClientRect(), 수n = 클립목록.length; 슬롯 = Math.min(수n, Math.max(0, Math.round((e.clientX - 레.left) / Math.max(1, 레.width) * 수n))); 표시선.hidden = false; 표시선.style.left = (슬롯 / 수n * 100) + '%'; }
          return;
        }
        if (눌린클립 >= 0 && !끌고있음 && Math.abs(e.clientX - 눌린자리) > 4) 끌고있음 = true; if (끌고있음) 위치계산(e); });
      달기('pointerup', function (e) {
        if (눌린효과 > 0) { var 효번 = 눌린효과; 눌린효과 = 0; 끌고있음 = false; 눌린클립 = -1; if (Math.abs(e.clientX - 눌린자리) <= 4) 편집고르기(효번); return; }
        if (이동중) { var a = 눌린클립, 도착 = 슬롯 > a ? 슬롯 - 1 : 슬롯; 이동끝내기(); 눌린클립 = -1; 끌고있음 = false; if (도착 !== a && 장면옮기기) { 편집장 = 도착 + 1; 장면옮기기(a, 도착); 알리기('순서를 바꿨어요 · 장면 ' + (a + 1) + ' → ' + (도착 + 1)); } return; }
        if (눌린클립 >= 0 && !끌고있음) 편집고르기(눌린클립 + 1); 눌린클립 = -1; 끌고있음 = false; });
      달기('pointercancel', function () { 눌린효과 = 0; 이동끝내기(); 눌린클립 = -1; 끌고있음 = false; });
      var 문구있음 = !!String(opt.문구 || '').trim(), 제목끝 = 문구초값() !== null ? Math.min(문구초값(), 길이) : 길이, 구성 = 화면 === '자동' ? '전체화면형' : 화면;
      if (영상종류 === '쇼츠' && !가로) {
        var 제 = 트랙줄('제목'); if ((문구있음 || 구성 === '제목고정형' || 구성 === '가운데영상형') && 제목끝 > 0) 조각(제, 0, 제목끝, 길이, 문구있음 ? String(opt.문구).trim() : '제목', 'cz-t-title'); else 제.appendChild(el('em', 'cz-empty', '제목 없음'));
      }
      var 수 = Math.max(1, Number(T.사진수) || Number(T.장면수) || (긴 ? Math.min(24, Math.max(3, Math.round(길이 / 300))) : Math.min(12, Math.max(3, Math.round(길이 / 5))))), 영 = 트랙줄(영상종류 === '쇼츠' ? '영상' : '장면'), 썸 = T.사진 || [];
      클립목록 = []; for (var i = 0; i < 수; i++) 클립목록.push(조각(영, 길이 * i / 수, 길이 * (i + 1) / 수, 길이, 썸[i] ? '' : String(i + 1), 'cz-t-clip', /^(blob:|https:\/\/|data:image\/)/.test(썸[i] || '') ? 썸[i] : ''));
      클립목록.forEach(function (c, k) {   // 키보드: 탭으로 닿고 Enter·Space 로 장면 고르기
        c.tabIndex = 0; c.setAttribute('role', 'button'); c.setAttribute('aria-label', '장면 ' + (k + 1) + ' 고르기');
        c.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 편집고르기(k + 1); } });
      });
      var 방식 = 자막방식 || '구절형', 자막칸 = 긴 ? 30 : ({ 구절형: 3, 문장형: 5, 단어형: 1.2 }[방식] || 3), 자막수 = Math.min(긴 && 수 ? 수 * 4 : 80, Math.max(1, Math.floor(길이 / 자막칸)));
      var 자 = 트랙줄('자막'); if (v0().자막끄기) 자.appendChild(el('em', 'cz-empty', '자막 끔')); else if (영상종류 === '수면') 자.appendChild(el('em', 'cz-empty', '음악 영상은 자막이 필요할 때만 넣어요')); else for (var j = 0; j < 자막수; j++) 조각(자, 길이 * j / 자막수 + 길이 * 0.004, 길이 * (j + 1) / 자막수 - 길이 * 0.004, 길이, '', 'cz-t-sub');
      var 소 = 트랙줄(영상종류 === '수면' ? '음악' : '소리'); 조각(소, 0, 길이, 길이, (영상종류 === '수면' ? '배경 음악' : '목소리') + (T.소리 ? ' · ' + T.소리 : ''), 'cz-t-wave');
      효과조각 = []; if (영상종류 === '쇼츠') {
        var 효 = 트랙줄('효과음'), S = 효과음설정(), 장폭 = 길이 / 수, 폭 = Math.max(길이 * 0.012, 0.25);
        if (!S.받음) 효.appendChild(el('em', 'cz-empty', '효과음 정보를 불러오지 못했어요'));
        else if (!S.켜짐 || 수 < 2 || S.최대 < 1) 효.appendChild(el('em', 'cz-empty', '효과음 없음'));
        else for (var e = 1; e < 수 && e <= S.최대; e++) {
          var 설 = 효과음값(e), 자리 = 장폭 * (e - 1) + Math.max(0, 장폭 - S.앞), 끔 = !!설.끔;   // v38: 앞 장면 시작 + max(0, 앞 장면 길이 − lead)
          var q = 조각(효, 자리, Math.min(길이, 자리 + 폭), 길이, '', 'cz-t-sfx' + (끔 ? ' cz-sfx-off' : '') + (!끔 && (설.번호 || 설.음량 !== undefined) ? ' cz-sfx-mine' : ''));
          q.dataset.n = String(e); q.tabIndex = 0; q.setAttribute('role', 'button');
          q.title = '장면 ' + e + ' → ' + (e + 1) + ' · ' + (끔 ? '사용 안 함' : (효과음이름(설.번호) || '자동') + ' · ' + Math.round((설.음량 !== undefined ? 설.음량 : S.음량) / (S.음량 || 1) * 100) + '%');
          q.setAttribute('aria-label', '효과음 ' + q.title);
          q.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); 편집고르기(Number(this.dataset.n)); } });
          효과조각.push(q);
        }
      }
      if (영상종류 === '야담') { var 배 = 트랙줄('배경음'); 조각(배, 0, 길이, 길이, '잔잔한 배경음', 'cz-t-bgm'); }
      두는곳(머리비); 편집고르기(편집장); tl.scrollLeft = 옛왼쪽; 도구갱신();
      function 장면가기(방향) {   // 이전·다음 장면의 시작으로 재생선을 옮긴다
        var 지금 = Math.min(수 - 1, Math.floor(머리비 * 수 + 1e-6)), 시작쪽 = 지금 / 수, 목표 = 방향 > 0 ? 지금 + 1 : (머리비 - 시작쪽 > 0.002 ? 지금 : 지금 - 1);
        두는곳(Math.min(1, Math.max(0, 목표 / 수 + 1e-4))); 편집고르기(Math.min(수, Math.max(0, 목표)) + 1);   // 이전·다음 장면 버튼은 재생선과 고른 장면을 함께 옮긴다(키보드로도 장면을 고를 수 있게)
      }
      function 줌바꿈(방향) {
        var k = 줌단계.indexOf(줌) + 방향; if (k < 0 || k >= 줌단계.length) return; 줌 = 줌단계[k]; 타임라인그리기(); var 눌렀던 = tl.querySelector('.cz-tbtn[title="' + (방향 > 0 ? '확대' : '축소') + '"]'); if (눌렀던 && !눌렀던.disabled) 눌렀던.focus(); else { var 짝 = tl.querySelector('.cz-tbtn[title="' + (방향 > 0 ? '축소' : '확대') + '"]'); if (짝) 짝.focus(); }
        tl.scrollLeft = Math.max(0, 머리비 * (tl.scrollWidth - 64) + 64 - tl.clientWidth / 2);   // 재생선이 가운데 오게
      }
    }
    function v0() { return 합치기(선택, 종류).값; }
    function 타임라인만들기() { 타임라인그리기(); 눌림목록.push(타임라인그리기); }
    function 만들기() {
      body.textContent = ''; lib.textContent = ''; 눌림목록 = [];
      var c1 = 카드('모양 고르기', '골라 두면 아래 값이 알맞게 채워져요', '*');
      c1.classList.add('cz-fold'); c1.querySelector('.cz-ch').setAttribute('aria-expanded', 'false');   // 처음엔 접어 둔다(공간 절약). 머리에 지금 고른 모양이 보인다
      var 지금모양 = el('b', 'cz-now'); c1.querySelector('.cz-ch h3').appendChild(지금모양);
      눌림목록.push(function () { var t = (템플릿목록 || []).filter(function (x) { return x.id === 선택.템플릿; })[0]; 지금모양.textContent = t ? '지금: ' + t.이름 : '지금: 직접 꾸미기'; });
      var g = el('div', 'cz-grid'); c1.appendChild(g);
      var 직접 = el('button', 'cz-opt'); 직접.type = 'button'; 직접.appendChild(el('b', '', '직접 꾸미기')); 직접.appendChild(el('small', '', '템플릿 없이 아래에서 하나씩 정해요'));
      직접.addEventListener('click', function () { delete 선택.템플릿; 갱신(); }); g.appendChild(직접); 눌림목록.push(function () { 직접.setAttribute('aria-pressed', String(!선택.템플릿)); });
      (템플릿목록 || []).filter(function (t) { return t.종류.indexOf(종류) >= 0; }).forEach(function (t) {
        var b = el('button', 'cz-opt'); b.type = 'button'; b.appendChild(el('b', '', t.이름)); var 겉 = 모양겉(t.기본.자막모양), 미니 = el('span', 'cz-mini'); 미니.setAttribute('aria-hidden', 'true'); 미니.innerHTML = '<svg viewBox="0 0 54 96" focusable="false">' + (화면그림[t.화면구성] || '<rect class="ph" width="54" height="96"/>') + '</svg>'; var 자막샘플 = el('i', 'cz-mini-s', '가나다'); 자막샘플.style.color = 겉.c || '#fff'; if (겉.bg) 자막샘플.style.background = 겉.bg; 자막샘플.style.fontFamily = (글꼴들.find(function (g) { return g[0] === t.기본.글꼴; }) || 글꼴들[0])[2]; if (겉.s && 겉.s !== '0') 자막샘플.style.webkitTextStroke = '0.4px #000'; 자막샘플.style.fontWeight = String(겉.w || 800); 미니.appendChild(자막샘플); b.insertBefore(미니, b.firstChild); b.appendChild(el('small', '', t.설명));
        b.addEventListener('click', function () { 선택.템플릿 = t.id; if (화면가능(t.화면구성)) { 화면 = t.화면구성; 화면바꿈 = true; } ['자막모양', '글꼴', '자막크기', '줄수', '줄길이', '핵심색', '자막색'].forEach(function (k) { delete 선택[k]; }); if (!위치바꿈) 자막위치 = t.자막위치 || 자막위치; 갱신(); });
        g.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(선택.템플릿 === t.id)); b.style.display = (!가로 && 화면목록.length > 1 && (화면 === '자동' ? '전체화면형' : 화면) !== t.화면구성) ? 'none' : ''; });   // 고른 화면 구성의 모양만 보인다
      });
      var 빈말 = el('p', 'cz-hint', ''); c1.insertBefore(빈말, g);
      눌림목록.push(function () { var 구성 = 화면 === '자동' ? '전체화면형' : 화면, 있음 = (템플릿목록 || []).some(function (t) { return t.종류.indexOf(종류) >= 0 && t.화면구성 === 구성; }); 빈말.textContent = (!가로 && 화면목록.length > 1) ? (있음 ? '\'' + 구성.replace('형', '') + '\' 구성에 맞는 모양만 보여요' : '이 화면 구성은 준비된 모양이 없어요. 아래에서 직접 꾸며 보세요') : ''; 빈말.style.display = 빈말.textContent ? '' : 'none'; });
      if (화면목록.length > 1 && !가로) {   // 화면 구성: 미리보기 아래에 그림 카드로 둔다
        var 판 = 카드('화면 구성', '바꾸기', '화면'); var 줄 = el('div', 'cz-lay-row'); 줄.style.gridTemplateColumns = 'repeat(' + Math.min(4, 화면목록.length) + ', minmax(0, 1fr))'; 줄.setAttribute('role', 'group'); 줄.setAttribute('aria-label', '화면 구성'); 판.appendChild(줄);
        화면목록.forEach(function (it) {
          var b = el('button', 'cz-lay-b'); b.type = 'button'; b.disabled = !!it.꺼짐; b.title = 화면설명[it.값] || '';
          var 그림 = el('span', 'cz-lay-pic'); 그림.innerHTML = '<svg viewBox="0 0 54 96" aria-hidden="true" focusable="false">' + (화면그림[it.값] || '<rect class="ph" width="54" height="96"/>') + '</svg>';
          b.appendChild(그림); b.appendChild(el('b', '', it.값.replace('형', ''))); b.appendChild(el('small', '', 화면설명[it.값] || ''));
          b.addEventListener('click', function () { 화면 = it.값; 화면바꿈 = true; var 지금t = (템플릿목록 || []).filter(function (x) { return x.id === 선택.템플릿; })[0]; if (지금t && 지금t.화면구성 !== (it.값 === '자동' ? '전체화면형' : it.값)) delete 선택.템플릿; 갱신(); }); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(화면 === it.값)); }); 줄.appendChild(b);
        });
        판.appendChild(줄);
        var 지금구성 = el('b', 'cz-now'); 판.querySelector('.cz-ch h3').appendChild(지금구성);   // 접어 두고 머리에 지금 구성만 보인다(템플릿 칸을 넓게)
        눌림목록.push(function () { 지금구성.textContent = '지금: ' + (화면 === '자동' ? '전체화면형' : 화면).replace('형', ''); });
      }
      // 영상 제작 방식: 화면 구성 아래. 고르면 신청 칸의 제작 방식이 바뀐다 (요금은 분당 포인트로 보여 준다)
      if (제작방식 && 제작방식.목록 && 제작방식.목록.length) {
        var 판2 = 카드('영상 제작 방식', '요금이 달라져요', '화면'); var 줄2 = el('div', 'cz-lay-row'); 줄2.style.gridTemplateColumns = 'repeat(' + Math.min(4, 제작방식.목록.length) + ', minmax(0, 1fr))'; 줄2.setAttribute('role', 'group');
        제작방식.목록.forEach(function (it) {
          var b = el('button', 'cz-lay-b'); b.type = 'button'; b.disabled = !!it.꺼짐; b.title = it.설명 || '';
          if (it.그림) { var 그 = el('span', 'cz-lay-pic'); 그.innerHTML = it.그림; b.appendChild(그); }
          b.appendChild(el('b', '', it.값)); b.appendChild(el('small', '', it.부제 || '')); if (it.요금) b.appendChild(el('small', '', it.요금));
          b.addEventListener('click', function () { 제작값 = it.값; 제작바꿈 = true; 갱신(); }); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(제작값 === it.값)); }); 줄2.appendChild(b);
        });
        판2.appendChild(줄2); var 안내2 = el('p', 'cz-mnote'); 판2.appendChild(안내2);
        눌림목록.push(function () { var it = 제작방식.목록.filter(function (x) { return x.값 === 제작값; })[0]; 안내2.textContent = it ? (it.설명 || '') : ''; });
      }
      // 제목 설정: 위쪽 제목 띠(제목고정형)·제목 글자(제목고정형·가운데영상형). 슬라이더는 모두 가운데가 기본이다
      var c1b = 카드('제목 설정', '위쪽 문구의 띠와 글자', '제목'); var 제목행들 = []; var 제목믹서 = el('div', 'cz-mix'); c1b.appendChild(제목믹서);   // 믹서처럼 세로 페이더를 나란히(스크롤 없이 한눈에)
      function 제목슬라이더(이름, 키, 기본, 변환, 역변환, 띠만, 모양) {
        var r = el('div', 'cz-row ' + (모양 || 'cz-fd')); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = -50; sl.max = 50; sl.step = 1; sl.setAttribute('aria-label', '제목 ' + 이름 + ' (가운데가 기본)'); if (!모양 || 모양 === 'cz-fd') sl.setAttribute('aria-orientation', 'vertical');
        sl.addEventListener('input', function () { if (Number(sl.value) === 0) delete 선택[키]; else 선택[키] = 변환(Number(sl.value)); 갱신(); }); r.appendChild(sl); 제목믹서.appendChild(r);   // 가운데(0)는 건드리지 않은 것과 같다
        눌림목록.push(function () { var v = 합치기(선택, 종류).값[키]; sl.value = String(v === undefined ? 0 : Math.round(수(역변환(v), -50, 50, 0))); });
        제목행들.push({ r: r, 띠만: !!띠만 });
      }
      var 선형 = function (기준, 아래폭, 위폭) { return [function (v) { return Math.round((기준 + v * (v < 0 ? 아래폭 : 위폭) / 50) * 1000) / 1000; }, function (x) { return (x - 기준) / ((x < 기준 ? 아래폭 : 위폭) / 50); }]; };
      var 높이식 = 선형(0.184, 0.084, 0.116), 크기식 = 선형(1, 0.5, 0.3);
      제목슬라이더('띠 높이', '제목높이', 0.184, 높이식[0], 높이식[1], true);
      제목슬라이더('글자 크기', '제목크기', 1, 크기식[0], 크기식[1]);
      var 세로범위 = function () { return 제목상태 ? 제목상태.세로범위 : [0.02, 0.17]; };
      var 기본세로 = function () { return 제목상태 ? 제목상태.기본세로 : 0.09; };
      제목슬라이더('위·아래', '제목세로', 0.09, function (v) { var g = 기본세로(), r = 세로범위(); return Math.round((v > 0 ? g - (g - r[0]) * (v / 50) : g + (r[1] - g) * (-v / 50)) * 1000) / 1000; }, function (x) { var g = 기본세로(), r = 세로범위(); return -(x - g) / (((x < g ? g - r[0] : r[1] - g) / 50) || 1); }, false, 'cz-fd');   // 위쪽이 + (글자가 위로)
      제목슬라이더('왼쪽·오른쪽', '제목가로', 0.5, function (v) { return Math.round((0.5 + v / 100) * 100) / 100; }, function (x) { return (x - 0.5) * 100; }, false, 'cz-fd-h');
      c1b.appendChild(el('p', 'cz-hint', '띠 높이를 바꾸면 글자가 띠에 맞춰져요. 글자는 띠 아래 화면 위로도 옮길 수 있어요'));
      눌림목록.push(function () { var 보임 = !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'); c1b.style.display = 보임 ? '' : 'none'; 제목행들.forEach(function (h) { h.r.style.display = (h.띠만 === '가운데' && 화면 !== '가운데영상형') ? 'none' : ''; }); });
      if (문구시간쓰기) {
        var c1c = 카드('문구가 보이는 시간', '화면 위쪽 문구가 나오는 시간', '제목');
        var 시간줄 = el('div', 'cz-chips'); c1c.appendChild(시간줄);
        칩묶음(시간줄, [['all', '계속 보이기'], ['초', '처음 N초만']], function () { return 문구시간; }, function (v) { if (v === '초' && (화면 === '제목고정형' || 화면 === '가운데영상형')) return; 문구시간 = v; }, '문구가 보이는 시간');
        var 초줄 = el('div', 'cz-secrow'), 초칸 = el('input', 'cz-secin'); 초칸.type = 'number'; 초칸.min = '0'; 초칸.max = '60'; 초칸.step = '1'; 초칸.inputMode = 'numeric'; 초칸.setAttribute('aria-label', '문구가 보이는 초'); 초칸.value = String(문구초); 초줄.appendChild(초칸); 초줄.appendChild(el('span', '', '초')); c1c.appendChild(초줄);
        초칸.addEventListener('input', function () { if (초칸.value === '') return; var n = Number(초칸.value); if (!(n >= 0)) return; 문구초 = Math.min(60, Math.round(n)); 문구시간 = '초'; 갱신(); 타임라인그리기(); });
        초칸.addEventListener('blur', function () { 초칸.value = String(문구초); });
        var 시간글 = el('p', 'cz-hint', ''); c1c.appendChild(시간글);
        눌림목록.push(function () { var 띠 = 화면 === '제목고정형' || 화면 === '가운데영상형'; if (띠 && 문구시간 === '초') 문구시간 = 'all'; 초줄.style.display = !띠 && 문구시간 === '초' ? '' : 'none'; 시간글.textContent = 띠 ? (화면 === '제목고정형' ? '제목고정형' : '가운데영상형') + '은 위 띠가 계속 있어서 문구도 계속 보여요.' : (문구시간 === '초' ? (문구초 > 0 ? '영상이 시작하고 ' + 문구초 + '초 동안 보이다 서서히 사라져요.' : '0초로 두면 문구가 나오지 않아요.') : ''); });
      }
      if (opt.자막방식 !== undefined) {   // 자막 방식은 상품쇼츠만(렌더 서버가 한 줄씩·문장째·한두 단어씩을 그린다)
        var c1d = 카드('자막 방식', '한 번에 나오는 글자 양', '자막');
        var 방식줄 = el('div', 'cz-chips'); c1d.appendChild(방식줄);
        칩묶음(방식줄, [['구절형', '한 줄씩'], ['문장형', '문장째로'], ['단어형', '한두 단어씩']], function () { return 자막방식; }, function (v) { 자막방식 = v; 자막방식바꿈 = true; }, '자막 방식');
        c1d.appendChild(el('p', 'cz-hint', '고르지 않으면 한 줄씩 나와요. 한두 단어씩은 큰 글씨가 빠르게 바뀌어요'));
      }
      var c2 = 카드('자막 글자 모양', undefined, '자막');
      var gm = el('div', 'cz-grid cz-grid-sm'); c2.appendChild(gm);   // 자막 글자 모양: 작은 견본
      모양들.forEach(function (m) { var b = el('button', 'cz-opt'); b.type = 'button'; var s = el('span', 'cz-sample', '가나다'); s.style.fontWeight = String(m[2].w); s.style.color = m[2].c === '#fff' ? 'var(--ink)' : m[2].c; s.style.textShadow = m[2].c === '#fff' ? 'none' : '0 0 1px #0006'; if (m[2].bg) { s.style.background = m[2].bg === 'rgba(0,0,0,.75)' ? '#000a' : m[2].bg; s.style.color = m[2].bg === 'rgba(0,0,0,.75)' ? '#fff' : m[2].c; s.style.padding = '0 6px'; s.style.borderRadius = '4px'; } b.appendChild(s); b.appendChild(el('small', '', m[1]));
        b.addEventListener('click', function () { 선택.자막모양 = m[0]; 갱신(); }); gm.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(합치기(선택, 종류).값.자막모양 === m[0])); }); });
      var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '글꼴')); r1.appendChild(Object.assign(el('div', 'cz-chips'), {})); c2.appendChild(r1);
      칩묶음(r1.lastChild, 글꼴들, function () { return 합치기(선택, 종류).값.글꼴; }, function (v) { 선택.글꼴 = v; }, '글꼴');
      var c2b = 카드('읽는 글자 효과', '목소리가 읽는 단어를 색으로 칠해요', '자막');
      var 효과줄 = el('div', 'cz-chips'); c2b.appendChild(효과줄);
      칩묶음(효과줄, 읽는효과들, function () { return 합치기(선택, 종류).값.읽는효과 || '끔'; }, function (v) { 선택.읽는효과 = v; }, '읽는 글자 효과');   // '끔'도 값으로 보낸다(바깥 자막 효과 설정보다 꾸미기에서 고른 것이 우선)
      눌림목록.push(function () { 다시.style.display = (합치기(선택, 종류).값.읽는효과 || '끔') === '끔' ? 'none' : ''; });
      c2b.appendChild(el('p', 'cz-hint', '위쪽 미리보기에서 바로 확인해요. 실제 영상은 목소리 속도에 맞춰 조금 달라질 수 있어요'));
      var c3 = 카드('자막 크기와 줄', '가운데가 기본이에요', '자막');
      var rl = el('div', 'cz-row'); rl.appendChild(el('label', '', '줄 수')); var cl = el('div', 'cz-chips'); rl.appendChild(cl); c3.appendChild(rl);
      칩묶음(cl, [[1, '1줄'], [2, '2줄'], [3, '3줄']], function () { return 합치기(선택, 종류).값.줄수; }, function (v) { 선택.줄수 = v; }, '줄 수');
      var 자막믹서 = el('div', 'cz-mix'); c3.appendChild(자막믹서);   // 크기 · 줄 길이 · 위치를 믹서 페이더로(가운데 = 기본, 위·오른쪽 = 크게·올림·오른쪽)
      function 자막페이더(이름, 읽기, 쓰기, 보임, 모양) {
        var r = el('div', 'cz-row ' + (모양 || 'cz-fd')); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = -50; sl.max = 50; sl.step = 1; sl.setAttribute('aria-label', '자막 ' + 이름 + ' (가운데가 기본)'); if (!모양) sl.setAttribute('aria-orientation', 'vertical');
        sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 갱신(); }); r.appendChild(sl); 자막믹서.appendChild(r);   // 0은 건드리지 않은 것과 같다(키를 지운다)
        눌림목록.push(function () { sl.value = String(Math.round(수(읽기(), -50, 50, 0))); r.style.display = 보임 && !보임() ? 'none' : ''; var 끔 = !!합치기(선택, 종류).값.자막끄기; sl.disabled = 끔; r.classList.toggle('cz-off', 끔); });
      }
      자막페이더('글자 크기', function () { return (합치기(선택, 종류).값.자막크기 - 기준값().자막크기) / 0.84; }, function (v) { if (v === 0) delete 선택.자막크기; else 선택.자막크기 = Math.round(수(기준값().자막크기 + v * 0.84, 20, 200, 77) * 10) / 10; });
      자막페이더('줄 길이', function () { return (합치기(선택, 종류).값.줄길이 - 기준값().줄길이) / 0.0048; }, function (v) { if (v === 0) delete 선택.줄길이; else 선택.줄길이 = Math.round(수(기준값().줄길이 + v * 0.0048, 0.5, 1, 0.76) * 1000) / 1000; });
      var 기본거리 = function () { return Math.round((자막위치 === '위' ? (가로 ? 0.07 : 0.13) : (가로 ? 0.07 : 0.22)) * 100); };
      var 거리부호 = function () { return 자막위치 === '위' ? -1 : 1; };   // 거리가 클수록 '위'는 아래로, '아래'는 위로 간다 → 페이더는 언제나 위쪽(+) = 올림
      자막페이더('위·아래', function () { var d0 = 기본거리(), 지금 = 선택.자막거리 !== undefined ? 선택.자막거리 * 100 : d0, 올림 = (지금 - d0) * 거리부호(); return 올림 >= 0 ? 올림 / Math.max(1, (거리부호() > 0 ? 45 - d0 : d0)) * 50 : 올림 / Math.max(1, (거리부호() > 0 ? d0 : 45 - d0)) * 50; },
        function (v) { if (v === 0) { delete 선택.자막거리; return; } var d0 = 기본거리(), 위쪽 = 거리부호() > 0 ? 45 - d0 : d0, 아래쪽 = 거리부호() > 0 ? d0 : 45 - d0, 올림 = v > 0 ? v / 50 * 위쪽 : v / 50 * 아래쪽; 선택.자막거리 = Math.round(Math.min(45, Math.max(0, d0 + 올림 * 거리부호())) * 10) / 1000; },
        function () { return 자막위치 !== '가운데' && 화면 !== '가운데영상형'; });
      자막페이더('왼쪽·오른쪽', function () { return (선택.자막가로 !== undefined ? Math.round(선택.자막가로 * 100) : 50) - 50; }, function (v) { if (v === 0) delete 선택.자막가로; else 선택.자막가로 = (50 + v) / 100; }, null, 'cz-fd-h');
      var c4 = 카드('자막 위치', '자막이 나올 자리', '자막');
      var rp = el('div', 'cz-chips'); c4.appendChild(rp);
      칩묶음(rp, 위치들, function () { return 자막위치; }, function (v) { 자막위치 = v; 위치바꿈 = true; delete 선택.자막거리; }, '자막 위치');   // 거리는 가장자리 기준이라 위·아래가 바뀌면 처음 자리로
      var rk = el('div', 'cz-row'); rk.appendChild(el('label', '', '자막')); var ck = el('div', 'cz-chips'); rk.appendChild(ck); c4.appendChild(rk);
      [[false, '보이기'], [true, '끄기']].forEach(function (it) { var b = el('button', 'cz-chip', it[1]); b.type = 'button'; b.addEventListener('click', function () { if (it[0]) 선택.자막끄기 = true; else delete 선택.자막끄기; 갱신(); }); ck.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(!!선택.자막끄기 === it[0])); }); });
      c4.appendChild(el('p', 'cz-hint', '자막을 끄면 목소리만 나오고 문구는 그대로 보여요'));
      var c5 = 카드('문구', '영상 내내 보이는 글 · 최대 4개 (선택)', '문구');
      var 목록칸 = el('div'); 목록칸.style.cssText = 'display:grid;gap:12px'; c5.appendChild(목록칸);
      var 추가 = el('button', 'cz-btn', '+ 글자 추가'); 추가.type = 'button'; c5.appendChild(추가);
      function 블록그리기() {
        목록칸.textContent = ''; 추가.disabled = 블록목록().length >= 4; 추가.style.opacity = 추가.disabled ? '.5' : '';
        블록목록().forEach(function (b, i) {
          var 칸 = el('div', 'cz-card'); 칸.style.background = 'var(--bg-input)';
          var 입력 = el('input'); 입력.type = 'text'; 입력.maxLength = 40; 입력.value = b.글 || ''; 입력.placeholder = '예: 봄맞이 우리 가게'; 입력.setAttribute('aria-label', '문구 ' + (i + 1) + ' 내용'); 입력.style.cssText = 'min-height:44px;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-md);padding:0 12px;font:inherit;width:100%;box-sizing:border-box';
          var 문제칸 = el('p', 'cz-hint'); 문제칸.style.color = 'var(--err)'; 문제칸.setAttribute('role', 'alert');
          입력.addEventListener('input', function () { b.글 = 입력.value; 문제칸.textContent = 블록검사()[i] || ''; 그리기미리보기(); 적용상태(); });
          칸.appendChild(입력); 칸.appendChild(문제칸); 문제칸.textContent = 블록검사()[i] || '';
          var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '자리')); var c = el('div', 'cz-chips'); r1.appendChild(c); 칸.appendChild(r1);
          [['위', '위'], ['가운데', '가운데'], ['아래', '아래']].forEach(function (it) { var k = el('button', 'cz-chip', it[1]); k.type = 'button'; k.setAttribute('aria-pressed', String(b.위치.기준 === it[0])); k.addEventListener('click', function () { b.위치.기준 = it[0]; 블록그리기(); 그리기미리보기(); }); c.appendChild(k); });
          var 문구믹서 = el('div', 'cz-mix'); 칸.appendChild(문구믹서);   // 위치 페이더(가운데 = 처음 자리, 위·오른쪽 = 올림·오른쪽)
          function 문구페이더(이름, 읽기, 쓰기, 모양, 보임) {
            var r = el('div', 'cz-row ' + (모양 || 'cz-fd')); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = -50; sl.max = 50; sl.step = 1; sl.setAttribute('aria-label', '문구 ' + (i + 1) + ' ' + 이름 + ' (가운데가 기본)'); if (!모양) sl.setAttribute('aria-orientation', 'vertical');
            sl.value = String(Math.round(읽기())); sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 그리기미리보기(); }); r.appendChild(sl); 문구믹서.appendChild(r);
            if (보임 && !보임()) r.style.display = 'none';   // '가운데' 자리는 위·아래 거리가 없다
          }
          var 문부호 = function () { return b.위치.기준 === '위' ? -1 : 1; }, 문기본 = 15;   // 거리가 클수록 '위'는 아래로, '아래'는 위로 → 페이더는 언제나 + = 올림. 가운데(0) = 새 문구의 처음 자리(15%)
          문구페이더('위·아래', function () { var 올림 = (b.위치.거리 * 100 - 문기본) * 문부호(), 위쪽 = 문부호() > 0 ? 45 - 문기본 : 문기본, 아래쪽 = 문부호() > 0 ? 문기본 : 45 - 문기본; return 올림 >= 0 ? 올림 / 위쪽 * 50 : 올림 / 아래쪽 * 50; },
            function (v) { var 위쪽 = 문부호() > 0 ? 45 - 문기본 : 문기본, 아래쪽 = 문부호() > 0 ? 문기본 : 45 - 문기본, 올림 = v > 0 ? v / 50 * 위쪽 : v / 50 * 아래쪽; b.위치.거리 = Math.round(Math.min(45, Math.max(0, 문기본 + 올림 * 문부호())) * 10) / 1000; }, null, function () { return b.위치.기준 !== '가운데'; });
          문구페이더('왼쪽·오른쪽', function () { return b.위치.가로 * 100 - 50; }, function (v) { b.위치.가로 = (50 + v) / 100; }, 'cz-fd-h');
          var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '글자 크기')); var nm = el('input'); nm.type = 'number'; nm.min = 20; nm.max = 200; nm.value = b.크기; nm.setAttribute('aria-label', '문구 ' + (i + 1) + ' 크기'); nm.addEventListener('input', function () { b.크기 = Math.round(수(nm.value, 20, 200, 60)); 그리기미리보기(); }); r2.appendChild(nm);
          var 모 = el('div', 'cz-chips'); 모양들.forEach(function (m) { var k = el('button', 'cz-chip', m[1]); k.type = 'button'; k.setAttribute('aria-pressed', String(b.모양 === m[0])); k.addEventListener('click', function () { b.모양 = m[0]; 블록그리기(); 그리기미리보기(); }); 모.appendChild(k); }); r2.appendChild(모); 칸.appendChild(r2);
          var 삭 = el('button', 'cz-btn', '이 글자 지우기'); 삭.type = 'button'; 삭.addEventListener('click', function () { 블록목록().splice(i, 1); if (고름 && 고름.종류 === '블록') { if (고름.번호 === i) { 고름 = null; if (선택알림) 선택알림.textContent = '선택을 풀었어요'; } else if (고름.번호 > i) 고름.번호--; } 블록그리기(); 갱신(); 적용상태(); }); 칸.appendChild(삭);
          목록칸.appendChild(칸);
        });
        블록색다시(); 값표시();
      }
      추가.addEventListener('click', function () { if (블록목록().length >= 4) return; 블록목록().push({ 글: '', 위치: { 기준: '위', 거리: 0.15, 가로: 0.5 }, 크기: 60, 모양: '굵은흰', 글꼴: 'Noto Sans CJK KR' }); 블록그리기(); 갱신(); 적용상태(); });
      블록그리기();
      블록다시 = 블록그리기;
      끌기(ttx, 제목이동, '제목 글자', function (n, t) { if (t === 'click') 선택하기('제목글자'); }); 끌기(sub, 자막이동, '자막', function (n, t) { if (t === 'click') 선택하기('자막'); }); 끌기(띠손잡이, 띠이동, '제목 띠 높이', function (n, t) { if (t === 'click') 선택하기('제목띠'); }); 끌기(칸손잡이, 칸이동, '영상 칸 아래 끝', function (n, t) { if (t === 'click') 선택하기('바깥'); });
      ttl.addEventListener('click', function () { 선택하기('제목띠'); });   // 띠 빈 곳을 누르면 제목 띠 선택
      phone.addEventListener('click', function (e) { if (e.target.closest('.cz-drag, .cz-sub') || e.target === ttl) return; var 칸 = 화면 === '가운데영상형' && !가로, r = phone.getBoundingClientRect(), y = (e.clientY - r.top) / r.height; if (칸 && e.target !== ctr && (y > 칸상태.아래 || (y > Math.max(0.235, ttl.getBoundingClientRect().height / r.height) && y < 칸상태.위))) 선택하기('바깥'); else 선택풀기(); });   // 영상 칸 위·아래 빈 곳 = 바깥, 그 밖의 빈 곳 = 선택 풀기
      // 왼쪽 라이브러리: 화면 구성 · 모양 · 영상 제작 방식. 오른쪽 인스펙터 탭: 제목 · 자막 · 문구
      // 화면 구성·영상 제작 방식은 앞의 「구성」 단계로 옮겼다 → 이 창에서는 보이지 않게 떼어 둔다(값은 그대로 들고 있어서 되돌릴 일이 없다). 왼쪽 칸은 비워 둔다
      [판, 판2].forEach(function (c) { if (c && c.parentNode) c.parentNode.removeChild(c); });
      // 작업장(왼쪽): 앞 단계에서 올린 내 사진·영상을 모아 보여 준다. 누르면 미리보기 배경이 되고, 끌면 순서(= 장면 순서)가 바뀐다. 올리기·지우기는 앞 단계에서 한다
      var 자료 = (Array.isArray(opt.자료) ? opt.자료 : []).filter(function (x) { return !!x; });   // 그림이 없는 드라이브 사진·영상도 한 장면으로 센다(순서가 앞 단계 목록과 같아야 한다)
      var 작업장 = el('section', 'cz-card cz-wb'); 작업장.setAttribute('aria-label', '내 사진·영상');
      (function () {
        var 머리 = el('div', 'cz-ch cz-wb-h'); var 제 = el('h3', '', '내 사진·영상'); 머리.appendChild(제); var 수 = el('b', 'cz-now', ''); 제.appendChild(수); 작업장.appendChild(머리);
        var 격자 = el('div', 'cz-wb-grid'); 격자.setAttribute('role', 'list'); var 안내 = el('p', 'cz-hint cz-wb-note', ''); 작업장.appendChild(격자); 작업장.appendChild(안내);
        var 고른 = -1;
        function 쓰기그림(src) { var u = /^(blob:|https:\/\/|data:image\/)/.test(String(src || '')) ? String(src).replace(/["\\\n]/g, encodeURIComponent) : ''; if (!u) { bg.style.background = ''; ctr.style.background = '#222'; bg.setAttribute('data-ph', '사진 없음'); return; } bg.removeAttribute('data-ph'); bg.style.background = '#222 center / cover no-repeat url("' + u + '")'; ctr.style.background = '#222 center / cover no-repeat url("' + u + '")'; }
        function 그리기() {
          격자.textContent = '';
          수.textContent = 자료.length ? '지금: ' + 자료.length + '개' : '';
          안내.textContent = 자료.length ? '끌어서 순서 바꾸기 · 순서가 장면 순서' : (Array.isArray(opt.자료) ? '앞 단계에서 올린 사진이 여기에 모여요. 올리지 않으면 AI가 장면 그림을 만들어요' : '이 종류는 AI가 장면 그림을 만들어서 여기에 모이는 자료가 없어요');
          자료.forEach(function (it, i) {
            var t = el('div', 'cz-wb-t'); t.setAttribute('role', 'listitem'); t.tabIndex = 0; t.dataset.i = String(i); t.title = (it.이름 || '') + (it.영상 ? ' (영상)' : '');
            var im = el('span', 'cz-wb-img'); if (it.src) im.style.backgroundImage = 'url("' + String(it.src).replace(/["\\\n]/g, encodeURIComponent) + '")'; else { im.classList.add('cz-wb-ph'); im.textContent = it.영상 ? '영상' : (it.이름 || '사진'); } t.appendChild(im);
            t.appendChild(el('i', 'cz-wb-n', String(i + 1))); if (it.영상) { t.appendChild(el('i', 'cz-wb-v', '▶')); if (Number(it.끝) > 0) t.appendChild(el('i', 'cz-wb-r', (Math.round((Number(it.시작) || 0) * 10) / 10) + '–' + (Math.round(Number(it.끝) * 10) / 10) + 's')); }
            if (typeof opt.자료빼기 === 'function') {   // 빼기: 앞 단계 목록에서도 같이 빠진다. 뒤 장면의 장면별 설정은 한 칸씩 당긴다
              var 엑스 = el('button', 'cz-wb-x', '×'); 엑스.type = 'button'; 엑스.setAttribute('aria-label', (i + 1) + '번 빼기'); 엑스.title = '빼기';
              엑스.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
              엑스.addEventListener('click', function (e) { e.stopPropagation(); 빼기(i); });
              t.appendChild(엑스);
            }
            if (i === 고른) t.setAttribute('aria-pressed', 'true');
            t.addEventListener('click', function () { 고른 = i; 쓰기그림(it.src); if (영상종류 === '쇼츠') 편집고르기(i + 1); Array.prototype.forEach.call(격자.children, function (c, k) { c.setAttribute('aria-pressed', String(k === i)); }); });
            t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && e.altKey) { e.preventDefault(); 옮기기(i, i + (e.key === 'ArrowLeft' ? -1 : 1)); } });
            // 끌어서 순서 바꾸기(마우스·터치): 놓은 자리의 칸 앞으로 들어간다
            t.addEventListener('pointerdown', function (e) {
              if (e.button) return; var 시작x = e.clientX, 시작y = e.clientY, 끌림 = false, 놓음 = i;
              var 이동 = function (ev) {
                if (!끌림 && Math.abs(ev.clientX - 시작x) + Math.abs(ev.clientY - 시작y) < 6) return; 끌림 = true; t.classList.add('cz-wb-drag');
                var 칸들 = Array.prototype.slice.call(격자.children), 대상 = 칸들.length;
                var 최소 = 1e9; for (var k = 0; k < 칸들.length; k++) { var r = 칸들[k].getBoundingClientRect(), dx = ev.clientX < r.left ? r.left - ev.clientX : ev.clientX > r.right ? ev.clientX - r.right : 0, dy = ev.clientY < r.top ? r.top - ev.clientY : ev.clientY > r.bottom ? ev.clientY - r.bottom : 0, d = dx * dx + dy * dy; if (d < 최소) { 최소 = d; 대상 = ev.clientX < r.left + r.width / 2 ? k : k + 1; } }
                놓음 = 대상; 칸들.forEach(function (c, k) { c.classList.toggle('cz-wb-before', k === 대상 && k !== i && k !== i + 1); c.classList.toggle('cz-wb-after', 대상 === 칸들.length && k === 칸들.length - 1 && k !== i); });
              };
              var 끝 = function () { document.removeEventListener('pointermove', 이동); document.removeEventListener('pointerup', 끝); document.removeEventListener('pointercancel', 끝); t.classList.remove('cz-wb-drag'); Array.prototype.forEach.call(격자.children, function (c) { c.classList.remove('cz-wb-before'); c.classList.remove('cz-wb-after'); }); if (끌림 && 놓음 !== i && 놓음 !== i + 1) 옮기기(i, 놓음 > i ? 놓음 - 1 : 놓음); };
              document.addEventListener('pointermove', 이동); document.addEventListener('pointerup', 끝); document.addEventListener('pointercancel', 끝);
            });
            격자.appendChild(t);
          });
        }
        function 빼기(i) {
          if (i < 0 || i >= 자료.length) return;
          if (편집가능()) { var 문제 = 삭제하기(i); if (문제) { 알리기(문제); return; } if (고른 === i) { 고른 = -1; 쓰기그림(''); } else if (고른 > i) 고른--; var 다 = 격자.children[Math.min(i, 격자.children.length - 1)]; if (다) 다.focus(); return; }   // 되돌릴 수 있는 길
          기록지우기();   // 되돌릴 수 없는 삭제: 번호가 어긋나므로 기록을 비운다
          자료.splice(i, 1); if (Array.isArray(opt.자료) && opt.자료 !== 자료) opt.자료.splice(i, 1); if (Array.isArray(T.사진)) T.사진.splice(i, 1); T.사진수 = 자료.length || undefined;
          if (선택.장면별) { var 새 = {}; Object.keys(선택.장면별).forEach(function (k) { var n = Number(k); if (n === i + 1) return; 새[n > i + 1 ? n - 1 : n] = 선택.장면별[k]; }); if (Object.keys(새).length) 선택.장면별 = 새; else delete 선택.장면별; }
          if (고른 === i) { 고른 = -1; 쓰기그림(''); } else if (고른 > i) 고른--;
          try { opt.자료빼기(i); } catch (x) {}
          그리기(); 지난장 = 0; 속성키 = ''; if (typeof 타임라인그리기 === 'function') 타임라인그리기(); 갱신();
          var 다음 = 격자.children[Math.min(i, 격자.children.length - 1)]; if (다음) 다음.focus();
        }
        var 예약 = 0;
        function 지금읽기(강제) {   // 목록을 바로 다시 읽어 그린다. 강제: 구간·순서처럼 서명에 안 잡히는 변화도 속성을 새로 그린다(되돌리기용)
          if (typeof opt.자료읽기 !== 'function') return;
          {
            var 새 = (opt.자료읽기() || []).filter(function (x) { return !!x; });
            var 서명 = function (a) { return a.map(function (x) { return [x.영상 ? 1 : 0, x.재생주소 || '', x.영상 ? '' : (x.src || ''), x.이름 || ''].join('~'); }).join('|'); }, 바뀜 = 서명(자료) !== 서명(새);
            자료.length = 0; Array.prototype.push.apply(자료, 새); if (Array.isArray(opt.자료) && opt.자료 !== 자료) { opt.자료.length = 0; Array.prototype.push.apply(opt.자료, 새); }
            T.사진 = 새.map(function (x) { return x.src || ''; }); T.사진수 = 새.length || undefined;
            if (고른 >= 새.length) 고른 = -1; 그리기(); 지난장 = 0; if (바뀜 || 강제) 속성키 = ''; if (typeof 타임라인그리기 === 'function') 타임라인그리기();
          }
        }
        function 다시읽기() {   // 앞 단계 목록이 바뀌면(주소로 넣기·컴퓨터에서 올리기·썸네일 도착) 목록을 다시 읽어 온다
          if (typeof opt.자료읽기 !== 'function' || 예약) return;
          예약 = requestAnimationFrame(function () { 예약 = 0; 지금읽기(); });
        }
        window.__rwPoolRefresh = 다시읽기; window.__rwPoolNow = 지금읽기;
        if (typeof opt.자료더하기 === 'function') {   // 가져오기: 주소로 사진·영상 넣기 / 컴퓨터에서 올리기. 앞 단계 목록에 똑같이 더해진다
          var 폼 = el('div', 'cz-wb-add'); 폼.hidden = true; var 주소 = el('input', 'cz-wb-url'); 주소.type = 'url'; 주소.placeholder = 'https://… 사진·영상 주소'; 주소.setAttribute('aria-label', '사진·영상 주소');
          var 종 = el('span', 'cz-seg2'); 종.setAttribute('role', 'group'); 종.setAttribute('aria-label', '종류'); var 지금종류 = 'image';
          [['image', '사진'], ['video', '영상']].forEach(function (x) { var b = el('button', 'cz-chip', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String(x[0] === 지금종류)); b.addEventListener('click', function () { 지금종류 = x[0]; Array.prototype.forEach.call(종.children, function (k, n) { k.setAttribute('aria-pressed', String(n === (x[0] === 'image' ? 0 : 1))); }); }); 종.appendChild(b); });
          var 더 = el('button', 'cz-btn', '가져오기'); 더.type = 'button'; var 알림 = el('p', 'cz-hint cz-wb-msg', ''); 알림.setAttribute('role', 'status');
          주소.addEventListener('input', function () { if (/\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(주소.value)) { 지금종류 = 'video'; Array.prototype.forEach.call(종.children, function (k, n) { k.setAttribute('aria-pressed', String(n === 1)); }); } else if (/\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(주소.value)) { 지금종류 = 'image'; Array.prototype.forEach.call(종.children, function (k, n) { k.setAttribute('aria-pressed', String(n === 0)); }); } });
          function 넣기() { var 문제 = opt.자료더하기(주소.value, 지금종류); 알림.textContent = 문제 || ''; if (!문제) { 주소.value = ''; 다시읽기(); 폼.hidden = true; 알림.textContent = ''; } }
          더.addEventListener('click', 넣기); 주소.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); 넣기(); } });
          폼.appendChild(주소); 폼.appendChild(종); 폼.appendChild(더);
          작업장.appendChild(폼); 작업장.appendChild(알림);
          // 위쪽 「파일」 메뉴가 부르는 동작: 주소로 가져오기(주소 칸을 열어 줌) · 컴퓨터에서 가져오기
          파일동작.주소 = function () { 폼.hidden = false; 주소.focus(); };
          if (typeof opt.컴퓨터올리기 === 'function') 파일동작.컴퓨터 = function () { if (opt.컴퓨터올리기() === false) { 폼.hidden = false; 알림.textContent = '지금은 컴퓨터에서 가져올 수 없어요.'; } };
        }
        function 옮기기(a, b, 기록안함) {
          if (b < 0 || b >= 자료.length || a === b) return; if (!기록안함 && 영상종류 === '쇼츠') 기록하기({ 이름: '순서 바꾸기', undo: function () { 옮기기(b, a, true); }, redo: function () { 옮기기(a, b, true); } });
          장면별옮김(function (n) { var k = n - 1; return (k === a ? b : (a < b && k > a && k <= b) ? k - 1 : (a > b && k >= b && k < a) ? k + 1 : k) + 1; });   // 장면 설정(움직임·음량)은 장면을 따라 간다 var it = 자료.splice(a, 1)[0]; 자료.splice(b, 0, it); if (Array.isArray(opt.자료) && opt.자료 !== 자료) { var o = opt.자료.splice(a, 1)[0]; opt.자료.splice(b, 0, o); } if (Array.isArray(T.사진) && T.사진.length > Math.max(a, b)) { var tp = T.사진.splice(a, 1)[0]; T.사진.splice(b, 0, tp); }   // 장면 순서(사진·정보)도 같이 옮겨 재생·속성·타임라인이 새 순서를 따른다
          if (고른 === a) 고른 = b; else if (고른 >= 0 && a < b && 고른 > a && 고른 <= b) 고른--; else if (고른 >= 0 && a > b && 고른 >= b && 고른 < a) 고른++;
          if (typeof opt.자료옮김 === 'function') { try { opt.자료옮김(a, b); } catch (x) {} }
          그리기(); 지난장 = 0; 속성키 = ''; if (typeof 타임라인그리기 === 'function') 타임라인그리기(); var 칸 = 격자.children[b]; if (칸) 칸.focus();
        }
        장면옮기기 = 옮기기;
        그리기();
      })();
      lib.appendChild(작업장);
      var 모양판 = null; if (c1) { c1.dataset.tab = '*'; c1.classList.remove('cz-fold'); var 머리1 = c1.querySelector('.cz-ch'); if (머리1) 머리1.setAttribute('aria-expanded', 'true'); 모양판 = el('section', 'cz-shapepg'); 모양판.setAttribute('aria-label', '모양 고르기'); 모양판.appendChild(c1); }
      // 색 페이지(리졸브 컬러 페이지): 색은 전부 여기서 고른다. 칸마다 휠 하나 — 제목 띠 · 제목 글자 · 자막 · 위·아래 빈 곳 · 단어 · 읽는 글자 · 문구(글자마다). 값은 꾸미기 안의 같은 칸을 그대로 쓴다(새 기능 없음)
      var 색판 = el('section', 'cz-colpg'); 색판.setAttribute('aria-label', '색');
      function 색칸(이름, 키, 기본색, 읽기, 설명) {   // 기본색과 같은 색을 고르면 '안 고른 것'으로 되돌린다(템플릿·구성이 바뀌어도 따라가도록). ↺ 는 안 고른 상태로
        var 칸 = el('div', 'cz-colpg-c'); 칸.appendChild(el('h4', '', 이름)); var 바탕 = function () { return 읽기() || (typeof 기본색 === 'function' ? 기본색() : 기본색) || '#808080'; };
        var 휠 = 색휠({ 이름: 이름, 페이지형: true, 기본hex: 기본색, 쓰기: function (hx) { 선택[키] = hx; var 기 = typeof 기본색 === 'function' ? 기본색() : 기본색; if (기 && hx.toLowerCase() === String(기).toLowerCase()) delete 선택[키]; 갱신(); }, 기본으로: function () { delete 선택[키]; 갱신(); } });
        칸.appendChild(휠.box); if (설명) 칸.appendChild(el('p', 'cz-hint', 설명));
        눌림목록.push(function () { 휠.맞추기(바탕()); }); 색판.appendChild(칸); return 칸;
      }
      var 값읽기 = function (키, 기본) { return function () { var x = 합치기(선택, 종류).값[키]; return 헥스.test(x || '') ? x : (기본 || ''); }; };
      var 띠칸 = 색칸('제목 띠 색', '제목띠색', '#15110e', 값읽기('제목띠색', '#15110e'));
      var 제글칸 = 색칸('제목 글자색', '제목글자색', '#fff200', 값읽기('제목글자색', '#fff200'));
      var 자기본 = function () { return 모양겉(합치기(선택, 종류).값.자막모양).c.replace(/^#fff$/i, '#FFFFFF'); };
      색칸('자막 글자색', '자막색', 자기본, 값읽기('자막색', ''));
      var 빈곳칸 = 색칸('위·아래 빈 곳', '가운데색', '', 값읽기('가운데색', ''), '↺ 로 되돌리면 흐리게 보여요');
      var 단어칸 = 색칸('단어 색', '핵심색', '', function () { return 이름색(합치기(선택, 종류).값.핵심색) || ''; }, '대본에서 중요한 단어에 칠해져요. ↺ 는 모양의 기본값으로 돌려요');
      var 단어없음 = el('button', 'cz-btn', '칠하지 않음'); 단어없음.type = 'button'; 단어없음.addEventListener('click', function () { 선택.핵심색 = '없음'; 갱신(); }); 단어칸.appendChild(단어없음);
      눌림목록.push(function () { 단어없음.setAttribute('aria-pressed', String(합치기(선택, 종류).값.핵심색 === '없음')); });
      var 읽는칸 = 색칸('읽는 글자 색', '읽는색', '#FFE14D', function () { return 이름색(합치기(선택, 종류).값.읽는색 || '노랑') || '#FFE14D'; }, '읽는 글자 효과를 켰을 때 칠하는 색이에요');
      var 블록색칸들 = [];   // 문구마다 하나(글자를 더하거나 지우면 다시 만든다)
      var 블록색맞추기 = function () { 블록색칸들.forEach(function (c) { c.맞추기(); }); };
      블록색다시 = function () {
        블록색칸들.forEach(function (c) { if (c.칸.parentNode) c.칸.parentNode.removeChild(c.칸); }); 블록색칸들 = [];
        블록목록().forEach(function (b, i) {
          var 칸 = el('div', 'cz-colpg-c'); 칸.appendChild(el('h4', '', '문구 ' + (i + 1) + ' 색')); var 바탕 = function () { return 헥스.test(b.색 || '') ? b.색 : 모양겉(b.모양).c.replace(/^#fff$/i, '#FFFFFF'); };
          var 휠 = 색휠({ 이름: '문구 ' + (i + 1), 페이지형: true, 기본hex: function () { return 모양겉(b.모양).c.replace(/^#fff$/i, '#FFFFFF'); }, 쓰기: function (hx) { b.색 = hx; 그리기미리보기(); }, 기본으로: function () { delete b.색; 휠.맞추기(바탕()); 그리기미리보기(); } });
          칸.appendChild(휠.box); 색판.appendChild(칸); 휠.맞추기(바탕()); 블록색칸들.push({ 칸: 칸, 맞추기: function () { 휠.맞추기(바탕()); } });
        });
      };
      눌림목록.push(function () {
        var 보임 = !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'), 값 = 합치기(선택, 종류).값;
        띠칸.style.display = 제글칸.style.display = 보임 ? '' : 'none'; 빈곳칸.style.display = !가로 && 화면 === '가운데영상형' ? '' : 'none'; 읽는칸.style.display = (값.읽는효과 || '끔') === '끔' ? 'none' : ''; 블록색맞추기();
      });
      블록색다시();
      독몸.appendChild(색판);
      var 빈탭 = el('p', 'cz-card cz-hintcard', '이 화면 구성에는 위쪽 제목 띠가 없어요. 제목 띠가 필요하면 앞의 「구성」 단계에서 제목고정이나 가운데영상을 골라요.'); 빈탭.dataset.tab = '제목'; body.appendChild(빈탭);
      눌림목록.push(function () { 빈탭.style.display = (띠없음 || 화면 === '제목고정형' || 화면 === '가운데영상형') ? 'none' : ''; });
      var 띠없음 = 가로 || 화면목록.length < 2;   // 화면 구성을 고를 수 없으면(가로·롱폼 세로) 제목 띠도 없다
      var 탭순서 = 띠없음 ? ['자막', '문구'] : ['제목', '자막', '문구'], 있는탭 = 탭순서.filter(function (t) { return body.querySelector('.cz-card[data-tab="' + t + '"]'); });
      var 머리줄 = el('div', 'cz-bodyhead'); body.insertBefore(머리줄, body.firstChild);   // 탭 + 선택 줄(스크롤해도 위에 붙어 있다)
      var 선택줄 = el('div', 'cz-selbar'); 선택줄.setAttribute('role', 'group'); 선택줄.setAttribute('aria-label', '꾸밀 요소 고르기 (미리보기를 눌러도 돼요)'); 선택줄.appendChild(el('span', 'cz-selbar-l', '선택'));
      [['제목띠', '제목 띠', 0], ['제목글자', '제목 글자', 0], ['자막', '자막', 0], ['블록', '문구 1', 0], ['블록', '문구 2', 1], ['블록', '문구 3', 2], ['블록', '문구 4', 3], ['바깥', '빈 곳', 0]].forEach(function (c) {
        var b = el('button', 'cz-chip', c[1]); b.type = 'button'; b.dataset.종류 = c[0]; b.dataset.번호 = String(c[2]); b.dataset.k = '선택-' + c[0] + (c[0] === '블록' ? (c[2] + 1) : ''); b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { if (고름 && 고름.종류 === c[0] && 고름.번호 === c[2]) 선택풀기(); else 선택하기(c[0], c[2]); }); 선택줄칩[c[0] + c[2]] = b; 선택줄.appendChild(b);
      });
      var 풀기 = el('button', 'cz-chip cz-selbar-x', '해제'); 풀기.type = 'button'; 풀기.setAttribute('aria-label', '선택 풀기 (Esc)'); 풀기.addEventListener('click', 선택풀기); 선택줄칩.__해제 = 풀기; 선택줄.appendChild(풀기);
      선택알림 = el('span', 'cz-sr'); 선택알림.setAttribute('aria-live', 'polite'); 선택줄.appendChild(선택알림); 머리줄.appendChild(선택줄); 눌림목록.push(선택바갱신); 선택바갱신();
      body.id = 'cz-panel'; body.setAttribute('role', 'group');
      function 탭보이기(t) { [].forEach.call(body.querySelectorAll('.cz-card[data-tab]'), function (c) { c.classList.toggle('cz-tabhide', c.dataset.tab !== '*' && c.dataset.tab !== t); }); }
      // 아래 칸 위쪽의 페이지 막대(리졸브의 페이지): 타임라인 · 제목 · 자막 · 색 · 모양 · 문구. 누르면 타임라인 자리에 그 설정이 나타난다
      var 페이지줄 = el('div', 'cz-pages'); 페이지줄.setAttribute('role', 'tablist'); 페이지줄.setAttribute('aria-label', '작업 화면');
      var 쪽그림 = { '타임라인': 'M4 7h16M4 12h10M4 17h13', '제목': 'M5 6h14M12 6v13M9 19h6', '자막': 'M4 6h16v12H4zM8 11h8M8 14.5h5', '색': 'M12 3a9 9 0 100 18c1.4 0 2-1 1.6-2-.5-1.2.2-2.5 1.6-2.5H17a4 4 0 004-4c0-5-4-9.5-9-9.5zM7.5 11h.01M10 7.5h.01M14.5 7.5h.01', '모양': 'M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z', '문구': 'M12 3v8M8.5 11h7l-1.5 4h-4zM12 15v6' };
      var 쪽목록 = ['타임라인', '제목', '자막', '색', '모양', '문구'].filter(function (n) { return n === '타임라인' || n === '색' || (n === '모양' ? !!모양판 : 있는탭.indexOf(n) >= 0); });
      function 페이지보기(k) {
        var 글자쪽 = 있는탭.indexOf(k) >= 0; dlg.dataset.pg = 글자쪽 ? 'text' : ({ '타임라인': 'tl', '색': 'color', '모양': 'shape' })[k] || 'tl'; dlg.dataset.tab = 글자쪽 ? k : ''; if (글자쪽) 탭보이기(k);   // tab: 선택 줄에서 이 쪽과 관계없는 칩을 숨긴다(제목 쪽에는 자막 칩 없음)
        Array.prototype.forEach.call(페이지줄.children, function (b) { var 선 = b.dataset.k === k; b.setAttribute('aria-selected', String(선)); b.tabIndex = 선 ? 0 : -1; }); if (k === '색') 눌림갱신();
      }
      쪽목록.forEach(function (n, i) { var b = el('button', 'cz-page'); b.type = 'button'; b.dataset.k = n; b.setAttribute('role', 'tab'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + 쪽그림[n] + '"/></svg><span>' + n + '</span>';
        b.addEventListener('click', function () { 페이지보기(n); });
        b.addEventListener('keydown', function (e) { var 다음 = e.key === 'ArrowRight' ? (i + 1) % 쪽목록.length : e.key === 'ArrowLeft' ? (i + 쪽목록.length - 1) % 쪽목록.length : e.key === 'Home' ? 0 : e.key === 'End' ? 쪽목록.length - 1 : -1; if (다음 < 0) return; e.preventDefault(); 페이지보기(쪽목록[다음]); 페이지줄.children[다음].focus(); });
        페이지줄.appendChild(b); });
      dock.insertBefore(페이지줄, 독몸); if (모양판) 독몸.appendChild(모양판);
      탭이동 = function (t) { var 지금 = dlg.dataset.pg; if (지금 === 'color' || 지금 === 'shape') return; if (있는탭.indexOf(t) >= 0) 페이지보기(t); };   // 미리보기에서 요소를 누르면 그 설정으로(색·모양을 보는 중이면 그대로)
      페이지보기('타임라인');
      // 아래 칸 높이 조절: 손잡이를 위로 끌면 페이지 막대와 타임라인(설정)이 함께 커지고, 미리보기는 그만큼만 줄어든다
      (function () {
        var 가장 = 130; function 최대() { return Math.max(가장, dlg.clientHeight - head.offsetHeight - 276); }
        function 놓기(px) { px = Math.round(Math.max(가장, Math.min(최대(), px))); dlg.style.setProperty('--dock-h', px + 'px'); 그립.setAttribute('aria-valuenow', String(px)); 저장하기('독', px); 폭판정(); }
        그립.addEventListener('pointerdown', function (e) { if (e.button) return; e.preventDefault(); var y0 = e.clientY, h0 = dock.offsetHeight; 그립.setPointerCapture(e.pointerId);
          var 이동 = function (ev) { 놓기(h0 + (y0 - ev.clientY)); }, 끝 = function () { 그립.removeEventListener('pointermove', 이동); 그립.removeEventListener('pointerup', 끝); 그립.removeEventListener('pointercancel', 끝); };
          그립.addEventListener('pointermove', 이동); 그립.addEventListener('pointerup', 끝); 그립.addEventListener('pointercancel', 끝); });
        그립.addEventListener('keydown', function (e) { if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return; e.preventDefault(); 놓기(dock.offsetHeight + (e.key === 'ArrowUp' ? 24 : -24)); });
      })();
      타임라인만들기();
    }
    function 닫기(결과) { 효과음멈춤(); if (!결과 && 되돌림통.length) { try { while (되돌림통.length) 되돌림통.pop().undo(); } catch (x) {} }   /* 취소: 이 창에서 한 장면 편집(카드)도 함께 되돌린다 */
      파일메뉴닫기(); window.__rwPoolRefresh = null; window.__rwPoolNow = null; try { if (넓은.removeEventListener) 넓은.removeEventListener('change', 넓은바뀜); else if (넓은.removeListener) 넓은.removeListener(넓은바뀜); } catch (x) {} if (폭관찰) 폭관찰.disconnect(); if (결과관찰) 결과관찰.disconnect(); if (결과예약) cancelAnimationFrame(결과예약); 읽기멈춤(); 재생멈춤(); if (끌기중단) 끌기중단(); document.removeEventListener('keydown', 키); document.body.style.overflow = 이전스크롤; ov.remove(); if (이전포커스 && 이전포커스.focus) 이전포커스.focus(); if (결과 && typeof opt.onDone === 'function') opt.onDone(결과); }
    function 키(e) {
      if (e.key === 'Escape') { e.preventDefault(); if (선택풀기()) return; 닫기(null); return; }   // 고른 요소가 있으면 선택만 풀고, 없을 때만 창을 닫는다
      if (편집가능() && !e.altKey && !e.repeat) {   // 타임라인 편집 단축키(글 쓰는 칸에서는 그대로 둔다. 슬라이더·체크 칸은 글 칸이 아니다)
        var 대 = e.target, 글칸 = 대 && (대.isContentEditable || 대.tagName === 'TEXTAREA' || 대.tagName === 'SELECT' || (대.tagName === 'INPUT' && !/^(range|checkbox|radio|button|submit|color)$/i.test(대.type))), 모 = e.ctrlKey || e.metaKey, 키값 = String(e.key).toLowerCase();
        if (!글칸) {
          if (모 && !e.shiftKey && 키값 === 'z') { e.preventDefault(); 되돌리기(); return; }
          if (모 && ((e.shiftKey && 키값 === 'z') || (!e.shiftKey && 키값 === 'y'))) { e.preventDefault(); 다시하기(); return; }
          if (모 && !e.shiftKey && 키값 === 'c' && !String(window.getSelection && window.getSelection())) { e.preventDefault(); 복사하기(); return; }
          if (모 && !e.shiftKey && 키값 === 'v') { e.preventDefault(); 붙여넣기(); return; }
          if (!모 && !e.shiftKey && e.code === 'KeyS') { e.preventDefault(); 나누기(); return; }
          if (!모 && e.key === 'Delete') { e.preventDefault(); 삭제도구(); return; }
        }
      }
      if (e.key !== 'Tab') return;
      var f = [].slice.call(dlg.querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    x.addEventListener('click', function () { 닫기(null); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) 닫기(null); });
    gc.addEventListener('change', function () { 가이드켜짐 = gc.checked; 그리기미리보기(); });
    reset.addEventListener('click', function () { 속성키 = ''; 고름 = null; 선택 = {}; 화면 = 기본화면(); 화면바꿈 = false; 자막위치 = '아래'; 위치바꿈 = false; 초기화함 = true; 블록다시(); 갱신(); });
    function 적용상태() { var 막힘 = 블록검사().some(Boolean); ok.disabled = 막힘; ok.style.opacity = 막힘 ? '.5' : ''; ok.title = 막힘 ? '문구의 쓸 수 없는 표현을 먼저 고쳐 주세요' : ''; }
    ok.addEventListener('click', function () { if (ok.disabled) return;
      if (선택.블록) { 선택.블록 = 선택.블록.filter(function (b) { return String(b.글 || '').trim(); }).map(function (b) { return Object.assign({ 글: String(b.글).trim(), 위치: b.위치, 크기: b.크기, 모양: b.모양, 글꼴: b.글꼴 }, 헥스.test(b.색 || '') ? { 색: b.색 } : {}); }); if (!선택.블록.length) delete 선택.블록; }
      if (선택.자막크기 !== undefined) 선택.자막크기 = Math.round(선택.자막크기); if (선택.줄길이 !== undefined) 선택.줄길이 = Math.round(선택.줄길이 * 100) / 100; if (선택.자막거리 !== undefined) 선택.자막거리 = Math.round(선택.자막거리 * 100) / 100;   /* 페이더로 만든 소수는 여기서 정리한다 */
      var m = 합치기(선택, 종류); 닫기({ compose: Object.assign({}, 선택), 문구시간: 문구시간쓰기 ? (문구시간 === '초' ? 문구초 + 's' : 'all') : undefined, 자막방식: opt.자막방식 !== undefined ? 자막방식 : undefined, 자막위치: 자막위치, 화면구성: 화면바꿈 ? 화면 : (opt.화면구성 || 화면), 제작방식: 제작바꿈 ? 제작값 : undefined, 위치바뀜: 자막위치 !== 처음위치, 초기화: 초기화함 && !Object.keys(선택).length && 자막위치 === '아래' }); });
    document.addEventListener('keydown', 키);
    var 이전스크롤 = document.body.style.overflow; document.body.style.overflow = 'hidden'; dlg.tabIndex = -1;
    document.body.appendChild(ov); dlg.focus();
    템플릿불러오기().then(function () { 만들기(); 갱신(); 적용상태(); x.focus(); });
  }

  window.RWCompose = { open: open, 요약: 요약, 불러오기: 템플릿불러오기, 합치기: 합치기 };
})();
