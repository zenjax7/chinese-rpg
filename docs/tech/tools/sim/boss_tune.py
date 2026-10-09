import sys, json, random, statistics as st
ARGS = sys.argv[1:]   # acc [target] [kinds comma] [out]
sys.argv = ['x', '1', ARGS[0], '0']
exec(open('/workspace/desy/build/v3/explore/boss_harness.py').read().split('out = {}')[0])
TARGET = float(ARGS[1]) if len(ARGS) > 1 else 20.0; n = 600
KINDS = ARGS[2].split(',') if len(ARGS) > 2 else ['locboss', 'realmboss']
OUT = ARGS[3] if len(ARGS) > 3 else '/workspace/desy/build/v3/explore/boss_tune.json'
def correct_at(t, kind, m, lab='spells', seed=7):
    global HPM
    HPM = {f'{t},{kind}': m}
    rng = random.Random(seed)
    sp = best_spells(t) if lab == 'spells' else []
    r = [run(t, kind, sp, rng) for _ in range(n)]
    w = [x for x in r if x[0]]
    return dict(correct=st.mean(x[1] for x in w), win=len(w)/n, q=st.mean(x[2] for x in w), hp=st.mean(x[4] for x in r), casts=st.mean(x[3] for x in r),
                hero_q=st.mean(x[5] for x in w))
res = {}
for t in range(1, 10):
    for kind in KINDS:
        lo, hi = 0.8, 3.0
        for _ in range(9):
            mid = (lo + hi)/2
            if correct_at(t, kind, mid)['correct'] < TARGET: lo = mid
            else: hi = mid
        m = round((lo + hi)/2 / 0.05) * 0.05
        a = correct_at(t, kind, m); b = correct_at(t, kind, m, 'none'); b0 = correct_at(t, kind, 1.0, 'none'); a0 = correct_at(t, kind, 1.0)
        res[f'{t},{kind}'] = dict(mult=m, spells=a, none=b, none_old=b0, spells_old=a0)
        print(f"t{t} {kind:9s} mult {m:.2f} | spells {a['correct']:.1f} (q {a['q']:.1f}, win {a['win']:.2f}, casts {a['casts']:.2f}) | none {b['correct']:.1f} (q {b['q']:.1f}, win {b['win']:.2f}) | old: none {b0['correct']:.1f} spells {a0['correct']:.1f}", flush=True)
json.dump(res, open(OUT, 'w'), indent=1)
