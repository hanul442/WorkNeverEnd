// 휴가지와 하루 일정(오전·오후·저녁)에 고를 수 있는 활동
// cost: 출발할 때 한 번 드는 돈, perDay: 하루 경비, contact: 업무 연락이 올 확률 배수
window.DESTINATIONS = {
  home: {
    label: '집에서 쉬기',
    desc: '돈은 거의 안 들지만, 회사에서 연락하기 제일 만만한 곳.',
    places: ['우리 집'],
    cost: 0,
    perDay: 20000,
    contact: 1.25,
    slots: {
      morning: [
        { label: '알람 끄고 늦잠 자기', effects: { stamina: 12 }, text: '눈 떠 보니 11시. 출근 안 하는 아침이 이렇게 좋을 줄이야.' },
        { label: '동네 산책하고 브런치', effects: { mental: 8, stamina: 4, money: -18000 }, text: '평일 오전 카페는 한산하다. 다들 일하는 시간이라는 게 묘하게 짜릿하다.' },
        { label: '밀린 집안일 몰아서 하기', effects: { mental: 5, stamina: -3 }, text: '빨래, 청소, 분리수거. 쉬는 건지 일하는 건지 모르겠지만 집은 깨끗해졌다.' }
      ],
      afternoon: [
        { label: '드라마 정주행', effects: { mental: 10 }, text: '한 편만 보려다 시즌 하나가 끝났다.' },
        { label: '헬스장 가기', effects: { stamina: 7, mental: 4, money: -10000 }, text: '오랜만에 땀을 흘렸다. 내일 근육통은 내일의 나에게.' },
        { label: '자격증 공부 (실무 용어 복습)', effects: { mental: -1 }, study: 2, text: '쉬는 날에도 공부라니. 그래도 용어 두 개는 확실히 외웠다.' }
      ],
      evening: [
        { label: '배달 치킨 시키기', effects: { mental: 8, money: -25000 }, text: '치킨은 언제나 옳다.' },
        { label: '친구 만나서 한잔', effects: { mental: 10, stamina: -4, money: -40000 }, text: '회사 욕을 실컷 했다. 친구네 회사도 만만치 않았다.' },
        { label: '일찍 자기', effects: { stamina: 10 }, text: '밤 10시에 누웠다. 이게 진짜 휴가다.' }
      ]
    }
  },
  domestic: {
    label: '국내 여행',
    desc: '적당한 돈으로 확실하게 기분 전환. 그래도 휴대폰은 터진다.',
    places: ['제주도', '강릉', '부산', '경주'],
    cost: 150000,
    perDay: 120000,
    contact: 1,
    slots: {
      morning: [
        { label: '{place} 바다 보면서 커피', effects: { mental: 12, money: -7000 }, text: '{place} 바다는 오늘도 파랗다. 업무함은 잠시 잊었다.' },
        { label: '숙소에서 느긋하게 조식', effects: { stamina: 10 }, text: '누가 차려 준 아침밥. 출근 준비 없는 아침.' },
        { label: '일찍 일어나 일출 보기', effects: { mental: 14, stamina: -4 }, text: '해가 뜨는 걸 보니 마음이 좀 정리됐다.' }
      ],
      afternoon: [
        { label: '{place} 맛집 투어', effects: { mental: 10, money: -45000 }, text: '줄 서서 먹은 보람이 있었다.' },
        { label: '걷기 좋은 길 따라 산책', effects: { stamina: 6, mental: 8 }, text: '하루 2만 보. 회사에서는 하루 2천 보였다.' },
        { label: '팀에 돌릴 기념품 사기', effects: { mental: 3, money: -50000 }, souvenir: true, text: '팀원 수만큼 과자를 샀다. 복귀 첫날의 무기다.' }
      ],
      evening: [
        { label: '현지 시장에서 한잔', effects: { mental: 12, stamina: -3, money: -35000 }, text: '옆 테이블 사장님이랑 친구가 됐다.' },
        { label: '숙소에서 일찍 쉬기', effects: { stamina: 12 }, text: '파도 소리 들으며 잠들었다.' },
        { label: '야경 명소 가기', effects: { mental: 10, money: -15000 }, text: '사진을 300장 찍었다. 건진 건 2장.' }
      ]
    }
  },
  abroad: {
    label: '해외여행',
    desc: '회복은 최고, 돈도 최고로 든다. 시차 때문에 새벽에 연락이 올 수 있다.',
    places: ['오사카', '다낭', '방콕', '파리'],
    cost: 600000,
    perDay: 200000,
    contact: 0.8,
    slots: {
      morning: [
        { label: '{place} 현지 아침 먹기', effects: { mental: 12, money: -15000 }, text: '말은 안 통해도 맛은 통한다.' },
        { label: '호텔 수영장에서 멍 때리기', effects: { stamina: 12, mental: 6 }, text: '아무 생각도 안 했다. 그게 목표였다.' },
        { label: '유명 관광지 오픈런', effects: { mental: 10, stamina: -5, money: -30000 }, text: '사람 없을 때 사진을 건졌다.' }
      ],
      afternoon: [
        { label: '{place} 골목 탐방', effects: { mental: 14, stamina: -3 }, text: '지도 없이 걸었더니 숨은 가게를 찾았다.' },
        { label: '쇼핑하기', effects: { mental: 10, money: -120000 }, text: '카드 알림은 귀국 후의 내가 확인하기로 했다.' },
        { label: '팀에 돌릴 기념품 사기', effects: { mental: 3, money: -70000 }, souvenir: true, text: '현지 과자 한 박스. 복귀 첫날의 무기다.' }
      ],
      evening: [
        { label: '현지 야시장 구경', effects: { mental: 14, money: -40000 }, text: '이 맛에 해외여행 온다.' },
        { label: '루프톱 바에서 한잔', effects: { mental: 12, stamina: -3, money: -60000 }, text: '야경을 보며 퇴사를 잠깐 고민했다.' },
        { label: '호텔에서 푹 자기', effects: { stamina: 14 }, text: '시차 적응 실패. 그래도 푹 잤다.' }
      ]
    }
  }
};

