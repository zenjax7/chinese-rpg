"""v3.3 purchasable spells + town quests: single source of truth.
Used by build_data.py (writes data/spells.*, data/quests.*, spec tables) and by build/spells_sim.py (campaign sim).
Prices are multiples of G(t) = gold per normal enemy at the selling town (G = 3 x L_rec(t))."""
import csv, json, collections
ROOT = '/workspace/desy'
LREC = [2, 4, 6, 9, 12, 15, 18, 21, 24]
def G(t): return 3 * LREC[t-1]
TOWNS = {1: ('Village of 小山', '小山村'), 2: ('Honey Town', '蜂蜜镇'), 3: ('Crossroads Market', '十字路口集市'),
         4: ("Miner's Camp", '矿工营地'), 5: ('Reed Village', '芦苇村'), 6: ('Dawn Chapel', '晨光小镇'),
         7: ('Cloud Ridge', '云岭镇'), 8: ('Arena Town', '角斗场镇'), 9: ('Lantern Light Camp', '灯火营地')}
REALM_EN = {1: 'Starter Meadow', 2: 'Honeycomb Forest', 3: 'Crossroads Market', 4: 'Goblin Caves', 5: 'Hydra Swamp',
            6: 'Zombie Lands', 7: 'Griffin Peaks', 8: 'Ogre Colosseum', 9: "Demon King's Castle"}

