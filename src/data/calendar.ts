import { dayIndex, evalCond } from '../engine/cond'
import type { GameState } from '../engine/types'

/**
 * 학사 일정(게시판)과 기간 한정 행사. 선언형 데이터 + 읽기 전용 파생 함수.
 * - 행사는 날짜(MM-DD)·시작 시간대(0 오후1 · 1 오후2 · 2 저녁)·장소가 모두 맞을 때만 지도에서 참여할 수 있다(`openEventsAt`).
 * - 게시판은 학생이 알 수 있는 정보만 보여 준다: `announce` 이후의 공지, 그리고 `cond`(사전 약속·계획)를 만족한 개인 일정만. 비밀 사건·돌발 사건의 시각은 어디에도 없다.
 * - 참가 기록은 state.board.done(행사 id → 결과). 한 번 참가한 행사는 다시 참가할 수 없고(보상 파밍 방지), 시간이 지나면 "놓친 행사"가 된다(파생).
 * - 같은 시간대의 두 행사는 장소가 달라 동시에 갈 수 없다(하나를 고르면 다른 하나는 시간이 지나 놓친 행사가 된다).
 */
export interface CalendarEvent {
  id: string; title: string
  /** 'public' 학교 행사 / 'appointment' 사전 약속 / 'plan' 해리 스스로 세운 계획 */
  kind: 'public' | 'appointment' | 'plan'
  date: string; slots: number[]; place: string; dur: number
  /** 이 날짜부터 게시판에 보인다(없으면 처음부터) */
  announce?: string
  /** 약속·계획의 성립 조건(조건 미충족이면 게시판에도 지도에도 나타나지 않는다) */
  cond?: string
  /** 게시판 문구(학생이 알 수 있는 정보만) · 공개된 참가 조건 · 짧은 세계관 설명 */
  notice: string; terms?: string; lore?: string
  /** 참가 장면 id */
  scene: string
  /** true면 시간 건너뛰기가 이 행사의 시작 시각을 넘어가지 못한다(그 시각에서 멈춘다). 기본은 선택형(놓칠 수 있다는 안내만) */
  required?: boolean
}

