# BRANCH_MAP — 선택·분기·엔딩

> 2026-10-20 새 설정 반영. 능력치 판정값은 새 척도(초기 ~10) 기준. 챕터 3 이후의 판정값(K-09 마법≥50, K-11C 통찰≥45, K-16C 통찰≥55 등)은 해당 회차에서 BALANCE_REPORT.md 기준으로 재조정한다.

표기: 감정은 `draco.trust`처럼 소문자 변수(GAME_BIBLE 4장). 플래그는 1장 레지스트리에 **정의된 것만** 사용한다.
분기 폭발 방지 원칙: 챕터 종료 시 분기를 *상태(플래그·수치)*로 병합한다. 챕터당 고유 변형 장면은 최대 2개, 나머지는 공유 장면 + 조건 대사.

## 1. 플래그 레지스트리

### 1.1 해리의 지식 (KN)
| 플래그 | 의미 | 획득 |
|---|---|---|
| `KN_TENSE` | 드레이코가 평소와 다르게 긴장해 있음을 안다 | K-01 |
| `KN_WALL_DOOR` | 7층 맨벽에 문이 있었다(안은 보지 못함) | Ch2 사고 |
| `KN_TRANSFORMATION` | 사고로 드레이코의 몸이 변했다(해리와 드레이코만 앎) | Ch2 사고 |
| `KN_ILLUSION` | 드레이코가 환영으로 예전 모습을 덧씌운다 | Ch2 사고 후 |
| `KN_OVERHEARD` | "일정을 앞당겨야 한다"는 말을 엿들었다 | K-01 |
| `KN_ROOM` | 드레이코가 필요의 방을 비밀리에 쓴다 | K-08 |
| `KN_CABINET` | 고장난 사라지는 캐비닛을 보았다 | K-08 |
| `KN_NECKLACE_LINK` | 목걸이와 드레이코를 잇는 단서(포장지 문양)를 확보 | K-10 |
| `KN_NO_MARK` | 드레이코에게 표식이 없음을 확인 | K-11 |
| `KN_FAMILY_REASON` | 드레이코가 가족 때문에 움직인다는 것을 안다 | K-08(루나), K-14 |
| `KN_NARCISSA_DANGER` | 나르시사가 인질 상태임을 안다 | Ch10 (신뢰≥50이면 드레이코가 직접 고백) |
| `KN_TARGET` | 목표가 교장임을 안다 | K-18(헤르미온느) 또는 draco.trust≥60 |
| `KN_DUMBLEDORE_PLAN` | 덤블도어가 보호책을 준비 중임을 안다 | Ch12 (`FLAG_TOLD_DUMBLEDORE` ∨ `FLAG_CONFIDED_HERMIONE`) |
| `KN_SNAPE_VOW` | 스네이프의 맹세를 안다 | Ch13 (R4 경로) |

### 1.1b 관찰(OB_) — 도감·대사 조건용, 해리가 본 사실만
| 플래그 | 의미 | 획득 |
|---|---|---|
| `OB_SLEEVE` / `OB_TREMOR` / `OB_WINDOW` / `OB_SAWDUST` | F-01 / F-02 / F-03 / F-04 목격 | Ch1 |
| `OB_SCORCH` | 4층 책상 그을음(F-14) | Ch1 수 오후1 만남 |
| `OB_PANSY_NIGHTS` | 판시 "밤마다 사라져"(F-05) | Ch2 도입 |
| `OB_SLUG_AVOID` | 슬러그혼의 루시우스 회피(F-06) | Ch2 만찬 |
| `OB_BLACKSPARK` | 4층 폭발의 검보랏빛 불꽃(F-15) | Ch2 9/25 |
| `OB_LETTER` | 검은 봉투(F-08 예고) | Ch3 |

