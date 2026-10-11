"""Campaign sim runner (world graph), Desy, 2026-10-10 PT. Repo-relative; writes CSVs to docs/data/sim/.

  python docs/tech/tools/sim/run_world_sim.py calibrate [--seeds 100] [--v391 DIR]
      v3.9.1 data (commit d54ae74: docs/data/world + docs/data/quests, via `git archive` unless --v391 points at an extracted copy)
      -> sim_world_calibration_v391.csv: every calibration row vs sim_world_v391.csv (hours within 3%, defeats within 5% or 1.0).
  python docs/tech/tools/sim/run_world_sim.py levels [--seeds 100] [--v391 DIR]
      the same 6 profiles x beeline/explore on: v391 | main (docs/data/world as committed) | proposal (main + the levels_proposal transform:
      realm_1 split, 9 doorway paths moved, budget per word pool) | engine (proposal + the engine-faithful switches) |
      engine_patrols (engine but keeping the spec's approach patrols, which graph mode does not run yet)
      -> sim_world_levels.csv (hours, defeats and deltas vs v3.9.1) + sim_world_levels_boss_approach.csv (own-word random battles
      before each location boss, per dataset and mode).
  python docs/tech/tools/sim/run_world_sim.py ci [--seeds 4]
      fast checks (~10 s): engine RNG test vectors, spells table = docs/data/json/spells_full.json, determinism (same seed twice),
      the transform runs, docs/data/levels (level/0.2 maps) runs and is deterministic, the sim's play order (gearTier, then link order)
      equals the old zone order, no boss-gated link, the maps' world_rules.json, convert_levels.py --check, sane bands.
  python docs/tech/tools/sim/run_world_sim.py simplify [--seeds 100]
      Jack's section-9 rulings (2026-10-11): v3.9.1 | the previous maps run (sim_world_maps.csv, read, not re-run) | docs/data/levels now
      (open links, no patrols / budget / pity, walked x0.5, every eligible arrival event) -> sim_world_maps_simplified.csv +
      sim_world_maps_simplified_boss_approach.csv. --difficulty also runs the report-only difficulty options -> sim_world_difficulty_options.csv
      (--only-difficulty: just those).
  python docs/tech/tools/sim/run_world_sim.py maps [--seeds 100]
      v3.9.1 (data + rules) vs the conversion alone (v3.9.1 rules) vs docs/data/levels with Jack's rules (no boss checkpoint, no random or
      scripted elites), 6 profiles x beeline/explore -> sim_world_maps.csv + sim_world_maps_boss_approach.csv (2026-10-11).
      Exits 1 on any failure. Writes nothing.
Data source for 'main': docs/data/levels/ when it holds level files, else docs/data/world (world_loader.configure)."""
import sys, os, json, csv, glob, statistics as st, subprocess, tempfile, tarfile, io, argparse, time
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import world_sim as X
import world_loader as WG
C = X.C
REPO = WG.REPO; SIM_OUT = os.path.join(REPO, 'docs', 'data', 'sim')
V391_COMMIT = 'd54ae74'
mean = lambda xs: st.mean(xs) if xs else float('nan')
G = dict(save_next_gear=True)
ENGINE = dict(patrols=False, budget_key='edge', rng='engine')   # engine-rule switches still differing from the spec (world_sim.py docstring)
V391 = dict(v391_rules=True)   # the v3.9.1 rules (boss checkpoint, random + scripted elites): historical calibration only
# the calibration profiles (sim_world_v391.csv rows): (p, speech, kid, spell mode, opts, label)
PROFILES = [(0.5, True, 'saver', 'off', {}, 'no spells'), (0.5, True, 'saver', 'spend', dict(G, mp_style='free'), 'free'),
            (0.5, True, 'spender', 'off', {}, 'no spells'), (0.5, True, 'spender', 'spend', dict(G, mp_style='free'), 'free'),
            (0.75, True, 'saver', 'off', {}, 'no spells'), (0.75, True, 'saver', 'spend', dict(G, mp_style='free'), 'free')]
MODES = ('beeline', 'explore')

