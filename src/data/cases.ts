import { evalCond } from '../engine/cond'
import type { GameState } from '../engine/types'
import { CASE_DOOR } from './ch2Records'

/**
 * 사건 수첩: 해리가 "사건"으로 인지한 일을 단서별로 정리한다(인물 중심 관찰은 인물 기록이 맡는다).
 * - 모든 항목은 저장 상태(선택 이력·관찰·사건 표식)에서 파생된다. 별도 저장 없음 → 저장·불러오기 후에도 동일.
 * - 정보의 출처를 나눈다: 직접 본 것(obs) / 들은 이야기(testimony, 말한 사람 표기) / 내 추측(inference) / 풀리지 않은 의문(question) / 확인된 결론(resolution).
 * - 추측은 확정처럼 쓰지 않는다. 확인된 결론(resolution)은 조건이 참이 되기 전에는 항목 자체가 보이지 않고, 참이 되면 당시의 추측과 나란히 보여 준다.
 * - 사건은 첫 단서를 얻기 전에는 목록에 나타나지 않는다. 해리가 모르는 정보·미래 사건의 제목은 쓰지 않는다.
 * 현재 범위: 프롤로그~챕터 1에서 해리가 인지할 수 있는 사건(docs/V2_NOTEBOOK.md).
 */
export type CaseKind = 'obs' | 'testimony' | 'inference' | 'question' | 'resolution'
export interface CaseItem { kind: CaseKind; when: string; text: string; from?: string; prio?: number }
export interface CaseDef { id: string; title: string; unlock: string; items: CaseItem[] }

const any = (...c: string[]) => c.join(' || ')
const I = (kind: CaseKind, when: string, text: string, from?: string, prio = 0): CaseItem => ({ kind, when, text, from, prio })
const K02 = any('CH_K02_A', 'CH_K02_B', 'CH_K02_C', 'CH_K02_D')
const K03 = any('CH_K03_A', 'CH_K03_B', 'CH_K03_C', 'CH_K03_D')
const H01 = any('CH_H01_A', 'CH_H01_B', 'CH_H01_C')