### 1.2 선택·사건 기록
| 플래그 | 의미 | 설정 |
|---|---|---|
| `FLAG_CAUGHT_EAVESDROP` | 엿듣다 들켰다 | K-01 |
| `FLAG_OFFERED_POTION_HELP` | 포션 실수를 알려주려 했다 | K-02 |
| `FLAG_MOCKED_FALL` | 드레이코의 추락을 비웃으며 지켜봤다 (PHASE 3 추가, 참조: Ch1 만남·판시·지니 대사, Ch2 이후 DE 확장) | K-03B |
| `FLAG_CALLED_TEACHER` | 추락 때 교사를 불렀다 (PHASE 3 추가, 참조: Ch1 만남 대사) | K-03C |
| `FLAG_PUBLIC_RESCUE` | 공개적으로 도왔다 | K-03 |
| `FLAG_ASKED_DIRECTLY` | 만찬에서 말포이에게 직접 말을 건넸다/물었다 | K-05 C(두 변형 공통) |
| `FLAG_HELD_BACK` | 첫 경기에서 일부러 늦췄다(동정으로 읽힘) | K-06 C |
| `FLAG_WON_FIRST_MATCH` | 첫 경기에서 해리가 스니치를 잡았다 | K-06 A 승리 / B |
| `FLAG_DRACO_CHANGED` | 9/28 사고로 변화가 일어났다(시스템) | Ch2 사고 |
| `FLAG_PUSHED_INFIRMARY` | 사고 직후 의무실을 고집했다(자율성 침해) | S-01 A |
| `FLAG_SECRET_PROMISED` | 아무에게도 말하지 않겠다고 약속했다(`promise:SECRET_KEPT`) | S-01 B |
| `FLAG_DEMANDED_TRUTH` | 사고 직후 무엇을 하고 있었는지 추궁했다 | S-01 C |
| `FLAG_HARRY_APOLOGIZED` | 자기 주문 탓이라고 사과했다(드레이코는 받지 않음) | S-01 D |
| `FLAG_DAWN_VIGIL` | 새벽까지 곁에 있었다(SS-04) | Ch2 새벽 |
| `FLAG_CLOAK_LENT` | 투명 망토를 드레이코에게 맡겼다 | Ch2 새벽 |
| `FLAG_COVERED_ILLUSION` | 아침 식탁에서 소란으로 환영의 흔들림을 가렸다 | S-02 A |
| `FLAG_PANSY_NOTICED` | 판시가 환영의 흔들림을 눈치챘다 | S-02 B |
| `FLAG_PRIVATE_HELP` | 사적으로 도왔다 | K-03 |
| `FLAG_REPORTED_NIGHT` | 야간 일을 교사에게 알렸다 | K-04 |
| `FLAG_MUTUAL_SECRET` | 서로의 야간 규칙 위반을 덮었다 | K-04 |
| `FLAG_CONFRONTED_NIGHT` | 야간에 직접 추궁했다 | K-04 |
| `FLAG_FOLLOWED_NIGHT` | 야간에 미행했다 | K-04 |
| `FLAG_RUMOR_ACTIVE` | 해리와 드레이코에 관한 소문이 퍼짐 | K-05 |
| `FLAG_FOUL_PLAY` | 경기에서 반칙성 방해를 했다 | K-06 |
| `FLAG_DETENTION_KINDNESS` | 징계 중 드레이코를 슬쩍 도왔다 | K-07 |
| `FLAG_ACCUSED_PUBLIC` | 목걸이 일로 드레이코를 공개 고발했다 | K-10 |
| `FLAG_TOLD_DUMBLEDORE` | 덤블도어에게 보고했다 | K-10 |
| `FLAG_CONFRONTED_PRIVATE` | 목걸이 일로 사적으로 대면했다 | K-10 |
| `FLAG_FORCED_MARK_CHECK` | 완력/기습으로 표식을 확인했다 | K-11 |
| `FLAG_GIFT_GIVEN` | 크리스마스에 선물을 줬다 | K-12 |
| `FLAG_RON_STRAINED` | 론과의 관계가 틀어졌다(미해결) | K-15 |
| `FLAG_HERMIONE_DEMAND` | 헤르미온느가 신고를 요구했다(미해결) | K-08, K-18 |
| `FLAG_TEST_PASSED` | 신뢰 시험 통과 | K-16 |
| `FLAG_TEST_FAILED` | 시험 실패(누설) — 복구 전까지 RS_BOND 차단 | K-16 |
| `FLAG_TEST_READ` | 시험임을 눈치채고 응했다 | K-16 |
| `FLAG_REPAIRED` | 신뢰 파손을 복구했다 | K-17 |
| `FLAG_WATCHKEEPER` | 망을 보기로 했다(공범) | K-17 |
| `FLAG_REFUSED_ACCOMPLICE` | 공범 제안을 거절했다 | K-17 |
| `FLAG_PROPOSED_HELP` | 대안/도움을 제안했다 | K-17 |
| `FLAG_CONFIDED_HERMIONE` | 헤르미온느에게 털어놓았다 | K-08, K-18 |
| `FLAG_CONFIDED_GINNY` | 지니에게 털어놓았다 | K-18 |
| `FLAG_CONFIDED_LUNA` | 루나에게 털어놓았다 | K-08, K-18 |
| `FLAG_CONFIDED_RON` | 론에게 털어놓았다 | K-15, K-18 |
| `FLAG_BETRAYED` | 신뢰 파괴(폭로·이용) | R2, R5 |
| `FLAG_ABANDONED` | 도움이 필요할 때 물러섰다 | R6 |
| `FLAG_ROUTE_R1` ~ `FLAG_ROUTE_R6` | 결정 지점 D의 접근 | K-19 |

