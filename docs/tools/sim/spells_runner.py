"""v3.4 spells (free casts) + quests campaign sims -> build/v3/sim/v3_spells.txt (+ v3_spells_summary.json).
Usage: python spells_runner.py [n]"""
import sys, json, statistics as st
sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import spells_sim as X, spells_data as D
C = X.C
n = int(sys.argv[1]) if len(sys.argv) > 1 else 150
G = dict(save_next_gear=True)                                     # Blacksmith-first nudge (kept from v3.3)
V33 = dict(G, rules='v33', boss_mult=0.5, ward_minions=True)      # v3.3 rules: cast = question, fizzle spends MP, Ward
V34 = dict(G)                                                     # v3.4 default: free cast, CAST_RULE, no Ward
R1 = dict(normal=1, elite=1, boss=1, min_correct=0)
R3 = dict(normal=99, elite=99, boss=99, back_to_back=False)
cfg = {}
for p in (0.5, 0.65, 0.75, 0.9):
    for kid in ('saver', 'spender'):
        cfg[(p, 'on', kid, 'no spells')] = (p, True, kid, 'off')
        cfg[(p, 'on', kid, 'v3.3 spells')] = (p, True, kid, 'spend', V33)
        cfg[(p, 'on', kid, 'v3.4 spells')] = (p, True, kid, 'spend', V34)
        cfg[(p, 'on', kid, 'v3.4 + Ward')] = (p, True, kid, 'spend', dict(V34, boss_mult=0.5, ward_minions=True))
for kid in ('saver', 'spender'):
    cfg[(0.75, 'on', kid, 'v3.4, 1 cast/battle, no charge')] = (0.75, True, kid, 'spend', dict(V34, cast_rule=R1))
    cfg[(0.75, 'on', kid, 'v3.4, no cap (no back-to-back)')] = (0.75, True, kid, 'spend', dict(V34, cast_rule=R3))
    cfg[(0.75, 'on', kid, 'v3.4, no nudge, spell-first')] = (0.75, True, kid, 'spend', dict(order='spell_first'))
    cfg[(0.75, 'off', kid, 'no spells')] = (0.75, False, kid, 'off')
    cfg[(0.75, 'off', kid, 'v3.4 spells')] = (0.75, False, kid, 'spend', V34)
res = X.run(list(cfg.values()), n)
key = lambda c: tuple(map(str, c[:4])) + (json.dumps(c[4] if len(c) > 4 else {}),)
R = {k: res[key(c)] for k, c in cfg.items()}
out = []; P = out.append
mean = lambda xs: st.mean(xs) if xs else float('nan')
def rm(rs, t, k): return mean([r['realms'][t-1][k] for r in rs])
def realm_tot(rs, f): return mean([sum(f(x) for x in r['realms']) for r in rs])
def pct(x): return f'{100*x:.1f}%'
def turns(rs, kind, t=None, v33=False):
    xs = [x for r in rs for i, Rr in enumerate(r['realms']) if t is None or i == t-1 for x in Rr['turns'] if x[0] == kind]
    if not xs: return dict(share=float('nan'), herocast=float('nan'), qpb=float('nan'), cpb=float('nan'))
    q = sum(x[1] for x in xs); c = sum(x[2] for x in xs); p = sum(x[3] for x in xs); hq = sum(x[5] for x in xs)
    if v33: return dict(share=q/(q+p), herocast=0.0, qpb=q/len(xs), cpb=c/len(xs))     # v3.3 casts asked a question
    return dict(share=q/(q+c+p), herocast=c/max(1, c+hq), qpb=q/len(xs), cpb=c/len(xs))
P(f'v3.4 spells (free casts) + quests campaign sim (realms 1-9 chained), n={n} campaigns per row. "v3.4 spells" = free cast (no question), fixed spell power, '
  f'cast rule {D.CAST_RULE}, no Ward, Mana Tea 6xG map-only, Blacksmith-first nudge. "v3.3 spells" = cast asks a question, fizzle spends MP, Ward x0.5, ATK-scaled damage. '
  'Question share = questions / (questions + non-question turns: casts and potions). Hero turns cast = casts / (casts + hero question turns).')