def metrics(rs):
    nloc = sum(C.LOCS.values()); tot = lambda f: mean([sum(f(x) for x in r['realms']) for r in rs])
    bat = tot(lambda x: x['battles'])
    pre = {}
    for r in rs:
        for x in r['realms']:
            for d in x['loc_pre']: pre.setdefault(d['id'], dict(kind=d['kind'], realm=x['t'], v=[])) ['v'].append(d)
    return dict(h=mean([r['total_minutes'] for r in rs])/60, defeats=tot(lambda x: x['defeats']), battles_loc=bat/nloc, defeat=tot(lambda x: x['defeats'])/bat,
                path=tot(lambda x: x['path_battles'])/nloc, side=tot(lambda x: x['side_battles'])/nloc, back=tot(lambda x: x['back_battles'])/nloc,
                patrols=tot(lambda x: x['patrols'])/nloc, boss_first=tot(lambda x: x['boss_first'])/nloc, inn_paid=tot(lambda x: x['inn_paid']),
                feathers=tot(lambda x: x['feathers']), spells=mean([len(r['realms'][-1]['spells_owned']) for r in rs]), gold_end=mean([r['realms'][-1]['gold_end'] for r in rs]),
                pre={k: dict(kind=v['kind'], realm=v['realm'], rand=mean([d['rand'] for d in v['v']]), all=mean([d['all'] for d in v['v']]), patrol=mean([d['patrol'] for d in v['v']])) for k, v in pre.items()})

def run(data, n, extra=None, procs=None):
    cfgs = []; keys = []
    for (p, sp, kid, mode, o, lab) in PROFILES:
        for m in MODES:
            oo = dict(o, world=m, data=data, **(extra or {})); cfgs.append((p, sp, kid, mode, oo)); keys.append((f'{int(p*100)}% {kid} {lab}', m))
    res = X.run(cfgs, n, procs)
    k2 = lambda c: tuple(map(str, c[:4])) + (json.dumps(c[4]),)
    return {k: metrics(res[k2(c)]) for k, c in zip(keys, cfgs)}

def v391_dir(arg):
    if arg: return arg
    d = os.path.join(tempfile.gettempdir(), f'sim_v391_{V391_COMMIT}')
    if not os.path.exists(os.path.join(d, 'docs', 'data', 'world', 'index.json')):
        raw = subprocess.run(['git', '-C', REPO, 'archive', V391_COMMIT, 'docs/data/world', 'docs/data/quests'], check=True, capture_output=True).stdout
        tarfile.open(fileobj=io.BytesIO(raw)).extractall(d, filter='data')
    return d
def v391_cfg(d): return dict(source='world', world=os.path.join(d, 'docs', 'data', 'world'), quests=os.path.join(d, 'docs', 'data', 'quests', 'quests.json'))

def target_rows():
    out = {}
    for r in csv.DictReader(open(os.path.join(SIM_OUT, 'sim_world_v391.csv'))):
        if r['reading'] == 'False' and r['mode'] in MODES: out[(r['profile'], r['mode'])] = r
    return out

def write(name, rows):
    os.makedirs(SIM_OUT, exist_ok=True)
    with open(os.path.join(SIM_OUT, name), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator='\n'); w.writeheader(); w.writerows(rows)
    print('wrote', os.path.relpath(os.path.join(SIM_OUT, name), REPO))

def calibrate(a):
    R = run(v391_cfg(v391_dir(a.v391)), a.seeds, V391); T = target_rows(); rows = []; bad = 0
    for (prof, m), x in R.items():
        t = T[(prof, m)]; th, td = float(t['hours']), float(t['defeats'])
        dh = 100*(x['h']/th - 1); dd = x['defeats'] - td
        ok = abs(dh) <= 3 and (abs(dd) <= 1.0 or abs(dd) <= 0.05*td); bad += not ok
        rows.append(dict(profile=prof, mode=m, seeds=a.seeds, hours_target=th, hours=round(x['h'], 2), hours_delta_pct=round(dh, 2), defeats_target=td, defeats=round(x['defeats'], 1),
                         defeats_delta=round(dd, 2), battles_zone=round(x['battles_loc'], 1), patrols=round(x['patrols'], 1), within_tolerance=ok))
        print(f'{prof:24s} {m:8s} h {x["h"]:6.2f} vs {th:6.2f} ({dh:+.2f}%)  defeats {x["defeats"]:5.1f} vs {td:5.1f} ({dd:+.2f})  {"ok" if ok else "OUT"}')
    write('sim_world_calibration_v391.csv', rows); return bad

