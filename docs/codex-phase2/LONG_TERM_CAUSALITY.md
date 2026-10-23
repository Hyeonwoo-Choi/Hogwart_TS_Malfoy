# LONG_TERM_CAUSALITY

선택의 요약 상태는 저장 키가 아니라 설계용 참조다. 모든 사건에 다음/후반 소비 장면을 지정했다. Ch5 이후 소비는 미구현 계약이며 실제 실행과 혼동하지 않는다.

## 우선 인과 8개

| 발생/선택 | 즉시 결과·영향 인물 | 보존 사실 | 소비 장면·회수 | 이력이 없을 때 |
|---|---|---|---|---|
| Ch2 L-14 D 판시 폭로 | 판시의 부탁 접근 철회·소문; 연락망 위험 | FLAG_P2_BETRAYED_PANSY, 공개 상대/시각/범위 | C03_D_resolve 정중한 봉투→10/2 사전 수습, C05_D_resolve 고발 신뢰, C08_D_resolve 초청 | 사적 문의·실명 증언을 정상 제안; 비밀 내용을 자동 제공하지 않음 |
| Ch2 L-15 D 물리 충돌 | 드레이코·해리 징계/부상/목격 소문 | FLAG_P2_FIGHT_DRACO, 누가 본 범위 | C03_E_resolve 교사 보고/론 반응, C03_B_resolve 팀 재배치, C07_B_resolve 역할 협상 | 정상 징계 사유만 인용, 싸움 목격담 없음 |
| Ch2 Q-01 위반/갈등·수습 | 헤르미온느 자료 신뢰와 공동 연구 범위 | FLAG_P2_BREACH, FLAG_HER_REPAIRED/DISTANT, 출처 고백 | C03_A_resolve 검증 권한, C04_A_resolve 대출 접근, C07_A_resolve 공저 서명 | 목격된 만남 갈등이면 서고 위반을 꾸며 내지 않음 |
| Ch2 Q-03 관찰/표시/봉쇄 | 루나의 정보 공개권·통행 위험 | OB_STAIR_INSIDE/FLAG_P2_STAIR_MARKED/SEALED, 공개 허락 | C03_C_resolve 실/분필 분기, C04_C_resolve 대체 조사, C07_C_resolve 지도 출판 | 입구만 알면 내부 문양·온기 직접 관찰로 기록 금지 |
| Ch2 Q-02 경기 판단/지니 친밀 | 지니의 자기 판단·팀 신뢰·경기 뒤 약속 | FLAG_P2_HOOCH_CHECK/LEFT_TO_GINNY, FLAG_GIN_OPEN/SLOW | 경기 뒤 현재 의사 재확인, C03_B_resolve 권한, C09_B_resolve 선발 책임 | 연애 없어도 팀 사건 완주. 키스는 승리 보상 아님 |
| Ch3 B 위임·Ch8 K-15 론 지원 | 론의 자기 성과·후보 역할 | 누구에게 맡겼는지·거절·추천 범위, 기존 CH 이력 | C07_B_resolve 전술·C08_B_resolve 슬럼프·C14_B_resolve 팀 재편 | 본인이 정한 작은 역할, 해리의 추천 빚 없음 |
| Ch1~11 질투/소문/약속 위반 | 목격자·전언 수신자의 반응만 변화 | 만남 day/witnesses·발신자/신뢰성·약속 범위 | 다음 만남 반응→C09_D_resolve 출처 확인→C11_D_resolve 증인 보호 | 모르는 인물 반응 없음; 거짓 소문은 주장과 사실 분리 |
| Ch2 변신 비밀/S-01 | 해리만 직접 목격, 드레이코 거리·망토·공개 환영 | KN_TRANSFORMATION/FLAG_DRACO_CHANGED, S-01 이력·FLAG_CLOAK_LENT | 구금 망토 반환→C04_E_resolve 허락→C06_E_resolve 흉터→C12_E_resolve 자기 결정 | 새 몸 지식을 타인에게 주지 않음; 관계 0도 본편 진행 |

## 70개 사건의 생산자→소비자

