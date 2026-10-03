"""Writes the hand-authored v3.8 world-graph data to /workspace/desy/data/world/:
world_rules.json, events.json, encounters.json, graphs/world.json, graphs/realm_1.json (Starter Meadow, 17 nodes, 3 zones),
graphs/village_1.json and graphs/village_2.json (town interiors). Realms 2-9 and their dungeon levels come from world_gen.py.
Run: /workspace/desy/.venv/bin/python make_world_data.py && /workspace/desy/.venv/bin/python world_gen.py"""
import json, os
OUT = '/workspace/desy/data/world'
VERSION = 'v3.8'
def dump(path, obj):
    p = os.path.join(OUT, path); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f: json.dump(obj, f, ensure_ascii=False, indent=1); f.write('\n')

RULES = {
 "_note": "v3.8 world-graph knobs (combat-spec §12, world-graph.md §5). camelCase like balance.json; GameDev may merge this object into balance.json as \"world\". Tuned with build/world/world_sim.py. Not repeated here (already in balance.json): patrol trigger learning.bossTrigger / bossTriggerSpeech, forced patrols learning.patrolsPerTrip, patrol elite learning.eliteReplaceChance, max enemies combat.maxEnemies, Return Feather = shop.json 'feather'.",
 "version": VERSION,
 "encounterRate": {"0": 0.0, "1": 0.6, "2": 0.85, "3": 0.95},
 "depthStep": 0.1,
 "maxRate": 0.95,
 "safe": {"townAdjacent": True, "innAdjacent": True, "bossApproach": True, "portals": True,
          "afterBossClear": {"scope": "the way you came: the shortest route over already-walked (or safe) edges from the cleared boss / mini-boss node back to the nearest inn or town; never the unexplored way forward", "hops": 20, "endsOnInnRest": True}},
 "clearedStepMult": 0.05,
 "zoneBattleBudget": 8,
 "budgetSpentMult": 0.1,
 "pityRolls": 2,
 "repel": {"item": "bell", "hops": 6, "maxDanger": 2, "blocksScripted": False, "blocksPatrols": False},
 "walkSecPerHop": 1.0,
 "walkSecPerStep": 1.5,
 "eventSec": {"nothing": 0, "story": 12, "quest_offer": 10, "item": 4, "treasure": 5, "portal": 3, "miniboss": 0},
 "beelineBattleTarget": 8.0,
 "beelineBattleRange": [6.5, 9.5],
 "maxHopsToInn": 5,
 "innWarp": {"toTowns": "visited", "sec": 20, "note": "from any inn the hero can warp to a visited town (shops, magic shop, smith) and back to the same inn for free (sec = time cost when used); this keeps shopping as easy as v3.7 deep in a dungeon"},
 "seed": {"algorithm": "mulberry32", "key": "saveSeed|graphId|edgeId|crossing|step", "note": "every roll is a pure function of the save seed and how many times that edge was crossed, so reloading never re-rolls"}
}

EV = []
def ev(id, type, repeat='once', **kw):
    e = {"id": id, "type": type, "repeat": repeat if isinstance(repeat, dict) else {"mode": repeat}}; e.update(kw); EV.append(e); return id
