# 데스크톱 이전 준비 결과
기준: v2-multi-heroine / e3e612dd9c0863e061b3fcd94cd200a251f15a0a.
기존 보존본 유지. 파일 삭제·이동·원격 Push·병합·원본 Git index 변경 없음.
신규 게임 엔진·스토리 구현 없음.

## 변경
.gitignore: 캐시·임시 이미지·개인 경로 QA 결과 제외.
.nvmrc 및 engines: Node 24.22.0 기준.
package.json 기본 명령과 Vite 설정: 독립 UI용으로 통일.
package-lock.json: 루트 engines 메타데이터만 동기화, 의존성 버전 변경 없음.
presentation-qa.mjs: Windows 짧은 경로 별칭 정규화.
export-project.mjs: Git 업로드 예정 파일 목록·민감정보·절대경로 검사 및 임시 내보내기.
README / DESKTOP-MIGRATION / PROJECT-INVENTORY / PROJECT-FILES / UPLOAD-FILES 추가·정리.
기존 문서 3개의 깨진 링크 또는 로컬 전용 QA 결과 참조만 정리.

## 파일 보존
기존 engine/data/cloud/ui/구형 테스트는 ARCHIVE로 원위치 보존하며 신규 UI에 연결되지 않는다.
Supabase 실서비스 미접근. 기존 세이브 미접근.
미등록 임시 이미지·생성 스크립트, node_modules/dist/캐시는 삭제 후보로만 분류.
개인 PC 경로가 있는 QA 결과는 LOCAL ONLY로 제외.
.env.example 현재 값·전체 브랜치 이력 1버전에서 고신뢰 비밀키 패턴 없음.
실제 .env.local 값은 출력하지 않았고 제외했다. 임의 비밀정보를 완전히 검출한다는 보장은 아님.

## 재현 검증
원본 .git/node_modules/.env.local을 제외하고 업로드 예정 파일만 임시 디렉터리에 복사.
그 복사본에서 git init/add를 수행해 파일을 전부 추적 상태로 확인(원본 index 미접근).
npm ci --offline --no-audit --no-fund: 177 packages, 종료 코드 0. 원본 node_modules 연결 없음.
npm run typecheck / ui:check / test / build 실행.
초기 Vitest는 Windows 8.3 경로 별칭 문제로 수집 실패. 실제 경로 및 cwd 정규화 후 5/5 PASS.
Vite 빌드 34 modules, 독립 진입점 경계 검사 PASS.
검증은 업로드 예정 파일의 새 설치본이다. 아직 원격 GitHub Clone 성공을 주장하지 않는다.
개인 데스크톱의 실제 네트워크 설치·브라우저 검수는 이전 후 수행해야 한다.

## 남은 승인
업로드 목록 검토 후 기준 커밋/브랜치 확정과 Push 별도 승인.
현재 원격 HEAD에는 신규 UI와 미추적 문서가 없다. 현 상태에서 원격 Clone만으로 재현되지 않는다.
세 AI Worktree는 데스크톱 이전 검증과 기준 커밋 승인 후 생성.
Git 전체 전송량은 기존 이력과 원격 보유 객체에 따라 달라진다. 파일 목록의 bytes는 작업 파일 비압축 합계다.

## 최종 판정
업로드 준비 가능 / 사용자 승인 대기. 업로드 예정 파일 283개, 약 3.46MB(비압축, Git 이력 제외).
최종 격리 Git 추적 파일 환경에서 typecheck/ui:check/test/build 모두 종료 코드 0, UI 5/5 PASS.
설치·검증 후 추적 파일 diff 없음. 포함 문서 상대 링크 오류 0.
Git 이력의 텍스트 blob 541개도 고신뢰 키 패턴 검사했고 탐지 0개. 비밀정보 완전 탐지 보증은 아님.
기존 보존본 유지, 원본 Git index 불변, 파일 삭제/이동 없음.
