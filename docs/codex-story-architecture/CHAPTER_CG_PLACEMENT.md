# CHAPTER_CG_PLACEMENT — 챕터별 배치 명세

> `실제`는 2026-10-22 코드의 장면/CG ID다. `제안`은 아직 없는 제작 ID다. Ch6~7에는 이미 등록·호출되는 CG가 있으며, 그 밖의 Ch6~14 항목은 설계 기반 장기 계획이다.

## Ch1~5 구현 대응 상세

| Ch | scene / CG | 정확한 시점·조건 | 구도·표정·복장·환경 | 직후 행동 | 자산·기술 | 우선 |
|---|---|---|---|---|---|---|
| 1 | `v2c1_train` / `cg_train_sleeve` 실제 | 객실 문틈에서 소매를 두 번째 내릴 때. 모든 경로 | 해리 눈높이 중경, 창가 역광, 손과 소매 전경. 드레이코 경직, 교복 외투 | 판시가 식사를 묻고 드레이코가 문을 닫으라 함 | 기존 정적 CG | P1 |
| 1 | `v2c1_pitch` / `cg_pitch_fall` 실제 | 세 번째 급강하에서 손이 미끄러지는 순간 | 광각 원근, 빗자루 대각선, 지면은 흐림. 놀람보다 통제 상실 | K-03 구조/관찰/교사/조롱 선택 | 정적 CG+shake | P1 |
| 1 | `v2c1_pitch_D` / `cg_bench_water` 실제 | K-03 D, 사람들이 빠진 뒤 따로 접근 | 빈 관중석, 물병 사이 거리. 훈련복·거친 호흡, 접촉 없음 | 감사 대신 빚/경계 대화 | 기존 서비스 CG | P2 |
| 1 | `v2c1_night` / `cg_corridor_faceoff` 실제 | 9/7 밤 지팡이 불빛이 얼굴 둘을 비출 때 | 대칭을 살짝 깨는 투샷, 톱밥·문틈 후경. 경계 자세 | K-04 선택과 이월 | 기존 정적 CG | P1 |
| 1 | `v2c1_prologue_end` / `PROPOSED-CG-C01-GINNY` 제안 | 지니가 손목을 놓고 시간표 약속을 던질 때 | 문틈 원근, 돌아보는 지니, 움직이는 머리·로브 | “화요일에 경기장에서 봐” | 신규 원화; 현 엔진 정적 표시 가능 | P1 |
| 1 | `hr1_hermione_library_1` / `PROPOSED-CG-C01-HER` 제안 | 두 가지로 읽히는 룬 논문을 헤르미온느가 펼쳤을 때 | 책 더미 사선, 연필이 번역문에서 멈춤, 집중/경계 변형 | 공동 검토·비판·거리 유지 중 선택 | 조건별 2표정 필요 | P1 |
| 1 | `hr1_luna_lake_1` / `PROPOSED-CG-C01-LUN` 제안 | 호숫가 파문을 루나가 직접 가리킬 때 | 수면 파문과 얼굴을 한 프레임, 바람에 머리·망토 | 함께 탐색·증거 질문·정중한 거절 | 정적+light 가능 | P1 |
| 1 | `hr1_pansy_courtyard_1` / `PROPOSED-CG-C01-PAN` 제안 | 슬러그혼 클럽 압박 편지를 판시가 접어 숨길 때 | 벤치 양끝의 거리, 편지를 접는 손과 가문 문장 일부 | 곁에 앉기·드레이코 질문·자리 비우기 | 정적 CG | P1 |
| 2 | `ch2_mask` / `cg_dinner_mask` 실제 | 만찬 공연 뒤 벽에 이마를 기대는 순간 | 먼 거리 관찰, 촛불 밖 냉색, 정장 교복 | 접근/거리 유지에 따른 반응 | 기존 서비스 CG | P2 |
| 2 | `ch2_blast` / `cg_blast_4f` 실제 | 4층 불꽃이 책상 모서리를 먹을 때 | 낮은 각도, 검보랏빛 광원, 손보다 불꽃 중심 | 안전 확보·증거 판단 | 정적+shake/light | P1 |
| 2 | `ch2_match` / `cg_snitch_dive` 실제 | 금빛 점을 향해 동시 급강하 | 장망원 압축 뒤 급격한 원근, 경기복·바람 | K-06 승부와 인정/경멸 | 기존 `zoom` 큐는 배경·스프라이트만 확대; CG 자체 확대는 확장 필요 | P1 |
| 2 | `ch2_night` / `cg_fracture` 실제 | 프로테고와 캐비닛 마법 충돌 | 인물을 실루엣으로 두고 균열 중심, 흰빛 과노출 | 해리가 쓰러진 사람에게 접근 | 정적 CG+기존 `flash` 큐 | P1 |
| 2 | `ch2_after` / `cg_after_light` 실제 | 지팡이 빛이 변화한 얼굴을 처음 비출 때 | 해리 시점 가까운 상반신, 공포가 아닌 충격·호흡 | S-01 도움/진실/사과/의무실 | 실제 모습 전용 자산 | P1 |
| 2 | `ch2_dawn` / `cg_dawn_cloak` 실제 | `(FLAG_SECRET_PROMISED || FLAG_HARRY_APOLOGIZED) && draco.trust>=6`; 장면 안에서 머무름을 허용 | 회색 새벽, 무릎 위 망토, 한 사람 거리 | 경계와 약속을 말로 확인 | 서비스 CG | P2 |
| 2 | `ch2_morning` / `cg_hall_flicker` 실제 | 대연회장에서 환영 윤곽이 잠깐 어긋남 | 군중 속 짧은 불일치, 타인은 원인을 모름 | 소란/방관 선택 | 변형 프레임 또는 짧은 dissolve 필요 | P1 |
| 3 | `ch3_chair` / `cg_trophy_chair` 실제 | `FLAG_DAWN_VIGIL`, 의자가 흔들릴 때 | 의자 다리 잡은 손과 로브 자락, 접촉 직전 | 손이 반 뼘 나갔다 멈춤 | 기존 서비스 CG | P2 |
| 3 | `ch3_letter` / `cg_letter_flicker` 실제 | 검은 봉투를 쥔 손과 환영이 어긋날 때 | 봉투 전경, 윤곽 이중상, 공개 장소 | 신뢰 조건별 침묵/공격 | dissolve 신규 필요 | P2 |
| 3 | `ev3_b_shoulder` / `PROPOSED-CG-C03-GIN-RON` 제안 | 훈련 제한과 어깨 통증을 두고 지니와 론이 맞설 때 | 지니의 빗자루와 론의 접힌 팔을 같은 높이에 두고, 결정권은 지니 쪽 시선선으로 강조 | 사실 전달·론 편들기·횟수만 세기 | 정적 다인 원화; Ron 독립 기여 보강 | P2 |
| 4 | `ch4_A_ok` / `cg_cabinet_apple` 실제 | 캐비닛에서 반쪽 사과가 돌아온 직후 | 바닥 낮은 시점, 사과·문짝·발끝 삼각 | 증거 보관/공유 선택 | 기존 이벤트 CG | P1 |
| 4 | `ev4_l_find` / `PROPOSED-CG-C04-LUN` 제안 | 열세 번째 단 아래 쪽지 상자 발견 | 계단 원근, 루나의 귀 기울인 자세, 손전등성 마법광 | 반환/공유/보관 | 정본 미확정 설정 표기 필요 | P2 |
| 4 | `ev4_h_ledger` / `PROPOSED-CG-C04-HER` 제안 | 대출 장부의 범위를 합의할 때 | 장부를 사이에 둔 손 둘, 기록은 읽히지 않게 | 조사 범위 선택 | 정적 CG | P2 |
| 4 | `ev4_p_deal` / `PROPOSED-CG-C04-PAN` 제안 | 판시가 거래 조건을 자기 말로 제시할 때 | 안뜰 아치 역광, 종이/열쇠만 보임 | 수락·재협상·거절 | 정적 CG | P2 |
| 5 | `ch5_katie` / `cg_necklace_road` 실제 | 갈색 종이가 찢어지고 보석이 빛날 때 | 눈길 대각선, 케이티와 보석 사이 안전 거리 | 구조 우선 선택 | 기존 이벤트 CG | P1 |
| 5 | `ev5_g_team` / `PROPOSED-CG-C05-GIN` 제안 | 팀 역할을 지니가 재배분하는 순간 | 전술판 너머 지니, 젖은 경기복/바람 | 해리가 지원·이의·위임 | 정적 CG | P2 |
| 5 | `ev5_r_rumor` / `PROPOSED-CG-C05-PAN` 제안 | 판시가 공개 낙인에 자기 이름으로 반박 | 군중 가장자리, 판시 전경·해리 후경 | 증언 동의 범위 확인 | 다인 레이어 신규 권장 | P2 |

