// 변칙: 업무에 배경 설명 붙이기, 긴급 업무, 중간에 바뀌는 요청, 취소되는 업무,
// 그리고 휴가 때 돌아올 "업보" 기록
(() => {
  const W = window.WNE;

  // ---------- 들어오는 업무 꾸미기 ----------
  const baseRandom = W.gen.random;
  W.gen.random = () => decorate(baseRandom());

  function decorate(tpl) {
    const pool = window.TASK_CONTEXT[tpl.type] || [];
    const context = W.shuffle(pool).slice(0, 1 + W.rand(2));
    const L = W.level();
    const out = { ...tpl, context };
    // 긴급 업무: 마감이 짧은 대신 잘 끝내면 성과를 더 준다
    if (Math.random() < L.urgent) {
      out.urgent = true;
      out.title = '[긴급] ' + tpl.title;
      out.deadline = 50 + W.rand(20);
      out.context = ['{{ASAP}}로 부탁해요. 위에서 지금 기다리고 계세요.', ...context];
    }
    // 하다 보면 없던 일이 되는 업무
    if (Math.random() < 0.1) out.cancelAfter = 40 + W.rand(60);
    return out;
  }

  // ---------- 중간에 바뀌는 요청 ----------
  // 업무를 처음 열면 일정 확률로 몇 분 뒤 요청이 바뀐다
  W.maybeScheduleTwist = (task) => {
    if (task.opened) return;
    task.opened = true;
    if (!TWISTS[task.type] || task.twist) return;
    if (Math.random() >= W.level().twist) return;
    W.s.queue.push({ at: W.s.minute + 4 + W.rand(8), kind: 'twist', data: { uid: task.uid } });
    W.s.queue.sort((a, b) => a.at - b.at);
  };

  const validSlots = (task) => {
    let n = 0;
    for (let d = 0; d < 5; d++) for (let h = 9; h <= 18 - task.data.dur; h++) if (!W.checkSlot(task, { day: d, start: h })) n++;
    return n;
  };

  const TWISTS = {
    schedule(task) {
      const d = task.data;
      const ev = W.s.calendar.find((e) => e.id === d.eventId);
      if (Math.random() < 0.5) {
        const extra = W.shuffle([...new Set([W.lead(), W.mate(), 'park', 'lee', 'jung', 'choi', 'han', 'kang'])].filter((p) => !d.people.includes(p)));
        for (const p of extra) {
          const tryTask = { data: { ...d, people: [...d.people, p] } };
          if (validSlots(tryTask) >= 1) {
            task.data = tryTask.data;
            if (ev) ev.people = task.data.people;
            return `아 그리고 ${W.fullName(p)}님도 꼭 들어오셔야 한대요. 그분 일정까지 같이 봐서 잡아 주세요.`;
          }
        }
      }
      for (const r of W.shuffle(W.EXTRA_RULES.map((_, i) => i).filter((i) => i !== d.rule))) {
        const tryTask = { data: { ...d, rule: r } };
        if (validSlots(tryTask) >= 1) {
          task.data = tryTask.data;
          return `죄송한데 조건이 바뀌었어요. ${W.EXTRA_RULES[r].text} 잡아 주세요. 앞에 말한 조건은 없던 걸로요.`;
        }
      }
      return null;
    },
    budget(task) {
      const d = task.data;
      const sum = (list) => list.reduce((a, it) => a + it.unit * it.qty, 0);
      const reqMin = Math.ceil((sum(d.items.filter((i) => i.req)) * 1.1 + 1) / 100000) * 100000;
      if (Math.random() < 0.5 && d.limit - 100000 >= reqMin) {
        const cut = Math.min(d.limit - reqMin, 100000 * (1 + W.rand(3)));
        task.data = { ...d, limit: d.limit - cut };
        return `방금 본부에서 예산 줄이래요... 한도 ${W.fmtMoney(task.data.limit)}(부가세 포함)으로 다시 맞춰 주세요.`;
      }
      const items = d.items.map((it) => ({ ...it }));
      const idx = items.findIndex((it) => it.req && it.qty > 1);
      if (idx !== -1 && Math.random() < 0.5) {
        const add = 2 + W.rand(3);
        items[idx].qty += add;
        if (sum(items.filter((i) => i.req)) * 1.1 <= d.limit) {
          task.data = { ...d, items };
          return `인원이 ${add}명 늘었어요. "${items[idx].name}" 수량 ${items[idx].qty}개로 바꿔서 다시 계산해 주세요.`;
        }
        items[idx].qty -= add;
      }
      // 필수가 아닌 항목의 견적이 바뀌는 건 언제든 가능하다 (넘으면 빼면 된다)
      const opt = items.filter((it) => !it.req);
      if (!opt.length) return null;
      const it = W.pick(opt);
      it.unit = Math.round((it.unit * W.pick([1.2, 1.5, 2])) / 1000) * 1000;
      task.data = { ...d, items };
      return `"${it.name}" 견적이 다시 왔는데 단가가 ${W.fmtMoney(it.unit)}으로 올랐대요. 반영해서 계산해 주세요. 한도 넘으면 빼고요.`;
    },
    approval(task) {
      const d = task.data;
      if (d.docType !== '지출결의서') return null;
      const amount = Math.round((d.amount * W.pick([0.8, 1.2, 1.6])) / 1000) * 1000;
      task.data = { ...d, amount };
      const lineNote = W.approvalLine(amount).join() !== W.approvalLine(d.amount).join() ? ' 금액대가 바뀌었으니 결재선도 다시 보세요.' : '';
      return `영수증 다시 확인했는데 금액이 ${W.fmtMoney(amount)}이에요. 이걸로 올려 주세요.${lineNote}`;
    },
    mail(task) {
      const d = task.data;
      if (Math.random() < 0.5) {
        const add = ['choi', W.lead(), W.mate(), 'song'].find((p) => !d.to.includes(p) && !d.cc.includes(p) && p !== task.from);
        if (add) {
          task.data = { ...d, cc: [...d.cc, add] };
          return `아, 그 메일 ${W.fullName(add)}님도 {{참조}}로 넣어 주세요. 위에서 보고 싶어 하세요.`;
        }
      }
      task.data = { ...d, text: d.text + ' 회신 부탁드립니다.' };
      return '본문 마지막에 "회신 부탁드립니다." 한 문장만 붙여 주세요. 답이 안 와서요.';
    }
  };

  W.applyTwist = ({ uid }) => {
    const s = W.s;
    const task = s.tasks.find((t) => t.uid === uid);
    if (!task || task.twist) return;
    const text = TWISTS[task.type](task);
    if (!text) return;
    task.twist = text;
    W.msg.post(task.from, task.from, text);
    W.learnTerms(text);
    if (s.view === 'task' && s.activeTaskId === uid && !s.lastResult) W.renderMain();
  };

  // ---------- 취소되는 업무 ----------
  W.cancelTask = ({ uid, title, from }) => {
    const s = W.s;
    const open = s.tasks.find((t) => t.uid === uid);
    const done = s.docs.find((d) => d.uid === uid);
    if (open) {
      s.tasks = s.tasks.filter((t) => t !== open);
      W.msg.post(from, from, `아 "${W.plain(title)}" 그거 안 해도 돼요. 방향이 바뀌었어요 ㅎㅎ;`);
      if (s.activeTaskId === uid) { s.activeTaskId = null; if (s.view === 'task') W.setView('inbox'); }
      W.toast('업무 하나가 취소됐다. 개이득.');
    } else if (done) {
      done.verdict = '취소됨';
      W.applyEffects({ mental: -3 });
      W.msg.post(from, from, `아 "${W.plain(title)}" 그거 없던 일이 됐어요. 고생하셨는데 죄송해요ㅠ`);
      W.toast('이미 끝낸 일이 취소됐다. 헛수고. 멘탈 −3');
    } else return;
    W.renderChrome();
    if (s.view === 'inbox' || s.view === 'home' || s.view === 'docs') W.renderMain();
  };

  // ---------- 덕과 업보 ----------
  // 모든 선택은 장부에 남는다. 덕은 나중에 도움으로, 업보는 역풍으로 돌아온다.
  W.karma = (kind, from, title = '', who = '') => {
    const s = W.s;
    const def = window.KARMA[kind];
    if (!def) return;
    if (!s.karma) s.karma = [];
    if (s.karma.some((k) => k.kind === kind && k.title === W.plain(title) && k.from === from && k.day === s.day)) return;
    s.karma.push({ id: W.uid(), kind, good: !!def.good, from, title: W.plain(title), who, day: s.day });
    if (s.karma.length > 30) s.karma.shift();
    if (s.week) s.week[def.good ? 'good' : 'bad'] = (s.week[def.good ? 'good' : 'bad'] || 0) + 1;
    if (window.PEOPLE[from] && from !== 'me') W.addRel(from, def.good ? 3 : -5);
  };

  W.karmaText = (k) => {
    const t = window.KARMA[k.kind];
    const fill = (str) => str.replace(/\{title\}/g, k.title).replace(/\{day\}/g, k.day).replace(/\{who\}/g, k.who || W.person(k.from).name);
    return { text: fill(t.text), why: fill(t.why) };
  };

  // 아직 돌아오지 않은 업보와 덕 (오래된 건 잊힌다)
  const fresh = (k) => W.s.day - k.day <= 7;
  W.pendingKarma = () => (W.s.karma || []).filter((k) => !k.good && fresh(k));
  W.pendingGood = () => (W.s.karma || []).filter((k) => k.good && fresh(k));
  W.consumeKarma = (k) => { W.s.karma = (W.s.karma || []).filter((x) => x !== k); };

  // 돌아온 일 기록 (인사·근태 화면에 보여 준다)
  W.logReturn = (k, result) => {
    const s = W.s;
    if (!s.returns) s.returns = [];
    s.returns.unshift({ good: k.good, why: W.karmaText(k).why, result, day: s.day, from: k.from });
    if (s.returns.length > 12) s.returns.pop();
  };
})();