# id, town, zh_s, zh_t, en, target, element, mult, mp, price_G, status, skip_p, soak, visual brief
_S = [
 ('small_fireball', 2, '小火球术', '小火球術', 'Small Fireball', 'single', 'fire', 1.6, 8, 60, '', 0, False,
  'A plum-sized orange fireball with a curly tail of sparks, thrown from the wand tip. On hit: a warm puff of orange light and a few floating embers. No scorch marks, nothing burns.'),
 ('bubble_spell', 2, '泡泡术', '泡泡術', 'Bubble Spell', 'single', 'water', 1.0, 6, 45, 'Soaked: the target\'s next attack does half damage', 0, True,
  'A stream of shiny rainbow soap bubbles that wraps the enemy in a big wobbly bubble for a moment; when it pops the enemy is dripping and grumpy, with a little water cloud over its head.'),
 ('snowball_volley', 3, '雪球术', '雪球術', 'Snowball Volley', 'same_type', 'ice', 1.0, 10, 60, '', 0, False,
  'Fluffy snowballs pop out of the air and pelt every enemy of the chosen kind; soft white bursts and a sprinkle of snowflakes. Enemies shiver comically.'),
 ('little_lightning', 3, '小闪电术', '小閃電術', 'Little Lightning', 'single', 'thunder', 2.0, 10, 75, 'Dazed: 25% chance the target skips its next attack (bosses 12.5%)', 0.25, False,
  'A small zig-zag bolt from a palm-sized storm cloud; yellow flash, the target\'s fur/hair stands up and little stars circle its head when dazed.'),
 ('fireball', 4, '火球术', '火球術', 'Fireball', 'single', 'fire', 2.2, 12, 70, '', 0, False,
  'A melon-sized fireball with a bright yellow core and a spiral trail; a round orange flash and a ring of sparks on impact.'),
 ('whirlwind', 4, '旋风术', '旋風術', 'Whirlwind', 'same_type', 'wind', 1.3, 14, 85, '', 0, False,
  'A green-white spinning gust with leaves in it that lifts every enemy of the chosen kind, spins them like tops and drops them dizzy.'),
 ('snowflake_dance', 5, '雪花术', '雪花術', 'Snowflake Dance', 'all', 'ice', 0.8, 16, 90, '', 0, False,
  'Big sparkling snowflakes swirl across the whole screen and tap each enemy (max 3) with a soft chime; frost glitter on their shoulders.'),
 ('lightning', 5, '闪电术', '閃電術', 'Lightning Bolt', 'single', 'thunder', 2.6, 14, 75, 'Dazed: 30% chance the target skips its next attack (bosses 15%)', 0.30, False,
  'A tall bright bolt from a dark-blue cloud; screen flashes white for a frame (keep under the flash-safety limit), target gets spiky hair and circling stars.'),
 ('sunbeam', 6, '阳光术', '陽光術', 'Sunbeam', 'same_type', 'light', 1.6, 18, 80, '', 0, False,
  'Golden sunbeams break through grey clouds onto every enemy of the chosen kind; zombies/skeletons sneeze and look a bit more cheerful (ties to the "cured by kind words" theme).'),
 ('big_fireball', 6, '大火球术', '大火球術', 'Big Fireball', 'single', 'fire', 3.0, 18, 90, '', 0, False,
  'A big round fireball with a smiling glow that grows above the hero before it is thrown; big orange burst with confetti-like sparks.'),
 ('blizzard', 7, '暴风雪术', '暴風雪術', 'Blizzard', 'all', 'ice', 1.1, 24, 100, 'Chilled: each target 30% chance to skip its next attack (bosses 15%)', 0.30, False,
  'A sideways snowstorm sweeps over all enemies (max 3); they get snow hats and icicle eyebrows when chilled. Blue-white palette, soft wind sound.'),
 ('tornado', 7, '龙卷风术', '龍捲風術', 'Tornado', 'same_type', 'wind', 2.0, 22, 85, '', 0, False,
  'A tall friendly-looking tornado (with leaves, feathers and a lost hat) gathers every enemy of the chosen kind, spins them up and plops them down.'),
 ('meteor', 8, '流星术', '流星術', 'Meteor', 'single', 'star', 3.5, 24, 90, '', 0, False,
  'A shooting star with a long rainbow tail falls on one enemy; a starburst flash and tiny stars bouncing off. No crater.'),
 ('thunderstorm', 8, '雷雨术', '雷雨術', 'Thunderstorm', 'all', 'thunder', 1.3, 28, 110, 'Dazed: each target 30% chance to skip its next attack (bosses 15%)', 0.30, False,
  'A small storm cloud rains on all enemies (max 3) with friendly zig-zag bolts; puddles form under them and they hop around.'),
 ('super_blizzard', 9, '超暴风雪术', '超暴風雪術', 'Super Blizzard', 'all', 'ice', 1.6, 34, 130, 'Frozen: every non-boss target skips its next attack (1 turn); bosses are immune', 1.0, False,
  'The screen fills with a huge swirling snowstorm and a giant snowflake emblem; every enemy (max 3) is briefly frozen in a clear ice cube with a surprised face, then pops out.'),
 ('meteor_shower', 9, '流星雨术', '流星雨術', 'Meteor Shower', 'all', 'star', 2.0, 40, 120, '', 0, False,
  'The sky turns deep violet and a shower of colourful shooting stars rains on all enemies (max 3); each hit makes a star-shaped sparkle.'),
]
# ---------------- v3.4 (Jack, 2026-10-02 PT): casting is a FREE action (no question, no fizzle) ----------------
# Spell power is a fixed number P (not scaled by hero ATK/gear), so old spells fall off as enemy HP/DEF grow:
#   damage = max(1, round(P x (Tired ? 1.5 : 1) - DEF_e))          (full DEF, unlike the 0.5 x DEF of attacks)
# Design rule used to set P and MP (documented in spells.md):
#   P  = round(F x HP_normal(t) + DEF(t))   F = share of a normal enemy's HP the spell removes at its own tier t
#   MP = round(K x MP_pool(t))              K = 0.40-0.48 of the pool at the recommended level -> 2-3 casts from full
import combat_sim as _C
def tier_stats(t):
    h = _C.hero_stats(t); e = _C.enemy(t)
    return dict(t=t, L=_C.lrec(t), ATK=h['ATK'], MP=h['MP'], HP_hero=h['HP'], HP=e['HP'], DEF=e['DEF'], attack=h['ATK'] - 0.5*e['DEF'],
                elite_HP=_C.enemy(t, 'elite')['HP'], locboss_HP=_C.enemy(t, 'locboss')['HP'], realmboss_HP=_C.enemy(t, 'realmboss')['HP'])
FK = {'small_fireball': (0.65, 0.40), 'bubble_spell': (0.35, 0.33), 'snowball_volley': (0.40, 0.40), 'little_lightning': (0.70, 0.40),
      'fireball': (0.75, 0.40), 'whirlwind': (0.45, 0.45), 'snowflake_dance': (0.35, 0.45), 'lightning': (0.75, 0.40),
      'sunbeam': (0.50, 0.45), 'big_fireball': (0.85, 0.40), 'blizzard': (0.40, 0.45), 'tornado': (0.55, 0.45),
      'meteor': (0.95, 0.40), 'thunderstorm': (0.45, 0.45), 'super_blizzard': (0.45, 0.48), 'meteor_shower': (0.55, 0.48)}
