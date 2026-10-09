"""v3.7 spells (free casts, no MP regen, v3.7 boss HP: location ~15 / realm ~20 correct answers) + quests campaign sims -> build/v3/sim/v3_spells.txt (+ v3_spells_summary.json).
Usage: python spells_runner.py [n]"""
import sys, json, statistics as st
sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import spells_sim as X, spells_data as D
C = X.C
n = int(sys.argv[1]) if len(sys.argv) > 1 else 150
G = dict(save_next_gear=True)                                     # Blacksmith-first nudge (kept from v3.3)
V33 = dict(G, rules='v33', boss_mult=0.5, ward_minions=True)      # v3.3 rules: cast = question, fizzle spends MP, Ward
V35 = dict(G)                                                     # v3.6 default: v3.5 rules (free cast, MP the only limit, K x1.25, no Ward, Freeze not on bosses, 2.5 s per cast) + no MP regen + v3.6 boss HP / ATK x0.8
OLD = dict(G, regen=1, boss_hp=False, boss_atk={}, boss_inn_mp=0)  # same-seed replica of v3.5 (regen +1, v3.5 boss stats, no MP check at the boss gate)
STY = {'free': 'v3.7 free', 'save': 'v3.7 save', 'save_tea': 'v3.7 save+tea', 'free_tea': 'v3.7 free+tea'}
MAIN = ('no spells', 'v3.7 free', 'v3.7 save', 'v3.7 save+tea')
cfg = {}
for p in (0.5, 0.65, 0.75, 0.9):
    for kid in ('saver', 'spender'):
        cfg[(p, 'on', kid, 'no spells')] = (p, True, kid, 'off')
        for sty in ('free', 'save', 'save_tea'):
            cfg[(p, 'on', kid, STY[sty])] = (p, True, kid, 'spend', dict(V35, mp_style=sty))
for p in (0.75, 0.9):
    for kid in ('saver', 'spender'):
        cfg[(p, 'on', kid, 'v3.7 free+tea')] = (p, True, kid, 'spend', dict(V35, mp_style='free_tea'))
for p in (0.75, 0.5):                                              # sensitivity: boss gate far from the inn (kid only goes back below 50% HP)
    cfg[(p, 'on', 'saver', 'no spells, far gate')] = (p, True, 'saver', 'off', dict(boss_inn_below=0.5))
    for sty in ('free', 'save', 'save_tea'):
        cfg[(p, 'on', 'saver', f'{STY[sty]}, far gate')] = (p, True, 'saver', 'spend', dict(V35, mp_style=sty, boss_inn_below=0.5))
for kid in ('saver', 'spender'):
    cfg[(0.75, 'off', kid, 'no spells')] = (0.75, False, kid, 'off')
    cfg[(0.75, 'off', kid, 'v3.7 free')] = (0.75, False, kid, 'spend', dict(V35, mp_style='free'))
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
def min_share(rs, kind):
    v = [turns(rs, kind, t)['share'] for t in range(2, 10)]
    v = [x for x in v if x == x]
    return min(v) if v else float('nan')
P(f'v3.7 spells (free casts) + quests campaign sim (realms 1-9 chained), n={n} campaigns per row. "v3.7" = v3.5 rules (free cast, no question, NO cast cap, MP cost = {D.K_MULT:g} x v3.4, fixed spell power, Super Blizzard Freeze 1 turn and not on bosses, {D.CAST_ANIM_SEC:g} s per cast) '
  '+ NO MP regen on correct answers (MP only from the inn, waking after a defeat, or map-only Mana Tea) + v3.7 boss HP (location x1.2-1.9 for ~15 correct answers, realm x1.05-1.85 for ~20; see boss_hp) and boss ATK x0.8, no MP hints (v3.6). '
  'v3.6 (location bosses ~20 correct answers) is the archived run in build/v3/archive_v3_6 (same code and seeds); v3.5 is in build/v3/archive_v3_5. '
  'no Ward, Mana Tea 6xG / Big Mana Tea 15xG map-only, Blacksmith-first nudge. MP styles: free = casts in every fight whenever a spell beats an attack; save = in normal fights keeps MP for 2 casts of its strongest spell (casts freely in elite and boss fights); '
  'save+tea / free+tea = also keeps 1 Mana Tea (Big Mana Tea from town 5) in stock and drinks it at the boss gate. Default boss gate: the kid visits the inn first when HP < 80% (save styles also when MP < 60%; no hint tells them to); "far gate" = only when HP < 50%. Heal and Shield are kept 20 MP in reserve by Sweep / Frost. '
  'Question share = questions / (questions + non-question turns: casts and potions). Hero turns cast = casts / (casts + hero question turns).')
