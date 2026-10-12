// 4단계: 차장부터 사장까지. 들어온 일을 사람에게 배당하고, 남의 부서 일은 맞는 부서로 넘긴다.
// 누구에게 무엇을 맡겼는지가 덕과 업보로 남고, 팀원의 실력과 마음이 다음 결과를 바꾼다.
(() => {
  const W = window.WNE;
  const esc = W.esc;
  const LEADS = { 기획: 'park', 개발: 'devlead', 디자인: 'deslead', 영업: 'salelead' };

  W.isManager = () => !!W.s && W.s.rank >= 4;
  W.isExec = () => !!W.s && W.s.rank >= 6;
  W.role = () => window.ROLES[Math.min(W.s.rank, 10)] || null;

  // 지금 일을 맡길 수 있는 사람
  W.crewIds = () => {
    const s = W.s;
    if (W.isExec()) return Object.values(LEADS);
    return Object.keys(window.CREW).filter((id) => window.CREW[id].joins <= s.rank && !(s.crew[id] && s.crew[id].gone));
  };
  const present = () => W.crewIds().filter((id) => !(W.s.crewOff || []).includes(id));

  W.initManage = () => {
    const s = W.s;
    if (!s.crew) s.crew = {};
    Object.entries(window.CREW).forEach(([id, c]) => {
      window.PEOPLE[id] = { name: c.name, rank: c.rank, dept: W.team().label, color: c.color, crew: true };
      if (!s.crew[id]) s.crew[id] = { skill: {}, gone: false };
    });
    if (!s.assign) s.assign = [];
    if (!s.working) s.working = [];
    if (!s.crewOff) s.crewOff = [];
  };

  // 팀원 목록이 메신저 동료 목록에도 나온다
  const baseColleagues = W.colleagues;
  W.colleagues = () => [...new Set([...baseColleagues(), ...(W.isManager() && !W.isExec() ? W.crewIds() : [])])];

  // ---------- 실력, 부담, 성공 확률 ----------
  const deptOfLead = (id) => Object.keys(LEADS).find((k) => LEADS[k] === id);
  W.skillOf = (id, item) => {
    if (W.isExec()) return deptOfLead(id) === item.dept ? 0.85 : 0.3;
    if (item.foreign) return 0.3;
    const c = window.CREW[id];
    const learned = W.s.crew[id] && W.s.crew[id].skill[item.type];
    if (learned !== undefined) return learned;
    return c.good.includes(item.type) ? 0.85 : c.weak.includes(item.type) ? 0.35 : c.base;
  };
  W.loadOf = (id) => W.s.working.filter((w) => w.member === id && !w.closed).length;
  W.chanceOf = (id, item) => {
    const load = W.loadOf(id);
    const mood = W.rel(id) / 100;
    const room = W.isExec() ? 2 : 1;
    return W.clamp(W.skillOf(id, item) * 0.7 + mood * 0.2 + 0.15 - Math.max(0, load - room) * 0.12, 0.05, 0.97);
  };
  const grow = (id, type, n) => {
    if (W.isExec() || !window.CREW[id]) return;
    const cur = W.skillOf(id, { type });
    W.s.crew[id].skill[type] = Math.min(0.95, cur + n);
  };

  // ---------- 들어오는 일 ----------
  const ownDept = () => W.s.job || '기획';
  function newItem() {
    const s = W.s;
    const L = W.level();
    const at = s.minute;
    if (W.isExec()) {
      if (Math.random() < 0.75) {
        const p = W.pick(window.EXEC_PROJECTS);
        return { title: p.title, type: 'project', dept: p.dept, from: 'kang', minutes: 30, due: at + Math.round((240 + W.rand(90)) * L.deadline), project: true };
      }
      const r = W.pick(window.ROUTE_REQUESTS);
      return { title: r.title, type: 'route', dept: r.dept, from: r.from, why: r.why, minutes: 20, due: at + Math.round((160 + W.rand(80)) * L.deadline) };
    }
    if (Math.random() < 0.3) {
      const r = W.pick(window.ROUTE_REQUESTS.filter((x) => x.dept !== ownDept()));
      return { title: r.title, type: 'route', dept: r.dept, from: r.from, why: r.why, minutes: 20, due: at + Math.round((150 + W.rand(90)) * L.deadline), foreign: true };
    }
    const tpl = W.gen.random();
    return { title: tpl.title, type: tpl.type, dept: ownDept(), from: tpl.from, minutes: tpl.minutes || 10, due: at + Math.round((tpl.deadline || 180) * L.deadline * 1.3), tpl };
  }

  // main.js 가 업무 요청이 들어올 때 부른다. 관리자는 대부분 배당함으로 받는다.
  W.incomingTask = () => {
    if (!W.isManager() || Math.random() >= (W.isExec() ? 0.9 : 0.7)) return W.addTask(W.gen.random(), true);
    // 본부장 위로는 자잘한 요청은 비서실이 걸러 준다
    if (W.isExec() && Math.random() < 0.35) return null;
    const item = { id: W.uid(), ...newItem() };
    const first = !W.s.assign.length;
    W.s.assign.push(item);
    if (first && W.s.view !== 'manage') W.toast(`배당할 일: ${W.plain(item.title)}`);
    refresh();
    return item;
  };

  const refresh = () => {
    W.renderChrome();
    if (['manage', 'home'].includes(W.s.view)) W.renderMain();
  };
  const take = (itemId) => {
    const s = W.s;
    const item = s.assign.find((x) => x.id === itemId);
    if (item) s.assign = s.assign.filter((x) => x !== item);
    return item;
  };

  // ---------- 배당 ----------
  W.assignTo = (itemId, member) => {
    const s = W.s;
    if (s.paused || !present().includes(member)) return;
    const item = take(itemId);
    if (!item) return;
    const notes = [];
    // 팀장은 팀이 있어서 조금 더 받아 낸다
    if (W.loadOf(member) >= (W.isExec() ? 3 : 2)) {
      W.addRel(member, -4);
      W.karma('overload', member, item.title, W.person(member).name);
      notes.push(`${W.person(member).name}님에게 일이 몰렸다. 호감도 −4`);
    }
    const skill = W.skillOf(member, item);
    const minutes = Math.round((item.minutes * 2.5 + 30 + W.rand(40)) * (1.3 - skill * 0.6));
    const w = { id: W.uid(), item, member, at: s.minute + minutes };
    s.working.push(w);
    s.queue.push({ at: w.at, kind: 'crewdone', data: { wid: w.id } });
    s.queue.sort((a, b) => a.at - b.at);
    W.toast(notes.length ? notes.join(' · ') : `${W.person(member).name}님에게 맡겼다. ${W.fmtTime(w.at)}쯤 끝날 예정`);
    refresh();
    W.advance(2);
  };

  // 직접 하기 (파트장까지만). 내 업무함으로 들어온다.
  W.assignSelf = (itemId) => {
    const item = take(itemId);
    if (!item || !item.tpl) return;
    const task = W.addTask(item.tpl, false, item.from);
    task.due = item.due;
    W.toast('직접 맡았다. 업무함에 들어갔다.');
    refresh();
  };

  // 다른 부서로 넘기기
  W.routeTo = (itemId, dept) => {
    const s = W.s;
    if (s.paused) return;
    const item = take(itemId);
    if (!item) return;
    const d = window.DEPTS[dept];
    const right = item.dept === dept && (W.isExec() ? !LEADS[dept] : dept !== ownDept());
    if (right) {
      s.done++;
      W.applyEffects({ rep: 2, perf: 2 });
      W.karma('route', d.who, item.title, W.person(d.who).name);
      W.msg.post(d.who, d.who, `"${W.plain(item.title)}" 저희 쪽 일 맞아요. 바로 처리할게요.`, { quiet: true });
      W.toast(`${d.label}로 넘겼다. 맞는 부서다. 평판 +2`);
    } else {
      // 잘못 넘기면 되돌아오고, 그 사이 시간이 날아간다
      W.applyEffects({ rep: -3 });
      W.karma('dump', d.who, item.title, W.person(d.who).name);
      item.due -= 30;
      item.bounced = (item.bounced || 0) + 1;
      s.assign.push(item);
      W.msg.post(d.who, d.who, `"${W.plain(item.title)}"... 이거 저희 일 아닌데요? 다시 보내 드려요.`);
      W.toast(`${d.label}에서 돌려보냈다. 평판 −3, 마감 30분 손해`);
    }
    refresh();
    W.advance(3);
  };

  // 맡긴 일이 끝났을 때
  function crewDone(wid) {
    const s = W.s;
    const w = s.working.find((x) => x.id === wid);
    if (!w || w.closed) return;
    w.closed = true;
    const { item, member } = w;
    const who = W.person(member).name;
    const late = s.minute > item.due;
    const ok = !late && Math.random() < W.chanceOf(member, item) + 0.12 * (W.loadOf(member) > 0 ? 0 : 1);
    if (ok) {
      s.done++;
      W.applyEffects({ perf: item.project ? 8 : 5, rep: item.project ? 2 : 1 });
      if (W.skillOf(member, item) < 0.5) W.karma('grow', member, item.title, who);
      grow(member, item.type, window.CREW[member] ? window.CREW[member].grow : 0);
      W.addRel(member, 2);
      W.karma('done', item.from, item.title);
      s.docs.unshift({ uid: w.id, title: item.title, type: item.type, verdict: '통과', at: s.minute, by: member });
      W.msg.post(member, member, `"${W.plain(item.title)}" 끝냈습니다. 확인 부탁드려요!`, { quiet: true });
    } else {
      s.missed++;
      W.applyEffects({ rep: item.project ? -2 : -3, perf: -2 });
      grow(member, item.type, 0.02); // 실패에서도 조금은 배운다
      s.docs.unshift({ uid: w.id, title: item.title, type: item.type, verdict: '반려', at: s.minute, by: member });
      W.msg.post(member, member, late ? `"${W.plain(item.title)}" 마감을 넘겼어요... 죄송합니다.` : `"${W.plain(item.title)}" 반려됐어요. 죄송합니다...`);
      // 시간이 남았으면 다시 배당할 기회
      if (!item.retry && item.due - s.minute > 60) {
        s.assign.push({ ...item, id: W.uid(), title: '[재작업] ' + W.plain(item.title), retry: true });
      } else {
        W.karma('rejected', item.from, item.title);
      }
    }
    refresh();
  }

  // 마감까지 아무도 안 맡은 일
  W.manageTick = () => {
    const s = W.s;
    if (!s.assign || !s.assign.length) return;
    const late = s.assign.filter((x) => s.minute > x.due);
    if (!late.length) return;
    s.assign = s.assign.filter((x) => s.minute <= x.due);
    late.forEach((x) => {
      s.missed++;
      W.applyEffects({ perf: -4, rep: -2 });
      W.karma('missed', x.from, x.title);
      W.msg.post(x.from, x.from, `"${W.plain(x.title)}" 아직 아무도 안 맡은 거예요?`);
    });
    refresh();
  };

  // 퇴근할 때: 배당 안 한 일은 놓친 일, 진행 중인 일은 결과가 나온다
  W.manageLeave = () => {
    const s = W.s;
    if (!W.isManager()) return;
    s.working.filter((w) => !w.closed).forEach((w) => crewDone(w.id));
    s.assign.forEach((x) => { s.missed++; W.karma('unfinished', x.from, x.title); });
    if (s.assign.length) W.applyEffects({ perf: -3 * s.assign.length });
    s.assign = [];
  };

  // ---------- 하루 시간표 ----------
  W.scheduleManage = () => {
    const s = W.s;
    s.assign = [];
    s.working = [];
    s.crewOff = [];
    if (!W.isManager()) return;
    const at = (from, span) => { let t = from + W.rand(span); if (t >= 12 * 60 && t < 13 * 60) t += 60; return t; };
    s.queue.push({ at: at(10 * 60, 330), kind: W.isExec() ? 'decision' : 'crewscene' });
    if (s.rank >= 5 && !W.isExec()) s.queue.push({ at: at(14 * 60, 150), kind: 'crewscene' });
    s.queue.sort((a, b) => a.at - b.at);
  };

  W.fireManage = (ev) => {
    const s = W.s;
    if (ev.kind === 'crewdone') { crewDone(ev.data.wid); return true; }
    if (ev.kind === 'crewscene') { if (s.phase === 'work') crewScene(); return true; }
    if (ev.kind === 'decision') { if (s.phase === 'work') decision(); return true; }
    return false;
  };

  // ---------- 팀원 장면 ----------
  function crewScene() {
    const s = W.s;
    const ids = present();
    if (!ids.length) return;
    const busy = ids.filter((id) => W.loadOf(id) >= 2);
    const cold = ids.filter((id) => W.rel(id) < -25);
    let pool = window.CREW_SCENES.filter((sc) => !sc.need || (sc.need === 'busy' ? busy.length : cold.length));
    if (cold.length && Math.random() < 0.6) pool = pool.filter((sc) => sc.need === 'cold');
    const sc = W.pick(pool);
    const crew = sc.need === 'busy' ? W.pick(busy) : sc.need === 'cold' ? W.pick(cold) : W.pick(ids);
    let minutes = 0;
    W.playScene(sc, {
      crew,
      who: crew, // 호감도와 덕·업보는 늘 그 팀원에게 남는다
      noTalk: sc.lines[0][0] === 'lead',
      onChoice: (c) => {
        minutes = c.minutes || 0;
        crewAct(c.act, crew);
      }
    }, () => { if (minutes) W.advance(minutes); });
  }

  function crewAct(act, crew) {
    const s = W.s;
    const back = (filter) => {
      s.working.filter((w) => !w.closed && filter(w)).forEach((w) => {
        w.closed = true;
        s.assign.push({ ...w.item, id: W.uid() });
      });
    };
    if (act === 'teach') {
      const weak = (window.CREW[crew] || { weak: [] }).weak;
      const types = [...new Set([...weak, ...s.working.filter((w) => w.member === crew).map((w) => w.item.type)])];
      if (types.length) grow(crew, W.pick(types), 0.12);
    }
    if (act === 'takeback') {
      const w = s.working.filter((x) => x.member === crew && !x.closed).pop();
      if (w) {
        w.closed = true;
        if (w.item.tpl) { const t = W.addTask(w.item.tpl, false, w.item.from); t.due = Math.max(w.item.due, s.minute + 60); } else s.assign.push({ ...w.item, id: W.uid() });
      }
    }
    if (act === 'reassign') back((w) => w.member === crew);
    if (act === 'off') { s.crewOff.push(crew); back((w) => w.member === crew); }
    if (act === 'creditCrew') W.crewIds().filter((id) => id !== crew).forEach((id) => W.addRel(id, 3));
    if (act === 'creditMe') W.crewIds().forEach((id) => W.addRel(id, -2));
    if (act === 'leaveCo') {
      s.crew[crew].gone = true;
      back((w) => w.member === crew);
      W.toast(`${W.person(crew).name}님이 회사를 떠난다. 파트 인원이 줄었다.`);
    }
    refresh();
  }

  // ---------- 경영 판단 (본부장부터) ----------
  function decision() {
    const s = W.s;
    const used = (s.flags.decided || []).slice(-5);
    const pool = window.EXEC_DECISIONS.map((d, i) => i).filter((i) => !used.includes(i));
    const i = W.pick(pool.length ? pool : window.EXEC_DECISIONS.map((d, j) => j));
    s.flags.decided = [...(s.flags.decided || []), i];
    const d = window.EXEC_DECISIONS[i];
    W.playScene(d, { who: d.lines[0][0], noTalk: true });
  }

  // ---------- 승진했을 때 ----------
  W.onPromoted = (go) => {
    const s = W.s;
    const role = window.ROLES[s.rank];
    if (!role) return go();
    W.initManage();
    if (s.rank === 10) return ending(go);
    const crew = W.crewIds();
    const fresh = W.isExec() ? [] : crew.filter((id) => window.CREW[id].joins === s.rank);
    W.openModal(`<p class="eyebrow">새 직책</p><h3>${esc(W.rankName())} · ${esc(role.title)}</h3>
      <p>${esc(role.desc)}</p>
      ${fresh.length ? `<p>새로 맡은 팀원:</p><ul class="plain-list">${fresh.map((id) => `<li>${W.avatar(id, 'xs')} <strong>${esc(W.fullName(id))}</strong> · ${esc(window.CREW[id].trait)}</li>`).join('')}</ul>` : ''}
      ${s.rank === 4 ? '<p class="hint">메뉴에 "업무 배당"이 생겼어요. 들어온 일을 팀원에게 맡기거나, 직접 하거나, 남의 부서 일이면 맞는 부서로 넘기세요. 사람마다 잘하는 일이 다르고, 한 사람에게 몰아주면 업보가 쌓여요.</p>' : ''}
      ${s.rank === 6 ? '<p class="hint">이제 팀장들에게 과제를 맡겨요. 과제가 어느 팀 일인지 맞히는 게 핵심이에요. 매일 경영 판단도 하나씩 내려야 해요.</p>' : ''}`,
    [{ label: '출근하기', onClick: () => { W.closeModal(); go(); } }]);
  };

  function ending(go) {
    const s = W.s;
    const best = Object.entries(s.rel || {}).filter(([id]) => window.PEOPLE[id] && !window.PEOPLE[id].external).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const worst = Object.entries(s.rel || {}).filter(([id]) => window.PEOPLE[id]).sort((a, b) => a[1] - b[1])[0];
    const gone = Object.entries(s.crew || {}).filter(([, c]) => c.gone).map(([id]) => W.person(id).name);
    W.openModal(`<p class="eyebrow">${s.day}일차 · 엔딩</p><h3>대표이사 ${esc(s.name)}</h3>
      <p>신입 사원으로 들어와 ${s.day}일 만에 대표이사가 됐다. 그래도 내일 아침 메신저는 또 울린다.</p>
      <table class="summary">
        <tr><td>지나온 직급</td><td>${window.RANKS.length}단계</td></tr>
        <tr><td>모은 용어</td><td>${s.glossary.length}개</td></tr>
        <tr><td>가장 가까운 사람</td><td>${best.map(([id, r]) => `${esc(W.person(id).name)} (${r})`).join(', ') || '-'}</td></tr>
        ${worst && worst[1] < 0 ? `<tr><td>끝내 못 푼 사이</td><td>${esc(W.person(worst[0]).name)} (${worst[1]})</td></tr>` : ''}
        ${gone.length ? `<tr><td>떠나보낸 팀원</td><td>${gone.map(esc).join(', ')}</td></tr>` : ''}
      </table>
      <p class="hint">계속 출근하면 대표이사로 하루를 이어 갈 수 있어요.</p>`,
    [{ label: '대표이사로 계속 출근하기', onClick: () => { W.closeModal(); go(); } }]);
  }

  // ---------- 배당 화면 ----------
  const pct = (n) => Math.round(n * 100) + '%';
  const chanceCls = (n) => (n >= 0.7 ? 'good' : n >= 0.45 ? 'warn' : 'bad');
  W.renderManage = (main) => {
    const s = W.s;
    const ids = W.crewIds();
    const off = s.crewOff || [];
    const depts = Object.entries(window.DEPTS).filter(([k]) => (W.isExec() ? !LEADS[k] : k !== ownDept()));
    const items = s.assign.slice().sort((a, b) => a.due - b.due);
    const card = (it) => `<li class="assign-item">
      <div class="assign-head">${it.foreign || it.type === 'route' ? '<span class="chip warn">다른 부서?</span>' : it.project ? '<span class="chip">본부 과제</span>' : `<span class="type-chip t-${it.type}">${W.TYPE_LABEL[it.type] || it.type}</span>`}
        <strong>${W.rich(it.title)}</strong>${it.bounced ? ' <span class="chip bad">반송됨</span>' : ''}
        <span class="muted">${W.avatar(it.from, 'xs')} ${esc(W.fullName(it.from))} · 마감 <span class="due ${it.due - s.minute < 60 ? 'urgent' : ''}">~${W.fmtTime(it.due)}</span></span></div>
      <div class="assign-actions">
        ${ids.map((id) => {
          const isOff = off.includes(id);
          const c = W.chanceOf(id, it);
          return `<button type="button" class="btn assign-btn" data-assign="${it.id}" data-member="${id}" ${isOff ? 'disabled' : ''}>
            ${W.avatar(id, 'xs')} ${esc(W.person(id).name)} ${isOff ? '<small class="chip">부재</small>' : W.isExec() ? '' : `<small class="chip ${chanceCls(c)}">성공 ${pct(c)}</small>`}${W.loadOf(id) ? ` <small class="muted">맡은 일 ${W.loadOf(id)}</small>` : ''}</button>`;
        }).join('')}
        ${it.tpl ? `<button type="button" class="btn" data-self="${it.id}">내가 직접 하기</button>` : ''}
        <span class="route"><select class="input" id="route-${it.id}" aria-label="넘길 부서">${depts.map(([k, d]) => `<option value="${k}">${esc(d.label)}</option>`).join('')}</select>
        <button type="button" class="btn" data-route="${it.id}">부서로 넘기기</button></span>
      </div></li>`;
    const crewCard = (id) => {
      const c = window.CREW[id];
      const skills = c ? [...new Set([...c.good, ...Object.keys(s.crew[id].skill)])].map((t) => [t, W.skillOf(id, { type: t })]).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
      const dept = deptOfLead(id);
      return `<li class="crew-card">${W.avatar(id, 'sm')}<div><strong>${esc(W.fullName(id))}</strong> ${W.relTier ? `<span class="chip ${W.relTier(id).cls}">${esc(W.relTier(id).label)}</span>` : ''}
        ${off.includes(id) ? '<span class="chip">오늘 부재</span>' : ''}
        <p class="hint">${c ? esc(c.trait) : `${esc(window.DEPTS[dept].label)}을 이끈다. ${esc(window.DEPTS[dept].label)} 과제를 맡기면 잘 해낸다.`}</p>
        ${skills.length ? `<p class="hint">잘하는 일: ${skills.map(([t, v]) => `${esc(W.TYPE_LABEL[t] || t)} ${pct(v)}`).join(' · ')}</p>` : ''}
        <p class="hint">진행 중 ${W.loadOf(id)}건 · 호감도 ${W.rel(id)}</p></div></li>`;
    };
    const working = s.working.filter((w) => !w.closed);
    main.innerHTML = `<section class="card"><div class="card-head"><h2>업무 배당</h2><span class="muted">${esc(W.rankName())} · ${esc(W.role().title)}</span></div>
      <p class="hint">${W.isExec() ? '과제 이름을 보고 어느 팀 일인지 판단해서 그 팀장에게 맡기세요. 성공률은 이제 아무도 알려 주지 않아요. 재무·총무·고객센터 일은 그 부서로 넘기세요.' : '사람마다 잘하는 일이 달라요. 한 사람에게 세 건 넘게 몰아주면 업보가 쌓여요. 우리 일이 아니면 맞는 부서로 넘기세요.'}</p>
      ${items.length ? `<ul class="assign-list">${items.map(card).join('')}</ul>` : '<p class="empty">배당할 일이 없다. 곧 들어온다.</p>'}</section>
      ${working.length ? `<section class="card"><div class="card-head"><h2>진행 중</h2></div><table class="board"><tbody>
        ${working.map((w) => `<tr><td>${W.avatar(w.member, 'xs')} ${esc(W.person(w.member).name)}</td><td>${W.rich(w.item.title)}</td><td class="muted">~${W.fmtTime(w.at)}</td></tr>`).join('')}</tbody></table></section>` : ''}
      <section class="card"><div class="card-head"><h2>${W.isExec() ? '팀장들' : '내 파트'}</h2></div><ul class="crew-list">${ids.map(crewCard).join('')}</ul></section>`;
  };

  W.bindManage = (root) => {
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-assign]');
      if (a) return W.assignTo(a.dataset.assign, a.dataset.member);
      const me = e.target.closest('[data-self]');
      if (me) return W.assignSelf(me.dataset.self);
      const r = e.target.closest('[data-route]');
      if (r) return W.routeTo(r.dataset.route, W.$('#route-' + r.dataset.route).value);
    });
  };
})();
