// 회사 안의 이벤트: 단톡방 대화, 커피·담배타임, 점심, 야근, 호출
// 대사의 사람: lead(팀장) mate(사수) peer(동기 한수빈) peer2(동기 김지우) peer3(동기 서하늘)
//             who(같이 있는 사람) me(나) 또는 people.js 의 키
// 선택지: label, effects(수치), rel(같이 있는 사람 호감도, 단톡방이면 방 사람 모두), relTo({id: n}),
//         karma(덕·업보 종류), then(이어지는 대사), result(마지막 한 줄), term(배우는 용어)

// ---------- 단톡방 ----------
// ask 가 있으면 대화 끝에 나에게 말을 건다
window.GROUP_ROOMS = {
  peers: { name: '입사 동기방 🐣', members: ['peer', 'peer2', 'peer3'] },
  close: { name: '점심 메이트', members: [] } // 호감도가 높은 사람들로 채워진다
};

window.GROUP_THREADS = {
  team: [
    { lines: [['lead', '내일 오전 10시 주간회의 자료 오늘 중으로 공유 폴더에 올려 주세요.'], ['mate', '네 팀장님!'], ['lead', '{me}도 맡은 거 있으면 같이 올려요.']],
      ask: { from: 'lead', text: '{me}, 할 수 있죠?', options: [
        { label: '네, 오늘 17시까지 올리겠습니다.', effects: { rep: 3 }, rel: 2, reply: '좋아요.' },
        { label: '제가 맡은 게 뭐였죠...?', effects: { rep: -4 }, rel: -2, reply: '...회의록 봐요.' }
      ] } },
    { lines: [['mate', '탕비실 커피머신 또 고장 났대요 ㅠㅠ'], ['lead', '총무팀에 말했어요?'], ['mate', '오 대리님이 내일 고쳐 주신대요.'], ['lead', '오늘 하루 어떻게 버티지']] },
    { lines: [['lead', '오늘 점심 다 같이 먹을까요? 법카 찬스.'], ['mate', '오 좋아요!! 🙌']],
      ask: { from: 'mate', text: '{me}도 가죠?', options: [
        { label: '당연하죠! 감사합니다 팀장님 🙏', rel: 3, reply: '역시ㅋㅋ' },
        { label: '저는 오늘 약속이 있어서요ㅠ', rel: -1, reply: '아쉽다 다음에 가요!' }
      ] } },
    { lines: [['mate', '팀장님 혹시 A사 미팅 내일로 확정됐나요?'], ['lead', '아직이요. 오후에 다시 연락 온대요.'], ['mate', '넵 확정되면 캘린더에 올릴게요.']] },
    { lines: [['lead', '다들 이번 주 {{KPI}} 숫자 금요일까지 업데이트 부탁해요.'], ['mate', '넵'], ['lead', '숫자 틀리면 부장님 보고에서 바로 걸립니다. 두 번 확인해요.']] },
    { lines: [['mate', '(사진) 오늘 하늘 미쳤어요'], ['lead', '사진 찍을 시간에 보고서...'], ['mate', '농담이시죠..?ㅎㅎ'], ['lead', '반은 진담']],
      ask: { from: 'mate', text: '{me} 창밖 봐요 진짜 예뻐요', options: [
        { label: '와 진짜 예쁘네요 ㅎㅎ 사진 저도 찍었어요', rel: 2, reply: '그쵸그쵸' },
        { label: '(보고서 쓰는 척하며 읽씹)', rel: -1, effects: { rep: 1 } }
      ] } },
    { lines: [['lead', '혹시 회의실 B 오후에 쓰는 사람?'], ['mate', '저 3시에 디자인팀이랑 써요.'], ['lead', '그럼 저는 4시로 잡을게요.']] },
    { lines: [['mate', '팀장님 내일 반차 써도 될까요? 병원 예약이 있어서요.'], ['lead', '네 결재 올려요. 급한 건 {me}한테 인수인계하고요.'], ['mate', '네! {me}, 이따 5분만 시간 돼요?']],
      ask: { from: 'mate', text: '급한 건 없고 메일 하나만 봐 주면 돼요', options: [
        { label: '네 대리님, 편하게 다녀오세요! 메모해 둘게요.', rel: 4, karma: 'kind', reply: '고마워요 ㅠㅠ 진짜 천사' },
        { label: '저도 내일 바빠서요...', rel: -4, reply: '아 그래요? 그럼 제가 다른 분께 부탁할게요.' }
      ] } },
    { lines: [['lead', '이번 달 팀 회식 날짜 투표합니다. 목요일 vs 금요일'], ['mate', '목요일이요! 금요일은 좀...'], ['lead', '금요일이 좋은데']],
      ask: { from: 'lead', text: '{me}는 언제가 좋아요?', options: [
        { label: '팀장님 편하신 날로 하시죠!', rel: 1, effects: { rep: 2 }, reply: '그럼 금요일 ㅎㅎ' },
        { label: '저도 목요일이요. 금요일은 다들 약속이 많아서요.', relTo: { mate: 4, lead: -2 }, reply: '...민주주의네요. 목요일 합시다.' }
      ] } },
    { lines: [['mate', '어제 올린 보고서 부장님이 오타 3개 찾으셨대요...'], ['lead', '보내기 전에 소리 내서 한 번 읽어 봐요. 그럼 다 보여요.'], ['mate', '넵 명심하겠습니다 ㅠ']] }
  ],
  peers: [
    { lines: [['peer', '얘들아 나 오늘 팀장님한테 보고하다가 말 더듬었어 ㅋㅋㅋ'], ['peer2', 'ㅋㅋㅋㅋ 귀엽게 봐 주셨겠지'], ['peer3', '나는 어제 거래처 이름 틀림. 너보다 낫다']],
      ask: { from: 'peer', text: '{me}는 오늘 별일 없었어?', options: [
        { label: '나도 결재선 틀려서 반려 먹음 ㅋㅋ 우리 다 똑같아', rel: 4, effects: { mental: 3 }, reply: '동지여 ㅠㅠ' },
        { label: '나는 오늘 칭찬받았는데?', rel: -2, reply: '...자랑 금지' },
        { label: '바빠서 나중에 볼게!', rel: -1 }
      ] } },
    { lines: [['peer2', '야 이번 달 월급 들어왔다'], ['peer3', '들어왔다가 나갔다'], ['peer', '카드값이 월급을 이김']] },
    { lines: [['peer3', '영업팀 선배가 그러는데 우리 회사 성과급 이번엔 나온대'], ['peer', '헐 진짜??'], ['peer2', '그 말 작년에도 돌았다던데ㅋㅋ']],
      ask: { from: 'peer3', text: '{me} 너네 팀은 뭐 들은 거 없어?', options: [
        { label: '우리 팀은 조용해. 나오면 좋겠다', rel: 1 },
        { label: '팀장님이 그러는데 이번엔 진짜 어렵대 (사실 모름)', rel: -3, karma: 'rude', reply: '헐 진짜? 다른 애들한테도 말해야겠다' }
      ] } },
    { lines: [['peer2', '오늘 배포라 나 야근 확정 ㅠ'], ['peer', '헐 힘내ㅠㅠ'], ['peer3', '야식 사 가?']],
      ask: { from: 'peer2', text: '{me} 너는 오늘 일찍 가?', options: [
        { label: '나도 남을 것 같아. 이따 같이 편의점 가자', rel: 4, reply: '오 좋아 9시에 1층!' },
        { label: '나는 칼퇴! 화이팅~', rel: 0, reply: '부럽다...' }
      ] } },
    { lines: [['peer', '나 이번 주말에 클라이밍 처음 가는 사람 데려가는데 올 사람'], ['peer3', '나 손목 약해서 패스'], ['peer2', '나 갈래']],
      ask: { from: 'peer', text: '{me}도 같이 가자!', options: [
        { label: '좋아! 나도 해 보고 싶었어', rel: 5, effects: { mental: 3 }, reply: '오예 토요일 2시!' },
        { label: '주말엔 집에서 쉴래 ㅠ', rel: -1, reply: '다음엔 꼭!' }
      ] } },
    { lines: [['peer3', '사내 공지 봤어? 동호회 모집한대'], ['peer2', '풋살 들어갈까'], ['peer', '등산은 부장님들만 있을 듯 ㅋㅋ']] },
    { lines: [['peer2', '얘들아 {{스프린트}}가 뭔지 아는 사람'], ['peer3', '너 개발팀이잖아...?'], ['peer2', '아니 나도 알지 그냥 테스트한 거야']],
      ask: { from: 'peer2', text: '{me} 너는 알아?', options: [
        { label: '짧게 끊어서 하는 개발 주기잖아. 보통 2주!', rel: 2, effects: { perf: 1 }, reply: '오 기획팀 클라스' },
        { label: '나도 몰라 ㅋㅋ', rel: 1, reply: '역시 우리는 하나다' }
      ] } },
    { lines: [['peer', '나 오늘 디자인 시안 다섯 번째 갈아엎음'], ['peer3', '헐... 왜?'], ['peer', '"느낌이 좀 별로래"'], ['peer2', '그 피드백 최악이다']] },
    { lines: [['peer3', '나 이직 제안 받았다'], ['peer', '???'], ['peer2', '벌써??'], ['peer3', '안 가 ㅋㅋ 그냥 자랑']] },
    { lines: [['peer2', '오늘 점심 뭐 먹지'], ['peer', '마라탕'], ['peer3', '또?'], ['peer', '마라탕은 매일 먹어도 돼']],
      ask: { from: 'peer3', text: '{me}가 골라 줘', options: [
        { label: '마라탕 ㄱㄱ', relTo: { peer: 4 }, reply: '역시 {me} 뭘 좀 안다' },
        { label: '오늘은 김치찌개 어때?', rel: 1, reply: '오 무난하고 좋다' }
      ] } }
  ],
  close: [
    { lines: [['who', '오늘 다들 고생했어요 ㅠ 이번 주 너무 길다'], ['who2', '아직 수요일이라는 게 믿기지 않아요']],
      ask: { from: 'who', text: '{me}는 버틸 만해요?', options: [
        { label: '덕분에 버텨요. 금요일에 맥주 한잔해요!', rel: 3, effects: { mental: 4 }, reply: '콜!! 🍺' },
        { label: '솔직히 좀 힘들어요ㅠ', rel: 2, effects: { mental: 2 }, reply: '힘들면 말해요. 같이 커피라도 마셔요.' }
      ] } },
    { lines: [['who2', '(사진) 탕비실에 누가 케이크 두고 감'], ['who', '헐 누구 생일이에요?'], ['who2', '모르는데 일단 먹어요']] },
    { lines: [['who', '{me} 아까 회의 때 말한 거 좋았어요'], ['who2', '맞아요 저도 그 생각 했어요']],
      ask: { from: 'who', text: '요즘 일 잘하던데요?', options: [
        { label: '다 선배님들 덕분이죠 😊', rel: 3, reply: '말도 예쁘게 하네ㅎㅎ' },
        { label: '아니에요 아직 멀었어요', rel: 1 }
      ] } },
    { lines: [['who2', '혹시 오늘 저녁에 시간 돼요? 근처에 새로 생긴 곱창집'], ['who', '저 가요!!']],
      ask: { from: 'who2', text: '{me}도 와요!', options: [
        { label: '좋아요! 퇴근하고 바로 갈게요', rel: 4, effects: { money: -20000, mental: 6 }, reply: '7시 1층에서 봐요!' },
        { label: '오늘은 피곤해서 다음에 꼭이요!', rel: 0 }
      ] } },
    { lines: [['who', '이거 비밀인데요'], ['who2', '?'], ['who', '다음 달에 조직 개편 있대요'], ['who2', '헐 우리 팀은요?']],
      ask: { from: 'who', text: '{me} 어디 말하면 안 돼요!', options: [
        { label: '물론이죠. 여기서만 들을게요', rel: 3, reply: '믿어요ㅎㅎ' },
        { label: '동기방에 말해도 돼요?', rel: -5, karma: 'rude', reply: '...안 된다고 했잖아요' }
      ] } }
  ]
};