def levels(a):
    d = v391_dir(a.v391)
    sets = [('v391', v391_cfg(d), V391), ('main', dict(source='world'), V391), ('proposal', dict(source='world', transform='levels_proposal'), V391),   # Oct 10 run: v3.9.1 rules
            ('engine', dict(source='world', transform='levels_proposal'), ENGINE),
            ('engine_patrols', dict(source='world', transform='levels_proposal'), dict(ENGINE, patrols=True))]   # engine minus the missing patrol rule
    RES = {}
    for name, cfg, extra in sets:
        t0 = time.time(); RES[name] = run(cfg, a.seeds, extra); print(name, f'{time.time()-t0:.0f}s')
    rows = []; prow = []
    for key, b in RES['v391'].items():
        for name in RES:
            x = RES[name][key]
            rows.append(dict(profile=key[0], mode=key[1], data=name, seeds=a.seeds, hours=round(x['h'], 2), hours_delta=round(x['h'] - b['h'], 2), hours_delta_pct=round(100*(x['h']/b['h'] - 1), 1),
                             defeats=round(x['defeats'], 1), defeats_delta=round(x['defeats'] - b['defeats'], 1), battles_zone=round(x['battles_loc'], 2), path=round(x['path'], 2),
                             side=round(x['side'], 2), back=round(x['back'], 2), patrols=round(x['patrols'], 2), inn_paid=round(x['inn_paid']), spells=round(x['spells'], 1), gold_end=round(x['gold_end'])))
            for loc, v in x['pre'].items():
                prow.append(dict(profile=key[0], mode=key[1], data=name, realm=v['realm'], location=loc, boss=v['kind'], own_random=round(v['rand'], 2), patrols=round(v['patrol'], 2), all_before_boss=round(v['all'], 2)))
    write('sim_world_levels.csv', rows); write('sim_world_levels_boss_approach.csv', prow)
    for r in rows:
        if r['data'] != 'v391': print(f"{r['profile']:24s} {r['mode']:8s} {r['data']:9s} h {r['hours']:6.2f} ({r['hours_delta']:+.2f}, {r['hours_delta_pct']:+.1f}%)  defeats {r['defeats']:5.1f} ({r['defeats_delta']:+.1f})")
    return 0

def maps(a):
    d = v391_dir(a.v391); RES = {}
    # v391 = the historical tables (v3.9.1 data and rules); converted = today's data converted to maps, still with the v3.9.1 rules
    # (world + levels_proposal, which ci proves identical to docs/data/levels); maps = docs/data/levels with Jack's rules (no boss checkpoint,
    # no random or scripted elites)
    for name, cfg, ex in (('v391', v391_cfg(d), V391), ('converted', dict(source='world', transform='levels_proposal'), V391), ('maps', dict(source='levels'), None)):
        t0 = time.time(); RES[name] = run(cfg, a.seeds, ex); print(name, f'{time.time()-t0:.0f}s')
    rows = []; prow = []
    for key, b in RES['v391'].items():
        x = RES['maps'][key]; c = RES['converted'][key]
        rows.append(dict(profile=key[0], mode=key[1], seeds=a.seeds, hours_v391=round(b['h'], 2), hours_converted=round(c['h'], 2), hours_maps=round(x['h'], 2),
                         hours_delta_converted=round(c['h'] - b['h'], 2), hours_delta=round(x['h'] - b['h'], 2), hours_delta_pct=round(100*(x['h']/b['h'] - 1), 1),
                         defeats_v391=round(b['defeats'], 1), defeats_converted=round(c['defeats'], 1), defeats_maps=round(x['defeats'], 1),
                         defeats_delta_converted=round(c['defeats'] - b['defeats'], 1), defeats_delta=round(x['defeats'] - b['defeats'], 1),
                         battles_zone_v391=round(b['battles_loc'], 2), battles_zone_maps=round(x['battles_loc'], 2), boss_first_wins_v391=round(b['boss_first'], 3), boss_first_wins_maps=round(x['boss_first'], 3)))
        for name in RES:
            for loc, v in RES[name][key]['pre'].items():
                prow.append(dict(profile=key[0], mode=key[1], data=name, location=loc, boss=v['kind'], own_random=round(v['rand'], 2), patrols=round(v['patrol'], 2), all_before_boss=round(v['all'], 2)))
        print(f"{key[0]:24s} {key[1]:8s} h {b['h']:6.2f} conv {c['h']:6.2f} ({c['h']-b['h']:+.2f}) maps {x['h']:6.2f} ({x['h']-b['h']:+.2f}, {100*(x['h']/b['h']-1):+.1f}%)  defeats {b['defeats']:5.1f} conv {c['defeats']:5.1f} ({c['defeats']-b['defeats']:+.1f}) maps {x['defeats']:5.1f} ({x['defeats']-b['defeats']:+.1f})")
    write('sim_world_maps.csv', rows); write('sim_world_maps_boss_approach.csv', prow); return 0