P('')
P('### A. Whole campaign')
P('| acc | speech | kid | mode | playthrough h | spells owned | defeat % | boss 1st-try | boss q | normal q | question share normal / elite / boss | hero turns cast normal / elite / boss | casts per battle normal / elite / boss | heals/b | full-gear share | free inns | gold=0 | MP at battle start | MP at boss start | boss HP lost | casts per boss battle | Mana Tea bought / drunk per run | tea gold per run | proficient at realm end |')
P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
summary = {}
for k, rs in R.items():
    v33 = k[3].startswith('v3.3'); bat = realm_tot(rs, lambda x: x['battles'])
    tn, te, tb = (turns(rs, kd, v33=v33) for kd in ('normal', 'elite', 'boss'))
    row = dict(h=mean([r['total_minutes'] for r in rs])/60, spells=mean([len(r['realms'][-1]['spells_owned']) for r in rs]),
        defeat=realm_tot(rs, lambda x: x['defeats'])/bat, bossfirst=realm_tot(rs, lambda x: x['boss_first'])/sum(C.LOCS[t] for t in range(1, 10)),
        bossq=mean([q for r in rs for x in r['realms'] for q in x['boss_q']]), normq=mean([q for r in rs for x in r['realms'] for q in x['normal_q']]),
        share_n=tn['share'], share_e=te['share'], share_b=tb['share'], herocast=tn['herocast'], herocast_e=te['herocast'], herocast_b=tb['herocast'], cpb_n=tn['cpb'], cpb_e=te['cpb'], cpb_b=tb['cpb'],
        heals=realm_tot(rs, lambda x: x['heals'])/bat, gear=realm_tot(rs, lambda x: x['battles_full_gear'])/bat, free=realm_tot(rs, lambda x: x['inn_free']),
        zero=realm_tot(rs, lambda x: x['gold_zero']), mp=mean([m for r in rs for x in r['realms'][1:] for m in x['mp_start']]),
        tea_b=realm_tot(rs, lambda x: x['tea_bought']), tea_u=realm_tot(rs, lambda x: x['tea_used']), tea_gold=realm_tot(rs, lambda x: x['tea_gold']),
        boss_mp=mean([m for r in rs for x in r['realms'][1:] for m in x['boss_mp_start']]), boss_hp=mean([m for r in rs for x in r['realms'][1:] for m in x['boss_hp_lost']]),
        min_n=min_share(rs, 'normal'), min_e=min_share(rs, 'elite'), min_b=min_share(rs, 'boss'), prof=mean([x['prof_end'] for r in rs for x in r['realms']]))
    summary[' | '.join(map(str, k))] = row
    P(f"| {k[0]:.0%} | {k[1]} | {k[2]} | {k[3]} | {row['h']:.1f} | {row['spells']:.1f} | {pct(row['defeat'])} | {row['bossfirst']:.2f} | {row['bossq']:.1f} | {row['normq']:.1f} | "
      f"{row['share_n']:.3f} / {row['share_e']:.3f} / {row['share_b']:.3f} | {pct(row['herocast'])} / {pct(row['herocast_e'])} / {pct(row['herocast_b'])} | {row['cpb_n']:.2f} / {row['cpb_e']:.2f} / {row['cpb_b']:.2f} | {row['heals']:.2f} | {row['gear']:.2f} | "
      f"{row['free']:.1f} | {row['zero']:.2f} | {row['mp']:.0%} | {row['boss_mp']:.0%} | {row['boss_hp']:.0%} | {row['cpb_b']:.2f} | {row['tea_b']:.1f} / {row['tea_u']:.1f} | {row['tea_gold']:.0f} | {row['prof']:.0%} |")