// ---------- 커피·담배타임 ----------
// who 는 그때그때 정해진다 (호감도가 높은 사람이 잘 나온다)
window.BREAK_SCENES = {
  coffee: [
    { place: '1층 카페', lines: [['who', '{me}! 커피 마시러 왔어요? 같이 줄 서요.'], ['who', '요즘 일 너무 많지 않아요? 저 어제 11시에 퇴근했어요.']],
      choices: [
        { label: '헐... 진짜 고생하셨어요. 오늘은 일찍 가세요.', rel: 5, then: [['who', '그쵸ㅠ 말이라도 고마워요.']] },
        { label: '저도 할 일 많은데 방법 같이 생각해 봐요. 급한 것부터 줄 세우면 좀 나아요.', rel: 3, effects: { rep: 1 }, term: '우선순위', then: [['who', '{{우선순위}}... 맞네요. 다 급하다고 생각하니까 더 힘든 거였어요.']] },
        { label: '저는 어제 더 늦게 갔어요.', rel: -3, then: [['who', '...아 네.']], result: '불행 배틀은 아무도 이기지 못했다.' }
      ] },
    { place: '탕비실', lines: [['who', '{me}, 이거 들었어요?'], ['who', '__rumor__']],
      choices: [
        { label: '헐 진짜요? 더 얘기해 주세요.', rel: 4, effects: { mental: 2 }, then: [['who', '저도 들은 건데요... 아무튼 비밀이에요!']] },
        { label: '확실하지 않은 얘기는 조심하는 게 좋을 것 같아요.', rel: -1, effects: { rep: 2 }, then: [['who', '아... 그렇긴 하죠. 괜히 말했나.']] }
      ] },
    { place: '탕비실', lines: [['lead', '어, {me}. 또 커피예요?'], ['me', '(손에 든 컵이 갑자기 무겁다)']],
      choices: [
        { label: '팀장님 것도 한 잔 내려 드릴까요?', relTo: { lead: 6 }, karma: 'kind', then: [['lead', '오 고마워요. 연하게 부탁해요.']] },
        { label: '마시면서 오후 업무 정리하려고요. 보고는 3시에 드릴게요.', relTo: { lead: 3 }, effects: { rep: 3 }, then: [['lead', '좋아요. 3시.']] },
        { label: '하하... (어색하게 웃는다)', effects: { mental: -3 }, then: [['lead', '...']], result: '팀장님은 아무 말 없이 나갔다.' }
      ] },
    { place: '1층 카페', lines: [['who', '오늘은 제가 살게요. 뭐 마실래요?']],
      choices: [
        { label: '감사합니다! 다음엔 제가 살게요.', rel: 4, effects: { money: 4500 }, karma: 'kind', then: [['who', '좋아요, 약속한 거예요ㅎㅎ']] },
        { label: '아니에요, 제가 살게요!', rel: 3, effects: { money: -4500 }, then: [['who', '그럼 오늘은 얻어먹을게요.']] }
      ] },
    { place: '탕비실', senior: true, lines: [['who', '{me}, 회사 다니면서 제일 중요한 게 뭔지 알아요?'], ['me', '뭔데요?'], ['who', '보고는 결론부터. 그리고 나쁜 소식일수록 빨리.']],
      choices: [
        { label: '메모해 둘게요. 혹시 다른 팁도 있어요?', rel: 4, perk: 'reportTip', effects: { perf: 2 }, term: '두괄식', then: [['who', '{{두괄식}}으로 쓰기. 이것만 해도 반은 가요.']] },
        { label: '그건 다 아는 거 아닌가요?', rel: -4, then: [['who', '아는 거랑 하는 거랑은 달라요.']] }
      ] },
    { place: '탕비실', lines: [['oh', '커피머신 고장이에요~ 수리 기사님 오후에 오세요.'], ['who', '아 진짜요?? 오늘 망했다...']],
      choices: [
        { label: '오 대리님 수고 많으세요! 편의점 가서 같이 사 와요.', relTo: { oh: 4 }, rel: 2, effects: { money: -3000 }, then: [['oh', '어머 친절하셔라~ 다음 비품 신청 때 챙겨 드릴게요.']] },
        { label: '이거 언제 고쳐져요? 매번 고장이네요.', relTo: { oh: -4 }, then: [['oh', '...규정상 수리 요청은 총무팀 게시판에 올려 주세요~']] }
      ] }
  ],
  smoke: [
    { place: '옥상 흡연실', lines: [['choi', '어, 기획팀 신입이지? 요즘 팀 분위기 어때?']],
      choices: [
        { label: '다들 열심히 하고 있습니다. 팀장님이 많이 챙겨 주세요.', relTo: { choi: 3, lead: 3 }, effects: { rep: 2 }, then: [['choi', '그래, 그래야지.']] },
        { label: '솔직히 업무가 좀 많습니다...', relTo: { choi: 2, lead: -5 }, karma: 'betray', then: [['choi', '허허, 그래? 팀장한테 한번 물어봐야겠네.']], result: '부장님이 팀장님께 그 얘기를 할 것 같다.' },
        { label: '(화제를 돌린다) 오늘 날씨 좋네요.', then: [['choi', '그렇지. 골프 치기 딱 좋은 날이야.']] }
      ] },
    { place: '옥상', lines: [['who', '아 머리 아파... {me}도 바람 쐬러 왔어요?'], ['who', '오늘 위에서 결정이 또 바뀌었대요. 다음 주 일정 다 다시 짜야 할 듯.']],
      choices: [
        { label: '미리 알려 주셔서 감사해요. 제 쪽 일정도 확인해 둘게요.', rel: 3, perk: 'twistShield', effects: { rep: 2, mental: -1 }, then: [['who', '네, 내일 공식적으로 공지 날 거예요.']] },
        { label: '또요? 진짜 이 회사는...', rel: 2, effects: { mental: 2 }, then: [['who', '그러니까요. 우리끼리 얘기예요ㅋㅋ']] }
      ] },
    { place: '옥상 흡연실', lines: [['who', '담배 안 피우잖아요? 그냥 바람 쐬러?'], ['me', '네, 머리 좀 식히려고요.'], ['who', '그게 제일 중요해요. 저도 사실 끊고 싶은데.']],
      choices: [
        { label: '같이 끊어 봐요. 담타 대신 걷타 어때요?', rel: 4, effects: { stamina: 2 }, then: [['who', '걷타 ㅋㅋㅋ 좋네요. 내일부터 해 봐요.']] },
        { label: '(조용히 하늘을 본다)', effects: { mental: 3 }, then: [['who', '...좋네요, 이런 거.']] }
      ] },
    { place: '옥상', lines: [['salelead', '어이, 신입! 거래처랑 통화 한 시간 했더니 귀가 아프네.'], ['salelead', '영업은 말이야, 결국 사람이야. 기획도 마찬가지고.']],
      choices: [
        { label: '사람이요? 어떻게 하면 신뢰를 얻을 수 있어요?', relTo: { salelead: 4 }, perk: 'quoteTip', effects: { perf: 1 }, term: '팔로업', then: [['salelead', '약속한 걸 지키는 거지. 미팅 끝나면 꼭 {{팔로업}} 메일 보내고.']] },
        { label: '네네 (빨리 들어가고 싶다)', relTo: { salelead: -2 }, then: [['salelead', '하하, 바쁘구만. 들어가 봐.']] }
      ] }
  ]
};

