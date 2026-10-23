import type { Scenario } from '../engine/types'
import { D, DX, GIN, H, HER, LUN, N, PAN, RON, SNA, SX, bg, cue, date, fx, go, iff, light, opt, show, trans } from './dsl'

/**
 * 챕터 2 금요일 저녁(9/27): 관계 조건부 장면. 한 번에 한 장면만 재생된다.
 * 우선순위: ① 갈등·반응(약속 어김·규칙 위반·목격된 만남) → ② 친밀(신뢰·단계·함께한 사건이 충분할 때) → ③ 일반.
 * 사건 경로(FLAG_P2_*)의 히로인을 먼저 검사하되, 다른 인물과의 관계 조건이 충족되면 그 장면도 열린다(사건 경로 ≠ 연애 경로).
 * 어느 조건도 충족되지 않으면 일반 장면으로 진행한다. 특별 장면을 놓쳐도 메인 스토리와 챕터 2 진행은 같다.
 * 신체적 친밀함은 상대의 말과 선택이 있어야 일어난다(명시적 동의). 거절은 처벌 없이 존중받는다.
 */
const R = (o: string, ss: string[]) => '(' + ss.map((s) => `(REACT_${o}_${s}>=1 && REACT_${o}_${s}<=4)`).join(' || ') + ')'
export const TENSION: Record<string, string> = {
  hermione: `(${R('hermione', ['pansy'])} || FLAG_P2_BREACH)`,
  ginny: `(${R('ginny', ['luna'])} || FLAG_P2_HOOCH_CHECK)`,
  luna: 'FLAG_P2_STAIR_SEALED',
  pansy: `(${R('pansy', ['hermione', 'ginny'])} || FLAG_P2_STAYED_OUT)`,
  draco: '(FLAG_P2_TALK_DRACO || FLAG_P2_E_BETRAYED || FLAG_P2_E_REPORTED)',
}
export const INTIMATE: Record<string, string> = {
  hermione: 'stage.hermione>=2 && hermione.trust>=54 && (FLAG_RT_HERMIONE_OK || FLAG_EV_GH_HERMIONE_OK || FLAG_P2_RESEARCH_OK || FLAG_CRACK_WITH_HERMIONE)',
  ginny: 'stage.ginny>=2 && ginny.trust>=44 && (FLAG_RT_GINNY_OK || FLAG_EV_PITCH_GINNY_OK || FLAG_P2_PITCH_OK)',
  luna: 'stage.luna>=2 && luna.trust>=43 && (FLAG_RT_LUNA_OK || FLAG_EV_GH_LUNA_OK || FLAG_P2_SECRET_OK)',
  pansy: 'stage.pansy>=2 && pansy.trust>=8 && (FLAG_RT_PANSY_OK || FLAG_EV_PITCH_PANSY_OK || FLAG_P2_SLY_OK || FLAG_P2_PROMISE_KEPT)',
  draco: 'draco.trust>=7 && draco.respect>=22 && (FLAG_RT_DRACO_OK || FLAG_ASKED_DIRECTLY || FLAG_P2_E_HELD)',
}
const PATH_OF: Record<string, string> = { hermione: 'FLAG_P2_RESEARCH', ginny: 'FLAG_P2_PITCH', luna: 'FLAG_P2_SECRET', pansy: 'FLAG_P2_SLY', draco: 'FLAG_P2_UNSTABLE' }
const ORDER = ['hermione', 'ginny', 'luna', 'pansy', 'draco']
const chain = (table: Record<string, string>, prefix: string) => ORDER.map((h) => iff(table[h], `${prefix}${h}`))
/** 우선순위: 말포이를 고른 경우 말포이 → 사건 경로의 히로인(갈등 먼저, 그다음 친밀) → 다른 인물의 갈등·반응 → 다른 인물의 친밀 */
const FIRST = [
  iff(`FLAG_RT_DRACO && ${TENSION.draco}`, 'ch2_eve_t_draco'), iff(`FLAG_RT_DRACO && ${INTIMATE.draco}`, 'ch2_eve_i_draco'),
  ...Object.entries(PATH_OF).flatMap(([h, p]) => [iff(`${p} && ${TENSION[h]}`, `ch2_eve_t_${h}`), iff(`${p} && ${INTIMATE[h]}`, `ch2_eve_i_${h}`)]),
]

