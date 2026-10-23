# 데스크톱 환경 이전
## 기준 환경
Node.js 24.22.0, npm 11.19.1을 현재 검증 기준으로 고정한다(.nvmrc).
향후 버전 변경은 테스트·빌드 후 결정한다. Node 관리 도구가 없다면 공식 설치본을 사용한다.
Windows/Linux/macOS 경로에 사용자 PC 절대경로를 하드코딩하지 않는다.

## Clone 및 설치
아래 REBUILD_BRANCH는 업로드 승인 후 확정한 브랜치로 바꾼다. 현재 원격에 준비 결과가 있다는 뜻이 아니다.
```sh
git clone --branch REBUILD_BRANCH https://github.com/Hyeonwoo-Choi/Hogwart_TS_Malfoy.git Hogwarts
cd Hogwarts
node --version
npm --version
npm ci
```
lockfile을 삭제하거나 npm install로 임의 업데이트하지 않는다.

## 환경변수
독립 UI 데모에는 환경변수가 필요 없다. .env.local을 복사하지 않아도 된다.
.env.example에는 이름과 안전한 예시만 둔다. 실제 값은 커밋 금지.
보존된 legacy cloud가 참조하는 이름: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
현재 단계에서는 설정하거나 서비스를 호출하지 않는다.
HFD_QA_OUTPUT은 선택적 테스트/빌드 출력 경로다. 실제 키·비밀정보가 아니다.

## 실행·검증
```sh
npm run typecheck
npm run ui:check
npm test
npm run build
npm run preview
```
프리뷰는 http://127.0.0.1:5181/?qa.
npm run dev는 개발 서버, npm run preview는 임시 프로덕션 빌드 후 프리뷰다.
npm run ui:test/ui:build/ui:preview는 동일한 독립 UI용 별칭이다.
npm test는 tests/renderer.test.tsx를 실행한다. 구형 src/tests와 qa-phase2는 보존 자료다.
일반 명령 호스트 CET 오류는 프로젝트 오류와 구분한다. 기존 Node로 scripts/presentation-qa.mjs를 직접 실행 가능.
Vite 설정 번들링 접근 오류를 피하는 configFile:false 실행 경로를 기본 스크립트가 사용한다.

## 저장·클라우드 격리
기존 App.tsx, src/engine/data/ui/cloud는 신규 진입점에서 import하지 않는다.
세이브를 변환·삭제하지 않으며 신규 저장 구조는 DRAFT / NOT APPROVED.
브라우저 프로필/저장 데이터는 Git Clone에 포함되지 않는다. 개인 백업이 필요하면 별도 승인·절차를 사용한다.
Supabase 실서버 요청·스키마 변경을 검증 절차에 포함하지 않는다.

## 세 AI Worktree
개인 데스크톱에서 이전 검증 후 공통 기준 커밋과 통합 브랜치를 승인한다.
다음 BASE_SHA를 승인된 커밋으로 바꾸고 비어 있는 경로/미사용 브랜치에서 실행한다.
```sh
git worktree list
git branch -a
git worktree add -b feat/claude-foundation ../Hogwarts-Claude BASE_SHA
git worktree add -b codex/qa-foundation ../Hogwarts-Codex BASE_SHA
git worktree add -b feat/antigravity-ui ../Hogwarts-Antigravity BASE_SHA
```
각 작업 폴더에서 npm ci. .git 관리 자료나 기존 PC Worktree 폴더를 복사하지 않는다.
[운영 절차](WORKTREE-WORKFLOW.md)의 계약 승인·PR 검증·사용자 병합 승인을 따른다.

## 이전 성공 기준
- npm ci가 lockfile 수정 없이 성공.
- typecheck / ui:check / test / build 모두 종료 코드 0.
- 375px·1366px에서 대화→선택→CG 진행 가능.
- 외부 요청·localStorage/sessionStorage 쓰기 없음.
- 신규 앱이 기존 엔진·시나리오·클라우드에 의존하지 않음.
- 실행 후 git status에 소스/lockfile 변경이 생기지 않음.
- 비밀정보·보존본·캐시·별도 클론이 추적되지 않음.
