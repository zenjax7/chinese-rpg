"""Writes /workspace/desy/spells.md from spells_data.py + build/v3/sim/v3_spells.txt + build/v3/tables (v3.6)."""
import re, sys, json
sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import spells_data as D
SIM = open('/workspace/desy/build/v3/sim/v3_spells.txt', encoding='utf-8').read()
def sec(title):
    m = re.search(r'^### ' + re.escape(title) + r'.*?\n(.*?)(?=^### |\Z)', SIM, flags=re.S | re.M)
    return '\n'.join(l for l in m.group(1).splitlines() if l.startswith('|'))
def rows_of(title, keep):
    t = sec(title).splitlines(); return '\n'.join(t[:2] + [l for l in t[2:] if keep(l)])
TGT = {'single': 'single', 'same_type': 'same type', 'all': 'all (max 3)'}
spell_tab = ['| town | spell (简 / 繁 / English) | price (G → gold) | power P | MP (v3.4 → v3.5, unchanged in v3.6) | casts from full MP | dmg vs normal enemy, own tier → t9 | target | element | status |', '|---|---|---|---|---|---|---|---|---|---|']
for s in D.SPELLS:
    ts = D.tier_stats(s['town'])
    spell_tab.append(f"| {s['town']} {D.TOWNS[s['town']][1]} | **{s['zh']}** / {s['zh_trad']} / {s['en']} | {s['price_G']} G → {s['price']:,} | {s['power']} | {s['mp_v34']} → **{s['mp']}** | {ts['MP']/s['mp']:.1f} | {D.spell_dmg(s, s['town'])/ts['HP']:.0%} → {D.spell_dmg(s, 9)/D.tier_stats(9)['HP']:.0%} | {TGT[s['target']]} | {s['element']} | {s['status'] or '–'} |")
hsk_tab = ['| spell | characters with HSK 3.0 level (word it is learned in) |', '|---|---|']
for s in D.SPELLS: hsk_tab.append(f"| {s['zh']} | {D.char_notes(s['zh'])} |")
vis_tab = ['| spell | visual brief for Arty |', '|---|---|']
for s in D.SPELLS: vis_tab.append(f"| {s['zh']} {s['en']} | {s['visual']} |")
q_tab = ['| town | bounty | collect | words | delivery | board total |', '|---|---|---|---|---|---|']
for t in range(1, 10):
    qs = {q['type']: q for q in D.QUESTS if q['town'] == t}
    cell = lambda q: f"{q['title_zh']} ({q['title_en']}): {q['reward_gold']:,}g" + (f" + {q['reward_item'].replace('_', ' ')}" if q['reward_item'] else '')
    q_tab.append(f"| {t} {D.TOWNS[t][1]} | {cell(qs['bounty'])} | {cell(qs['collect'])} | {cell(qs['words'])} | {cell(qs['delivery'])} | {sum(q['reward_gold'] for q in qs.values()):,}g |")
town_tab = ['| # | town (placeholder) | realm | G (gold per normal kill) | spells sold |', '|---|---|---|---|---|']
for t in range(1, 10):
    town_tab.append(f"| {t} | {D.TOWNS[t][1]} {D.TOWNS[t][0]} | {D.REALM_EN[t]} | {D.G(t)} | {', '.join(s['zh'] for s in D.SPELLS if s['town'] == t) or 'none (Mana Tea + a “coming soon” shelf)'} |")
summ = sec('A. Whole campaign')
SP = open('/workspace/desy/build/v3/spec_new_sections.md', encoding='utf-8').read()
SIMTAB = SP[SP.index('| kid, accuracy | playthrough h'):]; SIMTAB = SIMTAB[:SIMTAB.index('\n\n')]
TAB = lambda n: open(f'/workspace/desy/build/v3/tables/{n}.md', encoding='utf-8').read().strip()
TXT = open('/workspace/desy/build/v3/spells_md_template.md', encoding='utf-8').read()
for k, v in dict(TOWNS='\n'.join(town_tab), SPELLS='\n'.join(spell_tab), HSK='\n'.join(hsk_tab), VISUAL='\n'.join(vis_tab), QUESTS='\n'.join(q_tab),
                 SUMMARY=summ, REALM75=sec('B. Per realm, 75% saver'), REALM75SP=sec('B. Per realm, 75% spender'), REALM50=sec('B. Per realm, 50% saver'),
                 EFFORT=sec('C. Spell price'), TL75=sec('D. Spell timeline, 75% saver'), TL75SP=sec('D. Spell timeline, 75% spender'),
                 TL90=sec('D. Spell timeline, 90% saver'), TL65=sec('D. Spell timeline, 65% saver'), TL50=sec('D. Spell timeline, 50% saver'),
                 GOLD=sec('E. Gold and MP timeline'), BOSS=sec('F. Boss fights'), REALM65=sec('B. Per realm, 65% saver'), REALM90=sec('B. Per realm, 90% saver'),
                 FALLOFF=TAB('spell_falloff'), MPCHECK=TAB('spell_mp_check'), POTIONS=TAB('mp_potions'), CASTRULE=TAB('cast_rule'), COMPARE=sec('G. Question share'), PAYOFF=sec('H. Does saving'), SIMTABLE=SIMTAB, BOSSCHECK=sec('I. Boss target check'), BOSSHP=TAB('boss_hp')).items():
    TXT = TXT.replace('{{' + k + '}}', v)
assert '{{' not in TXT
open('/workspace/desy/spells.md', 'w', encoding='utf-8').write(TXT)
print(len(TXT.splitlines()), 'lines')
