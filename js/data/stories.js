// 동료마다 이어지는 이야기. 조건(일차, 호감도, 이전 선택)이 맞으면 다음 이야기가 메신저로 온다.
// 노드 옵션: label(내 답), reply(상대 답), rel(호감도 변화), effects(수치), next(다음 노드),
//           flag(기억해 둘 선택), karma(덕·업보 종류), spawn(생기는 업무)
// 이야기 단계(beat)마다 variants 가 있으면 need 플래그가 맞는 첫 번째 것을 쓴다.
window.STORIES = {
  lee: {
    title: '이서연 대리의 이직 고민',
    beats: [
      {
        minDay: 1, minRel: 0,
        nodes: {
          start: {
            text: '{me}, 혹시 바빠요? 그냥... 요즘 좀 지치네요. {me}는 회사 다닐 만해요?',
            options: [
              { label: '저도 솔직히 힘들어요. 대리님은 무슨 일 있으세요?', reply: '그냥 3년째 같은 일만 하니까요. 나중에 커피 한잔해요.', rel: 8, karma: 'chat' },
              { label: '저는 재밌어요! 배울 게 많아서요.', reply: '좋네요... 저도 그럴 때가 있었는데.', rel: 2 },
              { label: '죄송한데 지금 마감이라서요.', reply: '아 네네, 일 보세요!', rel: -3 }
            ]
          }
        }
      },
      {
        minDay: 3, minRel: 12,
        nodes: {
          start: {
            text: '{me}한테만 말하는 건데요... 헤드헌터한테 연락이 왔어요. 연봉 20% 더 준대요.',
            options: [
              { label: '대박이네요. 대리님이면 충분히 그럴 만하죠.', reply: '그쵸? 근데 막상 옮기려니 무섭기도 하고요.', rel: 5, next: 'ask' },
              { label: '에이, 여기 남으세요. 대리님 없으면 저희 망해요.', reply: '하하, 빈말이라도 고마워요.', rel: 4, next: 'ask' },
              { label: '팀장님도 아세요?', reply: '아뇨!! 절대 말하면 안 돼요. 진짜로요.', rel: -2, next: 'ask' }
            ]
          },
          ask: {
            text: '{me}라면 어떻게 할 것 같아요?',
            options: [
              { label: '해 보고 싶은 일이면 가세요. 응원할게요.', reply: '...그래요. 좀 더 생각해 볼게요. 고마워요.', rel: 6, flag: 'leeGo', karma: 'chat' },
              { label: '지금 프로젝트 끝나고 결정해도 늦지 않을 것 같아요.', reply: '맞아요, 하던 건 마무리해야죠.', rel: 6, flag: 'leeStay', karma: 'chat' },
              { label: '(팀장님께 슬쩍 말한다)', reply: '...', rel: -40, flag: 'leeBetrayed', karma: 'betray' }
            ]
          }
        }
      },
      {
        minDay: 5, minRel: -100,
        variants: [
          {
            need: 'leeGo',
            nodes: {
              start: {
                text: '{me}, 저 결국 이직하기로 했어요. 다음 달까지만 나와요. 제일 먼저 말하는 거예요.',
                options: [
                  { label: '축하드려요! 가시기 전에 밥 한번 사 주세요 ㅎㅎ', reply: '당연하죠. 그리고 제 거래처 리스트랑 노하우 정리해서 줄게요. {me}가 제 일 이어받을 것 같아서요.', rel: 8, effects: { perf: 10, mental: 5 }, flag: 'leeLeft' },
                  { label: '아... 저 혼자 남는 거네요.', reply: '에이, {me}는 잘할 거예요. 모르는 거 있으면 연락해요.', rel: 4, effects: { mental: -3 }, flag: 'leeLeft' }
                ]
              }
            }
          },
          {
            need: 'leeStay',
            nodes: {
              start: {
                text: '저 남기로 했어요. {me} 말 듣고 프로젝트 끝까지 해 보려고요. 대신 이번 프로젝트 같이 제대로 해 봐요!',
                options: [
                  { label: '좋아요! 제가 옆에서 잘 받쳐 드릴게요.', reply: '든든하네요. 앞으로 막히면 저한테 먼저 물어봐요.', rel: 10, effects: { rep: 4 }, flag: 'leeAlly' },
                  { label: '잘 생각하셨어요.', reply: '고마워요 ㅎㅎ', rel: 5 }
                ]
              }
            }
          },
          {
            need: 'leeBetrayed',
            nodes: {
              start: {
                text: '팀장님이 저 불러서 이직하냐고 물어보시더라고요. 그 얘기 아는 사람 {me}밖에 없었는데.',
                options: [
                  { label: '죄송해요... 걱정돼서 그랬어요.', reply: '...알겠어요. 앞으로 업무 얘기만 해요.', rel: -5, effects: { mental: -8 } },
                  { label: '저 아니에요.', reply: '네. 그렇다고 해 둘게요.', rel: -15, effects: { mental: -5, rep: -5 } }
                ]
              }
            }
          },
          {
            nodes: {
              start: {
                text: '요즘은 좀 괜찮아요. 저번에 얘기 들어줘서 고마웠어요.',
                options: [{ label: '언제든지요!', reply: '😊', rel: 3 }]
              }
            }
          }
        ]
      }
    ]
  },

  han: {
    title: '동기 한수빈의 번아웃',
    beats: [
      {
        minDay: 1, minRel: 0,
        nodes: {
          start: {
            text: '야 나 오늘 디자인 시안 다섯 번째 갈아엎음 ㅋㅋㅋ 웃음만 나온다',
            options: [
              { label: '헐 다섯 번?? 오늘 퇴근하고 맥주 콜?', reply: '콜 ㅠㅠ 너밖에 없다', rel: 8, effects: { mental: 3 }, karma: 'chat' },
              { label: '나도 오늘 엉망이야 ㅋㅋ 존버하자', reply: 'ㅋㅋㅋ 존버는 승리한다...', rel: 5 },
              { label: '(읽씹)', reply: '...바쁘구나', rel: -6 }
            ]
          }
        }
      },
      {
        minDay: 3, minRel: 10,
        nodes: {
          start: {
            text: '나 진짜 진지하게 말하는 건데, 요즘 아침에 눈 뜨면 숨이 막혀. 휴직할까 생각 중이야.',
            options: [
              { label: '많이 힘들었구나. 상담센터 같이 알아볼까?', reply: '...고마워. 회사에 EAP 상담 있다더라. 한번 받아 볼게.', rel: 10, flag: 'hanCare', karma: 'chat' },
              { label: '다들 힘들어. 조금만 더 버티자.', reply: '응... 그래야겠지.', rel: -2, flag: 'hanPush' },
              { label: '그럼 내가 팀장님한테 말해 줄까?', reply: '아니야!! 그건 하지 마. 내가 알아서 할게.', rel: -5 }
            ]
          }
        }
      },
      {
        minDay: 5, minRel: -100,
        variants: [
          {
            need: 'hanCare',
            nodes: {
              start: {
                text: '상담 받고 왔어. 좀 살 것 같아. 너 덕분이야. 오늘 점심은 내가 쏜다!',
                options: [{ label: '오 진짜? 비싼 거 먹는다 ㅋㅋ', reply: 'ㅋㅋㅋ 마음대로 골라', rel: 8, effects: { mental: 10, money: 12000 } }]
              }
            }
          },
          {
            need: 'hanPush',
            nodes: {
              start: {
                text: '나 결국 병가 냈어. 2주. 버티다가 쓰러졌다... 그동안 내 일 디자인팀 다른 분이 하실 거야.',
                options: [
                  { label: '미안해. 그때 더 들어 줄 걸.', reply: '아니야. 네 잘못 아니야. 다녀와서 보자.', rel: 6, effects: { mental: -6 } },
                  { label: '푹 쉬고 와.', reply: '응.', rel: 0, effects: { mental: -3 } }
                ]
              }
            }
          },
          {
            nodes: {
              start: {
                text: '요즘은 그럭저럭 버티는 중 ㅋㅋ 너는 괜찮냐?',
                options: [{ label: '나도 그럭저럭 ㅋㅋ', reply: '동기 사랑 나라 사랑', rel: 3 }]
              }
            }
          }
        ]
      }
    ]
  },

  jung: {
    title: '정민호 선임과 기획서 전쟁',
    beats: [
      {
        minDay: 1, minRel: -100,
        nodes: {
          start: {
            text: '기획서 또 바뀌었어요? 이번이 세 번째예요. 개발은 기획서 보고 하는 건데요.',
            options: [
              { label: '죄송해요. 바뀐 부분만 표로 정리해서 드릴게요.', reply: '...그러면 좀 낫겠네요. 부탁해요.', rel: 8, karma: 'kind' },
              { label: '팀장님이 바꾸라고 하셔서요.', reply: '네, 다들 그렇게 말하죠.', rel: -4 },
              { label: '요구사항은 원래 바뀌는 거잖아요.', reply: '그건 아는데 배포 일주일 전에 바뀌면 안 되죠.', rel: -8, karma: 'rude' }
            ]
          }
        }
      },
      {
        minDay: 3, minRel: 10,
        nodes: {
          start: {
            text: '{me}, 솔직히 이번 일정 무리예요. 금요일 {{배포}}면 주말 출근각이에요. 기획 쪽에서 같이 말해 줄 수 있어요?',
            options: [
              { label: '제가 범위 줄인 안을 만들어서 팀장님께 같이 말씀드릴게요.', reply: '진짜요? {me} 믿을게요.', rel: 10, flag: 'jungAlly', effects: { mental: -3 }, spawn: 'reorder' },
              { label: '저도 위에 말할 힘이 없어요...', reply: '그쵸. 다 똑같죠 뭐.', rel: -3 },
              { label: '개발에서 좀 더 힘내 주시면 안 될까요?', reply: '...네. 알겠습니다.', rel: -12, karma: 'rude' }
            ]
          }
        }
      },
      {
        minDay: 5, minRel: -100,
        variants: [
          {
            need: 'jungAlly',
            nodes: {
              start: {
                text: '범위 줄인 거 통과됐어요. 이번 배포 무사히 끝났고요. 앞으로 기획서는 {me}거 먼저 볼게요 ㅎㅎ',
                options: [{ label: '다행이에요! 다음에도 미리 상의할게요.', reply: '👍', rel: 8, effects: { perf: 8, rep: 4 } }]
              }
            }
          },
          {
            nodes: {
              start: {
                text: '주말 출근했습니다. 그냥 알고는 계시라고요.',
                options: [
                  { label: '고생 많으셨어요. 커피 쿠폰 보내 드릴게요.', reply: '...감사합니다.', rel: 6, effects: { money: -4500 } },
                  { label: '고생하셨어요.', reply: '네.', rel: 0 }
                ]
              }
            }
          }
        ]
      }
    ]
  },

  park: {
    title: '박지훈 팀장의 사정',
    beats: [
      {
        minDay: 2, minRel: -100,
        nodes: {
          start: {
            text: '{me}... 아직 회사예요? 나 오늘 부장님한테 우리 팀 실적 때문에 엄청 깨졌어요.',
            options: [
              { label: '내일 아침까지 이번 달 지표 정리해서 드릴게요.', reply: '...고마워요. 그거면 반박할 수 있겠다.', rel: 10, spawn: 'report', karma: 'kind' },
              { label: '고생하셨어요 팀장님. 힘내세요.', reply: '그래요, 고마워요. 들어가요.', rel: 4 },
              { label: '(못 본 척한다)', reply: '...', rel: -6 }
            ]
          }
        }
      },
      {
        minDay: 4, minRel: 15,
        nodes: {
          start: {
            text: '{me}, 다음 분기 신규 프로젝트 하나 맡아 볼래요? 힘들 텐데, 잘하면 고과에 확실히 반영해 줄게요.',
            options: [
              { label: '해 보겠습니다!', reply: '좋아요. 대신 중간보고 자주 해요.', rel: 8, flag: 'parkProject', effects: { mental: -5 }, next: 'deal' },
              { label: '지금 업무도 벅차서요... 다음에 꼭 할게요.', reply: '그래요, 무리하지 마요.', rel: -2 }
            ]
          },
          deal: {
            text: '킥오프 일정부터 잡아 줘요. 참석자는 개발, 디자인 다 들어와야 해요.',
            options: [{ label: '네, 캘린더 보고 잡겠습니다.', reply: '부탁해요.', rel: 2, spawn: 'schedule' }]
          }
        }
      }
    ]
  },

  choi: {
    title: '최영수 부장의 시험',
    beats: [
      {
        minDay: 2, minRel: -100,
        nodes: {
          start: {
            text: '{me}, 하나만 묻자. {{KPI}}랑 {{OKR}} 차이가 뭐야?',
            options: [
              { label: 'KPI는 성과를 재는 지표고, OKR은 목표와 그걸 이뤘는지 볼 핵심 결과를 같이 정하는 방식입니다.', reply: '오, 공부 좀 했네. 됐어.', rel: 12, effects: { rep: 4 } },
              { label: '둘 다 목표 아닌가요?', reply: '...신입 교육 다시 받아.', rel: -6, effects: { rep: -3 } },
              { label: '찾아보고 정리해서 보고드리겠습니다.', reply: '모르면 모른다고 하는 것도 능력이야. 정리해서 줘.', rel: 3, spawn: 'review' }
            ]
          }
        }
      },
      {
        minDay: 4, minRel: 10,
        nodes: {
          start: {
            text: '이번에 본부에서 쓸 사람이 하나 필요한데. {me} 요즘 하는 거 보니까 괜찮더라. 박 팀장한테는 내가 말할게.',
            options: [
              { label: '기회 주시면 열심히 하겠습니다.', reply: '그래. 실망시키지 마.', rel: 10, flag: 'choiPick', effects: { rep: 6 } },
              { label: '팀장님께 먼저 여쭤봐도 될까요?', reply: '그래, 그것도 맞지. 순서는 지켜야지.', rel: 4, effects: { rep: 2 } }
            ]
          }
        }
      }
    ]
  },

  yoon: {
    title: '고객센터 윤채원 매니저',
    beats: [
      {
        minDay: 2, minRel: -100,
        nodes: {
          start: {
            text: '기획팀님... 지금 고객 한 분이 2시간째 통화 중이세요. 결제 오류로 환불 요청하시는데 기획 쪽 답변이 필요해요ㅠ',
            options: [
              { label: '지금 바로 확인해서 답변 문구 같이 만들어 드릴게요.', reply: '살았다ㅠㅠ 감사해요!!', rel: 10, effects: { mental: -4 }, karma: 'kind', spawn: 'mail' },
              { label: '환불 규정대로 안내하시면 될 것 같아요.', reply: '규정은 저도 알죠... 고객님이 기획 담당자를 찾으셔서요.', rel: -3 },
              { label: '그건 저희 팀 일이 아닌데요.', reply: '...네, 알겠습니다.', rel: -10, karma: 'rude' }
            ]
          }
        }
      },
      {
        minDay: 4, minRel: 10,
        nodes: {
          start: {
            text: '저번에 도와주신 덕분에 그 고객님이 칭찬 글 남기셨어요! 기획팀 이름으로 사내 게시판에 올려 둘게요 ㅎㅎ',
            options: [{ label: '와 감사합니다! 매니저님이 다 하신 거죠.', reply: '에이 같이 한 거죠~', rel: 6, effects: { rep: 6 } }]
          }
        }
      }
    ]
  },

  oh: {
    title: '총무팀 오현주 대리',
    beats: [
      {
        minDay: 2, minRel: -100,
        nodes: {
          start: {
            text: '{me}! 사내 러닝 동호회 사람 모으는 중인데 들어올래요? 매주 목요일 퇴근 후요. 회비는 월 만 원!',
            options: [
              { label: '좋아요! 운동 좀 해야 했어요.', reply: '오예~ 단톡방 초대할게요!', rel: 8, flag: 'runClub', effects: { money: -10000, stamina: 5 } },
              { label: '저 운동은 좀... 대신 응원할게요!', reply: 'ㅋㅋ 마음 바뀌면 말해요~', rel: 1 }
            ]
          }
        }
      },
      {
        minDay: 4, minRel: -100,
        variants: [
          {
            need: 'runClub',
            nodes: {
              start: {
                text: '어제 러닝 끝나고 강태호 이사님도 오셨는데 {me} 얘기 하시더라고요. 성실하다고 ㅎㅎ',
                options: [{ label: '헉 이사님이요? 다음에도 꼭 갈게요!', reply: '그래요~ 이번 주도 봐요!', rel: 5, effects: { rep: 5, mental: 4 } }]
              }
            }
          },
          {
            nodes: {
              start: {
                text: '{me}, 다음 달 회의실 예약 시스템 바뀌어요. 공지 꼭 봐 주세요~',
                options: [{ label: '네 확인했습니다!', reply: '감사해요~', rel: 2 }]
              }
            }
          }
        ]
      }
    ]
  }
};

