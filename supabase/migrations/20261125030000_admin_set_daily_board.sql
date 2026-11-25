-- Admin can publish a curated daily board. Daily result inserts share the same
-- per-day lock so publish cannot race a concurrent finish, and results for a
-- replaced board are rejected after the lock is held.

create or replace function private.lock_daily_day(p_played_on date)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if p_played_on is null then
    raise exception 'played_on is required';
  end if;

  -- Namespace 872014 stays clear of cleanup lock 814275.
  perform pg_catalog.pg_advisory_xact_lock(
    872014,
    (('x' || substr(md5(p_played_on::text), 1, 8))::bit(32)::int)
  );
end;
$$;

create or replace function private.guard_daily_result()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  day_on date;
  game_board jsonb;
  daily_board jsonb;
begin
  select game.daily_on, game.board
    into day_on, game_board
  from public.games as game
  where game.id = new.game_id;

  if day_on is null then
    return new;
  end if;

  perform private.lock_daily_day(day_on);

  select board.board
    into daily_board
  from public.daily_boards as board
  where board.played_on = day_on;

  if daily_board is null or daily_board is distinct from game_board then
    raise exception 'this daily board was replaced before you finished';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_daily_result on public.results;
create trigger guard_daily_result
  before insert on public.results
  for each row
  execute function private.guard_daily_result();

create or replace function private.set_daily_board(p_played_on date, p_board jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Only the admin can set the daily board.';
  end if;

  if p_played_on is null then
    raise exception 'played_on is required';
  end if;

  if p_board is null or jsonb_typeof(p_board) <> 'array' then
    raise exception 'board is required';
  end if;

  perform private.lock_daily_day(p_played_on);

  if exists (
    select 1
    from public.results as result
    join public.games as game on game.id = result.game_id
    where game.daily_on = p_played_on
  ) then
    raise exception 'That day already has daily results.';
  end if;

  -- daily_boards_pkey is on played_on.
  insert into public.daily_boards (played_on, board)
  values (p_played_on, p_board)
  on conflict (played_on) do update
    set board = excluded.board;
end;
$$;

create or replace function public.set_daily_board(p_played_on date, p_board jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $$
begin
  perform private.set_daily_board(p_played_on, p_board);
end;
$$;

revoke all on function public.set_daily_board(date, jsonb) from public, anon;
grant execute on function public.set_daily_board(date, jsonb) to authenticated;
revoke all on function private.set_daily_board(date, jsonb) from public, anon;
grant execute on function private.set_daily_board(date, jsonb) to authenticated;
revoke all on function private.lock_daily_day(date) from public, anon;
revoke all on function private.guard_daily_result() from public, anon;
