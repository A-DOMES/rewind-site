/* 관리자 > 주제 찾기 > 분류 관리 — 상품 분류의 사용 스위치·제한 표시·새 분류 추가.
   서버(관리자_상품분류_조회/저장)가 모든 규칙을 다시 검사하므로 여기는 보여 주고 값을 보내기만 한다.
   사용: AdminCategories.mount(box, { getUrl, saveUrl, post, token, toast, onExpired, onForbidden, onSaved })  */
(function () {
  var NAME_RE = /^[0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ·&][0-9A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ·&\- ]{0,19}$/;
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var key = function (s) { return String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase(); };
  // 서버(관리자_상품분류_저장)와 같은 기준: 글자가 하나는 있어야 하고 TRUE·FALSE 는 안 됨
  var nameOk = function (s) { return NAME_RE.test(s) && /[A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]/.test(s) && !/^(true|false)$/i.test(s) && s !== '해당없음'; };
  var label = function (c) { return (c.use ? '사용 중' : '사용 안 함') + ' · ' + (c.lim ? '제한' : '일반'); };

  function mount(box, ctx) {
    var S = { items: null, err: false, draft: {}, adds: [], max: 60, confirm: false, saving: false, open: false };
    var d = el('details', 'ac'); box.appendChild(d);
    d.addEventListener('toggle', function () { S.open = d.open; });

    function cur(c) { return S.draft[c.name] || { use: c.use, lim: c.lim }; }
    function changedItems() { return S.items.filter(function (c) { var x = cur(c); return x.use !== c.use || x.lim !== c.lim; }); }
    function pendingCount() { return changedItems().length + S.adds.length; }
    function limitedOff() { return changedItems().filter(function (c) { return c.lim && !cur(c).lim; }); }

    async function load() {
      S.err = false;
      try {
        var r = await ctx.post(ctx.getUrl, { idToken: ctx.token() });
        if (r.status === 401) { ctx.onExpired(); return; }
        if (r.status === 403) { ctx.onForbidden(); return; }
        if (r.status === 200 && r.data && r.data.ok === true && Array.isArray(r.data.cats)) { S.items = r.data.cats; S.max = r.data.max || 60; S.draft = {}; S.adds = []; S.confirm = false; } else S.err = true;
      } catch (e) { S.err = true; }
      draw();
    }

    // 단추를 눌러 화면을 다시 그린 뒤에도 같은 자리에 키보드 초점이 남도록 fk(자리 이름)를 기억한다
    function sw(text, on, cls, onClick, disabled, aria, fk) {
      var b = el('button', 'ac-sw' + (cls ? ' ' + cls : ''), text); b.type = 'button'; b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', on ? 'true' : 'false');
      if (aria) b.setAttribute('aria-label', aria); if (fk) b.setAttribute('data-fk', fk);
      b.disabled = !!disabled; b.addEventListener('click', function () { if (fk) S.focus = fk; onClick(); }); return b;
    }
    function refocus() { if (!S.focus) return; var f = d.querySelector('[data-fk="' + (window.CSS && CSS.escape ? CSS.escape(S.focus) : S.focus.replace(/["\\]/g, '')) + '"]'); S.focus = null; if (f && !f.disabled) f.focus(); }

    function draw() {
      var keep = d.open || S.open; d.innerHTML = ''; d.open = keep;
      var sm = el('summary'); sm.appendChild(el('span', 'ac-title', '분류 관리'));
      if (S.items) {
        var off = S.items.filter(function (c) { return !c.use; }).length, lim = S.items.filter(function (c) { return c.lim; }).length;
        sm.appendChild(el('span', 'ac-sum', S.items.length + '개 · 사용 안 함 ' + off + ' · 제한 ' + lim));
        if (pendingCount()) sm.appendChild(el('span', 'ac-pend', pendingCount() + '건 바뀜'));
      }
      d.appendChild(sm);
      var body = el('div', 'ac-body'); d.appendChild(body);
      if (S.err) { body.appendChild(el('p', 'ac-state', '분류 목록을 불러오지 못했어요.')); var rb = el('button', 'btn ghost', '다시 불러오기'); rb.type = 'button'; rb.addEventListener('click', function () { S.items = null; draw(); load(); }); body.appendChild(rb); return; }
      if (!S.items) { body.appendChild(el('p', 'ac-state', '불러오는 중이에요…')); return; }
      body.appendChild(el('p', 'ac-help', '사용을 끄면 그 분류의 상품이 고객의 주제 찾기·상품 캘린더에서 빠져요. 제한은 고객에게 숨기는 분류예요(화장품·건강기능식품·의료기기·주류 등 직접 대본이 필요하거나 광고 규제가 큰 것). 바꾼 내용은 [적용]을 눌러야 저장되고, 고객 사이트에는 최대 10분 뒤에 반영돼요.'));

      var list = el('div', 'ac-list'); body.appendChild(list);
      var hd = el('div', 'ac-row head'); hd.appendChild(el('span', '', '분류')); hd.appendChild(el('span', '', '사용')); hd.appendChild(el('span', '', '제한(고객에게 숨김)')); list.appendChild(hd);
      S.items.forEach(function (c) {
        var x = cur(c), ch = x.use !== c.use || x.lim !== c.lim;
        var row = el('div', 'ac-row' + (ch ? ' changed' : '') + (x.use ? '' : ' off'));
        var nm = el('div', 'ac-name'); nm.appendChild(el('span', '', c.name));
        (c.warn || []).forEach(function (w) { nm.appendChild(el('span', 'ac-warn', w)); });
        row.appendChild(nm);
        row.appendChild(sw(x.use ? '사용' : '안 함', x.use, '', function () { S.draft[c.name] = { use: !x.use, lim: x.lim }; S.confirm = false; draw(); }, S.saving, c.name + ' 사용', 'u:' + c.name));
        row.appendChild(sw(x.lim ? '제한' : '일반', x.lim, 'lim', function () { S.draft[c.name] = { use: x.use, lim: !x.lim }; S.confirm = false; draw(); }, S.saving, c.name + ' 제한(고객에게 숨김)', 'l:' + c.name));
        list.appendChild(row);
      });
      S.adds.forEach(function (a, i) {
        var row = el('div', 'ac-row changed'); var nm = el('div', 'ac-name'); nm.appendChild(el('span', '', a.name)); nm.appendChild(el('span', 'ac-tag new', '새 분류'));
        var rm = el('button', 'ac-x', '×'); rm.type = 'button'; rm.setAttribute('aria-label', a.name + ' 추가 취소'); rm.addEventListener('click', function () { S.adds.splice(i, 1); S.confirm = false; draw(); }); nm.appendChild(rm);
        row.appendChild(nm); row.appendChild(el('span', '', '사용'));
        row.appendChild(sw(a.lim ? '제한' : '일반', a.lim, 'lim', function () { a.lim = !a.lim; S.confirm = false; draw(); }, S.saving, a.name + ' 제한(고객에게 숨김)', 'a:' + a.name));
        list.appendChild(row);
      });

      // 분류 추가
      var add = el('form', 'ac-add'); add.setAttribute('aria-label', '새 분류 추가');
      var inp = el('input'); inp.type = 'text'; inp.maxLength = 20; inp.placeholder = '새 분류 이름 (예: 의료기기)'; inp.setAttribute('aria-label', '새 분류 이름'); inp.autocomplete = 'off';
      var lb = el('label'); var chk = el('input'); chk.type = 'checkbox'; lb.appendChild(chk); lb.appendChild(document.createTextNode('제한 분류(고객에게 숨김)'));
      var ab = el('button', 'btn ghost', '목록에 추가'); ab.type = 'submit';
      add.appendChild(inp); add.appendChild(lb); add.appendChild(ab); body.appendChild(add);
      add.addEventListener('submit', function (e) {
        e.preventDefault(); var name = inp.value.normalize('NFC').replace(/\s+/g, ' ').trim();
        if (!name) return;
        if (!nameOk(name)) { ctx.toast('분류 이름은 한글·영문·숫자·공백·· & - 만, 글자가 하나는 있어야 하고 20자까지예요.', true); return; }
        if (S.items.some(function (c) { return key(c.name) === key(name); }) || S.adds.some(function (a) { return key(a.name) === key(name); })) { ctx.toast('이미 있는 분류예요.', true); return; }
        if (S.items.length + S.adds.length >= S.max) { ctx.toast('분류는 ' + S.max + '개까지예요.', true); return; }
        S.adds.push({ name: name, lim: chk.checked }); S.confirm = false; draw();
        var again = d.querySelector('.ac-add input[type="text"]'); if (again) again.focus();
      });

      // 적용
      var n = pendingCount();
      if (S.confirm && n) {
        var cf = el('div', 'ac-confirm'); cf.setAttribute('role', 'group'); cf.setAttribute('aria-label', '변경 확인');
        var ul = el('ul'); changedItems().forEach(function (c) { ul.appendChild(el('li', '', c.name + ': ' + label(c) + ' → ' + label(cur(c)))); });
        S.adds.forEach(function (a) { ul.appendChild(el('li', '', a.name + ': 새 분류 (' + (a.lim ? '제한' : '일반') + ')')); });
        cf.appendChild(ul);
        var lo = limitedOff(), okChk = null;
        if (lo.length) { var l2 = el('label'); okChk = el('input'); okChk.type = 'checkbox'; l2.appendChild(okChk); l2.appendChild(document.createTextNode('제한을 풀면 ' + lo.map(function (c) { return c.name; }).join('·') + ' 분류가 고객에게 보여요. 확인했어요.')); cf.appendChild(l2); }
        var fo = el('div', 'ac-foot'); var no = el('button', 'btn ghost', '취소'); no.type = 'button'; no.setAttribute('data-fk', 'cancel'); no.addEventListener('click', function () { S.confirm = false; S.focus = 'apply'; draw(); });
        var yes = el('button', 'btn', S.saving ? '저장 중…' : '확인하고 적용'); yes.type = 'button'; yes.disabled = S.saving; yes.addEventListener('click', function () { if (okChk && !okChk.checked) { ctx.toast('제한을 풀려면 확인 칸을 체크해 주세요.', true); return; } save(!!okChk); });
        fo.appendChild(no); fo.appendChild(yes); cf.appendChild(fo); body.appendChild(cf);
      } else {
        var ft = el('div', 'ac-foot'); var undo = el('button', 'btn ghost', '되돌리기'); undo.type = 'button'; undo.disabled = !n || S.saving; undo.addEventListener('click', function () { S.draft = {}; S.adds = []; S.confirm = false; draw(); });
        var ap = el('button', 'btn', n ? '적용 (' + n + '건)' : '적용'); ap.type = 'button'; ap.setAttribute('data-fk', 'apply'); ap.disabled = !n || S.saving; ap.addEventListener('click', function () { S.confirm = true; S.focus = 'cancel'; draw(); });
        ft.appendChild(undo); ft.appendChild(ap); body.appendChild(ft);
      }
      refocus();
    }

    // 값 변경과 새 분류 추가는 서버에서 쓰는 길이 달라 따로 보낸다(값 변경 먼저). 중간에 실패하면 거기서 멈추고 목록을 새로 불러온다
    async function send(changes) {
      var r = await ctx.post(ctx.saveUrl, { idToken: ctx.token(), changes: changes });
      if (r.status === 401) { ctx.toast('로그인이 만료됐어요. 다시 로그인해 주세요.', true); ctx.onExpired(); return { stop: true, fatal: true }; }
      if (r.status === 403) { ctx.toast('관리자 권한이 없어요.', true); ctx.onForbidden(); return { stop: true, fatal: true }; }
      if (r.status === 400 && r.data && Array.isArray(r.data.errors)) { ctx.toast(r.data.errors.join(' / '), true); return { stop: true, stale: !!r.data.stale }; }
      if (r.status !== 200 || !r.data || r.data.ok !== true) { ctx.toast('저장 결과를 확인하지 못했어요. 목록을 다시 불러올게요.', true); return { stop: true, stale: true }; }
      return { ok: true, data: r.data };
    }
    async function save(confirmLimitOff) {
      if (S.saving) return;
      var sets = changedItems().map(function (c) { var x = cur(c); return { op: 'set', name: c.name, use: x.use, lim: x.lim, base: { use: c.use, lim: c.lim }, confirmLimitOff: confirmLimitOff === true }; });
      var adds = S.adds.map(function (a) { return { op: 'add', name: a.name, lim: a.lim }; });
      var groups = [sets, adds].filter(function (g) { return g.length; });
      if (!groups.length) return;
      S.saving = true; draw();
      var done = [], res = null;
      try {
        for (var k = 0; k < groups.length; k++) {
          res = await send(groups[k]);
          if (res.stop) break;
          done = done.concat(res.data.changed || []);
        }
      } catch (e) { res = { stop: true, stale: true }; ctx.toast('저장 결과를 확인하지 못했어요. 목록을 다시 불러올게요.', true); }
      if (res && res.fatal) { S.saving = false; return; }
      if (done.length && ctx.onSaved) ctx.onSaved(done);
      if (res && res.stop) { S.saving = false; S.confirm = false; if (res.stale || done.length) { S.items = null; draw(); load(); } else draw(); return; }
      ctx.toast(res.data.note || '저장했어요.');
      S.saving = false; S.items = null; S.focus = 'apply'; draw(); load();
    }

    draw(); load();
    return { reload: function () { S.items = null; draw(); load(); } };
  }
  window.AdminCategories = { mount: mount };
})();
