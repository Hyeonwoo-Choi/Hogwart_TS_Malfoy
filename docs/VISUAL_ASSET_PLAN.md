# VISUAL_ASSET_PLAN — 캐릭터 표정·외형·CG·배경·연출

## 1. 캐릭터 연출 데이터 구조
`view = { char, expr, form, pose, gaze, light, cue, cg }` (엔진: `src/engine/types.ts`, 지정: 시나리오의 `show`/`line`/`cue`/`cg` 노드)
| 필드 | 값 | 규칙 |
|---|---|---|
| expr | calm 평온 · blank 무표정 · smirk 비웃음 · interest 흥미 · flustered 당황 · angry 분노 · anxious 불안 · sad 슬픔 · resolve 결심 · smile 미소 | 작가가 장면의 관찰 가능한 행동으로 지정. 숨겨진 감정 수치로 자동 결정하지 않는다. 드레이코 대사의 25% 이하만 표정 지정 |
| form | base 기본 · illusion 환영 · true 진짜 모습 | 사고 전 base. 사고 후 기본값 illusion(공개). true는 장면이 명시할 때만(현재: ch2_after, S-01 반응, ch2_illusion 시전 전, ch2_dawn) |
| pose | stand · arms · turned · slumped · guard · lean | 거리감·방어기제 표현 |
| gaze | front · away · down · side | 시선 회피/정면 응시 |
| light | normal · dim · warm · cold · spot · dark | 장면 조명 |
| cue | fade · blackout · flash · shake · zoom · blur · focus · magic · pause | 진행을 막지 않음. 움직임 줄이기 설정에서 shake/zoom/blur/magic/flash 비활성 |

조합 예: 불안+시선 회피(anxious/away), 분노+정면(angry/front), 무표정+웅크림(blank/slumped).

## 2. 이미지 매니페스트
- `public/assets/manifest.json`에 `status:"final"`로 등록하면 새로고침만으로 교체. 없거나 로드 실패 시 실루엣/프레임 폴백.
- 캐릭터: `char.<id>.<expr>`. 드레이코 진짜 모습은 `char.draco_t.<expr>`(환영·기본 외형은 `char.draco.*` 공유).
- CG: `cg.<cgId>`. 배경: `bg.<id>`.
- **파일명 규칙**: 이미지 경로는 DOM(`img src`)에 드러나므로 내용을 암시하지 않는 중립 이름을 쓴다(예: `/assets/c/d07.webp`). `draco_female.png` 같은 이름 금지.
- 플레이어 화면·DOM에는 인물 이름만. 표정 코드·외형 상태·에셋 ID·"플레이스홀더"는 `?qa`/`?debug=1`에서만 data 속성으로 노출(테스트로 검증).

