/* 참고 영상 주소 입력 (6-4): 쇼츠 만들기 폼 안에서 참고할 유튜브 영상 주소를 받아 '비슷한 구성'을 분석한다.
 * 화면 상태: 입력 전 → (올바른 주소) → 분석 중 → 완료(쉬운 말 요약) / 안내(실패·한도·정식 회원 전용)
 * 서버(order-reference): {action:'start', idToken, url, form} → {ok, id, status} / {action:'status', idToken, id} → {ok, status, summary[], reason}
 * 고객은 값을 고르거나 고치지 않는다(정확도는 시스템이 맡는다). 결과 번호만 #df-referenceId 에 담는다(신청 반영은 6-6).
 * 보이는 조건: 시트 `기능공개`의 `참고영상` 줄이 열려 있고(RWFlags.has) 만드는 모양이 쇼츠일 때. */
(function () {
  var URL_ = 'https://bald-buffalo.pikapod.net/webhook/order-reference';
  var current = null;   // 지금 화면에 붙어 있는 칸의 상태(신청 화면이 '분석 중인가'를 물어볼 때 쓴다)
  var CSS = ''
    + '.rf-box{margin-top:var(--sp-4);padding:var(--sp-4);border:1px solid var(--line);border-radius:var(--r-lg);background:var(--bg-raised)}'
    + '.rf-head{display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap}.rf-head h4{margin:0;font-size:var(--fs-md);font-weight:600}'
    + '.rf-tag{font-size:var(--fs-2xs);color:var(--accent);border:1px solid var(--accent);border-radius:var(--r-pill);padding:1px 8px}'
    + '.rf-tag.dim{color:var(--ink-dim);border-color:var(--line)}'
    + '.rf-sub{margin:var(--sp-1) 0 var(--sp-3);color:var(--ink-dim);font-size:var(--fs-sm)}'
    + '.rf-row{display:flex;gap:var(--sp-2)}'
    + '.rf-in{flex:1;min-width:0;min-height:48px;padding:0 var(--sp-4);background:var(--bg-input);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-md);font:inherit;font-size:var(--fs-base)}'
    + '.rf-in:focus{outline:2px solid var(--accent);outline-offset:1px}.rf-in[aria-invalid="true"]{border-color:var(--err)}'
    + '.rf-btn{min-height:48px;padding:0 var(--sp-4);border-radius:var(--r-md);border:1px solid var(--line);background:none;color:var(--ink-dim);font:inherit;font-size:var(--fs-sm);cursor:pointer;white-space:nowrap}'
    + '.rf-go{width:100%;margin-top:var(--sp-3);background:var(--accent);border-color:var(--accent);color:var(--on-gold);font-weight:600;font-size:var(--fs-base)}'
    + '.rf-go:disabled{opacity:.45;cursor:not-allowed}'
    + '.rf-msg{margin:var(--sp-2) 0 0;font-size:var(--fs-sm);color:var(--err)}.rf-msg:empty{display:none}'
    + '.rf-wait{display:flex;gap:var(--sp-3);align-items:center;padding:var(--sp-3) 0}'
    + '.rf-spin{width:22px;height:22px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--accent);animation:rfspin 1s linear infinite;flex:none}'
    + '@keyframes rfspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.rf-spin{animation:none}}'
    + '.rf-wait b{display:block;font-weight:600}.rf-wait span{color:var(--ink-dim);font-size:var(--fs-sm)}'
    + '.rf-done{padding:var(--sp-3) 0 0}.rf-ok{display:flex;gap:var(--sp-2);align-items:center;font-weight:600}'
    + '.rf-ok i{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--on-gold);font-style:normal;font-size:var(--fs-xs)}'
    + '.rf-chips{display:flex;flex-wrap:wrap;gap:var(--sp-2);margin:var(--sp-3) 0}'
    + '.rf-chip{padding:6px 12px;border-radius:var(--r-pill);background:var(--accent-soft);color:var(--ink);font-size:var(--fs-sm)}'
    + '.rf-fine{margin:var(--sp-2) 0 0;color:var(--ink-faint);font-size:var(--fs-xs)}'
    + '.rf-note{padding:var(--sp-3) var(--sp-4);border-radius:var(--r-md);background:var(--bg-input);color:var(--ink);font-size:var(--fs-sm)}'
    + '.rf-row .rf-btn{padding:0 var(--sp-3)}'
    + '.rf-skip{margin-top:var(--sp-2)}.rf-next{margin:var(--sp-3) 0 0;padding:var(--sp-3) var(--sp-4);border-radius:var(--r-md);background:var(--accent-soft);color:var(--ink);font-size:var(--fs-sm)}';
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };   // 글자는 textContent 로만 넣는다
  var REASON = {   // 서버가 주는 사유 → 고객이 알아볼 말 (모르는 사유는 기본 문구)
    unavailable: '이 영상은 분석할 수 없어요. 공개된 다른 영상 주소를 넣어 주세요.',
    toolong: '너무 긴 영상이에요. 3분 이내 영상으로 시도해 주세요.',
    limit: '오늘 사용할 수 있는 횟수를 모두 썼어요. 내일 다시 이용할 수 있어요.',
    paid: '정식 회원 전용 기능이에요.',
    busy: '지금 이용이 많아요. 잠시 후 다시 시도해 주세요.'
  };
  // 유튜브 주소 검사(서버와 같은 규칙): https, 유튜브 주소, 11자리 영상 ID
  function checkUrl(v) {
    var s = String(v || '').trim(); if (!s) return '';
    var m; try { var u = new URL(s); if (u.protocol !== 'https:') return 'bad'; var h = u.hostname.replace(/^www\.|^m\./, '');
      if (h === 'youtu.be') m = /^\/([\w-]{11})$/.exec(u.pathname); else if (h === 'youtube.com') m = u.pathname === '/watch' ? [0, u.searchParams.get('v') || ''] : /^\/shorts\/([\w-]{11})$/.exec(u.pathname);
    } catch (e) { return 'bad'; }
    return m && /^[\w-]{11}$/.test(m[1]) ? 'ok' : 'bad';
  }
  function mount(opt) {
    var host = opt && opt.host; if (!host || host.querySelector('.rf-box')) return;
    if (!document.getElementById('rf-style')) { var st = el('style'); st.id = 'rf-style'; st.textContent = CSS; document.head.appendChild(st); }
    var box = el('div', 'rf-box df-hide'), hid = el('input'); hid.type = 'hidden'; hid.id = 'df-referenceId'; box.appendChild(hid);
    host.appendChild(box);
    var S = { phase: 'idle', url: '', msg: '', summary: [], timer: null, paid: false, run: 0 };
    var ping = function () { try { if (window.__rwFormRedraw) window.__rwFormRedraw(); } catch (e) { } };   // 상태가 바뀌면 신청 화면의 '다음' 버튼·안내를 다시 계산하게 한다
    var formOf = function () { var f = document.getElementById('df-form'); return f && f.value === '롱폼' ? '롱폼' : '쇼츠'; };
    var open = function () { return !!(window.RWFlags && window.RWFlags.has && window.RWFlags.has('참고영상')); };
    var token = function () { return typeof opt.getToken === 'function' ? opt.getToken() : ''; };
    var post = function (b) { var ac = typeof AbortController === 'function' ? new AbortController() : null, tm = ac ? setTimeout(function () { ac.abort(); }, 20000) : 0; return fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b), signal: ac ? ac.signal : undefined }).then(function (r) { clearTimeout(tm); return r; }, function (e) { clearTimeout(tm); throw e; }).then(function (r) { return r.json().catch(function () { return null; }).then(function (d) { return { ok: r.ok, d: d }; }); }); };
    function stop() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }
    function reset(keepUrl) { stop(); S.run++; hid.value = ''; S.phase = 'idle'; S.msg = ''; S.summary = []; if (!keepUrl) S.url = ''; draw(); ping(); }
    function fail(reason) { stop(); hid.value = ''; S.phase = 'idle'; S.msg = (REASON[reason] || '분석하지 못했어요. 잠시 후 다시 시도해 주세요.') + ' 참고 없이 만들려면 그대로 다음으로 가면 돼요.'; draw(); ping(); }
    function start() {
      if (S.phase === 'wait' || checkUrl(S.url) !== 'ok') return;
      S.phase = 'wait'; S.msg = ''; var run = ++S.run; draw(); ping();
      post({ action: 'start', idToken: token(), url: S.url.trim(), form: formOf() }).then(function (r) {
        if (run !== S.run) return; var d = r.d;
        if (!r.ok || !d || d.ok !== true) return fail(d && d.reason);
        if (d.status === '완료') return done(d);
        poll(d.id, run);
      }).catch(function () { if (run === S.run) fail('busy'); });
    }
    function poll(id, run) {
      var n = 0; stop();
      S.timer = setInterval(function () {
        if (!box.isConnected) return stop();
        if (++n > 60) return fail('busy');   // 3초 간격 3분
        post({ action: 'status', idToken: token(), id: id }).then(function (r) {
          var d = r.d; if (S.phase !== 'wait' || run !== S.run) return;
          if (!r.ok || !d || d.ok !== true) return fail(d && d.reason);
          if (d.status === '완료') done(Object.assign({ id: id }, d)); else if (d.status === '실패') fail(d.reason);
        }).catch(function () { });
      }, 3000);
    }
    function done(d) { stop(); hid.value = String(d.id || ''); S.summary = Array.isArray(d.summary) ? d.summary.slice(0, 8).map(String) : []; S.phase = 'done'; draw(); ping(); host.dispatchEvent(new CustomEvent('referencechange', { bubbles: true, detail: { id: hid.value } })); }
    function draw() {
      var keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.k : null;
      box.textContent = ''; box.appendChild(hid); box.removeAttribute('hidden');
      var head = el('div', 'rf-head'); head.appendChild(el('h4', '', '참고할 영상이 있나요?')); head.appendChild(el('span', 'rf-tag dim', '선택')); if (opt.preview) head.appendChild(el('span', 'rf-tag', '관리자 미리보기')); box.appendChild(head);
      box.appendChild(el('p', 'rf-sub', '유튜브 영상 주소를 넣으면 화면·자막·말 속도·장면 길이를 비슷하게 만들어요.'));
      if (S.phase === 'wait') {
        var w = el('div', 'rf-wait'); w.setAttribute('role', 'status'); w.appendChild(el('div', 'rf-spin'));
        var t = el('div'); t.appendChild(el('b', '', '영상 구성을 살펴보고 있어요')); t.appendChild(el('span', '', '약 1분 걸려요. 끝나면 아래 다음 버튼이 켜져요.')); w.appendChild(t); box.appendChild(w);
        var sk = el('button', 'rf-btn rf-skip', '참고 없이 계속하기'); sk.type = 'button'; sk.addEventListener('click', function () { reset(false); var n = box.querySelector('#rf-url'); if (n) n.focus(); }); box.appendChild(sk); return;
      }
      if (S.phase === 'done') {
        var dn = el('div', 'rf-done'), ok = el('div', 'rf-ok'); ok.appendChild(el('i', '', '✓')); ok.appendChild(el('span', '', '이 영상과 비슷한 구성으로 만들게요')); dn.appendChild(ok);
        if (S.summary.length) { var cs = el('div', 'rf-chips'); S.summary.forEach(function (x) { cs.appendChild(el('span', 'rf-chip', x)); }); dn.appendChild(cs); }
        var ch = el('button', 'rf-btn', '다른 영상으로 바꾸기'); ch.type = 'button'; ch.dataset.k = 'change'; ch.addEventListener('click', function () { reset(false); var n = box.querySelector('#rf-url'); if (n) n.focus(); host.dispatchEvent(new CustomEvent('referencechange', { bubbles: true, detail: { id: '' } })); });
        dn.appendChild(ch); var nx = el('p', 'rf-next', '화면·자막·말 속도는 기본으로 이 영상에 맞춰져요(직접 고른 값이 있으면 그 값이 먼저예요). 아래 \'다음\' 버튼을 눌러 이야기(주제나 대본)를 정해 주세요.'); nx.setAttribute('role', 'status'); dn.appendChild(nx); dn.appendChild(el('p', 'rf-fine', '영상 내용은 가져오지 않고 구성만 참고해요. 주제와 대본은 새로 만들어요.')); box.appendChild(dn); return;
      }
      var row = el('div', 'rf-row'), inp = el('input', 'rf-in'); inp.type = 'url'; inp.inputMode = 'url'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.id = 'rf-url'; inp.dataset.k = 'in';
      inp.placeholder = '유튜브 영상 주소를 붙여 넣으세요'; inp.value = S.url; inp.setAttribute('aria-label', '참고할 유튜브 영상 주소');
      var bad = S.url && checkUrl(S.url) === 'bad'; if (bad) { inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', 'rf-msg'); }
      row.appendChild(inp);
      var pb = el('button', 'rf-btn', '붙여넣기'); pb.type = 'button'; pb.dataset.k = 'paste';
      pb.addEventListener('click', function () { var go = function (v) { S.url = String(v || '').trim(); S.msg = ''; draw(); }; if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(go).catch(function () { inp.focus(); }); else inp.focus(); });
      row.appendChild(pb); box.appendChild(row);
      var msg = el('p', 'rf-msg', bad ? '유튜브 영상 주소만 넣을 수 있어요. (예: youtube.com/shorts/…, youtu.be/…)' : S.msg); msg.id = 'rf-msg'; msg.setAttribute('role', 'alert'); box.appendChild(msg);
      var go = el('button', 'rf-btn rf-go', '이 영상으로 분석하기'); go.type = 'button'; go.dataset.k = 'go'; go.disabled = checkUrl(S.url) !== 'ok'; box.appendChild(go); box.appendChild(el('p', 'rf-fine', '영상 내용은 가져오지 않고 구성만 참고해요.'));
      inp.addEventListener('input', function () { var was = checkUrl(S.url) === 'bad'; S.url = inp.value; S.msg = ''; var b2 = checkUrl(S.url) === 'bad'; go.disabled = checkUrl(S.url) !== 'ok'; if (was !== b2) { var p = inp.selectionStart; draw(); var n = box.querySelector('#rf-url'); if (n) { n.focus(); try { n.setSelectionRange(p, p); } catch (e) { } } } });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); start(); } });
      go.addEventListener('click', start);
      if (keep) { var back = box.querySelector('[data-k="' + keep + '"]'); if (back && back !== inp) back.focus(); }
    }
    function sync() {
      var vis = open() && formOf() === '쇼츠' && !host.classList.contains('df-hide') && (typeof opt.isPaid !== 'function' || opt.isPaid());
      if (!vis) { var was = !box.classList.contains('df-hide') || S.phase !== 'idle' || hid.value; box.classList.add('df-hide'); if (S.phase !== 'idle' || hid.value) { stop(); S.run++; S.phase = 'idle'; hid.value = ''; } if (was) ping(); return; }
      if (box.classList.contains('df-hide')) { box.classList.remove('df-hide'); draw(); }
    }
    var onChange = function () { if (!box.isConnected) { document.removeEventListener('change', onChange); return; } sync(); };
    document.addEventListener('change', onChange);
    var ticks = 0, timer = setInterval(function () { ticks++; if (!box.isConnected) { clearInterval(timer); return; } sync(); if (open() || ticks > 30) clearInterval(timer); }, 1000);
    box.__rfDraw = draw; current = { box: box, S: S }; sync();
  }
  // 지금 칸의 상태: 보이는지, 분석 중인지, 끝났는지, 올바른 주소가 들어 있는지
  function state() { var c = current; if (!c || !c.box.isConnected) return { visible: false, phase: 'idle', urlOk: false, url: '' }; return { visible: !c.box.classList.contains('df-hide'), phase: c.S.phase, urlOk: checkUrl(c.S.url) === 'ok', url: c.S.url.trim() }; }
  window.RWReference = { mount: mount, checkUrl: checkUrl, state: state };
})();