## Ch6~14 장기 배치

| Ch | 제안 ID·사건 | 시각 핵심 | 조건·분기 | 구현 상태/우선 |
|---|---|---|---|---|
| 6 | `ch6_mark_B` / `cg_scar_sleeve` 실제, 소매의 사실 | 손을 뻗지 않고 기다리는 해리 시점, 드레이코가 직접 환영과 소매를 걷음 | K-11 B 동의 경로만 CG 표시; 강제 A·우연 C에는 표시하지 않음 | 등록·호출 확인, 기존 엔진+자산 필요, P1 |
| 6 | `ch6_xmas_B` / `cg_xmas_hearth` 실제, 겨울 불빛 | 소파 양끝, 불빛과 비어 있는 자리 | K-12 B로 말없이 곁에 앉은 경우 | 등록·호출 확인, 기존 엔진+자산 필요, P2 |
| 7 | `PROPOSED-CG-C07-CREDIT`, 공동 발표 | 뒤집힌 이름표와 수정 목록 | 공저·단독·거절 | 설계, P2 |
| 7 | `ch7_lab_night` / `cg_lab_vigil` 실제, 가라앉지 않는 병 | 촛불·유리병·각자 멈춘 손 | `FLAG_CO_DESIGNED`로 공동 설계한 경우 | 등록·호출 확인, 기존 엔진+자산 필요, P2 |
| 8 | 실제 `ch8_letter` / `PROPOSED-CG-C08-LETTER` | 봉투·떨리는 손·벽난로. 글자는 읽히지 않음 | K-14 선택 전 공통 기본 컷; 내용·꽃 의미 변형은 승인 후 | 기반 장면 구현, CG 미등록·자산 없음, P1 |
| 8 | `PROPOSED-CG-C08-RON`, 지워진 추천 | 얇아진 종이와 잉크병 | 론의 독립 결정 | 설계, P2 |
| 9 | `PROPOSED-CG-C09-TEST`, 빈 관중석 | 점수표와 떨어진 이름, 지니 정면 | 기준 공개/검증/거절 | 설계, P2 |
| 10 | `PROPOSED-CG-C10-DEADLINE`, 보호 명단 | 접힌 명단, 세 사람의 다른 거리 | 공유 지식·역할 동의 | 설계, P1 |
| 11 | `PROPOSED-CG-C11-MAP`, 어디까지 갈지 | 펼친 지도와 빠진 의자 | 필요한 정보만 공유했는가 | 설계, P2 |
| 12 | `PROPOSED-CG-C12-SIGN`, 교장실 문턱 | 펜에서 손을 떼는 해리, 당사자가 서명 | 자기 결정 지원/강요/철수 | 설계, P1 |
| 13 | `PROPOSED-CG-C13-PARALLEL`, 탑의 밤 | 계단·들것·부서지는 문을 한 원근축 | 실제 배치만 표시; 탑 미참여 시 사적 대화 없음 | 미확정 탑 정본, P1 |
| 14 | `PROPOSED-CG-C14-PLATFORM`, 여름 문턱 | 주소를 건네기 전 멈춘 손 | 답장 허락·친구·거리두기 | 설계, P2 |

