# Codex 책임
1. 주요 책임: 아키텍처 리뷰·도달성·무결성·회귀·성능 검증.
2. 수정 영역: tests/, QA 도구·테스트 설정, docs/02-codex/. 담당 외 수정은 사용자 승인 필요.
3. 인터페이스: src/shared와 공통 API는 사전 승인. 다른 AI의 읽기·리뷰는 허용.
4. 시작 전: ../../AGENTS.md, ../00-common/MASTER-DESIGN.md, ARCHITECTURE.md, DATA-CONTRACTS.md, DECISIONS.md 및 작업 명세.
5. 완료: 수용 기준 충족, 관련 테스트·타입 검사·격리 빌드, 해당 시 UI 증거.
6. 보고: 변경 파일·검증 명령/결과·미검증·위험·승인 필요 사항. reports 템플릿 사용.
7. 금지: 미확정 시스템 구현, 타 작업 덮어쓰기, 실패 은폐, 기존 세이브 변경, 무승인 삭제·push·병합.
