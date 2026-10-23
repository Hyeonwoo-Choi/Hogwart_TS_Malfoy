# Git Worktree 운영
신규 공통 기준: rebuild-foundation / 54dbeff99874094396d97c32927964c20d6eb882.
기존 PC의 v2-multi-heroine 작업 폴더는 보존 자료이며 신규 공통 기준과 혼동하지 않는다.
기존 별도 story-qa Worktree는 detached HEAD이며 최신 작업 사본이 아니다.

## 승인 후 절차
1. 비밀정보를 제외한 현재 작업물을 검토하고 공통 기준 커밋을 사용자 승인으로 확정한다.
2. main/master 중 실제 통합 기준과 develop 사용 여부를 결정한다. 원격 이름은 github다.
3. worktree list와 branch -a로 경로·브랜치 충돌을 확인한다.
4. 각 AI에 별도 경로·별도 브랜치로 Worktree를 만든다. 이번 회차에는 생성하지 않는다.
5. Claude/Antigravity/Codex는 각자 작업 명세에 기준 SHA·수정 영역·의존 계약을 기록한다.
6. 계약 변경은 공통 승인 후 소비자 테스트와 함께 반영한다.
7. PR → 자동 검증 → Codex 리뷰 → Antigravity UI 검증 → 사용자 승인 → 병합 순서.
8. push·병합은 별도 사용자 승인 후 실행한다. 비밀 파일과 개인 설정을 포함하지 않는다.

권장 경로 이름: Hogwarts-Claude, Hogwarts-Codex, Hogwarts-Antigravity.
권장 브랜치: feat/*, fix/*, test/*, refactor/*; Codex 생성 브랜치는 codex/ 접두사.
Worktree는 파일 소유권을 강제하는 보안 장치가 아니다.

## Phase 3 실행 게이트
개인 데스크톱 여부 확인 → 기존 Clone 재사용 → 기준 SHA 확인 → npm ci·타입·경계·테스트·빌드·브라우저 PASS → Worktree 3개 생성.
현재는 사용자가 기존 PC라고 확인하여 생성하지 않았다. 이미 존재하는 경로/브랜치를 덮어쓰지 않는다.
각 Worktree에서 HEAD 동일성·브랜치·공유 common-dir·깨끗한 상태를 확인하고 npm ci 및 기본 빌드를 별도로 실행한다.
Claude feat/claude-foundation, Codex codex/qa-foundation, Antigravity feat/antigravity-ui.
