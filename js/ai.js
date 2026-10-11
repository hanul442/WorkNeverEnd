// AI 채점 대화.
// endpoint 에 Claude API를 호출하는 서버 함수 주소를 넣으면, 메신저에서 직접 타이핑한 답을 AI가 채점한다.
// API 키는 절대 이 파일에 넣지 않는다. 키는 서버 함수에만 둔다.
// 비어 있으면 선택지 방식으로 플레이한다.
window.AI_CONFIG = {
  endpoint: null
};

window.AI = {
  enabled() {
    return Boolean(window.AI_CONFIG.endpoint);
  },

  // 서버 함수는 아래 모양의 JSON을 돌려줘야 한다.
  // { scores: { 적절함, 내용, 용어, 명확성 }, feedback, better, reply, effects: { rep, perf, mental } }
  async evaluate({ from, rank, scene, message, answer }) {
    const res = await fetch(window.AI_CONFIG.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, rank, scene, message, answer })
    });
    if (!res.ok) throw new Error('AI 채점 서버 응답 오류: ' + res.status);
    return res.json();
  }
};