| 발생/결정 | 직접 결과·영향 인물 | 상태 | 후속 소비·회수 | 없을 때 대체 |
|---|---|---|---|---|
| C01_A_resolve | 적법한 접근은 느리고, 무단 보관은 타인의 연구를 지연; 해리/헤르미온느/핀스 | proposal:C01_A:outcome | C02_A_resolve, C07_A_resolve; 자료 보관 방식→C02-A, 공저 신뢰→C07-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C01_B_resolve | 공동 정정 또는 상대 팀 항의. 그 뒤 관중석의 다른 단서를 조사할 수도 있음; 해리/지니/론 | proposal:C01_B:outcome | C02_B_resolve, C09_B_resolve; 공정한 경쟁 이력→C02-B·C09-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C01_C_resolve | 지도 또는 위치 전언, 사람의 정체는 알지 못함; 해리/루나/필치 | proposal:C01_C:outcome | C02_C_resolve, C07_C_resolve; 관찰과 추정 구별→C02-C·C07-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C01_D_resolve | 경계 존중 또는 먼저 읽은 사실이 남음; 해리/판시/연락책 | proposal:C01_D:outcome | C02_D_resolve, C08_D_resolve; 보호 범위→C02-D·C08-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C01_E_resolve | 공동 작업 또는 비접촉 기록. 몸·흉터 지식은 없음; 해리/드레이코/론 | proposal:C01_E:outcome | C02_E_resolve, C04_E_resolve; 시료 취급→C02-E·C04-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C02_A_resolve | 공적 검증·사적 해명·원본 없는 빠른 단서로 나뉨; 해리/헤르미온느/핀스 | proposal:C02_A:outcome | C03_A_resolve, C04_A_resolve, C09_A_resolve; 기록의 증거력→C03-A·C04-A·C09-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C02_B_resolve | 중단·통제된 재검·공식 이의신청. 위험 감추기에는 동료의 반발; 해리/지니/론 | proposal:C02_B:outcome | C03_B_resolve, C05_B_resolve, C09_B_resolve; 안전 보고/동의→C03-B·C05-B·C09-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C02_C_resolve | 위치 지식·직접 관찰·공적 봉쇄를 분리; 해리/루나/필치 | proposal:C02_C:outcome | C03_C_resolve, C05_C_resolve, C13_C_resolve; 지도 출처/이동권→C03-C·C05-C·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C02_D_resolve | 불완전한 실명 증언·익명 보호·거래 거절. 소문은 남음; 해리/판시/연락책 | proposal:C02_D:outcome | C03_D_resolve, C08_D_resolve, C11_D_resolve; 증언 소유/약속→C03-D·C08-D·C11-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C02_E_resolve | 관리 가능한 인계·원위치 관찰·유효한 재동의. 임무는 모름; 해리/론/스네이프 | proposal:C02_E:outcome | C03_E_resolve, C04_E_resolve, C10_E_resolve; 사고 기록/경계→C03-E·C04-E·C10-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C03_A_resolve | 공동 정정 또는 별도 진술, 벌점 면제는 없음; 해리/헤르미온느/핀스 | proposal:C03_A:outcome | C04_A_resolve, C09_A_resolve; 기록 신뢰→C04-A·C09-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C03_B_resolve | 팀 변화 또는 추가 심사, 낙인 대신 역할 조정; 해리/지니/론 | proposal:C03_B:outcome | C04_B_resolve, C05_B_resolve, C07_B_resolve; 구조 신뢰→C05-B·C07-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C03_C_resolve | 안전 안내 또는 재개방 심사, 비밀 통로 강제 공개 없음; 해리/루나/필치 | proposal:C03_C:outcome | C04_C_resolve, C04_B_resolve, C13_C_resolve; 대피 지도→C04-B·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C03_D_resolve | 거래 불성립 또는 개인 책임 증가; 해리/판시/연락책 | proposal:C03_D:outcome | C04_D_resolve, C08_D_resolve, C11_D_resolve; 익명/실명 선택→C08-D·C11-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C03_E_resolve | 합의한 거리 또는 완전한 사생활, 치료 과제 없음; 해리/론/스네이프 | proposal:C03_E:outcome | C04_E_resolve, C06_E_resolve, C09_E_resolve; 동의 기억→C06-E·C09-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C04_A_resolve | 정황과 직접 자료를 분리, 독심 추정 금지; 해리/헤르미온느/핀스 | proposal:C04_A:outcome | C05_A_resolve, C10_A_resolve; 출처 검증→C05-A·C10-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C04_B_resolve | 훈련 범위 축소 또는 중단, 상대 팀에도 동일 규칙; 해리/지니/론 | proposal:C04_B:outcome | C05_B_resolve, C07_B_resolve, C13_B_resolve; 공정함→C07-B·C13-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C04_C_resolve | 직접 캐비닛 관찰 여부에 따라 KN_CABINET 차등; 해리/루나/필치 | proposal:C04_C:outcome | C05_C_resolve, C10_E_resolve; F-09→C10-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C04_D_resolve | 증거 인계 또는 느린 검증, 범인 단정 못 함; 해리/판시/연락책 | proposal:C04_D:outcome | C05_D_resolve, C08_E_resolve; F-10→C05-D·C08-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C04_E_resolve | 위치 정황 또는 원본 보존, 조작 원인 미확정; 해리/드레이코/론 | proposal:C04_E:outcome | C05_E_resolve, C07_E_resolve, C10_C_resolve; 사고 원리→C07-E·C10-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C05_A_resolve | 좁고 강한 증거 또는 검증할 모순 목록; 해리/헤르미온느/핀스 | proposal:C05_A:outcome | C06_A_resolve, C08_E_resolve, C11_A_resolve; C08-E·C11-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C05_B_resolve | 안전 접촉·도움 모집, 낮은 능력치도 역할 확보; 해리/지니/론 | proposal:C05_B:outcome | C06_B_resolve, C13_B_resolve; C06-B·C13-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C05_C_resolve | 개인 손해 또는 전문 인계, 저주 직접 해제 없음; 해리/루나/필치 | proposal:C05_C:outcome | C06_C_resolve, C10_C_resolve, C13_C_resolve; C10-C·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C05_D_resolve | 증거 부족 감수 또는 증인 보호 협의; 해리/판시/연락책 | proposal:C05_D:outcome | C06_D_resolve, C08_D_resolve, C11_D_resolve; C08-D·C11-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C05_E_resolve | 동의한 동행 또는 면담 중단, 내용은 본인 진술; 해리/드레이코/론 | proposal:C05_E:outcome | C06_E_resolve, C09_D_resolve, C11_E_resolve; C09-D·C11-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C06_A_resolve | 절차 개선 또는 표본 감소; 해리/헤르미온느/핀스 | proposal:C06_A:outcome | C07_A_resolve, C09_A_resolve; C07-A·C09-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C06_B_resolve | 공정한 패배 가능 또는 팀 일정 손실; 해리/지니/론 | proposal:C06_B:outcome | C07_B_resolve, C14_B_resolve; C07-B·C14-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C06_C_resolve | 사생활 보존 또는 시간 정황, 독심·복원 마법 금지; 해리/루나/필치 | proposal:C06_C:outcome | C07_C_resolve, C08_E_resolve; F-11→C08-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C06_D_resolve | 초청 상실 또는 강요 증거; 해리/판시/연락책 | proposal:C06_D:outcome | C07_D_resolve, C08_D_resolve, C12_D_resolve; C08-D·C12-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C06_E_resolve | 동의한 지식·미확인 존중·강제 확인과 파열; 해리/드레이코/론 | proposal:C06_E:outcome | C07_E_resolve, C09_E_resolve, C12_E_resolve; F-01→C09-E·C12-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C07_A_resolve | 평판 손해를 감수한 정정 또는 작은 성과; 해리/헤르미온느/핀스 | proposal:C07_A:outcome | C08_A_resolve, C09_A_resolve, C14_A_resolve; C09-A·C14-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C07_B_resolve | 상호 공개 또는 느린 합의; 해리/지니/론 | proposal:C07_B:outcome | C08_B_resolve, C10_B_resolve, C14_B_resolve; C10-B·C14-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C07_C_resolve | 정보 가치 감소 또는 발행 지연; 해리/루나/필치 | proposal:C07_C:outcome | C08_C_resolve, C11_C_resolve, C13_C_resolve; C11-C·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C07_D_resolve | 자기 손해의 개혁 또는 유리함 포기; 해리/판시/연락책 | proposal:C07_D:outcome | C08_D_resolve, C10_D_resolve, C14_D_resolve; C10-D·C14-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C07_E_resolve | 상호 검수 또는 시간 손해, 저능력은 작은 배치로 완수; 해리/드레이코/론 | proposal:C07_E:outcome | C08_E_resolve, C10_E_resolve; K-13·F-12→C10-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C08_A_resolve | 정황 축적 또는 공개 책임; 해리/헤르미온느/핀스 | proposal:C08_A:outcome | C09_A_resolve, C10_A_resolve, C11_A_resolve; C10-A·C11-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C08_B_resolve | 이름 빚을 덜거나 지원 범위 합의; 해리/지니/론 | proposal:C08_B:outcome | C09_B_resolve, C14_B_resolve; K-15→C09-B·C14-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C08_C_resolve | 완전 회수 포기 또는 일부 자료 손실; 해리/루나/필치 | proposal:C08_C:outcome | C09_C_resolve, C11_C_resolve, C14_C_resolve; C11-C·C14-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C08_D_resolve | 입지 상실 또는 공적 갈등; 해리/판시/연락책 | proposal:C08_D:outcome | C09_D_resolve, C12_D_resolve; C09-D·C12-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C08_E_resolve | 허용된 지식·신뢰 유지·무단 열람의 대가; 해리/드레이코/론 | proposal:C08_E:outcome | C09_E_resolve, C10_E_resolve; K-14·T-04/07→C10-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C09_A_resolve | 공동 기준 또는 적법한 거절; 해리/헤르미온느/핀스 | proposal:C09_A:outcome | C10_A_resolve, C12_A_resolve; C10-A·C12-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C09_B_resolve | 공개 정정 또는 일정 비용; 해리/지니/론 | proposal:C09_B:outcome | C10_B_resolve, C14_B_resolve; C10-B·C14-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C09_C_resolve | 속도 손해 또는 지휘 인원 필요; 해리/루나/필치 | proposal:C09_C:outcome | C10_C_resolve, C12_B_resolve, C13_B_resolve; C12-B/C·C13-B/C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C09_D_resolve | 기만 거절 또는 관계 충돌; 해리/판시/연락책 | proposal:C09_D:outcome | C10_D_resolve, C11_D_resolve, C12_D_resolve; C11-D·C12-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C09_E_resolve | 기존 K-16 결과와 거절 후 재합의 구분; 해리/드레이코/론 | proposal:C09_E:outcome | C10_E_resolve, C14_E_resolve; C10-E·C14-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C10_A_resolve | 느린 포괄 준비 또는 일부 보호; 해리/헤르미온느/핀스 | proposal:C10_A:outcome | C11_A_resolve, C12_D_resolve, C13_D_resolve; C12-D·C13-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C10_B_resolve | 성적 기회 감소 또는 타인 동의 필요; 해리/지니/론 | proposal:C10_B:outcome | C11_B_resolve, C12_B_resolve, C13_B_resolve; C12-B·C13-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C10_C_resolve | 인력 비용 또는 침입 위험 잔류; 해리/루나/필치 | proposal:C10_C:outcome | C11_C_resolve, C12_C_resolve, C13_C_resolve; C12-C·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C10_D_resolve | 증거 보존 또는 자원 비용; 해리/판시/연락책 | proposal:C10_D:outcome | C11_D_resolve, C12_A_resolve, C14_D_resolve; C12-A/D·C14-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C10_E_resolve | 거절과 지원 분리 또는 공범 위험; 해리/드레이코/론 | proposal:C10_E:outcome | C11_E_resolve, C12_E_resolve; K-17·F-09→C12-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C11_A_resolve | 작은 확실성 또는 검증 과제; 해리/헤르미온느/핀스 | proposal:C11_A:outcome | C12_A_resolve, C13_A_resolve; C12-A·C13-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C11_B_resolve | 자율적 지원 또는 범위 축소; 해리/지니/론 | proposal:C11_B:outcome | C12_B_resolve, C13_B_resolve; C12-B·C13-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C11_C_resolve | 제한 자료 또는 인력 비용; 해리/루나/필치 | proposal:C11_C:outcome | C12_C_resolve, C13_C_resolve; C12-C·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C11_D_resolve | 동의한 보호 또는 약한 증거; 해리/판시/연락책 | proposal:C11_D:outcome | C12_D_resolve, C13_D_resolve; C12-D·C13-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C11_E_resolve | 최소 공개 또는 당사자 동석; 해리/드레이코/론 | proposal:C11_E:outcome | C12_E_resolve; KN_TARGET·F-13→C12-E | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C12_A_resolve | 보호 준비 또는 좁은 신고; 해리/헤르미온느/핀스 | proposal:C12_A:outcome | C13_A_resolve; R2의 준비·C13-A | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C12_B_resolve | 강요 없는 재배치 또는 일부 구역 포기; 해리/지니/론 | proposal:C12_B:outcome | C13_B_resolve; 어느 R과도 병행·C13-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C12_C_resolve | 시간 비용 또는 감시 부담; 해리/루나/필치 | proposal:C12_C:outcome | C13_C_resolve; R3/R4 지원 가능·C13-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C12_D_resolve | 협상 지연 또는 안전안 축소; 해리/판시/연락책 | proposal:C12_D:outcome | C13_D_resolve; R3/R4·C13-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C12_E_resolve | 침묵·공개·자율 지원·대안·강요·무개입의 책임; 해리/드레이코/론 | proposal:C12_E:outcome | C13_E_resolve; 기존 OUT 판정과 학교 준비를 분리 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C13_A_resolve | 지연 또는 증거력 감소; 해리/헤르미온느/핀스 | proposal:C13_A:outcome | C14_A_resolve; C14-A, 교장·학교 결과 분리 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C13_B_resolve | 이동 지연 또는 탑 현장 부재; 해리/지니/론 | proposal:C13_B:outcome | C14_B_resolve; C14-B, 선택한 사람의 생존 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C13_C_resolve | 침입 위험/부분 차단; 해리/루나/필치 | proposal:C13_C:outcome | C14_C_resolve; C14-C, 학교 피해 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C13_D_resolve | 강제 구조 방지·불완전 보호; 해리/판시/연락책 | proposal:C13_D:outcome | C14_D_resolve; C14-D, 나르시사 결과 근거 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C13_E_resolve | 기존 R·준비·선택으로 결과, 맹세 공개는 후속 증언도 가능; 해리/드레이코/론 | proposal:C13_E:outcome | C14_E_resolve; C14-E, 기존 엔딩군 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C14_A_resolve | 책임 수용 또는 타인 진술권 존중; 해리/헤르미온느/핀스 | proposal:C14_A:outcome | CODA_A; C01/03/07/11-A, 진로와 징계 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C14_B_resolve | 동료 지속 또는 각자 진로; 해리/지니/론 | proposal:C14_B:outcome | CODA_B; C01/03/08/09-B | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C14_C_resolve | 공공 자료 또는 개인 소유; 해리/루나/필치 | proposal:C14_C:outcome | CODA_C; C02/05/07/11-C | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C14_D_resolve | 합의한 연락 또는 거리 유지; 해리/판시/연락책 | proposal:C14_D:outcome | CODA_D; C02/06/08/12-D | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |
| C14_E_resolve | 상대의 별도 동의·거절·보류를 재생; 해리/드레이코/론 | proposal:C14_E:outcome | CODA_E; 기존 엔딩 ID+인물별 코다, 자동 연애 없음 | 공개 훅/한정 전언으로 재진입; 원래 증거·허락은 자동 복구 안 됨 |

## 사용 규칙

- 생산은 선택 직후 사건 결과이며 감정 반응은 대사 뒤 적용. 소비는 실제 부탁/행동/자료 접근/지식 확정도를 바꾸어야 한다.
- 후속 검수에서 상태 읽기만 하고 같은 원고를 출력하면 미소비로 판정한다. 소비 명세가 있다는 것과 구현되었다는 것은 별개다.
- 인물별 소유·권한·공개 범위는 일반 ARC/STANCE/OUT 요약보다 우선 보존. 기존 CH 이력은 새 플래그 없이 읽는다.
- 같은 밤 병행 배치는 해리가 동시에 둘을 직접 목격한 것으로 쓰지 않는다. 타인 행동의 결과는 출처 있는 보고로만 받는다.
- B03 봉투 초안은 발신자가 아니라 실제 소유자를 따라 증거를 추적해야 한다. 현재 자동 검사는 주석된 사실에만 적용하고 초안은 수동 검토로 남긴다.
