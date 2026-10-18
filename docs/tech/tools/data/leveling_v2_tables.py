"""Leveling v2 tables (Jack 2026-10-17; combat-spec §2.1 / §2.3). Desy, 2026-10-17 PT. Repo-relative, idempotent:

  python docs/tech/tools/data/leveling_v2_tables.py [--check]

Reads the formulas from docs/tech/tools/sim/combat_sim.py (hero_at, enemy_at, exp_to_next, boss multipliers from spells_data),
the maps' enemy levels from docs/data/levels (settings.enemyLevel / eliteLevel / boss.level) and writes:
  docs/data/balance/hero_levels.csv            hero by level L1-60: EXP to next, total EXP, HP, MP, ATK and DEF from level, SPD
  docs/data/enemies/enemy_stat_bands.csv       per tier: normal / elite bands at the tier's lowest and highest main-path level, every boss at its level
  docs/data/enemies/enemies.csv                level = the lowest level the species appears at in the maps; hp/atk/def = its stats there
                                               (archetype: hp_mult / atk_mult / def_add around the band, kept from the v3 table)
  + the docs/data/json mirrors (hero_levels.json, enemy_levels.json, enemy_stat_bands.json, enemies.json) and the
    combat_data.json bundle keys (hero_levels, enemy_levels, enemy_stat_bands, enemies).
First run only: --v3-bands FILE (the v3 band table) to measure the archetype multipliers; after that they live in enemies.csv.
--check: write nothing, exit 1 if any output would change."""
import csv, json, os, sys, glob, io, math, argparse
HERE = os.path.dirname(os.path.abspath(__file__)); REPO = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'sim'))
import combat_sim as C, spells_data as SD
D = os.path.join(REPO, 'docs', 'data')
P = lambda *a: os.path.join(D, *a)
rhu = lambda x: int(math.floor(x + 0.5))
REALM = {1: 'Starter Meadow', 2: 'Honeycomb Forest', 3: 'Crossroads Market', 4: 'Goblin Caves', 5: 'Hydra Swamp', 6: 'Zombie Lands',
         7: 'Griffin Peaks', 8: 'Ogre Colosseum', 9: "Demon King's Castle"}
KIND = {('normal', ''): 'normal', ('elite', ''): 'elite', ('boss', 'location'): 'locboss', ('boss', 'realm'): 'realmboss'}

def stats(t, kind, n):
    """Engine stats of a tier-t enemy at level n (the sim's enemy_at; bosses x m(t) HP and x0.8 ATK, as battle() applies them)."""
    e = C.enemy_at(t, kind, n)
    hp, atk = e['HP'], e['ATK']
    if kind in ('locboss', 'realmboss'): hp, atk = hp*SD.BOSS_HP_MULT[(t, kind)], atk*SD.BOSS_ATK_MULT.get(kind, 1)
    return dict(hp=rhu(hp), atk=rhu(atk), def_=e['DEF'], spd=e['SPD'])

def maps():
    out = {}
    for f in sorted(glob.glob(P('levels', '*.json'))):
        L = json.load(open(f, encoding='utf-8'))
        if L.get('schema', '').startswith('level/') and (L.get('settings') or {}).get('enemyLevel'): out[L['id']] = L
    return out

def csv_text(rows, fields):
    b = io.StringIO(); w = csv.DictWriter(b, fieldnames=fields, lineterminator='\r\n'); w.writeheader(); w.writerows(rows); return '\ufeff' + b.getvalue()

