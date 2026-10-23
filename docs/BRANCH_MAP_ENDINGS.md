# BRANCH_MAP_ENDINGS — 결정 지점·관계 상태·엔딩 (챕터 12 이후, 구현 전)

> [BRANCH_MAP.md](BRANCH_MAP.md)에서 분리(5~8장, 번호 유지). 플래그·선택 정의의 기준은 BRANCH_MAP.md이다.

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