K_MULT = 1.25   # v3.5: no cast caps, so MP costs are 1.25x the v3.4 costs (41-60% of the bar at the recommended level, ~2 casts from full)
def spell_dmg(sp, t, tired=False):
    return max(1, round(sp['power'] * (1.5 if tired else 1) - tier_stats(t)['DEF']))
SPELLS = []
for (sid, town, zs, zt, en, tgt, el, mult, mp, pg, status, skip, soak, vis) in _S:
    ts = tier_stats(town); F, K = FK[sid]
    SPELLS.append(dict(id=sid, town=town, realm=REALM_EN[town], zh=zs, zh_trad=zt, en=en, target=tgt, element=el,
                       power=round(F*ts['HP'] + ts['DEF']), mp=round(K_MULT*K*ts['MP']), F=F, K=round(K_MULT*K, 3), K_v34=K, mp_v34=round(K*ts['MP']), v33_mult=mult, v33_mp=mp,
                       price_G=pg, price=pg*G(town), status=status, skip_p=skip, boss_skip=(0.0 if sid == 'super_blizzard' else 0.5), soak=soak, visual=vis))
# MP potions (v3.4: expensive; drink on the map only, never in battle, so a potion never replaces a question turn)
MP_ITEMS = [dict(id='mana_tea', zh='魔力茶', zh_trad='魔力茶', en='Mana Tea', effect='+50% max MP', price_G=6, from_town=1, battle_use='no (map only)'),
            dict(id='big_mana_tea', zh='大魔力茶', zh_trad='大魔力茶', en='Big Mana Tea', effect='refills MP to full', price_G=15, from_town=5, battle_use='no (map only)')]
# Cast rule (v3.4)
# v3.5 (Jack, 2026-10-02 PT): NO cast caps and no 3-correct unlock. MP cost is the only limit; managing MP is the kid's job,
# and saving MP for elites and bosses is meant to be a rewarded strategy.
CAST_RULE = {}
CAST_RULE_V34 = dict(normal=1, elite=1, boss=2, min_correct=3, boss_second_after_q=12)   # v3.4 (superseded): 1 per normal/elite battle, 2 per boss (12 q apart), after 3 correct
# v3.5 decisions (Jack/Director, 2026-10-02 PT): Magic Ward removed; fixed spell power (no magic stat); MP costs and tea prices unchanged;
# Super Blizzard's Freeze lasts 1 turn and doesn't affect bosses; cast animation about 2-3 s, a tap skips it.
CAST_ANIM_SEC = 2.5   # sim time per cast (v3.4 assumed 5 s)

# v3.6 (Jack, 2026-10-02 PT): NO MP regen on correct answers (MP comes back only at inns or from map-only MP potions); no MP hints.
MP_REGEN = 0
# v3.6 boss HP: multiplier on the v3.5 boss HP so that a 75% kid who enters with full MP and spends it all on spells still needs about 20 correct answers
# (hero + block) to win (tuned with build/v3/explore/boss_tune.py, 600 fights per step). Tier 1 has no spells: 20 correct answers without spells.
# v3.7 (Jack, 2026-10-02 PT): location bosses retuned to ~15 correct answers with full-MP spells (75%); realm bosses stay at ~20 (v3.6 values). v3.6 location multipliers: 2.00, 2.30, 2.65, 2.50, 2.65, 2.55, 2.50, 2.60, 2.70
BOSS_HP_MULT = {(1, 'locboss'): 1.20, (1, 'realmboss'): 1.50, (2, 'locboss'): 1.55, (2, 'realmboss'): 1.65, (3, 'locboss'): 1.90, (3, 'realmboss'): 1.85, (4, 'locboss'): 1.70, (4, 'realmboss'): 1.05, (5, 'locboss'): 1.85, (5, 'realmboss'): 1.20, (6, 'locboss'): 1.80, (6, 'realmboss'): 1.10, (7, 'locboss'): 1.70, (7, 'realmboss'): 1.40, (8, 'locboss'): 1.85, (8, 'realmboss'): 1.10, (9, 'locboss'): 1.90, (9, 'realmboss'): 1.55}
# v3.6 boss ATK x0.8 (location and realm bosses): longer boss fights would otherwise roughly double boss defeats for 50%-accuracy kids
BOSS_ATK_MULT = {'locboss': 0.8, 'realmboss': 0.8}