### 1.3 결과 변수 (Ch13에서 확정)
| 변수 | 값 |
|---|---|
| `OUT_HOGWARTS` | intact / damaged |
| `OUT_HEADMASTER` | safe / wounded / lost |
| `OUT_NARCISSA` | safe / captive / lost |
| `OUT_DRACO` | free(자유·보호) / custody(구금·감호) / bound(어둠에 속박) / vanished(행방불명) |

### 1.4 관계 상태 (판정식은 6장)
`RS_BOND` / `RS_PARTNER` / `RS_RIVAL` / `RS_ESTRANGED`

## 2. 주요 선택 (K-xx)

즉시=대사·표정·감정, 지연=소문·특별 이벤트(3장), 장기=관계·분기·엔딩. 선택지는 선/악이 아니라 행동으로 구분한다. 능력치 조건 선택지는 미충족 시 비노출.

| ID | Ch | 상황 | 선택지 | 즉시 | 설정 |
|---|---|---|---|---|---|
| P-01 | 1 | (PHASE 3 추가) 프롤로그: 지난 여름에 한 일. 능력치 +4~5 준비 선택(능력치 게이트 선택지 K-01B 통찰≥40, K-02B 지성≥45를 챕터 1 안에서 도달 가능하게 함) | A 공부(지성+5) / B 관찰(통찰+5) / C 비행(체력+4, 마법+2) / D 사람들(사교+4, 의지+2) | 없음(해리 능력치만) | 없음 |
| K-01 | 1 | 열차에서 말포이가 판시·크레이브와 긴장된 대화 | A 투명 망토로 엿듣는다 / B 문을 열고 시비 / C 지나친다 | A: 모름(통찰<14면 40% 확률로 들킴, 경계+6) / B: 존경+2, 경계+3 / C: 변화 없음 | A: `KN_OVERHEARD` `KN_TENSE`, 들키면 `FLAG_CAUGHT_EAVESDROP` / B: 통찰≥12이면 `KN_TENSE` |
| K-02 | 1 | 마법약 수업, "보호받은 영웅" 도발 | A 농담 / B 논리로 반박(지성≥13) / C 침묵 / D 실수를 조용히 알려준다 | A: 흥미(끌림+1, 존경+1) / B: 존경+4 / C: 호감−1 / D: 경계+4 | D: `FLAG_OFFERED_POTION_HELP` |
| K-03 | 1 | 경기장 연습 시간 충돌 중 드레이코의 비행 사고 | A 즉시 달려가 공개적으로 돕는다 / B 비웃으며 지켜본다 / C 교사를 부른다 / D 사람들이 빠질 때까지 기다렸다 말을 건다 | A: 의존성+, 경계+(자존심) / B: 존경 유지(도발), 호감- / C: 중립 / D: 신뢰+, 호감+ | A: `FLAG_PUBLIC_RESCUE` / D: `FLAG_PRIVATE_HELP` |
| K-04 | 1 | 토요일 밤 7층 복도에서 드레이코와 마주침 | A 교사에게 알린다 / B 서로 못 본 걸로 하자고 한다 / C "무슨 일이지?" 직접 추궁 / D 말없이 미행 | A: 분노, 신뢰- / B: 경계+, 빚 의식(의존성 소량) / C: 비꼼 응수, 신뢰 변화 없음 / D: 들키지 않으면 단서 확보 | `FLAG_REPORTED_NIGHT` / `FLAG_MUTUAL_SECRET` / `FLAG_CONFRONTED_NIGHT` / `FLAG_FOLLOWED_NIGHT` |
| K-05 | 2 | 슬러그 클럽 만찬. 소문 조건(`FLAG_PUBLIC_RESCUE`/`FLAG_CONFRONTED_NIGHT`/`FLAG_FOLLOWED_NIGHT`)이면 소문 대응, 아니면 자리 배정 | 소문: A 부정(사교≥14 확정, ≥11이면 50%, 그 외 20%) / B 웃어넘김 / C 직접 확인 · 자리: A 바꿔 달라 / B 앉는다 / C 먼저 말을 건넨다 | C: 존경+2 | A 실패·B: `FLAG_RUMOR_ACTIVE` / C: `FLAG_ASKED_DIRECTLY`(→SS-02) |
| K-06 | 2 | 첫 경기. 말포이가 먼저 스니치를 발견 | A 정정당당 추격(체력≥20 확정, 그 외 40%) / B 빗자루 붙잡기 / C 일부러 늦춤 | A: 존경+3(→SS-03) / B: 존경−4, 경계+4 / C: 존경−2, 경계+2 | B: `FLAG_FOUL_PLAY` / C: `FLAG_HELD_BACK` / 승리: `FLAG_WON_FIRST_MATCH` |
| S-01 | 2 | 사고 직후, 떨리는 지팡이 끝 | A 의무실 고집 / B 침묵 약속 / C 추궁 / D 사과 | 반응 대사 뒤 적용 — A: 자율성−10, 경계+8, 신뢰−3(환영 장면 없이 도주) / B: 신뢰+4, 의존+2, 자율성+3 / C: 경계+8, 신뢰−3, 자율성−5 / D: 존경+2, 자율성+2 | 각 `FLAG_PUSHED_INFIRMARY` / `FLAG_SECRET_PROMISED`+`promise:SECRET_KEPT` / `FLAG_DEMANDED_TRUTH` / `FLAG_HARRY_APOLOGIZED` |
| S-02 | 2 | 다음 날 아침, 환영이 흔들리고 판시가 고개를 돌린다 | A 소란으로 시선 돌리기 / B 아무것도 하지 않기 | A: 의존+3, 자율성−4 / B: 노출도+15, 자율성+4 | A: `FLAG_COVERED_ILLUSION` / B: `FLAG_PANSY_NOTICED` |
| K-07 | 3 | 공동 징계 중 드레이코가 편지를 훔쳐보듯 본다 | A 모른 척 B 슬쩍 도움(시간 확보) C 비꼰다 | **EH-01** 참조 | B: `FLAG_DETENTION_KINDNESS` |
| K-08 | 4 | 7층 문 앞. 방의 존재를 확인하는 방법 | A 혼자 잠복한다 / B 헤르미온느와 상의 / C 루나와 상의 / D 지금은 내버려둔다 | A: 직접 확인, 위험 판정 / B: 규칙적 접근, 신고 압박 / C: 편견 없는 관찰(드레이코가 울던 모습 증언) / D: 확인 지연 | A: `KN_ROOM` `KN_CABINET` / B: `KN_ROOM` `FLAG_CONFIDED_HERMIONE` `FLAG_HERMIONE_DEMAND` / C: `KN_ROOM` `KN_FAMILY_REASON` `FLAG_CONFIDED_LUNA` / D: 없음(Ch6에서 확인 가능) |
| K-09 | 5 | 케이티가 목걸이에 접촉. **시간제한**(긴급) | A 즉시 마법으로 접촉을 차단(마법 실력≥50이면 성공) / B 교사를 부르러 뛴다 / (시간 초과) 망설임 | A: 피해 최소화 / B: 피해 중간 / 초과: 피해 큼, 해리 죄책감 | 기록만(eventLog). draco.guilt는 피해에 비례 |
| K-10 | 5 | 사건 후 드레이코를 어떻게 다룰 것인가 | A 공개 고발 / B 덤블도어에게 보고 / C 사적으로 대면 / D 단서를 더 모은다(보류) | A: 분노·공개 망신, 신뢰- / B: 덤블도어 "기억해두겠네" / C: **EH-02** / D: 단서 확보 | A: `FLAG_ACCUSED_PUBLIC` / B: `FLAG_TOLD_DUMBLEDORE` / C: `FLAG_CONFRONTED_PRIVATE` / C·D: `KN_NECKLACE_LINK` |
| K-11 | 6 | 표식 확인 방법 | A 기습으로 소매를 걷는다 / B 논리로 보여달라고 요구 / C 우연한 기회에 목격(통찰≥45) | **EH-03** 참조 | 전부 `KN_NO_MARK`, A: `FLAG_FORCED_MARK_CHECK` |
| K-12 | 6 | 크리스마스 이브, 텅 빈 휴게실의 드레이코 | A 작은 선물을 놓고 간다 / B 곁에 앉는다 / C 그냥 지나친다 | A: 당황, 신뢰+소량 / B: 침묵, 존경+ / C: 변화 없음 | A: `FLAG_GIFT_GIVEN` |
| K-13 | 7 | 짝 과제의 진행 방식 | A 주도권을 양보 / B 공동 설계 / C 내가 주도 | A: 드레이코 만족, 존경- / B: 존경+ / C: 경쟁심 자극, 경계+ | — (`FLAG_OFFERED_POTION_HELP` 인용은 3장) |
| K-14 | 8 | 편지를 읽다 무너진 드레이코 | A 곁에 머문다 / B 외면한다 / C 다그친다 / D 편지를 몰래 읽으려 한다 | **EH-04** 참조 | A(trust≥40)·D: `KN_FAMILY_REASON` / D: trust-15 |
| K-15 | 8 | 론의 슬럼프와 해리의 집착 | A 론과 시간을 보낸다 / B 드레이코 문제에 몰두 / C 일부를 털어놓는다 | A: 론 신뢰+ / B: 론 경계+ / C: 론 반응(걱정) | B: `FLAG_RON_STRAINED` / C: `FLAG_CONFIDED_RON` |
| K-16 | 9 | 드레이코가 해리에게 "이건 아무에게도 말하지 마"라며 허위 정보를 건넨다 | A 아무에게도 말하지 않고 약속 장소로 간다 / B 헤르미온느나 덤블도어에게 알린다 / C 시험임을 눈치채고 응한다(통찰≥55) / D 가지 않는다 | A: 신뢰+ / B: 드레이코에게 누설이 드러남, 신뢰-- / C: 존경++ / D: 존경- | A: `FLAG_TEST_PASSED` / B: `FLAG_TEST_FAILED` / C: `FLAG_TEST_PASSED` `FLAG_TEST_READ` |
| K-17 | 10 | 드레이코가 해리에게 부탁(망을 봐달라)하거나, 신뢰가 부족하면 거리를 둔다(**EH-07**) | A 수락(망을 본다) / B 거절 / C 대신 다른 방법을 제안(`KN_FAMILY_REASON` 필요) / D 사과와 대가로 신뢰 복구(`FLAG_TEST_FAILED` ∨ `FLAG_ACCUSED_PUBLIC`일 때만) | A: 공범, 죄책감 / B: 드레이코 상처, 경계+ / C: 반발 또는 흔들림 / D: 대가로 자신의 비밀 하나를 말한다 | A: `FLAG_WATCHKEEPER` / B: `FLAG_REFUSED_ACCOMPLICE` / C: `FLAG_PROPOSED_HELP` / D: `FLAG_REPAIRED` |
| K-18 | 11 | 동료들에게 누구까지 말할 것인가(최대 2명) | 헤르미온느 / 지니 / 루나 / 론 | 헤르미온느: 규칙·증거 관점, 신고 압박 / 지니: 행동력 / 루나: 통찰 / 론: 충성과 불안 | `FLAG_CONFIDED_*` / 헤르미온느 선택 시 `KN_TARGET` |
| K-19 | 12 | **결정 지점 D** | 5장 참조 | 5장 | `FLAG_ROUTE_R1~R6` |
| K-20 | 13 | 클라이맥스. **시간제한**(타임아웃 = 망설임, 경로별로 정의된 결과) | 경로별 3지선다(예: R3: 막아선다/함께 간다/그녀의 결정을 기다린다) | 경로별 | OUT_* 확정 입력값(타임아웃은 "그녀의 결정을 기다린다"와 같은 결과 + 해리 죄책감) |
| K-21 | 14 | 마지막 대화의 어조 | 진심 / 농담 / 침묵 | 엔딩의 마지막 컷 | 엔딩 코다 연출 변화(관계 상태는 변경 불가) |

