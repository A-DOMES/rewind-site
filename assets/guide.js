/* 참고 영상으로 만들기(옛 이름 한번에 만들기, 기능공개 이름 '길잡이') — 참고 영상과 주제로 신청까지 안내하는 앞단 화면.
 * 설계: 만들기_길잡이_설계서_v1.md (rewind-render/docs). 이 파일은 "화면과 고른 값"만 안다.
 *   · 신청·가격·검증은 기존 직접 설정하기 폼이 그대로 한다. 마지막에 new.html 이 열어 둔 window.__rwGuideApi.적용(상태) 가
 *     폼의 칸을 채워 줄 뿐이다(폼 코드는 거의 건드리지 않는다).
 *   · 보이는 조건: 시트 `기능공개`의 `길잡이` 줄이 열려 있을 때(RWFlags.has). 줄이 없으면 메뉴 자체가 숨는다.
 *   · 이름·부제는 아래 두 줄만 고치면 메뉴·화면 제목이 같이 바뀐다.
 * 단계: 1 무엇을 · 2 참고 영상 · 3 종류 · 4 구성 · 5 신청
 * 참고 영상 주소는 신청 화면의 '참고 영상' 칸에 넣고 분석을 바로 시작한다(분석·꾸미기 미리 채우기는 reference-input.js·new.html 이 한다). */
