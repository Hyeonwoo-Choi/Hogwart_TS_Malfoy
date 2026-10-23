# Hogwarts — 독립 UI 기반 프로젝트
현재 범위는 UI 기술 자산과 협업 기반이다. 신규 게임 엔진과 스토리는 구현하지 않았다.

## 시작
Node.js 24.22.0 / npm 11.19.1을 기준으로 검증한다.
```sh
npm ci
npm run typecheck
npm run ui:check
npm test
npm run build
npm run preview
```
프리뷰: http://127.0.0.1:5181/?qa
기존 게임용 5180 세션을 재사용하지 않는다. UI 데모는 환경변수·저장·클라우드 접근이 없다.
빌드 출력은 별도 임시 경로에 생성하며 기존 dist를 덮어쓰지 않는다.
개발 서버: npm run dev. 현재 PC 샌드박스에서 최적화 오류가 있으면 npm run preview를 사용한다.

## 문서
- [데스크톱 이전](docs/00-common/DESKTOP-MIGRATION.md)
- [파일 분류](docs/00-common/PROJECT-INVENTORY.md)
- [협업 규칙](AGENTS.md)
- [Worktree 운영](docs/00-common/WORKTREE-WORKFLOW.md)
- [UI 실행 상세](docs/02-codex/UI-RUNBOOK.md)

src/engine, data, cloud, ui와 App.tsx는 구형 구현 참고 자료로 보존한다.
신규 진입점은 src/main.tsx → screens/MockSceneScreen.tsx다.
기존 세이브와 Supabase 기능은 격리되어 있다. legacy 테스트는 src/tests에 보존하며 기본 npm test의 대상이 아니다.
