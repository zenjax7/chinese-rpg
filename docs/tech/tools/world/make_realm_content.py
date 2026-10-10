"""v3.9.2 game content for realms 3-9: docs/data/world/content/realm_{3..9}.json (one file per realm).
Restored in v3.9.4 from the live data and Desy's v3.9.2 build (the original lived in /workspace/desy/build/world/ and was lost).
Same row shapes as GameDev's tools/build_data.py output for realms 1-2:
  enemies[]   = src/data/enemies.json rows   (stats: combat_data.json enemies; boss HP/ATK: enemies/boss_hp.csv; flavor: json/enemies-art-roster.json)
  locations[] = src/data/locations.json rows (one per world-graph zone of the realm; id = zone id in zones.json)
  pools{}     = src/data/items.json pools    (zone id -> curriculum ids, from curriculum/curriculum_location_pools.csv, authored order)
  items[]     = src/data/items.json rows     (every item of the realm's pools)
Enemy id = Desy roster id (graphs, zones.json and quests.json all use Desy ids), so desyId == id for realms 3-9.
Run: python3 docs/tech/tools/world/make_realm_content.py   (world_gen.py runs it at the end; reads <OUT>/zones.json)."""
import csv, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _paths import D, OUT as WOUT, SPRITES
OUT = os.path.join(WOUT, 'content'); VERSION = 'v3.9.2'
CD = json.load(open(D('data/combat_data.json'), encoding='utf-8'))
STATS = {e['id']: e for e in CD['enemies']}
FULL = {e['id']: e for e in json.load(open(D('enemies.json'), encoding='utf-8'))}
CUR = {r['id']: r for r in csv.DictReader(open(D('core-curriculum.csv'), encoding='utf-8-sig'))}
POOLROWS = list(csv.DictReader(open(D('data/curriculum_location_pools.csv'), encoding='utf-8-sig')))
LOCD = {r['location_id']: r for r in csv.DictReader(open(D('data/realm_location_difficulty.csv'), encoding='utf-8-sig'))}
BHP = {(int(r['tier']), r['boss_type']): r for r in csv.DictReader(open(D('data/boss_hp.csv'), encoding='utf-8-sig'))}
HERO = {h['tier']: h for h in CD['hero_stats']}
HEROIC = {h['tier']: h for h in CD['gear_heroic_drops']}
TOWNS = json.load(open(D('data/spells_full.json'), encoding='utf-8'))['towns']
# v3.9.5: gear catalogue (docs/data/items/gear_items.csv); game id = prototype_id or id, as tools/build_data.py builds it
GEAR_BY_EN = {r['en']: (r.get('prototype_id') or '').strip() or r['id'] for r in csv.DictReader(open(D('data/gear_items.csv'), encoding='utf-8-sig')) if r['rarity'] == 'heroic'}
MAN_P = os.path.join(SPRITES, 'manifest.json')
MAN = json.load(open(MAN_P)) if os.path.exists(MAN_P) else {}
ALIAS = MAN.get('_aliases', {})
MAX_NEW = 3            # spec decision 17 / §2.5: at most 3 new words per battle (hard cap)
HEAD_ANCHOR_DEFAULT = 0.1
EMOJI = {'road_bandit': '🥷', 'slime': '🟢', 'mimic': '🧰', 'bandit_boss': '🏴‍☠️', 'mimic_king': '👑', 'cave_bat': '🦇', 'goblin': '👺', 'goblin_monitor': '📏',
         'goblin_brute': '👹', 'echo_bat': '🦇', 'goblin_warden': '🗝️', 'goblin_king': '👑', 'bog_monster': '🟫', 'bog_lizard': '🦎', 'swamp_wisp': '👻', 'bog_toad': '🐸',
         'hydra': '🐉', 'zombie': '🧟', 'rattle_skeleton': '💀', 'zombie_knight': '⚔️', 'zombie_mayor': '🎩', 'sickness_fiend': '🦠', 'harpy': '🦅', 'griffin': '🦁',
         'cliff_golem': '🗿', 'wind_dragon': '🐲', 'griffin_king': '👑', 'arena_troll': '🧌', 'ogre_gladiator': '🛡️', 'fire_elemental': '🔥', 'minotaur': '🐂',
         'ogre_champion': '🏆', 'imp': '😈', 'demon_knight': '🗡️', 'gargoyle': '🦇', 'shadow_dragon': '🐉', 'demon_king': '👿'}
