-- Pass-along solo invites: admin creates a board for one recipient without seating
-- themselves as accepted, so invite_to_board can later invite the admin back.

alter table public.games
  add column if not exists pass_along boolean not null default false;

comment on column public.games.pass_along is
  'True when the game began as an admin pass-along solo invite (no host seat).';

create or replace function private.create_solo_invite(
  p_board jsonb,
  p_possible_words jsonb,
  p_friend_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
declare
  caller uuid := auth.uid();
  game_id uuid;
  sent_at timestamptz := pg_catalog.now();
begin
  if caller is null then
    raise exception 'sign in required';
  end if;

  if not private.is_admin() then
    raise exception 'Only the admin can send a solo board.';
  end if;

  if p_friend_id is null or p_friend_id = caller then
    raise exception 'Choose someone else to send this board to.';
  end if;

  if p_board is null or jsonb_typeof(p_board) <> 'array' then
    raise exception 'board is required';
  end if;

  if p_possible_words is null or jsonb_typeof(p_possible_words) <> 'array' then
    raise exception 'possible words are required';
  end if;

  if not exists (
    select 1 from public.profiles where id = p_friend_id
  ) then
    raise exception 'That player could not be found.';
  end if;

  insert into public.games (board, possible_words, host_id, daily_on, pass_along)
  values (p_board, p_possible_words, caller, null, true)
  returning id into game_id;

  insert into public.game_players (
    game_id,
    player_id,
    status,
    started_at,
    invited_at,
    invited_by
  )
  values (
    game_id,
    p_friend_id,
    'invited',
    null,
    sent_at,
    caller
  );

  return game_id;
end;
$$;

create or replace function public.create_solo_invite(
  p_board jsonb,
  p_possible_words jsonb,
  p_friend_id uuid
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $$
begin
  return private.create_solo_invite(p_board, p_possible_words, p_friend_id);
end;
$$;

revoke all on function public.create_solo_invite(jsonb, jsonb, uuid) from public, anon;
grant execute on function public.create_solo_invite(jsonb, jsonb, uuid) to authenticated;
revoke all on function private.create_solo_invite(jsonb, jsonb, uuid) from public, anon;
grant execute on function private.create_solo_invite(jsonb, jsonb, uuid) to authenticated;
