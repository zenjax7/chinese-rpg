"""Writes data/world/schemas/*.schema.json (JSON Schema 2020-12) for the v3.8 world data (graph/0.3)."""
import json, os
OUT = '/workspace/desy/data/world/schemas'; os.makedirs(OUT, exist_ok=True)
B = 'https://zenjax7.github.io/chinese-rpg/schemas/world/'
ID = {"type": "string", "pattern": "^[a-z0-9_]+$"}
KEY = {"type": "string", "pattern": "^[a-z0-9_.]+$", "description": "id that may carry a graph prefix, e.g. realm_1.crowBeaten"}
TEXT = {"type": "object", "properties": {"zh": {"type": "string"}, "en": {"type": "string"}}, "required": ["en"], "additionalProperties": False}
REF = lambda d: {"$ref": f"common.schema.json#/$defs/{d}"}
NODE_KINDS = ["town", "village", "inn", "waypoint", "fork", "chest", "npc", "story", "miniboss", "boss", "lever", "stairs_up", "stairs_down", "portal", "exit", "shop"]
EDGE_KINDS = ["path", "oneway", "shortcut", "stairs", "portal", "exit"]
OUTCOMES = ["nothing", "quest_offer", "miniboss", "item", "portal", "story", "treasure"]
common = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "common.schema.json", "title": "Shared definitions for the world data", "$defs": {
  "id": ID, "text": TEXT,
  "nodeRef": {"description": "A node in another graph", "type": "object", "properties": {"graph": ID, "node": ID}, "required": ["graph", "node"], "additionalProperties": False},
  "edgeRef": {"type": "object", "properties": {"graph": ID, "edge": ID}, "required": ["graph", "edge"], "additionalProperties": False},
  "cond": {"description": "Condition tree (GameDev §6 names). Exactly one key per object.", "type": "object", "minProperties": 1, "maxProperties": 1, "properties": {
      "all": {"type": "array", "items": {"$ref": "#/$defs/cond"}, "minItems": 1}, "any": {"type": "array", "items": {"$ref": "#/$defs/cond"}, "minItems": 1}, "not": {"$ref": "#/$defs/cond"},
      "flag": {"type": "string"}, "questActive": ID, "questClaimed": ID, "questDone": ID, "bossDefeated": {"description": "zone id from zones.json", **ID}, "visited": {"type": "string"},
      "wordsReady": {"type": "object", "properties": {"pool": ID, "n": {"type": "integer", "minimum": 1}}, "required": ["pool"], "additionalProperties": False},
      "readinessAtLeast": {"type": "number", "minimum": 0, "maximum": 1}, "levelAtLeast": {"type": "integer", "minimum": 1}, "hasItem": ID, "shortcutOpen": ID}, "additionalProperties": False},
  "action": {"description": "One action per object; extra keys are its arguments.", "type": "object", "oneOf": [
      {"required": ["dialogue"], "properties": {"dialogue": KEY}},
      {"required": ["toast"], "properties": {"toast": TEXT}},
      {"required": ["offerQuest"], "properties": {"offerQuest": ID}},
      {"required": ["startQuest"], "properties": {"startQuest": ID}},
      {"required": ["giveItem"], "properties": {"giveItem": ID, "qty": {"type": "integer", "minimum": 1}, "quest": ID}},
      {"required": ["giveGear"], "properties": {"giveGear": ID}},
      {"required": ["giveSkill"], "properties": {"giveSkill": ID}},
      {"required": ["giveGold"], "properties": {"giveGold": {"type": "object", "properties": {"G": {"type": "number", "minimum": 0}}, "required": ["G"]}}},
      {"required": ["openChest"], "properties": {"openChest": {"enum": ["chest_normal", "chest_fine", "chest_boss"]}}},
      {"required": ["fight"], "properties": {"fight": {"type": "object", "properties": {"kind": {"enum": ["miniboss", "elite", "scripted"]}, "enemies": {"type": "array", "items": ID}, "fill": {"type": "boolean"}}, "required": ["kind"]}, "quest": ID}},
      {"required": ["setFlag"], "properties": {"setFlag": {"type": "string"}}},
      {"required": ["openShortcut"], "properties": {"openShortcut": ID}},
      {"required": ["unlockGraph"], "properties": {"unlockGraph": ID}},
      {"required": ["heal"], "properties": {"heal": {"enum": ["full", "hp", "mp"]}}},
      {"required": ["teleport"], "properties": {"teleport": {"$ref": "#/$defs/nodeRef"}}},
      {"required": ["defeatBoss"], "properties": {"defeatBoss": ID}}]},
  "outcome": {"enum": OUTCOMES}}}
