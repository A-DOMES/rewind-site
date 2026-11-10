/* 사이트 시험 관문 (GitHub 자동 검사 + 푸시 전 수동 실행: node test/site_check.js)
 * 1) 모든 HTML 안 스크립트·assets/*.js 문법 검사 (화면이 통째로 멈추는 실수 방지)
 * 2) 주문 화면(new.html)이 보내는 신청 데이터(payload) 항목 목록이 고정본(test/payload_keys.json)과 같은지
 *    - 항목을 일부러 바꿨다면: node test/site_check.js --update 로 고정본을 새로 만들고, 웹_신청_접수가 받는지 함께 확인
 * 3) 요금 기본값이 new.html 과 index.html 에서 같은지
 * 4) 공개 저장소에 비밀값·시트 ID 가 들어가지 않았는지 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const R = path.join(__dirname, '..'); let bad = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) bad++; };
const htmls = fs.readdirSync(R).filter(f => f.endsWith('.html'));
const jss = fs.readdirSync(path.join(R, 'assets')).filter(f => f.endsWith('.js')).map(f => 'assets/' + f);

// 1) 문법
const 문법 = [];
for (const f of htmls) {
  const s = fs.readFileSync(path.join(R, f), 'utf8'); let i = 0;
  for (const m of s.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi)) {
    i++; const attr = m[1] || '';
    if (/\ssrc=/.test(attr) || /type=["'](application\/(ld\+)?json|text\/template)/i.test(attr) || !m[2].trim()) continue;
    try { new vm.Script(m[2], { filename: f + '#script' + i }); } catch (e) { 문법.push(f + ' 스크립트 ' + i + ': ' + e.message); }
  }
}
for (const f of jss) { try { new vm.Script(fs.readFileSync(path.join(R, f), 'utf8'), { filename: f }); } catch (e) { 문법.push(f + ': ' + e.message); } }
ok(!문법.length, `스크립트 문법 (HTML ${htmls.length}개 · JS ${jss.length}개)` + (문법.length ? '\n   ' + 문법.join('\n   ') : ''));

// 2) payload 항목 고정본
const nw = fs.readFileSync(path.join(R, 'new.html'), 'utf8');
const 키 = new Set();
const 첫 = nw.match(/const payload = \{([^\n]*)\};/); ok(!!첫, 'new.html 의 payload 시작 줄을 찾음');
if (첫) for (const m of 첫[1].matchAll(/(?:^|,)\s*(\w+)\s*:/g)) 키.add(m[1]);
for (const m of nw.matchAll(/\bpayload\.(\w+)\s*=(?!=)/g)) 키.add(m[1]);
const 지금 = [...키].sort(), 고정파일 = path.join(__dirname, 'payload_keys.json');
if (process.argv.includes('--update')) { fs.writeFileSync(고정파일, JSON.stringify(지금, null, 1) + '\n'); console.log('고정본을 새로 썼어요 (' + 지금.length + '개)'); }
const 고정 = JSON.parse(fs.readFileSync(고정파일, 'utf8'));
const 더 = 지금.filter(k => !고정.includes(k)), 빠짐 = 고정.filter(k => !지금.includes(k));
ok(!더.length && !빠짐.length, `신청 데이터 항목 ${지금.length}개가 고정본과 같음` + (더.length ? '\n   새로 생김: ' + 더.join(', ') : '') + (빠짐.length ? '\n   없어짐: ' + 빠짐.join(', ') : ''));

// 3) 요금 기본값
const ix = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const 표 = (s, re) => { const m = s.match(re); return m ? m[1].replace(/\s/g, '') : null; };
const nr = 표(nw, /const MOTION_RATE = (\{[^}]*\})/), ir = 표(ix, /const RATE = (\{[^}]*\})/);
ok(nr && nr === ir, `분당 요금 같음 (new ${nr} / index ${ir})`);
const nb = nw.match(/let PRICE_BASE = (\d+), PRICE_LONG_PCT = (\d+)/), ib = ix.match(/let BASE = (\d+), LONG_PCT = (\d+)/);
ok(nb && ib && nb[1] === ib[1] && nb[2] === ib[2], `기본료·60분 초과 할증 같음 (new ${nb && nb.slice(1)} / index ${ib && ib.slice(1)})`);

// 4) 비밀값
const 금지 = [/AIza[0-9A-Za-z_-]{30,}/, /\bsk-[A-Za-z0-9_-]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /github_pat_[A-Za-z0-9_]{20,}/, /RENDER_TOKEN\s*[=:]\s*['"][^'"]+/, /1LV5rPihWM6t8J3L2Co585r2cC11Z7sVO/];
const 걸림 = [];
for (const f of [...htmls, ...jss]) { const s = fs.readFileSync(path.join(R, f), 'utf8'); 금지.forEach(re => { if (re.test(s)) 걸림.push(f + ' ← ' + re.source.slice(0, 12)); }); }
ok(!걸림.length, '비밀값·시트 ID 없음' + (걸림.length ? '\n   ' + 걸림.join('\n   ') : ''));

console.log(bad ? `\n✗ ${bad}건 실패` : '\n== 모두 통과'); process.exit(bad ? 1 : 0);
