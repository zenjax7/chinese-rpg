"""Single source of truth for the v3 combat/progression data tables.
Writes data/<table>.csv (UTF-8 BOM) + data/<table>.json, a bundle data/combat_data.json,
and markdown snippets build/v3/tables/<table>.md that are pasted into combat-spec.md by assemble_spec.py.
Numbers come from build/combat_sim.py (formulas), enemies.json (roster) and the v3 sim outputs."""
import csv, json, os, sys, re, collections, math
ROOT = '/workspace/desy'
sys.path.insert(0, ROOT + '/build')
import combat_sim as C
DATA = ROOT + '/data'; TAB = ROOT + '/build/v3/tables'
os.makedirs(DATA, exist_ok=True); os.makedirs(TAB, exist_ok=True)
def rhu(x): return int(math.floor(x + 0.5))
T = range(1, 10)
REALMS = {1: ('Starter Meadow', '新手草原'), 2: ('Honeycomb Forest', '蜂巢森林'), 3: ('Crossroads Market', '十字路口集市'),
          4: ('Goblin Caves', '哥布林洞穴'), 5: ('Hydra Swamp', '九头蛇沼泽'), 6: ('Zombie Lands', '僵尸之地'),
          7: ('Griffin Peaks', '狮鹫山峰'), 8: ('Ogre Colosseum', '食人魔角斗场'), 9: ("Demon King's Castle", '魔王城')}
REC_RANGE = {1: '1–3', 2: '3–5', 3: '5–7', 4: '7–10', 5: '10–13', 6: '13–16', 7: '16–19', 8: '19–22', 9: '22–25'}
MC = {1: 3, 2: 3, 3: 4, 4: 4, 5: 4, 6: 5, 7: 5, 8: 6, 9: 6}
TABLES = collections.OrderedDict()

