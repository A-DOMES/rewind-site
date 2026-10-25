/* 목소리 목록 (한 곳에서만 관리) — 고객이 고르는 목소리의 이름·성별·분위기·미리 듣기 파일을 여기서 정한다.
 * 목소리를 더하거나 빼려면 `목소리들` 에 한 줄만 고치면 된다. 화면(voice-picker.js)과 설명은 이 목록을 읽는다.
 * 줄 모양: [음성ID, 성별('남'|'여'), 나이대('청년'|'성인'|'중장년'), 분위기 키, 한 줄 설명]
 *   음성ID  = 음성 엔진(MiniMax)의 목소리 이름. 미리 듣기 파일은 assets/voice-samples/<음성ID>.mp3
 *   분위기  = calm(차분·믿음직) / bright(밝고 친근) / strong(힘 있고 또렷) / soft(부드럽고 감성) / cute(귀엽고 발랄)
 * 새 목소리를 더할 때: ① 샘플 mp3 를 assets/voice-samples/ 에 넣고 ② 아래에 한 줄 더하고 ③ 필요하면 추천(영상 종류별 기본)도 고친다.
 * 이름("차분한 남자 1" 등)은 분위기·성별·순서로 저절로 붙는다. 영어 이름은 고객 화면에 나오지 않는다. */
(function (global) {
  'use strict';
  const 분위기 = {
    calm:   { 이름: '차분한', 설명: '차분하고 믿음직해요' },
    bright: { 이름: '밝은', 설명: '밝고 친근해요' },
    strong: { 이름: '힘 있는', 설명: '또렷하고 힘이 있어요' },
    soft:   { 이름: '부드러운', 설명: '부드럽고 감성적이에요' },
    cute:   { 이름: '귀여운', 설명: '귀엽고 발랄해요' }
  };
  const 나이표 = { 청년: '10~20대', 성인: '30~40대', 중장년: '50대 이상' };

  const 목소리들 = [
    // 남자
    ['Korean_IntellectualMan', '남', '성인', 'calm', ''],
    ['Korean_ReliableYouth', '남', '청년', 'calm', ''],
    ['Korean_ColdYoungMan', '남', '청년', 'calm', ''],
    ['Korean_GentleBoss', '남', '중장년', 'calm', ''],
    ['Korean_IntellectualSenior', '남', '중장년', 'calm', ''],
    ['Korean_WiseTeacher', '남', '중장년', 'calm', ''],
    ['Korean_OptimisticYouth', '남', '청년', 'bright', ''],
    ['Korean_AthleticStudent', '남', '청년', 'bright', ''],
    ['Korean_CheerfulCoolJunior', '남', '청년', 'bright', ''],
    ['Korean_CheerfulBoyfriend', '남', '청년', 'bright', ''],
    ['Korean_ConfidentBoss', '남', '성인', 'strong', ''],
    ['Korean_StrictBoss', '남', '성인', 'strong', ''],
    ['Korean_DominantMan', '남', '성인', 'strong', ''],
    ['Korean_BraveYouth', '남', '청년', 'strong', ''],
    ['Korean_CockyGuy', '남', '청년', 'strong', ''],
    ['Korean_LonelyWarrior', '남', '성인', 'soft', ''],
    ['Korean_InnocentBoy', '남', '청년', 'cute', ''],
    // 여자
    ['Korean_ThoughtfulWoman', '여', '성인', 'calm', ''],
    ['Korean_CalmLady', '여', '성인', 'calm', ''],
    ['Korean_MatureLady', '여', '중장년', 'calm', ''],
    ['Korean_ReliableSister', '여', '성인', 'calm', ''],
    ['Korean_WiseElf', '여', '성인', 'calm', ''],
    ['Korean_MysteriousGirl', '여', '청년', 'calm', ''],
    ['Korean_ColdGirl', '여', '청년', 'calm', ''],
    ['Korean_FriendlyBigSister', '여', '성인', 'bright', ''],
    ['Korean_ChildhoodFriendGirl', '여', '청년', 'bright', ''],
    ['Korean_AthleticGirl', '여', '청년', 'bright', ''],
    ['Korean_SassyGirl', '여', '청년', 'bright', ''],
    ['Korean_DecisiveQueen', '여', '성인', 'strong', ''],
    ['Korean_BraveFemaleWarrior', '여', '성인', 'strong', ''],
    ['Korean_HaughtyLady', '여', '성인', 'strong', ''],
    ['Korean_SoothingLady', '여', '성인', 'soft', ''],
    ['Korean_GentleWoman', '여', '성인', 'soft', ''],
    ['Korean_CaringWoman', '여', '성인', 'soft', ''],
    ['Korean_CharmingElderSister', '여', '성인', 'soft', ''],
    ['Korean_CharmingSister', '여', '성인', 'soft', ''],
    ['Korean_ElegantPrincess', '여', '청년', 'soft', ''],
    ['Korean_ShyGirl', '여', '청년', 'soft', ''],
    ['Korean_SweetGirl', '여', '청년', 'cute', ''],
    ['Korean_CheerfulLittleSister', '여', '청년', 'cute', ''],
    ['Korean_QuirkyGirl', '여', '청년', 'cute', ''],
    ['Korean_AirheadedGirl', '여', '청년', 'cute', '']
  ];

  // 영상 종류별로 "자동 추천" 이 고르는 목소리 (성별마다 하나). 고르지 않은 고객은 이것이 쓰인다.
  // 쇼츠의 남자·여자는 지금까지 쓰던 값(30~40대)과 같게 두어 기존 영상의 목소리가 바뀌지 않게 했다.
  const 추천 = {
    쇼츠:     { 남: 'Korean_IntellectualMan', 여: 'Korean_ThoughtfulWoman' },
    상품쇼츠: { 남: 'Korean_CheerfulCoolJunior', 여: 'Korean_FriendlyBigSister' },
    야담:     { 남: 'Korean_IntellectualSenior', 여: 'Korean_MatureLady' },
    분위기:   { 남: 'Korean_GentleBoss', 여: 'Korean_SoothingLady' },
    _:        { 남: 'Korean_IntellectualMan', 여: 'Korean_ThoughtfulWoman' }
  };

  // 화면에 보일 이름 붙이기: 같은 성별·분위기끼리 1, 2, 3 …
  const 세는판 = {};
  const 목록 = 목소리들.map(([id, 성별, 나이, 분, 설명]) => {
    const 키 = 성별 + 분;
    세는판[키] = (세는판[키] || 0) + 1;
    return { id, 성별, 나이, 나이대: 나이표[나이] || '', 분위기: 분, 이름: 분위기[분].이름 + ' ' + (성별 === '남' ? '남자' : '여자') + ' ' + 세는판[키],
      설명: 설명 || (분위기[분].설명 + ' · ' + (나이표[나이] || '')), 샘플: './assets/voice-samples/' + id + '.mp3' };
  });

  function 찾기(id) { return 목록.find(v => v.id === id) || null; }
  function 추천값(종류, 성별) { const t = 추천[종류] || 추천._; return t[성별 === '여' ? '여' : '남']; }

  global.RWVoiceCatalog = { 목록, 분위기, 찾기, 추천값, 이름: id => { const v = 찾기(id); return v ? v.이름 : ''; } };
})(window);
