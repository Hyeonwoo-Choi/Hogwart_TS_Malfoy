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
/**
 * 활동. gains는 내부 데이터이며 플레이어에게 표시하지 않는다(선택 전 보상 비공개 정책, BALANCE_REPORT.md).
 * desc는 상황 묘사만 한다 — 능력치 이름·수치·성장 종류를 쓰지 않는다.
 */
export interface Activity { id: ActivityId; name: string; gains: Partial<Record<'int' | 'str' | 'magic' | 'insight' | 'social' | 'will', number>>; desc: string }
export const ACTIVITIES: Activity[] = [
  { id: 'study', name: '공부', gains: { int: 2, insight: 1 }, desc: '책을 펴고 자리를 잡는다.' },
  { id: 'train', name: '마법 훈련', gains: { magic: 2, will: 1 }, desc: '지팡이를 들고 같은 주문을 되풀이한다.' },
  { id: 'quidditch', name: '퀴디치', gains: { str: 2, magic: 1 }, desc: '빗자루를 들고 바람 속으로 나간다.' },
  { id: 'talk', name: '대화', gains: { social: 2, insight: 1 }, desc: '거기 있는 누군가와 이야기를 나눈다.' },
  { id: 'rest', name: '휴식', gains: { will: 2 }, desc: '아무것도 하지 않는 시간을 허락한다.' },
]

/** 활동 후 서술(1인칭). 장소·방문 횟수·시간대에 따라 달라지며 수치는 말하지 않는다. */
const LOC_FLAVOR: Record<string, string[]> = {
  hall: ['식탁 끝자리에 앉았다. 천장에는 오늘도 마법으로 만든 하늘이 흘렀다.', '대연회장은 비어 있을 때 더 넓어 보였다.', '접시를 치우던 집요정의 기척이 식탁 아래로 사라졌다.'],
  library: ['핀스 부인의 시선을 피해 창가 자리에 앉았다.', '먼지 냄새와 잉크 냄새가 섞인 공기가 익숙해지기 시작했다.', '서가 사이에서 누군가 책장을 넘기는 소리가 들렸다가 멎었다.'],
  potions: ['지하 교실의 서늘함이 소매 안으로 스며들었다.', '솥 바닥에 남은 얼룩이 오늘따라 눈에 걸렸다.', '약초 선반의 유리병들이 촛불을 받아 희미하게 빛났다.'],
  pitch: ['바람이 셌다. 경기장 위의 하늘은 성 안보다 넓었다.', '골대 세 개가 오후 빛을 받아 길게 그림자를 늘였다.', '잔디 위에 누군가의 빗자루 자국이 아직 남아 있었다.'],
  courtyard: ['회랑 기둥 사이로 햇빛이 비스듬히 들어왔다.', '안뜰 분수의 물소리가 생각보다 컸다.', '누군가 벤치에 두고 간 깃펜 하나가 바람에 굴렀다.'],
  lake: ['호수는 오늘도 아무 말이 없었다.', '물가의 안개가 발목까지 차올랐다.', '멀리서 거대 오징어의 다리 하나가 물 위로 올라왔다가 사라졌다.'],
  common: ['벽난로 앞 소파가 비어 있었다. 운이 좋은 날이다.', '휴게실은 늘 누군가의 웃음소리로 조금 시끄러웠다.', '창밖으로 퀴디치 경기장의 깃발이 보였다.'],
  classroom4: ['4층 빈 교실은 문이 반쯤 열려 있었다.', '먼지 덮인 책상들 사이로 내 발자국만 찍혔다.', '창틀에 앉은 비둘기가 나를 한참 쳐다보았다.'],
}
const ACT_CLOSE: Record<ActivityId, string[]> = {
  study: ['책장을 넘기다 보니 시간이 금방 갔다.', '같은 문단을 세 번 읽고서야 머리에 들어왔다.', '필기 한쪽에 모르는 단어를 적어 두었다.'],
  train: ['손목이 뻐근해질 때까지 같은 동작을 반복했다.', '주문이 처음보다 덜 흔들렸다. 아마도.', '실패한 횟수를 세다가 그만두었다.'],
  quidditch: ['내려왔을 때 다리가 후들거렸다. 기분 좋은 쪽으로.', '바람을 가르는 동안에는 아무 생각도 나지 않았다.', '몇 번 아슬아슬하게 땅을 스쳤다.'],
  talk: ['몇 마디 나눴을 뿐인데 하루의 표정이 조금 달라 보였다.', '대화 끝에 들은 사소한 이야기 하나가 귀에 남았다.', '생각보다 오래 이야기했다.'],
  rest: ['아무것도 하지 않았다. 그게 필요했다.', '눈을 감고 있다 보니 조금 가벼워졌다.', '오랜만에 숨을 길게 쉬었다.'],
}
export function activityMessage(loc: string, act: ActivityId, visit: number, slotIdx: number): string {
  const lf = LOC_FLAVOR[loc] ?? ['시간을 보냈다.']
  const ac = ACT_CLOSE[act]
  return `${lf[(visit - 1 + slotIdx) % lf.length]} ${ac[(visit - 1) % ac.length]}`
}

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
  acceptance: '자기수용', autonomy: '자율성', exposure: '노출도',
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
