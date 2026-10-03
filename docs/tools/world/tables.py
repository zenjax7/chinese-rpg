"""Prints the markdown tables for world-graph.md from the data + sim/world_summary.json; also writes data/world/world_realm_table.csv and data/sim/sim_world_v391.csv."""
import json, sys, csv, os
sys.path.insert(0, '/workspace/desy/build/world')
import world_graph as WG
R = json.load(open('/workspace/desy/build/world/sim/world_summary.json'))
LT = json.load(open('/workspace/desy/data/world/layout_targets.json'))['realms']
import importlib; C = importlib.import_module('combat_sim') if False else None
sys.path.insert(0, '/workspace/desy/build'); import combat_sim as C
def k(p, sp, kid, lab, mode): return f"{p} | {sp} | {kid} | {lab} | {mode}"
base = lambda mode: R[k(0.75, 'on', 'saver', 'no spells', mode)]
rows = []
print('| Realm | Graphs (levels) | Nodes | Edges | Edges/node | Branch nodes | Dead-end share | Loops | Town + villages | Inns | Dungeons | Zones (bosses) | Mini-bosses | Chests | Story/NPC | Max hops to inn | Beeline battles/zone (expected) | Battles/zone beeline · explore | Min/zone beeline · explore |')
print('|' + '---|'*19)
for t in range(1, 10):
    T = WG.realm(t); s = T.stats()
    z = [round(sum(T.E[e]['p']*T.E[e]['steps'] for e, _ in T.path(pos, zz['approach'], i)), 1) for i, (pos, zz) in enumerate(zip([T.entry] + T.bosses[:-1], T.zones))]
    b, x = base('beeline'), base('explore')
    row = dict(realm=t, graphs=s['graphs'], levels=s['levels'], nodes=s['nodes'], edges=s['edges'], density=s['density'], branch=s['branch_nodes'], dead=s['dead_end_share'], loops=s['cycles'],
               towns=s['towns'], villages=s['villages'], inns=s['inns'], dungeons=s['dungeons'], zones=s['bosses'], minis=s['minibosses'], chests=s['chests'], story=s['story'], npcs=s['npcs'],
               beeline_expected='/'.join(map(str, z)), bat_beeline=round(b['battles_t'][t-1], 1), bat_explore=round(x['battles_t'][t-1], 1), min_beeline=round(b['loc_min'][t-1], 1), min_explore=round(x['loc_min'][t-1], 1),
               min_v37=round(base('v3.7')['loc_min'][t-1], 1), bat_v37=round(base('v3.7')['battles_t'][t-1], 1))
    rows.append(row)
    print(f"| {t} | {s['graphs']} ({s['levels']}) | {s['nodes']} | {s['edges']} | {s['density']} | {s['branch_nodes']} | {s['dead_end_share']:.0%} | {s['cycles']} | {s['towns']} + {s['villages']} | {s['inns']} | {s['dungeons']} | {s['bosses']} | {s['minibosses']} | {s['chests']} | {s['story']}/{s['npcs']} | {'≤' + str(WG.RULES['maxHopsToInn'].get(str(t), WG.RULES['maxHopsToInn']['default']))} | {row['beeline_expected']} | {row['bat_beeline']} · {row['bat_explore']} (v3.7 {row['bat_v37']}) | {row['min_beeline']} · {row['min_explore']} (v3.7 {row['min_v37']}) |")
