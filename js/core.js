// 공통 상태와 도구. 다른 파일은 모두 window.WNE 를 통해 서로를 부른다.
window.WNE = (() => {
  const C = {
    DAY_START: 9 * 60,
    LUNCH_AT: 12 * 60,
    DAY_END: 18 * 60,
    OVERTIME_END: 22 * 60,
    SAVE_KEY: 'workneverend-save-v2',
    BREAK_LIMIT: 3,
    // 실제 1초 = 게임 1분. 주소 뒤에 ?speed=10 을 붙이면 10배 빨라진다 (테스트용)
    SPEED: Number(new URLSearchParams(location.search).get('speed')) || 1
  };

  const STAT_INFO = {
    stamina: { label: '체력', bar: true },
    mental: { label: '멘탈', bar: true },
    rep: { label: '평판', bar: true },
    perf: { label: '성과', bar: false },
    money: { label: '돈', bar: false }
  };

  const W = { C, STAT_INFO, s: null, apps: {}, gen: {} };

  // ---------- 유틸 ----------
  W.$ = (sel, root = document) => root.querySelector(sel);
  W.$$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  W.rand = (n) => Math.floor(Math.random() * n);
  W.pick = (arr) => arr[W.rand(arr.length)];
  W.shuffle = (arr) => arr.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
  W.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  W.uid = () => 'u' + (W.s.seq++);

  W.fmtTime = (min) => {
    const h = Math.floor(min / 60) % 24;
    const m = Math.floor(min % 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  };
  W.fmtMoney = (v) => Math.round(v).toLocaleString('ko-KR') + '원';
  W.fmtNum = (v) => Math.round(v).toLocaleString('ko-KR');
  W.parseNum = (str) => Number(String(str).replace(/[^0-9.\-]/g, ''));

  W.esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  W.meName = () => (W.s && W.s.name ? W.s.name : '김신입') + ' 씨';

  // {me} 를 호칭으로, {{용어}} 를 눌러 볼 수 있는 버튼으로 바꾼다
  W.rich = (text) => W.esc(String(text).replace(/\{me\}/g, W.meName())).replace(/\{\{(.+?)\}\}/g, (_, t) =>
    window.TERMS[t] ? `<button type="button" class="term" data-term="${t}">${t}</button>` : t);
  W.plain = (text) => String(text).replace(/\{me\}/g, W.meName()).replace(/\{\{(.+?)\}\}/g, '$1');
  W.termsIn = (text) => Array.from(String(text).matchAll(/\{\{(.+?)\}\}/g)).map((m) => m[1]);

  W.person = (id) => window.PEOPLE[id] || { name: id, rank: '', dept: '', color: 1 };
  W.fullName = (id) => {
    if (id === 'me') return (W.s && W.s.name) || '나';
    const p = W.person(id);
    return p.name + ' ' + p.rank;
  };
  W.avatar = (id, size = 'md') => {
    const p = id === 'me' ? { name: (W.s && W.s.name) || '나', color: 1 } : W.person(id);
    const initial = p.name.length > 2 ? p.name.slice(-2) : p.name;
    return `<span class="avatar ${size} c${p.color}" aria-hidden="true">${W.esc(initial)}</span>`;
  };

  // 글자 단위 편집 거리로 정확도 계산
  W.similarity = (a, b) => {
    a = a.replace(/\s+/g, ' ').trim();
    b = b.replace(/\s+/g, ' ').trim();
    if (!a.length && !b.length) return 1;
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
  };

  // 숫자와 사칙연산만 계산하는 계산기
  W.calc = (expr) => {
    const clean = String(expr).replace(/,/g, '').replace(/[x×]/g, '*').replace(/÷/g, '/');
    if (!/^[0-9+\-*/(). ]+$/.test(clean)) return null;
    try {
      const v = Function('"use strict"; return (' + clean + ')')();
      return Number.isFinite(v) ? v : null;
    } catch (e) {
      return null;
    }
  };

  // ---------- 수치 ----------
  W.applyEffects = (effects = {}) => {
    const s = W.s.stats;
    for (const [k, v] of Object.entries(effects)) {
      if (!(k in s) || !v) continue;
      s[k] += v;
      if (STAT_INFO[k].bar) s[k] = W.clamp(s[k], 0, 100);
      if (k === 'perf') s[k] = Math.max(0, s[k]);
    }
    W.renderStats();
    W.checkBurnout && W.checkBurnout();
  };

  W.effectText = (effects = {}) => Object.entries(effects)
    .filter(([, v]) => v)
    .map(([k, v]) => `${STAT_INFO[k].label} ${v > 0 ? '+' : '−'}${k === 'money' ? W.fmtMoney(Math.abs(v)) : Math.abs(v)}`)
    .join(', ');

  // ---------- 저장 ----------
  W.load = () => {
    try {
      const raw = localStorage.getItem(C.SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
  W.save = () => {
    try {
      const s = W.s;
      localStorage.setItem(C.SAVE_KEY, JSON.stringify({ name: s.name, job: s.job, day: s.day, stats: s.stats, glossary: s.glossary, hangover: s.hangover }));
    } catch (e) { /* 저장이 막힌 브라우저에서는 넘어간다 */ }
  };
  W.clearSave = () => {
    try { localStorage.removeItem(C.SAVE_KEY); } catch (e) { /* 무시 */ }
  };

  // ---------- 알림 ----------
  let toastTimer = null;
  W.toast = (msg) => {
    const el = W.$('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  };

  // ---------- 모달 ----------
  let modalButtons = [];
  W.openModal = (html, buttons) => {
    modalButtons = buttons;
    W.$('#modal-body').innerHTML = html + `<div class="modal-actions">${buttons.map((b, i) =>
      `<button class="${i === 0 ? 'btn primary' : 'btn'}" type="button" data-modal="${i}">${W.esc(b.label)}</button>`).join('')}</div>`;
    const m = W.$('#modal');
    if (!m.open) m.showModal();
  };
  W.closeModal = () => {
    const m = W.$('#modal');
    if (m.open) m.close();
  };
  W.modalClick = (i) => modalButtons[i] && modalButtons[i].onClick();
  W.modalSnapshot = () => ({ html: W.$('#modal-body').innerHTML, buttons: modalButtons });
  W.modalRestore = (snap) => {
    W.$('#modal-body').innerHTML = snap.html;
    modalButtons = snap.buttons;
  };

  // ---------- 용어 ----------
  W.learnTerms = (text) => {
    W.termsIn(text).forEach((t) => {
      if (!window.TERMS[t] || W.s.glossary.includes(t)) return;
      W.s.glossary.push(t);
      W.s.todayTerms.push(t);
    });
    W.renderGlossaryCount && W.renderGlossaryCount();
  };

  W.showTerm = (t) => {
    const info = window.TERMS[t];
    if (!info) return;
    W.learnTerms('{{' + t + '}}');
    const wasOpen = W.$('#modal').open;
    const snap = wasOpen ? W.modalSnapshot() : null;
    const wasPaused = W.s.paused;
    if (!wasOpen) W.pause();
    W.openModal(`<p class="eyebrow">${W.esc(info.field)} 용어</p><h3>${W.esc(t)}</h3>
      <p>${W.esc(info.meaning)}</p><p class="example">예: "${W.esc(info.example)}"</p>`, [
      { label: '알겠어요', onClick: () => {
        if (snap) return W.modalRestore(snap);
        W.closeModal();
        if (!wasPaused) W.resume();
      } }
    ]);
  };

  // 매초 다시 그리면 누르던 버튼이 사라지므로 내용이 바뀔 때만 그린다
  W.setHtml = (el, html) => {
    if (el && el.dataset.html !== html) {
      el.innerHTML = html;
      el.dataset.html = html;
      return true;
    }
    return false;
  };

  return W;
})();
