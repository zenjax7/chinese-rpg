"""Builds src/data/{items,enemies,skills,shop,v3}.json from Desy's spec v3 data. Run: python3 tools/build_data.py
Sources: desy/data/combat_data.json (all v3 tables), desy/data/curriculum_location_pools.csv (location pools),
desy/core-curriculum.csv (item fields), desy/enemies.json (flavor text), art/sprites/manifest.json (sprite keys)."""
import csv, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESY = os.path.join(ROOT, '..', '..', 'desy')
CD = json.load(open(os.path.join(DESY, 'data', 'combat_data.json'), encoding='utf-8'))
out = lambda name, obj: json.dump(obj, open(os.path.join(ROOT, 'src', 'data', name), 'w'), ensure_ascii=False, indent=1)

# ---------------- items + pools ----------------
# Prototype locations -> Desy location pools (v3: 47-60 items per location)
LOC_POOL = {'meadow': 'L1.1', 'forest': 'L2.1'}
rows = {r['id']: r for r in csv.DictReader(open(os.path.join(DESY, 'core-curriculum.csv'), encoding='utf-8-sig'))}
pools_csv = list(csv.DictReader(open(os.path.join(DESY, 'data', 'curriculum_location_pools.csv'), encoding='utf-8-sig')))
ALT_ZH = {'哪儿': ['哪里'], '这儿': ['这里'], '那儿': ['那里'], '拜拜': ['白白'], '两': ['二'], '二': ['两']}
ALT_EN = {'你好': ['hi'], '谢谢': ['thanks'], '再见': ['bye', 'see you'], '对不起': ["i'm sorry"],
          '没关系': ["it's ok", 'that is okay', "it's alright"], '不客气': ['no problem', 'you are welcome'],
          '妈妈': ['mom', 'mum', 'mommy'], '爸爸': ['dad', 'daddy'], '好吃': ['yummy', 'delicious'], '饺子': ['dumpling']}
items, pools = [], {k: [] for k in LOC_POOL}
rev = {v: k for k, v in LOC_POOL.items()}
for p in pools_csv:
    if p['realm_no'] not in ('1', '2'): continue
    r = rows[p['id']]; zh = r['simplified']
    items.append(dict(id=r['id'], zh=zh, trad=r['traditional'], py=r['pinyin'], en=r['english'], enPrimary=r['english'].split(';')[0].strip(),
                      type=r['type'], pos=r['part_of_speech'], topic=r['topic'], loc=p['location_id'], speaking=r['speaking'] == 'Y',
                      reading=r['reading'] == 'Y', slice=p['slice'] == 'Y', altZh=ALT_ZH.get(zh, []), altEn=ALT_EN.get(zh, [])))
    if p['location_id'] in rev: pools[rev[p['location_id']]].append(r['id'])
out('items.json', dict(_note='Generated from desy/data/curriculum_location_pools.csv + desy/core-curriculum.csv (realms 1-2). pools: meadow = L1.1 Village Meadow, forest = L2.1 Flower Glade, in authored order. All realm 1-2 items are used for distractors.', pools=pools, items=items))

# ---------------- enemies ----------------
full = {e['id']: e for e in json.load(open(os.path.join(DESY, 'enemies.json'), encoding='utf-8'))}
stats = {e['id']: e for e in CD['enemies']}
MANI = os.environ.get('ART_SPRITES', '/workspace/art/sprites') + '/manifest.json'
MAN = json.load(open(MANI)) if os.path.exists(MANI) else {}
ALIAS = MAN.get('_aliases', {})
def sprite_for(pid, did):
    """Sprite key: the roster's prototype_id (batch-1 sheets) > a sheet keyed by the Desy id > manifest _aliases > the prototype id (emoji fallback)."""
    proto = (full.get(did) or {}).get('prototype_id') or ''
    for k in (proto, did, ALIAS.get(did, '')):
        if k and k in MAN and not k.startswith('_'): return k
    return pid