## 커버리지

- 14/14 챕터에 최소 1개 후보가 있다.
- Ch1~5 실제 CG 15개와 신규 후보 10개를 분리했다. 표의 Ch1~5 행은 와일드카드가 없는 실제 장면 ID 25개다. 이전의 “24개” 집계는 `v2c1_pitch_*`를 ID처럼 적은 오류였다.
- `cg.ts`의 18개는 모두 시나리오에서 호출된다(Ch1~5 15개, Ch6 2개, Ch7 1개). `public/assets/manifest.json`은 비어 있어 완성 이미지 자산은 0개다.
- Ch8~14의 `PROPOSED-CG-*`와 Ch7 공동 발표 후보는 장면 계약이며 이미지나 구현 완료를 의미하지 않는다. Ch13은 병행 위기 제안일 뿐 탑 참여 정본을 확정하지 않는다.

## 실제 CG 호출 근거와 판정

| Ch | scene / CG | 핵심 트리거 | 소스 근거 | 구현 판정 |
|---|---|---|---|---|
| 1 | `v2c1_train` / `cg_train_sleeve` | 공통 열차 장면 | `src/data/v2c1a.ts:79` | REQUIRES_ASSET |
| 1 | `v2c1_pitch` / `cg_pitch_fall` | 공통 세 번째 급강하 | `src/data/v2c1b.ts:104` | REQUIRES_ASSET |
| 1 | `v2c1_pitch_D` / `cg_bench_water` | K-03 D | `src/data/v2c1b.ts:158` | REQUIRES_ASSET |
| 1 | `v2c1_night` / `cg_corridor_faceoff` | 공통 9/7 야간 대치 | `src/data/v2c1d.ts:31` | REQUIRES_ASSET |
| 2 | `ch2_mask` / `cg_dinner_mask` | `FLAG_ASKED_DIRECTLY || draco.respect>=26` | `src/data/ch2b.ts:153,159` | REQUIRES_ASSET |
| 2 | `ch2_blast` / `cg_blast_4f` | 공통 4층 폭발 | `src/data/ch2b.ts:189-191` | REQUIRES_ASSET |
| 2 | `ch2_match` / `cg_snitch_dive` | 공통 K-06 직전 | `src/data/ch2b.ts:330` | REQUIRES_ASSET; CG 확대는 확장 |
| 2 | `ch2_night` / `cg_fracture` | 공통 9/28 충돌 | `src/data/ch2c.ts:39` | REQUIRES_ASSET |
| 2 | `ch2_after` / `cg_after_light` | 충돌 직후, 실제 외형 명시 | `src/data/ch2c.ts:61` | REQUIRES_ASSET |
| 2 | `ch2_dawn` / `cg_dawn_cloak` | 약속/사과 이력과 신뢰 6 이상 | `src/data/ch2c.ts:143,165` | REQUIRES_ASSET |
| 2 | `ch2_morning` / `cg_hall_flicker` | 공통 9/29 아침 | `src/data/ch2c.ts:219` | REQUIRES_ASSET; flicker 확장 |
| 3 | `ch3_chair` / `cg_trophy_chair` | `FLAG_DAWN_VIGIL` | `src/data/ch3a.ts:66` | REQUIRES_ASSET |
| 3 | `ch3_letter` / `cg_letter_flicker` | 검은 봉투 공통 장면 | `src/data/ch3b.ts:82` | REQUIRES_ASSET; dissolve 선택 |
| 4 | `ch4_A_ok` / `cg_cabinet_apple` | 잠복 성공 분기 | `src/data/ch4b.ts:44` | REQUIRES_ASSET |
| 5 | `ch5_katie` / `cg_necklace_road` | 공통 K-09 직전 | `src/data/ch5b.ts:36` | REQUIRES_ASSET |
| 6 | `ch6_mark_B` / `cg_scar_sleeve` | K-11 B 동의 | `src/data/ch6b.ts:68` | REQUIRES_ASSET |
| 6 | `ch6_xmas_B` / `cg_xmas_hearth` | K-12 B | `src/data/ch6b.ts:162` | REQUIRES_ASSET |
| 7 | `ch7_lab_night` / `cg_lab_vigil` | `FLAG_CO_DESIGNED` | `src/data/ch7b.ts:98,105` | REQUIRES_ASSET |

