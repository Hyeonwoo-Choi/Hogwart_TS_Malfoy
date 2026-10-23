/**
 * 세계관 용어집. 플레이어가 대사에서 실제로 마주친 용어만 열린다(GameState.terms).
 * - 설명은 원작 세계관의 일반 상식 수준이다. 이 작품의 비밀·미래 사건·인물의 속사정은 쓰지 않는다(테스트가 금지어를 검사한다).
 * - aliases는 대사 본문에서 찾는 표기다(긴 표기를 먼저 맞춘다).
 */
export type GlossaryCategory = '시험과 제도' | '학교생활' | '퀴디치' | '장소' | '물건과 문화' | '사회'
export interface GlossaryEntry { id: string; term: string; aliases: string[]; category: GlossaryCategory; summary: string; text: string }

export const GLOSSARY: GlossaryEntry[] = [
  { id: 'newt', term: 'N.E.W.T.', aliases: ['N.E.W.T.'], category: '시험과 제도', summary: '상급 마법사 시험',
    text: '6~7학년 과정을 마치고 치르는 최종 시험. 졸업 뒤 어떤 직업을 가질 수 있는지에 크게 영향을 준다. 이 과정을 듣으려면 5학년의 O.W.L. 성적이 일정 수준 이상이어야 한다.' },
  { id: 'owl', term: 'O.W.L.', aliases: ['O.W.L.'], category: '시험과 제도', summary: '보통 마법사 시험',
    text: '5학년 말에 치르는 시험. 과목마다 등급이 나오고, 이 성적에 따라 6학년부터 어떤 상급 과목을 들을 수 있는지가 정해진다.' },
  { id: 'prefect', term: '감독생', aliases: ['감독생'], category: '시험과 제도', summary: '기숙사의 학생 대표',
    text: '5학년 이상 학생 중 기숙사마다 선발되는 학생 대표. 복도 순찰과 하급생 지도를 맡고 교사를 도우며, 규칙을 어긴 학생에게 벌을 줄 권한이 조금 있다. 가슴에 배지를 단다.' },
  { id: 'housepoints', term: '기숙사 점수', aliases: ['기숙사 점수'], category: '시험과 제도', summary: '기숙사 대항 점수 제도',
    text: '학생들은 그리핀도르·후플푸프·레번클로·슬리데린 네 기숙사 중 한 곳에 속한다. 칭찬받을 일을 하면 점수를 얻고 규칙을 어기면 깎이며, 학년 말에 점수가 가장 높은 기숙사가 기숙사 컵을 받는다.' },
  { id: 'houses', term: '호그와트의 네 기숙사', aliases: ['그리핀도르', '슬리데린', '레번클로', '후플푸프'], category: '학교생활', summary: '학생들이 속하는 네 개의 기숙사',
    text: '그리핀도르(용기), 슬리데린(야망), 레번클로(지혜), 후플푸프(성실)의 네 곳. 입학할 때 배정되며, 식당의 긴 식탁도 기숙사별로 나뉘어 있다.' },
  { id: 'classes', term: '주요 마법 과목', aliases: ['변신술', '방어술', '주문학', '약초학'], category: '학교생활', summary: '호그와트의 주요 과목',
    text: '변신술은 물건이나 생물의 모습을 바꾸는 법, 방어술은 해로운 마법에 맞서는 법, 주문학은 다양한 주문을 익히는 과목이다. 약초학은 온실에서 식물을 다루고, 마법약은 지하 교실에서 약을 만든다.' },
  { id: 'potions', term: '마법약', aliases: ['마법약'], category: '학교생활', summary: '재료를 계량하고 달여 만드는 마법 약',
    text: '정확한 재료 분량, 불 조절, 젓는 순서가 결과를 좌우하는 과목. 주문처럼 외치는 마법이 아니라 손과 관찰이 중요하다. 지하 교실에서 수업한다.' },
  { id: 'slugclub', term: '슬러그 클럽', aliases: ['슬러그 클럽'], category: '학교생활', summary: '슬러그혼 교수의 사교 모임',
    text: '마법약 교수 호러스 슬러그혼이 재능이나 집안, 인맥이 있는 학생을 골라 식사와 모임에 초대하는 비공식 모임. 초대받는다는 것 자체가 하나의 평판이 된다.' },
  { id: 'runes', term: '고대 룬 문자', aliases: ['룬 문자', '룬 사전', '룬'], category: '학교생활', summary: '마법적 의미가 담긴 고대 문자',
    text: '오래된 보호 문구나 맹세를 새기던 문자 체계. 한 줄이 문맥에 따라 전혀 다르게 읽히기도 해서, 해독에는 문법만큼 배경지식이 필요하다.' },
  { id: 'quidditch', term: '퀴디치', aliases: ['퀴디치', '쿼플', '수색꾼', '추격수', '키퍼', '비터', '스니치'], category: '퀴디치', summary: '빗자루를 타고 하는 마법사의 구기 경기',
    text: '한 팀 일곱 명. 추격수 셋이 쿼플로 골대에 점수를 내고, 키퍼는 골대를 지킨다. 비터 둘은 블러저로 상대를 방해하며, 수색꾼은 황금 스니치를 잡으면 큰 점수를 얻고 경기를 끝낸다. 기숙사마다 팀이 있다.' },
  { id: 'chocofrog', term: '개구리 초콜릿', aliases: ['개구리 초콜릿', '초콜릿 개구리'], category: '물건과 문화', summary: '진짜 개구리처럼 뛰는 초콜릿',
    text: '포장을 열면 펄쩍 뛰어 달아나는 마법사들의 과자. 안에는 유명한 마법사의 카드가 한 장 들어 있어서 모으는 사람이 많다. 덤블도어 카드도 그중 하나다.' },
  { id: 'quibbler', term: '퀴블러', aliases: ['퀴블러'], category: '물건과 문화', summary: '루나의 아버지가 펴내는 잡지',
    text: '제노필리우스 러브굿이 발행하는 마법사 잡지. 남들이 쉽게 믿지 않는 이야기가 많이 실린다는 평이 있다.' },
  { id: 'weasleyshop', term: '위즐리 쌍둥이 가게', aliases: ['위즐리 쌍둥이'], category: '물건과 문화', summary: '장난 마법 가게',
    text: '지니의 오빠인 쌍둥이가 차린 장난 마법 상점. 지팡이가 닭으로 변하는 장난감 같은 물건을 판다.' },
  { id: 'cloak', term: '투명 망토', aliases: ['투명 망토'], category: '물건과 문화', summary: '쓴 사람을 보이지 않게 하는 망토',
    text: '몸을 덮으면 모습이 보이지 않게 되는 망토. 해리는 아버지에게서 물려받은 것을 가지고 있다. 소리와 냄새까지는 가려 주지 않는다.' },
  { id: 'express', term: '호그와트 급행열차', aliases: ['급행열차', '9와 4분의 3'], category: '장소', summary: '학기 첫날 학생들을 학교로 태우는 열차',
    text: '런던 킹스크로스역의 9와 4분의 3 승강장에서 학기 첫날 정오에 출발한다. 마법사가 아닌 사람들의 눈에는 승강장이 보이지 않는다.' },
  { id: 'hogsmeade', term: '호그스미드', aliases: ['호그스미드'], category: '장소', summary: '학교 근처의 마법사 마을',
    text: '상점과 술집이 모여 있는 마법사 마을. 학생들은 학교가 허락한 주말에만 나갈 수 있다.' },
  { id: 'requirement', term: '필요의 방', aliases: ['필요의 방'], category: '장소', summary: '성 7층의 알려진 방',
    text: '성 7층에 있다고 전해지는 방. 필요한 사람이 간절히 원할 때만 문이 나타나고, 방의 모습도 그 필요에 따라 달라진다고 한다.' },
  { id: 'ministry', term: '마법부', aliases: ['마법부'], category: '사회', summary: '영국 마법 사회의 정부 기관',
    text: '영국 마법사 사회를 다스리는 정부 기관. 마법 관련 법을 집행하고, 청소년 대상 연구상이나 시험도 이곳이 관리한다.' },
  { id: 'azkaban', term: '아즈카반', aliases: ['아즈카반'], category: '사회', summary: '마법사 감옥',
    text: '바다 한가운데 있는 마법사 감옥. 중범죄를 저지른 마법사가 갇힌다.' },
  { id: 'deatheaters', term: '죽음을 먹는 자들', aliases: ['죽음을 먹는 자들'], category: '사회', summary: '볼드모트를 따르는 마법사들',
    text: '어둠의 마법사 볼드모트를 따르는 무리. 그가 돌아온 뒤 마법 사회는 이들이 누구인지, 누가 연루됐는지를 두고 불안해하고 있다.' },
]

