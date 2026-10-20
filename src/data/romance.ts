/**
 * 관계 특별 장면·서비스씬 메타데이터 (ROMANCE_SCENE_GUIDE.md가 연출 원칙의 기준).
 * triggerCondition은 시나리오의 실제 if 조건과 동일한 문자열이며 테스트가 일치 여부를 검증한다.
 * level: R1 정서적 친밀감 / R2 로맨틱한 긴장 / R3 성숙한 로맨스 / R4 사적 친밀감의 암시 / RIVAL 비로맨스 특별 장면
 */
export type SceneLevel = 'R1' | 'R2' | 'R3' | 'R4' | 'RIVAL'
export interface SpecialScene {
  sceneId: string; chapter: number; relationshipContext: string; level: SceneLevel
  triggerCondition: string; consentAndAutonomy: string; narrativePurpose: string
  visualPreset: string; cgId: string | null; fallbackScene: string; futureConsequence: string
}

export const SPECIAL_SCENES: SpecialScene[] = [
  {
    sceneId: 'ch1_pitch_D', chapter: 1, relationshipContext: '적대 — 라이벌', level: 'RIVAL',
    triggerCondition: 'K-03 D 선택(FLAG_PRIVATE_HELP)',
    consentAndAutonomy: '말포이가 물병을 받을지 스스로 결정하고, "빚이 아니다"라는 조건을 직접 정한다. 해리는 다가가는 거리까지만 정한다.',
    narrativePurpose: '공개적 동정이 아닌 사적인 배려가 그의 자존심을 덜 다친다는 것을 해리가 처음 배운다.',
    visualPreset: 'light:warm · draco pose:slumped→guard · gaze:away', cgId: 'cg_bench_water',
    fallbackScene: 'ch1_pitch_A / ch1_pitch_B / ch1_pitch_C (공개 도움·조롱·교사 호출)',
    futureConsequence: '신뢰+4 → 챕터 2 사고 직후 새벽 장면(SS-04) 조건, 챕터 3 EH-01 높은 분기 조건',
  },
  {
    sceneId: 'ch2_mask', chapter: 2, relationshipContext: '경쟁 — 호기심', level: 'R1',
    triggerCondition: 'FLAG_ASKED_DIRECTLY || draco.respect>=26',
    consentAndAutonomy: '말포이가 먼저 "뭘 봐"로 대화를 열지 닫을지 정하고, 대화를 끝내는 것도 그가 한다.',
    narrativePurpose: '완벽한 사교 가면 뒤의 피로를 해리만 본다. 둘 다 "이름 때문에 불려 가는 사람"이라는 공통점.',
    visualPreset: 'light:dim · draco pose:lean gaze:down → stand front', cgId: 'cg_dinner_mask',
    fallbackScene: 'ch2_mask_cold (말포이가 멈추지 않고 지나간다)',
    futureConsequence: '존경 상승, 사고 직후 첫 반응에서 "포터, 너였군"(존경 높음) 대사 조건에 기여',
  },
  {
    sceneId: 'ch2_rival_nod', chapter: 2, relationshipContext: '경쟁', level: 'RIVAL',
    triggerCondition: '!FLAG_FOUL_PLAY && !FLAG_HELD_BACK',
    consentAndAutonomy: '말포이가 패배/승리를 스스로 규정한다. 해리는 위로하지 않는다.',
    narrativePurpose: '정정당당한 경쟁만이 그에게 인정을 받는 방식임을 보여 준다.',
    visualPreset: 'light:normal · draco gaze:front · 짧은 정적', cgId: null,
    fallbackScene: 'ch2_match_B / ch2_match_C의 경멸 반응',
    futureConsequence: '존경+, 사고 장면에서 해리를 향한 첫 저주가 늦게 나온다(대사 변형)',
  },
  {
    sceneId: 'ch2_dawn', chapter: 2, relationshipContext: '비밀의 공유 직후 — 불신 속의 정적', level: 'R1',
    triggerCondition: '(FLAG_SECRET_PROMISED || FLAG_HARRY_APOLOGIZED) && draco.trust>=6',
    consentAndAutonomy: '말포이가 "거기까지"라고 거리를 정하고, 신체 접촉을 거절한다. 해리가 머무는 것은 그가 허락한 조건 안에서만. 망토를 받을지도 그가 정한다.',
    narrativePurpose: '변화 직후의 충격을 함께 견디는 첫 침묵. 로맨스의 시작이 아니라, 서로가 서로의 비밀을 쥔 사이가 되는 순간.',
    visualPreset: 'light:cold → warm(새벽) · draco form:true pose:slumped gaze:away · 카메라 근접 없음', cgId: 'cg_dawn_cloak',
    fallbackScene: 'ch2_alone (말포이가 해리를 내보낸다)',
    futureConsequence: 'FLAG_DAWN_VIGIL, FLAG_CLOAK_LENT(망토를 맡김) → 챕터 3 첫 징계에서 망토 반환 장면',
  },
]