COLOR = {3: 0xb5884c, 4: 0x6b7a8f, 5: 0x5b7f4a, 6: 0x6a5f7d, 7: 0x9fb8c9, 8: 0xa0522d, 9: 0x4a2a3a}
ZONE_EMOJI = {3: '🛒', 4: '⛏️', 5: '🌫️', 6: '🕯️', 7: '🏔️', 8: '🏟️', 9: '🏰'}
NAME2ID = {e['name_en'].lower(): e['id'] for e in CD['enemies']}

def minions_of(s):
    out = []
    for part in re.split(r'\+|,', s or ''):
        m = re.match(r'\s*(\d+)\s+([A-Za-z\' -]+?)(?:\s*\(|\s*$|\s+plus)', part.strip() + ' ')
        if not m: continue
        n, name = int(m.group(1)), m.group(2).strip().lower()
        did = NAME2ID.get(name) or NAME2ID.get(name[:-1]) or NAME2ID.get(re.sub(r'ies$', 'y', name)) or NAME2ID.get(re.sub(r's$', '', name))
        if not did: raise SystemExit(f'minion name not found: {part!r}')
        out += [did] * n
    return out

def sprite_for(did):
    proto = (FULL.get(did) or {}).get('prototype_id') or ''
    for k in (proto, did, ALIAS.get(did, '')):
        if k and k in MAN and not k.startswith('_'): return k
    return did                                      # no sheet yet: runtime emoji fallback (same rule as build_data.sprite_for)

def enemy_row(did):
    d, f = STATS[did], FULL[did]
    kind = 'normal' if d['role'] == 'normal' else 'elite' if d['role'] == 'elite' else ('realmboss' if d['boss_type'] == 'realm' else 'locboss')
    hp, atk = d['hp'], d['atk']
    if kind in ('locboss', 'realmboss'):
        r = BHP[(d['realm'], 'realm' if kind == 'realmboss' else 'location')]; hp, atk = int(r['hp']), int(r['atk'])
    return dict(id=did, desyId=did, sprite=sprite_for(did), spriteTint=None, headAnchor=HEAD_ANCHOR_DEFAULT, zh=d['name_zh'], py=d['pinyin'], en=d['name_en'],
                emoji=EMOJI.get(did, '❓'), color=COLOR[d['realm']], tier=d['realm'], level=d['level'], kind=kind, role=d['role'], hp=hp, atk=atk, def_=d['def'],
                exp=d['exp'], gold=d['gold'], chestRate=d['chest_chance'], minions=minions_of(d['minions']), mech={},
                attackZh=f.get('attack_name_zh', ''), attackEn=f.get('attack_name_en', ''), special=d['special'], group=f.get('group_behavior', ''),
                shoutZh=d['sample_shout_zh'], shoutItem=d['sample_shout_item_id'], priority=d['priority'])

def heroic(t):
    h = HEROIC[t]['heroic_drop']; m = re.match(r'(\S+)\s+(.+?)\s*\((.+)\)\s*$', h)
    if not m: return {"heroic": None, "zh": "", "en": "", "effect": "", "text": h.strip('() ')}   # realm 9: no heroic gear (cosmetics + title, game won)
    zh, en, eff = m.group(1), m.group(2), m.group(3)
    # §6.3 / §7.2: the realm-boss chest gives this piece (battle.ts openChest heroicGear -> GEAR[bossReward.heroic]). A weapon/armor/shield drop
    # uses its gear_items.csv id (realm 3: Mimic Shield = shield_t3_heroic); charm-type drops (realms 4-8) keep a name id like queens_crown.
    hid = GEAR_BY_EN.get(en) or re.sub(r'[^a-z0-9]+', '_', en.lower().replace("'", '')).strip('_')
    return {"heroic": hid, "zh": zh, "en": en, "effect": eff,
            "text": f"{en} {zh} is yours!"}

