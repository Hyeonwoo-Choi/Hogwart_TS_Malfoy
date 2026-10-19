export interface Location { id: string; name: string; desc: string }
export const LOCATIONS: Record<string, Location> = {
  hall: { id: 'hall', name: '대연회장', desc: '촛불이 떠 있는 긴 식탁. 저녁이면 모두가 모인다.' },
  library: { id: 'library', name: '도서관', desc: '서가 사이로 먼지가 가라앉는 조용한 곳.' },
  potions: { id: 'potions', name: '마법약 교실', desc: '지하의 서늘한 교실. 약초 냄새가 배어 있다.' },
  pitch: { id: 'pitch', name: '퀴디치 경기장', desc: '바람이 센 열린 경기장.' },
  courtyard: { id: 'courtyard', name: '안뜰', desc: '석조 회랑으로 둘러싸인 작은 뜰.' },
  lake: { id: 'lake', name: '검은 호수', desc: '물가를 따라 안개가 낮게 깔린다.' },
  common: { id: 'common', name: '기숙사 휴게실', desc: '낡은 소파와 벽난로. 쉬기에 좋다.' },
  classroom4: { id: 'classroom4', name: '4층 빈 교실', desc: '먼지 덮인 책상만 남은 교실.' },
  corridor7: { id: 'corridor7', name: '7층 복도', desc: '벽 한쪽이 유난히 조용하다.' },
  slytherin: { id: 'slytherin', name: '슬리데린 휴게실', desc: '호수 밑으로 비치는 녹색 빛.' },
}

export type ActivityId = 'study' | 'train' | 'quidditch' | 'talk' | 'rest'
export interface Activity { id: ActivityId; name: string; gains: Partial<Record<'int' | 'str' | 'magic' | 'insight' | 'social' | 'will', number>>; desc: string }
export const ACTIVITIES: Activity[] = [
  { id: 'study', name: '공부', gains: { int: 2 }, desc: '지성이 오른다.' },
  { id: 'train', name: '마법 훈련', gains: { magic: 2, will: 1 }, desc: '마법 실력과 의지력이 오른다.' },
  { id: 'quidditch', name: '퀴디치', gains: { str: 2 }, desc: '체력이 오른다.' },
  { id: 'talk', name: '대화', gains: { social: 2, insight: 1 }, desc: '사교성과 통찰력이 오른다.' },
  { id: 'rest', name: '휴식', gains: { will: 2 }, desc: '의지력이 오른다.' },
]

/** 드레이코 주간 일정 (GAME_BIBLE 3.2) — 슬롯: 오후1, 오후2, 저녁. 장소-시간 모순 방지의 유일 원천 */
export const DRACO_SCHEDULE: Record<string, [string, string, string]> = {
  월: ['potions', 'library', 'hall'],
  화: ['library', 'pitch', 'hall'],
  수: ['classroom4', 'courtyard', 'hall'],
  목: ['library', 'pitch', 'hall'],
  금: ['potions', 'library', 'hall'],
  토: ['pitch', 'lake', 'hall'],
  일: ['library', 'courtyard', 'hall'],
}
export const DRACO_NIGHT: Record<string, string> = {
  월: 'slytherin', 화: 'slytherin', 수: 'corridor7', 목: 'slytherin', 금: 'slytherin', 토: 'corridor7', 일: 'slytherin',
}

export const EMOTION_KO: Record<string, string> = {
  affinity: '호감', trust: '신뢰', respect: '존경', attraction: '끌림',
  jealousy: '질투', wariness: '경계심', guilt: '죄책감', dependence: '의존성',
}
export const STAT_KO: Record<string, string> = {
  int: '지성', str: '체력', magic: '마법 실력', insight: '통찰력', social: '사교성', will: '의지력',
}
export const EXPR_KO: Record<string, string> = {
  calm: '평온', blank: '무표정', smirk: '비웃음', interest: '흥미', flustered: '당황',
  angry: '분노', anxious: '불안', sad: '슬픔', resolve: '결심', smile: '미소',
}
export const CHAR_KO: Record<string, string> = {
  draco: '드레이코', hermione: '헤르미온느', ron: '론', ginny: '지니', luna: '루나', slughorn: '슬러그혼', pansy: '판시', hooch: '후치', snape: '스네이프', mcgonagall: '맥고나걸', filch: '필치',
}
