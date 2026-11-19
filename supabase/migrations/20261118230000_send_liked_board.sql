-- Send a finished board to more players without copying its legal-word list.
-- The live expiry and leaderboard bodies live in the private schema.

alter table public.game_players
  add column if not exists invited_at timestamptz,
  add column if not exists invited_by uuid;

update public.game_players as seat
set
  invited_at = coalesce(seat.invited_at, game.created_at, pg_catalog.now()),
  invited_by = coalesce(seat.invited_by, game.host_id)
from public.games as game
where game.id = seat.game_id
  and (seat.invited_at is null or seat.invited_by is null);

create or replace function private.invite_to_board(
  target_game uuid,
  player_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller uuid := auth.uid();
  invited uuid[] := '{}';
  rejected jsonb := '[]'::jsonb;
  pid uuid;
  seen uuid[] := '{}';
  seat_status text;
  has_result boolean;
begin
  if caller is null then
    raise exception 'sign in required';
  end if;

  if not exists (
    select 1
    from public.results
    where game_id = target_game
      and player_id = caller
  ) then
    raise exception 'finish this board before sending it';
  end if;

  if not exists (
    select 1 from public.games where id = target_game
  ) then
    raise exception 'that board could not be found';
  end if;

  if exists (
    select 1
    from public.games
    where id = target_game
      and daily_on is not null
  ) then
    raise exception 'a daily board cannot be sent';
  end if;

  foreach pid in array coalesce(player_ids, '{}') loop
    if pid = any (seen) then
      continue;
    end if;
    seen := array_append(seen, pid);

    if pid = caller then
      rejected := rejected || jsonb_build_array(jsonb_build_object('id', pid, 'reason', 'played'));
      continue;
    end if;

    select exists (
      select 1
      from public.results
      where game_id = target_game
        and player_id = pid
    ) into has_result;

    select status into seat_status
    from public.game_players
    where game_id = target_game
      and player_id = pid;

    if has_result then
      rejected := rejected || jsonb_build_array(jsonb_build_object('id', pid, 'reason', 'played'));
    elsif seat_status = 'invited' then
      rejected := rejected || jsonb_build_array(jsonb_build_object('id', pid, 'reason', 'invited'));
    elsif seat_status = 'accepted' then
      rejected := rejected || jsonb_build_array(jsonb_build_object('id', pid, 'reason', 'playing'));
    elsif seat_status = 'declined' then
      update public.game_players
      set
        status = 'invited',
        started_at = null,
        invited_at = pg_catalog.now(),
        invited_by = caller
      where game_id = target_game
        and player_id = pid;
      invited := array_append(invited, pid);
    elsif seat_status is null then
      insert into public.game_players (game_id, player_id, status, started_at, invited_at, invited_by)
      values (target_game, pid, 'invited', null, pg_catalog.now(), caller);
      invited := array_append(invited, pid);
    else
      rejected := rejected || jsonb_build_array(jsonb_build_object('id', pid, 'reason', 'playing'));
    end if;
  end loop;

  return jsonb_build_object('invited', to_jsonb(invited), 'rejected', rejected);
end;
$$;

create or replace function public.invite_to_board(
  target_game uuid,
  player_ids uuid[]
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $$
begin
  return private.invite_to_board(target_game, player_ids);
end;
$$;

revoke all on function public.invite_to_board(uuid, uuid[]) from public, anon;
grant execute on function public.invite_to_board(uuid, uuid[]) to authenticated;
grant execute on function private.invite_to_board(uuid, uuid[]) to authenticated;

-- Drop an unfinished seat five days after it was sent.
-- Keep a game that still has a live invitation, and keep the archive of an old
-- game once nobody is left to play it.
create or replace function private.expire_stale_games()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  removed integer := 0;
begin
  delete from public.game_players as seat
  using public.games as game
  where game.id = seat.game_id
    and seat.status in ('invited', 'accepted')
    and not exists (
      select 1
      from public.results as result
      where result.game_id = seat.game_id
        and result.player_id = seat.player_id
    )
    and coalesce(seat.invited_at, game.created_at) < pg_catalog.now() - interval '5 days';

  if not exists (
    select 1
    from public.games g
    where g.created_at < pg_catalog.now() - interval '5 days'
      and (
        select count(distinct r.player_id)
        from public.results r
        where r.game_id = g.id
      ) < 2
      and not exists (
        select 1
        from public.game_players seat
        where seat.game_id = g.id
          and seat.status in ('invited', 'accepted')
          and not exists (
            select 1
            from public.results result
            where result.game_id = seat.game_id
              and result.player_id = seat.player_id
          )
          and coalesce(seat.invited_at, g.created_at) >= pg_catalog.now() - interval '5 days'
      )
  ) then
    return 0;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(814275);

  insert into public.match_history (
    player_id,
    played_on,
    words_found,
    score,
    opponent_name,
    opponent_score,
    opponent_id,
    archive_group,
    seeded
  )
  select
    mine.player_id,
    (g.created_at at time zone 'utc')::date,
    case
      when pg_catalog.jsonb_typeof(mine.words) = 'array' then pg_catalog.jsonb_array_length(mine.words)
      else 0
    end,
    mine.score,
    case
      when opp.player_id is null then null
      else coalesce(nullif(pg_catalog.btrim(op.name), ''), 'A player')
    end,
    opp.score,
    opp.player_id,
    md5(g.id::text || ':' || mine.player_id::text)::uuid,
    false
  from public.games g
  join public.results mine on mine.game_id = g.id
  left join public.results opp
    on opp.game_id = g.id
   and opp.player_id <> mine.player_id
  left join public.profiles op on op.id = opp.player_id
  where g.created_at < pg_catalog.now() - interval '5 days'
    and (
      select count(distinct r.player_id)
      from public.results r
      where r.game_id = g.id
    ) < 2
    and not exists (
      select 1
      from public.game_players seat
      where seat.game_id = g.id
        and seat.status in ('invited', 'accepted')
        and not exists (
          select 1
          from public.results result
          where result.game_id = seat.game_id
            and result.player_id = seat.player_id
        )
        and coalesce(seat.invited_at, g.created_at) >= pg_catalog.now() - interval '5 days'
    );

  delete from public.games g
  where g.created_at < pg_catalog.now() - interval '5 days'
    and (
      select count(distinct r.player_id)
      from public.results r
      where r.game_id = g.id
    ) < 2
    and not exists (
      select 1
      from public.game_players seat
      where seat.game_id = g.id
        and seat.status in ('invited', 'accepted')
        and not exists (
          select 1
          from public.results result
          where result.game_id = seat.game_id
            and result.player_id = seat.player_id
        )
        and coalesce(seat.invited_at, g.created_at) >= pg_catalog.now() - interval '5 days'
    );

  get diagnostics removed = row_count;
  return removed;
end;
$$;
