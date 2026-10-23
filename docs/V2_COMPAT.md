# V2_COMPAT — 이전 이야기 계열과 V2의 호환 정책

> 이전 계열 = 브랜치 `iter1-ch1-2-redesign`(챕터 1~8, 시나리오 버전 `ch1-*`). V2 = `v2-multi-heroine`(시나리오 버전 `v2.ch1.v1`). 설계는 [V2_DESIGN.md](V2_DESIGN.md). 지식 단계 `bonds[id].know`(선택 필드, 없으면 0, 스키마 버전 변경 없음)와 Ch2 S-02 B 이력 → `know.pansy=1` 보정은 [V2_PERCEPTION.md](V2_PERCEPTION.md) 6장·[V2_ROADMAP_IMPL.md](V2_ROADMAP_IMPL.md) 3장 참조(2단계 구현 시 반영).

## 1. 원칙
- 이전 저장을 **조용히 V2 상태로 잘못 해석하지 않는다**. 이어할 수 있는 것만 명시적으로 변환하고, 나머지는 불러오지 않고 **삭제·덮어쓰기 없이 보존**한다.
- 저장 스키마(`schemaVersion: 2`)는 그대로다. V2 저장은 파일에 `story: 'v2'` 표식을 달고, 클라우드 행은 `scenario_version`(`v2.…`)으로 구분한다. Supabase 스키마·RLS·인증은 변경하지 않는다.

## 2. 저장 판정
| 저장 | 판정 | 처리 |
|---|---|---|
| V2(`story: 'v2'`) | 호환 | 그대로 불러옴 |
| 이전 계열, **챕터 2 이상** | 변환 후 이어하기 | `bonds`·`recent`·`emotions.pansy`를 기본값으로 보정(기존 감정·플래그·선택 이력은 그대로). 챕터 2~8은 같은 원고라 장면이 존재한다 |
| 이전 계열, **챕터 1**(메인 장면·야간 선택 이전) | 불러오기 거부(보존) | 챕터 1 장면 ID가 `ch1_*` → `v2c1_*`로 달라 위치를 안전하게 옮길 수 없다. 슬롯은 "이전 버전의 이야기"로 표시되고, 같은 슬롯에 저장하면 `legacy:<slot>`에 원본이 먼저 보존된다 |
| 스키마 v1 | 불러오기 거부(보존) | 기존 정책 유지 |
- 클라우드: 이전 `ch1-*` 행은 호환 목록에 두되, 챕터 1 행은 `checkCompat`에서 "열 수 없음"으로 판정된다(서버 데이터는 건드리지 않음). V2 행은 `v2.ch1.v1`.
- 변환 시 임의 추정 금지: 이전 저장에는 히로인 만남·H 선택 기록이 없으므로 `seen=0`, `romance=none`, `poly=unasked`로 둔다(만난 적 없는 것으로 취급).

## 3. 선택·플래그 대응표(챕터 1)
챕터 2~8이 의존하는 값은 **이전 계열과 같은 ID·효과를 그대로 유지**한다.
| 이전 | V2 | 비고 |
|---|---|---|
| P-01 A~D(성장 +) | P-01 A~D | 지니의 질문에 대한 답으로 재구성, 능력치 효과 동일 |
| K-01 A~C, KN_OVERHEARD·KN_TENSE·FLAG_CAUGHT_EAVESDROP | 동일 | 열차 복도 |
| K-02 A~D, FLAG_OFFERED_POTION_HELP | 동일 | 마법약 교실 |
| K-03 A~D, FLAG_PUBLIC_RESCUE·MOCKED_FALL·CALLED_TEACHER·PRIVATE_HELP, CG 2종 | 동일 | 경기장 |
| K-04 A~D, FLAG_REPORTED_NIGHT·MUTUAL_SECRET(+promise NIGHT_SILENCE)·CONFRONTED_NIGHT·FOLLOWED_NIGHT, CG 1종 | 동일 | 7층 야간 |
| OB_SLEEVE·TREMOR·WINDOW·SCORCH·SAWDUST | 동일 | 관찰 기록 |
| 장면 `ch1_*` | `v2c1_*`(메인) / `hr1_*`(히로인) / `enc1_*`·`fr1_*`(유지) | 챕터 번호는 `^(ch|v2c)\d+_`에서 파생 |
| 신규 | H-01~H-06, `stage/romance/poly/meet` 효과 | 챕터 2 이후 조건에서 선택 사용 |
- 챕터 1 종료 → `ch2_open`(변경 없음). 챕터 2 이후 조건식은 이전 값만 읽으므로 V2 챕터 1을 거친 플레이도 챕터 2~8이 그대로 동작한다.

## 4. 이행 시 남은 호환 과제(챕터 2~)
- 히로인 이벤트 풀(`meets`)을 챕터 2~8 일과 노드에 추가할 때 기존 `friends` 풀 일부를 흡수한다(기존 장면 ID 유지).
- 새로 쓰는 관계 조건은 `stage.<id>`·`romance.<id>`·`MET_/SAW_`만 사용하고, 챕터 2~8의 기존 조건을 바꾸지 않는다.
- 시나리오 버전 정책: V2 챕터가 늘어날 때마다 `v2.chN.v1`을 추가하고 이전 V2 버전은 호환 목록에 남긴다.
