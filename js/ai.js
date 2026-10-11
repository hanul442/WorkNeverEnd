// AI 대화.
// claude.ai 플레이 링크에서는 페이지가 플레이어 본인의 Claude 계정으로 Claude에게 묻는다 (API 키 필요 없음).
// 다른 곳에서 돌릴 때는 endpoint 에 Claude API를 부르는 서버 함수 주소를 넣으면 된다.
// API 키는 절대 이 파일에 넣지 않는다. 키는 서버 함수에만 둔다.
// 둘 다 없으면 선택지 방식으로만 플레이한다.
window.AI_CONFIG = {
  endpoint: null
};

window.AI = (() => {
  let sample = null;
  let off = false;

  // 플레이 링크 안에서만 window.claude 가 있다
  if (window.claude && window.claude.use) {
    window.claude.use('sample').then((fn) => {
      sample = fn;
      if (fn && window.WNE && window.WNE.s) window.WNE.renderMessenger();
    }).catch(() => {});
  }

  const enabled = () => !off && Boolean(sample || window.AI_CONFIG.endpoint);

  const fail = (e) => {
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) {
      off = true;
      return { code: e.code, message: 'AI를 쓸 수 없어요. 선택지로 계속 플레이할 수 있어요.' };
    }
    if (e.code === 'rate_limited') return { code: e.code, message: 'AI가 잠깐 쉬어야 해요. 조금 있다가 다시 말 걸어 주세요.' };
    return { code: e.code, message: 'AI 응답을 받지 못했어요.' };
  };

  // 프롬프트를 보내고 JSON 하나를 받는다
  async function ask(prompt) {
    if (sample) {
      try {
        return await sample.json(prompt, { modelTier: 'quick', cache: false });
      } catch (e) { throw fail(e); }
    }
    const res = await fetch(window.AI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw { code: 'upstream_error', message: 'AI 서버 응답 오류: ' + res.status };
    return res.json();
  }

  // 대화 턴을 보내고 글을 받는다 (onText 로 쓰는 중인 글을 받는다)
  async function talk(turns, onText) {
    if (sample) {
      try {
        const r = await sample(turns, { modelTier: 'quick', cache: false, onText: onText ? ({ text }) => onText(text) : undefined });
        return r.text;
      } catch (e) { throw fail(e); }
    }
    const res = await fetch(window.AI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: turns })
    });
    if (!res.ok) throw { code: 'upstream_error', message: 'AI 서버 응답 오류: ' + res.status };
    return (await res.json()).text;
  }

  const W = () => window.WNE;
  const int = (v, lo, hi) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
  };

  // 이 사람이 나에 대해 기억하는 것
  function memory(id) {
    const w = W();
    const lines = (w.s.karma || []).filter((k) => k.from === id).slice(-5).map((k) => '- ' + w.karmaText(k).text);
    const st = window.STORIES[id];
    if (st && w.s.story[id]) lines.push(`- 플레이어와 "${st.title}" 이야기를 ${w.s.story[id]}단계까지 나눴다.`);
    const flags = Object.keys(w.s.flags || {});
    if (flags.length) lines.push('- 지금까지 플레이어가 한 선택 표시: ' + flags.join(', '));
    return lines.length ? lines.join('\n') : '- 아직 특별한 일은 없었다.';
  }

  function setting(id) {
    const w = W();
    const p = w.person(id);
    const me = window.PEOPLE.me;
    const tier = w.relTier(id);
    const open = w.s.tasks.length;
    return `너는 한국 회사 생활 시뮬레이션 게임 "WorkNeverEnd" 속 인물 ${p.name}${p.rank ? ' ' + p.rank : ''} (${p.dept})를 연기한다.
성격과 말투: ${window.PERSONAS[id] || '평범한 회사 동료. 존댓말.'}

플레이어: ${w.s.name} (${w.rankName ? w.rankName() : me.rank}, ${me.dept}). 너는 플레이어를 "${w.meName()}"라고 부른다.
플레이어에 대한 호감도: ${w.rel(id)} (-100~100, 지금은 "${tier.label}").
플레이어에 대해 기억하는 일:
${memory(id)}
지금: ${w.s.day}일차 ${w.fmtTime(w.s.minute)}. 플레이어에게 밀린 업무 ${open}건. 플레이어 평판 ${w.s.stats.rep}.`;
  }

  function history(id, n = 12) {
    const w = W();
    const room = w.s.rooms[id];
    if (!room) return '(없음)';
    const lines = room.messages.filter((m) => m.text && m.kind !== 'score' && m.kind !== 'request').slice(-n)
      .map((m) => `${m.from === 'me' ? '플레이어' : w.person(m.from).name}: ${w.plain(m.text)}`);
    return lines.length ? lines.join('\n') : '(없음)';
  }

  const STYLE = `대화 규칙:
- 진짜 사람처럼 대화한다. 방금 받은 말에 구체적으로 반응하고, 앞의 대화 흐름과 기억을 이어 간다.
- 너도 감정과 사정이 있는 사람이다. 자기 근황, 생각, 고민, 의견을 말하고, 궁금하면 되묻는다. 상담원이나 봇처럼 무조건 맞장구치거나 정리해 주지 않는다. 바쁘면 바쁘다, 싫으면 싫다, 모르면 모른다고 한다.
- 앞에서 쓴 표현이나 문장 구조를 되풀이하지 않는다. 매번 다르게 말한다.
- 메신저 말풍선처럼 짧게 1~3줄. 한 줄이 말풍선 하나다. ㅋㅋ, ㅠ, 이모티콘은 성격에 맞을 때만.
- 게임, AI, 규칙 이야기는 절대 하지 않는다.`;

  const MARK = '#평가';
  // 답 끝의 "#평가 호감도=2 기분=1 행동=보통" 줄을 떼어 낸다
  function split(text) {
    const i = text.indexOf(MARK);
    const body = (i < 0 ? text : text.slice(0, i)).trim();
    const tail = i < 0 ? '' : text.slice(i);
    const num = (k) => { const m = tail.match(new RegExp(k + '\\s*=\\s*([-+]?\\d+)')); return m ? Number(m[1]) : 0; };
    const act = (tail.match(/행동\s*=\s*(\S+)/) || [])[1] || '';
    const bubbles = body.split(/\n+/).map((l) => l.replace(/^[-*•]\s*/, '').replace(/^[^:\s]{1,8}:\s*/, (m) => (/^(나|너|플레이어)/.test(m) ? '' : m)).trim()).filter(Boolean).slice(0, 4);
    return { bubbles, rel: num('호감도'), mental: num('기분'), karma: act.startsWith('착') ? 'kind' : act.startsWith('무례') ? 'rude' : null };
  }
  const draftText = (text) => text.split(MARK)[0].trim();

  // 방 대화를 user/assistant 턴으로 바꾼다
  function turnsFor(id, n = 16) {
    const w = W();
    const room = w.s.rooms[id];
    const out = [];
    (room ? room.messages : []).filter((m) => m.kind !== 'score' && (m.text || m.kind === 'request')).slice(-n).forEach((m) => {
      const role = m.from === 'me' ? 'user' : 'assistant';
      const content = m.kind === 'request' ? `(업무 요청을 보냈다: ${w.plain(m.title)})` : w.plain(m.text);
      const last = out[out.length - 1];
      if (last && last.role === role) last.content += '\n' + content;
      else out.push({ role, content });
    });
    return out;
  }

  // 자유 대화: 플레이어가 아무 말이나 보낸다
  async function chat(id, text, onDraft) {
    const w = W();
    const intro = `${setting(id)}

지금부터 너는 이 인물로서 플레이어와 사내 메신저로 대화한다. 이어지는 user 메시지는 플레이어가 보낸 것이고, assistant 메시지는 네(${w.person(id).name})가 이미 보낸 것이다.

${STYLE}
- 답 맨 끝에 한 줄을 꼭 붙인다: ${MARK} 호감도=정수 기분=정수 행동=착함|무례|보통
  호감도는 플레이어의 이번 말 때문에 바뀌는 너의 호감도(-8~6, 평범하면 0~1, 진심 어린 배려·칭찬은 3~6, 무례하면 음수). 기분은 플레이어 기분 변화(-3~3).`;
    const history = turnsFor(id);
    // 방금 보낸 말은 history 끝에 이미 있다
    const turns = [{ role: 'user', content: intro }, ...history];
    if (!history.length || history[history.length - 1].role !== 'user') turns.push({ role: 'user', content: text });
    const raw = await talk(turns, onDraft ? (t) => onDraft(draftText(t)) : null);
    const r = split(raw);
    return {
      bubbles: r.bubbles.length ? r.bubbles.map((b) => b.slice(0, 300)) : ['...'],
      rel: int(r.rel, -8, 6),
      mental: int(r.mental, -3, 3),
      karma: r.karma
    };
  }

  // 단톡방: 방 사람 중 1~2명이 답한다
  async function group(roomId, members, text) {
    const w = W();
    const people = members.map((id) => `- ${w.person(id).name} (${w.person(id).rank} ${w.person(id).dept}, 플레이어 호감도 ${w.rel(id)}): ${window.PERSONAS[id] || ''}`).join('\n');
    const intro = `한국 회사 생활 게임 "WorkNeverEnd" 속 단톡방 "${w.s.rooms[roomId].name}"이다. 너는 이 방 사람들을 연기한다.
방 사람들:
${people}
플레이어: ${w.s.name} (${w.rankName()}, ${window.PEOPLE.me.dept}). 지금 ${w.s.day}일차 ${w.fmtTime(w.s.minute)}.

이어지는 user 메시지는 플레이어가 단톡방에 보낸 것이고, assistant 메시지는 방 사람들이 보낸 것이다.
${STYLE}
- 이번에는 방 사람 중 1~2명이 자연스럽게 답한다. 각 줄은 "이름: 말" 형식. 사람마다 말투가 달라야 한다.`;
    const room = w.s.rooms[roomId];
    // 단톡방은 누가 말했는지 이름을 붙인다
    const named = [];
    room.messages.filter((m) => m.text).slice(-20).forEach((m) => {
      const role = m.from === 'me' ? 'user' : 'assistant';
      const content = m.from === 'me' ? w.plain(m.text) : `${w.person(m.from).name}: ${w.plain(m.text)}`;
      const last = named[named.length - 1];
      if (last && last.role === role) last.content += '\n' + content;
      else named.push({ role, content });
    });
    if (!named.length || named[named.length - 1].role !== 'user') named.push({ role: 'user', content: text });
    const raw = await talk([{ role: 'user', content: intro }, ...named]);
    const out = [];
    raw.split(/\n+/).forEach((line) => {
      const m = line.match(/^\s*([^:]{1,10}):\s*(.+)$/);
      if (!m) return;
      const id = members.find((x) => w.person(x).name === m[1].trim() || w.person(x).name.slice(1) === m[1].trim());
      if (id) out.push({ from: id, text: m[2].trim().slice(0, 300) });
    });
    return out.slice(0, 4);
  }

  // 답이 필요한 메시지에 직접 쓴 답: 가장 가까운 선택지를 고르고, 인물 답장과 채점을 받는다
  async function answer(chatMsg, text) {
    const w = W();
    const id = chatMsg.from;
    const opts = chatMsg.options.map((o, i) => `${i}: ${w.plain(o.label)}`).join('\n');
    const prompt = `${setting(id)}

최근 메신저 대화:
${history(id)}

${chatMsg.scene ? '상황: ' + chatMsg.scene + '\n' : ''}${w.person(id).name}의 메시지: """${w.plain(chatMsg.text)}"""
게임에 준비된 대표 답변:
${opts}

플레이어가 직접 쓴 답: """${text}"""

할 일:
1. 플레이어 답이 대표 답변 중 어느 쪽 뜻과 가장 가까운지 번호(pick)를 고른다. 수락/거절, 태도가 기준이다.
2. 이 인물로서 플레이어 답에 대한 메신저 답장(reply)을 쓴다. 플레이어가 실제로 한 말에 구체적으로 반응하고, 대표 답변을 베끼지 않는다. 말풍선 1~3개를 줄바꿈으로 구분하고 인물 말투로. 게임이나 AI라는 말은 하지 않는다.
3. 직장 커뮤니케이션으로서 채점한다: 적절함(예의, 상황 판단), 내용(필요한 정보), 용어(직장 용어를 맞게 썼는지), 명확성. 각 0~10.
4. feedback: 한두 문장 조언. better: 더 좋은 답 예시 한 문장.
5. bonus: 답이 대표 답변보다 훨씬 좋으면 1~3, 훨씬 나쁘면 -1~-3, 비슷하면 0.

JSON 하나만 답한다: {"pick": 정수, "reply": "...", "scores": {"적절함": n, "내용": n, "용어": n, "명확성": n}, "feedback": "...", "better": "...", "bonus": 정수}`;
    const r = await ask(prompt);
    const scores = {};
    for (const k of ['적절함', '내용', '용어', '명확성']) scores[k] = int(r.scores && r.scores[k], 0, 10);
    return {
      pick: int(r.pick, 0, chatMsg.options.length - 1),
      reply: String(r.reply || '').slice(0, 400),
      scores,
      feedback: String(r.feedback || '').slice(0, 300),
      better: String(r.better || '').slice(0, 300),
      bonus: int(r.bonus, -3, 3)
    };
  }

  return { enabled, chat, answer, group };
})();
