-- Credit "Most outgoing" to the player who sent the invitation.
-- Seats created with a new game still credit the host, because invited_by is the host.

do $mig$
declare
  src text;
  old text := $old$
outgoing as (
  select host_id as player_id, pg_catalog.sum(others)::integer as outgoing
  from (
    select host_id, game_id, pg_catalog.count(distinct player_id)::integer as others
    from named
    where host_id is not null
      and player_id <> host_id
    group by host_id, game_id
  ) as hosted
  group by host_id
),$old$;
  neu text := $neu$
outgoing as (
  select sent.inviter as player_id, pg_catalog.sum(sent.others)::integer as outgoing
  from (
    select
      credit.inviter,
      named.game_id,
      pg_catalog.count(distinct named.player_id)::integer as others
    from named
    left join public.game_players as seat
      on seat.game_id = named.game_id
     and seat.player_id = named.player_id
    cross join lateral (
      select case
        when seat.invited_by is not null and seat.invited_by <> named.player_id then seat.invited_by
        when named.host_id is not null and named.host_id <> named.player_id then named.host_id
        else null
      end as inviter
    ) as credit
    where credit.inviter is not null
    group by credit.inviter, named.game_id
  ) as sent
  group by sent.inviter
),$neu$;
begin
  select pg_get_functiondef(p.oid) into src
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname = 'leaderboard';

  if src is null or position(old in src) = 0 then
    raise exception 'leaderboard outgoing clause was not found';
  end if;

  execute replace(src, old, neu);
end;
$mig$;
