// 직급, 주간 인사평가, 급여, 승진 심사, 연차와 휴가 신청
(() => {
  const W = window.WNE;
  const esc = W.esc;

  // 예전 저장 파일에도 없는 값은 기본값으로 채운다
  W.initCareer = () => {
    const s = W.s;
    if (s.rank === undefined) s.rank = 0;
    if (s.points === undefined) s.points = 0;
    if (s.leave === undefined) s.leave = 2;
    if (!s.week) s.week = { workdays: 0, done: 0, missed: 0, good: 0, bad: 0 };
    if (!s.reviews) s.reviews = [];
    if (!s.level) s.level = 'easy';
    window.PEOPLE.me.rank = W.rankName();
  };

  W.rankName = () => window.RANKS[W.s.rank].name;
  W.nextRank = () => window.RANKS[W.s.rank + 1] || null;

  // 다음 날로: 금요일이 지나면 주말, 급여, 인사평가를 거친다
  W.nextDay = () => {
    const s = W.s;
    s.day++;
    if ((s.day - 1) % 5 === 0) return weeklyReview();
    W.beginDay();
  };

  W.beginDay = () => {
    W.save();
    if (W.onVacationToday()) W.startVacationDay();
    else W.startDay();
  };

  // ---------- 주간 인사평가 ----------
  function weeklyReview() {
    const s = W.s;
    const wk = s.week;
    const week = Math.ceil((s.day - 1) / 5);
    const handled = wk.done + wk.missed;
    const rate = handled ? wk.done / handled : 0;
    const rep = Math.round(s.stats.rep);
    let g = null;
    // 다면평가: 이번 주에 쌓은 덕과 업보
    const good = wk.good || 0;
    const bad = wk.bad || 0;
    let peer = 0;
    if (good - bad >= 4) peer = 1;
    else if (bad - good >= 4) peer = -1;
    let bonus = 0;
    const bonusNotes = [];
    if (s.flags.parkProject && !s.flags.parkProjectPaid) {
      s.flags.parkProjectPaid = true;
      bonus++;
      bonusNotes.push('팀장님이 맡긴 신규 프로젝트를 고과에 반영했다. +1');
    }
    if (wk.workdays > 0) {
      g = window.GRADES.find((x) => rate >= x.rate && rep >= x.rep);
      s.points = Math.max(0, s.points + g.points + peer + bonus);
    }
    if (s.flags.runClub) { W.applyEffects({ mental: 5 }); bonusNotes.push('러닝 동호회로 주말에 개운했다. 멘탈 +5'); }
    const pay = window.RANKS[s.rank].pay;
    W.applyEffects({ stamina: 15, mental: 15, money: pay });
    s.leave++;
    s.reviews.unshift({ week, grade: g ? g.grade : '-', rate: Math.round(rate * 100), done: wk.done, missed: wk.missed, rank: W.rankName() });
    s.week = { workdays: 0, done: 0, missed: 0, good: 0, bad: 0 };
    W.learnTerms('{{인사평가}} {{고과}}');

    const next = W.nextRank();
    const ready = next && s.points >= next.need;
    const gradeHtml = g
      ? `<div class="grade grade-${g.grade}">${g.grade}</div><p>${esc(g.comment)}</p>
        <table class="summary">
          <tr><td>근무일</td><td>${wk.workdays}일</td></tr>
          <tr><td>처리한 업무</td><td>${wk.done}건</td></tr>
          <tr><td>놓치거나 반려된 업무</td><td>${wk.missed}건</td></tr>
          <tr><td>처리율</td><td>${Math.round(rate * 100)}%</td></tr>
          <tr><td>평판</td><td>${rep}</td></tr>
          <tr><td>다면평가 (덕 ${good} · 업보 ${bad})</td><td>${peer > 0 ? '+1 동료들이 좋게 봤다' : peer < 0 ? '−1 뒷말이 많았다' : '0'}</td></tr>
          <tr><td>승진 포인트</td><td>${g.points + peer + bonus >= 0 ? '+' : ''}${g.points + peer + bonus} → ${s.points}${next ? ' / ' + next.need : ''}</td></tr>
        </table>${bonusNotes.map((n) => `<p class="up">${esc(n)}</p>`).join('')}`
      : '<p>이번 주는 내내 휴가였다. 평가는 다음 주에.</p>';
    W.openModal(`<p class="eyebrow">${week}주차 마감 · 주말</p><h3>주간 ${W.rich('{{인사평가}}')}</h3>
      ${gradeHtml}
      <p class="up">급여 입금 +${W.fmtMoney(pay)} · 주말 휴식 체력·멘탈 +15 · ${W.rich('{{연차}}')} +1일 (남은 연차 ${s.leave}일)</p>
      <p class="hint">평가 기준: 처리율과 평판. S·A를 받으면 승진 포인트가 많이 쌓여요.</p>`,
    [{ label: ready ? (next.open ? `${next.name} 승진 심사 보러 가기` : '다음 주 출근') : '다음 주 출근', onClick: () => {
      W.closeModal();
      if (ready && next.open) return promotionInterview();
      if (ready && !next.open) W.toast(`${next.name}부터는 팀을 맡아 업무를 배당하는 단계예요. 다음 업데이트에서 열립니다.`);
      W.beginDay();
    } }]);
  }

  // ---------- 승진 심사: 실무 용어 면접 ----------
  function promotionInterview() {
    const s = W.s;
    const next = W.nextRank();
    const all = Object.keys(window.TERMS);
    const known = s.glossary.filter((t) => window.TERMS[t]);
    const pool = known.length >= 3 ? known : all;
    const questions = W.shuffle(pool).slice(0, 3);
    let right = 0;
    // 면접관과의 관계가 심사 분위기를 바꾼다
    const bossRel = (W.rel('choi') + W.rel('kang') + W.rel(W.lead())) / 3;
    const ally = s.flags.choiPick || bossRel >= 20;
    const foe = !ally && bossRel <= -20;
    const mood = ally ? '최영수 부장님이 "이 친구 괜찮아요"라며 분위기를 풀어 준다. (보기 하나가 줄어요)'
      : foe ? '면접관들 표정이 굳어 있다. 평소 관계가 안 좋았다. (보기가 하나 늘어요)' : '';

    const ask = (i) => {
      if (i >= questions.length) return result();
      const term = questions[i];
      const wrong = W.shuffle(all.filter((t) => t !== term)).slice(0, ally ? 1 : foe ? 3 : 2);
      const opts = W.shuffle([term, ...wrong]);
      W.openModal(`<p class="eyebrow">${next.name} 승진 심사 · 질문 ${i + 1}/3</p>
        <h3>"${esc(term)}"이 무슨 뜻인지 설명해 보세요.</h3>
        <p class="hint">면접관: ${s.rank >= 5 ? '강태호 이사, 대표이사' : '최영수 부장, 강태호 이사'}</p>${mood ? `<p class="${ally ? 'up' : 'down'}">${esc(mood)}</p>` : ''}`,
      opts.map((t) => ({ label: window.TERMS[t].meaning, onClick: () => {
        if (t === term) right++;
        ask(i + 1);
      } })));
    };

    const result = () => {
      if (right >= 2) {
        s.rank++;
        s.points = 0;
        s.leave++;
        window.PEOPLE.me.rank = W.rankName();
        s.promotedTo = W.rankName();
        W.applyEffects({ mental: 15, rep: 5 });
        W.openModal(`<p class="eyebrow">인사 발령</p><h3>${esc(W.rankName())} 승진을 축하합니다</h3>
          <p>심사 ${right}/3 정답. 다음 주부터 ${esc(s.name)} ${esc(W.rankName())}님이다.</p>
          <p class="up">급여 ${W.fmtMoney(window.RANKS[s.rank].pay)} · 연차 +1일 · 멘탈 +15 · 평판 +5</p>
          <p class="hint">직급이 오를수록 출근 때 쌓인 업무와 요청이 늘어나요.</p>`,
        [{ label: '출근하기', onClick: () => { W.closeModal(); W.onPromoted(() => W.beginDay()); } }]);
      } else {
        s.points = Math.max(0, s.points - 1);
        W.openModal(`<p class="eyebrow">승진 심사 결과</p><h3>이번에는 보류</h3>
          <p>심사 ${right}/3 정답. "실무 용어부터 좀 더 다져 오세요."</p>
          <p class="down">승진 포인트 −1. 용어집을 복습하고 다음 주에 다시 도전하세요.</p>`,
        [{ label: '출근하기', onClick: () => { W.closeModal(); W.beginDay(); } }]);
      }
    };
    ask(0);
  }

  // ---------- 휴가 신청서 ----------
  W.openLeaveForm = () => {
    const s = W.s;
    if (s.phase !== 'work' && s.phase !== 'overtime') return W.toast('근무 시간에만 신청할 수 있어요.');
    if (s.vacation) return W.toast('이미 잡힌 휴가가 있어요.');
    if (s.leave < 1) return W.toast('남은 연차가 없어요. 금요일 평가 때 1일씩 생겨요.');
    W.pause();
    const D = window.DESTINATIONS;
    const maxDays = Math.min(3, s.leave);
    const est = (k, n) => D[k].cost + D[k].perDay * n;
    W.openModal(`<p class="eyebrow">전자결재 · 휴가신청서</p><h3>휴가 신청</h3>
      <div class="leave-form">
        <span class="label">기간 (내일부터)</span>
        <div class="seg">${[1, 2, 3].map((n) => `<label><input type="radio" name="lv-days" value="${n}" ${n === 1 ? 'checked' : ''} ${n > maxDays ? 'disabled' : ''}> ${n}일</label>`).join('')}
          <span class="muted">남은 ${W.rich('{{연차}}')} ${s.leave}일</span></div>
        <span class="label">어디서 쉴까</span>
        <div class="dest-list">${Object.entries(D).map(([k, d], i) => `<label class="dest">
          <input type="radio" name="lv-dest" value="${k}" ${i === 0 ? 'checked' : ''}>
          <span><strong>${esc(d.label)}</strong> <small class="muted">${esc(d.places.join(', '))}</small><br>
          <small>${esc(d.desc)}</small><br><small class="muted">예상 경비 1일 ${W.fmtMoney(est(k, 1))} · 3일 ${W.fmtMoney(est(k, 3))}</small></span></label>`).join('')}</div>
        <span class="label">${W.rich('{{인수인계}}')} 준비</span>
        <label class="check"><input type="checkbox" id="lv-auto" checked> ${W.rich('{{부재중 자동응답}}')} 설정</label>
        <label class="check"><input type="checkbox" id="lv-doc" checked> 인수인계서 작성하기 (업무 하나가 추가돼요. 잘 쓸수록 휴가 중 연락이 줄어요)</label>
        <label class="label" for="lv-deputy">${W.rich('{{직무대행}}')}</label>
        <select id="lv-deputy" class="input">
          ${[...new Set([W.mate(), W.mate() === 'han' ? 'lee' : 'han'])].map((id) => `<option value="${id}">${esc(W.fullName(id))} (${esc(W.person(id).dept)})</option>`).join('')}
          <option value="">지정 안 함</option>
        </select>
        <p class="hint">결재선: ${esc(W.fullName(W.lead()))}. 지금 가진 돈 ${W.fmtMoney(s.stats.money)}. 경비는 출발할 때와 매일 빠져나가요.</p>
        ${W.pendingKarma().length || s.tasks.length ? `<div class="karma-box"><span class="label">휴가 전에 확인</span>
          <p>휴가 중 연락으로 돌아올 수 있는 일: 쌓인 업보 ${W.pendingKarma().length}건${s.tasks.length ? `, 오늘 퇴근 전까지 못 끝내면 업무함 ${s.tasks.length}건도` : ''}.</p></div>` : ''}
      </div>`,
    [
      { label: '휴가신청서 상신하기', onClick: () => {
        const days = Number((W.$('input[name="lv-days"]:checked') || {}).value || 1);
        const dest = (W.$('input[name="lv-dest"]:checked') || {}).value || 'home';
        if (est(dest, days) > s.stats.money) return W.toast(`경비 ${W.fmtMoney(est(dest, days))}가 필요해요. 돈이 모자라요.`);
        const plan = { days, dest, auto: W.$('#lv-auto').checked, doc: W.$('#lv-doc').checked, deputy: W.$('#lv-deputy').value };
        W.closeModal();
        submitLeave(plan);
        W.resume();
      } },
      { label: '취소', onClick: () => { W.closeModal(); W.resume(); } }
    ]);
  };

  function submitLeave(plan) {
    const s = W.s;
    const d = window.DESTINATIONS[plan.dest];
    const doc = { id: W.uid(), title: `연차 ${plan.days}일 (${d.label})`, docType: '휴가신청서', amount: 0, status: '결재 대기', reason: '', at: s.minute };
    s.approvals.unshift(doc);
    s.queue.push({ at: s.minute + 15 + W.rand(20), kind: 'leave', data: { doc, plan } });
    s.queue.sort((a, b) => a.at - b.at);
    W.learnTerms('{{연차}} {{인수인계}}');
    W.toast('휴가신청서를 상신했어요. 팀장님 결재를 기다리는 중.');
    if (s.view === 'approvals' || s.view === 'hr') W.renderMain();
  }

  W.resolveLeave = ({ doc, plan }) => {
    const s = W.s;
    if (doc.status !== '결재 대기') return;
    if (s.stats.rep < 30) {
      doc.status = '반려';
      doc.reason = '평판이 너무 낮음';
      W.msg.post(W.lead(), W.lead(), '{me}, 요즘 일 처리가 좀 밀려 있는 것 같은데... 휴가는 다음 주에 다시 얘기해요.');
      if (s.view === 'approvals' || s.view === 'hr') W.renderMain();
      return;
    }
    doc.status = '승인';
    const d = window.DESTINATIONS[plan.dest];
    s.vacation = { ...plan, place: W.pick(d.places), start: s.day + 1, handoverQ: 0, souvenir: false, log: [], contacts: 0, replied: 0 };
    s.leave -= plan.days;
    W.msg.post(W.lead(), W.lead(), plan.days >= 3
      ? '휴가 승인했어요. 3일이나... 아니 잘 다녀와요. {{인수인계}}는 확실히 해 주고요.'
      : '휴가 승인했어요. 잘 쉬고 와요. 가기 전에 {{인수인계}}만 부탁해요.');
    if (plan.doc) {
      setTimeout(() => W.addTask(W.gen.handover(plan.deputy), true, W.lead()), 800);
    }
    if (s.view === 'approvals' || s.view === 'hr') W.renderMain();
    W.renderChrome();
  };

  // ---------- 인사·근태 화면 ----------
  W.renderHR = (main) => {
    const s = W.s;
    const next = W.nextRank();
    const pct = next ? Math.min(100, Math.round((s.points / next.need) * 100)) : 100;
    const weekday = (s.day - 1) % 5;
    const v = s.vacation;
    const vacInfo = v
      ? `<p><strong>${esc(window.DESTINATIONS[v.dest].label)}</strong> · ${esc(v.place)} · ${v.days}일 (${v.start}일차부터)</p>
        <p class="hint">${s.phase === 'vacation' ? '휴가 중입니다.' : '내일부터 휴가예요. 오늘 업무는 마무리하고 가세요.'}</p>`
      : `<p>남은 ${W.rich('{{연차}}')} <strong>${s.leave}일</strong></p>
        <button type="button" class="btn primary" data-leave-form ${s.phase === 'work' || s.phase === 'overtime' ? '' : 'disabled'}>휴가 신청하기</button>
        <p class="hint">휴가는 내일부터 1~3일. 연차는 매주 금요일 평가 때 1일, 승진할 때 1일씩 생겨요.</p>`;
    main.innerHTML = `
      <div class="home-grid">
        <section class="card"><div class="card-head"><h2>내 인사 정보</h2></div>
          <div class="profile-top">${W.avatar('me', 'lg')}<div><strong>${esc(s.name)}</strong><span>${esc(s.job)}팀 · ${esc(W.rankName())}</span></div></div>
          <table class="summary">
            <tr><td>직급</td><td>${esc(W.rankName())}</td></tr>
            <tr><td>급여 (매주 금요일 뒤)</td><td>${W.fmtMoney(window.RANKS[s.rank].pay)}</td></tr>
            <tr><td>이번 주 평가까지</td><td>${s.phase === 'vacation' ? '-' : `${5 - weekday}일 (금요일 퇴근 후)`}</td></tr>
            <tr><td>이번 주 처리 / 놓침</td><td>${s.week.done + s.done}건 / ${s.week.missed + s.missed}건</td></tr>
          </table>
          <p class="label">승진 포인트 ${s.points}${next ? ' / ' + next.need + ` (다음 직급: ${next.name})` : ''}</p>
          <div class="bar wide"><span class="fill" style="width:${pct}%"></span></div>
          <p class="hint">${W.rich('{{인사평가}}')} 등급마다 포인트가 쌓여요. S +3, A +2, B +1, C 0, D −1. 포인트가 차면 승진 심사(실무 용어 면접)를 봅니다.</p>
        </section>
        <section class="card"><div class="card-head"><h2>근태 · 휴가</h2></div>${vacInfo}</section>
        ${W.transferCard()}
        ${W.ledgerCard()}
        ${W.relationCard()}
        <section class="card"><div class="card-head"><h2>직급 체계</h2></div>
          <ol class="ladder">${window.RANKS.map((r, i) => `<li class="${i === s.rank ? 'now' : i < s.rank ? 'past' : ''} ${r.open ? '' : 'locked'}">
            <span>${esc(r.name)}</span><span class="muted">${W.fmtMoney(r.pay)}</span>${i === s.rank ? '<span class="chip good">현재</span>' : ''}${r.open ? '' : '<span class="chip">준비 중</span>'}</li>`).reverse().join('')}</ol>
          <p class="hint">차장부터는 팀을 맡아 업무를 배당합니다. 다음 업데이트에서 열려요.</p>
        </section>
        <section class="card"><div class="card-head"><h2>평가 기록</h2></div>
          ${s.reviews.length ? `<table class="board"><thead><tr><th>주차</th><th>등급</th><th>처리율</th><th>처리 / 놓침</th></tr></thead><tbody>
            ${s.reviews.map((r) => `<tr><td>${r.week}주차</td><td><span class="grade-chip grade-${r.grade}">${r.grade}</span></td><td>${r.rate}%</td><td>${r.done} / ${r.missed}</td></tr>`).join('')}</tbody></table>`
            : '<p class="empty">첫 평가는 금요일 퇴근 후에 나와요.</p>'}
        </section>
      </div>`;
  };
})();