18개 모두 등록 ID와 호출 ID가 일치한다. 이미지 파일이 없어도 fallback 프레임으로 진행되므로 이야기 진행은 `READY_WITH_EXISTING_ENGINE`, 완성 연출은 모두 `REQUIRES_ASSET`이다. `cg_snitch_dive`의 CG 자체 확대와 두 flicker 장면의 이중상 전환만 의도한 동작까지 구현하려면 `REQUIRES_ENGINE_EXTENSION`이 추가된다.

## 2026-10-22 자연 도달성 표본

실제 `SCENARIO`와 엔진의 `advance/choose/continueChapter`를 재사용해 8개 플레이 성향 × 고정 시드 4개, 총 32회를 Ch7까지 실행했다. 상태 주입과 장면 점프는 사용하지 않았고 랜덤 일상 이벤트는 끈 표본이다. 32/32회가 완주했으며 등록 CG 18개가 모두 최소 1회 관측됐다. 이는 논리적 완전 탐색이 아니라 재현 가능한 자연 도달 증거다.

| 관측 횟수 | CG |
|---:|---|
| 32/32 | `cg_train_sleeve`, `cg_pitch_fall`, `cg_corridor_faceoff`, `cg_blast_4f`, `cg_snitch_dive`, `cg_fracture`, `cg_after_light`, `cg_hall_flicker`, `cg_letter_flicker`, `cg_necklace_road` |
| 14/32 | `cg_dinner_mask` |
| 12/32 | `cg_bench_water`, `cg_dawn_cloak`, `cg_trophy_chair` |
| 11/32 | `cg_scar_sleeve`, `cg_lab_vigil` |
| 9/32 | `cg_xmas_hearth` |
| 2/32 | `cg_cabinet_apple` |

