begin;

create table public.profile_login_days (
 user_id uuid not null references auth.users(id) on delete cascade,
 login_day date not null,
 first_seen_at timestamptz not null default clock_timestamp(),
 flame_opened_at timestamptz,
 primary key(user_id,login_day)
);
alter table public.profile_login_days enable row level security;
create policy own_login_days on public.profile_login_days for select to authenticated
 using(user_id=(select auth.uid()));
revoke all on public.profile_login_days from public,anon,authenticated;
grant select on public.profile_login_days to authenticated;

-- Day and identity come from the server, never an imported backup or browser clock.
create function public.touch_profile(p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); zone text; today date; current_streak integer; name text; opened boolean;
begin
 if owner_id is null or owner_id is distinct from p_owner then raise exception 'Account changed'; end if;
 insert into public.profiles(user_id) values(owner_id) on conflict(user_id) do nothing;
 select p.display_name,case when exists(select 1 from pg_timezone_names z where z.name=p.timezone) then p.timezone else 'Asia/Ho_Chi_Minh' end
 into name,zone from public.profiles p where p.user_id=owner_id;
 today:=(clock_timestamp() at time zone zone)::date;
 insert into public.profile_login_days(user_id,login_day) values(owner_id,today) on conflict(user_id,login_day) do nothing;
 select count(*)::integer into current_streak from (
  select d.login_day,row_number() over(order by d.login_day desc)::integer as position
  from public.profile_login_days d where d.user_id=owner_id and d.login_day<=today
 ) days where days.login_day=today-(days.position-1);
 select flame_opened_at is not null into opened from public.profile_login_days where user_id=owner_id and login_day=today;
 return jsonb_build_object('display_name',name,'timezone',zone,'today',today,'streak',current_streak,'celebrated_today',opened);
end $$;

-- UPDATE takes a row lock: exactly one profile opening wins per account/day.
create function public.claim_profile_flame(p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare summary jsonb; claimed boolean;
begin
 summary:=public.touch_profile(p_owner);
 update public.profile_login_days set flame_opened_at=clock_timestamp()
 where user_id=auth.uid() and login_day=(summary->>'today')::date and flame_opened_at is null
 returning true into claimed;
 return summary||jsonb_build_object('celebrate',coalesce(claimed,false),'celebrated_today',true);
end $$;

create function public.save_profile_name(p_name text,p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from p_owner then raise exception 'Account changed'; end if;
 if p_name is null or length(btrim(p_name))<1 or length(btrim(p_name))>60 then raise exception 'Display name must be 1–60 characters'; end if;
 insert into public.profiles(user_id,display_name) values(auth.uid(),btrim(p_name))
 on conflict(user_id) do update set display_name=excluded.display_name;
 return public.touch_profile(p_owner);
end $$;

revoke all on function public.touch_profile(uuid),public.claim_profile_flame(uuid),public.save_profile_name(text,uuid) from public,anon;
grant execute on function public.touch_profile(uuid),public.claim_profile_flame(uuid),public.save_profile_name(text,uuid) to authenticated;
commit;
