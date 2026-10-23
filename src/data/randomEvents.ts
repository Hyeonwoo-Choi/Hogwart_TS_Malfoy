import type { Node, Scenario } from '../engine/types'
import { END, H, N, S, bg, fx, iff, opt, show } from './dsl'

/**
 * 자유 일과의 일상 랜덤 이벤트. 활동이 끝난 뒤 장소·활동·시작 시간대·소요·챕터 조건에 맞는 이벤트를 추첨한다(core.ts drawRandomEvent).
 * 추첨 확률은 평범한 결과가 기본이다(짧은 활동 50% · 반나절 70% · 하루 이상 85%, 직전에 이벤트가 있었으면 ×0.4; 만남·조연 일상이 나온 활동에서는 추첨하지 않는다). 직전 이벤트는 반복하지 않고, 이미 본 이벤트일수록 덜 나온다.
 * 이벤트는 환경·마법·실수·우연으로 구성한다. 캐릭터와의 관계 수치(감정)는 건드리지 않고, 효과는 아주 작은 능력치 변화와 추가 시간(time+N)뿐이다.
 * 장면은 EVENT 모드로 재생되고 끝나면 일과로 돌아온다. 추가 시간이 남은 자유 시간을 넘으면 거기서 끝나고 필수 스토리는 건너뛰지 않는다.
 */
export type EventType = 'flavor' | 'mishap' | 'fortunate' | 'choice' | 'rare'
export interface RandomEvent {
  id: string; type: EventType
  places: string[]
  /** 이 활동 뒤에만(없으면 장소의 모든 활동) */
  acts?: string[]
  /** 활동을 시작한 시간대(0 오후1 · 1 오후2 · 2 저녁) */
  slots?: number[]
  /** 활동 소요가 이 이상일 때만 */
  minDur?: number
  chapters?: [number, number]
  weight?: number
  once?: boolean
  cond?: string
}

const EVENTS: RandomEvent[] = []
const SCENES: Scenario = {}
function ev(meta: RandomEvent, nodes: Node[], subs: Scenario = {}) {
  if (!meta.id.startsWith('rev_')) throw new Error(`이벤트 ID는 rev_로 시작해야 한다: ${meta.id}`)
  EVENTS.push(meta); SCENES[meta.id] = nodes; Object.assign(SCENES, subs)
}
const A = bg // 읽기 쉽게