// ---------- 점심 ----------
// LUNCH 의 각 선택지(with)에 맞는 장면 중 하나가 나온다
window.LUNCH_SCENES = {
  alone: [
    { place: '편의점 창가', lines: [['me', '(도시락을 데우고 유튜브를 튼다)'], ['me', '(평화롭다...)'], ['lead', '어? {me} 혼자 먹어요?']],
      choices: [
        { label: '네! 같이 드실래요?', relTo: { lead: 4 }, effects: { mental: -3 }, then: [['lead', '아니, 난 약속 있어서. 맛있게 먹어요.']] },
        { label: '네, 오늘은 좀 쉬고 싶어서요 ㅎㅎ', effects: { mental: 2 }, then: [['lead', '그래요, 그것도 중요하지.']] }
      ] },
    { place: '공원 벤치', lines: [['me', '(샌드위치를 들고 공원에 나왔다)'], ['me', '(비둘기가 다가온다)']],
      choices: [
        { label: '(빵 부스러기를 나눠 준다)', effects: { mental: 6 }, result: '비둘기 친구가 생겼다.' },
        { label: '(엄마한테 전화한다)', effects: { mental: 4 }, then: [['mom', '밥은 먹고 다니니? 회사는 괜찮고?']], result: '엄마 목소리를 들으니 힘이 났다.' }
      ] }
  ],
  team: [
    { place: '국밥집', lines: [['lead', '자, 여기 국밥이 진짜야.'], ['lead', '내가 신입 때는 말이야...'], ['mate', '(눈으로 신호를 보낸다: 또 시작이다)']],
      choices: [
        { label: '와 팀장님 그때 진짜 대단하셨네요! 그래서요?', relTo: { lead: 5, mate: -1 }, effects: { mental: -3, rep: 2 }, then: [['lead', '그래서 내가 부장님한테 딱 말했지...']], result: '이야기가 30분 이어졌다.' },
        { label: '팀장님, 그때도 보고는 두괄식이었어요?', relTo: { lead: 3, mate: 3 }, effects: { mental: 1 }, perk: 'reportTip', then: [['lead', '하하, 그땐 그런 말도 없었어. 그냥 혼나면서 배웠지.'], ['mate', '(엄지척)']] },
        { label: '(국밥에 집중한다)', relTo: { lead: -1 }, effects: { mental: 2 } }
      ] },
    { place: '파스타집', lines: [['lead', '오늘은 내가 살게요. 법카 아니고 내 돈.'], ['mate', '헉 팀장님 무슨 날이에요?'], ['lead', '그냥, 다들 요즘 고생하니까.']],
      choices: [
        { label: '감사합니다! 잘 먹겠습니다 🙏', relTo: { lead: 4 }, effects: { money: 10000, mental: 4 } },
        { label: '커피는 제가 살게요!', relTo: { lead: 6, mate: 2 }, effects: { money: 4500, mental: 3 }, karma: 'kind', then: [['lead', '오, 센스 있네.']] }
      ] },
    { place: '중식당', lines: [['mate', '짜장 vs 짬뽕'], ['lead', '나는 짬뽕.'], ['mate', '{me}는요?']],
      choices: [
        { label: '저도 짬뽕이요!', relTo: { lead: 2 } },
        { label: '저는 짜장이요. 탕수육 시켜서 나눠 먹어요!', rel: 0, relTo: { lead: 1, mate: 3 }, effects: { money: -3000, mental: 3 }, then: [['lead', '탕수육 좋지. 부먹?'], ['mate', '(긴장)']] }
      ] }
  ],
  peers: [
    { place: '마라탕집', lines: [['peer', '나 고민 있어...'], ['peer', '팀장님이 나만 미워하는 것 같아.']],
      choices: [
        { label: '무슨 일 있었어? 천천히 얘기해 봐.', relTo: { peer: 6 }, karma: 'kind', effects: { mental: -1 }, then: [['peer', '시안을 계속 다시 하래... 근데 이유를 안 말해 줘.'], ['me', '다음엔 "어떤 점을 바꾸면 될까요?" 하고 구체적으로 물어봐.'], ['peer', '오... 그래 볼게. 고마워 ㅠ']] },
        { label: '에이 기분 탓이야~', relTo: { peer: -2 }, then: [['peer', '...그런가.']] }
      ] },
    { place: '돈가스집', lines: [['peer2', '야 근데 너네 연봉 얼마야?'], ['peer3', '야 그거 물어보면 안 되는 거 아냐?'], ['peer2', '우리끼린데 뭐 어때']],
      choices: [
        { label: '사내 규정상 말하면 안 될걸? 대신 협상 팁은 공유하자', relTo: { peer2: 1, peer3: 3 }, effects: { rep: 1 }, then: [['peer3', '오 협상 팁 좋다.']] },
        { label: '나 얼마 받는지 말해 줄게!', relTo: { peer2: 3, peer3: -2 }, effects: { mental: -4 }, then: [['peer2', '헐... 나보다 많네.']], result: '분위기가 묘해졌다.' }
      ] },
    { place: '김치찌개집', lines: [['peer3', '오늘 고객사 미팅 갔다가 대표님이 내 이름 기억해 주셨어!'], ['peer', '대박!!'], ['peer2', '영업 체질이네']],
      choices: [
        { label: '진짜 잘됐다! 오늘 이건 내가 쏜다', relTo: { peer3: 5, peer: 2, peer2: 2 }, effects: { money: -10000, mental: 4 }, karma: 'kind' },
        { label: '부럽다... 난 오늘 반려만 두 번', relTo: { peer3: 1 }, effects: { mental: -1 }, then: [['peer3', '괜찮아, 다음엔 통과야!']] }
      ] }
  ],
  skip: [
    { place: '내 자리', lines: [['me', '(키보드 소리만 들린다)'], ['mate', '{me}, 점심 안 먹어요? 이거라도 먹어요.'], ['mate', '(삼각김밥을 놓고 간다)']],
      choices: [
        { label: '대리님 감사해요 ㅠㅠ', relTo: { mate: 4 }, effects: { stamina: 4 } },
        { label: '괜찮아요, 다이어트 중이라서요.', relTo: { mate: -1 } }
      ] }
  ]
};