P('')
for p, kid in ((0.75, 'saver'), (0.75, 'spender'), (0.5, 'saver'), (0.9, 'saver'), (0.65, 'saver')):
    P(f'### B. Per realm, {p:.0%} {kid}')
    P('| realm | mode | battles | defeat % | boss 1st-try | boss q | normal q | q share normal / elite / boss | casts/b normal / boss | min/location | MP at battle start | spell castable at start | heals/b | full gear | gold start | min gold | free inns | spell spend | gear spend | proficient at end |')
    P('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|')
    for t in range(1, 10):
        for mode in MAIN:
            rs = R[(p, 'on', kid, mode)]; b = rm(rs, t, 'battles'); v33 = False
            tn, te, tb = (turns(rs, kd, t, v33) for kd in ('normal', 'elite', 'boss'))
            cc = mean([c for r in rs for c in r['realms'][t-1]['can_cast']])
            P(f"| {t} | {mode} | {b:.1f} | {pct(rm(rs, t, 'defeats')/b)} | {rm(rs, t, 'boss_first')/C.LOCS[t]:.2f} | {mean([q for r in rs for q in r['realms'][t-1]['boss_q']]):.1f} | "
              f"{mean([q for r in rs for q in r['realms'][t-1]['normal_q']]):.1f} | {tn['share']:.3f} / {te['share']:.3f} / {tb['share']:.3f} | {tn['cpb']:.2f} / {tb['cpb']:.2f} | {rm(rs, t, 'minutes')/C.LOCS[t]:.1f} | "
              f"{mean([m for r in rs for m in r['realms'][t-1]['mp_start']]):.0%} | {cc:.0%} | {rm(rs, t, 'heals')/b:.2f} | {rm(rs, t, 'battles_full_gear')/b:.2f} | {rm(rs, t, 'gold_start'):.0f} | "
              f"{rm(rs, t, 'min_gold'):.0f} | {rm(rs, t, 'inn_free'):.2f} | {rm(rs, t, 'spent_spells'):.0f} | {rm(rs, t, 'spent_gear'):.0f} | {rm(rs, t, 'prof_end'):.0%} |")
P('')
P('### C. Spell price in effort (75% saver, v3.7 save)')
rs = R[(0.75, 'on', 'saver', 'v3.7 save')]
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
for kk in [(0.75, 'on', 'saver', 'v3.7 save'), (0.75, 'on', 'spender', 'v3.7 save'), (0.9, 'on', 'saver', 'v3.7 save'), (0.65, 'on', 'saver', 'v3.7 save'), (0.5, 'on', 'saver', 'v3.7 save')]:
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
P('### E. Gold and MP timeline (75% saver, speech on; median gold at realm end, mean MP at battle / boss start)')
P('| realm | no spells: gold at end | free: gold at end | save: gold at end | save+tea: gold at end | save: spells owned | free / save / save+tea: MP at battle start | free / save / save+tea: MP at boss start | save+tea: teas bought / drunk, tea gold | save: spell spend | save: gear spend |')
P('|---|---|---|---|---|---|---|---|---|---|---|')
for t in range(1, 10):
    a, f_, s_, st_ = (R[(0.75, 'on', 'saver', m)] for m in MAIN)
    g = lambda rs: st.median([r['realms'][t-1]['gold_end'] for r in rs])
    mps = lambda rs, k: mean([m for r in rs for m in r['realms'][t-1][k]])
    P(f"| {t} | {g(a):.0f} | {g(f_):.0f} | {g(s_):.0f} | {g(st_):.0f} | {mean([len(r['realms'][t-1]['spells_owned']) for r in s_]):.1f} | "
      f"{mps(f_, 'mp_start'):.0%} / {mps(s_, 'mp_start'):.0%} / {mps(st_, 'mp_start'):.0%} | {mps(f_, 'boss_mp_start'):.0%} / {mps(s_, 'boss_mp_start'):.0%} / {mps(st_, 'boss_mp_start'):.0%} | "
      f"{rm(st_, t, 'tea_bought'):.2f} / {rm(st_, t, 'tea_used'):.2f}, {rm(st_, t, 'tea_gold'):.0f} | {rm(s_, t, 'spent_spells'):.0f} | {rm(s_, t, 'spent_gear'):.0f} |")