# ---------------- HSK 3.0 level of each character (from sources/hsk30.csv) ----------------
def hsk_levels():
    word, contain = {}, {}
    for r in csv.DictReader(open(ROOT + '/sources/hsk30.csv', encoding='utf-8')):
        lv = r['Level']
        for w in r['Simplified'].split('|'):
            w = w.strip()
            if len(w) == 1: word[w] = min(word.get(w, '99'), lv, key=lambda x: int(x.split('-')[0]))
            for c in w:
                if c not in contain or int(lv.split('-')[0]) < int(contain[c][1].split('-')[0]): contain[c] = (w, lv)
    return word, contain
def char_notes(zh):
    word, contain = hsk_levels(); out = []
    for c in dict.fromkeys(zh):
        if c in word: out.append(f'{c} {word[c]}')
        elif c in contain: out.append(f'{c} ({contain[c][0]}, {contain[c][1]})')
        else: out.append(f'{c} –')
    return ' · '.join(out)

# ---------------- quests ----------------
E = json.load(open(ROOT + '/enemies.json', encoding='utf-8'))
EN = {e['id']: e for e in E}
def realm_normals(t):
    seen = []
    for e in E:
        if e['role'] == 'normal' and e['realm'] == t and e['id'] not in seen: seen.append(e['id'])
    return seen
def loc_normals(loc):
    return [e['id'] for e in E if e['role'] == 'normal' and loc in str(e['roster_locations'])]
COLLECT = {1: ('个', '小蘑菇', 'little mushrooms'), 2: ('根', '蜘蛛丝', 'strands of spider silk'), 3: ('块', '果冻', 'jelly blobs'), 4: ('个', '小铃铛', 'little bells'),
           5: ('片', '闪亮鳞片', 'shiny shed scales'), 6: ('顶', '旧帽子', 'old hats'), 7: ('根', '羽毛', 'feathers'),
           8: ('块', '铜奖牌', 'bronze medals'), 9: ('颗', '暗影水晶', 'shadow crystals')}
MW = {1: '只', 2: '只', 3: '个', 4: '只', 5: '只', 6: '个', 7: '只', 8: '个', 9: '个'}   # measure word for the bounty enemy
QUEST_RULES = dict(bounty_n=8, collect_n=5, collect_drop=0.35, words_n=15,
                   reward_G=dict(bounty=6, collect=8, words=10, delivery=6),
                   reward_item=dict(bounty='honey_potion', collect='', words='mana_tea', delivery='return_feather'))
QUESTS = []
for t in range(1, 10):
    ns = realm_normals(t); a = ns[0]
    # collect target: the other normal enemy found in the most locations of the realm (so the drop is reachable everywhere)
    nloc = {1: 3, 2: 2, 3: 2, 4: 3, 5: 2, 6: 2, 7: 2, 8: 2, 9: 2}[t]
    b = max(ns[1:], key=lambda e: sum(e in (loc_normals(f'L{t}.{k+1}') or ns) for k in range(nloc))) if len(ns) > 1 else a
    nxt = TOWNS[t+1] if t < 9 else TOWNS[1]
    R = QUEST_RULES
    QUESTS += [
     dict(id=f'q{t}_bounty', town=t, type='bounty', title_zh=f'打败{R["bounty_n"]}{MW[t]}{EN[a]["name_zh"]}', title_en=f'Defeat {R["bounty_n"]} × {EN[a]["name_en"]}',
          target=a, n=R['bounty_n'], reward_G=R['reward_G']['bounty'], reward_gold=R['reward_G']['bounty']*G(t), reward_item=R['reward_item']['bounty'],
          how='counts kills of that enemy in any fight in this realm (path, patrol, boss minions)'),
     dict(id=f'q{t}_collect', town=t, type='collect', title_zh=f'收集{R["collect_n"]}{COLLECT[t][0]}{COLLECT[t][1]}', title_en=f'Collect {R["collect_n"]} {COLLECT[t][2]}',
          target=b, n=R['collect_n'], reward_G=R['reward_G']['collect'], reward_gold=R['reward_G']['collect']*G(t), reward_item='',
          how=f'each defeated {EN[b]["name_en"]} drops one with {int(R["collect_drop"]*100)}% chance (a quest item, no inventory slot)'),
     dict(id=f'q{t}_words', town=t, type='words', title_zh=f'学会{R["words_n"]}个新词', title_en=f'Get {R["words_n"]} words of this realm Ready',
          target='realm pool', n=R['words_n'], reward_G=R['reward_G']['words'], reward_gold=R['reward_G']['words']*G(t), reward_item=R['reward_item']['words'],
          how='counts items of this realm\'s pools that become proficient (battle or practice); the quest page links to Preview & Practice'),
     dict(id=f'q{t}_delivery', town=t, type='delivery', title_zh=f'把信送到{nxt[1]}', title_en=f'Deliver a letter to {nxt[0]}',
          target=nxt[0], n=1, reward_G=R['reward_G']['delivery'], reward_gold=R['reward_G']['delivery']*G(t), reward_item=R['reward_item']['delivery'] if t < 9 else 'cosmetic: postman cap',
          how='offered after the realm boss; paid on arrival at the next town (realm 9: back home in 小山村)'),
    ]