P('')
P('### A. Whole campaign')
P('| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast (normal) | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | Mana Tea bought / drunk per run | proficient at realm end |')
P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
summary = {}
for k, rs in R.items():
    v33 = k[3].startswith('v3.3'); bat = realm_tot(rs, lambda x: x['battles'])
    tn, te, tb = (turns(rs, kd, v33=v33) for kd in ('normal', 'elite', 'boss'))
    row = dict(h=mean([r['total_minutes'] for r in rs])/60, spells=mean([len(r['realms'][-1]['spells_owned']) for r in rs]),
        defeat=realm_tot(rs, lambda x: x['defeats'])/bat, bossfirst=realm_tot(rs, lambda x: x['boss_first'])/sum(C.LOCS[t] for t in range(1, 10)),
        bossq=mean([q for r in rs for x in r['realms'] for q in x['boss_q']]), normq=mean([q for r in rs for x in r['realms'] for q in x['normal_q']]),
        share_n=tn['share'], share_e=te['share'], share_b=tb['share'], herocast=tn['herocast'], cpb_n=tn['cpb'], cpb_e=te['cpb'], cpb_b=tb['cpb'],
        heals=realm_tot(rs, lambda x: x['heals'])/bat, gear=realm_tot(rs, lambda x: x['battles_full_gear'])/bat, free=realm_tot(rs, lambda x: x['inn_free']),
        zero=realm_tot(rs, lambda x: x['gold_zero']), mp=mean([m for r in rs for x in r['realms'][1:] for m in x['mp_start']]),
        tea_b=realm_tot(rs, lambda x: x['tea_bought']), tea_u=realm_tot(rs, lambda x: x['tea_used']), prof=mean([x['prof_end'] for r in rs for x in r['realms']]))
    summary[' | '.join(map(str, k))] = row
    P(f"| {k[0]:.0%} | {k[1]} | {k[2]} | {k[3]} | {row['h']:.1f} | {row['spells']:.1f} | {pct(row['defeat'])} | {row['bossfirst']:.2f} | {row['bossq']:.1f} | {row['normq']:.1f} | "
      f"{row['share_n']:.3f} / {row['share_e']:.3f} / {row['share_b']:.3f} | {pct(row['herocast'])} | {row['cpb_n']:.2f} / {row['cpb_e']:.2f} / {row['cpb_b']:.2f} | {row['heals']:.2f} | {row['gear']:.2f} | "
      f"{row['free']:.1f} | {row['zero']:.2f} | {row['mp']:.0%} | {row['tea_b']:.1f} / {row['tea_u']:.1f} | {row['prof']:.0%} |")
P('')
for p, kid in ((0.75, 'saver'), (0.75, 'spender'), (0.5, 'saver'), (0.9, 'saver'), (0.65, 'saver')):
    P(f'### B. Per realm, {p:.0%} {kid}')
    P('| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |')
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for t in range(1, 10):
        for mode in ('no spells', 'v3.3 spells', 'v3.4 spells'):
            rs = R[(p, 'on', kid, mode)]; b = rm(rs, t, 'battles'); v33 = mode.startswith('v3.3')
            tn, te, tb = (turns(rs, kd, t, v33) for kd in ('normal', 'elite', 'boss'))
            cc = mean([c for r in rs for c in r['realms'][t-1]['can_cast']])
            P(f"| {t} | {mode} | {b:.1f} | {pct(rm(rs, t, 'defeats')/b)} | {rm(rs, t, 'boss_first')/C.LOCS[t]:.2f} | {mean([q for r in rs for q in r['realms'][t-1]['boss_q']]):.1f} | "
              f"{mean([q for r in rs for q in r['realms'][t-1]['normal_q']]):.1f} | {tn['share']:.3f} / {te['share']:.3f} / {tb['share']:.3f} | {tn['cpb']:.2f} / {tb['cpb']:.2f} | {rm(rs, t, 'minutes')/C.LOCS[t]:.1f} | "
              f"{mean([m for r in rs for m in r['realms'][t-1]['mp_start']]):.0%} | {cc:.0%} | {rm(rs, t, 'heals')/b:.2f} | {rm(rs, t, 'battles_full_gear')/b:.2f} | {rm(rs, t, 'gold_start'):.0f} | "
              f"{rm(rs, t, 'min_gold'):.0f} | {rm(rs, t, 'inn_free'):.2f} | {rm(rs, t, 'spent_spells'):.0f} | {rm(rs, t, 'spent_gear'):.0f} | {rm(rs, t, 'prof_end'):.0%} |")
P('')
P('### C. Spell price in effort (75% saver, v3.4)')
rs = R[(0.75, 'on', 'saver', 'v3.4 spells')]
P('| spell | town | price | = normal kills at that town | that town\'s quests pay | kills if all quests done | normal fights | minutes at realm pace |')
P('|---|---|---|---|---|---|---|---|')
eff = {}
for s in D.SPELLS:
    t = s['town']; qg = sum(q['reward_gold'] for q in D.QUESTS if q['town'] == t and q['type'] != 'delivery') + sum(q['reward_gold'] for q in D.QUESTS if q['town'] == t-1 and q['type'] == 'delivery')
    gpf = mean([r['realms'][t-1]['income']/r['realms'][t-1]['battles'] for r in rs]); mpf = mean([r['realms'][t-1]['minutes']/r['realms'][t-1]['battles'] for r in rs])
    f = s['price']/gpf; eff[s['id']] = dict(kills=s['price']/D.G(t), kills_after_quests=max(0, s['price']-qg)/D.G(t), fights=f, minutes=f*mpf)
    P(f"| {s['zh']} {s['en']} | {t} | {s['price']} | {s['price']/D.G(t):.0f} | {qg} | {max(0, s['price']-qg)/D.G(t):.0f} | {f:.0f} | {f*mpf:.0f} |")
