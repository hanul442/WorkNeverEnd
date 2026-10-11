// 메신저 대화. from 은 people.js 의 키. {me} 는 플레이어 호칭으로 바뀐다.
// effects 키: stamina(체력) mental(멘탈) perf(성과) rep(평판) money(돈)
// reply: 상대의 답장, spawn: 이 답을 고르면 생기는 업무 종류, minutes: 흐르는 시간
// scene: AI 채점을 켰을 때 AI에게 넘기는 상황 설명
window.CHATS = [
  {
    from: 'park',
    text: '{me}, 어제 말한 행사 예산 {{품의}} 올렸어요?',
    scene: '팀장이 행사 예산 품의서를 올렸는지 묻는다. 아직 못 올렸다.',
    options: [
      { label: '아직입니다. 예산 정리해서 오늘 안에 기안 올리겠습니다.', effects: { rep: 4 }, reply: '좋아요. 예산표부터 정리해서 올려 줘요.', spawn: 'budget' },
      { label: '품의가 뭔가요?', effects: { rep: -6 }, reply: '...신입 교육 때 안 배웠어요? 예산표 정리해서 결재 올리라는 거예요.', spawn: 'budget' },
      { label: '(읽씹)', effects: { rep: -8, mental: 2 }, reply: '{me}? 메신저 보면 답 좀 해요.' }
    ]
  },
  {
    from: 'lee',
    text: '시안 팀장님 {{컨펌}} 났어요? 나면 디자인팀에 넘기려고요.',
    scene: '선배 대리가 시안이 팀장 승인을 받았는지 묻는다. 팀장이 아직 확인하지 않았다.',
    options: [
      { label: '아직이요. 팀장님이 오후 회의 끝나고 보신다고 하셨어요. 나면 바로 말씀드릴게요.', effects: { rep: 4 }, reply: '오케이 고마워요!' },
      { label: '네 났어요! (사실 안 남)', effects: { rep: -10, mental: -4 }, reply: '...디자인팀이 작업 시작했는데 팀장님이 아직 안 보셨다는데요?' },
      { label: '몰라요', effects: { rep: -4 }, reply: '아... 네.' }
    ]
  },
  {
    from: 'jung',
    text: '목요일 {{킥오프}} 회의 말인데요, 제가 그 시간에 다른 회의가 있어서요. 시간 좀 옮겨 주실 수 있어요?',
    scene: '개발자가 킥오프 회의 시간이 겹친다며 옮겨 달라고 한다.',
    options: [
      { label: '네, 참석자분들 일정 확인해서 캘린더에서 옮겨 둘게요.', effects: { rep: 4 }, reply: '감사합니다 🙏', spawn: 'schedule' },
      { label: '그냥 빠지시면 안 될까요?', effects: { rep: -6 }, reply: '개발 일정 얘기하는 회의라 제가 빠지면 안 돼요...', spawn: 'schedule' }
    ]
  },
  {
    from: 'han',
    text: '야 커피 한잔? 나 오늘 팀장님한테 털려서 멘탈 나감 ㅠ',
    scene: '입사 동기가 힘들다며 커피를 마시자고 한다.',
    options: [
      { label: '콜! 10분만 나가자', effects: { mental: 6, money: -4500 }, reply: '역시 너밖에 없다 ㅠㅠ', minutes: 15 },
      { label: '미안 나 오늘 일 터짐 ㅠ 퇴근하고 얘기하자', effects: {}, reply: 'ㅇㅋ ㅠㅠ 힘내' }
    ]
  },
  {
    from: 'choi',
    text: '{me}, 아까 회의 내용 정리해서 나한테 보고해. 결론부터.',
    scene: '부장이 회의 내용을 결론부터 보고하라고 한다.',
    options: [
      { label: '네, 결론부터 정리해서 보고드리겠습니다.', effects: { rep: 3 }, reply: '그래. 길게 쓰지 말고.', spawn: 'report' },
      { label: '회의록 그대로 보내 드려도 될까요?', effects: { rep: -4 }, reply: '내가 그걸 다 읽어야 돼? 요약해서 가져와.', spawn: 'report' }
    ]
  },
  {
    from: 'yoon',
    text: '기획팀이죠? 이번 주 {{VOC}} 중에 결제 오류 문의가 30건 넘어요. 확인 부탁드려요.',
    scene: '고객센터가 결제 오류 고객 문의가 많다며 기획팀에 확인을 요청한다.',
    options: [
      { label: '공유 감사합니다. 개발팀에 원인 확인 요청 메일 보내고 매니저님 참조 걸게요.', effects: { rep: 4 }, reply: '빠른 확인 감사합니다!', spawn: 'mail' },
      { label: '저희 팀 일은 아닌 것 같아요.', effects: { rep: -6 }, reply: '네? 결제 화면 기획은 기획팀 R&R 아닌가요...? 팀장님께 여쭤볼게요.' }
    ]
  },
  {
    from: 'park',
    text: '{me}, 지난주 지표 정리해서 주간 보고 써 줘요. 숫자 틀리지 말고.',
    scene: '팀장이 주간 지표 보고서를 써 달라고 한다.',
    options: [
      { label: '네, 지표 확인해서 오후까지 올리겠습니다.', effects: { rep: 3 }, reply: '좋아요.', spawn: 'report' },
      { label: '지난주 거 복사해서 날짜만 바꿀까요?', effects: { rep: -8 }, reply: '...농담이죠?', spawn: 'report' }
    ]
  },
  {
    from: 'song',
    text: '기획팀 법인카드 사용 건 {{지출결의서}}가 아직 안 올라왔어요. 이번 주 마감이에요.',
    scene: '재무팀 과장이 법인카드 사용 건 지출결의서를 아직 안 올렸다고 독촉한다.',
    options: [
      { label: '죄송합니다. 오늘 바로 올리겠습니다.', effects: { rep: 3 }, reply: '네, 결재선 꼭 확인하고 올려 주세요.', spawn: 'expense' },
      { label: '그거 팀장님이 쓰신 건데요?', effects: { rep: -3 }, reply: '기획팀 막내분이 올리기로 하셨다던데요... 올려 주세요.', spawn: 'expense' }
    ]
  }
];