export const CALENDAR: CalendarEvent[] = [
  {
    id: 'ev_greenhouse_prac', title: '온실 특별 실습', kind: 'public', date: '09-05', slots: [0], place: 'greenhouse', dur: 1, announce: '09-01',
    notice: '목요일 오후1, 온실. 스프라우트 교수가 허가한 날에만 열리는 야간 개화 식물 표본 정리.', terms: '장갑 지참. 출입 허가는 화·목에만 난다.',
    lore: '온실의 밤꽃 식물은 낮에 잎을 닫아 두었다가 표본으로 말릴 때 가장 많은 것을 드러낸다고 한다.', scene: 'ev1_greenhouse',
  },
  {
    id: 'ev_pitch_open', title: '퀴디치 공개 연습', kind: 'public', date: '09-05', slots: [1], place: 'pitch', dur: 1, announce: '09-01',
    notice: '목요일 오후2, 경기장. 그리핀도르 팀의 공개 연습. 구경하거나 연습에 합류할 수 있다.', terms: '빗자루 지참. 참가 조건 없음.',
    lore: '공개 연습은 후치 교수가 허락한 날에만 열린다. 팀이 서로의 실력을 가늠하는 자리이기도 하다.', scene: 'ev1_pitch',
  },
  {
    id: 'ap_pansy', title: '안뜰 벤치의 쪽지', kind: 'appointment', date: '09-04', slots: [0], place: 'courtyard', dur: 1, cond: 'FLAG_RT_PANSY && !FLAG_RT_PANSY_PITCH',
    notice: '수요일 오후1, 안뜰 벤치. 쪽지에 적힌 시간이다. 혼자 오라고 했다.', scene: 'ev1_ap_pansy',
  },
  {
    id: 'ap_pansy_pitch', title: '경기장의 둔탁한 소리', kind: 'appointment', date: '09-05', slots: [1], place: 'pitch', dur: 1, cond: 'FLAG_RT_PANSY_PITCH',
    notice: '목요일 오후2, 경기장. 규칙 없이 이어지던 소리의 주인을 확인한다.', scene: 'ev1_ap_pansy_pitch',
  },
  {
    id: 'ap_ginny', title: '경기장의 둔탁한 소리', kind: 'appointment', date: '09-04', slots: [1], place: 'pitch', dur: 1, cond: 'FLAG_RT_GINNY',
    notice: '수요일 오후2, 경기장. 반복되던 소리의 주인을 확인한다.', scene: 'ev1_ap_ginny',
  },
  {
    id: 'ap_hermione', title: '접힌 양피지의 각주', kind: 'appointment', date: '09-05', slots: [1], place: 'library', dur: 1, cond: 'FLAG_RT_HERMIONE',
    notice: '목요일 오후2, 도서관. 양피지 각주가 가리킨 서가를 찾아간다.', scene: 'ev1_ap_hermione',
  },
  {
    id: 'ap_luna', title: '호숫가의 숫자 소리', kind: 'appointment', date: '09-06', slots: [1], place: 'lake', dur: 1, cond: 'FLAG_RT_LUNA',
    notice: '금요일 오후2, 호숫가. 일곱에서 멈추던 소리를 다시 들어 본다.', scene: 'ev1_ap_luna',
  },
  {
    id: 'pl_draco', title: '지하 교실의 불빛', kind: 'plan', date: '09-06', slots: [0], place: 'potions', dur: 1, cond: 'FLAG_RT_DRACO',
    notice: '금요일 오후1, 마법약 교실. 늦게까지 켜져 있던 불빛을 확인한다.', scene: 'ev1_pl_draco',
  },
  {
    id: 'ap2_research', title: '헤르미온느와의 연구', kind: 'appointment', date: '09-27', slots: [1], place: 'library', dur: 1, announce: '09-16', cond: 'FLAG_P2_RESEARCH',
    notice: '금요일 오후2, 도서관. 허가를 받은 책을 헤르미온느와 함께 읽기로 했다.', scene: 'ev2_research',
  },
  {
    id: 'ap2_pitch', title: '지니의 마지막 연습', kind: 'appointment', date: '09-26', slots: [1], place: 'pitch', dur: 1, announce: '09-16', cond: 'FLAG_P2_PITCH',
    notice: '목요일 오후2, 경기장. 경기를 이틀 앞두고 지니가 맞수를 해 달라고 했다.', scene: 'ev2_pitch',
  },
  {
    id: 'ap2_secret', title: '루나와 낮의 계단', kind: 'appointment', date: '09-27', slots: [1], place: 'lake', dur: 1, announce: '09-16', cond: 'FLAG_P2_SECRET',
    notice: '금요일 오후2, 호숫가. 루나가 낮에 한 번 더 확인하자고 했다.', scene: 'ev2_secret',
  },
  {
    id: 'ap2_e_lab', title: '덮개 아래의 가루', kind: 'appointment', date: '09-17', slots: [0], place: 'potions', dur: 1, announce: '09-16', cond: 'FLAG_P2_UNSTABLE',
    notice: '화요일 오후1, 마법약 교실. 슬러그혼이 허락한 비접촉 관찰이다. 손은 선 바깥에 둔다.', scene: 'ev2_e_lab',
  },
  {
    id: 'ap2_e_handover', title: '교실 인계대', kind: 'appointment', date: '09-18', slots: [1], place: 'potions', dur: 1, announce: '09-16', cond: 'FLAG_P2_UNSTABLE',
    notice: '수요일 오후2, 마법약 교실. 봉인 종이의 인계를 확인한다.', scene: 'ev2_e_handover',
  },
  {
    id: 'ap3_e_recheck', title: '훈련실의 잔향', kind: 'appointment', date: '10-01', slots: [0], place: 'classroom4', dur: 1, announce: '09-30', cond: 'FLAG_P3_E',
    notice: '화요일 오후1, 4층 훈련실. 어제 일을 한 번만 다시 확인한다.', scene: 'ev3_e_recheck',
  },
  {
    id: 'ap3_a_ledger', title: '지워진 줄', kind: 'appointment', date: '10-01', slots: [1], place: 'library', dur: 1, announce: '09-30', cond: 'FLAG_P3_A',
    notice: '화요일 오후2, 도서관. 대출 장부의 비어 있는 줄을 다시 본다.', scene: 'ev3_a_ledger',
  },
  {
    id: 'ap3_d_courtyard', title: '안뜰 벤치의 봉투', kind: 'appointment', date: '10-02', slots: [0], place: 'courtyard', dur: 1, announce: '09-30', cond: 'FLAG_P3_D && FLAG_P3_D_MEETING',
    notice: '수요일 오후1, 안뜰 벤치. 봉투에 적힌 시간이다.', scene: 'ev3_d_courtyard',
  },
  {
    id: 'ap3_b_checkup', title: '선수 건강 점검', kind: 'appointment', date: '10-02', slots: [1], place: 'pitch', dur: 1, announce: '09-30', cond: 'FLAG_P3_B',
    notice: '수요일 오후2, 경기장 장비 창고. 후치가 건강 점검을 한다.', scene: 'ev3_b_checkup',
  },
  {
    id: 'ap3_c_count', title: '호숫가의 소리', kind: 'appointment', date: '10-03', slots: [1], place: 'lake', dur: 1, announce: '09-30', cond: 'FLAG_P3_C',
    notice: '목요일 오후2, 호숫가. 소리를 다시 들어 본다.', scene: 'ev3_c_count',
  },
  {
    id: 'ap3_a_appeal', title: '서명 한 줄', kind: 'appointment', date: '10-03', slots: [0], place: 'library', dur: 1, announce: '09-30', cond: 'FLAG_P3_A',
    notice: '목요일 오후1, 도서관. 열람 신청서의 서명 칸을 확인한다.', scene: 'ev3_a_appeal',
  },
  {
    id: 'ap3_b_shoulder', title: '관중석 아래의 언쟁', kind: 'appointment', date: '10-03', slots: [0], place: 'pitch', dur: 1, announce: '09-30', cond: 'FLAG_P3_B',
    notice: '목요일 오후1, 경기장 관중석 아래. 연습 일정을 두고 말이 오가고 있다.', scene: 'ev3_b_shoulder',
  },
  {
    id: 'ap3_c_chalk', title: '호숫가의 분필', kind: 'appointment', date: '10-03', slots: [0], place: 'lake', dur: 1, announce: '09-30', cond: 'FLAG_P3_C',
    notice: '목요일 오후1, 호숫가 나무 의자. 분필 조각과 계획 하나.', scene: 'ev3_c_chalk',
  },
  {
    id: 'ap3_d_reply', title: '접힌 초안', kind: 'appointment', date: '10-03', slots: [0], place: 'courtyard', dur: 1, announce: '09-30', cond: 'FLAG_P3_D',
    notice: '목요일 오후1, 안뜰 벤치. 답장의 마지막 문장이 비어 있다.', scene: 'ev3_d_reply',
  },
  {
    id: 'ap3_e_ron', title: '훈련실 앞 복도', kind: 'appointment', date: '10-03', slots: [0], place: 'classroom4', dur: 1, announce: '09-30', cond: 'FLAG_P3_E',
    notice: '목요일 오후1, 4층 훈련실 앞. 한쪽 장갑만 낀 채 기다리는 사람이 있다.', scene: 'ev3_e_ron',
  },
  {
    id: 'ap4_g_trial', title: '주전 재심 연습경기', kind: 'public', date: '11-06', slots: [1], place: 'pitch', dur: 1, announce: '11-03',
    notice: '수요일 오후2, 경기장. 그리핀도르 추격수 주전 재심 연습경기. 관중석은 열려 있다.', terms: '참가 조건 없음. 비행은 선수만.', scene: 'ev4_g_trial',
  },
  {
    id: 'ap4_l_stair', title: '서쪽 계단의 숫자', kind: 'appointment', date: '11-06', slots: [1], place: 'hall', dur: 1, announce: '11-04', cond: 'FLAG_C4_LUNA_INVITE || FLAG_P3_C || KN_TWELVE_THIRTEEN',
    notice: '수요일 오후2, 대연회장 서쪽 계단 아래. 열세 번째를 세어 보기로 했다.', scene: 'ev4_l_stair',
  },
  {
    id: 'ap4_h_ledger', title: '펼쳐진 장부 세 권', kind: 'appointment', date: '11-06', slots: [1], place: 'library', dur: 1, announce: '11-04', cond: 'FLAG_C4_HER_INVITE || FLAG_P3_A',
    notice: '수요일 오후2, 도서관 안쪽 책상. 장부와 근무표를 맞춰 보는 자리.', scene: 'ev4_h_ledger',
  },
  {
    id: 'ap4_p_deal', title: '분수 앞의 거래', kind: 'appointment', date: '11-06', slots: [1], place: 'courtyard', dur: 1, announce: '11-04', cond: 'FLAG_C4_PANSY_INVITE || FLAG_P3_D',
    notice: '수요일 오후2, 안뜰 분수 앞. 구경하든 말든 상관없다고 했다.', scene: 'ev4_p_deal',
  },
  {
    id: 'ap5_h_chain', title: '세로로 그은 시간표', kind: 'appointment', date: '11-17', slots: [1], place: 'library', dur: 1, announce: '11-17', cond: 'stage.hermione>=2',
    notice: '일요일 오후2, 도서관 안쪽 책상. 시간표의 어긋나는 줄을 다시 본다.', scene: 'ev5_h_chain',
  },
  {
    id: 'ap5_g_team', title: '명단 첫 줄의 지운 이름', kind: 'public', date: '11-17', slots: [1], place: 'pitch', dur: 1, announce: '11-17',
    notice: '일요일 오후2, 경기장 관중석 아래. 팀 모임. 다음 경기를 어떻게 할지 정한다.', scene: 'ev5_g_team',
  },
  {
    id: 'ap5_r_rumor', title: '분수 앞의 반원', kind: 'public', date: '11-17', slots: [1], place: 'courtyard', dur: 1, announce: '11-17',
    notice: '일요일 오후2, 안뜰 분수 앞. 학생들이 한 곳에 모여 소문을 두고 다투고 있다.', scene: 'ev5_r_rumor',
  },
  {
    id: 'ap2_sly', title: '판시의 편지', kind: 'appointment', date: '09-27', slots: [1], place: 'library', dur: 1, announce: '09-16', cond: 'FLAG_P2_SLY',
    notice: '금요일 오후2, 도서관 안쪽 책상. 판시가 편지 이야기를 하겠다고 했다.', scene: 'ev2_sly',
  },
]