// ---------- 야근 ----------
window.OVERTIME_SCENES = [
  { at: 19 * 60, place: '사무실 · 19:00', lines: [['lead', '아직 안 갔어요? 다들 저녁은?'], ['mate', '배고파요 팀장님...'], ['lead', '야식 시킬까요? 내가 쏠게.']],
    choices: [
      { label: '치킨이요!!', relTo: { lead: 3, mate: 3 }, effects: { stamina: 8, mental: 5 }, then: [['mate', '치킨 최고 ㅠㅠ'], ['lead', '먹고 힘내서 끝냅시다.']] },
      { label: '저는 괜찮습니다. 빨리 끝내고 갈게요.', relTo: { lead: 1 }, effects: { stamina: -3, perf: 2 } }
    ] },
  { at: 20 * 60, place: '불 꺼진 사무실 · 20:00', lines: [['me', '(사무실에 나 혼자다)'], ['me', '(형광등이 깜빡인다)'], ['friend', '야 ㅋㅋㅋ 너 또 야근이냐? 나 지금 너네 회사 앞이다']],
    choices: [
      { label: '헐 진짜? 10분만 내려갈게', effects: { mental: 8 }, then: [['friend', '편의점 커피 사 놨다. 힘내라 회사원'], ['me', '(조금 울컥했다)']] },
      { label: '미안 오늘은 진짜 못 나가 ㅠ', effects: { mental: -2 }, then: [['friend', '그래 화이팅. 주말에 보자']] }
    ] },
  { at: 20 * 60 + 30, place: '사무실 · 20:30', lines: [['lead', '{me}, 아직 있었어요?'], ['lead', '...잠깐 얘기 좀 해요. 요즘 어때요? 힘든 거 없어요?']],
    choices: [
      { label: '솔직히 업무가 많아서 좀 벅차요. 우선순위를 같이 정해 주시면 좋겠어요.', relTo: { lead: 5 }, perk: 'prep', effects: { mental: 4 }, term: '우선순위', then: [['lead', '그래요. 내일 아침에 15분 잡고 {{우선순위}} 같이 정리합시다.'], ['lead', '말해 줘서 고마워요.']] },
      { label: '괜찮습니다! 아직 할 만해요.', relTo: { lead: 2 }, effects: { mental: -2 }, then: [['lead', '...무리하지 말고요.']] }
    ] },
  { at: 21 * 60, place: '1층 로비 · 21:00', lines: [['me', '(경비 아저씨가 순찰을 돈다)'], ['guard', '아이고, 또 늦게까지 있네. 젊을 때 몸 챙겨요.']],
    choices: [
      { label: '감사합니다. 아저씨도 고생 많으세요!', effects: { mental: 4 } },
      { label: '(꾸벅 인사만 한다)', effects: { mental: 1 } }
    ] },
  { at: 19 * 60 + 30, place: '사무실 · 19:30', lines: [['peer2', '{me}! 너도 야근? 나 배포 대기 중 ㅠ'], ['peer2', '편의점 갈래? 컵라면 각']],
    choices: [
      { label: '가자! 딱 10분만', relTo: { peer2: 5 }, effects: { stamina: 5, mental: 4, money: -3000 }, then: [['peer2', '야근 동지 ㅋㅋ 컵라면은 야근 때 먹어야 제맛']] },
      { label: '나 이것만 끝내고 바로 갈래 ㅠ', relTo: { peer2: -1 }, effects: { perf: 1 } }
    ] }
];

