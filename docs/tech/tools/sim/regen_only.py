"""v3.6 check: effect of removing MP regen alone (v3.5 boss HP/ATK), same seeds as spells_runner. Prints defeat %, heals per battle, boss first-try."""
import sys, json
sys.path[:0] = ['/workspace/desy/build', '/workspace/desy/build/v3']
import spells_sim as X
G = dict(save_next_gear=True)
cfgs = []
for p in (0.5, 0.75):
    for kid in ('saver', 'spender'):
        for regen in (1, 0):
            cfgs.append((p, True, kid, 'off', dict(regen=regen, boss_hp=False, boss_atk={})))
            cfgs.append((p, True, kid, 'spend', dict(G, mp_style='free', regen=regen, boss_hp=False, boss_atk={})))
res = X.run(cfgs, 150); out = {}
for c in cfgs:
    rs = res[tuple(map(str, c[:4])) + (json.dumps(c[4]),)]
    b = sum(x['battles'] for r in rs for x in r['realms']); d = sum(x['defeats'] for r in rs for x in r['realms']); h = sum(x['heals'] for r in rs for x in r['realms'])
    bf = sum(x['boss_first'] for r in rs for x in r['realms']) / (len(rs) * sum(X.C.LOCS[t] for t in range(1, 10)))
    k = f"{c[0]} {c[2]} {'no spells' if c[3] == 'off' else 'free'} regen={c[4]['regen']}"
    out[k] = dict(defeat=d/b, heals=h/b, boss_first=bf); print(k, f'defeat {100*d/b:.1f}% heals/b {h/b:.3f} boss1st {bf:.2f}')
json.dump(out, open('/workspace/desy/build/v3/sim/v36_regen_only.json', 'w'), indent=1)