os.makedirs('/workspace/desy/data/sim', exist_ok=True)
with open('/workspace/desy/data/world/world_realm_table.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
print()
print('| Profile | Mode | Hours | Δ vs v3.7 | Battles/zone (path · side · back · patrol) | Defeats (campaign) | Ready at gate | Inn stays | Feathers | Gold at end | Lowest gold |')
print('|---|---|---|---|---|---|---|---|---|---|---|')
out = []
for p in (0.5, 0.65, 0.75, 0.9):
    for kid in ('saver', 'spender'):
        for lab in ('no spells', 'free'):
            for mode in ('v3.7', 'beeline', 'explore'):
                m = R[k(p, 'on', kid, lab, mode)]; b = R[k(p, 'on', kid, lab, 'v3.7')]
                out.append(dict(profile=f"{int(p*100)}% {kid} {lab}", reading=False, mode=mode, hours=round(m['h'], 2), delta_pct=round(100*(m['h']/b['h']-1), 1), path=round(m['path'], 1), side=round(m['side'], 1), back=round(m['back'], 1),
                                patrols=round(m['patrols'], 1), battles_zone=round(m['battles_loc'], 1), defeats=round(m['defeats'], 1), defeat_rate=round(m['defeat'], 3), ready_gate=round(m['ready_gate'], 2), inn_paid=round(m['inn_paid']), inn_free=round(m['inn_free']),
                                feathers=round(m['feathers'], 1), feathers_bought=round(m.get('feathers_bought', 0), 1), feather_gold=round(m.get('feather_gold', 0)), spells=round(m['spells'], 1), gold_end=round(m['gold_end']), min_gold=round(m['min_gold'])))
for kid in ('saver', 'spender'):
    for mode in ('v3.7', 'beeline', 'explore'):
        m = R[k(0.75, 'off', kid, 'no spells', mode)]; b = R[k(0.75, 'off', kid, 'no spells', 'v3.7')]
        out.append(dict(profile=f"75% {kid} reading", reading=True, mode=mode, hours=round(m['h'], 2), delta_pct=round(100*(m['h']/b['h']-1), 1), path=round(m['path'], 1), side=round(m['side'], 1), back=round(m['back'], 1),
                        patrols=round(m['patrols'], 1), battles_zone=round(m['battles_loc'], 1), defeats=round(m['defeats'], 1), defeat_rate=round(m['defeat'], 3), ready_gate=round(m['ready_gate'], 2), inn_paid=round(m['inn_paid']), inn_free=round(m['inn_free']),
                        feathers=round(m['feathers'], 1), feathers_bought=round(m.get('feathers_bought', 0), 1), feather_gold=round(m.get('feather_gold', 0)), spells=round(m['spells'], 1), gold_end=round(m['gold_end']), min_gold=round(m['min_gold'])))
for o in out:
    if o['profile'].endswith('free') and o['profile'].split()[1] == 'spender': continue
    print(f"| {o['profile']} | {o['mode']} | {o['hours']} | {o['delta_pct']:+.1f}% | {o['battles_zone']} ({o['path']} · {o['side']} · {o['back']} · {o['patrols']}) | {o['defeats']} | {o['ready_gate']} | {o['inn_paid']}+{o['inn_free']} | {o['feathers']} | {o['gold_end']} | {o['min_gold']} |")
with open('/workspace/desy/data/sim/sim_world_v391.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)

# ---- v3.9 vs v3.8 (no free inn warp, Return Feather bought in town/village shops, town density rule)
A = json.load(open('/workspace/desy/build/world/sim/world_summary_v38.json'))
RF = WG.RULES['returnFeather']
print()
print('| Profile | Mode | Hours v3.8 → v3.9.1 | Defeats v3.8 → v3.9.1 | Spells owned at end | Feathers bought (per realm 1–9) | Feathers used | Feather gold (% of income) | Gold at end v3.8 → v3.9.1 |')
print('|---|---|---|---|---|---|---|---|---|')
for p, kid, lab in ((0.75, 'saver', 'no spells'), (0.75, 'saver', 'free'), (0.5, 'saver', 'free'), (0.5, 'saver', 'no spells'), (0.5, 'spender', 'free')):
    for mode in ('beeline', 'explore'):
        kk = k(p, 'on', kid, lab, mode); a, m = A[kk], R[kk]
        print(f"| {int(p*100)}% {kid} {lab} | {mode} | {a['h']:.2f} → {m['h']:.2f} ({100*(m['h']/a['h']-1):+.1f}%) | {a['defeats']:.1f} → {m['defeats']:.1f} ({m['defeats']-a['defeats']:+.1f}) | {a['spells']:.1f} → {m['spells']:.1f} | "
              f"{m['feathers_bought']:.1f} ({' · '.join(f'{x:.1f}' for x in m['feathers_bought_t'])}) | {a['feathers']:.1f} → {m['feathers']:.1f} | {m['feather_gold']:.0f} ({100*m['feather_gold']/m['income']:.1f}%) | {a['gold_end']:.0f} → {m['gold_end']:.0f} |")
print()
print('| Realm (tier) | G = 1 normal kill | Return Feather (' + str(RF['priceG']) + '×G) | = kills | Potion | Inn night |')
print('|---|---|---|---|---|---|')
for t in range(1, 10):
    g = C.gold_per_enemy(t)
    print(f"| {t} | {g} | {max(1, round(RF['priceG']*g))} | {RF['priceG']} | {C.potion_price(t)} | {getattr(C, 'inn_price', lambda t: '–')(t)} |")

# ---- v3.9.1 vs v3.9 (realm-boss Feathers in realms 3/6/8, ceil density rule)
A9 = json.load(open('/workspace/desy/build/world/sim/world_summary_v39.json'))
print()
print('| Profile | Mode | Hours v3.9 → v3.9.1 | Defeats v3.9 → v3.9.1 | Spells v3.9 → v3.9.1 | Feathers bought v3.9 → v3.9.1 | Feathers used v3.9 → v3.9.1 |')
print('|---|---|---|---|---|---|---|')
for p, kid, lab in ((0.75, 'saver', 'no spells'), (0.75, 'saver', 'free'), (0.5, 'saver', 'free'), (0.5, 'saver', 'no spells'), (0.5, 'spender', 'free')):
    for mode in ('beeline', 'explore'):
        kk = k(p, 'on', kid, lab, mode); a, m = A9[kk], R[kk]
        print(f"| {int(p*100)}% {kid} {lab} | {mode} | {a['h']:.2f} → {m['h']:.2f} ({100*(m['h']/a['h']-1):+.1f}%) | {a['defeats']:.1f} → {m['defeats']:.1f} ({m['defeats']-a['defeats']:+.1f}) | {a['spells']:.1f} → {m['spells']:.1f} | {a['feathers_bought']:.1f} → {m['feathers_bought']:.1f} | {a['feathers']:.1f} → {m['feathers']:.1f} |")
print()
print('| Realm | Nodes | Ramp (nodes per settlement) | Target = ceil(nodes / ramp) | Actual towns + villages | Actual nodes per settlement | v3.9 count |')
print('|---|---|---|---|---|---|---|')
V39 = {1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 2, 7: 3, 8: 3, 9: 3}
import math
for t in range(1, 10):
    T = WG.realm(t); n = len(T.N); ramp = 20 + 5*(t - 1); have = len(T.towns); nn = {1: 17}.get(t, LT[str(t)]['nodes'] if str(t) in LT else n)
    print(f"| {t} | {n} | {ramp} | {max(1, math.ceil(nn/ramp))} ({nn}/{ramp} = {nn/ramp:.2f}) | {have} | {n/have:.1f} | {V39[t]} |")
