"""Build data/quests.json, data/quests.csv and build/story/quests_tables.md from quests_def.py (v2, 50 quests).
Also validates: curriculum ids exist and are met by then, enemies exist, realm-1 nodes exist, hooks reconcile."""
import csv, json, os, sys, glob
from collections import defaultdict, Counter
sys.path.insert(0, os.path.dirname(__file__))
import quests_def as D

import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from _paths import P   # repo-relative (see _paths.py)
G = {1: 6, 2: 12, 3: 18, 4: 27, 5: 36, 6: 45, 7: 54, 8: 63, 9: 72}
TARGET_G = 30          # quest GOLD ≈ 30 × G per realm (gold only; items/gear/spells are a bonus on top). Director call 2026-10-02 PT
TOL = 0.10
ITEM_G = {"honey": 1, "bighoney": 2, "manatea": 6, "bigmanatea": 15, "feather": 2}   # feather = 2×G (v3.9, same as an inn night)
ITEM_NAMES = {"honey": "Honey Potion", "bighoney": "Big Honey", "manatea": "Mana Tea", "bigmanatea": "Big Mana Tea", "feather": "Return Feather"}
RARITY_MULT = {"fine": 1.15, "heroic": 1.3}
HEROIC_NAMES = {(5, "shield"): ("龟壳盾", "Turtle-Shell Shield", "heroic: first broken block per battle leaks 1 less")}
REALM_EN = {1: "Starter Meadow", 2: "Honeycomb Forest", 3: "Crossroads Market", 4: "Goblin Caves", 5: "Hydra Swamp",
            6: "Zombie Lands", 7: "Griffin Peaks", 8: "Ogre Colosseum", 9: "Demon King's Castle"}

cur = {r["id"]: r for r in csv.DictReader(open(P("core-curriculum.csv"), encoding="utf-8-sig"))}
pool = {r["id"]: r for r in csv.DictReader(open(P("data/curriculum_location_pools.csv"), encoding="utf-8-sig"))}
zones = json.load(open(P("data/world/zones.json")))["zones"]
zone_by = {z["id"]: z for z in zones}
zone_seq = sorted(zones, key=lambda z: (z["realm"], z["order"]))
zone_gno = {z["id"]: i + 1 for i, z in enumerate(zone_seq)}       # 1..20 = location_global_no
enemies = {e["id"] for e in json.load(open(P("enemies.json")))}
spells = {s["spell_id"]: s for s in json.load(open(P("data/spells.json")))}
gear = {(int(r["tier"]), r["slot"]): r for r in csv.DictReader(open(P("data/gear.csv"), encoding="utf-8-sig"))}
r1 = json.load(open(P("data/world/graphs/realm_1.json")))
r1_nodes = {n["id"] for n in r1["nodes"]}; r1_edges = {e["id"] for e in r1["edges"]}
hooks = json.load(open(P("data/world/quests_world.json")))["questHooks"]


# town/village positions: entry_town = the realm's town node; [lantern_]outpost_k / village_k = k-th village (by idx) of that zone in realm_<n>.json
import re as _re
_villages = {}
def check_position(loc):
    kind, pos, zone = loc.get("nodeKind"), loc.get("position"), loc.get("zone")
    if kind not in ("town", "village") or not pos or zone not in zone_by: return None
    r = zone_by[zone]["realm"]
    if r == 1: return None
    if r not in _villages: _villages[r] = json.load(open(P(f"data/world/graphs/realm_{r}.json")))["nodes"]
    nodes = _villages[r]
    if kind == "town":
        ok = any(n["id"] == pos and n["kind"] == "town" for n in nodes) if pos == "entry_town" else False
        return None if ok else f"town position {zone}/{pos} not found in realm_{r}.json"
    m = _re.search(r"(\d+)$", pos)
    vs = sorted((n for n in nodes if n["kind"] == "village" and n.get("zone") == zone), key=lambda n: n["idx"])
    if not m:                                  # plain "outpost" = the first village, only when the zone has exactly one
        if len(vs) != 1:
            return f"village position {zone}/{pos} is ambiguous or missing: realm_{r} has {len(vs)} village(s) in {zone} ({', '.join(n['id'] for n in vs)}); use outpost_<k>"
        k = 1
    else:
        k = int(m.group(1))
    if k > len(vs):
        return f"village position {zone}/{pos} not found: realm_{r} has {len(vs)} village(s) in {zone} ({', '.join(n['id'] for n in vs)})"
    node = vs[k - 1]["id"]
    if loc.get("ref") and loc["ref"] != f"realm_{r}/{node}":
        return f"{zone}/{pos} resolves to realm_{r}/{node} but ref says {loc['ref']}"
    return None

