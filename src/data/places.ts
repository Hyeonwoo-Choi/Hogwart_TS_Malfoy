/**
 * 자유 일과의 규칙 데이터: 장소(환경·출입 조건)·활동(소요 시간·성장)·장소별 가능한 활동.
 * 지도에서의 시각적 배치는 mapLayout.ts에서 따로 관리한다(규칙과 좌표를 분리).
 * 시간 단위는 "시간대" 하나(오후1 / 오후2 / 저녁 = 하루 3칸). 활동의 dur은 소모하는 시간대 수다.
 * gains는 내부 데이터이며 플레이어에게 표시하지 않는다(선택 전 보상 비공개 정책, BALANCE_REPORT.md).
 * 긴 활동은 한 가지에 집중하는 대신 다른 성장을 포기하고, 같은 시간에 여러 곳을 돌며 사람을 만날 기회를 잃는다(기회비용).
 */
export type Env = 'indoor' | 'outdoor' | 'restricted'
export type Zone = 'castle' | 'grounds'
export type StatKey = 'int' | 'str' | 'magic' | 'insight' | 'social' | 'will'

export interface ActivityDef {
  id: string; name: string; desc: string
  /** 소모하는 시간대 수(1=짧게, 2=반나절, 3=하루) */
  dur: number
  gains: Partial<Record<StatKey, number>>
  /** 서술 마무리 문장 계열 */
  family: 'study' | 'train' | 'quidditch' | 'talk' | 'rest'
}

export const ACTIVITY_DEFS: Record<string, ActivityDef> = {
  study: { id: 'study', name: '공부', desc: '책을 펴고 자리를 잡는다.', dur: 1, gains: { int: 2, insight: 1 }, family: 'study' },
  research: { id: 'research', name: '자료 조사', desc: '서가를 오가며 한 가지 주제를 파고든다.', dur: 2, gains: { insight: 3, int: 1 }, family: 'study' },
  deep_study: { id: 'deep_study', name: '집중 공부', desc: '오후 내내 한 자리에서 한 과목만 붙든다.', dur: 2, gains: { int: 5 }, family: 'study' },
  brew: { id: 'brew', name: '마법약 실습', desc: '감독 교수의 눈길 아래 솥 하나를 맡는다.', dur: 2, gains: { int: 3, will: 1 }, family: 'study' },
  brew_research: { id: 'brew_research', name: '배합 연구', desc: '재료의 순서와 분량을 바꿔 가며 같은 약을 여러 번 만든다.', dur: 3, gains: { int: 5, insight: 2 }, family: 'study' },
  herb: { id: 'herb', name: '약초 손질', desc: '온실 선반의 화분을 돌보며 줄기를 다듬는다.', dur: 2, gains: { int: 2, will: 2 }, family: 'study' },
  train: { id: 'train', name: '주문 연습', desc: '지팡이를 들고 같은 주문을 되풀이한다.', dur: 1, gains: { magic: 2, will: 1 }, family: 'train' },
  train_long: { id: 'train_long', name: '집중 수련', desc: '한 가지 주문이 손에 붙을 때까지 하루를 쓴다.', dur: 3, gains: { magic: 7, will: 2 }, family: 'train' },
  train_marathon: { id: 'train_marathon', name: '이틀 수련', desc: '끼니만 챙기며 이틀 동안 한 주문에만 매달린다.', dur: 6, gains: { magic: 13, will: 4 }, family: 'train' },
  quidditch: { id: 'quidditch', name: '퀴디치 연습', desc: '빗자루를 들고 바람 속으로 나간다.', dur: 1, gains: { str: 2, magic: 1 }, family: 'quidditch' },
  quidditch_camp: { id: 'quidditch_camp', name: '집중 훈련', desc: '급강하와 선회를 반복하며 오후를 통째로 쓴다.', dur: 2, gains: { str: 5, magic: 1 }, family: 'quidditch' },
  broom_flight: { id: 'broom_flight', name: '빗자루 비행', desc: '목적 없이 경기장 위를 느리게 돈다.', dur: 1, gains: { str: 1, magic: 1, will: 1 }, family: 'quidditch' },
  watch_practice: { id: 'watch_practice', name: '연습 구경', desc: '관중석 가장자리에서 남들의 비행을 지켜본다.', dur: 1, gains: { insight: 1, social: 1 }, family: 'talk' },
  chess: { id: 'chess', name: '마법사 체스', desc: '체스판을 펴 놓고 상대를 기다린다. 말들이 제멋대로 훈수를 둔다.', dur: 1, gains: { int: 1, insight: 1 }, family: 'talk' },
  talk: { id: 'talk', name: '대화', desc: '거기 있는 누군가와 이야기를 나눈다.', dur: 1, gains: { social: 2, insight: 1 }, family: 'talk' },
  rumor: { id: 'rumor', name: '소문 듣기', desc: '귀를 열어 두고 주변의 이야기를 모은다.', dur: 1, gains: { insight: 2, social: 1 }, family: 'talk' },
  meal: { id: 'meal', name: '식사', desc: '식탁에 앉아 천천히 먹는다.', dur: 1, gains: { will: 1, social: 1 }, family: 'rest' },
  walk: { id: 'walk', name: '산책', desc: '회랑을 따라 아무 데로나 걷는다.', dur: 1, gains: { will: 1, insight: 1 }, family: 'rest' },
  observe: { id: 'observe', name: '호수 바라보기', desc: '물가에 서서 수면의 움직임을 본다.', dur: 1, gains: { insight: 2 }, family: 'rest' },
  rest: { id: 'rest', name: '휴식', desc: '아무것도 하지 않는 시간을 허락한다.', dur: 1, gains: { will: 2 }, family: 'rest' },
}

