"""v3.6 boss harness: one boss fight from full HP/MP at the recommended level and full gear, owning the 2 best spells of towns t and t-1.
Reports correct answers (hero + block) and hero hits in won fights. Usage: boss_harness.py N acc regen [json hp_mult per (t,kind)] [style]"""
import sys, json, random, statistics as st, types
sys.path.insert(0, '/workspace/desy/build'); sys.path.insert(0, '/workspace/desy/build/v3')
import combat_sim as C, spells_data as D, spells_sim as X
N = int(sys.argv[1]); ACC = float(sys.argv[2]); REGEN = int(sys.argv[3])
HPM = (sys.argv[4] if sys.argv[4] == 'design' else json.loads(sys.argv[4])) if len(sys.argv) > 4 else {}
STYLE = sys.argv[5] if len(sys.argv) > 5 else 'dump'
USE_ATK = True
class Feed:
    def __init__(self, L, items, rng): self.rng = rng
    def next(self): return (self.rng.random() < ACC), 'rZE'
C.QuestionFeed = Feed
def run(t, kind, spells, rng):
    C.MPCFG = dict(C.MP_PRESETS[C.DEFAULT_MP]); C.MPCFG['regen'] = REGEN; C.COMPANION = dict(C.COMPANION_DEFAULT)
    C.SPELL_POLICY.update(mp_style=STYLE, min_gain=1.0, cast_rule={}, boss_mult=1.0, max_casts=None, keep_heal=False, ward_minions=False, regen_line=None, regen_big_only=None, save_casts=2)
    C.BOSS_HP_MULT.clear(); C.BOSS_ATK_MULT.clear(); C.BOSS_ATK_MULT.update(D.BOSS_ATK_MULT if USE_ATK else {})
    for k, v in (HPM if HPM != 'design' else {f'{a},{b}': m for (a, b), m in D.BOSS_HP_MULT.items()}).items(): C.BOSS_HP_MULT[(int(k.split(',')[0]), k.split(',')[1])] = v
    h = X.gear_stats(t, {'weapon', 'armor', 'shield'})
    S = dict(hero=h, hp=h['HP'], mp=h['MP'], gold=0, potions=1, heal=t >= 2, shield=t >= 2, campaign=True, species=None, spells=spells, tea=0,
             sweep=t >= 7, frost=t >= 8, second_wind=t >= 9)
    S['_casts'] = 0; S['_sw'] = False
    L = types.SimpleNamespace(bq=0, bs=0)
    stats = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0, practice_q=0, kills=__import__('collections').Counter())
    won, *_ = C.battle(t, S, L, [], kind, rng, stats)
    return won, stats['correct'], stats['q'], stats.get('spell_casts', 0), (h['HP'] - max(0, S['hp']))/h['HP'], stats.get('hero_q', 0)
def best_spells(t):
    c = [s for s in D.SPELLS if s['town'] in (t, t-1)]
    return sorted(c, key=lambda s: -s['power'])[:2] if c else []
out = {}
for t in range(1, 10):
    for kind in ('locboss', 'realmboss'):
        rng = random.Random(t*100 + (kind == 'realmboss'))
        row = {}
        for lab, sp in (('none', []), ('spells', best_spells(t))):
            r = [run(t, kind, sp, rng) for _ in range(N)]
            w = [x for x in r if x[0]]
            row[lab] = dict(win=len(w)/N, correct=st.mean(x[1] for x in w) if w else float('nan'), q=st.mean(x[2] for x in w) if w else float('nan'),
                            casts=st.mean(x[3] for x in r), hp_lost=st.mean(x[4] for x in r))
        out[f'{t},{kind}'] = row
        print(f"t{t} {kind:9s} none: win {row['none']['win']:.2f} correct {row['none']['correct']:5.1f} q {row['none']['q']:5.1f} hp {row['none']['hp_lost']:.2f} | "
              f"spells: win {row['spells']['win']:.2f} correct {row['spells']['correct']:5.1f} q {row['spells']['q']:5.1f} casts {row['spells']['casts']:.2f} hp {row['spells']['hp_lost']:.2f}")
json.dump(out, open(f'/tmp/boss_harness_{ACC}_{REGEN}.json', 'w'))
