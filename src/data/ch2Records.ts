import type { CaseDef, CaseItem, CaseKind } from './cases'
import type { JEntry } from './journal'

/**
 * 챕터 2의 사건 수첩(경로별 단서)과 인물 기록 항목. 모두 저장 상태(플래그·지식)에서 파생되며 숨겨진 수치는 조건에 쓰지 않는다.
 * 경로 고유 정보는 그 경로의 선택·행사를 거친 뒤에만 나타난다(다른 경로의 정보를 자동 공개하지 않는다).
 */
const I = (kind: CaseKind, when: string, text: string, from?: string, prio = 0): CaseItem => ({ kind, when, text, from, prio })
const E = (when: string, text: string, prio = 0): JEntry => ({ sec: 'observed', when, text, prio })
const any = (...c: string[]) => c.join(' || ')

export const CASE_DOOR: CaseDef = {
  id: 'seventh-door', title: '7층 서쪽 벽의 문',
  unlock: any('FLAG_P2_RESEARCH', 'FLAG_P2_PITCH', 'FLAG_P2_SECRET', 'FLAG_P2_SLY'),
  items: [
    // 어느 경로를 따라 이 사건을 쫓게 되었는가(선택한 메인 사건 경로)
    I('obs', 'FLAG_P2_RESEARCH', '이번 조사는 헤르미온느의 룬 사본에서 시작했다. 사본의 매듭은 문을 숨기는 게 아니라 막는 구조였다.'),
    I('obs', 'FLAG_P2_PITCH', '이번 조사는 경기장에서 시작했다. 지니의 급강하 중에 성 위쪽 창이 한 번 번쩍였고, 빗자루가 흔들렸다.'),
    I('obs', 'FLAG_P2_SECRET', '이번 조사는 루나가 찾아낸 5층 태피스트리 뒤의 좁은 나선 계단에서 시작했다.'),
    I('obs', 'FLAG_P2_SLY', '이번 조사는 판시의 부탁에서 시작했다. 말포이는 가문의 편지를 열지 않고 서랍에 넣어 두고 있다.'),
    // 직접 관찰
    I('obs', 'OB_WINDOW_WEST7', '지니가 떨어진 자리에서 올려다본 7층 서쪽 일곱 번째 줄의 둘째 창이 번쩍인 창과 같은 창이었다.'),
    I('obs', 'KN_FLASH_TIMING', '창의 번쩍임은 이십 분 간격이다. 지니와 함께 날며 세 번 확인했다.'),
    I('obs', 'OB_HIDDEN_STAIR', '5층 태피스트리 뒤에 좁은 나선 계단이 있다. 위쪽에서 비 온 뒤 같은 냄새가 났다.'),
    I('obs', 'OB_STAIR_INSIDE', '계단 안쪽 이마 높이에 손바닥만 한 매듭 문양이 새겨져 있었다. 안쪽은 칠십일 계단까지 올라가 보았다.'),
    I('testimony', 'KN_STAIR_WARM_LUNA', '문양이 있는 곳 뒤쪽이 따뜻하다고 했다. 사람이 있었던 온도인데 사람은 없다고.', '루나'),
    I('obs', 'OB_STAIR_HUM', '낮에도 세 번째 종이 울린 직후 서쪽 벽 쪽에서 열두 번 낮은 웅웅거림이 건너왔다.'),
    I('obs', 'FLAG_P2_BREACH', '제한 구역에서 『고대 차단 주문의 구조』의 한 쪽을 필사했다. 필치의 발소리가 세 번 서가를 지나갔다.'),
    I('obs', 'KN_KNOT_COLLIDE', '"서로 다른 두 주문이 같은 자리에 닿으면, 어느 쪽도 의도한 결과를 내지 못하고 서로를 비튼다. 되돌릴 방법은 기록되어 있지 않다."'),
    I('obs', 'KN_WEST_WING_SEALED', '맥고나걸 교수는 7층 서쪽 복도가 학기 초부터 폐쇄 구역이며 가까이 가지 말라고 했다.'),
    I('obs', 'KN_WALL_DOOR', '토요일 밤, 맨벽이어야 할 7층 서쪽 자리에 문이 있었다.'),
    // 들은 이야기(출처 표기)
    I('testimony', 'KN_FIELD_DISTURB', '최근 경기장 위 마법장이 가끔 흔들린다고 했다. 원인은 모른다고.', '후치'),
    I('testimony', 'KN_PAIR_HYPOTHESIS', '이런 구조의 문은 혼자 있지 않고 쌍으로 만들어졌을 수 있다는 가설. 증명은 안 됐고, 맞을까 봐 아무한테도 말하지 않았다고 했다.', '헤르미온느'),
    I('testimony', 'KN_GINNY_SAW_SHADOW', '새벽 연습 중 7층 창에서 사람 그림자가 오래 서 있는 걸 봤다. 말포이처럼 보였지만 확인은 못 했다고.', '지니'),
    I('testimony', 'KN_DOOR_DIRECTION', '웅웅거림은 문이 닫히는 쪽이 아니라 열리는 쪽에서 난다고 했다.', '루나'),
    I('testimony', 'KN_LETTER_DEADLINE', '가문의 편지에 이번 달 말이라는 마감이 있고, 그때까지 답이 없으면 사람을 보낼 거라고 했다.', '판시'),
    I('testimony', 'KN_PANSY_FOLLOWED', '말포이가 사라진 밤 계단 아래까지만 따라갔다가 위로 올라가는 소리를 듣고 돌아왔다고 했다.', '판시'),
    // 추측(확정이 아니다)
    I('inference', 'KN_KNOT_COLLIDE && OB_RUNE_WALL', '사본의 매듭과 책의 문장이 같은 이야기를 한다면, 7층 벽의 문은 두 가지 마법이 얽혀 생기는 것일지도 모른다.', undefined, 2),
    I('inference', 'KN_FLASH_TIMING && OB_WINDOW_WEST7', '이십 분 간격은 무엇을 반복하는 것일까. 사람이 하는 일인지, 기계가 하는 일인지 아직 모른다.', undefined, 1),
    I('inference', 'OB_STAIR_HUM && KN_DOOR_DIRECTION', '소리가 열리는 쪽에서 난다면 누군가 안쪽에서 열고 있다는 뜻일 수도 있다.', undefined, 2),
    I('inference', 'KN_LETTER_DEADLINE && KN_PANSY_FOLLOWED', '말포이는 마감 안에 무언가를 끝내려고 밤마다 올라가는 걸지도 모른다.', undefined, 2),
    // 풀리지 않은 의문
    I('question', 'FLAG_P2_RESEARCH', '문을 막는 매듭이라면, 무엇을 막으려는 것인가.'),
    I('question', 'FLAG_P2_PITCH', '그 창의 번쩍임은 왜 하필 지니가 급강하할 때 빗자루를 흔드는가.'),
    I('question', 'FLAG_P2_SECRET', '5층 태피스트리 뒤의 계단은 어디로 이어지는가.'),
    I('question', 'OB_STAIR_INSIDE', '매듭 문양 뒤쪽의 따뜻한 곳에는 누가 있었는가.'),
    I('question', 'FLAG_P2_SLY', '마감까지 말포이가 해야 하는 일은 무엇인가.'),
    // 확인된 결론: 직접 본 것만(토요일 밤 이후)
    I('resolution', 'KN_WALL_DOOR && (FLAG_P2_RESEARCH || FLAG_P2_PITCH || FLAG_P2_SECRET || FLAG_P2_SLY)', '7층 서쪽 벽에는 밤에 문이 나타난다. 직접 보았다. 그 문이 왜 생겼는지는 아직 모른다.'),
  ],
}

