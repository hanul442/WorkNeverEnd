// 4단계: 차장부터 사장까지. 일을 직접 하기보다 사람에게 맡기고, 남의 부서 일은 맞는 부서로 넘긴다.

// 직급(RANKS 번호)별 직책. crew: 그날 일을 맡길 수 있는 사람
window.ROLES = {
  4: { title: '파트장', desc: '팀원 3명을 이끈다. 들어온 일을 팀원에게 나눠 주고, 남의 부서 일은 맞는 부서로 넘긴다.' },
  5: { title: '선임 파트장', desc: '팀원이 5명으로 늘었다. 사람마다 잘하는 일이 다르다.' },
  6: { title: '본부장', desc: '이제 팀장들에게 일을 맡긴다. 일이 어느 팀 일인지 알아보는 눈이 성과를 가른다. 매일 경영 판단도 내려야 한다.' },
  7: { title: '본부장', desc: '본부 전체 실적이 내 고과다.' },
  8: { title: '부문장', desc: '판단 하나에 수백 명이 움직인다.' },
  9: { title: '부문장', desc: '대표이사 바로 아래. 이사회가 나를 보고 있다.' },
  10: { title: '대표이사', desc: '회사의 끝. 그래도 일은 끝나지 않는다.' }
};

// 파트 팀원. good: 잘하는 업무, weak: 약한 업무, base: 그 밖의 업무 실력, grow: 성공할 때마다 느는 정도
// joins: 이 직급부터 내 파트에 들어온다
window.CREW = {
  nam: { name: '남도윤', rank: '사원', color: 6, joins: 4, base: 0.4, grow: 0.07, good: ['mail', 'schedule'], weak: ['budget', 'quote', 'approval'], trait: '의욕은 넘치는데 경험이 없다. 맡기고 가르치면 빨리 큰다.' },
  bae: { name: '배유진', rank: '주임', color: 2, joins: 4, base: 0.55, grow: 0.04, good: ['budget', 'expense', 'approval', 'quote'], weak: ['mail', 'reorder'], trait: '숫자를 틀리는 법이 없다. 대신 글 쓰는 일은 느리다.' },
  lim: { name: '임재현', rank: '대리', color: 4, joins: 4, base: 0.6, grow: 0.03, good: ['mail', 'classify', 'schedule'], weak: ['report', 'review'], trait: '빠르고 싹싹하다. 꼼꼼해야 하는 일에선 가끔 빠뜨린다.' },
  moon: { name: '문가은', rank: '대리', color: 7, joins: 5, base: 0.6, grow: 0.03, good: ['report', 'reorder', 'review', 'match'], weak: ['quote'], trait: '문서를 정말 잘 쓴다. 일이 몰리면 예민해진다.' },
  ko: { name: '고태민', rank: '과장', color: 5, joins: 5, base: 0.75, grow: 0.02, good: ['budget', 'review', 'report', 'approval'], weak: [], trait: '15년 차 베테랑. 뭐든 잘하지만 지쳐 있다. 일을 몰아주면 바로 티가 난다.' }
};

// 일을 넘길 수 있는 부서. who: 그 부서 창구
window.DEPTS = {
  기획: { label: '기획팀', who: 'park' },
  개발: { label: '개발팀', who: 'devlead' },
  디자인: { label: '디자인팀', who: 'deslead' },
  영업: { label: '영업팀', who: 'salelead' },
  재무: { label: '재무팀', who: 'song' },
  총무: { label: '총무팀', who: 'oh' },
  고객센터: { label: '고객센터', who: 'yoon' }
};