errors, warns = [], []
# Desy step verbs → GameDev quest/0.1 objective types (escort is the one new type)
GD_TYPE = {"pickup": "collect", "fight": "kill", "boss": "kill", "turn_in": "talk"}

# Hand-in location must match the thanks / questTurnIn scene trigger (GameDev's build_world.py
# derives turnInAt from that trigger; e.g. q1_quiet_morning hands in at realm_1/m_well, not the village).
# If no thanks scene exists, the last turn_in step is the hand-in place.
def _gn(loc):
    if not loc or not isinstance(loc, dict): return None
    if loc.get("graph") and loc.get("node"): return (loc["graph"], loc["node"])
    ref = loc.get("ref")
    if isinstance(ref, str) and "/" in ref:
        g, n = ref.split("/", 1); return (g, n)
    return None

def _pos(loc):
    """Default positions: a town with no position is entry_town; a village with no position is the first outpost."""
    pos = loc.get("position") or loc.get("node")
    if pos: return pos
    if loc.get("nodeKind") == "town": return "entry_town"
    if loc.get("nodeKind") == "village": return "outpost"
    return None

def same_place(a, b):
    """True if two location dicts name the same node (graph/node, ref, or zone/position)."""
    if not a or not b: return not a and not b
    ga, gb = _gn(a), _gn(b)
    if ga and gb: return ga == gb
    za = (a.get("zone"), a.get("nodeKind"), _pos(a))
    zb = (b.get("zone"), b.get("nodeKind"), _pos(b))
    if a.get("zone") and b.get("zone") and za == zb:
        if a.get("ref") and b.get("ref"): return a["ref"] == b["ref"]
        return True
    if ga and _pos(b) == ga[1] and not b.get("ref"): return True
    if gb and _pos(a) == gb[1] and not a.get("ref"): return True
    return False

def load_turnin_scenes():
    """quest id -> (graph, node) for every scene with trigger.on == questTurnIn. Errors if one quest has two nodes."""
    out, conflict = {}, []
    d = os.path.dirname(P("data/dialogue/sc_r1_opening.json"))
    for f in glob.glob(os.path.join(d, "sc_*.json")):
        s = json.load(open(f, encoding="utf-8"))
        t = s.get("trigger") or {}
        if t.get("on") != "questTurnIn" or not t.get("graph") or not t.get("node"): continue
        qid = (t.get("cond") or {}).get("questReady")
        if not qid: continue
        loc = (t["graph"], t["node"])
        if qid in out and out[qid] != loc:
            conflict.append(f"{qid}: questTurnIn scenes at {out[qid][0]}/{out[qid][1]} and {loc[0]}/{loc[1]}")
        else:
            out[qid] = loc
    return out, conflict

TURNIN_SCENES, _turnin_conflicts = load_turnin_scenes()
errors.extend(_turnin_conflicts)

def avail_gno(q):
    g = zone_gno[q["zone"]]
    req = json.dumps(q.get("requires") or {})
    for z in zone_gno:
        if f'"bossDefeated": "{z}"' in req:
            g = max(g, min(zone_gno[z] + 1, 20))
    return g

