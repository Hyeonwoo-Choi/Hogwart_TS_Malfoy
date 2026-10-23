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

## 7. 실계정 통합 검증 절차 (사용자 직접 수행 — 자동 테스트로 검증되지 않음)
준비(한 번만)
1. 대시보드 > Authentication > URL Configuration: **Site URL** 과 **Redirect URLs**에 테스트 주소(예: `http://localhost:5190`)를 추가한다. (확인 메일 링크가 이 주소로 돌아온다. 허용 목록에 없으면 Site URL로 이동한다.)
2. (권장) Authentication > Sign In / Providers(또는 Password security)에서 **Leaked password protection** 켜기 — 보안 점검 WARN 1건.
3. 터미널(프로젝트 폴더 `hogwarts-fractured-destiny`): `npx vite --port 5190`. `.env.local`이 있어야 한다. 브라우저에서 `http://localhost:5190` 을 연다(⚠ `?qa` 없이 — QA 모드는 클라우드가 꺼진다).
4. 테스트용 이메일 2개(A, B)와 비밀번호를 준비한다(실제 쓰는 비밀번호 재사용 금지).

| # | 절차 | 기대 결과 | 결과 |
|---|---|---|---|
| T1 이메일 인증 | 타이틀 "로그인 / 클라우드 저장" > 회원가입(A) | "확인 메일을 보냈습니다" 문구, 아직 로그인 안 됨. 같은 이메일로 다시 가입하면 "이미 가입된 이메일" 안내 | |
| T2 | 메일의 확인 링크 클릭 | 게임 주소로 돌아오며 자동으로 로그인 상태(타이틀 버튼이 "계정 · A") | |
| T3 세션 복원 | 새로고침(F5), 탭을 닫았다 다시 열기 | 로그인 유지 | |
| T4 저장 | 새 게임 > 몇 번 진행 > 메뉴 > 저장하기 > 슬롯 1. 저장 메뉴에서 슬롯 1 아래에 "클라우드와 같음" 또는 "이 기기에만 있음" 확인(후자면 "클라우드에 올리기") | 대시보드 Table Editor > game_saves에 행 1개(slot1, revision 1, schema_version 2, scenario_version ch1-2.v1, user_id가 A의 id) | |
| T5 revision | 같은 슬롯 1에 다시 저장 | revision 2 (대시보드에서 확인) | |
| T6 불러오기 | 개발자도구 > Application > Local Storage에서 `hfd:save:slot1` 키만 삭제 > 새로고침 > 불러오기 화면 | 슬롯 1이 "클라우드에만 있음" > "이 기기로 받기" 후 불러오기 성공 | |
| T7 다중 브라우저 충돌 | 다른 브라우저(또는 시크릿 창)에서 같은 계정 A로 로그인 > 슬롯 1을 "이 기기로 받기" > 거기서 진행 후 슬롯 1에 저장. 원래 브라우저로 돌아와 (새로고침 없이) 슬롯 1에 저장 | 원래 브라우저에서 "서로 달라졌습니다" 알림, 저장 메뉴 슬롯 1이 "서로 다름". 서버 revision은 다른 브라우저가 올린 값 그대로. "이 기기 것을 유지"/"클라우드 것을 유지"는 한 번 더 눌러야 실행 | |
| T8 RLS 격리 | 로그아웃 > 이메일 B로 가입·확인·로그인 | A의 슬롯이 전혀 보이지 않는다(클라우드 행 없음). B로 저장하면 game_saves에 user_id가 다른 행이 생긴다 | |
| T9 로그아웃 캐시 | B에서 로그아웃 후 Local Storage 확인 | `hfd:cloudmeta:*` 키 없음, 저장 메뉴에 클라우드 표시 없음, 이 기기 슬롯은 그대로 | |
| T10 오프라인 | 로그인 상태에서 개발자도구 > Network > Offline 켜고 저장 | "오프라인입니다…" 알림, 로컬 저장은 성공(불러오기 가능). Offline 해제 후 저장 메뉴를 열거나 "동기화 상태 새로고침" → 슬롯이 자동으로 올라간다(서버 revision 증가) | |
| T11 비로그인 | 로그아웃 상태로 저장/불러오기 | 이전과 동일하게 로컬만 동작 | |

결과를 알려 줄 때는 번호와 통과/실패만 적으면 된다. 실패하면 화면에 나온 문구와 대시보드의 revision 값을 함께(비밀번호·키·토큰은 보내지 말 것).

## 8. 실서버 확인 기록 (2026-10-21, 읽기 전용·계정 생성 없음)
| 항목 | 방법 | 결과 |
|---|---|---|
| 비로그인(anon) 접근 차단 | 공개 키로 `game_saves` SELECT, `ending_unlocks` INSERT 직접 호출 | 둘 다 HTTP 401, `42501 permission denied` — **통과** |
| 사용자별 RLS·revision 트리거·UNIQUE | `pg_policies` / `pg_constraint` / 트리거 조회 | 6개 정책, `UNIQUE(user_id, slot)`, `revision+1` 트리거 확인 |
| Auth 설정 | `/auth/v1/settings` | 이메일 로그인 켜짐, 가입 열림, **이메일 확인 필요(autoconfirm 꺼짐)**, 다른 provider 없음 |
| 보안 점검(advisor) | `get_advisors(security)` | WARN 1건: **유출 비밀번호 보호 꺼짐**(대시보드 Auth 설정, 서버 쪽 비밀번호 정책) |
| 앱 ↔ 설정 | `.env.local`(공개 키만) 후 개발 서버 | 타이틀에 "로그인 / 클라우드 저장" 표시, supabase-js 지연 로드, 번들에 비밀 키 없음 |
| **미확인(사용자가 직접)** | 가입 → 확인 메일 → 로그인 → 저장/충돌 | 7장 체크리스트 |


> 시나리오 버전 갱신(3차 회차): 현재 `ch1-6.v1`. `ch1-2.v1`·`ch1-4.v1` 행도 계속 열린다(COMPATIBLE_SCENARIO_VERSIONS). DB 구조·RLS 변경 없음.

> 시나리오 버전 갱신(5차 회차): 현재 `ch1-7.v1`. `ch1-2.v1`·`ch1-4.v1`·`ch1-6.v1` 행도 계속 열린다. DB 구조·RLS 변경 없음.

> 시나리오 버전 갱신(6차 회차): 현재 `ch1-8.v1`. `ch1-2/4/6/7` 행도 계속 열린다. DB 구조·RLS 변경 없음.
