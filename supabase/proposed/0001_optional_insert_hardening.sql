-- ============================================================================
-- 제안 SQL (선택 사항) — ⚠ 아직 실행되지 않았다. 사용자의 승인 후에만 적용한다.
--
-- 현재 배포된 스키마(읽기 전용으로 확인함, 2026-10-20):
--   public.game_saves   : RLS 켜짐, 정책 4개(select/insert/update/delete = user_id = auth.uid()),
--                         UNIQUE(user_id, slot), CHECK(slot/state/read_lines/label/chapter/schema_version/scenario_version),
--                         BEFORE UPDATE 트리거 game_saves_touch()가 revision := old.revision + 1, user_id 변경 금지
--   public.ending_unlocks: RLS 켜짐, 정책 2개(select/insert), PK(user_id, ending_id), CHECK(ending_id IN 13개)
--   anon 권한 없음, authenticated는 game_saves(CRUD)·ending_unlocks(INSERT/SELECT)만.
--
-- 클라이언트 구현은 이 SQL 없이도 완전히 동작한다(리비전 조건부 UPDATE + INSERT의 UNIQUE 위반 = 충돌).
-- 아래는 "클라이언트가 revision/시각을 위조해 INSERT 하는 것"만 막는 보강안이다.
-- 영향 범위: 본인 행에만 영향이 있어 위험도는 낮다. 적용하지 않아도 사용자 간 격리는 깨지지 않는다.
--
-- 적용 방법(승인 후): Supabase SQL Editor 또는 migration으로 실행. 기존 행·데이터는 변경하지 않는다.
-- 되돌리기: 맨 아래 ROLLBACK 블록 참고.
-- ============================================================================

begin;

-- 1) game_saves INSERT 시 revision / 시각을 서버가 결정한다(클라이언트 값 무시)
create or replace function public.game_saves_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.revision   := 1;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists game_saves_before_insert on public.game_saves;
create trigger game_saves_before_insert
  before insert on public.game_saves
  for each row execute function public.game_saves_before_insert();

-- 2) ending_unlocks.unlocked_at 위조 방지
create or replace function public.ending_unlocks_before_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.unlocked_at := now();
  return new;
end $$;

drop trigger if exists ending_unlocks_before_insert on public.ending_unlocks;
create trigger ending_unlocks_before_insert
  before insert on public.ending_unlocks
  for each row execute function public.ending_unlocks_before_insert();

commit;

-- ---------------------------------------------------------------------------
-- 적용 후 확인용(읽기 전용)
--   select tgname, tgrelid::regclass from pg_trigger where not tgisinternal and tgrelid in ('public.game_saves'::regclass, 'public.ending_unlocks'::regclass);
--
-- ROLLBACK (필요 시)
--   drop trigger if exists game_saves_before_insert on public.game_saves;
--   drop function if exists public.game_saves_before_insert();
--   drop trigger if exists ending_unlocks_before_insert on public.ending_unlocks;
--   drop function if exists public.ending_unlocks_before_insert();
-- ---------------------------------------------------------------------------
