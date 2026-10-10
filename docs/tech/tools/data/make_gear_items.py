"""v3.9.3: docs/data/items/gear_items.csv = game-ready gear catalogue for tiers 1-9, one row per piece (tier x slot x rarity).
Every number comes from docs/data/items/gear.csv (spec §6.2), economy_prices.csv (G) and realm_difficulty.csv; nothing is re-tuned.
ids: <slot>_t<tier>_<rarity> (the scheme quests.json already uses, e.g. shield_t5_heroic); prototype_id = the id GameDev's
tools/build_data.py already uses for tiers 1-2 (wood_sword, wood_sword_f, horn_dagger ...).
v3.9.5: every heroic piece has a real bilingual name. Sources follow the spec only: §6.3 gives each realm boss ONE heroic piece
(only tiers 1 and 3 are weapon/armor/shield pieces: Rabbit-Horn Dagger, Mimic Shield; the others are charm-type items not in this table),
and quests.json gives one heroic piece (shield_t5_heroic, q5_fog_bottle). The other 24 heroic pieces have no source in the spec, so they
are listed with source 'none in the spec' and are not placed anywhere. Fine perks: §6.2 says "a minor perk" but names none, so they stay blank;
named heroic perks are the spec's (§6.3) or the quest's; the 24 unplaced pieces have no perk.
Run from the repo root: python3 docs/tech/tools/data/make_gear_items.py"""
import csv, os, re
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', '..'))
D = lambda *p: os.path.join(ROOT, 'docs', 'data', *p)
rd = lambda p: list(csv.DictReader(open(p, encoding='utf-8-sig')))
GEAR = rd(D('items', 'gear.csv'))
G = {int(r['tier']): int(r['gold_per_normal']) for r in rd(D('items', 'economy_prices.csv'))}
EPF = {int(r['tier']): r['enemies_per_fight'] for r in rd(D('balance', 'realm_difficulty.csv'))}
REALM = {int(r['tier']): r['realm'] for r in rd(D('items', 'economy_prices.csv'))}
PROTO = {(1, 'weapon'): 'wood_sword', (1, 'armor'): 'cloth_tunic', (1, 'shield'): 'potlid',
         (2, 'weapon'): 'stinger', (2, 'armor'): 'petal_cloak', (2, 'shield'): 'beeswax'}
# named heroic pieces that exist in the spec / quests (everything else is a generic heroic piece of that tier)
HEROIC = {(1, 'weapon'): ('角兔角', 'Rabbit-Horn Dagger', '+1 streak at battle start', 'realm boss chest (Horned Rabbit King, §6.3)', 'horn_dagger'),
          (3, 'shield'): ('宝箱盾', 'Mimic Shield', 'Thorns 25%', 'realm boss chest (Mimic King, §6.3)', ''),
          (5, 'shield'): ('龟壳盾', 'Turtle-Shell Shield', 'first broken block per battle leaks 1 less', 'quest q5_fog_bottle', '')}
# v3.9.5 names for the heroic pieces the spec doesn't name (style of §6.3: realm creature or place + item). Names only: no perk, no source.
NAMES = {(1, 'armor'): ('兔毛背心', 'Bunny-Fur Vest'), (1, 'shield'): ('蘑菇盾', 'Mushroom-Cap Shield'),
         (2, 'weapon'): ('蜂后之刺', "Queen's Stinger"), (2, 'armor'): ('金蜜斗篷', 'Golden Honey Cloak'), (2, 'shield'): ('蜂巢盾', 'Honeycomb Shield'),
         (3, 'weapon'): ('宝箱牙剑', 'Mimic-Tooth Sword'), (3, 'armor'): ('灯笼皮甲', 'Lantern Leather Armor'),
         (4, 'weapon'): ('水晶弯刀', 'Crystal Scimitar'), (4, 'armor'): ('蝙蝠翼甲', 'Bat-Wing Plate'), (4, 'shield'): ('回音石盾', 'Echo-Stone Shield'),
         (5, 'weapon'): ('鬼火长矛', 'Wisp-Fire Spear'), (5, 'armor'): ('蟾皮甲', 'Toad-Skin Mail'),
         (6, 'weapon'): ('晨光锤', 'Dawn Mace'), (6, 'armor'): ('守夜长袍', 'Night-Watch Robe'), (6, 'shield'): ('月牙盾', 'Crescent-Moon Shield'),
         (7, 'weapon'): ('风龙弓', 'Wind-Dragon Bow'), (7, 'armor'): ('鹰身羽甲', 'Harpy-Wing Mail'), (7, 'shield'): ('雷云盾', 'Thundercloud Shield'),
         (8, 'weapon'): ('牛角大剑', 'Minotaur-Horn Blade'), (8, 'armor'): ('火心铠甲', 'Fire-Heart Plate'), (8, 'shield'): ('巨魔皮盾', 'Troll-Hide Shield'),
         (9, 'weapon'): ('光明之剑', 'Sword of Light'), (9, 'armor'): ('星光铠甲', 'Starlight Plate'), (9, 'shield'): ('石像鬼盾', 'Gargoyle Shield')}
NO_SOURCE = 'none in the spec (not placed: §6.3 gives one realm-boss heroic per realm; quests.json gives only shield_t5_heroic)'
VALUE_MULT = {'common': 1.0, 'fine': 1.15, 'heroic': 1.3}       # quests.json economy.gearValue
def avg_epf(s): a = [int(x) for x in re.split(r'[–-]', s.split()[0])]; return sum(a) / len(a)
assert len(NAMES) + len(HEROIC) == 27 and not set(NAMES) & set(HEROIC)
rows = []
for g in GEAR:
    t, slot = int(g['tier']), g['slot']; price = int(g['shop_price_common'])
    for rar in ('common', 'fine', 'heroic'):
        zh, en, perk, src, pid = g['example_name_zh'], g['example_name_en'], '', '', PROTO.get((t, slot), '')
        if rar == 'common': src = f"shop: town {t} blacksmith"
        elif rar == 'fine':
            zh, en, pid = '好' + zh, 'Fine ' + en, (pid + '_f' if pid else '')
            src = 'location boss chest (guaranteed); normal chest fine_gear 10%; quests'
        else:
            if (t, slot) in HEROIC: zh, en, perk, src, pid = HEROIC[(t, slot)]
            else: (zh, en), pid, src = NAMES[(t, slot)], '', NO_SOURCE
        rows.append(dict(id=f"{slot}_t{t}_{rar}", prototype_id=pid, tier=t, realm=REALM[t], slot=slot, rarity=rar, stat=g['stat'], value=g[rar],
                         shop=rar == 'common', price=price if rar == 'common' else '', G=G[t], price_G=round(price / G[t], 1) if rar == 'common' else '',
                         price_battles=round(price / (G[t] * avg_epf(EPF[t])), 1) if rar == 'common' else '',
                         value_gold=round(price * VALUE_MULT[rar]), zh=zh, en=en, perk=perk, source=src))
with open(D('items', 'gear_items.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), 'rows')
