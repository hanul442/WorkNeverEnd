// 휴가: 인수인계서 업무, 휴가 하루(오전·오후·저녁), 휴가 중 연락, 복귀
(() => {
  const W = window.WNE;
  const esc = W.esc;
  const SLOTS = [['morning', '오전', 10], ['afternoon', '오후', 14], ['evening', '저녁', 19]];

  // ---------- 인수인계서 업무 ----------
  W.TYPE_LABEL.handover = '인수인계';

  W.gen.handover = (deputy) => {
    const items = W.shuffle(window.HANDOVER_ITEMS).slice(0, 4).map((it) => ({ ...it, right: W.teamPerson(it.right) }));
    return {
      type: 'handover',
      title: '휴가 전 {{인수인계}}서 작성',
      from: W.lead(),
      minutes: 15,
      deadline: Math.max(60, 18 * 60 - W.s.minute),
      brief: `진행 중인 일마다 맡길 사람을 정해 주세요. 일의 내용에 맞는 부서 담당자에게 넘겨야 휴가 중에 연락이 덜 와요.${deputy ? ` {{직무대행}}: ${W.fullName(deputy)}.` : ''}`,
      data: { items, deputy }
    };
  };

  W.apps.handover = {
    render(task, el, finish) {
      const d = task.data;
      const ui = (k, f = '') => (task.ui[k] !== undefined ? task.ui[k] : f);
      el.innerHTML = `
        <div class="doc-paper">
          <p class="doc-title">인수인계서</p>
          <table class="sheet"><thead><tr><th>진행 중인 일</th><th>맡길 사람</th></tr></thead><tbody>
          ${d.items.map((it, i) => `<tr><td>${W.rich(it.text)}</td><td>
            <select class="input" data-ui="to${i}" aria-label="맡길 사람">
              <option value="">선택하세요</option>
              ${[...new Set([W.mate(), ...window.HANDOVER_TO])].map((id) => `<option value="${id}" ${ui('to' + i) === id ? 'selected' : ''}>${esc(W.person(id).dept)} ${esc(W.fullName(id))}</option>`).join('')}
            </select></td></tr>`).join('')}
          </tbody></table>
          <fieldset><legend>휴가 중 연락 기준</legend>
            ${['급한 건만 메신저로, 나머지는 복귀 후에', '언제든 편하게 연락 주세요', '절대 연락하지 마세요'].map((t, i) => `<label class="radio"><input type="radio" name="hv-rule" data-ui="rule" value="${i}" ${String(ui('rule')) === String(i) ? 'checked' : ''}> ${esc(t)}</label>`).join('')}
          </fieldset>
        </div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">인수인계서 공유하기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errors = [];
        let ok = 0;
        d.items.forEach((it, i) => {
          if (ui('to' + i) === it.right) ok++;
          else {
            errors.push(`"${W.plain(it.text)}"은 ${W.person(it.right).dept} ${W.fullName(it.right)}`);
            // 엉뚱한 사람이 받았으면 그 사람이, 아무도 안 받았으면 원래 담당자가 휴가 중에 연락한다
            W.karma('handover', ui('to' + i) || it.right, it.text);
          }
        });
        if (String(ui('rule')) === '0') ok++;
        else errors.push('연락 기준은 "급한 건만, 나머지는 복귀 후"가 무난해요');
        if (ok / (d.items.length + 1) >= 0.8 && d.deputy) W.karma('covered', d.deputy);
        finish(ok / (d.items.length + 1), errors.length
          ? '인수인계 빈틈: ' + errors.join(' / ') + '. 빈틈이 있으면 휴가 중에 연락이 더 와요.'
          : '깔끔한 인수인계서. 이제 마음 놓고 쉬어도 된다.');
      });
    }
  };

  // ---------- 휴가 하루 ----------
  W.onVacationToday = () => {
    const v = W.s.vacation;
    return !!v && W.s.day >= v.start && W.s.day < v.start + v.days;
  };

  W.vacationClock = () => {
    const v = W.s.vacation;
    const slot = SLOTS[W.s.vacSlot] || SLOTS[2];
    return v ? `${slot[1]}` : '';
  };

  W.startVacationDay = () => {
    const s = W.s;
    const v = s.vacation;
    const d = window.DESTINATIONS[v.dest];
    W.resetDay();
    s.phase = 'vacation';
    s.view = 'vacation';
    s.vacSlot = 0;
    s.minute = 10 * 60;
    s.dayStartStats = { ...s.stats };
    s.vacDay = { contacts: 0, replied: 0, reasons: [] };
    // 휴가 첫날, 준비를 안 한 대가가 업보로 쌓인다
    if (s.day === v.start) {
      if (!v.doc) W.karma('nohandover', W.lead());
      if (!v.auto) W.karma('noauto', 'partner');
    }
    const nth = s.day - v.start + 1;
    const spend = d.perDay + (nth === 1 ? d.cost : 0);
    W.applyEffects({ money: -spend });
    v.log.push({ day: nth, slot: '출발', text: nth === 1 ? `${v.place}${v.dest === 'home' ? '에서 휴가 시작' : '에 도착'}. 경비 ${W.fmtMoney(spend)}.` : `휴가 ${nth}일차. 하루 경비 ${W.fmtMoney(spend)}.` });
    W.$('#start-screen').hidden = true;
    W.$('#game-screen').hidden = false;
    W.renderAll();
    W.openModal(`<p class="eyebrow">휴가 ${nth}/${v.days}일차 · ${esc(v.place)}</p><h3>${nth === 1 ? '휴가 시작' : '오늘도 휴가'}</h3>
      <p>${nth === 1 ? '출근 알람을 껐다. 업무함은 잠시 잊자.' : '아직 휴가다. 아직은.'}</p>
      <p class="down">경비 −${W.fmtMoney(spend)}</p>
      <p class="hint">오전, 오후, 저녁에 할 일을 고르세요. 그 사이사이 회사에서 연락이 올 수 있어요.</p>`,
    [{ label: '하루 시작', onClick: () => { W.closeModal(); slotChoice(); } }]);
  };

  const fill = (text) => String(text).replace(/\{place\}/g, W.s.vacation.place);

  function slotChoice() {
    const s = W.s;
    const v = s.vacation;
    const [key, label, hour] = SLOTS[s.vacSlot];
    s.minute = hour * 60;
    W.renderChrome();
    const acts = window.DESTINATIONS[v.dest].slots[key];
    W.openModal(`<p class="eyebrow">${label} · ${esc(v.place)}</p><h3>뭐 할까?</h3>`, acts.map((a) => ({
      label: fill(a.label) + (a.effects.money ? ` (${W.fmtMoney(-a.effects.money)})` : ''),
      onClick: () => {
        W.closeModal();
        W.applyEffects(a.effects);
        let text = fill(a.text);
        if (a.souvenir) v.souvenir = true;
        if (a.study) {
          const fresh = W.shuffle(Object.keys(window.TERMS).filter((t) => !s.glossary.includes(t))).slice(0, a.study);
          W.learnTerms(fresh.map((t) => `{{${t}}}`).join(' '));
          if (fresh.length) text += ` (새로 익힌 용어: ${fresh.join(', ')})`;
        }
        v.log.push({ day: s.day - v.start + 1, slot: label, text, effects: a.effects });
        W.renderMain();
        if (W.s.over) return;
        maybeContact();
      }
    })));
  }

  // 연락 올 확률: 기본 65%에서 자동응답, 인수인계, 직무대행에 따라 줄고, 쌓인 업보가 많을수록 늘어난다
  function contactChance() {
    const v = W.s.vacation;
    let p = 0.65;
    if (v.auto) p -= 0.12;
    p -= 0.25 * v.handoverQ;
    if (v.deputy) p -= 0.05;
    p = p * window.DESTINATIONS[v.dest].contact + 0.08 * Math.min(5, W.pendingKarma().length);
    return W.clamp(p, 0.2, 0.92);
  }

  // 이번 연락을 고른다. 쌓인 업보가 있으면 대개 그게 먼저 돌아온다.
  function pickContact() {
    const s = W.s;
    const v = s.vacation;
    const karma = W.pendingKarma();
    if (karma.length && Math.random() < 0.8) {
      const k = W.pick(karma);
      s.karma = s.karma.filter((x) => x !== k);
      const { text, why } = W.karmaText(k);
      return { from: k.from, kind: 'work', text, why, karma: true };
    }
    const pool = window.VACATION_CONTACTS.filter((c) => !c.home || v.dest === 'home');
    const c = W.pick(pool);
    return { ...c, why: c.kind === 'work' ? '딱히 내 잘못은 없다. 회사는 원래 이렇다.' : '가족과 친구는 내가 휴가인 걸 안다.' };
  }

  const SLOT_TIME = { morning: '10:2', afternoon: '15:4', evening: '21:1' };

  function maybeContact() {
    const s = W.s;
    const v = s.vacation;
    if (Math.random() >= contactChance()) return nextSlot();
    // 덕을 쌓아 뒀다면 누군가 대신 막아 준다
    const shield = W.pendingGood().find((k) => window.PEOPLE[k.from] && !window.PEOPLE[k.from].external);
    if (shield && Math.random() < 0.4) return shieldEvent(shield);
    const c = pickContact();
    const night = v.dest === 'abroad' && c.kind === 'work' && Math.random() < 0.5;
    const text = c.text;
    W.msg.post(c.from, c.from, text);
    W.learnTerms(text);
    v.contacts++;
    s.vacDay.contacts++;
    const who = W.fullName(c.from).trim();
    const time = night ? '03:0' + W.rand(10) : SLOT_TIME[SLOTS[s.vacSlot][0]] + W.rand(10);
    const left = W.pendingKarma().length;
    const head = `<h3 class="sr-only">${c.kind === 'work' ? '휴가 중에 회사에서 연락이 왔다' : '개인 연락이 왔다'}</h3>
      <div class="phone ${night ? 'night' : ''}">
        <div class="phone-top"><span>${time}</span><span>${esc(v.place)}${night ? ' · 현지 새벽' : ''}</span></div>
        <p class="phone-title">${c.kind === 'work' ? '휴가 중인데 회사에서 연락이 왔다' : '개인 연락이 왔다'}</p>
        <div class="phone-notif">${W.avatar(c.from, 'sm')}<div><div class="phone-who"><strong>${esc(who)}</strong><small>${esc(W.person(c.from).dept)} · 지금</small></div><p>${W.rich(text)}</p></div></div>
      </div>
      <div class="karma-box ${c.karma ? 'hit' : ''}"><span class="label">${c.karma ? '업보 · 이 연락이 온 이유' : '이 연락이 온 이유'}</span><p>${esc(c.why)}</p>
        ${left ? `<small class="muted">아직 터지지 않은 업보 ${left}건</small>` : ''}</div>`;
    const why = c.why;
    const done = (reply, effects, result) => {
      W.closeModal();
      if (reply) W.msg.post(c.from, 'me', reply);
      W.applyEffects(effects);
      v.log.push({ day: s.day - v.start + 1, slot: '연락', text: `${who}: ${W.plain(text)} → ${result}`, why, effects, contact: true });
      s.vacDay.reasons.push(why);
      W.renderMain();
      if (W.s.over) return;
      nextSlot();
    };
    let options;
    if (c.kind === 'personal') {
      options = c.from === 'friend'
        ? [
            { label: '콜! 나간다', onClick: () => done('콜 ㅋㅋ 어디로 갈까', { mental: 6, stamina: -3, money: -30000 }, '나가서 실컷 웃었다.') },
            { label: '다음에 보자', onClick: () => done('이번엔 쉴래 ㅠ 다음에!', {}, '오늘은 쉬기로 했다.') }
          ]
        : [
            { label: '알겠어요~', onClick: () => done('네~ 알겠어요', { mental: 3, stamina: -2 }, '엄마 말은 들어야 한다.') },
            { label: '나중에 답하기', onClick: () => done(null, { mental: -1 }, '나중에 하려다 잊었다.') }
          ];
    } else {
      options = [
        { label: '노트북 켜고 바로 처리하기', onClick: () => { s.vacDay.replied++; v.replied++; done('네, 지금 확인해서 보내 드릴게요.', { stamina: -4, mental: -10, rep: 4 }, '30분이면 된다더니 2시간이 지났다.'); } },
        { label: '짧게 답장만 하기', onClick: () => { s.vacDay.replied++; v.replied++; done('휴가 중이라 복귀해서 바로 확인드릴게요!', { mental: -4, rep: 1 }, '답장 보내고 폰을 엎어 놨다.'); } }
      ];
      if (v.deputy) {
        const dep = W.fullName(v.deputy);
        const good = v.handoverQ >= 0.6;
        options.push({ label: `${W.person(v.deputy).name}님에게 넘기기`, onClick: () => done(`이 건은 ${dep}님께 인수인계해 두었어요. 그쪽으로 부탁드려요!`,
          good ? { mental: -1, rep: 1 } : { mental: -3, rep: -2 },
          good ? `${dep}님이 인수인계서 보고 처리했다고 한다.` : `${dep}님: "인수인계서에 그 내용은 없던데요...?"`) });
      }
      options.push(night
        ? { label: '비행기 모드 켜고 다시 자기', onClick: () => { W.karma('ghosted', c.from); done(null, { mental: 2, rep: -3 }, '아침에 보니 부재중 전화 3통.'); } }
        : { label: '읽고 답 안 하기', onClick: () => { W.karma('ghosted', c.from); done(null, { mental: 2, rep: -4 }, '1이 사라졌다. 저쪽도 내가 봤다는 걸 안다.'); } });
    }
    W.openModal(head, options);
  }

  function shieldEvent(k) {
    const s = W.s;
    const v = s.vacation;
    W.consumeKarma(k);
    const who = W.fullName(k.from).trim();
    const text = `{me} 쉬세요~ 회사에서 찾는 거 있었는데 제가 대신 처리했어요. 지난번에 고마웠던 거 갚는 거예요 ㅎㅎ`;
    W.msg.post(k.from, k.from, text);
    const why = W.karmaText(k).why;
    W.logReturn(k, `휴가 중에 ${who}님이 연락을 대신 막아 줬다.`);
    W.openModal(`<h3 class="sr-only">동료가 대신 막아 줬다</h3>
      <div class="phone"><div class="phone-top"><span>${SLOT_TIME[SLOTS[s.vacSlot][0]]}${W.rand(10)}</span><span>${esc(v.place)}</span></div>
        <p class="phone-title">동료가 대신 막아 줬다</p>
        <div class="phone-notif">${W.avatar(k.from, 'sm')}<div><div class="phone-who"><strong>${esc(who)}</strong><small>지금</small></div><p>${W.rich(text)}</p></div></div></div>
      <div class="karma-box good"><span class="label">덕 · 이 일이 생긴 이유</span><p>${esc(why)}</p></div>`,
    [{ label: '고마워요 ㅠㅠ (멘탈 +5)', onClick: () => {
      W.closeModal();
      W.msg.post(k.from, 'me', '헉 감사해요ㅠㅠ 복귀하면 커피 살게요!');
      W.applyEffects({ mental: 5 });
      W.addRel(k.from, 3);
      v.log.push({ day: s.day - v.start + 1, slot: '연락', text: `${who}님이 회사 연락을 대신 막아 줬다.`, why, good: true });
      s.vacDay.reasons.push('덕: ' + why);
      W.renderMain();
      nextSlot();
    } }]);
  }

  function nextSlot() {
    const s = W.s;
    s.vacSlot++;
    if (s.vacSlot < SLOTS.length) return slotChoice();
    endVacationDay();
  }

  function endVacationDay() {
    const s = W.s;
    const v = s.vacation;
    const nth = s.day - v.start + 1;
    const last = nth >= v.days;
    W.stopTimer();
    const rows = Object.keys(W.STAT_INFO).map((k) => {
      const diff = Math.round(s.stats[k] - s.dayStartStats[k]);
      const show = k === 'money' ? W.fmtMoney(s.stats[k]) : Math.round(s.stats[k]);
      const d = diff === 0 ? '' : `<span class="${diff > 0 ? 'up' : 'down'}">(${diff > 0 ? '+' : ''}${k === 'money' ? W.fmtNum(diff) : diff})</span>`;
      return `<tr><td>${W.STAT_INFO[k].label}</td><td>${show} ${d}</td></tr>`;
    }).join('');
    if (last) {
      s.back = { dest: v.dest, place: v.place, souvenir: v.souvenir, contacts: v.contacts, days: v.days };
      s.vacation = null;
    }
    W.openModal(`<p class="eyebrow">휴가 ${nth}/${v.days}일차 결산 · ${esc(v.place)}</p><h3>${last ? '휴가 끝' : '오늘의 휴가'}</h3>
      <p>${last ? '내일은 출근이다. 업무함이 어떻게 되어 있을지 상상하기 싫다.' : '하루가 너무 짧다.'}</p>
      <table class="summary"><tr><td>받은 연락</td><td>${s.vacDay.contacts}건 (답장 ${s.vacDay.replied}건)</td></tr>${rows}</table>
      ${s.vacDay.reasons.length ? `<div class="karma-box"><span class="label">오늘 연락이 온 이유</span><ul>${s.vacDay.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>` : ''}`,
    [{ label: last ? '출근하러 가기' : '다음 날로', onClick: () => { W.closeModal(); W.nextDay(); } }]);
    W.save();
  }

  // ---------- 휴가 화면 ----------
  W.renderVacation = (main) => {
    const s = W.s;
    const v = s.vacation;
    if (!v) { main.innerHTML = '<section class="card"><p class="empty">휴가가 끝났습니다.</p></section>'; return; }
    const d = window.DESTINATIONS[v.dest];
    const nth = s.day - v.start + 1;
    main.innerHTML = `
      <div class="mobile-only">${W.profileCard()}</div>
      <section class="card vac-hero dest-${v.dest}">
        <p class="eyebrow">${esc(d.label)} · 휴가 ${nth}/${v.days}일차</p>
        <h2>${esc(v.place)}</h2>
        <p class="hint">${W.rich('{{부재중 자동응답}}')} ${v.auto ? '켜 둠' : '안 켬'} · ${W.rich('{{직무대행}}')} ${v.deputy ? esc(W.fullName(v.deputy)) : '없음'} · 인수인계서 ${v.doc ? Math.round(v.handoverQ * 100) + '점' : '안 씀'}</p>
      </section>
      <section class="card"><div class="card-head"><h2>휴가 일지</h2><span class="muted">회사 연락 ${v.contacts}건</span></div>
        <ul class="vac-log">${v.log.slice().reverse().map((l) => `<li class="${l.contact ? 'contact' : ''}">
          <span class="time">${l.day}일차 ${esc(l.slot)}</span><span>${W.rich(l.text)}${l.effects ? ` <small class="muted">${esc(W.effectText(l.effects))}</small>` : ''}${l.why ? `<small class="why ${l.good ? 'good' : ''}">${l.good ? '덕' : '이유'}: ${esc(l.why)}</small>` : ''}</span></li>`).join('')}</ul>
      </section>
      ${karmaCard()}`;
  };

  // 아직 터지지 않은 업보 목록
  function karmaCard() {
    const list = W.pendingKarma();
    return `<section class="card"><div class="card-head"><h2>아직 터지지 않은 업보</h2><span class="muted">${list.length}건</span></div>
      ${list.length ? `<ul class="karma-list">${list.slice(-8).reverse().map((k) => `<li>${W.avatar(k.from, 'xs')} ${esc(W.karmaText(k).why)}</li>`).join('')}</ul>
        ${list.length > 8 ? `<p class="hint">외 ${list.length - 8}건</p>` : ''}
        <p class="hint">이 일들 때문에 휴가 중에 연락이 올 수 있어요. 근무할 때 마감을 지키고, 메시지에 답하고, 인수인계를 잘 해 두면 줄어요.</p>`
        : '<p class="empty">깨끗하다. 이번 휴가는 조용할지도.</p>'}</section>`;
  }
  W.karmaCard = karmaCard;

  // ---------- 복귀 첫날 / 승진 첫날 ----------
  W.welcomeBack = () => {
    const s = W.s;
    const notes = [];
    if (s.promotedTo) {
      W.msg.post('team', W.lead(), `오늘부터 ${s.name} ${s.promotedTo}님입니다. 다들 축하해 주세요!`);
      W.msg.post('team', W.mate(), `${s.promotedTo}님 축하드려요!! 턱 쏘시는 거죠? ㅎㅎ`);
      notes.push(`${s.promotedTo} 첫 출근. 명함이 바뀌었다.`);
      s.promotedTo = null;
    }
    if (s.back) {
      const b = s.back;
      const backlog = 1 + Math.min(2, b.days);
      for (let i = 0; i < backlog; i++) W.addTask(W.gen.random(), true);
      W.msg.post(W.lead(), W.lead(), '휴가 잘 다녀왔어요? 밀린 것들 업무함에 넣어 뒀어요.');
      notes.push(`휴가 복귀. 밀린 업무 ${backlog}건이 업무함에 들어와 있다.`);
      if (b.souvenir) {
        W.applyEffects({ rep: 4 });
        W.karma('souvenir', W.mate());
        W.msg.post('team', W.mate(), `${b.place} 기념품 잘 먹을게요~!`);
        notes.push('기념품을 돌렸다. 평판 +4');
      }
      s.back = null;
    }
    return notes;
  };
})();
