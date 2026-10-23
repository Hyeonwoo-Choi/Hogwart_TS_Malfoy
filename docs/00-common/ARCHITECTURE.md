# 기반 아키텍처
Status: DRAFT / NOT APPROVED — 향후 엔진 구조. 아래 UI 준비 현황은 구현 사실.
- main.tsx → MockSceneScreen → SceneRenderer → ImageLayers/useTypewriter.
- presentation.ts는 화면 입력만 정의한다. 게임 진행·조건 판정·직렬화 계약이 아니다.
- 화면은 scene과 onAdvance/onChoose를 받고 상태 판정은 하지 않는다.
- 원본 App.tsx, src/ui, src/engine, src/data, src/cloud는 원래 위치에 격리 보존한다.
- 신규 진입점에서 legacy 경로와 Supabase 의존성으로 이어지는 import는 금지한다.
- 엔진·시스템은 설계 승인 후 별도 구현한다.
- CSS는 기존 토큰·장면·선택지·반응형 규칙을 추출했다. 이미지 fallback과 포즈 변환도 유지했다.