# report-only difficulty options (2026-10-11, NOT in the spec): existing knobs only
DIFFICULTY = [('A boss HP x1.3 + boss ATK x1.0', dict(boss_hp_scale=1.3, boss_atk={'locboss': 1.0, 'realmboss': 1.0})),
              ('B normal enemy ATK x1.1', dict(enemy_atk_mult=1.1)),
              ('C encounter rate x1.3', dict(rate_mult=1.3)),
              ('D spell MP cost x1.5', dict(k_mult=1.5)),
              ('A+B', dict(boss_hp_scale=1.3, boss_atk={'locboss': 1.0, 'realmboss': 1.0}, enemy_atk_mult=1.1))]
# one removed rule put back at a time on today's maps (attribution of the delta vs the previous maps run)
ATTRIB = [('+ patrols (v3.9.1 approach rule)', dict(patrols=True)), ('+ walked x0.05', dict(cleared_mult=0.05)),
          ('+ budget 8 / x0.1 + pity 2', dict(budget=8, budget_mult=0.1, pity_rolls=2))]

def simplify(a):
    """Jack's section-9 rulings: v3.9.1 vs the previous maps run (sim_world_maps.csv) vs docs/data/levels now."""
    if a.only_difficulty: return difficulty(a, run(dict(source='levels'), a.seeds))
    d = v391_dir(a.v391); prev = {(r['profile'], r['mode']): r for r in csv.DictReader(open(os.path.join(SIM_OUT, 'sim_world_maps.csv')))}
    t0 = time.time(); B = run(v391_cfg(d), a.seeds, V391); N = run(dict(source='levels'), a.seeds); print(f'base runs {time.time()-t0:.0f}s')
    AT = {lab: run(dict(source='levels'), a.seeds, ex) for lab, ex in ATTRIB}
    rows = []; prow = []
    for key, b in B.items():
        x = N[key]; p = prev[key]; ph, pd = float(p['hours_maps']), float(p['defeats_maps'])
        r = dict(profile=key[0], mode=key[1], seeds=a.seeds, hours_v391=round(b['h'], 2), hours_prev_maps=ph, hours_now=round(x['h'], 2),
                 hours_delta_v391=round(x['h'] - b['h'], 2), hours_delta_v391_pct=round(100*(x['h']/b['h'] - 1), 1), hours_delta_prev=round(x['h'] - ph, 2), hours_delta_prev_pct=round(100*(x['h']/ph - 1), 1),
                 defeats_v391=round(b['defeats'], 1), defeats_prev_maps=pd, defeats_now=round(x['defeats'], 1), defeats_delta_v391=round(x['defeats'] - b['defeats'], 1), defeats_delta_prev=round(x['defeats'] - pd, 1),
                 battles_loc_v391=round(b['battles_loc'], 2), battles_loc_prev=float(p['battles_zone_maps']), battles_loc_now=round(x['battles_loc'], 2),
                 patrols_loc_now=round(x['patrols'], 2), boss_first_wins_now=round(x['boss_first'], 3))
        for lab, R in AT.items(): r[f'hours {lab}'] = round(R[key]['h'], 2); r[f'defeats {lab}'] = round(R[key]['defeats'], 1)
        rows.append(r)
        for name, R in (('v391', B), ('now', N)):
            for loc, v in R[key]['pre'].items():
                prow.append(dict(profile=key[0], mode=key[1], data=name, location=loc, boss=v['kind'], own_random=round(v['rand'], 2), patrols=round(v['patrol'], 2), all_before_boss=round(v['all'], 2)))
        print(f"{key[0]:24s} {key[1]:8s} h v391 {b['h']:6.2f} prev {ph:6.2f} now {x['h']:6.2f} ({x['h']-b['h']:+.2f} / {x['h']-ph:+.2f})  defeats {b['defeats']:5.1f} {pd:5.1f} {x['defeats']:5.1f}  bat/loc {x['battles_loc']:.1f}")
    write('sim_world_maps_simplified.csv', rows); write('sim_world_maps_simplified_boss_approach.csv', prow)
    import boss_skips; sk = boss_skips.analyse(); keys = list(dict.fromkeys(k for r in sk for k in r))
    with open(os.path.join(SIM_OUT, 'sim_world_boss_skips.csv'), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=keys, lineterminator='\n'); w.writeheader(); w.writerows(sk)
    print('wrote docs/data/sim/sim_world_boss_skips.csv')
    if a.difficulty: difficulty(a, N)
    return 0

