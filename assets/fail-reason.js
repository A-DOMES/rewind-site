/* 제작 실패 이유를 고객에게 보여 줄 짧은 말로 바꾼다 (내부 오류 문구는 그대로 보이지 않게 한다)
   사용: RewindFail.reason(errorLog) → 한 문장, RewindFail.notice(errorLog) → 이유 + 환불 안내
   새 오류 종류가 생기면 아래 목록에 줄 하나만 더하면 된다 (위에서부터 먼저 맞는 것을 쓴다). */
(function () {
  const 이유목록 = [
    [/멈춰|경과|시간 ?초과|timeout|timed? ?out/i, '제작이 너무 오래 걸려 끝내지 못했어요.'],
    [/나레이션|음성|목소리|tts|voice|speech/i, '목소리를 만드는 중 문제가 생겼어요.'],
    [/렌더|합치|json2video|creatomate|render/i, '영상을 합치는 중 문제가 생겼어요.'],
    [/장면|이미지|그림|사진|영상 ?생성|캐릭터|fal|flux|seedance|image|scene/i, '그림·영상을 만드는 중 문제가 생겼어요.'],
    [/url|링크|주소|접근|다운로드|소재|드라이브|폴더|permission|403|404/i, '올려 주신 자료를 불러오지 못했어요.'],
  ];
  const 기본 = '제작 중 문제가 생겨 완성하지 못했어요.';
  function reason(errorLog) {
    const s = String(errorLog || '');
    for (const [re, msg] of 이유목록) if (re.test(s)) return msg;
    return 기본;
  }
  function notice(errorLog) { return reason(errorLog) + ' 사용한 포인트는 모두 자동으로 돌려드려요(약 10분 이내).'; }
  window.RewindFail = { reason, notice };
})();
