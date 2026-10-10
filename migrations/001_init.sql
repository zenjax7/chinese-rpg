-- 001: architecture.md §7.2 (player data only). Auth.js tables match @auth/neon-adapter exactly (SERIAL ids, quoted camelCase).

-- Auth.js ---------------------------------------------------------------------------------------------------------------
create table users (
  id serial primary key,
  name varchar(255),
  email varchar(255),
  "emailVerified" timestamptz,
  image text
);
create table accounts (
  id serial primary key,
  "userId" integer not null references users(id) on delete cascade,
  type varchar(255) not null,
  provider varchar(255) not null,
  "providerAccountId" varchar(255) not null,
  refresh_token text,
  access_token text,
  expires_at bigint,
  id_token text,
  scope text,
  session_state text,
  token_type text
);
create table sessions (
  id serial primary key,
  "userId" integer not null references users(id) on delete cascade,
  expires timestamptz not null,
  "sessionToken" varchar(255) not null,
  -- not in the adapter schema (it never writes it; the default fills it): §5.5 PIN reset needs "a session under 5 minutes old"
  created_at timestamptz not null default now()
);
create table verification_token (
  identifier text not null,
  expires timestamptz not null,
  token text not null,
  primary key (identifier, token)
);

-- Parents and children --------------------------------------------------------------------------------------------------
create table parents (
  user_id integer primary key references users(id) on delete cascade,
  consent_status text not null default 'none' check (consent_status in ('none','granted','confirmed','revoked')),
  consent_version text,
  consent_granted_at timestamptz,
  pin_hash text,
  pin_salt bytea,
  pin_failed_count smallint not null default 0,
  pin_fail_window_start timestamptz,          -- start of the 24 h window for the "10 in 24 hours" rule (§5.5)
  pin_fail_24h smallint not null default 0,
  pin_locked_until timestamptz,
  role text not null default 'parent' check (role in ('parent','dev')),
  locale text not null default 'en',
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);
create table parent_unlocks (
  session_id integer primary key references sessions(id) on delete cascade,
  until timestamptz not null
);
create table child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_id integer not null references parents(user_id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 16),
  avatar text not null,
  speech_mode text not null default 'on_device' check (speech_mode in ('off','on_device','cloud')),
  sort smallint not null default 0,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  -- §5.1.1, 13+ teen link: designed, not built. Kept null by the check below until the feature ships.
  linked_email text,
  linked_user_id integer references users(id) on delete set null,
  link_status text not null default 'none' check (link_status in ('none','invited','linked')),
  linked_at timestamptz,
  constraint teen_link_not_built check (linked_email is null and linked_user_id is null and link_status = 'none' and linked_at is null)
);
-- D11 backstop: at most 6 live profiles per parent, even if a code path skips the DAL's guarded insert.
create function child_profiles_cap() returns trigger language plpgsql as $$
begin
  perform 1 from parents where user_id = new.parent_id for update;   -- serialize concurrent inserts for one parent
  if (select count(*) from child_profiles where parent_id = new.parent_id and archived_at is null) >= 6 then
    raise exception 'child profile limit reached' using errcode = 'P0001', hint = 'child_cap';
  end if;
  return new;
end $$;
create trigger child_profiles_cap before insert on child_profiles for each row execute function child_profiles_cap();

create table consent_records (
  id bigserial primary key,
  parent_id integer not null references parents(user_id) on delete cascade,
  kind text not null check (kind in ('vpc_onscreen','confirmation','speech_cloud','revocation')),
  notice_version text not null,
  at timestamptz not null default now(),
  ip_hash text not null,
  user_agent_family text,
  auth_provider text not null default 'google',
  method_detail jsonb
);

-- Saves and progress ----------------------------------------------------------------------------------------------------
create table saves (
  child_id uuid primary key references child_profiles(id) on delete cascade,
  version integer not null default 0,
  schema smallint not null,
  content_version text not null,
  state jsonb not null,
  progress_key integer[] not null default '{}',
  pos_realm smallint,
  pos_graph text,
  pos_node text,
  pos_dungeon text,
  pos_level smallint,
  last_inn_graph text,
  last_inn_node text,
  bosses text[] not null default '{}',
  device_seq jsonb not null default '{}',
  flags text[] not null default '{}',
  updated_at timestamptz not null default now()
);
create table graph_progress (
  child_id uuid not null references child_profiles(id) on delete cascade,
  graph_id text not null,
  node_count smallint,
  visited bytea not null default '\x',
  cleared bytea not null default '\x',
  visited_n smallint not null default 0,
  cleared_n smallint not null default 0,
  last_node text,
  first_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (child_id, graph_id)
);
create table word_mastery (
  child_id uuid not null references child_profiles(id) on delete cascade,
  item_id text not null,
  seen boolean not null default false,
  recent_miss smallint not null default 0,
  ways jsonb not null default '{}',
  proficient boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, item_id)
);
create table save_backups (
  id bigserial primary key,
  child_id uuid not null references child_profiles(id) on delete cascade,
  version integer,
  content_version text,
  progress_key integer[],
  state jsonb not null,
  reason text not null check (reason in ('conflict_lost','pre_import','pre_restore','daily')),
  from_device text,
  saved_at timestamptz not null default now()
);

-- Audit and operations (no FKs on purpose: audit rows survive deletion as tombstones) ------------------------------------
create table audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_type text not null check (actor_type in ('parent','system','admin')),
  actor_hash text,
  child_hash text,
  action text not null,
  details jsonb not null default '{}'
);
create table rate_limits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (bucket, subject, window_start)
);
