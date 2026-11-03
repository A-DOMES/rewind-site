/* 사진·영상 카드 공용 부품 (RWMedia)
 * - "내 컴퓨터에서 고르기"(버튼·끌어다 놓기): 브라우저에서 사진을 줄인 뒤 저장소(B2)로 바로 올린다.
 *   올리기 허락(서명 주소)은 렌더 서버의 upload_api 가 로그인 확인 후 내준다. 파일은 서버를 거치지 않는다.
 * - 올린 사진은 주소(읽기 주소)로 바뀌어 일반 사진 주소 칸(.pimg-url)에 들어간다 → 신청·검사·서버 처리는 주소 방식과 똑같다.
 * - 카드 순서 바꾸기: 손잡이(⠿)를 끌거나 ▲▼ 버튼. 순서 = 화면 위에서 아래 = 장면 순서.
 * 쓰는 법: RWMedia.mount(list, host)   list = .pimg-list 요소
 *   host = { max(): 최대 개수, used(): 지금 쓰는 개수, addCard(): 새 카드(없으면 null), emptyCard(): 비어 있는 카드(없으면 null),
 *            token(): 구글 토큰, changed(): 목록이 바뀌었을 때 부르는 함수, pc: 컴퓨터에서 올리기 칸을 보일지 }
 * 한도 숫자는 아래 LIMITS 한 곳에서만 바꾼다(서버 한도는 modal_app/uploadsign.py 와 같아야 한다). */
