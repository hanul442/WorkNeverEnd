// 하루 진행, 화면 그리기, 이벤트 연결
(() => {
  const W = window.WNE;
  const C = W.C;
  const esc = W.esc;
  const $ = W.$;
  let timer = null;

  // ---------- 새 게임 / 이어하기 ----------
  function newGame(name, job, level) {
    W.s = { name, job, level, day: 1, stats: { stamina: 80, mental: 70, rep: 50, perf: 0, money: 300000 }, glossary: [], hangover: false, seq: 0 };
    W.initCareer();
    W.initRelations();
    W.initOffice();
    W.applyTeam();
    startDay();
  }

  function continueGame(saved) {
    W.s = { ...saved, seq: 0 };
    W.initCareer();
    W.initRelations();
    W.initOffice();
    W.applyTeam();
    W.beginDay();
  }

  // 하루치 상태 비우기 (출근일, 휴가일 공통)
  W.resetDay = () => {
    const s = W.s;
    Object.assign(s, {
      minute: C.DAY_START,
      phase: 'work',
      tasks: [],
      rooms: {},
      queue: [],
      calendar: [],
      approvals: [],
      docs: [],
      meetingsDone: [],
      activeTaskId: null,
      lastResult: null,
      openRoom: null,
      view: 'home',
      breaks: 0,
      lunchDone: false,
      paused: true,
      over: false,
      todayTerms: [],
      done: 0,
      missed: 0
    });
  };

  function startDay() {
    const s = W.s;
    W.resetDay();
    const morning = W.applyTransfer();
    s.calendar = W.gen.calendar();

    if (s.hangover) {
      s.stats.stamina = W.clamp(s.stats.stamina - 15, 0, 100);
      morning.push('어제 회식 여파로 머리가 깨질 것 같다. 체력 −15');
      if (Math.random() < 0.5) {
        s.minute = C.DAY_START + 20;
        s.stats.rep = W.clamp(s.stats.rep - 5, 0, 100);
        morning.push('20분 지각했다. 팀장님이 시계를 봤다. 평판 −5');
      }
      s.hangover = false;
    }
    s.dayStartStats = { ...s.stats };

    scheduleDay();
    const back = W.welcomeBack();
    if (back) morning.push(...back);
    $('#start-screen').hidden = true;
    $('#game-screen').hidden = false;
    renderAll();

    W.openModal(`<p class="eyebrow">${s.day}일차 · ${window.WEEKDAYS[(s.day - 1) % 5]}요일</p><h3>출근했습니다</h3>
      <p>업무함에 요청이 쌓여 있고, 메신저가 울리기 시작한다.</p>
      ${morning.map((m) => `<p class="down">${esc(m)}</p>`).join('')}
      <p class="hint">업무를 열어 처리하고, 메신저에 답하고, 회의에 들어가세요. 밑줄 친 용어는 눌러서 뜻을 볼 수 있어요.</p>`,
    [{ label: '업무 시작', onClick: () => { W.closeModal(); W.resume(); } }]);
  }

  // 오늘 들어올 업무와 메시지 시간표
  function scheduleDay() {
    const s = W.s;
    const q = s.queue;
    const L = W.level();
    // 직급이 오를수록 출근하자마자 쌓인 업무와 요청 빈도가 늘어난다
    for (let i = 0; i < L.initial + Math.floor(s.rank / 2); i++) W.addTask(W.gen.random(), true);
    // 업무 요청 간격: 난이도별로 다르고, 날이 갈수록 하루 5분씩, 직급 하나에 5분씩 짧아진다 (최소 30분)
    const gapMin = Math.max(30, L.gap[0] - (s.day - 1) * 5 - s.rank * 5);
    for (let t = C.DAY_START + 25 + W.rand(15); t < 17 * 60; t += gapMin + W.rand(L.gap[1])) {
      if (t >= C.LUNCH_AT && t < C.LUNCH_AT + 60) continue;
      q.push({ at: t, kind: 'task' });
    }
    W.shuffle(window.CHATS).slice(0, L.chats).forEach((c, i) => q.push({ at: C.DAY_START + 15 + i * 85 + W.rand(40), kind: 'chat', data: c }));
    W.shuffle(window.CHATTER).slice(0, 3).forEach((c, i) => q.push({ at: C.DAY_START + 5 + i * 150 + W.rand(60), kind: 'chatter', data: c }));
    W.scheduleRelations();
    W.scheduleOffice();
    W.shuffle(window.WEIRD_TASKS).slice(0, L.weird[0] + W.rand(L.weird[1] + 1)).forEach((w) => q.push({ at: C.DAY_START + 90 + W.rand(360), kind: 'weird', data: w }));
    q.sort((a, b) => a.at - b.at);
  }

  // ---------- 업무 ----------
  W.addTask = (tpl, notify = true, fromOverride = null) => {
    const s = W.s;
    const task = {
      uid: W.uid(),
      type: tpl.type,
      title: tpl.title,
      from: fromOverride || tpl.from,
      minutes: tpl.minutes || 10,
      due: s.minute + Math.round((tpl.deadline || 180) * W.level().deadline * (W.hasPerk('prep') ? 1.2 : 1)),
      brief: tpl.brief || '',
      data: tpl.data || tpl,
      weird: !!tpl.weird,
      urgent: !!tpl.urgent,
      context: tpl.context || [],
      ui: {}
    };
    s.tasks.push(task);
    if (tpl.cancelAfter) {
      s.queue.push({ at: s.minute + tpl.cancelAfter, kind: 'cancel', data: { uid: task.uid, title: task.title, from: task.from } });
      s.queue.sort((a, b) => a.at - b.at);
    }
    if (notify) {
      W.msg.post(task.from, task.from, task.title, { kind: 'request', taskId: task.uid, title: task.title, due: task.due });
    }
    renderChrome();
    if (s.view === 'inbox' || s.view === 'home') renderMain();
    return task;
  };

  W.taskOpen = (uid) => W.s.tasks.some((t) => t.uid === uid);

  W.openTask = (uid) => {
    if (!W.taskOpen(uid)) return;
    W.s.activeTaskId = uid;
    W.s.lastResult = null;
    W.maybeScheduleTwist(W.s.tasks.find((t) => t.uid === uid));
    setView('task');
  };

  function finishTask(task, q, note) {
    const s = W.s;
    s.tasks = s.tasks.filter((t) => t !== task);
    const effects = { stamina: -3 };
    let verdict;
    const L = W.level();
    if (q >= L.pass) {
      effects.perf = task.urgent ? 12 : 8;
      effects.rep = 2;
      effects.mental = 1;
      verdict = '통과';
      s.done++;
      W.karma(task.urgent ? 'urgent' : 'done', task.from, task.title);
    } else if (q >= L.ok) {
      effects.perf = 4;
      effects.mental = -3;
      verdict = '수정 후 통과';
      s.done++;
    } else {
      effects.perf = -2;
      effects.rep = -3;
      effects.mental = -4;
      verdict = '반려';
      s.missed++;
      W.karma('rejected', task.from, task.title);
    }
    if (task.weird) effects.mental = (effects.mental || 0) - 4;
    const intel = W.perkBonus(task, effects, q >= L.pass);
    if (intel.length) note = (note ? note + ' ' : '') + `(들은 정보 덕분에 보너스: ${intel.join(', ')})`;
    if (task.type === 'handover' && s.vacation) s.vacation.handoverQ = q;
    W.applyEffects(effects);
    W.learnTerms(task.title + ' ' + task.brief);
    s.docs.unshift({ uid: task.uid, title: task.title, type: task.type, verdict, at: s.minute });
    s.lastResult = { task, verdict, note, effects };

    // 예산표가 통과하면 바로 품의를 올리라는 요청이 이어진다
    if (task.type === 'budget' && task.result && task.result.ok && q >= L.ok) {
      setTimeout(() => W.addTask(W.gen.approval(task.data.purpose, task.result.total), true), 900);
    }
    // 문서 구성을 틀리면 다시 고치라는 요청이 온다
    if (task.type === 'reorder' && q < 1) {
      setTimeout(() => W.msg.post(task.from, task.from, task.data.feedback), 600);
    }
    renderMain();
    W.advance(task.minutes);
  }

  // 전자결재 상신 기록, 30~60분 뒤 결과가 온다
  W.submitApproval = (task, errors) => {
    const s = W.s;
    const doc = { id: W.uid(), title: W.plain(task.ui.title || task.title), docType: task.ui.type || '-', amount: task.data.amount, status: '결재 대기', reason: '', at: s.minute };
    s.approvals.unshift(doc);
    s.queue.push({ at: s.minute + 30 + W.rand(30), kind: 'approval', data: { doc, errors, task } });
    s.queue.sort((a, b) => a.at - b.at);
  };

  function resolveApproval({ doc, errors, task }) {
    const approver = task.data.docType === '지출결의서' ? 'song' : W.lead();
    if (!errors.length) {
      doc.status = '승인';
      W.msg.post(approver, approver, `전자결재 승인했어요. "${doc.title}"`);
      W.applyEffects({ rep: 2 });
    } else {
      doc.status = '반려';
      doc.reason = errors[0];
      W.msg.post(approver, approver, `"${doc.title}" {{반려}}했어요. ${errors[0]}. 고쳐서 다시 올려 주세요.`);
      W.addTask({ ...task, title: '[반려] ' + W.plain(task.title), brief: '반려 사유: ' + errors.join(' / '), deadline: 120, from: approver }, true);
    }
    if (W.s.view === 'approvals') renderMain();
  }

  // ---------- 시간 ----------
  W.resume = () => {
    W.s.paused = false;
    if (!timer) timer = setInterval(() => { if (!W.s.paused) W.advance(1); }, 1000 / C.SPEED);
  };
  W.pause = () => { W.s.paused = true; };
  const stopTimer = () => { clearInterval(timer); timer = null; };

  W.advance = (min) => {
    const s = W.s;
    for (let i = 0; i < min; i++) {
      if (s.over) return;
      s.minute += 1;
      if (s.phase === 'overtime') {
        s.stats.stamina = W.clamp(s.stats.stamina - 0.15, 0, 100);
        s.stats.mental = W.clamp(s.stats.mental - 0.1, 0, 100);
      }
      fireQueue();
      if (s.inScene) { renderChrome(); return; }
      checkDeadlines();
      if (s.phase === 'work' && !s.lunchDone && s.minute >= C.LUNCH_AT) {
        s.lunchDone = true;
        renderChrome();
        return lunch();
      }
      if (s.phase === 'work' && s.minute >= C.DAY_END) {
        renderChrome();
        return endOfWorkday();
      }
      if (s.phase === 'overtime' && s.minute >= C.OVERTIME_END) {
        renderChrome();
        W.toast('22시. 건물 소등. 더는 못 한다.');
        return leaveOffice();
      }
      if (s.phase === 'work' && !s.paused && checkMeeting()) {
        renderChrome();
        return;
      }
    }
    renderChrome();
    W.checkBurnout();
  };

  function fireQueue() {
    const s = W.s;
    while (s.queue.length && s.queue[0].at <= s.minute) {
      const ev = s.queue.shift();
      if (ev.kind === 'approval') { resolveApproval(ev.data); continue; }
      if (ev.kind === 'leave') { W.resolveLeave(ev.data); continue; }
      if (ev.kind === 'transfer') { W.resolveTransfer(ev.data); continue; }
      if (ev.kind === 'twist') { W.applyTwist(ev.data); continue; }
      if (ev.kind === 'cancel') { W.cancelTask(ev.data); continue; }
      if (ev.kind === 'karma') { if (s.phase === 'work') W.karmaReturn(ev.data); continue; }
      if (ev.kind === 'story') { if (s.phase === 'work') W.startStory(ev.data.id); continue; }
      if (W.fireOffice(ev)) { if (s.inScene) return; continue; }
      if (s.phase !== 'work') continue;
      if (ev.kind === 'task') W.addTask(W.gen.random(), true);
      if (ev.kind === 'chat') W.msg.ask({ ...ev.data, from: W.teamPerson(ev.data.from) });
      if (ev.kind === 'chatter') W.msg.post('team', W.teamPerson(ev.data.from), ev.data.text);
      if (ev.kind === 'weird') W.msg.weird({ ...ev.data, from: W.teamPerson(ev.data.from) });
    }
  }

  function checkDeadlines() {
    const s = W.s;
    const late = s.tasks.filter((t) => s.minute > t.due);
    late.forEach((t) => {
      s.tasks = s.tasks.filter((x) => x !== t);
      s.missed++;
      if (s.activeTaskId === t.uid) {
        s.activeTaskId = null;
        if (s.view === 'task') setView('inbox');
      }
      W.applyEffects({ perf: -5, rep: -3 });
      W.karma('missed', t.from, t.title);
      W.msg.post(t.from, t.from, `${W.plain(t.title)} 마감 지났는데요...?`);
    });
    if (late.length && (s.view === 'inbox' || s.view === 'home')) renderMain();
  }

  // ---------- 회의 ----------
  function checkMeeting() {
    const s = W.s;
    const today = (s.day - 1) % 5;
    const m = s.calendar.find((e) => e.day === today && e.people.includes('me') && !e.pending &&
      !s.meetingsDone.includes(e.id) && e.start * 60 <= s.minute && s.minute < (e.start + e.dur) * 60);
    if (!m) return false;
    s.meetingsDone.push(m.id);
    W.pause();
    const quiz = W.pick(window.MEETING_QUIZ);
    const opts = W.shuffle(quiz.options);
    W.openModal(`<p class="eyebrow">${W.fmtTime(s.minute)} 회의 · ${m.dur * 60}분</p><h3>${W.rich(m.title)}</h3>
      <p class="hint">참석: ${m.people.map((p) => esc(W.fullName(p))).join(', ')}</p><p>${esc(quiz.q)}</p>`,
    [
      ...opts.map((o) => ({ label: o.label + (o.correct && W.hasPerk('meetingTip') ? '  💡 들은 정보' : ''), onClick: () => {
        W.closeModal();
        W.applyEffects(o.correct ? { rep: 5, perf: 3 } : { rep: -4, mental: -3 });
        if (o.correct) W.karma('meeting', m.people.find((p) => p !== 'me') || W.lead());
        W.toast(o.correct ? '회의에서 존재감을 보였다.' : '회의실 공기가 싸해졌다.');
        W.resume();
        W.advance(m.dur * 60 - 10);
      } })),
      { label: '급한 업무가 있어 불참하기', onClick: () => {
        W.closeModal();
        W.applyEffects({ rep: -5 });
        const other = m.people.find((p) => p !== 'me') || W.lead();
        W.karma('skipped', other);
        W.msg.post(other, other, '회의 안 들어왔던데요?');
        W.resume();
      } }
    ]);
    return true;
  }

  // ---------- 휴식 ----------
  function takeBreak(kind) {
    const s = W.s;
    if (s.phase !== 'work' || s.paused) return;
    s.breaks++;
    const coffee = kind === 'coffee';
    const effects = coffee ? { mental: 8, money: -4500 } : { mental: 10, stamina: -2 };
    if (s.breaks > C.BREAK_LIMIT && !W.hasPerk('bossAway')) {
      W.karma('slacking', W.lead());
      effects.rep = -4;
      W.toast('팀장님: "또 나가요?" 평판 −4');
    }
    W.applyEffects(effects);
    W.breakScene(kind, () => W.advance(coffee ? 15 : 10));
  }

  // ---------- 점심 ----------
  function lunch() {
    W.pause();
    W.openModal('<p class="eyebrow">12:00</p><h3>점심시간</h3><p>누구랑 뭐 먹지?</p>', window.LUNCH.map((l) => ({
      label: l.label,
      onClick: () => {
        const s = W.s;
        W.applyEffects(l.effects);
        W.closeModal();
        const shift = 13 * 60 - s.minute;
        s.tasks.forEach((t) => { t.due += shift + (l.work || 0); });
        s.queue.forEach((q) => { if (q.kind === 'approval') q.at += shift; });
        s.minute = 13 * 60;
        renderAll();
        W.lunchScene(l, () => W.resume());
      }
    })));
  }

  // ---------- 퇴근 ----------
  function endOfWorkday() {
    W.pause();
    const left = W.s.tasks.length;
    if (!left) {
      W.openModal('<p class="eyebrow">18:00</p><h3>정시 퇴근</h3><p>업무함이 비었다. 칼퇴다.</p>',
        [{ label: '퇴근하기', onClick: () => { W.closeModal(); leaveOffice(); } }]);
      return;
    }
    W.openModal(`<p class="eyebrow">18:00</p><h3>퇴근 시간</h3><p>업무함에 아직 ${left}건 남았다.</p>
      <p class="hint">야근하면 체력과 멘탈이 계속 줄어요. 그냥 퇴근하면 남은 업무 하나당 성과 −4.</p>`, [
      { label: '야근한다', onClick: () => { W.closeModal(); W.s.phase = 'overtime'; W.scheduleOvertime(); renderAll(); W.toast('야근 시작. 업무함을 비우면 퇴근할 수 있어요.'); W.resume(); } },
      { label: '내일의 내가 하겠지. 퇴근', onClick: () => { W.closeModal(); leaveOffice(); } }
    ]);
  }

  function leaveOffice() {
    const s = W.s;
    W.pause();
    s.phase = 'evening';
    // 아직 안 나온 휴가 결재는 퇴근 전에 결과가 나온다
    s.queue.filter((q) => q.kind === 'leave').forEach((q) => W.resolveLeave(q.data));
    s.queue.filter((q) => q.kind === 'transfer').forEach((q) => W.resolveTransfer(q.data));
    s.queue = s.queue.filter((q) => q.kind !== 'leave' && q.kind !== 'transfer');
    // 끝내지 못한 일과 답하지 않은 메시지는 휴가 때 돌아온다
    s.tasks.forEach((t) => W.karma('unfinished', t.from, t.title));
    Object.values(s.rooms).forEach((r) => { if (r.pending && window.PEOPLE[r.id]) W.karma('ignored', r.id, '', W.person(r.id).name); });
    if (s.tasks.length) {
      s.missed += s.tasks.length;
      W.applyEffects({ perf: -4 * s.tasks.length });
      s.tasks = [];
    }
    s.activeTaskId = null;
    s.view = 'home';
    renderAll();
    if (s.over) return;
    if (s.minute < 20 * 60 && Math.random() < 0.4) return teamDinner();
    evening();
  }

  function teamDinner() {
    const d = window.TEAM_DINNER;
    W.openModal(`<p class="eyebrow">퇴근 직전</p><h3>회식 소집</h3><p>${esc(d.text.replace('박 팀장', W.person(W.lead()).name.slice(0, 1) + ' 팀장'))}</p>`, d.options.map((o) => ({
      label: o.label,
      onClick: () => {
        W.applyEffects(o.effects);
        if (o.hangover) W.s.hangover = true;
        if (o.effects.rep > 0) W.karma('dinner', W.lead());
        else if (W.hasPerk('dinnerWarn')) W.applyEffects({ rep: -o.effects.rep }); // 미리 말해 둬서 괜찮다
        else W.karma('dinnerskip', W.lead());
        W.closeModal();
        summary(o.result);
      }
    })));
  }

  function evening() {
    W.openModal(`<p class="eyebrow">${W.fmtTime(W.s.minute)}</p><h3>퇴근 후</h3><p>오늘 저녁은?</p>`, window.EVENING.map((o) => ({
      label: o.label,
      onClick: () => { W.applyEffects(o.effects); W.closeModal(); summary(o.result); }
    })));
  }

  function summary(eveningResult) {
    const s = W.s;
    if (s.over) return;
    stopTimer();
    s.week.workdays++;
    s.week.done += s.done;
    s.week.missed += s.missed;
    const rows = Object.keys(W.STAT_INFO).map((k) => {
      const diff = Math.round(s.stats[k] - s.dayStartStats[k]);
      const show = k === 'money' ? W.fmtMoney(s.stats[k]) : Math.round(s.stats[k]);
      const d = diff === 0 ? '' : `<span class="${diff > 0 ? 'up' : 'down'}">(${diff > 0 ? '+' : ''}${k === 'money' ? W.fmtNum(diff) : diff})</span>`;
      return `<tr><td>${W.STAT_INFO[k].label}</td><td>${show} ${d}</td></tr>`;
    }).join('');
    const terms = s.todayTerms.length
      ? `<p>오늘 배운 용어: ${s.todayTerms.map((t) => `<button type="button" class="term" data-term="${t}">${t}</button>`).join(', ')}</p>` : '';
    W.openModal(`<p class="eyebrow">${s.day}일차 결산</p><h3>오늘 하루</h3><p>${esc(eveningResult)}</p>
      <table class="summary">
        <tr><td>처리한 업무</td><td>${s.done}건</td></tr>
        <tr><td>놓치거나 반려된 업무</td><td>${s.missed}건</td></tr>
        <tr><td>상신한 결재</td><td>${s.approvals.length}건</td></tr>
        ${rows}
      </table>${terms}`, [
      { label: '다음 날로', onClick: () => { W.closeModal(); W.nextDay(); } }
    ]);
    W.save();
  }

  W.checkBurnout = () => {
    const s = W.s;
    if (s.over) return;
    if (s.stats.stamina <= 0 || s.stats.mental <= 0) {
      s.over = true;
      stopTimer();
      W.clearSave();
      const why = s.stats.stamina <= 0 ? '체력이 바닥나 쓰러졌다.' : '멘탈이 무너졌다.';
      W.openModal(`<p class="eyebrow">게임 오버</p><h3>번아웃 엔딩</h3><p>${why} ${s.day}일차에 회사를 떠난다.</p>
        <p class="hint">쉬는 것도 일이다. 커피타임, 점심, 퇴근 후 휴식을 챙겨 보세요.</p>`,
      [{ label: '처음부터 다시', onClick: () => location.reload() }]);
    }
  };

  // ---------- 화면 ----------
  const NAV = [
    ['home', '홈'], ['inbox', '업무함'], ['messenger', '메신저'], ['calendar', '캘린더'],
    ['approvals', '전자결재'], ['docs', '문서함'], ['hr', '인사·근태'], ['glossary', '용어집']
  ];
  const VACATION_NAV = [['vacation', '휴가'], ['messenger', '메신저'], ['hr', '인사·근태'], ['glossary', '용어집']];

  W.messengerVisible = () => window.innerWidth > 1100 || W.s.view === 'messenger';

  function setView(v) {
    W.s.view = v;
    if (v === 'messenger' && W.s.openRoom) W.msg.room(W.s.openRoom).unread = 0;
    document.body.dataset.view = v;
    renderAll();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    document.body.dataset.view = W.s.view;
    renderChrome();
    renderMain();
    W.renderMessenger();
  }

  // 매 분 바뀌는 부분: 시계, 수치, 배지
  function renderChrome() {
    const s = W.s;
    $('#clock').textContent = s.phase === 'vacation' ? W.vacationClock() : W.fmtTime(s.minute);
    $('#day-label').textContent = `${s.day}일차 ${window.WEEKDAYS[(s.day - 1) % 5]}요일`;
    $('#phase-label').textContent = s.phase === 'overtime' ? '야근 중' : s.phase === 'vacation' ? '휴가 중' : '';
    $('#phase-label').hidden = s.phase !== 'overtime' && s.phase !== 'vacation';
    W.setHtml($('#nav'), (s.phase === 'vacation' ? VACATION_NAV : NAV).map(([k, label]) => {
      const count = k === 'inbox' ? s.tasks.length : 0;
      return `<button type="button" class="nav-item ${s.view === k || (k === 'inbox' && s.view === 'task') ? 'active' : ''} ${k === 'messenger' ? 'mobile-only' : ''}" data-go="${k}">
        ${label}${count ? ` <span class="badge">${count}</span>` : ''}${k === 'messenger' ? ' <span class="badge" data-badge="messenger" hidden></span>' : ''}</button>`;
    }).join(''));
    W.setHtml($('#sidebar'), profileCard());
    W.renderStats();
    W.renderMessenger();
    if (s.view === 'home') W.setHtml($('#home-todo'), todoList());
    if (s.view === 'inbox') W.setHtml($('#inbox-body'), inboxRows());
  }

  W.renderStats = () => {
    const s = W.s;
    const html = Object.entries(W.STAT_INFO).map(([k, info]) => {
      const v = s.stats[k];
      if (!info.bar) {
        return `<div class="stat plain"><span class="label">${info.label}</span><span class="value">${k === 'money' ? W.fmtMoney(v) : Math.round(v)}</span></div>`;
      }
      const level = v < 25 ? 'low' : v < 50 ? 'mid' : '';
      return `<div class="stat"><span class="label">${info.label}</span>
        <span class="bar"><span class="fill ${level}" style="width:${Math.round(v)}%"></span></span><span class="value">${Math.round(v)}</span></div>`;
    }).join('');
    W.$$('[data-stats]').forEach((el) => W.setHtml(el, html));
  };

  W.renderGlossaryCount = () => {
    W.$$('[data-glossary-count]').forEach((el) => { el.textContent = W.s.glossary.length; });
  };

  function profileCard() {
    const s = W.s;
    return `<div class="card profile">
      <div class="profile-top">${W.avatar('me', 'lg')}<div><strong>${esc(s.name)}</strong><span>${esc(s.job)}팀 · ${esc(W.rankName())}</span></div></div>
      <div class="stats" data-stats></div>
      ${s.phase === 'vacation' ? '' : `<div class="break-row">
        <button type="button" class="btn" data-break="coffee">커피타임 <small>15분</small></button>
        <button type="button" class="btn" data-break="smoke">담배타임 <small>10분</small></button>
      </div>`}
      <p class="hint">오늘 처리 ${s.done}건 · 용어 <span data-glossary-count>${s.glossary.length}</span>개</p>
      <p class="hint"><button type="button" class="link-btn" data-go="hr">연차 ${s.leave}일 · 승진 포인트 ${s.points}${W.nextRank() ? '/' + W.nextRank().need : ''}</button></p>
      ${W.intelCard ? W.intelCard() : ''}
      <p class="hint"><button type="button" class="link-btn" data-go="hr"><span class="up">덕 ${W.pendingGood().length}</span> · <span class="down">업보 ${W.pendingKarma().length}</span></button></p>
    </div>`;
  }

  const typeChip = (type) => `<span class="type-chip t-${type}">${W.TYPE_LABEL[type] || type}</span>`;
  const sortedTasks = () => W.s.tasks.slice().sort((a, b) => a.due - b.due);

  function todoList() {
    const list = sortedTasks();
    if (!list.length) return `<p class="empty">${W.s.phase === 'overtime' ? '업무함을 다 비웠다! <button type="button" class="btn primary" data-leave>퇴근하기</button>' : '지금은 처리할 업무가 없다. 곧 생긴다.'}</p>`;
    return `<ul class="todo">${list.slice(0, 6).map((t) => `<li><button type="button" class="todo-item" data-task="${t.uid}">
      ${typeChip(t.type)}<span class="todo-title">${esc(W.plain(t.title))}</span>${dueText(t)}</button></li>`).join('')}</ul>`;
  }

  const dueText = (t) => {
    const left = t.due - W.s.minute;
    return `<span class="due ${left < 60 ? 'urgent' : ''}">~${W.fmtTime(t.due)}</span>`;
  };

  function inboxRows() {
    const list = sortedTasks();
    if (!list.length) {
      return `<tr><td colspan="4" class="empty">${W.s.phase === 'overtime' ? '업무함을 다 비웠다! <button type="button" class="btn primary" data-leave>퇴근하기</button>' : '받은 업무가 없습니다.'}</td></tr>`;
    }
    return list.map((t) => `<tr class="clickable" data-task="${t.uid}">
      <td>${typeChip(t.type)}</td>
      <td class="title-cell">${t.urgent ? '<span class="chip bad">긴급</span> ' : ''}${t.weird ? '<span class="chip warn">이상한 업무</span> ' : ''}${esc(W.plain(t.title).replace('[긴급] ', ''))}${t.twist ? ' <span class="chip warn">변경됨</span>' : ''}</td>
      <td class="from-cell">${W.avatar(t.from, 'xs')} ${esc(W.fullName(t.from))}</td>
      <td>${dueText(t)}</td></tr>`).join('');
  }

  function renderMain() {
    const s = W.s;
    const main = $('#main');
    main.dataset.html = '';
    const v = s.view;
    if (v === 'home') {
      const today = (s.day - 1) % 5;
      const mine = s.calendar.filter((e) => e.day === today && e.people.includes('me') && !e.pending).sort((a, b) => a.start - b.start);
      main.innerHTML = `
        <div class="mobile-only">${profileCard()}</div>
        <div class="home-grid">
          <section class="card"><div class="card-head"><h2>오늘 할 일</h2><button type="button" class="link-btn" data-go="inbox">업무함 전체 보기</button></div>
            <div id="home-todo">${todoList()}</div></section>
          <section class="card"><div class="card-head"><h2>오늘 내 일정</h2><button type="button" class="link-btn" data-go="calendar">캘린더</button></div>
            ${mine.length ? `<ul class="plain-list">${mine.map((e) => `<li><span class="time">${e.start}:00</span> ${W.rich(e.title)}</li>`).join('')}</ul>` : '<p class="empty">오늘은 회의가 없다. 기적이다.</p>'}</section>
          <section class="card wide"><div class="card-head"><h2>공지사항</h2></div>
            <table class="board"><tbody>${window.NOTICES.map((n, i) => `<tr><td><span class="chip">${esc(n.tag)}</span></td><td>${esc(n.title)}</td><td class="muted">${esc(n.by)}</td><td class="muted">10.${String(13 - i).padStart(2, '0')}</td></tr>`).join('')}</tbody></table></section>
        </div>`;
    } else if (v === 'inbox') {
      main.innerHTML = `<section class="card"><div class="card-head"><h2>업무함</h2><span class="muted">마감 순</span></div>
        <div class="table-wrap"><table class="board inbox"><thead><tr><th>유형</th><th>제목</th><th>요청자</th><th>마감</th></tr></thead>
        <tbody id="inbox-body">${inboxRows()}</tbody></table></div></section>
        ${s.docs.length ? `<section class="card"><div class="card-head"><h2>오늘 처리한 업무</h2></div>
          <table class="board"><tbody>${s.docs.map((d) => `<tr><td>${typeChip(d.type)}</td><td>${esc(W.plain(d.title))}</td><td>${verdictChip(d.verdict)}</td><td class="muted">${W.fmtTime(d.at)}</td></tr>`).join('')}</tbody></table></section>` : ''}`;
    } else if (v === 'task') {
      renderTaskView(main);
    } else if (v === 'calendar') {
      main.innerHTML = `<section class="card"><div class="card-head"><h2>팀 캘린더</h2><span class="muted">이번 주</span></div>
        <div class="legend"><span><i class="sw related"></i>내가 참석</span><span><i class="sw other"></i>다른 사람 일정</span></div>
        ${W.calendarHtml({ people: ['me'] })}</section>`;
    } else if (v === 'approvals') {
      main.innerHTML = `<section class="card"><div class="card-head"><h2>전자결재 · 내가 올린 문서</h2></div>
        ${s.approvals.length ? `<div class="table-wrap"><table class="board"><thead><tr><th>양식</th><th>제목</th><th>금액</th><th>상태</th><th>상신</th></tr></thead><tbody>
        ${s.approvals.map((a) => `<tr><td>${esc(a.docType)}</td><td>${esc(a.title)}${a.reason ? `<div class="hint">사유: ${esc(a.reason)}</div>` : ''}</td><td class="num">${W.fmtNum(a.amount)}</td><td>${statusChip(a.status)}</td><td class="muted">${W.fmtTime(a.at)}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="empty">아직 상신한 문서가 없습니다. 예산표나 지출결의 업무를 처리하면 여기에 쌓여요.</p>'}</section>`;
    } else if (v === 'docs') {
      main.innerHTML = `<section class="card"><div class="card-head"><h2>문서함 · 오늘 작성한 문서</h2></div>
        ${s.docs.length ? `<table class="board"><tbody>${s.docs.map((d) => `<tr><td>${typeChip(d.type)}</td><td>${esc(W.plain(d.title))}</td><td>${verdictChip(d.verdict)}</td><td class="muted">${W.fmtTime(d.at)}</td></tr>`).join('')}</tbody></table>` : '<p class="empty">아직 작성한 문서가 없습니다.</p>'}</section>`;
    } else if (v === 'glossary') {
      const all = Object.keys(window.TERMS);
      main.innerHTML = `<section class="card"><div class="card-head"><h2>용어집</h2><span class="muted">${s.glossary.length} / ${all.length}</span></div>
        <p class="hint">업무와 메신저에서 밑줄 친 용어를 누르면 여기에 모여요.</p>
        <div class="glossary">${all.map((t) => {
          const known = s.glossary.includes(t);
          const info = window.TERMS[t];
          return known
            ? `<div class="g-item"><span class="eyebrow">${esc(info.field)}</span><strong>${esc(t)}</strong><p>${esc(info.meaning)}</p><p class="example">예: "${esc(info.example)}"</p></div>`
            : `<div class="g-item locked"><span class="eyebrow">${esc(info.field)}</span><strong>???</strong><p>아직 만나지 못한 용어</p></div>`;
        }).join('')}</div></section>`;
    } else if (v === 'hr') {
      W.renderHR(main);
    } else if (v === 'vacation') {
      W.renderVacation(main);
    } else if (v === 'messenger') {
      main.innerHTML = '';
    }
    W.renderStats();
  }

  const verdictChip = (v) => `<span class="chip ${v === '통과' ? 'good' : v === '반려' ? 'bad' : 'warn'}">${v}</span>`;
  const statusChip = (v) => `<span class="chip ${v === '승인' ? 'good' : v === '반려' ? 'bad' : ''}">${v}</span>`;

  function renderTaskView(main) {
    const s = W.s;
    const r = s.lastResult;
    if (r) {
      main.innerHTML = `<section class="card task-window">
        <div class="crumbs"><button type="button" class="link-btn" data-go="inbox">업무함</button> › 처리 결과</div>
        <h2 class="task-title">${W.rich(r.task.title)}</h2>
        <div class="result ${r.verdict === '통과' ? 'good' : r.verdict === '반려' ? 'bad' : 'warn'}">
          <strong>${r.verdict}</strong><p>${W.rich(r.note || '')}</p><p class="hint">${esc(W.effectText(r.effects))}</p></div>
        <div class="row">
          ${s.tasks.length ? `<button type="button" class="btn primary" data-task="${sortedTasks()[0].uid}">다음 업무 열기 (마감 임박 순)</button>` : ''}
          <button type="button" class="btn" data-go="inbox">업무함으로</button></div>
      </section>`;
      return;
    }
    const task = s.tasks.find((t) => t.uid === s.activeTaskId);
    if (!task) { s.view = 'inbox'; return renderMain(); }
    main.innerHTML = `<section class="card task-window">
      <div class="crumbs"><button type="button" class="link-btn" data-go="inbox">업무함</button> › ${W.TYPE_LABEL[task.type]}</div>
      <h2 class="task-title">${W.rich(task.title)}</h2>
      <div class="task-meta">${W.avatar(task.from, 'xs')} ${esc(W.fullName(task.from))} 요청 · 마감 ${dueText(task)} ${typeChip(task.type)}</div>
      ${task.twist ? `<div class="twist" role="status"><span class="chip warn">변경 요청</span> <strong>${esc(W.person(task.from).name)}:</strong> ${W.rich(task.twist)}</div>` : ''}
      ${task.brief ? `<blockquote class="brief">${W.rich(task.brief)}</blockquote>` : ''}
      ${W.perkHints(task)}
      ${task.context && task.context.length ? `<div class="context"><span class="label">요청 배경</span><ul>${task.context.map((c) => `<li>${W.rich(c)}</li>`).join('')}</ul></div>` : ''}
      <div id="app-body"></div></section>`;
    W.apps[task.type].render(task, $('#app-body'), (q, note) => finishTask(task, q, note));
  }

  // ---------- 연결 ----------
  function bind() {
    const saved = W.load();
    if (saved) {
      const b = $('#btn-continue');
      b.hidden = false;
      b.textContent = `이어서 하기 (${saved.name}, ${saved.day}일차)`;
      b.addEventListener('click', () => continueGame(saved));
      $('#player-name').value = saved.name;
    }
    W.$$('.job:not([disabled])').forEach((j) => j.addEventListener('click', () => {
      const group = j.classList.contains('level') ? '.job.level' : '.job:not(.level)';
      W.$$(group).forEach((x) => x.classList.toggle('selected', x === j));
    }));
    $('#start-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#player-name').value.trim() || '김신입';
      W.clearSave();
      newGame(name, $('.job.selected:not(.level)').dataset.job, $('.job.level.selected').dataset.level);
    });

    document.addEventListener('click', (e) => {
      const term = e.target.closest('.term');
      if (term) { e.preventDefault(); e.stopPropagation(); W.showTerm(term.dataset.term); }
    }, true);

    $('#game-screen').addEventListener('click', (e) => {
      if (e.target.closest('#messenger')) return;
      const v = e.target.closest('[data-go]');
      if (v) return setView(v.dataset.go);
      const t = e.target.closest('[data-task]');
      if (t) return W.openTask(t.dataset.task);
      const b = e.target.closest('[data-break]');
      if (b) return takeBreak(b.dataset.break);
      if (e.target.closest('[data-leave]')) return leaveOffice();
      if (e.target.closest('[data-leave-form]')) return W.openLeaveForm();
      if (e.target.closest('[data-transfer]')) return W.openTransfer();
    });

    // 업무 앱 입력값은 task.ui 에 저장
    $('#main').addEventListener('input', (e) => {
      const el = e.target.closest('[data-ui]');
      const task = W.s.tasks.find((t) => t.uid === W.s.activeTaskId);
      if (!el || !task) return;
      task.ui[el.dataset.ui] = el.type === 'checkbox' ? el.checked : el.value;
    });
    $('#main').addEventListener('change', (e) => {
      const el = e.target.closest('select[data-ui], input[type="radio"][data-ui]');
      const task = W.s.tasks.find((t) => t.uid === W.s.activeTaskId);
      if (el && task) task.ui[el.dataset.ui] = el.value;
    });

    W.msg.bind();
    $('#modal').addEventListener('click', (e) => {
      const b = e.target.closest('[data-modal]');
      if (b) W.modalClick(Number(b.dataset.modal));
    });
    // Esc로 모달이 닫혀 게임이 멈춘 채 남지 않게 막는다
    $('#modal').addEventListener('cancel', (e) => e.preventDefault());
    window.addEventListener('resize', () => { if (W.s) W.renderMessenger(); });
  }

  Object.assign(W, { startDay, setView, renderAll, renderChrome, renderMain, stopTimer, profileCard });
  bind();
})();