시간제한 규칙: 사용은 K-09, K-20에 한정. 설정에서 완화(2배)/해제 시 "망설임" 결과는 *명시 선택지*("잠시 머뭇거린다")로 제공해 콘텐츠 누락을 방지한다.

## 3. 지연 결과 / 후속 인용 (DE)

| ID | 원인 | 발생(Ch) | 내용 |
|---|---|---|---|
| DE-01 | `FLAG_PUBLIC_RESCUE` | 2 | 슬리데린에 "포터가 말포이를 구했다"는 소문. 판시가 해리에게 적대적으로 접근 |
| DE-02 | `FLAG_REPORTED_NIGHT` | 2 | 스네이프의 징계가 드레이코에게 내려지고, 드레이코가 해리에게 보복성 장난. 이후 드레이코의 7층 작업은 토요일 밤으로만 축소(scheduleOverride) |
| DE-03 | `FLAG_MUTUAL_SECRET` | 3 | 드레이코가 "빚은 한 번 갚았다"를 인용하며 거리를 둔다 |
| DE-04 | `FLAG_CONFRONTED_NIGHT` | 2 | 드레이코가 해리의 야간 외출을 역으로 소문으로 만든다 |
| DE-05 | `FLAG_FOLLOWED_NIGHT` | 4 | 방 위치 발견이 앞당겨진다(K-08A 판정 완화). 들켰으면 드레이코가 방 위치를 옮긴다 (구현: Ch1 K-04D는 들킴 여부 플래그가 없으므로 "판정 완화"만 적용 — K-08A 잠복은 항상 성공. 일반 경로는 통찰≥45 또는 40% 판정이며, 실패 시 KN_ROOM만 획득·경계+6·신뢰−2) |
| DE-06 | `FLAG_FOUL_PLAY` | 3 | 경기 후 충돌 → 징계 사유가 해리의 반칙. 아니면 드레이코의 도발로 사유 변경 |
| DE-07 | `FLAG_ACCUSED_PUBLIC` | 6 | 드레이코의 분노, 스네이프의 감시. `RS_BOND`는 `FLAG_REPAIRED` 전까지 차단 |
| DE-08 | `FLAG_RUMOR_ACTIVE` | 7 | 짝 과제 중 소문 때문에 주변의 시선이 방해가 됨. 사교성≥50이면 완화 |
| DE-09 | `FLAG_RON_STRAINED` | 11 | 론과의 갈등 장면. `FLAG_CONFIDED_RON`일 때만 해소 |
| DE-10 | `FLAG_HERMIONE_DEMAND` | 11 | 헤르미온느의 최후통첩(신고 기한). K-18에서 다시 털어놓거나 설득하지 않으면 해소 불가 |
| DE-11 | `FLAG_GIFT_GIVEN` | 12 | 드레이코가 선물을 언급(소지 여부로 호감 반응) |
| DE-12 | `FLAG_CAUGHT_EAVESDROP` | 3 | 드레이코가 "엿듣는 덴 소질 있군"을 인용, 경계+ |
| DE-13 | `FLAG_OFFERED_POTION_HELP` | 7 | "그때처럼 도와줄 생각이면 사양이야" |
| DE-14 | `FLAG_PRIVATE_HELP` | 5 | 사적 대면(K-10C) 때 드레이코가 한 번 도움 받은 일을 언급하며 방어가 낮아짐 |
| DE-15 | `FLAG_DETENTION_KINDNESS` | 8 | 편지 장면에서 "한 번 보고도 못 본 척했지" 인용 |
| DE-16 | `FLAG_CONFRONTED_PRIVATE` | 6 | 드레이코가 "이번엔 교사에게 말하지 않았군"을 언급하며 표식 확인 장면의 분노가 줄어듦 |
| DE-17 | `FLAG_TEST_READ` | 10 | 드레이코가 "시험인 줄 알고도 왔더군"이라며 요청 방식이 달라짐 |