// ---------- 호출 ----------
// scold: 오늘 놓친 업무나 업보가 있을 때 / teach: 일을 알려 준다 / handover: 일을 넘겨받는다
window.SUMMONS = {
  scold: [
    { place: '회의실 B', lines: [['lead', '{me}, 잠깐 회의실로 와요.'], ['lead', '앉아요. __reason__'], ['lead', '이런 일 생기면 저한테 먼저 말했어야죠. 왜 말 안 했어요?']],
      choices: [
        { label: '죄송합니다. 업무가 몰려서 놓쳤습니다. 앞으로 마감 하루 전에 진행 상황을 공유하겠습니다.', relTo: { lead: 3 }, effects: { rep: 3, mental: -3 }, term: '공유', then: [['lead', '좋아요. 문제를 숨기는 게 제일 위험해요. 미리 {{공유}}만 해 줘도 내가 막을 수 있어요.']], result: '혼났지만 대책을 말해서 신뢰는 지켰다.' },
        { label: '저도 다른 급한 일이 있었어서요...', relTo: { lead: -5 }, effects: { rep: -4, mental: -6 }, karma: 'rude', then: [['lead', '변명 듣자고 부른 거 아니에요.']], result: '분위기가 얼어붙었다.' },
        { label: '...(아무 말도 못 한다)', effects: { mental: -8 }, then: [['lead', '...다음부턴 조심해요. 나가 봐요.']] }
      ] },
    { place: '팀장님 자리 옆', lines: [['lead', '{me}, 이리 와 봐요.'], ['lead', '__reason__ 부장님이 저한테 물어보셨어요.'], ['lead', '저도 할 말이 없더라고요.']],
      choices: [
        { label: '제 잘못입니다. 지금 바로 수습할 방법부터 정리해서 말씀드리겠습니다.', relTo: { lead: 4 }, effects: { rep: 2, mental: -4 }, then: [['lead', '그래요, 그게 먼저예요. 30분 안에 가져와요.']] },
        { label: '이 대리님이 그렇게 하라고 하셔서...', relTo: { lead: -3, mate: -8 }, effects: { rep: -3 }, karma: 'betray', then: [['lead', '...남 탓은 하지 말아요.']], result: '사수가 이 얘기를 들으면 서운해할 것 같다.' }
      ] }
  ],
  teach: [
    { place: '내 자리', perk: 'reportTip', lines: [['mate', '{me}, 잠깐 이리 와 봐요. 이거 하나 알려 줄게요.'], ['mate', '보고서 쓸 때 숫자는 꼭 출처랑 기준 날짜를 같이 써요.'], ['mate', '"매출 10% 증가"보다 "9월 매출, 전월 대비 10% 증가 (재무팀 자료 기준)"가 훨씬 믿음이 가요.']],
      quiz: { q: '다음 중 가장 좋은 보고 문장은?', options: [
        { label: '10월 신규 가입자 1,200명, 전월 대비 15% 증가 (마케팅팀 집계)', correct: true },
        { label: '가입자가 많이 늘었습니다', correct: false },
        { label: '가입자 15% 증가한 것 같습니다', correct: false }
      ] } },
    { place: '팀장님 자리', perk: 'mailTip', lines: [['lead', '{me}, 메일 쓸 때 받는 사람이랑 참조 구분하죠?'], ['lead', '받는 사람은 그 일을 해야 하는 사람, {{참조}}는 알고만 있으면 되는 사람이에요.'], ['lead', '참조에 있는 사람한테 일 시키면 아무도 안 해요.']],
      quiz: { q: '디자인팀에 시안 수정을 요청하고, 팀장님은 알고만 계시면 된다. 어떻게 보낼까?', options: [
        { label: '받는 사람: 디자인팀 담당자 / 참조: 팀장님', correct: true },
        { label: '받는 사람: 팀장님 / 참조: 디자인팀', correct: false },
        { label: '둘 다 받는 사람에 넣는다', correct: false }
      ] } },
    { place: '회의실 A', perk: 'meetingTip', lines: [['mate', '{me}, 회의록 쓰는 법 알려 줄게요.'], ['mate', '회의록은 "누가, 무엇을, 언제까지"가 핵심이에요. 이걸 {{액션 아이템}}이라고 해요.'], ['mate', '대화 내용을 다 받아 적는 게 아니에요.']],
      quiz: { q: '회의록에 꼭 들어가야 하는 것은?', options: [
        { label: '정 선임: 결제 오류 수정, 10/15까지', correct: true },
        { label: '오늘 회의 분위기가 좋았음', correct: false },
        { label: '참석자들이 한 말 전부', correct: false }
      ] } },
    { place: '탕비실', perk: 'approvalTip', lines: [['lead', '{me}, 결재 올릴 때 금액 보고 결재선 정하는 거 알죠?'], ['lead', '우리 회사는 100만 원 넘으면 부장님, 500만 원 넘으면 이사님까지 가요. 이걸 {{전결}} 규정이라고 해요.']],
      quiz: { q: '300만 원짜리 행사비 품의는 어디까지 올라가야 할까?', options: [
        { label: '팀장님 → 부장님', correct: true },
        { label: '팀장님까지만', correct: false },
        { label: '팀장님 → 부장님 → 이사님', correct: false }
      ] } }
  ],
  handover: [
    { place: '사수 자리', lines: [['mate', '{me}, 나 내일 반차라서 급한 거 하나만 넘길게요.'], ['mate', '__task__ 이거 오늘 중으로만 처리해 주면 돼요.'], ['mate', '자료는 공유 폴더에 있고, 막히면 메신저 줘요.']],
      choices: [
        { label: '네! 마감이랑 받는 사람, 주의할 점 메모해 둘게요. 혹시 예전에 비슷하게 한 거 있어요?', relTo: { mate: 4 }, careful: true, term: '인수인계', then: [['mate', '역시 꼼꼼하네요. 지난달 건 참고하면 돼요. 이런 게 제대로 된 {{인수인계}}예요.']], result: '꼼꼼히 받아서 마감이 넉넉해졌다.' },
        { label: '네네 알겠습니다 (대충 듣는다)', relTo: { mate: -1 }, careful: false, then: [['mate', '...메모 안 해도 괜찮아요?']], result: '대충 들어서 마감이 빠듯하다.' }
      ] },
    { place: '회의실 C', lines: [['lead', '{me}, 이 건은 원래 이 대리가 하던 건데 이제 {me}가 맡아요.'], ['lead', '__task__'], ['lead', '처음이라 모르는 건 이 대리한테 물어보고요.']],
      choices: [
        { label: '네, 지금까지 진행 상황이랑 이슈부터 정리해서 받겠습니다.', relTo: { lead: 3, mate: 2 }, careful: true, effects: { rep: 2 }, result: '진행 상황을 정리해 받아서 마감이 넉넉해졌다.' },
        { label: '제가요...? 네...', relTo: { lead: -1 }, careful: false, effects: { mental: -3 }, result: '얼떨결에 일을 떠안았다.' }
      ] }
  ]
};