ev('nothing', 'nothing', 'always')
ev('ambient', 'story', 'always', lines=[{"speaker": "panda", "zh": "我们走吧！", "en": "Let's keep going!"}])
ev('find_honey', 'item', {"mode": "cooldown", "visits": 4}, item="honey", qty=1)
ev('chest_normal', 'treasure', chest="normal")
ev('chest_fine', 'treasure', chest="locboss")
# Starter Meadow (realm_1)
ev('meadow_intro', 'story', lines=[{"speaker": "panda", "zh": "这里是新手草原！", "en": "This is Starter Meadow! Tap a place to walk there. Monsters hide in the long grass."}])
ev('meadow_tip_inn', 'story', lines=[{"speaker": "panda", "zh": "累了就去客栈。", "en": "Tired? Paths next to an inn or a village are always safe."}])
ev('farmer_offer_hoe', 'quest_offer', quest="q1_hoe", npc="farmer_li")
ev('farmer_offer_bounty', 'quest_offer', quest="q1_bounty", npc="farmer_li")
ev('farmer_thanks', 'story', 'always', lines=[{"speaker": "farmer_li", "zh": "谢谢你！", "en": "Thank you, little hero!"}])
ev('well_hoe', 'item', item="farmers_hoe", qty=1, quest="q1_hoe", requires=[{"questActive": "q1_hoe"}])
ev('well_hint', 'story', lines=[{"speaker": "panda", "zh": "井里有东西在发光。", "en": "Something shiny is down in the old well... Farmer Li lost something!"}])
ev('crow_boss_intro', 'story', lines=[{"speaker": "panda", "zh": "大嘴乌鸦！", "en": "The Big-Beak Crow guards the hill road!"}])
ev('clover_sign', 'story', lines=[{"speaker": "panda", "zh": "一、二、三……", "en": "The old sign counts the hills: 一, 二, 三!"}])
ev('camp_welcome', 'story', lines=[{"speaker": "panda", "zh": "营火真暖和。", "en": "A campfire inn! We can rest and save here."}])
ev('warren_offer_carrot', 'quest_offer', quest="q1_carrot", npc="xiaoming")
ev('thief_miniboss', 'miniboss', enemies=["swift_horned_rabbit", "wolf_pup"], quest="q1_carrot", reward={"goldG": 2, "item": "honey"}, setFlags=["realm_1.thiefBeaten"])
ev('thief_gone', 'story', 'always', lines=[{"speaker": "panda", "zh": "小偷跑了。", "en": "The carrot thief's nest is empty now."}])
ev('lake_carrot', 'item', item="golden_carrot", qty=1, quest="q1_carrot", requires=[{"questActive": "q1_carrot"}])
ev('king_warning', 'story', lines=[{"speaker": "panda", "zh": "角兔王就在前面！", "en": "The Horned Rabbit King is just ahead! Rest here first."}])
ev('king_beaten', 'story', lines=[{"speaker": "panda", "zh": "你赢了！", "en": "You did it! The road to Honeycomb Forest is open."}])
# Little Hill Village interior
ev('village_welcome', 'story', lines=[{"speaker": "elder_wang", "zh": "欢迎来到小山村！", "en": "Welcome to Little Hill Village!"}])
ev('elder_offer_delivery', 'quest_offer', quest="q1_delivery", npc="elder_wang", requires=[{"bossDefeated": "realm_1/w_throne"}])
ev('elder_hint', 'story', 'always', lines=[{"speaker": "elder_wang", "zh": "去学堂看看新词吧。", "en": "Peek at the new words in the school before you go."}])
ev('kid_chat', 'story', 'always', lines=[{"speaker": "xiaoming", "zh": "你好！", "en": "Hi! Have you seen my golden carrot?"}])
ev('honeytown_welcome', 'story', lines=[{"speaker": "mayor_hu", "zh": "欢迎来到蜂蜜镇！", "en": "Welcome to Honey Town!"}])

QUEST_HOOKS = [
 {"id": "q1_hoe", "status": "hook", "type": "fetch", "titleZh": "找回锄头", "titleEn": "Find Farmer Li's hoe", "giver": "realm_1/m_farm", "target": {"item": "farmers_hoe", "n": 1}, "turnIn": "realm_1/m_farm", "rewardG": 2, "rewardItem": "honey"},
 {"id": "q1_carrot", "status": "hook", "type": "miniboss", "titleZh": "金萝卜", "titleEn": "The golden carrot thief", "giver": "realm_1/w_path", "target": {"event": "thief_miniboss", "n": 1}, "turnIn": "realm_1/village", "rewardG": 3, "rewardItem": "feather"},
]
QUEST_ITEMS = [
 {"id": "farmers_hoe", "zh": "锄头", "en": "Farmer Li's hoe", "emoji": "🪓", "quest": "q1_hoe"},
 {"id": "golden_carrot", "zh": "金萝卜", "en": "Golden carrot", "emoji": "🥕", "quest": "q1_carrot"},
]
SPEAKERS = {"panda": {"zh": "熊猫", "en": "Panda (companion)"}, "farmer_li": {"zh": "李农夫", "en": "Farmer Li"}, "elder_wang": {"zh": "王爷爷", "en": "Elder Wang"},
            "xiaoming": {"zh": "小明", "en": "Xiaoming"}, "mayor_hu": {"zh": "胡镇长", "en": "Mayor Hu"}}
