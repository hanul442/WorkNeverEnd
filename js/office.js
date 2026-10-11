// 회사 안의 이벤트: 장면(컷씬), 단톡방 대화, 커피·담배타임, 점심, 야근, 호출, 소문과 정보
(() => {
  const W = window.WNE;
  const esc = W.esc;

  // ---------- 사람 역할 ----------
  const PEERS = { peer: 'han', peer2: 'kimdev', peer3: 'seoha' };
  W.roleId = (role, ctx = {}) => {
    if (ctx[role]) return ctx[role];
    if (role === 'lead') return W.lead();
    if (role === 'mate') return W.mate();
    if (PEERS[role]) return PEERS[role];
    return role;
  };

  // ---------- 정보 (소문으로 얻는 이득) ----------
  W.initOffice = () => {
    if (!W.s.intel) W.s.intel = [];
    window.ROOMS_EXTRA.peers = { name: window.GROUP_ROOMS.peers.name, short: '동기', color: 3 };
    window.ROOMS_EXTRA.close = { name: window.GROUP_ROOMS.close.name, short: '친구', color: 5 };
  };
  const activeIntel = () => (W.s.intel || []).filter((x) => x.from <= W.s.day && x.until >= W.s.day);
  W.hasPerk = (key) => activeIntel().some((x) => x.key === key);
  W.gainPerk = (key) => {
    const def = window.PERKS[key];
    if (!def) return null;
    const s = W.s;
    if (!s.intel) s.intel = [];
    const from = def.nextDay ? s.day + 1 : s.day;
    s.intel = s.intel.filter((x) => x.until >= s.day && x.key !== key);
    s.intel.push({ key, from, until: from + def.days - 1 });
    if (W.renderChrome) W.renderChrome();
    return def;
  };

  // 소문 하나를 듣는다. 정보가 붙어 있으면 바로 이득이 생긴다.
  W.hearRumor = () => {
    const known = new Set((W.s.intel || []).filter((x) => x.until >= W.s.day).map((x) => x.key));
    const pool = window.RUMORS.filter((r) => !r.perk || !known.has(r.perk));
    const r = W.pick(pool.length ? pool : window.RUMORS);
    return r;
  };

  // 업무를 끝낼 때 정보 보너스
  W.perkBonus = (task, effects, passed) => {
    if (!passed) return [];
    const notes = [];
    activeIntel().forEach(({ key }) => {
      const def = window.PERKS[key];
      if (def.types && def.types.includes(task.type)) {
        Object.entries(def.bonus).forEach(([k, v]) => { effects[k] = (effects[k] || 0) + v; });
        notes.push(def.label);
      }
    });
    if (W.hasPerk('boss3pm') && W.s.minute >= 14 * 60 && W.s.minute < 16 * 60 && task.from === W.lead()) {
      effects.rep = (effects.rep || 0) + 2;
      notes.push(window.PERKS.boss3pm.label);
    }
    return notes;
  };
  W.perkHints = (task) => {
    const hints = activeIntel().map(({ key }) => window.PERKS[key]).filter((d) => d.types && d.types.includes(task.type) && d.hint);
    if (W.hasPerk('boss3pm') && task.from === W.lead()) hints.push({ hint: '들은 정보: 팀장님은 14~16시에 기분이 제일 좋다. 이때 끝내면 평판 +2.' });
    return hints.length ? `<div class="intel-hint">${hints.map((h) => `<p>💡 ${W.rich(h.hint)}</p>`).join('')}</div>` : '';
  };
  // 호감도 2배 정보
  const baseAddRel = W.addRel;
  W.addRel = (id, n) => {
    const boost = n > 0 && activeIntel().some(({ key }) => window.PERKS[key].relBoost === id);
    baseAddRel(id, boost ? n * 2 : n);
  };

  W.intelCard = () => {
    const list = activeIntel();
    const later = (W.s.intel || []).filter((x) => x.from > W.s.day);
    if (!list.length && !later.length) return '';
    return `<div class="intel"><span class="label">들은 정보</span><ul>${list.map(({ key, until }) => {
      const d = window.PERKS[key];
      return `<li><strong>${esc(d.label)}</strong><span>${esc(d.desc)}${until > W.s.day ? ' · 내일까지' : ' · 오늘만'}</span></li>`;
    }).join('')}${later.map(({ key }) => `<li><strong>${esc(window.PERKS[key].label)}</strong><span>${esc(window.PERKS[key].desc)} · 내일부터</span></li>`).join('')}</ul></div>`;
  };

  // ---------- 장면 (컷씬) ----------
  const nameOf = (id) => (id === 'me' ? W.s.name : W.fullName(id).trim());

  function fill(text, ctx) {
    return String(text)
      .replace('__rumor__', () => { const r = ctx.rumor || (ctx.rumor = W.hearRumor()); return r.text; })
      .replace('__reason__', () => ctx.reason || '')
      .replace('__task__', () => ctx.taskTitle ? `"${W.plain(ctx.taskTitle)}"` : '');
  }

  function lineHtml([role, text], ctx, last) {
    const id = W.roleId(role, ctx);
    const mine = id === 'me';
    return `<div class="scene-line ${mine ? 'mine' : ''} ${last ? 'last' : ''}">${mine ? '' : W.avatar(id, 'sm')}
      <div><span class="scene-name">${esc(nameOf(id))}</span><p>${W.rich(fill(text, ctx))}</p></div></div>`;
  }

  // 선택의 결과를 적용하고 요약 문장을 돌려준다
  function applyChoice(c, ctx) {
    const notes = [];
    if (c.effects) { W.applyEffects(c.effects); const t = W.effectText(c.effects); if (t) notes.push(t); }
    const rels = {};
    if (c.rel) (ctx.members || [ctx.who]).filter(Boolean).forEach((id) => { rels[id] = (rels[id] || 0) + c.rel; });
    Object.entries(c.relTo || {}).forEach(([role, n]) => { const id = W.roleId(role, ctx); rels[id] = (rels[id] || 0) + n; });
    Object.entries(rels).forEach(([id, n]) => {
      if (!n || !window.PEOPLE[id]) return;
      W.addRel(id, n);
      notes.push(`${W.person(id).name} 호감도 ${n > 0 ? '+' : '−'}${Math.abs(n)}`);
    });
    if (c.karma) {
      const from = ctx.who || Object.keys(rels)[0] || W.lead();
      W.karma(c.karma, from, '', W.person(from).name);
      notes.push(window.KARMA[c.karma].good ? '덕을 쌓았다' : '업보가 남았다');
    }
    if (c.term) { W.learnTerms(`{{${c.term}}}`); notes.push(`용어 "${c.term}"`); }
    const perk = c.perk && W.gainPerk(c.perk);
    if (perk) notes.push(`정보: ${perk.label}`);
    return notes;
  }

  // scene: { place, lines, choices?, quiz?, perk? }, ctx: { who, members, ... }
  W.playScene = (scene, ctx = {}, done = () => {}) => {
    const s = W.s;
    const wasPaused = s.paused;
    W.pause();
    s.inScene = true;
    const log = [];
    const queue = scene.lines.slice();
    const notes = ctx.notes || [];

    const render = (buttons, extra = '') => W.openModal(`<p class="eyebrow">${esc(scene.place || '')}</p><h3 class="sr-only">${esc(scene.place || '장면')}</h3>
      <div class="scene">${log.map((l, i) => lineHtml(l, ctx, i === log.length - 1)).join('')}</div>${extra}`, buttons);

    const finish = () => {
      if (ctx.rumor) {
        notes.push(`소문: "${ctx.rumor.text}"`);
        const perk = ctx.rumor.perk && W.gainPerk(ctx.rumor.perk);
        notes.push(perk ? `정보 획득: ${perk.label} (${perk.desc})` : '그냥 소문인 것 같다.');
        ctx.rumor = null;
      }
      const result = ctx.result ? `<p class="scene-result">${esc(ctx.result)}</p>` : '';
      const list = notes.length ? `<ul class="scene-notes">${notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
      render([{ label: '계속', onClick: end }], result + list);
    };
    const end = () => {
      W.closeModal();
      s.inScene = false;
      W.renderAll();
      done();
      if (!s.inScene && !wasPaused && !W.$('#modal').open && !s.over) W.resume();
    };

    const choose = () => {
      if (scene.quiz) {
        const q = scene.quiz;
        return render(W.shuffle(q.options).map((o) => ({ label: o.label, onClick: () => {
          if (o.correct) {
            notes.push(...applyChoice({ effects: { perf: 3, rep: 2 }, relTo: { [scene.lines[0][0]]: 2 }, perk: scene.perk }, ctx));
            queue.push([scene.lines[0][0], '맞아요. 이제 알겠죠?']);
          } else {
            notes.push(...applyChoice({ effects: { mental: -2 } }, ctx));
            queue.push([scene.lines[0][0], `아니요. 정답은 "${q.options.find((x) => x.correct).label}"예요. 다시 봐 둬요.`]);
          }
          next(false);
        } })), `<p class="scene-q">${esc(q.q)}</p>`);
      }
      const choices = scene.choices.slice();
      if (ctx.who && window.AI.enabled() && window.PEOPLE[ctx.who] && !ctx.noTalk) {
        choices.push({ label: `(직접 말 걸기) ${W.person(ctx.who).name}님에게 하고 싶은 말 쓰기`, talk: true });
      }
      render(choices.map((c) => ({ label: c.label, onClick: () => {
        if (c.talk) { // 장면을 닫고 그 사람과 메신저로 대화
          W.closeModal(); s.inScene = false; done(); W.msg.open(ctx.who);
          if (!wasPaused) W.resume();
          return;
        }
        log.push(['me', c.label.replace(/^\(.*?\)\s*/, '') || c.label]);
        notes.push(...applyChoice(c, ctx));
        if (ctx.onChoice) ctx.onChoice(c);
        if (c.result) ctx.result = c.result;
        queue.push(...(c.then || []));
        next(false);
      } })));
    };

    const next = (canChoose = true) => {
      if (queue.length) {
        log.push(queue.shift());
        const more = queue.length || (canChoose && (scene.choices || scene.quiz));
        return render([{ label: more ? '다음 ▸' : '계속', onClick: () => (more ? next(canChoose) : finish()) }]);
      }
      if (canChoose && (scene.choices || scene.quiz)) return choose();
      finish();
    };
    next(true);
  };

  // ---------- 커피·담배타임 ----------
  const SMOKERS = ['choi', 'salelead', 'jung', 'sales', 'devlead'];
  function pickCompanion(kind, senior) {
    const pool = (kind === 'smoke' ? [...SMOKERS, W.mate(), 'han', 'kimdev'] : [...W.colleagues(), 'kimdev', 'seoha'])
      .filter((id, i, a) => a.indexOf(id) === i && window.PEOPLE[id] && !window.PEOPLE[id].external && id !== W.lead() && !(senior && window.PEOPLE[id].peer));
    // 친한 사람일수록 잘 마주친다
    const weights = pool.map((id) => Math.max(5, W.rel(id) + 30));
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) { r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  W.breakScene = (kind, done) => {
    const scene = W.pick(window.BREAK_SCENES[kind]);
    const who = pickCompanion(kind, scene.senior);
    W.playScene(scene, { who }, done);
  };

  // ---------- 점심 ----------
  W.lunchScene = (choice, done) => {
    const scenes = window.LUNCH_SCENES[choice.with] || [];
    const ctx = { notes: [choice.result] };
    if (choice.with === 'team') ctx.who = W.mate();
    if (choice.with === 'peers') ctx.who = 'han';
    if (!scenes.length) return done();
    W.playScene(W.pick(scenes), ctx, done);
  };

  // ---------- 야근 ----------
  W.scheduleOvertime = () => {
    const s = W.s;
    W.shuffle(window.OVERTIME_SCENES.map((x, i) => i)).slice(0, 2).forEach((i) => {
      const sc = window.OVERTIME_SCENES[i];
      s.queue.push({ at: Math.max(s.minute + 20, sc.at), kind: 'scene', data: { src: 'overtime', i } });
    });
    s.queue.sort((a, b) => a.at - b.at);
  };

  // ---------- 호출 ----------
  function todaysBad() {
    return (W.s.karma || []).filter((k) => !k.good && k.day === W.s.day && ['missed', 'rejected', 'skipped', 'slacking', 'refused'].includes(k.kind));
  }

  function summon() {
    const s = W.s;
    const bad = todaysBad();
    if (bad.length && !s.scolded) {
      s.scolded = true;
      const k = bad[bad.length - 1];
      const reason = k.kind === 'missed' ? `"${k.title}" 마감 놓쳤죠?`
        : k.kind === 'rejected' ? `"${k.title}" 반려됐다면서요?`
          : k.kind === 'skipped' ? '아까 회의 왜 안 들어왔어요?'
            : k.kind === 'slacking' ? '오늘 자리에 없는 시간이 너무 많던데요.'
              : '부탁받은 일 거절했다면서요? 말이 돌더라고요.';
      return W.playScene(W.pick(window.SUMMONS.scold), { reason, noTalk: true });
    }
    const taught = s.flags.taught || [];
    const teachLeft = window.SUMMONS.teach.map((x, i) => i).filter((i) => !taught.includes(i));
    if ((s.day >= 2 && Math.random() < 0.4) || !teachLeft.length) {
      const tpl = W.gen.random();
      const sc = W.pick(window.SUMMONS.handover);
      const giver = sc.lines[0][0] === 'lead' ? W.lead() : W.mate();
      return W.playScene(sc, {
        taskTitle: tpl.title,
        noTalk: true,
        onChoice: (c) => {
          const task = W.addTask({ ...tpl, context: [...(tpl.context || []), `${W.person(giver).name}님에게 인수인계받은 업무`] }, true, giver);
          task.due += c.careful ? 60 : -Math.min(30, Math.max(0, task.due - s.minute - 40));
        }
      });
    }
    const i = W.pick(teachLeft);
    s.flags.taught = [...taught, i];
    W.playScene(window.SUMMONS.teach[i], { noTalk: true });
  }

  // ---------- 단톡방 ----------
  function closeMembers() {
    return W.colleagues().filter((id) => !['park', 'choi', 'kang', 'devlead', 'deslead', 'salelead', 'partner'].includes(id) && W.rel(id) >= 30);
  }
  function groupMembers(roomId) {
    if (roomId === 'team') return [W.lead(), W.mate()];
    if (roomId === 'peers') return ['han', 'kimdev', 'seoha'];
    const room = W.s.rooms.close;
    return (room && room.members) || closeMembers().slice(0, 3);
  }
  W.groupMembers = groupMembers;

  function startThread(roomId, idx) {
    const room = W.msg.room(roomId);
    if (roomId === 'close') room.members = closeMembers().slice(0, 3);
    W.s.queue.push({ at: W.s.minute, kind: 'group', data: { room: roomId, idx, line: 0 } });
  }

  function groupLine({ room: roomId, idx, line }) {
    const thread = window.GROUP_THREADS[roomId][idx];
    const members = groupMembers(roomId);
    const ctx = { who: members[0], who2: members[1] || members[0] };
    const l = thread.lines[line];
    if (l) {
      W.msg.post(roomId, W.roleId(l[0], ctx), fill(l[1], ctx));
      W.s.queue.push({ at: W.s.minute + 1 + W.rand(3), kind: 'group', data: { room: roomId, idx, line: line + 1 } });
      W.s.queue.sort((a, b) => a.at - b.at);
      return;
    }
    if (!thread.ask) return;
    const room = W.msg.room(roomId);
    if (room.pending) return;
    W.msg.ask({ from: W.roleId(thread.ask.from, ctx), text: thread.ask.text, options: thread.ask.options, group: { room: roomId, members, ctx } }, roomId);
  }

  // 단톡방 답: 방 사람 모두의 호감도가 바뀐다
  W.groupAnswer = (chat, opt) => {
    const notes = applyChoice({ ...opt, reply: null }, { members: chat.group.members, ...chat.group.ctx, who: null });
    if (notes.length) W.toast(notes.join(' · '));
  };

  // ---------- 하루 시간표 ----------
  W.scheduleOffice = () => {
    const s = W.s;
    const q = s.queue;
    const C = W.C;
    const at = (from, span) => { let t = from + W.rand(span); if (t >= C.LUNCH_AT && t < C.LUNCH_AT + 60) t += 60; return t; };
    const T = window.GROUP_THREADS;
    W.shuffle(T.team.map((x, i) => i)).slice(0, 3).forEach((idx, n) => q.push({ at: at(C.DAY_START + 20 + n * 130, 90), kind: 'thread', data: { room: 'team', idx } }));
    W.shuffle(T.peers.map((x, i) => i)).slice(0, 3).forEach((idx, n) => q.push({ at: at(C.DAY_START + 40 + n * 140, 100), kind: 'thread', data: { room: 'peers', idx } }));
    if (closeMembers().length >= 2) W.shuffle(T.close.map((x, i) => i)).slice(0, 2).forEach((idx, n) => q.push({ at: at(C.DAY_START + 120 + n * 200, 120), kind: 'thread', data: { room: 'close', idx } }));
    q.push({ at: at(10 * 60 + 30, 330), kind: 'summon' });
    // 오후에 꾸중이 필요하면 한 번 더 기회가 있다
    q.push({ at: at(15 * 60 + 30, 60), kind: 'summon' });
    s.scolded = false;
    s.summoned = false;
    q.sort((a, b) => a.at - b.at);
  };

  // main.js 의 fireQueue 가 부른다. 처리했으면 true
  W.fireOffice = (ev) => {
    const s = W.s;
    if (ev.kind === 'group') { if (s.phase === 'work' || s.phase === 'overtime') groupLine(ev.data); return true; }
    if (ev.kind === 'thread') { if (s.phase === 'work') startThread(ev.data.room, ev.data.idx); return true; }
    if (ev.kind === 'scene') {
      if (s.phase === 'overtime') W.playScene(window.OVERTIME_SCENES[ev.data.i], { who: W.lead() });
      return true;
    }
    if (ev.kind === 'summon') {
      if (s.phase !== 'work') return true;
      // 두 번째 호출 기회는 꾸중할 일이 있을 때만
      if (s.summoned && (s.scolded || !todaysBad().length)) return true;
      s.summoned = true;
      summon();
      return true;
    }
    return false;
  };
})();
