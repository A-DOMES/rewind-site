/* 로그인 화면 왼쪽 소개 슬라이드: <section class="gate-show" data-gate-slides></section> 안을 채운다.
   슬라이드를 바꾸거나 늘릴 때는 아래 SLIDES 표만 고친다(틀: quote 큰 문구 / phone 폰 화면 / list 목록 / rail 길이 막대).
   바로 가기 링크는 일부러 넣지 않는다(로그인 전 화면이라 갈 곳이 없고, 로그인하면 신청 화면으로 들어간다). */
(function () {
  const CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
  const MONTH = new Date(Date.now() + 9 * 3600e3).getUTCMonth() + 1;   // 화면 예시의 '이번 달'(한국시간)
  const SLIDES = [
    { kind: 'quote', title: '세상의 모든 순간을', line2: '영상으로 담다', cap: ['한 줄이면 시작돼요', '주제를 적으면 대본부터 완성 영상까지 도와드려요.'] },
    { kind: 'phone', img: './assets/sample-ai.jpg', cap: ['주제 한 줄로 완성되는 세로형 영상', '대본, 목소리, 장면 구성까지 AI가 만들어요.'] },
    { kind: 'phone', img: './assets/sample-product.jpg', cap: ['상품 링크 하나로 소개 쇼츠', '조회 추이를 참고해 상품을 고르고 바로 제작해요.'] },
    { kind: 'list', head: MONTH + '월 참고 상품 목록 (화면 예시)', rows: [['핫팩', MONTH + '월'], ['전기장판', MONTH + '월'], ['방한 장갑', MONTH + '월'], ['김장 매트', MONTH + '월']],
      cap: ['판매 시기에 앞서 상품을 선정해요', '월별·계절별 참고 목록으로 미리 준비해요. 판매 결과를 보장하지 않아요.'] },
    { kind: 'rail', nodes: [['쇼츠', '짧게'], ['롱폼', '몇 분'], ['야담', '수 시간'], ['분위기 영상', '최대 8시간']], cap: ['쇼츠부터 긴 영상까지 길이를 정해요', '목소리와 음악도 고를 수 있어요.'] },
    { kind: 'list', head: '제작 전에 직접 확인해요', rows: [['대본을 읽고 승인하거나 다시 쓰기'], ['최종 장면을 확인하고 제작 승인'], ['광고 규정에 맞지 않는 표현은 자동으로 걸러내기 (상품 쇼츠)']],
      cap: ['승인한 뒤에만 제작이 시작돼요', '대본과 최종 장면은 내가 결정해요.'] },
    { kind: 'list', head: '포인트로 가볍게 시작해요', rows: [['가입하면 체험 포인트로 먼저 만들어 보기'], ['제작에 실패하면 포인트 전액 자동 환불'], ['확인 단계에서 취소하면 대본 비용만 차감']],
      cap: ['체험으로 먼저 만들어 보세요', '실패한 제작은 포인트가 자동으로 돌아와요.'] },
  ];
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function visual(s) {
    if (s.kind === 'quote') return `<div class="gs-quote">${esc(s.title)}<span>${esc(s.line2)}</span></div>`;
    if (s.kind === 'phone') return `<div class="gs-phone"><img src="${esc(s.img)}" alt="" loading="lazy"><em>샘플 장면</em></div>`;
    if (s.kind === 'rail') return `<div class="gs-rail"><ol>${s.nodes.map((n) => `<li><b>${esc(n[0])}</b>${esc(n[1])}</li>`).join('')}</ol></div>`;
    return `<div class="gs-list"><h3>${esc(s.head)}</h3>${s.rows.map((r) => `<div class="gs-row">${r[1] ? '' : CHECK}<b>${esc(r[0])}</b>${r[1] ? `<span class="tag">${esc(r[1])}</span>` : ''}</div>`).join('')}</div>`;
  }

  function mount(root) {
    root.setAttribute('role', 'region'); root.setAttribute('aria-label', '서비스 소개'); root.removeAttribute('aria-hidden');
    root.innerHTML = `<div class="gs-wrap">
      <div class="gs-prog" role="group" aria-label="소개 슬라이드">${SLIDES.map((s, i) => `<button type="button" aria-label="${i + 1}번째 소개: ${esc(s.cap[0])}"><i></i></button>`).join('')}</div>
      <div class="gs-stage">${SLIDES.map((s) => `<div class="gs-slide">${visual(s)}</div>`).join('')}</div>
      <div class="gs-caps" aria-live="off">${SLIDES.map((s) => `<div class="gs-cap"><h2>${esc(s.cap[0])}</h2><p>${esc(s.cap[1])}</p></div>`).join('')}</div>
    </div>`;
    const wrap = root.querySelector('.gs-wrap');
    const btns = [...root.querySelectorAll('.gs-prog button')], slides = [...root.querySelectorAll('.gs-slide')], caps = [...root.querySelectorAll('.gs-cap')];
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cur = -1;
    function show(i) {
      cur = (i + SLIDES.length) % SLIDES.length;
      btns.forEach((b, k) => { b.classList.remove('on', 'done'); if (k === cur) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); void b.offsetWidth; if (k < cur) b.classList.add('done'); });
      btns[cur].classList.add('on');
      slides.forEach((e, k) => e.classList.toggle('on', k === cur)); caps.forEach((e, k) => e.classList.toggle('on', k === cur));
    }
    btns.forEach((b, k) => b.addEventListener('click', () => show(k)));
    // 막대가 다 차오르면 다음 장으로(막대 애니메이션이 시계 역할: 멈추면 같이 멈춘다)
    btns.forEach((b) => b.addEventListener('animationend', () => { if (b.classList.contains('on')) show(cur + 1); }));
    // 멈춤 사유를 따로 기억해 하나라도 있으면 멈춘다: 마우스(진짜 마우스만) / 키보드 포커스 / 탭이 가려짐
    const holds = new Set();
    const hold = (name, on) => { if (on) holds.add(name); else holds.delete(name); wrap.classList.toggle('paused', holds.size > 0); };
    root.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse') hold('mouse', true); });
    root.addEventListener('pointerleave', () => hold('mouse', false));
    root.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches(':focus-visible')) hold('focus', true); });
    root.addEventListener('focusout', () => hold('focus', false));
    document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
    show(0);
    if (still) hold('motion', true);
  }
  function init() { document.querySelectorAll('[data-gate-slides]').forEach(mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