ENC = [
 {"id": "meadow", "tier": 1, "enemiesPerBattle": [1, 2], "roster": [{"enemy": "horned_rabbit", "weight": 3}, {"enemy": "mushroom_imp", "weight": 2}], "packs": {}, "elite": "swift_horned_rabbit"},
 {"id": "clover_hills", "tier": 1, "enemiesPerBattle": [1, 2], "roster": [{"enemy": "horned_rabbit", "weight": 3}, {"enemy": "mushroom_imp", "weight": 2}, {"enemy": "wolf_pup", "weight": 1}], "packs": {"wolf_pup": 2}, "elite": "swift_horned_rabbit"},
 {"id": "warren", "tier": 1, "enemiesPerBattle": [1, 2], "roster": [{"enemy": "horned_rabbit", "weight": 3}, {"enemy": "wolf_pup", "weight": 2}], "packs": {"wolf_pup": 2}, "elite": "swift_horned_rabbit"},
]

def N(id, kind, name, zh, x, y, **kw):
    d = {"id": id, "kind": kind, "name": name, "zh": zh, "x": x, "y": y}; d.update(kw); return d
def E(id, a, b, danger, steps=1, **kw):
    d = {"id": id, "from": a, "to": b, "danger": danger, "steps": steps}; d.update(kw); return d
