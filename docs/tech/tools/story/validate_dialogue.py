"""Validate data/dialogue/sc_*.json: schema, tokens exist, met rule, free-zh characters met, density limits, gotos, slots."""
import csv, json, glob, re, sys
import jsonschema
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from _paths import P   # repo-relative (see _paths.py)
cur = {r["id"]: r for r in csv.DictReader(open(P("core-curriculum.csv"), encoding="utf-8-sig"))}
pool = {r["id"]: r for r in csv.DictReader(open(P("data/curriculum_location_pools.csv"), encoding="utf-8-sig"))}
zones = json.load(open(P("data/world/zones.json")))["zones"]
zseq = sorted(zones, key=lambda z: (z["realm"], z["order"])); zg = {z["id"]: i + 1 for i, z in enumerate(zseq)}
schema = json.load(open(P("data/dialogue/scene.schema.json")))
NAMES = set("小龙风皮墨白林飞美叶子金")  # name characters are exempt (小龙, 风龙, 皮皮, 墨将军, 白奶奶, 林小飞, 小美, 叶子, 金龙)
PUNCT = set("，。！？、…：；“”‘’（）《》 ")
# a scene may always have 2 token lines; density: max distinct tokens per line, max share of lines with tokens, max zh length, min share of speaking lines with zh
DENS = {"D1": (1, .30, 0, 0), "D2": (2, .50, 0, 0), "D3": (2, .60, 6, 0), "D4": (3, .70, 10, .15), "D5": (3, .80, 12, .30), "D6": (3, 1.0, 15, .50)}
err = 0
def bad(sid, m):
    global err; err += 1; print(f"  ERROR {sid}: {m}")
for f in sorted(glob.glob(P("data/dialogue/sc_*.json"))):
    s = json.load(open(f)); sid = s["id"]
    try: jsonschema.validate(s, schema)
    except jsonschema.ValidationError as e: bad(sid, "schema: " + e.message); continue
    g = zg[s["zone"]]
    cond = json.dumps(s["trigger"].get("cond", {}))
    for z in zg:
        if f'"bossDefeated": "{z}"' in cond: g = max(g, min(zg[z] + 1, 20))
    met = [i for i in cur if i in pool and int(pool[i]["location_global_no"]) <= g]
    metchars = set("".join(cur[i]["simplified"] for i in met))
    teach = set(s.get("teaches", []))
    mx, share, zlen, zshare = DENS[s["density"]]
    ids = {l["id"] for l in s["lines"]}
    slots = {v["char"] for v in s["slots"].values()}
    speak = [l for l in s["lines"] if l["speaker"] != "narrator"]
    with_tok = 0
    for l in s["lines"]:
        toks = l.get("tokens", [])
        for c in l.get("choices", []): toks = toks + c.get("tokens", [])
        for t in toks:
            if t not in cur: bad(sid, f"{l['id']}: unknown item {t}")
            elif t not in teach and int(pool[t]["location_global_no"]) > g:
                bad(sid, f"{l['id']}: {t} {cur[t]['simplified']} is from {pool[t]['location_id']}, not met yet")
        if len(set(l.get("tokens", []))) > mx: bad(sid, f"{l['id']}: {len(set(l['tokens']))} tokens > {mx} for {s['density']}")
        if l.get("tokens"): with_tok += 1
        if "zh" in l:
            core = [ch for ch in l["zh"] if ch not in PUNCT]
            if zlen and len(core) > zlen: bad(sid, f"{l['id']}: zh '{l['zh']}' has {len(core)} chars > {zlen}")
            if not zlen: bad(sid, f"{l['id']}: full zh sentences are not allowed at {s['density']}")
            miss = [ch for ch in core if ch not in metchars and ch not in NAMES]
            if miss: bad(sid, f"{l['id']}: zh chars not met yet: {''.join(miss)}")
        if "swap" in l: slots.add(l["swap"]["char"])
        if l["speaker"] not in ("narrator",) and l["speaker"] not in slots: bad(sid, f"{l['id']}: speaker {l['speaker']} not on a slot")
        for tgt in [l.get("goto")] + [c.get("goto") for c in l.get("choices", [])]:
            if tgt and tgt not in ids: bad(sid, f"{l['id']}: goto {tgt} missing")
    ratio = with_tok / len(s["lines"])
    if with_tok > max(2, share * len(s["lines"])): bad(sid, f"{ratio:.0%} of lines have tokens > {share:.0%} for {s['density']}")
    zr = sum(1 for l in speak if "zh" in l) / max(1, len(speak))
    if zr < zshare: bad(sid, f"only {zr:.0%} of speaking lines have a zh sentence (< {zshare:.0%})")
    print(f"{sid}: {s['density']} met≤#{g}, {len(s['lines'])} lines, tokens in {ratio:.0%} of lines, zh in {zr:.0%} of speaking lines, words {s['words']}")
print("ERRORS:", err); sys.exit(1 if err else 0)