(function () {
  'use strict';
  var 이름 = '참고 영상으로 만들기';
  var 부제 = '참고 영상과 주제만 넣으면 같은 연출로 새 영상을 만들어 드려요.';   // [2026-11-08] 한번에 만들기 → 참고 영상으로 만들기(설계서: rewind-render/docs/참고영상으로_만들기_설계서_v6.md)
  var 기능 = '길잡이';
  var 단계이름 = ['무엇을', '참고 영상', '종류', '구성', '신청'];

  /* 영상 종류. 열림 = 기능공개 이름(RWFlags.on), 키 = new.html 의 openFormFor 가 아는 이름 */
  var 종류들 = [
    { 이름: '쇼츠', 설명: '세로 9:16 · 짧게', 기능: '쇼츠', 키: 'short', 폼: '쇼츠' },
    { 이름: '롱폼', 설명: '가로 16:9 · 길게', 기능: '롱폼', 키: 'long', 폼: '롱폼' },
    { 이름: '상품쇼츠', 설명: '제품 소개 쇼츠', 기능: '상품쇼츠', 키: 'prod', 폼: '쇼츠' },
    { 이름: '야담', 설명: '옛이야기 · 이야기 영상', 기능: '야담', 키: 'yadam', 폼: '롱폼' },
    { 이름: '분위기 영상', 설명: '수면 · 힐링 · 축하 · 추억', 기능: '분위기영상', 키: 'mood', 폼: '쇼츠' }
  ];
  var 길이후보 = { 쇼츠: [0.5, 0.75, 1, 1.5, 2], 롱폼: [1, 2, 3, 5, 10] };   // 가운데 = 기본 길이(쇼츠 1분 · 롱폼 3분)
  var 길들 = {   // S.길: 'ref' = 참고 영상 주소 있음 · 'none' = 참고 없이 AI가 알아서
    ref: { 이름: '참고 영상대로' },
    none: { 이름: '참고 없이 AI에게 맡기기', 설명: '참고 영상 없이 주제에 맞춰 AI가 화면과 연출을 정해요.' }
  };
  var 아이콘 = {   // 단계 제목 앞 아이콘(선만, currentColor)
    1: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    2: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4-2.5z"/>',
    3: '<rect x="4" y="3" width="7" height="12" rx="1.5"/><rect x="13" y="8" width="8" height="5" rx="1.5"/><path d="M4 19h17"/>',
    4: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    5: '<path d="M5 12l4 4 10-10"/>'
  };
  function 제목(n, h, p) { return '<div class="gd-title"><h2><span class="gd-ti" aria-hidden="true"><svg viewBox="0 0 24 24">' + 아이콘[n] + '</svg></span>' + h + '</h2>' + (p ? '<p>' + p + '</p>' : '') + '</div>'; }

  var 허브 = null, 사이드 = null, 모바일 = null, 소리판 = null;
  var S = 새상태();

  function 새상태() { return { 단계: 1, 주제: '', 유형: '상품', 길: '', 참고주소: '', 종류: '', 종류직접: false, 후보: null, 후보이름: '', 참고: '', 구성: '자동', 자막: '자동', compose: null, 길이칸: 2, 길이만짐: false, 목소리: '', 성별: '남' }; }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function 켜짐() { return !!(window.RWFlags && window.RWFlags.has(기능)); }
  function 종류열림(k) {
    if (window.RWFlags && !window.RWFlags.on(k.기능)) return false;
    if (k.이름 === '상품쇼츠' && window.__rwGuideApi && !window.__rwGuideApi.상품열림()) return false;
    return true;
  }
  function 길에맞음(k) {   // 상품 소개는 상품쇼츠(열려 있지 않으면 쇼츠), 그 밖의 주제는 상품쇼츠를 뺀 모든 종류. 참고 영상 칸은 모든 종류의 신청 화면에 있다
    if (S.유형 === '상품') return k.이름 === '상품쇼츠' || (k.이름 === '쇼츠' && !종류열림(종류찾기('상품쇼츠')));
    return k.이름 !== '상품쇼츠';
  }
  function 종류찾기(이름) { return 종류들.filter(function (k) { return k.이름 === 이름; })[0] || null; }
  function 추천종류() { return S.유형 === '상품' && 종류열림(종류찾기('상품쇼츠')) ? '상품쇼츠' : '쇼츠'; }
  function 지금종류() { return 종류찾기(S.종류); }
  function 폼형태() { var k = 지금종류(); return k ? k.폼 : '쇼츠'; }
  function 길이분() { var 후보 = 길이후보[폼형태()] || 길이후보.쇼츠; return 후보[Math.max(0, Math.min(후보.length - 1, S.길이칸))]; }
  function 길이말(분) { var 초 = Math.round(분 * 60); return 초 < 60 ? 초 + '초' : (초 % 60 ? Math.floor(초 / 60) + '분 ' + (초 % 60) + '초' : (초 / 60) + '분'); }
  function 가운데칸() { return Math.floor((길이후보[폼형태()] || 길이후보.쇼츠).length / 2); }
  function 설정종류() { var k = 지금종류(); return 세부설정종류() || (!!k && k.이름 === '상품쇼츠'); }   // 길이·목소리를 여기서 정하는 종류 (상품쇼츠는 화면 구성·자막이 따로 없다)
  function 세부설정종류() { var k = 지금종류(); return !!k && (k.이름 === '쇼츠' || k.이름 === '롱폼'); }

  /* ───── 화면 뼈대 ───── */
  function 만들기() {
    var 앱 = document.getElementById('topic-hub');
    if (!앱 || document.getElementById('guide-hub')) return;
    허브 = document.createElement('div'); 허브.id = 'guide-hub'; 허브.setAttribute('role', 'region'); 허브.setAttribute('aria-label', 이름);
    앱.parentNode.insertBefore(허브, 앱);
    var 직접 = document.getElementById('to-direct-form');
    if (직접) {
      사이드 = document.createElement('button'); 사이드.type = 'button'; 사이드.className = 'side-item'; 사이드.id = 'to-guide'; 사이드.hidden = true;
      사이드.innerHTML = '<span class="ico" style="--c:#e2a23c"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19L19 5"/><path d="M14 4l1.2 2.8L18 8l-2.8 1.2L14 12l-1.2-2.8L10 8l2.8-1.2z"/><path d="M5 12l.8 1.7L7.5 14.5l-1.7.8L5 17l-.8-1.7L2.5 14.5l1.7-.8z"/></svg></span> ' + esc(이름);
      직접.parentNode.insertBefore(사이드, 직접);
      사이드.addEventListener('click', 열기);
    }
    var 더보기 = document.getElementById('mobile-more');
    if (더보기) {
      모바일 = document.createElement('button'); 모바일.type = 'button'; 모바일.setAttribute('data-go', 'guide'); 모바일.setAttribute('role', 'menuitem'); 모바일.hidden = true;
      모바일.innerHTML = '<svg class="mmi" style="--c:#e2a23c" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19L19 5"/><path d="M14 4l1.2 2.8L18 8l-2.8 1.2L14 12l-1.2-2.8L10 8l2.8-1.2z"/></svg><span>' + esc(이름) + '</span>';
      더보기.insertBefore(모바일, 더보기.querySelector('[data-go="script"]') || null);
    }
    허브.addEventListener('click', 눌림);
    허브.addEventListener('input', 입력);
    document.addEventListener('click', function (e) {   // 다른 메뉴를 누르면 이 화면은 닫는다
      if (!열림() || !e.target.closest) return;
      var el = e.target.closest('.sidebar .side-item, .sidebar .new-chat-btn, #mobile-nav [data-go], #mobile-more [data-go]');
      if (!el || el.id === 'to-guide' || (el.dataset && (el.dataset.go === 'guide' || el.dataset.go === 'more' || el.dataset.go === 'theme'))) return;
      닫기();
    }, true);
    new MutationObserver(function () { if (열림() && (document.body.classList.contains('topic-open') || document.body.classList.contains('studio-open'))) 닫기(); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && 열림() && S.단계 > 1 && !e.isComposing && !e.defaultPrevented) { 이동(S.단계 - 1); } });
    // 기능공개는 서버에서 받아 와야 알 수 있어서 메뉴가 늦게 뜬다. 지난번 결과를 이 브라우저에 기억해 두었다가 먼저 보여 주고, 서버 답이 오면 바로잡는다.
    document.addEventListener('rw-flags', function () { try { localStorage.setItem('rw_guide_on', 켜짐() ? '1' : '0'); } catch (e) {} 동기(); });
    var 기억 = false; try { 기억 = localStorage.getItem('rw_guide_on') === '1'; } catch (e) {}
    if (기억) { if (사이드) 사이드.hidden = false; if (모바일) 모바일.hidden = false; } else 동기();
  }
  function 동기() {
    var on = 켜짐();
    if (사이드) 사이드.hidden = !on;
    if (모바일) 모바일.hidden = !on;
    if (!on && 열림()) 닫기();
  }
  function 열림() { return document.body.classList.contains('guide-open'); }
  function 열기(미리) {
    if (!켜짐() || !허브) return;
    if (미리 && typeof 미리 === 'object' && !미리.type) { S = 새상태(); if (미리.주제) S.주제 = String(미리.주제); if (미리.유형 === '주제') S.유형 = '주제'; }
    document.body.classList.remove('topic-open', 'studio-open', 'hub-open');
    document.body.classList.add('guide-open');
    document.querySelectorAll('.side-item.active').forEach(function (b) { b.classList.remove('active'); });
    if (사이드) 사이드.classList.add('active');
    그리기(true);
  }
  function 닫기() {
    소리멈춤();
    document.body.classList.remove('guide-open');
    if (사이드) 사이드.classList.remove('active');
    if (window.갱신위치표시) window.갱신위치표시();
  }
  function 소리멈춤() { if (소리판 && 소리판.소리멈춤) { try { 소리판.소리멈춤(); } catch (e) {} } 소리판 = null; }

  /* ───── 단계별 화면 ───── */
  function 머리() {
    var 칸 = 단계이름.map(function (t, i) {
      var n = i + 1, 상태 = n < S.단계 ? 'done' : (n === S.단계 ? 'on' : '');
      var 안 = '<i>' + (n < S.단계 ? '✓' : n) + '</i>' + t;
      return n < S.단계 ? '<li class="' + 상태 + '"><button type="button" data-go="' + n + '">' + 안 + '</button></li>' : '<li class="' + 상태 + '"' + (n === S.단계 ? ' aria-current="step"' : '') + '><span>' + 안 + '</span></li>';
    }).join('');
    return '<ol class="gd-steps" aria-label="진행 단계">' + 칸 + '</ol>';
  }
  var 줄아이콘 = { '주제': 1, '참고 영상': 2, '영상 종류': 3, '화면': 3, '길이': 4, '화면 구성': 4, '자막 위치': 4, '모양': 4, '목소리': 4 };
  function 요약줄(라벨, 값, 단계) { var n = 줄아이콘[라벨] || 4, 안 = '<span><i aria-hidden="true"><svg viewBox="0 0 24 24">' + 아이콘[n] + '</svg></i>' + 라벨 + '</span><b>' + (값 ? esc(값) : '<em>아직 안 골랐어요</em>') + '</b>'; return 단계 && 단계 < S.단계 ? '<button type="button" class="gd-row" data-go="' + 단계 + '" title="이 단계로 돌아가기">' + 안 + '</button>' : '<div class="gd-row">' + 안 + '</div>'; }
  function 참고말() { return S.길 === 'none' ? '참고 없이 AI로' : (S.길 === 'ref' ? '있음' : ''); }
  function 옆칸() {
    var k = 지금종류();
    return '<aside class="gd-rail"><div class="gd-box"><h3>지금까지 고른 것</h3>' +
      요약줄('주제', S.주제.trim(), 1) + 요약줄('참고 영상', 참고말(), 2) +
      요약줄('영상 종류', k ? k.이름 : '', 3) + (k ? 요약줄('화면', k.폼 === '쇼츠' ? '세로 9:16' : '가로 16:9') : '') +
      '</div><p class="gd-note">참고 영상의 연출(리듬·움직임·글자 자리)을 따르고, 색과 문구는 새로 만들어요. 줄을 누르면 그 단계로 돌아가요.</p></aside>';
  }
  function 단추줄(다음글, 다음끔) {
    return '<div class="gd-foot">' + (S.단계 > 1 ? '<button type="button" class="gd-btn2" data-act="prev">이전</button>' : '<span></span>') +
      '<button type="button" class="gd-btn" data-act="next"' + (다음끔 ? ' disabled' : '') + '>' + (다음글 || '다음') + '</button></div>';
  }
  function 단계1() {
    var 상품 = S.유형 === '상품';
    return 제목(1, '무엇을 만들까요', 상품 ? '소개할 상품 이름을 적어 주세요. 참고 영상과 다른 상품이어도 같은 연출로 만들어요.' : '만들고 싶은 주제를 적어 주세요.') +
      '<div class="gd-seg" role="group" aria-label="만들 것">' +
      '<button type="button" aria-pressed="' + 상품 + '" class="' + (상품 ? 'on' : '') + '" data-유형="상품"><b>상품 소개</b><small>제품을 알리는 영상</small></button>' +
      '<button type="button" aria-pressed="' + !상품 + '" class="' + (!상품 ? 'on' : '') + '" data-유형="주제"><b>그 밖의 주제</b><small>정보·이야기·감성 영상</small></button></div>' +
      '<input type="text" id="gd-topic" class="gd-in" maxlength="' + (상품 ? 100 : 300) + '" value="' + esc(S.주제) + '" placeholder="' + (상품 ? '예: 보온 텀블러 500ml' : '예: 아침에 하면 좋은 스트레칭 3가지') + '" autocomplete="off" aria-label="주제">' +
      (document.getElementById('to-topic-finder') ? '<button type="button" class="gd-link" data-act="finder">무엇을 만들지 모르겠어요 · 요즘 뜨는 상품·주제 보기</button>' : '') +
      단추줄('다음', !S.주제.trim());
  }
  function 정식() { return !!(window.__rwGuideApi && window.__rwGuideApi.정식회원 && window.__rwGuideApi.정식회원()); }
  function 국숫자(n) { return n >= 1e8 ? (n / 1e8).toFixed(1) + '억' : n >= 1e4 ? Math.round(n / 1e4) + '만' : String(Math.round(n)); }
  function 후보카드(v) {
    var 켬 = !!S.참고주소 && S.참고주소.indexOf(v.id) >= 0, 초 = +v.sec || 0;
    return '<button type="button" aria-pressed="' + 켬 + '" class="gd-vid' + (켬 ? ' on' : '') + '" data-참고="' + esc(v.id) + '">' +
      '<img src="https://i.ytimg.com/vi/' + encodeURIComponent(v.id) + '/mqdefault.jpg" alt="" loading="lazy" referrerpolicy="no-referrer">' +
      '<span class="gd-vt">' + esc(v.tr || v.t) + '</span>' +
      '<span class="gd-vm">' + esc(v.cc) + ' · ' + (초 ? (초 < 60 ? 초 + '초' : Math.floor(초 / 60) + '분 ' + (초 % 60) + '초') + ' · ' : '') + '조회 ' + 국숫자(+v.v || 0) + '</span></button>';
  }
  function 후보칸() {
    if (S.유형 !== '상품') return '';
    if (S.후보 === null) return '<p class="gd-fine" role="status">같은 상품의 해외 영상을 찾고 있어요…</p>';
    if (S.후보실패) return '<p class="gd-fine" role="status">같은 상품의 영상을 불러오지 못했어요. 앞 단계로 갔다 오면 다시 찾아요. 참고할 영상 주소가 있으면 위 칸에 붙여넣어 주세요.</p>';
    if (!S.후보.length) return '<p class="gd-fine" role="status">같은 상품의 해외 영상은 아직 없어요. 참고할 영상 주소가 있으면 위 칸에 붙여넣어 주세요.</p>';
    return '<div class="gd-box"><h3>해외에서 이 상품 영상이 인기예요</h3><p class="gd-note">하나 고르면 위 주소 칸에 들어가요. 연출만 참고하고 영상·문구·색은 새로 만들어요.</p><div class="gd-vids">' + S.후보.map(후보카드).join('') + '</div></div>';
  }
  function 후보찾기() {
    var api = window.__rwGuideApi, 이름 = S.주제.trim();
    if (S.유형 !== '상품' || 이름.length < 2 || !api || !api.같은상품 || !켜짐() || !정식()) return;
    if (S.후보이름 === 이름) return;
    if (S.후보 && S.참고주소 && S.후보.some(function (v) { return S.참고주소.indexOf(v.id) >= 0; })) { S.참고주소 = ''; if (S.길 === 'ref') S.길 = ''; }   // 상품이 바뀌면 예전 상품의 후보 선택은 푼다
    S.후보이름 = 이름; S.후보 = null; S.후보실패 = false;
    api.같은상품(이름).then(function (목록) {
      if (S.후보이름 !== 이름) return;   // 그 사이 이름이 바뀌었으면 버린다
      if (!목록) { S.후보실패 = true; S.후보이름 = ''; }   // 실패는 '없음'과 다르다 · 다음에 다시 시도할 수 있게 비워 둔다
      S.후보 = 목록 || []; if (열림() && S.단계 === 2) 그리기();
    });
  }
  function 참고열림() { return !!(window.RWFlags && window.RWFlags.has('참고영상')) && 정식(); }
  function 주소맞음(u) { return !!(window.RWReference && RWReference.checkUrl && RWReference.checkUrl(u) === 'ok'); }
  function 단계2() {
    var 열 = 참고열림(), 상품 = S.유형 === '상품', 주소 = S.참고주소, 맞음 = 주소맞음(주소);
    var 참고칸 = '<div class="gd-box gd-ref' + (S.길 === 'ref' ? ' on' : '') + '"><h3>참고할 영상 주소</h3>' +
      (열 ? '<p class="gd-note">유튜브 영상 주소를 넣으면, 신청 화면에서 그 영상의 연출을 살펴보고 화면·자막·글자 모양·장면 움직임을 미리 채워 둬요.</p>' +
        '<input type="url" id="gd-ref" class="gd-in" inputmode="url" autocomplete="off" spellcheck="false" value="' + esc(주소) + '" placeholder="https://www.youtube.com/shorts/…" aria-label="참고할 유튜브 영상 주소"' + (주소 && !맞음 ? ' aria-invalid="true"' : '') + '>' +
        (주소 && !맞음 ? '<p class="gd-err" role="alert">유튜브 영상 주소만 넣을 수 있어요. (예: youtube.com/shorts/…, youtu.be/…)</p>' : '')
        : '<p class="gd-note">참고 영상은 정식 회원이 쓸 수 있어요. 지금은 참고 없이 만들 수 있어요.</p>') + '</div>';
    var 맡김 = '<button type="button" aria-pressed="' + (S.길 === 'none') + '" class="gd-card gd-ai' + (S.길 === 'none' ? ' on' : '') + '" data-길="none"><span class="gd-ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3l1.8 4.6L18 9.4l-4.2 1.8L12 16l-1.8-4.8L6 9.4l4.2-1.8z"/><path d="M18 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/></svg></span><h3>' + 길들.none.이름 + '</h3><p>' + 길들.none.설명 + '</p></button>';
    var 상품안내 = 상품 ? '<div class="gd-box gd-need"><h3>상품 재료</h3><p class="gd-note">상품 링크와 상품 사진·영상(공급처에서 받은 것)은 다음 신청 화면의 상품 칸에 넣어요. <b>상품 사진이나 영상이 하나 이상 꼭 필요해요.</b> 링크를 넣으면 상품 페이지를 읽어 설명에 써요.</p></div>' : '';
    return 제목(2, '참고할 영상이 있나요', '참고 영상의 연출을 따르고, 영상·음성·로고·문구·색은 새로 만들어요.') +
      '<div class="gd-chip">' + (상품 ? '상품' : '주제') + ' <b>' + esc(S.주제.trim()) + '</b></div>' +
      참고칸 + (열 ? 후보칸() : '') + 맡김 + 상품안내 +
      '<p class="gd-fine">다른 회사 광고를 흉내 낸 영상은 분쟁이나 유튜브 제재 대상이 될 수 있어요. 참고 영상 사용 책임은 이용하는 분께 있어요.</p>' +
      단추줄('다음', !(S.길 === 'none' || (S.길 === 'ref' && 맞음)));
  }
  function 단계3() {
    if (S.종류 && 지금종류() && !길에맞음(지금종류())) S.종류 = '';
    if (!S.종류) { S.종류 = 추천종류(); S.종류직접 = false; }
    var 추천 = 추천종류();
    var 카드 = 종류들.map(function (k) {
      var 열 = 종류열림(k) && 길에맞음(k), 그림 = k.키 === 'long' ? '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M10 10v4l4-2z"/>' : k.키 === 'prod' ? '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>' : k.키 === 'yadam' ? '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>' : k.키 === 'mood' ? '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>' : '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>';
      return '<button type="button" aria-pressed="' + (S.종류 === k.이름) + '" class="gd-card sm' + (S.종류 === k.이름 ? ' on' : '') + (k.이름 === 추천 && 열 ? ' rec' : '') + '" data-종류="' + k.이름 + '"' + (열 ? '' : ' disabled') + '>' +
        (k.이름 === 추천 && 열 ? '<span class="gd-tag">추천</span>' : (열 ? '' : '<span class="gd-tag soon">' + (종류열림(k) ? (S.유형 === '상품' ? '상품은 상품쇼츠' : '상품 소개 전용') : '준비 중') + '</span>')) +
        '<span class="gd-ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + 그림 + '</svg></span><h3>' + k.이름 + '</h3><p>' + k.설명 + '</p></button>';
    }).join('');
    return 제목(3, '어떤 영상으로 만들까요', S.유형 === '상품' ? '상품 소개는 상품쇼츠로 만들어요.' : (S.길 === 'ref' ? '롱폼은 대본 흐름과 목소리·자막 위치까지만 참고해요.' : '고르면 그 영상에 맞는 설정이 열려요.')) + '<div class="gd-cards five">' + 카드 + '</div>' +
      (S.종류 === '상품쇼츠' && S.주제.trim().length > 100 ? '<p class="gd-fine">상품 이름은 100자까지만 쓰여요. 신청 화면에서 고쳐 주세요.</p>' : '') +
      단추줄('다음', !(지금종류() && 종류열림(지금종류()) && 길에맞음(지금종류())));
  }
  function 선택칸(이름, 값, 목록, 그림) {
    return '<div class="gd-opts" role="group" aria-label="' + 이름 + '">' + 목록.map(function (o) {
      var v = o[0], 가로 = 폼형태() === '롱폼';
      return '<button type="button" aria-pressed="' + (값 === v) + '" class="gd-o' + (값 === v ? ' on' : '') + '" data-' + 이름 + '="' + v + '">' + 그림(v, 가로) + '<b>' + v + '</b><small>' + o[1] + '</small></button>';
    }).join('') + '</div>';
  }
  function 단계4() {
    var k = 지금종류(), api = window.__rwGuideApi;
    if (!설정종류() || !api) {
      var 말 = { '상품쇼츠': '목소리와 자막은 다음 화면에서 정해요.', '야담': '이야기꾼 목소리와 이야기 길이는 다음 화면에서 정해요.', '분위기 영상': '분위기와 목소리는 다음 화면에서 정해요.' }[k ? k.이름 : ''] || '세부 설정은 다음 화면에서 정해요.';
      return 제목(4, '이렇게 만들어 드릴게요', esc(말) + (S.길 === 'ref' ? ' 화면·글자 모양은 참고 영상 분석이 끝나면 채워져요.' : '')) +
        '<div class="gd-box"><h3>' + (k ? k.이름 : '') + '</h3><p class="gd-fine" style="margin:6px 0 0">주제와 재료 선택은 미리 넣어 둘게요. 다음 화면에서 이어서 정하면 돼요.</p></div>' + 단추줄('다음');
    }
    var 후보 = 길이후보[폼형태()], 분 = 길이분(), 기본 = S.길이칸 === 가운데칸();
    var 구성카드 = k.이름 === '쇼츠' ? '<div class="gd-k"><div class="gd-kh"><b>화면 구성</b><span class="gd-tag in">' + (S.구성 === '자동' ? '추천' : '직접 고름') + '</span></div>' +
      선택칸('구성', S.구성, api.구성들, function (v, 가로) { return api.그림(v === '자동' ? '제목고정형' : v, S.자막 === '자동' ? '하단' : S.자막, 가로, v === '자동'); }) + '</div>' : '';
    return 제목(4, '이렇게 만들어 드릴게요', S.길 === 'ref' ? '화면 구성·자막·글자 모양은 신청 화면에서 참고 영상대로 채워져요. 여기서 직접 고른 값이 있으면 그 값이 먼저예요.' : '추천값으로 채워 두었어요. 바꾸고 싶은 것만 눌러 주세요.') + '<div class="gd-grid">' + 구성카드 + (!세부설정종류() ? '' :
      '<div class="gd-k"><div class="gd-kh"><b>자막 위치</b><span class="gd-tag in">' + (S.자막 === '자동' ? '추천' : '직접 고름') + '</span></div>' +
      선택칸('자막', S.자막, api.자막들, function (v, 가로) { return api.그림(S.구성 === '자동' ? '제목고정형' : S.구성, v === '자동' ? '하단' : v, 가로, v === '자동'); }) + '</div>') +
      '<div class="gd-k"><div class="gd-kh"><b>길이</b>' + (기본 ? '<span class="gd-tag in">추천</span>' : '') + '</div><div class="gd-big">' + 길이말(분) + '<small>' + (기본 ? '기본 길이' : '') + '</small></div>' +
      '<div class="gd-sl"><button type="button" class="gd-st" data-길이="-1" aria-label="짧게">−</button><input type="range" min="0" max="' + (후보.length - 1) + '" step="1" value="' + S.길이칸 + '" id="gd-len" aria-label="영상 길이"><button type="button" class="gd-st" data-길이="1" aria-label="길게">＋</button></div>' +
      '<p class="gd-fine">가운데가 기본 길이예요. 길게 하면 대본과 포인트가 함께 늘어요.</p></div>' +
      '<div class="gd-k"><div class="gd-kh"><b>목소리</b><span class="gd-tag in">' + (S.목소리 ? '직접 고름' : '추천') + '</span></div><div id="gd-vp"></div></div></div>' + 단추줄('다음');
  }
  function 단계5() {
    var k = 지금종류(), 상세 = 설정종류(), 화면설정 = 세부설정종류();
    return 제목(5, '이대로 만들까요', S.길 === 'ref' ? '신청 화면에서 참고 영상 분석(약 1~2분)이 끝나면 확인하고 신청해요.' : (상세 ? '신청 화면에서 포인트를 확인하고 마지막으로 눌러 주세요.' : '신청 화면으로 이동해 이어서 정해요.')) +
      '<div class="gd-box big">' + 요약줄('주제', S.주제.trim(), 1) + 요약줄('참고 영상', 참고말(), 2) +
      요약줄('영상 종류', k ? k.이름 : '') + (상세 ? 요약줄('길이', 길이말(길이분())) + (!화면설정 ? '' : 요약줄('화면 구성', k.이름 === '쇼츠' ? (S.구성 === '자동' ? '제목고정형 (추천)' : S.구성) : '전체화면') + 요약줄('자막 위치', S.자막 === '자동' ? '하단 (추천)' : S.자막) + (k.이름 === '쇼츠' && window.RWCompose ? 요약줄('모양', RWCompose.요약(S.compose)) : '')) + 요약줄('목소리', S.목소리 ? (window.RWVoiceCatalog && RWVoiceCatalog.이름 ? RWVoiceCatalog.이름(S.목소리) : '직접 고름') : '추천') : '') + '</div>' +
      '<div class="gd-foot"><button type="button" class="gd-btn2" data-act="prev">이전</button>' + (상세 ?
      '<span class="gd-two">' + (k.이름 === '쇼츠' && window.RWCompose ? '<button type="button" class="gd-btn2" data-act="compose">모양 바꾸기</button>' : '') + '<button type="button" class="gd-btn2" data-act="detail">더 자세히 설정하기</button><button type="button" class="gd-btn" data-act="make">이대로 만들기</button></span>' :
      '<button type="button" class="gd-btn" data-act="detail">신청 화면으로 가기</button>') + '</div>';
  }
  function 그리기(맨위) {
    if (!허브) return;
    소리멈춤();
    var 위 = 허브.scrollTop, 활성 = document.activeElement, 선택자 = '';
    if (활성 && 허브.contains(활성)) { if (활성.id) 선택자 = '#' + 활성.id; else for (var i = 0; i < 활성.attributes.length; i++) { var a = 활성.attributes[i]; if (a.name.indexOf('data-') === 0) { 선택자 = '[' + a.name + '="' + a.value + '"]'; break; } } }
    var 본문 = [단계1, 단계2, 단계3, 단계4, 단계5][S.단계 - 1]();
    허브.innerHTML = '<div class="gd-wrap"><div class="gd-head"><h1>' + esc(이름) + '</h1><p>' + esc(부제) + '</p></div>' + 머리() + '<div class="gd-body"><section class="gd-main">' + 본문 + '</section>' + 옆칸() + '</div></div>';
    if (S.단계 === 4 && 설정종류()) 소리판만들기();
    허브.scrollTop = 맨위 ? 0 : 위;
    if (선택자 && !맨위) { var 다시 = 허브.querySelector(선택자); if (다시) { try { 다시.focus({ preventScroll: true }); } catch (e) {} } }
    var 칸 = document.getElementById('gd-topic'); if (칸 && S.단계 === 1 && !S.주제) { try { 칸.focus({ preventScroll: true }); } catch (e) {} }
  }
  function 소리판만들기() {
    var 박 = document.getElementById('gd-vp');
    if (!박 || !window.RWVoicePicker) { if (박) 박.innerHTML = '<p class="gd-fine">목소리는 다음 화면에서 고를 수 있어요.</p>'; return; }
    소리판 = RWVoicePicker.mount(박, { 종류: 지금종류().이름 === '상품쇼츠' ? '상품쇼츠' : '쇼츠', 성별: S.성별, 값: S.목소리,
      바뀜: function (id) { S.목소리 = id || ''; var t = 허브.querySelector('.gd-k:last-child .gd-tag.in'); if (t) t.textContent = S.목소리 ? '직접 고름' : '추천'; },
      성별바뀜: function (g) { S.성별 = g === '여' ? '여' : '남'; } });
  }

  /* ───── 동작 ───── */
  function 이동(n) { S.단계 = Math.max(1, Math.min(5, n)); if (S.단계 === 2) 후보찾기(); 그리기(true); }
  function 다음검사() {
    if (S.단계 === 1) return !!S.주제.trim();
    if (S.단계 === 2) return S.길 === 'none' || (S.길 === 'ref' && 주소맞음(S.참고주소));
    if (S.단계 === 3) { var k = 지금종류(); return !!k && 종류열림(k) && 길에맞음(k); }
    return true;
  }
  function 입력(e) {
    if (e.target.id === 'gd-topic') { S.주제 = e.target.value; var b = 허브.querySelector('[data-act="next"]'); if (b) b.disabled = !S.주제.trim(); var 줄 = 허브.querySelector('.gd-rail .gd-row b'); if (줄) 줄.innerHTML = S.주제.trim() ? esc(S.주제.trim()) : '<em>아직 안 골랐어요</em>'; }
    if (e.target.id === 'gd-len') 길이바꿈(+e.target.value);
    if (e.target.id === 'gd-ref') { S.참고주소 = e.target.value.trim(); if (S.참고주소) S.길 = 'ref'; else if (S.길 === 'ref') S.길 = ''; var nb = 허브.querySelector('[data-act="next"]'); if (nb) nb.disabled = !다음검사(); var ai = 허브.querySelector('.gd-ai'); if (ai) { ai.classList.toggle('on', S.길 === 'none'); ai.setAttribute('aria-pressed', String(S.길 === 'none')); } var 줄 = 허브.querySelectorAll('.gd-rail .gd-row b')[1]; if (줄) 줄.innerHTML = 참고말() ? esc(참고말()) : '<em>아직 안 골랐어요</em>'; }
  }
  function 길이바꿈(칸) {   // 길이만 바꿀 때는 화면을 다시 그리지 않는다(슬라이더 끊김·스크롤 튐 방지)
    var 후보 = 길이후보[폼형태()]; S.길이칸 = Math.max(0, Math.min(후보.length - 1, 칸));
    var r = document.getElementById('gd-len'), 큰 = 허브.querySelector('.gd-big'), 기본 = S.길이칸 === 가운데칸();
    if (r) r.value = S.길이칸;
    if (큰) 큰.innerHTML = 길이말(길이분()) + '<small>' + (기본 ? '기본 길이' : '') + '</small>';
    var 머 = 큰 && 큰.parentNode.querySelector('.gd-kh'); if (머) 머.innerHTML = '<b>길이</b>' + (기본 ? '<span class="gd-tag in">추천</span>' : '');
  }
  function 눌림(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.go) { 이동(+d.go); return; }
    if (d.유형) { if (S.유형 !== d.유형) { S.유형 = d.유형; S.종류 = ''; S.종류직접 = false; 그리기(); } return; }
    if (d.참고) { var 같음 = !!S.참고주소 && S.참고주소.indexOf(d.참고) >= 0; S.참고주소 = 같음 ? '' : 'https://www.youtube.com/watch?v=' + d.참고; S.길 = S.참고주소 ? 'ref' : ''; 그리기(); return; }
    if (d.길) { if (d.길 === 'none') S.길 = S.길 === 'none' ? (주소맞음(S.참고주소) ? 'ref' : '') : 'none'; 그리기(); return; }
    if (d.종류) { if (S.종류 !== d.종류) { var 옛폼 = 폼형태(); S.종류 = d.종류; if (폼형태() !== 옛폼) S.길이칸 = 가운데칸(); } S.종류직접 = true; 그리기(); return; }
    if (d.구성) { S.구성 = d.구성; 그리기(); return; }
    if (d.자막) { S.자막 = d.자막; 그리기(); return; }
    if (d.길이) { 길이바꿈(S.길이칸 + (+d.길이)); return; }
    switch (d.act) {
      case 'prev': 이동(S.단계 - 1); break;
      case 'next': if (다음검사()) 이동(S.단계 + 1); break;
      case 'finder': 닫기(); var f = document.getElementById('to-topic-finder'); if (f) f.click(); break;
      case 'compose': if (window.RWCompose) {
        var 거꾸로 = { '하단': '아래', '가운데': '가운데', '상단': '위', '자동': '아래' }, 정방향 = { '아래': '하단', '가운데': '가운데', '위': '상단' };
        RWCompose.open({ 종류: '쇼츠', 화면: '세로', 값: S.compose || {}, 자막위치: 거꾸로[S.자막] || '아래', 샘플: S.주제.trim().slice(0, 30),
          onDone: function (res) { S.compose = Object.keys(res.compose).length ? res.compose : null; if (res.초기화) { S.구성 = '자동'; S.자막 = '자동'; } else { if (res.화면구성) S.구성 = res.화면구성; if (S.compose || res.위치바뀜) S.자막 = 정방향[res.자막위치]; } 그리기(); } });
      } break;
      case 'make': 적용(true); break;
      case 'detail': 적용(false); break;
    }
  }
  function 적용(바로확인) {
    var api = window.__rwGuideApi, k = 지금종류();
    if (!api || !k) return;
    var 참고 = S.길 === 'ref' && 주소맞음(S.참고주소) ? S.참고주소 : '';
    var 힌트 = 참고 ? '참고 영상을 넣고 분석을 시작했어요. 끝나면 화면·자막·글자 모양이 참고 영상대로 채워져요(바꿔도 돼요).' : '';
    if (k.이름 === '상품쇼츠') 힌트 = (힌트 ? 힌트 + ' ' : '') + '상품 링크와 상품 사진·영상을 아래 칸에 넣어 주세요.';
    var 값 = { 주제: S.주제.trim(), 종류: k.이름, 키: k.키, 폼: k.폼, 길: S.길, 참고: 참고, 힌트: 힌트, 바로확인: !!바로확인 && !참고 };   // 참고 영상은 분석을 기다려야 해서 확인 단계로 건너뛰지 않는다
    if (설정종류()) { 값.구성 = k.이름 === '쇼츠' ? S.구성 : ''; 값.자막 = S.자막; 값.compose = k.이름 === '쇼츠' ? S.compose : null; 값.길이분 = 길이분(); 값.목소리 = S.목소리; }
    닫기();
    api.적용(값);
  }

  window.RWGuide = { 열기: 열기, 닫기: 닫기, 이름: 이름 };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', 만들기); else 만들기();
})();