P('')
P('### F. Boss fights by realm (75% and 50% saver): first-try win / questions per boss battle / casts per boss battle / HP lost')
P('| realm | acc | no spells | free | save | save+tea | length target (q) |')
P('|---|---|---|---|---|---|---|')
for t in range(1, 10):
    for p in (0.75, 0.5):
        cells = []
        for mode in MAIN:
            rs = R[(p, 'on', 'saver', mode)]
            cells.append(f"{rm(rs, t, 'boss_first')/C.LOCS[t]:.2f} / {mean([q for r in rs for q in r['realms'][t-1]['boss_q']]):.1f} / {turns(rs, 'boss', t)['cpb']:.2f} / {mean([v for r in rs for v in r['realms'][t-1]['boss_hp_lost']]):.0%}")
        P(f"| {t} | {p:.0%} | {' | '.join(cells)} | ~15 (location) / ~20 (realm) correct answers even with full-MP spells (v3.7) |")
P('')
P('### G. Question share, cast share, hours and defeats, v3.7 vs v3.6 (by kid profile, speech on)')
P('v3.6 = archived v3.6 run (build/v3/archive_v3_6, same code, seeds and styles; location bosses at ~20 correct answers). Min by tier = lowest per-realm share over realms 2-9; FLAG = below 0.85.')
P('| kid | style | v3.6 q share n / e / b | v3.7 q share n / e / b | v3.7 min by tier n / e / b | v3.6 hero turns cast n / b | v3.7 hero turns cast n / e / b | v3.7 casts per battle n / e / b | v3.6 / v3.7 h | v3.6 / v3.7 defeat % | v3.6 / v3.7 boss q | flag |')
P('|---|---|---|---|---|---|---|---|---|---|---|---|')
A35 = json.load(open('/workspace/desy/build/v3/archive_v3_6/v3_spells_summary.json'))['summary']
flags = []
for p in (0.5, 0.65, 0.75, 0.9):
    for kid in ('saver', 'spender'):
        for mode in MAIN + (('v3.7 free+tea',) if p in (0.75, 0.9) else ()):
            o = A35.get(f"{p} | on | {kid} | {mode.replace('v3.7', 'v3.6')}")
            v = summary[f'{p} | on | {kid} | {mode}']
            mins = (v['min_n'], v['min_e'], v['min_b']); fl = ', '.join(nm for nm, x in zip(('normal', 'elite', 'boss'), mins) if x < 0.85)
            if fl: flags.append(f'{p:.0%} {kid} {mode}: {fl}')
            P(f"| {p:.0%} {kid} | {mode.replace('v3.7 ', '')} | {o['share_n']:.3f} / {o['share_e']:.3f} / {o['share_b']:.3f} | {v['share_n']:.3f} / {v['share_e']:.3f} / {v['share_b']:.3f} | "
              f"{mins[0]:.3f} / {mins[1]:.3f} / {mins[2]:.3f} | {pct(o['herocast'])} / {pct(o['herocast_b'])} | {pct(v['herocast'])} / {pct(v['herocast_e'])} / {pct(v['herocast_b'])} | {v['cpb_n']:.2f} / {v['cpb_e']:.2f} / {v['cpb_b']:.2f} | "
              f"{o['h']:.1f} / {v['h']:.1f} | {pct(o['defeat'])} / {pct(v['defeat'])} | {o['bossq']:.1f} / {v['bossq']:.1f} | {fl or '-'} |")
for k, v in summary.items():
    if ', far gate' in k and 'no spells' not in k:
        fl = ', '.join(nm for nm, x in zip(('normal', 'elite', 'boss'), (v['min_n'], v['min_e'], v['min_b'])) if x < 0.85)
        if fl: flags.append(f'{k}: {fl}')
