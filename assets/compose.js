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
    function 그리기() {
      var rad = 링.clientWidth / 2 || 56, a = 상태.h * Math.PI / 180; 점.style.left = (50 + 50 * 상태.s * Math.sin(a)) + '%'; 점.style.top = (50 - 50 * 상태.s * Math.cos(a)) + '%';
      그늘.style.background = 'rgba(0,0,0,' + (1 - 상태.v) + ')'; 막.value = String(Math.round(상태.v * 100)); 막.style.setProperty('--cw', hsv로hex(상태.h, 상태.s, 1));
      점.style.background = 지금hex; if (document.activeElement !== 입) { 입.value = 지금hex; 입.classList.remove('cz-bad'); }
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
    var 제작방식 = opt.제작방식 || null, 제작값 = 제작방식 ? 제작방식.값 : '', 제작바꿈 = false;
    var 화면바꿈 = false; var 선택 = Object.assign({}, opt.값 || {}); var 자막위치 = opt.자막위치 || '아래'; var 처음위치 = 자막위치, 위치바꿈 = false, 초기화함 = false; var 가이드켜짐 = true;
    var 샘플 = String(opt.샘플 || '').trim() || 샘플기본; var 자막방식 = ['구절형', '문장형', '단어형'].indexOf(opt.자막방식) >= 0 ? opt.자막방식 : '구절형', 자막방식바꿈 = false; var 문구시간 = opt.문구시간 === '3s' ? '3s' : 'all', 문구시간쓰기 = opt.문구시간 !== undefined;   // 문구가 보이는 시간은 상품쇼츠만(계속 / 처음 3초)
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
    var tools = el('div', 'cz-pvtools'); var gl = el('label'); var gc = el('input'); gc.type = 'checkbox'; gc.checked = true; gl.appendChild(gc); gl.appendChild(document.createTextNode(' 유튜브가 쓰는 자리 점선으로 보기')); tools.appendChild(gl);
    var 다시 = el('button', 'cz-btn'); 다시.type = 'button'; 다시.textContent = '▶ 읽는 효과 다시 보기'; 다시.style.cssText = 'min-height:44px;display:none'; tools.appendChild(다시);
    var 재생줄 = el('div', 'cz-tp'); 재생줄.setAttribute('role', 'group'); 재생줄.setAttribute('aria-label', '재생');
    var 처음버튼 = el('button', 'cz-tpb', '⏮'), 재생버튼 = el('button', 'cz-tpb cz-tpb-main', '▶'), 끝버튼 = el('button', 'cz-tpb', '⏭'), 재생시간 = el('span', 'cz-tpt', '0:00');
    처음버튼.type = 재생버튼.type = 끝버튼.type = 'button'; 처음버튼.setAttribute('aria-label', '처음으로'); 재생버튼.setAttribute('aria-label', '재생'); 끝버튼.setAttribute('aria-label', '끝으로');
    재생줄.appendChild(처음버튼); 재생줄.appendChild(재생버튼); 재생줄.appendChild(끝버튼); 재생줄.appendChild(재생시간); tools.insertBefore(재생줄, tools.firstChild);
    var 위치옮김 = function () {}, 재생중 = false, 재생틀 = 0, 재생전 = 0;
    var warn = el('ul', 'cz-warn'); warn.setAttribute('aria-live', 'polite');
    var 머리비 = 0, 뷰시각 = el('small', 'cz-vt', ''), 클립목록 = [];   // 재생 위치(0~1)와 미리보기 위쪽 줄의 시각 글자
    var 뷰머리 = el('div', 'cz-vhead'); 뷰머리.appendChild(el('b', '', '미리보기')); var 뷰비 = el('span', '', 가로 ? '16:9 가로' : '9:16 세로'); 뷰비.appendChild(뷰시각); 뷰머리.appendChild(뷰비); pv.appendChild(뷰머리);   // 리졸브의 뷰어 머리줄
    pv.appendChild(phone); pv.appendChild(tools); pv.appendChild(warn); pv.appendChild(el('p', 'cz-note', '제목·자막·고정 글자는 끌어서 옮길 수 있어요 · 실제 영상은 조금 다를 수 있어요'));
    var lib = el('aside', 'cz-lib'); lib.setAttribute('aria-label', '구성과 모양'); var body = el('div', 'cz-body'); var tl = el('section', 'cz-tl'); tl.setAttribute('aria-label', '타임라인(앞 단계에서 정한 값)');
    var foot = el('div', 'cz-foot'); var reset = el('button', 'cz-btn', '처음 모양으로'); reset.type = 'button'; var ok = el('button', 'cz-btn cz-main', '적용하기'); ok.type = 'button'; foot.appendChild(reset); foot.appendChild(ok);
    dlg.appendChild(head); dlg.appendChild(lib); dlg.appendChild(pv); dlg.appendChild(body); dlg.appendChild(tl); dlg.appendChild(foot); ov.appendChild(dlg);

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
      if (가운데형) {   // 영상 칸: 위는 문구 아래(서버와 같은 식), 아래 끝은 꾸미기에서 정한 값(없으면 예전 크기)
        var 위비 = Math.max(0.235, 상자.띠 / H + 0.012), 아래비 = typeof v.가운데아래 === 'number' ? Math.max(위비 + 0.12, Math.min(0.9, v.가운데아래)) : 위비 + 0.36;
        칸상태 = { 위: 위비, 아래: 아래비 }; ctr.style.top = (위비 * 100) + '%'; ctr.style.height = ((아래비 - 위비) * 100) + '%'; 칸손잡이.style.top = (아래비 * 100) + '%';
      }
      칸손잡이.style.display = 가운데형 ? 'block' : 'none';
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
        d.dataset.블록 = String(i); 끌기(d, function (dx, dy) { b.위치.가로 = 한계(b.위치.가로 + dx, 0, 1); if (b.위치.기준 !== '가운데') b.위치.거리 = 한계(b.위치.거리 + (b.위치.기준 === '위' ? dy : -dy), 0, 0.45); }, '고정 글자 ' + (i + 1), function (n, t) { if (t === 'click') 선택하기('블록', i); });
        if (RWLayout.가이드(W, H).some(function (g) { return RWLayout.겹침비(bs, g) > 0.1; })) 블록경고.push('고정 글자 ' + (i + 1) + '번이 유튜브가 쓰는 자리와 겹쳐요. 그대로 만들 수 있어요');
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
    var 블록다시 = function () {};   // 만들기() 안의 블록그리기를 가리킨다
    var 제목상태 = null;   // 마지막으로 그린 제목 상자(끌기가 쓴다)
    var 한계 = function (x, a, b) { return Math.min(b, Math.max(a, x)); }, 둘째 = function (x) { return Math.round(x * 100) / 100; };
    // ---------- 요소 선택 (리졸브에서 컷을 누르면 인스펙터가 따라가듯) ----------
    // 선택 = { 종류, 번호 }. 미리보기 요소는 값을 바꿀 때마다 다시 그려지므로 요소가 아니라 '이름표'로 기억하고, 그릴 때마다 테두리를 다시 입힌다.
    // 선택해도 값은 하나도 바뀌지 않는다: 해당 탭으로 옮기고 그 요소의 색 휠을 열어 줄 뿐이다. 모든 설정은 탭에서 그대로 할 수 있다.
    var 고름 = null, 휠열기 = {}, 블휠열기 = [], 탭이동 = function () {}, 선택줄칩 = {}, 선택알림 = null, 선택알림글 = '';
    var 띠있음 = function () { return !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'); };
    var 대상표 = {
      '제목띠': { 이름: '제목 띠', 탭: '제목', 가능: function () { return 띠있음(); }, 열기: function () { return 휠열기['제목띠색'] && 휠열기['제목띠색'](); } },
      '제목글자': { 이름: '제목 글자', 탭: '제목', 가능: function () { return 띠있음(); }, 열기: function () { return 휠열기['제목글자색'] && 휠열기['제목글자색'](); } },
      '자막': { 이름: '자막', 탭: '자막', 가능: function () { return !v0().자막끄기; }, 열기: function () { return 휠열기['자막색'] && 휠열기['자막색'](); } },
      '블록': { 이름: '고정 글자', 탭: '고정 글자', 가능: function (n) { return n < 블록목록().length; }, 열기: function (n) { return 블휠열기[n] && 블휠열기[n](); } },
      '바깥': { 이름: '위·아래 빈 곳', 탭: '제목', 가능: function () { return 화면 === '가운데영상형' && !가로; }, 열기: function () { return 휠열기['가운데색'] && 휠열기['가운데색'](); } }
    };
    function 선택이름() { return 고름 ? 대상표[고름.종류].이름 + (고름.종류 === '블록' ? ' ' + (고름.번호 + 1) : '') : ''; }
    function 선택하기(종류, 번호) {
      var t = 대상표[종류]; if (!t || !t.가능(번호)) return;
      var 라벨 = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('aria-label');
      고름 = { 종류: 종류, 번호: 번호 || 0 }; 탭이동(t.탭); t.열기(번호); 선택바갱신(); 그리기미리보기();
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
    // 미리보기 끌기: 눌러서 끌면 오른쪽 슬라이더와 같은 값이 바뀐다. 방향키로도 움직인다. 끄는 동안 요소가 다시 그려져도 이어지도록 문서에서 움직임을 듣는다
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
      재생중 = true; 재생버튼.textContent = '⏸'; 재생버튼.setAttribute('aria-label', '멈춤'); 재생전 = 0; 읽기재생();
      var 틱 = function (now) { if (!재생중) return; if (!재생전) 재생전 = now; var 다 = Math.min(0.1, (now - 재생전) / 1000); 재생전 = now; var 다음 = 머리비 + 다 / 훑기; 위치옮김(다음); if (다음 >= 1) { 재생멈춤(); return; } 재생틀 = requestAnimationFrame(틱); };
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

    var 카드그림 = { '화면 구성': 'M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2zM9 9h6v6H9z', '영상 제작 방식': 'M4 6h16v12H4zM8 6v12M16 6v12M4 10h4M4 14h4M16 10h4M16 14h4', '문구가 보이는 시간': 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z', '자막 방식': 'M5 7h14M5 12h14M5 17h9', '모양 고르기': 'M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4zM18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z', '제목 설정': 'M5 6h14M12 6v13M9 19h6', '자막 글자 모양': 'M4 7h16v10H4zM8 12h8M10 15h4', '읽는 글자 효과': 'M4 18l5-5 4 4 7-9M4 6h6', '자막 크기와 줄': 'M5 7h14M5 12h10M5 17h14', '자막 위치': 'M12 21s-6-5.2-6-10a6 6 0 0112 0c0 4.8-6 10-6 10zM12 11.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z', '고정 글자': 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7' };
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
    function 타임라인그리기() {
      tl.textContent = '';
      var 길이 = Number(T.길이초) > 0 ? Number(T.길이초) : (영상종류 === '쇼츠' ? 30 : 1800), 긴 = 길이 > 180;
      var 머리 = el('div', 'cz-tl-h'); 머리.appendChild(el('b', '', '타임라인')); 머리.appendChild(el('span', '', '전체 약 ' + 시간글(길이) + ' · ' + ({ 쇼츠: '쇼츠', 야담: '야담', 수면: '수면음악' }[영상종류]) + (T.장면수 ? ' · 장면 ' + T.장면수 : ''))); tl.appendChild(머리);
      var 눈금줄 = el('div', 'cz-trk cz-ruler'); 눈금줄.appendChild(el('span', 'cz-trk-n', '')); var 눈금 = el('div', 'cz-lane'); 눈금줄.appendChild(눈금);
      var 간격 = 눈금간격(길이); for (var t = 0; t <= 길이 + 1e-6; t += 간격) { var k = el('i', 'cz-tick' + (t / 길이 > 0.94 ? ' cz-tick-end' : '')); k.style.left = (t / 길이 * 100) + '%'; k.appendChild(el('span', '', 시간글(t))); 눈금.appendChild(k); }
      var 헤드 = el('i', 'cz-play'); 눈금.appendChild(헤드); tl.appendChild(눈금줄);
      var 두는곳 = function (f) {   // 재생 위치선: 눈금·트랙을 눌러 옮긴다(리졸브의 플레이헤드). 위치는 다시 그려도 남고, 미리보기 위쪽 줄에 시각·장면이 나온다
        머리비 = Math.min(1, Math.max(0, f)); 헤드.style.left = (머리비 * 100) + '%';
        var 초 = 머리비 * 길이, 장 = Math.min(수, Math.floor(머리비 * 수) + 1);
        뷰시각.textContent = ' · ' + 시간글(초) + (영상종류 === '쇼츠' ? ' · 장면 ' + 장 : ''); 재생시간.textContent = 시간글(초) + ' / ' + 시간글(길이);
        클립목록.forEach(function (c, n) { c.classList.toggle('cz-t-cur', n === 장 - 1); });
      };
      위치옮김 = 두는곳;
      var 끌고있음 = false, 위치계산 = function (e) { var r = 눈금.getBoundingClientRect(); 두는곳((e.clientX - r.left) / Math.max(1, r.width)); };
      if (tl.__핸들) tl.__핸들.forEach(function (h) { tl.removeEventListener(h[0], h[1]); }); tl.__핸들 = [];   // 다시 그릴 때 옛 핸들러를 걷어낸다(쌓이지 않게)
      var 달기 = function (t, f) { tl.addEventListener(t, f); tl.__핸들.push([t, f]); };
      달기('pointerdown', function (e) { if (e.target.closest('.cz-trk-n') || e.target.closest('.cz-tl-h')) return; 끌고있음 = true; 위치계산(e); try { tl.setPointerCapture(e.pointerId); } catch (x) {} });
      달기('pointermove', function (e) { if (끌고있음) 위치계산(e); });
      달기('pointerup', function () { 끌고있음 = false; }); 달기('pointercancel', function () { 끌고있음 = false; });
      var 문구있음 = !!String(opt.문구 || '').trim(), 제목끝 = (문구시간쓰기 && 문구시간 === '3s') ? Math.min(3, 길이) : 길이, 구성 = 화면 === '자동' ? '전체화면형' : 화면;
      if (영상종류 === '쇼츠' && !가로) {
        var 제 = 트랙줄('제목'); if (문구있음 || 구성 === '제목고정형' || 구성 === '가운데영상형') 조각(제, 0, 제목끝, 길이, 문구있음 ? String(opt.문구).trim() : '제목', 'cz-t-title'); else 제.appendChild(el('em', 'cz-empty', '제목 없음'));
      }
      var 수 = Math.max(1, Number(T.사진수) || Number(T.장면수) || (긴 ? Math.min(24, Math.max(3, Math.round(길이 / 300))) : Math.min(12, Math.max(3, Math.round(길이 / 5))))), 영 = 트랙줄(영상종류 === '쇼츠' ? '영상' : '장면'), 썸 = T.사진 || [];
      클립목록 = []; for (var i = 0; i < 수; i++) 클립목록.push(조각(영, 길이 * i / 수, 길이 * (i + 1) / 수, 길이, 썸[i] ? '' : String(i + 1), 'cz-t-clip', /^(blob:|https:\/\/|data:image\/)/.test(썸[i] || '') ? 썸[i] : ''));
      var 방식 = 자막방식 || '구절형', 자막칸 = 긴 ? 30 : ({ 구절형: 3, 문장형: 5, 단어형: 1.2 }[방식] || 3), 자막수 = Math.min(긴 && 수 ? 수 * 4 : 80, Math.max(1, Math.floor(길이 / 자막칸)));
      var 자 = 트랙줄('자막'); if (v0().자막끄기) 자.appendChild(el('em', 'cz-empty', '자막 끔')); else if (영상종류 === '수면') 자.appendChild(el('em', 'cz-empty', '음악 영상은 자막이 필요할 때만 넣어요')); else for (var j = 0; j < 자막수; j++) 조각(자, 길이 * j / 자막수 + 길이 * 0.004, 길이 * (j + 1) / 자막수 - 길이 * 0.004, 길이, '', 'cz-t-sub');
      var 소 = 트랙줄(영상종류 === '수면' ? '음악' : '소리'); 조각(소, 0, 길이, 길이, (영상종류 === '수면' ? '배경 음악' : '목소리') + (T.소리 ? ' · ' + T.소리 : ''), 'cz-t-wave');
      if (영상종류 === '야담') { var 배 = 트랙줄('배경음'); 조각(배, 0, 길이, 길이, '잔잔한 배경음', 'cz-t-bgm'); }
      두는곳(머리비);
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
      var c1b = 카드('제목 설정', '위쪽 문구의 띠와 글자', '제목'); var 제목행들 = [];
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
      var 세로범위 = function () { return 제목상태 ? 제목상태.세로범위 : [0.02, 0.17]; };
      var 기본세로 = function () { return 제목상태 ? 제목상태.기본세로 : 0.09; };
      제목슬라이더('위·아래', '제목세로', 0.09, function (v) { var g = 기본세로(), r = 세로범위(); return Math.round((v < 0 ? g - (g - r[0]) * (-v / 50) : g + (r[1] - g) * (v / 50)) * 1000) / 1000; }, function (x) { var g = 기본세로(), r = 세로범위(); return (x - g) / (((x < g ? g - r[0] : r[1] - g) / 50) || 1); });
      제목슬라이더('왼쪽·오른쪽', '제목가로', 0.5, function (v) { return Math.round((0.5 + v / 100) * 100) / 100; }, function (x) { return (x - 0.5) * 100; });
      function 색행(이름, 키, 목록, 기본색, 띠만) {
        var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var 칸 = el('div', 'cz-chips'); r.appendChild(칸); c1b.appendChild(r);
        var 지금 = function () { var x = 합치기(선택, 종류).값[키]; return (헥스.test(x || '') ? x : 기본색).toLowerCase(); };
        목록.forEach(function (c) { var b = el('button', 'cz-chip'); b.type = 'button'; b.title = c[0]; var d = el('span'); d.style.cssText = 'display:inline-block;width:.9em;height:.9em;border-radius:50%;margin-right:.35em;vertical-align:-.1em;border:1px solid #8886;background:' + (c[1] || 'linear-gradient(135deg,#888,#ddd)'); b.appendChild(d); b.appendChild(document.createTextNode(c[0]));
          b.addEventListener('click', function () { if (c[1].toLowerCase() === 기본색.toLowerCase()) delete 선택[키]; else 선택[키] = c[1].toUpperCase(); 갱신(); }); 칸.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(지금() === c[1].toLowerCase())); }); });
        var 직접 = el('button', 'cz-chip', '직접 고르기'); 직접.type = 'button'; 직접.setAttribute('aria-expanded', 'false'); 직접.dataset.k = 키 + '-직접'; 칸.appendChild(직접);
        var 휠칸 = el('div', 'cz-cw-wrap'); 휠칸.hidden = true; r.appendChild(휠칸);
        var 휠 = 색휠({ 이름: '제목 ' + 이름, 쓰기: function (hx) { if (기본색 && hx.toLowerCase() === 기본색.toLowerCase()) delete 선택[키]; else 선택[키] = hx; 갱신(); }, 기본으로: function () { delete 선택[키]; 갱신(); } }); 휠칸.appendChild(휠.box);
        직접.addEventListener('click', function () { 휠칸.hidden = !휠칸.hidden; 직접.setAttribute('aria-expanded', String(!휠칸.hidden)); if (!휠칸.hidden) 휠.맞추기(지금() || 기본색 || '#808080'); });
        휠열기[키] = function () { 휠칸.hidden = false; 직접.setAttribute('aria-expanded', 'true'); 휠.맞추기(지금() || 기본색 || '#808080'); 휠칸.scrollIntoView({ block: 'nearest' }); };
        눌림목록.push(function () { 직접.setAttribute('aria-pressed', String(!목록.some(function (c) { return c[1].toLowerCase() === 지금(); }))); if (!휠칸.hidden) 휠.맞추기(지금() || 기본색 || '#808080'); });
        제목행들.push({ r: r, 띠만: 띠만 });
      }
      색행('띠 색', '제목띠색', [['검정', '#15110e'], ['남색', '#14213d'], ['진초록', '#12372a'], ['자주', '#3b1d3a'], ['빨강', '#8b1e1e'], ['크림', '#f5f1e8'], ['노랑', '#ffd60a']], '#15110e', true);
      색행('위·아래 빈 곳', '가운데색', [['흐리게', ''], ['검정', '#000000'], ['남색', '#14213d'], ['진초록', '#12372a'], ['자주', '#3b1d3a'], ['빨강', '#8b1e1e'], ['크림', '#f5f1e8']], '', '가운데');
      색행('글자 색', '제목글자색', [['노랑', '#fff200'], ['흰색', '#ffffff'], ['검정', '#111111'], ['하늘', '#4dc3ff'], ['분홍', '#ff4d8d'], ['초록', '#2ee6a6']], '#fff200', false);
      c1b.appendChild(el('p', 'cz-hint', '띠 높이를 바꾸면 글자가 띠에 맞춰져요. 글자는 띠 아래 화면 위로도 옮길 수 있어요'));
      눌림목록.push(function () { var 보임 = !가로 && (화면 === '제목고정형' || 화면 === '가운데영상형'); c1b.style.display = 보임 ? '' : 'none'; 제목행들.forEach(function (h) { h.r.style.display = (h.띠만 === '가운데' && 화면 !== '가운데영상형') ? 'none' : ''; }); });
      if (문구시간쓰기) {
        var c1c = 카드('문구가 보이는 시간', '화면 위쪽 문구가 나오는 시간', '제목');
        var 시간줄 = el('div', 'cz-chips'); c1c.appendChild(시간줄);
        칩묶음(시간줄, [['all', '계속 보이기'], ['3s', '처음 3초만']], function () { return 문구시간; }, function (v) { if (v === '3s' && (화면 === '제목고정형' || 화면 === '가운데영상형')) return; 문구시간 = v; }, '문구가 보이는 시간');
        var 시간글 = el('p', 'cz-hint', ''); c1c.appendChild(시간글);
        눌림목록.push(function () { var 띠 = 화면 === '제목고정형' || 화면 === '가운데영상형'; if (띠 && 문구시간 === '3s') 문구시간 = 'all'; 시간글.textContent = 띠 ? (화면 === '제목고정형' ? '제목고정형' : '가운데영상형') + '은 위 띠가 계속 있어서 문구도 계속 보여요.' : (문구시간 === '3s' ? '영상이 시작하고 3초 동안 보이다 서서히 사라져요.' : ''); });
      }
      if (opt.자막방식 !== undefined) {   // 자막 방식은 상품쇼츠만(렌더 서버가 한 줄씩·문장째·한두 단어씩을 그린다)
        var c1d = 카드('자막 방식', '한 번에 나오는 글자 양', '자막');
        var 방식줄 = el('div', 'cz-chips'); c1d.appendChild(방식줄);
        칩묶음(방식줄, [['구절형', '한 줄씩'], ['문장형', '문장째로'], ['단어형', '한두 단어씩']], function () { return 자막방식; }, function (v) { 자막방식 = v; 자막방식바꿈 = true; }, '자막 방식');
        c1d.appendChild(el('p', 'cz-hint', '고르지 않으면 한 줄씩 나와요. 한두 단어씩은 큰 글씨가 빠르게 바뀌어요'));
      }
      var c2 = 카드('자막 글자 모양', undefined, '자막');
      var gm = el('div', 'cz-grid'); c2.appendChild(gm);
      모양들.forEach(function (m) { var b = el('button', 'cz-opt'); b.type = 'button'; var s = el('span', 'cz-sample', '가나다'); s.style.fontWeight = String(m[2].w); s.style.color = m[2].c === '#fff' ? 'var(--ink)' : m[2].c; s.style.textShadow = m[2].c === '#fff' ? 'none' : '0 0 1px #0006'; if (m[2].bg) { s.style.background = m[2].bg === 'rgba(0,0,0,.75)' ? '#000a' : m[2].bg; s.style.color = m[2].bg === 'rgba(0,0,0,.75)' ? '#fff' : m[2].c; s.style.padding = '0 6px'; s.style.borderRadius = '4px'; } b.appendChild(s); b.appendChild(el('small', '', m[1]));
        b.addEventListener('click', function () { 선택.자막모양 = m[0]; 갱신(); }); gm.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(합치기(선택, 종류).값.자막모양 === m[0])); }); });
      var r1 = el('div', 'cz-row'); r1.appendChild(el('label', '', '글꼴')); r1.appendChild(Object.assign(el('div', 'cz-chips'), {})); c2.appendChild(r1);
      칩묶음(r1.lastChild, 글꼴들, function () { return 합치기(선택, 종류).값.글꼴; }, function (v) { 선택.글꼴 = v; }, '글꼴');
      var r1c = el('div', 'cz-row'); r1c.appendChild(el('label', '', '글자 색')); c2.appendChild(r1c); var 자색칸 = el('div', 'cz-chips'); r1c.appendChild(자색칸);
      var 현재자색 = function () { var x = 합치기(선택, 종류).값.자막색; return 헥스.test(x || '') ? x.toLowerCase() : ''; };
      [['모양대로', ''], ['흰색', '#ffffff'], ['노랑', '#ffe600'], ['하늘', '#4dc3ff'], ['분홍', '#ff4d8d'], ['초록', '#2ee6a6'], ['검정', '#111111']].forEach(function (c) {
        var b = el('button', 'cz-chip'); b.type = 'button'; b.title = c[0]; if (c[1]) { var d = el('span'); d.style.cssText = 'display:inline-block;width:.9em;height:.9em;border-radius:50%;margin-right:.35em;vertical-align:-.1em;border:1px solid #8886;background:' + c[1]; b.appendChild(d); } b.appendChild(document.createTextNode(c[0]));
        b.addEventListener('click', function () { if (c[1]) 선택.자막색 = c[1].toUpperCase(); else delete 선택.자막색; 갱신(); }); 자색칸.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(현재자색() === c[1])); }); });
      var 자직접 = el('button', 'cz-chip', '직접 고르기'); 자직접.type = 'button'; 자직접.setAttribute('aria-expanded', 'false'); 자직접.dataset.k = '자막색-직접'; 자색칸.appendChild(자직접);
      var 자휠칸 = el('div', 'cz-cw-wrap'); 자휠칸.hidden = true; r1c.appendChild(자휠칸);
      var 자휠 = 색휠({ 이름: '자막 글자', 쓰기: function (hx) { 선택.자막색 = hx; 갱신(); }, 기본으로: function () { delete 선택.자막색; 갱신(); } }); 자휠칸.appendChild(자휠.box);
      var 자바탕 = function () { return 현재자색() || 모양겉(합치기(선택, 종류).값.자막모양).c.replace(/^#fff$/i, '#FFFFFF'); };
      휠열기['자막색'] = function () { 자휠칸.hidden = false; 자직접.setAttribute('aria-expanded', 'true'); 자휠.맞추기(자바탕()); 자휠칸.scrollIntoView({ block: 'nearest' }); };
      자직접.addEventListener('click', function () { 자휠칸.hidden = !자휠칸.hidden; 자직접.setAttribute('aria-expanded', String(!자휠칸.hidden)); if (!자휠칸.hidden) 자휠.맞추기(자바탕()); });
      눌림목록.push(function () { 자직접.setAttribute('aria-pressed', String(!!현재자색() && ['#ffffff', '#ffe600', '#4dc3ff', '#ff4d8d', '#2ee6a6', '#111111'].indexOf(현재자색()) < 0)); if (!자휠칸.hidden) 자휠.맞추기(자바탕()); });
      var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '단어 색')); c2.appendChild(r2); var cw = el('div', 'cz-chips'); r2.appendChild(cw);
      var 현재핵 = function () { return 합치기(선택, 종류).값.핵심색; };
      핵심들.forEach(function (h) { var b = el('button', 'cz-chip'); b.type = 'button'; b.title = h[1]; if (h[2]) { var d = el('span'); d.style.cssText = 'display:inline-block;width:.9em;height:.9em;border-radius:50%;margin-right:.35em;vertical-align:-.1em;border:1px solid #0004;background:' + h[2]; b.appendChild(d); } b.appendChild(document.createTextNode(h[1])); b.addEventListener('click', function () { 선택.핵심색 = h[0]; 갱신(); }); cw.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(현재핵() === h[0])); }); });
      var 직접색 = el('button', 'cz-chip', '직접 고르기'); 직접색.type = 'button'; 직접색.setAttribute('aria-expanded', 'false'); 직접색.dataset.k = '핵심색-직접'; cw.appendChild(직접색);
      var 핵휠칸 = el('div', 'cz-cw-wrap'); 핵휠칸.hidden = true; r2.appendChild(핵휠칸);
      var 핵휠 = 색휠({ 이름: '단어', 쓰기: function (hx) { 선택.핵심색 = hx; 갱신(); }, 기본으로: function () { delete 선택.핵심색; 갱신(); } }); 핵휠칸.appendChild(핵휠.box);
      휠열기['핵심색'] = function () { 핵휠칸.hidden = false; 직접색.setAttribute('aria-expanded', 'true'); 핵휠.맞추기(이름색(현재핵()) || '#FF4D8D'); 핵휠칸.scrollIntoView({ block: 'nearest' }); };
      직접색.addEventListener('click', function () { 핵휠칸.hidden = !핵휠칸.hidden; 직접색.setAttribute('aria-expanded', String(!핵휠칸.hidden)); if (!핵휠칸.hidden) 핵휠.맞추기(이름색(현재핵()) || '#FF4D8D'); });
      눌림목록.push(function () { 직접색.setAttribute('aria-pressed', String(헥스.test(현재핵()))); if (!핵휠칸.hidden) 핵휠.맞추기(이름색(현재핵()) || '#FF4D8D'); });
      c2.appendChild(el('p', 'cz-hint', '대본에서 중요한 단어에 이 색이 칠해져요'));
      var c2b = 카드('읽는 글자 효과', '목소리가 읽는 단어를 색으로 칠해요', '자막');
      var 효과줄 = el('div', 'cz-chips'); c2b.appendChild(효과줄);
      칩묶음(효과줄, 읽는효과들, function () { return 합치기(선택, 종류).값.읽는효과 || '끔'; }, function (v) { 선택.읽는효과 = v; }, '읽는 글자 효과');   // '끔'도 값으로 보낸다(바깥 자막 효과 설정보다 꾸미기에서 고른 것이 우선)
      var 색줄 = el('div', 'cz-row'); 색줄.appendChild(el('label', '', '칠하는 색')); var 색들 = el('div', 'cz-chips'); 색줄.appendChild(색들); c2b.appendChild(색줄);
      var 현재색 = function () { return 합치기(선택, 종류).값.읽는색 || '노랑'; };
      핵심들.filter(function (h) { return h[2] && h[0] !== '흰색'; }).forEach(function (h) { var b = el('button', 'cz-chip');   // 흰색은 글자가 원래 흰색이라 칠해도 안 보여 뺀다
 b.type = 'button'; b.title = h[1]; var d = el('span'); d.style.cssText = 'display:inline-block;width:.9em;height:.9em;border-radius:50%;margin-right:.35em;vertical-align:-.1em;border:1px solid #0004;background:' + h[2]; b.appendChild(d); b.appendChild(document.createTextNode(h[1])); b.addEventListener('click', function () { 선택.읽는색 = h[0]; 갱신(); }); 색들.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(현재색() === h[0])); }); });
      var 읽직접 = el('button', 'cz-chip', '직접 고르기'); 읽직접.type = 'button'; 읽직접.setAttribute('aria-expanded', 'false'); 읽직접.dataset.k = '읽는색-직접'; 색들.appendChild(읽직접);
      var 읽휠칸 = el('div', 'cz-cw-wrap'); 읽휠칸.hidden = true; 색줄.appendChild(읽휠칸);
      var 읽휠 = 색휠({ 이름: '칠하는', 쓰기: function (hx) { 선택.읽는색 = hx; 갱신(); }, 기본으로: function () { delete 선택.읽는색; 갱신(); } }); 읽휠칸.appendChild(읽휠.box);
      읽직접.addEventListener('click', function () { 읽휠칸.hidden = !읽휠칸.hidden; 읽직접.setAttribute('aria-expanded', String(!읽휠칸.hidden)); if (!읽휠칸.hidden) 읽휠.맞추기(이름색(현재색()) || '#FFE14D'); });
      눌림목록.push(function () { 읽직접.setAttribute('aria-pressed', String(헥스.test(현재색()))); if (!읽휠칸.hidden) 읽휠.맞추기(이름색(현재색()) || '#FFE14D'); 색줄.style.display = (합치기(선택, 종류).값.읽는효과 || '끔') === '끔' ? 'none' : ''; 다시.style.display = (합치기(선택, 종류).값.읽는효과 || '끔') === '끔' ? 'none' : ''; });
      c2b.appendChild(el('p', 'cz-hint', '왼쪽 미리보기에서 바로 확인해요. 실제 영상은 목소리 속도에 맞춰 조금 달라질 수 있어요'));
      var c3 = 카드('자막 크기와 줄', '가운데가 기본이에요', '자막');
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
      var c4 = 카드('자막 위치', '자막이 나올 자리', '자막');
      var rp = el('div', 'cz-chips'); c4.appendChild(rp);
      칩묶음(rp, 위치들, function () { return 자막위치; }, function (v) { 자막위치 = v; 위치바꿈 = true; }, '자막 위치');
      function 자막슬라이더(이름, 키, 읽기, 쓰기, 최소, 최대, 보임) {
        var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = 최소; sl.max = 최대; sl.setAttribute('aria-label', '자막 ' + 이름);
        sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 그리기미리보기(); }); sl.__reset = function () { delete 선택[키]; 갱신(); }; r.appendChild(sl); c4.appendChild(r);
        눌림목록.push(function () { sl.value = String(읽기()); r.style.display = 보임 && !보임() ? 'none' : ''; sl.disabled = !!합치기(선택, 종류).값.자막끄기; });
      }
      var 기본거리 = function () { return Math.round((자막위치 === '위' ? (가로 ? 0.07 : 0.13) : (가로 ? 0.07 : 0.22)) * 100); };
      자막슬라이더('위·아래 거리', '자막거리', function () { return 선택.자막거리 !== undefined ? Math.round(선택.자막거리 * 100) : 기본거리(); }, function (v) { 선택.자막거리 = v / 100; }, 0, 45, function () { return 자막위치 !== '가운데' && 화면 !== '가운데영상형'; });
      자막슬라이더('왼쪽·오른쪽', '자막가로', function () { return 선택.자막가로 !== undefined ? Math.round(선택.자막가로 * 100) : 50; }, function (v) { 선택.자막가로 = v / 100; }, 0, 100);
      var rk = el('div', 'cz-row'); rk.appendChild(el('label', '', '자막')); var ck = el('div', 'cz-chips'); rk.appendChild(ck); c4.appendChild(rk);
      [[false, '보이기'], [true, '끄기']].forEach(function (it) { var b = el('button', 'cz-chip', it[1]); b.type = 'button'; b.addEventListener('click', function () { if (it[0]) 선택.자막끄기 = true; else delete 선택.자막끄기; 갱신(); }); ck.appendChild(b); 눌림목록.push(function () { b.setAttribute('aria-pressed', String(!!선택.자막끄기 === it[0])); }); });
      c4.appendChild(el('p', 'cz-hint', '자막을 끄면 목소리만 나오고 고정 글자는 그대로 보여요'));
      var c5 = 카드('고정 글자', '영상 내내 보이는 글 · 최대 4개 (선택)', '고정 글자');
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
          function 슬라이더(이름, 읽기, 쓰기, 최소, 최대) { var r = el('div', 'cz-row'); r.appendChild(el('label', '', 이름)); var sl = el('input'); sl.type = 'range'; sl.min = 최소; sl.max = 최대; sl.value = 읽기(); var 처음값 = sl.value; sl.__reset = function () { sl.value = 처음값; sl.dispatchEvent(new Event('input', { bubbles: true })); sl.dispatchEvent(new Event('change', { bubbles: true })); }; sl.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' ' + 이름); sl.addEventListener('input', function () { 쓰기(Number(sl.value)); 그리기미리보기(); }); r.appendChild(sl); 칸.appendChild(r); }
          슬라이더('위·아래 거리', function () { return Math.round(b.위치.거리 * 100); }, function (v) { b.위치.거리 = v / 100; }, 0, 45);
          슬라이더('왼쪽·오른쪽', function () { return Math.round(b.위치.가로 * 100); }, function (v) { b.위치.가로 = v / 100; }, 0, 100);
          var r2 = el('div', 'cz-row'); r2.appendChild(el('label', '', '글자 크기')); var nm = el('input'); nm.type = 'number'; nm.min = 20; nm.max = 200; nm.value = b.크기; nm.setAttribute('aria-label', '고정 글자 ' + (i + 1) + ' 크기'); nm.addEventListener('input', function () { b.크기 = Math.round(수(nm.value, 20, 200, 60)); 그리기미리보기(); }); r2.appendChild(nm);
          var 모 = el('div', 'cz-chips'); 모양들.forEach(function (m) { var k = el('button', 'cz-chip', m[1]); k.type = 'button'; k.setAttribute('aria-pressed', String(b.모양 === m[0])); k.addEventListener('click', function () { b.모양 = m[0]; 블록그리기(); 그리기미리보기(); }); 모.appendChild(k); }); r2.appendChild(모); 칸.appendChild(r2);
          var r3 = el('div', 'cz-row'); r3.appendChild(el('label', '', '글자 색')); var 색칸 = el('div', 'cz-chips'); r3.appendChild(색칸);
          var 기본색 = el('button', 'cz-chip', '모양 기본'); 기본색.type = 'button'; 기본색.setAttribute('aria-pressed', String(!헥스.test(b.색 || ''))); 기본색.addEventListener('click', function () { delete b.색; 블록그리기(); 그리기미리보기(); }); 색칸.appendChild(기본색);
          var 직접 = el('button', 'cz-chip', '직접 고르기'); 직접.type = 'button'; 직접.setAttribute('aria-pressed', String(헥스.test(b.색 || ''))); 직접.setAttribute('aria-expanded', 'false'); 직접.dataset.k = '블록' + (i + 1) + '-색-직접'; 색칸.appendChild(직접);
          var 블휠칸 = el('div', 'cz-cw-wrap'); 블휠칸.hidden = true; r3.appendChild(블휠칸);
          var 블휠 = 색휠({ 이름: '고정 글자 ' + (i + 1), 쓰기: function (hx) { b.색 = hx; 직접.setAttribute('aria-pressed', 'true'); 기본색.setAttribute('aria-pressed', 'false'); 그리기미리보기(); }, 기본으로: function () { delete b.색; 블록그리기(); 그리기미리보기(); } }); 블휠칸.appendChild(블휠.box);
          블휠열기[i] = function () { 블휠칸.hidden = false; 직접.setAttribute('aria-expanded', 'true'); 블휠.맞추기(헥스.test(b.색 || '') ? b.색 : '#FFFFFF'); 블휠칸.scrollIntoView({ block: 'nearest' }); };
          직접.addEventListener('click', function () { 블휠칸.hidden = !블휠칸.hidden; 직접.setAttribute('aria-expanded', String(!블휠칸.hidden)); if (!블휠칸.hidden) 블휠.맞추기(헥스.test(b.색 || '') ? b.색 : '#FFFFFF'); });
          칸.appendChild(r3);
          var 삭 = el('button', 'cz-btn', '이 글자 지우기'); 삭.type = 'button'; 삭.addEventListener('click', function () { 블록목록().splice(i, 1); if (고름 && 고름.종류 === '블록') { if (고름.번호 === i) { 고름 = null; if (선택알림) 선택알림.textContent = '선택을 풀었어요'; } else if (고름.번호 > i) 고름.번호--; } 블록그리기(); 갱신(); 적용상태(); }); 칸.appendChild(삭);
          목록칸.appendChild(칸);
        });
      }
      추가.addEventListener('click', function () { if (블록목록().length >= 4) return; 블록목록().push({ 글: '', 위치: { 기준: '위', 거리: 0.15, 가로: 0.5 }, 크기: 60, 모양: '굵은흰', 글꼴: 'Noto Sans CJK KR' }); 블록그리기(); 갱신(); 적용상태(); });
      블록그리기();
      블록다시 = 블록그리기;
      끌기(ttx, 제목이동, '제목 글자', function (n, t) { if (t === 'click') 선택하기('제목글자'); }); 끌기(sub, 자막이동, '자막', function (n, t) { if (t === 'click') 선택하기('자막'); }); 끌기(띠손잡이, 띠이동, '제목 띠 높이', function (n, t) { if (t === 'click') 선택하기('제목띠'); }); 끌기(칸손잡이, 칸이동, '영상 칸 아래 끝', function (n, t) { if (t === 'click') 선택하기('바깥'); });
      ttl.addEventListener('click', function () { 선택하기('제목띠'); });   // 띠 빈 곳을 누르면 제목 띠 선택
      phone.addEventListener('click', function (e) { if (e.target.closest('.cz-drag, .cz-sub') || e.target === ttl) return; var 칸 = 화면 === '가운데영상형' && !가로, r = phone.getBoundingClientRect(), y = (e.clientY - r.top) / r.height; if (칸 && e.target !== ctr && (y > 칸상태.아래 || (y > Math.max(0.235, ttl.getBoundingClientRect().height / r.height) && y < 칸상태.위))) 선택하기('바깥'); else 선택풀기(); });   // 영상 칸 위·아래 빈 곳 = 바깥, 그 밖의 빈 곳 = 선택 풀기
      // 왼쪽 라이브러리(리졸브의 미디어 풀): 화면 구성 · 모양 · 영상 제작 방식. 오른쪽 인스펙터 탭: 제목 · 자막 · 고정 글자
      [판, c1, 판2].forEach(function (c) { if (c) { c.dataset.tab = '*'; if (c !== 판) { c.classList.remove('cz-fold'); var 머리 = c.querySelector('.cz-ch'); if (머리) 머리.setAttribute('aria-expanded', 'true'); } else { c.classList.add('cz-fold'); c.querySelector('.cz-ch').setAttribute('aria-expanded', 'false'); } lib.appendChild(c); } });
      var 빈탭 = el('p', 'cz-card cz-hintcard', '이 화면 구성에는 위쪽 제목 띠가 없어요. 제목 띠가 필요하면 왼쪽에서 \'제목고정\' 또는 \'가운데영상\'을 골라요.'); 빈탭.dataset.tab = '제목'; body.appendChild(빈탭);
      눌림목록.push(function () { 빈탭.style.display = (띠없음 || 화면 === '제목고정형' || 화면 === '가운데영상형') ? 'none' : ''; });
      var 띠없음 = 가로 || 화면목록.length < 2;   // 화면 구성을 고를 수 없으면(가로·롱폼 세로) 제목 띠도 없다
      var 탭순서 = 띠없음 ? ['자막', '고정 글자'] : ['제목', '자막', '고정 글자'], 있는탭 = 탭순서.filter(function (t) { return body.querySelector('.cz-card[data-tab="' + t + '"]'); });
      var 서브표={'제목 설정':'모양','문구가 보이는 시간':'시간','자막 방식':'글자','자막 글자 모양':'글자','읽는 글자 효과':'글자','자막 크기와 줄':'크기·위치','자막 위치':'크기·위치'};   // 둘째 줄 탭(서류철): 카드를 묶는 이름
      [].forEach.call(body.querySelectorAll('.cz-card[data-tab]'), function (c) { var h = c.querySelector('h3'), n = h && h.firstChild ? h.firstChild.textContent : ''; if (서브표[n]) c.dataset.sub = 서브표[n]; });
      var 서브줄 = el('div', 'cz-subtabs'); 서브줄.setAttribute('role', 'tablist'); 서브줄.hidden = true; var 서브기억 = {};
      function 서브보이기(t, s) {
        var 카드들 = [].slice.call(body.querySelectorAll('.cz-card[data-tab="' + t + '"][data-sub]')), 이름들 = [];
        카드들.forEach(function (c) { if (이름들.indexOf(c.dataset.sub) < 0) 이름들.push(c.dataset.sub); });
        [].forEach.call(body.querySelectorAll('.cz-card[data-sub]'), function (c) { c.classList.toggle('cz-subhide', c.dataset.tab !== t || (이름들.length > 1 && c.dataset.sub !== s)); });
        서브줄.innerHTML = ''; 서브줄.hidden = 이름들.length < 2; if (이름들.length < 2) return;
        이름들.forEach(function (n) { var b = el('button', 'cz-subtab', n); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(n === s)); b.addEventListener('click', function () { 서브기억[t] = n; 서브보이기(t, n); }); 서브줄.appendChild(b); });
      }
      var 머리줄 = el('div', 'cz-bodyhead'); body.insertBefore(머리줄, body.firstChild);   // 탭 + 선택 줄(스크롤해도 위에 붙어 있다)
      var 선택줄 = el('div', 'cz-selbar'); 선택줄.setAttribute('role', 'group'); 선택줄.setAttribute('aria-label', '꾸밀 요소 고르기 (미리보기를 눌러도 돼요)'); 선택줄.appendChild(el('span', 'cz-selbar-l', '선택'));
      [['제목띠', '제목 띠', 0], ['제목글자', '제목 글자', 0], ['자막', '자막', 0], ['블록', '고정 글자 1', 0], ['블록', '고정 글자 2', 1], ['블록', '고정 글자 3', 2], ['블록', '고정 글자 4', 3], ['바깥', '빈 곳', 0]].forEach(function (c) {
        var b = el('button', 'cz-chip', c[1]); b.type = 'button'; b.dataset.종류 = c[0]; b.dataset.번호 = String(c[2]); b.dataset.k = '선택-' + c[0] + (c[0] === '블록' ? (c[2] + 1) : ''); b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', function () { if (고름 && 고름.종류 === c[0] && 고름.번호 === c[2]) 선택풀기(); else 선택하기(c[0], c[2]); }); 선택줄칩[c[0] + c[2]] = b; 선택줄.appendChild(b);
      });
      var 풀기 = el('button', 'cz-chip cz-selbar-x', '해제'); 풀기.type = 'button'; 풀기.setAttribute('aria-label', '선택 풀기 (Esc)'); 풀기.addEventListener('click', 선택풀기); 선택줄칩.__해제 = 풀기; 선택줄.appendChild(풀기);
      선택알림 = el('span', 'cz-sr'); 선택알림.setAttribute('aria-live', 'polite'); 선택줄.appendChild(선택알림); 머리줄.appendChild(선택줄); 눌림목록.push(선택바갱신); 선택바갱신();
      if (있는탭.length > 1) {
        var 탭줄 = el('div', 'cz-tabs'); 탭줄.setAttribute('role', 'tablist'); var 탭버튼 = {};
        var 탭그림 = { '제목': 'M5 6h14M12 6v13M9 19h6', '자막': 'M4 6h16v12H4zM8 11h8M8 14.5h5', '고정 글자': 'M12 3v8M8.5 11h7l-1.5 4h-4zM12 15v6' };
        body.setAttribute('role', 'tabpanel');
        function 탭보이기(t) { 있는탭.forEach(function (n) { 탭버튼[n].setAttribute('aria-selected', String(n === t)); 탭버튼[n].tabIndex = n === t ? 0 : -1; }); body.setAttribute('aria-labelledby', 탭버튼[t].id); [].forEach.call(body.querySelectorAll('.cz-card[data-tab]'), function (c) { c.classList.toggle('cz-tabhide', c.dataset.tab !== '*' && c.dataset.tab !== t); }); var 이름 = body.querySelector('.cz-card[data-tab="' + t + '"][data-sub]'); 서브보이기(t, 서브기억[t] || (이름 ? 이름.dataset.sub : '')); }
        있는탭.forEach(function (t) { var b = el('button', 'cz-tab'); b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + (탭그림[t] || 'M5 12h14') + '"/></svg>'; b.appendChild(el('span', '', t)); b.type = 'button'; b.setAttribute('role', 'tab'); b.id = 'cz-tab-' + t.replace(/\s/g, ''); b.setAttribute('aria-controls', 'cz-panel'); b.addEventListener('click', function () { 탭보이기(t); });
          b.addEventListener('keydown', function (e) {   // 좌우 화살표·Home·End 로 탭 이동(선택된 탭만 Tab 키로 닿는다)
            var i = 있는탭.indexOf(t), 다음 = e.key === 'ArrowRight' ? (i + 1) % 있는탭.length : e.key === 'ArrowLeft' ? (i + 있는탭.length - 1) % 있는탭.length : e.key === 'Home' ? 0 : e.key === 'End' ? 있는탭.length - 1 : -1;
            if (다음 < 0) return; e.preventDefault(); 탭보이기(있는탭[다음]); 탭버튼[있는탭[다음]].focus();
          }); 탭버튼[t] = b; 탭줄.appendChild(b); });
        body.id = 'cz-panel';
        머리줄.insertBefore(탭줄, 머리줄.firstChild); 머리줄.insertBefore(서브줄, 선택줄); 탭보이기(있는탭[0]); 탭이동 = function (t) { if (있는탭.indexOf(t) >= 0) 탭보이기(t); };
      }
      타임라인만들기();
    }
    function 닫기(결과) { 읽기멈춤(); 재생멈춤(); if (끌기중단) 끌기중단(); document.removeEventListener('keydown', 키); document.body.style.overflow = 이전스크롤; ov.remove(); if (이전포커스 && 이전포커스.focus) 이전포커스.focus(); if (결과 && typeof opt.onDone === 'function') opt.onDone(결과); }
    function 키(e) {
      if (e.key === 'Escape') { e.preventDefault(); if (선택풀기()) return; 닫기(null); return; }   // 고른 요소가 있으면 선택만 풀고, 없을 때만 창을 닫는다
      if (e.key !== 'Tab') return;
      var f = [].slice.call(dlg.querySelectorAll('button,input,select,[tabindex]:not([tabindex="-1"])')).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!f.length) return; var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    }
    x.addEventListener('click', function () { 닫기(null); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) 닫기(null); });
    gc.addEventListener('change', function () { 가이드켜짐 = gc.checked; 그리기미리보기(); });
    reset.addEventListener('click', function () { 고름 = null; 선택 = {}; 화면 = 기본화면(); 화면바꿈 = false; 자막위치 = '아래'; 위치바꿈 = false; 초기화함 = true; 블록다시(); 갱신(); });
    function 적용상태() { var 막힘 = 블록검사().some(Boolean); ok.disabled = 막힘; ok.style.opacity = 막힘 ? '.5' : ''; ok.title = 막힘 ? '고정 글자의 쓸 수 없는 표현을 먼저 고쳐 주세요' : ''; }
    ok.addEventListener('click', function () { if (ok.disabled) return;
      if (선택.블록) { 선택.블록 = 선택.블록.filter(function (b) { return String(b.글 || '').trim(); }).map(function (b) { return Object.assign({ 글: String(b.글).trim(), 위치: b.위치, 크기: b.크기, 모양: b.모양, 글꼴: b.글꼴 }, 헥스.test(b.색 || '') ? { 색: b.색 } : {}); }); if (!선택.블록.length) delete 선택.블록; }
      var m = 합치기(선택, 종류); 닫기({ compose: Object.assign({}, 선택), 문구시간: 문구시간쓰기 ? 문구시간 : undefined, 자막방식: opt.자막방식 !== undefined ? 자막방식 : undefined, 자막위치: 자막위치, 화면구성: 화면바꿈 ? 화면 : (opt.화면구성 || 화면), 제작방식: 제작바꿈 ? 제작값 : undefined, 위치바뀜: 자막위치 !== 처음위치, 초기화: 초기화함 && !Object.keys(선택).length && 자막위치 === '아래' }); });
    document.addEventListener('keydown', 키);
    var 이전스크롤 = document.body.style.overflow; document.body.style.overflow = 'hidden'; dlg.tabIndex = -1;
    document.body.appendChild(ov); dlg.focus();
    템플릿불러오기().then(function () { 만들기(); 갱신(); 적용상태(); x.focus(); });
  }

  window.RWCompose = { open: open, 요약: 요약, 불러오기: 템플릿불러오기, 합치기: 합치기 };
})();