export const V2C2R: Scenario = {
  ch2_eve: [
    bg('common'), show(null), date('09-27', '금'),
    ...FIRST,
    ...chain(TENSION, 'ch2_eve_t_'),
    ...chain(INTIMATE, 'ch2_eve_i_'),
    go('ch2_eve_gen'),
  ],

  /* ---------- 일반 ---------- */
  ch2_eve_gen: [
    bg('common'), show('ron', 'calm'),
    N('금요일 저녁 휴게실은 내일 경기를 앞둔 흥분으로 시끄러웠다. 론은 키퍼 장갑의 손가락 끝을 하나하나 점검하고 있었다.'),
    RON('내일은 열두 번 막을 거야. 헤르미온느가 확률을 계산해 줬어. 아니, 계산해서 알려 주진 않았고, "계산하지 않는 게 낫겠다"고 했어.'),
    H('그게 격려인 거야.'),
    RON('…그렇지? 나도 그렇게 믿기로 했어.'),
    N('나는 창밖을 보았다. 달이 반쯤 찬 하늘 아래, 성 위쪽 어딘가가 어둡게 가라앉아 있었다.'),
    N('연구를 같이 읽은 기억이 겹쳤다. 아직 어떤 이름도 붙이지 못한 감각이 이 방 안에서 혼자 앉아 있었다.', 'FLAG_P2_RESEARCH'),
    N('지니가 이십 분 간격으로 세던 숫자가 귓가에 남아 있었다. 그 창을 다시 올려다볼 때가 오고 있었다.', 'FLAG_P2_PITCH'),
    N('호숫가에서 들은 소리가 아직 귓속에 남아 있었다. 열두 번.', 'FLAG_P2_SECRET'),
    N('판시가 소매를 놓던 속도가 마음에 걸렸다. 내일 슬리데린 쪽 관중석을 한 번은 봐야 할 것 같았다.', 'FLAG_P2_SLY'),
    go('ch2_match'),
  ],

  /* ---------- 갈등 · 반응 ---------- */
  /* 헤르미온느의 갈등은 원인이 둘이다: 판시와의 만남 목격(seen) / 서고 위반(breach). 두 원인은 서로 다른 사건 경로(슬리데린 / 연구)에서만 생기므로 정상 플레이에서 겹치지 않는다. 일어나지 않은 일을 전제하지 않는다(STORY-01) */
  ch2_eve_t_hermione: [
    iff('FLAG_P2_BREACH', 'ch2_eve_t_hermione_breach'),
    go('ch2_eve_t_hermione_seen'),
  ],
  ch2_eve_t_hermione_seen: [
    bg('library'), light('dim'), show('hermione', 'calm', { gaze: 'down' }),
    N('금요일 저녁, 도서관 문 닫기 직전. 헤르미온느가 마지막 책상에 혼자 남아 정리하던 노트를 뒤집어 놓고 나를 기다리고 있었다.'),
    SX('헤르미온느', '해리. 사실만 물을게. 판시와 같은 책상에 앉아 있었던 건 맞지?', { gaze: 'front' }),
    HER('내가 본 건 그게 전부야. 이유는 모르고, 이유를 모르는 게 이상하게 신경이 쓰여.'),
    SX('헤르미온느', '…내가 그 자리에 있었던 걸 모른 척했다면 그건 이해해. 같이 있었던 것도 이해해. 그런데 이상하게, 서운했어.', { pose: 'back', gaze: 'side', expr: 'sad', when: 'stage.hermione>=2' }),
    cue('pause'),
    { t: 'choice', id: 'L-11', prompt: '헤르미온느가 노트를 덮은 채 기다린다. 나는…', options: [
      opt('A', '있었던 일을 사실대로 말한다. 판시가 한 이야기만 빼고.', { fx: ['hermione.trust+3', 'hermione.wariness-3', 'flag:FLAG_HER_REPAIRED'], goto: 'ch2_eve_t_hermione_A' }),
      opt('B', '"신경 쓰였어? 이유가 뭔지 분석해 줘."', { fx: ['hermione.affinity+2', 'stage:hermione+1'], goto: 'ch2_eve_t_hermione_B' }),
      opt('C', '"별일 아니었어."라고 하고 화제를 바꾼다.', { fx: ['hermione.trust-3', 'hermione.wariness+4', 'flag:FLAG_HER_DISTANT'], goto: 'ch2_eve_t_hermione_C' }),
    ] },
  ],
  ch2_eve_t_hermione_breach: [
    bg('library'), light('dim'), show('hermione', 'calm', { gaze: 'down' }),
    N('금요일 저녁, 도서관 문 닫기 직전. 헤르미온느가 내 필사 쪽을 책상 한가운데 펴 놓고 나를 기다리고 있었다.'),
    SX('헤르미온느', '네가 밤에 서고에 들어간 일, 나는 아직 화가 풀리지 않았어. 알려 준 정보가 맞았다는 게 오히려 더 화나.', { expr: 'angry', pose: 'guard', gaze: 'front' }),
    HER('규칙을 어긴 건 네 선택이었는데, 그 선택을 읽고 싶어 했던 건 나야. 그게 제일 불편해.'),
    cue('pause'),
    { t: 'choice', id: 'L-11', prompt: '헤르미온느가 필사 쪽 위에 손을 얹은 채 기다린다. 나는…', options: [
      opt('A', '서고에 들어간 시간과 필치를 피한 일, 필사한 쪽의 출처를 숨기지 않고 말한다.', { fx: ['hermione.trust+3', 'hermione.wariness-3', 'flag:FLAG_HER_REPAIRED'], goto: 'ch2_eve_t_hermione_A' }),
      opt('B', '"정확해서 화가 난다면, 같이 책임지자. 다음엔 네 기준을 먼저 묻고 정할게."', { fx: ['hermione.affinity+1', 'hermione.trust+1'], goto: 'ch2_eve_t_hermione_B' }),
      opt('C', '"다 끝난 일이야."라고 하고 화제를 바꾼다.', { fx: ['hermione.trust-3', 'hermione.wariness+4', 'flag:FLAG_HER_DISTANT'], goto: 'ch2_eve_t_hermione_C' }),
    ] },
  ],
  ch2_eve_t_hermione_A: [
    N('나는 있었던 일을 순서대로 말했다. 판시가 부탁한 것, 책상에서 오간 말, 내가 어느 쪽으로 손을 두었는지. 해석 없이.', '!FLAG_P2_BREACH'),
    N('서고에 들어간 시간, 필치의 발소리가 서가를 세 번 지나간 일, 필사한 쪽이 어느 책의 어느 줄인지. 숨기지 않고.', 'FLAG_P2_BREACH'),
    HER('…사실로만 말해 줬네. 해석을 붙이지 않고. 고마워. 이건 내가 제일 듣고 싶었던 방식이야.'),
    SX('헤르미온느', '서고 건은 변명하지 않아서 더 화가 나. 그리고 조금 덜 화가 나. 이상하지?', { pose: 'near', expr: 'calm', when: 'FLAG_P2_BREACH' }),
    fx('flag:FLAG_EVE_DONE'),
    go('ch2_match'),
  ],
  ch2_eve_t_hermione_B: [
    SX('헤르미온느', '…분석? 나한테 분석을 시켰어?', { expr: 'flustered', gaze: 'side', when: '!FLAG_P2_BREACH' }),
    N('그녀의 귀 끝이 붉어졌다. 머릿속에서 가설이 세워졌다 무너지는 소리가 들리는 것 같았다.', '!FLAG_P2_BREACH'),
    HER('가설 하나. "나는 해리 포터가 다른 사람과 앉아 있을 때 관찰 이상의 감정을 가진다." 반증이 나올 때까지 이건 유효해. 지금은 내가 대답하기 싫을 뿐이야.', '!FLAG_P2_BREACH'),
    SX('헤르미온느', '…같이 책임지자고? 그건 규칙 어긴 사람이 할 말이 아닌데.', { expr: 'flustered', gaze: 'side', when: 'FLAG_P2_BREACH' }),
    HER('…그런데 처음으로 그 말이 듣기 싫지 않았어. 다음에는 정말 먼저 물어봐 줘. 기준은 내가 정하고, 어길 때는 같이 어기자는 게 아니라 같이 설명하자는 거야.', 'FLAG_P2_BREACH'),
    SX('헤르미온느', '(작게) 내일은 경기니까 이 얘기는 경기 끝나고 해. 졸업 전에 하긴 할 거야. 아마.', { pose: 'near', gaze: 'down', expr: 'smile' }),
    fx('flag:FLAG_EVE_DONE'),
    go('ch2_match'),
  ],
  ch2_eve_t_hermione_C: [
    N('헤르미온느는 아무 말도 하지 않고 노트를 가방에 넣었다. 지퍼 소리가 평소보다 크게 났다.'),
    HER('…알겠어. 별일 아니면 별일 아닌 거야.', '!FLAG_P2_BREACH'),
    HER('…끝났다고 하는 건 네가 정할 일이 아니야. 그래도 그렇게 하고 싶다면, 그렇게 해.', 'FLAG_P2_BREACH'),
    N('그 문장에는 어떤 해석도 붙어 있지 않았다. 그래서 더 무거웠다. 그녀는 문 앞에서 한 번도 돌아보지 않고 나갔다.'),
    fx('flag:FLAG_EVE_DONE'),
    go('ch2_match'),
  ],

  ch2_eve_t_ginny: [
    bg('pitch'), light('warm'), show('ginny', 'calm', { pose: 'near' }),
    N('금요일 해 질 녘, 연습이 끝난 경기장. 지니는 빗자루를 바닥에 눕혀 놓고 나를 기다리고 있었다.'),
    GIN('내 선택은 내가 하고 싶었어, 해리. 후치 선생님께 간 건 네 결정이었지.', 'FLAG_P2_HOOCH_CHECK'),
    GIN('호숫가에서 루나랑 있었지? 돌 던지면서 봤어. 질투는 아니야. 아직은. 그런데 이상하게 신경이 쓰여서 네가 직접 말해 줬으면 했어.', 'REACT_ginny_luna>=1 && REACT_ginny_luna<=4'),
    SX('지니', '네가 나를 지키려는 거 알아. 그게 나쁘다고 안 해. 근데 내가 원하는 건 지켜지는 게 아니라 같이 서는 거야.', { pose: 'close', expr: 'angry' }),
    { t: 'choice', id: 'L-12', prompt: '지니가 한 걸음 다가와 나를 올려다본다. 나는…', options: [
      opt('A', '"맞아. 네 판단을 먼저 묻는 게 옳았어. 미안해."', { fx: ['ginny.trust+3', 'ginny.wariness-2', 'flag:FLAG_GIN_REPAIRED'], goto: 'ch2_eve_t_ginny_A' }),
      opt('B', '"그럼 같이 서자. 내일 경기에서."', { fx: ['ginny.affinity+2', 'stage:ginny+1'], goto: 'ch2_eve_t_ginny_B' }),
      opt('C', '"난 네가 다칠까 봐 그랬던 거야."라고 변명한다.', { fx: ['ginny.trust-2', 'ginny.wariness+3', 'flag:FLAG_GIN_DISTANT'], goto: 'ch2_eve_t_ginny_C' }),
    ] },
  ],
  ch2_eve_t_ginny_A: [
    N('지니의 눈썹이 한 번 올라갔다가 내려갔다. 화난 표정이 풀리는 데 세 박자쯤 걸렸다.'),
    GIN('…빨리 사과하네. 나 이럴 때 지는 느낌이 들어서 싫은데, 오늘은 이긴 쪽이 둘이라서 괜찮아.'),
    SX('지니', '내일 경기 끝나고 한 판 더 해. 심판은 없고 규칙은 하나야. 정직하게.', { pose: 'back', expr: 'smirk' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_ginny_B: [
    SX('지니', '…같이 서자고?', { expr: 'flustered', pose: 'back' }),
    N('지니가 먼저 웃음을 터뜨렸다. 빗자루를 걷어차듯 발끝으로 밀며.'),
    GIN('좋아. 지금 그 말, 기억해 둘게. 경기에서 내가 먼저 골 넣으면 증인 서야 해. 이번엔 진짜 증인.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_ginny_C: [
    GIN('변명은 안 들을래.'),
    N('지니는 빗자루를 집어 들고 몸을 돌렸다. 노을 속에서 어깨선이 곧았다. 내 쪽은 보지 않았다.'),
    GIN('내일 경기에서 봐, 해리. 지켜 주지 말고, 지켜봐.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_t_luna: [
    bg('lake'), light('dim'), show('luna', 'calm', { gaze: 'down' }),
    N('금요일 해 질 녘, 호숫가 돌 위. 루나는 신발을 벗어 옆에 가지런히 놓고 호수를 보고 있었다.'),
    LUN('네가 계단 위치를 필치 씨한테 말했을 때, 나는 아무 말도 안 했지. 지금 말하려고.', 'FLAG_P2_STAIR_SEALED'),
    SX('루나', '내가 보여 준 건 내가 믿어서 보여 준 거야. 믿는다는 건 나만의 일이어서, 다른 사람이 대신하면 조금 아파. 소리는 안 나는데.', { pose: 'near', gaze: 'front' }),
    { t: 'choice', id: 'L-13', prompt: '루나가 조용히 나를 본다. 나는…', options: [
      opt('A', '"미안해. 네 이야기를 네가 하기 전에 대신 말한 건 내 실수였어."', { fx: ['luna.trust+3', 'luna.wariness-2', 'flag:FLAG_LUN_REPAIRED'], goto: 'ch2_eve_t_luna_A' }),
      opt('B', '"무서웠어. 네가 다칠까 봐. 그래서 서둘렀어."', { fx: ['luna.affinity+1', 'luna.trust+1'], goto: 'ch2_eve_t_luna_B' }),
      opt('C', '"그게 최선이었어. 위험했잖아."', { fx: ['luna.trust-2', 'luna.wariness+3', 'flag:FLAG_LUN_DISTANT'], goto: 'ch2_eve_t_luna_C' }),
    ] },
  ],
  ch2_eve_t_luna_A: [
    LUN('…응. 사과는 소리가 나네. 좋은 소리야.'),
    SX('루나', '용서한다는 말은 필요 없는 것 같아. 내가 여기 앉아 있으니까, 그게 대답이야.', { pose: 'tilt', expr: 'smile' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_luna_B: [
    LUN('무서웠구나. 무서운 건 이상한 일이 아니야. 이상한 건, 무서운데 말하지 않는 거.'),
    N('루나가 처음으로 내 쪽으로 몸을 돌렸다. 거리는 그대로였지만 호수의 소리가 한 겹 낮아진 것 같았다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_luna_C: [
    LUN('그렇구나. 네가 그렇게 믿었다면 그건 네 진실이야.'),
    SX('루나', '내 진실은 조금 달라. 그래도 괜찮아. 진실이 서로 다른 건 이상한 게 아니니까. 다만 다음엔 같이 정하고 싶어.', { pose: 'back', gaze: 'side' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_t_pansy: [
    bg('courtyard'), light('dim'), show('pansy', 'blank', { gaze: 'front' }),
    N('금요일 저녁 안뜰. 판시가 벤치 팔걸이에 한 손을 걸친 채 나를 기다리고 있었다. 그냥 기다린 게 아니라, 기다리고 있다는 걸 알려 주려고 서 있는 자세였다.'),
    PAN('이번 주에 빠졌더라. 내가 아쉬워한 건 아니고, 계산에서 한 칸이 비었다는 얘기야.', 'FLAG_P2_STAYED_OUT'),
    PAN('도서관에서 그레인저랑 나란히 앉아 있는 걸 봤어. 아, 별일 아니야. 별일 아닌 건 알아. 다만 내가 그 책상에 먼저 앉았거든.', 'REACT_pansy_hermione>=1 && REACT_pansy_hermione<=4'),
    PAN('웨즐리랑 관중석에서 얘기하는 것도 봤어. 슬리데린 쪽 정찰 중이었으니까 어쩔 수 없었지.', 'REACT_pansy_ginny>=1 && REACT_pansy_ginny<=4'),
    SX('판시', '…솔직히 말해 줄까? 이건 질투가 아니라 상황 정리야. 누가 누구 옆에 서 있는지 알아야 내 자리가 보이거든.', { pose: 'close', expr: 'smirk' }),
    cue('pause'),
    SX('판시', '(고개를 아주 조금 기울이고) 자, 포터. 이 상황에서 네 대답은?', { pose: 'near', gaze: 'front' }),
    { t: 'choice', id: 'L-14', prompt: '판시가 반응을 기다린다. 나는…', options: [
      opt('A', '"질투라고 해도 돼. 숨기는 쪽이 더 이상하니까."', { fx: ['pansy.trust+2', 'pansy.affinity+1', 'flag:FLAG_PAN_REPAIRED'], goto: 'ch2_eve_t_pansy_A' }),
      opt('B', '"네 자리가 어딘지 알고 싶으면 네가 말해. 난 그 자리에 맞춰 줄 수 있으니까."', { fx: ['pansy.affinity+2', 'stage:pansy+1'], goto: 'ch2_eve_t_pansy_B' }),
      opt('C', '"난 아무하고도 경쟁하고 있지 않아."라고 말한다.', { fx: ['pansy.trust-2', 'pansy.wariness+2', 'flag:FLAG_PAN_DISTANT'], goto: 'ch2_eve_t_pansy_C' }),
      opt('D', '"말포이한테 네가 한 말을 전부 전할 거야. 걔도 알아야 해."', { if: 'KN_PANSY_NIGHTS || KN_LETTER_PRESSURE || FLAG_P2_PROMISE_KEPT', fx: ['flag:FLAG_P2_BETRAYED_PANSY', 'pansy.trust-6', 'pansy.wariness+8', 'pansy.affinity-3', 'draco.wariness+3'], goto: 'ch2_eve_t_pansy_D' }),
    ] },
  ],
  ch2_eve_t_pansy_A: [
    SX('판시', '…!', { pose: 'back', expr: 'flustered', gaze: 'side' }),
    N('판시의 턱이 평소보다 반 뼘 낮아졌다. 눈은 마주치지 않으면서 입꼬리만 한 번 올라갔다가 급히 내려갔다.'),
    PAN('…예상 밖의 대답이잖아. 그렇게 쉽게 인정하면 내가 할 말이 없어지는데.'),
    SX('판시', '(작게) 좋아. 그럼 질투라고 해 둘게. 나만 그런 건 아니라는 거지.', { pose: 'near', expr: 'smirk' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_pansy_B: [
    SX('판시', '내가 정해? 내가?', { pose: 'tilt', expr: 'smirk' }),
    PAN('…꽤 건방진 말이네. 그런데 맞기도 해. 내 자리는 내가 정하는 거야, 누가 정해 주는 게 아니라.'),
    N('판시가 팔걸이에서 손을 뗐다. 천천히, 마치 나에게 시간을 주는 것처럼.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_pansy_C: [
    PAN('…아무하고도. 알겠어.'),
    N('판시는 벤치에서 손을 떼고 곧게 섰다. 공손한 자세였다. 이전의 거리보다 훨씬 멀어진 공손함이었다.'),
    SX('판시', '그럼 나도 아무한테도 지지 않을게. 같은 규칙이니까.', { pose: 'back', expr: 'blank', gaze: 'away' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_t_pansy_D: [
    SX('판시', '…뭐라고 했어?', { pose: 'back', expr: 'blank', gaze: 'front' }),
    N('판시의 눈에서 표정이 빠져나갔다. 놀람이 아니라 계산이 끝나는 얼굴이었다. 손이 올라갔다. 뺨에 닿기 직전에 멈췄다. 손끝이 떨렸다.'),
    PAN('약속이라고 했잖아. 그 한 마디를 믿은 내가 바보였네.'),
    SX('판시', '걔가 알면 나는 슬리데린에서 앉을 자리가 없어져. 알고 한 거지? 알면서.', { pose: 'close', expr: 'angry' }),
    N('대답할 수 있는 말이 없었다. 판시는 손을 내리고 아주 정중하게 고개를 숙였다. 가장 멀어진 거리의 인사였다.'),
    PAN('다음엔 포터 씨라고 부를게. 다른 사람들처럼.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  /* 말포이의 갈등은 원인이 둘이다: 판시와 얽힌 직접 대화 주선(p) / E 경로의 약속 위반·교수 보고(e). 일어나지 않은 일을 전제하지 않는다 */
  ch2_eve_t_draco: [iff('FLAG_P2_E_BETRAYED || FLAG_P2_E_REPORTED', 'ch2_eve_t_draco_e', 'ch2_eve_t_draco_p')],
  ch2_eve_t_draco_e: [
    bg('potions'), light('dim'), show('draco', 'calm', { pose: 'stand', gaze: 'front' }),
    N('금요일 저녁 마법약 교실 앞 복도. 말포이가 인계대 앞에서 쓰던 그 자세 그대로 벽에 기대 서 있었다. 이번에는 먼저 말을 꺼내지 않았다.'),
    D('인계대에서 내가 한 말, 기억하지. "내가 있던 곳은 적지 마."', 'FLAG_P2_E_BETRAYED'),
    D('스네이프 교수님 앞에서 내 이름이 나왔다던데. 약속의 범위가 어디까지였는지는 네가 제일 잘 알겠지.', 'FLAG_P2_E_BETRAYED'),
    D('슬러그혼 교수님 앞에서 해명하는 건 어렵지 않았어. 어려운 건 네가 아무 말도 없이 먼저 데려갔다는 거지.', 'FLAG_P2_E_REPORTED && !FLAG_P2_E_BETRAYED'),
    DX('사과를 기대하는 건 아니야. 어떻게 할 건지만 말해.', { expr: 'blank', gaze: 'front', pose: 'guard' }),
    { t: 'choice', id: 'L-15', prompt: '말포이가 내 대답을 기다린다. 나는…', options: [
      opt('A', '내가 한 말과 행동을 그대로 인정하고, 손해를 어떻게 메울지 묻는다.', { fx: ['draco.respect+2', 'draco.trust+1', 'flag:FLAG_DRA_REPAIRED'], goto: 'ch2_eve_t_draco_e_A' }),
      opt('B', '"그때는 그게 안전이라고 판단했어."라고 변명 없이 이유만 말한다.', { fx: ['draco.wariness+1', 'draco.respect+1'], goto: 'ch2_eve_t_draco_e_B' }),
      opt('C', '"네가 먼저 말했어야 해."라고 맞선다.', { fx: ['draco.wariness+3', 'draco.trust-1', 'flag:FLAG_DRA_DISTANT'], goto: 'ch2_eve_t_draco_e_C' }),
    ] },
  ],
  ch2_eve_t_draco_e_A: [
    D('…메우는 방법. 그게 질문이 되는군.'),
    N('말포이가 벽에서 등을 뗐다. 소매 끝을 한 번 당겨 내리는 습관이 이번엔 천천히 나왔다.'),
    D('내일 경기 전에는 나한테 말 걸지 마. 경기 뒤에도 먼저 걸지 마. 내가 정하면 그때 해.', undefined, 'FLAG_P2_E_BETRAYED'),
    D('앞으로 학교에 알려야 하는 일이면 먼저 나한테 말해. 알리는 건 막지 않아. 순서를 지키라는 거야.', undefined, 'FLAG_P2_E_REPORTED && !FLAG_P2_E_BETRAYED'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_draco_e_B: [
    D('안전이라는 이유. 네가 정한 안전.'),
    N('그는 한참 내 얼굴을 보다가 먼저 시선을 돌렸다. 틀렸다고 말하지는 않았다. 맞다고 말하지도 않았다.'),
    D('…이유를 말한 건 인정하지. 그게 용서는 아니야.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_draco_e_C: [
    SX('드레이코', '…내가?', { expr: 'angry', pose: 'guard', gaze: 'front' }),
    D('내가 말할 수 있는 상황이었다면 약속을 만들 필요도 없었어, 포터.'),
    N('말포이는 문을 닫듯이 돌아섰다. 닫는 문이 없는데도 닫히는 소리가 났다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_draco_p: [
    bg('potions'), light('dim'), show('draco', 'calm', { pose: 'stand', gaze: 'front' }),
    N('금요일 저녁 마법약 교실 앞 복도. 말포이가 팔짱을 낀 채 벽에 기대 서 있었다. 내가 올 줄 알았다는 듯.'),
    D('판시한테서 들었어. 네가 나에 대해 이야기하자고 했다고. 내 이름으로, 내 허락 없이.'),
    DX('걱정이었다고? 걱정은 상대가 요청할 때 하는 거야, 포터.', { expr: 'angry', pose: 'guard' }),
    D('…어쨌든. 판시가 너한테 말했다는 건 그만큼 곤란했다는 거겠지. 그건 내 책임이야. 네 책임이 아니라.'),
    { t: 'choice', id: 'L-15', prompt: '말포이가 나를 똑바로 보며 기다린다. 나는…', options: [
      opt('A', '"허락 없이 말한 건 맞아. 하지만 판시가 혼자 짊어지고 있는 것 같아서 그랬어."', { fx: ['draco.respect+2', 'draco.trust+1', 'flag:FLAG_DRA_REPAIRED'], goto: 'ch2_eve_t_draco_A' }),
      opt('B', '"네가 말했으면 나는 안 했을 거야."', { fx: ['draco.wariness+1', 'draco.respect+1'], goto: 'ch2_eve_t_draco_B' }),
      opt('C', '"넌 아무에게도 도움을 청하지 않으면서 도움받는 걸 싫어하잖아."', { fx: ['draco.wariness+3', 'draco.trust-1', 'flag:FLAG_DRA_DISTANT'], goto: 'ch2_eve_t_draco_C' }),
      opt('D', '말포이의 멱살을 잡는다. "판시가 이번 주에 어떤 꼴이었는지 알아?"', { fx: ['flag:FLAG_P2_FIGHT_DRACO', 'draco.respect+2', 'draco.trust-3', 'draco.wariness+6', 'stat.will+1', 'stat.social-1'], goto: 'ch2_eve_t_draco_D' }),
    ] },
  ],
  ch2_eve_t_draco_A: [
    SX('드레이코', '…판시 이야기를 하니까 반박이 안 되는군.', { expr: 'blank', gaze: 'down', pose: 'back' }),
    D('고마워는 안 한다. 대신 한 가지만. 앞으로 내 이름이 나오는 대화는 내가 있는 곳에서 해.'),
    N('명령처럼 들렸지만, 목소리 끝이 조금 낮았다. 요구라기보다 부탁에 가까운.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_draco_B: [
    D('그래. 그 정도 정직은 인정하지.'),
    N('그가 벽에서 등을 떼고 내 옆을 지나갔다. 지나치면서 어깨가 아주 잠깐 스쳤다. 사과도 인사도 아닌 접촉이었다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_t_draco_C: [
    SX('드레이코', '…그 말은 틀리지 않았지만, 해서는 안 되는 말이었어.', { expr: 'angry', pose: 'guard', gaze: 'front' }),
    D('내일 경기에서 봐, 포터. 이름을 걸고 이길 테니까.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_t_draco_D: [
    cue('shake'),
    N('손이 먼저 나갔다. 말포이의 로브 깃이 내 주먹 안에서 구겨졌다. 그의 등이 벽에 닿는 소리가 복도에 울렸다.'),
    SX('드레이코', '…놔.', { expr: 'angry', pose: 'guard', gaze: 'front' }),
    D('놓으라고 했어, 포터. 두 번 말하지 않는다.'),
    N('놓지 않았다. 말포이의 주먹이 내 턱을 스쳤다. 맞은 자리가 뜨거웠다. 나도 한 번 휘둘렀고, 빗나갔고, 벽이 손등을 때렸다.'),
    cue('flash'),
    SNA('두 사람. 지금 당장.'),
    show('snape', 'calm'),
    N('복도 끝에 스네이프가 서 있었다. 얼마나 지켜봤는지는 알 수 없었다. 그가 먼저 본 것은 말포이의 터진 입술이 아니라 내 구겨진 소매였다.'),
    SNA('포터, 방금 이 복도에서 일어난 일을 설명하는 건 자네 몫이다. 말포이 군은 이미 징계 중이니 이번엔 기숙사 점수가 아니라 시간으로 갚게 하지.'),
    N('결과는 이튿날 아침에 나왔다. 그리핀도르는 이십 점을 잃었고 나는 토요일 오전을 필치의 트로피 진열실에서 보내게 되었다. 소문은 점심 전에 성 전체에 퍼졌다.'),
    show('draco', 'blank', { pose: 'stand', gaze: 'side' }),
    D('…한 가지만 인정하지. 방금 그 주먹은 가짜가 아니었어.'),
    N('입술의 피를 소매로 닦으며 그가 처음으로 나를 똑바로 보았다. 호의는 아니었다. 그러나 이전에 없던 종류의 정직이었다.'),
    fx('flag:FLAG_P2_DETENTION', 'flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  /* ---------- 친밀(관계 조건 충족) ---------- */
  ch2_eve_i_hermione: [
    bg('library'), light('warm'), show('hermione', 'calm', { pose: 'near', gaze: 'down' }),
    N('금요일 저녁 도서관 문 닫기 직전. 헤르미온느가 접은 양피지 한 장을 내게 건넸다. 평소와 달리 접힌 면이 손끝에서 한 번 더 접혀 있었다.'),
    N('양피지에는 그녀의 정돈된 글씨로 세 줄이 적혀 있었다. "가설: 나는 해리 포터와 연구가 아닌 이유로 함께 있고 싶다. 근거: 아직 부족함. 검증 방법: ?"'),
    cue('pause'),
    SX('헤르미온느', '…읽었어? 그럼 돌려줘. 아니, 돌려주지 않아도 돼. 사실은 돌려받고 싶지 않아.', { pose: 'back', gaze: 'side', expr: 'flustered' }),
    SX('헤르미온느', '답을 요구하는 게 아니야. 오늘 밤은 내 가설을 말하는 날이야. 반증 자료는 내일 경기 이후에 받아도 돼.', { pose: 'near', gaze: 'front', expr: 'calm' }),
    { t: 'choice', id: 'L-01', prompt: '헤르미온느가 숨을 한 번 고르고 내 대답을 기다린다. 나는…', options: [
      opt('A', '"검증해 보자. …손을 잡아도 돼?"', { fx: ['hermione.trust+2', 'hermione.affinity+3', 'stage:hermione+1', 'romance:hermione=open', 'flag:FLAG_HER_OPEN'], goto: 'ch2_eve_i_hermione_A' }),
      opt('B', '"나도 같은 가설이야. 그런데 지금은 시간을 두고 싶어."', { fx: ['hermione.trust+2', 'hermione.affinity+1', 'stage:hermione+1', 'flag:FLAG_HER_SLOW'], goto: 'ch2_eve_i_hermione_B' }),
      opt('C', '"고마워. 하지만 지금은 연구와 경기에 집중하고 싶어."', { fx: ['hermione.trust+1', 'flag:FLAG_HER_DECLINED_GENTLY'], goto: 'ch2_eve_i_hermione_C' }),
    ] },
  ],
  ch2_eve_i_hermione_A: [
    SX('헤르미온느', '…물어봐 줘서 고마워. 가설 검증에서 가장 중요한 건 대상의 동의야.', { expr: 'smile', pose: 'near', gaze: 'down' }),
    N('그녀가 먼저 내 손바닥 위에 손가락을 하나씩 올렸다. 잉크가 묻은 손가락이었다. 차갑지 않았다.'),
    cue('pause'),
    HER('…심박수가 올라가는 건 관찰 대상이 아니라 관찰자 쪽이었네.'),
    N('나는 웃었고, 그녀도 웃었다. 사서가 문 앞에서 헛기침을 했다. 우리는 서로의 손을 놓지 않은 채 같이 일어섰다. 그 이상은 오늘 밤 우리 둘만의 기록으로 남겼다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_hermione_B: [
    HER('…시간. 그래, 시간은 중요한 변수야.'),
    N('헤르미온느는 크게 숨을 내쉬었다. 거절당한 사람의 숨이 아니라 짐을 내려놓은 사람의 숨이었다.'),
    SX('헤르미온느', '그럼 시간 동안 같이 있어 줘. 이유는 연구여도 괜찮아. 이유가 연구만이 아니면 더 좋고.', { pose: 'near', expr: 'smile' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_hermione_C: [
    HER('…그렇구나. 알겠어.'),
    N('그녀의 어깨가 아주 조금 내려갔다. 곧바로 다시 올라갔다. 헤르미온느 그레인저는 거절을 처벌로 쓰지 않는 사람이었다.'),
    SX('헤르미온느', '고마워. 솔직하게 말해 줘서. 그게 나한테는 어떤 대답보다 중요해. 연구는 계속하자.', { pose: 'stand', expr: 'calm' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_i_ginny: [
    bg('pitch'), light('warm'), show('ginny', 'calm', { pose: 'near' }),
    N('금요일 해 질 녘 경기장. 연습이 끝나고 모두가 돌아간 뒤에도 지니는 골대 아래에 서 있었다. 노을이 그녀의 머리색을 그대로 불꽃처럼 만들고 있었다.'),
    GIN('딱 한 가지만 물어볼게. 대답 안 해도 돼. 근데 거짓말은 하지 마.'),
    cue('pause'),
    SX('지니', '해리, 너 나 좋아해?', { pose: 'close', gaze: 'front', expr: 'smirk' }),
    N('지니의 얼굴이 손바닥 한 뼘 앞에서 웃고 있었다. 그런데 웃음 아래에서 눈은 아주 진지했다. 내가 당황하는 걸 즐기면서, 동시에 정말로 대답을 기다리는 눈이었다.'),
    { t: 'choice', id: 'L-02', prompt: '지니의 눈이 내 눈 높이에서 떨어지지 않는다. 나는…', options: [
      opt('A', '"응, 좋아해. …그런데 네가 불편하면 바로 말해."', { fx: ['ginny.affinity+3', 'ginny.trust+2', 'stage:ginny+1', 'romance:ginny=open', 'flag:FLAG_GIN_OPEN'], goto: 'ch2_eve_i_ginny_A' }),
      opt('B', '"…그건 경기 끝나고 대답할게."', { fx: ['ginny.affinity+1', 'ginny.trust+1', 'stage:ginny+1', 'flag:FLAG_GIN_SLOW'], goto: 'ch2_eve_i_ginny_B' }),
      opt('C', '"아니, 지금은 그런 마음이 아니야."', { fx: ['ginny.trust+1', 'flag:FLAG_GIN_DECLINED_GENTLY'], goto: 'ch2_eve_i_ginny_C' }),
    ] },
  ],
  ch2_eve_i_ginny_A: [
    SX('지니', '…와.', { pose: 'back', expr: 'flustered' }),
    N('지니가 먼저 한 걸음 뒤로 물러났다. 놀란 사람처럼. 그리고 웃었다. 이번엔 장난이 빠진 웃음이었다.'),
    GIN('이렇게 직선으로 나올 줄 몰랐어. 나 당황했잖아. …좋아. 그럼 나도 직선으로 갈게.'),
    SX('지니', '나도 좋아해. 근데 키스는 경기 끝나고. 이기면 두 배로 하고, 지면 위로로 하고. 어때?', { pose: 'near', expr: 'smirk' }),
    H('…네가 허락한 만큼만.'),
    GIN('좋아. 기억해 둬. 내가 정하는 속도로.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_ginny_B: [
    GIN('경기 끝나고? 도망친 건가?'),
    SX('지니', '아니야. 도망친 게 아니라 정한 거네. 그럼 좋아. 기다릴게. 진짜로 기다리는 건 처음이야.', { pose: 'near', expr: 'smirk' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_ginny_C: [
    GIN('…그래. 솔직해서 다행이야.'),
    N('지니는 눈을 한 번 깜빡이고 어깨를 으쓱했다. 상처가 없지 않았지만, 상처를 상대에게 빚으로 돌리는 사람이 아니었다.'),
    GIN('그럼 경쟁자로 계속 가자. 내일 경기에서 봐. 마음 바뀌어도 내가 정하는 건 내가 정해.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_i_luna: [
    bg('lake'), light('dim'), show('luna', 'calm', { gaze: 'front', pose: 'tilt' }),
    N('금요일 해 질 녘 호숫가. 루나는 평소처럼 돌 위에 앉아 있었다. 발끝이 물에 닿을락 말락 했다.'),
    LUN('해리, 질문이 있어. 대답은 안 해도 돼. 질문이 먼저 하고 싶어서.'),
    SX('루나', '사람이 누군가에게 입을 맞추고 싶어진다는 건 어떤 기분이야? 난 아직 정확히 몰라서. 그런데 요즘 너를 보면, 그게 뭔지 알 것 같은 느낌이 들어.', { pose: 'near', gaze: 'front', expr: 'calm' }),
    N('나는 말문이 막혔다. 얼굴이 뜨거워졌다. 루나는 내가 당황한 것을 알아채고도 평소처럼 태연했다. 그 태연함이 진심에서 나온다는 게 오히려 더 당황스러웠다.'),
    cue('pause'),
    SX('루나', '내가 확인해 봐도 돼? 싫다고 하면 바로 멈출게. 싫다는 말도 정보니까.', { pose: 'close', expr: 'calm' }),
    { t: 'choice', id: 'L-03', prompt: '루나가 숨결이 느껴질 만큼 가까이에서 내 대답을 기다린다. 나는…', options: [
      opt('A', '"…응. 확인해 봐."', { fx: ['luna.affinity+3', 'luna.trust+2', 'stage:luna+1', 'romance:luna=open', 'flag:FLAG_LUN_OPEN'], goto: 'ch2_eve_i_luna_A' }),
      opt('B', '"나도 정확히 몰라. 같이 천천히 알아보자."', { fx: ['luna.affinity+1', 'luna.trust+2', 'stage:luna+1', 'flag:FLAG_LUN_SLOW'], goto: 'ch2_eve_i_luna_B' }),
      opt('C', '"지금은 안 될 것 같아. 미안해."', { fx: ['luna.trust+1', 'flag:FLAG_LUN_DECLINED_GENTLY'], goto: 'ch2_eve_i_luna_C' }),
    ] },
  ],
  ch2_eve_i_luna_A: [
    N('루나의 입술은 아주 짧게, 아주 가볍게 닿았다. 호수 위로 바람 한 줄이 지나가는 만큼의 시간이었다.'),
    cue('pause'),
    SX('루나', '…아.', { pose: 'back', expr: 'calm', gaze: 'down' }),
    LUN('이런 거구나. 설명할 수 없는데 정확해. 고마워, 해리. 알려 줘서.'),
    N('그녀는 평소처럼 태연히 일어나 신발을 신었다. 그런데 그 손끝이 신발끈을 세 번이나 다시 묶었다. 그걸 놀리지 않고, 나는 같이 걸었다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_luna_B: [
    LUN('같이 천천히. 좋아. 그건 내가 제일 좋아하는 속도야.'),
    SX('루나', '질문은 남겨 둘게. 필요할 때 다시 묻는 질문은 더 좋아져. 숙성돼서.', { pose: 'tilt', expr: 'smile' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_luna_C: [
    LUN('알겠어. 알려 줘서 고마워.'),
    N('루나는 정말로 조금도 상처받지 않은 표정이었다. 그러나 호수를 보는 시간이 평소보다 아주 조금 길었다.'),
    SX('루나', '질문은 거절당해도 질문이야. 나는 그게 좋아. 친구로는 계속 있어도 돼?', { pose: 'near', expr: 'calm' }),
    H('…응. 계속 있자.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  /* REL-01: 밤의 조건은 **선택 전** 신뢰값으로 판정한다. 이 장면의 선택 보상(신뢰+2)이 같은 장면의 진입 조건에 선반영되지 않도록 장면 진입 시점에 플래그로 고정한다 */
  ch2_eve_i_pansy: [iff('FLAG_P2_PAN_CONFIDED && pansy.trust>=10', 'ch2_eve_i_pansy_gate', 'ch2_eve_i_pansy_body')],
  ch2_eve_i_pansy_gate: [fx('flag:FLAG_PAN_NIGHT_OPEN'), go('ch2_eve_i_pansy_body')],
  ch2_eve_i_pansy_body: [
    bg('courtyard'), light('dim'), show('pansy', 'smirk', { pose: 'near', gaze: 'front' }),
    N('금요일 밤, 슬리데린 쪽 별관 복도. 통금 십 분 전. 판시가 벽에 한 손을 짚고 길을 막았다.'),
    SX('판시', '여기까지 따라오는 거 용기야, 바보야?', { pose: 'near', expr: 'smirk' }),
    N('판시는 천천히 한 걸음 다가왔다. 한 걸음, 그리고 한 걸음. 다섯 걸음의 거리가 두 걸음이 되었고, 한 걸음이 되었다.'),
    cue('zoom'),
    SX('판시', '(올려다보며, 아주 작게) 도망칠 거야, 안 도망칠 거야?', { pose: 'close', gaze: 'front', expr: 'smirk' }),
    cue('pause'),
    N('나는 한 발도 움직이지 않았다. 판시의 입꼬리가 아주 조금 떨렸다. 시험하는 쪽이 시험받는 쪽보다 먼저 흔들리는 순간이었다.'),
    { t: 'choice', id: 'L-04', prompt: '판시가 한 뼘 앞에서 내 반응을 기다린다. 나는…', options: [
      opt('A', '"원하는 게 뭐야? 말해 주면 맞춰 줄게."', { fx: ['pansy.trust+2', 'pansy.affinity+2', 'stage:pansy+1', 'flag:FLAG_PAN_SLOW'], goto: 'ch2_eve_i_pansy_A' }),
      opt('B', '"…가도 돼? 네가 허락하면."', { fx: ['pansy.affinity+3', 'pansy.trust+2', 'stage:pansy+1', 'romance:pansy=open', 'flag:FLAG_PAN_OPEN'], goto: 'ch2_eve_i_pansy_B' }),
      opt('C', '웃으며 한 걸음 물러선다. "오늘은 여기까지."', { fx: ['pansy.trust+1', 'flag:FLAG_PAN_DECLINED_GENTLY'], goto: 'ch2_eve_i_pansy_C' }),
    ] },
  ],
  ch2_eve_i_pansy_A: [
    SX('판시', '…뭐?', { pose: 'back', expr: 'flustered', gaze: 'side' }),
    PAN('그게… 아니, 그런 식으로 물으면 내가 정해야 하잖아. 내가 시험하는 건데.'),
    N('판시의 귀가 붉어졌다. 입술이 두 번 열렸다 닫혔다.'),
    SX('판시', '…지금은 아직. 근데 질문은 좋았어. 이 정도면 합격이야.', { pose: 'near', expr: 'smirk' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_pansy_B: [
    SX('판시', '…묻네.', { pose: 'tilt', expr: 'flustered' }),
    PAN('이런 건 보통 묻는 게 아니야. 알아서 하는 거지. …그런데 가끔은 묻는 것도 나쁘진 않네.'),
    cue('pause'),
    SX('판시', '(작게) …해도 돼.', { pose: 'close', gaze: 'down' }),
    N('입술이 짧게 닿았다. 판시는 키스 직후에도 지지 않으려는 표정으로 눈을 떴지만, 어깨가 먼저 내려앉았다.'),
    SX('판시', '이건 소문 나면 나 슬리데린에서 끝이야. 알지? 그러니까 말하지 마.', { pose: 'back', expr: 'smirk' }),
    H('안 해. 약속할게.'),
    PAN('…그 말, 믿는다고 한 적 없어. 지켜 줘.'),
    fx('flag:FLAG_EVE_DONE'),
    iff('FLAG_PAN_NIGHT_OPEN', 'ch2_eve_i_pansy_night', 'ch2_match'),
  ],
  /* 이어지는 밤: 서로의 의사를 말로 확인한 뒤 장면을 전환한다. 직접 묘사 없음, 다음 날의 감정·비밀·후폭풍으로 이어진다 */
  ch2_eve_i_pansy_night: [
    SX('판시', '…통금까지 십 분 남았어. 별관 끝 방은 비어 있어. 열쇠는 내가 가지고 있고.', { pose: 'near', gaze: 'down', expr: 'blank' }),
    cue('pause'),
    SX('판시', '(고개를 들어) 내가 정하는 거야. 네가 "그래"라고 하든 "아니"라고 하든, 둘 다 틀린 대답이 아니야. 알겠어?', { pose: 'close', gaze: 'front' }),
    { t: 'choice', id: 'L-21', prompt: '판시가 열쇠를 쥔 손을 내 앞에 내민다. 나는…', options: [
      opt('A', '"…네가 원한다면. 네가 멈추자고 하면 바로 멈출게."', { fx: ['flag:FLAG_PAN_NIGHT', 'pansy.trust+2', 'pansy.affinity+3', 'pansy.wariness+2'], goto: 'ch2_eve_i_pansy_night_A' }),
      opt('B', '"오늘은 여기까지 하자. 서두를 필요 없어."', { fx: ['flag:FLAG_PAN_NIGHT_DECLINED', 'pansy.trust+3', 'pansy.affinity+1'], goto: 'ch2_eve_i_pansy_night_B' }),
    ] },
  ],
  ch2_eve_i_pansy_night_A: [
    SX('판시', '…멈추자고 하면, 이라고 했어.', { pose: 'back', gaze: 'side', expr: 'flustered' }),
    PAN('그 말이 먼저 나온 사람은 처음이야. …따라와.'),
    trans('같은 밤, 별관 끝 방', '슬리데린 별관'),
    N('문이 닫혔다. 열쇠 돌아가는 소리가 한 번 났고, 그 뒤의 일은 우리 둘만의 기록으로 남겼다.'),
    N('통금 종이 울릴 때까지 아무도 그 문을 두드리지 않았다.'),
    go('ch2_match'),
  ],
  ch2_eve_i_pansy_night_B: [
    PAN('…그래. 서두를 필요 없다고 했지.'),
    SX('판시', '(열쇠를 소매에 넣으며, 작게) 네가 먼저 "아니"라고 말한 사람이라서, 나는 다음에도 "좋아"라고 말할 수 있을 것 같아.', { pose: 'near', expr: 'smirk' }),
    go('ch2_match'),
  ],

  ch2_eve_i_pansy_C: [
    SX('판시', '…뭐야, 물러나?', { pose: 'tilt', expr: 'blank' }),
    N('잠깐 표정이 흔들렸다. 그러나 판시는 곧 웃음으로 덮었다. 그 웃음이 방금보다 반 박자 늦었다.'),
    PAN('좋아. 오늘은 내가 졌다고 해 줄게. 하지만 다음엔 내가 먼저 안 물러서.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],

  ch2_eve_i_draco: [
    bg('potions'), light('dim'), show('draco', 'smirk', { pose: 'stand', gaze: 'front' }),
    N('금요일 저녁 마법약 교실. 징계 시간은 아니었다. 그런데 말포이가 솥 사이에 서서 나를 기다리고 있었다. 눈 밑이 어두웠다.'),
    D('내일 경기에서 내가 이기면 질문 하나에 대답해. 어떤 질문이든. 반대로 네가 이기면 나도 한다.'),
    D('겁나면 지금 거절해도 돼. 그럼 내가 이긴 걸로 하지.'),
    cue('pause'),
    { t: 'choice', id: 'L-05', prompt: '말포이가 팔짱을 낀 채 도발하듯 나를 본다. 그런데 눈 밑 그늘이 선명하다. 나는…', options: [
      opt('A', '"좋아. 그 대신 이겨도 지금 자러 가. 잠 못 잤잖아."', { fx: ['draco.trust+2', 'draco.respect+1', 'draco.wariness-2', 'flag:FLAG_DRA_SOFT'], goto: 'ch2_eve_i_draco_A' }),
      opt('B', '"질문은 너만 하는 게 아니야. 나도 할 거야."', { fx: ['draco.respect+3', 'draco.wariness+1'], goto: 'ch2_eve_i_draco_B' }),
      opt('C', '"거절할게. 내기 말고 정정당당하게 하자."', { fx: ['draco.respect+2', 'draco.trust+1'], goto: 'ch2_eve_i_draco_C' }),
    ] },
  ],
  ch2_eve_i_draco_A: [
    SX('드레이코', '…뭐?', { pose: 'back', expr: 'flustered', gaze: 'side' }),
    D('잠은 내가 알아서 자. 네가 신경 쓸 일이…'),
    N('말포이가 말을 끝내지 못했다. 반박할 문장을 찾지 못한 사람의 얼굴이었다. 입술이 한 번 열렸다가 닫혔다.'),
    DX('…이상한 녀석이군.', { expr: 'blank', gaze: 'down', pose: 'slumped' }),
    D('질문은 경기 후에 하지. …네 말대로 자겠어. 한 번만.'),
    N('그는 솥 사이를 빠져나가며 어깨가 스쳤다. 일부러였는지 실수였는지 알 수 없었다. 그 접촉이 늦게까지 남았다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_draco_B: [
    D('…좋아. 서로 하나씩. 규칙은 단순해야 하니까.'),
    DX('질문은 신중히 골라 둬, 포터. 나도 그럴 테니까.', { expr: 'smirk', pose: 'near' }),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
  ch2_eve_i_draco_C: [
    D('…정정당당. 그 말을 네 입에서 들으니 낯설군.'),
    N('말포이가 시선을 내렸다. 도발이 힘을 잃은 자리에서, 그는 어떤 표정을 지을지 한참 정하지 못했다.'),
    fx('flag:FLAG_EVE_DONE'), go('ch2_match'),
  ],
}