P('')
P('(D tables: median over runs; hours of play; first affordable = gold minus inn reserve >= price; % of runs that buy it)')
tl = {}
for kk in [(0.75, 'on', 'saver', 'v3.4 spells'), (0.75, 'on', 'spender', 'v3.4 spells'), (0.9, 'on', 'saver', 'v3.4 spells'), (0.65, 'on', 'saver', 'v3.4 spells'), (0.5, 'on', 'saver', 'v3.4 spells')]:
    rs = R[kk]; P(f'### D. Spell timeline, {kk[0]:.0%} {kk[2]}')
    P('| spell | town | sold from (h) | first affordable (realm, h) | bought by % of runs | bought (realm, h, battle #) |')
    P('|---|---|---|---|---|---|')
    for s in D.SPELLS:
        arr = st.median([r['realms'][s['town']-2]['min0']/60 + r['realms'][s['town']-2]['minutes']/60 for r in rs]) if s['town'] > 1 else 0
        af = [r['affordable'][s['id']] for r in rs if s['id'] in r['affordable']]
        bb = [b for r in rs for b in r['spell_buys'] if b['id'] == s['id']]
        a_s = f"{st.median([a['realm'] for a in af]):.0f}, {st.median([a['minutes'] for a in af])/60:.1f}" if af else '-'
        b_s = f"{st.median([b['realm'] for b in bb]):.0f}, {st.median([b['minutes'] for b in bb])/60:.1f}, {st.median([b['battle'] for b in bb]):.0f}" if bb else '-'
        P(f"| {s['zh']} {s['en']} | {s['town']} | {arr:.1f} | {a_s} | {100*len(bb)/len(rs):.0f}% | {b_s} |")
        tl[f"{kk[0]}|{kk[2]}|{s['id']}"] = dict(bought_pct=len(bb)/len(rs))
P('')
P('### E. Gold and MP timeline (75% saver, speech on; median gold at realm end, mean MP at battle start)')
P('| realm | no spells: gold at end | v3.3: gold at end | v3.4: gold at end | v3.4 spells owned | v3.4 MP at battle start | v3.4 spell castable at start | v3.4 Mana Tea bought / drunk | v3.4 spell spend | v3.4 gear spend |')
P('|---|---|---|---|---|---|---|---|---|---|')
for t in range(1, 10):
    a, b3, b = (R[(0.75, 'on', 'saver', m)] for m in ('no spells', 'v3.3 spells', 'v3.4 spells'))
    P(f"| {t} | {st.median([r['realms'][t-1]['gold_end'] for r in a]):.0f} | {st.median([r['realms'][t-1]['gold_end'] for r in b3]):.0f} | {st.median([r['realms'][t-1]['gold_end'] for r in b]):.0f} | "
      f"{mean([len(r['realms'][t-1]['spells_owned']) for r in b]):.1f} | {mean([m for r in b for m in r['realms'][t-1]['mp_start']]):.0%} | {mean([c for r in b for c in r['realms'][t-1]['can_cast']]):.0%} | "
      f"{rm(b, t, 'tea_bought'):.2f} / {rm(b, t, 'tea_used'):.2f} | {rm(b, t, 'spent_spells'):.0f} | {rm(b, t, 'spent_gear'):.0f} |")
P('')
P('### F. Boss fights by realm (75% and 50% saver): first-try win / questions per boss battle / casts per boss battle')
P('| realm | acc | no spells | v3.3 (Ward) | v3.4 (no Ward) | v3.4 + Ward | length target (q) |')
P('|---|---|---|---|---|---|---|')
for t in range(1, 10):
    for p in (0.75, 0.5):
        cells = []
        for mode in ('no spells', 'v3.3 spells', 'v3.4 spells', 'v3.4 + Ward'):
            rs = R[(p, 'on', 'saver', mode)]
            cells.append(f"{rm(rs, t, 'boss_first')/C.LOCS[t]:.2f} / {mean([q for r in rs for q in r['realms'][t-1]['boss_q']]):.1f} / {turns(rs, 'boss', t)['cpb']:.2f}")
        P(f"| {t} | {p:.0%} | {' | '.join(cells)} | 18-25 (location), 22-30 (realm) |")
open('/workspace/desy/build/v3/sim/v3_spells.txt', 'w').write('\n'.join(out) + '\n')
json.dump(dict(n=n, summary=summary, effort=eff, timeline=tl), open('/workspace/desy/build/v3/sim/v3_spells_summary.json', 'w'), indent=1, ensure_ascii=False)
print('\n'.join(out))
