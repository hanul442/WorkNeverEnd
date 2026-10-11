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

  // 프롬프트를 보내고 JSON 하나를 받는다
  async function ask(prompt) {
    if (sample) {
      try {
        return await sample.json(prompt, { modelTier: 'quick', cache: false });
      } catch (e) {
        if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(e.code)) {
          off = true;
          throw { code: e.code, message: 'AI를 쓸 수 없어요. 선택지로 계속 플레이할 수 있어요.' };
        }
        if (e.code === 'rate_limited') throw { code: e.code, message: 'AI가 잠깐 쉬어야 해요. 조금 있다가 다시 말 걸어 주세요.' };
        throw { code: e.code, message: 'AI 응답을 받지 못했어요.' };
      }
    }
    const res = await fetch(window.AI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    if (!res.ok) throw { code: 'upstream_error', message: 'AI 서버 응답 오류: ' + res.status };
    return res.json();
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

  // 자유 대화: 플레이어가 아무 말이나 보낸다
  async function chat(id, text) {
    const prompt = `${setting(id)}

최근 메신저 대화:
${history(id)}

플레이어가 방금 보낸 메시지: """${text}"""

이 인물로서 메신저 답장을 써라.
- 1~3문장, 인물의 말투 그대로. 게임이나 AI라는 말은 하지 않는다.
- 호감도와 기억에 맞게 반응한다. 냉랭하면 짧고 차갑게, 친하면 편하게.
- 무례하거나 선을 넘는 말, 업무 시간에 지나친 잡담에는 현실 직장인처럼 불편해한다.
- 업무 부탁이나 고민 상담에는 인물 입장에서 현실적으로 답한다. 직장 용어를 자연스럽게 섞어도 된다.
- 플레이어의 말 때문에 호감도가 얼마나 바뀔지 정한다: 평범하면 0~2, 진심 어린 배려나 칭찬이면 3~6, 무례하면 -3~-8.

JSON 하나만 답한다: {"reply": "답장", "rel": 정수, "mental": -3~3 정수(플레이어 기분 변화), "karma": "kind" | "rude" | null}
karma 는 확실히 착한 행동이면 "kind", 확실히 무례하거나 험담이면 "rude", 아니면 null.`;
    const r = await ask(prompt);
    return {
      reply: String(r.reply || '...').slice(0, 400),
      rel: int(r.rel, -8, 6),
      mental: int(r.mental, -3, 3),
      karma: r.karma === 'kind' || r.karma === 'rude' ? r.karma : null
    };
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
2. 이 인물로서 플레이어 답에 대한 메신저 답장(reply)을 1~2문장, 인물 말투로 쓴다. 게임이나 AI라는 말은 하지 않는다.
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

  return { enabled, chat, answer };
})();