## 3b. 특별 장면·서비스씬 (상세 연출은 ROMANCE_SCENE_GUIDE.md, 메타데이터는 src/data/romance.ts)
| ID | Ch | 조건(시나리오 실제 if) | 대체 경로 |
|---|---|---|---|
| SS-01 물병 | 1 | K-03 D | 공개 도움/조롱/교사 호출 |
| SS-02 공연이 끝난 뒤 | 2 | `FLAG_ASKED_DIRECTLY \|\| draco.respect>=26` | ch2_mask_cold |
| SS-03 라이벌의 인정 | 2 | `!FLAG_FOUL_PLAY && !FLAG_HELD_BACK` | 경멸 반응 |
| SS-04 새벽 | 2 | `(FLAG_SECRET_PROMISED \|\| FLAG_HARRY_APOLOGIZED) && draco.trust>=6` | ch2_alone / ch2_flee |

## 4. 감정 훅 (EH) — QA 테스트 케이스

| ID | 장면 | 조건 A | 조건 B |
|---|---|---|---|
| EH-01 | Ch3 편지 (※ 새 설정에서 재보정 필요: 챕터 2 신뢰 변동 추가) | trust<7: 편지를 감추며 해리를 공격 | trust≥7: 감추되 "…보지 마." 한마디로 침묵 허용 (임계값 근거: Ch3 시점 신뢰는 1/5/9뿐이며 9는 FLAG_PRIVATE_HELP(K-03D)이고 ¬FLAG_REPORTED_NIGHT일 때만 도달. 초기 신뢰 5 + 사적 도움 4 = 9) |
| EH-02 | Ch5 병동 앞 | guilt≥40: 병동 앞을 서성이다 해리를 보고 얼어붙음 | guilt<40: 냉담한 비웃음 |
| EH-03 | Ch6 표식 확인 직후 | respect≥50 ∧ ¬`FLAG_FORCED_MARK_CHECK`: "확인했으면 됐지, 이제 만족해?" | 그 외: 분노 폭발, 마법 충돌 |
| EH-04 | Ch8 편지 | trust≥40: 해리 앞에서 읽다 무너짐 | trust<40: 편지를 태우고 접근 차단 |
| EH-05 | Ch9 시험 개시 | 35≤trust≤80: 시험 진행 | trust<35: 시험 대신 위협(wariness≥60) |
| EH-06 | 전 챕터 호칭 | trust≥40 ∧ affinity≥35 + 사적 장면: "해리" | 그 외: "포터" |
| EH-07 | Ch10 K-17 | dependence≥40 ∧ trust≥55: 도움 요청 | dependence≥40 ∧ trust<40: 밀어내기·도발 |
| EH-08 | Ch11 | jealousy≥30 ∧ (`FLAG_CONFIDED_HERMIONE` ∨ `FLAG_CONFIDED_GINNY`): 해당 인물을 향한 비꼼 | 그 외: 일반 대사 |

