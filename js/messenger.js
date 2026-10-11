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
      // 단톡방은 나를 부를 때만 알림을 띄운다
      if (!window.ROOMS_EXTRA[roomId] || extra.ping) W.toast(`${window.ROOMS_EXTRA[roomId] ? '[' + room.name + '] ' : ''}` + `${W.person(from).name}: ${W.plain(text).slice(0, 40)}`);
    }
    W.renderMessenger();
  };

  // 답이 필요한 메시지
  M.ask = (chat, roomId = chat.from) => {
    const room = M.room(roomId);
    M.post(roomId, chat.from, chat.text, { ping: true });
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
    W.afterAnswer(chat, opt);
    if (opt.accept && chat.weird) W.addTask({ ...chat.weird.task, weird: true }, false);
    setTimeout(() => {
      if (opt.reply) M.post(roomId, chat.from, opt.reply);
      if (opt.spawn) W.addTask(W.gen[opt.spawn](), true, chat.from);
    }, 700);
    if (opt.minutes) W.advance(opt.minutes);
  };

  // AI 응답을 기다리는 방 (저장하지 않는다)
  const thinking = new Set();
  const drafts = new Map(); // 상대가 쓰는 중인 글
  M.thinking = (roomId) => thinking.has(roomId);
  const aiRoom = (roomId) => window.AI.enabled() && ((window.PEOPLE[roomId] && roomId !== 'me') || !!window.ROOMS_EXTRA[roomId]);

  // 답이 필요한 메시지에 직접 쓴 답. AI가 가장 가까운 선택지를 골라 이야기는 그대로 이어진다.
  M.answerFree = async (roomId, text) => {
    const room = M.room(roomId);
    const chat = room.pending;
    text = String(text || '').trim();
    if (!chat || !text || thinking.has(roomId)) return;
    const ta = W.$('#free-' + roomId);
    if (ta) ta.value = '';
    room.pending = null;
    M.post(roomId, 'me', text);
    thinking.add(roomId);
    W.renderMessenger();
    let r;
    try {
      r = await window.AI.answer(chat, text);
    } catch (e) {
      thinking.delete(roomId);
      room.pending = chat;
      W.toast((e && e.message) || 'AI 응답을 받지 못했어요. 선택지로 답해 주세요.');
      W.renderMessenger();
      return;
    }
    thinking.delete(roomId);
    const opt = chat.options[r.pick];
    W.learnTerms(chat.text);
    W.applyEffects(opt.effects);
    if (r.bonus) W.applyEffects({ rep: r.bonus });
    W.afterAnswer(chat, opt);
    if (opt.accept && chat.weird) W.addTask({ ...chat.weird.task, weird: true }, false);
    const lines = String(r.reply || opt.reply || '네.').split(/\n+/).map((x) => x.trim()).filter(Boolean).slice(0, 3);
    postBubbles(roomId, lines.map((t) => ({ from: chat.from, text: t })));
    if (!chat.story && !chat.group) setTimeout(() => M.post(roomId, 'system', '', { kind: 'score', score: r }), lines.length * 900);
    if (opt.spawn) W.addTask(W.gen[opt.spawn](), true, chat.from);
    if (opt.minutes) W.advance(opt.minutes);
  };

  // 자유 대화: 아무 말이나 걸면 상대가 성격, 호감도, 기억대로 답한다
  // 말풍선 여러 개를 사람이 치듯 조금씩 올린다
  const postBubbles = (roomId, list) => list.forEach((b, i) => setTimeout(() => M.post(roomId, b.from, b.text), i * 900));

  M.say = async (roomId, text) => {
    text = String(text || '').trim();
    if (!text || thinking.has(roomId)) return;
    const group = !!window.ROOMS_EXTRA[roomId];
    if ((group || !window.PEOPLE[roomId].external) && !W.canTalk()) return W.toast('지금은 말 걸 수 없어요.');
    const ta = W.$('#free-' + roomId);
    if (ta) ta.value = '';
    M.post(roomId, 'me', text);
    thinking.add(roomId);
    W.renderMessenger();
    try {
      if (group) {
        const replies = await window.AI.group(roomId, W.groupMembers(roomId), text);
        thinking.delete(roomId);
        postBubbles(roomId, replies.length ? replies : [{ from: W.groupMembers(roomId)[0], text: 'ㅋㅋ' }]);
        W.advance(2);
        W.renderMessenger();
        return;
      }
      const r = await window.AI.chat(roomId, text, (draft) => { drafts.set(roomId, draft); W.renderMessenger(); });
      thinking.delete(roomId);
      drafts.delete(roomId);
      postBubbles(roomId, r.bubbles.map((t) => ({ from: roomId, text: t })));
      // 말로 올릴 수 있는 호감도는 하루 한 사람당 8까지
      const key = `${roomId}:ai`;
      const day = W.s.talked[key] && W.s.talked[key].day === W.s.day ? W.s.talked[key] : { day: W.s.day, up: 0 };
      if (r.rel > 0) { r.rel = Math.min(r.rel, 8 - day.up); day.up += r.rel; }
      W.s.talked[key] = day;
      if (r.rel) W.addRel(roomId, r.rel);
      if (r.mental) W.applyEffects({ mental: r.mental });
      if (r.karma) W.karma(r.karma, roomId, '', W.person(roomId).name);
      if (r.rel >= 3) W.toast(`${W.person(roomId).name}님 호감도 +${r.rel}`);
      else if (r.rel <= -3) W.toast(`${W.person(roomId).name}님 호감도 −${-r.rel}`);
      W.advance(3);
    } catch (e) {
      thinking.delete(roomId);
      drafts.delete(roomId);
      W.toast((e && e.message) || 'AI 응답을 받지 못했어요.');
    }
    W.renderMessenger();
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
      // 다시 그려도 쓰던 글은 남긴다
      const draft = W.$('.free textarea', el);
      const keep = draft && { id: draft.id, value: draft.value, focus: document.activeElement === draft };
      if (W.setHtml(el, roomView(M.room(W.s.openRoom)))) {
        const again = keep && W.$('#' + keep.id, el);
        if (again && !again.value) { again.value = keep.value; if (keep.focus) again.focus(); }
        const sc = W.$('.msg-scroll', el);
        if (sc) sc.scrollTop = sc.scrollHeight;
      }
      return;
    }
    W.setHtml(el, listView());
  };

  function listView() {
    const rooms = Object.values(W.s.rooms).sort((a, b) => b.last - a.last);
    const head = `<div class="msg-head"><h2>메신저</h2><button type="button" class="link-btn" data-dir>${W.s.showDir ? '대화 목록' : '동료 목록 · 말 걸기'}</button></div>`;
    if (W.s.showDir) {
      return head + `<ul class="room-list">${W.colleagues().map((id) => `<li><button type="button" class="room-item" data-room="${id}">
        ${W.avatar(id)}<span class="room-main"><span class="room-name">${esc(W.fullName(id))} <small>${esc(W.person(id).dept)}</small></span>
        <span class="room-preview">${W.storyBeat(id) ? '할 이야기가 있는 것 같다' : '호감도 ' + W.rel(id)}</span></span>
        <span class="room-side">${W.tierChip(id)}${W.storyBeat(id) ? '<span class="dot" title="이야기"></span>' : ''}</span></button></li>`).join('')}</ul>`;
    }
    if (!rooms.length) return head + '<p class="empty pad">아직 조용하다. 불길하다.</p>';
    return `${head}<ul class="room-list">${rooms.map((r) => {
      const last = r.messages[r.messages.length - 1];
      const isTeam = !!window.ROOMS_EXTRA[r.id];
      const preview = last ? (last.kind === 'request' ? '[업무 요청] ' : '') + W.plain(last.text || '') : '';
      return `<li><button type="button" class="room-item" data-room="${r.id}">
        ${isTeam ? `<span class="avatar md c${window.ROOMS_EXTRA[r.id].color || 1} team" aria-hidden="true">${window.ROOMS_EXTRA[r.id].short || '팀'}</span>` : W.avatar(r.id)}
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
    const ai = aiRoom(room.id);
    const box = (attr, ph, btn) => `<div class="free"><textarea class="input" rows="2" id="free-${room.id}" maxlength="300" placeholder="${ph}"></textarea>
      <button type="button" class="btn" ${attr}="${room.id}">${btn}</button></div>`;
    const quick = thinking.has(room.id)
      ? (drafts.get(room.id) ? `<div class="quick"><div class="msg head">${W.avatar(room.id, 'sm')}<div class="msg-col"><div class="bubble draft">${esc(drafts.get(room.id))}</div></div></div></div>` : `<p class="hint quick typing">${isTeam ? '누군가' : esc(p.name) + '님이'} 입력 중...</p>`)
      : pending
        ? `<div class="quick">${pending.options.map((o, i) => `<button type="button" class="quick-btn" data-answer="${room.id}" data-i="${i}">${W.rich(o.label)}</button>`).join('')}</div>
          ${ai ? box('data-free', '또는 직접 답장 쓰기', pending.story ? '보내기' : '보내고 AI 채점받기') : ''}`
        : (W.talkOptions(room.id) || (ai ? '' : '<p class="hint quick">답장할 메시지가 없어요.</p>'))
          + (ai && (p.external || W.canTalk()) ? box('data-say', isTeam ? '단톡방에 하고 싶은 말을 써 보세요' : `${p.name}님에게 하고 싶은 말을 자유롭게 써 보세요`, '보내기') : '');
    return `<div class="msg-head room-head">
        <button type="button" class="icon-btn" data-room-back aria-label="대화방 목록으로">‹</button>
        ${isTeam ? `<span class="avatar sm c${window.ROOMS_EXTRA[room.id].color || 1} team" aria-hidden="true">${window.ROOMS_EXTRA[room.id].short || '팀'}</span>` : W.avatar(room.id, 'sm')}
        <div><strong>${esc(room.name)}</strong>${isTeam ? '' : `<small>${esc(p.dept)}</small>`}</div>
        ${isTeam || !window.PEOPLE[room.id] ? '' : `<span class="room-tier">${W.tierChip(room.id)}</span>`}
      </div>
      <div class="msg-scroll">${bubbles}</div>${quick}`;
  }

  M.bind = () => {
    M.bindKeys();
    const el = W.$('#messenger');
    el.addEventListener('click', (e) => {
      const r = e.target.closest('[data-room]');
      if (r) return M.open(r.dataset.room);
      if (e.target.closest('[data-room-back]')) { W.s.openRoom = null; return W.renderMessenger(); }
      const a = e.target.closest('[data-answer]');
      if (a) return M.answer(a.dataset.answer, Number(a.dataset.i));
      const f = e.target.closest('[data-free]');
      if (f) return M.answerFree(f.dataset.free, W.$('#free-' + f.dataset.free).value);
      const sy = e.target.closest('[data-say]');
      if (sy) return M.say(sy.dataset.say, W.$('#free-' + sy.dataset.say).value);
      if (e.target.closest('[data-dir]')) { W.s.showDir = !W.s.showDir; return W.renderMessenger(); }
      const tk = e.target.closest('[data-talk]');
      if (tk) return W.talk(tk.dataset.who, tk.dataset.talk);
      const o = e.target.closest('[data-open-task]');
      if (o) return W.openTask(o.dataset.openTask);
    });
  };

  // 엔터로 보내기 (Shift+엔터는 줄바꿈)
  M.bindKeys = () => {
    W.$('#messenger').addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !e.target.id || !e.target.id.startsWith('free-')) return;
      e.preventDefault();
      const id = e.target.id.slice(5);
      if (M.room(id).pending) M.answerFree(id, e.target.value);
      else M.say(id, e.target.value);
    });
  };

  M.open = (roomId) => {
    W.s.openRoom = roomId;
    W.s.showDir = false;
    M.room(roomId).unread = 0;
    W.renderMessenger();
  };
})();
