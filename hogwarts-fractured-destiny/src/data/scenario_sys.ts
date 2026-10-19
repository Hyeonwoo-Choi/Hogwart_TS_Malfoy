import type { Node, Scenario, ChoiceOption } from '../engine/types'

/**
 * PHASE 2 시스템 검증용 픽스처(축약판). 본편에서는 도달하지 않으며 엔진 회귀 테스트가 사용한다.
 * 엔진의 모든 기능(대사·선택·감정 분기·과거 선택 인용·시간제한·일과·지도 잠금)을 실제로 통과하도록 구성한 데이터이며,
 * 본편 챕터 1(60~90분)은 PHASE 3에서 이 구조를 확장해 작성한다.
 */
export const SYS_START = 'c1_train'

const N = (text: string, when?: string): Node => ({ t: 'line', text, when })
const S = (who: string, text: string, expr?: string, when?: string): Node => ({ t: 'line', who, text, expr, when })
const show = (char: string | null, expr?: string): Node => ({ t: 'show', char, expr })
const bg = (id: string): Node => ({ t: 'bg', id })
const go = (scene: string): Node => ({ t: 'goto', scene })
const fx = (...f: string[]): Node => ({ t: 'fx', fx: f })
const opt = (key: string, text: string, o: Partial<ChoiceOption> = {}): ChoiceOption => ({ key, text, ...o })
const D = '드레이코'

