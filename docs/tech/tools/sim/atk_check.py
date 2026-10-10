"""v3.6 check: v3.6 boss HP with boss ATK x1.0 / x0.9 / x0.8, no regen, same seeds. Prints defeat %, boss first-try, boss questions."""
import sys, json, statistics as st
sys.path[:0] = ['/workspace/desy/build', '/workspace/desy/build/v3']
import spells_sim as X
G = dict(save_next_gear=True); cfgs = []
for p in (0.5, 0.75):
    for kid in ('saver', 'spender'):
        for a in (1.0, 0.9):
            cfgs.append((p, True, kid, 'spend', dict(G, mp_style='free', boss_atk={'locboss': a, 'realmboss': a})))
res = X.run(cfgs, 150); out = {}
for c in cfgs:
    rs = res[tuple(map(str, c[:4])) + (json.dumps(c[4]),)]
    b = sum(x['battles'] for r in rs for x in r['realms']); d = sum(x['defeats'] for r in rs for x in r['realms'])
    bf = sum(x['boss_first'] for r in rs for x in r['realms']) / (len(rs) * sum(X.C.LOCS[t] for t in range(1, 10)))
    bq = st.mean([q for r in rs for x in r['realms'] for q in x['boss_q']])
    k = f"{c[0]} {c[2]} free atk x{c[4]['boss_atk']['locboss']}"; out[k] = dict(defeat=d/b, boss_first=bf, boss_q=bq)
    print(k, f'defeat {100*d/b:.1f}% boss1st {bf:.2f} bossq {bq:.1f}')
json.dump(out, open('/workspace/desy/build/v3/sim/v36_atk_check.json', 'w'), indent=1)
