import { LOCATIONS } from './constants'
import type { GameState } from '../engine/types'

/**
 * 마법사의 기록(도감). 해리가 실제로 보고 듣고 선택한 것만 기록한다.
 * - 숨겨진 감정 수치·분기 조건·내부 ID는 출력하지 않는다.
 * - 나중에 알게 된 사실(reinterpret)은 원래 기록에 "다시 보니" 형태로 덧붙인다.
 */
export type CodexCategory = '관찰' | '알게 된 것' | '약속' | '선택' | '장소'
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
  for (const loc of Object.keys(s.visits ?? {})) { const l = LOCATIONS[loc]; if (l) out.push({ category: '장소', title: l.name, text: l.desc }) }
  return out
}
