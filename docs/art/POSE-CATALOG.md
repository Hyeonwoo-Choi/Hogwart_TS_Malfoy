# Pose Catalog
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

| 후보 키 | 이미지에 필요한 행동 | 주의 |
|---|---|---|
| idle | 중립 자세 | 기준 앵커 |
| arms_crossed | 팔짱 | 손·팔 겹침 |
| hands_on_hips | 허리에 손 | 실루엣·의상 |
| pointing | 대상 가리킴 | 좌우·손잡이·대상 배치 |
| leaning_forward | 상체 접근 | 확대와 자세 변경 구분 |
| turning_away | 몸을 돌림 | 시선과 독립 |
포즈당 머리/얼굴 부착 좌표·몸체 앵커·가림 순서를 정한다.
현재 UI의 near/close/back은 화면 transform이다. 신규 pose 키와 자동 대응시키지 않는다.
접촉·소품 사용·다인 포즈는 대상/소품 제약을 별도로 검수한다.
