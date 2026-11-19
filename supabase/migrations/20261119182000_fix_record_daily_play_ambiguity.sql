-- Rename the PL/pgSQL local so it does not collide with daily_plays.played_on.
-- That ambiguity aborted every daily results insert after record_daily_play was added.

create or replace function private.record_daily_play()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  day_on date;
  played_at timestamp with time zone;
begin
  select game.daily_on, game.created_at
    into day_on, played_at
  from public.games as game
  where game.id = new.game_id;

  if day_on is null or played_at is null or new.player_id is null or new.score is null then
    return new;
  end if;

  insert into private.daily_plays (player_id, played_on, score, created_at)
  values (new.player_id, day_on, new.score, played_at)
  on conflict (player_id, played_on) do update
    set score = excluded.score,
        created_at = excluded.created_at
    where excluded.created_at > private.daily_plays.created_at
      and excluded.created_at < (((excluded.played_on + 1)::timestamp + time '12:00') at time zone 'utc');

  return new;
end;
$$;