// 단톡방에 그냥 올라오는 말 (답할 필요 없음)
window.CHATTER = [
  { from: 'lee', text: '오늘 점심 국밥 어때요?' },
  { from: 'park', text: '오후 3시 회의 10분 늦게 시작합니다.' },
  { from: 'lee', text: '회의실 3번 누가 예약했어요? 제가 쓰려고 했는데 ㅠ' },
  { from: 'park', text: '다들 이번 주 금요일까지 OKR 초안 부탁해요.' },
  { from: 'lee', text: '탕비실에 간식 들어왔대요 🍪' },
  { from: 'park', text: '오늘 부장님 기분 안 좋으시니까 보고는 짧게 합시다.' }
];

// 홈 화면 공지사항
window.NOTICES = [
  { tag: '공지', title: '4분기 OKR 수립 일정 안내', by: '경영지원팀' },
  { tag: '인사', title: '10월 정기 인사평가 실시 안내', by: '인사팀' },
  { tag: '총무', title: '3층 남자 화장실 공사 (10/14~10/16)', by: '총무팀' },
  { tag: '보안', title: '사내 메신저로 비밀번호 공유 금지', by: '정보보안팀' },
  { tag: '복지', title: '사내 동호회 신규 회원 모집 (등산, 풋살)', by: '인사팀' },
  { tag: '재무', title: '법인카드 사용 내역 증빙 마감은 매주 금요일', by: '재무팀' }
];

// 점심 선택지
window.LUNCH = [
  { label: '혼밥 (편의점 도시락)', effects: { mental: 8, money: -5000 }, result: '조용히 혼자 먹었다. 평화로웠다.' },
  { label: '팀 점심 (팀장님이 고른 국밥집)', effects: { rep: 5, mental: -2, money: -10000 }, result: '팀장님 군대 이야기를 세 번째 들었다.' },
  { label: '동기랑 맛집', effects: { mental: 12, money: -15000 }, result: '맛있었다. 오후를 버틸 힘이 생겼다.' },
  { label: '점심 거르고 일하기', effects: { stamina: -10, perf: 3 }, result: '배고프지만 마감이 조금 여유로워졌다.', work: 40 }
];

// 퇴근 후 선택지
window.EVENING = [
  { label: '집에 가서 쉬기', effects: { stamina: 20, mental: 10 }, result: '씻고 누웠다. 최고의 선택.' },
  { label: '동기들과 술 한잔', effects: { mental: 18, stamina: -8, money: -30000 }, result: '동기 단톡방에 회사 소문이 쏟아졌다.' },
  { label: '혼술', effects: { mental: 10, money: -15000 }, result: '편의점 맥주 두 캔. 적당했다.' }
];

// 팀 회식 (무작위로 초대가 온다)
window.TEAM_DINNER = {
  text: '박 팀장: 오늘 다들 고생했는데 간단하게 삼겹살 어때요? 다들 가는 거죠?',
  options: [
    { label: '좋습니다! (2차까지 간다)', effects: { rep: 12, stamina: -25, mental: -5, money: -20000 }, result: '2차 노래방까지 갔다. 내일이 걱정된다.', hangover: true },
    { label: '1차만 하고 빠지기', effects: { rep: 6, stamina: -10 }, result: '적당히 눈치 보다 빠져나왔다.' },
    { label: '오늘은 선약이 있어서요...', effects: { rep: -6, stamina: 10, mental: 5 }, result: '팀장님: 아 그래요? ...그래요.' }
  ]
};

// 커피·담배타임에 들을 수 있는 소문
window.RUMORS = [
  '옆 팀 과장님이 다음 달에 이직한대.',
  '이번 분기 인사평가는 평판 비중이 크대.',
  '최 부장님은 보고서 첫 줄에 결론 없으면 바로 반려한대.',
  '팀장님은 오후 3시쯤 기분이 제일 좋대.',
  '야근 많이 한다고 고과 잘 받는 건 아니래.',
  '재무팀 송 과장님은 결재선 틀리면 무조건 반려래.'
];