export interface PlaceAct {
  id: string
  /** 이 장소에서의 표시 이름(없으면 활동 기본 이름) */
  name?: string; desc?: string
  /** 이 시간대(0=오후1, 1=오후2, 2=저녁)에만 가능(시작 시간대 기준) */
  slots?: number[]
  reason?: string
  /** 시작만 열려 있으면 도중에 문을 닫는 시간을 지나도 이어서 할 수 있다(예: 밤새 끓이는 약) */
  overnight?: boolean
}
export interface PlaceRule {
  id: string; zone: Zone; env: Env
  /** 장소 자체의 출입 조건. 조건을 어기면 장소 전체를 이용할 수 없다 */
  open?: { slots?: number[]; weekdays?: string[]; reasonSlot: string; reasonDay?: string }
  acts: PlaceAct[]
}

const NIGHT_OUT = '해가 진 뒤에는 통금 때문에 야외로 나갈 수 없다.'
export const PLACE_RULES: Record<string, PlaceRule> = {
  hall: {
    id: 'hall', zone: 'castle', env: 'indoor', acts: [
      { id: 'meal', slots: [0, 2], reason: '식사 시간이 아니다. 식탁이 치워져 있다.' },
      { id: 'talk', name: '식탁 대화', slots: [0, 2], reason: '식사 시간이 아니라 이야기를 나눌 사람이 없다.' },
      { id: 'rumor', slots: [0, 2], reason: '식사 시간이 아니라 소문이 돌 자리가 비어 있다.' },
      ],
  },
  library: {
    id: 'library', zone: 'castle', env: 'indoor',
    open: { slots: [0, 1], reasonSlot: '도서관은 저녁에 문을 닫는다. 핀스 부인이 열쇠를 돌린 뒤다.' },
    acts: [{ id: 'study' }, { id: 'research' }, { id: 'deep_study' }],
  },
  potions: {
    id: 'potions', zone: 'castle', env: 'indoor',
    open: { slots: [0, 1], weekdays: ['월', '화', '수', '목', '금'], reasonSlot: '마법약 교실은 수업이 없는 저녁에는 잠겨 있다.', reasonDay: '주말에는 감독할 교수가 없어 실습할 수 없다.' },
    acts: [{ id: 'study', name: '교재 복습', desc: '솥 곁 책상에서 교재를 다시 읽는다.' }, { id: 'brew' }, { id: 'brew_research', overnight: true, desc: '슬러그혼에게 열쇠를 빌려 솥 하나를 하루 내내 끓이며 지켜본다.' }],
  },
  common: {
    id: 'common', zone: 'castle', env: 'indoor',
    acts: [{ id: 'chess' }, { id: 'study', name: '숙제', desc: '탁자에 양피지를 펴 놓는다.' }, { id: 'talk', name: '친구와 대화', desc: '벽난로 곁에 모인 아이들과 이야기를 나눈다.' }],
  },
  classroom4: {
    id: 'classroom4', zone: 'castle', env: 'indoor',
    acts: [{ id: 'train' }, { id: 'train_long' }, { id: 'train_marathon' }],
  },
  courtyard: {
    id: 'courtyard', zone: 'grounds', env: 'outdoor',
    open: { slots: [0, 1], reasonSlot: NIGHT_OUT },
    acts: [{ id: 'walk' }, { id: 'train', desc: '인적 드문 회랑 끝에서 주문을 연습한다.' }, { id: 'talk', name: '가벼운 대화', desc: '회랑 기둥 곁에서 지나가는 아이와 이야기를 나눈다.' }],
  },
  pitch: {
    id: 'pitch', zone: 'grounds', env: 'outdoor',
    open: { slots: [0, 1], reasonSlot: '해가 진 뒤의 경기장 사용은 후치 교수가 금지했다.' },
    acts: [{ id: 'broom_flight' }, { id: 'quidditch' }, { id: 'quidditch_camp' }, { id: 'watch_practice' }],
  },
  lake: {
    id: 'lake', zone: 'grounds', env: 'outdoor',
    open: { slots: [0, 1], reasonSlot: NIGHT_OUT },
    acts: [{ id: 'observe' }],
  },
  greenhouse: {
    id: 'greenhouse', zone: 'grounds', env: 'restricted',
    open: { slots: [0, 1], weekdays: ['화', '목'], reasonSlot: NIGHT_OUT, reasonDay: '스프라우트 교수가 허가한 날(화·목)에만 온실에 들어갈 수 있다.' },
    acts: [{ id: 'herb' }],
  },
}