## 5. 결정 지점 D (Ch12)

모든 접근은 **선택 후 무효화되지 않으며**, 실행 결과는 준비 상태로 결정된다. 선택지는 KN 조건을 만족할 때만 노출(해리가 떠올릴 수 없는 행동 제외).

| 경로 | 선택지 | 노출 조건 |
|---|---|---|
| R1 | 알고 있는 채 침묵하며 덮는다 | `KN_ROOM` ∧ `KN_CABINET` ∧ (¬`FLAG_REFUSED_ACCOMPLICE` ∨ draco.trust≥55) |
| R2 | 진실을 공개한다 | `KN_ROOM` ∨ `KN_NECKLACE_LINK` |
| R3 | 그녀가 스스로 결정하도록 돕는다 | `KN_FAMILY_REASON` ∧ `KN_NARCISSA_DANGER` |
| R4 | 다른 해결책을 찾는다(덤블도어·기사단) | `KN_NARCISSA_DANGER` ∧ `KN_DUMBLEDORE_PLAN` |
| R5 | 비밀을 이용한다 | `KN_ROOM` ∧ `KN_CABINET` |
| R6 | 개입하지 않는다 | 항상 |

### 5.1 경로 보정 (Ch13 진입 시 드레이코 감정에 적용 후 판정)
| 경로 | 보정 |
|---|---|
| R1 | trust+5, guilt+10, dependence+5 |
| R2 | trust-35, affinity-20, wariness+25, `FLAG_BETRAYED` |
| R3 | trust+10, respect+5, dependence-10 |
| R4 | dependence+15, respect-5 |
| R5 | trust-40, respect-10, wariness+30, `FLAG_BETRAYED` |
| R6 | trust-15, affinity-15, `FLAG_ABANDONED` |

