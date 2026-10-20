/* 참고 구조 고르기 (6-3): 쇼츠 만들기 폼 안에 '마음에 드는 구성'을 고르는 카드를 보여 준다.
 * 하는 일: 서버(order-structures)에서 목록을 받아 추천 3개 + 전체 보기로 그린다. 고른 번호는 #df-structureId 에만 담는다.
 * 실제 화면구성·자막위치 같은 값은 이 화면이 모른다(서버가 번호로 찾아 적용 — 6-6 전까지는 신청에 반영되지 않는다).
 * 보이는 조건: 시트 `기능공개`의 `참고영상` 줄이 열려 있고(RWFlags.has) 만드는 모양이 쇼츠일 때. */
(function () {
  var URL_ = 'https://bald-buffalo.pikapod.net/webhook/order-structures';
  var CSS = '.sc-box{margin-top:var(--sp-4);padding-top:var(--sp-4);border-top:1px solid var(--line)}'
    + '.sc-head{display:flex;align-items:center;gap:var(--sp-2);flex-wrap:wrap}.sc-head h4{margin:0;font-size:var(--fs-base);font-weight:600}'
    + '.sc-tag{font-size:var(--fs-2xs);color:var(--ink-dim);border:1px solid var(--line);border-radius:var(--r-pill);padding:2px 8px}'
    + '.sc-hint{margin:var(--sp-1) 0 var(--sp-3);color:var(--ink-dim);font-size:var(--fs-sm)}'
    + '.sc-list{display:grid;gap:var(--sp-2)}'
    + '.sc-card{display:block;width:100%;text-align:left;background:var(--bg-input);color:var(--ink);border:1px solid var(--line);border-radius:var(--r-md);padding:var(--sp-3) var(--sp-4);min-height:48px;cursor:pointer;font:inherit}'
    + '.sc-card[aria-pressed="true"]{border-color:var(--accent);background:var(--accent-soft)}'
    + '.sc-card b{display:block;font-weight:600}.sc-card span{display:block;color:var(--ink-dim);font-size:var(--fs-sm)}'
    + '.sc-card em{font-style:normal;color:var(--ink-faint);font-size:var(--fs-xs)}'
    + '.sc-more{margin-top:var(--sp-2)}.sc-price{margin:var(--sp-3) 0 0;color:var(--ink-dim);font-size:var(--fs-sm)}'
    + '.sc-note{margin:var(--sp-2) 0 0;color:var(--err);font-size:var(--fs-xs)}';
  var CACHE = {};   // 폼이 다시 그려져도 같은 목록을 다시 요청하지 않는다(쇼츠/롱폼별)
  var el = function (tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };   // 글자는 항상 textContent 로 넣는다(서버 글을 HTML 로 읽지 않음)
  function mount(opt) {
    var host = opt && opt.host; if (!host || host.querySelector('.sc-box')) return;
    if (!document.getElementById('sc-style')) { var st = el('style'); st.id = 'sc-style'; st.textContent = CSS; document.head.appendChild(st); }
    var box = el('div', 'sc-box df-hide'), hid = el('input'); hid.type = 'hidden'; hid.id = 'df-structureId'; box.appendChild(hid);
    host.appendChild(box);
    var loadedFor = null, loading = false, data = null, showAll = false, focusKey = null;
    var formOf = function () { var f = document.getElementById('df-form'); return f && f.value === '롱폼' ? '롱폼' : '쇼츠'; };
    var open = function () { return !!(window.RWFlags && window.RWFlags.has && window.RWFlags.has('참고영상')); };
    function choose(id) { hid.value = id || ''; draw(); host.dispatchEvent(new CustomEvent('structurechange', { bubbles: true, detail: { id: hid.value } })); }
    function draw() {
      box.textContent = ''; box.appendChild(hid);
      if (!data || !data.목록 || !data.목록.length) { box.classList.add('df-hide'); return; }
      box.classList.remove('df-hide'); box.setAttribute('role', 'group'); box.setAttribute('aria-label', '참고 구조 고르기');
      var head = el('div', 'sc-head'); head.appendChild(el('h4', '', '참고 구조 고르기 (선택)'));
      if (data.공개 === false) head.appendChild(el('span', 'sc-tag', '관리자 미리보기'));
      box.appendChild(head);
      box.appendChild(el('p', 'sc-hint', '마음에 드는 구성을 고르면 비슷한 구성으로 만들어요. 고르지 않으면 지금처럼 자동으로 정해요.'));
      var list = el('div', 'sc-list');
      var card = function (x) {
        var b = el('button', 'sc-card'); b.type = 'button'; b.dataset.k = 'c' + x.번호; b.setAttribute('aria-pressed', hid.value === String(x.번호) ? 'true' : 'false');
        b.appendChild(el('b', '', x.이름)); if (x.설명) b.appendChild(el('span', '', x.설명));
        if (x.움직임추천) b.appendChild(el('em', '', '추천 방식: ' + x.움직임추천));
        b.addEventListener('click', function () { focusKey = 'c' + x.번호; choose(hid.value === String(x.번호) ? '' : String(x.번호)); });   // 같은 카드를 다시 누르면 선택 해제
        return b;
      };
      data.목록.filter(function (x) { return x.추천 || showAll; }).forEach(function (x) { list.appendChild(card(x)); });
      box.appendChild(list);
      var rest = data.목록.filter(function (x) { return !x.추천; }).length;
      if (rest > 0) { var more = el('button', 'btn-line-sm sc-more', showAll ? '추천만 보기' : '전체 보기 (' + data.목록.length + ')'); more.type = 'button'; more.dataset.k = 'more'; more.addEventListener('click', function () { focusKey = 'more'; showAll = !showAll; draw(); }); box.appendChild(more); }
      var amt = document.getElementById('df-price-amt'); var txt = amt ? amt.textContent.replace(/\s+/g, ' ').trim() : '';
      if (txt && txt !== '-') box.appendChild(el('p', 'sc-price', '현재 선택 기준 요금: ' + txt));
      if (data.공개 === false) box.appendChild(el('p', 'sc-note', '아직 신청에는 반영되지 않아요(준비 중).'));
      if (focusKey) { var back = box.querySelector('[data-k="' + focusKey + '"]'); if (back) back.focus(); focusKey = null; }   // 다시 그린 뒤에도 키보드 위치를 지킨다
    }
    async function load() {
      var form = formOf(); if (loading || loadedFor === form) return; if (CACHE[form]) { data = CACHE[form]; loadedFor = form; draw(); return; } loading = true;
      try {
        var tok = typeof opt.getToken === 'function' ? opt.getToken() : '';
        var res = await fetch(URL_, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: tok, form: form }) });
        var d = await res.json().catch(function () { return null; });
        data = (res.ok && d && d.ok === true && Array.isArray(d.목록)) ? d : null; if (data) { loadedFor = form; CACHE[form] = data; } else choose('');   // 실패하면 기록하지 않아 다음 확인 때 다시 시도
      } catch (e) { data = null; }
      loading = false; sync();   // 기다리는 사이 모양이 바뀌었을 수 있어 그리기 전에 다시 판단
    }
    function sync() {
      var form = formOf();
      if (!open() || form !== '쇼츠' || host.classList.contains('df-hide')) { box.classList.add('df-hide'); if (hid.value) hid.value = ''; return; }   // 닫히거나 쇼츠가 아니면 숨기고 고른 것도 지운다
      if (loadedFor !== form) load(); else draw();
    }
    var f = document.getElementById('df-form'); if (f) f.addEventListener('change', sync);
    var onChange = function () { if (!box.isConnected) { document.removeEventListener('change', onChange); document.removeEventListener('input', onInput); document.removeEventListener('click', onClick); return; } sync(); };
    document.addEventListener('change', onChange);   // 만드는 종류(일반/상품쇼츠…)를 바꿀 때도 다시 판단
    var onInput = function () { if (!box.isConnected) return; var p = box.querySelector('.sc-price'), amt = document.getElementById('df-price-amt'); if (p && amt) p.textContent = '현재 선택 기준 요금: ' + amt.textContent.replace(/\s+/g, ' ').trim(); };   // 요금이 바뀌면 그 줄만 갱신
    var onClick = function (e) { if (!box.isConnected) { document.removeEventListener('click', onClick); return; } if (e.target && e.target.closest && e.target.closest('#df-fields')) setTimeout(onInput, 0); };
    document.addEventListener('input', onInput); document.addEventListener('click', onClick);
    var ticks = 0, timer = setInterval(function () { ticks++; if (!box.isConnected) { clearInterval(timer); return; } sync(); if (open() || ticks > 30) clearInterval(timer); }, 1000);   // 기능 목록은 늦게 도착할 수 있어 잠깐 기다린다
    sync();
  }
  window.RWStructure = { mount: mount };
})();
