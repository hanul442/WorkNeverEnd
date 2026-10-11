// 직급 체계. need: 이 직급으로 올라가는 데 필요한 승진 포인트, pay: 급여일(매주 금요일 뒤)에 들어오는 돈
// open: false 인 직급은 팀을 맡아 업무를 배당하는 4단계에서 열린다
window.RANKS = [
  { name: '사원', pay: 2400000, open: true },
  { name: '주임', need: 2, pay: 2700000, open: true },
  { name: '대리', need: 3, pay: 3100000, open: true },
  { name: '과장', need: 4, pay: 3700000, open: true },
  { name: '차장', need: 5, pay: 4300000, open: false },
  { name: '부장', need: 5, pay: 5200000, open: false },
  { name: '이사', need: 6, pay: 7000000, open: false },
  { name: '상무', need: 6, pay: 8500000, open: false },
  { name: '전무', need: 7, pay: 10000000, open: false },
  { name: '부사장', need: 7, pay: 12000000, open: false },
  { name: '사장', need: 8, pay: 15000000, open: false }
];

// 주간 인사평가 등급. rate: 처리율(처리 ÷ 처리+놓침), rep: 평판 하한, points: 승진 포인트
window.GRADES = [
  { grade: 'S', rate: 0.9, rep: 65, points: 3, comment: '이번 주 에이스. 팀장님이 본부장님께 이름을 올렸다.' },
  { grade: 'A', rate: 0.75, rep: 50, points: 2, comment: '믿고 맡길 만하다는 평가.' },
  { grade: 'B', rate: 0.55, rep: 0, points: 1, comment: '무난하다. 무난한 게 제일 어렵다.' },
  { grade: 'C', rate: 0.35, rep: 0, points: 0, comment: '"다음 주엔 좀 더 챙겨 봅시다."' },
  { grade: 'D', rate: 0, rep: 0, points: -1, comment: '면담 요청이 들어왔다. 분위기가 무겁다.' }
];

// 인수인계서에 들어갈 진행 중인 일. right: 맡겨야 할 사람
window.HANDOVER_ITEMS = [
  { text: '신규 기능 {{요구사항 정의서}} 최신 버전 관리', right: 'lee' },
  { text: '앱 오류 관련 고객 문의 3건 답변 대기', right: 'yoon' },
  { text: '이벤트 배너 시안 수정 요청 전달', right: 'han' },
  { text: '결제 API 연동 일정 확인', right: 'jung' },
  { text: '워크숍 영수증 {{지출결의서}} 처리', right: 'song' },
  { text: '회의실 장기 예약과 비품 신청', right: 'oh' },
  { text: '주간 {{KPI}} 보고서 숫자 업데이트', right: 'lee' },
  { text: '{{핫픽스}} 배포 후 확인 요청', right: 'jung' }
];
window.HANDOVER_TO = ['lee', 'han', 'jung', 'yoon', 'song', 'oh'];
