# CLOUD_SETUP — Supabase 클라우드 저장

클라우드 저장은 **선택 기능**이다. 환경변수가 없으면 게임은 로컬 저장만으로 정상 동작하고 계정 UI도 보이지 않는다.

## 1. 사용자 설정 항목
1. `.env.example`을 `.env.local`로 복사하고 채운다(`.env*`는 `.gitignore`로 커밋 제외).
   - `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = **anon 또는 publishable 키만**(`eyJ…` role=anon / `sb_publishable_…`).
   - `service_role`·`sb_secret_` 키를 넣으면 앱이 감지해 클라우드를 끈다(콘솔에 사유만 출력, 키 값은 출력 안 함). 비밀 키는 절대 `VITE_` 변수에 두지 않는다.
2. Supabase 대시보드 > Authentication:
   - Providers > Email 켜짐 확인. **이메일 확인(Confirm email)** 이 켜져 있으면 가입 후 메일 링크를 눌러야 로그인된다(앱이 안내 문구를 보여 준다).
   - URL Configuration: Site URL을 배포 주소(개발 중에는 `http://localhost:5173`)로, Redirect URLs에 같은 주소를 추가.
   - 비밀번호 최소 길이: 앱은 8자 이상을 요구한다(서버 설정이 더 엄격하면 서버 오류 문구가 표시됨).
3. 개발 서버 재시작(`npm run dev`). 타이틀에 "로그인 / 클라우드 저장" 버튼이 보이면 활성화된 것이다. `?qa` 격리 모드에서는 항상 꺼진다.

## 2. 사용하는 DB (기존 테이블 재사용, 변경 없음)
| 테이블 | 용도 | 클라이언트 동작 |
|---|---|---|
| `public.game_saves` | slot: `auto`, `slot1`~`slot10` | SELECT / INSERT / 조건부 UPDATE(`revision`) / 조건부 DELETE |
| `public.ending_unlocks` | 13개 엔딩 ID | SELECT / INSERT(ON CONFLICT DO NOTHING). UPDATE·DELETE 없음 |

필드 대응: `state`=GameState(JSON), `read_lines`=읽은 대사 ID, `label`(≤120자), `chapter`(1~14), `schema_version`(=2), `scenario_version`(=`ch1-2.v1`), `revision`(서버 트리거가 UPDATE마다 +1).
서버 제약(CHECK·UNIQUE·RLS)은 클라이언트도 같은 규칙으로 선검증한다(슬롯 이름, state ≈1MB 미만, read_lines ≈512KB 미만, 챕터 범위 보정).

## 3. 저장 호환 정책
- `schema_version`이 현재 빌드(2)와 다르면 **열지 않는다**. `scenario_version`이 `COMPATIBLE_SCENARIO_VERSIONS`에 없어도 열지 않는다. 열 수 없는 클라우드 저장은 "열 수 없음"으로 표시되고 **서버 원본은 삭제·수정되지 않는다**(사용자가 명시적으로 삭제 버튼을 눌러야 한다).
- 챕터 3~4 재작업 때 `SCENARIO_VERSION`을 올리고(예: `ch1-4.v1`), 이어서 플레이할 수 있는 이전 버전은 호환 목록에 남긴다(`src/cloud/versions.ts`).
- 로컬의 구버전(v1) 저장은 업로드하지 않는다(기존 보존 정책).

## 4. 동기화·충돌 모델 (자동 덮어쓰기 없음)
- 로컬 저장은 항상 먼저·독립적으로 성공한다. 로그인 상태면 저장 직후 해당 슬롯을 클라우드에 조건부로 올린다(`auto`는 4초 디바운스, 탭이 숨겨질 때 flush).
- **기준(base)**: 슬롯마다 "마지막으로 동기화된 서버 revision + 내용 해시"를 사용자별 메타(`hfd:cloudmeta:<userId>`)에 저장한다.
- 쓰기는 항상 원자적 조건부: 기준 revision이 있으면 `UPDATE … WHERE user_id=? AND slot=? AND revision=<기준>`, 없으면 `INSERT`(UNIQUE 위반=이미 있음). 0행/위반이면 **충돌**.
- 슬롯 상태: 같음 / 이 기기에만 / 클라우드에만 / 이 기기가 새로움 / 클라우드가 새로움 / **서로 다름(충돌)** / 열 수 없음.
  - 충돌이면 아무것도 바꾸지 않고, 저장 메뉴에서 **"이 기기 것을 유지"**(서버를 방금 본 revision 기준으로 덮어씀) 또는 **"클라우드 것을 유지"**(이 기기 슬롯은 `bak:<slot>`에 보관 후 교체) 중 하나를 **2단계 확인** 후 실행한다. 선택 도중 서버가 또 바뀌면 다시 충돌로 돌아간다.
  - 첫 로그인 기기에서 같은 슬롯의 내용이 다르면(기준 없음) 충돌로 취급한다. 로컬 전용 슬롯을 로그인 직후 자동 업로드하지 않는다(사용자가 "올리기").
- 불러오기("이 기기로 받기")는 로컬 슬롯만 바꾸며 진행 중인 게임 상태는 건드리지 않는다.

## 5. 엔딩 해금
- 로컬 기록(`hfd:endings`)과 서버를 **합집합**으로 맞춘다(서버에는 INSERT만). 허용 ID는 DB CHECK와 `BRANCH_MAP.md` 7장의 13개와 같다(테스트가 목록을 고정).
- 허용 목록 밖 ID는 로컬·서버 어디에도 기록하지 않는다. 엔딩은 챕터 14에서 연결된다(현재 플레이 범위에서는 해금되지 않음).

## 6. 보안·격리
- 브라우저에는 공개 키만 둔다. 모든 접근은 RLS(`user_id = auth.uid()`)로 제한되고, 클라이언트는 방어적으로 `user_id`도 조건에 건다.
- 로그아웃: 이 기기의 세션만 종료(`scope: 'local'`)하고 동기화 메타·메모리 캐시를 지운다(오프라인이어도). **로컬 저장 슬롯은 사용자의 데이터이므로 지우지 않는다.** 공용 PC라면 사용자가 직접 저장을 삭제해야 한다.
- 비밀번호는 저장·로깅하지 않는다. 오류 메시지에 키·토큰을 넣지 않는다.
- 네트워크 장애: 로컬 저장은 영향 없음, "오프라인" 안내, 올리지 못한 슬롯은 "올리기 대기"로 표시.

## 7. 실서버 수동 확인 체크리스트 (자동 테스트로는 검증되지 않음)
1. 가입 → (확인 메일 → ) 로그인 → 새로고침 후 세션 유지.
2. 저장 슬롯 1 → 대시보드 Table Editor에서 `game_saves`에 1행(revision 1, schema_version 2, scenario_version `ch1-2.v1`).
3. 다시 저장 → revision 2. 두 번째 브라우저(시크릿 창)에서 같은 계정으로 받기 → 한쪽에서 저장 후 다른 쪽에서 저장 → 충돌 표시.
4. 두 번째 계정으로 로그인 → 첫 계정의 슬롯이 보이지 않는다.
5. 로그아웃 후 `localStorage`의 `hfd:cloudmeta:*` 키 삭제 확인, DevTools에서 오프라인으로 전환 후 저장 → "오프라인" 안내와 로컬 보존.
6. (선택) `supabase/proposed/0001_optional_insert_hardening.sql` 적용 여부 결정.