P('')
P('Flags (per-realm question share below 0.85): ' + ('; '.join(flags) if flags else 'none'))
P('')
P('### H. Does saving MP pay off? (realms 2-9 bosses; speech on)')
P('| acc | kid | style | boss 1st-try | boss q | boss HP lost | MP at boss start | casts per boss battle | normal q | defeat % | tea gold per run | playthrough h |')
P('|---|---|---|---|---|---|---|---|---|---|---|---|')
def bstats(rs):
    return (mean([x['boss_first']/C.LOCS[x['t']] for r in rs for x in r['realms'][1:]]), mean([q for r in rs for x in r['realms'][1:] for q in x['boss_q']]),
            mean([v for r in rs for x in r['realms'][1:] for v in x['boss_hp_lost']]), mean([v for r in rs for x in r['realms'][1:] for v in x['boss_mp_start']]),
            mean([v for r in rs for x in r['realms'][1:] for v in x['boss_casts']]))
payoff = {}
for k, rs in R.items():
    if k[1] != 'on': continue
    b = bstats(rs); sm = summary[' | '.join(map(str, k))]; payoff[' | '.join(map(str, k))] = b
    P(f"| {k[0]:.0%} | {k[2]} | {k[3]} | {b[0]:.3f} | {b[1]:.1f} | {b[2]:.0%} | {b[3]:.0%} | {b[4]:.2f} | {sm['normq']:.1f} | {pct(sm['defeat'])} | {sm['tea_gold']:.0f} | {sm['h']:.1f} |")
P('')
P('### I. Boss target check: correct answers to win one boss fight (v3.7)')
P('One boss fight from full HP and full MP at the recommended level with full gear and the 2 strongest spells of towns t and t-1; "full-MP spells" = every MP point spent on spells (no Heal reserve), "no spells" = attacks only. Won fights only; correct = hero + block answers. 600 fights per cell (build/v3/explore/boss_harness.py). Target with full-MP spells: about 15 for location bosses, about 20 for realm bosses (v3.7).')
P('| tier | boss | HP v3.5 -> v3.7 (mult) | ATK v3.5 -> v3.7 | 75%: correct no spells / full-MP spells | 75%: casts | 75%: questions no spells / spells | 50%: correct no spells / spells | 50%: win no spells / spells | 90%: correct no spells / spells |')
P('|---|---|---|---|---|---|---|---|---|---|')
BC = {a: json.load(open(f'/workspace/desy/build/v3/sim/v37_boss_check_{a}.json')) for a in ('0.75', '0.5', '0.9')}
bosscheck = {}
for t in range(1, 10):
    for k in ('locboss', 'realmboss'):
        e = C.enemy(t, k); m = D.BOSS_HP_MULT[(t, k)]; c = lambda a, lab, f='correct': BC[a][f'{t},{k}'][lab][f]
        bosscheck[f'{t},{k}'] = {a: BC[a][f'{t},{k}'] for a in BC}
        P(f"| {t} | {'location' if k == 'locboss' else 'realm'} | {e['HP']} -> {round(e['HP']*m)} (x{m:g}) | {e['ATK']} -> {round(e['ATK']*D.BOSS_ATK_MULT[k])} | {c('0.75', 'none'):.1f} / {c('0.75', 'spells'):.1f} | {c('0.75', 'spells', 'casts'):.1f} | "
          f"{c('0.75', 'none', 'q'):.1f} / {c('0.75', 'spells', 'q'):.1f} | {c('0.5', 'none'):.1f} / {c('0.5', 'spells'):.1f} | {c('0.5', 'none', 'win'):.2f} / {c('0.5', 'spells', 'win'):.2f} | {c('0.9', 'none'):.1f} / {c('0.9', 'spells'):.1f} |")
open('/workspace/desy/build/v3/sim/v3_spells.txt', 'w').write('\n'.join(out) + '\n')
json.dump(dict(n=n, summary=summary, effort=eff, timeline=tl, payoff=payoff, flags=flags, bosscheck=bosscheck), open('/workspace/desy/build/v3/sim/v3_spells_summary.json', 'w'), indent=1, ensure_ascii=False)
print('\n'.join(out))
