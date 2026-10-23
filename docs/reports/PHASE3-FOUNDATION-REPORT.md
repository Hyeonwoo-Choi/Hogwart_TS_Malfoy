# Phase 3 Foundation Report
Status: PARTIAL / BLOCKED_ENVIRONMENT_LOCATION
설계 문서는 모두 DRAFT / NOT APPROVED. 본 보고의 확인 사실과 제안을 구분한다.

## 1 환경
사용자가 현재 환경은 아직 기존 PC라고 확인했다.
프로젝트 경로는 작업 세션의 기존 저장소이며 개인 PC 경로는 아직 제공되지 않음.
현재 작업 브랜치 v2-multi-heroine / e3e612dd9c0863e061b3fcd94cd200a251f15a0a.
신규 승인 기준은 rebuild-foundation / 54dbeff99874094396d97c32927964c20d6eb882로 별개다.
Node v24.22.0, npm 11.19.1 확인. OS는 이전 회차 Windows 10 Pro x64, 이번 회차 버전 재검증 안 함.
기존 PC의 원격 Clone 설치·타입·UI 5개 테스트·빌드 PASS는 이전 회차 결과다. 개인 데스크톱 PASS가 아니다.

## 2 Worktree
기존 주 작업 폴더와 detached story-qa를 보존했다.
세 AI Worktree 생성 0개. Phase A 미완료이므로 B 생성/설치/빌드 미실행.
개인 데스크톱의 경로·브랜치 충돌 검사와 모든 기본 검증 PASS 후 생성해야 한다.

## 3 문서
docs/art 11개: 방향, 시각 시스템, 레퍼런스, 표정/포즈/시선/의상,
ID 규칙, manifest, 제작 파이프라인, 자산 QA.
docs/story 5개: 세계관/개요 승인 대기, 서사 계층, 인물 카드·시나리오 디렉터리 입구.
공통 MASTER-DESIGN/DATA-CONTRACTS/DECISIONS/DESKTOP-MIGRATION/WORKTREE-WORKFLOW 참조·상태 보완.
기존 시각 설계는 참고 링크로 보존. 신규 정본으로 자동 승격하지 않는다.

## 4 제작 방법
Master Reference 승인 → 수요 요청 → 정규화·중복 제거 → 우선순위 검토 →
제작 → 얼굴/포즈/시선/의상/레이어 QA → 승인 manifest → 실제 화면 검수.
A 완성 스프라이트/B 레이어/C 혼합을 비용·일관성·합성 난이도로 비교했다.
추천 후보 C는 사용자 승인 대기. 이미지 생성과 자동화 구현은 하지 않았다.

## 5 ID 제안
내부 불변 ID, 중립 파일명, 파일 revision과 경로를 분리한다.
스토리는 숫자 ID/파일 경로 대신 의미 요청을 쓴다.
표현과 내면 감정, 외형과 의상, 포즈와 배치, 시선과 대상은 서로 분리한다.
at_target은 해리로 고정하지 않는다. 비밀 외형으로의 fallback 금지.
정적 배포 자산의 비밀을 중립 파일명만으로 보장할 수 없음도 명시했다.

## 6 승인 대기
ID 형식·카탈로그 키·expression 필드명·target 표현·좌표/레이어 호환 모델,
manifest revision·fallback 선택 규칙·파일 형식/크기·혼합 전략·Reference 제작 순서.
실행 스키마·shared 타입·신규 엔진·저장·Resolver·제작 수요 CLI 구현은 모두 미승인.

## 7 검증
이번 회차는 문서 링크/승인 상태/카탈로그/기존 코드 무변경을 정적으로 점검한다.
개인 데스크톱 npm ci/타입/테스트/빌드/브라우저는 NOT_RUN.
문서 작성만으로 환경·Worktree 완료를 주장하지 않는다.
소스·테스트·lockfile 변경 없음. commit/push/main 병합 없음.

## 8 다음 순서
개인 데스크톱에서 이 지시 재개 → Phase A 검증 → Phase B Worktree 생성·설치·빌드 →
공통 비주얼·제작 계약 검토/승인 → 최소 샘플 검증 계획 확정.
현재 원격 283개 UPLOAD-FILES.json은 기준 커밋용 과거 승인 목록이다.
이번 문서 추가는 새 업로드 승인이 아니며 자동 Push/기준 커밋 변경을 하지 않는다.

## 초안 공유 후속 기록
사용자가 Phase 3 문서 검토 후 rebuild-foundation 커밋·Push를 승인했다.
이번 반영은 문서 22개만 대상으로 하며 개인 데스크톱 검증·Worktree 생성과 설계 확정은 여전히 미완료다.
본 보고 앞의 commit/push 없음은 최초 문서 작성 회차의 상태다.