### 5.2 결과 판정 (보정 후 값 기준)
| 경로 | 조건 | OUT |
|---|---|---|
| R1 | 항상 | `OUT_HOGWARTS`=damaged, `OUT_NARCISSA`=captive |
| | `FLAG_TOLD_DUMBLEDORE` | `OUT_HEADMASTER`=wounded / 아니면 lost |
| | trust≥55 | `OUT_DRACO`=custody(마지막에 멈춤) / 아니면 bound |
| R2 | 항상 | `OUT_HOGWARTS`=intact, `OUT_DRACO`=custody |
| | `KN_TARGET` | `OUT_HEADMASTER`=safe / 아니면 wounded |
| | `KN_NARCISSA_DANGER` ∧ (`FLAG_CONFIDED_HERMIONE` ∨ `FLAG_TOLD_DUMBLEDORE`) | `OUT_NARCISSA`=safe / 아니면 lost |
| R3 성공 | trust≥60(`FLAG_PROPOSED_HELP` 없으면 65) ∧ ¬`FLAG_BETRAYED` ∧ (`FLAG_CONFIDED_GINNY` ∨ `FLAG_CONFIDED_LUNA` ∨ will≥55) | intact / safe / safe / free |
| R3 부분 | 45≤trust, 성공 조건 미충족 | intact / safe / captive / custody |
| R3 실패 | trust<45 | damaged / wounded / captive / vanished |
| R4 성공 | trust≥50 ∧ ¬`FLAG_BETRAYED` | intact / safe / safe / free |
| R4 실패 | trust<50 | intact / safe / captive / custody |
| R5 | 항상 | `OUT_HOGWARTS`=intact, `OUT_HEADMASTER`=safe, `OUT_NARCISSA`=lost; `OUT_DRACO`=bound(`RS_RIVAL`) / vanished |
| R6 | 항상 | `OUT_HOGWARTS`=damaged, `OUT_NARCISSA`=captive; `OUT_HEADMASTER`=wounded(`FLAG_TOLD_DUMBLEDORE`) / lost; `OUT_DRACO`=bound(`RS_RIVAL`) / vanished |

(표기: R3/R4의 "intact / safe / safe / free" 순서는 `OUT_HOGWARTS` / `OUT_HEADMASTER` / `OUT_NARCISSA` / `OUT_DRACO`.)