ev_common = {"outcome": REF("outcome"), "once": {"type": "boolean"}, "cooldown": {"type": "integer", "minimum": 1, "description": "visits to this node before it can fire again"},
             "cond": REF("cond"), "do": {"type": "array", "items": REF("action")}}
event = {"type": "object", "properties": {"id": {"type": "string"}, "node": ID, "on": {"enum": ["enter", "firstEnter", "clear", "leave", "rest"]}, **ev_common,
         "pick": {"type": "array", "minItems": 1, "items": {"type": "object", "properties": {"weight": {"type": "number", "exclusiveMinimum": 0}, **ev_common}, "required": ["weight", "do"], "additionalProperties": False}}},
         "required": ["id", "node", "on"], "oneOf": [{"required": ["do"], "not": {"required": ["pick"]}}, {"required": ["pick"], "not": {"required": ["do"]}}], "additionalProperties": False}
node = {"type": "object", "properties": {"id": ID, "idx": {"type": "integer", "minimum": 0, "description": "stable, never reused (save bitsets)"}, "kind": {"enum": NODE_KINDS},
        "x": {"type": "number"}, "y": {"type": "number"}, "zone": ID, "title": TEXT, "save": {"type": "boolean"}, "services": {"type": "array", "items": {"enum": ["inn", "save", "shop", "potions", "magic", "school", "practice", "board", "smith"]}},
        "hub": {"type": "string", "description": "town screen id (screens.ts)"}, "town": {"type": "integer", "minimum": 1, "maximum": 9, "description": "towns.json number (prices)"},
        "shops": {"type": "array", "items": {"type": "string"}}, "campfire": {"type": "boolean"}, "boss": {"type": "string", "description": "zone id"}, "npc": ID, "inBuild": {"type": "boolean"}},
        "required": ["id", "idx", "kind", "x", "y"], "additionalProperties": False}
edge = {"type": "object", "properties": {"id": ID, "idx": {"type": "integer", "minimum": 0}, "from": ID, "to": {"oneOf": [ID, REF("nodeRef")]}, "kind": {"enum": EDGE_KINDS},
        "danger": {"type": "integer", "minimum": 0, "maximum": 3}, "steps": {"type": "integer", "minimum": 1, "maximum": 8}, "terrain": {"type": "string"},
        "patrol": {"type": "boolean", "description": "boss approach: no random battles; Train/patrol rule applies (spec §7.4)"},
        "scripted": {"type": "object", "properties": {"enemies": {"type": "array", "items": ID}, "fill": {"type": "boolean"}, "once": {"type": "boolean"}, "step": {"type": "integer", "minimum": 1}}, "required": ["enemies"], "additionalProperties": False},
        "cond": REF("cond"), "opens": {"type": "string", "description": "shortcut id this edge belongs to"}, "label": TEXT, "note": {"type": "string"}},
        "required": ["id", "from", "to", "kind"], "additionalProperties": False,
        "allOf": [{"if": {"properties": {"kind": {"enum": ["stairs", "portal", "exit"]}}}, "then": {"properties": {"to": REF("nodeRef")}}, "else": {"properties": {"to": ID}, "required": ["danger", "steps"]}}]}