export const ENV_LABEL: Record<Env, string> = { indoor: '실내', outdoor: '실외', restricted: '출입 허가 필요' }
/** 소요 시간 표시 문구(수치 대신 체감으로) */
export function durLabel(dur: number): string {
  return dur <= 1 ? '짧게 · 한 시간대' : dur === 2 ? '오후 내내 · 두 시간대' : dur === 3 ? '하루 · 세 시간대' : dur === 6 ? '이틀 · 여섯 시간대' : `${dur}시간대`
}

export interface Status { ok: boolean; reason?: string }

/** 장소 출입 조건 확인 */
export function placeStatus(loc: string, slotIdx: number, weekday: string): Status {
  const o = PLACE_RULES[loc]?.open
  if (!o) return { ok: true }
  if (o.weekdays && !o.weekdays.includes(weekday)) return { ok: false, reason: o.reasonDay ?? o.reasonSlot }
  if (o.slots && !o.slots.includes(slotIdx)) return { ok: false, reason: o.reasonSlot }
  return { ok: true }
}
/** 장소 안 활동 가능 여부(시간대 제한) */
export function actSlotStatus(loc: string, actId: string, slotIdx: number): Status {
  const pa = PLACE_RULES[loc]?.acts.find((a) => a.id === actId)
  if (!pa) return { ok: false, reason: '이곳에서는 할 수 없는 일이다.' }
  if (pa.slots && !pa.slots.includes(slotIdx)) return { ok: false, reason: pa.reason ?? '지금은 할 수 없다.' }
  return { ok: true }
}

/**
 * 시작 시간대 t0(누적 칸)부터 dur칸 동안 이 활동을 할 수 있는지 판정한다.
 * days[i].weekday는 하루 3칸 단위로 대응한다. 문을 닫는 시간대를 지나야 하는 활동은(overnight 제외) 할 수 없다.
 */
export function spanStatus(loc: string, actId: string, t0: number, dur: number, weekdays: string[]): Status {
  const pa = PLACE_RULES[loc]?.acts.find((a) => a.id === actId)
  if (!pa) return { ok: false, reason: '이곳에서는 할 수 없는 일이다.' }
  const first = actSlotStatus(loc, actId, t0 % 3); if (!first.ok) return first
  for (let t = t0; t < t0 + dur; t++) {
    const wd = weekdays[Math.floor(t / 3)]
    const st = placeStatus(loc, t % 3, wd)
    if (!st.ok && (t === t0 || !pa.overnight)) return t === t0 ? st : { ok: false, reason: st.reason + ' 끝까지 하려면 시간이 맞지 않는다.' }
  }
  return { ok: true }
}
