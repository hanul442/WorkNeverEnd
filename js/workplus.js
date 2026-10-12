// 업무 종류 추가: 회의록 정리, 문서 교정, 집계표, 고객 문의 답변, 출장비 정산
(() => {
  const W = window.WNE;
  const A = W.apps;
  const G = W.gen;
  const esc = W.esc;
  const ui = (task, key, fallback = '') => (task.ui[key] !== undefined ? task.ui[key] : fallback);
  const forTeam = (pool) => {
    const own = pool.filter((t) => !t.teams || t.teams.includes(W.s.job));
    return own.length ? own : pool;
  };
  const who = (t) => (t.teams ? t.from : W.teamPerson(t.from));

  Object.assign(W.TYPE_LABEL, { minutes: '회의록', proof: '문서 교정', pivot: '집계표', cs: '고객 답변', travel: '출장 정산' });

  // ---------- 회의록 정리 ----------
  const MIN_CHOICES = ['결정 사항', '{{액션 아이템}}', '기록 안 함'];
  G.minutes = () => {
    const t = W.pick(forTeam(window.MINUTES_DOCS));
    return {
      type: 'minutes', title: t.title, from: who(t), minutes: 15, deadline: 150 + W.rand(60),
      brief: `방금 끝난 회의 녹취예요. 말마다 결정 사항인지, {{액션 아이템}}(누가 무엇을 언제까지)인지, 안 적어도 되는 말인지 나눠 주세요. 회의: ${t.meeting}`,
      data: t
    };
  };
  A.minutes = {
    render(task, el, finish) {
      const d = task.data;
      el.innerHTML = `<div class="table-wrap"><table class="sheet classify">
        <thead><tr><th>발언</th>${MIN_CHOICES.map((c) => `<th>${W.rich(c)}</th>`).join('')}</tr></thead>
        <tbody>${d.lines.map((l, i) => `<tr><td><strong>${esc(W.person(l.who).name)}</strong>: ${W.rich(l.text.replace('{me}', W.meName()))}</td>${MIN_CHOICES.map((c, j) => `<td class="center">
          <input type="radio" name="mn${i}" data-ui="m${i}" value="${j}" ${String(ui(task, 'm' + i)) === String(j) ? 'checked' : ''} aria-label="${esc(W.person(l.who).name)} 발언: ${esc(W.plain(c))}"></td>`).join('')}</tr>`).join('')}
        </tbody></table></div>
        ${W.level().help ? '<p class="hint help">"확정, ~로 갑니다, ~하기로 해요"는 결정 사항. 이름과 기한이 같이 나오면 액션 아이템. 잡담과 결론 없는 말은 안 적어요.</p>' : ''}
        <div class="row"><button class="btn primary" type="button" data-act="submit">회의록 공유하기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        if (d.lines.some((l, i) => ui(task, 'm' + i) === '')) return W.toast('모든 발언을 분류해 주세요.');
        const wrong = d.lines.filter((l, i) => Number(ui(task, 'm' + i)) !== l.answer);
        finish((d.lines.length - wrong.length) / d.lines.length,
          wrong.length ? '다시 볼 것: ' + wrong.map((l) => `"${W.plain(l.text.replace('{me}', W.meName()))}" → ${W.plain(MIN_CHOICES[l.answer])}. ${l.why}`).join(' / ') : '깔끔한 회의록이에요. 다들 이걸 보고 바로 움직였어요.');
      });
    }
  };

  // ---------- 문서 교정 ----------
  // "[[틀린|맞는|이유]]" 를 토막으로 나눈다. 틀린 말과 맞는 말이 같으면 멀쩡한 곳이다.
  const parseProof = (text) => {
    const out = [];
    text.split(/(\[\[[^\]]+\]\])/).forEach((part) => {
      const m = part.match(/^\[\[([^|]*)\|([^|]*)\|?([^\]]*)\]\]$/);
      if (m) out.push({ text: m[1], fix: m[2], why: m[3], error: m[1] !== m[2] });
      else part.split(/(\s+)/).filter(Boolean).forEach((w) => out.push({ text: w, space: /^\s+$/.test(w) }));
    });
    return out;
  };
  G.proof = () => {
    const t = W.pick(forTeam(window.PROOF_DOCS));
    const tokens = parseProof(t.text);
    const n = tokens.filter((x) => x.error).length;
    return {
      type: 'proof', title: t.title, from: who(t), minutes: 10, deadline: 150 + W.rand(60),
      brief: `나가기 전에 교정 한 번 봐 주세요. 틀린 곳이 ${n}군데 있어요. 틀린 말을 눌러 표시하세요. 멀쩡한 곳을 누르면 감점이에요.`,
      data: { tokens, n }
    };
  };
  A.proof = {
    render(task, el, finish) {
      const d = task.data;
      const marked = new Set(String(ui(task, 'marks', '')).split(',').filter(Boolean).map(Number));
      el.innerHTML = `<div class="doc-paper proof">${d.tokens.map((t, i) => (t.space ? ' ' : `<button type="button" class="proof-word ${marked.has(i) ? 'marked' : ''}" data-w="${i}" aria-pressed="${marked.has(i)}">${esc(t.text)}</button>`)).join('')}</div>
        <p class="hint">표시한 곳 ${marked.size}개 / 틀린 곳 ${d.n}개</p>
        <div class="row"><button class="btn primary" type="button" data-act="submit">교정 끝내기</button></div>`;
      el.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
        const i = Number(b.dataset.w);
        if (marked.has(i)) marked.delete(i); else marked.add(i);
        task.ui.marks = [...marked].join(',');
        A.proof.render(task, el, finish);
      }));
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errs = d.tokens.map((t, i) => [t, i]).filter(([t]) => t.error);
        const hit = errs.filter(([, i]) => marked.has(i));
        const falseHits = [...marked].filter((i) => !d.tokens[i].error).length;
        const q = W.clamp(hit.length / d.n - falseHits * 0.15, 0, 1);
        const missed = errs.filter(([, i]) => !marked.has(i));
        finish(q, (missed.length ? '놓친 곳: ' + missed.map(([t]) => `"${t.text}" → "${t.fix}" (${t.why})`).join(' / ') : '틀린 곳을 다 찾았어요.') +
          (falseHits ? ` 멀쩡한 곳 ${falseHits}군데를 고쳐서 확인이 한 번 더 필요했어요.` : ''));
      });
    }
  };

  // ---------- 집계표 ----------
  G.pivot = () => {
    const t = W.pick(forTeam(window.PIVOT_SETS));
    const [lo, hi] = t.range;
    const step = hi > 200 ? 10 : 1;
    const rows = [];
    t.days.forEach((day) => t.groups.forEach((g) => {
      if (Math.random() < 0.85) rows.push({ day, group: g, v: Math.round((lo + Math.random() * (hi - lo)) / step) * step });
    }));
    const totals = Object.fromEntries(t.groups.map((g) => [g, rows.filter((r) => r.group === g).reduce((a, r) => a + r.v, 0)]));
    const top = t.groups.slice().sort((a, b) => totals[b] - totals[a])[0];
    return {
      type: 'pivot', title: t.title, from: who(t), minutes: 15, deadline: 170 + W.rand(60),
      brief: `원본 데이터를 ${t.group}별로 묶어서 합계를 내 주세요({{피벗}}). 전체 합계와 가장 높은 ${t.group}도 같이요.`,
      data: { ...t, rows, totals, grand: rows.reduce((a, r) => a + r.v, 0), top }
    };
  };
  A.pivot = {
    render(task, el, finish) {
      const d = task.data;
      const cell = (key, label) => `<input class="cell-input" inputmode="numeric" data-ui="${key}" value="${esc(ui(task, key))}" aria-label="${esc(label)}">`;
      el.innerHTML = `<div class="pivot-wrap">
        <div class="sheet-wrap"><table class="sheet"><caption class="hint">원본 (${esc(d.value)})</caption>
          <thead><tr><th>기간</th><th>${esc(d.group)}</th><th>${esc(d.value)}</th></tr></thead>
          <tbody>${d.rows.map((r) => `<tr><td>${esc(r.day)}</td><td>${esc(r.group)}</td><td class="num">${W.fmtNum(r.v)}</td></tr>`).join('')}</tbody></table></div>
        <div class="sheet-wrap"><table class="sheet"><caption class="hint">집계표</caption>
          <thead><tr><th>${esc(d.group)}</th><th>합계</th></tr></thead>
          <tbody>${d.groups.map((g, i) => `<tr><td>${esc(g)}</td><td>${cell('g' + i, g + ' 합계')}</td></tr>`).join('')}
            <tr class="sum total"><td>전체</td><td>${cell('grand', '전체 합계')}</td></tr></tbody></table>
          <label class="field-label" for="pv-top">가장 높은 ${esc(d.group)}</label>
          <select id="pv-top" class="input" data-ui="top"><option value="">고르기</option>${d.groups.map((g) => `<option ${ui(task, 'top') === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
        </div></div>
        ${W.level().help ? `<p class="hint help">${esc(d.group)}마다 원본에서 같은 이름의 행만 골라 더하세요. 전체는 모든 행의 합이에요. 엑셀이라면 SUMIF나 피벗 테이블로 해요.</p>` : ''}
        <div class="row"><button class="btn primary" type="button" data-act="submit">집계표 공유하기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const errors = [];
        let ok = 0;
        d.groups.forEach((g, i) => {
          if (W.parseNum(ui(task, 'g' + i)) === d.totals[g]) ok++;
          else errors.push(`${g} 합계는 ${W.fmtNum(d.totals[g])}`);
        });
        if (W.parseNum(ui(task, 'grand')) === d.grand) ok++; else errors.push(`전체 합계는 ${W.fmtNum(d.grand)}`);
        if (ui(task, 'top') === d.top) ok++; else errors.push(`가장 높은 ${d.group}은 ${d.top}`);
        finish(ok / (d.groups.length + 2), errors.length ? '틀린 곳: ' + errors.join(', ') + '. 숫자 하나가 보고서 전체를 흔들어요.' : '집계가 정확해요. 그대로 주간 보고에 들어갔어요.');
      });
    }
  };

  // ---------- 고객 문의 답변 ----------
  G.cs = () => {
    const t = W.pick(forTeam(window.CS_INQUIRIES));
    const sections = t.sections.map((s) => ({ label: s.label, options: W.shuffle(s.options) }));
    return {
      type: 'cs', title: t.title, from: who(t), minutes: 10, deadline: 120 + W.rand(60),
      brief: '고객 문의에 답변을 써 주세요. 칸마다 가장 알맞은 문장을 고르면 답변이 완성돼요. 변명, 남 탓, 지킬 수 없는 약속은 안 돼요.',
      data: { customer: t.customer, sections }
    };
  };
  A.cs = {
    render(task, el, finish) {
      const d = task.data;
      el.innerHTML = `<div class="cs-ask"><span class="label">고객 문의</span><p>"${esc(d.customer)}"</p></div>
        ${d.sections.map((s, i) => `<fieldset class="cs-sec"><legend>${i + 1}. ${esc(s.label)}</legend>
          ${s.options.map((o, j) => `<label class="check"><input type="radio" name="cs${i}" data-ui="c${i}" value="${j}" ${String(ui(task, 'c' + i)) === String(j) ? 'checked' : ''}> ${esc(o.text)}</label>`).join('')}</fieldset>`).join('')}
        <div class="row"><button class="btn primary" type="button" data-act="submit">답변 보내기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        if (d.sections.some((s, i) => ui(task, 'c' + i) === '')) return W.toast('모든 칸을 골라 주세요.');
        const wrong = d.sections.filter((s, i) => !s.options[Number(ui(task, 'c' + i))].best);
        finish((d.sections.length - wrong.length) / d.sections.length,
          wrong.length ? '아쉬운 부분: ' + wrong.map((s) => `${s.label}은 "${s.options.find((o) => o.best).text}"가 좋아요`).join(' / ') : '고객이 "빠르고 정확한 답변 감사합니다"라고 답장했어요.');
      });
    }
  };

  // ---------- 출장비 정산 ----------
  G.travel = () => {
    const R = window.TRAVEL_RULES;
    const t = W.pick(window.TRAVEL_TRIPS);
    const nights = 1 + W.rand(2);
    const days = nights + 1;
    const limit = R.lodging[t.city];
    const hotel = Array.from({ length: nights }, () => Math.round((limit * (0.75 + Math.random() * 0.5)) / 1000) * 1000);
    const meals = Array.from({ length: days }, () => Math.round((25000 + Math.random() * 30000) / 500) * 500);
    const ans = {
      lodging: hotel.reduce((a, v) => a + Math.min(v, limit), 0),
      meal: meals.reduce((a, v) => a + Math.min(v, R.meal), 0),
      transport: t.transport.reduce((a, x) => a + x[1], 0),
      perDiem: days * R.perDiem
    };
    ans.total = ans.lodging + ans.meal + ans.transport + ans.perDiem;
    return {
      type: 'travel', title: `${t.purpose} 출장비 {{정산}}`, from: 'song', minutes: 15, deadline: 180 + W.rand(60),
      brief: `${t.city} ${nights}박 ${days}일 출장 다녀온 영수증이에요. 규정대로 인정되는 금액만 계산해서 정산서를 채워 주세요. 한도를 넘은 금액은 인정 안 돼요.`,
      data: { ...t, nights, days, limit, hotel, meals, ans }
    };
  };
  A.travel = {
    render(task, el, finish) {
      const d = task.data;
      const R = window.TRAVEL_RULES;
      const cell = (key, label) => `<input class="cell-input" inputmode="numeric" data-ui="${key}" value="${esc(ui(task, key))}" aria-label="${esc(label)}">`;
      el.innerHTML = `<div class="karma-box"><span class="label">출장비 규정 (재무팀)</span>
          <p>숙박: ${esc(d.city)} 1박 ${W.fmtMoney(d.limit)}까지 · 식대: 하루 ${W.fmtMoney(R.meal)}까지 · 교통: 영수증 실비 · ${W.rich('{{일비}}')}: 하루 ${W.fmtMoney(R.perDiem)} (영수증 없이)</p></div>
        <div class="sheet-wrap"><table class="sheet"><caption class="hint">영수증</caption><tbody>
          ${d.hotel.map((v, i) => `<tr><td>숙박 ${i + 1}박째</td><td class="num">${W.fmtNum(v)}원</td></tr>`).join('')}
          ${d.meals.map((v, i) => `<tr><td>식대 ${i + 1}일째</td><td class="num">${W.fmtNum(v)}원</td></tr>`).join('')}
          ${d.transport.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${W.fmtNum(v)}원</td></tr>`).join('')}
        </tbody></table></div>
        <div class="doc-paper"><p class="doc-title">출장비 정산서</p><div class="sheet-wrap"><table class="sheet"><tbody>
          <tr><td>숙박비 (인정액)</td><td>${cell('lodging', '숙박비 인정액')}</td></tr>
          <tr><td>식대 (인정액)</td><td>${cell('meal', '식대 인정액')}</td></tr>
          <tr><td>교통비</td><td>${cell('transport', '교통비')}</td></tr>
          <tr><td>일비 (${d.days}일)</td><td>${cell('perDiem', '일비')}</td></tr>
          <tr class="sum total"><td>청구 합계</td><td>${cell('total', '청구 합계')}</td></tr>
        </tbody></table></div></div>
        ${W.level().help ? '<p class="hint help">숙박과 식대는 날마다 한도와 비교해서 작은 쪽만 더해요. 일비는 출장 일수 × 정액이에요.</p>' : ''}
        <div class="row"><button class="btn primary" type="button" data-act="submit">정산서 제출하기</button></div>`;
      el.querySelector('[data-act="submit"]').addEventListener('click', () => {
        const names = { lodging: '숙박비', meal: '식대', transport: '교통비', perDiem: '일비', total: '합계' };
        const errors = Object.keys(names).filter((k) => W.parseNum(ui(task, k)) !== d.ans[k]);
        finish((5 - errors.length) / 5, errors.length
          ? '재무팀 반송: ' + errors.map((k) => `${names[k]}는 ${W.fmtNum(d.ans[k])}원`).join(', ') + '. 한도를 넘은 날은 한도만큼만 인정돼요.'
          : '송도윤 과장님: "깔끔하네요. 이번 달 급여에 같이 들어가요."');
      });
    }
  };

  // ---------- 업무 비중에 더하기 ----------
  const MORE = {
    기획: { minutes: 2, proof: 1, pivot: 1, cs: 1, travel: 1 },
    개발: { minutes: 2, proof: 1, cs: 1, travel: 1 },
    디자인: { minutes: 2, proof: 2, cs: 1, travel: 1 },
    영업: { minutes: 1, proof: 1, pivot: 2, cs: 2, travel: 2 }
  };
  Object.entries(MORE).forEach(([k, w]) => Object.assign(window.TEAMS[k].weights, w));
  W.HARD_TYPES && W.HARD_TYPES.push('pivot', 'travel');

  // 팀원도 새 업무를 잘하고 못하는 게 있다
  if (window.CREW) {
    window.CREW.nam.good.push('minutes');
    window.CREW.bae.good.push('pivot', 'travel');
    window.CREW.lim.good.push('cs');
    window.CREW.lim.weak.push('proof');
    window.CREW.moon.good.push('proof', 'minutes');
  }
})();
