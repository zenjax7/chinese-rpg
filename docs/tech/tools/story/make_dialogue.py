"""Writes data/dialogue/sc_*.json (scene/0.2). zhTrad is generated with OpenCC s2tw. Run with /tmp/storyenv/bin/python."""
import json, re, os
from opencc import OpenCC
s2t = OpenCC("s2tw")
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from _paths import P   # repo-relative (see _paths.py)
OUT = os.path.dirname(P("data/dialogue/sc_r1_opening.json"))
TOK = re.compile(r"\{(C\d{3,4})\}")

def L(id, speaker, en, side=None, expr="neutral", zh=None, zhId=None, **kw):
    d = {"id": id, "speaker": speaker}
    if side: d["side"] = side
    d["expr"] = expr; d["en"] = en
    if zh: d["zh"] = zh; d["zhTrad"] = s2t.convert(zh)
    if zhId: d["zhId"] = zhId
    toks = list(dict.fromkeys(TOK.findall(en) + ([zhId] if zhId else [])))
    if toks: d["tokens"] = toks
    d["vo"] = None
    d.update(kw)
    return d

def C(id, en, **kw):
    d = {"id": id, "en": en}
    t = TOK.findall(en)
    if t: d["tokens"] = list(dict.fromkeys(t))
    d.update(kw); return d

def scene(**s):
    s = {"schema": "scene/0.2", **s}
    words = []
    for l in s["lines"]:
        words += l.get("tokens", [])
        for c in l.get("choices", []): words += c.get("tokens", [])
    s["words"] = list(dict.fromkeys(words))
    order = ["schema", "id", "title", "realm", "zone", "density", "trigger", "background", "music", "once", "slots", "teaches", "words", "lines", "onEnd"]
    s = {k: s[k] for k in order if k in s}
    json.dump(s, open(f"{OUT}/{s['id']}.json", "w"), ensure_ascii=False, indent=1)
    return s

SCENES = []

# ---------------- Realm 1: opening ----------------
SCENES.append(scene(
 id="sc_r1_opening", title="A birthday egg", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "firstEnter", "replaces": "village.1 (plays before meadow_intro)"},
 background="bg_village_morning", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "R1": {"char": "granny_bai", "expr": "happy"}, "R2": {"char": "xiaolong", "expr": "neutral"}},
 teaches=["C001", "C007"],
 lines=[
  L("l1", "narrator", "Little Hill Village. Today is {hero}'s birthday.", side="none"),
  L("l2", "granny_bai", "Happy birthday, {hero}! I found this by the old well this morning. It's warm... and it's wiggling.", "R1", "happy"),
  L("l3", "narrator", "Crack... crack... POP! A tiny golden dragon tumbles out of the egg.", side="none"),
  L("l4", "xiaolong", "{C001}!", "R2", "surprised"),
  L("l5", "hero", "It... talked?!", "L1", "surprised"),
  L("l6", "granny_bai", "A golden dragon! I haven't seen one of those since... well. Since I was young and brave and had knees that worked.", "R1", "surprised"),
  L("l7", "xiaolong", "{C001}! {C001}!", "R2", "happy"),
  L("l8", "granny_bai", "One word is all he knows. Words are precious, little one. Lately the creatures out in the meadow have been forgetting theirs.", "R1", "thinking"),
  L("l9", "granny_bai", "A grey fog rolled over the hills. Now the rabbits are grumpy and the crows won't stop shouting.", "R1", "worried"),
  L("l10", "hero", "What should I say to the little dragon?", "L1", "thinking", choices=[
     C("c1", "{C001}!", goto="l11", correct=True, setFlags=["r1_said_hello"]),
     C("c2", "Wave and say nothing.", goto="l12")]),
  L("l11", "xiaolong", "(He spins in a circle and hugs your leg.)", "R2", "happy", goto="l13"),
  L("l12", "xiaolong", "(He tilts his head, waiting... then hugs your leg anyway.)", "R2", "sad"),
  L("l13", "granny_bai", "When someone gives you a present, we say {C007}. Go on, try it!", "R1", "happy"),
  L("l14", "hero", "{C007}, Granny Bai!", "L1", "happy"),
  L("l15", "granny_bai", "Ha! Good manners. He looks like a Xiaolong to me. Little Dragon. Now take my old stick... and this hungry fellow.", "R1", "happy"),
  L("l16", "xiaolong", "(He chews the stick. Then he chews your sleeve.)", "R2", "happy"),
  L("l17", "granny_bai", "Farmer Li down the road needs help. Talk kindly, answer bravely, and the fog will clear. Off you go!", "R1", "neutral", end=True)],
 onEnd=[{"setFlag": "met_xiaolong"}, {"joinParty": "xiaolong"}, {"setFlag": "met_granny_bai"}]))

