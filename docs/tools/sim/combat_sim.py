"""Combat + economy + proficiency simulator, spec v3 (2026-09-28).
v3 changes: location pools read from data/curriculum_location_pools.csv (curriculum v2, 47-60 items),
carry-over cap 20, MP regen +1 per correct answer, rebalanced MP costs + per-battle skill limits,
spoken share capped at ~50% per battle, companion team attack gauge, optional pre-battle practice
(practice counts at most 1 of the 2 correct answers per way), minutes-per-location estimate.
v3.1: speech-on boss trigger 20% (TRIGGER_SPEECH). v3.2: NEW_CAP 3 as a hard cap; Tired at 30 questions (normal battles,
incl. elites) / 45 (location and realm bosses; location boss was 40). v3.2b: half-up rounding in combat (Math.round), stat bands unchanged.
Run:  python combat_sim.py            -> full report (writes combat_sim_out.txt via shell redirect)
      python combat_sim.py quick      -> smaller run
Models: persistent HP/MP between battles (no auto-heal), paid inn, potions, gold drops + chests,
4 answer ways with per-way accuracy, proficiency = 2 correct per way (total or in-a-row),
engine picks the weakest way per question, boss-approach patrols until pool proficiency >= threshold.
Hero is fixed at the recommended level and gear for the tier (no leveling or shopping for gear inside a run).
"""
import random, math, statistics, sys, csv, os, collections
import builtins
def round(x, nd=None):
    """v3.2: half-up rounding like the spec and the prototype (JS Math.round); Python's round is half-to-even."""
    return math.floor(x + 0.5) if nd is None else builtins.round(x, nd)
from multiprocessing import Pool

# ---------------- world tables ----------------
LREC = [2, 4, 6, 9, 12, 15, 18, 21, 24]
ENEM = {1:(1,2),2:(1,2),3:(2,2),4:(2,3),5:(2,3),6:(3,3),7:(3,3),8:(3,3),9:(3,3)}
HITS = {1:3,2:3,3:2.5,4:2.25,5:2.25,6:2,7:2,8:2,9:2}
LOCS = {1:3,2:2,3:2,4:3,5:2,6:2,7:2,8:2,9:2}
REVIEW_SLOTS = {1:1,2:1,3:2,4:2,5:2,6:2,7:3,8:3,9:3}   # realm 1 location 1 uses 0
PATH_ENCOUNTERS = 6        # scripted fights per location before the boss approach zone
LOCAL_ITEMS = 30   # v2 value; v3 uses LOC_SIZES from the curriculum
_POOLS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data', 'curriculum_location_pools.csv')
def _loc_sizes():
    c = collections.Counter()
    for r in csv.DictReader(open(_POOLS, encoding='utf-8')): c[(int(r['realm_no']), int(r['location_no']))] += 1
    out = {}
    for (t, l), n in sorted(c.items()): out.setdefault(t, []).append(n)
    return out
LOC_SIZES = _loc_sizes() if os.path.exists(_POOLS) else {t: [30]*n for t, n in LOCS.items()}
CARRY_CAP = 20      # max not-yet-proficient earlier items folded into a boss pool
PRIOR_ITEMS = 100   # earlier items the kid has met when entering tier t > 1 (70% proficient)
SEC_PER_Q = 9.2     # battle seconds per question incl. animation (playtest estimate)
SEC_PER_PRACTICE_Q = 5.0
SET_SIZE = 7
NEW_CAP = 3          # v3.2: Jack's cap (prototype balance.json newCap 3), hard cap every battle (was 4, soft)
DEFAULT_WORKING_SET = 10
WORKING_SET = 10     # 0 = off; else max seen-but-not-proficient local items before new ones are introduced

