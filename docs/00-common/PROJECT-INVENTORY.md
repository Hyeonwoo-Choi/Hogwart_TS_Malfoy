# 프로젝트 파일 분류
현재 앱: src/main.tsx → MockSceneScreen. 신규 엔진 구현 없음.
개별 파일 분류는 [PROJECT-FILES.json](PROJECT-FILES.json). 실제 업로드 예정 목록은 npm run migration:export -- --list로 다시 산출한다.
이번 정리는 물리적 이동 대신 실행·테스트 경계와 업로드 경계를 정리했다. 파일 삭제·원본 index 변경 없음.

| 분류 | 범위 | 처리 |
|---|---|---|
| KEEP | components/screens/shared/styles, main, tests, scripts, 공통·역할 문서, 설정·lockfile | Git 포함 |
| ARCHIVE | 기존 engine/data/ui/cloud/App, src/tests, qa-phase2 도구, e2e, 기존 기획·QA 문서 | 원위치 보존, Git 포함, 신규 실행 경로 제외 |
| LOCAL ONLY | 실제 .env, 로컬 절대경로 QA 보고·증거·results, 보존본, Worktree 관리 자료, hogwarts-remote | 업로드 제외, 로컬 보존 |
| REMOVE CANDIDATE | 미등록 tmp 이미지·생성 스크립트, node_modules/dist/캐시 | 업로드 제외. 삭제하지 않음 |
| REVIEW | supabase/proposed SQL, 중복 설계 문서의 정본 선정 | 제안·참고로 보존, 실행하지 않음 |

## 특수 항목
- .env.example: Git 추적 중. 현재 URL은 예시이고 키 값은 비어 있다. 실제 .env.local은 제외.
- 고신뢰 비밀키 패턴 및 .env.example의 전체 브랜치 이력 1버전 검사: 발견 없음. 모든 종류의 비밀정보 부재를 보증하는 검사는 아니다.
- 1MiB 초과 파일은 qa-phase2/results의 로컬 결과 2개. 업로드 예정 파일에는 없음.
- 등록된 최종 이미지 0개. 미등록 임시 PNG 7개는 로컬 보존, 신규 데모는 자체 fallback 사용.
- CHAPTER_BRANCH_MATRIX 동명 사본은 동일 내용. 삭제/정본 선정은 보류.
- 과거 QA의 PC 절대경로 포함 보고서 2개와 생성 결과는 제외한다. 참조는 LOCAL ONLY로 표시한다.
- 기존 보존본과 별도 story-qa Worktree는 그대로 유지한다.
- Git 추적 파일에도 .gitignore가 자동 적용되는 것은 아니다. export 도구가 별도 민감정보·절대경로 검사 후 내보낸다.
- 표준 npm test/build는 독립 UI를 검증한다. 보존된 기존 스토리 테스트는 별도 범위다.