const BY_ID = new Map(CALENDAR.map((e) => [e.id, e]))
export const calendarEvent = (id: string) => BY_ID.get(id)

const holds = (s: GameState, c?: string) => { if (!c) return true; try { return evalCond(s, c) } catch { return false } }
const visible = (s: GameState, e: CalendarEvent, today: string) => (!e.announce || dayIndex(today) >= dayIndex(e.announce)) && holds(s, e.cond)

/** 현재 시각(일과 중이면 일과의 날짜·시간대, 아니면 달력) */
export function nowOf(s: GameState): { date: string; slot: number } {
  const r = s.routine
  if (r) return { date: r.days[Math.min(r.dayIdx, r.days.length - 1)].date, slot: Math.min(r.slotIdx, 2) }
  return { date: s.calendar.date, slot: 0 }
}

/** 지금 이 장소에서 참여할 수 있는 행사(날짜·시간대·장소 일치, 미참가, 공개·성립 조건) */
export function openEventsAt(s: GameState, loc: string): CalendarEvent[] {
  const { date, slot } = nowOf(s)
  return CALENDAR.filter((e) => e.place === loc && e.date === date && e.slots.includes(slot) && !s.board?.done[e.id] && visible(s, e, date))
}

export type BoardStatus = 'done' | 'today' | 'upcoming' | 'missed'
export interface BoardItem { id: string; title: string; kind: CalendarEvent['kind']; date: string; slots: number[]; place: string; status: BoardStatus; result?: string; notice: string; terms?: string; lore?: string; read: boolean; conflictWith: string[] }

