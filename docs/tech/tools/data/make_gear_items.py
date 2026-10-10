"""v3.9.3: docs/data/items/gear_items.csv = game-ready gear catalogue for tiers 1-9, one row per piece (tier x slot x rarity).
Every number comes from docs/data/items/gear.csv (spec §6.2), economy_prices.csv (G) and realm_difficulty.csv; nothing is re-tuned.
ids: <slot>_t<tier>_<rarity> (the scheme quests.json already uses, e.g. shield_t5_heroic); prototype_id = the id GameDev's
tools/build_data.py already uses for tiers 1-2 (wood_sword, wood_sword_f, horn_dagger ...).
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
VALUE_MULT = {'common': 1.0, 'fine': 1.15, 'heroic': 1.3}       # quests.json economy.gearValue
def avg_epf(s): a = [int(x) for x in re.split(r'[–-]', s.split()[0])]; return sum(a) / len(a)
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
            else: zh, en, pid = '英雄' + zh, 'Heroic ' + en, ''; src = 'realm boss chest / quests (unnamed: no named heroic for this slot yet)'
        rows.append(dict(id=f"{slot}_t{t}_{rar}", prototype_id=pid, tier=t, realm=REALM[t], slot=slot, rarity=rar, stat=g['stat'], value=g[rar],
                         shop=rar == 'common', price=price if rar == 'common' else '', G=G[t], price_G=round(price / G[t], 1) if rar == 'common' else '',
                         price_battles=round(price / (G[t] * avg_epf(EPF[t])), 1) if rar == 'common' else '',
                         value_gold=round(price * VALUE_MULT[rar]), zh=zh, en=en, perk=perk, source=src))
with open(D('items', 'gear_items.csv'), 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print(len(rows), 'rows')