(function () {
  'use strict';
  var API = 'https://a-domes--rewind-render-upload-api.modal.run/sign';
  var LIMITS = { longSide: 2048, quality: 0.88, maxMB: 20, batch: 30, putTries: 2, conc: 3 };
  var OK_TYPE = { 'image/jpeg': 1, 'image/png': 1, 'image/webp': 1 };
  var CSS = ''
    + '.mm-card{margin:0 0 var(--sp-3,12px)}.mm-card.mm-over{border-color:var(--accent,#e2a23c)!important;box-shadow:0 0 0 2px color-mix(in srgb,var(--accent,#e2a23c) 40%,transparent)}'
    + '.mm-card .pimg-top{margin-bottom:2px}'
    + '.mm-pick{min-height:38px;padding:0 var(--sp-3,12px);border-radius:var(--r-pill,999px);border:1px solid var(--accent,#e2a23c);background:var(--accent,#e2a23c);color:var(--on-gold,#1a1306);font:inherit;font-weight:600;font-size:.88rem;cursor:pointer}'
    + '.mm-pick:hover,.mm-pick:focus-visible{filter:brightness(1.08)}.mm-pick:disabled{opacity:.45;cursor:not-allowed}'
    + '.mm-hint{margin:0;color:var(--ink-faint);font-size:var(--fs-xs,.8rem)}'
    + '.mm-count{margin:2px 0 0;color:var(--ink-faint);font-size:var(--fs-xs,.8rem)}'
    + '.mm-how{margin:0 0 var(--sp-3,12px)}'
    + '.mm-msg{margin:0 0 var(--sp-3,12px);font-size:var(--fs-sm,.88rem);color:var(--err,#d4663f)}.mm-msg:empty{display:none}'
    + '.pimg-card[data-src="pc"] .pimg-url,.pimg-card[data-src="pc"] .pm-type,.pimg-card[data-src="pc"] .pm-range{display:none}'
    + '.pimg-name{display:block;font-size:.9rem;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.mm-bar2{height:6px;border-radius:99px;background:var(--line);overflow:hidden;margin-top:8px}.mm-bar2>i{display:block;height:100%;width:0;background:var(--accent,#e2a23c);transition:width .15s}'
    + '.pimg-card[data-up="ok"] .mm-bar2{display:none}'
    + '.mm-retry{margin-top:6px;min-height:36px;padding:0 12px;border-radius:var(--r-md,10px);border:1px solid var(--err,#d4663f);background:none;color:var(--err,#d4663f);font:inherit;cursor:pointer}'
    + '.pimg-mv{display:inline-flex;align-items:center;gap:2px;margin-left:auto}.pimg-mv[hidden]{display:none}'
    + '.pimg-mv button{border:0;background:transparent;color:var(--ink-faint);cursor:pointer;min-width:30px;min-height:30px;border-radius:6px;font-size:.8rem;line-height:1}'
    + '.pimg-mv button:hover,.pimg-mv button:focus-visible{color:var(--ink);background:color-mix(in srgb,var(--accent,#e2a23c) 14%,transparent)}'
    + '.pimg-grip{cursor:grab;touch-action:none;font-size:1rem!important}'
    + '.pimg-list:not(.mm-on) .pimg-mv{display:none}.pimg-card.mm-drag{opacity:.85;outline:2px solid var(--accent,#e2a23c);position:relative;z-index:2}';
  var cssDone = false;
  function injectCss() { if (cssDone) return; cssDone = true; var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function fkey(f) { return f.name + '|' + f.size + '|' + f.lastModified; }

  // ---------- 사진 줄이기: 긴 변 2048px, JPG. 휴대폰 원본(5MB↑)이 1~2MB 로 줄어 올리기도 제작도 빨라진다 ----------
  function toBlob(canvas) { return new Promise(function (ok) { canvas.toBlob(ok, 'image/jpeg', LIMITS.quality); }); }
  function openImage(file) {
    if (typeof createImageBitmap === 'function') {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (ok, no) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); ok(im); };
      im.onerror = function () { URL.revokeObjectURL(u); no(new Error('open')); };
      im.src = u;
    });
  }
  function shrink(file) {
    return openImage(file).then(function (im) {
      var w0 = im.width || im.naturalWidth, h0 = im.height || im.naturalHeight;
      if (!w0 || !h0) throw new Error('size');
      var k = Math.min(1, LIMITS.longSide / Math.max(w0, h0)), w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(im, 0, 0, w, h);
      if (im.close) im.close();
      return toBlob(c);
    }).then(function (b) {
      if (!b || !b.size) throw new Error('blob');
      if (b.size > LIMITS.maxMB * 1024 * 1024) throw new Error('big');
      return b;
    });
  }

  // ---------- 서명 주소 받기 / 올리기 ----------
  function sign(host, items) {   // items = [{name, size}] → Promise<[{putUrl, readUrl, contentType}]>
    var token = host.token();
    if (!token) return Promise.reject(new Error('로그인이 필요해요. 로그인한 뒤 다시 올려 주세요.'));
    var ac = typeof AbortController === 'function' ? new AbortController() : null, tm = ac ? setTimeout(function () { ac.abort(); }, 20000) : 0;
    return fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac ? ac.signal : undefined,
      body: JSON.stringify({ idToken: token, files: items.map(function (x) { return { name: x.name, type: 'image/jpeg', size: x.size }; }) })
    }).then(function (r) { clearTimeout(tm); return r.json().catch(function () { return null; }).then(function (d) { return { ok: r.ok, d: d }; }); },
      function () { clearTimeout(tm); throw new Error('연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.'); })
      .then(function (r) {
        if (r.ok && r.d && r.d.ok && r.d.files && r.d.files.length === items.length) return r.d.files;
        throw new Error((r.d && r.d.오류) || '올리기 준비에 실패했어요. 잠시 뒤 다시 시도해 주세요.');
      });
  }
  function put(card, item, blob) {   // Promise: 올리기 성공
    return new Promise(function (ok, no) {
      var x = new XMLHttpRequest(), bar = card.querySelector('.mm-bar2>i');
      x.open('PUT', item.putUrl);
      x.setRequestHeader('Content-Type', item.contentType || 'image/jpeg');
      x.upload.onprogress = function (e) { if (e.lengthComputable && bar) bar.style.width = Math.round(e.loaded / e.total * 100) + '%'; };
      x.onload = function () { x.status >= 200 && x.status < 300 ? ok() : no(new Error('http ' + x.status)); };
      x.onerror = function () { no(new Error('network')); };
      x.ontimeout = function () { no(new Error('timeout')); };
      x.timeout = 120000;
      x.send(blob);
    });
  }

  function mount(list, host) {
    if (!list || list.__mmMounted) return; list.__mmMounted = true;
    injectCss();
    var pcOn = !!host.pc;
    var ICO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V5"/><path d="M7.5 9.5L12 5l4.5 4.5"/><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"/></svg>';
    // 주소 카드(사진·영상 1)와 같은 명함카드 모양. 안내 글은 접어 두어 화면이 빽빽하지 않게 한다
    var bar = pcOn ? el('<div class="pimg-card mm-card"><span class="pimg-th">' + ICO + '</span><div class="pimg-body"><div class="pimg-top"><b>내 컴퓨터에서 올리기</b><button type="button" class="mm-pick">사진 고르기</button></div><p class="mm-hint">사진을 여기로 끌어다 놓아도 돼요</p><p class="mm-count" aria-live="polite"></p><input type="file" class="mm-file" multiple accept="image/jpeg,image/png,image/webp" hidden></div></div>') : null;
    var note = !pcOn ? null : el('<details class="pd-how mm-how"><summary>내 컴퓨터에서 올릴 때 알아 두세요</summary><ul><li>JPG·PNG·WEBP 사진만 올릴 수 있어요. 영상은 구글 드라이브 주소로 넣어 주세요.</li><li>올린 사진은 영상 제작에만 쓰고, 제작이 끝나면 지워요.</li><li>올리는 사진은 본인 것이어야 하고, 책임은 올린 분에게 있어요.</li></ul></details>');
    var msg = !pcOn ? null : el('<p class="mm-msg" role="status"></p>');
    var say = function (t) { if (msg) msg.textContent = t || ''; };
    if (pcOn) {
      list.parentNode.insertBefore(bar, list); list.parentNode.insertBefore(msg, list); list.parentNode.insertBefore(note, list);
      var drive = list.parentNode.querySelector('.pd-how:not(.mm-how)'); if (drive) list.parentNode.insertBefore(drive, list);   // '드라이브로 올리는 방법'은 주소 카드 바로 위로(컴퓨터 올리기 → 주소 순서)
      var file = bar.querySelector('.mm-file'), pick = bar.querySelector('.mm-pick');
      pick.addEventListener('click', function () { file.click(); });
      file.addEventListener('change', function () { take(Array.prototype.slice.call(file.files)); file.value = ''; });
      ['dragenter', 'dragover'].forEach(function (n) { bar.addEventListener(n, function (e) { e.preventDefault(); bar.classList.add('mm-over'); }); });
      ['dragleave', 'drop'].forEach(function (n) { bar.addEventListener(n, function (e) { e.preventDefault(); bar.classList.remove('mm-over'); }); });
      bar.addEventListener('drop', function (e) { take(Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || [])); });
    }

    function seen() {   // 이미 올렸거나 올리는 중인 파일 (같은 파일을 두 번 넣지 않는다)
      var s = {}; list.querySelectorAll('.pimg-card[data-fk]').forEach(function (c) { s[c.dataset.fk] = 1; }); return s;
    }
    function take(files) {
      say('');
      if (!files.length) return;
      var room = host.max() - host.used(), sk = { video: 0, type: 0, dup: 0, full: 0 }, have = seen(), ok = [];
      files.forEach(function (f) {
        if (/^video\//.test(f.type) || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(f.name)) { sk.video++; return; }
        if (!OK_TYPE[f.type]) { sk.type++; return; }
        var k = fkey(f); if (have[k]) { sk.dup++; return; } have[k] = 1;
        if (ok.length >= room) { sk.full++; return; }
        ok.push(f);
      });
      var t = [];
      if (sk.video) t.push('영상은 컴퓨터에서 올릴 수 없어요. 영상은 구글 드라이브 주소로 넣어 주세요.');
      if (sk.type) t.push('JPG·PNG·WEBP 사진만 올릴 수 있어요 (' + sk.type + '개 건너뜀).');
      if (sk.dup) t.push('이미 넣은 사진 ' + sk.dup + '장은 건너뛰었어요.');
      if (sk.full) t.push('최대 ' + host.max() + '개까지라 ' + sk.full + '장은 넣지 못했어요.');
      say(t.join(' '));
      if (!ok.length) return;
      var cards = ok.map(function (f) {
        var c = host.emptyCard() || host.addCard(); if (!c) return null;
        c.dataset.src = 'pc'; c.dataset.up = 'busy'; c.dataset.fk = fkey(f); c.dataset.type = 'image';
        var body = c.querySelector('.pimg-body');
        if (!body.querySelector('.pimg-name')) body.insertBefore(el('<span class="pimg-name"></span>'), c.querySelector('.pimg-url'));
        body.querySelector('.pimg-name').textContent = f.name;
        if (!body.querySelector('.mm-bar2')) body.insertBefore(el('<div class="mm-bar2" aria-hidden="true"><i></i></div>'), c.querySelector('.pimg-state'));
        c.querySelector('.mm-bar2>i').style.width = '0';
        var st = c.querySelector('.pimg-state'); st.className = 'pimg-state'; st.textContent = '사진 준비 중…';
        var old = c.querySelector('.mm-retry'); if (old) old.remove();
        c.__mm = { file: f, blob: null };
        return c;
      }).filter(Boolean);
      host.changed();
      run(cards);
    }
    function fail(c, text) {
      c.dataset.up = 'fail';
      var st = c.querySelector('.pimg-state'); st.className = 'pimg-state bad'; st.textContent = text;
      if (!c.querySelector('.mm-retry')) { var b = el('<button type="button" class="mm-retry">다시 시도</button>'); st.parentNode.insertBefore(b, st.nextSibling); }
      host.changed();
    }
    function run(cards) {   // 줄이기 → 서명 → 올리기. 한 번에 여러 장이어도 서명은 묶어서 한 번만 받는다
      var jobs = cards.map(function (c) {
        var m = c.__mm;
        var p = m.blob ? Promise.resolve(m.blob) : shrink(m.file).then(function (b) {
          m.blob = b;
          if (m.url) URL.revokeObjectURL(m.url);
          m.url = URL.createObjectURL(b);
          var th = c.querySelector('.pimg-th'); th.innerHTML = ''; var im = new Image(); im.alt = ''; im.src = m.url; th.appendChild(im);
          return b;
        });
        return p.then(function () { return true; }, function () { fail(c, '이 사진은 열 수 없어요. 다른 사진으로 바꿔 주세요.'); return false; });
      });
      Promise.all(jobs).then(function (oks) {
        var live = cards.filter(function (c, i) { return oks[i] && c.isConnected; });
        var chunks = []; for (var i = 0; i < live.length; i += LIMITS.batch) chunks.push(live.slice(i, i + LIMITS.batch));
        return chunks.reduce(function (pr, ch) { return pr.then(function () { return upload(ch); }); }, Promise.resolve());
      });
    }
    function upload(cards) {
      cards.forEach(function (c) { c.querySelector('.pimg-state').textContent = '올리는 중…'; });
      return sign(host, cards.map(function (c) { return { name: c.__mm.file.name, size: c.__mm.blob.size }; })).then(function (items) {
        var q = cards.map(function (c, i) { return { c: c, it: items[i] }; }), run1 = function () {
          var n = q.shift(); if (!n) return Promise.resolve();
          return one(n.c, n.it).then(run1);
        };
        var w = []; for (var k = 0; k < Math.min(LIMITS.conc, q.length); k++) w.push(run1());
        return Promise.all(w);
      }, function (e) { cards.forEach(function (c) { if (c.isConnected) fail(c, e.message || '올리기에 실패했어요.'); }); });
    }
    function one(c, it, tries) {
      tries = tries || 1;
      if (!c.isConnected) return Promise.resolve();
      return put(c, it, c.__mm.blob).then(function () {
        if (!c.isConnected) return;
        var inp = c.querySelector('.pimg-url'); inp.value = it.readUrl;
        c.dataset.up = 'ok'; c.__mm.blob = null;
        var st = c.querySelector('.pimg-state'); st.className = 'pimg-state'; st.textContent = '올렸어요';
        inp.dispatchEvent(new Event('input', { bubbles: true }));   // 사진 주소 칸과 같은 길로 미리보기·확인 칸이 따라온다
        host.changed();
      }, function (err) {
        if (tries < LIMITS.putTries) return one(c, it, tries + 1);
        var why = String((err && err.message) || ''); try { console.warn('[올리기 실패]', why); } catch (x) {}
        // 'network' = 브라우저가 저장소 답을 받지 못함(저장소가 이 사이트를 허용하지 않을 때도 이렇게 보인다), 'http 403' = 서명 주소가 맞지 않음
        fail(c, why === 'network' ? '올리지 못했어요. 인터넷을 확인하고 다시 시도해 주세요. 계속 안 되면 저장소 설정 문제일 수 있어요. (오류: 연결 거부)' : why.indexOf('http ') === 0 ? '올리지 못했어요. 저장소가 파일을 받지 않았어요. (오류: ' + why.slice(5) + ')' : '올리지 못했어요. 인터넷을 확인하고 다시 시도해 주세요.');
      });
    }
    list.addEventListener('click', function (e) {
      var rt = e.target.closest('.mm-retry'); if (rt) { var c = rt.closest('.pimg-card'); rt.remove(); c.dataset.up = 'busy'; c.querySelector('.pimg-state').textContent = '다시 올리는 중…'; c.querySelector('.mm-bar2>i').style.width = '0'; host.changed(); run([c]); return; }
      var up = e.target.closest('.pimg-up'), dn = e.target.closest('.pimg-dn');
      if (up || dn) {
        var cd = (up || dn).closest('.pimg-card'), sib = up ? cd.previousElementSibling : cd.nextElementSibling;
        if (sib && sib.classList.contains('pimg-card')) { up ? list.insertBefore(cd, sib) : list.insertBefore(sib, cd); host.changed(); (up || dn).focus(); }
      }
    });
    // 손잡이를 끌어서 순서 바꾸기 (마우스·터치 공용)
    list.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('.pimg-grip'); if (!g) return;
      var card = g.closest('.pimg-card'); e.preventDefault();
      card.classList.add('mm-drag');
      // 카드를 옮기면 손잡이도 문서에서 떼었다 붙여지므로, 움직임은 손잡이가 아니라 문서 전체에서 듣는다
      var move = function (ev) {
        var cards = Array.prototype.filter.call(list.children, function (n) { return n.classList.contains('pimg-card') && n !== card; });
        var ref = null;
        for (var i = 0; i < cards.length; i++) { var r = cards[i].getBoundingClientRect(); if (ev.clientY < r.top + r.height / 2) { ref = cards[i]; break; } }
        var target = ref || list.querySelector('.pimg-add') || null;
        if (target !== card.nextElementSibling) list.insertBefore(card, target);
      };
      var end = function () {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end);
        card.classList.remove('mm-drag'); host.changed();
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    });
    list.__mm = { changed: function () { host.changed(); }, setCount: function (t) { if (bar) bar.querySelector('.mm-count').textContent = t; }, release: function (c) { if (c.__mm && c.__mm.url) URL.revokeObjectURL(c.__mm.url); } };
  }

  window.RWMedia = { mount: mount };
})();
