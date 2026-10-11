// 부서별 차이: 팀장·선배, 팀 전용 업무(분류, 견적서), 부서 이동(전보)
(() => {
  const W = window.WNE;
  const A = W.apps;
  const G = W.gen;
  const esc = W.esc;
  const ui = (task, key, fallback = '') => (task.ui[key] !== undefined ? task.ui[key] : fallback);

  W.team = () => window.TEAMS[(W.s && W.s.job) || '기획'] || window.TEAMS.기획;
  W.lead = () => W.team().lead;
  W.mate = () => W.team().mate;

  // 팀 이름과 단톡방, 내 프로필 부서를 지금 팀에 맞춘다
  W.applyTeam = () => {
    const t = W.team();
    window.PEOPLE.me.dept = t.label;
    window.ROOMS_EXTRA.team = { name: `${t.label} 단톡방`, members: [t.lead, t.mate, 'me'], color: 1 };
    if (W.s && W.s.rooms && W.s.rooms.team) W.s.rooms.team.name = window.ROOMS_EXTRA.team.name;
  };

  // 기획팀 기준으로 쓰인 데이터(박 팀장, 이 대리)를 지금 팀의 팀장과 선배로 바꾼다
  W.teamPerson = (id) => {
    if (W.s.job === '기획' || !W.s.job) return id;
    if (id === 'park') return W.lead();
    if (id === 'lee') return W.mate();
    return id;
  };

  W.TYPE_LABEL.classify = '분류';
  W.TYPE_LABEL.quote = '견적서';

  // ---------- 팀 전용 업무 고르기 ----------
  const forTeam = (pool) => pool.filter((t) => !t.teams || t.teams.includes(W.s.job));
  const pickTeam = (base, extra) => {
    const own = forTeam(extra);
    return own.length && Math.random() < 0.6 ? W.pick(own) : W.pick(base.filter((t) => !t.teams || t.teams.includes(W.s.job)));
  };
  const fromPool = (type, base, extra, more = {}) => () => {
    const t = pickTeam(base, extra);
    // 팀 전용 업무는 사람 그대로, 공통 업무(기획팀 기준)는 지금 팀 사람으로 바꾼다
    const map = t.teams ? (id) => id : W.teamPerson;
    const data = JSON.parse(JSON.stringify(t));
    if (data.to) { data.to = data.to.map(map); data.cc = data.cc.map(map); }
    return { type, minutes: 10, deadline: 150 + W.rand(90), ...more, ...t, from: map(t.from), data };
  };
  G.review = fromPool('review', window.REVIEW_TASKS, window.TEAM_REVIEW);
  G.reorder = fromPool('reorder', window.REORDER_DOCS, window.TEAM_REORDER, { minutes: 15 });
  G.mail = fromPool('mail', window.MAIL_TASKS, window.TEAM_MAIL);

  // ---------- 분류 업무 ----------
  G.classify = () => {
    const key = W.team().classify || 'bug';
    const c = window.CLASSIFY_TASKS[key];
    const items = W.shuffle(c.items).slice(0, 5);
    return {
      type: 'classify',
      title: c.title,
      from: W.pick([W.lead(), W.mate()]),
      minutes: 10,
      deadline: 150 + W.rand(60),
      brief: c.brief,
      data: { choices: c.choices, items }
    };
  };

  A.classify = {
    render(task, el, finish) {
      const d = task.data;
      el.innerHTML = `
        <div class="table-wrap"><table class="sheet classify">
          <thead><tr><th>항목</th>${d.choices.map((c) => `<th>${W.rich(c)}</th>`).join('')}</tr></thead>
          <tbody>${d.items.map((it, i) => `<tr><td>${W.rich(it.text)}</td>${d.choices.map((c, j) => `<td class="center">
            <input type="radio" name="cl${i}" data-ui="c${i}" value="${j}" ${String(ui(task, 'c' + i)) === String(j) ? 'checked' : ''} aria-label="${esc(W.plain(it.text))}: ${esc(W.plain(c))}"></td>`).join('')}</tr>`).join('')}
          </tbody></table></div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">분류 결과 공유하기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errors = [];
        let ok = 0;
        d.items.forEach((it, i) => {
          if (String(ui(task, 'c' + i)) === String(it.answer)) ok++;
          else errors.push(`"${W.plain(it.text)}" → ${W.plain(d.choices[it.answer])}. ${it.why}`);
        });
        finish(ok / d.items.length, errors.length ? '다시 볼 것: ' + errors.join(' / ') : '분류 완벽해요. 다들 이걸 보고 움직일 거예요.');
      });
    }
  };

  // ---------- 영업 견적서 ----------
  G.quote = () => {
    const client = W.pick(window.QUOTE_CLIENTS);
    const items = W.shuffle(window.QUOTE_PRODUCTS).slice(0, 3).map((p) => ({ name: p.name, unit: p.unit, qty: W.pick(p.qty) }));
    const rate = W.pick([5, 10, 15]);
    return {
      type: 'quote',
      title: `${client} 견적서 작성`,
      from: W.lead(),
      minutes: 15,
      deadline: 160 + W.rand(60),
      brief: `${client}에 보낼 견적서를 채워 주세요. 이번 건은 {{할인율}} ${rate}%로 해 주기로 했어요. {{공급가액}}에 {{부가세}} 10%를 더해서 합계를 내 주세요.`,
      data: { client, items, rate }
    };
  };

  A.quote = {
    render(task, el, finish) {
      const d = task.data;
      const help = W.level().help
        ? '<p class="hint help">계산 순서: 금액 = 단가 × 수량 → 소계 = 금액의 합 → 할인액 = 소계 × 할인율 → 공급가액 = 소계 − 할인액 → 부가세 = 공급가액 × 0.1 → 합계 = 공급가액 + 부가세</p>' : '';
      const cell = (key, label) => `<input class="cell-input" inputmode="numeric" data-ui="${key}" value="${esc(ui(task, key))}" aria-label="${esc(label)}">`;
      el.innerHTML = `${help}
        <div class="doc-paper"><p class="doc-title">견 적 서</p><p class="hint">수신: ${esc(d.client)} 귀중 · 발신: (주)워크네버엔드 영업팀</p>
        <div class="sheet-wrap"><table class="sheet">
          <thead><tr><th>품목</th><th>단가(원)</th><th>수량</th><th>금액(원)</th></tr></thead>
          <tbody>${d.items.map((it, i) => `<tr><td>${esc(it.name)}</td><td class="num">${W.fmtNum(it.unit)}</td><td class="num">${it.qty}</td><td>${cell('q' + i, it.name + ' 금액')}</td></tr>`).join('')}
            <tr class="sum"><td colspan="3">{{소계}}</td><td>${cell('sub', '소계')}</td></tr>
            <tr class="sum"><td colspan="3">할인 (${d.rate}%)</td><td>${cell('disc', '할인액')}</td></tr>
            <tr class="sum"><td colspan="3">{{공급가액}}</td><td>${cell('supply', '공급가액')}</td></tr>
            <tr class="sum"><td colspan="3">{{부가세}} (10%)</td><td>${cell('vat', '부가세')}</td></tr>
            <tr class="sum total"><td colspan="3">합계</td><td>${cell('total', '합계')}</td></tr>
          </tbody></table></div></div>
        <div class="calc"><label for="calc-input">계산기</label>
          <input id="calc-input" class="input" data-ui="calc" value="${esc(ui(task, 'calc'))}" placeholder="예: 1200000*5" autocomplete="off">
          <output id="calc-out"></output></div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">견적서 확정하기</button></div>`;
      el.innerHTML = el.innerHTML.replace(/\{\{(.+?)\}\}/g, (_, t) => (window.TERMS[t] ? `<button type="button" class="term" data-term="${t}">${t}</button>` : t));
      const ci = el.querySelector('#calc-input');
      const out = el.querySelector('#calc-out');
      const show = () => { const v = ci.value ? W.calc(ci.value) : null; out.textContent = ci.value ? (v === null ? '= ?' : '= ' + v.toLocaleString('ko-KR')) : '= '; };
      ci.addEventListener('input', show);
      show();
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const sub = d.items.reduce((a, it) => a + it.unit * it.qty, 0);
        const disc = Math.round(sub * d.rate / 100);
        const supply = sub - disc;
        const vat = Math.round(supply * 0.1);
        const total = supply + vat;
        const want = [...d.items.map((it, i) => ['q' + i, it.unit * it.qty, it.name + ' 금액']), ['sub', sub, '소계'], ['disc', disc, '할인액'], ['supply', supply, '공급가액'], ['vat', vat, '부가세'], ['total', total, '합계']];
        const errors = [];
        let ok = 0;
        want.forEach(([k, v, label]) => { if (W.parseNum(ui(task, k)) === v) ok++; else errors.push(`${label}는 ${W.fmtNum(v)}원`); });
        finish(ok / want.length, errors.length ? '고칠 곳: ' + errors.join(' / ') + '.' : `완벽한 견적서. 합계 ${W.fmtMoney(total)}으로 나갑니다.`);
      });
    }
  };

  // ---------- 부서 이동 (전보) ----------
  W.openTransfer = () => {
    const s = W.s;
    if (s.phase !== 'work' && s.phase !== 'overtime') return W.toast('근무 시간에만 신청할 수 있어요.');
    if (s.transfer) return W.toast('이미 부서 이동을 신청했어요.');
    W.pause();
    const others = Object.entries(window.TEAMS).filter(([k]) => k !== s.job);
    W.openModal(`<p class="eyebrow">전자결재 · 전보신청서</p><h3>부서 이동 신청</h3>
      <p>사내 공모로 다른 팀에 지원합니다. 결재가 나면 다음 출근일부터 새 팀으로 출근해요.</p>
      <ul class="plain-list">
        <li>평판 40 이상이어야 승인돼요. (지금 ${Math.round(s.stats.rep)})</li>
        <li>지금 팀장님(${esc(W.fullName(W.lead()))})은 서운해할 수 있어요. 호감도가 떨어져요.</li>
        <li>새 팀에 적응하느라 승진 포인트가 1 줄어요. 새 팀 사람들과는 처음부터 다시 관계를 쌓아요.</li>
      </ul>
      <p class="hint">${W.rich('{{전보}}')}: 같은 회사 안에서 부서를 옮기는 것.</p>`,
    [
      ...others.map(([k, t]) => ({ label: `${t.label}으로 지원 (${t.desc})`, onClick: () => { W.closeModal(); submitTransfer(k); W.resume(); } })),
      { label: '취소', onClick: () => { W.closeModal(); W.resume(); } }
    ]);
  };

  function submitTransfer(to) {
    const s = W.s;
    const t = window.TEAMS[to];
    const doc = { id: W.uid(), title: `${t.label} 전보 신청`, docType: '전보신청서', amount: 0, status: '결재 대기', reason: '', at: s.minute };
    s.approvals.unshift(doc);
    s.queue.push({ at: s.minute + 20 + W.rand(20), kind: 'transfer', data: { doc, to } });
    s.queue.sort((a, b) => a.at - b.at);
    W.learnTerms('{{전보}}');
    W.toast(`${t.label} 전보신청서를 상신했어요.`);
    if (s.view === 'hr' || s.view === 'approvals') W.renderMain();
  }

  W.resolveTransfer = ({ doc, to }) => {
    const s = W.s;
    if (doc.status !== '결재 대기') return;
    const lead = W.lead();
    if (s.stats.rep < 40) {
      doc.status = '반려';
      doc.reason = '평판 부족';
      W.msg.post('choi', 'choi', '{me}, 전보 신청 봤어. 지금 팀에서 먼저 인정받고 와.');
    } else {
      doc.status = '승인';
      s.transfer = { to, from: s.job };
      W.msg.post(lead, lead, '...전보 신청 봤어요. 아쉽지만 잘 가요. 남은 일은 마무리하고요.');
      W.addRel(lead, -8);
      W.karma('transfer', lead, '', W.person(lead).name);
    }
    if (s.view === 'hr' || s.view === 'approvals') W.renderMain();
  };

  // 출근할 때 전보가 있으면 적용한다. 아침 안내 문장을 돌려준다.
  W.applyTransfer = () => {
    const s = W.s;
    if (!s.transfer) return [];
    const { to, from } = s.transfer;
    s.transfer = null;
    s.job = to;
    s.points = Math.max(0, s.points - 1);
    if (!s.pastTeams) s.pastTeams = [];
    if (!s.pastTeams.includes(from)) s.pastTeams.push(from);
    W.applyTeam();
    const t = W.team();
    W.addRel(t.lead, 5);
    W.addRel(t.mate, 5);
    setTimeout(() => {
      W.msg.post('team', t.lead, `오늘부터 ${t.label}에 합류한 ${W.meName()}입니다. 다들 잘 부탁해요!`);
      W.msg.post('team', t.mate, '환영해요~ 모르는 거 있으면 저한테 물어봐요!');
    }, 500);
    return [`오늘부터 ${t.label}으로 출근한다. 자리도, 사람도, 업무도 새롭다. (승진 포인트 −1)`];
  };

  W.transferCard = () => {
    const s = W.s;
    const t = W.team();
    const pending = s.transfer ? `<p class="up">${esc(window.TEAMS[s.transfer.to].label)} 전보 승인. 다음 출근일부터 새 팀이에요.</p>` : '';
    return `<section class="card"><div class="card-head"><h2>부서</h2></div>
      <p>지금 부서: <strong>${esc(t.label)}</strong> · 팀장 ${esc(W.fullName(t.lead))}</p>
      ${s.pastTeams && s.pastTeams.length ? `<p class="hint">거쳐 온 부서: ${s.pastTeams.map((k) => esc(window.TEAMS[k].label)).join(', ')}</p>` : ''}
      ${pending || `<button type="button" class="btn" data-transfer ${s.phase === 'work' || s.phase === 'overtime' ? '' : 'disabled'}>부서 이동 신청하기</button>`}
      <p class="hint">팀마다 업무가 달라요. 개발팀은 버그 분류와 배포, 디자인팀은 피드백 정리와 검수, 영업팀은 견적서와 리드 관리.</p></section>`;
  };
})();