def write_json():
    json.dump(dict(version='v3.7 (2026-10-02 PT): location bosses ~15 correct answers, realm bosses ~20, even with a full MP bar spent on spells (v3.6: 20 for both); v3.6: no MP regen on correct answers, boss ATK x0.8; no MP hints. v3.5 rules kept: free cast (no question, no fizzle), no cast caps, Magic Ward removed, Freeze 1 turn and not on bosses, 2-3 s skippable cast animation',
                   rules=dict(price_unit='G(t) = gold per normal enemy at the selling town = 3 x L_rec(t)',
                              damage='max(1, round(power x (Tired ? 1.5 : 1) - DEF_e)); fixed power (no ATK/gear/level scaling), full enemy DEF, no streak or spoken bonus',
                              design_rule='power = round(F x HP_normal(t) + DEF(t)); mp = round(K x MP_pool(t)), MP_pool = 10 + 2 x L_rec(t); v3.5 K = 1.25 x v3.4 K (0.41-0.60)',
                              cast='free action: uses the hero turn, asks no question, cannot fizzle; MP is always spent; no streak change on that turn', mp_regen='none (v3.6): MP comes back only at the inn, on waking after a defeat, or from map-only Mana Tea / Big Mana Tea', boss_hp_mult={f'{t},{k}': m for (t, k), m in BOSS_HP_MULT.items()}, boss_atk_mult=BOSS_ATK_MULT, boss_target='about 15 correct answers per location boss and about 20 per realm boss, even with a full MP bar spent on spells (v3.7; v3.6 was 20 for both)',
                              cast_rule=CAST_RULE, cast_rule_text='no per-battle cap and no unlock: cast any turn while MP >= cost (back-to-back allowed); MP is the only limit (v3.5)', mp_strategy='saving MP for elites and bosses is the kid\'s call; no hints anywhere (v3.6)',
                              max_targets=3, boss_status='bosses resist statuses (half chance); Super Blizzard Freeze does not affect bosses', freeze='Super Blizzard: every non-boss target skips its next attack (lasts 1 turn)',
                              cast_animation='about 2-3 s; a tap skips it', ownership='permanent; castable in any battle when MP >= cost and the cast rule allows',
                              magic_ward='removed (decided v3.5; was x0.5 spell damage in boss battles in v3.3)', spell_power='fixed per spell; no magic stat or wand scaling (decided v3.5)',
                              mp_potions=MP_ITEMS, mp_potions_note='map only (never in battle), so a potion never replaces a question turn',
                              blacksmith_first='the magic shop reminds the kid when a purchase would leave less gold than the next town\'s weapon + armor + shield',
                              same_turn='a spell replaces the attack; it never combines with Frost/Sweep on the same turn; companion team attack is unchanged'),
                   tiers={t: tier_stats(t) for t in range(1, 10)},
                   towns={t: dict(en=TOWNS[t][0], zh=TOWNS[t][1], G=G(t)) for t in TOWNS},
                   spells=[dict(s, hsk=char_notes(s['zh'])) for s in SPELLS]),
              open(ROOT + '/data/spells_full.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(dict(rules=QUEST_RULES, quests=QUESTS), open(ROOT + '/data/quests_full.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if __name__ == '__main__':
    for s in SPELLS: print(s['town'], s['zh'], s['zh_trad'], s['en'], s['price'], char_notes(s['zh']))
    for q in QUESTS[:8]: print(q['id'], q['title_zh'], q['title_en'], q['reward_gold'])