V3_BANDS = [None]   # first run only: the v3 enemy_stat_bands.csv (tier bands at L_rec) the archetype multipliers are measured against
def build():
    M = maps(); lv = {r['map_id']: r for r in csv.DictReader(open(P('balance', 'enemy_levels.csv'), encoding='utf-8-sig'))}
    tier = {m: L['settings']['gearTier'] for m, L in M.items()}
    main = [m for m in lv if lv[m]['how_set'].startswith('fitted')]
    out = {}
    # hero by level
    hero = []; tot = 0
    for L in range(1, 61):
        h = C.hero_at(L, 0)
        hero.append(dict(level=L, exp_to_next=C.exp_to_next(L), exp_total=tot, hp=h['HP'], mp=h['MP'], atk_from_level=L - 1, def_from_level=(L - 1)//3, spd=h['SPD']))
        tot += C.exp_to_next(L)
    out['hero_levels'] = (P('balance', 'hero_levels.csv'), hero)
    # where each species appears, and at which level
    first = {}
    def seen(e, n): first[e] = min(first.get(e, 10**9), n)
    old = list(csv.DictReader(open(P('enemies', 'enemies.csv'), encoding='utf-8-sig')))
    role = {r['id']: r['role'] for r in old}
    for m, L in M.items():
        s = L['settings']; lo, hi = s['enemyLevel']; el = s.get('eliteLevel', hi)
        for r in s.get('roster') or []:
            rl = r.get('level', lo); seen(r['enemy'], rl if isinstance(rl, int) else rl[0])
        if s.get('boss'): seen(s['boss']['enemy'], s['boss']['level'])
        evs = list(L.get('events', [])) + [x for n in L['nodes'] for v in n.get('quests', []) for p in ('pre', 'in', 'post') for x in (v.get(p) or {}).get('events', [])]
        for ev in evs:
            for a in ev.get('do') or []:
                if isinstance(a, dict) and isinstance(a.get('fight'), dict):
                    for e in a['fight'].get('enemies', []): seen(e, el if role.get(e) == 'elite' else lo)
    # stat bands: per tier, normal / elite at the tier's lowest and highest main-path level, every boss at its level
    bands = []
    g = lambda t, k: (SD.G[t] if hasattr(SD, 'G') else C.gold_per_enemy(t))
    for t in range(1, 10):
        tm = [m for m in main if tier.get(m) == t]
        nlo = min(int(lv[m]['enemy_level_min']) for m in tm); nhi = max(int(lv[m]['enemy_level_max']) for m in tm)
        elo = min(int(lv[m]['elite_level']) for m in tm); ehi = max(int(lv[m]['elite_level']) for m in tm)
        ref = {}   # gold / EXP / chest / minions stay per realm (Jack 2026-10-17): the first row of each role in the current table
        for e in csv.DictReader(open(V3_BANDS[0] or P('enemies', 'enemy_stat_bands.csv'), encoding='utf-8-sig')):
            if int(e['tier']) == t: ref.setdefault(e['role'] + e['boss_type'], e)
        for role_, bt, kind, levels, who in (('normal', '', 'normal', sorted({nlo, nhi}), ''), ('elite', '', 'elite', sorted({elo, ehi}), '')):
            for n in levels:
                s = stats(t, kind, n); r0 = ref[role_ + bt]
                bands.append(dict(tier=t, realm=REALM[t], role=role_, boss_type=bt, enemy='', level=n, hp=s['hp'], atk=s['atk'], **{'def': s['def_']}, spd=s['spd'],
                                  gold=r0['gold'], exp=r0['exp'], chest_chance=r0['chest_chance'], minions=r0['minions'],
                                  hp_formula=('' if kind == 'normal' else '2 × ') + 'H(t) × base(n)', atk_formula=('1.21' if kind == 'normal' else '1.2') + ' × DEF_ref(n)'))
        for m in tm:
            b = M[m]['settings'].get('boss')
            if not b: continue
            bt = 'realm' if b['kind'] == 'realmboss' else 'location'; s = stats(t, b['kind'], b['level']); r0 = ref['boss' + bt]
            bands.append(dict(tier=t, realm=REALM[t], role='boss', boss_type=bt, enemy=b['enemy'], level=b['level'], hp=s['hp'], atk=s['atk'], **{'def': s['def_']}, spd=s['spd'],
                              gold=r0['gold'], exp=r0['exp'], chest_chance=r0['chest_chance'], minions=r0['minions'],
                              hp_formula=('5' if bt == 'location' else '7') + ' × base(n) × m(t) (boss_hp.csv hp_mult_v36)', atk_formula='0.8 × ' + ('1.2' if bt == 'location' else '1.3') + ' × DEF_ref(n)'))
    out['enemy_stat_bands'] = (P('enemies', 'enemy_stat_bands.csv'), bands)
    # enemies: archetype multipliers (kept from the v3 table on first run), then stats at the species' first level
    en = []
    for r in old:
        t = int(r['realm']); kind = KIND[(r['role'], r['boss_type'])]
        if 'hp_mult' not in r or not r['hp_mult']:
            ob = next(e for e in csv.DictReader(open(V3_BANDS[0], encoding='utf-8-sig')) if int(e['tier']) == t and e['role'] == r['role'] and e['boss_type'] == r['boss_type'])
            r['hp_mult'] = f"{rhu(100*int(r['hp'])/int(ob['hp']))/100:.2f}"; r['atk_mult'] = f"{rhu(100*int(r['atk'])/int(ob['atk']))/100:.2f}"; r['def_add'] = str(int(r['def']) - int(ob['def']))
        n = first.get(r['id'])
        if n is None:   # in no map: the lowest main-path level of its tier and role
            n = min(x['level'] for x in bands if x['tier'] == t and x['role'] == r['role'] and x['boss_type'] == r['boss_type'])
        s = stats(t, kind, n)
        hp = s['hp'] if kind not in ('normal', 'elite') else rhu(s['hp']*float(r['hp_mult']))
        atk = s['atk'] if kind not in ('normal', 'elite') else rhu(s['atk']*float(r['atk_mult']))
        en.append(dict(r, level=n, hp=hp, atk=atk, **{'def': max(0, s['def_'] + int(r['def_add']))}))
    fields = list(old[0].keys()); fields += [k for k in ('hp_mult', 'atk_mult', 'def_add') if k not in fields]
    out['enemies'] = (P('enemies', 'enemies.csv'), en, fields)
    out['enemy_levels'] = (P('balance', 'enemy_levels.csv'), list(lv.values()))
    return out

def typed(rows):
    def cv(v):
        if isinstance(v, str):
            for f in (int, float):
                try: return f(v)
                except ValueError: pass
        return v
    return [{k: cv(v) for k, v in r.items()} for r in rows]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--check', action='store_true'); ap.add_argument('--v3-bands'); a = ap.parse_args()
    V3_BANDS[0] = a.v3_bands
    if not a.v3_bands and 'hp_mult' not in next(csv.reader(open(P('enemies', 'enemies.csv'), encoding='utf-8-sig'))):
        raise SystemExit('first run: pass --v3-bands FILE = the v3 docs/data/enemies/enemy_stat_bands.csv (e.g. git show e8c4a6e:docs/data/enemies/enemy_stat_bands.csv > FILE)')
    T = build(); files = {}
    cd = json.load(open(P('json', 'combat_data.json'), encoding='utf-8'))
    for key, v in T.items():
        path, rows = v[0], v[1]; fields = v[2] if len(v) > 2 else list(rows[0].keys())
        files[path] = csv_text(rows, fields)
        js = typed([{k: r.get(k, '') for k in fields} for r in rows])
        files[P('json', key + '.json')] = json.dumps(js, ensure_ascii=False, indent=1)
        cd[key] = js
    files[P('json', 'combat_data.json')] = json.dumps(cd, ensure_ascii=False, indent=1)
    bad = []
    for path, txt in files.items():
        cur = open(path, encoding='utf-8', newline='').read() if os.path.exists(path) else None
        if cur != txt:
            bad.append(os.path.relpath(path, REPO))
            if not a.check: open(path, 'w', encoding='utf-8', newline='').write(txt)
    print(('stale: ' if a.check else 'wrote: ') + (', '.join(bad) or 'nothing (up to date)'))
    sys.exit(1 if a.check and bad else 0)
if __name__ == '__main__': main()
