// 사람과의 관계: 호감도, 이어지는 이야기, 먼저 말 걸기, 덕과 업보가 돌아오는 일
(() => {
  const W = window.WNE;
  const esc = W.esc;
  const BOSSES = ['park', 'choi', 'kang'];
  // 메신저 동료 목록에 나오는 사람
  W.COLLEAGUES = ['park', 'lee', 'han', 'jung', 'choi', 'kang', 'yoon', 'oh', 'song', 'partner'];

  W.initRelations = () => {
    const s = W.s;
    if (!s.rel) s.rel = { lee: 10, han: 20 };
    if (!s.flags) s.flags = {};
    if (!s.story) s.story = {};
    if (!s.talked) s.talked = {};
    if (!s.returns) s.returns = [];
    if (!s.karma) s.karma = [];
  };

  W.rel = (id) => (W.s.rel && W.s.rel[id]) || 0;
  W.addRel = (id, n) => {
    if (!W.s.rel) W.s.rel = {};
    W.s.rel[id] = W.clamp(W.rel(id) + n, -100, 100);
  };
  W.relTier = (id) => {
    const r = W.rel(id);
    if (r < -20) return { key: 'cold', label: '냉랭', cls: 'bad' };
    if (r < 10) return { key: 'meh', label: '서먹', cls: '' };
    if (r < 40) return { key: 'ok', label: '보통', cls: 'warn' };
    return { key: 'close', label: '친함', cls: 'good' };
  };
  const tierChip = (id) => { const t = W.relTier(id); return `<span class="chip ${t.cls}" title="호감도 ${W.rel(id)}">${t.label}</span>`; };
  W.tierChip = tierChip;

  // ---------- 이야기 ----------
  W.storyBeat = (id) => {
    const st = window.STORIES[id];
    if (!st) return null;
    const i = W.s.story[id] || 0;
    const beat = st.beats[i];
    if (!beat) return null;
    if (W.s.day < beat.minDay || W.rel(id) < beat.minRel) return null;
    if (W.s.storyDay && W.s.storyDay[id] === W.s.day) return null;
    return { beat, i };
  };

  function beatNodes(beat) {
    if (!beat.variants) return beat.nodes;
    const v = beat.variants.find((x) => !x.need || W.s.flags[x.need]);
    return v.nodes;
  }

  W.startStory = (id) => {
    const found = W.storyBeat(id);
    if (!found) return false;
    const room = W.msg.room(id);
    if (room.pending) return false;
    askNode(id, found.i, 'start');
    return true;
  };

  function askNode(id, beatIdx, nodeId) {
    const beat = window.STORIES[id].beats[beatIdx];
    const node = beatNodes(beat)[nodeId];
    W.msg.ask({ from: id, text: node.text, options: node.options, story: { id, beat: beatIdx } });
  }

  // 메신저에서 답을 고른 뒤 불린다: 호감도, 기억, 덕·업보, 다음 노드
  W.afterAnswer = (chat, opt) => {
    const s = W.s;
    const id = chat.from;
    const name = W.person(id).name;
    if (opt.rel) W.addRel(id, opt.rel);
    if (opt.flag) s.flags[opt.flag] = true;
    if (opt.karma) W.karma(opt.karma, id, '', name);
    else if (chat.weird) W.karma(opt.accept ? 'helped' : 'refused', id, '', name);
    else if (!chat.story && opt.effects) {
      if ((opt.effects.rep || 0) > 0) W.karma('kind', id, '', name);
      else if ((opt.effects.rep || 0) < 0) W.karma('rude', id, '', name);
    }
    if (chat.story) {
      if (opt.next) setTimeout(() => askNode(id, chat.story.beat, opt.next), 1200);
      else {
        s.story[id] = chat.story.beat + 1;
        // 하루에 한 사람 이야기는 한 단계만
        if (!s.storyDay) s.storyDay = {};
        s.storyDay[id] = s.day;
      }
    }
  };

  // ---------- 먼저 말 걸기 ----------
  const TOPICS = [
    { key: 'small', label: '안부 묻기', say: '요즘 어떻게 지내세요?' },
    { key: 'coffee', label: '커피 사 드리기 (4,500원)', say: '커피 한잔하실래요? 제가 살게요!' },
    { key: 'help', label: '업무 좀 도와 달라고 하기', say: '혹시 제 업무 하나만 도와주실 수 있어요?' },
    { key: 'gossip', label: '요즘 소문 물어보기', say: '요즘 회사에 무슨 얘기 돌아요?' }
  ];

  W.canTalk = () => W.s.phase === 'work' || W.s.phase === 'overtime';

  W.talkOptions = (id) => {
    if (!W.canTalk() || !window.PEOPLE[id] || id === 'me') return '';
    const s = W.s;
    const used = (k) => s.talked[`${id}:${k}`] === s.day;
    const story = W.storyBeat(id) && !W.msg.room(id).pending;
    const external = window.PEOPLE[id].external;
    const list = TOPICS.filter((t) => !external || t.key === 'small');
    return `<div class="talk"><span class="label">말 걸기</span><div class="talk-row">
      ${story ? `<button type="button" class="quick-btn story" data-talk="story" data-who="${id}">이야기 나누기 <span class="dot"></span></button>` : ''}
      ${list.map((t) => `<button type="button" class="quick-btn" data-talk="${t.key}" data-who="${id}" ${used(t.key) ? 'disabled' : ''}>${esc(t.label)}${used(t.key) ? ' (오늘 함)' : ''}</button>`).join('')}
    </div></div>`;
  };

  const line = (arr) => W.pick(arr);

  W.talk = (id, key) => {
    const s = W.s;
    if (!W.canTalk()) return W.toast('지금은 말 걸 수 없어요.');
    if (key === 'story') { W.startStory(id); return; }
    if (s.talked[`${id}:${key}`] === s.day) return;
    s.talked[`${id}:${key}`] = s.day;
    const topic = TOPICS.find((t) => t.key === key);
    const M = W.msg;
    M.post(id, 'me', topic.say);
    const tier = W.relTier(id).key;
    const boss = BOSSES.includes(id);
    let reply;
    let after = () => {};
    if (key === 'small') {
      reply = line(window.TALK.smalltalk[tier]);
      W.addRel(id, tier === 'cold' ? 1 : 3);
      W.applyEffects({ mental: 1 });
      W.advance(5);
    } else if (key === 'coffee') {
      W.applyEffects({ money: -4500, mental: 3 });
      if (tier === 'cold') { reply = line(window.TALK.coffeeNo); W.addRel(id, 2); }
      else { reply = line(window.TALK.coffeeYes); W.addRel(id, 6); W.karma('kind', id, '', W.person(id).name); }
      W.advance(15);
    } else if (key === 'help') {
      const target = s.tasks.find((t) => !['approval', 'handover'].includes(t.type) && t.uid !== s.activeTaskId);
      if (boss) {
        reply = '그걸 나한테 시키는 거예요? 본인 일은 본인이 해요.';
        W.addRel(id, -6);
        W.applyEffects({ rep: -3 });
      } else if (!target) {
        reply = '지금 맡길 만한 업무가 없는 것 같은데요?';
      } else if (W.rel(id) >= 25) {
        reply = line(window.TALK.helpYes);
        W.addRel(id, -8);
        after = () => {
          if (!W.taskOpen(target.uid)) return;
          s.tasks = s.tasks.filter((t) => t !== target);
          s.done++;
          s.docs.unshift({ uid: target.uid, title: target.title, type: target.type, verdict: '통과', at: s.minute, by: id });
          W.toast(`${W.person(id).name}님이 "${W.plain(target.title)}"을 맡아 줬다. (호감도를 썼다)`);
          W.renderChrome();
          if (s.view === 'inbox' || s.view === 'home') W.renderMain();
        };
      } else {
        reply = line(window.TALK.helpNo);
        W.addRel(id, -2);
      }
    } else if (key === 'gossip') {
      if (W.rel(id) >= 15) {
        reply = line(window.TALK.gossipYes) + W.pick(window.RUMORS);
        W.addRel(id, 1);
      } else {
        reply = line(window.TALK.gossipNo);
        W.addRel(id, -1);
      }
    }
    setTimeout(() => { M.post(id, id, reply); after(); W.renderMessenger(); }, 700);
    W.renderMessenger();
  };

  // ---------- 오늘 돌아올 덕·업보, 오늘 올 이야기 ----------
  W.scheduleRelations = () => {
    const s = W.s;
    const q = s.queue;
    const at = () => {
      let t = C0() + 30 + W.rand(400);
      if (t >= 12 * 60 && t < 13 * 60) t += 60;
      return t;
    };
    const old = (s.karma || []).filter((k) => k.day < s.day && W.s.day - k.day <= 7);
    W.shuffle(old).filter(() => Math.random() < 0.35).slice(0, 3)
      .forEach((k) => q.push({ at: at(), kind: 'karma', data: { id: k.id } }));
    W.shuffle(Object.keys(window.STORIES)).filter((id) => W.storyBeat(id)).slice(0, 2)
      .forEach((id) => q.push({ at: at(), kind: 'story', data: { id } }));
    q.sort((a, b) => a.at - b.at);
  };
  const C0 = () => W.C.DAY_START;

  W.karmaReturn = ({ id }) => {
    const s = W.s;
    const k = (s.karma || []).find((x) => x.id === id);
    if (!k) return;
    W.consumeKarma(k);
    const who = W.person(k.from).name;
    const { text } = W.karmaText(k);
    let result;
    if (k.good) {
      const target = s.tasks.find((t) => !['approval', 'handover'].includes(t.type) && t.uid !== s.activeTaskId);
      if (target && !BOSSES.includes(k.from) && Math.random() < 0.6) {
        s.tasks = s.tasks.filter((t) => t !== target);
        s.done++;
        s.docs.unshift({ uid: target.uid, title: target.title, type: target.type, verdict: '통과', at: s.minute, by: k.from });
        result = `${who}님이 "${W.plain(target.title)}"을 대신 처리해 줬다.`;
        W.applyEffects({ perf: 3 });
      } else if (BOSSES.includes(k.from)) {
        result = `${who}님이 윗선에 내 칭찬을 했다. 평판 +4`;
        W.applyEffects({ rep: 4 });
      } else {
        result = `${who}님이 커피를 놓고 갔다. 멘탈 +6`;
        W.applyEffects({ mental: 6 });
      }
      W.msg.post(k.from, k.from, text);
      W.toast('덕이 돌아왔다. ' + result);
    } else {
      if (BOSSES.includes(k.from)) {
        result = `${who}님 눈 밖에 났다. 평판 −4, 멘탈 −3`;
        W.applyEffects({ rep: -4, mental: -3 });
      } else if (Math.random() < 0.5) {
        result = `${who}님이 확인 업무를 하나 더 얹었다.`;
        setTimeout(() => W.addTask(W.gen.random(), true, k.from), 900);
      } else {
        result = `${who}님과의 사이가 더 서먹해졌다. 멘탈 −4`;
        W.applyEffects({ mental: -4 });
        W.addRel(k.from, -3);
      }
      W.msg.post(k.from, k.from, text);
      W.toast('업보가 돌아왔다. ' + result);
    }
    W.logReturn(k, result);
    W.renderChrome();
    if (s.view === 'inbox' || s.view === 'home') W.renderMain();
  };

  // ---------- 장부 화면 ----------
  W.ledgerCard = () => {
    const s = W.s;
    const good = W.pendingGood();
    const bad = W.pendingKarma();
    const item = (k) => `<li>${W.avatar(k.from, 'xs')} <span>${esc(W.karmaText(k).why)}</span></li>`;
    return `<section class="card wide"><div class="card-head"><h2>덕과 업보 장부</h2><span class="muted">덕 ${good.length} · 업보 ${bad.length}</span></div>
      <p class="hint">내가 한 모든 선택이 쌓였다가 나중에 돌아와요. 덕은 대신 일을 맡아 주거나 칭찬으로, 업보는 추가 업무나 휴가 중 연락으로 돌아와요.</p>
      <div class="ledger">
        <div><h3 class="good-h">쌓은 덕</h3>${good.length ? `<ul class="karma-list">${good.slice(-8).reverse().map(item).join('')}</ul>` : '<p class="empty">아직 없어요.</p>'}</div>
        <div><h3 class="bad-h">쌓인 업보</h3>${bad.length ? `<ul class="karma-list">${bad.slice(-8).reverse().map(item).join('')}</ul>` : '<p class="empty">깨끗해요.</p>'}</div>
      </div>
      ${s.returns && s.returns.length ? `<h3>돌아온 일</h3><ul class="karma-list returns">${s.returns.slice(0, 8).map((r) => `<li class="${r.good ? 'good' : 'bad'}">${W.avatar(r.from, 'xs')} <span>${esc(r.result)} <small class="muted">(${esc(r.why)})</small></span></li>`).join('')}</ul>` : ''}
    </section>`;
  };

  W.relationCard = () => `<section class="card"><div class="card-head"><h2>동료 관계</h2></div>
    <ul class="people-list">${W.COLLEAGUES.map((id) => `<li>${W.avatar(id, 'xs')} <span>${esc(W.fullName(id))} <small class="muted">${esc(W.person(id).dept)}</small></span>${tierChip(id)}</li>`).join('')}</ul>
    <p class="hint">메신저에서 사람을 눌러 먼저 말을 걸 수 있어요. 호감도가 높으면 업무를 도와주고, 이야기가 이어져요.</p></section>`;
})();
