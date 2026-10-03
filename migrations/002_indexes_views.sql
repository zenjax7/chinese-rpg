-- 002: architecture.md §7.4 indexes and the §7.2 read-only views.
create unique index users_email_lower_uq on users (lower(email));
create unique index accounts_provider_uq on accounts (provider, "providerAccountId");
create index accounts_user_idx on accounts ("userId");
create unique index sessions_token_uq on sessions ("sessionToken");
create index sessions_user_idx on sessions ("userId");
create index child_profiles_parent_idx on child_profiles (parent_id);
create unique index child_profiles_linked_email_uq on child_profiles (linked_email) where linked_email is not null;
create index saves_pos_graph_idx on saves (pos_graph);
create index saves_content_version_idx on saves (content_version);
create index word_mastery_proficient_idx on word_mastery (child_id) where proficient;
create index save_backups_child_idx on save_backups (child_id, saved_at desc);
create index consent_records_parent_idx on consent_records (parent_id, at desc);
create index audit_log_at_idx on audit_log (at);

-- Quests in the snapshot: classic board quests (state.quests) and graph-mode story quests (state.storyQuests).
create view v_quests as
  select s.child_id, q.key as quest_id, q.value->>'s' as s, coalesce((q.value->>'n')::int, (q.value->>'step')::int) as n,
         to_timestamp(nullif(q.value->>'at','')::double precision / 1000) as accepted_at,
         to_timestamp(nullif(q.value->>'done','')::double precision / 1000) as done_at
  from saves s, jsonb_each(coalesce(s.state->'quests','{}'::jsonb) || coalesce(s.state->'storyQuests','{}'::jsonb)) q;

create view v_inventory as
  select s.child_id, 'consumable'::text as kind, i.key as item_id, (i.value)::text::int as qty, null::text as equipped_slot
    from saves s, jsonb_each(coalesce(s.state->'inv','{}'::jsonb)) i
  union all
  select s.child_id, 'gear', g.value, 1,
         (select e.key from jsonb_each_text(coalesce(s.state->'equip','{}'::jsonb)) e where e.value = g.value limit 1)
    from saves s, jsonb_array_elements_text(coalesce(s.state->'gear','[]'::jsonb)) g
  union all
  select s.child_id, 'spell', sp.value, 1, null
    from saves s, jsonb_array_elements_text(coalesce(s.state->'spells','[]'::jsonb)) sp;
