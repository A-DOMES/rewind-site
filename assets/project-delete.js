/* 프로젝트 삭제: 확인 창 + 서버 호출 (내 프로젝트 목록, 프로젝트 화면에서 같이 쓴다) */
(function () {
  const URL_DELETE = 'https://bald-buffalo.pikapod.net/webhook/project-delete';
  // 서버가 시트를 잡고 도는 단계: 이 동안은 삭제할 수 없다 (서버에서도 한 번 더 막는다)
  const 만드는중 = ['기획', '장면구성대기', '장면구성중', '검수완료', '제작 중', '분석중'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function 스타일() {
    if (document.getElementById('rwdel-style')) return;
    const st = document.createElement('style'); st.id = 'rwdel-style';
    st.textContent = `
      .rwdel-ov { position: fixed; inset: 0; z-index: 400; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(0,0,0,.55); }
      .rwdel-ov, .rwdel-ov * { box-sizing: border-box; }
      .rwdel-box { width: min(420px, 100%); background: var(--bg-raised, #fff); color: var(--ink, #222); border: 1px solid var(--line, #ddd); border-radius: 16px; padding: 22px 22px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
      .rwdel-box h3 { margin: 0 0 8px; font-size: 1.08rem; }
      .rwdel-box .nm { margin: 0 0 12px; padding: 8px 12px; border-radius: 10px; background: var(--bg-input, rgba(0,0,0,.05)); font-weight: 600; word-break: keep-all; overflow-wrap: anywhere; }
      .rwdel-box p { margin: 0 0 6px; font-size: .9rem; line-height: 1.55; color: var(--ink-dim, #666); }
      .rwdel-box .err { color: var(--err, #d64545); margin-top: 8px; min-height: 1.2em; }
      .rwdel-row { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
      .rwdel-row button { height: 42px; padding: 0 18px; border-radius: 10px; font: inherit; font-weight: 600; cursor: pointer; border: 1px solid var(--line, #ddd); background: transparent; color: var(--ink, #222); }
      .rwdel-row button.danger { background: var(--err, #d64545); border-color: var(--err, #d64545); color: #fff; }
      .rwdel-row button:disabled { opacity: .6; cursor: default; }
    `;
    document.head.appendChild(st);
  }

  function 지울수있나(status) { return 만드는중.indexOf(String(status || '').trim()) < 0; }

  // opts: { id, title, token(): 로그인 토큰을 돌려주는 함수, onDone() }
  function 묻기(opts) {
    스타일();
    const ov = document.createElement('div'); ov.className = 'rwdel-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.innerHTML = `<div class="rwdel-box">
      <h3>이 프로젝트를 삭제할까요?</h3>
      <div class="nm">${esc(opts.title || '주제 준비 중')}</div>
      <p>삭제하면 되돌릴 수 없어요. 내 프로젝트 목록에서 바로 사라져요.</p>
      <p>이미 기기에 받아 둔 영상·썸네일, 유튜브에 올린 영상은 지워지지 않아요.</p>
      <div class="err" id="rwdel-err" role="alert"></div>
      <div class="rwdel-row"><button type="button" id="rwdel-no">취소</button><button type="button" class="danger" id="rwdel-yes">삭제하기</button></div>
    </div>`;
    document.body.appendChild(ov);
    const yes = ov.querySelector('#rwdel-yes'), no = ov.querySelector('#rwdel-no'), err = ov.querySelector('#rwdel-err');
    const 닫기 = () => { document.removeEventListener('keydown', 키); ov.remove(); };
    const 키 = e => { if (e.key === 'Escape' && !yes.disabled) 닫기(); };
    document.addEventListener('keydown', 키);
    ov.addEventListener('click', e => { if (e.target === ov && !yes.disabled) 닫기(); });
    no.addEventListener('click', 닫기);
    no.focus();
    yes.addEventListener('click', async () => {
      if (yes.disabled) return;
      yes.disabled = no.disabled = true; yes.textContent = '삭제하는 중…'; err.textContent = '';
      try {
        const token = typeof opts.token === 'function' ? opts.token() : opts.token;
        const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 30000);
        const res = await fetch(URL_DELETE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token, id: opts.id }), signal: ctl.signal });
        clearTimeout(timer);
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.ok) { 닫기(); if (opts.onDone) opts.onDone(); return; }
        err.textContent = res.status === 401 ? '로그인 시간이 지났어요. 페이지를 새로고침한 뒤 다시 시도해 주세요.'
          : (data && data.message) || '삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
      } catch (e) {
        err.textContent = e && e.name === 'AbortError' ? '서버 응답이 늦어요. 잠시 뒤 다시 시도해 주세요. (삭제되지 않았을 수 있어요)' : '연결에 실패했어요. 인터넷을 확인하고 다시 시도해 주세요.';
      }
      yes.disabled = no.disabled = false; yes.textContent = '다시 삭제하기';
    });
  }

  window.RewindDelete = { ask: 묻기, canDelete: 지울수있나 };
})();
