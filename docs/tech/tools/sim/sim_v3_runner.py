"""Experiment runner for combat_sim v3 (curriculum v2 pools). Usage: python sim_v3_runner.py <section> [n]"""
import sys, statistics
import combat_sim as C
from multiprocessing import Pool
ACC = (0.5, 0.65, 0.75, 0.9)
def jobs_for(cfgs, n):
    J = []
    for ci, c in enumerate(cfgs):
        t, p, sp, nk, pol, thr, met, ws, opt = c
        for i in range(n):
            J.append((t, p, sp, C.NETS[nk], 'total', thr, (7919*i + 104729*ci) % 1000003, C.POLICIES[pol], met, ws, opt))
    return J
def run(cfgs, n):
    with Pool() as pool: res = pool.map(C.run_realm, jobs_for(cfgs, n), chunksize=4)
    return [C.summarize(res[k*n:(k+1)*n]) for k in range(len(cfgs))]
def fmt(v): return (f"{v:.0f}" if abs(v) >= 100 else f"{v:.2f}") if isinstance(v, float) else str(v)
def table(title, cols, rows):
    print(f"\n### {title}\n"); print("| " + " | ".join(cols) + " |"); print("|" + "---|"*len(cols))
    for r in rows: print("| " + " | ".join(fmt(x) for x in r) + " |")
    sys.stdout.flush()
