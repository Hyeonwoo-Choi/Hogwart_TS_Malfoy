# HOGWARTS: FRACTURED DESTINY (PHASE 2 — 시스템 검증판)

비공식 팬 프로젝트. 원작 및 관련 권리자와 무관한 비공식 팬 창작물입니다.
스택: React 18 + TypeScript + Vite · 설계 문서: `docs/`

## 실행
```bash
npm install
npm run dev          # 개발 서버 → http://localhost:5173
```
디버그 오버레이(감정 수치 확인/조작): http://localhost:5173/?debug=1

```bash
npm run build        # 타입 검사 + 프로덕션 빌드 → dist/
npm run preview      # 빌드 결과 확인 → http://localhost:4173
npm test             # 단위·통합 테스트 (vitest, 89개 + 보류 28개)
```
브라우저 E2E(선택): `e2e/e2e.py` — Python Playwright 필요. `npm run dev` 실행 후 `python3 e2e/e2e.py`.

QA 격리 모드: http://localhost:5173/?qa (저장 키 hfd-qa: 분리, 실제 저장에 영향 없음)

## 조작
클릭/Enter/Space 진행 · 숫자키 선택 · Esc 메뉴 · Ctrl(누르는 동안) 읽은 대사 스킵 · 마우스 휠 위 대화 기록 · H 대사창 숨기기 · A 자동 진행

## 구조
| 경로 | 역할 |
|---|---|
| `src/engine/` | 순수 엔진: 조건식, 진행/선택, 감정·플래그, 일과/지도 잠금, 저장(localStorage·파일) |
| `src/data/scenario.ts` | 시나리오 데이터(현재: 시스템 검증용 챕터 1 축약판) |
| `src/data/constants.ts` | 장소·활동·**드레이코 주간 일정표** |
| `src/data/assets.ts`, `public/assets/` | 에셋 매니페스트 / 교체용 폴더 |
| `src/ui/` | 화면(타이틀·스토리·지도·오버레이·디버그) |
| `src/tests/` | 엔진 + UI 테스트 |

## 일러스트 교체
`public/assets/README.md` 참고. 이미지를 넣고 `public/assets/manifest.json`에 `status:"final"`로 등록하면
**재빌드 없이** 새로고침만으로 반영됩니다. 파일이 없으면 자동으로 플레이스홀더로 돌아갑니다.

## 알려진 제한 (PHASE 2)
- 시나리오는 시스템 검증용 축약판입니다. 본편 챕터 1(60~90분)은 PHASE 3에서 작성합니다.
- 모든 이미지는 플레이스홀더입니다(완성 에셋 0개). BGM/효과음은 없습니다.
- 야간 슬롯, 능력치 기반 외형 변화(VS-*)는 PHASE 3 이후 구현입니다.