def gear_entry(t, slot, rarity):
    r = gear[(t, slot)]
    zh, en = r["example_name_zh"], r["example_name_en"]
    perk = ""
    if rarity == "heroic" and (t, slot) in HEROIC_NAMES:
        zh, en, perk = HEROIC_NAMES[(t, slot)]
    elif rarity == "fine":
        zh, en = "好" + zh, "Fine " + en
    stat = int(r[rarity]); value = round(int(r["shop_price_common"]) * RARITY_MULT[rarity])
    return {"id": f"{slot}_t{t}_{rarity}", "tier": t, "slot": slot, "rarity": rarity, "zh": zh, "en": en,
            "stat": r["stat"], "value": stat, "perk": perk, "goldValue": value}

out, rows = [], []
for q in D.Q:
    t = q["realm"]; g = G[t]; lrec = g // 3
    rw = q["rewards"]
    gold = rw["G"] * g
    items = rw.get("items", {})
    item_val = sum(ITEM_G[k] * n for k, n in items.items()) * g
    gears = [gear_entry(*x) for x in rw.get("gear", [])]
    gear_val = sum(x["goldValue"] for x in gears)
    sp = rw.get("spells", [])
    for s in sp:
        if s not in spells: errors.append(f"{q['id']}: unknown spell {s}")
        elif spells[s]["town"] > t: errors.append(f"{q['id']}: spell {s} is from town {spells[s]['town']} > realm {t}")
    spell_val = sum(spells[s]["price"] for s in sp)
    exp = rw["L"] * lrec
    # words
    ag = avail_gno(q)
    for w in q["words"]:
        if w not in cur: errors.append(f"{q['id']}: unknown item {w}"); continue
        wg = int(pool[w]["location_global_no"])
        if wg > ag: errors.append(f"{q['id']}: {w} {cur[w]['simplified']} is from {pool[w]['location_id']} (after the quest's zone)")
    # enemies + realm-1 refs
    for st in q["steps"]:
        ob = st[1]
        for e in ob.get("enemies", []) + ([ob["enemy"]] if "enemy" in ob else []) + ob.get("dropFrom", []):
            if e not in enemies: errors.append(f"{q['id']}: unknown enemy {e}")
        wh = st[2]
        if wh.get("graph") == "realm_1":
            if "node" in wh and wh["node"] not in r1_nodes: errors.append(f"{q['id']}: realm_1 node {wh['node']} missing")
            for e in wh.get("edges", []):
                if e not in r1_edges: errors.append(f"{q['id']}: realm_1 edge {e} missing")
        elif "zone" in wh and wh["zone"] not in zone_by: errors.append(f"{q['id']}: unknown zone {wh['zone']}")
        for loc in (wh, q["giverAt"]) + ((q["turnIn"],) if isinstance(q["turnIn"], dict) else ()):
            msg = check_position(loc)
            if msg: errors.append(f"{q['id']}: {msg}")
        refs = [wh.get("ref"), q["giverAt"].get("ref")] + ([ob["to"].get("ref")] if isinstance(ob.get("to"), dict) else [])
        for ref in refs:
            if not ref: continue
            gr, _, nd = ref.partition("/")
            gp = P(f"data/world/graphs/{gr}.json")
            if not os.path.exists(gp): errors.append(f"{q['id']}: graph {gr} missing"); continue
            if nd and nd not in {n["id"] for n in json.load(open(gp))["nodes"]}: errors.append(f"{q['id']}: node {ref} missing")
        # v3.9.3: a pickup (nodeItem) step must name its node(s): graph+node, ref "graph/node" or refs (a graph alone is ambiguous)
        if st[1].get("type") == "pickup" and not (wh.get("node") or "/" in (wh.get("ref") or "") or wh.get("refs")):
            errors.append(f"{q['id']}: pickup step needs an explicit node (ref 'graph/node'), got {wh.get('ref') or wh.get('graph')}")
    steps = []
    for i, (ev, ob, wh, note) in enumerate(q["steps"], 1):
        gob = dict(ob); dt = ob["type"]
        gob["type"] = GD_TYPE.get(dt, dt)
        if dt != gob["type"]: gob["desyType"] = dt
        if dt == "pickup": gob.setdefault("source", "nodeItem")      # item comes from the node's item/treasure event, n=1
        if dt == "turn_in": gob["turnIn"] = True                      # completing this talk moves the quest ready → completed
        s = {"id": f"s{i}", "event": ev, "objective": gob, "where": wh}
        if note: s["note"] = note
        steps.append(s)
    giver = {"npc": q["giver"], **q["giverAt"]}
    # Canonical hand-in: thanks/questTurnIn trigger if any, else the last turn_in step.
    last_ti = next(((ob, wh) for ev, ob, wh, note in reversed(q["steps"]) if ob.get("type") == "turn_in"), None)
    scene_loc = TURNIN_SCENES.get(q["id"])
    scene_ti = {"graph": scene_loc[0], "node": scene_loc[1]} if scene_loc else None
    if scene_ti and last_ti and not same_place(last_ti[1], scene_ti):
        errors.append(f"{q['id']}: turn_in step at {last_ti[1]} does not match thanks trigger {scene_loc[0]}/{scene_loc[1]}")
    if q["turnIn"] == "giver":
        implied = {"npc": q["giver"], **q["giverAt"]}
    elif isinstance(q["turnIn"], dict):
        implied = q["turnIn"]
    else:
        implied = None   # auto
    if scene_ti:
        canonical = {"npc": (last_ti[0].get("npc") if last_ti else implied.get("npc") if implied else q["giver"]), **scene_ti}
        # keep the step's own encoding (ref / zone) when it already names the same node
        if last_ti and same_place(last_ti[1], scene_ti):
            canonical = {"npc": last_ti[0].get("npc") or canonical["npc"], **last_ti[1]}
    elif last_ti:
        canonical = {"npc": last_ti[0].get("npc") or q["giver"], **last_ti[1]}
    else:
        canonical = None
    turn_in, return_to = q["turnIn"], q["turnIn"] == "giver"
    if "returnToGiver" in q: return_to = q["returnToGiver"]
    if canonical and implied and turn_in != "auto" and not same_place(canonical, implied):
        if turn_in == "giver":
            # Player still walks to the hand-in node (returnToGiver stays True unless the def sets it).
            turn_in = dict(canonical)
            if "returnToGiver" not in q: return_to = True
        else:
            errors.append(f"{q['id']}: turnIn {implied} does not match hand-in {canonical}")
    if isinstance(turn_in, dict):
        msg = check_position(turn_in)
        if msg: errors.append(f"{q['id']}: {msg}")
    rec = {
        "schema": "quest/0.2", "id": q["id"], "realm": t, "zone": q["zone"], "pool": zone_by[q["zone"]]["desyPool"],
        "story": q["story"], "type": q["type"],
        "title": {"zh": q["title"][0], "en": q["title"][1]},
        "giver": giver, "alsoOnBoard": bool(q.get("alsoOnBoard")),
        "turnIn": turn_in, "returnToGiver": return_to,
        "requires": q.get("requires"), "order": "sequence",
        "objectives": steps,
        "scenes": {"offer": f"sc_{q['id']}_offer", "progress": f"sc_{q['id']}_wait", "turnIn": f"sc_{q['id']}_thanks"},
        "rewards": {"gold": {"G": rw["G"]}, "goldValue": gold, "exp": {"L": rw["L"]}, "expValue": exp,
                    "items": items, "gear": gears, "spells": sp, "skills": rw.get("skills", []), "flags": rw.get("flags", []),
                    "valueG": round((gold + item_val + gear_val) / g, 1), "spellValueGold": spell_val},
        "words": q["words"], "summary": q["summary"],
        "hook": q.get("hook"), "repeatable": False,
    }
    if sp: rec["rewards"]["spellRule"] = ("The spell replaces buying it: its magic-shop shelf shows this quest instead of a price while the quest is open; "
                                          "if the kid already owns it, the giver pays its shop price in gold instead.")
    out.append(rec)
    rows.append({"quest_id": q["id"], "realm": t, "zone": q["zone"], "pool": rec["pool"], "story": q["story"], "type": q["type"],
                 "title_zh": q["title"][0], "title_en": q["title"][1], "giver": q["giver"],
                 "giver_where": "/".join(str(v) for k, v in q["giverAt"].items() if k in ("graph", "node", "zone", "nodeKind", "position")),
                 "return_to_giver": "Y" if rec["returnToGiver"] else ("auto" if q["turnIn"] == "auto" else "N (other NPC)"),
                 "prerequisites": json.dumps(q.get("requires"), ensure_ascii=False) if q.get("requires") else "",
                 "steps": " → ".join(f"{ev}:{ob['type']}" for ev, ob, wh, note in q["steps"]),
                 "reward_G": rw["G"], "reward_gold": gold, "reward_exp": exp,
                 "reward_items": "; ".join(f"{n}× {k}" for k, n in items.items()),
                 "reward_gear": "; ".join(f"{x['id']} ({x['en']})" for x in gears),
                 "reward_spell": ";".join(sp), "reward_skill": ";".join(rw.get("skills", [])),
                 "value_G": rec["rewards"]["valueG"], "value_gold": gold + item_val + gear_val, "spell_value_gold": spell_val,
                 "words": " ".join(f"{w}={cur[w]['simplified']}" for w in q["words"] if w in cur),
                 "hook": q.get("hook") or "", "summary": q["summary"]})