qspec = next(m for m in CD['special_mechanics'] if m['enemy_id'] == 'queen_bee')
MAP = {  # stable prototype id -> (Desy id, emoji placeholder, tint, mechanics coded from the roster's special/group text)
  'rabbit':      ('horned_rabbit', '🐇', 0xd9c7a7, {'partnerFallSkip': True}),
  'mushroom':    ('mushroom_imp', '🍄', 0xc0504d, {'dozeEveryNRounds': 3}),
  'wolfpup':     ('wolf_pup', '🐺', 0x8a8f99, {'partnerFallSkip': True}),
  'swiftrabbit': ('swift_horned_rabbit', '🐇', 0x6ec6ff, {'quickStart': True}),
  'crow':        ('big_beak_crow', '🐦', 0x333344, {'coinGrab': 3}),
  'greywolf':    ('big_grey_wolf', '🐺', 0x6d6f78, {'bigHuffEveryN': {'n': 3, 'extraBrokenDamage': 2}}),
  'rabbitking':  ('horned_rabbit_king', '👑', 0xf5c542, {'summonAtHalf': {'enemy': 'rabbit', 'maxOnScreen': 3}}),
  'bee':         ('giant_bee', '🐝', 0xf2b233, {'honeyDistract': True}),
  'sapling':     ('sapling_sprite', '🌱', 0x7cb342, {'rootOnBroken': True}),
  'spider':      ('forest_spider', '🕷️', 0x6b4f8a, {'webOnBroken': {'nextAttackMult': 0.5}}),
  'guardbee':    ('royal_guard_bee', '🐝', 0xffa000, {'waxShieldFirstHit': 1}),
  'bear':        ('greedy_bear', '🐻', 0x8d6e63, {'healOnceAtHalf': 8}),
  'queenbee':    ('queen_bee', '🐝', 0xff7a00, {'summonEveryNTurns': {'n': 3, 'enemy': 'workerbee', 'maxOnScreen': 3, 'maxSummons': 2}}),
}
MINION_ID = {'Horned Rabbit': 'rabbit', 'Giant Bee': 'bee', 'Wolf Pup': 'wolfpup'}
en = []
for pid, (did, emoji, color, mech) in MAP.items():
    d, f = stats[did], full[did]
    kind = 'normal' if d['role'] == 'normal' else 'elite' if d['role'] == 'elite' else ('realmboss' if d['boss_type'] == 'realm' else 'locboss')
    minions = [MINION_ID[k] for k in MINION_ID if d['minions'] and k in d['minions']]
    en.append(dict(id=pid, desyId=did, sprite=sprite_for(pid, did), spriteTint=None, zh=d['name_zh'], py=d['pinyin'], en=d['name_en'], emoji=emoji, color=color,
                   tier=d['realm'], level=d['level'], kind=kind, role=d['role'], hp=d['hp'], atk=d['atk'], def_=d['def'], exp=d['exp'], gold=d['gold'],
                   chestRate=d['chest_chance'], minions=minions, mech=mech, attackZh=f.get('attack_name_zh', ''), attackEn=f.get('attack_name_en', ''),
                   special=d['special'], group=f.get('group_behavior', '')))
bee = next(e for e in en if e['id'] == 'bee')
wb = dict(bee); wb.update(id='workerbee', desyId='worker_bee (queen summon)', sprite='worker_bee' if 'worker_bee' in MAN else 'bee', zh='工蜂', py='gōngfēng', en='Worker Bee',
                          hp=round(bee['hp'] / 2), exp=0, gold=0, chestRate=0, mech={}, special=qspec['rule'])
en.append(wb)
out('enemies.json', dict(_note='Generated from desy/data/combat_data.json enemies (stats, gold, EXP, chest chance) + desy/enemies.json (flavor). id = stable prototype id; desyId = roster id; sprite = key in art/sprites/manifest.json (after _aliases). workerbee = Queen Bee summon (v3: half normal HP, no drops, max 2 per fight). gold = base before the 0.8-1.2 roll.', enemies=en))

# ---------------- skills ----------------
SK = {s['skill_id']: s for s in CD['skills_mp']}
MPR = {r['key']: r['value'] for r in CD['mp_rules']}
skills = [
  dict(id='insight', zh=SK['insight']['name_zh'], en='Insight', emoji='💡', mp=SK['insight']['mp_cost'], perBattle=2, kind='question-hint', unlock={'start': True},
       desc='Removes 1 wrong choice from a tap question. Still works in battle, but does not count toward learning.'),
  dict(id='double', zh=SK['double_strike']['name_zh'], en='Double Strike', emoji='⚔️', mp=SK['double_strike']['mp_cost'], cooldownRounds=3, minStreak=3, secondHitFrac=0.5, kind='attack', unlock={'level': 5},
       desc='At streak 3+, a correct attack hits twice (2nd hit 50%).'),
  dict(id='shield', zh=SK['guardian_shield']['name_zh'], en='Guardian Shield', emoji='🔰', mp=SK['guardian_shield']['mp_cost'], perBattle=1, kind='passive', unlock={'boss': 'meadow'},
       desc='Auto: your first broken block in a battle becomes a good block.'),
  dict(id='heal', zh=SK['heal']['name_zh'], en='Heal', emoji='💚', mp=SK['heal']['mp_cost'], perBattle=int(MPR['heal_limit_per_battle']), healFrac=float(MPR['heal_fraction']), kind='heal', unlock={'level': 3},
       desc=f"Answer a question: correct heals {int(float(MPR['heal_fraction'])*100)}% max HP. MP is spent either way. Once per battle."),
]
out('skills.json', dict(_note='Generated from combat_data.json skills_mp + mp_rules (v3 costs). Heal is earned by a Honeycomb quest in the spec; the prototype has no quests, so it unlocks at level 3.', skills=skills))

