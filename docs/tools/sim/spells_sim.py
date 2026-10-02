"""v3.3 campaign simulator: purchasable spells + town quests (Jack's spell request, 2026-10-01 PT).
One run = realms 1-9 in a row with gold, potions, spells, gear and learned items carried over.
Reuses combat_sim.battle (campaign hooks: species, spell casts, Soaked, kill accounting) and the v3.2 learning model.
Gear model: the kid enters realm t wearing tier t-1 gear and buys the tier-t weapon (+3 ATK), armor (+2 DEF), shield (+1 DEF)."""
import sys, random, statistics, collections, json, math
from multiprocessing import Pool
sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import combat_sim as C
import spells_data as D
sys.path.insert(0, '/workspace/desy/build/v3/archive_v3_3')
import spells_data_v3_3 as D33

SPELL_BY_ID = {s['id']: s for s in D.SPELLS}
SEC_PER_CAST = 5.0     # v3.4: a free cast still takes a turn of animation
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
    strength = lambda s: s.get('power', s.get('mult'))
    tea_price = lambda t: (6 if v34 else 1)*C.gold_per_enemy(t)
    spells_on = mode in ('spend', 'refund')
    cosm = mode == 'off_cosm'
    rng = random.Random(seed)
    C.SPELL_POLICY.update(cast_rule=(opt.get('cast_rule', D.CAST_RULE) if v34 else None), boss_mult=opt.get('boss_mult', 1.0), max_casts=opt.get('max_casts'), keep_heal=opt.get('keep_heal', False), ward_minions=opt.get('ward_minions', False))
    C.MPCFG = dict(C.MP_PRESETS[C.DEFAULT_MP]); C.COMPANION = dict(C.COMPANION_DEFAULT); C.SPOKEN_CAP = 0.5; C.PATH_ENCOUNTERS = 8
    C.WORKING_SET = C.DEFAULT_WORKING_SET
    pol = dict(C.POLICIES[kid]); nets = C.NETS['nets+']
    order = opt.get('order', 'gear_first')
    L = C.Learner(p, speech, 'total', rng)
    S = dict(hero=None, hp=0, mp=0, gold=24, potions=1, heal=False, shield=False, campaign=True, species=None,
             spells=[], fizzle='refund' if mode == 'refund' else 'spend', tea=0)
    stats = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0, practice_q=0, kills=collections.Counter())
    prior = []; uid = 0
    out = dict(realms=[], spell_buys=[], affordable={}, events=[])
    tq_minutes = lambda: (stats['q']*C.SEC_PER_Q + stats['practice_q']*C.SEC_PER_PRACTICE_Q + (stats.get('spell_casts', 0)*SEC_PER_CAST if v34 else 0))/60
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
                 spell_dmg=0, dmg_share=[], loc_min=[], normal_q=[], tea_bought=0, tea_used=0, turns=[], mp_start=[], can_cast=[])
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
            if spells_on and kid == 'saver' and S['spells'] and S['tea'] < 1 and S['gold'] - tea_price(t) >= reserve():
                S['gold'] -= tea_price(t); S['tea'] += 1; R['tea_bought'] += 1
            if cosm and all(sl in owned_gear for sl, _ in gear):          # v3.2 behaviour: the rest goes to cosmetics
                while S['gold'] - round(1.5*C.inn_price(t)) >= reserve():
                    S['gold'] -= round(1.5*C.inn_price(t)); R['spent_cosm'] += round(1.5*C.inn_price(t))
        def between(before_boss=False):
            if S['tea'] > 0 and S['spells'] and (before_boss if v34 else True) and S['mp'] < (0.5 if v34 else 0.4)*h['MP'] and S['hp'] >= pol['inn_below']*h['HP']:
                R['tea_used'] += 1; S['tea'] -= 1; S['mp'] = min(h['MP'], S['mp'] + 0.5*h['MP'])
            low = S['hp'] < (0.8 if before_boss else pol['inn_below'])*h['HP'] or (S['mp'] < C.MPCFG['heal'] and S['heal'] and S['hp'] < 0.7*h['HP'])
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
        def fight(kind, local, rslots, loc, resume=False, elite=False):
            nonlocal drops
            S['species'] = LOC_SPECIES[(t, loc)]
            qset = C.choose_set(L, local, prior, rslots, rng)
            st0 = dict(stats); k_before = collections.Counter(stats['kills']); S['_sw'] = False; S['_casts'] = 0; S['_bq'] = 0; S['_bcorrect'] = 0; S['_last_cast_q'] = 0; S['_last_turn_cast'] = False
            R['mp_start'].append(S['mp']/h['MP'])
            R['can_cast'].append(bool(S['spells']) and S['mp'] >= min(sp['mp'] for sp in S['spells']))
            qb = stats['q']
            won, g, c, cp = C.battle(t, S, L, qset, kind, rng, stats, resume, elite=elite)
            R['battles'] += 1; R['casts'] += stats.get('spell_casts', 0) - st0.get('spell_casts', 0)
            R['turns'].append(('boss' if kind != 'normal' else 'elite' if elite else 'normal', stats['q'] - qb, stats.get('spell_casts', 0) - st0.get('spell_casts', 0), stats['potions_used'] - st0['potions_used'], stats['correct'] - st0['correct'], stats.get('hero_q', 0) - st0.get('hero_q', 0)))
            R['fizzles'] += stats.get('fizzles', 0) - st0.get('fizzles', 0); R['heals'] += stats['heals'] - st0['heals']
            R['spell_dmg'] += stats.get('spell_dmg', 0) - st0.get('spell_dmg', 0)
            if len(owned_gear) >= (1 if t == 1 else 3): R['battles_full_gear'] += 1
            if kind != 'normal':
                R['boss_fights'] += 1; R['boss_wins'] += won; R['boss_q'].append(stats['q'] - qb)
            else: R['normal_q'].append(stats['q'] - qb)
            newk = stats['kills'] - k_before
            drops += sum(1 for _ in range(newk[qs['collect']['target']]) if rng.random() < D.QUEST_RULES['collect_drop'])
            S['gold'] += g; R['income'] += g
            for _ in range(c): C.open_chest(t, S, kind if won and kind != 'normal' else 'normal', rng)
            check_quests()
            if S['gold'] < 1 and R['battles'] > 5: R['gold_zero'] += 1
            R['min_gold'] = min(R['min_gold'], S['gold'])
            if not won: defeat()
            else: shop()
            out['events'].append((t, round(tq_minutes(), 1), round(S['gold'])))
            return won, cp
        for loc in range(C.LOCS[t]):
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
            pat = 0
            while C.pool_score(L, local, 'items') < thresh and pat < pol['max_patrols']:
                fight('normal', local, rslots, loc, elite=rng.random() < C.ELITE_PATROL_CHANCE); pat += 1; between()
            R['patrols'] += pat
            kind = 'realmboss' if loc == C.LOCS[t]-1 else 'locboss'
            between(before_boss=True); resume = False
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