def difficulty(a, N):
    if True:
        drows = []
        for lab, ex in DIFFICULTY:
            R = run(dict(source='levels'), a.seeds, ex)
            for key, x in R.items():
                n = N[key]; drows.append(dict(option=lab, profile=key[0], mode=key[1], seeds=a.seeds, hours=round(x['h'], 2), hours_now=round(n['h'], 2), hours_delta=round(x['h'] - n['h'], 2),
                                              defeats=round(x['defeats'], 1), defeats_now=round(n['defeats'], 1), defeats_delta=round(x['defeats'] - n['defeats'], 1),
                                              boss_first_wins=round(x['boss_first'], 3), boss_first_wins_now=round(n['boss_first'], 3), battles_loc=round(x['battles_loc'], 2)))
            print(lab, 'done')
        write('sim_world_difficulty_options.csv', drows)
    return 0

def ci(a):
    fails = []
    def check(name, ok, info=''):
        print(('ok   ' if ok else 'FAIL ') + name + (f'  {info}' if info else '')); ok or fails.append(name)
    WG.configure()
    for v in WG.RULES['seed']['testVectors']:
        check(f"rng vector {v['key']}", WG.fnv1a(v['key']) == v['fnv1a32'] and abs(WG.roll(v['key']) - v['roll']) < 1e-12)
    sf = {s['id']: s for s in json.load(open(os.path.join(REPO, 'docs', 'data', 'json', 'spells_full.json')))['spells']}
    diff = [s['id'] for s in X.D.SPELLS if any(s.get(k) != sf.get(s['id'], {}).get(k) for k in ('power', 'mp', 'price', 'town', 'target'))]
    check('spells_data.SPELLS = spells_full.json', not diff and len(sf) == len(X.D.SPELLS), ','.join(diff))
    one = lambda data, extra=None, seed=7, p=0.5, kid='saver', mode='beeline': X.campaign((p, True, kid, 'spend', seed, dict(G, mp_style='free', world=mode, data=data, **(extra or {}))))
    sig = lambda r: (round(r['total_minutes'], 6), sum(x['defeats'] for x in r['realms']), sum(x['battles'] for x in r['realms']))
    a1, a2 = one(dict(source='world')), one(dict(source='world')); check('deterministic (same seed twice)', sig(a1) == sig(a2), str(sig(a1)))
    pr = one(dict(source='world', transform='levels_proposal')); check('levels_proposal runs', pr['total_minutes'] > 0, str(sig(pr)))
    # the converted maps (docs/data/levels, level/0.2) run exactly like today's data + the transform, and a fresh conversion matches them
    if os.path.exists(os.path.join(WG.LEVELS_DIR, 'index.json')):
        # (until 2026-10-11 the maps ran identically to world + levels_proposal; Jack's section-9 rulings -- open links, no budget/pity/patrols,
        # walked x0.5, no filler events -- make them differ on purpose, so that check is gone; convert_levels --check below covers drift)
        lv = one(dict(source='levels')); lv2 = one(dict(source='levels')); check('docs/data/levels runs, deterministic', lv['total_minutes'] > 0 and sig(lv) == sig(lv2), str(sig(lv)))
        lx = one(dict(source='levels'), mode='explore', kid='spender'); check('  explore (50% spender) runs', lx['total_minutes'] > 0, str(sig(lx)))
        WG.configure(dict(source='levels'))
        zw = [(z['realm'], z['id']) for z in sorted(WG.ZONES, key=lambda z: (z['realm'], z['order']))]; WG.configure(dict(source='world', transform='levels_proposal'))
        check('sim play order (gearTier, then link order) = zones.json order', [m for _, m in zw] == [z['bossNode']['graph'] for z in sorted(WG.ZONES, key=lambda z: (z['realm'], z['order']))], ', '.join(m for _, m in zw))
        lm = {m['id']: m for m in (json.load(open(f)) for f in glob.glob(os.path.join(WG.LEVELS_DIR, '*.json'))) if m.get('schema') == 'level/0.2'}
        gated = [f"{m['id']}/{e['id']}" for m in lm.values() for e in m['edges'] if 'bossDefeated' in json.dumps(e.get('cond'))]
        check('no boss-gated link (Jack 2026-10-11: progression purely by links)', not gated, ','.join(gated[:6]))
        maps = [json.load(open(f)) for f in glob.glob(os.path.join(WG.LEVELS_DIR, '*.json'))]
        bad = [m['id'] for m in maps if m.get('schema') == 'level/0.2' and m['settings'].get('G') and m['settings']['G'] != C.gold_per_enemy(m['settings']['gearTier'])]
        check('settings.G = the sim tier table', not bad, ','.join(bad))
        r = subprocess.run([sys.executable, os.path.join(HERE, '..', 'levels', 'convert_levels.py'), '--check'], capture_output=True, text=True)
        check('convert_levels --check (docs/data/levels up to date)', r.returncode == 0, (r.stdout + r.stderr).strip()[-200:])
    # quest locks (Jack 2026-10-11): no converted map has one, so lock a realm-1 edge on the main route in memory and check the routing
    WG.configure(dict(source='levels')); WG.REALMS.clear(); T = WG.realm(1); z = T.zones[0]; p0 = T.path(T.entry, z['approach'], 0)
    lk = p0[len(p0)//2][0]; T.locks = {lk: 'q1_test_lock'}; T._path.clear(); T.quest_done = set(); p1 = T.path(T.entry, z['approach'], 0)
    T.quest_done = {'q1_test_lock'}; p2 = T.path(T.entry, z['approach'], 0); WG.REALMS.clear()
    check('sim honours lockedUntilQuest (closed: route avoids it; quest done: shortest route again)', (p1 is None or lk not in [e for e, _ in p1]) and p2 == p0, f'{lk}: {len(p0)} / {p1 and len(p1)} / {len(p2)} hops')
    en = one(dict(source='world', transform='levels_proposal'), ENGINE); check('engine switches run', en['total_minutes'] > 0, str(sig(en)))
    jr = one(dict(source='world'), None, p=0.5, kid='spender'); vr = one(dict(source='world'), V391, p=0.5, kid='spender')
    check("Jack's 2026-10-11 rules are the default (no boss checkpoint, no random/scripted elites, no patrols; differs from v391_rules)", sig(jr) != sig(vr), f'{sig(jr)} vs {sig(vr)}')
    if os.path.exists(os.path.join(WG.LEVELS_DIR, 'world_rules.json')):
        lr = json.load(open(os.path.join(WG.LEVELS_DIR, 'world_rules.json')))
        left = [k for k in ('zoneBattleBudget', 'budgetSpentMult', 'pityRolls', 'beelineBattleTarget', 'beelineBattleRange') if k in lr]
        check('levels world_rules: no budget / pity / beeline target, walked x0.5 (Jack 2026-10-11)', not left and lr.get('clearedStepMult') == 0.5, ','.join(left))
    t0 = time.time(); R = run(dict(source='world'), a.seeds); dt = time.time() - t0
    for k, x in R.items(): check(f'band {k[0]} {k[1]}', 10 < x['h'] < 45 and 0 <= x['defeats'] < 150 and 5 < x['battles_loc'] < 40, f"h {x['h']:.2f} defeats {x['defeats']:.1f} bat/loc {x['battles_loc']:.1f}")
    print(f'{len(fails)} failures, {dt:.0f}s for {a.seeds} seeds x {len(R)} configs'); return len(fails)

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('what', choices=('calibrate', 'levels', 'maps', 'simplify', 'ci')); ap.add_argument('--seeds', type=int); ap.add_argument('--v391'); ap.add_argument('--difficulty', action='store_true'); ap.add_argument('--only-difficulty', action='store_true')
    a = ap.parse_args(); a.seeds = a.seeds or (4 if a.what == 'ci' else 100)
    sys.exit(1 if {'calibrate': calibrate, 'levels': levels, 'maps': maps, 'simplify': simplify, 'ci': ci}[a.what](a) else 0)