## 3. CG 목록 (챕터 1~2, 레지스트리: `src/data/cg.ts`)
| CG ID | Ch | 종류 | 장면 목적 | 권장 구도 | 외형 | 표정 | 배경 | 우선순위 | 제작 | 게임 연결 |
|---|---|---|---|---|---|---|---|---|---|---|
| cg_train_sleeve | 1 | Event | 첫 위화감(F-01) | 문틈 너머 시점, 창가 실루엣, 소매를 쥔 손 강조 | base | blank | train | 상 | 미제작 | 연결됨(전 경로) |
| cg_pitch_fall | 1 | Event | 완벽함의 첫 균열 | 낮은 앵글, 빗자루에서 미끄러지는 손 | base | anxious | pitch | 중 | 미제작 | 연결됨(전 경로) |
| cg_bench_water | 1 | Service(RIVAL) | 사적인 배려 | 벤치 옆모습 2인, 물병 하나 거리 | base | blank | pitch(석양) | 중 | 미제작 | K-03 D |
| cg_corridor_faceoff | 1 | Event | 7층 대치 | 지팡이 불빛 두 개, 맨벽, 신발의 톱밥 | base | blank | corridor7_night | 상 | 미제작 | 연결됨(전 경로) |
| cg_dinner_mask | 2 | Service(R1) | 가면 뒤의 피로 | 모퉁이 너머 원경, 벽에 이마 | base | blank | 복도(따뜻한 잔광) | 중 | 미제작 | SS-02 |
| cg_blast_4f | 2 | Event | 캐비닛 마법의 성질 | 연기 속 검보랏빛 불꽃이 책상을 "지우는" 클로즈업 | base | anxious | 4층 교실 | 상 | 미제작 | 연결됨 |
| cg_snitch_dive | 2 | Event | 라이벌전 절정 | 나란히 떨어지는 두 수색꾼, 금빛 점 | base | resolve | pitch | 중 | 미제작 | 연결됨 |
| cg_fracture | 2 | Event | 변화의 순간 | 방패와 찢어진 공기의 충돌, 사이에 선 실루엣(얼굴 비공개) | base→ | — | 7층 | 최상 | 미제작 | 연결됨 |
| cg_after_light | 2 | Event | 목격 | 지팡이 불빛 아래 쓰러진 얼굴(상반신 이하는 로브·그림자), 비성적 구도 | true | blank | 7층(암) | 최상 | 미제작 | 연결됨 |
| cg_dawn_cloak | 2 | Service(R1) | 첫 침묵 | 세 걸음 거리 두 사람, 같은 방향, 무릎 위 접힌 망토, 회색 새벽빛 | true | blank | 7층 창가 | 상 | 미제작 | SS-04 |
| cg_hall_flicker | 2 | Event | 환영의 불안정 | 부엉이 떼·흔들리는 촛불, 윤곽이 어긋나는 한 순간 | illusion | calm | hall | 상 | 미제작 | 연결됨 |

## 4. 배경 (현재 그라데이션 폴백)
train, hall, potions, pitch, library, courtyard, lake, corridor7_night, common, trophy. 필요 추가: 4층 빈 교실(현재 library 재사용), 슬러그혼 사무실(현재 common 재사용), 7층 창가(현재 corridor7_night).

## 5. 표정 에셋
- 우선: 드레이코 base 10종, draco_t 6종(blank, anxious, angry, sad, resolve, calm).
- 조연은 calm 1종으로 시작(헤르미온느·론·지니·루나·판시·슬러그혼·스네이프·맥고나걸·후치·필치).
- 이미지 생성은 이번 회차 범위가 아니다.


## 챕터 3~4 추가 CG (ID만 등록, 이미지 미제작)
- `cg_trophy_chair` (Ch3, 서비스): 트로피실. 의자에 앉은 말포이와 한 걸음 떨어져 선 해리. 거리를 좁히지 않는 구도.
- `cg_letter_flicker` (Ch3, 이벤트): 검은 봉투를 쥔 손과 잠깐 어긋나는 윤곽(환영 흔들림).
- `cg_cabinet_apple` (Ch4, 이벤트): 캐비닛 문 안쪽에서 돌아온 사과, 한쪽 단면이 매끈하게 비어 있음.


## 챕터 5~6 추가 (ID만 등록, 이미지 미제작)
- 배경: `hogsmeade`(호그스미드 거리), `infirmary`(병동 복도) — 플레이스홀더 색조만 지정.
- `cg_necklace_road` (Ch5, 이벤트): 좁은 길에서 허공으로 떠오른 인물과 찢어진 갈색 포장지, 초록 보석. 피해 묘사는 암시에 그치고 신체 손상은 그리지 않는다.
- `cg_scar_sleeve` (Ch6, 이벤트): 빈 교실, 걷어 올린 왼팔의 흰 흉터(표식 없음). 얼굴은 프레임 밖 또는 시선 아래. 접촉 없음.
- `cg_xmas_hearth` (Ch6, 서비스): 벽난로 앞 소파의 양 끝, 한 사람이 더 앉을 만큼의 거리.


## 챕터 7 추가 (ID만 등록, 이미지 미제작)
- `cg_lab_vigil` (Ch7, 서비스): 비어 가는 마법약 교실, 촛불 앞에서 기울어진 유리병과 펜을 주고받는 두 손(스침). 얼굴은 프레임 밖 또는 병 너머로. 환영 외형 유지.