# ---------------- Realm 1: village banter after Clover Hills ----------------
SCENES.append(scene(
 id="sc_r1_village_banter", title="Counting rabbits", realm=1, zone="clover_hills", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "enter", "cond": {"bossDefeated": "clover_hills"}},
 background="bg_village_afternoon", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "xiaoming", "expr": "happy"}, "R2": {"char": "farmer_li", "expr": "neutral"}},
 lines=[
  L("l1", "xiaoming", "{hero}! You beat the wolf in Clover Hills? Everyone is talking about it!", "R1", "happy"),
  L("l2", "xiaolong", "{C043}! {C043}!", "L2", "happy"),
  L("l3", "hero", "Whoa, Xiaolong. You learned a new word!", "L1", "surprised"),
  L("l4", "farmer_li", "The fog is thinner now. Three rabbits came back to my field this morning. Watch, I'll count them.", "R2", "happy"),
  L("l5", "farmer_li", "One... two... {C070}!", "R2", "thinking"),
  L("l6", "xiaoming", "{C046}!", "R1", "surprised"),
  L("l7", "hero", "What comes after two?", "L1", "thinking", choices=[
     C("c1", "{C068}", goto="l8", correct=True, setFlags=["r1_counted_rabbits"]),
     C("c2", "{C071}", goto="l9")]),
  L("l8", "farmer_li", "Ha! Yes, that's the one. My brain is still a little foggy.", "R2", "happy", goto="l10"),
  L("l9", "xiaoming", "Hmm, that's more rabbits than we have! It's three. Count with me.", "R1", "happy"),
  L("l10", "xiaolong", "(He counts on his claws, gets to three, then eats a carrot.)", "L2", "happy"),
  L("l11", "xiaoming", "There's a Horned Rabbit with a shiny crown in the Warren now. A red imp put it on his head!", "R1", "worried"),
  L("l12", "farmer_li", "Be careful in those tunnels, little hero.", "R2", "worried", end=True)],
 onEnd=[{"setFlag": "heard_about_crown"}]))

# ---------------- Realm 7: the Wind Dragon's truth (mid-game twist) ----------------
SCENES.append(scene(
 id="sc_r7_wind_dragon_truth", title="Uncle Wind remembers", realm=7, zone="windy_cliffs", density="D5",
 trigger={"graph": "realm_7", "node": "boss_1", "on": "clear", "zone": "windy_cliffs", "nodeKind": "boss",
          "cond": {"bossDefeated": "windy_cliffs"}},
 background="bg_windy_cliffs_dusk", music="sad_wind", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "neutral"}, "R1": {"char": "wind_dragon", "expr": "sad"}},
 lines=[
  L("l1", "narrator", "The wind stops howling. The great blue dragon lands on the cliff edge... and bows its head.", side="none"),
  L("l2", "wind_dragon", "Sorry. The fog was inside my head. I didn't know what I was doing.", "R1", "sad", zh="对不起。我不知道我在做什么。"),
  L("l3", "hero", "{C010}. Are you okay now?", "L1", "worried"),
  L("l4", "wind_dragon", "Wait... that little golden one. Come closer, small one. Let me see your scales.", "R1", "surprised"),
  L("l5", "xiaolong", "Who are you?", "L2", "surprised", zh="你是谁？", zhId="C599"),
  L("l6", "wind_dragon", "Your mother is my friend. Golden scales, just like yours. I'd know them anywhere.", "R1", "happy", zh="你的妈妈是我的朋友。"),
  L("l7", "xiaolong", "Mom? Where is she?", "L2", "surprised", zh="妈妈？她在哪儿？"),
  L("l8", "wind_dragon", "She is very far away. The Demon King's fog took her, and they bound her with a chain of shadow.", "R1", "worried", zh="她在很远的地方。"),
  L("l9", "wind_dragon", "She hid her last egg in a quiet village, so the fog would never find it. I tried to stop them. Then the fog found me too.", "R1", "sad"),
  L("l10", "hero", "What do we do?", "L1", "thinking", choices=[
     C("c1", "{C617}", goto="l11", setFlags=["r7_lets_go"]),
     C("c2", "{C903}", goto="l11b")]),
  L("l11b", "wind_dragon", "Far. Very far. But you have many friends now.", "R1", "happy", goto="l11"),
  L("l11", "wind_dragon", "Go north. Keep going straight: past the Griffin Peaks, past the Ogre Colosseum, all the way to the Demon King's castle.", "R1", "neutral", zh="往北走。一直走。"),
  L("l12", "xiaolong", "I want to find Mom!", "L2", "angry", zh="我要找妈妈！"),
  L("l13", "wind_dragon", "Brave, like her. When you reach her, call my name into the wind and I will come.", "R1", "happy"),
  L("l14", "narrator", "Xiaolong stares north for a long time. Then he eats three snacks, very bravely.", side="none", end=True)],
 onEnd=[{"setFlag": "knows_mom_captured"}, {"setFlag": "wind_dragon_promise"}]))

