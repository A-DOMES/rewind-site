"""index.html → preview-moview.html (Moview v2 시안). 원본은 건드리지 않는다.
나중에 실제 적용할 때 같은 변환을 index.html 에 그대로 쓴다."""
import re, sys
SRC, DST = sys.argv[1], sys.argv[2]
s = open(SRC, encoding='utf-8').read()

def rep(a, b, n=None):
    global s
    c = s.count(a)
    assert c >= 1, ('없음', a)
    if n is not None:
        assert c == n, ('개수 다름', a, c)
    s = s.replace(a, b)

# 1) 이름·로고
mark = ('<svg class="mv-mark" viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="8" fill="none" '
        'stroke="currentColor" stroke-width="3.2"/><circle cx="11" cy="11" r="3" fill="var(--amber)"/></svg>')
word = '<span class="mv-word" aria-hidden="true">M' + mark + 'view</span>'
rep('<title>리와인드 — 주제 하나로 완성되는 세로형 영상</title>', '<title>Moview — 주제 하나로 완성되는 영상</title>', 1)
rep('<link rel="icon" type="image/png" href="./리와인드_로고1_512px.png">', '<link rel="icon" type="image/svg+xml" href="./moview-icon.svg">', 1)
rep('<a class="logo" href="./index.html"><img src="./리와인드_로고1_512px.png" alt=""> 리와인드</a>',
    '<a class="logo" href="./index.html" aria-label="Moview 홈">' + word + '</a>', 1)
rep('<div class="logo"><img src="./리와인드_로고1_512px.png" alt=""> 리와인드</div>',
    '<div class="logo" role="img" aria-label="Moview">' + word + '</div>', 1)
rep('<span>&copy; 2026 리와인드</span>', '<span>&copy; 2026 Moview</span>', 1)
rep('서비스명: 리와인드 · 운영자: 리와인드', '서비스명: Moview · 운영자: Moview', 1)
s = s.replace('리와인드로 실제 만든 영상', 'Moview 로 실제 만든 영상')

rep('.rate-table .mc-mix { --mc: #e2a23c; }', '.rate-table .mc-mix { --mc: #ffb020; }', 1)
s = s.replace('--amber: #e2a23c;', '--amber: #ff5a3c;')
# 2) 옛 갈색·앰버 고정값 → 중립 회색 / 브랜드 (CSS·인라인 스타일)
MAP = {
    # 어두운 갈색 면 → 중립 회색
    '#2f2822': '#1a1a1f', '#3a322b': '#2e2e35', '#3a3129': '#2e2e35', '#2c2415': '#1a1a1f',
    '#0a0908': '#0a0a0b', '#2e2823': '#1a1a1f', '#2b2520': '#16161a', '#0f0d0b': '#0a0a0b',
    '#15110e': '#0e0e10', '#33261a': '#1f1f24', '#33231f': '#1f1f24', '#1f1a17': '#16161a',
    '#2a241f': '#26262c', '#221c16': '#1d0f0b', '#1a1612': '#0a0a0b', '#3a2a22': '#3f3f46',
    'rgba(15,13,11': 'rgba(10,10,11', 'rgba(15, 13, 11': 'rgba(10, 10, 11',
    # 밝은 글자
    '#d8cdbb': '#c8c8d0', '#f2e9da': '#f5f5f7',
    # 밝은 테마 크림·갈색 → 중립
    '#f6f1e9': '#fafafa', '#fffdf9': '#ffffff', '#efe8dc': '#f2f2f4', '#e3d9c8': '#e4e4e7',
    '#cbbda6': '#d4d4d8', '#221a12': '#111114', '#54473a': '#3f3f46', '#7a6c5c': '#5f5f68',
    '#fbf0dc': '#fdf0ec', '#ead3a8': '#f6cdc2',
    # 밝은 테마 앰버 → 코랄(글자용 진한 값)
    '#9a600a': '#b0301a', '#87540a': '#9a2a16',
    # 옛 앰버·산호 비슷한 색 → 브랜드 / 다른 색
    '#e2a23c': 'var(--amber)',
    '#f0694a': '#a78bfa',   # 요금표 '모두 영상' 칸: 보라
    '#ff8f6b': '#ffb020',   # 상품 포스터 강조: 금색
    '#d6452a': '#b45309',   # 밝은 테마 아이콘: 진한 금색
}
for a, b in MAP.items():
    s = re.sub(re.escape(a), b, s, flags=re.I)

# 3) 덮어쓰기 블록(변수·글꼴·코랄 절제)
css = '''
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style id="moview-v2">
:root{--bg:#000;--bg-raised:#0e0e10;--bg-deep:#0a0a0b;--line:#26262c;--line-strong:#3a3a44;
 --ink:#f5f5f7;--ink-dim:#c8c8d0;--ink-faint:#a1a1aa;
 --amber:#ff5a3c;--amber-hover:#ff7558;--amber-dim:#5c2418;--amber-wash:#1d0f0b;--on-amber:#000;--err:#ff6b8a}
:root[data-theme="light"]{--amber:#b0301a;--amber-hover:#9a2a16;--amber-wash:#fdf0ec;--on-amber:#fff;--err:#be123c}
@media (prefers-color-scheme: light){:root[data-theme="system"]{--amber:#b0301a;--amber-hover:#9a2a16;--amber-wash:#fdf0ec;--on-amber:#fff;--err:#be123c}}
body,.th-float,.choice .big small{font-family:'Pretendard Variable',Pretendard,-apple-system,sans-serif}
.steps li::before,.choice .big{font-family:'Pretendard Variable',Pretendard,sans-serif;font-style:normal;font-weight:800;letter-spacing:-0.03em}
.timecode{display:none}
/* 코랄은 버튼·핵심 제목·단계 번호·추천 카드에만 */
.steps .who,.way .go,.rate-table td,.th-kick{color:var(--ink-dim)}
.th-kick,.th-ic{background:var(--bg-raised);border-color:var(--line-strong)}
.th-ic svg{stroke:var(--ink)}
.logo .mv-word{display:inline-flex;align-items:center;font-weight:800;font-size:1.35rem;letter-spacing:-0.04em;color:var(--ink);line-height:1}
.logo .mv-mark{width:.92em;height:.92em;margin:0 .02em;position:relative;top:.04em}
</style>
</head>'''
rep('</head>', css, 1)
open(DST, 'w', encoding='utf-8').write(s)
left = sorted(set(re.findall(r'#(?:2f2822|3a322b|e2a23c|9a600a|f6f1e9)', s, re.I)))
print('남은 옛 색:', left or '없음', '| 리와인드 남은 곳:', s.count('리와인드'))