export const CASES: CaseDef[] = [
  {
    id: 'draco-behavior', title: '말포이의 이상한 행동', unlock: 'OB_SLEEVE',
    items: [
      I('obs', 'OB_SLEEVE', '열차에서 말포이가 더운 날씨에도 외투를 벗지 않고, 왼쪽 소매를 손등까지 두 번 끌어내렸다.'),
      I('obs', H01, '개학 연회에서 말포이는 포크로 음식을 옮기기만 했다. 한 입도 먹지 않았다.'),
      I('obs', 'OB_TREMOR', '마법약 시간에 젓개를 든 손끝이 떨렸고, 그는 다른 손으로 손목을 눌러 지웠다.'),
      I('obs', 'FLAG_PUBLIC_RESCUE', '경기장에서 넘어진 직후, 일어나면서 소매부터 손등까지 끌어내렸다.'),
      I('obs', 'FLAG_PRIVATE_HELP', '추락한 뒤 사람들이 빠지자 혼자 벤치에 앉아 왼팔을 오른손으로 감싸고 있었다.'),
      I('testimony', K02, '마법약 시간에 손을 떨며 그렇게 맑은 약을 만든 걸 자기도 봤다고 했다. 결론은 내리지 말라고.', '헤르미온느'),
      I('testimony', K03, '말포이의 비행은 훈련 부족이 아니라 잠 부족 같다고 했다. 새벽에 경기장 가장자리에 그냥 앉아 있는 걸 본 적이 있다고.', '지니'),
      I('testimony', 'KN_LETTER_DRAWER', '말포이가 올여름부터 가문의 편지를 열지 않고 서랍에 넣는다고 했다. 매주 한 통씩. 아직 아무에게도 안 한 말이라고.', '판시'),
      I('testimony', H01, '말포이라는 이름이 올해는 방패보다 짐 같다고 했다. 다들 그가 뭘 해내는지 지켜본다고.', '판시'),
      I('inference', 'OB_SLEEVE && OB_TREMOR', '소매와 손끝. 몸 어딘가를 다치거나, 숨기고 싶은 게 있는 것 같다. 아직은 추측이다.', undefined, 1),
      I('inference', 'OB_SLEEVE && OB_TREMOR && (' + K03 + ' || ' + H01 + ')', '몸보다 마음이 먼저 지쳐 있는 걸지도 모른다. 잠을 못 자는 사람의 손이 떨리는 것처럼.', undefined, 2),
      I('question', 'OB_SLEEVE', '소매 아래에는 무엇이 있는가?'),
      I('question', 'KN_OVERHEARD', '그가 판시에게 ‘앞당겨야 한다’고 한 일정은 무엇인가?'),
      I('question', 'OB_TREMOR && ' + H01, '그를 가장 오래 곁에서 본 판시는 이 중 얼마를 알고 있는가?'),
    ],
  },
  {
    id: 'upper-floors', title: '성 위쪽의 수상한 움직임', unlock: any('OB_WINDOW', 'FLAG_HR1_LUN_LAKE', 'OB_SAWDUST', 'OB_SEVEN_RIPPLE', 'KN_SEVEN_WEST'),
    items: [
      // 챕터 1 화요일 저녁 호숫가(C1-01): 직접 센 경우(OB)와 들은 경우(KN)를 나눠 쓴다. 고르지 않은 쪽의 정보는 나타나지 않는다
      I('obs', 'OB_SEVEN_RIPPLE', '호숫가에서 루나와 같이 일곱까지 셌다. 일곱에서 성 쪽 기슭에서 시작한 파문이 하나 번졌다. 바람은 없었다.'),
      I('testimony', 'KN_SEVEN_WEST', '숫자 소리는 성의 서쪽 높은 곳에서 내려와 호수에서 한 번 굽어진다고 했다. 본인도 정확하지는 않다고.', '루나'),
      I('obs', 'OB_WINDOW', '연습 비행 중 말포이가 성 위쪽, 7층 어딘가의 창을 올려다봤다. 세 번째 급강하에서 빗자루를 놓쳤다.'),
      I('obs', 'OB_SAWDUST', '토요일 밤, 말포이의 신발에 마른 톱밥이 묻어 있었다.'),
      I('obs', any('FLAG_REPORTED_NIGHT', 'FLAG_MUTUAL_SECRET', 'FLAG_CONFRONTED_NIGHT', 'FLAG_FOLLOWED_NIGHT'), '통금이 지난 7층 복도 끝 맨벽 앞에서 말포이를 마주쳤다. 비 온 뒤 같은 냄새가 희미했다.'),
      I('obs', 'FLAG_FOLLOWED_NIGHT', '기둥 뒤에서 지켜보니 그가 벽 앞을 세 번 오갔다. 입술이 무언가를 되뇌듯 움직였고, ‘오늘은 안 되겠어’라고 중얼거렸다.'),
      I('obs', 'FLAG_FOLLOWED_NIGHT', '이튿날 아침 벽 앞의 톱밥은 이미 치워져 있었다. 벽 아래 틈이 희미하게 그을려 있었다.'),
      I('obs', 'OB_RUNE_WALL', '헤르미온느와 성 건축 도면에서 룬 사본과 같은 매듭 무늬를 찾았다. 7층 서쪽 벽 귀퉁이에 ‘문을 숨기는 매듭’이라는 설명과 함께 있었다.'),
      I('obs', 'OB_PITCH_FLASH', '경기장에서 성 위쪽 창 하나가 해를 받아 일정한 간격으로 번쩍였다. 말포이가 올려다보던 쪽이었다.'),
      I('obs', 'FLAG_LUNA_COUNT7', '루나와 호숫가에서 성의 창을 줄마다 짚어 가며 같이 셌다. 둘 다 일곱 번째 줄이라고 셌다.'),
      I('testimony', 'OB_PITCH_FLASH && FLAG_RT_GINNY_OK', '그 번쩍임이 매일 같은 시간에 같은 박자라고 했다. 오빠에게 말했지만 웃고 말았다고.', '지니'),
      I('testimony', 'KN_PANSY_NIGHTS', '말포이가 수요일과 토요일 밤에 기숙사에서 사라지고, 문이 닫히는 소리가 두 번 난다고 했다. 아무에게도 옮기지 않기로 약속했다.', '판시'),
      I('testimony', 'FLAG_HR1_LUN_LAKE', '저녁마다 성 위쪽 아주 높은 곳에서 불빛이 켜졌다 꺼지고, 수면에 한 줄로 늘어진다고 했다. 몇 번째 줄인지는 아직 못 셌다고.', '루나'),
      I('testimony', 'FLAG_MUTUAL_SECRET', '밤 일을 서로 못 본 걸로 하자고 하자 ‘빚이라고 생각하진 마’라고 했다.', '말포이'),
      I('inference', 'OB_RUNE_WALL && OB_WINDOW', '도면의 7층 서쪽 벽과 말포이가 올려다본 창이 같은 쪽을 가리키는 것 같다. 우연일 수도 있다.', undefined, 3),
      I('inference', 'FLAG_LUNA_COUNT7 && OB_PITCH_FLASH', '루나가 센 일곱 번째 줄과 경기장에서 본 번쩍이는 창이 같은 줄이라면, 누군가 같은 창에서 신호처럼 불을 켜는 것이다. 확인은 못 했다.', undefined, 3),
      I('question', 'OB_RUNE_WALL', '문을 숨기는 매듭 뒤에는 무엇이 있는가?'),
      I('question', 'KN_PANSY_NIGHTS', '말포이는 수요일과 토요일 밤 어디로 가는가?'),
      I('inference', 'OB_WINDOW && FLAG_HR1_LUN_LAKE', '말포이가 올려다본 창과 루나가 말한 불빛이 같은 곳을 가리키는 것 같다. 위치가 맞는지는 아직 모른다.', undefined, 2),
      I('inference', 'OB_SAWDUST && OB_WINDOW', '톱밥과 창가, 밤의 복도. 말포이는 위쪽 어딘가에서 뭔가를 만들거나 고치고 있는 모양이다.', undefined, 1),
      I('question', 'OB_WINDOW', '말포이는 왜 그 창을 올려다보았는가?'),
      I('question', any('FLAG_REPORTED_NIGHT', 'FLAG_MUTUAL_SECRET', 'FLAG_CONFRONTED_NIGHT', 'FLAG_FOLLOWED_NIGHT'), '벽 앞에서 그는 무엇을 하려던 것인가?'),
      I('question', 'FLAG_HR1_LUN_LAKE', '호수에 닿는 불빛은 누구의 것인가?'),
    ],
  },
]

