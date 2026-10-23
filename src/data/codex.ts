import { HEROINE_KO, LOCATIONS, STAGE_KO } from './constants'
import type { GameState } from '../engine/types'

/**
 * 마법사의 기록(도감). 해리가 실제로 보고 듣고 선택한 것만 기록한다.
 * - 숨겨진 감정 수치·분기 조건·내부 ID는 출력하지 않는다.
 * - 나중에 알게 된 사실(reinterpret)은 원래 기록에 "다시 보니" 형태로 덧붙인다.
 */
export type CodexCategory = '관찰' | '알게 된 것' | '약속' | '선택' | '장소' | '관계'
export interface CodexEntry { category: CodexCategory; title: string; text: string; note?: string }

interface Def { title: string; text: string; reinterpret?: { when: string; note: string } }

/** 관찰(OB_*)과 지식(KN_*) */
const FACTS: Record<string, Def & { category: CodexCategory }> = {
  OB_SLEEVE: { category: '관찰', title: '끝까지 내린 소매', text: '말포이는 더운 열차 안에서도 왼쪽 소매를 손등까지 끌어내리고 있었다. 나는 그 아래를 상상하지 않으려고 애썼고, 실패했다.' },
  OB_TREMOR: { category: '관찰', title: '젓개를 든 손', text: '마법약 시간, 말포이의 손끝이 아주 잠깐 떨렸다. 그는 다른 손으로 손목을 눌러 그 떨림을 지웠다.' },
  OB_WINDOW: { category: '관찰', title: '7층의 창', text: '연습 비행 중에 말포이가 성 위쪽, 7층 어딘가의 창을 올려다보았다. 아주 잠깐이었다.' },
  OB_SCORCH: {
    category: '관찰', title: '4층 책상의 그을음', text: '4층 빈 교실 책상 모서리에 손바닥만 한 그을음이 있었다. 탄 냄새가 아니라 비 온 뒤 같은 냄새가 났다.',
    reinterpret: { when: 'KN_TRANSFORMATION', note: '다시 보니, 그날 밤 7층 복도를 가득 채운 냄새와 같았다.' },
  },
  OB_SAWDUST: { category: '관찰', title: '톱밥', text: '토요일 밤 7층 복도에서 마주친 말포이의 신발에 마른 톱밥이 묻어 있었다.' },
  OB_PANSY_NIGHTS: { category: '관찰', title: '판시의 말', text: '판시 파킨슨이 말했다. "요즘 걔가 밤마다 사라져. 나한테도 말을 안 해."' },
  OB_SLUG_AVOID: { category: '관찰', title: '슬러그혼의 헛기침', text: '슬러그혼은 말포이 앞에서 아버지 이야기를 꺼내려다 서둘러 어머니 이야기로 바꿨다.' },
  OB_BLACKSPARK: {
    category: '관찰', title: '검보랏빛 불꽃', text: '4층 빈 교실에서 폭발이 있었다. 책상 모서리를 갉아먹듯 번지던 불꽃은 검은빛과 보랏빛이 섞여 있었다. 스네이프는 "변신술 과제 사고"라고 했다.',
    reinterpret: { when: 'KN_TRANSFORMATION', note: '다시 보니, 7층 벽에서 쏟아져 나온 빛과 같은 색이었다. 스네이프는 정말 과제 사고라고 믿었을까.' },
  },
  OB_BOOKS: { category: '관찰', title: '말포이의 반납 도서', text: '말포이가 반납한 책은 마법 가구 수리와 물체 이동의 한계에 관한 것이었다. 세 번째 책에는 제목이 없었다.' },
  OB_SNAPE_WHISPER: { category: '관찰', title: '스네이프의 낮은 목소리', text: '스네이프는 징계 이야기를 하면서 "누구를 지켜보는가"를 먼저 물었다. 벌점보다 그쪽이 더 궁금한 듯했다.' },
  OB_SNAPE_ASKED_WHAT: { category: '관찰', title: '스네이프의 질문', text: '스네이프는 내가 7층에서 무엇을 보았는지 직접 묻지 않았다. 묻지 않는 방식으로 물었다.' },
  OB_FLICKER_HALL: { category: '관찰', title: '식탁 앞의 흔들림', text: '저녁 식탁에서 말포이의 윤곽이 두 호흡 동안 어긋났다. 판시가 몸으로 가렸다.' },
  KN_ROOM: { category: '알게 된 것', title: '벽 너머의 방', text: '7층 벽의 문은 필요한 것을 생각하며 세 번 지나가면 열린다. 헤르미온느의 말로는 "필요의 방"이다.' },
  KN_CABINET: { category: '알게 된 것', title: '방 안의 캐비닛', text: '방 깊숙한 곳에 그을린 캐비닛이 있다. 말포이는 사과를 넣었다가 꺼내며 "반뿐이야"라고 했다.' },
  KN_FAMILY_REASON: { category: '알게 된 것', title: '창가의 말포이', text: '루나는 말포이가 복도 끝 창가에서 "엄마, 조금만 더"라고 중얼거리는 걸 들었다고 했다.' },
  OB_WRAPPER: { category: '관찰', title: '찢어진 포장지', text: '목걸이를 싼 포장지 안쪽에 보긴 앤 버크스의 인장이 눌려 있었다. 단서이지, 누구의 것인지 말해 주는 증거는 아니다.' },
  OB_DUMBLEDORE_HINT: { category: '관찰', title: '교장의 질문', text: '덤블도어는 목걸이가 향하던 곳이 케이티가 아니었다고 했다. 그렇다면 누구에게 가려던 물건이었을까.' },
  OB_BURNED_EDGE: { category: '관찰', title: '밟힌 종이 조각', text: '말포이의 소매에서 가장자리가 그을린 종이 조각이 떨어졌다. 그는 그것을 식탁 아래로 밀어 넣었다.' },
  OB_BURNED_LETTER: { category: '관찰', title: '벽난로의 재', text: '4층 빈 교실 벽난로에 편지를 태운 재가 남아 있었다. 글씨는 하나도 읽을 수 없었다. 내용을 상상하지 않기로 했다.' },
  KN_NECKLACE_LINK: { category: '알게 된 것', title: '주문 제작된 목걸이', text: '포장지의 인장은 고객 주문에만 쓰이는 것이다. 목걸이는 누군가가 주문해서 보낸 것이다. 그 누군가가 누구인지는 모른다.' },
  KN_NO_MARK: { category: '알게 된 것', title: '소매 아래', text: '말포이의 왼팔에는 표식이 없었다. 대신 손목에서 팔꿈치까지 하얗게 번진 흉터가 있었다. 주문이 되튕긴 자국 같았다. 환영은 이것을 가리려고 처음 익힌 주문이었다.' },
  OB_OCCLUSION: { category: '관찰', title: '폐쇄술', text: '스네이프가 말포이에게 폐쇄술을 가르치겠다고 했고, 말포이는 "사양"했다. 왜 가르치려 했는지는 모른다.' },
  OB_PRESSED_FLOWER: { category: '관찰', title: '눌러 말린 꽃잎', text: '1월에 온 검은 봉투에서 말린 국화 꽃잎이 떨어졌다. 국화는 가을 꽃이니, 가을에 눌러 둔 것이다.' },
  KN_NECKLACE_TARGET: { category: '알게 된 것', title: '목걸이가 향한 곳', text: '말포이가 직접 말했다. 목걸이는 교장 선생님에게 전해질 물건이었고, 보긴 앤 버크스에서 산 것은 그였다. 시킨 사람의 이름은 말하지 않았다.' },
  OB_LETTER: { category: '관찰', title: '검은 봉투', text: '말포이 앞으로 검은 봉투가 왔다. 그는 그것을 열지 않고 소매 안에 밀어 넣었다.' },
  KN_OVERHEARD: { category: '알게 된 것', title: '열차에서 엿들은 말', text: '말포이가 판시에게 말했다. "일정을 앞당겨야 해. 더는 미룰 수 없어." 무슨 일정인지는 모른다.' },
  KN_TENSE: { category: '알게 된 것', title: '긴장', text: '말포이는 평소처럼 웃고 있었지만, 소매를 쥔 손가락 끝이 하얗게 질려 있었다.' },
  KN_WALL_DOOR: { category: '알게 된 것', title: '벽에 생긴 문', text: '7층 복도의 맨벽에 문이 있었다. 그 문은 열려 있었고, 사고 뒤에는 다시 맨벽이었다. 안에 무엇이 있었는지는 보지 못했다.' },
  KN_TRANSFORMATION: { category: '알게 된 것', title: '그날 밤', text: '내 방어 주문과 벽에서 쏟아진 마법이 부딪쳤다. 그 뒤로 말포이의 몸은 달라졌다. 이 사실을 아는 사람은 말포이와 나뿐이다.' },
  KN_ILLUSION: { category: '알게 된 것', title: '환영', text: '말포이는 환영 마법으로 예전 모습을 덧씌우고 다닌다. 피곤하거나 흔들릴 때 그 윤곽이 아주 짧게 어긋난다.' },
}

