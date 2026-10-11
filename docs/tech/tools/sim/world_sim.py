"""Campaign sim (world graph), Desy. Committed 2026-10-10 PT so it can't be lost again; run it with run_world_sim.py.
It is spells_sim.py (the v3.3-v3.7 campaign: purchasable spells, quests, gear, learning model, combat_sim.battle) with the v3.8-v3.9
realm-graph traversal (formerly the generated world_sim.py = build_world_sim.py splicing world_loop.py.txt in). World data comes from
world_loader.py (docs/data/world or docs/data/levels, optional 'levels_proposal' transform); opt['data'] is passed to WG.configure().
Defaults reproduce the v3.9.1 tables (sim_world_v391.csv) exactly. Engine-faithful switches (src/world/graph.ts + engine.ts, all off by
default, see run_world_sim.py 'engine' preset): patrols, budget_key='edge', rng='engine'.
2026-10-11 (Jack, firm): no boss retry mechanic (a lost boss fight restarts at full boss HP) and no random strong or elite enemies
(no 10% patrol elite, no scripted path elite, no location `elite` field). Those rules now run only with opt v391_rules=True (or one at a time: v391_checkpoint / v391_elites), kept solely so
`run_world_sim.py calibrate` can still reproduce the historical v3.9.1 tables. Deliberately placed fights (bosses, mini-bosses, quest
fights) are unchanged.
Per-location pre-boss battle counts: R['loc_pre'] (one dict per location).

v3.3 notes (kept): one run = realms 1-9 in a row with gold, potions, spells, gear and learned items carried over.
Reuses combat_sim.battle (campaign hooks: species, spell casts, Soaked, kill accounting) and the v3.2 learning model.
Gear model: the kid enters realm t wearing tier t-1 gear and buys the tier-t weapon (+3 ATK), armor (+2 DEF), shield (+1 DEF)."""
import sys, random, statistics, collections, json, math
from multiprocessing import Pool
import os
_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path[:0] = [_HERE, os.path.join(_HERE, '..', 'data')]   # 2026-10-10: repo-relative (was /workspace/desy/build)
import combat_sim as C
import spells_data as D
try: import spells_data_v3_3 as D33          # v3.3 archive (Desy's tree only); needed only for opt rules != 'v34'
except ImportError: D33 = None
import heapq
import world_loader as WG

SPELL_BY_ID = {s['id']: s for s in D.SPELLS}
SEC_PER_CAST = D.CAST_ANIM_SEC     # v3.5: 2-3 s cast animation, a tap skips it (v3.4 assumed 5 s)
LOC_SPECIES = {}
for t in range(1, 10):
    for k in range(C.LOCS[t]):
        LOC_SPECIES[(t, k)] = D.loc_normals(f'L{t}.{k+1}') or D.realm_normals(t)

def gear_stats(t, owned):
    h = dict(C.hero_stats(t))
    if t == 1: miss = {'shield'} - owned                      # start kit: wooden sword + cloth tunic
    else: miss = {'weapon', 'armor', 'shield'} - owned
    h['ATK'] -= 3 if 'weapon' in miss else 0
    h['DEF'] -= (2 if 'armor' in miss else 0) + (1 if 'shield' in miss else 0)
    return h