// 휴가 중에 오는 연락. kind: work(업무) | personal(개인)
window.VACATION_CONTACTS = [
  { from: 'park', kind: 'work', text: '{me} 쉬는데 미안한데, 지난번 기획서 최종본 파일 어디 있어요?' },
  { from: 'lee', kind: 'work', text: '{me}! 거래처 담당자 연락처 좀 알려 줄 수 있어요? 급해서요ㅠㅠ' },
  { from: 'choi', kind: 'work', text: '휴가 중인 건 아는데, 내일 {{보고}} 들어갈 숫자 하나만 확인해 줘요.' },
  { from: 'partner', kind: 'work', text: '{me}, 휴가 중이라는 {{부재중 자동응답}} 받았는데요, 정말 잠깐만 통화 가능하실까요?' },
  { from: 'jung', kind: 'work', text: '{{배포}} 일정 관련해서 기획 쪽 확인이 필요해요. 보시면 연락 주세요.' },
  { from: 'yoon', kind: 'work', text: '고객 {{VOC}} 건인데 담당자가 {me}으로 되어 있어서요... 어떻게 할까요?' },
  { from: 'song', kind: 'work', text: '{{지출결의서}} 증빙이 하나 빠졌어요. 복귀해서 해도 되는데... 오늘 마감이긴 해요.' },
  { from: 'park', kind: 'work', text: '{me} 혹시 내일 회의 자료 누가 정리하기로 했었죠?' },
  { from: 'mom', kind: 'personal', home: true, text: '집에 있으면 이따 마트 좀 같이 가자~' },
  { from: 'friend', kind: 'personal', text: '야 너 휴가라며? 오늘 저녁 콜?' },
  { from: 'mom', kind: 'personal', text: '밥은 잘 챙겨 먹고 다니니? 회사에서 연락 오면 받지 마라.' }
];