PATH = [{"pick": [{"event": "nothing", "weight": 70}, {"event": "ambient", "weight": 15}, {"event": "find_honey", "weight": 15}]}]
realm1 = {
 "id": "realm_1", "kind": "realm", "version": VERSION, "name": "Starter Meadow", "zh": "新手草原", "tier": 1, "level": 0, "entry": "village", "bg": "bg_realm_1",
 "_note": "Hand-authored example (17 nodes, 3 zones = the 3 locations L1.1-L1.3). Each zone ends at a boss node behind a gate edge (patrol rule, no random battles). Grass edges carry the random battles; 'steps' = encounter rolls along the edge. Prototype mode: the prototype's single 'meadow' location = this graph with all 3 zones on the meadow pool (see world-graph.md §9).",
 "zones": [
  {"id": "meadow", "order": 1, "location": "meadow", "desyPool": "L1.1", "pool": "meadow", "boss": "m_crow", "bossKind": "locboss", "enemy": "big_beak_crow", "gateEdge": "g1", "encounterTable": "meadow"},
  {"id": "clover_hills", "order": 2, "location": "clover_hills", "desyPool": "L1.2", "pool": "clover_hills", "boss": "c_den", "bossKind": "locboss", "enemy": "big_grey_wolf", "gateEdge": "g2", "encounterTable": "clover_hills", "requires": [{"bossDefeated": "realm_1/m_crow"}]},
  {"id": "warren", "order": 3, "location": "warren", "desyPool": "L1.3", "pool": "warren", "boss": "w_throne", "bossKind": "realmboss", "enemy": "horned_rabbit_king", "gateEdge": "g3", "encounterTable": "warren", "requires": [{"bossDefeated": "realm_1/c_den"}], "scriptedElite": "swift_horned_rabbit"}],
 "nodes": [
  N("village", "town", "Little Hill Village", "小山村", 150, 560, zone="meadow", town=1, services=["inn", "save", "shop"], portal={"toGraph": "village_1", "toNode": "square"}, onArrive=[{"event": "meadow_intro"}]),
  N("m_fork", "crossroads", "Meadow crossroads", "草地路口", 330, 520, zone="meadow", onArrive=PATH),
  N("m_farm", "npc", "Farmer Li's field", "李农夫的田", 300, 650, zone="meadow", npc="farmer_li", onArrive=[{"event": "farmer_offer_hoe"}, {"event": "farmer_offer_bounty"}, {"event": "farmer_thanks"}]),
  N("m_well", "treasure", "Old well", "老井", 470, 650, zone="meadow", onArrive=[{"event": "well_hoe"}, {"event": "chest_normal"}, {"event": "well_hint"}]),
  N("m_field", "path", "Long grass", "长草地", 520, 470, zone="meadow", onArrive=PATH),
  N("m_grass", "path", "Hill road", "山路", 640, 400, zone="meadow", onArrive=[{"event": "crow_boss_intro"}] + PATH),
  N("m_crow", "boss", "Crow's tree", "乌鸦树", 700, 300, zone="meadow", boss={"enemy": "big_beak_crow", "kind": "locboss", "reward": "locations.json bossReward", "setFlags": ["realm_1.crowBeaten"]}),
  N("c_hills", "path", "Clover Hills", "三叶草山坡", 840, 330, zone="clover_hills", onArrive=[{"event": "clover_sign"}] + PATH),
  N("c_camp", "campfire", "Midpoint campfire inn", "半路营火", 900, 450, zone="clover_hills", services=["inn", "save", "practice", "potions"], onArrive=[{"event": "camp_welcome"}]),
  N("c_ridge", "path", "Windy ridge", "风岭", 980, 250, zone="clover_hills", onArrive=PATH),
  N("c_den", "boss", "Wolf den", "狼窝", 1100, 200, zone="clover_hills", boss={"enemy": "big_grey_wolf", "kind": "locboss", "reward": "locations.json bossReward", "setFlags": ["realm_1.wolfBeaten"]}),
  N("w_path", "path", "Burrow path", "兔洞小路", 1000, 120, zone="warren", npc="xiaoming", onArrive=[{"event": "warren_offer_carrot"}] + PATH),
  N("w_lake", "treasure", "Clover lake", "三叶湖", 860, 60, zone="warren", onArrive=[{"event": "lake_carrot"}, {"event": "chest_normal"}, {"event": "nothing"}]),
  N("w_tunnel", "crossroads", "Warren tunnels", "兔窝隧道", 780, 150, zone="warren", onArrive=PATH),
  N("w_nest", "miniboss", "Thief's nest", "小偷窝", 620, 60, zone="warren", onArrive=[{"event": "thief_miniboss"}, {"event": "thief_gone"}]),
  N("w_camp", "inn", "Boss-approach inn", "营地客栈", 560, 200, zone="warren", services=["inn", "save", "practice", "potions"], onArrive=[{"event": "king_warning"}]),
  N("w_throne", "boss", "Rabbit King's throne", "角兔王座", 420, 260, zone="warren", boss={"enemy": "horned_rabbit_king", "kind": "realmboss", "reward": "locations.json bossReward", "setFlags": ["realm_1.bossDefeated"],
       "unlocks": [{"graph": "world", "edge": "w12"}]}, exitTo={"graph": "world", "node": "realm_1"}, onArrive=[{"event": "king_beaten", "requires": [{"bossDefeated": "realm_1/w_throne"}]}]),
 ],
 "edges": [
  E("e1", "village", "m_fork", 0, 1, kind="road"),
  E("e2", "m_fork", "m_farm", 1, 1, kind="grass"),
  E("e3", "m_fork", "m_well", 1, 2, kind="grass"),
  E("e4", "m_fork", "m_field", 2, 5, kind="grass"),
  E("e5", "m_farm", "m_field", 1, 2, kind="grass", note="loop: the farm track rejoins the long grass"),
  E("e6", "m_field", "m_grass", 2, 4, kind="grass"),
  E("g1", "m_grass", "m_crow", 0, 1, kind="gate", patrolGate=True),
  E("e7", "m_crow", "c_hills", 2, 5, kind="grass", requires=[{"bossDefeated": "realm_1/m_crow"}]),
  E("e8", "c_hills", "c_camp", 0, 1, kind="road"),
  E("e9", "c_hills", "c_ridge", 2, 4, kind="grass"),
  E("e10", "c_camp", "c_ridge", 1, 2, kind="grass", note="loop past the campfire"),
  E("g2", "c_ridge", "c_den", 0, 1, kind="gate", patrolGate=True),
  E("e11", "c_den", "w_path", 2, 4, kind="grass", requires=[{"bossDefeated": "realm_1/c_den"}], scripted={"enemies": ["swift_horned_rabbit"], "fill": True, "once": True, "step": 2}),
  E("e12", "w_path", "w_lake", 1, 1, kind="grass"),
  E("e13", "w_path", "w_tunnel", 2, 4, kind="tunnel"),
  E("e14", "w_tunnel", "w_nest", 2, 2, kind="tunnel"),
  E("e15", "w_tunnel", "w_camp", 0, 1, kind="tunnel"),
  E("g3", "w_camp", "w_throne", 0, 1, kind="gate", patrolGate=True),
 ]}
