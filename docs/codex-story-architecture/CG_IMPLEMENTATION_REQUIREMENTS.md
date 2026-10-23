# CG_IMPLEMENTATION_REQUIREMENTS — 엔진 기능 격차

> 코드 구현 요구서다. 이번 작업에서는 `src/`와 테스트를 수정하지 않았다.

## 현재 확인된 기능

| 기능 | 현재 근거 | 판정 |
|---|---|---|
| 정적 CG 표시/해제 | `dsl.ts`의 `cg(id/null)`, `Visual.tsx`의 `CgFrame` | 완료 |
| CG 레지스트리·경험 해금 | `cg.ts`, 경험 기반 갤러리 주석 | 완료/실제 자산 없음 |
| 배경·인물 레이어 | `Background`, `Character`, `CgFrame` | 완료 |
| 표정 | `expr`, 실제 에셋 없을 때 실루엣 입 모양 | 부분 |
| 자세·거리 | `pose`: stand/arms/lean/turned/slumped/guard/near/close/back/tilt | 완료(단일 CSS 변환) |
| 시선 | `gaze`: front/side/away/down | 완료 |
| 드레이코 외형 | `form`: base/illusion/true, true만 별도 자산군 | 완료 |
| 페이드·암전·flash·흔들림·zoom·blur·focus·magic·정지·빛 | `CueEffect`, `Game.tsx`, CSS | 완료(효과 대상 제한 있음) |
| 매니페스트 교체·실패 폴백 | `assets.ts`, `public/assets/manifest.json` | 완료 |
| 실제 이미지 | 기본 매니페스트 전부 placeholder | 미구현 |

## 필요한 확장

| 우선 | 요구 | 수용 기준 | 수정 예상 모듈 |
|---|---|---|---|
| P1 | CG 모바일 크롭 메타데이터 | CG별 375px 초점 좌표/안전 영역을 선언하고 핵심 얼굴·손·물체가 잘리지 않음 | `cg.ts`, `Visual.tsx`, CSS, 시각 테스트 |
| P1 | CG 전환 효과 확장 | 기존 flash는 재사용하고 dissolve/flicker를 재현 가능하게 추가하며 reduced-motion에서 정적 대체 | types/DSL/Visual/CSS/tests |
| P1 | 조건별 CG 변형 | 같은 사건 ID에 허용된 variant를 선택하되 미경험 변형을 갤러리에 누설하지 않음 | `cg.ts`, engine state, gallery/tests |
| P2 | 다층 CG | 배경·인물·전경·마법광을 독립 레이어로 표시하고 패닝 없이도 정지 화면 성립 | asset schema/Visual |
| P2 | 카메라 확대·패닝 | 시작/끝 초점과 시간 선언, 375/1366/1920 및 reduced-motion 대체 | types/DSL/Visual/CSS |
| P2 | 다인 구도 | 두 인물의 위치·거리·시선선을 데이터로 지정, 현재 단일 sprite 의존 제거 | types/Visual |
| P2 | 의상 키 | 날짜/활동 기반 outfit ID, 관계 수치와 분리, 없는 자산은 기본 복장 폴백 | assets/types/scenario |
| P3 | 갤러리 메타 확장 | 변형·챕터·획득 장면·스포일러 잠금 상태를 개발자 화면에서 확인 | gallery/data/tests |

## 데이터 제안

```ts
interface CgDirection {
  id: string
  variant?: 'base' | 'guarded' | 'trusted'
  focus?: { x: number; y: number }
  layers?: string[]
  motion?: { kind: 'none' | 'zoom' | 'pan'; from: number; to: number; ms: number }
  transition?: 'cut' | 'fade' | 'flash' | 'dissolve'
}
```

- 위 타입은 제안이며 기존 `cg('id')` 호출을 즉시 바꾸지 않는다. 먼저 하위 호환 기본값을 정의한다.
- variant 조건은 시나리오의 `if/when`과 동일한 문자열을 사용하고, 비즈니스 규칙을 UI에 복제하지 않는다.
- 에셋 파일은 중립 이름, 매니페스트에는 개발용 label만 둔다.
- 현재 `zoom`은 `.bg`와 `.sprite-area`에만 적용되고 `.cg-frame`에는 적용되지 않는다. `cg_snitch_dive` 자체를 확대하려면 CSS 대상 확장 또는 CG 전용 motion이 필요하다.

## 저장·복구 검증

- `view.cg`는 schemaVersion 2 저장 상태에 포함되어 중간 저장을 불러오면 같은 정적 CG가 복구된다.
- 실제 엔진 상태에서 `ch2_dawn`의 `cg_dawn_cloak` 표시 지점(`idx=20`)을 내보내기→가져오기 한 결과 `view.cg`가 동일하게 복구됐다. 브라우저 저장 키를 쓰지 않은 메모리 검증이다.
- `cue.n`도 저장되지만 UI는 불러오기 직후 효과를 재생하지 않는다. 따라서 정적 정보는 복구되나 flash/zoom의 순간 연출은 반복되지 않는다.
- CG 경험 기록은 저장 슬롯과 별도의 로컬 키에 기록된다. CG 노드 뒤에 대사/선택처럼 엔진이 반환하는 지점이 있어야 `store.set()`이 경험을 기록한다. 현재 18개 호출은 모두 그 조건을 만족한다.
- 향후 variant·초점·motion을 상태에 추가하면 저장 정규화 기본값과 구저장 호환을 함께 정의해야 한다. UI에서 관계 조건을 다시 계산하지 말고 시나리오가 결정한 표시 ID/variant를 저장한다.
- 현재 `CgFrame`은 미등록 ID도 빈 제목 fallback으로 진행한다. “QA 경고”는 아직 구현되지 않았으므로 수용 테스트 1은 신규 요구다.
- 정적 참조 검사 결과 레지스트리 18개/시나리오 호출 18개이며 미등록 호출, 미사용 등록, 중복 ID는 각각 0건이었다.

## 구현 수용 테스트

1. 존재하지 않는 CG ID는 개발/QA에서 경고하지만 플레이는 fallback으로 계속된다.
2. `form:'true'`가 없는 공개 장면은 변화 후 실제 외형 자산을 요청하지 않는다.
3. 분기 CG는 실제 참여·목격·지식 조건과 일치하며 강제 주입 결과를 자연 도달로 집계하지 않는다.
4. 375×812, 1366×768, 1920×1080에서 핵심 안전 영역과 대사 UI가 겹치지 않는다.
5. reduced-motion에서는 흔들림·줌·패닝이 사라져도 정보가 동일하다.
6. 갤러리 잠금 상태는 제목·캡션·파일 경로를 노출하지 않는다.
7. 실제 파일이 없거나 로드 실패해도 선택·저장·장면 진행이 변하지 않는다.

## 제작 파이프라인

1. 장면 계약 승인 → 중립 에셋 ID 예약 → 러프 구도 3폭 검수 → 표정/손/복장 검수.
2. 완성 파일은 `public/assets/cg/`, 메타는 매니페스트와 `cg.ts`에 등록한다.
3. 해당 장면의 조건·직후 대사·갤러리 해금을 테스트한다.
4. `?qa`에서 3폭, 키보드, reduced-motion, 빠른 클릭을 확인한다.