## 6. 관계 상태 판정 (경로 보정 후, 위에서부터 첫 일치)

| RS | 조건 |
|---|---|
| `RS_BOND` | trust≥70 ∧ affinity≥60 ∧ attraction≥55 ∧ ¬`FLAG_BETRAYED` ∧ ¬`FLAG_ABANDONED` ∧ (¬`FLAG_TEST_FAILED` ∧ ¬`FLAG_ACCUSED_PUBLIC` ∨ `FLAG_REPAIRED`) |
| `RS_PARTNER` | trust≥55 ∧ respect≥55 ∧ ¬`FLAG_BETRAYED` ∧ ¬`FLAG_ABANDONED` |
| `RS_RIVAL` | respect≥45 (R2는 추가로 `KN_NARCISSA_DANGER` ∧ 진입 전 trust≥55) |
| `RS_ESTRANGED` | 위 어느 것에도 해당하지 않음 |

미해결 갈등(`FLAG_TEST_FAILED`, `FLAG_ACCUSED_PUBLIC`)은 K-17D 외에는 해소되지 않는다.

## 7. 엔딩 (경로 × 결과 → 엔딩 ID, 관계 상태는 코다 변형)

| ID | 제목 | 경로·결과 | 코다(허용 RS) | 핵심 장면 |
|---|---|---|---|---|
| E-A1 | 스스로 고른 이름 | R3 성공 | BOND / PARTNER / RIVAL | 드레이코가 스스로 임무를 접고 어머니를 구하러 간다. 해리는 곁을 지킨다 |
| E-A2 | 반쯤 열린 문 | R3 부분 | PARTNER / RIVAL / ESTRANGED | 드레이코가 임무를 멈추지만 어머니는 인질로 남는다 |
| E-A3 | 닿지 않은 손 | R3 실패 | RIVAL / ESTRANGED | 드레이코는 도움을 동정으로 받아들여 거부하고 행방이 묘연해진다 |
| E-B1 | 빚진 자들 | R4 성공 | BOND / PARTNER / RIVAL | 기사단의 보호 아래 가족이 구출. 드레이코는 "구출당한" 것에 대한 복잡한 마음. 스네이프의 맹세(`KN_SNAPE_VOW`) 대사 |
| E-B2 | 보호라는 이름의 구속 | R4 실패 | RIVAL / ESTRANGED | 드레이코는 본인 의사에 반해 보호받고, 어머니는 인질로 남는다 |
| E-C1 | 공범 | R1, `OUT_DRACO`=custody | BOND / PARTNER | 드레이코가 마지막 순간에 멈춘다. 교장은 중상, 해리는 침묵의 값을 치른다 |
| E-C2 | 침묵의 값 | R1, `OUT_DRACO`=bound | RIVAL / ESTRANGED | 드레이코는 임무를 완수하고 표식을 받는다 |
| E-D1 | 공개된 진실 | R2, `OUT_NARCISSA`=safe | RIVAL / ESTRANGED | 진실이 밝혀지고 가족은 구조된다. 드레이코는 "옳았지만 용서하지 않는다" |
| E-D2 | 늦은 진실 | R2, `OUT_NARCISSA`=lost | ESTRANGED | 이유를 모른 채 폭로한 대가 |
| E-E1 | 쥐어진 목줄 | R5, `OUT_DRACO`=bound | RIVAL | 강요된 이중 첩자, 나르시사의 상실 |
| E-E2 | 거래의 끝 | R5, `OUT_DRACO`=vanished | ESTRANGED | 해리와 어둠 양쪽 모두에게서 도망친다 |
| E-F1 | 빈 의자 | R6, `OUT_DRACO`=bound | RIVAL | 드레이코는 혼자 임무를 완수한다 |
| E-F2 | 사라진 이름 | R6, `OUT_DRACO`=vanished | ESTRANGED | 행방불명(후속 열린 결말) |

도달 불가 조합(설계 의도): R2·R5 × (BOND/PARTNER) — `FLAG_BETRAYED`. R6 × (BOND/PARTNER) — `FLAG_ABANDONED`.
엔딩 판정은 `OUT_*` 결과와 RS가 서로 모순되지 않도록 동일한 보정 후 값을 사용한다.

## 8. 합류·확장 규칙

- 플래그는 장기 분기에서만 합류 조건으로 쓰고, 일회성 대사는 변형 노드로 처리한다.
- 새로운 선택 추가 시: ① 레지스트리 정의 ② 최소 1개 이상의 후속 참조(DE/EH/D) ③ 이 문서와 STORY_OUTLINE 동시 갱신.
