// 사내 메신저: 대화방 목록, 말풍선, 프로필, 빠른 답장
(() => {
  const W = window.WNE;
  const esc = W.esc;
  const M = (W.msg = {});

  M.room = (id) => {
    const rooms = W.s.rooms;
    if (!rooms[id]) {
      const extra = window.ROOMS_EXTRA[id];
      rooms[id] = { id, name: extra ? extra.name : W.fullName(id), messages: [], pending: null, unread: 0, last: 0 };
    }
    return rooms[id];
  };

  const viewing = (roomId) => W.s.openRoom === roomId && W.messengerVisible();

  // 메시지 올리기. kind: text | request(업무 요청 카드) | notice
  M.post = (roomId, from, text, extra = {}) => {
    const room = M.room(roomId);
    room.messages.push({ from, text, at: W.s.minute, ...extra });
    room.last = W.s.seq++;
    if (from !== 'me' && extra.kind !== 'score' && !viewing(roomId)) {
      room.unread++;
      W.toast(`${W.person(from).name}: ${W.plain(text).slice(0, 40)}`);
    }
    W.renderMessenger();
  };

  // 답이 필요한 메시지
  M.ask = (chat) => {
    const room = M.room(chat.from);
    M.post(chat.from, chat.from, chat.text);
    room.pending = chat;
    W.renderMessenger();
  };

  M.answer = (roomId, i) => {
    const room = M.room(roomId);
    const chat = room.pending;
    if (!chat) return;
    const opt = chat.options[i];
    room.pending = null;
    M.post(roomId, 'me', opt.label);
    W.learnTerms(chat.text);
    W.applyEffects(opt.effects);
    if (opt.accept && chat.weird) W.addTask({ ...chat.weird.task, weird: true }, false);
    setTimeout(() => {
      if (opt.reply) M.post(roomId, chat.from, opt.reply);
      if (opt.spawn) W.addTask(W.gen[opt.spawn](), true, chat.from);
    }, 700);
    if (opt.minutes) W.advance(opt.minutes);
  };

  M.answerFree = async (roomId, text) => {
    const room = M.room(roomId);
    const chat = room.pending;
    if (!chat || !text.trim()) return;
    room.pending = null;
    M.post(roomId, 'me', text);
    room.scoring = true;
    W.renderMessenger();
    try {
      const r = await window.AI.evaluate({ from: W.fullName(chat.from), scene: chat.scene, message: W.plain(chat.text), answer: text });
      room.scoring = false;
      W.learnTerms(chat.text);
      W.applyEffects(r.effects);
      M.post(roomId, chat.from, r.reply || '네.');
      M.post(roomId, 'system', '', { kind: 'score', score: r });
      const opt = chat.options.find((o) => o.spawn);
      if (opt) W.addTask(W.gen[opt.spawn](), true, chat.from);
    } catch (e) {
      room.scoring = false;
      room.pending = chat;
      W.toast('AI 채점에 실패했어요. 빠른 답장으로 골라 주세요.');
      W.renderMessenger();
    }
  };

  M.weird = (w) => {
    M.ask({
      from: w.from,
      text: w.message,
      weird: w,
      scene: '상사가 업무와 상관없는 개인적인 부탁을 한다.',
      options: [
        { label: '네, 제가 하겠습니다.', effects: { rep: 5, mental: -6 }, reply: '역시 {me}밖에 없어요~', accept: true },
        { label: '죄송하지만 오늘 마감 업무가 있어서 어렵습니다.', effects: { rep: -5, mental: 2 }, reply: '...아 그래요? 알겠어요.' }
      ]
    });
  };

  // ---------- 그리기 ----------
  W.renderMessenger = () => {
    const el = W.$('#messenger');
    if (!el || !W.s) return;
    const unreadTotal = Object.values(W.s.rooms).reduce((a, r) => a + r.unread, 0);
    W.$$('[data-badge="messenger"]').forEach((b) => { b.hidden = unreadTotal === 0; b.textContent = unreadTotal; });
    if (W.s.openRoom) {
      if (W.setHtml(el, roomView(M.room(W.s.openRoom)))) {
        const sc = W.$('.msg-scroll', el);
        if (sc) sc.scrollTop = sc.scrollHeight;
      }
      return;
    }
    W.setHtml(el, listView());
  };

  function listView() {
    const rooms = Object.values(W.s.rooms).sort((a, b) => b.last - a.last);
    if (!rooms.length) return '<div class="msg-head"><h2>메신저</h2></div><p class="empty pad">아직 조용하다. 불길하다.</p>';
    return `<div class="msg-head"><h2>메신저</h2></div><ul class="room-list">${rooms.map((r) => {
      const last = r.messages[r.messages.length - 1];
      const isTeam = !!window.ROOMS_EXTRA[r.id];
      const preview = last ? (last.kind === 'request' ? '[업무 요청] ' : '') + W.plain(last.text || '') : '';
      return `<li><button type="button" class="room-item" data-room="${r.id}">
        ${isTeam ? `<span class="avatar md c1 team" aria-hidden="true">팀</span>` : W.avatar(r.id)}
        <span class="room-main"><span class="room-name">${esc(r.name)}${isTeam ? '' : ` <small>${esc(W.person(r.id).dept)}</small>`}</span>
          <span class="room-preview">${esc(preview)}</span></span>
        <span class="room-side"><span class="room-time">${last ? W.fmtTime(last.at) : ''}</span>
          ${r.pending ? '<span class="dot" title="답장 필요"></span>' : r.unread ? `<span class="badge">${r.unread}</span>` : ''}</span>
      </button></li>`;
    }).join('')}</ul>`;
  }

  function roomView(room) {
    const isTeam = !!window.ROOMS_EXTRA[room.id];
    const p = W.person(room.id);
    let prevFrom = null;
    const bubbles = room.messages.map((m) => {
      if (m.kind === 'score') {
        const s = m.score;
        return `<div class="score-card"><strong>AI 채점</strong>
          <table>${Object.entries(s.scores || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${Number(v)}/10</td></tr>`).join('')}</table>
          <p>${esc(s.feedback || '')}</p>${s.better ? `<p class="hint">더 좋은 답: ${esc(s.better)}</p>` : ''}</div>`;
      }
      const mine = m.from === 'me';
      const showHead = !mine && m.from !== prevFrom;
      prevFrom = m.from;
      const body = m.kind === 'request'
        ? `<div class="bubble request"><span class="req-tag">업무 요청</span><strong>${W.rich(m.title)}</strong>
            <span>마감 ${W.fmtTime(m.due)}</span>${W.taskOpen(m.taskId) ? `<button type="button" class="btn small" data-open-task="${m.taskId}">업무함에서 열기</button>` : '<span class="hint">처리됨</span>'}</div>`
        : `<div class="bubble">${W.rich(m.text)}</div>`;
      return `<div class="msg ${mine ? 'mine' : ''} ${showHead ? 'head' : ''}">
        ${mine ? '' : showHead ? W.avatar(m.from, 'sm') : '<span class="avatar-space"></span>'}
        <div class="msg-col">${showHead ? `<span class="msg-name">${esc(W.fullName(m.from))}</span>` : ''}
          <div class="msg-line">${body}<span class="msg-time">${W.fmtTime(m.at)}</span></div></div></div>`;
    }).join('');
    const pending = room.pending;
    const quick = pending
      ? `<div class="quick">${pending.options.map((o, i) => `<button type="button" class="quick-btn" data-answer="${room.id}" data-i="${i}">${W.rich(o.label)}</button>`).join('')}</div>
        ${window.AI.enabled() && pending.scene ? `<div class="free"><textarea class="input" rows="2" id="free-${room.id}" placeholder="직접 답장 쓰기"></textarea>
          <button type="button" class="btn" data-free="${room.id}">보내고 AI 채점받기</button></div>` : ''}`
      : room.scoring ? '<p class="hint quick">AI가 채점 중...</p>' : '<p class="hint quick">답장할 메시지가 없어요.</p>';
    return `<div class="msg-head room-head">
        <button type="button" class="icon-btn" data-room-back aria-label="대화방 목록으로">‹</button>
        ${isTeam ? '<span class="avatar sm c1 team" aria-hidden="true">팀</span>' : W.avatar(room.id, 'sm')}
        <div><strong>${esc(room.name)}</strong>${isTeam ? '' : `<small>${esc(p.dept)}</small>`}</div>
      </div>
      <div class="msg-scroll">${bubbles}</div>${quick}`;
  }

  M.bind = () => {
    const el = W.$('#messenger');
    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-room]');
      if (r) return M.open(r.dataset.room);
      if (e.target.closest('[data-room-back]')) { W.s.openRoom = null; return W.renderMessenger(); }
      const a = e.target.closest('[data-answer]');
      if (a) return M.answer(a.dataset.answer, Number(a.dataset.i));
      const f = e.target.closest('[data-free]');
      if (f) return M.answerFree(f.dataset.free, W.$('#free-' + f.dataset.free).value);
      const o = e.target.closest('[data-open-task]');
      if (o) return W.openTask(o.dataset.openTask);
    });
  };

  M.open = (roomId) => {
    W.s.openRoom = roomId;
    M.room(roomId).unread = 0;
    W.renderMessenger();
  };
})();
