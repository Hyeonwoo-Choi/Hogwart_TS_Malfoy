# DATA_STRUCTURE — 상태 객체·노드 규격·저장 호환 정책

> [GAME_BIBLE.md](GAME_BIBLE.md) 7장에서 분리(번호 유지).

## 7. 데이터 구조

### 7.1 상태 객체 (저장 대상)
```json
{
  "schemaVersion": 2,
  "scene": {"chapter": 1, "nodeId": "c1_train_03", "line": 12},
  "mode": "STORY",
  "calendar": {"date": "09-01", "weekday": "일", "slot": "저녁", "slotsLeft": 0},
  "stats": {"int": 40, "str": 40, "magic": 45, "insight": 35, "social": 35, "will": 40},
  "emotions": {"draco": {"affinity": 10, "trust": 5, "respect": 20, "attraction": 0, "jealousy": 15, "wariness": 60, "guilt": 0, "dependence": 0},
               "hermione": {"affinity": 40, "trust": 50, "wariness": 0}},
  "flags": {}, "knowledge": {}, "choices": [{"id": "K-01", "option": "B", "chapter": 1, "day": "09-01"}],
  "eventLog": [], "promises": [], "delayed": [],
  "read": {"lineIds": []}, "settings": {}
}
```

### 7.2 스크립트 노드 규격 (요약)
노드 종류: `line`, `choice`, `set`(플래그/지식), `delta`(감정·능력치), `if`, `goto`, `expr`(표정), `bg`, `routine`(일과 시작), `lock`/`unlock`(지도), `timed`, `end`.
감정 반응 대사는 변형으로 작성한다.
```json
{"type":"if","cond":"draco.trust>=40","then":"c8_letter_open","else":"c8_letter_burn"}
```
표정(`expr`)은 선택 결과 직후·감정 훅 달성·챕터 핵심 대사에서만 사용한다.

### 7.3 저장 호환 정책
- schemaVersion 2(새 설정). v1 저장은 구 설정 시나리오이므로 **불러오기를 거부하되 삭제하지 않는다**. 목록에는 "이전 버전(보존됨)"으로 표시되고 그 슬롯에는 저장할 수 없다. 자동 저장이 v1 위에 기록될 때는 먼저 `legacy:auto`로 보관한다.
- CG 경험 기록은 저장 슬롯과 별개(`<prefix>cg`)로 영구 보존하며 삭제 API를 두지 않는다.
- `?qa` 모드는 모든 키를 `hfd-qa:`로 분리한다. 일반 사용자 키 `hfd:`는 QA에서 읽거나 쓰지 않는다.

> 저장 검증(V2): `validateSave`는 상태 적용 전에 mode·scene·idx·필수 객체 타입·장면 존재·인덱스 범위를 검사하고 어긋나면 거부한다(현재 상태는 바뀌지 않음). 지식 단계 `know`는 저장에 명시된 값(0 포함)을 유지하고 없을 때만 이력으로 복원한다. 저장소 쓰기 실패 시 임시(메모리) 값이 읽기에서 우선한다.
