# Phase 2 developer QA

기존 별도 worktree qa/를 기반으로 확장한 독립 도구다. 공유 엔진/시나리오/UI를 수정하지 않는다. 기존 qa/ CLI는 보존했으며 같은 --chapter/--seeds/--start-seed/--profiles/--replay/--timer/--out 옵션을 지원한다. 새 도구 진입점만 qa-phase2/cli.mjs로 구별한다.

## 실행

프로젝트 루트에서 Node와 설치된 TypeScript 의존성을 사용한다. 새 패키지 설치·외부 접속은 필요 없다.

~~~sh
node qa-phase2/cli.mjs --chapters=1-4 --seeds=8 --format=both
node qa-phase2/cli.mjs --chapter=2 --profiles=politics --seeds=1 --choose=L-04:B,L-21:A --out=qa-phase2/results/night.json
node qa-phase2/cli.mjs --chapter=3 --profiles=politics --seeds=8 --choose=Q-04:B,L-14:D,L-15:D --out=qa-phase2/results/fight.json
node qa-phase2/cli.mjs --chapter=3 --profiles=politics --seeds=8 --choose=Q-04:C,L-14:D,L-15:D --out=qa-phase2/results/disclosure.json
node qa-phase2/cli.mjs --chapter=3 --mode=forced --profiles=politics --seeds=1 --probe-scene=v2c3_route --out=qa-phase2/results/probe.json
node qa-phase2/cli.mjs --replay=qa-phase2/results/night.json --profile=politics --seed=1 --out=qa-phase2/results/replay.json
node qa-phase2/verify-cli.mjs
node node_modules/typescript/bin/tsc --noEmit -p qa-phase2/tsconfig.json
node node_modules/vitest/vitest.mjs run --config qa-phase2/vite.config.ts
~~~

추가: --source=분리된_프로젝트_루트, --types=main,calendar,incident,random 또는 random:rare, --path=A/B/C/D/E 또는 research/pitch/secret/sly, --mode=natural/forced/both, --format=json/markdown/both, --detail=full.

--chapters=3-4도 새 게임부터 실제로 진행하고 커버리지 집계만 Ch3~4로 제한한다. 목표가 미구현 Ch9 이후면 실행이 완료되지 않는 사실을 보고하며 미래 콘텐츠를 만들어 내지 않는다.

## 결과의 의미

- observable: 구조·일정상 후보 또는 자연 관측. natural=0이면 도달 증명이 아니다.
- condition-unmet: 해당 진입 위치 근처의 표본 조건이 거짓. 전체 상태 공간에서 불가능하다는 뜻 아님.
- inactive: 요청 챕터의 일과·장소/날짜 후보가 없음. 미래 후보와 구별.
- future: 챕터 범위/일정상 후반 전용. 미관측 실패 분모에서 제외.
- forced-only: 강제 진입/상태에서만 관측. 자연 비율에 합산하지 않음.
- unreachable-suspect: 시작점에서 정적 간선 없음. 미연결 프로토타입/동적 호출을 사람이 확인해야 함.

자연 정책 override는 엔진에 보이는 선택만 실행하며 수치·지식·관계 플래그를 주입하지 않는다. 숨겨진 선택은 POLICY_OPTION_UNAVAILABLE로 중단해 조건값을 기록한다. 이는 게임 진행 불가와 구별한다. 강제 탐침은 자연 종단 상태의 scene/mode를 바꾸며 별도 집계한다.

결과에는 소스 해시·실행 중 변경·시드·합법 선택 경로·관계 증인·지식 전후·수첩 갱신·조건 진단·미검증 의미 항목이 포함된다. 자동 확정은 명시한 QA 계약만; 인물 정체·추측·거짓말·봉투 문서 의미는 수동 검토가 필요하다.

Wilson 95% 구간은 고정 정책/씨앗 표본의 참고치이며 실제 사용자 행동 확률을 추정하지 않는다. 현재 조건 진단에 exact gate 상태가 없으면 final endpoint라고 명시한다.

CLI는 엔진 오류/진행 실패/정책 중단/실행 중 코드 변경/재현 불일치가 있으면 exit 1이다. suspect만 있으면 정상 종료한다. B02를 재현하는 night 명령의 exit 1은 의도한 결함 탐지다. 회귀 테스트의 통과와 게임 무결함은 다른 의미다.

결과·캐시는 qa-phase2/results/에만 쓴다. 브라우저는 ?qa와 hfd-qa:를 사용하며 일반 hfd: 저장을 건드리지 않는다. qa-phase2 코드와 CLI는 일반 플레이 UI에 포함되지 않는다.

관계별 직접 진입·질투 함수 진단: node qa-phase2/probe-suite.mjs --source=분리된_소스 --out=qa-phase2/results/relationship-probes.json. 진입 우회/달력/분기 플래그 주입을 명시하며 자연 도달 횟수는 0으로 분리한다.