export const CASES_CRACK: CaseDef = {
  id: 'castle-crack', title: '복도 벽의 금', unlock: any('OB_CRACK', 'FLAG_CRACK_SEEN'),
  items: [
    I('obs', 'OB_CRACK', '도서관 앞 복도의 석벽에 가는 금이 생겨 있었다. 어제는 없었다. 비 온 뒤 같은 냄새와 찬 공기가 새어 나왔고, 가까이서는 매듭 같은 선이 보였다가 흐려졌다.'),
    I('obs', 'FLAG_CRACK_AVOIDED', '위험할 수 있다고 판단해 두 걸음 물러났다. 금은 그대로였다.'),
    I('obs', 'FLAG_CRACK_FOLLOWED', '다음 날 금이 한 뼘 더 벌어져 손바닥만 한 벽감이 열려 있었다. 바닥에 마른 가루가 깔려 있었고, 내가 일어서자 틈이 소리 없이 좁아졌다.'),
    I('obs', 'OB_CRACK_SKETCH', '벽감 구석에 접힌 종이가 있었다. 연필로 그린 문 윤곽, 두 번 고쳐 쓴 매듭 문양, 낯선 필체의 날짜 하나.'),
    I('testimony', 'KN_CRACK_FILCH', '석벽은 늘 금이 가고 내일 보수 업자가 와서 메꿀 거라고 했다. 학생이 만질 물건이 아니라고.', '필치'),
    I('testimony', 'FLAG_CRACK_WITH_HERMIONE', '길이는 한 뼘 반, 위로 뻗었고, 석재 틈이 아니라 벽 안쪽에서 열린 모양이라고 했다. 무늬가 자기 룬 노트와 닮았다고, 닮았다는 말까지만 하겠다고.', '헤르미온느'),
    I('testimony', 'FLAG_CRACK_WITH_PANSY', '이 석재는 슬리데린 지하 복도 벽과 같은 것이고, 이 금은 자연스럽지 않다고 했다. 물어본 적 없는 걸로 하라고.', '판시'),
    I('inference', 'FLAG_CRACK_FOLLOWED', '금은 시간이 갈수록 벌어진다. 안쪽에서 누군가 열고 있는 건지, 벽 스스로 그러는 건지는 모른다.', undefined, 1),
    I('inference', 'OB_CRACK && OB_RUNE_WALL', '금 가장자리의 매듭 같은 선이 도면의 매듭과 닮았다. 같은 것일 수도 있고 내 눈이 그렇게 보는 것일 수도 있다.', undefined, 2),
    I('question', 'OB_CRACK', '금은 왜, 어떻게 생겼는가?'),
    I('question', 'OB_CRACK_SKETCH', '종이에 문을 그리고 날짜를 적은 사람은 누구인가?'),
    I('question', 'FLAG_CRACK_FOLLOWED && OB_SAWDUST', '벽감 바닥의 가루는 7층에서 본 톱밥과 같은 종류인가?'),
    I('question', 'FLAG_CRACK_AVOIDED', '내가 물러난 사이 금은 어떻게 되었는가?'),
  ],
}
CASES.push(CASES_CRACK)
CASES.push(CASE_DOOR)

