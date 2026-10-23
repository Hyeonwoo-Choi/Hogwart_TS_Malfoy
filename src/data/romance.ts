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
    sceneId: 'v2c1_pitch_D', chapter: 1, relationshipContext: '적대 — 라이벌', level: 'RIVAL',
    triggerCondition: 'K-03 D 선택(FLAG_PRIVATE_HELP)',
    consentAndAutonomy: '말포이가 물병을 받을지 스스로 결정하고, "빚이 아니다"라는 조건을 직접 정한다. 해리는 다가가는 거리까지만 정한다.',
    narrativePurpose: '공개적 동정이 아닌 사적인 배려가 그의 자존심을 덜 다친다는 것을 해리가 처음 배운다.',
    visualPreset: 'light:warm · draco pose:slumped→guard · gaze:away', cgId: 'cg_bench_water',
    fallbackScene: 'v2c1_pitch_A / v2c1_pitch_B / v2c1_pitch_C (공개 도움·조롱·교사 호출)',
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
  {
    sceneId: 'ch3_chair', chapter: 3, relationshipContext: '비밀의 공유 이후 — 조심스러운 곁', level: 'R1',
    triggerCondition: 'FLAG_DAWN_VIGIL',
    consentAndAutonomy: '말포이가 앉을지·말을 할지·언제 끝낼지를 스스로 정한다. 해리는 의자를 권하지 않고 거리도 좁히지 않는다.',
    narrativePurpose: '새벽을 함께 견딘 일이 벌 시간의 침묵에 남긴 흔적. 호감이 아니라 "곁에 있어도 되는 사람"의 확인.',
    visualPreset: 'light:warm · draco form:illusion pose:sit gaze:side', cgId: 'cg_trophy_chair',
    fallbackScene: 'ch3_shelf_alone (각자 맡은 선반만 정리한다)',
    futureConsequence: 'FLAG_SHELF_HELP → 챕터 3 EH-01 높은 분기, 챕터 4 안뜰 대사',
  },
  {
    sceneId: 'ch6_mark_B', chapter: 6, relationshipContext: '의심과 신뢰의 사이 — 스스로 보여 주는 일', level: 'R1',
    triggerCondition: 'K-12 아님: K-11 B 선택(보여 달라고 요청)',
    consentAndAutonomy: '말포이가 조건(아무에게도 알리지 않기)을 정하고, 환영을 걷을 팔과 시간을 스스로 정한다. 해리는 그가 보여 주는 것까지만 본다. 접촉 없음.',
    narrativePurpose: '확인의 방식이 관계를 결정한다. 같은 사실(표식 없음)이 강제로 얻을 때와 허락받을 때 전혀 다른 의미가 된다.',
    visualPreset: 'light:warm · draco form:true(팔만) pose:stand gaze:down', cgId: 'cg_scar_sleeve',
    fallbackScene: 'ch6_mark_A(강제 확인) / ch6_mark_C(우연한 목격)',
    futureConsequence: 'promise:SCAR_SECRET, 자율성+4·신뢰+3 → 챕터 6 EH-03 차분한 반응, 챕터 8 진실 공개의 신뢰 기반',
  },
  {
    sceneId: 'ch6_xmas_B', chapter: 6, relationshipContext: '비밀을 쥔 사이 — 말 없는 곁', level: 'R1',
    triggerCondition: 'K-12 B 선택(곁에 앉기)',
    consentAndAutonomy: '앉는 거리는 한 사람이 더 앉을 만큼. 말포이가 허락(…여기 있어도 돼)을 스스로 말한다. 해리는 묻지 않는다.',
    narrativePurpose: '위로가 아니라 곁의 확인. 열지 않은 봉투를 태우는 장면으로 그의 짐이 아직 있음을 남긴다.',
    visualPreset: 'light:warm · draco pose:lean gaze:front→down · 환영 유지', cgId: 'cg_xmas_hearth',
    fallbackScene: 'ch6_xmas_A(선물) / ch6_xmas_C(지나침)',
    futureConsequence: '존경+3·신뢰+2·자율성+2 → 챕터 7 이후 관계 판정 입력',
  },
  {
    sceneId: 'ch7_lab_night', chapter: 7, relationshipContext: '공동 작업 끝 — 서로의 능력을 인정한 뒤의 정적', level: 'R2',
    triggerCondition: 'FLAG_CO_DESIGNED',
    consentAndAutonomy: '이름을 정할 권한도, 정리하고 남을지도 말포이가 정한다. 접촉은 펜을 건넬 때 스친 손 하나뿐이고 그가 먼저 거둔다. 해리는 거리를 그대로 둔다. 환영 유지.',
    narrativePurpose: '로맨스 표현의 첫 해금. 승리나 고백이 아니라, 같이 만든 것이 가라앉지 않았다는 사실 앞의 조용한 인정. 감정의 이름은 붙이지 않는다.',
    visualPreset: 'light:warm · draco pose:stand gaze:front→down · 환영 유지 · 카메라는 병과 손', cgId: 'cg_lab_vigil',
    fallbackScene: 'ch7_lab_plain (라이벌·협력의 존중: 이름을 두 개 적고 서로의 몫을 인정)',
    futureConsequence: 'FLAG_LAB_VIGIL, 존경+2·신뢰+2·호감+2·끌림+1 → 챕터 8 편지 장면(EH-04)의 신뢰 기반',
  },
]