/** 약속(promise:*) */
const PROMISES: Record<string, Def> = {
  NIGHT_SILENCE: { title: '못 본 것으로', text: '토요일 밤 7층에서, 서로 그 자리에 없었던 것으로 하기로 했다.' },
  SCAR_SECRET: { title: '소매 아래의 일', text: '그가 보여 준 팔의 일을 아무에게도 말하지 않겠다고 약속했다. 헤르미온느에게도, 론에게도.' },
  SECRET_KEPT: { title: '아무에게도', text: '그날 밤의 일을 아무에게도 말하지 않겠다고 약속했다. 헤르미온느에게도, 론에게도.' },
}

/** 선택 이력: 해리가 한 행동을 해리의 말로 */
const CHOICES: Record<string, string> = {
  'P-01:A': '지난여름을 책상 앞에서 보냈다.', 'P-01:B': '지난여름 사람들의 표정을 읽으며 보냈다.',
  'P-01:C': '지난여름 해가 질 때까지 날았다.', 'P-01:D': '지난여름 위즐리네 식탁에서 웃으며 보냈다.',
  'K-01:A': '열차에서 투명 망토를 쓰고 엿들었다.', 'K-01:B': '열차에서 객실 문을 열고 말포이에게 시비를 걸었다.', 'K-01:C': '열차에서 그 객실을 그냥 지나쳤다.',
  'K-02:A': '마법약 시간, 도발을 농담으로 받았다.', 'K-02:B': '마법약 시간, 도발을 논리로 되받았다.', 'K-02:C': '마법약 시간, 대꾸하지 않았다.', 'K-02:D': '마법약 시간, 말포이의 불 조절을 지적했다.',
  'K-03:A': '추락한 말포이를 모두가 보는 앞에서 부축했다.', 'K-03:B': '추락한 말포이를 비웃으며 지켜봤다.', 'K-03:C': '추락 때 후치 선생님을 부르러 달렸다.', 'K-03:D': '사람들이 떠난 뒤 말포이에게 물병을 건넸다.',
  'K-04:A': '7층에서 마주친 말포이에게 교수님께 가자고 했다.', 'K-04:B': '7층에서 서로 못 본 것으로 하자고 했다.', 'K-04:C': '7층에서 말포이를 추궁했다.', 'K-04:D': '7층에서 숨어서 말포이를 지켜봤다.',
  'K-05:A': '만찬에서 소문을 분명히 부정했다.', 'K-05:B': '만찬에서 소문을 웃어넘겼다.', 'K-05:C': '만찬에서 말포이에게 직접 물었다.',
  'K-06:A': '첫 경기에서 정정당당하게 스니치를 쫓았다.', 'K-06:B': '첫 경기에서 말포이의 빗자루를 붙잡았다.', 'K-06:C': '첫 경기에서 일부러 속도를 늦췄다.',
  'S-01:A': '그날 밤, 의무실로 가자고 고집했다.', 'S-01:B': '그날 밤, 아무에게도 말하지 않겠다고 약속했다.', 'S-01:C': '그날 밤, 무엇을 하고 있었는지 먼저 말하라고 했다.', 'S-01:D': '그날 밤, 내 주문 때문이라고 사과했다.',
  'S-03:A': '스네이프에게 7층에는 가지 않았다고 말했다.', 'S-03:B': '스네이프에게 말포이의 일은 모른다고 말했다.', 'S-03:C': '스네이프의 질문에 침묵했다.',
  'K-07:A': '검은 봉투가 흔들리던 날, 모른 척 시선을 돌렸다.', 'K-07:B': '검은 봉투가 흔들리던 날, 몸으로 시선을 가렸다.', 'K-07:C': '검은 봉투가 흔들리던 날, 괜찮느냐고 물었다.',
  'K-08:A': '7층 벽 앞에서 망토를 쓰고 기다렸다.', 'K-08:B': '7층 벽에 대해 헤르미온느와 상의했다.', 'K-08:C': '7층 벽에 대해 루나와 상의했다.', 'K-08:D': '7층 벽은 당분간 내버려 두었다.',
  'S-04:A': '말포이의 추궁에 아는 것을 정확히 말했다.', 'S-04:B': '말포이의 추궁에 아무것도 모른다고 했다.', 'S-04:C': '말포이의 추궁에 "내가 알아야 하는 게 있어?"라고 되물었다.',
  'K-09:A': '호그스미드에서 쓰러지는 케이티를 향해 주문을 쏘았다.', 'K-09:B': '호그스미드에서 케이티를 두고 해그리드를 부르러 달렸다.', 'K-09:T': '호그스미드에서 케이티 앞에서 몸이 얼어붙었다.',
  'K-10:A': '케이티의 일로 대연회장에서 말포이를 지목했다.', 'K-10:B': '케이티의 일을 덤블도어에게 말했다.', 'K-10:C': '케이티의 일로 말포이를 따로 불러 물었다.', 'K-10:D': '케이티의 일은 말하지 않고 단서를 더 모았다.',
  'K-11:A': '말포이의 소매를 붙잡아 걷어 올렸다.', 'K-11:B': '말포이에게 보여 달라고 부탁했다.', 'K-11:C': '마법약 수업에서 소매가 걷어지는 순간을 기다렸다.',
  'K-12:A': '크리스마스 이브에 말포이에게 공책을 놓고 갔다.', 'K-12:B': '크리스마스 이브에 말포이의 곁에 앉았다.', 'K-12:C': '크리스마스 이브에 말포이를 지나쳤다.',
  'K-13:A': '짝 과제에서 말포이에게 주도권을 넘겼다.', 'K-13:B': '짝 과제에서 말포이와 설계를 하나로 맞췄다.', 'K-13:C': '짝 과제에서 내 계획을 내밀고 밀고 나갔다.',
  'K-14:A': '편지를 태우던 말포이 곁에서 묻지 않고 머물렀다.', 'K-14:B': '편지를 쥔 말포이를 못 본 척 돌아섰다.', 'K-14:C': '편지를 쥔 말포이를 다그쳤다.', 'K-14:D': '말포이의 편지를 몰래 읽으려 했다.',
  'K-15:A': '슬럼프의 론과 함께 경기장에 나갔다.', 'K-15:B': '론에게 말포이 문제가 먼저라고 말했다.', 'K-15:C': '론에게 말포이의 사정을 일부 털어놓았다.',
  'S-02:A': '아침 식탁에서 일부러 소란을 일으켰다.', 'S-02:B': '아침 식탁에서 아무것도 하지 않았다.',
}
/** 자리 배정(K-05 비소문 분기)은 같은 ID라도 상황이 다르므로 장면으로 구분 */
const CHOICES_BY_SCENE: Record<string, string> = {
  'ch2_seat:A': '만찬에서 자리를 바꿔 달라고 했다.', 'ch2_seat:B': '만찬에서 말포이 옆에 말없이 앉았다.', 'ch2_seat:C': '만찬에서 말포이에게 먼저 말을 건넸다.',
}

