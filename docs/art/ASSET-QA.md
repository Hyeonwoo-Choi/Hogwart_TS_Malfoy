# Asset QA
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

## 수용 기준
- Identity: 승인 Reference와 얼굴·눈·머리·성인 비율 일치.
- Request: 의상 버전·포즈·시선·대상·관찰 표정 일치.
- Composition: 캔버스/앵커 정렬, 손·소품 좌우, 레이어 경계·명암·가림 오류 없음.
- File: 디코딩 가능, 알파 정상, 테두리 halo 없음, 파일 경로·해시·크기 일치.
- Registry: ID 중복·case 충돌·미등록 키·불가능한 상태·alias 순환 없음.
- Runtime: 375×812와 1366×768에서 얼굴/핵심 행동/대화/선택지 가독성 확인.
- Spoiler: 일반 DOM·alt·파일명·갤러리·fallback에 내부 외형/숨은 감정 노출 없음.
- Recovery: 이미지 404·손상·미등록 상태에서 안전 placeholder, 진행 가능.
- Determinism: 동일 manifest revision·요청의 결과와 fallback 사유 동일.
- Separation: 이미지 파일 교체 후 스토리 의미 요청 변경 불필요.

## 향후 자동화 테스트 명세
1 중복 ID 두 개 → 실패 / 2 approved 파일 누락 → 실패 / 3 planned 파일 존재 → 승인 후보 제외.
4 타깃 B 요청 → B 배치 기준 시선 / 5 target 누락 → 오류, 해리 자동 지정 없음.
6 비밀 외형만 자산 존재 → 안전 placeholder / 7 outfit 불일치 → 임의 교체 금지.
8 호환 그룹 다른 얼굴/몸 → 합성 차단 / 9 파일 revision 교체 → 요청·스토리 동일.
10 플레이어/QA 모드 출력 비교 → 상세 진단은 QA만.
실제 코드 테스트 구현은 계약 승인 후 Codex가 수행한다.

## 검수 기록
asset ID/revision, reference revision, 도구/제작 이력, 검수자, 날짜, PASS/FAIL,
결함·수정 요청, 두 뷰포트 증거, 승인 여부를 남긴다. 생성 도구의 성공을 품질 승인으로 대신하지 않는다.