/* ====================== 도서관 ====================== */
ev({ id: 'rev_lib_hush', type: 'flavor', places: ['library'] }, [
  A('library'), show(null),
  N('핀스 부인의 "쉿"은 세 번째부터 거의 노래가 되어 있었다. 책장 사이에서 누군가 재채기를 참다가 책상을 쳤고, 방 안의 모든 고개가 한 번에 올라왔다가 한꺼번에 내려갔다.'),
  N('나는 웃음을 삼키느라 한 줄을 세 번 읽었다. 그래도 세 번째엔 머리에 들어왔다.'),
  END,
])
ev({ id: 'rev_lib_margin', type: 'fortunate', places: ['library'], acts: ['study', 'research'] }, [
  A('library'), show(null),
  N('빌려 온 낡은 교재의 여백에 연필로 쓴 메모가 빽빽했다. 본문보다 메모가 더 정확했다. 앞선 주인은 같은 문단에서 나와 똑같이 막혔고, 나보다 두 줄 먼저 빠져나왔다.'),
  H('…고마워요, 이름 모를 선배님.'),
  N('책을 덮을 때 속표지의 이름을 확인하려다 그만두었다. 모르는 채로 감사하는 쪽이 어울렸다.'),
  fx('stat.insight+1'), END,
])
ev({ id: 'rev_lib_tower', type: 'mishap', places: ['library'], acts: ['study', 'research', 'deep_study'] }, [
  A('library'), show(null),
  N('참고서를 한 권만 더 올렸을 뿐이다. 탑이 한 번 기우뚱하더니, 우리가 한 박자 늦게 알아챌 만큼 조용히 무너졌다.'),
  S('핀스', '…포터 군.'),
  N('나는 책을 한 권씩 서가 번호대로 되돌려 놓았다. 번호가 제일 긴 것부터 제자리를 찾는 일이 이렇게 오래 걸릴 줄은 몰랐다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_lib_restricted', type: 'choice', places: ['library'], acts: ['research', 'deep_study'], minDur: 2 }, [
  A('library'), show(null),
  N('금서 구역의 줄 너머에서 책 한 권이 저절로 서가를 빠져나왔다. 바닥을 한 번 튕기더니 내 책상 앞에서 펼쳐졌다. 낡은 가죽 표지에서 낮은 웅웅 소리가 났다.'),
  { t: 'choice', id: 'R-01', prompt: '펼쳐진 책이 웅웅거린다. 나는…', options: [
    opt('A', '손대지 않고 핀스 부인이 오기 전에 제자리에 돌려놓는다.', { goto: 'rev_lib_restricted_a' }),
    opt('B', '펼쳐진 쪽을 딱 한 줄만 읽는다.', { goto: 'rev_lib_restricted_b' }),
  ] },
], {
  rev_lib_restricted_a: [
    A('library'), show(null),
    N('책은 내가 닫으려 하자 순순히 덮였다. 서가 사이로 지팡이 끝을 가볍게 흔들어 보내자 제 발로 줄 너머로 돌아갔다. 심장이 아직도 두 박자쯤 빨랐다.'),
    fx('stat.will+1'), END,
  ],
  rev_lib_restricted_b: [
    A('library'), show(null),
    N('한 줄이었다. 읽는 순간 글자가 종이 위에서 한 칸 옆으로 미끄러졌고, 나는 그 한 줄을 이해한 것 같은 기분이 들었다.'),
    S('핀스', '거기. 그 책은 아직 검열 대상이다, 포터 군.'),
    N('쫓겨나듯 서가 구석으로 옮겨 앉아 변명하는 데 반나절의 끝자락이 날아갔다. 한 줄은 머릿속에 남았다.'),
    fx('stat.insight+2', 'time+1'), END,
  ],
})
ev({ id: 'rev_lib_sunpatch', type: 'flavor', places: ['library'], acts: ['research', 'deep_study'], minDur: 2 }, [
  A('library'), show(null),
  N('창가 햇빛이 책상 위를 가로질러 한 뼘씩 이동했다. 처음엔 펼친 책 왼쪽에, 다음엔 오른쪽에, 마지막엔 책등까지 올랐다. 해가 책 한 권을 다 읽는 동안 나는 한 장을 읽었다.'),
  END,
])
ev({ id: 'rev_lib_peeves', type: 'rare', places: ['library'], weight: 1 }, [
  A('library'), show(null),
  N('돌아와 보니 서가가 전부 한 칸씩 옆으로 밀려 있었다. 번호는 그대로인데 책들만 한 칸씩 잘못된 자리에 서서 서로를 모른 척하고 있었다.'),
  N('천장 근처에서 낄낄거리는 소리가 났다. 피브스였다. 핀스 부인의 비명이 서고 끝에서 들려올 때까지, 나는 아무도 만나지 않은 얼굴로 책상에 앉아 있었다.'),
  fx('time+1'), END,
])

/* ====================== 마법약 교실 ====================== */
ev({ id: 'rev_pot_steam', type: 'flavor', places: ['potions'] }, [
  A('potions'), show(null),
  N('지하 교실의 김은 솥마다 색이 달랐다. 초록, 보라, 아무 색도 아닌 것. 아무 색도 아닌 김이 제일 수상했고 제일 조용했다.'),
  END,
])
ev({ id: 'rev_pot_boil', type: 'mishap', places: ['potions'], acts: ['brew', 'brew_research'] }, [
  A('potions'), show(null),
  N('눈을 한 번 돌렸을 뿐이다. 솥이 알아서 끓어 넘쳐 책상 가장자리를 타고 바닥으로 흘러내렸다. 흘러내린 자리에서 돌바닥이 보랏빛으로 변했다.'),
  H('…물, 물, 물이 어디 있더라.'),
  N('닦는 데 걸린 시간보다 돌바닥 색이 돌아오는 데 걸린 시간이 더 길었다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_pot_clear', type: 'fortunate', places: ['potions'], acts: ['brew', 'brew_research'] }, [
  A('potions'), show(null),
  N('저어 가던 용액이 어느 순간 정확한 색으로 맑아졌다. 책에 쓰인 색과 한 치도 다르지 않았다. 나는 숨을 멈추고 한참 들여다보았다.'),
  N('이런 순간이 며칠에 한 번쯤 오는 모양이다. 나는 그걸 오래 쥐고 있으려 하지 않고 병에 담았다.'),
  fx('stat.int+1'), END,
])
ev({ id: 'rev_pot_smell', type: 'choice', places: ['potions'], acts: ['brew_research'], minDur: 3 }, [
  A('potions'), show(null),
  N('이틀째 끓이던 솥에서 처음 맡아 보는 냄새가 올라왔다. 달기도, 시기도 한 향이었다. 책에는 이런 말이 없었다.'),
  { t: 'choice', id: 'R-02', prompt: '냄새가 달라졌다. 나는…', options: [
    opt('A', '불을 줄이고 처음 분량부터 다시 확인한다.', { goto: 'rev_pot_smell_a' }),
    opt('B', '그대로 두고 끝까지 지켜본다.', { goto: 'rev_pot_smell_b' }),
  ] },
], {
  rev_pot_smell_a: [
    A('potions'), show(null),
    N('저울에 다시 올려 보니 월장석 가루가 반 눈금 모자랐다. 고쳐 넣자 냄새는 곧 익숙한 쪽으로 돌아왔다. 느리지만 틀리지 않는 쪽이 마음 편했다.'),
    fx('stat.int+1'), END,
  ],
  rev_pot_smell_b: [
    A('potions'), show(null),
    iff('roll(50)', 'rev_pot_smell_b_good', 'rev_pot_smell_b_bad'),
  ],
  rev_pot_smell_b_good: [
    A('potions'), show(null),
    N('냄새는 점점 짙어졌다가 어느 순간 맑게 가라앉았다. 처음 보는 반응이었다. 노트에 번호를 적고 따로 병에 옮겼다. 왜 그랬는지는 아직 모른다.'),
    fx('stat.insight+2'), END,
  ],
  rev_pot_smell_b_bad: [
    A('potions'), show(null),
    N('냄새가 매캐한 쪽으로 기울더니 솥 바닥이 눌었다. 솥을 닦는 데 오후를 쓰고 나서야, 그 냄새가 달아서가 아니라 타고 있어서 났다는 걸 알았다.'),
    fx('time+1'), END,
  ],
})
ev({ id: 'rev_pot_recipe', type: 'rare', places: ['potions'], acts: ['brew', 'brew_research', 'study'] }, [
  A('potions'), show(null),
  N('선반 뒤쪽에서 노랗게 바랜 카드 한 장이 떨어졌다. 손글씨로 쓴 레시피였다. 재료 이름 옆마다 작은 별표가 있었고, 별표 하나마다 "정말로"라는 글자가 붙어 있었다.'),
  N('읽는 데 오래 걸리지 않았다. 따라 할 수 있는지는 별개였다. 나는 카드를 제자리에 꽂아 두고 별표만 노트에 옮겼다.'),
  fx('stat.int+2'), END,
])
ev({ id: 'rev_pot_cold', type: 'flavor', places: ['potions'], acts: ['study'] }, [
  A('potions'), show(null),
  N('지하 교실의 책상은 팔꿈치를 올려놓을 때마다 한 번씩 차가웠다. 교재의 같은 문단을 읽으며 나는 손을 로브 소매 안에 번갈아 넣었다.'),
  END,
])

/* ====================== 기숙사 휴게실 ====================== */
ev({ id: 'rev_com_fire', type: 'flavor', places: ['common'], acts: ['chess', 'talk'] }, [
  A('common'), show(null),
  N('벽난로 장작이 한 번 크게 튀었다. 소파 한쪽에서 졸던 1학년이 놀라 일어나 앉았다가 아무 일도 없었다는 듯 다시 누웠다.'),
  END,
])
ev({ id: 'rev_com_chess', type: 'fortunate', places: ['common'], acts: ['chess'] }, [
  A('common'), show(null),
  N('체스 말들이 오늘따라 훈수가 심했다. "비숍을 옮겨!" "아냐, 폰이 먼저야!" 말들끼리 싸우는 사이에 나는 상대의 수가 어디서 나오는지 알아챘다.'),
  N('이긴 건 아니었다. 다만 어디서 졌는지 알게 된 판이었다.'),
  fx('stat.insight+1'), END,
])
ev({ id: 'rev_com_owl', type: 'flavor', places: ['common'] }, [
  A('common'), show(null),
  N('창틀에 올빼미 한 마리가 앉아 있었다. 내 것은 아니었다. 올빼미는 나를 한참 보다가 주인을 찾지 못한 얼굴로 다시 날아갔다.'),
  END,
])
ev({ id: 'rev_com_ink', type: 'mishap', places: ['common'], acts: ['study'] }, [
  A('common'), show(null),
  N('잉크병을 옮기다가 팔꿈치를 대고 말았다. 양피지 한 장이 순식간에 검은 호수가 되었다. 건져 올린 글자는 하나도 없었다.'),
  N('쓴 부분을 다시 베끼는 시간은 처음 쓸 때보다 짧았지만 훨씬 지루했다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_com_firstyear', type: 'choice', places: ['common'], acts: ['study', 'talk'] }, [
  A('common'), show(null),
  N('1학년 하나가 두루마리를 끌어안고 내 앞에 서서 한참 눈치를 보다가 입을 열었다.'),
  S('1학년', '저, 변신술 숙제인데요… 성냥을 바늘로 바꾸는 게 자꾸 반만 돼요.'),
  { t: 'choice', id: 'R-03', prompt: '반만 바늘이 된 성냥을 든 1학년. 나는…', options: [
    opt('A', '옆에 앉아 같이 해 본다.', { goto: 'rev_com_firstyear_a' }),
    opt('B', '내일 도와주겠다고 하고 하던 일을 계속한다.', { goto: 'rev_com_firstyear_b' }),
  ] },
], {
  rev_com_firstyear_a: [
    A('common'), show(null),
    N('성냥 끝부터 보라고 했다. 주문이 반만 되는 건 마지막까지 바늘을 그리지 않아서였다. 세 번째에 성냥이 끝까지 반짝이며 바늘이 되자 아이가 소리를 지르며 소파에서 뛰어올랐다.'),
    N('나는 내 숙제를 펴 놓은 채 반 시간쯤 잃었다. 그만큼 웃었다.'),
    fx('stat.social+1', 'time+1'), END,
  ],
  rev_com_firstyear_b: [
    A('common'), show(null),
    N('아이는 고개를 끄덕이고 돌아갔다. 소파 끝에서 성냥을 쥔 채 혼자 주문을 외우는 소리가 한참 들렸다. 내일까지 기억해야 할 일이 하나 늘었다.'),
    END,
  ],
})
ev({ id: 'rev_com_painting', type: 'rare', places: ['common'] }, [
  A('common'), show(null),
  N('초상화 구멍이 아무 이유 없이 한 번 열렸다 닫혔다. 아무도 들어오지 않았다. 뚱뚱한 부인이 헛기침을 하더니 입을 열었다.'),
  S('뚱뚱한 부인', '암호가 바뀌는 것보다 쓸쓸한 건 암호를 말하지 않고 지나가는 발소리야. …농담이야.'),
  END,
])

/* ====================== 4층 빈 교실 ====================== */
ev({ id: 'rev_c4_dust', type: 'flavor', places: ['classroom4'] }, [
  A('library'), show(null),
  N('먼지가 창으로 드는 빛줄기 속에서 느리게 돌았다. 책상 위 먼지에는 누군가의 손바닥 자국이 오래된 채 남아 있었다. 내 것은 아니었다.'),
  END,
])
ev({ id: 'rev_c4_recoil', type: 'mishap', places: ['classroom4'], acts: ['train', 'train_long', 'train_marathon'] }, [
  A('library'), show(null),
  N('힘을 줄이려다 반대로 주문이 과하게 나갔다. 책상 하나가 날아올라 칠판에 부딪혔고, 칠판이 그 보답으로 내 쪽으로 분필 가루를 한 아름 쏟아냈다.'),
  N('나는 하얗게 앉은 채 책상을 제자리로 옮기고, 흩어진 분필 조각을 줍고, 칠판을 지웠다. 수련보다 뒷정리가 길었다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_c4_click', type: 'fortunate', places: ['classroom4'], acts: ['train', 'train_long', 'train_marathon'] }, [
  A('library'), show(null),
  N('같은 동작을 백 번쯤 되풀이하고 있었는데, 어느 순간 손목이 주문의 박자를 알아챘다. 생각하지 않고도 지팡이가 나갔다. 처음 느끼는 가벼움이었다.'),
  N('두 번째에는 사라졌다. 그래도 한 번 알면 다시 찾을 수 있다.'),
  fx('stat.magic+1'), END,
])
ev({ id: 'rev_c4_footsteps', type: 'choice', places: ['classroom4'], acts: ['train', 'train_long'] }, [
  A('library'), show(null),
  N('복도에서 발소리가 들렸다. 느리고 일정했고, 가끔 멈췄다가 다시 이어졌다. 필치의 걸음 같기도 했고 아닌 것 같기도 했다.'),
  { t: 'choice', id: 'R-04', prompt: '문 앞에서 발소리가 멈췄다. 나는…', options: [
    opt('A', '지팡이를 내리고 책상 뒤에 숨는다.', { goto: 'rev_c4_footsteps_a' }),
    opt('B', '숨죽인 채 계속한다.', { goto: 'rev_c4_footsteps_b' }),
  ] },
], {
  rev_c4_footsteps_a: [
    A('library'), show(null),
    N('숨은 지 한참 만에 발소리가 멀어졌다. 먼지 낀 책상 뒤에서 콧물이 나올 것 같은 걸 참느라 정신이 없었다. 나올 때는 반쯤 지쳐 있었다.'),
    fx('time+1'), END,
  ],
  rev_c4_footsteps_b: [
    A('library'), show(null),
    iff('roll(35)', 'rev_c4_footsteps_b_bad', 'rev_c4_footsteps_b_good'),
  ],
  rev_c4_footsteps_b_good: [
    A('library'), show(null),
    N('발소리는 문 앞에서 한 번 멈췄다가 지나갔다. 나는 한참 뒤에야 숨을 내쉬었다. 이상하게도 그 긴장 뒤에는 주문이 한 번 더 또렷했다.'),
    fx('stat.magic+1'), END,
  ],
  rev_c4_footsteps_b_bad: [
    A('library'), show(null),
    S('필치', '여기서 뭐 하는 거냐!'),
    N('필치의 고양이가 먼저 문틈으로 들어왔다. 변명을 대고, 복도 끝까지 끌려가 훈계를 듣고, 돌아오는 데에 반 시간이 사라졌다. 징계 기록은 다행히 남지 않았다.'),
    fx('stat.will-1', 'time+1'), END,
  ],
})
ev({ id: 'rev_c4_chalk', type: 'rare', places: ['classroom4'] }, [
  A('library'), show(null),
  N('칠판 구석에 흐릿한 분필 낙서가 남아 있었다. 막대 인간 둘이 지팡이를 마주 들고 서 있었고, 아래에 누군가 "5점 감점!"이라고 썼다가 지워 놓았다.'),
  N('오래전 누군가의 결투 연습이었을 것이다. 나는 낙서 아래에 한 줄을 보탰다가 바로 지웠다.'),
  fx('stat.will+1'), END,
])

/* ====================== 안뜰 ====================== */
ev({ id: 'rev_yard_fountain', type: 'flavor', places: ['courtyard'] }, [
  A('courtyard'), show(null),
  N('분수는 오늘 한 가지 소리만 냈다. 물이 떨어지는 소리가 아니라, 물이 떨어지기 직전의 소리였다. 그걸 듣는 데 한참이 걸렸다.'),
  END,
])
ev({ id: 'rev_yard_gust', type: 'mishap', places: ['courtyard'], acts: ['walk', 'talk', 'train'] }, [
  A('courtyard'), show(null),
  N('회랑 모퉁이를 돌자 바람이 한꺼번에 몰려와 내 두루마리를 낚아챘다. 펼쳐진 양피지가 분수 위를 한 바퀴 돌더니 지붕 위로 올라갔다.'),
  N('불러 내리는 주문을 일곱 번 시도했고, 여섯 번째까지는 양피지가 장난으로 내려오다 말았다. 일곱 번째에 비로소 내 손에 내려앉았을 때 해는 한 뼘 기울어 있었다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_yard_snow', type: 'fortunate', places: ['courtyard'], chapters: [6, 8] }, [
  A('courtyard'), show(null),
  N('눈이 막 그친 안뜰에는 발자국이 하나도 없었다. 나는 가운데로 걸어 들어가 한 번 크게 숨을 쉬었다. 하얀 입김이 흩어지는 걸 보면서, 오래 하지 않았던 일을 했다. 아무 생각도 하지 않는 일.'),
  fx('stat.will+1'), END,
])
ev({ id: 'rev_yard_pigeon', type: 'flavor', places: ['courtyard'], acts: ['walk'] }, [
  A('courtyard'), show(null),
  N('비둘기 한 마리가 내 신발 앞까지 와서 빵 부스러기가 없는 걸 확인하고 실망한 듯 돌아섰다. 나는 변명을 하려다 비둘기에게 변명하는 건 좀 이상하다는 걸 깨달았다.'),
  END,
])
ev({ id: 'rev_yard_hogsmeade_list', type: 'flavor', places: ['courtyard'], acts: ['talk'], chapters: [1, 4] }, [
  A('courtyard'), show(null),
  N('지나가던 두 학생이 호그스미드에서 사야 할 것을 목록으로 말하고 있었다. 버터맥주, 깃펜, 버터맥주, 양말, 버터맥주. 목록의 반은 같은 단어였다.'),
  END,
])

/* ====================== 퀴디치 경기장 ====================== */
ev({ id: 'rev_pitch_wind', type: 'flavor', places: ['pitch'] }, [
  A('pitch'), show(null),
  N('경기장 위의 바람은 방향을 세 번 바꾸고 나서야 정해졌다. 스탠드 깃발이 한 번 크게 펄럭이더니 마음을 가라앉혔다.'),
  END,
])
ev({ id: 'rev_pitch_stray', type: 'mishap', places: ['pitch'], acts: ['broom_flight', 'quidditch', 'quidditch_camp'] }, [
  A('pitch'), show(null),
  N('급강하를 끝내고 올라오다 빗자루가 갑자기 속도를 잃었다. 나는 허공에서 한 박자 멈췄다가 걸어서 땅까지 내려오는 쪽을 택했다. 빗자루는 혼자 호수 쪽으로 떠내려갔다.'),
  N('불러 보고, 달래 보고, 결국 뛰어서 쫓아갔다. 빗자루를 되찾고 돌아오는 길은 날아갈 때보다 훨씬 길었다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_pitch_loop', type: 'fortunate', places: ['pitch'], acts: ['broom_flight', 'quidditch'] }, [
  A('pitch'), show(null),
  N('급선회를 하다가 기울기가 딱 맞는 순간이 왔다. 바람이 몸 아래로 한꺼번에 몰려 올라오는 걸 느꼈고, 나는 그 위에 앉아 있었다.'),
  N('착지한 뒤에도 다리가 한동안 떨렸다. 좋은 쪽으로.'),
  fx('stat.str+1'), END,
])
ev({ id: 'rev_pitch_again', type: 'choice', places: ['pitch'], acts: ['quidditch', 'quidditch_camp'] }, [
  A('pitch'), show(null),
  N('마지막 급강하를 끝내고 내려서자 어깨가 후들거렸다. 해는 아직 남아 있었고, 빗자루는 한 번 더 날고 싶어 하는 것처럼 손끝에서 움직였다.'),
  { t: 'choice', id: 'R-05', prompt: '해가 남았다. 나는…', options: [
    opt('A', '한 번만 더 간다.', { goto: 'rev_pitch_again_a' }),
    opt('B', '여기서 마무리하고 어깨를 푼다.', { goto: 'rev_pitch_again_b' }),
  ] },
], {
  rev_pitch_again_a: [
    A('pitch'), show(null),
    N('한 번이 두 번이 되었고, 두 번째에서 악력이 풀려 빗자루가 흔들렸다. 겨우 균형을 되찾고 내려왔을 때 손바닥이 쓰렸다. 그래도 마지막 한 번은 정확했다.'),
    fx('stat.str+1', 'time+1'), END,
  ],
  rev_pitch_again_b: [
    A('pitch'), show(null),
    N('어깨를 돌리고 손목을 풀었다. 아쉬움이 한 박자 남았다가 가라앉았다. 내일의 내가 오늘의 마지막 한 번을 대신해 줄 거라고 믿기로 했다.'),
    fx('stat.will+1'), END,
  ],
})
ev({ id: 'rev_pitch_hooch', type: 'rare', places: ['pitch'], acts: ['broom_flight', 'quidditch', 'quidditch_camp', 'watch_practice'] }, [
  A('pitch'), show(null),
  S('후치', '포터! 거기 스트레이트로 날지 말고 한 번 꺾어 봐라. 바람 읽는 법부터 말해 주마.'),
  N('후치 교수는 바람의 방향을 손가락으로 세 번 짚어 주고 사라졌다. 이상하게도 이후 한 시간 동안은 내가 바람에 맞는 게 아니라 바람이 나에게 맞는 느낌이었다.'),
  fx('stat.str+2'), END,
])

/* ====================== 호수 ====================== */
ev({ id: 'rev_lake_squid', type: 'flavor', places: ['lake'] }, [
  A('lake'), show(null),
  N('멀리 수면이 한 번 크게 부풀었다가 가라앉았다. 거대 오징어의 다리인지 바람인지 구분할 수 없었다. 나는 둘 다였다고 믿기로 했다.'),
  END,
])
ev({ id: 'rev_lake_fog', type: 'mishap', places: ['lake'], acts: ['observe'] }, [
  A('lake'), show(null),
  N('안개가 한꺼번에 올라왔다. 돌아서려 했을 때 성의 불빛이 어느 쪽인지 알 수 없었다. 나는 지팡이를 밝혀 호수 가장자리를 따라 한 바퀴 돌았다.'),
  N('돌아오는 길을 찾았을 때는 오후가 한 칸 사라져 있었다. 호수는 처음부터 말이 없었다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_lake_stone', type: 'fortunate', places: ['lake'], acts: ['observe'] }, [
  A('lake'), show(null),
  N('납작한 돌 하나가 발끝에 걸렸다. 던져 보니 다섯 번 튕기고 가라앉았다. 가라앉기 직전의 동그라미 다섯 개가 한꺼번에 펼쳐졌다.'),
  N('한 번 더 던졌다. 세 번 튕겼다. 처음이 더 좋았지만 그건 이제 지나간 일이다.'),
  fx('stat.will+1'), END,
])
ev({ id: 'rev_lake_glint', type: 'rare', places: ['lake'] }, [
  A('lake'), show(null),
  N('수면 아래에서 은빛이 한 번 스쳤다. 물고기보다 크고 오징어보다 빨랐다. 고개를 숙여 들여다보는 사이 은빛은 두 번째로 반짝였다. 마치 이쪽을 확인하는 것처럼.'),
  N('나는 오래 서 있다가 아무것도 건드리지 않고 돌아섰다. 호수에는 가끔 이름 없는 것이 지나간다.'),
  fx('stat.insight+1'), END,
])

/* ====================== 온실 ====================== */
ev({ id: 'rev_gh_damp', type: 'flavor', places: ['greenhouse'] }, [
  A('greenhouse'), show(null),
  N('유리 벽 안쪽은 습기가 짙어서 문을 닫는 순간 로브가 한 겹 무거워졌다. 화분마다 팻말이 꽂혀 있었고 글씨는 전부 같은 손으로 비뚤었다.'),
  END,
])
ev({ id: 'rev_gh_bite', type: 'mishap', places: ['greenhouse'], acts: ['herb'] }, [
  A('greenhouse'), show(null),
  N('이름표에는 "만지지 말 것"이라고 쓰여 있었는데, 나는 그것을 "만지기 전에 장갑을 낄 것"이라고 읽었다. 화분이 내 손가락을 정확히 한 번 물었다.'),
  N('약초 선반에서 붕대용 이끼를 찾아 손가락을 감싸고, 방금 물린 화분 앞에 사과 쪽지를 놓고, 천천히 작업을 이어 가는 데 한 시간대가 날아갔다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_gh_bloom', type: 'rare', places: ['greenhouse'], acts: ['herb'] }, [
  A('greenhouse'), show(null),
  N('가장 구석 화분에서 꽃봉오리가 한 번 부풀었다. 꽃잎이 한 겹씩 펼쳐지는 데 열 숨쯤 걸렸다. 열린 꽃에서는 달고도 서늘한 냄새가 났다.'),
  N('나는 그걸 만지지 않았다. 다음 날에는 이미 진 뒤였을 것이다. 한 번 본 것으로 충분했다.'),
  fx('stat.int+1', 'stat.insight+1'), END,
])
ev({ id: 'rev_gh_soil', type: 'fortunate', places: ['greenhouse'], acts: ['herb'] }, [
  A('greenhouse'), show(null),
  N('화분을 갈아 주다 보니 손이 알아서 흙의 습기를 가늠하고 있었다. 손가락 끝에서 흙이 부서지는 정도만 보고 물이 모자란지 넘치는지 알 것 같았다.'),
  fx('stat.will+1'), END,
])

/* ====================== 대연회장 ====================== */
ev({ id: 'rev_hall_sky', type: 'flavor', places: ['hall'] }, [
  A('hall'), show(null),
  N('천장의 하늘은 오늘 우중충했다. 구름 한 장이 천천히 샹들리에 쪽으로 흘러가는 동안 식탁 위 촛불들이 일제히 한쪽으로 기울었다.'),
  END,
])
ev({ id: 'rev_hall_snow', type: 'flavor', places: ['hall'], chapters: [6, 8] }, [
  A('hall'), show(null),
  N('천장에서 눈이 내리고 있었다. 식탁 위로 닿기 전에 사라지는 눈이었다. 접시 위의 수프 표면만 한 번 반짝였다.'),
  END,
])
ev({ id: 'rev_hall_juice', type: 'mishap', places: ['hall'], acts: ['meal', 'talk'] }, [
  A('hall'), show(null),
  N('호박 주스 주전자가 내 쪽으로 오다가 누군가의 팔꿈치에 걸려 기울었다. 주스가 식탁보 위로 얌전히 흘러 내 무릎에 정착했다.'),
  H('…방금 새 로브였는데.'),
  N('마른 천으로 두드리고, 마른 주문으로 말리고, 남은 얼룩을 보며 체념하는 데 반 시간이 사라졌다.'),
  fx('time+1'), END,
])
ev({ id: 'rev_hall_gossip', type: 'fortunate', places: ['hall'], acts: ['rumor', 'talk'] }, [
  A('hall'), show(null),
  N('식탁 건너편에서 두 목소리가 소곤거렸다. 다음 주 마법약 쪽지시험의 범위와 슬러그혼 교수가 좋아하는 질문 유형. 나는 귀가 아니라 접시를 듣고 있는 척했다.'),
  N('쓸 만한 정보는 반의 반쯤이었다. 반의 반이라도 있는 게 어디냐.'),
  fx('stat.insight+1'), END,
])
ev({ id: 'rev_hall_pass', type: 'choice', places: ['hall'], acts: ['meal', 'talk', 'rumor'] }, [
  A('hall'), show(null),
  N('식탁 끝에서 푸딩 접시가 우리 쪽으로 오고 있었다. 맨 끝의 후플푸프 학생이 손을 뻗었는데 한 뼘이 모자랐고, 접시는 내 앞에서 멈췄다.'),
  { t: 'choice', id: 'R-06', prompt: '푸딩 접시가 내 앞에서 멈췄다. 나는…', options: [
    opt('A', '접시를 건네준다.', { goto: 'rev_hall_pass_a' }),
    opt('B', '한 조각 덜어 먹고 건넨다.', { goto: 'rev_hall_pass_b' }),
  ] },
], {
  rev_hall_pass_a: [
    A('hall'), show(null),
    N('접시를 건네자 그 학생이 고개를 꾸벅했다. 고맙다는 말이 반쯤 입에 걸려 있었다. 나는 그 표정이 마음에 들었다.'),
    fx('stat.social+1'), END,
  ],
  rev_hall_pass_b: [
    A('hall'), show(null),
    N('한 조각을 덜어 입에 넣고 접시를 보냈다. 그 학생이 웃었다. 다음 접시는 내 쪽으로 먼저 왔다. 푸딩은 인간관계에서 의외로 정확하다.'),
    fx('stat.will+1'), END,
  ],
})
ev({ id: 'rev_hall_dumbledore', type: 'rare', places: ['hall'], acts: ['meal'] }, [
  A('hall'), show(null),
  N('교수석에서 덤블도어가 식사를 하다 말고 내 쪽을 한 번 보았다. 시선은 길지 않았다. 반달 안경 너머로 눈인사 비슷한 것이 오갔고, 그는 다시 접시로 돌아갔다.'),
  N('아무 일도 없었다. 그런데 이상하게 한 입이 더 맛있었다.'),
  fx('stat.will+1'), END,
])

export const RANDOM_EVENTS: RandomEvent[] = EVENTS
/** 이벤트 장면 모음(scenario.ts가 SCENARIO에 합친다) */
export const EVENT_SCENARIO: Scenario = SCENES