const BY_ID = new Map(GLOSSARY.map((g) => [g.id, g]))
export const glossaryEntry = (id: string) => BY_ID.get(id)

/** 별칭(긴 것 먼저) → 용어 id */
const ALIAS_LIST = GLOSSARY.flatMap((g) => g.aliases.map((a) => ({ a, id: g.id }))).sort((x, y) => y.a.length - x.a.length)

export interface TextSeg { text: string; term?: string }
/** 본문을 일반 글자와 용어로 나눈다. 같은 용어는 한 줄에서 처음 나온 곳만 표시한다. */
export function segmentText(text: string): TextSeg[] {
  const hits: { s: number; e: number; id: string }[] = []
  const used = new Set<string>()
  for (const { a, id } of ALIAS_LIST) {
    let from = 0
    for (;;) {
      const i = text.indexOf(a, from)
      if (i < 0) break
      from = i + a.length
      if (used.has(id) || hits.some((h) => i < h.e && i + a.length > h.s)) continue
      hits.push({ s: i, e: i + a.length, id }); used.add(id)
    }
  }
  hits.sort((p, q) => p.s - q.s)
  const out: TextSeg[] = []
  let pos = 0
  for (const h of hits) {
    if (h.s > pos) out.push({ text: text.slice(pos, h.s) })
    out.push({ text: text.slice(h.s, h.e), term: h.id }); pos = h.e
  }
  if (pos < text.length) out.push({ text: text.slice(pos) })
  return out.length ? out : [{ text }]
}

/** 텍스트에 등장한 용어 id 목록 */
export function termsIn(text: string): string[] {
  return segmentText(text).filter((s) => s.term).map((s) => s.term!)
}