# hooks reconciliation
used_refs = defaultdict(list)
hook_ids = {h["id"] for h in hooks}
for q in D.Q:
    if q.get("hook"):
        if q["hook"] not in hook_ids: errors.append(f"{q['id']}: hook {q['hook']} not in quests_world.json")
        used_refs[q["hook"]].append(q["id"] + " (giver hook)")
    for ev, ob, wh, note in q["steps"]:
        ref = wh.get("ref")
        if ref:
            for h in hooks:
                if h["giver"] == ref and q["id"] + " (giver hook)" not in used_refs[h["id"]]:
                    used_refs[h["id"]].append(f"{q['id']} (step {ob['type']})")

os.makedirs(P("data"), exist_ok=True)
json.dump({"_note": "Quests v2 (Desy, 2026-10-02 PT): 50 NPC/story quests on world-graph nodes, schema quest/0.2 (GameDev §11.2 quest/0.1 + realm/zone/type/story/returnToGiver/values). Supersedes the v1 town-board quests (kept as quests_v1.json / quests_v1.csv). Built by build/story/build_quests.py from quests_def.py.",
           "version": "v2", "schema": "quest/0.2",
           "economy": {"G": G, "targetPerRealmG": TARGET_G, "targetCounts": "gold only (items, gear, spells are bonus)", "tolerance": TOL, "itemValueG": ITEM_G, "gearValue": "shop_price_common × 1.15 (fine) / × 1.3 (heroic)",
                       "spellValue": "shop price, reported separately", "skillsValue": 0},
           "quests": out}, open(P("data/quests.json"), "w"), ensure_ascii=False, indent=1)