export interface CaseView {
  id: string; title: string; status: '단서 부족' | '조사 중' | '해결'
  obs: string[]; testimony: { from?: string; text: string }[]; inferences: string[]; questions: string[]; resolution: string[]
}

const holds = (s: GameState, cond: string) => { try { return evalCond(s, cond) } catch { return false } }
const top = (list: CaseItem[], n: number) => list.map((e, i) => ({ e, i })).sort((a, b) => (b.e.prio ?? 0) - (a.e.prio ?? 0) || b.i - a.i).slice(0, n).map((x) => x.e)

/** 현재 상태에서 열람 가능한 사건. 단서가 하나도 없는 사건은 나타나지 않는다. 열람은 상태를 바꾸지 않는다. */
export function buildCases(s: GameState): CaseView[] {
  return CASES.filter((c) => holds(s, c.unlock)).map((c) => {
    const ok = (k: CaseKind) => c.items.filter((i) => i.kind === k && holds(s, i.when))
    const obs = ok('obs'), tes = ok('testimony'), res = ok('resolution')
    const clues = obs.length + tes.length
    return {
      id: c.id, title: c.title,
      status: res.length ? '해결' : clues >= 4 ? '조사 중' : '단서 부족',
      obs: obs.map((i) => i.text),
      testimony: tes.map((i) => ({ from: i.from, text: i.text })),
      inferences: top(ok('inference'), res.length ? 3 : 2).map((i) => i.text),
      questions: ok('question').map((i) => i.text),
      resolution: res.map((i) => i.text),
    }
  })
}
