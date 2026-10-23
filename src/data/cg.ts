/**
 * CG 레지스트리 (VISUAL_ASSET_PLAN.md가 구도·제작 상태의 기준).
 * - 해금은 장면 경험으로만 결정되며 이미지 파일 유무와 무관하다.
 * - 미경험 CG의 제목·설명·썸네일은 갤러리에 노출하지 않는다.
 * - 같은 ID를 다른 사건에 재사용하지 않는다.
 */
export type CgKind = 'event' | 'service'
export interface CgEntry { id: string; chapter: number; kind: CgKind; title: string; caption: string }

export const CG_LIST: CgEntry[] = [
  { id: 'cg_train_sleeve', chapter: 1, kind: 'event', title: '끝까지 내린 소매', caption: '9월 1일, 급행열차의 객실. 창밖을 보던 손이 소매 끝을 붙잡는다.' },
  { id: 'cg_pitch_fall', chapter: 1, kind: 'event', title: '세 번째 급강하', caption: '정점에서 빗자루가 흔들리고, 손이 미끄러지는 순간.' },
  { id: 'cg_bench_water', chapter: 1, kind: 'service', title: '빚이 아닌 물병', caption: '사람들이 떠난 경기장 가장자리. 물병 하나 거리만큼의 침묵.' },
  { id: 'cg_corridor_faceoff', chapter: 1, kind: 'event', title: '토요일 밤의 7층', caption: '지팡이 불빛 두 개가 서로의 얼굴을 비춘다.' },
  { id: 'cg_dinner_mask', chapter: 2, kind: 'service', title: '공연이 끝난 뒤', caption: '만찬장 모퉁이 너머, 벽에 이마를 기댄 채 숨을 고르는 사람.' },
  { id: 'cg_blast_4f', chapter: 2, kind: 'event', title: '검보랏빛 불꽃', caption: '4층 빈 교실. 책상 모서리를 갉아먹듯 번지는 불꽃.' },
  { id: 'cg_snitch_dive', chapter: 2, kind: 'event', title: '두 호흡의 차이', caption: '금빛 점을 향해 나란히 떨어지는 두 수색꾼.' },
  { id: 'cg_fracture', chapter: 2, kind: 'event', title: '균열', caption: '방어 주문과 검보랏빛 마법이 맞부딪친 순간의 흰빛.' },
  { id: 'cg_after_light', chapter: 2, kind: 'event', title: '지팡이 불빛 아래', caption: '쓰러진 사람의 얼굴을 비춘 불빛. 아는 얼굴이고, 모르는 얼굴이다.' },
  { id: 'cg_dawn_cloak', chapter: 2, kind: 'service', title: '새벽의 망토', caption: '창으로 회색 빛이 든다. 무릎 위에 접힌 투명 망토.' },
  { id: 'cg_trophy_chair', chapter: 3, kind: 'service', title: '의자 하나의 거리', caption: '트로피실, 말포이가 앉은 의자와 서 있는 해리 사이의 한 걸음.' },
  { id: 'cg_letter_flicker', chapter: 3, kind: 'event', title: '봉투 위의 흔들림', caption: '검은 봉투를 쥔 손과, 잠깐 어긋나는 윤곽.' },
  { id: 'cg_cabinet_apple', chapter: 4, kind: 'event', title: '반쪽의 사과', caption: '캐비닛 문 안쪽에서 돌아온 사과. 한쪽 단면이 매끈하게 비어 있다.' },
  { id: 'cg_necklace_road', chapter: 5, kind: 'event', title: '길 위의 비명', caption: '호그스미드의 좁은 길. 갈색 종이가 찢기고, 초록 보석이 빛난다.' },
  { id: 'cg_scar_sleeve', chapter: 6, kind: 'event', title: '걷어 올린 소매', caption: '빈 교실의 정적. 왼팔에는 표식 대신 하얗게 번진 선이 있다.' },
  { id: 'cg_xmas_hearth', chapter: 6, kind: 'service', title: '불빛 앞의 거리', caption: '크리스마스 이브의 벽난로. 소파의 양쪽 끝, 한 사람이 더 앉을 만큼의 거리.' },
  { id: 'cg_lab_vigil', chapter: 7, kind: 'service', title: '가라앉지 않는 병', caption: '비어 가는 마법약 교실. 촛불 앞에서 기울어진 유리병 하나와 두 사람의 손.' },
  { id: 'cg_hall_flicker', chapter: 2, kind: 'event', title: '아침 식탁의 흔들림', caption: '대연회장 촛불 아래, 아주 짧게 어긋나는 윤곽.' },
]
export const CG_BY_ID: Record<string, CgEntry> = Object.fromEntries(CG_LIST.map((c) => [c.id, c]))