// 먼저 말 걸 때 호감도에 따라 달라지는 답. tier: cold(냉랭) meh(서먹) ok(보통) close(친함)
window.TALK = {
  smalltalk: {
    cold: ['네.', '무슨 일이세요?', '...네, 바빠서요.'],
    meh: ['아 네, 그럭저럭요.', '오늘 좀 바쁘네요. {me}는요?', '그냥 일하죠 뭐.'],
    ok: ['오늘 날씨 좋더라고요. 점심 뭐 드셨어요?', '{me}! 오늘 좀 정신없네요 ㅎㅎ', '저 오늘 커피 세 잔째예요 ㅋㅋ'],
    close: ['{me}~ 마침 심심했는데! ㅋㅋ', '오늘 퇴근하고 뭐 해요? 맛집 하나 찾았는데', '{me} 얘기하면 스트레스가 좀 풀려요 ㅎㅎ']
  },
  coffeeYes: ['오 진짜요? 아이스 아메리카노요!', '감사해요!! 다음엔 제가 살게요', '역시 {me} 최고 ㅠㅠ'],
  coffeeNo: ['아 괜찮아요, 저 지금 회의 들어가요.', '마음만 받을게요.'],
  helpYes: ['그거 제가 할게요. 대신 다음에 저도 도와줘요 ㅎㅎ', '오케이, 그건 제가 맡을게요.'],
  helpNo: ['저도 지금 마감이라... 죄송해요.', '음... 그건 {me} 업무 아니에요?', '지금은 좀 어려워요.'],
  gossipYes: ['이건 비밀인데요... ', '{me}한테만 말하는 거예요. '],
  gossipNo: ['저 그런 거 잘 몰라요.', '음... 소문은 좀 그래요.']
};