line = {"type": "object", "properties": {"speaker": ID, "zh": {"type": "string"}, "en": {"type": "string"}, "vo": {"type": "string"}}, "required": ["speaker", "en"], "additionalProperties": False}
graph = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "graph.schema.json", "title": "World graph (graph/0.3): one file per world map, realm overworld or dungeon level", "type": "object", "properties": {
  "_note": {"type": "string"}, "schema": {"const": "graph/0.3"}, "id": ID, "kind": {"enum": ["world", "overworld", "dungeon_level"]}, "realm": {"type": ["integer", "null"], "minimum": 1, "maximum": 9},
  "dungeon": {"type": ["string", "null"]}, "level": {"type": "integer", "minimum": 0}, "levels": {"type": "integer", "minimum": 1}, "optional": {"type": "boolean"}, "title": TEXT,
  "status": {"enum": ["authored", "reference"]}, "entry": ID, "idxMax": {"type": "integer", "minimum": 0}, "background": {"type": "object", "properties": {"map": {"type": "string"}, "battle": {"type": "string"}}},
  "music": {"type": "string"}, "nodes": {"type": "array", "items": node, "minItems": 1}, "edges": {"type": "array", "items": edge}, "events": {"type": "array", "items": event},
  "dialogue": {"type": "object", "additionalProperties": {"type": "array", "items": line, "minItems": 1}},
  "npcs": {"type": "object", "additionalProperties": {"type": "object", "properties": {"name": TEXT, "portrait": {"type": "string"}}, "required": ["name"]}}},
  "required": ["schema", "id", "kind", "title", "entry", "idxMax", "nodes", "edges"], "additionalProperties": False,
  "allOf": [{"if": {"properties": {"kind": {"const": "dungeon_level"}}}, "then": {"required": ["dungeon", "level"], "properties": {"level": {"minimum": 1}}}}]}
zone = {"type": "object", "properties": {"id": ID, "realm": {"type": "integer", "minimum": 1, "maximum": 9}, "order": {"type": "integer", "minimum": 1}, "title": TEXT,
        "location": {"type": "string", "description": "src/data/locations.json id"}, "desyPool": {"type": "string", "pattern": "^L[1-9]\\.[1-9]$"}, "pool": ID, "tier": {"type": "integer"},
        "bossNode": REF("nodeRef"), "gateEdge": REF("edgeRef"), "bossKind": {"enum": ["locboss", "realmboss"]}, "boss": ID,
        "enemiesPerBattle": {"type": "array", "items": {"type": "integer", "minimum": 1, "maximum": 3}, "minItems": 2, "maxItems": 2},
        "roster": {"type": "array", "items": {"type": "object", "properties": {"enemy": ID, "weight": {"type": "number", "exclusiveMinimum": 0}}, "required": ["enemy", "weight"], "additionalProperties": False}},
        "fromRoster": {"type": "object", "properties": {"location": {"type": "string"}}, "required": ["location"]},
        "packs": {"type": "object"}, "elite": ID, "scriptedElite": {"type": ["string", "boolean"]}, "unlockRequires": {"type": "array", "items": ID}},
        "required": ["id", "realm", "order", "title", "desyPool", "pool", "bossNode", "gateEdge", "bossKind", "boss", "enemiesPerBattle", "unlockRequires"],
        "oneOf": [{"required": ["roster"]}, {"required": ["fromRoster"]}], "additionalProperties": False}
zones = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "zones.schema.json", "title": "Zones = locations: word pool, roster and boss, placed on graphs", "type": "object",
         "properties": {"_note": {"type": "string"}, "version": {"type": "string"}, "zones": {"type": "array", "items": zone, "minItems": 1}}, "required": ["zones"], "additionalProperties": False}
hook = {"type": "object", "properties": {"id": ID, "status": {"enum": ["hook", "final"]}, "type": {"enum": ["fetch", "kill", "talk", "delivery", "words", "miniboss"]}, "titleZh": {"type": "string"}, "titleEn": {"type": "string"},
        "giver": {"type": "string", "pattern": "^[a-z0-9_]+/[a-z0-9_]+$"}, "target": {"type": "object"}, "turnIn": {"type": "string"}, "rewardG": {"type": "number", "minimum": 0}, "rewardItem": {"type": ["string", "null"]},
        "scope": {"type": "object", "description": "kill counts: default realm-wide; optional graph or zone filter", "properties": {"realm": {"type": "integer"}, "graph": ID, "zone": ID}}},
        "required": ["id", "type", "titleEn", "giver", "target"], "additionalProperties": False}