def lrec(t): return LREC[t-1] if t <= 9 else 24 + 3*(t-9)
def hero_stats(t):
    L = lrec(t); g = t
    return dict(HP=30+6*L, MP=10+2*L, ATK=3*g+2+L//2, DEF=(2*g+1)+g+L//3)
def enemy(t, kind='normal'):
    round = builtins.round   # stat bands stay as authored in the roster (enemies.json / prototype); half-up applies to combat resolution
    h = hero_stats(t); base = max(1, h['ATK'] - 0.5*t)
    if kind == 'normal':  return dict(HP=round(HITS[t]*base), ATK=round(1.1*h['DEF']), DEF=t, kind=kind)
    if kind == 'elite':   return dict(HP=2*round(HITS[t]*base), ATK=round(1.2*h['DEF']), DEF=t, kind=kind)   # 2x normal HP, location-boss ATK
    if kind == 'locboss': return dict(HP=round(5*base),       ATK=round(1.2*h['DEF']), DEF=t, kind=kind)
    if kind == 'realmboss': return dict(HP=round(7*base),     ATK=round(1.3*h['DEF']), DEF=t, kind=kind)

# ---------------- combat constants ----------------
K_BLOCK, K_BROKEN, BROKEN_FLOOR = 1.25, 0.5, 0.5
def smult(s): return 2.0 if s >= 10 else 1.5 if s >= 6 else 1.25 if s >= 3 else 1.0
def sdrop(s): return 6 if s >= 10 else 3 if s >= 6 else 0
SOFT_CAP_Q = {'normal': 30, 'locboss': 45, 'realmboss': 45}   # v3.2: Tired at 30 (normal battles, incl. elites) / 45 (all bosses); location boss was 40

# ---------------- economy ----------------
def gold_per_enemy(t): return 3*lrec(t)                   # normal; +-20% random
ECON = dict(inn_mult=2.0, potion_mult=1.0, potion_heal=0.40, big_potion_heal=0.70)
def inn_price(t):    return round(ECON['inn_mult']*gold_per_enemy(t))
def potion_price(t): return round(ECON['potion_mult']*gold_per_enemy(t))
CHEST_RATE = {'normal': 0.10, 'elite': 0.25, 'locboss': 1.0, 'realmboss': 1.0}
GOLD_MULT = {'normal': 1, 'elite': 2, 'locboss': 5, 'realmboss': 10}
TRIGGER_SPEECH = 0.20        # v3.1: Director's call (was 0.25)
TRIGGER_READING = 0.40
ELITE_PATROL_CHANCE = 0.10   # chance that a boss-approach patrol includes 1 elite (replaces a normal)
SPECIAL = None               # set per battle: 'queen_bee' | 'hydra' | 'shadow_dragon' | 'troll'
MP_COST = dict(heal=6, shield=5)            # v2 costs (no regen)
HEAL_FRAC = 0.35
MPCFG = dict(regen=0, heal=6, shield=5, heal_limit=99, heal_frac=0.35)   # overwritten per run
MP_PRESETS = {
    'v2':      dict(regen=0, heal=6,  shield=5, heal_limit=99, heal_frac=0.35),
    'regen_v2costs': dict(regen=1, heal=6,  shield=5, heal_limit=2,  heal_frac=0.35),
    'regen_a': dict(regen=1, heal=10, shield=8, heal_limit=2,  heal_frac=0.30),
    'regen_b': dict(regen=1, heal=12, shield=8, heal_limit=1,  heal_frac=0.30),
    'regen_c': dict(regen=1, heal=15, shield=10, heal_limit=1, heal_frac=0.30),
}
DEFAULT_MP = 'regen_b'
SPOKEN_CAP = 0.5    # max share of spoken questions per battle (None = off)
COMPANION_DEFAULT = dict(on=True, per_wrong=20, per_correct=5, full=100, mult=1.25)
COMPANION = dict(COMPANION_DEFAULT)
COURAGE_STEP = 0.20   # safety net: +20% DEF per consecutive defeat (max +60%), resets on a win
POTION_CAP = 3
WEAPON_PRICE = [60, 120, 220, 380, 650, 900, 1150, 1400, 1700]
def gear_prices(t):
    w = WEAPON_PRICE[min(t, 9)-1] if t <= 9 else 190*t
    return [w, round(0.8*w), round(0.6*w)]          # next-tier weapon/armor/shield, then cosmetics

# ---------------- learner model ----------------
WAYS_ALL = ['rZE', 'rEZ', 'sZE', 'sEZ']   # reading ZH>EN, reading EN>ZH, spoken ZH>EN, spoken EN>ZH
ASR_EN_MISS = 0.05      # en-US recognizer rejects a correct English answer 5% of the time
ASR_ZH_MISS = 0.15      # zh-CN recognizer rejects a correct child Mandarin answer 15% of the time
PROD_GAP = 0.10         # saying Chinese from memory is 10 points harder than recognizing it
LEARN_STEP = 0.04       # each prior correct in a way adds 4 points
CAP = 0.97
def way_acc(p, w, corr):
    a = min(CAP, p + LEARN_STEP*corr) if w != 'sEZ' else min(CAP, p - PROD_GAP + LEARN_STEP*corr)
    if w == 'rEZ': a = max(0.05, a - 0.03)
    if w == 'sZE': a *= (1 - ASR_EN_MISS)
    if w == 'sEZ': a *= (1 - ASR_ZH_MISS)
    return max(0.02, a)

class Item:
    __slots__ = ('corr', 'att', 'run', 'sat', 'seen', 'uid', 'pc')
    def __init__(self, uid, ways, prof=False):
        self.uid = uid; self.seen = prof; self.pc = {}
        self.corr = {w: (2 if prof else 0) for w in ways}; self.att = {w: self.corr[w] for w in ways}
        self.run = {w: 0 for w in ways}; self.sat = {w: prof for w in ways}

class Learner:
    def __init__(self, p, speech, rule, rng):
        self.p = p; self.ways = WAYS_ALL if speech else WAYS_ALL[:2]; self.rule = rule; self.rng = rng
    def way_done(self, it, w):
        return it.sat[w] if self.rule == 'row' else it.corr[w] >= 2
    def proficient(self, it): return all(self.way_done(it, w) for w in self.ways)
    def reading_prof(self, it): return all(it.corr[w] >= 2 for w in ('rZE', 'rEZ'))
    def progress(self, it):
        return sum(min(2, it.corr[w]) if self.rule == 'total' else (2 if it.sat[w] else it.run[w]) for w in self.ways) / (2*len(self.ways))
    def pick_way(self, it):
        todo = [w for w in self.ways if not self.way_done(it, w)] or self.ways
        if SPOKEN_CAP is not None and len(self.ways) == 4 and getattr(self, 'bq', None) is not None:
            if self.bs + 1 > math.ceil(SPOKEN_CAP * (self.bq + 1)):
                todo = [w for w in todo if w[0] == 'r'] or ['rZE', 'rEZ']
        est = lambda w: (it.corr[w]+1)/(it.att[w]+2)
        return min(todo, key=lambda w: ((it.run[w] if self.rule == 'row' else it.corr[w]), est(w), self.rng.random()))
    def answer(self, it, w, practice=False):
        ok = self.rng.random() < way_acc(self.p, w, it.corr[w])
        it.att[w] += 1
        if not practice: it.seen = True   # practice exposure does not bypass NEW_CAP / working set
        if getattr(self, 'bq', None) is not None and not practice:
            self.bq += 1; self.bs += (w[0] == 's')
        if practice:                      # practice counts at most 1 of the 2 correct answers per way
            if ok and not it.pc.get(w):
                it.pc[w] = 1; it.corr[w] += 1; it.run[w] += 1
            elif not ok: it.run[w] = 0
            return ok, w
        if ok:
            it.corr[w] += 1; it.run[w] += 1
            if it.run[w] >= 2: it.sat[w] = True
        else: it.run[w] = 0
        return ok, w

def pool_score(L, pool, metric):
    if metric == 'items':   return sum(L.proficient(i) for i in pool)/len(pool)
    if metric == 'points':  return sum(L.progress(i) for i in pool)/len(pool)
    if metric == 'reading': return sum(L.reading_prof(i) for i in pool)/len(pool)
    if metric == 'items_s1':   # boss-readiness variant: spoken ways need only 1 correct
        return sum(all(i.corr[w] >= (1 if w[0] == 's' else 2) for w in L.ways) for i in pool)/len(pool)

# ---------------- item selection ----------------
def choose_set(L, local, prior, review_slots, rng):
    s = []
    if prior and review_slots:
        w = [(0.15 if L.proficient(i) else 1.0 + 2*(1-L.progress(i))) for i in prior]
        s += weighted_sample(prior, w, review_slots, rng)
    unseen = [i for i in local if not i.seen]; seen = [i for i in local if i.seen and i not in s]
    need = SET_SIZE - len(s)
    nq = min(NEW_CAP, len(unseen))
    if WORKING_SET:
        active = sum(1 for i in local if i.seen and not L.proficient(i))
        nq = min(nq, max(0, WORKING_SET - active))
    if len(seen) < need - nq: nq = min(len(unseen), need - len(seen))
    nq = min(nq, NEW_CAP)   # v3.2: the cap holds even when the set is short (set may have < 7 items early on)
    s += unseen[:nq]
    w = [(0.15 if L.proficient(i) else 1.0 + 2*(1-L.progress(i))) for i in seen]
    s += weighted_sample(seen, w, SET_SIZE - len(s), rng)
    if len(s) < SET_SIZE:
        rest = [i for i in prior if i not in s] + [i for i in local if i not in s and i.seen]; s += rest[:SET_SIZE-len(s)]   # never pad with unseen local items
    return sorted(s, key=lambda i: L.progress(i) + rng.uniform(0, 0.08))

def weighted_sample(items, w, k, rng):
    if k <= 0 or not items: return []
    keyed = sorted(zip(items, w), key=lambda x: rng.random() ** (1/max(x[1], 1e-6)), reverse=True)
    return [x[0] for x in keyed[:k]]

class QuestionFeed:
    def __init__(self, L, items, rng):
        self.L, self.rng = L, rng; self.unasked = list(items); self.items = items
        self.missed = []; self.hist = []; self.count = {i.uid: 0 for i in items}; self.score = {i.uid: 0.0 for i in items}
    def gap(self, it):
        for k, u in enumerate(reversed(self.hist)):
            if u == it.uid: return k
        return 99
    def next(self):
        if self.unasked: it = self.unasked.pop(0)
        else:
            m = [i for i in self.missed if self.gap(i) >= 2]
            if m: it = m[0]; self.missed.remove(it)
            else:
                pool = [i for i in self.items if self.gap(i) >= 2 and self.count[i.uid] < 4] or self.items
                it = min(pool, key=lambda i: self.L.progress(i) + self.score[i.uid] + self.rng.uniform(0, 0.1))
        w = self.L.pick_way(it); ok, w = self.L.answer(it, w)
        self.hist.append(it.uid); self.count[it.uid] += 1
        self.score[it.uid] += 0.15 if ok else -0.3
        if not ok: self.missed.append(it)
        return ok, w

# ---------------- one battle (persistent HP/MP) ----------------
# ---------------- v3.3 spells (campaign mode only) ----------------
SPELL_POLICY = dict(min_gain=1.25, keep_shield=True, heal_reserve_below=0.5, boss_mult=1.0, max_casts=None, keep_heal=False)   # boss_mult: Magic Ward on bosses; max_casts per battle
_FIGHT = ['normal']
def spell_damage(sp, h, f, tired):
    if 'power' in sp:   # v3.4 free cast: fixed power, full DEF, no streak/spoken bonus
        ward = f['kind'] in ('locboss', 'realmboss') or (SPELL_POLICY.get('ward_minions') and _FIGHT[0] in ('locboss', 'realmboss'))
        return max(1, round(sp['power'] * (1.5 if tired else 1) * (SPELL_POLICY['boss_mult'] if ward else 1) - f['DEF']))
    # spec: max(1, round(M x ATK_h x tired - 0.5 x DEF_e)); spells ignore the streak multiplier (streak still +1 on a correct cast)
    ward = f['kind'] in ('locboss', 'realmboss') or (SPELL_POLICY.get('ward_minions') and _FIGHT[0] in ('locboss', 'realmboss'))
    m = sp['mult'] * (SPELL_POLICY['boss_mult'] if ward else 1)
    return max(1, round(m*h['ATK']*(1.5 if tired else 1) - 0.5*f['DEF']))
def spell_targets(sp, live, tgt):
    if sp['target'] == 'single': return [tgt]
    if sp['target'] == 'all': return live[:3]
    return [f for f in live[:3] if f.get('sp') == tgt.get('sp')]          # same type as the chosen target
def cast_spell(S, h, foes, streak, tired, kind, shield_used, rng, stats, ask):
    live = [f for f in foes if f['HP'] > 0][:3]
    if not live: return False
    _FIGHT[0] = kind
    if SPELL_POLICY['max_casts'] is not None and S.get('_casts', 0) >= SPELL_POLICY['max_casts']: return False
    free = 'power' in S['spells'][0]
    if free:                                   # v3.4 cast rule
        cr = SPELL_POLICY.get('cast_rule') or {}
        boss_fight = kind in ('locboss', 'realmboss'); elite_fight = any(f['kind'] == 'elite' for f in foes)
        cap = cr.get('boss' if boss_fight else 'elite' if elite_fight else 'normal', 99)
        n = S.get('_casts', 0)
        if n >= cap: return False
        if S.get('_bcorrect', 0) < cr.get('min_correct', 0): return False
        if n >= 1 and boss_fight and cr.get('boss_second_after_q') and S.get('_bq', 0) - S.get('_last_cast_q', 0) < cr['boss_second_after_q']: return False
        if not cr.get('back_to_back', True) and S.get('_last_turn_cast'): return False
        if cr.get('gap_q') and n >= 1 and S.get('_bq', 0) - S.get('_last_cast_q', 0) < cr['gap_q']: return False
    atk_tgt = min(live, key=lambda f: f['HP'] if f['kind'] in ('normal', 'elite') else 1e9)
    atk_val = min(atk_tgt['HP'], max(1, round(h['ATK']*smult(streak)*(1.5 if tired else 1) - 0.5*atk_tgt['DEF'])))
    reserve = (MPCFG['shield'] if (SPELL_POLICY['keep_shield'] and S['shield'] and not shield_used) else 0)
    if S['heal'] and (S['hp'] < SPELL_POLICY['heal_reserve_below']*h['HP'] or SPELL_POLICY.get('keep_heal')): reserve += MPCFG['heal']
    if S.get('second_wind') and not S.get('_sw'): reserve = max(reserve, 20)
    best = None
    for sp in S['spells']:
        if S['mp'] - sp['mp'] < reserve: continue
        for tgt in live:
            ts = spell_targets(sp, live, tgt)
            val = 0
            for f in ts:
                val += min(f['HP'], spell_damage(sp, h, f, tired))
                p = sp.get('skip_p', 0) * (0.5 if f['kind'] in ('locboss', 'realmboss') else 1)
                if sp.get('soak'): p = 0.5 * (0.5 if f['kind'] in ('locboss', 'realmboss') else 1)
                if spell_damage(sp, h, f, tired) < f['HP']: val += p * 0.5 * f['ATK']
            if best is None or val > best[0]: best = (val, sp, tgt)
    if best is None or best[0] < SPELL_POLICY['min_gain']*atk_val: return False
    val, sp, tgt = best
    if free:
        S['mp'] -= sp['mp']; S['_last_cast_q'] = S.get('_bq', 0); S['_last_turn_cast'] = True
    elif S.get('fizzle') != 'refund': S['mp'] -= sp['mp']
    stats['spell_casts'] = stats.get('spell_casts', 0) + 1; S['_casts'] = S.get('_casts', 0) + 1
    if free or ask():
        if not free and S.get('fizzle') == 'refund': S['mp'] -= sp['mp']
        for f in spell_targets(sp, live, tgt):
            d = spell_damage(sp, h, f, tired); f['HP'] -= d; f['hit'] = True
            stats['spell_dmg'] = stats.get('spell_dmg', 0) + (d + min(0, f['HP']))
            if f['HP'] > 0:
                boss = f['kind'] in ('locboss', 'realmboss')
                if sp.get('soak'): f['soaked'] = True
                if sp.get('skip_p') and rng.random() < sp['skip_p']*(0.5 if boss else 1): f['frozen'] = True
    else:
        stats['fizzles'] = stats.get('fizzles', 0) + 1
    return True

def battle(t, S, L, qset, kind, rng, stats, resume_half=False, foes_override=None, special=None, elite=False):
    h = dict(S['hero']); feed = QuestionFeed(L, qset, rng)
    rnd = 0
    L.bq = 0; L.bs = 0; heals = 0; gauge = 0
    if S.get('courage'): h['DEF'] = h['DEF'] * (1 + COURAGE_STEP*min(3, S['courage']))
    if foes_override is not None:
        foes = [dict(f) for f in foes_override]
    elif kind == 'normal':
        n = rng.randint(*ENEM[t]); foes = [enemy(t) for _ in range(n)]
        if elite: foes[0] = enemy(t, 'elite')
    else:
        boss = enemy(t, kind)
        if resume_half: boss['HP'] = boss['HP']//2
        foes = [boss] + [enemy(t) for _ in range(1 if (kind == 'locboss' or t <= 3) else 2)]
    maxhp0 = foes[0]['HP']
    for f in foes: f['max'] = f['HP']
    camp = S.get('campaign')          # v3.3 spells/quests campaign mode (spells_sim.py); off for every v3.2 table
    if camp:
        sp_list = S['species'] or ['normal']
        msp = rng.choice(sp_list)
        for f in foes:
            if 'sp' in f: continue
            f['sp'] = f['kind'] if f['kind'] != 'normal' else (msp if kind != 'normal' else rng.choice(sp_list))
    streak = 0; q = 0; shield_used = False; gold = 0; chests = 0; checkpoint = False
    def settle(fs):                   # campaign: pay + count kills that the v3.2 code paths don't pay (spells, Sweep)
        nonlocal gold, chests
        for f in fs:
            if f['HP'] <= 0 and not f.get('counted'):
                f['counted'] = True
                if not f.get('summoned'): stats.setdefault('kills', collections.Counter())[f.get('sp')] += 1
                if not f.get('paid') and not f.get('summoned'):
                    f['paid'] = True; gold += gold_per_enemy(t) * rng.uniform(0.8, 1.2) * GOLD_MULT[f['kind']]
                    if rng.random() < CHEST_RATE[f['kind']]: chests += 1
    def ask():
        nonlocal q, streak
        nonlocal gauge
        q += 1; ok, w = feed.next()
        stats['q'] += 1; stats['correct'] += ok; stats['spoken'] += w[0] == 's'
        if camp: S['_bq'] = q; S['_bcorrect'] = S.get('_bcorrect', 0) + ok
        if ok:
            streak += 1; S['mp'] = min(h['MP'], S['mp'] + MPCFG['regen'])
        else: streak = sdrop(streak)
        if COMPANION['on']: gauge += COMPANION['per_correct'] if ok else COMPANION['per_wrong']
        return ok
    while True:
        tired = q >= SOFT_CAP_Q[kind]
        rnd += 1
        for f in foes: f['hit'] = False
        # ---- companion team attack (free action, no question) when the gauge is full
        if COMPANION['on'] and gauge >= COMPANION['full']:
            gauge = 0; stats['companion'] += 1
            live = [f for f in foes if f['HP'] > 0]
            tgt = min(live, key=lambda f: f['HP'] if f['kind'] == 'normal' else 1e9)
            tgt['HP'] -= max(1, round(COMPANION['mult']*h['ATK'] - 0.5*tgt['DEF'])); tgt['hit'] = True
            if tgt['HP'] <= 0:
                tgt['paid'] = True
                gold += gold_per_enemy(t) * rng.uniform(0.8, 1.2) * GOLD_MULT[tgt['kind']]
                if rng.random() < CHEST_RATE[tgt['kind']]: chests += 1
            if camp: settle(foes)
            foes = [f for f in foes if f['HP'] > 0]
            if not foes or all(f['kind'] == 'normal' for f in foes) and kind != 'normal':
                return True, gold, chests, checkpoint
        # ---- hero turn
        _hq0 = q
        if S['hp'] < 0.35*h['HP'] and S['potions'] > 0:
            S['potions'] -= 1; S['hp'] = min(h['HP'], S['hp'] + ECON['potion_heal']*h['HP']); stats['potions_used'] += 1
        elif S['hp'] < 0.40*h['HP'] and S['heal'] and S['mp'] >= MPCFG['heal'] and heals < MPCFG['heal_limit']:
            S['mp'] -= MPCFG['heal']; heals += 1; stats['heals'] += 1
            if ask(): S['hp'] = min(h['HP'], S['hp'] + MPCFG['heal_frac']*h['HP'])
        elif camp and S.get('spells') and cast_spell(S, h, foes, streak, tired, kind, shield_used, rng, stats, ask):
            pass
        elif camp and S.pop('_last_turn_cast', None) and False:
            pass
        else:
            live = [f for f in foes if f['HP'] > 0]
            if special == 'shadow_dragon_focus' or S.get('focus_boss'): tgt = live[0]   # focus_boss: diagnostic only (prototype test taps target-0)                   # kid ignores the imp and hits the dragon
            elif special == 'troll_tag': tgt = live[(rnd // 2) % len(live)]       # v3 Tag Team: only the front troll can be targeted, they swap every 2 rounds
            else: tgt = min(live, key=lambda f: f['HP'] if f['kind'] in ('normal', 'elite') else 1e9)
            sk = None   # optional t6+ skills (diagnostic only; off unless S sets them): Sweep every 4 rounds, Frost every 3
            if S.get('sweep') and rnd % 4 == 1 and len(live) > 1 and S['mp'] >= 12: sk = 'sweep'; S['mp'] -= 12
            elif S.get('frost') and rnd % 3 == 1 and S['mp'] >= 8: sk = 'frost'; S['mp'] -= 8
            if ask():
                dmg = max(1, round(h['ATK']*smult(streak)*(1.5 if tired else 1) - 0.5*tgt['DEF']))
                if sk == 'sweep':
                    for f in live:
                        if f is not tgt: f['HP'] -= max(1, round(0.6*h['ATK']*smult(streak) - 0.5*f['DEF'])); f['hit'] = True
                    dmg = max(1, round(0.6*h['ATK']*smult(streak)*(1.5 if tired else 1) - 0.5*tgt['DEF']))
                if sk == 'frost': tgt['frozen'] = True
                tgt['HP'] -= dmg; tgt['hit'] = True
                if tgt['HP'] <= 0 and not tgt.get('summoned'):
                    tgt['paid'] = True
                    g = gold_per_enemy(t) * rng.uniform(0.8, 1.2) * GOLD_MULT[tgt['kind']]
                    gold += g
                    if rng.random() < CHEST_RATE[tgt['kind']]: chests += 1
        if foes[0]['kind'] != 'normal' and foes[0]['HP'] <= maxhp0/2 and foes[0]['HP'] > 0: checkpoint = True
        if camp: settle(foes)
        foes = [f for f in foes if f['HP'] > 0]
        if not foes or (kind != 'normal' and all(f['kind'] == 'normal' for f in foes) and foes != []):
            # boss dead: remaining minions flee
            if not foes or all(f['kind'] == 'normal' for f in foes):
                L.bq = None; return True, gold, chests, checkpoint
        if camp: stats['hero_q'] = stats.get('hero_q', 0) + (q - _hq0)
        # ---- enemy phase
        is_boss = lambda f: f['kind'] in ('locboss', 'realmboss')
        for f in foes[:3]:
            if f.pop('frozen', False): continue
            n_att = 2 if (special == 'hydra' and is_boss(f) and rnd % 3 == 0) else 1      # Hydra Double Bite
            for _ in range(n_att):
                atk = f['ATK'] + (3 if (special in ('shadow_dragon', 'shadow_dragon_focus') and is_boss(f) and any(not is_boss(g) for g in foes)) else 0)   # Curse Chain
                atk = atk*(0.7 if tired else 1)
                if camp and f.pop('soaked', False): atk *= 0.5      # Bubble Spell: next attack halved
                if ask(): dmg = max(0, atk - K_BLOCK*h['DEF'])
                elif S['shield'] and not shield_used and S['mp'] >= MPCFG['shield']:
                    S['mp'] -= MPCFG['shield']; shield_used = True; dmg = max(0, atk - K_BLOCK*h['DEF'])
                else: dmg = max(math.ceil(BROKEN_FLOOR*atk), atk - K_BROKEN*h['DEF'])
                S['hp'] -= round(dmg)
                if S['hp'] <= 0 and S.get('second_wind') and not S.get('_sw') and S['mp'] >= 20:   # Second Wind (diagnostic only)
                    S['_sw'] = True; S['mp'] -= 20; S['hp'] = round(0.3*h['HP'])
                if S['hp'] <= 0: L.bq = None; return False, gold, chests, checkpoint
        # ---- end of round specials
        if special in ('troll', 'troll_tag'):        # Regrow: +4 HP if not hit this round
            for f in foes:
                if f.get('regrow') and not f['hit']: f['HP'] = min(f['max'], f['HP'] + 4)
        if special in ('queen_bee', 'queen_bee_v3') and rnd % 3 == 0 and is_boss(foes[0]) and len(foes) < 3:   # Summon Worker
            if special == 'queen_bee' or stats.get('summons', 0) < 2:
                nb = dict(enemy(t)); nb['kind'] = 'normal'
                if special == 'queen_bee_v3': nb['HP'] = nb['HP']//2; nb['summoned'] = True   # v3: small worker, half HP, no drops, max 2 per fight
                nb['max'] = nb['HP']; foes.append(nb); stats['summons'] = stats.get('summons', 0) + 1

def open_chest(t, S, kind, rng):
    if kind != 'normal':
        S['gold'] += 3*gold_per_enemy(t); S['potions'] = min(POTION_CAP + 2, S['potions'] + 1); return
    r = rng.random()
    if r < 0.40: S['gold'] += 3*gold_per_enemy(t)
    elif r < 0.80: S['potions'] += 1
    # else mana tea / gear piece: no effect in this model

# ---------------- a realm run ----------------
def run_realm(args):
    t, p, speech, nets, rule, thresh, seed, policy, metric = args[:9]
    global WORKING_SET, MPCFG, COMPANION, SPOKEN_CAP, PATH_ENCOUNTERS
    WORKING_SET = args[9] if len(args) > 9 else DEFAULT_WORKING_SET
    opt = args[10] if len(args) > 10 else {}
    MPCFG = dict(MP_PRESETS[opt.get('mp', DEFAULT_MP)])
    COMPANION = dict(COMPANION_DEFAULT, on=opt.get('companion', True))
    cv = opt.get('comp')
    if cv and cv != 'off':
        pw, mult = cv[1:].split('x'); COMPANION.update(per_wrong=int(pw), mult=float(mult))
    SPOKEN_CAP = opt.get('spoken_cap', 0.5)
    PATH_ENCOUNTERS = opt.get('path', 8)
    practice = opt.get('practice', 'none')
    sizes = opt.get('sizes') or LOC_SIZES[t]
    metric_local = False
    if metric == 'rec':      # v2 default: literal item proficiency over local + carry-over, 40% (no speech) / 25% (speech)
        metric = 'items'; thresh = 0.25 if speech else 0.40
    if metric == 'rec3':     # v3 default: proficiency over the location's own pool only, 20% (speech) / 40% (reading-only)
        metric = 'items'; metric_local = True; thresh = opt.get('thr_speech', TRIGGER_SPEECH) if speech else opt.get('thr_read', TRIGGER_READING)
    if metric == 'local':
        metric = 'items'; metric_local = True
    rng = random.Random(seed)
    L = Learner(p, speech, rule, rng); h = hero_stats(t)
    S = dict(hero=h, hp=h['HP'], mp=h['MP'], gold=inn_price(t)*2, potions=1 if nets.get('starter_potion') else 0,
             heal=t >= 2, shield=t >= 2)
    stats = dict(q=0, correct=0, spoken=0, potions_used=0, companion=0, heals=0, practice_q=0)
    L.bq = None
    prior = [Item(-k-1, L.ways, prof=(rng.random() < 0.7)) for k in range(0 if t == 1 else PRIOR_ITEMS)]
    uid = 0
    rec = dict(battles=0, defeats=0, inn_paid=0, inn_free=0, patrols=0, boss_attempts=0, gold_zero=0,
               stuck=0, gold_series=[], min_gold_after5=1e9, gold_lost=0, gold_spent_inn=0, gold_spent_pot=0,
               since_inn=[], proceeded_anyway=0, patrols_per_loc=[], spent_gear=0, gold_at={}, income=0)
    sink = gear_prices(t)[:]
    since = 0
    def restore(paid):
        nonlocal since
        rec['since_inn'].append(since); since = 0
        S['hp'] = h['HP']; S['mp'] = h['MP']
    def between(before_boss=False):
        # inn / potion decision after a battle
        low = S['hp'] < (0.8 if before_boss else policy['inn_below'])*h['HP'] or (S['mp'] < MP_COST['heal'] and S['heal'] and S['hp'] < 0.7*h['HP'])
        if low:
            price = inn_price(t)
            if S['gold'] >= price:
                S['gold'] -= price; rec['inn_paid'] += 1; rec['gold_spent_inn'] += price; restore(True)
                # restock potions but keep one inn stay in reserve
                while S['potions'] < policy['keep_potions'] and S['gold'] >= potion_price(t) + price:
                    S['gold'] -= potion_price(t); S['potions'] += 1; rec['gold_spent_pot'] += potion_price(t)
                return
            if nets.get('free_inn'):
                rec['inn_free'] += 1; restore(False)
                if nets.get('free_potion_when_broke') and S['potions'] == 0: S['potions'] = 1
                return
            rec['stuck'] += 1
            if S['potions'] > 0 and S['hp'] < 0.35*h['HP']:
                S['potions'] -= 1; S['hp'] = min(h['HP'], S['hp'] + ECON['potion_heal']*h['HP']); stats['potions_used'] += 1
    def shop():
        reserve = policy['reserve_inns']*inn_price(t)
        while True:
            price = sink[0] if sink else round(1.5*inn_price(t))
            if S['gold'] - price < reserve: return
            S['gold'] -= price; rec['spent_gear'] += price
            if sink: sink.pop(0)
    def defeat():
        rec['defeats'] += 1
        loss = 0.10*S['gold']
        if nets.get('loss_floor'): loss = min(loss, max(0, S['gold'] - nets['loss_floor']*inn_price(t)))
        if nets.get('loss_at_least_inn'): loss = max(loss, min(inn_price(t), max(0, S['gold'] - nets.get('loss_floor', 0)*inn_price(t))))
        S['gold'] -= loss; rec['gold_lost'] += loss; restore(False)
        if nets.get('free_potion_when_broke') and S['potions'] == 0 and S['gold'] < inn_price(t): S['potions'] = 1
    def fight(kind, local, rslots, resume=False, elite=False):
        nonlocal since
        qset = choose_set(L, local, prior, rslots, rng)
        won, g, c, cp = battle(t, S, L, qset, kind, rng, stats, resume, elite=elite)
        S['gold'] += g; rec['income'] += g
        g0 = S['gold']
        for _ in range(c): open_chest(t, S, kind if won and kind != 'normal' else 'normal', rng)
        rec['income'] += max(0, S['gold'] - g0)
        if nets.get('courage'): S['courage'] = 0 if won else S.get('courage', 0) + 1
        rec['battles'] += 1; since += 1
        if S['gold'] < 1 and rec['battles'] > 5: rec['gold_zero'] += 1
        if rec['battles'] > 5: rec['min_gold_after5'] = min(rec['min_gold_after5'], S['gold'])
        if not won: defeat()
        else: shop()
        if rec['battles'] in (10, 20, 30, 40): rec['gold_at'][rec['battles']] = S['gold']
        return won, cp
    rec['min_per_loc'] = []
    for loc in range(LOCS[t]):
        n_local = sizes[loc]
        local = [Item(uid+k, L.ways) for k in range(n_local)]; uid += n_local
        q0 = stats['q']; pq0 = stats['practice_q']
        if practice != 'none':
            # Preview + practice before the first path fight. 'light' = listen-and-pick (R-ZE) + say-it
            # (S-EZ; tap-the-Chinese R-EZ without speech) once per item; 'full' = every way once per item.
            ways = (['rZE', 'sEZ'] if speech else ['rZE', 'rEZ']) if practice == 'light' else L.ways
            for it in local:
                for w in ways:
                    L.answer(it, w, practice=True); stats['practice_q'] += 1
        rslots = 0 if (t == 1 and loc == 0) else REVIEW_SLOTS[t]
        cleared = 0
        while cleared < PATH_ENCOUNTERS:
            scripted_elite = opt.get('elites', True) and loc == LOCS[t]-1 and cleared == PATH_ENCOUNTERS//2
            won, _ = fight('normal', local, rslots, elite=scripted_elite)
            if won: cleared += 1; between()
        # boss approach: patrols until the boss pool is proficient enough (or the kid proceeds anyway)
        pool = local if metric_local else local + [i for i in prior if not L.proficient(i)][:CARRY_CAP]
        pat = 0
        while pool_score(L, pool, metric) < thresh and pat < policy['max_patrols']:
            fight('normal', local, rslots, elite=opt.get('elites', True) and rng.random() < ELITE_PATROL_CHANCE); pat += 1; between()
        if pat >= policy['max_patrols']: rec['proceeded_anyway'] += 1
        rec['patrols'] += pat; rec['patrols_per_loc'].append(pat)
        kind = 'realmboss' if loc == LOCS[t]-1 else 'locboss'
        between(before_boss=True)
        resume = False
        for attempt in range(12):
            rec['boss_attempts'] += 1
            won, cp = fight(kind, local, rslots + 1, resume)
            if won: break
            resume = resume or cp
            between(before_boss=True)
        between()
        prior += local
        rec['min_per_loc'].append(((stats['q']-q0)*SEC_PER_Q + (stats['practice_q']-pq0)*SEC_PER_PRACTICE_Q)/60)
    rec['acc'] = stats['correct']/max(1, stats['q']); rec['spoken_share'] = stats['spoken']/max(1, stats['q'])
    rec['q'] = stats['q']; rec['potions_used'] = stats['potions_used']; rec['end_gold'] = S['gold']
    rec['min_gold_after5'] = rec['min_gold_after5'] if rec['min_gold_after5'] < 1e9 else S['gold']
    nl = sum(sizes[:LOCS[t]])
    rec['final_prof'] = sum(L.proficient(i) for i in prior[-nl:])/nl
    rec['companion'] = stats['companion']; rec['heals'] = stats['heals']; rec['practice_q'] = stats['practice_q']
    rec['minutes'] = statistics.mean(rec['min_per_loc'])
    return rec

NETS = {
    'none':  {},
    'nets':  dict(free_inn=True, loss_floor=2, starter_potion=True, free_potion_when_broke=True),
    'nets+': dict(free_inn=True, loss_floor=2, starter_potion=True, free_potion_when_broke=True, loss_at_least_inn=True, courage=True),
    'free_inn_only': dict(free_inn=True),
}
POLICIES = {
    'saver':   dict(inn_below=0.5, keep_potions=2, max_patrols=40, reserve_inns=2),   # keeps 2 inn stays in reserve, trains to threshold
    'spender': dict(inn_below=0.5, keep_potions=0, max_patrols=2,  reserve_inns=0),   # spends every coin on gear/cosmetics, rushes the boss
}

def summarize(recs):
    m = lambda k: statistics.mean(r[k] for r in recs)
    since = [x for r in recs for x in r['since_inn']]
    return dict(battles=m('battles'), defeat_rate=sum(r['defeats'] for r in recs)/sum(r['battles'] for r in recs),
                btw_inn=statistics.mean(since) if since else float('nan'), inn_paid=m('inn_paid'), inn_free=m('inn_free'),
                patrols=m('patrols'), proceeded=m('proceeded_anyway'), boss_att=m('boss_attempts'),
                gold_zero_runs=sum(r['gold_zero'] > 0 for r in recs)/len(recs), stuck=m('stuck'),
                min_gold=statistics.median(r['min_gold_after5'] for r in recs), end_gold=statistics.median(r['end_gold'] for r in recs),
                lost=m('gold_lost'), acc=m('acc'), spoken=m('spoken_share'), q=m('q'), final_prof=m('final_prof'),
                pots=m('potions_used'), gear=m('spent_gear'),
                upkeep=sum(r['gold_spent_inn'] + r['gold_spent_pot'] for r in recs)/max(1, sum(r['income'] for r in recs)),
                g10=statistics.median(r['gold_at'].get(10, r['end_gold']) for r in recs),
                g20=statistics.median(r['gold_at'].get(20, r['end_gold']) for r in recs),
                g30=statistics.median(r['gold_at'].get(30, r['end_gold']) for r in recs),
                pat_p90=sorted(sum(r['patrols_per_loc'])/len(r['patrols_per_loc']) for r in recs)[int(0.9*len(recs))-1],
                pat_loc=statistics.mean(sum(r['patrols_per_loc'])/len(r['patrols_per_loc']) for r in recs),
                minutes=m('minutes'), companion_pb=sum(r['companion'] for r in recs)/sum(r['battles'] for r in recs),
                heals_pb=sum(r['heals'] for r in recs)/sum(r['battles'] for r in recs), q_loc=statistics.mean(r['q']/len(r['patrols_per_loc']) for r in recs))

def run(configs, n):
    jobs = [(t, p, sp, NETS[nk], rule, th, 7919*i + (t*131 + int(p*100)*17 + sp*7 + len(nk)*3 + len(rule) + int(th*100)*11 + len(pol)) % 7907, POLICIES[pol], met)
            for (t, p, sp, nk, rule, th, met, pol) in configs for i in range(n)]
    with Pool() as pool: res = pool.map(run_realm, jobs, chunksize=8)
    out = {}
    for k, cfg in enumerate(configs): out[cfg] = summarize(res[k*n:(k+1)*n])
    return out

def table(out, keys, title):
    print(f"\n### {title}\n")
    print("| tier | acc | speech | nets | rule | thr | metric | kid | " + " | ".join(keys) + " |")
    print("|" + "---|"*(8+len(keys)))
    for (t, p, sp, nk, rule, th, met, pol), s in out.items():
        vals = [(f"{s[k]:.0f}" if abs(s[k]) >= 100 else f"{s[k]:.2f}") if isinstance(s[k], float) else str(s[k]) for k in keys]
        print(f"| {t} | {p:.2f} | {'on' if sp else 'off'} | {nk} | {rule} | {th:.2f} | {met} | {pol} | " + " | ".join(vals) + " |")

if __name__ == '__main__':
    n = 60 if 'quick' in sys.argv else 200
    sec = [a for a in sys.argv[1:] if a != 'quick']
    sec = sec[0] if sec else 'all'
    print(f"# combat_sim v2 output (n={n} realm runs per row; defaults: working set {DEFAULT_WORKING_SET}, NEW_CAP {NEW_CAP}, {PATH_ENCOUNTERS} path fights per location)\n")
    print("Accuracy model: 'acc' column = MC accuracy on a new item. rEZ = acc-3pts; sZE = acc x 0.95 (en-US misfire 5%); "
          "sEZ = (acc-10pts) x 0.85 (production gap + zh-CN misfire 15%); +4 pts per prior correct in that way, cap 97%.\n")
    print("Prices: " + ", ".join(f"t{t}: gold/enemy {gold_per_enemy(t)}, inn {inn_price(t)}, potion {potion_price(t)}" for t in range(1, 10)))
    for t in range(1, 10):
        print(f"t{t}: hero {hero_stats(t)} normal {enemy(t)} locboss {enemy(t,'locboss')} realmboss {enemy(t,'realmboss')}")
    ECONK = ['battles', 'defeat_rate', 'btw_inn', 'inn_paid', 'inn_free', 'stuck', 'gold_zero_runs', 'min_gold', 'g10', 'g20', 'end_gold', 'gear', 'upkeep', 'lost', 'pots', 'acc', 'spoken', 'pat_loc']
    LEARNK = ['battles', 'q', 'acc', 'spoken', 'pat_loc', 'pat_p90', 'final_prof', 'defeat_rate']
    ACC = (0.5, 0.65, 0.75, 0.9)
    if sec in ('all', 'econ'):
        for pol, nks in (('spender', ('none', 'nets', 'nets+')), ('saver', ('none', 'nets+'))):
            for nk in nks:
                cfg = [(t, p, sp, nk, 'total', 0.0, 'rec', pol) for t in (1, 2, 5, 9) for sp in (False, True) for p in ACC]
                table(run(cfg, n), ECONK, f"Economy: kid={pol}, nets={nk} (boss trigger = recommended default)")
    if sec in ('all', 'learn'):
        cfg = [(t, p, sp, 'nets+', rule, th, met, 'saver') for t in (1, 5) for sp in (False, True) for p in ACC
               for (rule, met, th) in (('total', 'items', 0.5), ('row', 'items', 0.5), ('total', 'items', 0.4), ('total', 'items', 0.25),
                                       ('total', 'points', 0.5), ('total', 'items_s1', 0.4))]
        table(run(cfg, n), LEARNK, "Proficiency and boss-approach trigger: diligent kid trains until the trigger clears (cap 40 patrols/location)")