/** 게시판: 이번 달(현재 날짜의 월) 행사. 보이지 않는 일정(아직 공지 전·성립하지 않은 약속)은 존재 자체를 알리지 않는다. 읽기 전용. */
export function boardView(s: GameState): { month: number; items: BoardItem[] } {
  const { date, slot } = nowOf(s)
  const month = Number(date.split('-')[0])
  const now = dayIndex(date) * 3 + slot
  const items = CALENDAR.filter((e) => Number(e.date.split('-')[0]) === month && visible(s, e, date)).map((e): BoardItem => {
    const start = dayIndex(e.date) * 3 + e.slots[0], end = dayIndex(e.date) * 3 + e.slots[e.slots.length - 1] + e.dur - 1
    const done = s.board?.done[e.id]
    const status: BoardStatus = done ? 'done' : now > end ? 'missed' : now >= start ? 'today' : 'upcoming'
    const conflictWith = CALENDAR.filter((o) => o.id !== e.id && o.date === e.date && o.slots.some((x) => e.slots.includes(x)) && visible(s, o, date)).map((o) => o.title)
    return { id: e.id, title: e.title, kind: e.kind, date: e.date, slots: e.slots, place: e.place, status, result: done, notice: e.notice, terms: e.terms, lore: e.lore, read: !!s.board?.read.includes(e.id), conflictWith }
  })
  items.sort((a, b) => dayIndex(a.date) * 3 + a.slots[0] - (dayIndex(b.date) * 3 + b.slots[0]))
  return { month, items }
}

/** 일과 구간 안에서 [fromT, toT) 칸에 시작하는, 아직 참가하지 않은 행사(시간 건너뛰기 계획용). t는 일과 칸 번호(날짜 인덱스×3 + 시간대) */
export function eventsStartingIn(s: GameState, fromT: number, toT: number): { e: CalendarEvent; at: number }[] {
  const r = s.routine; if (!r) return []
  const out: { e: CalendarEvent; at: number }[] = []
  for (const e of CALENDAR) {
    if (s.board?.done[e.id] || !r.locations.includes(e.place)) continue
    const di = r.days.findIndex((d) => d.date === e.date); if (di < 0 || !visible(s, e, e.date)) continue
    const ts = e.slots.map((sl) => di * 3 + sl).filter((t) => t >= fromT && t < toT).sort((a, b) => a - b)
    if (ts.length) out.push({ e, at: ts[0] })
  }
  return out.sort((a, b) => a.at - b.at)
}
