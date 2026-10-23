# 리빌드 Phase 2 보고
기준: v2-multi-heroine / e3e612dd9c0863e061b3fcd94cd200a251f15a0a.
승인 범위: 보존본·UI 분리·Mock 검증·협업 문서. 신규 게임 엔진 구현 없음.

## 보존
저장소 밖 로컬 보존본 및 별도 복원본 생성. 1,329개 파일 SHA-256 일치.
복원본 Git 상태·HEAD가 기준과 동일. 미커밋·미추적 파일과 .git 포함.
비밀 파일은 로컬 보존본에만 포함하며 보고서·커밋에는 값 미포함.
node_modules/dist는 재생성 대상, hogwarts-remote는 사용자 별도 클론으로 원위치 보존.
전체 계정·클라우드·저장·구형 엔진·콘텐츠 파일 삭제/이동 없음.

## 변경
main.tsx를 독립 MockSceneScreen으로 연결.
components: SceneRenderer, ImageLayers, useTypewriter.
shared/presentation.ts: 표현 전용 인터페이스. World State/저장 스키마가 아님.
styles/renderer.css: 기존 디자인 토큰·대화·선택·반응형 추출.
tests/renderer.test.tsx 및 scripts의 격리 실행/경계 검사.
package.json 스크립트 추가, tsconfig에 tests 포함. lockfile 변경 없음.
공통/AI 책임 문서·작업/보고 템플릿 추가. AGENTS/CLAUDE 갱신.

## 검증
TypeScript 종료 코드 0.
Vitest UI 5/5 PASS, 종료 코드 0.
프로덕션 Vite 빌드 34 modules, CSS 경고 수정 후 경고 없이 완료.
격리 Edge 375×812, 1366×768: 수평 넘침 없음, 클릭 가능, CG 전환 확인.
외부 요청 0, localStorage/sessionStorage 항목 0, pageerror 0.
기존 전체 스토리 테스트는 이번 변경 범위의 완료 근거로 실행하지 않았다.
일반 명령 호스트 CET 오류 유지. 프로그래매틱 Vite 구성은 설정 번들링 제한을 피한다.
개발 서버 dependency optimizer는 샌드박스 접근 제한. 프로덕션 프리뷰 경로 정상.

## 미해결/다음 승인
신규 엔진·저장·공통 계약은 DRAFT / NOT APPROVED.
공통 기준 커밋과 세 AI Worktree 미생성. push/병합/파일 삭제 없음.
삭제 후보: 기존 게임 로직·콘텐츠·구형 QA·미등록 임시 이미지 생성물.
각 후보는 별도 승인과 의존성 재검사 후 처리한다.
실제 아트 자산으로의 표정/포즈 검증, 보조기기 접근성 정밀 검수는 후속 과제.
