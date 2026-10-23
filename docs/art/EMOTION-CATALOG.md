# Emotion / Expression Catalog
Status: DRAFT / NOT APPROVED
문서 제안이며 타입·JSON 스키마·Resolver·자동화 구현 승인이 아니다.

emotion이라는 요청 필드명은 후보 이름이다. 실제 의미는 관찰 가능한 expression이다.
| 후보 키 | 관찰 기준 | 자동 판정 금지 |
|---|---|---|
| neutral | 입·눈썹 긴장 변화가 작음 | 내면 중립으로 단정 |
| happy | 미소·눈가 움직임 | 호감 상승과 동일시 |
| sad | 시선·입가 처짐 | 특정 과거 사건 추론 |
| angry | 눈썹·턱·입 긴장 | 숨은 분노 수치 매핑 |
| embarrassed | 시선 회피·말멈춤과 일치 | 얼굴색만으로 동의 추론 |
| surprised | 눈·입의 갑작스러운 열림 | 지식 획득 자동 부여 |
| suspicious | 관찰하는 눈·눈썹 긴장 | 실제 적대 관계 판정 |
강도·복합 표정은 별도 제작 수요가 있을 때만 확장한다.
웃는 얼굴의 분노는 hidden state를 노출하지 않고 명시한 happy와 관찰된 긴장 연출로 표현한다.