/** 인물 기록(observed): 해리가 겪은 장면만 근거로 한다. 호감도·신뢰 수치는 조건에 쓰지 않는다. */
export const JOURNAL_CH2: Record<string, JEntry[]> = {
  hermione: [
    E('FLAG_P2_RESEARCH_OK', '금요일 도서관에서 허가받은 책을 한 줄씩 소리 내어 같이 읽었다. 문장이 끝난 자리에서 그녀의 손가락이 내 손등에 닿아 있었고, 둘 다 같은 순간에 알았다.'),
    E('FLAG_P2_BREACH', '밤에 제한 구역에서 필사한 쪽을 보여 주었다. 읽는 내내 고개를 들지 않았다. 정확해서 화가 난다고 했다.'),
    E('FLAG_P2_REPORTED_MCG', '맥고나걸 교수에게 정식으로 연구를 보고하기로 했다. 그녀는 혼자 교수실에 들어가 서명 하나와 경고 하나를 가지고 나왔다.'),
    E('FLAG_P2_HER_CONFIDED', '문이 쌍으로 만들어졌을 수 있다는 가설을 나에게만 말했다. 틀릴까 봐서가 아니라 맞을까 봐서 말하지 않았다고.'),
    E('FLAG_HER_OPEN', '접힌 양피지에 가설 세 줄을 적어 건넸다. 손을 잡아도 되는지 묻자 "대상의 동의가 가장 중요하다"며 먼저 손가락을 올렸다.'),
    E('FLAG_HER_SLOW', '가설을 읽고 시간을 달라고 했다. 헤르미온느는 "시간은 중요한 변수"라며 숨을 내쉬었다.'),
    E('FLAG_HER_DECLINED_GENTLY', '지금은 연구와 경기에 집중하고 싶다고 했다. 그녀는 처음엔 어깨가 내려갔다가 곧 올라갔고, 정직하게 말해 줘서 고맙다고 했다.'),
    E('FLAG_HER_REPAIRED && !FLAG_P2_BREACH', '판시와 같이 앉아 있던 일을 해석 없이 사실대로 말했다. 가장 듣고 싶던 방식이라고 했다.'),
    E('FLAG_HER_REPAIRED && FLAG_P2_BREACH', '서고에 들어간 시간과 필사한 쪽의 출처를 숨기지 않고 말했다. 변명하지 않아서 더 화가 나고, 조금 덜 화가 난다고 했다.'),
    E('FLAG_HER_DISTANT && !FLAG_P2_BREACH', '도서관의 일을 "별일 아니었어"라고 넘겼다. 그녀는 해석 없이 "그럼 별일 아닌 거야"라고만 하고 나갔다.'),
    E('FLAG_HER_DISTANT && FLAG_P2_BREACH', '서고 일을 "다 끝난 일이야"라고 덮었다. 그녀는 끝났다고 정하는 건 내 몫이 아니라고, 그래도 그렇게 하고 싶다면 그렇게 하라고 했다.'),
  ],
  ginny: [
    E('FLAG_P2_PITCH_OK', '목요일 연습에서 나란히 날며 급강하 각도를 읽었다. 창이 이십 분 간격으로 번쩍이는 걸 같이 셌다.'),
    E('FLAG_P2_HOOCH_CHECK', '후치 선생님께 보고하자고 했다. 지니는 걱정은 진짜인데 방법이 사람을 작게 만든다고 했다.'),
    E('FLAG_P2_LEFT_TO_GINNY', '지니에게 판단을 맡기고 기다리겠다고 했다. 새끼손가락을 걸었다.'),
    E('FLAG_P2_GIN_CONFIDED', '새벽 연습 중 7층 창에서 사람 그림자를 봤다고 했다. 틀렸으면 좋겠다고 생각한 건 처음이라고.'),
    E('FLAG_GIN_OPEN', '골대 아래에서 나를 좋아하냐고 물었다. 응이라고 하자 먼저 한 걸음 물러났다가 웃었다. 키스는 경기 끝나고, 자기가 정하는 속도로.'),
    E('FLAG_GIN_SLOW', '경기 끝나고 대답하겠다고 했다. 지니는 도망이 아니라 정한 거라며 기다리겠다고 했다.'),
    E('FLAG_GIN_DECLINED_GENTLY', '지금은 그런 마음이 아니라고 했다. 지니는 솔직해서 다행이라고 했고, 마음이 바뀌어도 자기가 정한다고 했다.'),
    E('FLAG_GIN_REPAIRED', '그녀의 판단을 먼저 묻지 않은 걸 사과했다. 지니는 사과가 빨랐다며 웃었다.'),
    E('FLAG_GIN_DISTANT', '변명하자 지니는 지켜 주지 말고 지켜보라고 했다.'),
  ],
  luna: [
    E('FLAG_P2_SECRET_OK', '낮에 호숫가에서 성 서쪽 벽의 소리를 같이 셌다. 열두 번이었고 우리 숫자가 같았다.'),
    E('FLAG_P2_STAIR_MARKED', '5층 태피스트리 뒤의 계단 입구에 실 한 가닥을 묶고 돌아왔다. 루나는 표시는 다시 오겠다는 약속이라고 했다.'),
    E('FLAG_P2_STAIR_SEALED', '필치 씨에게 계단 위치를 알렸다. 루나는 자기가 보여 준 것을 대신 말한 일이라고 조용히 말했다.'),
    E('FLAG_P2_LUN_CONFIDED', '웅웅거림은 문이 열리는 쪽에서 난다고 했다. 닫히는 쪽은 소리가 없다고.'),
    E('FLAG_LUN_OPEN', '호숫가에서 키스해 봐도 되는지 물었다. 싫다는 말도 정보니까 싫으면 바로 멈추겠다고 했다. 아주 짧았고, 신발끈을 세 번 다시 묶었다.'),
    E('FLAG_LUN_SLOW', '같이 천천히 알아보자고 했다. 루나는 그게 가장 좋아하는 속도라고 했다.'),
    E('FLAG_LUN_DECLINED_GENTLY', '지금은 안 될 것 같다고 했다. 루나는 질문은 거절당해도 질문이라고 했고, 친구로 계속 있자고 했다.'),
    E('FLAG_LUN_REPAIRED', '그녀의 이야기를 대신 말한 걸 사과했다. 사과는 소리가 나서 좋은 소리라고 했다.'),
    E('FLAG_LUN_DISTANT', '그게 최선이었다고 했다. 루나는 진실이 서로 다른 건 이상한 게 아니지만 다음엔 같이 정하고 싶다고 했다.'),
  ],
  pansy: [
    E('FLAG_P2_PROMISE_KEPT', '말포이를 이번 주에 지켜보겠다고 약속했다. 판시는 지켜 달라고, 걔가 알면 자기는 슬리데린에서 앉을 자리가 없다고 했다.'),
    E('FLAG_P2_STAYED_OUT', '슬리데린 일에 끼어들 자격이 없다고 했다. 판시는 소매를 놓는 속도를 일부러 늦췄다.'),
    E('FLAG_P2_TALK_DRACO', '말포이에게 직접 말하자고 했다. 판시는 그건 안 된다고, 내 이름으로 하라고 했다.'),
    E('FLAG_P2_SLY_OK', '금요일 도서관에서 판시의 편지 이야기를 들었다. 마감은 이번 달 말이다.'),
    E('FLAG_P2_PAN_CONFIDED', '말포이가 사라진 밤에 한 번 따라가 봤다고 했다. 계단 아래까지만. 따라간 걸 알면 영영 안 볼 것 같아서 돌아왔다고.'),
    E('FLAG_PAN_OPEN', '복도에서 한 뼘 앞까지 다가와 도망갈 거냐고 물었다. 가도 되는지 묻자 "가끔은 묻는 것도 나쁘진 않네"라며 직접 허락했다. 소문 나면 끝이라며 말하지 말라고 했다.'),
    E('FLAG_PAN_SLOW', '원하는 게 뭐냐고 물었더니 귀가 붉어졌다. 이 정도면 합격이라고 했다.'),
    E('FLAG_PAN_DECLINED_GENTLY', '웃으며 한 걸음 물러서자 반 박자 늦게 웃었다. 다음엔 자기가 먼저 안 물러선다고 했다.'),
    E('FLAG_PAN_REPAIRED', '신경이 쓰였다고 해도 된다고 하자 판시는 할 말이 없어졌다고 했다. 나만 그런 건 아니라는 거냐고.'),
    E('FLAG_PAN_DISTANT', '아무하고도 경쟁하고 있지 않다고 했다. 판시는 공손하게 멀어졌다.'),
  ],
  draco: [
    E('FLAG_DRA_SOFT', '내기를 받으며 잠을 자러 가라고 했다. 말포이는 반박할 문장을 찾지 못했다. 어깨가 스쳤다.'),
    E('FLAG_DRA_REPAIRED', '허락 없이 그의 이름을 꺼낸 것을 인정했다. 앞으로 그의 이름이 나오는 대화는 그가 있는 곳에서 하라고 했다.'),
    E('FLAG_DRA_DISTANT', '도움을 청하지 않으면서 도움받는 걸 싫어한다고 말했다. 말포이는 해서는 안 되는 말이었다고 했다.'),
  ],
}
