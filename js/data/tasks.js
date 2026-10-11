// 기획 직무 사원의 업무 풀.
// type: typing(문서 작성) | review(검토해서 틀린 줄 찾기) | match(지시에 맞는 문서 고르기)
// minutes: 처리하는 데 흐르는 게임 시간, deadline: 들어온 시점부터 마감까지 게임 시간(분)
window.TASKS = [
  {
    id: 'minutes-weekly',
    type: 'typing',
    title: '주간회의 {{회의록}} 정리',
    from: '박 팀장',
    minutes: 40,
    deadline: 180,
    text: '결정 사항: 신규 이벤트는 다음 주 화요일 오픈, 담당은 기획팀 김 사원'
  },
  {
    id: 'mail-partner',
    type: 'typing',
    title: '협력사 일정 확인 메일 작성 (팀장님 {{참조}})',
    from: '박 팀장',
    minutes: 30,
    deadline: 150,
    text: '안녕하세요, 기획팀 김사원입니다. 다음 주 미팅 일정 확인 부탁드립니다.'
  },
  {
    id: 'req-doc',
    type: 'typing',
    title: '{{요구사항 정의서}} 한 줄 추가',
    from: '이 대리',
    minutes: 45,
    deadline: 240,
    text: '로그인하지 않은 사용자는 장바구니 담기 시 로그인 화면으로 이동한다'
  },
  {
    id: 'report-numbers',
    type: 'review',
    title: '주간 지표 보고서 검토',
    from: '이 대리',
    minutes: 30,
    deadline: 200,
    lines: [
      '방문자 수: 12,000명',
      '가입자 수: 600명',
      '{{전환율}}: 50%',
      '이탈률: 42%'
    ],
    errorIndex: 2,
    explain: '전환율은 가입자 ÷ 방문자라서 600 ÷ 12,000 = 5%여야 해요.'
  },
  {
    id: 'release-note',
    type: 'review',
    title: '{{배포}} 공지 문구 검토',
    from: '정 개발자',
    minutes: 25,
    deadline: 160,
    lines: [
      '배포 일시: 10월 16일(목) 오후 7시',
      '내용: 결제 오류 {{핫픽스}}',
      '영향: 배포 중 약 10분간 결제 일시 중단',
      '문의: 개발팀이 아닌 영업팀으로 문의'
    ],
    errorIndex: 3,
    explain: '배포 관련 문의는 개발을 담당한 팀이 받아야 해요. 엉뚱한 부서로 안내하면 문의가 떠돌아요.'
  },
  {
    id: 'kpi-pick',
    type: 'match',
    title: '팀장님 요청: "이번 분기 {{KPI}} 기준으로 정리해 와요"',
    from: '박 팀장',
    minutes: 20,
    deadline: 180,
    question: '어떤 자료를 가져가야 할까요?',
    options: [
      { label: '신규 가입자 목표 2만 명 대비 현재 1.4만 명 달성 현황', correct: true },
      { label: '팀원별 이번 달 연차 사용 일수', correct: false },
      { label: '사무실 비품 구매 목록', correct: false }
    ],
    explain: 'KPI는 목표 대비 성과를 재는 핵심 지표예요. 목표 수치와 현재 수치가 같이 있어야 해요.'
  },
  {
    id: 'mvp-pick',
    type: 'match',
    title: '이 대리: "{{MVP}} 범위만 먼저 추려 줘요"',
    from: '이 대리',
    minutes: 20,
    deadline: 200,
    question: '새 예약 서비스의 MVP에 넣을 기능은?',
    options: [
      { label: '예약하기, 예약 확인, 예약 취소', correct: true },
      { label: '예약하기, 다크 모드, 친구 초대 리워드, AI 추천', correct: false },
      { label: '회사 소개 페이지와 채용 공고', correct: false }
    ],
    explain: 'MVP는 핵심 가치를 확인할 수 있는 최소 기능만 담아요. 예약 서비스라면 예약 그 자체가 핵심이에요.'
  },
  {
    id: 'ab-pick',
    type: 'match',
    title: '팀장님: "버튼 문구는 {{A/B 테스트}}로 정하죠. 설계해 와요"',
    from: '박 팀장',
    minutes: 25,
    deadline: 220,
    question: '올바른 A/B 테스트 설계는?',
    options: [
      { label: '사용자를 무작위로 반씩 나눠 같은 기간에 "구매하기"와 "지금 구매"를 보여 주고 클릭률 비교', correct: true },
      { label: '이번 주는 A안, 다음 주는 B안을 전체에 보여 주고 매출 비교', correct: false },
      { label: '팀원 다섯 명에게 어느 쪽이 좋은지 투표', correct: false }
    ],
    explain: '같은 기간에 무작위로 나눠야 요일이나 시즌 같은 다른 요인이 섞이지 않아요.'
  },
  {
    id: 'voc-pick',
    type: 'match',
    title: '팀장님: "{{VOC}} 좀 모아서 보고해 줘요"',
    from: '박 팀장',
    minutes: 20,
    deadline: 200,
    question: '무엇을 모아야 할까요?',
    options: [
      { label: '고객센터 문의, 앱 리뷰, 고객 불만 접수 내용', correct: true },
      { label: '경쟁사 보도자료', correct: false },
      { label: '사내 메신저 공지', correct: false }
    ],
    explain: 'VOC는 고객이 직접 남긴 목소리예요. 문의, 리뷰, 불만이 대표적이에요.'
  }
];

// 이상한 업무. 메신저로 들어오고, 수락하면 업무 목록에 typing 업무로 추가된다.
window.WEIRD_TASKS = [
  {
    from: '최 부장',
    message: '김 사원, 우리 딸 대학 과제 PPT 좀 봐 줄 수 있나? 금방이야 금방.',
    task: { id: 'weird-ppt', type: 'typing', title: '부장님 따님 과제 PPT 목차 작성', from: '최 부장', minutes: 50, deadline: 300, text: '1. 서론 2. 국내 커피 시장 현황 3. 결론 및 시사점' }
  },
  {
    from: '박 팀장',
    message: '어제 올린 보고서 말인데, 느낌이 좀 안 살아. 처음부터 다시 가 보자. {{ASAP}}으로.',
    task: { id: 'weird-redo', type: 'typing', title: '보고서 "느낌 살려서" 다시 쓰기', from: '박 팀장', minutes: 60, deadline: 240, text: '본 보고서는 고객 경험 혁신을 통한 지속 가능한 성장 방안을 제시한다' }
  },
  {
    from: '총무팀',
    message: '오늘 사무실 화분 물 주기 당번 기획팀이에요. 한 분만 부탁드려요~',
    task: { id: 'weird-plant', type: 'typing', title: '사무실 화분 물 주기 체크리스트 작성', from: '총무팀', minutes: 20, deadline: 200, text: '3층 화분 12개 물 주기 완료, 시든 화분 2개 총무팀 전달' }
  },
  {
    from: '최 부장',
    message: '다음 달 체육대회 장기자랑 기획팀에서 김 사원이 나가는 걸로 했어. 기획안 하나 써 와.',
    task: { id: 'weird-talent', type: 'typing', title: '체육대회 장기자랑 기획안', from: '최 부장', minutes: 40, deadline: 300, text: '기획팀 장기자랑: 신입 김사원의 회의록 랩, 소요 시간 3분' }
  }
];
