-- 003: level (map) content tables (level-editor.md §3). Content only: no child or parent columns. "level" = map.
create table editors (
  user_id text primary key,                    -- users.id as text
  google_sub text unique,
  email text,
  role text not null check (role in ('owner','tester','drafter')),
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);
create table levels (
  id text primary key check (id ~ '^[a-z0-9_]+$'),
  kind text not null,
  state text not null check (state in ('draft','beta','golden')),
  draft jsonb not null,
  draft_rev int not null default 1,
  draft_validation jsonb,
  published jsonb,
  published_version int not null default 0,
  published_hash text,
  updated_by text references editors (user_id),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create table level_revisions (
  id bigserial primary key,
  level_id text not null references levels (id),
  version int not null,
  kind text not null check (kind in ('publish','checkpoint','golden-unlock')),
  body jsonb not null,
  content_hash text not null,
  created_by text,
  created_at timestamptz not null default now(),
  note text
);
create index level_revisions_level_idx on level_revisions (level_id, created_at desc);
create table content_releases (
  id serial primary key,
  created_at timestamptz not null default now(),
  created_by text,
  note text,
  index jsonb not null,
  compiled jsonb
);
create table release_levels (
  release_id int not null references content_releases (id),
  level_id text not null references levels (id),
  version int not null,
  primary key (release_id, level_id)
);
create table learn_items (
  id text primary key check (id ~ '^C[0-9]+$'),
  zh text not null,
  zh_trad text,
  pinyin text,
  en text not null,
  audio_state text not null default 'pending' check (audio_state in ('pending','ready')),
  created_at timestamptz not null default now()
);
create table editor_tokens (
  id uuid primary key,
  editor_id text not null references editors (user_id),
  token_hash text not null unique,
  scope text not null check (scope = 'levels:draft-write levels:read'),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
-- §3: audit_log gains the editor actor type
alter table audit_log drop constraint audit_log_actor_type_check;
alter table audit_log add constraint audit_log_actor_type_check check (actor_type in ('parent','system','admin','editor'));