// 남의 부서 일이 우리 쪽으로 잘못 들어온 요청. dept: 원래 맡아야 할 부서, why: 넘길 때 보여 줄 이유
window.ROUTE_REQUESTS = [
  { title: '앱 결제 오류 원인 확인 요청', dept: '개발', from: 'yoon', why: '오류 원인 분석은 개발팀이 로그를 봐야 알 수 있다.' },
  { title: '서버 점검 시간 확정과 {{배포}} 일정 공유', dept: '개발', from: 'partner', why: '서버와 배포 일정은 개발팀이 정한다.' },
  { title: '이벤트 배너 색상과 문구 위치 수정', dept: '디자인', from: 'partner', why: '시안 수정은 디자인팀 일이다.' },
  { title: '앱 아이콘 리뉴얼 시안 3종 요청', dept: '디자인', from: 'choi', why: '시안 제작은 디자인팀이 맡는다.' },
  { title: 'A사 견적서 재발행과 할인 조건 협의', dept: '영업', from: 'partner', why: '견적과 가격 협상은 영업팀 창구로 간다.' },
  { title: '신규 고객사 미팅 일정 잡기', dept: '영업', from: 'kang', why: '고객사 미팅은 영업팀이 관리한다.' },
  { title: '신규 기능 {{요구사항 정의서}} 작성', dept: '기획', from: 'jung', why: '요구사항 정의는 기획팀이 쓴다.' },
  { title: '하반기 서비스 {{로드맵}} 정리', dept: '기획', from: 'kang', why: '로드맵은 기획팀이 만든다.' },
  { title: '법인카드 사용 내역 정산', dept: '재무', from: 'choi', why: '정산과 경비 처리는 재무팀 일이다.' },
  { title: '거래처 세금계산서 발행 확인', dept: '재무', from: 'partner', why: '세금계산서는 재무팀이 발행한다.' },
  { title: '회의실 장기 예약과 비품 구매', dept: '총무', from: 'lee', why: '회의실과 비품은 총무팀이 관리한다.' },
  { title: '사무실 에어컨 고장 수리 요청', dept: '총무', from: 'han', why: '시설 수리는 총무팀에 요청한다.' },
  { title: '고객 환불 문의 회신', dept: '고객센터', from: 'choi', why: '고객 응대와 환불 안내는 고객센터 일이다.' },
  { title: '{{VOC}} 답변 템플릿 정리', dept: '고객센터', from: 'yoon', why: 'VOC 응대 문구는 고객센터가 정한다.' }
];

// 본부장부터 들어오는 본부 단위 과제. dept: 맡아야 할 팀
window.EXEC_PROJECTS = [
  { title: '신규 결제 시스템 구축', dept: '개발' },
  { title: '앱 속도 개선 프로젝트', dept: '개발' },
  { title: '개인정보 보안 점검 대응', dept: '개발' },
  { title: '브랜드 리뉴얼 디자인 가이드', dept: '디자인' },
  { title: '연말 캠페인 키 비주얼 제작', dept: '디자인' },
  { title: '하반기 매출 20% 달성 전략', dept: '영업' },
  { title: '대형 고객사 B사 계약 수주', dept: '영업' },
  { title: '내년도 서비스 {{로드맵}} 수립', dept: '기획' },
  { title: '신사업 타당성 검토 보고서', dept: '기획' },
  { title: '경쟁사 {{벤치마킹}} 분석', dept: '기획' }
];

