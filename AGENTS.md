# 공통 협업 규칙
현재 단계: 리빌드 기반 준비. 신규 엔진·스토리 구현 승인 없음.
사용자의 명시적 지시가 문서보다 우선한다. 승인된 설계 문서만 구현 기준이다.
DRAFT / NOT APPROVED는 구현 승인이 아니다.

## 작업 경계
- Claude: src/engine, src/systems. 기존 코드는 보존 중이며 신규 엔진 설계 승인 후 구현.
- Codex: tests, 테스트 도구·설정, docs/02-codex, 검증 보고서.
- Antigravity: src/components, src/screens, src/styles, docs/03-antigravity.
- src/shared와 공통 설계·API·데이터 계약 변경은 사전 승인 대상.
- 담당 외 수정은 사전 승인 필요. 읽기·리뷰는 자유.
- 이번 준비 작업의 UI 추출·문서 구성은 사용자가 Codex에 별도 승인했다.
- 다른 AI의 작업을 덮어쓰지 말고 시작·종료 시 Git 상태와 기준 버전을 기록한다.

## 보존과 보안
- 기존 engine/data/ui/cloud와 App.tsx는 LEGACY / PRESERVED다.
- 기본 진입점은 src/screens/MockSceneScreen.tsx. 기존 앱·저장·클라우드를 import하지 않는다.
- 실제 파일 삭제·이동은 별도 승인. 기존 저장 키·데이터를 읽거나 변경하지 않는다.
- .env 계열·인증정보·개인 설정은 보고서나 커밋에 포함하지 않는다.
- Supabase 실서비스 요청 및 스키마/RLS 변경 금지.
- hogwarts-remote/는 사용자 별도 클론. 수정·삭제 금지.
- reset/restore/clean/checkout으로 타 작업을 되돌리지 않는다.
- 사용자 승인 없는 commit/push/main·develop 병합 금지.
- 신규 Worktree는 공통 기준 커밋 승인 후 생성한다.

## 검증·보고
- 타입 검사, 관련 테스트, 격리 빌드, 375px·1366px UI 검증.
- 테스트 실패 은폐·기대값 완화 금지. 실행하지 않은 검증을 PASS로 보고하지 않는다.
- UI 데모는 저장소와 외부 서비스에 접근하지 않아야 한다.
- 공유 5180 QA 세션은 조작하지 않는다. 격리 브라우저를 사용한다.
- 결과에 변경/보존/삭제 파일, 실제 명령·종료 코드, 위험과 미검증 항목을 기록한다.
- 회차 완료 후 보고하고 대기한다.

## 문서 입구
[설계](docs/00-common/MASTER-DESIGN.md) · [아키텍처](docs/00-common/ARCHITECTURE.md)
[결정 기록](docs/00-common/DECISIONS.md) · [Worktree](docs/00-common/WORKTREE-WORKFLOW.md)
기존 챕터 지침·설계는 보존본과 docs의 기존 파일에서 참고하며 신규 정본으로 자동 승격하지 않는다.