export function buildCodex(s: GameState): CodexEntry[] {
  const out: CodexEntry[] = []
  const has = (k: string) => !!(s.flags[k] || s.knowledge[k])
  for (const [k, d] of Object.entries(FACTS)) {
    if (!has(k)) continue
    out.push({ category: d.category, title: d.title, text: d.text, note: d.reinterpret && has(d.reinterpret.when) ? d.reinterpret.note : undefined })
  }
  for (const p of s.promises) { const d = PROMISES[p]; if (d) out.push({ category: '약속', title: d.title, text: d.text }) }
  for (const c of s.choices) {
    const t = CHOICES_BY_SCENE[`${c.scene}:${c.option}`] ?? CHOICES[`${c.id}:${c.option}`]
    if (t) out.push({ category: '선택', title: `${c.date.replace('-', '월 ')}일`, text: t })
  }
  // 관계: 해리가 실제로 겪은 만남이 있는 인물만, 단계 이름만 기록한다(수치는 표시하지 않는다)
  for (const [id, b] of Object.entries(s.bonds ?? {})) {
    if (id === 'draco' || b.seen === 0) continue
    // 합의된 상태만 문장으로 남긴다. 지식 단계(know)·호감 수치는 기록하지 않는다
    const extra = [
      b.romance === 'open' ? ' 서로 마음을 열어 두었다.' : '',
      b.romance === 'together' ? ' 연인이 되기로 했다.' : b.romance === 'declined' ? ' 서로 친구로 남기로 했다.' : b.romance === 'ended' ? ' 그 마음은 끝났다.' : '',
      b.poly === 'accepted' ? ' 여러 사람과 함께하는 관계를 알고 받아들이기로 했다.' : b.poly === 'declined' ? ' 여러 사람과 함께하는 관계는 원하지 않는다고 말했다.' : '',
    ].join('')
    out.push({ category: '관계', title: HEROINE_KO[id] ?? id, text: `${STAGE_KO[b.stage]}.${extra}` })
  }
  for (const loc of Object.keys(s.visits ?? {})) { const l = LOCATIONS[loc]; if (l) out.push({ category: '장소', title: l.name, text: l.desc }) }
  return out
}