// 팀원과의 장면. role 'crew' 는 그 장면의 팀원, 'lead' 는 내 상사
// need: 장면이 나오는 조건 (busy: 일이 몰린 팀원이 있을 때, cold: 사이가 나쁜 팀원이 있을 때)
window.CREW_SCENES = [
  { id: 'stuck', place: '내 자리 옆', lines: [['crew', '파트장님, 잠깐 시간 되세요?'], ['crew', '맡겨 주신 거 하다가 막혀서요... 어디서부터 손대야 할지 모르겠어요.']],
    choices: [
      { label: '같이 앉아서 30분 알려 준다', act: 'teach', rel: 4, karma: 'grow', minutes: 30, then: [['crew', '아, 이렇게 하는 거였구나. 감사합니다! 다음엔 혼자 해 볼게요.']] },
      { label: '"일단 혼자 해 봐요. 그래야 늘어요."', rel: -2, then: [['crew', '...네, 해 볼게요.']] },
      { label: '"그거 다른 사람한테 넘길게요."', act: 'reassign', rel: -1, then: [['crew', '아... 네. 죄송합니다.']] }
    ] },
  { id: 'overload', place: '탕비실', need: 'busy', lines: [['crew', '파트장님, 솔직하게 말씀드려도 될까요?'], ['crew', '요즘 저한테만 일이 너무 몰리는 것 같아요. 오늘도 세 건째예요.']],
    choices: [
      { label: '"미안해요. 하나는 내가 가져갈게요."', act: 'takeback', rel: 6, karma: 'fair', then: [['crew', '진짜요? 살 것 같아요...']] },
      { label: '"조금만 버텨 줘요. 이번 주만."', rel: -5, effects: { perf: 2 }, then: [['crew', '...이번 주만이요.']] },
      { label: '"다들 바빠요. 다른 사람도 다 그래요."', rel: -8, karma: 'overload', then: [['crew', '(대답 없이 자리로 돌아간다)']] }
    ] },
  { id: 'mistake', place: '회의실 B', lines: [['crew', '파트장님... 큰일 났어요.'], ['crew', '고객사에 보낸 자료에 숫자가 틀렸어요. 제가 확인을 못 했어요.']],
    choices: [
      { label: '"같이 수습해요. 정정 메일부터 씁시다."', rel: 6, minutes: 30, effects: { rep: -1 }, karma: 'cover', then: [['crew', '감사합니다... 다음엔 두 번 확인할게요.']] },
      { label: '"윗선에 그대로 보고할게요. 책임은 본인이 져요."', rel: -10, effects: { rep: 2 }, karma: 'blame', then: [['crew', '...알겠습니다.']] },
      { label: '"내가 확인 못 한 거예요. 내가 책임질게요."', rel: 9, effects: { rep: -3, mental: -2 }, karma: 'cover', then: [['crew', '파트장님...']] }
    ] },
  { id: 'credit', place: '팀장님 자리 옆', lines: [['lead', '{me}, 이번에 파트에서 올린 거 좋던데요. 누가 한 거예요?']],
    choices: [
      { label: '"저희 팀원이 다 했습니다. 이름 기억해 주세요."', act: 'creditCrew', rel: 5, karma: 'credit', effects: { rep: 1 }, then: [['lead', '그래요? 좋은 파트장이네.']] },
      { label: '"제가 방향 잡고 마무리했습니다."', act: 'creditMe', effects: { rep: 4 }, then: [['lead', '역시. 다음 건도 부탁해요.']] }
    ] },
  { id: 'leave', place: '내 자리', lines: [['crew', '파트장님, 내일... 아니 오늘 오후 반차 써도 될까요? 아이가 아파서요.']],
    choices: [
      { label: '"당연하죠. 얼른 가 봐요. 남은 건 내가 볼게요."', act: 'off', rel: 8, karma: 'fair', then: [['crew', '감사합니다! 이 은혜 꼭 갚을게요.']] },
      { label: '"오늘 마감 있는 거 끝내고 가요."', rel: -6, then: [['crew', '...네, 끝내고 갈게요.']] }
    ] },
  { id: 'quit', place: '회의실 C', need: 'cold', lines: [['crew', '파트장님, 드릴 말씀이 있어요.'], ['crew', '...다른 회사에서 제안이 왔어요. 고민 중이에요.']],
    choices: [
      { label: '"뭐가 힘들었는지 먼저 들어 볼게요."', rel: 25, minutes: 40, effects: { mental: -3 }, then: [['crew', '사실... 일이 몰리는 게 제일 힘들었어요. 그래도 들어 주셔서 좀 낫네요.']] },
      { label: '"연봉 협상해 볼게요. 남아 줘요."', rel: 15, effects: { rep: -2 }, then: [['crew', '...한번 생각해 볼게요.']] },
      { label: '"본인 커리어니까 가는 게 맞으면 가요."', act: 'leaveCo', then: [['crew', '네. 그동안 감사했습니다.']] }
    ] },
  { id: 'idea', place: '탕비실', lines: [['crew', '파트장님, 이거 한번 봐 주실래요? 업무 자동화 아이디어인데요.'], ['crew', '반복 작업 엑셀 매크로로 돌리면 하루 1시간은 아낄 수 있을 것 같아요.']],
    choices: [
      { label: '"좋네요. 다음 회의 때 직접 발표해 봐요."', act: 'creditCrew', rel: 6, karma: 'grow', effects: { perf: 3 }, then: [['crew', '제가요? 해 볼게요!']] },
      { label: '"좋은데 지금은 바빠요. 나중에 봐요."', rel: -3, then: [['crew', '아, 네...']] },
      { label: '"제가 정리해서 위에 올릴게요."', act: 'creditMe', effects: { rep: 3 }, rel: -4, then: [['crew', '...네.']] }
    ] }
];

