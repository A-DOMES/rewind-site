/* 리와인드 로그인 동의 — 모든 로그인 화면이 함께 쓰는 파일 (지금은 new.html 에 연결됨. 다른 로그인 화면은 다음 단계에서 연결)
   - 약관·방침 버전은 아래 TERMS / PRIVACY 두 값만 바꾸면 된다. 올리면 모든 사용자가 다시 한 번 동의 창을 본다(불리한 변경일 때만 올릴 것).
   - 한 번 동의한 브라우저에서는 동의 창이 다시 뜨지 않는다(localStorage 'rw_consent'). 서버는 시트 '동의기록' 탭에 이메일·버전당 1건만 남긴다.
   - 처음 쓰는 계정인데 서버가 동의를 요구하면(needConsent) ask() 창을 띄운다. */
(function () {
  'use strict';
  var TERMS = 'v2026-10', PRIVACY = 'v2026-10', KEY = 'rw_consent';
  var checked = false;       // 이 화면에서 세 항목에 모두 체크했는지
  var mounted = null;        // 현재 그려 둔 동의 블록

  function has() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!o && o.t === TERMS && o.p === PRIVACY; } catch (e) { return false; }
  }
  function remember() { try { localStorage.setItem(KEY, JSON.stringify({ t: TERMS, p: PRIVACY })); } catch (e) {} }
  function obj() { return { terms: TERMS, privacy: PRIVACY, age14: true }; }
  function versionObj() { return { terms: TERMS, privacy: PRIVACY }; }
  function pending() { return checked ? obj() : null; }   // 서버로 보낼 동의 정보(이 화면에서 체크했을 때만)

  function addStyle() {
    if (document.getElementById('rwc-style')) return;
    var s = document.createElement('style'); s.id = 'rwc-style';
    s.textContent =
      '.rwc{margin:0 0 18px;text-align:left}' +
      '.rwc-row{display:flex;align-items:center;gap:12px;min-height:44px;font-size:.94rem;color:var(--ink-dim,#a8a49b);line-height:1.4}' +
      '.rwc-row label{display:flex;align-items:center;gap:12px;flex:1;min-width:0;cursor:pointer}' +
      '.rwc input[type=checkbox]{width:22px;height:22px;flex-shrink:0;margin:0;accent-color:var(--amber,var(--gold,#e2a23c));cursor:pointer}' +
      '.rwc-all{border-bottom:1px solid var(--line,#2a2a2a);color:var(--ink,#f5f3ee);font-weight:600;margin-bottom:2px}' +
      '.rwc-req{color:var(--amber,var(--gold,#e2a23c));font-weight:600;white-space:nowrap}' +
      '.rwc-view{flex-shrink:0;color:var(--ink-faint,#6f6b62);font-size:.84rem;text-decoration:underline;padding:10px 2px}' +
      '.rwc-view:hover{color:var(--ink,#f5f3ee)}' +
      '.rwc-msg{margin:6px 0 0;min-height:1.3em;font-size:.84rem;color:var(--err,#c96a5a)}' +
      '.rwc-modal{position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg,#0c0c0c);overflow:auto}' +
      '.rwc-card{width:100%;max-width:400px;background:var(--bg-raised,#161616);border:1px solid var(--line,#2a2a2a);border-radius:14px;padding:26px 22px;color:var(--ink,#f5f3ee)}' +
      '.rwc-card h2{margin:0 0 8px;font-size:1.2rem;font-family:inherit}' +
      '.rwc-card p.rwc-lede{margin:0 0 18px;color:var(--ink-dim,#a8a49b);font-size:.92rem;line-height:1.6}' +
      '.rwc-btns{display:flex;flex-direction:column;gap:8px;margin-top:6px}' +
      '.rwc-go{min-height:46px;border:0;border-radius:10px;background:var(--amber,var(--gold,#e2a23c));color:var(--on-gold,#14100a);font-size:1rem;font-weight:600;font-family:inherit;cursor:pointer}' +
      '.rwc-go:disabled{opacity:.35;cursor:not-allowed}' +
      '.rwc-out{min-height:42px;border:0;background:none;color:var(--ink-faint,#6f6b62);font-size:.9rem;font-family:inherit;cursor:pointer;text-decoration:underline}';
    document.head.appendChild(s);
  }

  // 동의 블록을 그린다. onChange(ok) 는 세 항목이 모두 체크됐는지가 바뀔 때마다 불린다.
  function mount(el, onChange) {
    addStyle();
    el.innerHTML =
      '<div class="rwc">' +
      '<div class="rwc-row rwc-all"><label><input type="checkbox" data-all> 모두 동의합니다</label></div>' +
      '<div class="rwc-row"><label><input type="checkbox" data-k="terms"><span><span class="rwc-req">(필수)</span> 이용약관 동의</span></label><a class="rwc-view" href="./tos.html" target="_blank" rel="noopener">보기</a></div>' +
      '<div class="rwc-row"><label><input type="checkbox" data-k="privacy"><span><span class="rwc-req">(필수)</span> 개인정보 수집·이용 동의</span></label><a class="rwc-view" href="./terms.html" target="_blank" rel="noopener">보기</a></div>' +
      '<div class="rwc-row"><label><input type="checkbox" data-k="age14"><span><span class="rwc-req">(필수)</span> 만 14세 이상입니다</span></label></div>' +
      '<p class="rwc-msg" role="status" aria-live="polite"></p></div>';
    var all = el.querySelector('[data-all]'), ks = [].slice.call(el.querySelectorAll('[data-k]')), msg = el.querySelector('.rwc-msg');
    function sync(fromAll) {
      if (fromAll) ks.forEach(function (c) { c.checked = all.checked; });
      var ok = ks.every(function (c) { return c.checked; });
      all.checked = ok; checked = ok; if (ok) msg.textContent = '';
      if (onChange) onChange(ok);
    }
    all.addEventListener('change', function () { sync(true); });
    ks.forEach(function (c) { c.addEventListener('change', function () { sync(false); }); });
    mounted = { el: el, ks: ks, msg: msg };
    checked = false;
    return { nudge: nudge };
  }

  // 체크가 덜 된 채로 로그인하려 할 때: 안내 문구를 보이고 첫 빈 칸으로 이동한다.
  function nudge() {
    if (!mounted) return;
    mounted.msg.textContent = '필수 항목에 모두 동의하면 로그인할 수 있어요.';
    var first = mounted.ks.filter(function (c) { return !c.checked; })[0];
    if (first) { try { first.focus(); } catch (e) {} }
  }

  // 처음 쓰는 계정인데 서버가 동의를 요구할 때 띄우는 창. onAgree() 는 동의하고 시작할 때, onCancel() 은 로그아웃을 누를 때.
  function ask(onAgree, onCancel) {
    addStyle();
    if (document.getElementById('rwc-modal')) return;
    var m = document.createElement('div'); m.className = 'rwc-modal'; m.id = 'rwc-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-labelledby', 'rwc-ttl');
    m.innerHTML = '<div class="rwc-card"><h2 id="rwc-ttl">이용 동의가 필요해요</h2><p class="rwc-lede">처음 이용하는 계정이에요. 아래 내용에 동의하면 바로 시작할 수 있어요.</p><div data-slot></div><div class="rwc-btns"><button type="button" class="rwc-go" disabled>동의하고 시작하기</button><button type="button" class="rwc-out">동의하지 않고 로그아웃</button></div></div>';
    document.body.appendChild(m);
    var go = m.querySelector('.rwc-go');
    mount(m.querySelector('[data-slot]'), function (ok) { go.disabled = !ok; });
    go.addEventListener('click', function () { if (!checked) return; m.remove(); if (onAgree) onAgree(); });
    m.querySelector('.rwc-out').addEventListener('click', function () { m.remove(); if (onCancel) onCancel(); });
    var f = m.querySelector('input'); if (f) f.focus();
  }

  // 로그인이 필요한 다른 화면용: 이 브라우저에 동의 기록이 없으면 new.html 로그인 화면(동의 창)으로 보내고, 동의가 끝나면 원래 화면으로 돌려보낸다.
  function guard() {
    if (has()) return;
    try { if (window.top !== window) return; } catch (e) { return; }
    var cur = location.pathname.split('/').pop() + location.search;
    location.replace('./new.html?next=' + encodeURIComponent(cur));
  }
  // new.html 이 돌려보낼 곳. 우리 화면 파일 이름만 허용한다(다른 주소로 보내는 것을 막는다).
  function next() {
    try {
      var n = new URLSearchParams(location.search).get('next') || '';
      return /^(dashboard|project|editor|new-studio-preview)\.html(\?[A-Za-z0-9_=&%.\-]*)?$/.test(n) ? './' + n : '';
    } catch (e) { return ''; }
  }

  window.RWConsent = { guard: guard, next: next, TERMS: TERMS, PRIVACY: PRIVACY, has: has, remember: remember, obj: obj, versionObj: versionObj, pending: pending, ok: function () { return checked; }, mount: mount, nudge: nudge, ask: ask };
})();
