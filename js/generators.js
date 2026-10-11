// 업무 만들기. 캘린더·예산·보고서·전자결재 업무는 매번 숫자와 상황을 바꿔서 만든다.
(() => {
  const W = window.WNE;
  const G = W.gen;

  W.TYPE_LABEL = {
    schedule: '일정 조율',
    reorder: '문서 구성',
    budget: '예산 계산',
    approval: '전자결재',
    report: '보고서 작성',
    mail: '메일',
    review: '문서 검토',
    match: '자료 준비',
    typing: '문서 작성'
  };

  // ---------- 팀 캘린더 ----------
  // 일정: { id, day(0=월~4=금), start(시), dur(시간), title, people[] }
  const overlaps = (a, b) => a.day === b.day && a.start < b.start + b.dur && b.start < a.start + a.dur;
  const hitsLunch = (e) => e.start < 13 && 12 < e.start + e.dur;
  W.overlaps = overlaps;
  W.hitsLunch = hitsLunch;

  G.calendar = () => {
    const seeds = [
      { title: '주간회의', people: ['park', 'lee', 'me'], dur: 1, day: 0, start: 10 },
      { title: '외근 (A사 방문)', people: ['park'], dur: 3 },
      { title: '임원 보고', people: ['park', 'choi'], dur: 1 },
      { title: '본부 회의', people: ['choi'], dur: 2 },
      { title: '임원회의', people: ['choi', 'kang'], dur: 2 },
      { title: '스프린트 회의', people: ['jung'], dur: 2 },
      { title: '코드 리뷰', people: ['jung'], dur: 1 },
      { title: '디자인 리뷰', people: ['lee', 'han'], dur: 1 },
      { title: '반차 (오후)', people: ['lee'], dur: 5, start: 13 },
      { title: '고객 인터뷰', people: ['han'], dur: 2 },
      { title: '쿠폰 기능 회의', people: ['park', 'jung', 'me'], dur: 1 },
      { title: '1:1 면담', people: ['park', 'me'], dur: 1 }
    ];
    const events = [];
    seeds.forEach((sd) => {
      for (let tries = 0; tries < 20; tries++) {
        const e = {
          id: W.uid(),
          title: sd.title,
          people: sd.people,
          dur: sd.dur,
          day: sd.day !== undefined ? sd.day : W.rand(5),
          start: sd.start !== undefined ? sd.start : 9 + W.rand(9 - sd.dur)
        };
        if (sd.start === undefined && hitsLunch(e)) continue;
        const clash = events.some((o) => overlaps(o, e) && o.people.some((p) => e.people.includes(p)));
        if (!clash) { events.push(e); break; }
      }
    });
    return events;
  };

  const SCHEDULE_TITLES = ['신규 이벤트 {{킥오프}}', '쿠폰 기능 리뷰', 'VOC 대응 회의', '하반기 {{로드맵}} 점검', '배너 시안 리뷰'];
  const EXTRA_RULES = [
    { text: '이번 주 수요일 이후로', ok: (e) => e.day >= 2 },
    { text: '오후 시간대(13시 이후)로', ok: (e) => e.start >= 13 },
    { text: '오전 시간대(12시 전)로', ok: (e) => e.start + e.dur <= 12 },
    { text: '금요일은 빼고', ok: (e) => e.day !== 4 },
    { text: '퇴근 1시간 전(17시)까지 끝나게', ok: (e) => e.start + e.dur <= 17 }
  ];

  // 옮긴 자리가 맞는지 확인하고 틀렸으면 이유를 돌려준다
  W.checkSlot = (task, slot) => {
    const d = task.data;
    const ev = { day: slot.day, start: slot.start, dur: d.dur };
    if (ev.start + ev.dur > 18) return '18시를 넘겨요.';
    if (hitsLunch(ev)) return '점심시간(12~13시)과 겹쳐요.';
    const todayIdx = (W.s.day - 1) % 5;
    if (ev.day < todayIdx || (ev.day === todayIdx && ev.start * 60 <= W.s.minute)) return '이미 지난 시간이에요.';
    const clash = W.s.calendar.find((o) => o.id !== d.eventId && overlaps(o, ev) && o.people.some((p) => d.people.includes(p)));
    if (clash) return `${clash.people.filter((p) => d.people.includes(p)).map((p) => p === 'me' ? '내' : W.fullName(p) + '님').join(', ')} 일정 "${W.plain(clash.title)}"과 겹쳐요.`;
    if (!EXTRA_RULES[d.rule].ok(ev)) return `요청 조건(${EXTRA_RULES[d.rule].text})에 맞지 않아요.`;
    if (ev.day === d.origDay && ev.start === d.origStart) return '원래 시간 그대로예요.';
    return null;
  };

  G.schedule = () => {
    const pool = ['park', 'lee', 'jung', 'choi', 'han'];
    const todayIdx = (W.s.day - 1) % 5;
    for (let tries = 0; tries < 60; tries++) {
      const people = ['me', ...W.shuffle(pool).slice(0, 2 + W.rand(2))];
      const dur = Math.random() < 0.7 ? 1 : 2;
      const rule = W.rand(EXTRA_RULES.length);
      // 지금 자리는 참석자 일정과 겹치는 곳으로 잡는다 (그래서 옮겨야 한다)
      const blockers = W.s.calendar.filter((o) => o.people.some((p) => people.includes(p) && p !== 'me') && o.day > todayIdx);
      if (!blockers.length) continue;
      const b = W.pick(blockers);
      const orig = { day: b.day, start: W.clamp(b.start, 9, 18 - dur), dur };
      if (hitsLunch(orig)) continue;
      const title = W.pick(SCHEDULE_TITLES);
      const ev = { id: W.uid(), title, people, dur, day: orig.day, start: orig.start, pending: true };
      const task = { data: { eventId: ev.id, people, dur, rule, origDay: orig.day, origStart: orig.start } };
      let valid = 0;
      for (let d = 0; d < 5; d++) for (let h = 9; h <= 18 - dur; h++) if (!W.checkSlot(task, { day: d, start: h })) valid++;
      if (valid < 2) continue;
      W.s.calendar.push(ev);
      const who = people.filter((p) => p !== 'me').map((p) => W.fullName(p)).join(', ');
      return {
        type: 'schedule',
        title: `"${title}" 회의 시간 옮기기`,
        from: W.pick(people.filter((p) => p !== 'me')),
        minutes: 10,
        deadline: 150 + W.rand(90),
        brief: `참석자(${who}, 나) 모두 되는 시간으로 옮겨 주세요. 단, ${EXTRA_RULES[rule].text}. 점심시간은 피하고요.`,
        data: task.data
      };
    }
    return G.review();
  };

  // ---------- 예산 계산 ----------
  const BUDGETS = [
    {
      purpose: '기획팀 하반기 워크숍',
      items: (n) => [
        { name: '버스 대절 (왕복)', unit: 450000, qty: 1, req: true },
        { name: '점심 도시락', unit: 12000, qty: n, req: true },
        { name: '세미나실 대관', unit: 300000, qty: 1, req: true },
        { name: '단체 티셔츠', unit: 15000, qty: n, req: false },
        { name: '레크리에이션 경품', unit: 50000, qty: 6, req: false }
      ]
    },
    {
      purpose: '신규 서비스 사용자 인터뷰',
      items: (n) => [
        { name: '인터뷰 사례비', unit: 50000, qty: n, req: true },
        { name: '녹취 전사 비용', unit: 30000, qty: n, req: true },
        { name: '인터뷰룸 대관 (4시간)', unit: 200000, qty: 1, req: true },
        { name: '다과', unit: 8000, qty: n, req: false },
        { name: '참여 기념품', unit: 15000, qty: n, req: false }
      ]
    },
    {
      purpose: '11월 출석 체크 이벤트',
      items: (n) => [
        { name: '커피 쿠폰', unit: 4500, qty: n * 20, req: true },
        { name: '이벤트 배너 제작', unit: 250000, qty: 1, req: true },
        { name: '홍보 문자 발송', unit: 20, qty: 10000, req: true },
        { name: '1등 경품 (태블릿)', unit: 450000, qty: 2, req: false },
        { name: '인플루언서 홍보', unit: 300000, qty: 1, req: false }
      ]
    }
  ];

  G.budget = () => {
    const b = W.pick(BUDGETS);
    const items = b.items(10 + W.rand(4) * 4);
    const sum = (list) => list.reduce((a, it) => a + it.unit * it.qty, 0);
    const opt = items.filter((i) => !i.req);
    const keep = W.shuffle(opt).slice(0, W.rand(opt.length));
    const fit = (sum(items.filter((i) => i.req)) + sum(keep)) * 1.1;
    const limit = Math.ceil((fit + 1) / 100000) * 100000;
    return {
      type: 'budget',
      title: `${b.purpose} 예산표 작성`,
      from: 'park',
      minutes: 15,
      deadline: 180 + W.rand(60),
      brief: `견적 받은 항목으로 예산표를 채워 주세요. 견적은 모두 {{부가세}} 별도, 예산 한도는 부가세 포함 ${W.fmtMoney(limit)}이에요. 넘으면 필수 아닌 항목을 빼 주세요.`,
      data: { purpose: b.purpose, items, limit }
    };
  };

  // ---------- 전자결재 ----------
  W.approvalLine = (amount) => amount >= 5000000 ? ['park', 'choi', 'kang'] : amount >= 1000000 ? ['park', 'choi'] : ['park'];
  W.DOC_TYPES = ['품의서', '지출결의서', '휴가신청서', '출장신청서'];

  G.approval = (purpose, amount) => ({
    type: 'approval',
    title: `${purpose} {{품의}} 올리기`,
    from: 'park',
    minutes: 10,
    deadline: 120 + W.rand(60),
    brief: `방금 만든 예산표(부가세 포함 ${W.fmtMoney(amount)})로 전자결재를 올려 주세요. 돈을 쓰기 전에 승인받는 문서예요.`,
    data: { purpose, amount, docType: '품의서' }
  });

  const EXPENSES = [
    { purpose: '팀 회의 다과비 (법인카드)', amount: 128000 },
    { purpose: '고객사 미팅 식대 (법인카드)', amount: 1350000 },
    { purpose: '사용자 인터뷰 사례비 (계좌이체 완료)', amount: 600000 },
    { purpose: '외부 세미나 참가비 (법인카드)', amount: 5500000 }
  ];

  G.expense = () => {
    const e = W.pick(EXPENSES);
    return {
      type: 'approval',
      title: `${e.purpose} {{지출결의서}} 올리기`,
      from: 'song',
      minutes: 10,
      deadline: 150 + W.rand(60),
      brief: `이미 결제한 ${W.fmtMoney(e.amount)}를 비용 처리해야 해요. 알맞은 문서 양식과 {{결재선}}으로 올려 주세요.`,
      data: { purpose: e.purpose, amount: e.amount, docType: '지출결의서' }
    };
  };

  // ---------- 보고서 작성 ----------
  G.report = () => {
    if (Math.random() < 0.5) {
      // 전환율 보고: %p 를 배운다
      const v1 = W.pick([20000, 24000, 30000, 40000]);
      const c1 = W.pick([2, 2.5, 3, 4]);
      const up = Math.random() < 0.6;
      const c2 = up ? c1 + W.pick([0.5, 1, 1.5]) : c1 - W.pick([0.5, 1]);
      const v2 = v1 + W.pick([-4000, 2000, 6000]);
      const s1 = Math.round(v1 * c1 / 100);
      const s2 = Math.round(v2 * c2 / 100);
      const diff = Math.round((c2 - c1) * 10) / 10;
      return reportTask({
        title: '주간 가입 지표 보고서 작성',
        rows: [['방문자 수', W.fmtNum(v1) + '명', W.fmtNum(v2) + '명'], ['가입자 수', W.fmtNum(s1) + '명', W.fmtNum(s2) + '명']],
        notes: up ? ['10/14(화) 첫 화면에 이벤트 배너 노출 시작'] : ['10/15(수) 가입 화면 오류로 3시간 가입 불가'],
        asks: [
          { label: '이번 주 {{전환율}}', unit: '%', answer: c2, hint: '가입자 ÷ 방문자 × 100' },
          { label: '지난주 대비 변화', unit: '%p', answer: Math.abs(diff), hint: '이번 주 전환율 − 지난주 전환율 ({{퍼센트포인트}})' }
        ],
        up,
        headline: [
          `이번 주 전환율 ${c2}%로 지난주 대비 ${Math.abs(diff)}%p ${up ? '상승' : '하락'}했습니다.`,
          `이번 주 전환율 ${c2}%로 지난주 대비 ${Math.abs(diff)}%p ${up ? '하락' : '상승'}했습니다.`,
          '이번 주에도 팀원 모두 다양한 노력을 기울였습니다.'
        ],
        causes: [up ? '이벤트 배너 노출 효과' : '가입 화면 오류로 인한 가입 불가', up ? '가입 화면 오류' : '이벤트 배너 노출 효과', '사무실 이전']
      });
    }
    // 매출 보고: 증감률을 배운다
    const r1 = W.pick([200, 400, 500, 800]);
    const g = W.pick([-20, -10, 10, 25, 50]);
    const r2 = r1 * (1 + g / 100);
    const up = g > 0;
    return reportTask({
      title: '주간 매출 보고서 작성',
      rows: [['쿠폰 상품 매출', W.fmtNum(r1 * 10000) + '원', W.fmtNum(r2 * 10000) + '원']],
      notes: up ? ['10/13(월) 첫 주문 쿠폰 지급 시작'] : ['10/14(화) 경쟁사 50% 할인 행사 시작'],
      asks: [{ label: '전주 대비 매출 {{증감률}}', unit: '%', answer: Math.abs(g), hint: '(이번 주 − 지난주) ÷ 지난주 × 100' }],
      up,
      headline: [
        `이번 주 쿠폰 상품 매출 ${W.fmtNum(r2)}만 원, 전주 대비 ${Math.abs(g)}% ${up ? '증가' : '감소'}.`,
        `이번 주 쿠폰 상품 매출 ${W.fmtNum(r2)}만 원, 전주 대비 ${Math.abs(g)}% ${up ? '감소' : '증가'}.`,
        '매출 관련하여 여러 가지 상황이 있었습니다.'
      ],
      causes: [up ? '첫 주문 쿠폰 지급 효과' : '경쟁사 할인 행사', up ? '경쟁사 할인 행사' : '첫 주문 쿠폰 지급 효과', '팀장님 휴가']
    });
  };

  function reportTask(d) {
    return {
      type: 'report',
      title: d.title,
      from: W.pick(['park', 'choi']),
      minutes: 15,
      deadline: 180 + W.rand(60),
      brief: '아래 데이터로 보고서를 완성해 주세요. 첫 줄은 결론부터({{두괄식}}), 숫자는 정확하게.',
      data: d
    };
  }

  // ---------- 고정 풀에서 고르는 업무 ----------
  const fromPool = (pool, type, extra = {}) => () => {
    const t = W.pick(pool);
    return { type, minutes: 10, deadline: 150 + W.rand(90), ...extra, ...t, data: t };
  };
  G.review = fromPool(window.REVIEW_TASKS, 'review');
  G.match = fromPool(window.MATCH_TASKS, 'match');
  G.reorder = fromPool(window.REORDER_DOCS, 'reorder', { minutes: 15 });
  G.mail = fromPool(window.MAIL_TASKS, 'mail');

  // 오늘 무작위로 들어올 업무 종류와 비중
  const WEIGHTS = { schedule: 2, budget: 2, report: 2, reorder: 2, mail: 2, review: 2, match: 2, expense: 1 };
  G.random = () => {
    const bag = [];
    Object.entries(WEIGHTS).forEach(([k, n]) => { for (let i = 0; i < n; i++) bag.push(k); });
    return G[W.pick(bag)]();
  };
})();
