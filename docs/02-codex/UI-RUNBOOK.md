# 독립 UI 실행
기본 index.html → src/main.tsx는 UI 기술 자산 데모만 실행한다.
기존 App.tsx와 engine/data/ui/cloud는 원래 위치에서 보존하며 불러오지 않는다.

## 명령
- npm run typecheck: 기존 보존 소스 + 신규 UI/tests 타입 검사.
- npm run ui:check: 신규 진입점 의존성 경계 검사.
- npm run ui:test: 독립 UI Vitest 5개.
- npm run ui:build: Vite 프로덕션 빌드. 임시 경로에 출력.
- npm run ui:preview: 임시 빌드 후 127.0.0.1:5181 프리뷰. 종료 Ctrl+C.
- npm run ui:dev: 개발 서버 5181. 현재 Codex 샌드박스에서는 dependency optimizer 접근 제한 가능. 이때 ui:preview 사용.
- 기본 npm test/build/dev/preview도 독립 UI를 대상으로 한다. 기존 스토리 테스트는 src/tests에 참고용으로 보존한다.

presentation-qa.mjs는 configFile:false, 빈 envDir, 동일 React 플러그인을 사용한다.
.env를 읽지 않고 원본 dist/를 덮어쓰지 않는다. HFD_QA_OUTPUT으로 별도 출력 루트를 지정할 수 있다.
일반 명령 호스트 CET 오류 시 기존 Node 실행 파일로 scripts/presentation-qa.mjs test/build/preview를 직접 실행한다.
브라우저 QA는 별도 프로필/컨텍스트와 ?qa만 사용한다. 공유 5180 세션은 건드리지 않는다.
