# Image Generation Workflow
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

## 제작 전략 비교
| 전략 | 장점 | 비용·위험 |
|---|---|---|
| A 완성 스프라이트 | 포즈·명암 자연스러움, 합성기 단순 | 표정×의상 반복 제작·일관성 관리 |
| B 레이어 | 동일 포즈의 표정 확장 비용 감소 | 부착좌표·경계·명암 불일치, 검수 조합 증가 |
| C 혼합 | 큰 포즈는 A, 제한 표정은 B | 두 제작 경로와 호환 메타데이터 필요 |
권장 후보는 C. 실제 Master Reference 1개와 작은 샘플 조합의 품질·제작시간·용량을 비교한 뒤 승인한다.
모든 조합의 선제 생성은 금지한다.

## 11단계
1 설정 승인 → 2 기본 이미지 제작 → 3 Master Reference 승인 → 4 카탈로그 확정 →
5 스토리 의미 요청 등록 → 6 필요 조합 집계 → 7 중복 제거·우선순위 →
8 제작 → 9 QA → 10 Registry/Manifest 등록 → 11 게임 화면 검수.
이번 단계는 문서만 작성한다. 이미지 생성·자동화·Resolver 구현 없음.

## 향후 수요 집계 실행 명세
입력: 승인된 Presentation Script 묶음, catalog revision, manifest revision.
정규화 키: character + appearance + outfit + expression + pose + gaze + 필요한 방향 제약.
장면 위치·scale·opacity는 이미지 정체성 키에서 제외한다.
gaze target은 배치로 파생될 수 있는 방향과 특정 상대 고정 그림을 구분해 중복 제거한다.
출력 후보: 요청 조합, 참조 장면 수/ID, exact approved 수, fallback 수, 미등록·미제작·검수중·deprecated 수.
우선순위: 필수 화면 차단 → 반복 사용 → 의미상 fallback 불가 → 선택적 장면 순으로 검토. 자동 확정 금지.
planned를 집계했다고 제작 완료로 세지 않는다. 누락 reference/target/catalog 키는 실행 오류로 보고한다.
동일 입력·revision 결과는 정렬까지 결정적이어야 한다. 스토리 원문을 수정하지 않는다.

## 교체
승인된 같은 ID의 파일 revision을 반영하면 스토리 수정 없이 표현이 바뀌어야 한다.
새 버전 검수 전 기존 승인 파일을 덮어쓰지 않고 rollback 가능한 registry 이력을 유지한다.