- `cg_dawn_cloak` 재현 예: 연구 성향/시드 1, S-01 B. 진입 시 `FLAG_SECRET_PROMISED`, 드레이코 신뢰 9였고 이후 `FLAG_DAWN_VIGIL`이 생겨 `cg_trophy_chair`까지 연결됐다.
- `cg_cabinet_apple` 재현 예: 드레이코 성향/시드 4, K-04 A → K-08 A. 진입 통찰 36에서도 실제 판정 성공으로 도달했다. 2/32는 저빈도 근거이지 과도 조건이나 도달 불가의 증명은 아니다.
- Ch1 비드레이코 후보의 기반 장면도 자연 관측됐다: `v2c1_prologue_end` 32/32, `hr1_hermione_library_1` 5/32, `hr1_luna_lake_1` 2/32, `hr1_pansy_courtyard_1` 2/32. 네 후보 모두 장면은 준비됐지만 CG 등록·호출·자산은 아직 없다.

## Ch8~14 후보 검증

| Ch | 사건·후보 | 서사 목적 | 지식·분기 안전 조건 | 판정 |
|---|---|---|---|---|
| 8 | `ch8_letter` / `PROPOSED-CG-C08-LETTER` | 검열과 사생활, K-14 선택의 압력 | 선택 전에는 편지 글자·꽃 의미·목걸이 목표를 숨김 | READY_FOR_IMPLEMENTATION / REQUIRES_ASSET |
| 8 | `ch8_ron` / 론 슬럼프 후보 | 드레이코 사건과 독립된 우정·책임 | 론이 자기 불안을 먼저 말하며 K-15 결과를 선공개하지 않음 | READY_FOR_IMPLEMENTATION / REQUIRES_ASSET |
| 9 | `PROPOSED-CG-C09-TEST` | 시험 기준과 타인을 도구로 삼는 문제 | A~E 중 실제 구현 경로가 결정되기 전 결과 점수·탈락자 숨김 | BLOCKED_BY_STORY_DECISION |
| 10 | `PROPOSED-CG-C10-DEADLINE` | 보호·경기·통로·물자·완성의 기한 충돌 | 나르시사·목표 정보는 획득한 지식만 표시 | BLOCKED_BY_STORY_DECISION |
| 11 | 역할 목록 후보 | 각 인물의 참여 범위와 거절권 | 연애 상태가 협력 여부를 자동 결정하지 않음 | BLOCKED_BY_STORY_DECISION |
| 12 | `PROPOSED-CG-C12-SIGN` | R1~R6와 사건 준비를 분리 | 서명·공개 범위는 당사자 동의 뒤에만 표시 | BLOCKED_BY_STORY_DECISION |
| 13 | `PROPOSED-CG-C13-PARALLEL` | 같은 밤의 분산된 책임과 비용 | 탑 미참여 경로에서 내부 대화·행동을 보여 주지 않음 | BLOCKED_BY_STORY_DECISION |
| 14 | `PROPOSED-CG-C14-PLATFORM` | 사건 성과와 관계 결산을 분리 | 주소·접촉·재결합은 상대의 별도 동의 뒤 표시 | BLOCKED_BY_STORY_DECISION |

Ch8의 32회 표본은 K-14 A 5회, B 10회, C 4회, D 13회였고 EH-04 고신뢰 13회·저신뢰 19회였다. 모든 선택과 양쪽 감정 판정은 자연 도달했다. Ch9~14는 실행 가능한 소스가 없어 도달성을 검증하지 않았다.