quests = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "quests_world.schema.json", "title": "NPC quest hooks and quest items placed on the world graphs", "type": "object",
          "properties": {"_note": {"type": "string"}, "version": {"type": "string"}, "questHooks": {"type": "array", "items": hook},
                         "questItems": {"type": "array", "items": {"type": "object", "properties": {"id": ID, "zh": {"type": "string"}, "en": {"type": "string"}, "emoji": {"type": "string"}, "quest": ID}, "required": ["id", "en", "quest"], "additionalProperties": False}},
                         "speakers": {"type": "object"}}, "required": ["questHooks", "questItems"], "additionalProperties": False}
P01 = {"type": "number", "minimum": 0, "maximum": 1}
rules = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "world_rules.schema.json", "title": "Encounter and travel knobs (may merge into balance.json as 'world')", "type": "object", "properties": {
  "_note": {"type": "string"}, "version": {"type": "string"}, "encounterRate": {"type": "object", "patternProperties": {"^[0-3]$": P01}, "required": ["0", "1", "2", "3"], "additionalProperties": False},
  "depthStep": {"type": "number", "minimum": 0}, "maxRate": P01, "safe": {"type": "object"}, "clearedStepMult": P01, "zoneBattleBudget": {"type": "integer", "minimum": 1}, "budgetSpentMult": P01,
  "pityRolls": {"type": "integer", "minimum": 0}, "repel": {"type": "object", "properties": {"item": ID, "hops": {"type": "integer", "minimum": 1}}, "required": ["item", "hops"]},
  "walkSecPerHop": {"type": "number"}, "walkSecPerStep": {"type": "number"}, "eventSec": {"type": "object"}, "beelineBattleTarget": {"type": "number"},
  "beelineBattleRange": {"type": "array", "items": {"type": "number"}, "minItems": 2, "maxItems": 2}, "maxHopsToInn": {"type": "integer", "minimum": 1}, "innWarp": {"type": "object"}, "seed": {"type": "object"}},
  "required": ["encounterRate", "depthStep", "maxRate", "safe", "clearedStepMult", "zoneBattleBudget", "budgetSpentMult", "pityRolls", "maxHopsToInn"], "additionalProperties": False}
index = {"$schema": "https://json-schema.org/draft/2020-12/schema", "$id": B + "index.schema.json", "title": "World data index", "type": "object", "properties": {
  "_note": {"type": "string"}, "schema": {"const": "index/0.3"}, "version": {"type": "string"}, "start": REF("nodeRef"),
  "files": {"type": "object", "properties": {k: {"type": "string"} for k in ("rules", "zones", "quests", "layoutTargets")}, "required": ["rules", "zones", "quests"]},
  "renames": {"type": "object", "description": "old id -> new id for graphs/nodes/edges ('graph/node' keys) so old saves load", "additionalProperties": {"type": "string"}},
  "graphs": {"type": "array", "items": {"type": "object", "properties": {"id": ID, "kind": {"type": "string"}, "realm": {"type": ["integer", "null"]}, "dungeon": {"type": ["string", "null"]},
            "level": {"type": "integer"}, "status": {"type": "string"}, "nodes": {"type": "integer"}, "file": {"type": "string"}}, "required": ["id", "file"], "additionalProperties": False}}},
  "required": ["schema", "start", "files", "graphs"], "additionalProperties": False}
for name, s in (("common", common), ("graph", graph), ("zones", zones), ("quests_world", quests), ("world_rules", rules), ("index", index)):
    json.dump(s, open(f"{OUT}/{name}.schema.json", "w"), indent=1, ensure_ascii=False)
print('schemas written')