// 본부장부터: 하루 한 번 경영 판단. 사람들은 이 판단을 오래 기억한다.
// lead 역할은 그날 판단에 얽힌 팀장
window.EXEC_DECISIONS = [
  { place: '임원 회의실', lines: [['kang', '하반기 예산이 20% 깎였습니다. 어디를 줄일지 정해 주세요.']],
    choices: [
      { label: '개발 예산은 지키고 마케팅을 줄인다', relTo: { devlead: 6, salelead: -6 }, effects: { perf: 4 }, then: [['kang', '제품이 먼저라는 거군요.']] },
      { label: '모든 팀을 똑같이 20%씩 줄인다', relTo: { devlead: -2, salelead: -2, deslead: -2, park: -2 }, effects: { rep: 2 }, then: [['kang', '공평하긴 하네요. 다들 불만은 있겠지만.']] },
      { label: '영업 예산을 늘리고 나머지를 줄인다', relTo: { salelead: 8, devlead: -5, deslead: -5 }, effects: { perf: 6, rep: -2 }, then: [['kang', '매출로 증명해야겠네요.']] }
    ] },
  { place: '임원 회의실', lines: [['devlead', '본부장님, 결제 장애가 났습니다. 고객 3천 명이 결제를 못 했어요.']],
    choices: [
      { label: '바로 공지하고 사과, 보상 쿠폰 지급', relTo: { yoon: 6, devlead: 3 }, effects: { rep: 4, perf: -2 }, then: [['devlead', '고객센터 문의가 바로 줄었습니다.']] },
      { label: '조용히 고치고 문의 오는 사람만 응대', relTo: { yoon: -6 }, effects: { perf: 2 }, then: [['devlead', '...알겠습니다. 다만 커뮤니티에 글이 올라오고 있어요.']] },
      { label: '담당 개발자를 문책한다', relTo: { devlead: -10, jung: -10 }, effects: { rep: 1 }, karma: 'blame', then: [['devlead', '사람 탓만 하면 다음엔 아무도 보고 안 합니다.']] }
    ] },
  { place: '본부장실', lines: [['park', '본부장님, 요즘 야근이 너무 많아서 팀원들이 지쳤습니다.']],
    choices: [
      { label: '19시 이후 PC 강제 종료제를 도입한다', relTo: { park: 6, han: 5, kimdev: 5 }, effects: { perf: -3, mental: 3 }, then: [['park', '다들 좋아하겠네요.']] },
      { label: '대신 야근 수당을 제대로 준다', relTo: { park: 3, song: -3 }, effects: { perf: -2, rep: 2 }, then: [['park', '그나마 다행입니다.']] },
      { label: '"지금은 버텨야 할 때입니다."', relTo: { park: -6 }, effects: { perf: 4 }, karma: 'overload', then: [['park', '...전달하겠습니다.']] }
    ] },
  { place: '임원 회의실', lines: [['salelead', 'B사가 단가를 30% 깎아 주면 3년 계약을 하겠답니다.']],
    choices: [
      { label: '받는다. 물량이 중요하다', relTo: { salelead: 6, song: -4 }, effects: { perf: 6, rep: -1 }, then: [['salelead', '좋습니다! 바로 진행할게요.']] },
      { label: '15%까지만 깎아 주고 다시 협상', relTo: { salelead: 2 }, effects: { perf: 3, rep: 2 }, term: '협상', then: [['salelead', '쉽지 않겠지만 해 보겠습니다.']] },
      { label: '거절한다. 제값을 받아야 한다', relTo: { salelead: -5, song: 4 }, effects: { rep: 3, perf: -2 }, then: [['salelead', '...아깝네요.']] }
    ] },
  { place: '본부장실', lines: [['deslead', '본부장님, 저희 팀 핵심 디자이너가 경쟁사 제안을 받았답니다.']],
    choices: [
      { label: '연봉을 올려서라도 잡는다', relTo: { deslead: 6, song: -3 }, effects: { perf: -2, rep: 2 }, then: [['deslead', '감사합니다. 팀 분위기도 살 거예요.']] },
      { label: '직접 만나서 커리어 얘기를 듣는다', relTo: { deslead: 4 }, effects: { mental: -3, perf: 2 }, karma: 'grow', then: [['deslead', '본부장님이 직접 만나 주셔서 많이 놀랐대요.']] },
      { label: '보낸다. 사람은 또 뽑으면 된다', relTo: { deslead: -8 }, effects: { perf: -3 }, then: [['deslead', '...그렇게 전하겠습니다.']] }
    ] },
  { place: '임원 회의실', lines: [['kang', '대표님이 AI 신사업을 하자고 하십니다. 본부에서 사람을 빼야 해요.']],
    choices: [
      { label: '에이스를 보낸다. 신사업이 미래다', relTo: { kang: 6, devlead: -5 }, effects: { rep: 4, perf: -3 }, then: [['kang', '대표님이 좋아하시겠네요.']] },
      { label: '지원자를 받는다', relTo: { kang: 2, devlead: 2, park: 2 }, effects: { rep: 1 }, then: [['kang', '무난한 방법이네요.']] },
      { label: '지금 인력으로는 어렵다고 버틴다', relTo: { kang: -6, devlead: 4 }, effects: { perf: 3 }, then: [['kang', '대표님께 그대로 전하죠.']] }
    ] },
  { place: '본부장실', lines: [['song', '본부장님, 팀 회식비가 분기 한도를 넘었습니다.']],
    choices: [
      { label: '넘은 만큼 사비로 막고 다음 분기에 줄인다', relTo: { song: 4 }, effects: { money: -150000, rep: 2 }, then: [['song', '정산 깔끔하게 해 두겠습니다.']] },
      { label: '회식을 한 달간 금지한다', relTo: { song: 3, salelead: -4, choi: -4 }, effects: { mental: 2 }, then: [['song', '규정상 맞는 판단입니다.']] },
      { label: '"이번만 넘어가 주세요."', relTo: { song: -6 }, karma: 'rude', then: [['song', '...이번만입니다.']] }
    ] },
  { place: '로비', lines: [['guard', '본부장님, 오늘도 늦게 가시네요. 몸 좀 챙기세요.']],
    choices: [
      { label: '"감사해요. 오늘은 일찍 갈게요."', effects: { stamina: 8, mental: 4 }, then: [['guard', '그래요, 내일 봬요.']] },
      { label: '"할 일이 남아서요."', effects: { perf: 3, stamina: -5 }, then: [['guard', '...수고하세요.']] }
    ] }
];