// ---------- 소문과 정보 ----------
// 소문을 들으면 정보(perk)가 생긴다. 정보는 실제로 게임에 이득을 준다.
// perk 가 null 이면 그냥 소문이다 (가짜일 수도 있다).
window.RUMORS = [
  { text: '팀장님은 오후 3시쯤 기분이 제일 좋대. 보고는 그때 하래.', perk: 'boss3pm' },
  { text: '최 부장님은 보고서 첫 줄에 결론 없으면 바로 반려한대.', perk: 'reportTip' },
  { text: '재무팀 송 과장님은 결재선 틀리면 무조건 반려래. 금액 기준표부터 보래.', perk: 'approvalTip' },
  { text: '이번 회의에서 부장님이 용어 질문을 하신대. 회의록을 미리 보래.', perk: 'meetingTip' },
  { text: '오늘 위에서 결정이 또 바뀐대. 진행 중인 일은 미리 확인해 두래.', perk: 'twistShield' },
  { text: '팀장님 오늘 오후 내내 외근이래. 숨 좀 돌려도 될 듯.', perk: 'bossAway' },
  { text: '오늘 저녁에 팀장님이 회식 얘기 꺼낼 거래. 약속 있으면 미리 말해 두래.', perk: 'dinnerWarn' },
  { text: '총무팀 오 대리님은 메일 받는 사람이랑 참조 틀리면 다시 보내래.', perk: 'mailTip' },
  { text: '고객센터 윤 매니저님 요즘 민원 때문에 힘들대. 지금 챙겨 주면 오래 기억한대.', perk: 'yoonCare' },
  { text: '내일 아침에 팀장님이 업무 몰아서 주신대. 일정 미리 정리해 두래.', perk: 'prep' },
  { text: '견적서는 할인 먼저 하고 부가세 붙이는 거래. 영업팀 신입들 그거 다 틀린대.', perk: 'quoteTip' },
  { text: '옆 팀 과장님이 다음 달에 이직한대.', perk: null },
  { text: '이사님이 사실 고양이를 세 마리 키운대.', perk: null },
  { text: '회사 근처에 새 마라탕집 생겼대. 줄이 엄청 길대.', perk: null }
];