# ---------------- shop: gear + consumables ----------------
NAMES = {(1, 'weapon'): ('wood_sword', '🗡️'), (1, 'armor'): ('cloth_tunic', '👕'), (1, 'shield'): ('potlid', '🛡️'),
         (2, 'weapon'): ('stinger', '🗡️'), (2, 'armor'): ('petal_cloak', '🧥'), (2, 'shield'): ('beeswax', '🛡️')}
gear = []
for g in CD['gear']:
    if g['tier'] > 2: continue
    gid, emo = NAMES[(g['tier'], g['slot'])]; st = 'atk' if g['stat'] == 'ATK' else 'def'
    base = dict(slot=g['slot'], tier=g['tier'], emoji=emo)
    gear.append(dict(base, id=gid, rarity='common', zh=g['example_name_zh'], en=g['example_name_en'], **{st: g['common']}, price=g['shop_price_common'], shop=True, **({'shopRequires': 'forest'} if g['tier'] == 2 else {})))
    gear.append(dict(base, id=gid + '_f', rarity='fine', zh='好' + g['example_name_zh'], en='Fine ' + g['example_name_en'], **{st: g['fine']}, price=0))
gear += [
  dict(id='red_knot', slot='charm', tier=1, rarity='common', zh='红绳结', en='Red Knot Charm', emoji='🧧', atk=1, price=45, shop=True),
  dict(id='jade_pendant', slot='charm', tier=2, rarity='common', zh='玉坠', en='Jade Pendant', emoji='📿', **{'def': 1}, mp=4, price=90, shop=True, shopRequires='forest'),
  dict(id='horn_dagger', slot='weapon', tier=1, rarity='heroic', zh='角兔角', en='Rabbit-Horn Dagger', emoji='🦴', atk=next(g['heroic'] for g in CD['gear'] if g['tier'] == 1 and g['slot'] == 'weapon'), startStreak=1, price=0, perk='+1 streak at battle start'),
  dict(id='queens_crown', slot='charm', tier=2, rarity='heroic', zh='蜂后之冠', en="Queen's Crown", emoji='👑', mp=int(MPR['queens_crown_bonus']), price=0, perk='+6 max MP'),
]
CONS = {c['item_id']: c for c in CD['consumables']}
cons = [
  dict(id='honey', zh=CONS['honey_potion']['name_zh'], en='Honey Potion', emoji='🍯', priceG=1, healHpFrac=0.40),
  dict(id='bighoney', zh=CONS['big_honey']['name_zh'], en='Big Honey', emoji='🏺', priceG=2, healHpFrac=0.70),
  dict(id='manatea', zh=CONS['mana_tea']['name_zh'], en='Mana Tea', emoji='🍵', priceG=1, healMpFrac=0.50),
  dict(id='feather', zh=CONS['return_feather']['name_zh'], en='Return Feather', emoji='🪶', priceG=1, warp=True, carryLimit=int(CONS['return_feather']['carry_limit'])),
]
out('shop.json', dict(_note='Generated from combat_data.json gear (tiers 1-2 common/fine/heroic, shop prices), gear_heroic_drops and consumables. Charms (red_knot, jade_pendant) are prototype placeholders; the spec has no charm price table. Consumable prices are multiples of the current area G.', gear=gear, consumables=cons))

# ---------------- v3 tables used at runtime ----------------
v3 = {k: CD[k] for k in ('companion', 'chest_contents', 'practice_modes', 'practice_rewards', 'proficiency_patrol_settings', 'safety_nets', 'drops', 'economy_prices')}
out('v3.json', dict(_note='Verbatim v3 tables from desy/data/combat_data.json (reference + some runtime values). Tuned runtime numbers live in balance.json.', **v3))
print({k: len(v) for k, v in pools.items()}, len(items), [(e['id'], e['hp'], e['sprite']) for e in en])
