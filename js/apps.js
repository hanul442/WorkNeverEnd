// 업무 앱. 업무 종류마다 render(task, el, finish) 를 가진다.
// finish(quality 0~1, note) 를 부르면 업무가 끝난다.
// 입력값은 data-ui 속성으로 task.ui 에 저장해서, 화면을 다시 그려도 남게 한다.
(() => {
  const W = window.WNE;
  const A = W.apps;
  const esc = W.esc;
  const ui = (task, key, fallback = '') => (task.ui[key] !== undefined ? task.ui[key] : fallback);

  const noPaste = (el) => el.addEventListener('paste', (e) => { e.preventDefault(); W.toast('복붙은 안 돼요. 직접 치세요.'); });

  // ---------- 캘린더: 회의 시간 옮기기 ----------
  A.schedule = {
    render(task, el, finish) {
      const d = task.data;
      const ev = W.s.calendar.find((e) => e.id === d.eventId);
      const slot = task.ui.slot || null;
      const people = d.people;

      const grid = W.calendarHtml({ targetId: d.eventId, people, slot, dur: d.dur, interactive: true });

      el.innerHTML = `
        <div class="legend">
          <span><i class="sw target"></i>옮길 회의</span><span><i class="sw related"></i>참석자 일정</span><span><i class="sw other"></i>다른 사람 일정</span><span><i class="sw past"></i>지난 시간</span>
        </div>
        ${grid}
        <p class="hint">빈 칸을 누르거나 파란 회의를 끌어다 놓으면 새 시간이 표시돼요. 지금: ${window.WEEKDAYS[ev.day]} ${ev.start}시 (${d.dur}시간)</p>
        ${W.level().help ? '<p class="hint help">고르는 법: 참석자 일정과 겹치지 않고, 점심시간(12~13시)과 이미 지난 시간을 피하고, 요청에 적힌 조건까지 맞는 빈 칸을 찾으세요.</p>' : ''}
        ${task.ui.error ? `<p class="error">${esc(task.ui.error)}</p>` : ''}
        <div class="row">
          <button class="btn primary" type="button" data-act="confirm" ${slot ? '' : 'disabled'}>
            ${slot ? `${window.WEEKDAYS[slot.day]}요일 ${slot.start}시로 확정하고 초대 보내기` : '새 시간을 고르세요'}</button>
        </div>`;

      const setSlot = (day, start) => {
        task.ui.slot = { day, start: Math.min(start, 18 - d.dur) };
        task.ui.error = '';
        A.schedule.render(task, el, finish);
      };
      el.querySelectorAll('[data-slot-day]').forEach((c) => {
        c.addEventListener('click', () => setSlot(Number(c.dataset.slotDay), Number(c.dataset.slotStart)));
        c.addEventListener('dragover', (e) => e.preventDefault());
        c.addEventListener('drop', (e) => { e.preventDefault(); setSlot(Number(c.dataset.slotDay), Number(c.dataset.slotStart)); });
      });
      const t = el.querySelector('.cal-event.target');
      if (t) t.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', 'move'));
      el.querySelector('[data-act="confirm"]').addEventListener('click', () => {
        const err = W.checkSlot(task, task.ui.slot);
        if (err) {
          task.ui.mistakes = (task.ui.mistakes || 0) + 1;
          task.ui.error = err + ' 다른 시간을 골라 주세요.';
          A.schedule.render(task, el, finish);
          return;
        }
        ev.day = task.ui.slot.day;
        ev.start = task.ui.slot.start;
        ev.pending = false;
        const q = Math.max(0.5, 1 - 0.2 * (task.ui.mistakes || 0));
        finish(q, `${window.WEEKDAYS[ev.day]}요일 ${ev.start}시로 옮기고 참석자에게 초대를 보냈어요.` +
          (task.ui.mistakes ? ` 겹치는 시간을 ${task.ui.mistakes}번 골라서 시간이 더 걸렸어요.` : ''));
      });
    }
  };


  // 팀 캘린더 격자. interactive 면 빈 칸을 눌러 시간을 고를 수 있다.
  W.calendarHtml = ({ targetId = null, people = ['me'], slot = null, dur = 1, interactive = false }) => {
    const todayIdx = (W.s.day - 1) % 5;
    const cols = window.WEEKDAYS.map((wd, day) => {
      const cells = [];
      if (interactive) {
        for (let h = 9; h < 18; h++) {
          // 이미 지난 시간은 고를 수 없게 막아 둔다
          const past = day < todayIdx || (day === todayIdx && h * 60 <= W.s.minute);
          cells.push(past
            ? `<div class="cal-cell past" style="top:calc(${h - 9} * var(--hour))" title="이미 지난 시간"></div>`
            : `<button type="button" class="cal-cell ${h === 12 ? 'lunch' : ''}" style="top:calc(${h - 9} * var(--hour))"
            data-slot-day="${day}" data-slot-start="${h}" aria-label="${wd}요일 ${h}시로 옮기기"></button>`);
        }
      } else {
        cells.push('<div class="cal-lunch" style="top:calc(3 * var(--hour))"></div>');
      }
      // 지난 시간은 흐리게
      const pastH = day < todayIdx ? 9 : day === todayIdx ? W.clamp(W.s.minute / 60 - 9, 0, 9) : 0;
      if (pastH > 0 && !interactive) cells.push(`<div class="cal-past" style="height:calc(${pastH} * var(--hour))"></div>`);
      const dayEvents = W.s.calendar.filter((e) => e.day === day);
      const lanes = layoutLanes(dayEvents);
      const blocks = dayEvents.map((e) => {
        const isTarget = e.id === targetId;
        const related = e.people.some((p) => people.includes(p));
        const { lane, of } = lanes.get(e.id);
        return `<div class="cal-event ${isTarget ? 'target' : related ? 'related' : 'other'}" ${isTarget ? 'draggable="true"' : ''}
          style="top:calc(${e.start - 9} * var(--hour)); height:calc(${e.dur} * var(--hour) - 2px); left:${(lane / of) * 100}%; width:${100 / of}%">
          <strong>${W.rich(e.title)}</strong><span>${e.people.map((p) => p === 'me' ? '나' : W.person(p).name).join(', ')}</span></div>`;
      }).join('');
      const ghost = slot && slot.day === day
        ? `<div class="cal-ghost" style="top:calc(${slot.start - 9} * var(--hour)); height:calc(${dur} * var(--hour) - 2px)">여기로</div>` : '';
      return `<div class="cal-col ${day === todayIdx ? 'today' : ''}"><div class="cal-day">${wd}${day === todayIdx ? ' · 오늘' : ''}</div>
        <div class="cal-body">${cells.join('')}${blocks}${ghost}</div></div>`;
    }).join('');
    const hours = Array.from({ length: 9 }, (_, i) => `<div class="cal-hour" style="top:calc(${i} * var(--hour))">${9 + i}</div>`).join('');
    return `<div class="cal-wrap"><div class="cal">
      <div class="cal-hours"><div class="cal-day">&nbsp;</div><div class="cal-body">${hours}</div></div>${cols}
    </div></div>`;
  };

  // 같은 날 겹치는 일정은 옆으로 나란히 놓는다
  function layoutLanes(events) {
    const sorted = events.slice().sort((a, b) => a.start - b.start);
    const result = new Map();
    let group = [];
    let groupEnd = -1;
    const flush = () => {
      const lanesEnd = [];
      group.forEach((e) => {
        let lane = lanesEnd.findIndex((end) => end <= e.start);
        if (lane === -1) { lane = lanesEnd.length; lanesEnd.push(0); }
        lanesEnd[lane] = e.start + e.dur;
        result.set(e.id, { lane, of: 0 });
      });
      group.forEach((e) => { result.get(e.id).of = lanesEnd.length; });
      group = [];
    };
    sorted.forEach((e) => {
      if (group.length && e.start >= groupEnd) flush();
      group.push(e);
      groupEnd = Math.max(groupEnd, e.start + e.dur);
    });
    flush();
    return result;
  }

  // ---------- 문서 구성: 순서 바로잡기 ----------
  A.reorder = {
    render(task, el, finish) {
      const secs = task.data.sections;
      if (!task.ui.order) {
        let order;
        do { order = W.shuffle(secs.map((_, i) => i)); } while (order.every((v, i) => v === i));
        task.ui.order = order;
      }
      const order = task.ui.order;
      el.innerHTML = `
        <div class="doc-paper">
          <p class="doc-title">${W.rich(task.data.title.replace(/ 순서 정리| 목차 정리|\(.*\)/g, ''))}</p>
          <ol class="sections">${order.map((idx, pos) => `
            <li class="section" draggable="true" data-pos="${pos}">
              <span class="grip" aria-hidden="true">⋮⋮</span>
              <div class="sec-text"><strong>${W.rich(secs[idx].h)}</strong><span>${W.rich(secs[idx].t)}</span></div>
              <span class="sec-move">
                <button type="button" class="icon-btn" data-up="${pos}" aria-label="위로" ${pos === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="icon-btn" data-down="${pos}" aria-label="아래로" ${pos === order.length - 1 ? 'disabled' : ''}>↓</button>
              </span>
            </li>`).join('')}</ol>
        </div>
        <p class="hint">위아래 버튼이나 끌어다 놓기로 순서를 바꾸세요. 받는 사람이 처음부터 읽기 편한 순서가 정답이에요.</p>
        <div class="row"><button class="btn primary" type="button" data-act="submit">이 순서로 제출하기</button></div>`;

      const move = (from, to) => {
        if (to < 0 || to >= order.length) return;
        const [v] = order.splice(from, 1);
        order.splice(to, 0, v);
        A.reorder.render(task, el, finish);
      };
      el.querySelectorAll('[data-up]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.up), Number(b.dataset.up) - 1)));
      el.querySelectorAll('[data-down]').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.down), Number(b.dataset.down) + 1)));
      el.querySelectorAll('.section').forEach((li) => {
        li.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', li.dataset.pos));
        li.addEventListener('dragover', (e) => e.preventDefault());
        li.addEventListener('drop', (e) => {
          e.preventDefault();
          move(Number(e.dataTransfer.getData('text/plain')), Number(li.dataset.pos));
        });
      });
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const right = order.filter((v, i) => v === i).length;
        const q = right / order.length;
        const correct = secs.map((s) => W.plain(s.h)).join(' → ');
        finish(q === 1 ? 1 : q >= 0.6 ? 0.7 : 0.3,
          (q === 1 ? '순서 완벽해요. ' : `"${task.data.feedback}" 맞는 순서: ${correct}. `) + task.data.explain);
      });
    }
  };

  // ---------- 예산 계산 ----------
  A.budget = {
    render(task, el, finish) {
      const d = task.data;
      const rows = d.items.map((it, i) => {
        const included = it.req || ui(task, 'inc' + i, true);
        return `<tr class="${included ? '' : 'excluded'}">
          <td>${esc(it.name)} ${it.req ? '<span class="chip">필수</span>' : ''}</td>
          <td class="num">${W.fmtNum(it.unit)}</td>
          <td class="num">${W.fmtNum(it.qty)}</td>
          <td><input class="cell-input" inputmode="numeric" data-ui="amt${i}" value="${esc(ui(task, 'amt' + i))}" aria-label="${esc(it.name)} 금액" ${included ? '' : 'disabled'}></td>
          <td class="center"><input type="checkbox" data-ui="inc${i}" ${included ? 'checked' : ''} ${it.req ? 'disabled' : ''} aria-label="${esc(it.name)} 포함"></td>
        </tr>`;
      }).join('');
      const help = W.level().help
        ? `<p class="hint help">계산 순서: 금액 = 단가 × 수량 → 소계 = 포함한 금액의 합 → 부가세 = 소계 × 0.1 → 합계 = 소계 + 부가세. 합계가 한도를 넘으면 '필수'가 아닌 항목의 체크를 빼세요.</p>`
        : '';
      el.innerHTML = `${help}
        <div class="sheet-wrap"><table class="sheet">
          <thead><tr><th>항목</th><th>단가(원)</th><th>수량</th><th>금액(원)</th><th>포함</th></tr></thead>
          <tbody>${rows}
            <tr class="sum"><td colspan="3">{{소계}}</td><td><input class="cell-input" inputmode="numeric" data-ui="sub" value="${esc(ui(task, 'sub'))}" aria-label="소계"></td><td></td></tr>
            <tr class="sum"><td colspan="3">{{부가세}} (10%)</td><td><input class="cell-input" inputmode="numeric" data-ui="vat" value="${esc(ui(task, 'vat'))}" aria-label="부가세"></td><td></td></tr>
            <tr class="sum total"><td colspan="3">합계 (한도 ${W.fmtNum(d.limit)})</td><td><input class="cell-input" inputmode="numeric" data-ui="total" value="${esc(ui(task, 'total'))}" aria-label="합계"></td><td></td></tr>
          </tbody></table></div>
        <div class="calc">
          <label for="calc-input">계산기</label>
          <input id="calc-input" class="input" data-ui="calc" value="${esc(ui(task, 'calc'))}" placeholder="예: 12000*24" autocomplete="off">
          <output id="calc-out">${esc(calcText(ui(task, 'calc')))}</output>
        </div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">예산표 제출하기</button></div>`;
      el.innerHTML = el.innerHTML.replace(/\{\{(.+?)\}\}/g, (_, t) => `<button type="button" class="term" data-term="${t}">${t}</button>`);

      el.querySelectorAll('input[type="checkbox"]').forEach((cb) => cb.addEventListener('change', () => {
        task.ui[cb.dataset.ui] = cb.checked;
        A.budget.render(task, el, finish);
      }));
      const ci = el.querySelector('#calc-input');
      ci.addEventListener('input', () => { el.querySelector('#calc-out').textContent = calcText(ci.value); });

      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errors = [];
        let fields = 0;
        let ok = 0;
        let sub = 0;
        d.items.forEach((it, i) => {
          const included = it.req || ui(task, 'inc' + i, true);
          if (!included) return;
          const amount = it.unit * it.qty;
          sub += amount;
          fields++;
          if (W.parseNum(ui(task, 'amt' + i)) === amount) ok++;
          else errors.push(`${it.name} 금액은 ${W.fmtNum(it.unit)} × ${W.fmtNum(it.qty)} = ${W.fmtNum(amount)}원`);
        });
        const vat = Math.round(sub * 0.1);
        const total = sub + vat;
        [['sub', sub, '소계'], ['vat', vat, '부가세'], ['total', total, '합계']].forEach(([k, v, label]) => {
          fields++;
          if (W.parseNum(ui(task, k)) === v) ok++;
          else errors.push(`${label}는 ${W.fmtNum(v)}원`);
        });
        let q = ok / fields;
        if (total > d.limit) {
          q = Math.min(q, 0.3);
          errors.unshift(`합계 ${W.fmtNum(total)}원이 한도 ${W.fmtNum(d.limit)}원을 넘어요. 필수 아닌 항목을 빼야 해요`);
        }
        task.result = { total, ok: total <= d.limit };
        finish(q, errors.length ? '고칠 곳: ' + errors.join(' / ') + '.' : `예산표 완벽해요. 부가세 포함 ${W.fmtNum(total)}원.`);
      });
    }
  };

  function calcText(expr) {
    if (!expr) return '= ';
    const v = W.calc(expr);
    return v === null ? '= ?' : '= ' + v.toLocaleString('ko-KR');
  }

  // ---------- 전자결재 ----------
  A.approval = {
    render(task, el, finish) {
      const d = task.data;
      const line = ui(task, 'line', []);
      const cc = ui(task, 'cc', []);
      const candidates = [...new Set([W.lead(), W.mate(), 'park', 'choi', 'kang', 'song'])];
      const stamp = (id, label) => `<div class="stamp"><span class="stamp-role">${label}</span>${W.avatar(id, 'sm')}<span>${esc(W.fullName(id))}</span></div>`;
      el.innerHTML = `
        <div class="approval-doc">
          <div class="approval-line">
            ${stamp('me', '기안')}
            ${line.map((id, i) => stamp(id, i === line.length - 1 ? '최종 결재' : '검토')).join('')}
            ${line.length ? '' : '<div class="stamp empty">결재자를 추가하세요</div>'}
          </div>
          <div class="form-grid">
            <label for="ap-type">문서 양식</label>
            <select id="ap-type" class="input" data-ui="type">
              <option value="">선택하세요</option>
              ${W.DOC_TYPES.map((t) => `<option ${ui(task, 'type') === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <label for="ap-title">제목</label>
            <input id="ap-title" class="input" data-ui="title" value="${esc(ui(task, 'title'))}" placeholder="예: ${esc(d.purpose)} ${d.docType === '품의서' ? '집행 승인 요청' : '비용 처리 요청'}">
            <label for="ap-amount">금액 (원)</label>
            <input id="ap-amount" class="input" inputmode="numeric" data-ui="amount" value="${esc(ui(task, 'amount'))}">
            <span class="label">결재선</span>
            <div class="pick">
              ${candidates.map((id) => `<button type="button" class="pick-btn ${line.includes(id) ? 'on' : ''}" data-line="${id}">${W.avatar(id, 'xs')}${esc(W.fullName(id))}</button>`).join('')}
              ${line.length ? '<button type="button" class="link-btn" data-act="clear-line">결재선 비우기</button>' : ''}
            </div>
            <span class="label">{{참조}}</span>
            <div class="pick">
              ${candidates.map((id) => `<button type="button" class="pick-btn ${cc.includes(id) ? 'on' : ''}" data-cc="${id}">${W.avatar(id, 'xs')}${esc(W.person(id).dept)} ${esc(W.person(id).name)}</button>`).join('')}
            </div>
          </div>
        </div>
        <details class="rules" ${W.level().help ? 'open' : ''}><summary>사내 전결 규정 보기</summary>
          <ul>
            <li>100만 원 미만: 팀장 {{전결}}</li>
            <li>100만 원 이상 500만 원 미만: 팀장 → 부장</li>
            <li>500만 원 이상: 팀장 → 부장 → 이사</li>
            <li>돈이 나가는 문서는 재무팀 참조 필수</li>
            <li>{{품의서}}: 돈을 쓰기 전에 승인 / {{지출결의서}}: 이미 쓴 돈을 비용 처리</li>
          </ul>
        </details>
        <div class="row"><button class="btn primary" type="button" data-act="submit">상신하기</button></div>`;
      el.innerHTML = el.innerHTML.replace(/\{\{(.+?)\}\}/g, (_, t) => window.TERMS[t] ? `<button type="button" class="term" data-term="${t}">${t}</button>` : t);

      el.querySelectorAll('[data-line]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.line;
        task.ui.line = line.includes(id) ? line.filter((x) => x !== id) : [...line, id];
        A.approval.render(task, el, finish);
      }));
      el.querySelectorAll('[data-cc]').forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset.cc;
        task.ui.cc = cc.includes(id) ? cc.filter((x) => x !== id) : [...cc, id];
        A.approval.render(task, el, finish);
      }));
      const clear = el.querySelector('[data-act="clear-line"]');
      if (clear) clear.addEventListener('click', () => { task.ui.line = []; A.approval.render(task, el, finish); });

      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const want = W.approvalLine(d.amount);
        const errors = [];
        if (ui(task, 'type') !== d.docType) errors.push(`양식은 ${d.docType}${d.docType === '품의서' ? '(쓰기 전 승인)' : '(이미 쓴 돈 처리)'}`);
        if (String(ui(task, 'title')).trim().length < 4) errors.push('제목이 비었어요');
        if (W.parseNum(ui(task, 'amount')) !== d.amount) errors.push(`금액은 ${W.fmtNum(d.amount)}원`);
        if (line.join() !== want.join()) errors.push(`결재선은 ${want.map((p) => W.fullName(p)).join(' → ')}`);
        if (!cc.includes('song')) errors.push('재무팀 참조 누락');
        const q = (5 - errors.length) / 5;
        W.submitApproval(task, errors);
        finish(q, errors.length
          ? '상신은 됐지만 고칠 곳이 있어요: ' + errors.join(' / ') + '. 반려될 수 있어요.'
          : '상신 완료. 결재 결과는 전자결재 메뉴와 메신저로 알려 줘요.');
      });
    }
  };

  // ---------- 보고서 작성 ----------
  A.report = {
    render(task, el, finish) {
      const d = task.data;
      if (!task.ui.hOrder) task.ui.hOrder = W.shuffle([0, 1, 2]);
      if (!task.ui.cOrder) task.ui.cOrder = W.shuffle([0, 1, 2]);
      el.innerHTML = `
        <div class="split">
          <section class="data-panel">
            <h4>첨부: 지표 데이터</h4>
            <table class="sheet small"><thead><tr><th>지표</th><th>지난주</th><th>이번 주</th></tr></thead>
              <tbody>${d.rows.map((r) => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="num">${esc(r[2])}</td></tr>`).join('')}</tbody></table>
            <h4>특이 사항</h4>
            <ul class="notes">${d.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
            <div class="calc">
              <label for="calc-input">계산기</label>
              <input id="calc-input" class="input" data-ui="calc" value="${esc(ui(task, 'calc'))}" placeholder="예: 1000/25000*100" autocomplete="off">
              <output id="calc-out">${esc(calcText(ui(task, 'calc')))}</output>
            </div>
          </section>
          <section class="doc-paper">
            <p class="doc-title">${esc(d.title.replace(' 작성', ''))}</p>
            <fieldset><legend>1. 핵심 요약 (첫 줄)</legend>
              ${task.ui.hOrder.map((i) => `<label class="radio"><input type="radio" name="headline" data-ui="headline" value="${i}" ${String(ui(task, 'headline')) === String(i) ? 'checked' : ''}> ${esc(d.headline[i])}</label>`).join('')}
            </fieldset>
            <fieldset><legend>2. 주요 지표</legend>
              ${d.asks.map((a, i) => `<label class="inline-field"><span>${W.rich(a.label)}</span>
                <span><input class="input short" inputmode="decimal" data-ui="ask${i}" value="${esc(ui(task, 'ask' + i))}"> ${esc(a.unit)}</span></label>
                <p class="hint">${W.rich(a.hint)}</p>`).join('')}
            </fieldset>
            <fieldset><legend>3. 변화의 주요 원인</legend>
              <select class="input" data-ui="cause" aria-label="주요 원인">
                <option value="">선택하세요</option>
                ${task.ui.cOrder.map((i) => `<option value="${i}" ${String(ui(task, 'cause')) === String(i) ? 'selected' : ''}>${esc(d.causes[i])}</option>`).join('')}
              </select>
            </fieldset>
            <fieldset><legend>4. 다음 주 계획</legend>
              <textarea class="input" rows="3" data-ui="plan" placeholder="다음 주에 무엇을 할지 한두 문장으로 쓰세요">${esc(ui(task, 'plan'))}</textarea>
            </fieldset>
          </section>
        </div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">보고서 제출하기</button></div>`;
      const ci = el.querySelector('#calc-input');
      ci.addEventListener('input', () => { el.querySelector('#calc-out').textContent = calcText(ci.value); });
      noPaste(el.querySelector('textarea'));

      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errors = [];
        let ok = 0;
        const total = 3 + d.asks.length;
        if (String(ui(task, 'headline')) === '0') ok++;
        else errors.push('첫 줄은 숫자와 방향이 맞는 결론이어야 해요');
        d.asks.forEach((a, i) => {
          const v = W.parseNum(ui(task, 'ask' + i));
          if (ui(task, 'ask' + i) !== '' && Math.abs(v - a.answer) < 0.051) ok++;
          else errors.push(`${W.plain(a.label)}는 ${a.answer}${a.unit} (${W.plain(a.hint)})`);
        });
        if (String(ui(task, 'cause')) === '0') ok++;
        else errors.push(`원인은 "${d.causes[0]}" (특이 사항을 보세요)`);
        if (String(ui(task, 'plan')).trim().length >= 10) ok++;
        else errors.push('다음 주 계획이 너무 짧아요');
        finish(ok / total, errors.length ? '피드백: ' + errors.join(' / ') + '.' : '숫자도 정확하고 결론도 앞에 있어요. 바로 윗선 보고 올라갑니다.');
      });
    }
  };

  // ---------- 메일 ----------
  A.mail = {
    render(task, el, finish) {
      const d = task.data;
      const to = ui(task, 'to', []);
      const cc = ui(task, 'cc', []);
      const book = [...new Set(['partner', W.lead(), W.mate(), 'park', 'lee', 'choi', 'jung', 'yoon', 'oh', 'song'])];
      const chips = (field, list) => book.map((id) => `<button type="button" class="pick-btn ${list.includes(id) ? 'on' : ''}" data-${field}="${id}">
        ${W.avatar(id, 'xs')}${esc(W.person(id).name)} <small>${esc(W.person(id).dept)}</small></button>`).join('');
      el.innerHTML = `
        <div class="mail">
          <div class="mail-row"><span class="label">받는 사람</span><div class="pick">${chips('to', to)}</div></div>
          <div class="mail-row"><span class="label">{{참조}}</span><div class="pick">${chips('cc', cc)}</div></div>
          <div class="mail-row"><label class="label" for="mail-subject">제목</label><input id="mail-subject" class="input" data-ui="subject" value="${esc(ui(task, 'subject'))}"></div>
          <div class="memo"><span class="label">보낼 내용 메모</span><p class="target">${esc(d.text)}</p></div>
          <textarea class="input mail-body" rows="5" data-ui="body" aria-label="메일 본문" placeholder="메모 내용을 그대로 입력하세요">${esc(ui(task, 'body'))}</textarea>
        </div>
        <div class="row"><button class="btn primary" type="button" data-act="submit">보내기</button></div>`;
      el.innerHTML = el.innerHTML.replace(/\{\{(.+?)\}\}/g, (_, t) => `<button type="button" class="term" data-term="${t}">${t}</button>`);
      noPaste(el.querySelector('.mail-body'));
      ['to', 'cc'].forEach((field) => el.querySelectorAll(`[data-${field}]`).forEach((b) => b.addEventListener('click', () => {
        const id = b.dataset[field];
        const list = ui(task, field, []);
        task.ui[field] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
        A.mail.render(task, el, finish);
      })));
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const same = (a, b) => a.slice().sort().join() === b.slice().sort().join();
        const errors = [];
        let q = 0;
        if (same(to, d.to)) q += 0.3; else errors.push(`받는 사람은 ${d.to.map((p) => W.fullName(p)).join(', ')}`);
        if (same(cc, d.cc)) q += 0.2; else errors.push(`참조는 ${d.cc.map((p) => W.fullName(p)).join(', ')}`);
        if (String(ui(task, 'subject')).trim().length >= 4) q += 0.1; else errors.push('제목이 비었어요');
        const acc = W.similarity(String(ui(task, 'body')), d.text);
        q += 0.4 * acc;
        if (acc < 0.9) errors.push(`본문 정확도 ${Math.round(acc * 100)}%`);
        finish(q, errors.length ? '고칠 곳: ' + errors.join(' / ') + '.' : '메일 발송 완료. 수신자와 참조 모두 정확해요.');
      });
    }
  };

  // ---------- 문서 검토 ----------
  A.review = {
    render(task, el, finish) {
      el.innerHTML = `<p class="hint">문서에서 틀린 줄을 하나 찾아 누르세요.</p>
        <div class="doc-paper">${task.data.lines.map((l, i) => `<button class="review-line" type="button" data-i="${i}">${W.rich(l)}</button>`).join('')}</div>`;
      el.querySelectorAll('.review-line').forEach((b) => b.addEventListener('click', (e) => {
        if (e.target.closest('.term')) return;
        const ok = Number(b.dataset.i) === task.data.errorIndex;
        finish(ok ? 1 : 0, (ok ? '정확히 찾았어요. ' : '틀린 줄을 놓쳤어요. ') + task.data.explain);
      }));
    }
  };

  // ---------- 자료 준비 ----------
  A.match = {
    render(task, el, finish) {
      const opts = task.ui.opts || (task.ui.opts = W.shuffle(task.data.options.map((o, i) => i)));
      el.innerHTML = `<p><strong>${esc(task.data.question)}</strong></p>
        <div class="choices">${opts.map((i) => `<button class="choice" type="button" data-i="${i}">${esc(task.data.options[i].label)}</button>`).join('')}</div>`;
      el.querySelectorAll('.choice').forEach((b) => b.addEventListener('click', () => {
        const ok = task.data.options[Number(b.dataset.i)].correct;
        finish(ok ? 1 : 0, (ok ? '맞아요. ' : '반려됐어요. ') + task.data.explain);
      }));
    }
  };

  // ---------- 문서 작성 (타이핑) ----------
  A.typing = {
    render(task, el, finish) {
      el.innerHTML = `<p class="hint">아래 내용을 그대로 입력하세요. 붙여넣기는 안 돼요.</p>
        <div class="doc-paper target">${esc(task.data.text)}</div>
        <textarea class="input" rows="4" data-ui="body" aria-label="문서 입력" autocomplete="off" spellcheck="false">${esc(ui(task, 'body'))}</textarea>
        <div class="row"><button class="btn primary" type="button" data-act="submit">제출하기</button></div>`;
      noPaste(el.querySelector('textarea'));
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const typed = String(ui(task, 'body'));
        if (!typed.trim()) return W.toast('내용을 입력하세요.');
        const acc = W.similarity(typed, task.data.text);
        finish(acc >= 0.9 ? 1 : acc >= 0.6 ? 0.7 : 0.3, `정확도 ${Math.round(acc * 100)}%`);
      });
    }
  };
})();