def campaign(args):
    p, speech, kid, mode, seed = args[:5]
    opt = args[5] if len(args) > 5 else {}
    v34 = opt.get('rules', 'v34') == 'v34'
    SP = D.SPELLS if v34 else D33.SPELLS
    if opt.get('k_mult'): SP = [dict(s, mp=round(s['mp']*opt['k_mult'])) for s in SP]
    strength = lambda s: s.get('power', s.get('mult'))
    tea_price = lambda t: (6 if v34 else 1)*C.gold_per_enemy(t)
    spells_on = mode in ('spend', 'refund')
    cosm = mode == 'off_cosm'
    rng = random.Random(seed)
    world = opt.get('world')     # None = the v3.7 loop; 'beeline' / 'explore' = v3.8 realm-graph traversal
    if world: WG.configure(opt.get('data'))
    style = opt.get('mp_style', 'free')
    C.SPELL_POLICY.update(regen_big_only=opt.get('regen_big_only'), regen_line=opt.get('regen_line'), mp_style=style, save_casts=opt.get('save_casts', 2), min_gain=opt.get('min_gain', 1.0 if v34 else 1.25))
    C.SPELL_POLICY.update(cast_rule=(opt.get('cast_rule', D.CAST_RULE) if v34 else None), boss_mult=opt.get('boss_mult', 1.0), max_casts=opt.get('max_casts'), keep_heal=opt.get('keep_heal', False), ward_minions=opt.get('ward_minions', False))
    C.MPCFG = dict(C.MP_PRESETS[C.DEFAULT_MP]); C.COMPANION = dict(C.COMPANION_DEFAULT); C.SPOKEN_CAP = 0.5; C.PATH_ENCOUNTERS = 8
    C.MPCFG['regen'] = opt.get('regen', D.MP_REGEN if v34 else 1)                 # v3.6: no MP regen on correct answers
    C.BOSS_HP_MULT.clear()
    C.BOSS_ATK_MULT.clear(); C.BOSS_ATK_MULT.update(opt.get('boss_atk', getattr(D, 'BOSS_ATK_MULT', {})) if v34 else {})
    if opt.get('boss_hp', True) and v34: C.BOSS_HP_MULT.update(D.BOSS_HP_MULT)     # v3.6 boss HP
    C.WORKING_SET = C.DEFAULT_WORKING_SET
    pol = dict(C.POLICIES[kid]); nets = C.NETS['nets+']
    order = opt.get('order', 'gear_first')
    L = C.Learner(p, speech, 'total', rng)
    S = dict(hero=None, hp=0, mp=0, gold=24, potions=1, heal=False, shield=False, campaign=True, species=None,
             spells=[], fizzle='refund' if mode == 'refund' else 'spend', tea=0, bigtea=0, feather=1)
    stats = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0, practice_q=0, kills=collections.Counter())
    prior = []; uid = 0
    out = dict(realms=[], spell_buys=[], affordable={}, events=[])
    tq_minutes = lambda: (stats.get('walk_sec', 0) + stats['q']*C.SEC_PER_Q + stats['practice_q']*C.SEC_PER_PRACTICE_Q + (stats.get('spell_casts', 0)*SEC_PER_CAST if v34 else 0))/60
    delivery_due = 0
    for t in range(1, 10):
        owned_gear = set(); h = gear_stats(t, owned_gear)
        S['hero'] = h
        if t == 1: S['hp'] = h['HP']; S['mp'] = h['MP']
        S['hp'] = min(S['hp'], h['HP']); S['mp'] = min(S['mp'], h['MP'])
        S['heal'] = S['shield'] = t >= 2
        if opt.get('skills', True):
            S['sweep'] = t >= 7; S['frost'] = t >= 8; S['second_wind'] = t >= 9
        if delivery_due: S['gold'] += delivery_due; delivery_due = 0
        thresh = C.TRIGGER_SPEECH if speech else C.TRIGGER_READING
        R = dict(t=t, battles=0, defeats=0, boss_fights=0, boss_wins=0, boss_first=0, boss_q=[], patrols=0, inn_paid=0, inn_free=0,
                 stuck=0, gold_zero=0, min_gold=1e9, gold_start=S['gold'], gear_done_battle=None, casts=0, fizzles=0, heals=0,
                 quest_gold=0, spent_spells=0, spent_gear=0, spent_cosm=0, income=0, q0=stats['q'], min0=tq_minutes(), battles_full_gear=0,
                 spell_dmg=0, dmg_share=[], loc_min=[], normal_q=[], tea_bought=0, tea_used=0, turns=[], mp_start=[], can_cast=[],
                 boss_mp_start=[], boss_hp_lost=[], boss_casts=[], tea_gold=0,
                 loc_pre=[], path_battles=0, side_battles=0, back_battles=0, ready_gate=[], ready_boss=[], hops=0, feathers=0, inn_trips=0, inn_walk_hops=0, gold_side=0, minis=0, items_found=0)
        kills0 = collections.Counter(stats['kills']); drops = 0; quests_done = set(); q_words_pool = []
        qs = {q['type']: q for q in D.QUESTS if q['town'] == t}
        def pay_quest(kind):
            q = qs[kind]
            if kind in quests_done: return
            quests_done.add(kind); S['gold'] += q['reward_gold']; R['quest_gold'] += q['reward_gold']
            if q['reward_item'] == 'honey_potion': S['potions'] += 1
            if q['reward_item'] == 'mana_tea': S['tea'] += 1
        def check_quests():
            nonlocal drops
            if (stats['kills'][qs['bounty']['target']] - kills0[qs['bounty']['target']]) >= qs['bounty']['n']: pay_quest('bounty')
            if sum(L.proficient(i) for i in q_words_pool) >= qs['words']['n']: pay_quest('words')
            if drops >= qs['collect']['n']: pay_quest('collect')
        def restore():
            S['hp'] = h['HP']; S['mp'] = h['MP']
        def reserve(): return pol['reserve_inns']*C.inn_price(t)
        def avail_spells():
            if not spells_on: return []
            own = [s for s in S['spells']]
            c = []
            for s in SP:
                if s['town'] > t or any(o['id'] == s['id'] for o in own): continue
                if v34 and s['town'] < t - 1: continue          # v3.4: old spells have fallen off; only this town's and the previous town's
                if any(o['target'] == s['target'] and strength(o) >= strength(s) and o['skip_p'] >= s['skip_p'] and o['soak'] >= s['soak'] for o in own): continue
                c.append(s)
            cur = [s for s in c if s['town'] == t]
            # the kid saves for the coolest (most expensive) spell of the current town first, then older towns' leftovers
            return sorted(cur, key=lambda s: -s['price']) + sorted([s for s in c if s['town'] < t], key=lambda s: -s['price'])
        def note_affordable():
            for s in SP:
                if spells_on and s['town'] <= t and s['id'] not in out['affordable'] and S['gold'] - reserve() >= s['price']:
                    out['affordable'][s['id']] = dict(realm=t, minutes=round(tq_minutes(), 1), battle=sum(r['battles'] for r in out['realms']) + R['battles'])
        def shop():
            nonlocal h
            gear = [('weapon', C.gear_prices(t)[0]), ('armor', C.gear_prices(t)[1]), ('shield', C.gear_prices(t)[2])]
            if t == 1: gear = [('shield', 35)]
            def buy_gear():
                nonlocal h
                for slot, price in gear:
                    if slot in owned_gear: continue
                    if S['gold'] - price < reserve(): return False
                    S['gold'] -= price; R['spent_gear'] += price; owned_gear.add(slot); h = gear_stats(t, owned_gear); S['hero'] = h
                    if len(owned_gear) == len(gear) or (t == 1): R['gear_done_battle'] = R['gear_done_battle'] or R['battles']
                return all(sl in owned_gear for sl, _ in gear)
            def buy_spell():
                a = avail_spells()
                if not a: return True
                s = a[0]
                keep = reserve() + (sum(C.gear_prices(t+1)) if opt.get('save_next_gear') and t < 9 else 0)
                if S['gold'] - s['price'] < keep: return False
                S['gold'] -= s['price']; R['spent_spells'] += s['price']; S['spells'].append(s)
                out['spell_buys'].append(dict(id=s['id'], realm=t, minutes=round(tq_minutes(), 1), battle=sum(r['battles'] for r in out['realms']) + R['battles']))
                return buy_spell()
            note_affordable()
            if order == 'spell_first' and spells_on:
                if buy_spell(): buy_gear()
            else:
                if buy_gear(): buy_spell()
            if spells_on and S['spells'] and (style.endswith('tea') if v34 else kid == 'saver'):
                if v34 and t >= 5 and S['bigtea'] < 1 and S['gold'] - 15*C.gold_per_enemy(t) >= reserve():      # v3.5 tea kid: keeps 1 Big Mana Tea in stock
                    S['gold'] -= 15*C.gold_per_enemy(t); R['tea_gold'] += 15*C.gold_per_enemy(t); S['bigtea'] += 1; R['tea_bought'] += 1
                elif (not v34 or t < 5) and S['tea'] < 1 and S['gold'] - tea_price(t) >= reserve():
                    S['gold'] -= tea_price(t); R['tea_gold'] += tea_price(t); S['tea'] += 1; R['tea_bought'] += 1
            if cosm and all(sl in owned_gear for sl, _ in gear):          # v3.2 behaviour: the rest goes to cosmetics
                while S['gold'] - round(1.5*C.inn_price(t)) >= reserve():
                    S['gold'] -= round(1.5*C.inn_price(t)); R['spent_cosm'] += round(1.5*C.inn_price(t))
        def between(before_boss=False):
            tea_kid = v34 and style.endswith('tea')
            if tea_kid and before_boss and S['bigtea'] > 0 and S['spells'] and S['mp'] < 0.6*h['MP']:
                R['tea_used'] += 1; S['bigtea'] -= 1; S['mp'] = h['MP']
            if S['tea'] > 0 and S['spells'] and (before_boss if v34 else True) and S['mp'] < ((0.75 if tea_kid else 0.5) if v34 else 0.4)*h['MP'] and S['hp'] >= pol['inn_below']*h['HP']:
                R['tea_used'] += 1; S['tea'] -= 1; S['mp'] = min(h['MP'], S['mp'] + 0.5*h['MP'])
            low = S['hp'] < (opt.get('boss_inn_below', 0.8) if before_boss else pol['inn_below'])*h['HP'] or (S['mp'] < C.MPCFG['heal'] and S['heal'] and S['hp'] < 0.7*h['HP'])
            if before_boss and v34 and style.startswith('save') and S['spells'] and S['mp'] < opt.get('boss_inn_mp', 0.6)*h['MP']: low = True   # v3.6 saver: refill MP before the boss
            if low:
                price = C.inn_price(t)
                if S['gold'] >= price:
                    S['gold'] -= price; R['inn_paid'] += 1; restore()
                    while S['potions'] < pol['keep_potions'] and S['gold'] >= C.potion_price(t) + price:
                        S['gold'] -= C.potion_price(t); S['potions'] += 1
                    return
                R['inn_free'] += 1; restore()
                if S['potions'] == 0: S['potions'] = 1
        def defeat():
            R['defeats'] += 1
            loss = 0.10*S['gold']; loss = min(loss, max(0, S['gold'] - 2*C.inn_price(t)))
            loss = max(loss, min(C.inn_price(t), max(0, S['gold'] - 2*C.inn_price(t))))
            S['gold'] -= loss; restore()
            if S['potions'] == 0 and S['gold'] < C.inn_price(t): S['potions'] = 1
        # ---------------------------------------------------------------- v3.8 world graph (world_sim.py only)
        def world_zone(loc):
            nonlocal uid, prior, q_words_pool, drops
            T = WG.realm(t); RU = WG.RULES; Z = T.zones[loc]; zi = loc
            cmult = opt.get('cleared_mult', RU['clearedStepMult']); pity_n = RU['pityRolls']
            budget = opt.get('budget', RU['zoneBattleBudget']); bmult = opt.get('budget_mult', RU['budgetSpentMult']); pmult = opt.get('rate_mult', 1.0)
            safe_hops = RU['safe']['afterBossClear']['hops']
            explorer = world == 'explore'
            if loc == 0:
                S['_wr'] = dict(pos=T.entry, last_inn=T.entry, cleared=set(), prog={}, pity=0, scripted=set(), visited={T.entry}, armed=True, last_fire={},
                                visits=collections.Counter({T.entry: 1}), once=set(), qa=set(), qd=set(), items=collections.Counter(), safe_until={}, hops=0, enc=0)
            W = S['_wr']; W['armed'] = True
            engine_pity = opt.get('budget_key', 'loc') == 'edge'
            if not engine_pity: W['enc'] = 0      # 'loc': the budget resets when the location (= word pool) starts; 'edge': engine edgeZone rule in hop()
            erng = opt.get('rng') == 'engine'; W.setdefault('cross', collections.Counter()); legacy = bool(opt.get('v391_rules') or opt.get('v391_elites')); legacy_cp = bool(opt.get('v391_rules') or opt.get('v391_checkpoint'))   # v3.9.1 rules, calibration / attribution only
            b0 = dict(rand=R['path_battles'] + R['side_battles'] + R['back_battles'] - R['minis'] - R.get('tutorial', 0), mini=R['minis'], all=R['battles'])
            RF = RU['returnFeather']; fprice = max(1, round(opt.get('feather_G', RF['priceG'])*C.gold_per_enemy(t)))
            if t == 1 and loc == 0: S['feather'] = opt.get('start_feathers', RF['start'])
            fkeep = opt.get('feather_keep', {'saver': 2, 'spender': 1}.get(kid, 1))
            def full_shop(k):     # v3.9: magic shop + smith only in towns (and villages if opt village_magic)
                return T.N[k]['kind'] == 'town' or (T.N[k]['kind'] == 'village' and opt.get('village_magic', False))
            def buy_feathers():
                while S.get('feather', 0) < min(RF['carry'], fkeep) and S['gold'] - fprice >= reserve():
                    S['gold'] -= fprice; S['feather'] = S.get('feather', 0) + 1
                    R['feathers_bought'] = R.get('feathers_bought', 0) + 1; R['feather_gold'] = R.get('feather_gold', 0) + fprice
            def shop_at(k):
                if not opt.get('village_shop', True): return
                if full_shop(k): shop()
                buy_feathers()
            def want_shop():
                gear = [('weapon', C.gear_prices(t)[0]), ('armor', C.gear_prices(t)[1]), ('shield', C.gear_prices(t)[2])] if t > 1 else [('shield', 35)]
                miss = [(sl, pr) for sl, pr in gear if sl not in owned_gear]
                if miss and S['gold'] - reserve() >= miss[0][1]: return True
                if spells_on and not miss:
                    a = avail_spells()
                    keep = reserve() + (sum(C.gear_prices(t+1)) if opt.get('save_next_gear') and t < 9 else 0)
                    if a and S['gold'] - a[0]['price'] >= keep: return True
                return False
            def shop_trip(home):
                """v3.9 (no free warp): walk to a town if it is close, else fly there with a Return Feather and fly (or walk) back to the last inn."""
                if W.get('in_trip') or not want_shop(): return
                towns = [k for k in T.towns if full_shop(k) and k in W['visited'] and k != W['pos']]
                if not towns: return
                W['in_trip'] = True
                try:
                    best = min((len(risk_path(W['pos'], k)[1] or [0]*99), k) for k in towns); dist, town = best
                    if dist <= opt.get('walk_shop_max', 6):
                        R['shop_walks'] = R.get('shop_walks', 0) + 1
                        rp = risk_path(W['pos'], town)[1]
                        for e, nxt in rp:
                            if not hop(e, backtrack=True): return
                            W['pos'] = nxt; arrive(nxt)
                        if W['pos'] == town: goto(home)
                    elif S.get('feather', 0) >= 1:
                        S['feather'] -= 1; R['feathers'] += 1; R['shop_flights'] = R.get('shop_flights', 0) + 1; add_sec(RF.get('useSec', 3))
                        W['pos'] = town; arrive(town)
                        if S.get('feather', 0) >= 1:
                            S['feather'] -= 1; R['feathers'] += 1; add_sec(RF.get('useSec', 3)); W['pos'] = W['last_inn']
                        else: goto(W['last_inn'])
                    else: R['shop_skipped'] = R.get('shop_skipped', 0) + 1
                finally: W['in_trip'] = False
            n_local = len(Z['words']) if Z.get('words') else C.LOC_SIZES[t][loc]     # level/0.2 maps carry their own (editable) word list
            local = [C.Item(uid+k, L.ways) for k in range(n_local)]; uid += n_local; q_words_pool += local
            m0 = tq_minutes()
            ways = ['rZE', 'sEZ'] if speech else ['rZE', 'rEZ']
            for it in local:
                for w in ways: L.answer(it, w, practice=True); stats['practice_q'] += 1
            rslots = 0 if (t == 1 and loc == 0) else C.REVIEW_SLOTS[t]
            def add_sec(s): stats['walk_sec'] = stats.get('walk_sec', 0) + s
            ready = lambda: C.pool_score(L, local, 'items') >= thresh
            def cond(c):
                if not c: return True
                k, v = next(iter(c.items()))
                if k == 'all': return all(cond(x) for x in v)
                if k == 'any': return any(cond(x) for x in v)
                if k == 'not': return not cond(v)
                if k == 'questActive': return v in W['qa'] and v not in W['qd']
                if k in ('questDone', 'questClaimed'): return v in W['qd']
                if k == 'bossDefeated': return v in [z['id'] for z in T.zones[:zi]] or v in W.get('zones_done', set())
                if k in ('readinessAtLeast', 'wordsReady'): return ready()
                if k == 'hasItem': return W['items'][v] > 0
                if k == 'visited': return v in W['visited']
                if k == 'flag': return v in W.get('flags', set())
                return False
            def eligible(e, node, first):
                if not cond(e.get('cond')): return False
                if e.get('on') == 'firstEnter' and not first: return False
                key = e.get('_key')
                if e.get('once'): return key not in W['once']
                if e.get('cooldown'): return W['visits'][node] - W['last_fire'].get(key, -99) >= e['cooldown']
                return True
            def complete(q):
                if q in W['qd'] or q not in WG.QV2: return
                W['qd'].add(q); rw = WG.QV2[q].get('rewards', {}); g = round(rw.get('gold', {}).get('G', 0)*C.gold_per_enemy(t)); S['gold'] += g; R['gold_side'] += g
                its = rw.get('items') or {}
                S['potions'] += its.get('honey', 0)
                if its.get('feather'): S['feather'] = min(RF['carry'], S.get('feather', 0) + its['feather'])
            def safe_home(node):       # after a boss / mini-boss clear: the way you came (walked edges) back to the nearest inn stays quiet
                prev = {node: None}; q = collections.deque([node]); hit = None
                while q:
                    u = q.popleft()
                    if u in T.inns and u != node: hit = u; break
                    for e, v in T.adj[u]:
                        if v in prev or not (e in W['cleared'] or T.E[e]['safe']): continue
                        prev[v] = (u, e); q.append(v)
                v = hit
                while v is not None and prev[v]:
                    u, e = prev[v]; W['safe_until'][e] = W['hops'] + safe_hops; v = u
            def run(e, node, outcome):
                add_sec(RU['eventSec'].get(outcome, 0))
                for a in e.get('do', []):
                    k = next(iter(a))
                    if k == 'offerQuest':
                        if explorer: W['qa'].add(a[k])
                    elif k == 'giveItem':
                        it = a[k]; R['items_found'] += 1
                        if it == 'honey': S['potions'] += a.get('qty', 1)
                        elif it == 'feather': S['feather'] = min(3, S.get('feather', 0) + 1)
                        else:
                            W['items'][it] += 1
                            if a.get('quest') in W['qa']: complete(a['quest'])
                    elif k == 'openChest':
                        R['items_found'] += 1; C.open_chest(t, S, 'normal' if a[k] == 'chest_normal' else 'locboss', rng)
                    elif k == 'fight' and a[k].get('kind') == 'tutorial':
                        fight('normal', local, rslots, loc, elite=False); R['path_battles'] += 1; R['tutorial'] = 1
                    elif k == 'fight':
                        won, _ = fight('normal', local, rslots, loc, elite=True); R['side_battles'] += 1; R['minis'] += 1
                        if not won: wake(); return False
                        if a.get('quest'): complete(a['quest'])
                        safe_home(node)
                    elif k == 'giveGold':
                        g = round(a[k]['G']*C.gold_per_enemy(t)); S['gold'] += g; R['gold_side'] += g
                    elif k == 'setFlag': W.setdefault('flags', set()).add(a[k])
                return True
            def arrive(node):
                first = node not in W['visited']
                W['visited'].add(node); W['visits'][node] += 1
                n = T.N[node]
                if n['kind'] in ('town', 'village'): shop_at(node)
                for e in T.EV.get(node, []):
                    if e.get('on', 'enter') not in ('enter', 'firstEnter'): continue
                    e['_key'] = f"{node}#{e['id']}"
                    if not eligible(e, node, first): continue
                    if 'pick' in e:
                        cand = []
                        for j, p in enumerate(e['pick']):
                            p['_key'] = f"{e['_key']}#{j}"
                            if eligible(p, node, first): cand.append(p)
                        if not cand: continue
                        x = rng.random()*sum(p['weight'] for p in cand); ch = cand[-1]
                        for p in cand:
                            x -= p['weight']
                            if x <= 0: ch = p; break
                        if ch.get('once'): W['once'].add(ch['_key'])
                        W['last_fire'][ch['_key']] = W['visits'][node]
                        return run(ch, node, ch.get('outcome', 'nothing'))
                    ok = run(e, node, e.get('outcome', 'nothing'))
                    if ok:
                        if e.get('once'): W['once'].add(e['_key'])
                        W['last_fire'][e['_key']] = W['visits'][node]
                    return ok
                return True
            def wake():
                W['pos'] = W['last_inn']; W['safe_until'].clear()
                if W['last_inn'] != Z['approach']: W['armed'] = True
            def hop(e, backtrack=False):
                opt.get('trace') and print('hop', e, 'bt' if backtrack else '', 'fresh' if e not in W['cleared'] else 'cleared', 'safe' if T.E[e]['safe'] else '', W['enc'])
                E = T.E[e]; add_sec(RU['walkSecPerHop'] + RU['walkSecPerStep']*E['steps']*(E['kind'] not in ('stairs', 'portal'))); R['hops'] += 1; W['hops'] += 1
                fresh0 = e not in W['cleared']; done0 = W['prog'].get(e, 0) if not backtrack else 0
                crossing = W['cross'][e]; W['cross'][e] += 1
                if engine_pity and not E['safe'] and W.get('bz') != E['pool']:   # engine: budget + pity reset when the edge's word pool changes
                    W['bz'] = E['pool']; W['enc'] = 0; W['pity'] = 0
                for step in range(E['steps']):
                    fresh = fresh0 and step >= done0
                    forced = legacy and bool(E.get('scripted')) and bool(Z.get('scriptedElite')) and e not in W['scripted'] and step + 1 >= E['scripted'].get('step', 1)
                    if E['safe'] or (W['safe_until'].get(e, -1) >= W['hops'] and not forced): continue
                    spent = W['enc'] >= budget
                    rate = E['p'] * pmult * (cmult if not fresh else bmult if spent else 1)
                    if fresh and not spent and W['pity'] >= pity_n: rate = 1.0
                    if opt.get('trace'): print('  roll', e, step, round(rate,2), 'safe_until' if W['safe_until'].get(e,-1)>=W['hops'] else '')
                    draw = (lambda: WG.roll(f"{seed}|{E['graph']}|{E['id']}|{crossing}|{step}")) if erng else rng.random   # no draw when forced (keeps v3.9.1 streams)
                    if forced or draw() < min(1.0, rate):
                        won, _ = fight('normal', local, rslots, loc, elite=bool(forced))
                        if forced: W['scripted'].add(e)
                        elif fresh: W['enc'] += 1
                        if backtrack or not fresh: R['back_battles'] += 1
                        elif e in MAIN: R['path_battles'] += 1
                        else: R['side_battles'] += 1
                        if not won: wake(); return False
                        if not engine_pity or fresh: W['pity'] = 0
                        if not backtrack and fresh0 and step < E['steps'] - 1 and opt.get('turn_back', True) and need_rest():
                            W['prog'][e] = step + 1; add_sec(RU['walkSecPerStep']*(step + 1)); R['turn_backs'] = R.get('turn_backs', 0) + 1
                            return None          # turn back to the start node (steps already walked stay 'cleared')
                    elif fresh: W['pity'] += 1
                W['cleared'].add(e); W['prog'].pop(e, None)
                return True
            def need_rest(before_boss=False):
                tea_kid = v34 and style.endswith('tea')
                if tea_kid and before_boss and S['bigtea'] > 0 and S['spells'] and S['mp'] < 0.6*h['MP']:
                    R['tea_used'] += 1; S['bigtea'] -= 1; S['mp'] = h['MP']
                if S['tea'] > 0 and S['spells'] and before_boss and S['mp'] < (0.75 if tea_kid else 0.5)*h['MP'] and S['hp'] >= pol['inn_below']*h['HP']:
                    R['tea_used'] += 1; S['tea'] -= 1; S['mp'] = min(h['MP'], S['mp'] + 0.5*h['MP'])
                low = S['hp'] < (opt.get('boss_inn_below', 0.8) if before_boss else pol['inn_below'])*h['HP'] or (S['mp'] < C.MPCFG['heal'] and S['heal'] and S['hp'] < 0.7*h['HP'])
                if before_boss and v34 and style.startswith('save') and S['spells'] and S['mp'] < opt.get('boss_inn_mp', 0.6)*h['MP']: low = True
                return low
            def rest_at(n):
                price = C.inn_price(t)
                if S['gold'] >= price:
                    S['gold'] -= price; R['inn_paid'] += 1; restore()
                    while S['potions'] < pol['keep_potions'] and S['gold'] >= C.potion_price(t) + price:
                        S['gold'] -= C.potion_price(t); S['potions'] += 1
                else:
                    R['inn_free'] += 1; restore()
                    if S['potions'] == 0: S['potions'] = 1
                W['last_inn'] = n; W['safe_until'].clear()
                if n != Z['approach']: W['armed'] = True
                if T.N[n]['kind'] not in ('town', 'village'): shop_trip(n)
            def risk_path(a, b):
                bl = T.blocked(zi); best = {a: (0.0, None)}; pq = [(0.0, a)]; done = set()
                while pq:
                    c, u = heapq.heappop(pq)
                    if u in done: continue
                    done.add(u)
                    if u == b: break
                    for e, v in T.adj[u]:
                        if e in bl: continue
                        E = T.E[e]; r = 0 if E['safe'] or W['safe_until'].get(e, -1) >= W['hops'] else E['p']*(cmult if e in W['cleared'] else 1)
                        nc = c + 1 + 6*r*E['steps']
                        if v not in best or nc < best[v][0]: best[v] = (nc, (u, e)); heapq.heappush(pq, (nc, v))
                if b not in best: return 1e9, None
                out = []; v = b
                while best[v][1]: u, e = best[v][1]; out.append((e, v)); v = u
                return best[b][0], out[::-1]
            def trip_to(targets, kind):
                """Go to the cheapest of targets (inns or towns): walk back over cleared ground, or fly with a Return Feather when far."""
                if W['pos'] in targets: return W['pos']
                best = min((risk_path(W['pos'], i)[0], i) for i in targets); dest = best[1]; rp = risk_path(W['pos'], dest)[1]
                if rp is None: return None
                dist = len(rp)
                if S.get('feather', 0) > opt.get('rest_feather_reserve', 1) and (dist >= 4 or best[0] - dist >= 3) and W['last_inn'] in targets:
                    S['feather'] -= 1; R['feathers'] += 1; W['pos'] = W['last_inn']; return W['pos']
                R['inn_walk_hops'] += dist
                for e, nxt in rp:
                    if not hop(e, backtrack=True): return None
                    W['pos'] = nxt; arrive(nxt)
                    if W['pos'] != nxt: return None
                return dest
            def rest_trip():
                R['inn_trips'] += 1
                d = trip_to(T.inns, 'inn')
                if d: rest_at(d)
            def goto(target):
                for _ in range(2000):
                    if W['pos'] == target: return True
                    p = T.path(W['pos'], target, zi)
                    if not p: return False
                    e, nxt = p[0]
                    r = hop(e)
                    if r is None: rest_trip(); continue
                    if not r: continue
                    W['pos'] = nxt
                    arrive(nxt)
                    if W['pos'] == nxt and need_rest(): rest_trip()
                return W['pos'] == target
            MAIN = {e for e, _ in (T.path(W['pos'], Z['approach'], zi) or [])}
            if loc == 0:
                arrive(T.entry); between()
            elif need_rest(): rest_trip()
            # ---- walk the zone
            if explorer:
                todo = [k for k, n in T.N.items() if n.get('zone') == Z['id'] and n['kind'] != 'boss']
                for _ in range(len(todo) + 5):
                    left = [k for k in todo if k not in W['visited'] and T.path(W['pos'], k, zi) is not None]
                    if not left: break
                    goto(min(left, key=lambda k: (len(T.path(W['pos'], k, zi)), todo.index(k))))
            assert goto(Z['approach']), ('no route to approach', Z['id'], W['pos'])
            # ---- boss approach (Train happens at the approach node; the gate edge itself has no random battles)
            pat = 0; first = True; kind = Z['bossKind']
            def patrol():
                nonlocal pat
                won, _ = fight('normal', local, rslots, loc, elite=legacy and rng.random() < C.ELITE_PATROL_CHANCE); pat += 1
                if not won: wake()
                return won
            def at_gate():
                nonlocal first
                for _ in range(60):
                    if W['pos'] != Z['approach']: goto(Z['approach'])
                    if first: R['ready_gate'].append(C.pool_score(L, local, 'items')); first = False
                    if W['armed'] and not ready() and opt.get('patrols', True):
                        W['armed'] = False; ok = True
                        for i in range(opt.get('forced', 2)):
                            if not patrol(): ok = False; break
                        if not ok: continue
                    W['armed'] = False
                    return
            at_gate()
            for _ in range(300 if opt.get('patrols', True) else 0):
                if ready() or pat >= pol['max_patrols']: break
                at_gate()
                if need_rest(): rest_trip(); continue
                patrol()
            at_gate()
            if need_rest(before_boss=True): rest_trip(); at_gate()
            R['ready_boss'].append(C.pool_score(L, local, 'items'))
            R['loc_pre'].append(dict(id=Z['id'], kind=Z['bossKind'], patrol=pat, mini=R['minis'] - b0['mini'], all=R['battles'] - b0['all'],
                                     rand=R['path_battles'] + R['side_battles'] + R['back_battles'] - R['minis'] - R.get('tutorial', 0) - b0['rand']))
            resume = False
            for attempt in range(12):
                at_gate(); add_sec(RU['walkSecPerHop']); R['hops'] += 1
                won, cp = fight(kind, local, rslots + 1, loc, resume)
                if attempt == 0: R['boss_first'] += won
                if won: break
                wake(); resume = (resume or cp) if legacy_cp else False   # v3.9.1 half-HP checkpoint only under v391_rules; cp is its state, not a bool
            zi = loc + 1
            W['pos'] = Z['boss']; W['visited'].add(Z['boss']); safe_home(Z['boss'])
            # realm-boss Feather: world data = world_rules.realmBossFeather (realms 3/6/8); level/0.2 maps = the boss node's own on:clear event
            fq = Z['clearFeather'] if 'clearFeather' in Z else (RU['realmBossFeather'].get('qty', 1) if Z['bossKind'] == 'realmboss' and t in RU.get('realmBossFeather', {}).get('realms', []) else 0)
            if fq and not opt.get('no_boss_feather'):
                S['feather'] = min(RF['carry'], S.get('feather', 0) + fq); R['feathers_found'] = R.get('feathers_found', 0) + 1
            R['patrols'] += pat
            prior += local
            # shopping after a zone boss (v3.9: walk if a town is close, else Return Feather there and back)
            if loc < C.LOCS[t] - 1: shop_trip(W['last_inn'])
            R['loc_min'].append(tq_minutes() - m0)
        def fight(kind, local, rslots, loc, resume=False, elite=False):
            nonlocal drops
            S['species'] = LOC_SPECIES[(t, loc)]
            qset = C.choose_set(L, local, prior, rslots, rng)
            st0 = dict(stats); k_before = collections.Counter(stats['kills']); S['_sw'] = False; S['_casts'] = 0; S['_bq'] = 0; S['_bcorrect'] = 0; S['_last_cast_q'] = 0; S['_last_turn_cast'] = False
            R['mp_start'].append(S['mp']/h['MP'])
            R['can_cast'].append(bool(S['spells']) and S['mp'] >= min(sp['mp'] for sp in S['spells']))
            qb = stats['q']; hp0 = S['hp']
            if kind != 'normal': R['boss_mp_start'].append(S['mp']/h['MP'])
            won, g, c, cp = C.battle(t, S, L, qset, kind, rng, stats, resume, elite=elite)
            R['battles'] += 1; R['casts'] += stats.get('spell_casts', 0) - st0.get('spell_casts', 0)
            R['turns'].append(('boss' if kind != 'normal' else 'elite' if elite else 'normal', stats['q'] - qb, stats.get('spell_casts', 0) - st0.get('spell_casts', 0), stats['potions_used'] - st0['potions_used'], stats['correct'] - st0['correct'], stats.get('hero_q', 0) - st0.get('hero_q', 0)))
            R['fizzles'] += stats.get('fizzles', 0) - st0.get('fizzles', 0); R['heals'] += stats['heals'] - st0['heals']
            R['spell_dmg'] += stats.get('spell_dmg', 0) - st0.get('spell_dmg', 0)
            if len(owned_gear) >= (1 if t == 1 else 3): R['battles_full_gear'] += 1
            if kind != 'normal':
                R['boss_fights'] += 1; R['boss_wins'] += won; R['boss_q'].append(stats['q'] - qb)
                R['boss_hp_lost'].append((hp0 - (S['hp'] if won else 0))/h['HP']); R['boss_casts'].append(stats.get('spell_casts', 0) - st0.get('spell_casts', 0))
            else: R['normal_q'].append(stats['q'] - qb)
            newk = stats['kills'] - k_before
            drops += sum(1 for _ in range(newk[qs['collect']['target']]) if rng.random() < D.QUEST_RULES['collect_drop'])
            S['gold'] += g; R['income'] += g
            for _ in range(c): C.open_chest(t, S, kind if won and kind != 'normal' else 'normal', rng)
            check_quests()
            if S['gold'] < 1 and R['battles'] > 5: R['gold_zero'] += 1
            R['min_gold'] = min(R['min_gold'], S['gold'])
            if not won: defeat()
            elif not (world and opt.get('village_shop', True)): shop()
            out['events'].append((t, round(tq_minutes(), 1), round(S['gold'])))
            return won, cp
        for loc in range(C.LOCS[t]):
            if world: world_zone(loc); continue
            n_local = C.LOC_SIZES[t][loc]
            local = [C.Item(uid+k, L.ways) for k in range(n_local)]; uid += n_local; q_words_pool += local
            m0 = tq_minutes()
            ways = ['rZE', 'sEZ'] if speech else ['rZE', 'rEZ']
            for it in local:
                for w in ways: L.answer(it, w, practice=True); stats['practice_q'] += 1
            rslots = 0 if (t == 1 and loc == 0) else C.REVIEW_SLOTS[t]
            cleared = 0
            while cleared < 8:
                won, _ = fight('normal', local, rslots, loc, elite=(loc == C.LOCS[t]-1 and cleared == 4))
                if won: cleared += 1; between()
            pat = 0; R['ready_gate'].append(C.pool_score(L, local, 'items'))
            while C.pool_score(L, local, 'items') < thresh and pat < pol['max_patrols']:
                fight('normal', local, rslots, loc, elite=rng.random() < C.ELITE_PATROL_CHANCE); pat += 1; between()
            R['patrols'] += pat; R['path_battles'] += 8
            kind = 'realmboss' if loc == C.LOCS[t]-1 else 'locboss'
            between(before_boss=True); resume = False; R['ready_boss'].append(C.pool_score(L, local, 'items'))
            for attempt in range(12):
                won, cp = fight(kind, local, rslots + 1, loc, resume)
                if attempt == 0: R['boss_first'] += won
                if won: break
                resume = resume or cp; between(before_boss=True)
            between()
            prior += local
            R['loc_min'].append(tq_minutes() - m0)
        delivery_due = D.QUESTS[[q['id'] for q in D.QUESTS].index(f'q{t}_delivery')]['reward_gold']
        R['gold_end'] = S['gold']; R['spells_owned'] = [s['id'] for s in S['spells']]; R['minutes'] = tq_minutes() - R['min0']
        R['prof_end'] = sum(L.proficient(i) for i in q_words_pool)/max(1, len(q_words_pool)); R['q_realm'] = stats['q'] - R['q0']
        R['quests_done'] = len(quests_done); R['quest_types'] = sorted(quests_done)
        out['realms'].append(R)
    out['total_minutes'] = tq_minutes()
    return out

def run(cfgs, n, procs=None):
    jobs = [(c, s) for c in cfgs for s in range(n)]
    with Pool(procs) as pool:
        res = pool.map(campaign, [tuple(c[:4]) + (1000*s + 7,) + (c[4] if len(c) > 4 else {},) for c, s in jobs])
    out = collections.defaultdict(list)
    for (c, s), r in zip(jobs, res): out[tuple(map(str, c[:4])) + (json.dumps(c[4] if len(c) > 4 else {}),)].append(r)
    return out