if __name__ == '__main__':
    sec = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 150
    if sec == 'mp':
        cfgs = [(t, p, sp, 'nets+', 'saver', 0, 'rec3', 10, dict(mp=mp, practice='light')) for t in (1, 2, 5, 9) for sp in (True, False) for p in ACC for mp in ('v2', 'regen_v2costs', 'regen_a', 'regen_b', 'regen_c')]
        out = run(cfgs, n)
        table("MP regen and cost rebalance (saver kid, nets+, companion on, spoken cap 50%)",
              ['tier', 'acc', 'speech', 'MP preset', 'defeat rate', 'battles between restores', 'heals per battle', 'upkeep share', 'gear gold', 'companion attacks per battle'],
              [(c[0], c[1], 'on' if c[2] else 'off', c[8]['mp'], s['defeat_rate'], s['btw_inn'], s['heals_pb'], s['upkeep'], s['gear'], s['companion_pb']) for c, s in zip(cfgs, out)])
    if sec == 'companion':
        cfgs = [(t, p, sp, nk, pol, 0, 'rec', 10, dict(companion=co)) for t in (1, 5, 9) for sp in (True, False) for p in ACC for co in (False, True) for (nk, pol) in (('nets+', 'spender'),)]
        out = run(cfgs, n)
        table("Companion team attack on/off (spender kid, nets+, MP preset regen_b)",
              ['tier', 'acc', 'speech', 'companion', 'defeat rate', 'battles between restores', 'companion attacks per battle', 'questions per location', 'stuck', 'gold hit 0 (runs)'],
              [(c[0], c[1], 'on' if c[2] else 'off', 'on' if c[8]['companion'] else 'off', s['defeat_rate'], s['btw_inn'], s['companion_pb'], s['q_loc'], s['stuck'], s['gold_zero_runs']) for c, s in zip(cfgs, out)])
    if sec == 'spokencap':
        cfgs = [(t, p, True, 'nets+', 'saver', 0, 'rec3', 10, dict(spoken_cap=cap, practice='light')) for t in (1, 5, 9) for p in ACC for cap in (None, 0.5)]
        out = run(cfgs, n)
        table("Spoken-share cap per battle (speech on, saver, nets+)",
              ['tier', 'acc', 'cap', 'spoken share', 'in-battle accuracy', 'defeat rate', 'patrols per location', 'minutes per location', 'items proficient at end'],
              [(c[0], c[1], 'none' if c[8]['spoken_cap'] is None else '50%', s['spoken'], s['acc'], s['defeat_rate'], s['pat_loc'], s['minutes'], s['final_prof']) for c, s in zip(cfgs, out)])
    if sec == 'learn':
        rows = []; cfgs = []
        for pol in ('saver', 'spender'):
          for t in (1, 2, 5, 9):
            for sp in (True, False):
                for p in ACC:
                    for pr in (('none', 'light', 'full') if pol == 'saver' else ('light',)):
                        cfgs.append((t, p, sp, 'nets+', pol, 0, 'rec3', 10, dict(practice=pr)))
        out = run(cfgs, n)
        table("Boss-approach patrols and time per location, v3 defaults (curriculum v2 pools, readiness over the location's own pool, trigger 25% speech on / 40% reading-only, 8 path fights). saver = trains until the trigger clears (cap 40); spender = goes to the boss after the 2 forced patrols",
              ['kid', 'tier', 'acc', 'speech', 'practice', 'patrols per location', 'p90 patrols', 'battle questions per location', 'minutes per location', 'items proficient at end', 'defeat rate'],
              [(c[4], c[0], c[1], 'on' if c[2] else 'off', c[8]['practice'], s['pat_loc'], s['pat_p90'], s['q_loc'], s['minutes'], s['final_prof'], s['defeat_rate']) for c, s in zip(cfgs, out)])
    if sec == 'tune':
        cfgs = []
        for t in (1, 5):
            for p in (0.65, 0.75):
                for sp, thr in ((True, 0.25), (True, 0.20), (False, 0.40), (False, 0.30)):
                    for ws in (10, 14):
                        for path in (6, 8):
                            cfgs.append((t, p, sp, 'nets+', 'saver', thr, 'items', ws, dict(path=path, practice='light')))
        out = run(cfgs, n)
        table("Tuning with v2 pools (light practice on): trigger x working set x path fights",
              ['tier', 'acc', 'speech', 'trigger', 'working set', 'path fights', 'patrols per location', 'minutes per location', 'items proficient at end'],
              [(c[0], c[1], 'on' if c[2] else 'off', c[5], c[7], c[8]['path'], s['pat_loc'], s['minutes'], s['final_prof']) for c, s in zip(cfgs, out)])
    if sec == 'econ':
        cfgs = [(t, p, sp, nk, pol, 0, 'rec3', 10, dict(practice='light')) for (pol, nk) in (('spender', 'none'), ('spender', 'nets+'), ('saver', 'nets+')) for t in (1, 2, 5, 9) for sp in (True, False) for p in ACC]
        out = run(cfgs, n)
        table("Economy / death spiral, v3 defaults (MP regen_b, companion on, spoken cap 50%, light practice, v2 pools)",
              ['kid', 'nets', 'tier', 'acc', 'speech', 'in-battle acc', 'battles', 'defeat rate', 'battles between restores', 'inn paid', 'inn free', 'stuck', 'gold hit 0 (runs)', 'min gold (median)', 'gold @10', 'gold @20', 'end gold', 'gear gold', 'upkeep share', 'minutes per location'],
              [(c[4], c[3], c[0], c[1], 'on' if c[2] else 'off', s['acc'], s['battles'], s['defeat_rate'], s['btw_inn'], s['inn_paid'], s['inn_free'], s['stuck'], s['gold_zero_runs'], s['min_gold'], s['g10'], s['g20'], s['end_gold'], s['gear'], s['upkeep'], s['minutes']) for c, s in zip(cfgs, out)])
    if sec == 'tune2':
        cfgs = []
        for t in (1, 5, 9):
            for p in (0.65, 0.75, 0.9):
                for sp, variants in ((True, (('items', 0.25), ('local', 0.25), ('local', 0.20), ('local', 0.15))), (False, (('items', 0.40), ('local', 0.40), ('local', 0.30)))):
                    for met, thr in variants:
                        for pr in ('none', 'light', 'full'):
                            cfgs.append((t, p, sp, 'nets+', 'saver', thr, met, 10, dict(practice=pr)))
        out = run(cfgs, n)
        table("Trigger metric x threshold x practice (saver trains to trigger, cap 40 patrols; v2 pools)",
              ['tier', 'acc', 'speech', 'metric', 'trigger', 'practice', 'patrols per location', 'battle questions per location', 'minutes per location', 'items proficient at end'],
              [(c[0], c[1], 'on' if c[2] else 'off', 'local+carry' if c[6] == 'items' else 'local only', c[5], c[8]['practice'], s['pat_loc'], s['q_loc'], s['minutes'], s['final_prof']) for c, s in zip(cfgs, out)])
    if sec == 'comp2':
        cfgs = []
        for t in (2, 5, 9):
            for sp in (True, False):
                for p in ACC:
                    for cv in ('off', 'c25x1.5', 'c20x1.25', 'c20x1.0'):
                        cfgs.append((t, p, sp, 'nets+', 'spender', 0, 'rec3', 10, dict(companion=cv != 'off', comp=cv, practice='light', elites=True)))
        out = run(cfgs, n)
        table("Companion gauge variants (spender, nets+, v3 defaults)",
              ['tier', 'acc', 'speech', 'companion', 'defeat rate', 'battles between restores', 'companion attacks per battle', 'battle questions per location'],
              [(c[0], c[1], 'on' if c[2] else 'off', c[8]['comp'], s['defeat_rate'], s['btw_inn'], s['companion_pb'], s['q_loc']) for c, s in zip(cfgs, out)])
    if sec == 'specials':
        import json, random
        E = {e['id']: e for e in json.load(open('/workspace/desy/enemies.json'))}
        def F(eid, kind, **kw):
            e = E[eid]; d = dict(HP=e['hp'], ATK=e['atk'], DEF=e['def'], kind=kind); d.update(kw); return d
        tests = [
            ('queen_bee', 2, 'realmboss', [F('queen_bee', 'realmboss'), F('giant_bee', 'normal')]),
            ('hydra', 5, 'realmboss', [F('hydra', 'realmboss'), F('bog_lizard', 'normal'), F('bog_lizard', 'normal')]),
            ('shadow_dragon', 9, 'locboss', [F('shadow_dragon', 'locboss'), F('imp', 'normal')]),
            ('troll', 8, 'normal', [F('arena_troll', 'normal', regrow=True), F('arena_troll', 'normal', regrow=True)]),
            ('queen_bee_v3', 2, 'realmboss', [F('queen_bee', 'realmboss'), F('giant_bee', 'normal')]),
            ('shadow_dragon_focus', 9, 'locboss', [F('shadow_dragon', 'locboss'), F('imp', 'normal')]),
            ('troll_tag', 8, 'normal', [F('arena_troll', 'normal', regrow=True), F('arena_troll', 'normal', regrow=True)]),
        ]
        rows = []
        for name, t, kind, foes in tests:
            for p in ACC:
                for on in (False, True):
                    wins = 0; qs = []; hpl = []; summ = 0; N = n * 10
                    for i in range(N):
                        rng = random.Random(i * 7 + 13)
                        C.MPCFG = dict(C.MP_PRESETS[C.DEFAULT_MP]); C.COMPANION = dict(C.COMPANION_DEFAULT); C.SPOKEN_CAP = 0.5
                        L = C.Learner(p, True, 'total', rng); h = C.hero_stats(t)
                        S = dict(hero=h, hp=h['HP'], mp=h['MP'], gold=0, potions=1, heal=t >= 2, shield=t >= 2)
                        items = [C.Item(k, L.ways) for k in range(7)]
                        for it in items:
                            for w in L.ways: it.corr[w] = 1; it.att[w] = 2
                        st = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0)
                        won, g, c, cp = C.battle(t, S, L, items, kind, rng, st, foes_override=foes, special=name if on else None)
                        wins += won; qs.append(st['q']); hpl.append(1 - max(0, S['hp'])/h['HP']); summ += st.get('summons', 0)
                    rows.append((name, t, p, 'on' if on else 'off', wins/N, statistics.mean(qs), statistics.mean(hpl), summ/N))
        table("Special mechanics vs the same fight without them (single battle from full HP/MP, 1 potion, speech on, companion on; roster stats from enemies.json)",
              ['mechanic', 'tier', 'acc', 'special', 'win rate', 'questions', 'HP lost (share of max)', 'summons per fight'], rows)
    if sec == 'realms':
        cfgs = [(t, p, sp, 'nets+', pol, 0, 'rec3', 10, dict(practice='light')) for t in range(1, 10) for sp in (True, False) for pol in ('saver', 'spender') for p in (0.65, 0.75)]
        out = run(cfgs, n)
        table("Per-realm summary, v3 defaults (light practice, readiness over own pool, 25% / 40% trigger, 8 path fights, MP regen, companion, spoken cap 50%, elites)",
              ['tier', 'speech', 'kid', 'acc', 'patrols per location', 'battle questions per location', 'minutes per location', 'defeat rate', 'battles between restores', 'items proficient at boss'],
              [(c[0], 'on' if c[2] else 'off', c[4], c[1], s['pat_loc'], s['q_loc'], s['minutes'], s['defeat_rate'], s['btw_inn'], s['final_prof']) for c, s in zip(cfgs, out)])
    if sec == 'elites':
        import random
        rows = []
        for t in (1, 2, 5, 9):
            for p in ACC:
                for el in (False, True):
                    wins = 0; qs = []; hpl = []; N = n * 10
                    for i in range(N):
                        rng = random.Random(i * 11 + 5)
                        C.MPCFG = dict(C.MP_PRESETS[C.DEFAULT_MP]); C.COMPANION = dict(C.COMPANION_DEFAULT); C.SPOKEN_CAP = 0.5
                        L = C.Learner(p, True, 'total', rng); h = C.hero_stats(t)
                        S = dict(hero=h, hp=h['HP'], mp=h['MP'], gold=0, potions=1, heal=t >= 2, shield=t >= 2)
                        items = [C.Item(k, L.ways) for k in range(7)]
                        for it in items:
                            for w in L.ways: it.corr[w] = 1; it.att[w] = 2
                        st = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0)
                        won, g, c, cp = C.battle(t, S, L, items, 'normal', rng, st, elite=el)
                        wins += won; qs.append(st['q']); hpl.append(1 - max(0, S['hp'])/h['HP'])
                    rows.append((t, p, 'with elite' if el else 'normal only', wins/N, statistics.mean(qs), statistics.mean(hpl)))
        table("Elite fight vs the same normal fight (single battle from full HP/MP, 1 potion, speech on, companion on; the elite replaces one normal enemy)",
              ['tier', 'acc', 'fight', 'win rate', 'questions', 'HP lost (share of max)'], rows)
        cfgs = [(t, p, True, 'nets+', 'saver', 0, 'rec3', 10, dict(practice='light', elites=el)) for t in (1, 5, 9) for p in (0.5, 0.65, 0.75) for el in (False, True)]
        out = run(cfgs, n)
        table("Elites on/off over a realm (saver, speech on, nets+, v3 defaults)",
              ['tier', 'acc', 'elites', 'defeat rate', 'battles between restores', 'minutes per location', 'gear gold'],
              [(c[0], c[1], 'on' if c[8]['elites'] else 'off', s['defeat_rate'], s['btw_inn'], s['minutes'], s['gear']) for c, s in zip(cfgs, out)])