VIL = {"inn": (214, 150), "equip": (477, 176), "shop": (688, 186), "words": (910, 138), "gate": (1175, 288), "magic": (960, 404), "quests": (250, 420)}
def village(gid, town, name, zh, welcome, realm_node, extra_nodes=()):
    nodes = [N("square", "square", "Village square", "广场", 640, 520, onArrive=[{"event": welcome}]),
             N("inn", "inn", "Sleepy Panda Inn", "熊猫客栈", *VIL["inn"], services=["inn", "save"]),
             N("equip", "service", "Gear & skills", "装备", *VIL["equip"], services=["equip"]),
             N("shop", "shop", "Grandma Wu's Shop", "商店", *VIL["shop"], services=["shop"], shop="items"),
             N("words", "service", "School: words & practice", "学堂", *VIL["words"], services=["preview", "practice"]),
             N("magic", "shop", "Magic shop", "魔法店", *VIL["magic"], services=["shop"], shop="magic"),
             N("quests", "board", "Quest board", "任务板", *VIL["quests"], services=["questBoard"]),
             N("gate", "exit", "Adventure gate", "出发", *VIL["gate"], exitTo={"graph": f"realm_{town}", "node": realm_node})] + list(extra_nodes)
    edges = [E(f"v_{n['id']}", "square", n["id"], 0, 1, kind="street") for n in nodes[1:]]
    return {"id": gid, "kind": "village", "version": VERSION, "name": name, "zh": zh, "tier": town, "town": town, "level": 0, "entry": "square", "bg": "bg_village",
            "_note": "Town interior: all streets are safe (danger 0) and don't count toward realm node totals. Node positions = the prototype's VILLAGE signboards (screens.ts); the shop screens stay as they are.",
            "nodes": nodes, "edges": edges}
v1 = village("village_1", 1, "Little Hill Village", "小山村", "village_welcome", "village",
             [N("elder", "npc", "Elder Wang", "王爷爷", 520, 610, npc="elder_wang", onArrive=[{"event": "elder_offer_delivery"}, {"event": "elder_hint"}]),
              N("kid", "npc", "Xiaoming", "小明", 800, 610, npc="xiaoming", onArrive=[{"event": "kid_chat"}])])
v2 = village("village_2", 2, "Honey Town", "蜂蜜镇", "honeytown_welcome", "town_1")
REALM_NAMES = [("Starter Meadow", "新手草原"), ("Honeycomb Forest", "蜂巢森林"), ("Crossroads Market", "十字路口集市"), ("Goblin Caves", "哥布林洞穴"), ("Hydra Swamp", "九头蛇沼泽"),
               ("Zombie Lands", "僵尸之地"), ("Griffin Peaks", "狮鹫山峰"), ("Ogre Colosseum", "食人魔角斗场"), ("Demon King's Castle", "魔王城")]