export const SYS_SCENARIO: Scenario = {
  /* ---------- 열차 (K-01) ---------- */
  c1_train: [
    bg('train'), { t: 'date', date: '09-01', weekday: '일' },
    N('9월 1일. 호그와트 급행열차는 평소처럼 늦게 출발했고, 평소와 달리 조용했다.'),
    N('복도 곳곳에서 아이들이 같은 이야기를 낮은 목소리로 주고받는다. 올여름 신문에 실린 이름들, 돌아오지 않은 부모들에 대한 이야기.'),
    N('해리는 감독생 칸에 간 론과 헤르미온느를 찾아 복도를 걷다가, 반쯤 열린 객실 문 앞에서 멈췄다.'),
    show('draco', 'calm'),
    N('드레이코 말포이. 검은 로브의 소매를 손목까지 정확히 내려 입은 채, 창가에 등을 곧게 펴고 앉아 있다. 맞은편에는 판시 파킨슨과 크레이브.'),
    S('판시', '또 안 먹었네, 드레이코. 마차 타기 전에 뭐라도 먹어.'),
    S(D, '배고프지 않아. …크레이브, 문 좀 닫아.'),
    { t: 'choice', id: 'K-01', prompt: '반쯤 열린 문틈 너머로 낮은 대화가 이어진다. 해리는…', options: [
      opt('A', '투명 망토를 쓰고 문틈 가까이 선다.', { fx: ['kn:KN_OVERHEARD', 'kn:KN_TENSE'], goto: 'c1_train_A' }),
      opt('B', '문을 열고 말을 건다.', { goto: 'c1_train_B' }),
      opt('C', '신경 쓰지 않고 지나친다.', { goto: 'c1_train_C' }),
    ] },
  ],
  c1_train_A: [
    N('망토 아래로 숨을 죽인다. 낮은 목소리가 문틈으로 새어 나온다.'),
    S(D, '…일정을 앞당겨야 해. 더는 미룰 수 없어.'),
    S('판시', '무슨 일정? 아버님 일이야?'),
    S(D, '네가 알 필요 없어.', 'blank'),
    N('해리는 처음으로, 드레이코의 목소리에서 비꼼이 빠진 것을 들었다.'),
    { t: 'if', cond: 'stat.insight<50 && roll(40)', then: 'c1_train_A_caught', else: 'c1_train_A_clear' },
  ],
  c1_train_A_caught: [
    N('어깨에 걸친 가방이 문틀에 부딪혀 달그락 소리를 냈다.'),
    S(D, '…누구지?', 'angry'),
    fx('flag:FLAG_CAUGHT_EAVESDROP', 'draco.wariness+6'),
    N('해리는 망토를 움켜쥐고 복도를 서둘러 빠져나갔다.'),
    go('c1_hall'),
  ],
  c1_train_A_clear: [N('해리는 소리 없이 물러났다. 객실 문은 끝내 닫히지 않았다.'), go('c1_hall')],
  c1_train_B: [
    N('문이 열리자 대화가 뚝 끊겼다.'),
    S('해리', '문 정도는 닫고 얘기하지 그래, 말포이.'),
    S(D, '포터. 남의 객실을 기웃거리는 게 여전한 취미군.', 'smirk'),
    S('판시', '나가, 포터.'),
    S('해리', '나가려던 참이야. 뭔가 들은 것 같아서.'),
    S(D, '착각이겠지. 늘 그랬듯이.'),
    fx('draco.respect+2', 'draco.wariness+3'),
    { t: 'if', cond: 'stat.insight>=40', then: 'c1_train_B_notice', else: 'c1_hall' },
  ],
  c1_train_B_notice: [
    N('그녀는 웃고 있었지만, 소매를 쥔 손가락 끝이 하얗게 질려 있었다.'),
    fx('kn:KN_TENSE'),
    go('c1_hall'),
  ],
  c1_train_C: [N('해리는 문 앞을 지나쳤다. 등 뒤에서 문이 닫히는 소리가 났다.'), fx('log:K-01-C'), go('c1_hall')],

  /* ---------- 대연회장 (일상·유머) ---------- */
  c1_hall: [
    bg('hall'), show('ron', 'calm'),
    N('개학 연회. 촛불 아래 접시들이 차례로 채워진다.'),
    S('론', '해리, 저 닭다리 좀 줘. 아니, 그쪽 말고. 그 큰 거.'),
    S('해리', '방금 두 개 먹었잖아.'),
    S('론', '기차에서 마차까지 걷는 게 얼마나 체력이 드는 일인지 알아? 퀴디치 선발이 곧이라고.'),
    show('hermione', 'calm'),
    S('헤르미온느', '선발은 다음 주 토요일이야, 론. 그리고 닭다리가 체력을 보충해 준다는 근거는 어디에도 없어.'),
    S('론', '근거는 내 배 속에 있어.'),
    N('슬리데린 식탁 쪽에서 포크 소리가 났다. 해리의 시선이 그쪽으로 한 번 갔다가 돌아왔다.'),
    S('헤르미온느', '또 저쪽 보고 있네. 오늘만 세 번째야.'),
    S('해리', '…세고 있었어?'),
    S('헤르미온느', '네가 세지 않으니까 내가 센 거야.'),
    go('c1_potions'),
  ],

  /* ---------- 마법약 (K-02) ---------- */
  c1_potions: [
    bg('potions'), { t: 'date', date: '09-02', weekday: '월' }, show('slughorn', 'calm'),
    S('슬러그혼', '자, 자! N.E.W.T. 마법약은 아무나 들어오는 수업이 아니지. 오늘은 짝 없이 각자 해 보도록. 가장 맑은 용액에는 결정화 생강 한 상자가 걸려 있다네!'),
    show('draco', 'calm'),
    S(D, '영웅님은 이번엔 누가 대신 만들어 주려나. 늘 누군가 있었잖아, 안 그래?'),
    { t: 'choice', id: 'K-02', prompt: '솥에서 김이 오른다. 드레이코의 도발에 해리는…', options: [
      opt('A', '"네가 해준다면 사양 안 할게, 말포이."', { fx: ['draco.attraction+1', 'draco.affinity+1'], expr: 'interest', goto: 'c1_potions_A' }),
      opt('B', '"\'늘 누군가\'라는 건 증명하기 어려운 가설이야. 결과물로 비교하지 그래?"', { if: 'stat.int>=45', fx: ['draco.respect+4'], expr: 'smirk', goto: 'c1_potions_B' }),
      opt('C', '대꾸하지 않고 저울을 맞춘다.', { fx: ['draco.affinity-1'], goto: 'c1_potions_C' }),
      opt('D', '"불을 줄여. 그대로면 가라앉아."', { fx: ['flag:FLAG_OFFERED_POTION_HELP', 'draco.wariness+4'], expr: 'angry', goto: 'c1_potions_D' }),
    ] },
  ],
  c1_potions_A: [
    S(D, '…꿈도 크군.'),
    N('대꾸는 차가웠지만, 그녀의 시선이 한 박자 늦게 솥으로 돌아갔다.'),
    go('c1_potions_end'),
  ],
  c1_potions_B: [
    S(D, '말은 늘었군. 결과가 따라오면 좋겠는데.'),
    go('c1_potions_end'),
  ],
  c1_potions_C: [S(D, '…재미없군.'), go('c1_potions_end')],
  c1_potions_D: [
    S(D, '내 솥에 신경 꺼, 포터. 도움이 필요하다고 말한 적 없어.'),
    N('그러면서도 그녀의 손은 이미 불 쪽으로 가 있었다. 해리는 못 본 척했다.'),
    go('c1_potions_end'),
  ],
  c1_potions_end: [
    show('slughorn', 'calm'),
    S('슬러그혼', '말포이 양의 용액이 가장 맑군! 역시 말포이 가문의 솜씨라고 해야겠지!'),
    show('draco', 'blank'),
    S(D, '…가문이 아니라 제 솜씨입니다, 교수님.'),
    N('교실이 잠시 조용해졌다. 슬러그혼은 헛기침을 하고 상자를 건넸다.'),
    go('c1_routine'),
  ],

  /* ---------- 자유 일과 ---------- */
  c1_routine: [
    bg('common'), show(null), { t: 'date', date: '09-04', weekday: '수' },
    N('수업이 끝나면 하루는 해리의 것이다. 오늘은 어디로 갈까.'),
    { t: 'routine', days: [{ date: '09-04', weekday: '수' }, { date: '09-05', weekday: '목' }], night: false, then: 'c1_night',
      locations: ['hall', 'library', 'potions', 'pitch', 'courtyard', 'lake', 'common'],
      encounters: { courtyard: ['enc_courtyard_1'], hall: ['enc_hall_1', 'enc_hall_2'], library: ['enc_library_1'], pitch: ['enc_pitch_1'] } },
  ],
  enc_courtyard_1: [
    bg('courtyard'), show('draco', 'calm'),
    N('안뜰 구석 벤치에서 드레이코가 두꺼운 책을 읽고 있다.'),
    S('해리', '여기서 뭐 해? 도서관이 휴관이라도 했나?'),
    S(D, '남의 동선까지 관리하다니, 한가하군, 포터.'),
    N('그녀는 책장에서 눈을 떼지 않았다. 몇 걸음 뒤에야 해리는 책장이 한 장도 넘어가지 않았다는 걸 알아챘다.'),
    { t: 'end' },
  ],
  enc_hall_1: [
    bg('hall'), show('pansy', 'calm'),
    N('저녁 식사. 슬리데린 식탁 끝에서 누군가 일어났다. 접시는 거의 그대로다.'),
    S('판시', '또 가? 오늘은 디저트라도 먹고 가.'),
    show('draco', 'calm'),
    S(D, '숙제야.'),
    show('hermione', 'calm'),
    S('헤르미온느', '숙제를 저렇게 열심히 하는 사람은 아니었는데.'),
    { t: 'end' },
  ],
  enc_hall_2: [
    bg('hall'), show('ron', 'calm'),
    S('론', '해리, 푸딩이 다 떨어지기 전에 말해 둘게. 내가 키퍼가 못 되면 그건 푸딩 탓이야.'),
    show('draco', 'calm'),
    S(D, '위즐리, 접시에 코를 박는 건 그리핀도르의 공통 취미인가?'),
    show('ron', 'calm'),
    S('론', '적어도 우린 접시를 비워! 넌 마치 접시 심사위원 같아!'),
    N('드레이코는 대꾸 없이 돌아섰다. 해리는 웃음을 삼키다 식탁 모서리에 정강이를 부딪혔다.'),
    { t: 'end' },
  ],
  enc_library_1: [
    bg('library'), show('draco', 'calm'),
    N('서가 사이에서 드레이코의 책이 바닥에 떨어졌다. 해리가 집어 건넸다.'),
    S('해리', '떨어뜨렸어.'),
    S(D, '…', 'smirk'),
    N('그녀는 비웃듯 입꼬리를 올렸지만, 책을 받아 든 손을 거두는 속도는 평소보다 느렸다.'),
    fx('draco.respect+1'),
    { t: 'end' },
  ],
  enc_pitch_1: [
    bg('pitch'), show('draco', 'calm'),
    N('혼자 스니치를 쫓던 드레이코가 땅에 내려섰다. 숨이 가쁜데도 자세는 흐트러지지 않았다.'),
    S('해리', '선발 전에 맞붙을 텐데, 힌트 하나 줄까?'),
    S(D, '구경값부터 내지그래, 포터. 그리고 나한테 힌트가 필요할 것 같아?'),
    fx('draco.respect+1', 'draco.wariness-1'),
    { t: 'end' },
  ],

  /* ---------- 야간 (K-04) ---------- */
  c1_night: [
    bg('corridor7_night'), show(null), { t: 'date', date: '09-07', weekday: '토' },
    N('토요일 밤. 악몽에 잠을 설친 해리는 슬그머니 기숙사를 빠져나왔다. 통금이 한참 지난 시간이었다.'),
    N('7층 복도 끝, 벽 앞에서 누군가의 그림자가 멈췄다.'),
    show('draco', 'blank'),
    S(D, '…포터.'),
    { t: 'choice', id: 'K-04', prompt: '통금이 지난 7층 복도. 서로 마주친 상황에서 해리는…', options: [
      opt('A', '"맥고나걸 교수님께 가자. 통금이야."', { fx: ['flag:FLAG_REPORTED_NIGHT', 'draco.trust-4', 'draco.wariness+5'], expr: 'angry', goto: 'c1_night_A' }),
      opt('B', '"나도 여기 없었던 걸로 하자. 너도 못 봤고."', { fx: ['flag:FLAG_MUTUAL_SECRET', 'draco.wariness+3', 'draco.dependence+2'], goto: 'c1_night_B' }),
      opt('C', '"이 시간에 여기서 뭘 하는 거지?"', { fx: ['flag:FLAG_CONFRONTED_NIGHT'], expr: 'smirk', goto: 'c1_night_C' }),
      opt('D', '말없이 그림자 뒤로 물러서 지켜본다.', { fx: ['flag:FLAG_FOLLOWED_NIGHT'], goto: 'c1_night_D' }),
    ] },
  ],
  c1_night_A: [S(D, '그럴 줄 알았어. 영웅은 규칙을 좋아하니까.'), go('c1_night_end')],
  c1_night_B: [S(D, '…흥정은 못 하는 줄 알았는데.'), S(D, '빚이라고 생각하진 마.'), go('c1_night_end')],
  c1_night_C: [S(D, '질문할 자격이 있다고 생각해? 너도 여기 있잖아, 포터.'), go('c1_night_end')],
  c1_night_D: [
    N('그녀는 벽 앞을 세 번 오갔다. 해리의 눈에는 아무 일도 일어나지 않았다.'),
    N('이윽고 그녀는 무언가를 느낀 듯 급히 자리를 떴다. 그녀가 서 있던 자리에 마른 톱밥 부스러기가 남아 있었다.'),
    go('c1_night_end'),
  ],
  c1_night_end: [
    S(D, '…기억해 두지, 포터.', 'angry', 'FLAG_REPORTED_NIGHT'),
    S(D, '다음에도 입을 다물어 줄 거라 기대하진 마.', undefined, 'FLAG_MUTUAL_SECRET'),
    S(D, '궁금하면 직접 알아내 보든가. 못 할 테니까.', undefined, 'FLAG_CONFRONTED_NIGHT'),
    N('복도에 다시 정적이 내려앉았다. 해리는 오래도록 그 벽을 바라보았다.'),
    go('c1_followup'),
  ],

  /* ---------- 과거 선택 인용 (DE-02/03/04/05) ---------- */
  c1_followup: [
    bg('hall'), show(null), { t: 'date', date: '09-08', weekday: '일' },
    N('아침 식사 자리에 소문이 먼저 도착해 있었다.'),
    N('스네이프 교수가 아침부터 슬리데린 학생 하나를 불러 세웠다고 한다. 그리고 해리의 가방에서는 개구리 초콜릿이 한가득 쏟아졌다.', 'FLAG_REPORTED_NIGHT'),
    S(D, '빚은 한 번 갚았다, 포터. 그걸로 끝이야.', 'blank', 'FLAG_MUTUAL_SECRET'),
    N('"해리가 밤마다 복도를 순찰한다"는 이야기가 슬리데린 식탁에서 돌고 있다. 출처는 짐작이 갔다.', 'FLAG_CONFRONTED_NIGHT'),
    N('7층 벽 앞의 톱밥은 이튿날 아침에 이미 치워져 있었다. 누군가 서둘렀다는 뜻이다.', 'FLAG_FOLLOWED_NIGHT'),
    N('아무 일도 없었다는 듯, 식탁 위 촛불만 평소처럼 흔들렸다.', '!FLAG_REPORTED_NIGHT && !FLAG_MUTUAL_SECRET && !FLAG_CONFRONTED_NIGHT && !FLAG_FOLLOWED_NIGHT'),
    go('sys_eh_demo'),
  ],

  /* ---------- [시스템 검증] 감정 훅 샘플 (EH-01 축약) ---------- */
  sys_eh_demo: [
    bg('library'), show('draco', 'calm'),
    N('[시스템 검증] 감정 훅 샘플. 같은 장면이 신뢰 수치에 따라 달라진다.'),
    N('드레이코가 편지를 접고 있다. 해리와 눈이 마주쳤다.'),
    { t: 'if', cond: 'draco.trust>=25', then: 'eh_high', else: 'eh_low' },
  ],
  eh_low: [
    S(D, '뭘 봐? 남의 편지를 훔쳐보는 건 그리핀도르의 특기인가?', 'angry'),
    fx('draco.wariness+2'),
    go('sys_timed'),
  ],
  eh_high: [
    S(D, '…보지 마.', 'blank'),
    N('그녀는 편지를 로브 안쪽에 넣었다. 해리가 시선을 돌린 뒤에야 손가락이 풀렸다.'),
    go('sys_timed'),
  ],

  /* ---------- [시스템 검증] 시간제한 선택 ---------- */
  sys_timed: [
    bg('black'), show(null),
    N('[시스템 검증] 시간제한 선택. 시간이 지나면 "망설임" 결과가 적용된다.'),
    N('복도 끝에서 마법 불꽃이 연달아 터지며 천장의 촛대가 크게 흔들린다. 아래에 신입생들이 있다.'),
    { t: 'choice', id: 'K-T1', timed: { seconds: 8, timeoutKey: 'H' }, prompt: '촛대가 떨어지기 직전이다!', options: [
      opt('A', '신입생들을 밀어내 피하게 한다.', { fx: ['stat.str+1'], goto: 'sys_timed_A' }),
      opt('B', '교사를 부르러 달린다.', { goto: 'sys_timed_B' }),
      opt('H', '잠시 머뭇거린다.', { hesitate: true, fx: ['log:hesitated'], goto: 'sys_timed_H' }),
    ] },
  ],
  sys_timed_A: [N('해리가 아이들을 끌어당기는 순간 촛대가 바닥에 부딪혔다. 모두 무사했다.'), go('sys_end')],
  sys_timed_B: [N('해리가 달려간 사이 촛대가 떨어졌다. 다행히 근처 상급생이 방어 마법을 걸어 아이들은 긁힌 정도로 끝났다.'), go('sys_end')],
  sys_timed_H: [N('한 박자 늦었다. 아이들은 비명을 지르며 흩어졌고, 촛대는 아슬아슬하게 빗나갔다. 해리의 손바닥이 식은땀으로 축축했다.'), go('sys_end')],
  sys_end: [{ t: 'endChapter', title: '챕터 1 · 시스템 검증판 종료' }],
}
