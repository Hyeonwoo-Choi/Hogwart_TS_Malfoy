import { evalCond } from '../engine/cond'
import type { GameState } from '../engine/types'
import { JOURNAL_CH1 } from './ch1Records'
import { JOURNAL_CH2 } from './ch2Records'
import { JOURNAL_CH4 } from './ch4Records'
import { JOURNAL_CH5 } from './ch5Records'

/**
 * 인물 관찰 기록: 해리가 직접 보고 들은 사실과 그에 대한 주관적 해석.
 * - 모든 문장은 저장 상태(선택 이력·관찰 플래그·만남 횟수)에서 결정적으로 파생된다(별도 저장 없음 → 저장/불러오기 후에도 동일).
 * - 호감도·신뢰도·관계 단계·연애 상태·지식 단계(know)는 조건으로도 쓰지 않는다. 해리가 경험한 사건만 근거다.
 * - 문장은 사실(본 것)과 해석(내 생각)을 분리하고, 상대의 속마음을 단정하지 않는다.
 * 충돌 규칙: impression·interp는 조건이 참인 항목 중 prio가 가장 높은 것 하나(동점이면 뒤에 정의된 것). recent는 prio 상위 2개.
 *           identity·observed는 참인 항목을 정의 순서(= 사건 순서)대로 모두 보여 준다.
 * 현재 범위: 프롤로그~챕터 1. 이후 챕터는 같은 형식으로 항목을 추가한다(docs/V2_JOURNAL.md).
 */
export type JSection = 'identity' | 'impression' | 'observed' | 'interp' | 'recent'
export interface JEntry { sec: JSection; when: string; text: string; prio?: number }
export interface JCharacter { id: string; name: string; visible: string; entries: JEntry[] }

const any = (...c: string[]) => c.join(' || ')
const E = (sec: JSection, when: string, text: string, prio = 0): JEntry => ({ sec, when, text, prio })