def rng(s): a, b = [int(x) for x in s.replace('–', '-').split('-')]; return [a, b]

def item_row(p):
    r = CUR[p['id']]
    return dict(id=r['id'], zh=r['simplified'], trad=r['traditional'], py=r['pinyin'], en=r['english'], enPrimary=r['english'].split(';')[0].strip(), type=r['type'],
                pos=r['part_of_speech'], topic=r['topic'], loc=p['location_id'], speaking=r['speaking'] == 'Y', reading=r['reading'] == 'Y', slice=p['slice'] == 'Y', altZh=[], altEn=[])

def main():
    ZONES = json.load(open(os.path.join(WOUT, 'zones.json'), encoding='utf-8'))['zones']
    os.makedirs(OUT, exist_ok=True); summary = {}
    for t in range(3, 10):
        zs = sorted([z for z in ZONES if z['realm'] == t], key=lambda z: z['order'])
        ids = [e['id'] for e in CD['enemies'] if e['realm'] == t]
        for z in zs:          # any enemy a zone names from another realm is carried too
            for k in [z['boss'], z.get('elite')] + [r['enemy'] for r in z['roster']] + ([z['scriptedElite']] if isinstance(z.get('scriptedElite'), str) else []):
                if k and k not in ids: ids.append(k)
        enemies = [enemy_row(i) for i in ids]
        locs, pools, items = [], {}, []
        for z in zs:
            L = LOCD[z['desyPool']]; h = HERO[t]
            prow = [p for p in POOLROWS if p['location_id'] == z['desyPool']]
            pools[z['id']] = [p['id'] for p in prow]; items += [item_row(p) for p in prow]
            se = z.get('scriptedElite') if isinstance(z.get('scriptedElite'), str) else None
            locs.append(dict(id=z['id'], name=z['title']['en'], zh=z['title']['zh'], emoji=ZONE_EMOJI[t], tier=t, G=TOWNS[str(t)]['G'], recLevel=rng(h['rec_level_range']),
                             enemiesPerBattle=z['enemiesPerBattle'], mcOptions=int(L['mc_options']), reviewSlots=int(L['review_slots']), pathFights=int(L['path_fights']),
                             maxNewPerBattle=MAX_NEW, roster=z['roster'], boss=z['boss'], unlockRequires=z['unlockRequires'], bg=f"0x{COLOR[t]:06x}",
                             bossReward=heroic(t) if z['bossKind'] == 'realmboss' else None, packs=z.get('packs', {}),
                             scripted=({str(int(L['path_fights']) // 2): [se]} if se else {}), elite=z['elite'], desyPool=z['desyPool'],
                             bossKind=z['bossKind'], bossNode=z['bossNode'], realm=t))
        doc = {"_note": f"v3.9.2 game content for realm {t} ({TOWNS[str(t)]['en']}), generated by build/world/make_realm_content.py. Same row shapes as GameDev's src/data enemies.json / "
                        "locations.json / items.json for realms 1-2. Enemy id = Desy roster id (= desyId; graphs, zones.json and quests.json use it). Boss HP/ATK from data/boss_hp.csv. "
                        "Placeholders GameDev owns: emoji, color, bg, headAnchor (0.1 default), sprite (no sheet yet: the id, i.e. emoji fallback), mech ({} = special text not coded yet), "
                        "roster weights (1 each), altZh/altEn ([]). locations[].id = zones.json zone id; maxNewPerBattle = 3 (spec decision 17).",
               "schema": "realm_content/0.1", "version": VERSION, "realm": t, "title": {"en": TOWNS[str(t)]['en'], "zh": TOWNS[str(t)]['zh']}, "G": TOWNS[str(t)]['G'],
               "maxNewPerBattle": MAX_NEW, "enemies": enemies, "locations": locs, "pools": pools, "items": items}
        json.dump(doc, open(f'{OUT}/realm_{t}.json', 'w'), ensure_ascii=False, indent=1)
        summary[t] = dict(enemies=len(enemies), zones=len(locs), items=len(items))
    print(summary)
if __name__ == '__main__': main()
