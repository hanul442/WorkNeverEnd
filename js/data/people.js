// 회사 사람들. 메신저 프로필, 캘린더, 결재선, 메일 주소록에 쓰인다.
// color 는 프로필 동그라미 색 (CSS 변수 이름의 번호)
window.PEOPLE = {
  me: { name: '나', rank: '사원', dept: '기획팀', color: 1 },
  park: { name: '박지훈', rank: '팀장', dept: '기획팀', color: 2 },
  lee: { name: '이서연', rank: '대리', dept: '기획팀', color: 3 },
  choi: { name: '최영수', rank: '부장', dept: '서비스본부', color: 4 },
  kang: { name: '강태호', rank: '이사', dept: '서비스본부', color: 5 },
  jung: { name: '정민호', rank: '선임', dept: '개발팀', color: 6 },
  han: { name: '한수빈', rank: '사원', dept: '디자인팀', color: 7, peer: true },
  yoon: { name: '윤채원', rank: '매니저', dept: '고객센터', color: 8 },
  oh: { name: '오현주', rank: '대리', dept: '총무팀', color: 2 },
  song: { name: '송도윤', rank: '과장', dept: '재무팀', color: 5 },
  partner: { name: '김민지', rank: '팀장', dept: 'A사 마케팅팀', color: 8, external: true },
  devlead: { name: '김도현', rank: '팀장', dept: '개발팀', color: 6 },
  deslead: { name: '윤서아', rank: '팀장', dept: '디자인팀', color: 7 },
  salelead: { name: '장민석', rank: '팀장', dept: '영업팀', color: 4 },
  sales: { name: '오세훈', rank: '대리', dept: '영업팀', color: 3 },
  mom: { name: '엄마', rank: '', dept: '가족', color: 3, external: true },
  friend: { name: '민수', rank: '', dept: '대학 동기', color: 6, external: true }
};

// 메신저 단체방
window.ROOMS_EXTRA = {
  team: { name: '기획팀 단톡방', members: ['park', 'lee', 'me'], color: 1 }
};

window.WEEKDAYS = ['월', '화', '수', '목', '금'];