def G(t): return C.gold_per_enemy(t)
def emit(name, cols, rows, md_cols=None, title=''):
    TABLES[name] = [dict(zip(cols, r)) for r in rows]
    with open(f'{DATA}/{name}.csv', 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f); w.writerow(cols); w.writerows(rows)
    json.dump(TABLES[name], open(f'{DATA}/{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md_cols = md_cols or cols
    idx = [cols.index(c) for c in md_cols]
    def fmt(v):
        if isinstance(v, float): v = f'{v:.2f}'.rstrip('0').rstrip('.') if abs(v) < 100 else f'{v:.0f}'
        return str(v).replace('|', '\\|')
    lines = ['| ' + ' | '.join(md_cols) + ' |', '|' + '---|' * len(md_cols)]
    lines += ['| ' + ' | '.join(fmt(r[i]) for i in idx) + ' |' for r in rows]
    open(f'{TAB}/{name}.md', 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

# ---------- inputs ----------
enemies = json.load(open(ROOT + '/enemies.json', encoding='utf-8'))
cur = {r['id']: r for r in csv.DictReader(open(ROOT + '/core-curriculum.csv', encoding='utf-8-sig'))}
pools = list(csv.DictReader(open(DATA + '/curriculum_location_pools.csv', encoding='utf-8-sig')))
def parse_md(path, marker=None):
    out, cols, on = [], None, marker is None
    for ln in open(path, encoding='utf-8'):
        if marker and ln.startswith('###'): on = marker in ln; cols = None; continue
        if not on or not ln.startswith('|'): continue
        cells = [c.strip() for c in ln.strip().strip('|').split('|')]
        if cols is None: cols = cells; continue
        if set(cells[0]) <= set('-'): continue
        out.append(dict(zip(cols, cells)))
    return out
SIM = ROOT + '/build/v3/sim'
realm_sim = parse_md(f'{SIM}/v3f_realms.txt')
def rs(t, sp, kid, acc, key):
    for r in realm_sim:
        if r['tier'] == str(t) and r['speech'] == sp and r['kid'] == kid and float(r['acc']) == acc: return float(r[key])

# ---------- hero_stats ----------
rows = []
for t in T:
    h = C.hero_stats(t); L = C.lrec(t)
    rows.append((t, REALMS[t][0], L, REC_RANGE[t], t, h['HP'], h['MP'], h['ATK'], h['DEF']))
emit('hero_stats', ['tier', 'realm', 'rec_level', 'rec_level_range', 'gear_tier', 'hero_hp', 'hero_mp', 'hero_atk', 'hero_def'], rows)

# ---------- enemy_stat_bands ----------
ROLE_KIND = [('normal', '', 'normal'), ('elite', '', 'elite'), ('boss', 'location', 'locboss'), ('boss', 'realm', 'realmboss')]
EXPM = {'normal': 6, 'elite': 10, 'locboss': 20, 'realmboss': 50}
FORM = {'normal': ('H(t) × base', '1.1 × DEF_ref'), 'elite': ('2 × H(t) × base', '1.2 × DEF_ref'),
        'locboss': ('5 × base × m(t) (v3.7, boss_hp table)', '0.8 × 1.2 × DEF_ref (v3.6)'), 'realmboss': ('7 × base × m(t) (v3.6, boss_hp table)', '0.8 × 1.3 × DEF_ref (v3.6)')}
import spells_data as SD0
MINIONS = {'normal': lambda t: 0, 'elite': lambda t: 0, 'locboss': lambda t: 1, 'realmboss': lambda t: 1 if t <= 3 else 2}
rows = []
for t in T:
    for role, bt, k in ROLE_KIND:
        e = dict(C.enemy(t, k))
        if k in ('locboss', 'realmboss'): e['HP'] = round(e['HP']*SD0.BOSS_HP_MULT[(t, k)]); e['ATK'] = round(e['ATK']*SD0.BOSS_ATK_MULT[k])   # v3.6
        rows.append((t, REALMS[t][0], role, bt, e['HP'], e['ATK'], e['DEF'], G(t) * C.GOLD_MULT[k], EXPM[k] * C.lrec(t),
                     C.CHEST_RATE[k], MINIONS[k](t), FORM[k][0], FORM[k][1]))
emit('enemy_stat_bands', ['tier', 'realm', 'role', 'boss_type', 'hp', 'atk', 'def', 'gold', 'exp', 'chest_chance', 'minions', 'hp_formula', 'atk_formula'], rows,
     ['tier', 'role', 'boss_type', 'hp', 'atk', 'def', 'gold', 'exp', 'chest_chance', 'minions'])

# ---------- enemies (copy of the roster, trimmed columns) ----------
ecols = ['id', 'name_en', 'name_zh', 'pinyin', 'realm', 'location_id', 'roster_locations', 'role', 'boss_type', 'minions', 'level',
         'hp', 'atk', 'def', 'gold', 'exp', 'chest_chance', 'sample_shout_zh', 'sample_shout_en', 'sample_shout_item_id', 'special', 'priority']
emit('enemies', ecols, [[e[c] for c in ecols] for e in enemies],
     ['id', 'name_zh', 'name_en', 'location_id', 'role', 'boss_type', 'hp', 'atk', 'def', 'gold', 'exp', 'chest_chance', 'sample_shout_zh'])

# ---------- realm_location_difficulty ----------
loc_items = collections.defaultdict(list)
for p in pools: loc_items[p['location_id']].append(p)
locmeta = {}
for e in enemies:
    for lid in e['roster_locations'].split(';'):
        locmeta.setdefault(lid, dict(normals=[], boss='', boss_type='', elite=''))
    if e['role'] == 'boss': locmeta[e['location_id']].update(boss=e['id'], boss_type=e['boss_type'])
    elif e['role'] == 'elite': locmeta[e['location_id']]['elite'] = e['id']
    else:
        for lid in e['roster_locations'].split(';'): locmeta[lid]['normals'].append(e['id'])
names = {e['location_id']: (e['location_name'], e['location_name_zh']) for e in enemies}
rows = []
for lid in sorted(loc_items, key=lambda x: (int(x[1:].split('.')[0]), int(x.split('.')[1]))):
    its = loc_items[lid]; t = int(its[0]['realm_no']); ln = int(its[0]['location_no'])
    topics = collections.Counter(cur[i['id']]['topic'] for i in its)
    top = '; '.join(k for k, _ in topics.most_common(3))
    new = sum(1 for i in its if i['origin'] == 'v2'); moved = sum(1 for i in its if i['origin'] == 'v1' and i['v1_realm'] != i['realm'])
    rslots = 0 if (t == 1 and ln == 1) else (C.REVIEW_SLOTS[t] if not (t == 9 and locmeta[lid]['boss_type'] == 'realm') else 4)
    m = locmeta[lid]; en = C.ENEM[t]
    rows.append((lid, t, REALMS[t][0], ln, names[lid][0], names[lid][1], t, len(its), len(its) - new - moved, new, moved, top,
                 rslots, f'{en[0]}–{en[1]}' if en[0] != en[1] else str(en[0]), MC[t], C.PATH_ENCOUNTERS if False else 8,
                 m['boss'], m['boss_type'], m['elite'], ';'.join(m['normals']),
                 round(rs(t, 'on', 'saver', 0.75, 'minutes per location')), round(rs(t, 'on', 'spender', 0.75, 'minutes per location')),
                 round(rs(t, 'off', 'saver', 0.75, 'minutes per location')), rs(t, 'on', 'saver', 0.75, 'patrols per location'),
                 rs(t, 'off', 'saver', 0.75, 'patrols per location')))
emit('realm_location_difficulty',
     ['location_id', 'realm_no', 'realm', 'location_no', 'location_name', 'location_name_zh', 'tier', 'pool_items', 'v1_items', 'new_items', 'moved_items',
      'top_topics', 'review_slots', 'enemies_per_fight', 'mc_options', 'path_fights', 'boss_id', 'boss_type', 'scripted_elite_id', 'normal_enemy_ids',
      'minutes_speech_saver_75', 'minutes_speech_spender_75', 'minutes_reading_saver_75', 'patrols_speech_saver_75', 'patrols_reading_saver_75'], rows,
     ['location_id', 'location_name', 'location_name_zh', 'pool_items', 'new_items', 'moved_items', 'top_topics', 'review_slots', 'enemies_per_fight', 'mc_options',
      'boss_id', 'boss_type', 'scripted_elite_id', 'minutes_speech_saver_75', 'minutes_speech_spender_75', 'minutes_reading_saver_75'])

# realm summary
rows = []
for t in T:
    h = C.hero_stats(t); n = C.enemy(t); e = C.enemy(t, 'elite'); lb = C.enemy(t, 'locboss'); rb = C.enemy(t, 'realmboss')
    locs = [r for r in TABLES['realm_location_difficulty'] if r['tier'] == t]
    rb_e = [x for x in enemies if x['realm'] == t and x['role'] == 'boss' and x['boss_type'] == 'realm'][0]
    rows.append((t, REALMS[t][0], REALMS[t][1], len(locs), sum(l['pool_items'] for l in locs), '/'.join(str(l['pool_items']) for l in locs),
                 locs[0]['enemies_per_fight'], MC[t], ('0 (loc 1), 1' if t == 1 else ('3 (boss: 4)' if t == 9 else str(C.REVIEW_SLOTS[t]))),
                 f"{n['HP']} / {n['ATK']} / {n['DEF']}", f"{e['HP']} / {e['ATK']} / {e['DEF']}", f"{lb['HP']} / {lb['ATK']}", f"{rb['HP']} / {rb['ATK']} ({rb_e['name_zh']})",
                 REC_RANGE[t], t, f"{h['HP']} / {h['MP']} / {h['ATK']} / {h['DEF']}", G(t), C.inn_price(t), C.potion_price(t),
                 round(rs(t, 'on', 'saver', 0.75, 'minutes per location')), round(rs(t, 'on', 'spender', 0.75, 'minutes per location')),
                 round(rs(t, 'off', 'saver', 0.75, 'minutes per location'))))
emit('realm_difficulty', ['tier', 'realm', 'realm_zh', 'locations', 'pool_items', 'items_per_location', 'enemies_per_fight', 'mc_options', 'review_slots',
                          'normal_hp_atk_def', 'elite_hp_atk_def', 'location_boss_hp_atk', 'realm_boss_hp_atk', 'rec_level_range', 'gear_tier',
                          'hero_hp_mp_atk_def', 'gold_per_normal', 'inn_price', 'honey_potion_price',
                          'minutes_speech_saver_75', 'minutes_speech_spender_75', 'minutes_reading_saver_75'], rows)

# ---------- economy_prices ----------
WPN = {1: 60, 2: 120, 3: 220, 4: 380, 5: 650, 6: 900, 7: 1150, 8: 1400, 9: 1700}
ARM = {1: 50, 2: 95, 3: 175, 4: 300, 5: 520, 6: 720, 7: 920, 8: 1120, 9: 1360}
SHD = {1: 35, 2: 70, 3: 130, 4: 230, 5: 390, 6: 540, 7: 690, 8: 840, 9: 1020}
rows = []
for t in T:
    g = G(t)
    rows.append((t, REALMS[t][0], g, C.inn_price(t), g, 2 * g if t >= 5 else '', 6 * g, 15 * g if t >= 5 else '', g, WPN[t], ARM[t], SHD[t], 2 * g, 5 * g, 10 * g,
                 max(0, 0) or 'max(10% of gold, 1 inn)', 2 * C.inn_price(t)))
emit('economy_prices', ['tier', 'realm', 'gold_per_normal', 'inn', 'honey_potion', 'big_honey', 'mana_tea', 'big_mana_tea', 'return_feather', 'weapon', 'armor', 'shield',
                        'elite_gold', 'location_boss_gold', 'realm_boss_gold', 'defeat_fee', 'defeat_gold_floor'], rows,
     ['tier', 'gold_per_normal', 'inn', 'honey_potion', 'big_honey', 'mana_tea', 'big_mana_tea', 'return_feather', 'weapon', 'armor', 'shield', 'elite_gold', 'location_boss_gold', 'realm_boss_gold', 'defeat_gold_floor'])

rows = [
    ('honey_potion', 'Honey Potion', '蜂蜜药水', '+40% max HP', 'yes (uses the turn, no question)', '1 × G', 'no limit (3 uses per battle)', 'shop; normal/elite chest; boss chest; 1 free at start; broke potion'),
    ('big_honey', 'Big Honey', '大蜂蜜', '+70% max HP', 'yes (uses the turn, no question)', '2 × G', 'no limit (shares the 3 per battle belt)', 'shop from tier 5; chests'),
    ('mana_tea', 'Mana Tea', '魔力茶', '+50% max MP', 'no: map only (v3.4)', '6 × G (v3.4; was 1 × G)', 'no limit', 'shop; normal/elite chest; words quest'),
    ('big_mana_tea', 'Big Mana Tea', '大魔力茶', 'refills MP to full', 'no: map only', '15 × G', 'no limit', 'shop from town 5; boss chests'),
    ('return_feather', 'Return Feather', '回城羽毛', 'Warp to the last inn you used (or the location entrance inn); map only, not in battle or the boss room', 'no', '1 × G', '3', 'shop; normal/elite chest (5%); 1 free in the tutorial'),
]
emit('consumables', ['item_id', 'name_en', 'name_zh', 'effect', 'battle_use', 'price', 'carry_limit', 'sources'], rows)

# ---------- skills_mp ----------
rows = [
    ('insight', 'Insight', '提示', 'Removes 1 distractor from the current MC question; a correct answer counts in combat but not for proficiency', 4, 3, '2 per battle', 'start'),
    ('double_strike', 'Double Strike', '连击', 'At streak ≥ 3, a correct attack hits twice (2nd hit 50%)', 6, 4, 'every 3 rounds', 'L5'),
    ('guardian_shield', 'Guardian Shield', '守护盾', 'First wrong block in a battle becomes a correct block (leak still applies); auto-fires if equipped and MP ≥ cost', 8, 5, '1 per battle (rank 2: 2)', 'Starter Meadow realm boss'),
    ('frost_word', 'Frost Word', '冰冻', 'A correct attack also freezes the target (skips its next attack)', 8, 5, 'every 3 rounds', 'Griffin Peaks realm boss'),
    ('heal', 'Heal', '治疗', 'Replaces the attack: answer one question; correct heals 30% max HP, wrong fizzles; MP spent either way', 12, 6, '1 per battle', 'Honeycomb quest'),
    ('sweep', 'Sweep', '横扫', 'A correct attack hits all enemies at 60%', 12, 8, 'every 4 rounds', 'Zombie Lands realm boss'),
    ('second_wind', 'Second Wind', '再起', 'At 0 HP, revive at 30% HP (auto)', 20, 12, '1 per battle', 'Castle quest'),
    ('passives', 'Thorns / Echo Voice / Rally', '反击 / 回音 / 鼓舞', 'Passives, as in v1', 0, 0, '–', 'as in v1'),
]
emit('skills_mp', ['skill_id', 'name_en', 'name_zh', 'effect', 'mp_cost', 'mp_cost_v2', 'limit', 'earned'], rows,
     ['name_en', 'name_zh', 'effect', 'mp_cost', 'mp_cost_v2', 'limit', 'earned'])
rows = [('max_mp', '10 + 2 × level', 'MP', '14 at L2, 34 at L12, 58 at L24'),
        ('regen_per_correct', 0, 'MP', 'v3.6 (Jack): removed. Was +1 per graded correct answer in battle (v3.0-v3.5)'),
        ('regen_per_wrong', 0, 'MP', ''),
        ('restore_sources', 'inn, waking after a defeat, Mana Tea / Big Mana Tea (map only)', '', 'MP carries over between battles; no regen (v3.6)'),
        ('heal_fraction', 0.30, 'of max HP', 'was 0.35'),
        ('heal_limit_per_battle', 1, 'casts', 'was 2'),
        ('griffin_feather_frost_cost', 5, 'MP', 'heroic charm: Frost costs 5 instead of 8'),
        ('queens_crown_bonus', 6, 'max MP', 'heroic charm')]
emit('mp_rules', ['key', 'value', 'unit', 'notes'], rows)

# ---------- gear ----------
GEAR_NAMES = {1: ('木剑 Wooden Sword', '布衣 Cloth Tunic', '锅盖盾 Pot-lid Shield', '角兔角 Rabbit-Horn Dagger (+1 streak at battle start)'),
              2: ('蜂刺短剑 Stinger Dagger', '花瓣斗篷 Petal Cloak', '蜂蜡盾 Beeswax Shield', "蜂后之冠 Queen's Crown (charm: +6 max MP)"),
              3: ('铁剑 Iron Sword', '皮甲 Leather Armor', '圆盾 Round Shield', '宝箱盾 Mimic Shield (Thorns 25%)'),
              4: ('弯刀 Scimitar', "矿工护甲 Miner's Plate", '石盾 Stone Shield', '哥布林王冠 Goblin Crown (+10% gold)'),
              5: ('蛇牙矛 Hydra-fang Spear', '鳞甲 Scale Mail', '沼泽盾 Bog Shield', '九头蛇鳞 Hydra Scale (first broken block per battle −50%)'),
              6: ('圣光锤 Holy Mace', "医者长袍 Healer's Robe", '银盾 Silver Shield', '解药瓶 Cure Flask (Heal +10%)'),
              7: ('狮鹫羽弓 Griffin Bow', '风之甲 Wind Mail', '云盾 Cloud Shield', '狮鹫羽 Griffin Feather (Frost costs 5 MP instead of 8)'),
              8: ('冠军大剑 Champion Blade', '角斗士铠甲 Gladiator Plate', '塔盾 Tower Shield', '冠军腰带 Champion Belt (streak 10 tier = ×2.25)'),
              9: ("勇者之剑 Hero's Sword", '龙鳞甲 Dragon-scale Mail', '精灵盾 Elven Shield', '(the Demon King drops cosmetics and a title; the game is won)')}
rows = []
for t in T:
    for slot, base, price, nm in (('weapon', 3 * t + 2, WPN[t], GEAR_NAMES[t][0]), ('armor', 2 * t + 1, ARM[t], GEAR_NAMES[t][1]), ('shield', t, SHD[t], GEAR_NAMES[t][2])):
        rows.append((t, slot, 'ATK' if slot == 'weapon' else 'DEF', base, rhu(1.15 * base), max(base + 1, rhu(1.3 * base)), price, nm.split(' ', 1)[0], nm.split(' ', 1)[1]))
emit('gear', ['tier', 'slot', 'stat', 'common', 'fine', 'heroic', 'shop_price_common', 'example_name_zh', 'example_name_en'], rows)
emit('gear_heroic_drops', ['tier', 'realm_boss', 'heroic_drop'],
     [(t, [x['name_zh'] + ' ' + x['name_en'] for x in enemies if x['realm'] == t and x['boss_type'] == 'realm'][0], GEAR_NAMES[t][3]) for t in T])

# ---------- drops_chests ----------
rows = [('normal', '', '6 × L_rec', 1, 0.10, 'normal chest', ''),
        ('elite', '', '10 × L_rec', 2, 0.25, 'normal chest', ''),
        ('boss', 'location', '20 × L_rec', 5, 1.0, 'location boss chest', 'fine gear piece'),
        ('boss', 'realm', '50 × L_rec', 10, 1.0, 'realm boss chest', 'heroic gear piece + skill unlock')]
emit('drops', ['role', 'boss_type', 'exp', 'gold_mult', 'chest_chance', 'chest_type', 'guaranteed'], rows)
rows = [('normal chest', 'gold', 0.40, '3 × G gold'), ('normal chest', 'potion', 0.35, '1 Honey Potion'),
        ('normal chest', 'return_feather', 0.05, '1 Return Feather (or 3 × G gold if carrying 3)'),
        ('normal chest', 'mana_tea', 0.10, '1 Mana Tea'), ('normal chest', 'fine_gear', 0.10, '1 fine gear piece of the location tier'),
        ('location boss chest', 'bundle', 1.0, '3 × G gold + 1 Honey Potion + guaranteed fine gear piece'),
        ('realm boss chest', 'bundle', 1.0, '3 × G gold + 1 Honey Potion + guaranteed heroic piece + skill unlock')]
emit('chest_contents', ['chest_type', 'outcome', 'probability', 'contents'], rows)

# ---------- proficiency_patrol_settings ----------
rows = [
    ('proficiency_correct_per_way', 2, 'correct answers', 'in total, not in a row; no rusty rule'),
    ('active_ways_speech', 4, 'ways', 'R-ZE, R-EZ, S-ZE, S-EZ (default: speech is on after the consent gate)'),
    ('active_ways_no_speech', 2, 'ways', 'R-ZE, R-EZ; only for browsers without the Web Speech API or after a device/permission error'),
    ('keep_proficient_when_speech_added', 'yes', '', 'items proficient under 2 ways stay proficient; spoken ways still get scheduled'),
    ('nomatch_counts_as', 'wrong', '', 'heard speech but no words = graded wrong'),
    ('practice_credit_cap_per_way', 1, 'correct answers', 'Preview practice can supply at most 1 of the 2 correct answers per way'),
    ('boss_trigger_speech', 0.20, 'share of the location pool proficient', 'patrols spawn while below; Director’s call v3.1 (was 0.25)'),
    ('boss_trigger_no_speech', 0.40, 'share of the location pool proficient', ''),
    ('readiness_denominator', 'location pool only', '', 'carried-over items are still practiced but not counted (was local + carry-over)'),
    ('forced_patrols_per_trip', 2, 'fights', 'each walk to the boss gate while below the trigger'),
    ('elite_patrol_chance', 0.10, 'per patrol', 'one normal enemy is replaced by the location elite'),
    ('scripted_elites_per_realm', 1, 'fights', 'middle path fight of the elite’s home location'),
    ('path_fights', 8, 'fights', 'scripted fights per location before the boss approach (was 6)'),
    ('set_size', 7, 'items', ''), ('working_set', 10, 'items', ''), ('new_cap', 3, 'items per battle', 'hard cap, also early in a location (v3.2, was 4); a short set is never padded with unseen items'),
    ('tired_at_questions_normal', 30, 'questions', 'normal battles, elites included'),
    ('tired_at_questions_boss', 45, 'questions', 'location and realm bosses (v3.2: location boss was 40)'),
    ('tired_enemy_atk_mult', 0.7, '×', 'enemy ATK while Tired'), ('tired_hero_damage_mult', 1.5, '×', 'hero damage while Tired'),
    ('carry_over_cap', 20, 'items', 'not-yet-proficient earlier items mixed into battle sets'),
    ('spoken_cap', 0.50, 'share of questions per battle', ''),
    ('proficient_review_weight', 0.15, 'selection weight', '+1.5 × min(overdue, 2) when a way is due'),
    ('leitner_intervals', '0, 10 min, 1 d, 3 d, 7 d, 16 d, 35 d', '', 'wrong = −2 boxes; scheduling only'),
    ('sec_per_battle_question', 9.2, 's', 'sim estimate'), ('sec_per_practice_question', 5.0, 's', 'sim estimate'),
]
emit('proficiency_patrol_settings', ['key', 'value', 'unit', 'notes'], rows)

# ---------- companion ----------
rows = [('gauge_full', 100, 'points', ''), ('gain_per_wrong', 20, 'points', 'any graded wrong answer (attack or block)'),
        ('gain_per_correct', 5, 'points', ''), ('gain_per_void_or_hint', 0, 'points', ''),
        ('reset', 'each battle', '', 'gauge starts at 0 in every battle'),
        ('trigger', 'start of the hero turn when full', '', 'free action, no question, before the hero acts'),
        ('damage', 'max(1, round(1.25 × ATK_h − 0.5 × DEF_e))', 'HP', 'no streak or spoken bonus'),
        ('target', 'lowest-HP normal or elite enemy; the boss if alone', '', ''),
        ('counts_for_proficiency', 'no', '', 'no question is asked'),
        ('kills_pay', 'yes', '', 'normal EXP/gold/chest roll'),
        ('attacks_per_battle_50pct', '1.6–2.3', '', 'sim, speech on, t2–t9'), ('attacks_per_battle_90pct', '0.6–0.8', '', 'sim, t5–t9')]
emit('companion', ['key', 'value', 'unit', 'notes'], rows)

rows = [(1, 'pity_inn', 'If gold < inn price, the inn stay is free'),
        (2, 'gold_loss_floor', 'A defeat never takes gold below 2 × inn price'),
        (3, 'defeat_fee', 'max(10% of gold, 1 inn price), only from gold above the floor'),
        (4, 'starter_and_broke_potion', '1 Honey Potion at the start; after a defeat or pity stay with 0 potions and gold < inn, get 1 free'),
        (5, 'courage', '+20% DEF per consecutive defeat (max +60%), cleared by a win'),
        (6, 'minimum_payout', 'Enemy gold never below 80% of base; every defeated enemy pays'),
        (7, 'boss_checkpoint', 'After the boss drops below 50% HP, retries start there (save only, no heal)'),
        (8, 'companion_team_attack', 'Friendship gauge fills faster on wrong answers (see companion table)')]
emit('safety_nets', ['id', 'net', 'rule'], rows)

# ---------- special mechanics ----------
sp = parse_md(f'{SIM}/v3_specials.txt')
def spw(mech, acc, on):
    for r in sp:
        if r['mechanic'] == mech and float(r['acc']) == acc and r['special'] == on: return float(r['win rate'])
rows = []
for eid, mech, rule, simname, verdict in [
    ('queen_bee', 'Summon Worker', 'Every 3rd round, if fewer than 3 enemies: summon 1 worker bee at half normal HP, no drops; max 2 per fight', 'queen_bee_v3', 'adopt (the unlimited v2 version was unwinnable at ≤65%)'),
    ('hydra', 'Double Bite', 'Every 3rd round the Hydra attacks twice (2 block questions)', 'hydra', 'keep'),
    ('shadow_dragon', 'Curse Chain', '+3 ATK while its imp minion is alive', 'shadow_dragon_focus', 'keep as a teaching cue ("break the chain first")'),
    ('arena_troll', 'Regrow', 'Cosmetic only (decided): a green regrowth sparkle at the end of a round in which it was not hit; no HP change. Simulated rule was +4 HP', 'troll_tag', 'cosmetic (decided): green sparkle only, no HP effect in game'),
]:
    e = [x for x in enemies if x['id'] == eid][0]
    rows.append((eid, e['name_zh'], e['name_en'], e['realm'], e['role'], e['boss_type'], mech, rule, simname,
                 spw(simname, 0.5, 'off'), spw(simname, 0.5, 'on'), spw(simname, 0.65, 'off'), spw(simname, 0.65, 'on'), spw(simname, 0.75, 'off'), spw(simname, 0.75, 'on'), verdict))
emit('special_mechanics', ['enemy_id', 'name_zh', 'name_en', 'tier', 'role', 'boss_type', 'mechanic', 'rule', 'sim_variant',
                           'win_50_off', 'win_50_on', 'win_65_off', 'win_65_on', 'win_75_off', 'win_75_on', 'verdict'], rows,
     ['name_zh', 'name_en', 'tier', 'mechanic', 'rule', 'win_50_off', 'win_50_on', 'win_65_off', 'win_65_on', 'win_75_off', 'win_75_on', 'verdict'])

# ---------- practice / preview ----------
rows = [('flashcards', 'Flashcards', 'Flip card: characters + audio ↔ English (no pinyin). Kid self-marks "knew it"/"not yet"', '–', 'no', 'first clear of all cards'),
        ('listen_pick', 'Listen and pick', 'Audio plays; tap the English (R-ZE) or the Chinese for an English prompt (R-EZ)', 'R-ZE, R-EZ', 'yes, ≤1 per way', 'first clear'),
        ('say_it', 'Say it', 'See English (+ picture), say the Chinese (S-EZ); or hear Chinese, say the English (S-ZE)', 'S-EZ, S-ZE', 'yes, ≤1 per way', 'first clear'),
        ('matching', 'Matching game', 'Match 6 Chinese cards to 6 English cards (timer-free)', 'R-ZE', 'yes, ≤1 per way (first match only)', 'first clear'),
        ('quick_quiz', 'Quick quiz', '10 mixed questions picked by the engine (weakest way first), same grading as battle', 'all active ways', 'yes, ≤1 per way', 'first clear')]
emit('practice_modes', ['mode_id', 'name', 'how_it_works', 'ways', 'counts_for_proficiency', 'sticker'], rows)
rows = [('gold_per_question', 0, 'gold', ''), ('exp_per_question', 0, 'EXP', ''),
        ('preview_complete_reward', '1 Honey Potion + 1 × G gold', 'once per location', 'every pool item answered at least once in a graded mode (not flashcards)'),
        ('mode_first_clear', '1 sticker', 'once per mode per location', 'cosmetic sticker book only'),
        ('realm_overview_complete', '1 cosmetic (hat/badge)', 'once per realm', ''),
        ('practice_credit_cap_per_way', 1, 'correct answer', 'battle must supply the 2nd'),
        ('marks_item_seen', 'no', '', 'battle NEW_CAP and working set still decide introduction order'),
        ('leitner_effect', 'none', '', 'practice answers do not move Leitner boxes')]
emit('practice_rewards', ['key', 'value', 'unit', 'notes'], rows)

# ---------- v3.4 spells + quests (source: spells_data.py) ----------
import spells_data as SD
DMG = 'max(1, round({p} × (Tired ? 1.5 : 1) − DEF_e))'
TGT = {'single': 'single', 'same_type': 'same type (max 3)', 'all': 'all on screen (max 3)'}
rows = [[s['id'], s['town'], SD.TOWNS[s['town']][1], SD.TOWNS[s['town']][0], s['realm'], s['zh'], s['zh_trad'], s['en'], TGT[s['target']], s['element'],
         s['power'], s['mp'], s['mp_v34'], f"{s['mp']/SD.tier_stats(s['town'])['MP']:.0%}", round(SD.tier_stats(s['town'])['MP']/s['mp'], 1), f"{SD.spell_dmg(s, s['town'])/SD.tier_stats(s['town'])['HP']:.0%}",
         f"{SD.spell_dmg(s, 9)/SD.tier_stats(9)['HP']:.0%}", s['price_G'], s['price'], DMG.format(p=s['power']), s['status'] or '–',
         SD.char_notes(s['zh']), s['visual']] for s in SD.SPELLS]
emit('spells', ['spell_id', 'town', 'town_zh', 'town_en', 'realm', 'name_zh', 'name_zh_trad', 'name_en', 'target', 'element', 'power', 'mp_cost', 'mp_cost_v34', 'mp_pct_of_bar',
                'casts_from_full_mp', 'dmg_pct_normal_own_tier', 'dmg_pct_normal_t9', 'price_G', 'price', 'damage_formula', 'status', 'hsk_chars', 'visual_brief'], rows,
     md_cols=['town', 'name_zh', 'name_zh_trad', 'name_en', 'target', 'element', 'power', 'mp_cost', 'mp_cost_v34', 'mp_pct_of_bar', 'casts_from_full_mp', 'dmg_pct_normal_own_tier', 'dmg_pct_normal_t9', 'price_G', 'price', 'status'])
# falloff: damage as % of a typical normal enemy's HP at each tier (own tier and later), plus the hero's plain attack for reference
ts = {t: SD.tier_stats(t) for t in range(1, 10)}
rows = [['plain attack (rec. gear, no streak)', '–', '–', '–'] + [f"{(ts[t]['ATK'] - 0.5*ts[t]['DEF'])/ts[t]['HP']:.0%}" for t in range(2, 10)]]
rows += [['normal enemy HP / DEF', '–', '–', '–'] + [f"{ts[t]['HP']} / {ts[t]['DEF']}" for t in range(2, 10)]]
for s_ in SD.SPELLS:
    rows.append([f"{s_['zh']} {s_['en']}", s_['town'], s_['power'], TGT[s_['target']]] +
                [(f"{SD.spell_dmg(s_, t)/ts[t]['HP']:.0%}" if t >= s_['town'] else '') for t in range(2, 10)])
emit('spell_falloff', ['spell', 'town', 'power', 'target'] + [f't{t}' for t in range(2, 10)], rows)
rows = []
for t in range(1, 10):
    sold = [x for x in SD.SPELLS if x['town'] == t]; mx = max([x['mp'] for x in sold], default=0)
    best = max([x for x in SD.SPELLS if x['town'] <= t], key=lambda x: x['mp'], default=None)
    rows.append([t, ts[t]['L'], ts[t]['MP'], ', '.join(f"{x['zh']} {x['mp']}" for x in sold) or '–',
                 f"{ts[t]['MP']/mx:.1f}" if mx else '–', f"{(ts[t]['MP'] - 12)/mx:.1f}" if mx and t >= 2 else '–',
                 f"{(ts[t]['MP'] + 6)/mx:.1f}" if mx else '–', f"{SD.spell_dmg(best, t)/ts[t]['realmboss_HP']:.0%}" if best else '–'])
emit('spell_mp_check', ['tier', 'rec_level', 'mp_pool', 'spells_sold_mp', 'casts_from_full', 'casts_keeping_heal_12', 'casts_at_level_plus_3', 'top_spell_pct_of_realm_boss_hp'], rows)
rows = [[m['id'], m['zh'], m['en'], m['effect'], f"{m['price_G']} × G", m['price_G'], m['from_town'], m['battle_use']] for m in SD.MP_ITEMS]
emit('mp_potions', ['item_id', 'name_zh', 'name_en', 'effect', 'price', 'price_in_normal_kills', 'from_town', 'battle_use'], rows)
rows = [['casts_per_battle', 'no cap (v3.5; v3.4 had 1 per normal/elite battle, 2 per boss)'], ['unlock', 'none: castable from turn 1 (v3.5; v3.4 needed 3 correct answers)'],
        ['back_to_back', 'allowed'], ['limit', 'MP only: cost 41-60% of the bar at the recommended level (about 2 casts from full); MP cost = 1.25 x v3.4'],
        ['mp_regen_per_correct', '0 (removed in v3.6; MP only from the inn or map-only MP potions)'], ['magic_ward', 'removed (v3.5)'], ['spell_power', 'fixed per spell; no magic stat (v3.5)'],
        ['super_blizzard_freeze', 'non-boss targets skip their next attack (1 turn); bosses immune (v3.5)'],
        ['spell_streak_bonus', 'none (a cast neither adds to nor breaks the streak)'], ['spell_spoken_bonus', 'none (no answer is given)'],
        ['mp_potions_in_battle', 'no (map only)'], ['cast_animation', f'about 2-3 s, a tap skips it (sim: {SD.CAST_ANIM_SEC:g} s per cast)'],
        ['mp_hints', 'none (v3.6: no MP tips, no casts-ready count, no Preview boss tip)'],
        ['boss_target', 'a kid who enters a boss fight with full MP and spends it all on spells still needs about 15 correct answers for a location boss and about 20 for a realm boss (v3.7 boss HP; v3.6 was 20 for both)']]
emit('cast_rule', ['key', 'value'], rows)
# v3.7 boss HP (location ~15, realm ~20 correct answers) and the correct-answers check (build/v3/explore/boss_harness.py: one boss fight from full HP/MP, rec. level, full gear, 2 best spells of towns t and t-1, all MP spent on spells; 600 fights)
BC = {a: json.load(open(f'{ROOT}/build/v3/sim/v37_boss_check_{a}.json')) for a in ('0.75', '0.5', '0.9')}
V36 = {(1, 'locboss'): 2.00, (2, 'locboss'): 2.30, (3, 'locboss'): 2.65, (4, 'locboss'): 2.50, (5, 'locboss'): 2.65, (6, 'locboss'): 2.55, (7, 'locboss'): 2.50, (8, 'locboss'): 2.60, (9, 'locboss'): 2.70}
V36.update({k: v for k, v in SD.BOSS_HP_MULT.items() if k[1] == 'realmboss'})   # v3.6 realm multipliers are unchanged
rows = []
for t in range(1, 10):
    for k in ('locboss', 'realmboss'):
        e = C.enemy(t, k); m = SD.BOSS_HP_MULT[(t, k)]; key = f'{t},{k}'
        c = lambda a, lab, f='correct': BC[a][key][lab][f]
        m36 = V36[(t, k)]
        rows.append([t, 'location' if k == 'locboss' else 'realm', e['HP'], m, round(e['HP']*m), e['ATK'], round(e['ATK']*SD.BOSS_ATK_MULT[k]), 15 if k == 'locboss' else 20, m36, round(e['HP']*m36),
                     f"{c('0.75', 'none'):.1f}", f"{c('0.75', 'spells'):.1f}", f"{c('0.75', 'spells', 'casts'):.1f}", f"{c('0.75', 'none', 'q'):.1f} / {c('0.75', 'spells', 'q'):.1f}",
                     f"{c('0.5', 'spells'):.1f}", f"{c('0.9', 'spells'):.1f}", f"{c('0.5', 'none', 'win'):.2f} / {c('0.5', 'spells', 'win'):.2f}"])
emit('boss_hp', ['tier', 'boss_type', 'hp_v35', 'hp_mult', 'hp', 'atk_v35', 'atk', 'target_correct', 'hp_mult_v36', 'hp_v36', 'correct_needed_no_spells_75', 'correct_needed_full_mp_spells_75', 'casts_75',
                 'questions_no_spells_vs_spells_75', 'correct_needed_full_mp_spells_50', 'correct_needed_full_mp_spells_90', 'single_fight_win_50_no_spells_vs_spells'], rows)
rows = [[q['id'], q['town'], SD.TOWNS[q['town']][1], q['type'], q['title_zh'], q['title_en'], q['target'], q['n'], q['reward_G'], q['reward_gold'],
         q['reward_item'] or '–', q['how']] for q in SD.QUESTS]
emit('quests', ['quest_id', 'town', 'town_zh', 'type', 'title_zh', 'title_en', 'target', 'n', 'reward_G', 'reward_gold', 'reward_item', 'how'], rows,
     md_cols=['town', 'town_zh', 'type', 'title_zh', 'title_en', 'n', 'reward_G', 'reward_gold', 'reward_item'])
SD.write_json()
json.dump(TABLES, open(f'{DATA}/combat_data.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('tables:', ', '.join(f'{k}({len(v)})' for k, v in TABLES.items()))

# ---------- sim result tables (parsed from build/v3/sim/*.txt) ----------
def snake(s): return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')
os.makedirs(DATA + '/sim', exist_ok=True)
for _f in os.listdir(DATA + '/sim'):
    if _f.startswith('sim_spells'): os.remove(f'{DATA}/sim/{_f}')
for fn, name in [('v3f_realms', 'sim_realms'), ('v3f_learn', 'sim_patrols_minutes'), ('v3f_econ', 'sim_economy'), ('v3f_mp', 'sim_mp'),
                 ('v3_companion', 'sim_companion'), ('v3f_comp2', 'sim_companion_variants'), ('v3f_spokencap', 'sim_spoken_cap'),
                 ('v3_tune2', 'sim_trigger_tuning'), ('v3_specials', 'sim_specials'), ('v3f_elites', 'sim_elites'), ('v3_spells', 'sim_spells')]:
    text = open(f'{SIM}/{fn}.txt', encoding='utf-8').read()
    for k, block in enumerate(re.split(r'\n(?=### )', text.strip())):
        rows = parse_md_text = [l for l in block.splitlines() if l.startswith('|')]
        if not rows: continue
        cols = [snake(c) for c in rows[0].strip('|').split('|')]
        body = [[c.strip() for c in l.strip().strip('|').split('|')] for l in rows[2:]]
        out = name if k == 0 else f'{name}_{k+1}'
        if name == 'sim_spells':      # v3.4: name each spells table after its section header
            hdr = block.splitlines()[0].lstrip('# ').split('(')[0]
            out = 'sim_spells_' + snake(re.sub(r'^[A-Z]\. ', '', hdr))[:40].strip('_')
        with open(f'{DATA}/sim/{out}.csv', 'w', encoding='utf-8-sig', newline='') as f:
            w = csv.writer(f); w.writerow(cols); w.writerows(body)
print('sim csv:', sorted(os.listdir(DATA + '/sim')))