export const JOURNAL: JCharacter[] = [
  {
    id: 'draco', name: '드레이코 말포이', visible: 'OB_SLEEVE',
    entries: [
      E('identity', 'OB_SLEEVE', '슬리데린 6학년, 팀의 수색꾼. 마법약과 주문학은 늘 상위권이다. 1학년 때부터 나와 서로 시비를 걸어 온 사이.'),
      E('impression', 'OB_SLEEVE', '말포이는 여전히 말포이다. 못마땅한 얼굴에 비꼬는 말투. 그런데 그 못마땅함이 나만 향한 건 아닌 것 같기도 하다.', 0),
      E('impression', 'OB_TREMOR', '솜씨는 반에서 제일이다. 다만 그 솜씨를 유지하는 데 힘이 꽤 드는 눈치다.', 2),
      E('impression', 'OB_WINDOW', '머리는 늘 다른 곳에 가 있다. 비행 중에도, 수업 중에도. 어디인지 짐작이 가기 시작했지만 확신은 아니다.', 3),
      E('impression', 'CH_K04_A', '이제 나를 보는 눈에 모욕이 섞여 있다. 두려움이 아니라 모욕이다. 이 차이는 중요한 것 같다.', 4),
      E('impression', 'CH_K04_B', '서로 못 본 걸로 하자고 한 뒤로는 시비가 줄었다. 줄었다고 편해진 건 아니다.', 4),
      E('impression', 'CH_K04_C', '캐물었더니 똑같은 질문으로 되받았다. 우리 둘 다 이 대화에서 아무것도 얻지 못했다.', 4),
      E('impression', 'CH_K04_D', '그가 내가 거기 있었다는 걸 아는지는 모른다. 모른다고 믿고 싶다.', 4),

      E('observed', 'OB_SLEEVE', '열차 객실에서 말포이가 왼쪽 소매를 손등까지 두 번 끌어내렸다. 날씨는 더운데 외투도 벗지 않았다.'),
      E('observed', 'FLAG_CAUGHT_EAVESDROP', '문틈에서 들킬 뻔했다. 그의 시선이 내 쪽 허공을 더듬다가 지나쳤다가 다시 돌아왔다.'),
      E('observed', 'KN_OVERHEARD', '객실에서 ‘일정을 앞당겨야 해’라는 말을 엿들었다. 무슨 일정인지는 모른다. 판시에게 묻지 말라고 할 때는 비꼼이 빠져 있었다.'),
      E('observed', any('CH_H01_A', 'CH_H01_B', 'CH_H01_C'), '개학 연회에서 말포이는 포크로 음식을 옮기기만 했다. 판시가 잔소리하자 웃었는데 웃음은 눈까지 닿지 않았다.'),
      E('observed', 'CH_K02_A', '마법약 시간에 시비를 받아 주자 ‘꿈도 크군’이라고 했다. 시선은 한 박자 늦게 솥으로 돌아갔다.'),
      E('observed', 'CH_K02_B', '‘늘 누군가’라는 말을 결과물로 비교하자고 받아쳤더니 ‘말은 늘었군’이라고 했다.'),
      E('observed', 'CH_K02_C', '대꾸하지 않고 저울을 맞췄더니 ‘재미없군’ 하고 등을 돌렸다.'),
      E('observed', 'CH_K02_D', '불을 줄이라고 한마디 했더니 도움이 필요하다고 말한 적 없다고 했다. 그러면서 손은 이미 불 쪽으로 가 있었다.'),
      E('observed', 'OB_TREMOR', '젓개를 든 손끝이 떨렸고, 그는 다른 손으로 손목을 눌러 그걸 지웠다.'),
      E('observed', any('CH_K02_A', 'CH_K02_B', 'CH_K02_C', 'CH_K02_D'), '슬러그혼이 가문의 솜씨라고 칭찬하자 ‘제 솜씨입니다’라고 바로잡았다. 이긴 사람의 얼굴은 아니었다.'),
      E('observed', 'OB_WINDOW', '연습 비행 중 그가 성 위쪽, 7층 어딘가의 창을 올려다봤다. 세 번째 급강하에서 빗자루를 놓쳤다.'),
      E('observed', 'FLAG_PUBLIC_RESCUE', '추락한 그를 모두 앞에서 부축했다가 손을 쳐내졌다. ‘누구라도가 아니라 네가라서 문제야.’ 일어나자마자 소매부터 내렸다.'),
      E('observed', 'FLAG_MOCKED_FALL', '추락한 그를 보고만 있었다. 그는 ‘적어도 솔직하네’라고 했다.'),
      E('observed', 'FLAG_CALLED_TEACHER', '후치 선생님을 불러왔다. 그는 끝까지 나를 쳐다보지 않았다.'),
      E('observed', 'FLAG_PRIVATE_HELP', '사람들이 빠진 뒤 물병을 건넸다. 받았고, ‘이건 빚이 아니야’라고 했다.'),
      E('observed', 'FLAG_REPORTED_NIGHT', '통금 뒤 7층 복도에서 그를 마주쳐 교수에게 가자고 했다. 이튿날 스네이프가 슬리데린 학생 하나를 불렀다는 소문이 돌았다.'),
      E('observed', 'FLAG_MUTUAL_SECRET', '7층 복도에서 서로 못 본 걸로 하자고 했다. 그가 ‘빚이라고 생각하진 마’라고 했다. 이튿날 아침에는 ‘빚은 한 번 갚았어’라고 했다.'),
      E('observed', 'FLAG_CONFRONTED_NIGHT', '7층에서 뭘 하느냐고 캐물었다. 그는 ‘너도 여기 있잖아’라고 했다. 이튿날 슬리데린에서 ‘포터가 밤마다 순찰한다’는 말이 돌았다.'),
      E('observed', 'FLAG_FOLLOWED_NIGHT', '불을 끄고 기둥 뒤에서 지켜봤다. 그가 벽 앞을 세 번 오갔고, ‘오늘은 안 되겠어’라고 중얼거렸다. 이튿날 벽 앞의 톱밥은 치워져 있었다.'),
      E('observed', 'OB_SAWDUST', '그의 신발에 마른 톱밥이 묻어 있었다.'),
      E('observed', 'FLAG_RT_DRACO_OK', '금요일 마법약 교실에서 말없이 솥을 같이 닦았다. 그가 ‘찬물로 닦으면 금이 간다’고 한마디 조언했다. 말포이에게는 거의 양보였다.'),

      E('interp', 'OB_SLEEVE', '나를 싫어하는 건 분명하다. 그런데 그 감정이 나 때문만은 아닌 것 같다.', 0),
      E('interp', 'CH_K02_D', '도움은 거절하면서 손은 이미 거기 가 있다. 어느 쪽에 장단을 맞춰야 할지 모르겠다.', 2),
      E('interp', 'FLAG_PUBLIC_RESCUE', '그는 동정받는 걸 가장 싫어한다. 내가 한 게 동정이었는지는 나도 확신이 없다.', 3),
      E('interp', 'FLAG_MOCKED_FALL', '내가 비웃은 걸 오히려 편하게 받아들인 것 같았다. 그게 이상하게 찜찜하다.', 3),
      E('interp', 'FLAG_CALLED_TEACHER', '교사를 부른 게 도움인지 간섭인지, 그에게 어떻게 읽혔는지 모르겠다.', 3),
      E('interp', 'FLAG_PRIVATE_HELP', '남들이 없을 때는 받는다. 그리고 그걸 빚으로 치지 말라고 미리 선을 긋는다. 장단을 어디에 맞춰야 할지 모르겠다.', 3),
      E('interp', 'CH_K04_A', '그에게 나는 지금 일러바친 사람일 것이다. 틀린 말은 아니다. 그 선택이 옳았는지는 아직 모르겠다.', 4),
      E('interp', 'CH_K04_B', '서로 모른 척하기로 한 약속이 이상하게 지켜지고 있다. 이 약속을 더 필요로 하는 쪽은 그인 것 같다.', 4),
      E('interp', 'CH_K04_C', '캐묻는 건 내 방식이고 되받는 건 그의 방식이다. 둘 다 서로의 방식을 배우는 중이다.', 4),
      E('interp', 'CH_K04_D', '정직한 방식은 아니었다는 건 안다. 그래도 벽에는 뭔가 있다는 쪽으로 마음이 기운다. 증거는 없다.', 4),

      E('recent', 'OB_SLEEVE && OB_TREMOR && OB_WINDOW', '처음엔 소매였고, 다음은 손끝, 그다음은 창가였다. 하나하나는 별것 아닌데 이어 놓으면 이상해진다.', 1),
      E('recent', 'FLAG_PRIVATE_HELP', '열차에서는 문틈 하나도 허락하지 않았는데, 경기장에서는 내가 건넨 물병을 받았다.', 2),
      E('recent', 'FLAG_PUBLIC_RESCUE', '넘어진 직후 소매부터 내렸다. 열차에서 본 동작과 같았다.', 2),
      E('recent', 'CH_K04_A', '교수에게 가자고 한 순간부터 그의 눈에 모욕이 섞였다.', 3),
      E('recent', 'CH_K04_B', '열차에서는 시비부터 걸던 사람이 7층에서는 선을 먼저 그었다.', 3),
      E('recent', 'CH_K04_C', '둘 다 같은 거짓말을 했다는 걸 서로 안다. 그래서 더는 묻지 않았다.', 3),
    ],
  },
  {
    id: 'hermione', name: '헤르미온느 그레인저', visible: any('CH_H02_A', 'CH_H02_B', 'seen.hermione >= 1'),
    entries: [
      E('identity', 'CH_H02_A || CH_H02_B || seen.hermione >= 1', '그리핀도르 6학년, 감독생. 내 숙제와 내 판단을 나보다 먼저 검토하는 오래된 친구.'),
      E('identity', any('CH_H03_A', 'CH_H03_B', 'CH_H03_C', 'CH_H03_D'), '올해는 마법부 청소년 연구상에 낼 룬 문자 논문을 쓰고 있다. 마감은 10월 첫째 주.'),
      E('impression', 'CH_H02_A || CH_H02_B || seen.hermione >= 1', '여전히 규칙을 먼저 말하고 다정함은 그다음에 얹는다. 순찰 일지와 포스트잇이 늘었다.', 0),
      E('impression', 'CH_H02_A', '올해가 무섭다고 했다. 의외인 건 그 말을 나에게 했다는 점이다.', 2),
      E('impression', 'CH_H02_B', '순찰에는 따라가지 않았다. 그녀가 혼자 도는 동안 나는 론 곁에 있었다. 어느 쪽이 맞았는지는 모르겠다.', 2),
      E('impression', 'FLAG_HR1_HER_PAPER', '논문 앞에서는 규칙이 아니라 문맥을 찾는 사람이 된다. 그 모습이 오히려 더 헤르미온느답다.', 3),
      E('impression', 'FLAG_HER_LEFT_OUT', '나와 지니가 이야기하는 걸 본 모양이다. 따지는 대신 서운하다고 했다. 이쪽이 더 곤란하다.', 4),

      /* 개학 연회에서 헤르미온느가 털어놓은 말(H-02 B)은 헤르미온느의 기록이다(예전에는 드레이코 기록에 잘못 들어 있었다) */
      E('observed', 'CH_H02_B', '개학 연회에서 순찰은 혼자 돌았다고 했다. 올해가 무섭다고, N.E.W.T.도 논문도 감독생도. 론에게는 비밀이라고.'),
      E('observed', 'CH_H02_A', '순찰 중 1학년의 가짜 지팡이를 압수하며 닭은 돌려줬다. 그러다 올해가 무섭다고 했다. N.E.W.T., 논문, 감독생, 완벽하지 않으면 불안해서. 론에게는 비밀이라고.'),
      E('observed', 'FLAG_EV_GH_HERMIONE_OK', '온실 표본 정리에서 같은 글자가 두 번 읽히는 줄을 같이 풀었다. 다르게 읽히는 첫 글자부터 줄을 그어 보자고 했더니 받아들였다. 필기 귀퉁이에 내 이름 머리글자를 적어 줬다.'),
      E('observed', 'FLAG_RT_HERMIONE_OK', '목요일 도서관에서 룬 사본을 건축 도면과 대조했다. 같은 매듭이 7층 서쪽 벽 도면에 있었다. 가 보자고는 하지 않았다. 규정 위반이고 자기 방식이 아니라고.'),
      E('observed', any('CH_K02_A', 'CH_K02_B', 'CH_K02_C', 'CH_K02_D'), '마법약 시간이 끝나고, 말포이가 손을 떨며 그렇게 맑은 약을 만들었다는 걸 자기도 봤다고 했다. 결론은 내리지 않겠다고, 너도 내리지 말라고 했다.'),
      E('observed', any('CH_H03_A', 'CH_H03_B', 'CH_H03_C', 'CH_H03_D'), '도서관에서 논문 초안과 룬 사전을 펼쳐 놓고, 한 줄이 ‘문을 지킨다’와 ‘문을 연다’로 갈린다고 했다. 틀린 게 아니라 문맥이 모자란 거라고.'),
      E('observed', 'FLAG_HR1_HER_PAPER', '막혔던 룬 한 줄이 ‘문을 지키며 머문다’로 풀렸다고 했다. 논문이 끝나면 가장 먼저 읽어 달라고, 비판은 얼마든지 받겠다고, 칭찬은 한 줄만이라고.'),
      E('observed', 'FLAG_HER_LEFT_OUT', '이번 주에 내가 지니와 이야기하는 걸 몇 번 봤다고 했다. 따지는 게 아니라, 먼저 물어봐야 알게 되는 건 조금 서운하다고.'),

      E('interp', 'CH_H02_A || CH_H02_B || seen.hermione >= 1', '내 판단을 무조건 믿어 주는 사람이 아니다. 그래서 믿는다.', 0),
      E('interp', any('CH_K02_A', 'CH_K02_B', 'CH_K02_C', 'CH_K02_D'), '결론을 미루자는 건 늘 그녀 쪽이다. 지금은 그게 짜증스럽기도 하고, 맞는 말이기도 하다.', 2),
      E('interp', 'FLAG_HR1_HER_PAPER && CH_H03_A', '같이 소리 내서 읽은 게 도움이 된 모양이다. 말로 하지는 않지만 표정이 그랬다.', 3),
      E('interp', 'FLAG_HR1_HER_PAPER && CH_H03_B', '솔직한 지적을 불편해하면서도 고쳤다. 맞는 말이라서 더 불편했을 것이다.', 3),
      E('interp', 'FLAG_HR1_HER_PAPER && CH_H03_C', '혼자 정리할 시간이 필요하다는 걸 알아준 게 고마웠던 눈치다.', 3),

      E('recent', 'FLAG_HR1_HER_PAPER', '두 가지로 읽히던 한 줄이 하나로 읽히게 되면서, 그녀의 표정도 같이 풀렸다.', 1),
      E('recent', 'FLAG_HER_LEFT_OUT', '내가 어디서 시간을 쓰는지가 이제 그녀에게도 신경 쓰이는 문제다. 불평이 아니라 질문의 형태로.', 3),
    ],
  },
  {
    id: 'ginny', name: '지니 위즐리', visible: 'seen.ginny >= 1',
    entries: [
      E('identity', 'seen.ginny >= 1', '그리핀도르 퀴디치 팀의 추격수. 론의 동생이고, ‘해리의 친구’라는 소개가 따라붙는 걸 제일 싫어한다.'),
      E('impression', 'seen.ginny >= 1', '말은 직선이고 행동은 더 직선이다. 돌려 말하는 법을 일부러 안 배운 사람 같다.', 0),
      E('impression', any('CH_K03_A', 'CH_K03_B', 'CH_K03_C', 'CH_K03_D'), '내가 말포이 얘기를 할 때 눈이 달라진다고 했다. 내 얼굴을 나보다 먼저 읽는 사람이다.', 2),
      E('impression', 'FLAG_MOCKED_FALL', '‘방금 그건 별로였어, 해리.’ 설명은 필요 없다고 했다. 길게 설명하는 것보다 더 아팠다.', 3),
      E('impression', 'FLAG_HR1_GIN_CAPTAIN', '주장이 되고 싶다고 처음 입 밖에 냈다. 처음이라고 했지만 목소리는 오래 연습한 쪽 같았다.', 4),

      E('observed', 'seen.ginny >= 1', '출발하는 열차 문에 매달려 내 손을 잡아 줬다. 구해 준 게 아니라 내기 때문이라고 했다. 헤르미온느가 내가 안 올 쪽에 걸었다고.'),
      E('observed', 'CH_P01_A', '여름 내내 책상 앞에 있었다고 하자 ‘숙제하는 해리라니’ 하고 놀렸다. 눈은 진지했다.'),
      E('observed', 'CH_P01_B', '신문과 사람 표정을 읽었다고 하자 자기도 해 봤다며, 위험한 취미라고 했다.'),
      E('observed', 'CH_P01_C', '하늘을 돌았다고 하자 눈이 반짝였다. 올해 연습에서 확인하겠다고.'),
      E('observed', 'CH_P01_D', '너희 집 식탁 얘기를 꺼내자 목소리가 반 톤 낮아졌다. 시끄러운 저녁이 자랑이면서 짐이라는 게 거기서 읽혔다.'),
      E('observed', any('CH_K03_A', 'CH_K03_B', 'CH_K03_C', 'CH_K03_D'), '연습장 시간표가 슬리데린과 겹쳤다며, 사과받으러 가는 게 아니라 반씩 쓰자고 제안하러 간다고 했다.'),
      E('observed', any('CH_K03_A', 'CH_K03_B', 'CH_K03_C', 'CH_K03_D'), '말포이의 비행은 훈련 부족이 아니라 잠 부족이라고 했다. 새벽 달리기를 하다 보면 경기장 가장자리에 그냥 앉아 있는 그를 가끔 본다고. 내가 그를 의심하는 건지 걱정하는 건지는 자기도 모르겠다고.'),
      E('observed', 'FLAG_MOCKED_FALL', '내가 추락한 말포이를 보고만 있자 ‘방금 그건 별로였어’라고 했다. 설명은 필요 없다고.'),
      E('observed', 'FLAG_EV_PITCH_GINNY_OK', '공개 연습에서 일대일을 했다. 일부러 반 박자 쉬었더니 ‘읽힌 건 나였네’라고 했다. 새로운 상대를 찾은 사람의 웃음이었다.'),
      E('observed', 'FLAG_RT_GINNY_OK', '수요일 경기장에서 급강하를 봐 줬다. 정점에서 어깨가 한 박자 열린다고 했더니 화내지 않고 고쳤다. 그녀 어깨 너머로 성의 창 하나가 일정한 간격으로 번쩍이는 걸 같이 봤다.'),
      E('observed', 'CH_H04_A', '골대 앞의 론에게 쿼플을 열 번 던졌다. 지니가 옆에서 놀리며 가르쳤다.'),
      E('observed', 'CH_H04_B', '론이 몇 번 막는지 심판처럼 숫자를 셌다.'),
      E('observed', 'CH_H04_C', '던지지 않고 구경만 하겠다고 했다. 지니는 그래도 괜찮다고 했다.'),
      E('observed', 'FLAG_HR1_GIN_CAPTAIN', '올해 주장이 되고 싶다고 했다. ‘론의 동생’이나 ‘해리의 친구’가 아니라 자기 이름으로 뽑히고 싶다고.'),

      E('interp', 'seen.ginny >= 1', '나를 기다려 주는 사람이 아니다. 같이 가거나, 먼저 간다.', 0),
      E('interp', 'FLAG_HR1_GIN_CAPTAIN && CH_H04_A', '던진 공이 정직해서 좋았다고 했다. 읽히지만 믿을 수 있는 공이라고.', 2),
      E('interp', 'FLAG_HR1_GIN_CAPTAIN && CH_H04_B', '내가 센 숫자 덕에 자기 습관을 알았다고 했다. 칭찬인지 연습 메모인지 구분이 안 된다.', 2),
      E('interp', 'FLAG_HR1_GIN_CAPTAIN && CH_H04_C', '구경만 해도 괜찮다고 했다. 대신 이름을 부를 때는 같이 불러 달라고.', 2),

      E('recent', 'FLAG_HR1_GIN_CAPTAIN', '장난기가 반쯤 빠진 얼굴이었다. 장난이 아닐 때의 지니를 처음 자세히 봤다.', 2),
    ],
  },
  {
    id: 'luna', name: '루나 러브굿', visible: 'seen.luna >= 1',
    entries: [
      E('identity', 'seen.luna >= 1', '레번클로. 아버지가 펴내는 《퀴블러》를 들고 다닌다. 남들이 지나치는 것을 오래 본다.'),
      E('impression', 'seen.luna >= 1', '말은 엉뚱할 때가 많은데, 틀렸는지는 한참 뒤에야 알 수 있다. 그 ‘한참’이 문제다.', 0),
      E('impression', 'FLAG_HR1_LUN_LAKE', '해 질 무렵의 호수와 지도 한 장. 그녀는 이름 없는 선을 믿어 주는 쪽이다.', 3),

      E('observed', 'CH_H02_A', '순찰 중 객실에서 만났다. 헤르미온느 머리 위에 위글스풋이 앉아 있다고 했다. 《퀴블러》에는 ‘해리 포터가 올해 열차에 늦을 확률 12퍼센트’가 실렸다고도.'),
      E('observed', 'CH_H02_B', '도망친 신발을 찾으러 객실에 들어왔다. 신발은 론 엉덩이 밑에 있었다. 신발이 도망친 이유는 물어본 적이 없다고 했다.'),
      E('observed', 'FLAG_LUN_SAW_HER', '온실에서 내가 헤르미온느와 화분 이름표를 읽는 걸 봤다고 했다. 둘이 읽는 속도가 맞는다고. 세는 건 아니고 보이는 거라고.'),
      E('observed', 'FLAG_EV_GH_LUNA_OK', '온실에서 잎맥의 빛 무늬가 열리는 순서를 끝까지 같이 봤다. 바깥에서 안쪽으로, 세 번.'),
      E('observed', 'FLAG_RT_LUNA_OK', '금요일 호숫가에서 성의 창을 줄마다 같이 셌다. 일곱 번째 줄이었다. 노트에 ‘해리와 같이 셈’이라고 적었다.'),
      E('observed', 'CH_H05_A', '호숫가에서 ‘주름뿔 스노커크’의 입구를 찾고 있다고 했다. 양동이를 받아 같이 찾았다.'),
      E('observed', 'CH_H05_B', '호숫가에서 증거가 어떤 모양이면 믿을 수 있느냐고 물었다.'),
      E('observed', 'CH_H05_C', '호숫가에서 같이 찾자는 부탁에 시간이 없다고 답했다.'),
      E('observed', 'FLAG_HR1_LUN_LAKE', '호수 지도를 그리고 있다. 저녁마다 성 위쪽 아주 높은 곳에서 불빛이 켜졌다 꺼지고 수면에 한 줄로 늘어진다고 했다. 몇 번째 줄인지는 아직 못 셌단다. 불빛이 누구 건지는 안 궁금하단다. 왜 한 줄로 늘어지는지가 궁금하다고.'),

      E('interp', 'seen.luna >= 1', '그녀가 믿는 것이 맞는지는 모르겠다. 그래도 믿지 않는 이유보다 믿는 방식이 먼저 눈에 들어온다.', 0),
      E('interp', 'FLAG_HR1_LUN_LAKE && CH_H05_A', '같이 찾은 덕에 지도가 한 장 늘었다고 했다. 헛걸음이라는 말은 그녀의 사전에 없다.', 2),
      E('interp', 'FLAG_HR1_LUN_LAKE && CH_H05_B', '물어봐 준 덕에 찾는 이유를 정리했다고 했다. 이유를 모르면 찾다가 길을 잃는다고.', 2),
      E('interp', 'FLAG_HR1_LUN_LAKE && CH_H05_C', '바쁘다는 말이 거짓이 아니었다는 걸 안다고 했다. 이해한 건지 접어 둔 건지 구분이 안 된다.', 2),

      E('recent', 'FLAG_HR1_LUN_LAKE', '첫날은 호수를 들여다보던 사람이 이제는 지도를 그리고 있다. 말 없는 진전이다.', 2),
    ],
  },
  {
    id: 'pansy', name: '판시 파킨슨', visible: 'seen.pansy >= 1',
    entries: [
      E('identity', 'seen.pansy >= 1', '슬리데린 6학년. 말포이 곁을 가장 오래 지켜 온 사람. 슬리데린 식탁에서 그에게 말을 거는 건 자기 하나라고 했다.'),
      E('impression', 'seen.pansy >= 1', '나를 말포이의 위협으로 본다. 그런데 말포이를 걱정하는 마음은 진짜 같다. 둘을 섞어서 읽으면 틀린다.', 0),
      E('impression', 'FLAG_HR1_PAN_MIRROR', '표정을 연습하는 사람. 연습이 아닌 얼굴은 아주 잠깐, 거울이 접히는 순간에만 보였다.', 3),

      E('observed', 'FLAG_EV_PITCH_PANSY_OK', '공개 연습에서 담요를 두른 판시 옆에 말없이 앉았다. 말포이가 멈춘 횟수를 손가락으로 세고 있었다. 오늘이 일곱 번, 어제는 아홉 번이라고. 아무한테도 말하지 말라고.'),
      E('observed', 'FLAG_RT_PANSY_OK', '수요일 안뜰 벤치에서 말포이가 수요일과 토요일 밤에 기숙사에서 사라진다는 말을 들었다. 해치지 않겠다고, 옮기지 않겠다고 약속했다.'),
      E('observed', any('CH_H01_A', 'CH_H01_B', 'CH_H01_C'), '연회 뒤 계단 앞에서 내가 슬리데린 쪽을 얼마나 오래 보는지 지적했다. 크레이브와 고일은 지시를 받으러 서 있고, 말을 거는 건 자기 하나라고 했다. 올해 말포이라는 이름은 방패보다 짐 같다고도.'),
      E('observed', 'CH_H01_A', '말포이가 안 먹어서 걱정돼서 본 거라고 하자, 한 번 팔이 풀렸다가 다시 올라갔다. ‘내가 신경 쓰이는 걸 남이 알아본 건 처음’이라고 했다.'),
      E('observed', 'CH_H01_B', '‘네가 대신 다 눈치채는 모양이네’라고 하자 눈이 가늘어졌다. 내가 말포이 주변에서 뭔가 찾고 있다는 걸 이미 알고 있었다.'),
      E('observed', 'CH_H01_C', '사과했더니 수상해했다. 포터가 순순히 나올 땐 보통 뭘 숨기고 있더라고.'),
      E('observed', any('CH_H06_A', 'CH_H06_B', 'CH_H06_C'), '안뜰 벤치에서 가문 문장이 찍힌 편지를 소매에 숨겼다. 어머니가 슬러그혼 클럽에 들어가라고 썼는데 자기는 초대받지 못했다고. 못 들어가는 건 자기 잘못이 되는 거라고.'),
      E('observed', 'CH_H06_A', '말없이 벤치 반대편 끝에 앉았다.'),
      E('observed', 'CH_H06_B', '말포이는 아느냐고 물었다. 판시의 경계가 올랐다.'),
      E('observed', 'CH_H06_C', '혼자 있고 싶어 보인다며 자리를 비웠다.'),
      E('observed', 'FLAG_HR1_PAN_MIRROR', '작은 거울을 보며 웃는 얼굴과 안 웃는 얼굴을 연습하고 있었다. 연습하지 않은 얼굴은 가문 앞에서 쓸 수 없다고. 연습하는 쪽이 힘들어 보인다고 하자, 하지 않으면 더 힘들어진다고 했다.'),

      E('interp', 'seen.pansy >= 1', '걱정과 경계가 한 사람 안에 같이 산다. 내가 어느 쪽을 건드리느냐에 따라 다른 얼굴이 나온다.', 0),
      E('interp', 'CH_H01_A', '걱정이라는 말이 닿긴 닿은 것 같다. 닿아 본 적이 별로 없는 얼굴이었다.', 2),
      E('interp', 'CH_H01_B', '눈치가 빠르다는 건 그녀의 장점이자 경고다. 말포이 주변에서 내가 하는 일은 그녀가 먼저 알게 될 것이다.', 2),
      E('interp', 'CH_H01_C', '맞는 말이라 대꾸를 못 했다. 나는 정말 뭘 숨기고 있다.', 2),
      E('interp', 'FLAG_HR1_PAN_MIRROR && CH_H06_A', '말없이 옆에 앉았던 일이 그녀에게는 마음에 걸린 모양이다. 고맙다는 말을 하려다 못 했다고 했다. 못 한 말이 오래 남는 사람이다.', 3),
      E('interp', 'FLAG_HR1_PAN_MIRROR && CH_H06_B', '내 질문이 아직 마음에 걸린다고 했다. 대답은 안 해 줄 거라면서, 틀린 질문은 아니었다고. 인정과 거절을 한 문장에 넣는 사람이다.', 3),
      E('interp', 'FLAG_HR1_PAN_MIRROR && CH_H06_C', '그냥 자리를 비운 게 이상하게 오래 남았다고 했다. 보통은 위로하거나 도망치는데. 나는 둘 중 무엇이었는지 잘 모르겠다.', 3),

      E('recent', 'FLAG_HR1_PAN_MIRROR', '처음엔 날카롭게 쏘아붙이던 사람이 거울을 든 채 마음을 털어놓을 뻔했다. 털어놓지는 않았다.', 2),
    ],
  },
]
// 챕터 2의 경로·관계 장면 기록(ch2Records.ts)
for (const c of JOURNAL) c.entries.push(...(JOURNAL_CH1[c.id] ?? []), ...(JOURNAL_CH2[c.id] ?? []), ...(JOURNAL_CH4[c.id] ?? []), ...(JOURNAL_CH5[c.id] ?? []))

export interface JournalPage {
  id: string; name: string
  identity: string[]; impression: string | null; observed: string[]; interp: string | null; recent: string[]
}

const holds = (s: GameState, cond: string) => { try { return evalCond(s, cond) } catch { return false } }
const top = (list: JEntry[], n: number) => list.map((e, i) => ({ e, i })).sort((a, b) => (b.e.prio ?? 0) - (a.e.prio ?? 0) || b.i - a.i).slice(0, n).map((x) => x.e.text)

/** 현재 저장 상태에서 열람 가능한 인물 페이지를 결정적으로 만든다(상태를 바꾸지 않는다). */
export function buildJournal(s: GameState): JournalPage[] {
  return JOURNAL.filter((c) => holds(s, c.visible)).map((c) => {
    const ok = (sec: JSection) => c.entries.filter((e) => e.sec === sec && holds(s, e.when))
    return {
      id: c.id, name: c.name,
      identity: ok('identity').map((e) => e.text),
      impression: top(ok('impression'), 1)[0] ?? null,
      observed: ok('observed').map((e) => e.text),
      interp: top(ok('interp'), 1)[0] ?? null,
      recent: top(ok('recent'), 2),
    }
  })
}