# ---------------- Realm 9: before the Demon King ----------------
SCENES.append(scene(
 id="sc_r9_before_demon_king", title="The last door", realm=9, zone="throne_hall", density="D6",
 trigger={"graph": "demon_castle_5", "node": "boss_9", "on": "enter", "zone": "throne_hall", "nodeKind": "boss",
          "cond": {"all": [{"flag": "pact_elves"}, {"flag": "pact_dwarves"}, {"flag": "pact_beastfolk"}, {"flag": "pact_dragons"}]}},
 background="bg_throne_doors", music="final_resolve", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "neutral"}, "R1": {"char": "general_mo", "expr": "angry"}, "R2": {"char": "fei", "expr": "neutral"}},
 lines=[
  L("l1", "narrator", "The great doors creak open. General Mo stands before the throne, sword drawn.", side="none"),
  L("l2", "general_mo", "Halt. None of you may go in.", "R1", "angry", zh="你们不可以进去。"),
  L("l3", "hero", "We must unite! All of us. Look behind me.", "L1", "angry", zh="我们必须团结起来！", zhId="C1038"),
  L("l4", "narrator", "Behind you stand elves, dwarves, beastfolk and dragons: a friend from every realm.", side="none"),
  L("l5", "fei", "We're friends, so we came together.", "R2", "happy", zh="我们是朋友，所以我们一起来了。"),
  L("l6", "general_mo", "Why are you not afraid?", "R1", "thinking", zh="你们为什么不怕？"),
  L("l7", "xiaolong", "Because we have courage, and we trust our partners.", "L2", "happy", zh="因为我们有勇气，而且我们信任伙伴。"),
  L("l8", "general_mo", "At the Colosseum you fought fairly. A knight serves his king... but a knight also chooses.", "R1", "sad"),
  L("l9", "general_mo", "I surrender. Please, go in.", "R1", "neutral", zh="我投降。请进。", setFlags=["mo_stepped_aside"]),
  L("l10", "hero", "What do you say to General Mo?", "L1", "thinking", choices=[
     C("c1", "{C007}", goto="l11"),
     C("c2", "{C1023}? Come with us!", goto="l11b", setFlags=["asked_mo_partner"])]),
  L("l11", "general_mo", "Go. I will guard this door so that no one runs away. Not even him.", "R1", "neutral", goto="l12"),
  L("l11b", "general_mo", "Partner... Hm. Perhaps, after. For now I guard this door.", "R1", "happy"),
  L("l12", "granny_bai", "One last time, my dears. Are you ready?", "R1", "happy", zh="最后一次了。准备好了吗？",
    swap={"slot": "R1", "char": "granny_bai", "expr": "happy"}),
  L("l13", "hero", "{C576}", "L1", "angry"),
  L("l14", "narrator", "The Harmony Bell hums in your pack. Far above, the Demon King rises from his throne.", side="none", end=True)],
 onEnd=[{"setFlag": "final_battle_ready"}, {"startBattle": "boss_9"}]))

# ---------------- Quest scene pair: q1_hoe ----------------
SCENES.append(scene(
 id="sc_q1_hoe_offer", title="The lost hoe (offer)", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "m_farm", "on": "questOffer", "cond": {"not": {"questActive": "q1_hoe"}}},
 background="bg_farm", music="village_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "neutral"}, "R1": {"char": "farmer_li", "expr": "worried"}},
 lines=[
  L("l1", "farmer_li", "Oh! Hello there, little hero. And... is that a dragon?", "R1", "surprised"),
  L("l2", "farmer_li", "My hoe is gone! I put it down, the fog rolled in, and now... {C037}?", "R1", "worried"),
  L("l3", "xiaolong", "(He sniffs the air and points toward the old well.)", "L2", "thinking"),
  L("l4", "farmer_li", "Will you look for it? I'll pay you, of course.", "R1", "neutral", choices=[
     C("c1", "Yes, I'll find it!", goto="l5", setFlags=["accept_q1_hoe"]),
     C("c2", "Not now.", goto="l6")]),
  L("l5", "farmer_li", "{C007}! Bring it back here when you find it.", "R1", "happy", end=True),
  L("l6", "farmer_li", "All right. I'll be right here, worrying.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q1_hoe"}, "acceptQuest": "q1_hoe"}]))

SCENES.append(scene(
 id="sc_q1_hoe_thanks", title="The lost hoe (turn-in)", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "m_farm", "on": "questTurnIn", "cond": {"questReady": "q1_hoe"}, "replaces": "farmer_thanks"},
 background="bg_farm", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "farmer_li", "expr": "happy"}},
 lines=[
  L("l1", "farmer_li", "My hoe! It was down {C595}, in the old well?", "R1", "surprised"),
  L("l2", "farmer_li", "{C007}, little hero! Here, this is for you.", "R1", "happy"),
  L("l3", "hero", "What do you say back?", "L1", "thinking", choices=[
     C("c1", "{C008}", goto="l4", correct=True),
     C("c2", "{C005}", goto="l5")]),
  L("l4", "farmer_li", "Ha! Such good manners.", "R1", "happy", end=True),
  L("l5", "farmer_li", "Leaving already? Don't forget: when someone says thank you, you can say you're welcome.", "R1", "happy", end=True)],
 onEnd=[{"completeQuest": "q1_hoe"}]))

if __name__ == "__main__":
    for s in SCENES: print(s["id"], len(s["lines"]), "lines", s["words"])
