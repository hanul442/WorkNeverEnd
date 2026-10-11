(() => {
  const DAY_START = 9 * 60;
  const LUNCH_AT = 12 * 60;
  const DAY_END = 18 * 60;
  const OVERTIME_END = 22 * 60;
  // 실제 1초 = 게임 1분. 주소 뒤에 ?speed=10 을 붙이면 10배 빨라진다 (테스트용)
  const SPEED = Number(new URLSearchParams(location.search).get('speed')) || 1;
  const TICK_MS = 1000 / SPEED;
  const SAVE_KEY = 'workneverend-save';
  const BREAK_LIMIT = 3; // 하루 이 횟수를 넘겨 쉬면 팀장님 눈치

  const STAT_INFO = {
    stamina: { label: '체력', bar: true },
    mental: { label: '멘탈', bar: true },
    rep: { label: '평판', bar: true },
    perf: { label: '성과', bar: false },
    money: { label: '돈', bar: false }
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let state = null;
  let timer = null;

  // ---------- 저장 ----------
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        job: state.job,
        day: state.day,
        stats: state.stats,
        glossary: state.glossary,
        hangover: state.hangover
      }));
    } catch (e) { /* 저장이 막힌 브라우저에서는 그냥 넘어간다 */ }
  }

  function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* 무시 */ }
  }

  // ---------- 유틸 ----------
  const rand = (n) => Math.floor(Math.random() * n);
  const pick = (arr) => arr[rand(arr.length)];
  const shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function fmtTime(min) {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  function fmtMoney(v) {
    return v.toLocaleString('ko-KR') + '원';
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // {{용어}} 를 눌러 볼 수 있는 버튼으로 바꾼다
  function rich(text) {
    return escapeHtml(text).replace(/\{\{(.+?)\}\}/g, (_, t) =>
      window.TERMS[t] ? `<button type="button" class="term" data-term="${t}">${t}</button>` : t);
  }

  function plain(text) {
    return text.replace(/\{\{(.+?)\}\}/g, '$1');
  }

  function termsIn(text) {
    return Array.from(text.matchAll(/\{\{(.+?)\}\}/g)).map((m) => m[1]);
  }

  // 글자 단위 편집 거리로 정확도 계산
  function similarity(a, b) {
    a = a.replace(/\s+/g, ' ').trim();
    b = b.replace(/\s+/g, ' ').trim();
    if (!a.length && !b.length) return 1;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
  }

  // ---------- 수치 ----------
  function applyEffects(effects = {}) {
    const s = state.stats;
    for (const [k, v] of Object.entries(effects)) {
      if (!(k in s)) continue;
      s[k] += v;
      if (STAT_INFO[k].bar) s[k] = clamp(s[k], 0, 100);
      if (k === 'perf') s[k] = Math.max(0, s[k]);
    }
    renderStats();
    checkBurnout();
  }

  function effectText(effects = {}) {
    return Object.entries(effects)
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const amount = k === 'money' ? fmtMoney(Math.abs(v)) : Math.abs(v);
        return `${STAT_INFO[k].label} ${v > 0 ? '+' : '-'}${amount}`;
      })
      .join(', ');
  }

  // ---------- 하루 시작 ----------
  function newGame(job) {
    state = {
      job,
      day: 1,
      stats: { stamina: 80, mental: 70, rep: 50, perf: 0, money: 300000 },
      glossary: [],
      hangover: false
    };
    startDay();
  }

  function continueGame(saved) {
    state = { ...saved };
    startDay();
  }

  function startDay() {
    Object.assign(state, {
      minute: DAY_START,
      phase: 'work',
      tasks: [],
      chats: [],
      events: [],
      activeTaskId: null,
      breaks: 0,
      lunchDone: false,
      paused: false,
      dayStartStats: null,
      todayTerms: [],
      done: 0,
      missed: 0,
      taskSeq: 0
    });

    const morning = [];
    if (state.hangover) {
      state.stats.stamina = clamp(state.stats.stamina - 15, 0, 100);
      morning.push('어제 회식 여파로 머리가 깨질 것 같다. 체력 -15');
      if (Math.random() < 0.5) {
        state.minute = DAY_START + 20;
        state.stats.rep = clamp(state.stats.rep - 5, 0, 100);
        morning.push('20분 지각했다. 팀장님이 시계를 봤다. 평판 -5');
      }
      state.hangover = false;
    }
    state.dayStartStats = { ...state.stats };

    scheduleDay();
    $('#start-screen').hidden = true;
    $('#game-screen').hidden = false;
    $('#day-label').textContent = state.day + '일차';
    showTab('tasks');
    renderAll();

    const intro = `<h3>${state.day}일차 출근</h3>
      <p>${state.job} 직무 사원. 오늘도 업무가 쌓여 있다.</p>
      ${morning.map((m) => `<p class="down">${escapeHtml(m)}</p>`).join('')}
      <p class="hint">업무를 눌러 처리하고, 메신저에 답하고, 18시 전에 다 끝내 보세요. 밑줄 친 용어는 눌러서 뜻을 볼 수 있어요.</p>`;
    openModal(intro, [{ label: '업무 시작', onClick: () => { closeModal(); resume(); } }]);
  }

  // 오늘 들어올 업무와 메시지 시간표를 만든다
  function scheduleDay() {
    const pool = shuffle(window.TASKS);
    const firstBatch = pool.slice(0, 3);
    const later = pool.slice(3, 6 + Math.min(state.day, 3));
    firstBatch.forEach((t) => addTask(t, false));

    later.forEach((t, i) => {
      state.events.push({ at: DAY_START + 50 + i * 70 + rand(30), kind: 'task', data: t });
    });

    const chats = shuffle(window.CHATS).slice(0, 4);
    chats.forEach((c, i) => {
      state.events.push({ at: DAY_START + 20 + i * 110 + rand(50), kind: 'chat', data: c });
    });

    const weirdCount = 1 + (Math.random() < 0.5 ? 1 : 0);
    shuffle(window.WEIRD_TASKS).slice(0, weirdCount).forEach((w) => {
      state.events.push({ at: DAY_START + 90 + rand(DAY_END - DAY_START - 150), kind: 'weird', data: w });
    });

    state.events.sort((a, b) => a.at - b.at);
  }

  function addTask(template, notify = true) {
    const task = {
      ...template,
      uid: template.id + '-' + state.taskSeq++,
      due: state.minute + template.deadline
    };
    state.tasks.push(task);
    if (notify) toast('새 업무: ' + plain(template.title));
    renderTasks();
    return task;
  }

  // ---------- 시간 ----------
  function resume() {
    state.paused = false;
    if (!timer) timer = setInterval(tick, TICK_MS);
  }

  function pause() {
    state.paused = true;
  }

  function stopTimer() {
    clearInterval(timer);
    timer = null;
  }

  function tick() {
    if (state.paused) return;
    advance(1);
  }

  // 게임 시간을 min 분만큼 흘린다
  function advance(min) {
    for (let i = 0; i < min; i++) {
      state.minute += 1;
      if (state.phase === 'overtime') {
        state.stats.stamina = clamp(state.stats.stamina - 0.15, 0, 100);
        state.stats.mental = clamp(state.stats.mental - 0.1, 0, 100);
      }
      fireEvents();
      checkDeadlines();
      if (state.phase === 'work' && !state.lunchDone && state.minute >= LUNCH_AT) {
        state.lunchDone = true;
        renderClock();
        return lunch();
      }
      if (state.phase === 'work' && state.minute >= DAY_END) {
        renderClock();
        return endOfWorkday();
      }
      if (state.phase === 'overtime' && state.minute >= OVERTIME_END) {
        renderClock();
        toast('22시. 건물 소등. 더는 못 한다.');
        return leaveOffice();
      }
    }
    renderClock();
    renderStats();
    renderTasks();
    checkBurnout();
  }

  function fireEvents() {
    while (state.events.length && state.events[0].at <= state.minute) {
      const ev = state.events.shift();
      if (state.phase !== 'work') continue;
      if (ev.kind === 'task') addTask(ev.data);
      if (ev.kind === 'chat') addChat(ev.data);
      if (ev.kind === 'weird') addWeird(ev.data);
    }
  }

  function checkDeadlines() {
    const late = state.tasks.filter((t) => state.minute > t.due);
    late.forEach((t) => {
      state.tasks = state.tasks.filter((x) => x !== t);
      state.missed++;
      if (state.activeTaskId === t.uid) {
        state.activeTaskId = null;
        renderWork();
      }
      applyEffects({ perf: -5, rep: -3 });
      toast('마감 놓침: ' + plain(t.title) + ' (성과 -5, 평판 -3)');
    });
    if (late.length) renderTasks();
  }

  // ---------- 업무 ----------
  function openTask(uid) {
    state.activeTaskId = uid;
    renderTasks();
    renderWork();
    showTab('work');
  }

  function finishTask(task, quality, note) {
    state.tasks = state.tasks.filter((t) => t !== task);
    state.activeTaskId = null;
    const effects = { stamina: -Math.round(task.minutes / 6) };
    if (quality >= 0.9) {
      effects.perf = Math.round(task.minutes / 5);
      effects.rep = 2;
      state.done++;
    } else if (quality >= 0.6) {
      effects.perf = Math.round(task.minutes / 12);
      effects.mental = -3;
      state.done++;
    } else {
      effects.perf = -2;
      effects.rep = -2;
      effects.mental = -5;
      state.missed++;
    }
    if (task.weird) effects.mental = (effects.mental || 0) - 4;
    applyEffects(effects);
    learnTerms(task.title);
    renderResult(task, quality, note, effects);
    renderTasks();
    advance(task.minutes);
  }

  function renderResult(task, quality, note, effects) {
    const verdict = quality >= 0.9 ? '통과' : quality >= 0.6 ? '수정 후 통과' : '반려';
    const cls = quality >= 0.9 ? 'up' : quality >= 0.6 ? '' : 'down';
    $('#work-area').innerHTML = `
      <h3>${rich(task.title)}</h3>
      <p class="from">${escapeHtml(task.from)} · ${task.minutes}분 소요</p>
      <div class="doc"><strong class="${cls}">${verdict}</strong>
        ${note ? `<p>${rich(note)}</p>` : ''}
        <p class="hint">${escapeHtml(effectText(effects))}</p>
      </div>
      <div class="row"><button class="secondary" type="button" data-action="back">업무 목록으로</button></div>`;
  }

  function renderWork() {
    const area = $('#work-area');
    const task = state.tasks.find((t) => t.uid === state.activeTaskId);
    if (!task) {
      area.innerHTML = `<div class="idle"><p>왼쪽 업무 목록에서 처리할 업무를 고르세요.</p>
        <p class="hint">업무는 처리할 때마다 시간이 흐르고 체력이 줄어요.</p></div>`;
      return;
    }
    const head = `<h3>${rich(task.title)}</h3>
      <p class="from">요청: ${escapeHtml(task.from)} · 마감 ${fmtTime(task.due)} · 처리 ${task.minutes}분</p>`;

    if (task.type === 'typing') {
      area.innerHTML = head + `
        <p class="hint">아래 문장을 그대로 입력하세요. 붙여넣기는 안 돼요.</p>
        <div class="doc target">${escapeHtml(task.text)}</div>
        <textarea class="typing-input" id="typing-input" aria-label="문서 입력" autocomplete="off" spellcheck="false"></textarea>
        <div class="row"><button class="primary" type="button" data-action="submit-typing">제출하기</button></div>`;
      const input = $('#typing-input');
      input.addEventListener('paste', (e) => { e.preventDefault(); toast('복붙은 안 돼요. 직접 치세요.'); });
      input.focus({ preventScroll: true });
    } else if (task.type === 'review') {
      area.innerHTML = head + `
        <p class="hint">문서에서 틀린 줄을 하나 찾아 누르세요.</p>
        <div>${task.lines.map((l, i) => `<button class="review-line" type="button" data-action="review" data-index="${i}">${rich(l)}</button>`).join('')}</div>`;
    } else if (task.type === 'match') {
      area.innerHTML = head + `
        <p><strong>${escapeHtml(task.question)}</strong></p>
        <div class="choices">${shuffle(task.options.map((o, i) => ({ ...o, i }))).map((o) =>
          `<button class="choice" type="button" data-action="match" data-index="${o.i}">${escapeHtml(o.label)}</button>`).join('')}</div>`;
    }
  }

  function onWorkClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'back') {
      renderWork();
      showTab('tasks');
      return;
    }
    const task = state.tasks.find((t) => t.uid === state.activeTaskId);
    if (!task) return;

    if (action === 'submit-typing') {
      const typed = $('#typing-input').value;
      if (!typed.trim()) { toast('내용을 입력하세요.'); return; }
      const acc = similarity(typed, task.text);
      finishTask(task, acc, `정확도 ${Math.round(acc * 100)}%`);
    } else if (action === 'review') {
      const ok = Number(btn.dataset.index) === task.errorIndex;
      finishTask(task, ok ? 1 : 0, (ok ? '정확히 찾았어요. ' : '틀린 줄을 놓쳤어요. ') + task.explain);
    } else if (action === 'match') {
      const ok = task.options[Number(btn.dataset.index)].correct;
      finishTask(task, ok ? 1 : 0, (ok ? '맞아요. ' : '반려됐어요. ') + task.explain);
    }
  }

  // ---------- 메신저 ----------
  function addChat(chat) {
    state.chats.unshift({ ...chat, id: 'c' + state.minute + rand(1000), answered: false, isNew: true });
    toast(chat.from + ': 새 메시지');
    renderChats();
  }

  function addWeird(w) {
    state.chats.unshift({
      id: 'w' + state.minute + rand(1000),
      from: w.from,
      text: w.message,
      weird: w,
      answered: false,
      isNew: true,
      options: [
        { label: '네, 제가 하겠습니다.', effects: { rep: 5, mental: -6 }, result: '업무 목록에 추가됐다.', accept: true },
        { label: '죄송하지만 오늘 마감 업무가 있어서 어렵습니다.', effects: { rep: -5, mental: 2 }, result: '분위기가 잠깐 싸해졌다.' }
      ]
    });
    toast(w.from + ': 잠깐 부탁이 있는데...');
    renderChats();
  }

  function answerChat(chatId, optIndex) {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat || chat.answered) return;
    const opt = chat.options[optIndex];
    chat.answered = true;
    chat.isNew = false;
    chat.result = opt.result;
    chat.picked = opt.label;
    learnTerms(chat.text);
    applyEffects(opt.effects);
    if (opt.accept && chat.weird) addTask({ ...chat.weird.task, weird: true });
    renderChats();
    if (opt.minutes) advance(opt.minutes);
  }

  async function answerChatFree(chatId, text) {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat || chat.answered || !text.trim()) return;
    chat.pending = true;
    renderChats();
    try {
      const r = await window.AI.evaluate({ from: chat.from, rank: chat.rank, scene: chat.scene, message: plain(chat.text), answer: text });
      chat.answered = true;
      chat.picked = text;
      chat.ai = r;
      chat.result = r.reply;
      learnTerms(chat.text);
      applyEffects(r.effects);
    } catch (e) {
      toast('AI 채점에 실패했어요. 선택지로 답해 주세요.');
    }
    chat.pending = false;
    chat.isNew = false;
    renderChats();
  }

  function renderChats() {
    const list = $('#chat-list');
    if (!state.chats.length) {
      list.innerHTML = '<p class="empty">아직 조용하다. 불길하다.</p>';
    } else {
      list.innerHTML = state.chats.map((c) => {
        let body = '';
        if (c.answered) {
          body = `<div class="result">나: ${escapeHtml(c.picked)}</div>`;
          if (c.ai) {
            body += `<table class="score-table">${Object.entries(c.ai.scores || {}).map(([k, v]) =>
              `<tr><td>${escapeHtml(k)}</td><td>${Number(v)}/10</td></tr>`).join('')}</table>
              <div class="result">${escapeHtml(c.ai.feedback || '')}</div>
              ${c.ai.better ? `<div class="result">더 좋은 답: ${escapeHtml(c.ai.better)}</div>` : ''}`;
          }
          if (c.result) body += `<div class="result">${escapeHtml(c.result)}</div>`;
        } else if (c.pending) {
          body = '<div class="result">AI가 채점 중...</div>';
        } else {
          body = `<div class="choices">${c.options.map((o, i) =>
            `<button class="choice" type="button" data-chat="${c.id}" data-opt="${i}">${escapeHtml(o.label)}</button>`).join('')}</div>`;
          if (window.AI.enabled() && c.scene) {
            body += `<textarea data-free="${c.id}" aria-label="직접 답장 쓰기" placeholder="직접 답장 쓰기"></textarea>
              <div class="row"><button class="secondary" type="button" data-send="${c.id}">보내고 AI 채점받기</button></div>`;
          }
        }
        return `<div class="chat ${c.isNew ? 'new' : ''}">
          <div class="who">${escapeHtml(c.from)}${c.rank ? ' · ' + escapeHtml(c.rank) : ''}</div>
          <div>${rich(c.text)}</div>${body}</div>`;
      }).join('');
    }
    const unread = state.chats.filter((c) => !c.answered).length;
    const badge = $('#chat-badge');
    badge.hidden = unread === 0;
    badge.textContent = unread;
  }

  function onChatClick(e) {
    const opt = e.target.closest('[data-chat]');
    if (opt) return answerChat(opt.dataset.chat, Number(opt.dataset.opt));
    const send = e.target.closest('[data-send]');
    if (send) {
      const ta = document.querySelector(`[data-free="${send.dataset.send}"]`);
      answerChatFree(send.dataset.send, ta ? ta.value : '');
    }
  }

  // ---------- 휴식 ----------
  function takeBreak(kind) {
    if (state.phase !== 'work' || state.paused) return;
    state.breaks++;
    const isCoffee = kind === 'coffee';
    const effects = isCoffee ? { mental: 8, money: -4500 } : { mental: 10, stamina: -2 };
    let msg = isCoffee ? '아이스 아메리카노 한 잔. 살 것 같다.' : '옥상에서 한숨 돌렸다.';
    if (state.breaks > BREAK_LIMIT) {
      effects.rep = -4;
      msg += ' 그런데 팀장님이 "또 나가요?"라고 했다.';
    }
    applyEffects(effects);
    if (Math.random() < 0.4) msg += ' 들은 소문: "' + pick(window.RUMORS) + '"';
    toast(msg);
    advance(isCoffee ? 15 : 10);
  }

  // ---------- 점심 ----------
  function lunch() {
    pause();
    openModal('<h3>12:00 점심시간</h3><p>뭐 먹지?</p>', window.LUNCH.map((l) => ({
      label: l.label,
      onClick: () => {
        applyEffects(l.effects);
        closeModal();
        toast(l.result);
        // 일하면서 먹으면 남은 업무 하나의 마감이 늘어난다
        if (l.work && state.tasks.length) state.tasks[0].due += l.work;
        // 점심시간 1시간은 마감 계산에서 뺀다
        state.tasks.forEach((t) => { t.due += 13 * 60 - state.minute; });
        state.minute = 13 * 60;
        renderAll();
        resume();
      }
    })));
  }

  // ---------- 퇴근 ----------
  function endOfWorkday() {
    pause();
    const left = state.tasks.length;
    if (!left) {
      openModal('<h3>18:00 정시 퇴근</h3><p>오늘 할 일을 다 끝냈다. 칼퇴다.</p>',
        [{ label: '퇴근하기', onClick: () => { closeModal(); leaveOffice(); } }]);
      return;
    }
    openModal(`<h3>18:00 퇴근 시간</h3><p>아직 업무가 ${left}개 남았다.</p>
      <p class="hint">야근하면 체력과 멘탈이 계속 줄어요. 그냥 퇴근하면 남은 업무 하나당 성과 -4.</p>`, [
      { label: '야근한다', onClick: () => { closeModal(); startOvertime(); } },
      { label: '내일의 내가 하겠지. 퇴근', onClick: () => {
        applyEffects({ perf: -4 * left });
        state.missed += left;
        state.tasks = [];
        closeModal();
        leaveOffice();
      } }
    ]);
  }

  function startOvertime() {
    state.phase = 'overtime';
    renderClock();
    toast('야근 시작. 남은 업무를 끝내면 퇴근할 수 있어요.');
    resume();
  }

  function leaveOffice() {
    pause();
    state.phase = 'evening';
    // 남은 업무는 오늘 처리 못 한 것으로 친다
    if (state.tasks.length) {
      state.missed += state.tasks.length;
      applyEffects({ perf: -4 * state.tasks.length });
      state.tasks = [];
    }
    state.activeTaskId = null;
    renderAll();
    if (state.minute < 20 * 60 && Math.random() < 0.4) return teamDinner();
    evening();
  }

  function teamDinner() {
    const d = window.TEAM_DINNER;
    openModal(`<h3>회식 소집</h3><p>${escapeHtml(d.text)}</p>`, d.options.map((o) => ({
      label: o.label,
      onClick: () => {
        applyEffects(o.effects);
        if (o.hangover) state.hangover = true;
        closeModal();
        summary(o.result);
      }
    })));
  }

  function evening() {
    openModal(`<h3>${fmtTime(state.minute)} 퇴근 후</h3><p>오늘 저녁은?</p>`, window.EVENING.map((o) => ({
      label: o.label,
      onClick: () => {
        applyEffects(o.effects);
        closeModal();
        summary(o.result);
      }
    })));
  }

  function summary(eveningResult) {
    if (state.over) return;
    stopTimer();
    const rows = Object.keys(STAT_INFO).map((k) => {
      const before = state.dayStartStats[k];
      const after = state.stats[k];
      const diff = Math.round(after - before);
      const show = k === 'money' ? fmtMoney(Math.round(after)) : Math.round(after);
      const d = diff === 0 ? '' : `<span class="${diff > 0 ? 'up' : 'down'}">(${diff > 0 ? '+' : ''}${k === 'money' ? diff.toLocaleString('ko-KR') : diff})</span>`;
      return `<tr><td>${STAT_INFO[k].label}</td><td>${show} ${d}</td></tr>`;
    }).join('');
    const terms = state.todayTerms.length
      ? `<p>오늘 배운 용어: ${state.todayTerms.map((t) => `<button type="button" class="term" data-term="${t}">${t}</button>`).join(', ')}</p>`
      : '';
    openModal(`<h3>${state.day}일차 결산</h3>
      <p>${escapeHtml(eveningResult)}</p>
      <table class="summary">
        <tr><td>처리한 업무</td><td>${state.done}개</td></tr>
        <tr><td>놓친 업무</td><td>${state.missed}개</td></tr>
        ${rows}
      </table>${terms}`, [
      { label: '다음 날 출근', onClick: () => { closeModal(); state.day++; save(); startDay(); } }
    ]);
    save();
  }

  function checkBurnout() {
    if (state.over) return;
    if (state.stats.stamina <= 0 || state.stats.mental <= 0) {
      state.over = true;
      stopTimer();
      clearSave();
      const why = state.stats.stamina <= 0 ? '체력이 바닥나 쓰러졌다.' : '멘탈이 무너졌다.';
      openModal(`<h3>번아웃 엔딩</h3><p>${why} ${state.day}일차에 회사를 떠난다.</p>
        <p class="hint">쉬는 것도 일이다. 커피타임, 점심, 퇴근 후 휴식을 챙겨 보세요.</p>`, [
        { label: '처음부터 다시', onClick: () => location.reload() }
      ]);
    }
  }

  // ---------- 용어 ----------
  function learnTerms(text) {
    termsIn(text).forEach((t) => {
      if (!window.TERMS[t]) return;
      if (!state.glossary.includes(t)) {
        state.glossary.push(t);
        state.todayTerms.push(t);
      }
    });
    renderGlossaryCount();
  }

  function showTerm(t) {
    const info = window.TERMS[t];
    if (!info) return;
    learnTerms('{{' + t + '}}');
    const wasOpen = $('#modal').open;
    const prev = wasOpen ? $('#modal-body').innerHTML : null;
    const prevButtons = wasOpen ? modalButtons : null;
    const wasPaused = state.paused;
    if (!wasOpen) pause();
    openModal(`<h3>${escapeHtml(t)}</h3><p class="hint">${escapeHtml(info.field)} 용어</p>
      <p>${escapeHtml(info.meaning)}</p><p class="example">예: "${escapeHtml(info.example)}"</p>`, [
      { label: '알겠어요', onClick: () => {
        if (prev !== null) {
          $('#modal-body').innerHTML = prev;
          modalButtons = prevButtons;
        } else {
          closeModal();
          if (!wasPaused) resume();
        }
      } }
    ]);
  }

  function showGlossary() {
    const total = Object.keys(window.TERMS).length;
    const items = state.glossary.length
      ? state.glossary.map((t) => {
        const info = window.TERMS[t];
        return `<div class="glossary-item"><strong>${escapeHtml(t)}</strong> <span class="field">${escapeHtml(info.field)}</span>
          <div>${escapeHtml(info.meaning)}</div><div class="example">예: "${escapeHtml(info.example)}"</div></div>`;
      }).join('')
      : '<p class="empty">아직 배운 용어가 없어요. 업무와 메신저의 밑줄 친 용어를 눌러 보세요.</p>';
    const wasPaused = state.paused;
    pause();
    openModal(`<h3>용어집 ${state.glossary.length} / ${total}</h3>${items}`, [
      { label: '닫기', onClick: () => { closeModal(); if (!wasPaused) resume(); } }
    ]);
  }

  // ---------- 모달 ----------
  let modalButtons = [];

  function openModal(html, buttons) {
    modalButtons = buttons;
    $('#modal-body').innerHTML = html + `<div class="choices">${buttons.map((b, i) =>
      `<button class="${i === 0 ? 'primary' : 'choice'}" type="button" data-modal="${i}">${escapeHtml(b.label)}</button>`).join('')}</div>`;
    const m = $('#modal');
    if (!m.open) m.showModal();
  }

  function closeModal() {
    const m = $('#modal');
    if (m.open) m.close();
  }

  // ---------- 화면 ----------
  function renderClock() {
    $('#clock').textContent = fmtTime(state.minute);
    $('#phase-label').textContent = state.phase === 'overtime' ? '야근 중' : '';
  }

  function renderStats() {
    setHtml($('#stats'), Object.entries(STAT_INFO).map(([k, info]) => {
      const v = state.stats[k];
      if (!info.bar) {
        return `<div class="stat"><span class="label">${info.label}</span><span class="value">${k === 'money' ? fmtMoney(Math.round(v)) : Math.round(v)}</span></div>`;
      }
      const level = v < 25 ? 'low' : v < 50 ? 'mid' : '';
      return `<div class="stat"><span class="label">${info.label}</span>
        <span class="bar"><span class="fill ${level}" style="width:${v}%"></span></span>
        <span class="value">${Math.round(v)}</span></div>`;
    }).join(''));
  }

  // 매초 다시 그리면 누르던 버튼이 사라지므로 내용이 바뀔 때만 그린다
  function setHtml(el, html) {
    if (el.dataset.html !== html) {
      el.innerHTML = html;
      el.dataset.html = html;
    }
  }

  function renderTasks() {
    const list = $('#task-list');
    if (!state.tasks.length) {
      setHtml(list, `<li class="empty">${state.phase === 'overtime' ? '다 끝냈다! 퇴근할 수 있어요.' : '지금은 할 일이 없다. 곧 생긴다.'}</li>` +
        (state.phase === 'overtime' ? '<li><button class="primary" type="button" id="btn-leave">퇴근하기</button></li>' : ''));
      return;
    }
    setHtml(list, state.tasks
      .slice()
      .sort((a, b) => a.due - b.due)
      .map((t) => {
        const left = t.due - state.minute;
        return `<li><button class="task ${t.uid === state.activeTaskId ? 'active' : ''} ${t.weird ? 'weird' : ''}" type="button" data-task="${t.uid}">
          <span>${escapeHtml(plain(t.title))}</span>
          <span class="meta"><span>${escapeHtml(t.from)}</span><span class="due ${left < 60 ? 'urgent' : ''}">마감 ${fmtTime(t.due)}</span></span>
        </button></li>`;
      }).join(''));
  }

  function renderGlossaryCount() {
    $('#glossary-count').textContent = state.glossary.length;
  }

  function renderAll() {
    renderClock();
    renderStats();
    renderTasks();
    renderWork();
    renderChats();
    renderGlossaryCount();
  }

  function showTab(name) {
    $$('.mobile-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    $$('.panel').forEach((p) => p.classList.toggle('show', p.dataset.panel === name));
  }

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ---------- 이벤트 연결 ----------
  function bind() {
    const saved = load();
    if (saved) {
      const btn = $('#btn-continue');
      btn.hidden = false;
      btn.textContent = `이어서 출근하기 (${saved.day}일차)`;
      btn.addEventListener('click', () => continueGame(saved));
    }
    $('#btn-start').addEventListener('click', () => {
      clearSave();
      newGame($('.job.selected').dataset.job);
    });

    $('#task-list').addEventListener('click', (e) => {
      if (e.target.closest('#btn-leave')) return leaveOffice();
      const b = e.target.closest('[data-task]');
      if (b) openTask(b.dataset.task);
    });
    $('#work-area').addEventListener('click', onWorkClick);
    $('#chat-list').addEventListener('click', onChatClick);
    $('#btn-coffee').addEventListener('click', () => takeBreak('coffee'));
    $('#btn-smoke').addEventListener('click', () => takeBreak('smoke'));
    $('#btn-glossary').addEventListener('click', showGlossary);
    $$('.mobile-tabs button').forEach((b) => b.addEventListener('click', () => {
      showTab(b.dataset.tab);
      if (b.dataset.tab === 'chat') {
        state.chats.forEach((c) => { c.isNew = false; });
      }
    }));

    // 용어 버튼은 화면 어디에 있든 동작
    document.addEventListener('click', (e) => {
      const t = e.target.closest('.term');
      if (t) {
        e.preventDefault();
        e.stopPropagation();
        showTerm(t.dataset.term);
      }
    }, true);

    $('#modal').addEventListener('click', (e) => {
      const b = e.target.closest('[data-modal]');
      if (b) modalButtons[Number(b.dataset.modal)].onClick();
    });
    // Esc로 모달이 닫혀 게임이 멈춘 채 남지 않게 막는다
    $('#modal').addEventListener('cancel', (e) => e.preventDefault());
  }

  bind();
})();
