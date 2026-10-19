/* 알림 카드 — 내 프로젝트 맨 위의 카드와, 새로 만들기 화면 메뉴의 숫자 표시가 같은 규칙을 쓴다.
   사용:
     RewindNotice.hasError(p)            내 프로젝트 목록 줄과 같은 '문제 있음' 기준
     RewindNotice.build(projects)        카드 목록 (위에서부터 보여 줄 순서)
     RewindNotice.render(box, projects, { onAct })   카드를 box에 그린다 (15초 갱신 때 다시 불러도 깜빡이지 않는다)
     RewindNotice.setBadges(projects)    메뉴의 '내 프로젝트' 옆 숫자 (확인할 것이 있을 때만)
   카드 종류를 늘리려면 아래 KINDS에 한 덩어리를 더하고 build()의 분류에 한 줄을 더하면 된다. */
(function () {
  var OFF_KEY = 'rw_notice_off';   // 닫은 카드 (종류:프로젝트번호) — 이 브라우저에만 저장
  var RECENT_DAYS = 7;             // 완성 카드는 신청한 지 이 기간 안의 영상만 보여 준다 (프로젝트 번호가 신청 시각이다)
  var SHOW_MAX = 3;                // 처음에 보여 줄 개수

  var ICON = {
    script: '<path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    scene: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M8 5l-2 4M13 5l-2 4M18 5l-2 4"/>',
    done: '<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z"/>',
    fail: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>'
  };

  // ---- 상태 판단 (대시보드 목록 줄과 같은 기준) ----
  function scriptFailNote(p) { return p.status === '대본실패' || String(p.errorLog || '').indexOf('대본 작성 실패') === 0; }
  function hasError(p) { return !!(p.errorLog && String(p.errorLog).indexOf('[안내]') !== 0 && !scriptFailNote(p)); }
  function status(p) { return String(p.status || '').trim(); }
  function madeAt(id) {   // 프로젝트 번호가 곧 만든 시각 (예: 2609191902 → 2026.09.19 19:02)
    var s = String(id == null ? '' : id).replace(/\.0$/, '').replace(/\D/g, '');
    if (s.length < 10) return null;
    var n = function (i) { return Number(s.slice(i, i + 2)); };
    var d = new Date(2000 + n(0), n(2) - 1, n(4), n(6), n(8), s.length >= 12 ? n(10) : 0);
    return isNaN(d.getTime()) || n(2) < 1 || n(2) > 12 ? null : d;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function name(p) { return String(p.title || '').trim() || '새 영상'; }
  function link(p) { return './project.html?id=' + encodeURIComponent(p.id); }

  // ---- 카드 종류: 제목 · 한 줄 설명 · 단추 ----
  var KINDS = {
    script: { tone: 'todo', icon: 'script', title: '대본을 확인해 주세요', btn: '대본 보기', sub: function (p) { return '“' + name(p) + '” 대본이 준비됐어요'; }, href: link },
    scene: { tone: 'todo', icon: 'scene', title: '최종 장면을 확인해 주세요', btn: '장면 보기', sub: function (p) { return '“' + name(p) + '” 장면이 준비됐어요'; }, href: link },
    fail: {
      tone: 'bad', icon: 'fail', title: '영상을 만들지 못했어요', btn: '포인트 내역', closable: true, act: 'points',
      sub: function (p) { return '“' + name(p) + '” ' + (window.RewindFail ? window.RewindFail.reason(p.errorLog) : '제작 중 문제가 생겼어요.'); },
      note: '사용한 포인트는 모두 돌아와요'
    },
    done: { tone: 'done', icon: 'done', title: '영상이 완성됐어요', btn: '영상 보기', closable: true, sub: function (p) { return '“' + name(p) + '”'; }, href: link }
  };

  function kindOf(p) {
    var s = status(p);
    if (s === '실패') return 'fail';
    if (hasError(p)) return null;   // 문제 발생(운영자 확인 중)은 카드 대신 목록 줄에서 안내
    if (s === '배포' || p.videoUrl) {   // 완성이 먼저 — 위쪽 요약 숫자와 같은 순서
      var d = madeAt(p.id);
      return d && Date.now() - d.getTime() < RECENT_DAYS * 86400000 ? 'done' : null;
    }
    if (s === '대본검수대기') return 'script';
    if (s === '검수 대기') return 'scene';
    return null;
  }

  function closed() { try { return JSON.parse(localStorage.getItem(OFF_KEY) || '[]'); } catch (e) { return []; } }
  function close(key) { try { var a = closed(); if (a.indexOf(key) < 0) a.push(key); localStorage.setItem(OFF_KEY, JSON.stringify(a.slice(-200))); } catch (e) { /* 저장 못 해도 이번 화면에서는 닫힌다 */ } }

  var ORDER = { script: 0, scene: 0, fail: 1, done: 2 };
  function build(projects) {
    var off = closed(), out = [];
    (projects || []).forEach(function (p, i) {
      var k = kindOf(p); if (!k) return;
      var key = k + ':' + p.id;
      if (KINDS[k].closable && off.indexOf(key) >= 0) return;
      out.push({ kind: k, key: key, p: p, i: i });
    });
    out.sort(function (a, b) { return (ORDER[a.kind] - ORDER[b.kind]) || (a.i - b.i); });
    return out;
  }
  function actionCount(projects) { return build(projects).filter(function (n) { return KINDS[n.kind].tone === 'todo'; }).length; }

  // ---- 그리기 ----
  function cardHtml(n, fresh) {
    var K = KINDS[n.kind], p = n.p;
    var svg = '<svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[K.icon] + '</svg>';
    var btn = K.act
      ? '<button type="button" class="nc-btn" data-act="' + K.act + '">' + K.btn + '</button>'
      : '<a class="nc-btn" href="' + esc(K.href(p)) + '">' + K.btn + '</a>';
    return '<article class="nc nc-' + K.tone + (fresh ? ' nc-new' : '') + '" data-key="' + esc(n.key) + '">' +
      '<span class="nc-ico">' + svg + '</span>' +
      '<div class="nc-body"><h3 class="nc-t">' + K.title + '</h3><p class="nc-s">' + esc(K.sub(p)) + '</p>' + (K.note ? '<p class="nc-n">' + K.note + '</p>' : '') + '</div>' +
      btn +
      (K.closable ? '<button type="button" class="nc-x" data-close="' + esc(n.key) + '" aria-label="알림 닫기" title="닫기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' : '') +
      '</article>';
  }

  function render(box, projects, opt) {
    if (!box) return;
    opt = opt || {}; if (opt.onAct || !box._opt) box._opt = opt;   // 단추 동작은 가장 나중에 넘겨 준 것을 쓴다
    var list = build(projects);
    if (list.length <= SHOW_MAX) box._open = false;
    var sig = list.map(function (n) { return n.key + '|' + (n.p.title || '') + '|' + (n.p.errorLog || ''); }).join('\n') + '#' + (box._open ? 1 : 0);
    if (box.dataset.sig === sig) return;   // 바뀐 게 없으면 다시 그리지 않는다 (15초마다 새로 불러와도 깜빡이지 않음)
    box.dataset.sig = sig;
    var seen = box._seen || (box._seen = {});
    if (!box._bound) {
      box._bound = true;
      box.addEventListener('click', function (e) {
        var x = e.target.closest('[data-close]');
        if (x) {
          var card = x.closest('.nc'), nxt = card.nextElementSibling || card.previousElementSibling;
          close(x.getAttribute('data-close')); box.dataset.sig = ''; render(box, box._projects, box._opt);
          var back = nxt && nxt.getAttribute('data-key') ? box.querySelector('[data-key="' + nxt.getAttribute('data-key').replace(/"/g, '') + '"] .nc-x, [data-key="' + nxt.getAttribute('data-key').replace(/"/g, '') + '"] .nc-btn') : null;
          (back || box.querySelector('.nc-more') || document.body).focus && (back || box.querySelector('.nc-more') || document.body).focus();
          return;
        }
        var a = e.target.closest('[data-act]');
        if (a && box._opt.onAct) { box._opt.onAct(a.getAttribute('data-act')); return; }
        if (e.target.closest('.nc-more')) { box._open = !box._open; box.dataset.sig = ''; render(box, box._projects, box._opt); var m = box.querySelector('.nc-more'); if (m) m.focus(); }
      });
    }
    box._projects = projects;
    if (!list.length) { box.innerHTML = ''; box.hidden = true; return; }
    var shown = box._open ? list : list.slice(0, SHOW_MAX), rest = list.length - SHOW_MAX;
    box.innerHTML = shown.map(function (n) { var fresh = !seen[n.key]; seen[n.key] = 1; return cardHtml(n, fresh); }).join('') +
      (rest > 0 ? '<button type="button" class="nc-more" aria-expanded="' + (box._open ? 'true' : 'false') + '">' + (box._open ? '접기' : '알림 ' + rest + '개 더 보기') + '</button>' : '');
    box.hidden = false;
  }

  // ---- 메뉴 숫자 ----
  function setBadges(projects) {
    var n = actionCount(projects);
    var targets = document.querySelectorAll('.side-item[href="./dashboard.html"], .mobile-nav a[href="./dashboard.html"]');
    for (var i = 0; i < targets.length; i++) {
      var el = targets[i], b = el.querySelector('.nc-badge');
      if (!n) { if (b) b.remove(); continue; }
      if (!b) { b = document.createElement('span'); b.className = 'nc-badge'; b.setAttribute('role', 'img'); el.appendChild(b); }
      b.textContent = n > 9 ? '9+' : String(n);
      b.setAttribute('aria-label', '확인할 것 ' + n + '건');
    }
  }

  window.RewindNotice = { hasError: hasError, scriptFailNote: scriptFailNote, build: build, actionCount: actionCount, render: render, setBadges: setBadges };
})();
