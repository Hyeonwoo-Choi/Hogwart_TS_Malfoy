import type { Scenario } from '../engine/types'
import { END, GIN, HER, LUN, N, PAN, SX, bg, cue, fx, go, iff, opt, show } from './dsl'

/**
 * 챕터 2 경로 행사(목·금 오후, 경기 직전). 경로 조건(FLAG_P2_*)을 만족할 때만 게시판과 지도에 나타난다.
 * 놓쳐도 챕터 진행에는 영향이 없고, 경로의 기본 단서(KN_KNOT_BLOCK 등)는 월요일 시작 사건에서 이미 주어진다.
 * 상대와의 신뢰·관계 단계가 충분하면 이 행사에서만 열리는 가설·고백이 추가된다(비밀 공유 루트).
 * 증인(meet: …@…)은 일정표상 같은 장소·시간에 있는 사람만이다(질투·반응 훅의 근거).
 */
export const V2C2E: Scenario = {
  /* ---------- A. 연구: 금 오후2 도서관 (판시도 같은 도서관에 있다) ---------- */
  ev2_research: [
    bg('library'), show('hermione', 'calm', { gaze: 'down' }),
    N('금요일 오후의 도서관. 헤르미온느는 서가 사이의 긴 책상에 책 세 권과 양피지를 펼쳐 놓고 있었다. 창가 쪽 구석에서는 판시가 책을 펴 놓고 이쪽을 보지 않는 척하고 있었다.'),
    N('서명된 허가서가 책 사이에 끼워져 있었다. 슬러그혼의 필체가 평소보다 훨씬 큼직했다.', 'FLAG_P2_PERMIT_OK'),
    N('맥고나걸의 서명이 아래에 있었다. 사서의 서명이 하나 더 필요했는데, 헤르미온느는 그것을 이미 받아 놓았다.', 'FLAG_P2_REPORTED_MCG'),
    N('그녀는 내가 필사해 온 쪽을 책 사이에 끼워 두고, 그 쪽이 맞는지 원문과 한 줄씩 대조하는 중이었다.', 'FLAG_P2_BREACH'),
    HER('왔어? 앉아. …오늘은 방법을 정해야 해. 한 줄씩 소리 내어 같이 읽을지, 내가 해석하고 네가 확인할지.'),
    { t: 'choice', id: 'Q-05', prompt: '펼쳐진 『고대 차단 주문의 구조』 앞에서 나는…', options: [
      opt('A', '"한 줄씩 소리 내어 같이 읽자. 이해 안 되는 건 그 자리에서 물을게."', { fx: ['ev:ap2_research=ok', 'flag:FLAG_P2_RESEARCH_OK', 'kn:KN_KNOT_COLLIDE', 'hermione.trust+2', 'stage:hermione+1', 'meet:hermione@pansy'], goto: 'ev2_research_A' }),
      opt('B', '"해석은 네가 해. 난 책을 넘기고 출입을 지켜볼게."', { fx: ['ev:ap2_research=plain', 'kn:KN_KNOT_COLLIDE', 'hermione.trust+1', 'meet:hermione@pansy'], goto: 'ev2_research_B' }),
      opt('C', '"지금 읽은 내용을 맥고나걸 교수님께 가져가자. 우리 둘이 해결할 일이 아닐 수 있어."', { fx: ['ev:ap2_research=report', 'flag:FLAG_P2_REPORTED_FINDING', 'kn:KN_KNOT_COLLIDE', 'hermione.trust+1', 'hermione.wariness+1', 'meet:hermione@pansy'], goto: 'ev2_research_C' }),
    ] },
  ],
  ev2_research_A: [
    N('우리는 머리를 맞대고 한 줄씩 소리 내어 읽었다. 헤르미온느의 목소리가 내 목소리 위에 겹쳤다가 반 박자 앞서 갔다가 다시 맞았다.'),
    HER('"서로 다른 두 주문이 같은 자리에 닿으면, 어느 쪽도 의도한 결과를 내지 못하고 서로를 비튼다." — 여기. 그리고 다음 문장.'),
    SX('헤르미온느', '"비튼 결과는 두 주문을 건 사람 모두의 의도에서 벗어난다. 결과는 예측할 수 없으며, 되돌릴 방법은 기록되어 있지 않다."', { pose: 'near', gaze: 'down' }),
    N('말이 멈췄다. 그녀가 읽던 손가락 끝이 내 손등에 닿아 있었다는 걸, 둘 다 같은 순간에 알았다.'),
    cue('pause'),
    SX('헤르미온느', '…미안. 줄이 나뉘어서.', { pose: 'back', gaze: 'side', expr: 'flustered' }),
    N('그녀는 손을 거두었지만 그 손을 어디에 둘지 몰라 책장 모서리를 쥐었다. 이마의 곱슬머리 한 올이 흔들렸다.'),
    iff('stage.hermione>=2 && hermione.trust>=54', 'ev2_research_secret', 'ev2_research_end'),
  ],
  ev2_research_secret: [
    HER('…하나 더 말해도 돼? 가설이야. 증명이 안 됐으니까 확신이 아니라 가능성으로만 들어 줘.'),
    SX('헤르미온느', '이런 구조의 문은 혼자 있지 않아. 열리는 쪽이 있으면 닫히는 쪽이 있어. 쌍으로 만들었을 거야. 한쪽이 7층 벽이라면, 다른 쪽도 이 성 어딘가에 있다는 뜻이야.', { pose: 'near', gaze: 'front' }),
    HER('내가 이 가설을 아직 아무한테도 말하지 않은 건 틀릴까 봐서가 아니야. 맞을까 봐서야.'),
    N('나는 그 말을 오래 기억하게 될 것 같았다. 그녀가 가장 두려워하는 건 모르는 것이 아니라 알아 버리는 것이라는 사실도.'),
    fx('kn:KN_PAIR_HYPOTHESIS', 'flag:FLAG_P2_HER_CONFIDED', 'hermione.trust+1'),
    go('ev2_research_end'),
  ],
  ev2_research_B: [
    N('나는 책을 넘기고 문 쪽을 보았다. 헤르미온느는 내가 건넨 쪽마다 연필로 짧은 표시를 하며 중얼거렸다.'),
    HER('"…결과는 예측할 수 없으며, 되돌릴 방법은 기록되어 있지 않다." 이게 가장 중요한 문장이야. 그리고 이건 내가 그냥 읽어서 알게 된 문장이 아니라, 네가 책을 넘겨 준 덕에 읽을 수 있었던 문장이야.'),
    N('칭찬도 사과도 아닌 말이었다. 헤르미온느다운 감사였다. 나는 그걸 알아듣고 있다는 표시로 아무 말도 하지 않았다.'),
    go('ev2_research_end'),
  ],
  ev2_research_C: [
    HER('…가져가자고? 지금?'),
    SX('헤르미온느', '교수님께 보여 드리면 이건 우리 연구가 아니라 학교의 문제가 돼. 그게 옳다는 건 알아. 그런데… 해리, 나는 이게 내 손에 있는 동안 조금만 더 이해하고 싶어.', { gaze: 'down', pose: 'back' }),
    N('나는 대답하지 않고 기다렸다. 헤르미온느는 한참 뒤에야 고개를 끄덕였다.'),
    HER('…내일 아침에 같이 가자. 오늘은 마지막으로 한 번 더 읽고.'),
    go('ev2_research_end'),
  ],
  ev2_research_end: [
    show(null),
    N('창가 구석에서 판시가 책을 덮는 소리가 났다. 고개를 들자 판시는 이미 서가 사이로 사라지고 있었다. 그 시선이 누구를 보고 있었는지는 알 수 없었다.'),
    END,
  ],

  /* ---------- B. 퀴디치: 목 오후2 경기장 (판시가 관중석에 있다) ---------- */
  ev2_pitch: [
    bg('pitch'), show('ginny', 'calm', { pose: 'near' }),
    N('목요일 오후, 경기를 이틀 앞둔 마지막 정식 연습. 관중석 맨 위 칸에서 판시가 팔짱을 낀 채 앉아 있었다. 슬리데린 쪽 정찰이라는 건 누구나 아는 사실이었다.'),
    GIN('봤지? 나를 보러 온 거야. 영광이라고 할게. 근데 해리, 오늘은 네가 내 맞수를 해 줘.'),
    GIN('빗자루 점검은 이미 했어. 내가 직접.', 'FLAG_P2_LEFT_TO_GINNY'),
    GIN('후치 선생님이 점검한 빗자루야. 문제 없대. 문제는 내가 아니라 하늘이야.', 'FLAG_P2_HOOCH_CHECK'),
    { t: 'choice', id: 'Q-06', prompt: '급강하 대결 앞에서 나는…', options: [
      opt('A', '"좋아. 같이 날면서 네 급강하 각도를 읽을게. 창이 번쩍이는 순간도 같이 재 보자."', { fx: ['ev:ap2_pitch=ok', 'flag:FLAG_P2_PITCH_OK', 'kn:KN_FLASH_TIMING', 'ginny.trust+2', 'stage:ginny+1', 'meet:ginny@pansy'], goto: 'ev2_pitch_A' }),
      opt('B', '"진짜로 겨루자. 봐주면 네가 가장 싫어할 테니까."', { fx: ['ev:ap2_pitch=plain', 'ginny.affinity+2', 'stat.str+1', 'meet:ginny@pansy'], goto: 'ev2_pitch_B' }),
      opt('C', '"난 오늘은 쉬는 게 좋을 것 같아. 네 연습에 방해되고 싶지 않아."', { fx: ['ev:ap2_pitch=miss', 'ginny.trust-1', 'meet:ginny@pansy'], goto: 'ev2_pitch_C' }),
    ] },
  ],
  ev2_pitch_A: [
    N('우리는 나란히 올랐다. 지니가 급강하하는 동안 나는 반 박자 뒤에서 그 몸의 각도를 읽었다. 어깨가 열리는 한 박자, 빗자루 끝이 흔들리는 반 박자.'),
    cue('flash'),
    N('세 번째 강하에서 성 위쪽이 한 번 깜빡였다. 그리고 이십 분 뒤에 또 한 번. 지니는 손목시계를 보며 입술을 움직여 숫자를 셌다.'),
    GIN('이십 분 간격. 어제도 그랬어. 시계 없이도 맞출 수 있겠다. 아홉 시 이십 분. 아홉 시 사십 분.'),
    iff('stage.ginny>=2 && ginny.trust>=44', 'ev2_pitch_secret', 'ev2_pitch_end'),
  ],
  ev2_pitch_secret: [
    SX('지니', '이건 아무한테도 안 했던 얘기야. 새벽 연습하다가 한 번 본 적이 있어. 7층 창에서 사람 그림자가. 서 있었어. 한참을.', { pose: 'close', gaze: 'front' }),
    GIN('말포이처럼 보였어. 처럼, 이야. 확인한 건 아니야. 내가 틀릴 수도 있어. 하지만 해리, 내가 틀렸으면 좋겠다고 생각한 건 처음이었어.'),
    N('지니는 내 눈을 똑바로 보고 말했다. 질 것 같은 경기 앞에서도 한 번도 하지 않던 표정이었다.'),
    fx('kn:KN_GINNY_SAW_SHADOW', 'flag:FLAG_P2_GIN_CONFIDED', 'ginny.trust+1'),
    go('ev2_pitch_end'),
  ],
  ev2_pitch_B: [
    N('봐주지 않았다. 지니는 첫 번째 강하에서 나를 두 칸 앞질렀고, 두 번째에서는 내가 반 칸을 만회했고, 세 번째에서는 같은 지점에 거의 동시에 닿았다.'),
    GIN('이게 좋아. 이런 게 좋아. 이겨도 지는 느낌이 안 나는 사람이랑 하는 거.'),
    SX('지니', '(숨을 몰아쉬며 웃고) 해리 포터, 네가 나한테 져 줄 일은 평생 없을 거야. 이건 약속이 아니라 경고야.', { pose: 'near', expr: 'smirk' }),
    go('ev2_pitch_end'),
  ],
  ev2_pitch_C: [
    N('지니의 얼굴이 한순간 멈췄다. 곧바로 표정을 되돌렸지만 눈 끝에서 뭔가가 한 줄 가라앉았다.'),
    GIN('…쉬어. 응. 쉬는 게 맞아. 나 혼자 해도 돼.'),
    N('지니는 빗자루를 어깨에 걸치고 혼자 올랐다. 관중석 맨 위 칸에서 판시가 고개를 아주 조금 기울이는 것이 보였다.'),
    go('ev2_pitch_end'),
  ],
  ev2_pitch_end: [
    show(null),
    N('훈련이 끝날 무렵 관중석의 판시는 이미 자리에 없었다. 계단 위에 한 줄의 메모 같은 눈길만 남아 있는 느낌이었다.'),
    END,
  ],

  /* ---------- C. 성의 비밀: 금 오후2 호숫가 (지니가 같은 시간 호숫가에 있다) ---------- */
  ev2_secret: [
    bg('lake'), show('luna', 'calm', { gaze: 'down' }),
    N('금요일 오후의 호수는 하늘을 그대로 담고 있었다. 루나는 평소처럼 맨발로 호숫가 돌 위에 앉아 있었고, 저쪽 끝 둔덕에서는 지니가 혼자 앉아 쉬고 있었다.'),
    LUN('왔구나. 낮에는 조용해서 좋아. 어젯밤엔 계단이 조금 시끄러웠어.'),
    LUN('내가 실을 묶어 둔 자리가 아직 있어. 아무도 건드리지 않았어. 건드렸다면 실이 바뀌었을 텐데.', 'FLAG_P2_STAIR_MARKED'),
    LUN('그 계단은 막혔지만, 막은 쪽 말고 다른 쪽도 있을 거야. 막으면 길이 옮겨 가거든.', 'FLAG_P2_STAIR_SEALED'),
    { t: 'choice', id: 'Q-07', prompt: '루나가 낮의 계단에 대해 묻는다. 나는…', options: [
      opt('A', '"낮에 한 번 더 확인하자. 소리가 나는 시간을 같이 적어 두는 거야."', { fx: ['ev:ap2_secret=ok', 'flag:FLAG_P2_SECRET_OK', 'kn:OB_STAIR_HUM', 'luna.trust+2', 'stage:luna+1', 'meet:luna@ginny'], goto: 'ev2_secret_A' }),
      opt('B', '"아무것도 안 해도 돼. 오늘은 그냥 호수를 보자."', { fx: ['ev:ap2_secret=plain', 'luna.affinity+2', 'stat.will+1', 'meet:luna@ginny'], goto: 'ev2_secret_B' }),
      opt('C', '"밤에 들어가 보고 싶어. 위험해도."', { fx: ['ev:ap2_secret=risk', 'flag:FLAG_P2_NIGHT_PLAN', 'luna.wariness+2', 'stat.will-1', 'meet:luna@ginny'], goto: 'ev2_secret_C' }),
    ] },
  ],
  ev2_secret_A: [
    N('우리는 호숫가에서 성의 서쪽 벽을 올려다보며 소리를 기다렸다. 세 번째 종이 울린 직후, 아주 낮은 웅웅거림이 호수 위를 건너왔다. 루나가 손가락을 하나 올렸다.'),
    LUN('지금. 숫자를 세 줘. 나는 소리를 셀게.'),
    N('열두 번. 우리는 같은 숫자를 세고 있었다. 마지막 소리가 사라지고 나서야 루나가 처음으로 내 눈을 똑바로 보았다.'),
    iff('stage.luna>=2 && luna.trust>=43', 'ev2_secret_secret', 'ev2_secret_end'),
  ],
  ev2_secret_secret: [
    SX('루나', '해리, 하나 말해도 돼? 나는 사람을 오래 보면 그 사람이 뭘 숨기는지 보여. 근데 너는 숨기는 게 하나 더 있어. 누군가를 위해서.', { pose: 'near', gaze: 'front', expr: 'calm' }),
    LUN('물어보지는 않을 거야. 대신 이건 알려 줄게. 이 소리는 문 쪽에서 나는 게 아니야. 문이 열리는 쪽에서 나는 거야. 닫는 쪽은 소리가 없어.'),
    N('루나는 무서운 이야기를 하는 사람이 아니라 날씨 이야기를 하는 사람처럼 말했다. 그래서 더 오래 마음에 남았다.'),
    fx('kn:KN_DOOR_DIRECTION', 'flag:FLAG_P2_LUN_CONFIDED', 'luna.trust+1'),
    go('ev2_secret_end'),
  ],
  ev2_secret_B: [
    N('우리는 호수를 보았다. 지니가 둔덕에서 돌 하나를 던졌고, 호수가 둥글게 물결을 만들었다.'),
    SX('루나', '아무것도 안 하는 날도 중요해. 아무것도 안 하다 보면 아무것도 아닌 게 아닌 걸 알게 되거든.', { pose: 'tilt', expr: 'smile' }),
    go('ev2_secret_end'),
  ],
  ev2_secret_C: [
    SX('루나', '…밤에. 알겠어. 그럼 나는 그날 밤 호숫가에서 기다릴게. 올라가지는 않을 거야. 나는 올라가서 보는 게 아니라 아래서 세는 사람이거든.', { gaze: 'side', pose: 'back' }),
    N('그 말이 허락인지 거절인지 구분되지 않았다. 아니, 어쩌면 둘 다였다.'),
    go('ev2_secret_end'),
  ],
  ev2_secret_end: [
    show(null),
    N('둔덕에서 지니가 일어서는 것이 보였다. 이쪽을 한 번 보고, 아무 말 없이 성 쪽으로 걸어갔다.'),
    END,
  ],

  /* ---------- D. 슬리데린: 금 오후2 도서관 (헤르미온느가 같은 도서관에 있다) ---------- */
  ev2_sly: [
    bg('library'), show('pansy', 'blank', { gaze: 'down' }),
    N('금요일 오후의 도서관. 판시는 서가 맨 끝 책상에 혼자 앉아 접힌 양피지를 손가락으로 두드리고 있었다. 가까운 책상에서는 헤르미온느가 책을 읽는 척하며 이쪽 소리를 듣는 중이었다.'),
    PAN('앉아. 소리 내지 마. 편지 얘기야.'),
    PAN('네가 지켜본다고 했으니까 말하는 거야. 지켜보는 중이지?', 'FLAG_P2_PROMISE_KEPT'),
    PAN('…솔직히, 네가 안 한다고 했을 때도 좀 편했어. 기대하지 않아도 되니까.', 'FLAG_P2_STAYED_OUT'),
    { t: 'choice', id: 'Q-08', prompt: '판시가 접힌 양피지를 책상 위에 올려놓았다. 나는…', options: [
      opt('A', '"읽지 않을게. 네가 말하고 싶은 만큼만 들을게."', { fx: ['ev:ap2_sly=ok', 'flag:FLAG_P2_SLY_OK', 'pansy.trust+2', 'stage:pansy+1', 'meet:pansy@hermione'], goto: 'ev2_sly_A' }),
      opt('B', '"편지에 쓰인 마감이 뭐야? 말포이가 어디까지 몰려 있는지 알아야 해."', { fx: ['ev:ap2_sly=plain', 'kn:KN_LETTER_DEADLINE', 'pansy.wariness+1', 'meet:pansy@hermione'], goto: 'ev2_sly_B' }),
      opt('C', '(말없이 손을 책상 위에, 그녀의 손 옆에 놓는다.)', { fx: ['ev:ap2_sly=touch', 'meet:pansy@hermione'], goto: 'ev2_sly_C' }),
    ] },
  ],
  ev2_sly_A: [
    N('판시는 양피지를 펼치지 않았다. 손바닥으로 누른 채 말했다.'),
    PAN('마감이 있어. 이번 달 말. 그때까지 답이 없으면 가문이 직접 학교로 사람을 보낼 거래. 내가 아는 건 이거 하나야.'),
    N('목소리는 평소처럼 쏘는 투였지만 손바닥은 양피지를 지탱하느라 하얬다.'),
    fx('kn:KN_LETTER_DEADLINE'),
    iff('stage.pansy>=2 && pansy.trust>=8', 'ev2_sly_secret', 'ev2_sly_end'),
  ],
  ev2_sly_secret: [
    SX('판시', '…이건 말하지 않으려고 했어. 걔가 사라지는 밤에, 나는 한 번 따라가 봤어. 계단 아래까지만. 올라가는 소리를 들었고, 나는 거기서 돌아왔어.', { pose: 'close', gaze: 'front', expr: 'anxious' }),
    PAN('돌아온 이유를 묻지 마. 무서워서가 아니야. 내가 따라간 걸 알게 되면 걔가 영영 날 안 볼 것 같아서야.'),
    fx('kn:KN_PANSY_FOLLOWED', 'flag:FLAG_P2_PAN_CONFIDED', 'pansy.trust+1'),
    go('ev2_sly_end'),
  ],
  ev2_sly_B: [
    PAN('…마감. 이번 달 말. 그게 다야. 그 이상은 내 입에서 안 나와.'),
    SX('판시', '질문이 많은 건 좋은 버릇이야. 나쁜 버릇이기도 하고. 네가 어느 쪽에 가까운지는 아직 모르겠어.', { pose: 'tilt', expr: 'smirk' }),
    go('ev2_sly_end'),
  ],
  ev2_sly_C: [
    N('손이 책상 위에 놓였다. 닿지는 않았다. 손가락 하나 폭이 남아 있었다.'),
    cue('pause'),
    iff('stage.pansy>=2 && pansy.trust>=6', 'ev2_sly_C_ok', 'ev2_sly_C_no'),
  ],
  ev2_sly_C_ok: [
    SX('판시', '…잠깐 있어 봐.', { pose: 'near', gaze: 'down' }),
    N('손가락 하나 폭이 사라졌다. 판시가 먼저 새끼손가락을 내 손등에 얹었다. 허락은 그녀가 했고, 시간도 그녀가 정했다. 짧았다. 그래도 확실했다.'),
    SX('판시', '(작게, 시선을 피한 채) 이건 기록에 남기지 마. 약속이야.', { pose: 'back', expr: 'smirk' }),
    fx('pansy.trust+1', 'pansy.affinity+2'),
    go('ev2_sly_end'),
  ],
  ev2_sly_C_no: [
    SX('판시', '…치워.', { pose: 'back', gaze: 'away', expr: 'angry' }),
    PAN('내가 허락한 적 있어? 너 같은 애가 가장 쉽게 하는 착각이 그거야. 슬픈 얼굴 하나 보면 다가가도 된다고 생각하는 거.'),
    N('나는 손을 거두었다. 사과는 하지 않았다. 사과가 변명이 될 것 같았다. 대신 책상 위의 거리를 그대로 두었다.'),
    fx('pansy.wariness+2', 'pansy.trust-1'),
    go('ev2_sly_end'),
  ],
  ev2_sly_end: [
    show(null),
    N('가까운 책상의 헤르미온느가 읽던 책의 같은 줄에서 오랫동안 눈을 떼지 않았다. 페이지가 넘어가는 소리가 한참 나지 않았다.'),
    END,
  ],
}