// 정보: 하루(days) 동안 유지된다. types 의 업무를 통과하면 bonus, 업무 화면에 hint 가 뜬다.
window.PERKS = {
  boss3pm: { label: '팀장님은 오후 3시가 기분 최고', desc: '14:00~16:00에 끝낸 업무는 평판 +2 더', days: 1 },
  reportTip: { label: '보고서는 결론부터', desc: '보고서·문서 구성 업무 통과 시 성과 +3', types: ['report', 'reorder', 'review'], bonus: { perf: 3 }, hint: '들은 정보: 최 부장님은 첫 줄에 결론이 없으면 반려한다. 결론 → 근거 → 다음 할 일 순서로.', days: 2 },
  approvalTip: { label: '결재선은 금액 기준표부터', desc: '결재·경비 업무 통과 시 성과 +3', types: ['approval', 'expense', 'budget'], bonus: { perf: 3 }, hint: '들은 정보: 금액에 따라 결재선이 달라진다. 규정의 금액 기준부터 확인하자.', days: 2 },
  mailTip: { label: '받는 사람과 참조 구분', desc: '메일 업무 통과 시 성과 +2, 평판 +1', types: ['mail'], bonus: { perf: 2, rep: 1 }, hint: '들은 정보: 일을 해야 하는 사람은 받는 사람, 알고만 있으면 되는 사람은 참조.', days: 2 },
  quoteTip: { label: '할인 먼저, 부가세는 나중에', desc: '견적·예산 업무 통과 시 성과 +3', types: ['quote', 'budget'], bonus: { perf: 3 }, hint: '들은 정보: 할인한 금액이 공급가액이고, 부가세 10%는 공급가액에 붙인다.', days: 2 },
  meetingTip: { label: '회의 질문 미리 알기', desc: '다음 회의에서 정답에 표시가 뜬다', days: 2 },
  twistShield: { label: '결정 번복 대비', desc: '오늘은 업무 중간에 요청이 바뀌지 않는다', days: 1 },
  bossAway: { label: '팀장님 외근', desc: '오늘은 휴식을 자주 해도 눈치 보이지 않는다', days: 1 },
  dinnerWarn: { label: '회식 예고', desc: '오늘 회식에 빠져도 업보가 남지 않는다', days: 1 },
  yoonCare: { label: '윤 매니저님 챙기기', desc: '오늘 윤채원 매니저와 친해지는 속도 2배', relBoost: 'yoon', days: 1 },
  prep: { label: '내일 업무 대비', desc: '다음 날 업무 마감이 20% 넉넉해진다', days: 2, nextDay: true }
};