with open(P("data/quests.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

# ---- tables for quests.md ----
md = []
md.append("| realm | G | quests | types | gold | gold (× G) | target 30 × G | gold vs target | flag | bonus: items (gold value) | bonus: gear (gold value) | bonus: spells (shop gold) | skills |")
md.append("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
tot = Counter()
for t in range(1, 10):
    qs = [r for r in out if r["realm"] == t]; g = G[t]
    gold = sum(r["rewards"]["goldValue"] for r in qs)
    itv = sum(sum(ITEM_G[k] * n for k, n in r["rewards"]["items"].items()) * g for r in qs)
    gv = sum(sum(x["goldValue"] for x in r["rewards"]["gear"]) for r in qs)
    sv = sum(r["rewards"]["spellValueGold"] for r in qs)
    sk = ", ".join(x for r in qs for x in r["rewards"]["skills"]) or "–"
    target = TARGET_G * g; ratio = gold / target
    flag = "ok" if abs(ratio - 1) <= TOL else ("HIGH" if ratio > 1 else "LOW")
    if flag != "ok": errors.append(f"realm {t}: quest gold {gold} is {ratio:.0%} of target {target}")
    types = ", ".join(f"{k} {v}" for k, v in sorted(Counter(r["type"] for r in qs).items()))
    md.append(f"| {t} {REALM_EN[t]} | {g} | {len(qs)} | {types} | {gold} | {gold / g:.0f} | {target} | {ratio:.0%} | {flag} | {itv} | {gv or '–'} | {sv or '–'} | {sk} |")
    tot.update(gold=gold, items=itv, gear=gv, target=target, spell=sv, n=len(qs))
md.append(f"| **all** | | **{tot['n']}** | | **{tot['gold']}** | | **{tot['target']}** | **{tot['gold'] / tot['target']:.0%}** | | {tot['items']} | {tot['gear']} | {tot['spell']} | |")
summary_table = "\n".join(md)

md2 = ["| id | realm · zone | type | giver | title | steps (event:objective) | back to giver | rewards | value (× G) | words |", "|---|---|---|---|---|---|---|---|---|---|"]
for r in out:
    rw = r["rewards"]
    parts = [f"{rw['goldValue']} g", f"{rw['expValue']} EXP"]
    parts += [f"{n}× {ITEM_NAMES[k]}" for k, n in rw["items"].items()]
    parts += [x["en"] for x in rw["gear"]]
    parts += [f"spell **{spells[s]['name_en']} {spells[s]['name_zh']}**" for s in rw["spells"]]
    parts += [f"skill **{s}**" for s in rw["skills"]]
    back = "yes" if r["returnToGiver"] else ("auto" if r["turnIn"] == "auto" else "to " + r["turnIn"]["npc"])
    md2.append(f"| `{r['id']}` | {r['realm']} · {r['zone']} | {r['type']} | {r['giver']['npc']} | {r['title']['zh']} {r['title']['en']} | "
               + " → ".join(f"{s['event']}:{s['objective']['type']}" for s in r["objectives"])
               + f" | {back} | {', '.join(parts)} | {rw['valueG']} | {' '.join(cur[w]['simplified'] for w in r['words'])} |")
quest_table = "\n".join(md2)

md3 = ["| hook (quests_world.json) | giver node | used by | note |", "|---|---|---|---|"]
for h in hooks:
    u = used_refs.get(h["id"])
    md3.append(f"| `{h['id']}` | `{h['giver']}` | {', '.join(u) if u else '–'} | {'replaced by ' + u[0].split(' ')[0] if u else 'free NPC slot: ambient/story NPC (see story.md §4) or a future quest'} |")
hook_table = "\n".join(md3)
open(P("build/story/quests_tables.md"), "w").write("<!--summary-->\n" + summary_table + "\n<!--quests-->\n" + quest_table + "\n<!--hooks-->\n" + hook_table + "\n")

print(summary_table)
print("types:", Counter(r["type"] for r in out), "return:", Counter(str(r['returnToGiver']) for r in out))
print("hooks used:", sum(1 for h in hooks if used_refs.get(h['id'])), "/", len(hooks))
errors = list(dict.fromkeys(errors))   # drop duplicate lines (same location checked per step)
print("ERRORS:", len(errors)); [print(" ", e) for e in errors]
