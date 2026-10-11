// 업무 중 메신저로 오는 대화. 고른 답에 따라 수치가 바뀐다.
// effects 키: stamina(체력) mental(멘탈) perf(성과) rep(평판) money(돈)
// scene 은 AI 채점을 켰을 때 AI에게 넘기는 상황 설명이다.
window.CHATS = [
  {
    from: '박 팀장',
    rank: '팀장',
    text: '김 사원, 어제 말한 행사 예산 {{품의}} 올렸어요?',
    scene: '팀장이 행사 예산 품의서를 올렸는지 묻는다. 아직 못 올렸다.',
    options: [
      { label: '아직입니다. 오늘 오후 3시까지 기안해서 올리겠습니다.', effects: { rep: 4 }, result: '팀장님: 좋아요, 3시까지.' },
      { label: '품의가 뭔가요?', effects: { rep: -6 }, result: '팀장님: ...신입 교육 때 안 배웠어요?' },
      { label: '(읽고 답장 안 하기)', effects: { rep: -8, mental: 2 }, result: '팀장님이 자리로 직접 찾아왔다.' }
    ]
  },
  {
    from: '이 대리',
    rank: '대리',
    text: '시안 팀장님 {{컨펌}} 났어요? 나면 디자인팀에 넘기려고요.',
    scene: '선배 대리가 시안이 팀장 승인을 받았는지 묻는다. 팀장이 아직 확인하지 않았다.',
    options: [
      { label: '아직이요. 팀장님이 오후 회의 끝나고 보신다고 하셨어요. 나면 바로 말씀드릴게요.', effects: { rep: 4 }, result: '이 대리: 오케이 고마워요!' },
      { label: '네 났어요! (사실 안 남)', effects: { rep: -10, mental: -4 }, result: '디자인팀이 작업을 시작했다가 다시 엎었다. 이 대리 표정이 굳었다.' },
      { label: '몰라요', effects: { rep: -4 }, result: '이 대리: 아... 네.' }
    ]
  },
  {
    from: '정 개발자',
    rank: '선임',
    text: '오늘 {{배포}} 일정에 기획 쪽 공지 문구 들어가나요? {{데드라인}}이 5시예요.',
    scene: '개발자가 배포 공지 문구가 필요한지, 5시 마감을 지킬 수 있는지 묻는다.',
    options: [
      { label: '네, 4시 반까지 공지 문구 드릴게요.', effects: { rep: 3, perf: 2 }, result: '정 개발자: 감사합니다 👍' },
      { label: '그건 개발팀에서 써 주시면 안 될까요?', effects: { rep: -3 }, result: '정 개발자: 저희 R&R은 아닌데요...' }
    ]
  },
  {
    from: '동기 수빈',
    rank: '동기',
    text: '야 오늘 커피 한잔? 나 오늘 팀장님한테 털려서 멘탈 나감 ㅠ',
    scene: '입사 동기가 힘들다며 커피를 마시자고 한다.',
    options: [
      { label: '콜! 10분만 나가자', effects: { mental: 6, rep: 1 }, result: '동기와 커피를 마시며 팀장 뒷담화를 했다. 시간이 15분 흘렀다.', minutes: 15 },
      { label: '미안 나 오늘 일 터짐 ㅠ 퇴근하고 얘기하자', effects: {}, result: '수빈: ㅇㅋ ㅠㅠ 힘내' }
    ]
  },
  {
    from: '최 부장',
    rank: '부장',
    text: '김 사원, 오늘 오후 회의 들어와서 {{OKR}} 얘기할 때 의견 한마디 해 봐요.',
    scene: '부장이 오후 OKR 회의에서 의견을 말하라고 한다.',
    options: [
      { label: '네, 이번 분기 목표를 신규 가입 늘리기로 두고 핵심 결과는 가입자 2만 명으로 잡는 안을 말씀드리겠습니다.', effects: { rep: 6, perf: 3 }, result: '최 부장: 오, 준비 좀 했네?' },
      { label: '저는 딱히 의견이 없습니다.', effects: { rep: -5 }, result: '최 부장: 요즘 친구들은 의견이 없어...' }
    ]
  },
  {
    from: '고객센터',
    rank: '타 부서',
    text: '기획팀이죠? 이번 주 {{VOC}} 중에 결제 오류 문의가 30건 넘어요. 확인 부탁드려요.',
    scene: '고객센터가 결제 오류 고객 문의가 많다며 기획팀에 확인을 요청한다.',
    options: [
      { label: '공유 감사합니다. 개발팀 참조로 걸어서 원인 확인 요청하겠습니다.', effects: { rep: 4, perf: 2 }, result: '고객센터: 빠른 확인 감사합니다!' },
      { label: '저희 팀 일은 아닌 것 같아요.', effects: { rep: -6 }, result: '고객센터가 팀장님에게 직접 연락했다.' }
    ]
  }
];

// 점심 선택지
window.LUNCH = [
  { label: '혼밥 (편의점 도시락)', effects: { mental: 8, money: -5000 }, result: '조용히 혼자 먹었다. 평화로웠다.' },
  { label: '팀 점심 (팀장님이 고른 국밥집)', effects: { rep: 5, mental: -2, money: -10000 }, result: '팀장님 군대 이야기를 3번째 들었다.' },
  { label: '동기랑 맛집', effects: { mental: 12, money: -15000 }, result: '맛있었다. 오후를 버틸 힘이 생겼다.' },
  { label: '점심 거르고 일하기', effects: { stamina: -10, perf: 3 }, result: '배고프지만 업무를 조금 더 했다.', work: 40 }
];

// 퇴근 후 선택지
window.EVENING = [
  { id: 'home', label: '집에 가서 쉬기', effects: { stamina: 20, mental: 10 }, result: '씻고 누웠다. 최고의 선택.' },
  { id: 'peers', label: '동기들과 술 한잔', effects: { mental: 18, stamina: -8, money: -30000 }, result: '동기 단톡방에 회사 소문이 쏟아졌다.' },
  { id: 'alone', label: '혼술', effects: { mental: 10, money: -15000 }, result: '편의점 맥주 두 캔. 적당했다.' }
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
  '야근 많이 한다고 고과 잘 받는 건 아니래.'
];
