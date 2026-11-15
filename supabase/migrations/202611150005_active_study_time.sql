begin;
create table private.activity_leases (
 user_id uuid primary key references auth.users(id) on delete cascade,
 attempt_id uuid not null references public.attempts(id) on delete cascade, source_id uuid not null,
 acquired_at timestamptz not null, expires_at timestamptz not null, last_end timestamptz not null
);
alter table private.activity_leases enable row level security;
create table public.activity_segments (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id uuid not null references public.attempts(id) on delete cascade, source_id uuid not null,
 started_at timestamptz not null, ended_at timestamptz not null, milliseconds integer not null check(milliseconds between 1 and 30000),
 check(ended_at>started_at)
);
create index activity_owner_end on public.activity_segments(user_id,ended_at);
alter table public.activity_segments enable row level security;
revoke all on public.activity_segments from public,anon,authenticated;
grant select on public.activity_segments to authenticated;
create policy own_activity_read on public.activity_segments for select to authenticated using(user_id=(select auth.uid()));

create function public.claim_activity(p_attempt uuid,p_source uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); moment timestamptz:=date_trunc('milliseconds',clock_timestamp()); item public.attempts; lease private.activity_leases;
begin
 if owner_id is null or p_source is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,5));
 select * into item from public.attempts where id=p_attempt and user_id=owner_id;
 if not found or item.status<>'open' or (item.expires_at is not null and item.expires_at<=moment) then raise exception 'Attempt closed or unavailable'; end if;
 select * into lease from private.activity_leases where user_id=owner_id;
 if found and lease.expires_at>moment and (lease.source_id<>p_source or lease.attempt_id<>p_attempt) then
  return jsonb_build_object('owned',false,'server_now',moment,'retry_at',lease.expires_at);
 end if;
 if lease.source_id=p_source and lease.attempt_id=p_attempt then
  update private.activity_leases set expires_at=moment+interval '45 seconds' where user_id=owner_id;
 else
  insert into private.activity_leases values(owner_id,p_attempt,p_source,moment,moment+interval '45 seconds',moment)
  on conflict(user_id) do update set attempt_id=excluded.attempt_id,source_id=excluded.source_id,acquired_at=excluded.acquired_at,expires_at=excluded.expires_at,last_end=excluded.last_end;
 end if;
 return jsonb_build_object('owned',true,'server_now',moment,'expires_at',moment+interval '45 seconds');
end $$;

create function public.record_activity(p_attempt uuid,p_source uuid,p_id uuid,p_start timestamptz,p_end timestamptz,p_milliseconds integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); lease private.activity_leases; item public.attempts; saved public.activity_segments; moment timestamptz:=clock_timestamp();
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,5));
 select * into saved from public.activity_segments where id=p_id;
 if found then
  if saved.user_id is distinct from owner_id or saved.attempt_id is distinct from p_attempt or saved.source_id is distinct from p_source or saved.started_at is distinct from p_start or saved.ended_at is distinct from p_end or saved.milliseconds is distinct from p_milliseconds then raise exception 'Activity ID already used'; end if;
  return jsonb_build_object('id',saved.id,'milliseconds',saved.milliseconds);
 end if;
 select * into item from public.attempts where id=p_attempt and user_id=owner_id for update;
 if not found or item.status<>'open' then raise exception 'Attempt closed or unavailable'; end if;
 select * into lease from private.activity_leases where user_id=owner_id;
 if not found or lease.attempt_id<>p_attempt or lease.source_id<>p_source then raise exception 'Activity source changed'; end if;
 if p_id is null or p_source is null or p_start is null or p_end is null or p_milliseconds is null or p_milliseconds not between 1 and 30000
  or abs(extract(epoch from(p_end-p_start))*1000-p_milliseconds)>1 or p_start<lease.acquired_at or p_start<lease.last_end or p_end>lease.expires_at
  or p_end>moment+interval '2 seconds' or (item.expires_at is not null and p_end>item.expires_at) then raise exception 'Invalid or overlapping activity interval'; end if;
 insert into public.activity_segments values(p_id,owner_id,p_attempt,p_source,p_start,p_end,p_milliseconds);
 update private.activity_leases set last_end=p_end where user_id=owner_id;
 return jsonb_build_object('id',p_id,'milliseconds',p_milliseconds);
end $$;

create function public.release_activity(p_attempt uuid,p_source uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,5));
 update private.activity_leases set expires_at=least(expires_at,clock_timestamp()) where user_id=auth.uid() and attempt_id=p_attempt and source_id=p_source;
end $$;

create function public.activity_days(p_timezone text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_timezone is null or not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception 'Invalid timezone'; end if;
 select coalesce(jsonb_object_agg(day,seconds),'{}') into result from (
  select d::date::text as day,sum(extract(epoch from(least(s.ended_at,(d::date+1)::timestamp at time zone p_timezone)-greatest(s.started_at,d::date::timestamp at time zone p_timezone)))) as seconds
  from public.activity_segments s cross join lateral generate_series((s.started_at at time zone p_timezone)::date::timestamp,((s.ended_at-interval '1 microsecond') at time zone p_timezone)::date::timestamp,interval '1 day') d
  where s.user_id=auth.uid() group by d::date
 ) daily;
 return result;
end $$;

alter function public.practice_snapshot(uuid) rename to practice_snapshot_legacy;
revoke all on function public.practice_snapshot_legacy(uuid) from public,anon,authenticated;
create function public.practice_snapshot(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.practice_snapshot_legacy(p_attempt);
 return result||jsonb_build_object('active_seconds',coalesce((select sum(milliseconds)/1000.0 from public.activity_segments where attempt_id=p_attempt),0));
end $$;
revoke all on function public.practice_snapshot(uuid) from public,anon;
grant execute on function public.practice_snapshot(uuid) to authenticated;

-- Keep the former history function private to this wrapper; old frontend fields remain available.
alter function public.practice_history(integer) rename to practice_history_legacy;
revoke all on function public.practice_history_legacy(integer) from public,anon,authenticated;
create function public.practice_history(p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
declare history jsonb;
begin
 history:=public.practice_history_legacy(p_offset);
 return coalesce((select jsonb_agg(h||jsonb_build_object('legacy_seconds',h->'seconds','seconds',coalesce((select sum(milliseconds)/1000.0 from public.activity_segments where attempt_id=(h->>'attemptId')::uuid),0),'time_source','active_estimate')) from jsonb_array_elements(history) h),'[]');
end $$;
revoke all on function public.claim_activity(uuid,uuid),public.record_activity(uuid,uuid,uuid,timestamptz,timestamptz,integer),public.release_activity(uuid,uuid),public.activity_days(text),public.practice_history(integer) from public,anon;
grant execute on function public.claim_activity(uuid,uuid),public.record_activity(uuid,uuid,uuid,timestamptz,timestamptz,integer),public.release_activity(uuid,uuid),public.activity_days(text),public.practice_history(integer) to authenticated;
commit;
