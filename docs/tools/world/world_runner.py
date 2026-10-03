"""v3.8 world-graph sims: v3.7 loop vs graph traversal (beeline / explore), same seeds and battle model.
Usage: python world_runner.py main [n]     -> build/world/sim/world_main.txt + world_summary.json
       python world_runner.py sweep [n]    -> encounter-rate sweep (stdout)"""
import sys, json, statistics as st, collections
sys.path.insert(0, '/workspace/desy/build/world'); sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import world_sim as X
C = X.C
mean = lambda xs: st.mean(xs) if xs else float('nan')
G = dict(save_next_gear=True)
def metrics(rs):
    nloc = sum(C.LOCS.values())
    tot = lambda f: mean([sum(f(x) for x in r['realms']) for r in rs])
    bat = tot(lambda x: x['battles'])
    qmin = mean([(r['total_minutes']*60 - 0) for r in rs])
    return dict(h=mean([r['total_minutes'] for r in rs])/60,
        walk_h=mean([sum(x['hops'] for x in r['realms']) for r in rs])*X.WG.RULES['walkSecPerHop']/3600,
        battles_loc=bat/nloc, path=tot(lambda x: x['path_battles'])/nloc, side=tot(lambda x: x['side_battles'])/nloc, back=tot(lambda x: x['back_battles'])/nloc,
        patrols=tot(lambda x: x['patrols'])/nloc, defeat=tot(lambda x: x['defeats'])/bat, defeats=tot(lambda x: x['defeats']),
        boss_first=tot(lambda x: x['boss_first'])/nloc, ready_gate=mean([v for r in rs for x in r['realms'] for v in x['ready_gate']]),
        ready_boss=mean([v for r in rs for x in r['realms'] for v in x['ready_boss']]),
        inn_paid=tot(lambda x: x['inn_paid']), inn_free=tot(lambda x: x['inn_free']), inn_trips=tot(lambda x: x['inn_trips']), inn_walk=tot(lambda x: x['inn_walk_hops']),
        feathers=tot(lambda x: x['feathers']), minis=tot(lambda x: x['minis'])/nloc, gold_side=tot(lambda x: x['gold_side']),
        income=tot(lambda x: x['income']), min_gold=mean([min(x['min_gold'] for x in r['realms']) for r in rs]), gold_end=mean([r['realms'][-1]['gold_end'] for r in rs]),
        zero=tot(lambda x: x['gold_zero']), full_gear=tot(lambda x: x['battles_full_gear'])/bat, spells=mean([len(r['realms'][-1]['spells_owned']) for r in rs]),
        boss_mp=mean([m for r in rs for x in r['realms'][1:] for m in x['boss_mp_start']]), mp_start=mean([m for r in rs for x in r['realms'][1:] for m in x['mp_start']]),
        q=mean([sum(x['q_realm'] for x in r['realms']) for r in rs]), prof=mean([x['prof_end'] for r in rs for x in r['realms']]),
        loc_min=[mean([st.mean(r['realms'][t-1]['loc_min']) for r in rs]) for t in range(1, 10)],
        patrols_t=[mean([r['realms'][t-1]['patrols']/C.LOCS[t] for r in rs]) for t in range(1, 10)],
        ready_t=[mean([v for r in rs for v in r['realms'][t-1]['ready_gate']]) for t in range(1, 10)],
        battles_t=[mean([r['realms'][t-1]['battles']/C.LOCS[t] for r in rs]) for t in range(1, 10)])
MODES = {'v3.7': {}, 'beeline': dict(world='beeline'), 'explore': dict(world='explore')}
def profiles(full=True):
    out = []
    for p in ((0.5, 0.65, 0.75, 0.9) if full else (0.5, 0.75)):
        for kid in ('saver', 'spender'):
            out.append((p, True, kid, 'off', {}, 'no spells')); out.append((p, True, kid, 'spend', dict(G, mp_style='free'), 'free'))
    for kid in ('saver', 'spender'): out.append((0.75, False, kid, 'off', {}, 'no spells'))
    return out
def run(prof, modes, n, extra=None):
    cfgs = []; keys = []
    for (p, sp, kid, mode, o, lab) in prof:
        for mname, mo in modes.items():
            oo = dict(o); oo.update(mo); oo.update(extra or {}) if mo else None
            cfgs.append((p, sp, kid, mode, oo)); keys.append((p, 'on' if sp else 'off', kid, lab, mname))
    res = X.run(cfgs, n)
    k2 = lambda c: tuple(map(str, c[:4])) + (json.dumps(c[4]),)
    return {k: metrics(res[k2(c)]) for k, c in zip(keys, cfgs)}
if __name__ == '__main__':
    what = sys.argv[1]; n = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    if what == 'sweep':
        prof = [(0.75, True, 'saver', 'off', {}, 'no spells'), (0.75, True, 'spender', 'off', {}, 'no spells'), (0.5, True, 'saver', 'spend', dict(G, mp_style='free'), 'free'), (0.5, True, 'spender', 'off', {}, 'no spells')]
        base = run(prof, {'v3.7': {}}, n)
        for k, m in base.items(): print('BASE', k, f"h {m['h']:.2f} bat/loc {m['battles_loc']:.1f} pat {m['patrols']:.1f} def {m['defeat']:.3f} inn {m['inn_paid']:.0f}+{m['inn_free']:.0f} gold_end {m['gold_end']:.0f}")
        for name, ex in json.loads(sys.argv[3]).items():
            r = run(prof, {'beeline': dict(world='beeline', **ex), 'explore': dict(world='explore', **ex)}, n)
            for k, m in r.items():
                b = base[k[:4] + ('v3.7',)]
                print(name, k[0], k[2], k[3], k[4], f"h {m['h']:.2f} ({100*(m['h']/b['h']-1):+.1f}%) walk_h {m['walk_h']:.2f} bat/loc {m['battles_loc']:.1f} (path {m['path']:.1f} side {m['side']:.1f} back {m['back']:.1f} pat {m['patrols']:.1f}) def {m['defeat']:.3f} vs {b['defeat']:.3f} inn {m['inn_paid']:.0f}+{m['inn_free']:.0f} vs {b['inn_paid']:.0f}+{b['inn_free']:.0f} feath {m['feathers']:.1f} gold_end {m['gold_end']:.0f} vs {b['gold_end']:.0f} gate {m['ready_gate']:.2f} vs {b['ready_gate']:.2f}")
    if what == 'main':
        R = run(profiles(), MODES, n)
        json.dump({' | '.join(map(str, k)): v for k, v in R.items()}, open('/workspace/desy/build/world/sim/world_summary.json', 'w'), indent=1)
        print('done')