world = {"id": "world", "kind": "world", "version": VERSION, "name": "World map", "zh": "世界地图", "level": 0, "entry": "realm_1", "bg": "bg_world",
         "_note": "One node per realm; a realm edge opens when the previous realm boss is beaten. Add a realm = add a node, an edge and a realm graph file.",
         "nodes": [N(f"realm_{t}", "portal", n, z, 120 + 130*(t-1), 600 - 55*(t-1), portal={"toGraph": f"realm_{t}", "toNode": "entry_town" if t > 1 else "village"}, inBuild=t <= 2) for t, (n, z) in enumerate(REALM_NAMES, 1)],
         "edges": [E(f"w{t}{t+1}", f"realm_{t}", f"realm_{t+1}", 0, 1, kind="road", requires=[{"bossDefeated": f"realm_{t}/{'w_throne' if t == 1 else 'boss_' + str(t)}"}]) for t in range(1, 9)]}
import v03
ZONE_OF_BOSS = {"realm_1/m_crow": "meadow", "realm_1/c_den": "clover_hills", "realm_1/w_throne": "warren"}
def zones_r1():
    out = []
    enc = {e['id']: e for e in ENC}
    for z in realm1['zones']:
        e = enc[z['encounterTable']]
        d = {"id": z['id'], "realm": 1, "order": z['order'], "title": {"en": {"meadow": "Village Meadow", "clover_hills": "Clover Hills", "warren": "Horned Rabbit Warren"}[z['id']],
             "zh": {"meadow": "村边草地", "clover_hills": "三叶草山坡", "warren": "角兔窝"}[z['id']]}, "location": z['location'], "desyPool": z['desyPool'], "pool": z['pool'], "tier": 1,
             "bossNode": {"graph": "realm_1", "node": z['boss']}, "gateEdge": {"graph": "realm_1", "edge": z['gateEdge']}, "bossKind": z['bossKind'], "boss": z['enemy'],
             "enemiesPerBattle": e['enemiesPerBattle'], "roster": e['roster'], "packs": e['packs'], "elite": e['elite']}
        if z.get('scriptedElite'): d["scriptedElite"] = z['scriptedElite']
        d["unlockRequires"] = [out[-1]['id']] if out else []
        out.append(d)
    return out
def build():
    import glob
    for f in glob.glob(OUT + '/*.json') + glob.glob(OUT + '/graphs/*.json'): os.remove(f)
    dump('world_rules.json', RULES)
    v03.ZONE_OF_BOSS.clear(); v03.ZONE_OF_BOSS.update(ZONE_OF_BOSS)
    EVS = {e['id']: e for e in EV}
    r1 = dict(realm1); r1['nodes'] = [dict(n) for n in realm1['nodes']]
    dump('graphs/realm_1.json', v03.convert(r1, EVS, SPEAKERS))
    w = dict(world); dump('graphs/world.json', v03.convert(w, EVS, SPEAKERS))
    dump('zones.json', {"_note": "v3.8 zones: one per location (word pool + boss). Field names follow src/data/locations.json (roster, packs, elite, unlockRequires, desyPool); new: realm, order, bossNode, gateEdge, bossKind, scriptedElite. The roster replaces locations.json roster/packs/elite and the old scripted/pathFights/mapNodes fields.",
                        "version": VERSION, "zones": zones_r1()})
    dump('quests_world.json', {"_note": "Quest hooks given by NPC nodes (placeholders until the quest system; quests.json board quests stay as they are) and quest items.", "version": VERSION,
                               "questHooks": QUEST_HOOKS, "questItems": QUEST_ITEMS, "speakers": SPEAKERS})
if __name__ == '__main__':
    build(); print('authored data written,', len(EV), 'events')
