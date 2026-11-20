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

# ---------------- Realm 1: opening (Jack 2026-11-20: egg has a history; no hatch, no joinParty) ----------------
SCENES.append(scene(
 id="sc_r1_opening", title="Too quiet", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "firstEnter", "replaces": "village.1 (plays before meadow_intro)"},
 background="bg_village_morning", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "R1": {"char": "granny_bai", "expr": "worried"}},
 teaches=["C035"],
 lines=[
  L("l1", "narrator", "Little Hill Village. Dawn, and the fields are too quiet.", side="none"),
  L("l2", "granny_bai", "{hero}. Come here. The birds did not sing this morning.", "R1", "worried"),
  L("l3", "granny_bai", "I have kept this egg since the last war. It was cold for years. Today it is warm again.", "R1", "thinking"),
  L("l4", "hero", "{C035} is happening?", "L1", "surprised"),
  L("l5", "granny_bai", "A grey fog is on the hills. The creatures are forgetting their words.", "R1", "worried"),
  L("l6", "granny_bai", "Talk to Farmer Li in the field, and to Grandpa Wang here in the village. Then meet me at the old well.", "R1", "neutral"),
  L("l7", "hero", "I'll go. Is the egg safe {C594}?", "L1", "thinking"),
  L("l8", "granny_bai", "I will wait with it. Go carefully.", "R1", "neutral", end=True)],
 onEnd=[{"setFlag": "met_granny_bai"}]))

# ---------------- Realm 1: hatch (end of q1_quiet_morning; 小龙 joins here) ----------------
SCENES.append(scene(
 id="sc_r1_hatch", title="The egg hatches", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "m_well", "on": "questTurnIn", "cond": {"questReady": "q1_quiet_morning"}},
 background="bg_well", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "surprised"}, "R1": {"char": "granny_bai", "expr": "worried"}, "R2": {"char": "xiaolong", "expr": "neutral"}},
 teaches=["C001", "C007"],
 lines=[
  L("l1", "narrator", "The old well. This is where Granny Bai first hid the egg. The fog has reached the village.", side="none"),
  L("l2", "granny_bai", "You're back. The egg — it's shaking!", "R1", "surprised"),
  L("l3", "narrator", "Crack... crack... POP! A tiny golden dragon tumbles out.", side="none"),
  L("l4", "xiaolong", "{C001}!", "R2", "surprised"),
  L("l5", "hero", "It... talked?!", "L1", "surprised"),
  L("l6", "granny_bai", "A golden dragon. The last free one, if I am right. The Demon King is hunting him.", "R1", "worried"),
  L("l7", "granny_bai", "If he stays, the village is next. I am too old to walk the road.", "R1", "sad"),
  L("l8", "hero", "What do you say to him?", "L1", "thinking", choices=[
     C("c1", "{C001}!", goto="l9", correct=True, setFlags=["r1_said_hello"]),
     C("c2", "Wave and say nothing.", goto="l10")]),
  L("l9", "xiaolong", "(He spins in a circle and hugs your leg.)", "R2", "happy", goto="l11"),
  L("l10", "xiaolong", "(He tilts his head, waiting... then hugs your leg anyway.)", "R2", "sad"),
  L("l11", "granny_bai", "When someone is kind, we say {C007}. Take him. Follow the old Bell Road. Ring the Bell before home goes silent.", "R1", "happy"),
  L("l12", "hero", "Thank you, Granny Bai.", "L1", "happy"),
  L("l13", "granny_bai", "His name is 小龙. Little Dragon. The King still wears a fog crown. Off you go.", "R1", "neutral", end=True)],
 onEnd=[{"setFlag": "met_xiaolong"}, {"setFlag": "xiaolong_form_hatch"}, {"joinParty": "xiaolong"}]))

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
 slots={"L1": {"char": "hero", "expr": "neutral"}, "R1": {"char": "farmer_li", "expr": "worried"}},
 lines=[
  L("l1", "farmer_li", "Oh! Hello there, little hero. The field is too quiet today.", "R1", "surprised"),
  L("l2", "farmer_li", "My hoe is gone! I put it down, the fog rolled in, and now... {C037}?", "R1", "worried"),
  L("l3", "farmer_li", "I saw a glint in the old well — the same well where Granny Bai once hid the egg.", "R1", "thinking"),
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
  L("l1", "farmer_li", "My hoe! It was down {C595}, in the old well? That is where Granny Bai hid the egg.", "R1", "surprised"),
  L("l2", "farmer_li", "{C007}, little hero! Here, this is for you.", "R1", "happy"),
  L("l3", "hero", "What do you say back?", "L1", "thinking", choices=[
     C("c1", "{C008}", goto="l4", correct=True),
     C("c2", "{C005}", goto="l5")]),
  L("l4", "farmer_li", "Ha! Such good manners.", "R1", "happy", end=True),
  L("l5", "farmer_li", "Leaving already? Don't forget: when someone says thank you, you can say you're welcome.", "R1", "happy", end=True)],
 onEnd=[{"completeQuest": "q1_hoe"}]))

# ---------------- Quest step scene: q9_second_wind s2 (Granny Bai's badge, demon_castle_2/treasure_1) ----------------
SCENES.append(scene(
 id="sc_q9_second_wind_badge", title="Granny Bai's old badge", realm=9, zone="demon_king_s_gate", density="D6",
 trigger={"graph": "demon_castle_2", "node": "treasure_1", "on": "enter", "zone": "demon_king_s_gate", "nodeKind": "chest",
          "cond": {"questActive": "q9_second_wind"}},
 background="bg_castle_storeroom", music="gentle_memory", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "surprised"}},
 lines=[
  L("l1", "narrator", "Under a pile of rusty keys, something small and silver glints: a badge shaped like a bell.", side="none"),
  L("l2", "xiaolong", "This is Granny Bai's!", "L2", "surprised", zh="这是白奶奶的！"),
  L("l3", "hero", "How can you tell?", "L1", "surprised"),
  L("l4", "xiaolong", "Her name is on it. And a tiny drawing of her... with a lot more hair.", "L2", "happy", zh="上边有她的名字。"),
  L("l5", "narrator", "On the back, in small scratchy letters, someone carved a promise.", side="none"),
  L("l6", "xiaolong", "Even if it's hard, don't give up.", "L2", "thinking", zh="就算很难，也不要放弃。"),
  L("l7", "hero", "She used to be a hero. A real one.", "L1", "thinking", zh="她以前是英雄。"),
  L("l8", "xiaolong", "She still is! And she makes the best tea in nine realms.", "L2", "happy", zh="她现在也是！"),
  L("l9", "hero", "What do you do with the badge?", "L1", "neutral", choices=[
     C("c1", "Read the promise out loud: {C565}", goto="l10", correct=True),
     C("c2", "Hide it and keep it a secret.", goto="l9b")]),
  L("l9b", "xiaolong", "No secrets from Granny! ...But we can make it a surprise.", "L2", "happy"),
  L("l10", "xiaolong", "We must give it back to her!", "L2", "happy", zh="我们一定要给她！"),
  L("l11", "narrator", "You tuck the badge safely into your pack. It feels warm, like a cup of Granny Bai's tea.", side="none", end=True)]))


# ---------------- Story rework (Jack 2026-11-20): new offer/thanks + retone Bubble and jelly ----------------
SCENES.append(scene(
 id="sc_q1_quiet_morning_offer", title="The Quiet Morning (offer)", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "questOffer", "cond": {"not": {"questActive": "q1_quiet_morning"}}},
 background="bg_village_morning", music="village_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "R1": {"char": "granny_bai", "expr": "worried"}},
 lines=[
  L("l1", "granny_bai", "The village woke too quiet. I need you to learn {C035} is happening.", "R1", "worried"),
  L("l2", "granny_bai", "Talk to Farmer Li, and to Grandpa Wang {C594} in the village. Then meet me at the old well.", "R1", "neutral"),
  L("l3", "hero", "I'll go now.", "L1", "neutral", choices=[
     C("c1", "Yes, I'll ask around.", goto="l4", setFlags=["accept_q1_quiet_morning"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "granny_bai", "Go carefully. I will stay with the egg.", "R1", "neutral", end=True),
  L("l5", "granny_bai", "All right. I will be right here.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q1_quiet_morning"}, "acceptQuest": "q1_quiet_morning"}]))

SCENES.append(scene(
 id="sc_q1_quiet_morning_thanks", title="The Quiet Morning (turn-in)", realm=1, zone="meadow", density="D1",
 trigger={"graph": "realm_1", "node": "m_well", "on": "questTurnIn", "cond": {"questReady": "q1_quiet_morning"}},
 background="bg_well", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "granny_bai", "expr": "neutral"}},
 lines=[
  L("l1", "granny_bai", "He is yours to protect now. The Bell Road starts east — after you deal with the King.", "R1", "neutral"),
  L("l2", "xiaolong", "{C001}!", "L2", "happy"),
  L("l3", "hero", "{C007}, Granny Bai.", "L1", "happy"),
  L("l4", "granny_bai", "Go carefully, both of you.", "R1", "happy", end=True)],
 onEnd=[{"completeQuest": "q1_quiet_morning"}]))

SCENES.append(scene(
 id="sc_q1_shatter_crown_offer", title="Shatter the Fog Crown (offer)", realm=1, zone="warren", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "questOffer", "cond": {"not": {"questActive": "q1_shatter_crown"}}},
 background="bg_village_morning", music="village_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "granny_bai", "expr": "worried"}},
 lines=[
  L("l1", "granny_bai", "The Horned Rabbit King wears a fog crown. That is the fog's hold on this land.", "R1", "worried"),
  L("l2", "granny_bai", "{C077}. You have to calm him — he is still a rabbit under that crown.", "R1", "neutral"),
  L("l3", "hero", "We'll go to the throne.", "L1", "brave", choices=[
     C("c1", "We'll help him.", goto="l4", setFlags=["accept_q1_shatter_crown"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "granny_bai", "Come back when the {C092} king is himself again.", "R1", "neutral", end=True),
  L("l5", "granny_bai", "The road stays shut until he is calm.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q1_shatter_crown"}, "acceptQuest": "q1_shatter_crown"}]))

SCENES.append(scene(
 id="sc_q1_shatter_crown_thanks", title="Shatter the Fog Crown (turn-in)", realm=1, zone="warren", density="D1",
 trigger={"graph": "realm_1", "node": "village", "on": "questTurnIn", "cond": {"questReady": "q1_shatter_crown"}},
 background="bg_village_afternoon", music="village_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "granny_bai", "expr": "happy"}},
 lines=[
  L("l1", "granny_bai", "The crown shattered. A red imp fled east, toward Honey Town.", "R1", "thinking"),
  L("l2", "granny_bai", "If 小龙 stays, the village is next. You are his {C282} now.", "R1", "neutral"),
  L("l3", "xiaolong", "{C090}!", "L2", "happy"),
  L("l4", "granny_bai", "The Bell Road starts east. Honey Town is the next stretch. Go.", "R1", "happy", end=True)],
 onEnd=[{"completeQuest": "q1_shatter_crown"}]))

SCENES.append(scene(
 id="sc_q2_fei_boast_offer", title="Fei's Boast (offer)", realm=2, zone="forest", density="D2",
 trigger={"graph": "realm_2", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q2_fei_boast"}}},
 background="bg_honey_town", music="town_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "neutral"}, "R1": {"char": "fei", "expr": "happy"}},
 lines=[
  L("l1", "fei", "{C001}! I am Fei. I will save Honey Town myself!", "R1", "happy"),
  L("l2", "fei", "The {C115} is ours. I don't need help.", "R1", "brave"),
  L("l3", "hero", "The east road is shut. Maybe we should go together.", "L1", "thinking", choices=[
     C("c1", "Wait — let's talk first.", goto="l4", setFlags=["accept_q2_fei_boast"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "fei", "Talk is slow. I'll show you at the Crossroads!", "R1", "happy", end=True),
  L("l5", "fei", "Hmph. I'll go anyway.", "R1", "angry", end=True)],
 onEnd=[{"if": {"flag": "accept_q2_fei_boast"}, "acceptQuest": "q2_fei_boast"}]))

SCENES.append(scene(
 id="sc_q2_fei_boast_thanks", title="Fei's Boast (turn-in)", realm=2, zone="forest", density="D2",
 trigger={"graph": "realm_2", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q2_fei_boast"}},
 background="bg_honey_town", music="town_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "worried"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "fei", "expr": "happy"}},
 lines=[
  L("l1", "fei", "See? I can do this. The Crossroads will be easy.", "R1", "happy"),
  L("l2", "xiaolong", "(He sniffs. Fei already smells like fog.)", "L2", "worried"),
  L("l3", "fei", "Don't be {C121} for glory — leave some for me!", "R1", "happy"),
  L("l4", "narrator", "He runs ahead, toward the Crossroads, before you can stop him.", side="none", end=True)],
 onEnd=[{"completeQuest": "q2_fei_boast"}]))

SCENES.append(scene(
 id="sc_q2_road_blocked_offer", title="The Road Is Blocked (offer)", realm=2, zone="forest", density="D2",
 trigger={"graph": "realm_2", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q2_road_blocked"}}},
 background="bg_honey_town", music="town_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "granny_mi", "expr": "worried"}},
 lines=[
  L("l1", "granny_mi", "The east road is shut. The hive has gone mad.", "R1", "worried"),
  L("l2", "granny_mi", "No one can take {C115} to the next land. Something is wrong with the Queen.", "R1", "sad"),
  L("l3", "hero", "We'll walk the hive road and look.", "L1", "neutral", choices=[
     C("c1", "We'll find out why.", goto="l4", setFlags=["accept_q2_road_blocked"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "granny_mi", "Ask Yezi if you reach the hive. Go carefully.", "R1", "neutral", end=True),
  L("l5", "granny_mi", "The Bell Road stays closed until the hive is calm.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q2_road_blocked"}, "acceptQuest": "q2_road_blocked"}]))

SCENES.append(scene(
 id="sc_q2_road_blocked_thanks", title="The Road Is Blocked (turn-in)", realm=2, zone="great_hive", density="D2",
 trigger={"graph": "great_hive_1", "node": "npc_1", "on": "questTurnIn", "cond": {"questReady": "q2_road_blocked"}},
 background="bg_hive", music="hive_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "yezi", "expr": "worried"}},
 lines=[
  L("l1", "yezi", "You found the hive. Good. The Queen's jelly is gone.", "R1", "worried"),
  L("l2", "yezi", "Without it the bees rage, and the {C119} road stays shut.", "R1", "sad"),
  L("l3", "xiaolong", "(He sniffs a red feather on the floor.)", "L2", "thinking"),
  L("l4", "yezi", "Someone stole it. Help me get it back, or no one leaves Honey Town.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q2_road_blocked"}]))

SCENES.append(scene(
 id="sc_q2_bubble_lesson_offer", title="Granny Bai's Bubble Lesson (offer)", realm=2, zone="forest", density="D2",
 trigger={"graph": "realm_2", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q2_bubble_lesson"}}},
 background="bg_honey_town", music="town_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "granny_bai", "expr": "neutral"}},
 lines=[
  L("l1", "granny_bai", "I wrote ahead. Honey Town sits on the old Bell Road.", "R1", "neutral"),
  L("l2", "granny_bai", "The Queen may remember our pact. First, a lesson — and three soap-flowers. {C642}.", "R1", "happy"),
  L("l3", "xiaolong", "They smell {C119}!", "L2", "happy"),
  L("l4", "hero", "We'll gather them and practice the forest words.", "L1", "happy", choices=[
     C("c1", "We'll start now.", goto="l5", setFlags=["accept_q2_bubble_lesson"]),
     C("c2", "Not now.", goto="l6")]),
  L("l5", "granny_bai", "Bring the flowers here. Then I will teach you your first spell.", "R1", "happy", end=True),
  L("l6", "granny_bai", "The road can wait a little. I will be here.", "R1", "neutral", end=True)],
 onEnd=[{"if": {"flag": "accept_q2_bubble_lesson"}, "acceptQuest": "q2_bubble_lesson"}]))

SCENES.append(scene(
 id="sc_q2_bubble_lesson_thanks", title="Granny Bai's Bubble Lesson (turn-in)", realm=2, zone="forest", density="D2",
 trigger={"graph": "realm_2", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q2_bubble_lesson"}},
 background="bg_honey_town", music="town_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "granny_bai", "expr": "happy"}},
 lines=[
  L("l1", "granny_bai", "Good. Soap-flowers and eight words. Now watch: a bubble, like {C107}.", "R1", "happy"),
  L("l2", "xiaolong", "Can I {C094} it?", "L2", "hungry"),
  L("l3", "granny_bai", "No drinking the spell. Honey Town's shelf will show my lesson, not a price.", "R1", "happy"),
  L("l4", "granny_bai", "Use it kindly. The Queen is the next door on the Bell Road.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q2_bubble_lesson"}]))

SCENES.append(scene(
 id="sc_q2_royal_jelly_offer", title="The Queen's Stolen Jelly (offer)", realm=2, zone="great_hive", density="D2",
 trigger={"graph": "great_hive_1", "node": "npc_1", "on": "questOffer", "cond": {"not": {"questActive": "q2_royal_jelly"}}},
 background="bg_hive", music="hive_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "yezi", "expr": "worried"}},
 lines=[
  L("l1", "yezi", "Pipi stole the Queen's jelly. He used it to fog the hive and close the Bell Road.", "R1", "angry"),
  L("l2", "yezi", "Find the jar. The {C115} in it is the Queen's. Without it, no one passes east.", "R1", "worried"),
  L("l3", "hero", "We'll bring it back.", "L1", "brave", choices=[
     C("c1", "We'll find Pipi's stash.", goto="l4", setFlags=["accept_q2_royal_jelly"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "yezi", "The guards are angry. Go carefully.", "R1", "neutral", end=True),
  L("l5", "yezi", "The road stays shut until the Queen has her jelly.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q2_royal_jelly"}, "acceptQuest": "q2_royal_jelly"}]))

SCENES.append(scene(
 id="sc_q2_royal_jelly_thanks", title="The Queen's Stolen Jelly (turn-in)", realm=2, zone="great_hive", density="D2",
 trigger={"graph": "great_hive_1", "node": "npc_1", "on": "questTurnIn", "cond": {"questReady": "q2_royal_jelly"}},
 background="bg_hive", music="hive_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "yezi", "expr": "happy"}},
 lines=[
  L("l1", "yezi", "The Queen has her jelly. The fog in the hive is lifting.", "R1", "happy"),
  L("l2", "yezi", "She remembers the Bell. She named the next stretch: the Crossroads.", "R1", "thinking"),
  L("l3", "yezi", "And this is Heal. Use it when a {C282} falls.", "R1", "happy"),
  L("l4", "yezi", "The east road is open. Walk it while the Queen still remembers you.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q2_royal_jelly"}]))


SCENES.append(scene(
 id="sc_q3_fog_jar_offer", title="Fog in a Jar (offer)", realm=3, zone="crossroads_highway", density="D3",
 trigger={"graph": "realm_3", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q3_fog_jar"}}},
 background="bg_market", music="market_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "boss_qian", "expr": "worried"}},
 lines=[
  L("l1", "boss_qian", "The market is shut. Someone is selling fog in a jar at a stall.", "R1", "angry", zh="商店关了。"),
  L("l2", "boss_qian", "They shout {C166} as if fog were a normal {C172}.", "R1", "worried"),
  L("l3", "hero", "We'll take the jar.", "L1", "brave", choices=[
     C("c1", "We'll stop the sale.", goto="l4", setFlags=["accept_q3_fog_jar"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "boss_qian", "Bring it here. Then I can open the {C171} again.", "R1", "neutral", end=True),
  L("l5", "boss_qian", "The cave road stays closed until the jar is gone.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q3_fog_jar"}, "acceptQuest": "q3_fog_jar"}]))

SCENES.append(scene(
 id="sc_q3_fog_jar_thanks", title="Fog in a Jar (turn-in)", realm=3, zone="crossroads_highway", density="D3",
 trigger={"graph": "realm_3", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q3_fog_jar"}},
 background="bg_market", music="market_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "boss_qian", "expr": "happy"}},
 lines=[
  L("l1", "boss_qian", "The jar is ours. Pipi ran. The market can {C162} and sell again.", "R1", "happy", zh="可以买了。"),
  L("l2", "xiaolong", "(He sneezes. The last of the stall-fog fades.)", "L2", "happy"),
  L("l3", "boss_qian", "The cave road is open. Walk it before the fog comes back.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q3_fog_jar"}]))

SCENES.append(scene(
 id="sc_q5_time_pearl_offer", title="The Time Pearl (offer)", realm=5, zone="hydra_s_lair", density="D4",
 trigger={"graph": "realm_5", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q5_time_pearl"}}},
 background="bg_marsh", music="swamp_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "grandpa_turtle", "expr": "worried"}},
 lines=[
  L("l1", "grandpa_turtle", "The swamp is stuck in one evening. Mist fed my Time Pearl to the Hydra.", "R1", "sad", zh="时间？"),
  L("l2", "grandpa_turtle", "Without it, {C317} does not move, and no one can cross.", "R1", "worried"),
  L("l3", "hero", "We'll go to the lair.", "L1", "brave", choices=[
     C("c1", "We'll bring the pearl back.", goto="l4", setFlags=["accept_q5_time_pearl"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "grandpa_turtle", "{C820} reach the Hydra, then take the pearl. Come back to me.", "R1", "neutral", end=True),
  L("l5", "grandpa_turtle", "Morning will not return until the pearl does.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q5_time_pearl"}, "acceptQuest": "q5_time_pearl"}]))

SCENES.append(scene(
 id="sc_q5_time_pearl_thanks", title="The Time Pearl (turn-in)", realm=5, zone="hydra_s_lair", density="D4",
 trigger={"graph": "realm_5", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q5_time_pearl"}},
 background="bg_marsh", music="swamp_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "grandpa_turtle", "expr": "happy"}},
 lines=[
  L("l1", "grandpa_turtle", "The pearl is home. Morning is {C324} coming back.", "R1", "happy", zh="已经早上了。"),
  L("l2", "grandpa_turtle", "{C539} the swamp was still, we can walk again.", "R1", "thinking"),
  L("l3", "grandpa_turtle", "The path to the sick lands is open. Go while the light lasts.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q5_time_pearl"}]))

SCENES.append(scene(
 id="sc_q6_cure_mayor_offer", title="Cure the Mayor (offer)", realm=6, zone="gloomy_village", density="D4",
 trigger={"graph": "realm_6", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q6_cure_mayor"}}},
 background="bg_gloomy_village", music="lands_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "worried"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "dr_an", "expr": "worried"}},
 lines=[
  L("l1", "dr_an", "The mayor is sick with fog, not dead. {C386}", "R1", "worried", zh="你怎么了？"),
  L("l2", "dr_an", "I am the {C399}. If we do not cure him, the sickness will spread.", "R1", "sad"),
  L("l3", "hero", "We'll calm him and bring him back.", "L1", "brave", choices=[
     C("c1", "We'll help the mayor.", goto="l4", setFlags=["accept_q6_cure_mayor"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "dr_an", "Take this {C400} if you need it. Come back when he is himself.", "R1", "neutral", end=True),
  L("l5", "dr_an", "The Village Key stays with a sick mayor. The road stays shut.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q6_cure_mayor"}, "acceptQuest": "q6_cure_mayor"}]))

SCENES.append(scene(
 id="sc_q6_cure_mayor_thanks", title="Cure the Mayor (turn-in)", realm=6, zone="gloomy_village", density="D4",
 trigger={"graph": "realm_6", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q6_cure_mayor"}},
 background="bg_gloomy_village", music="lands_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "dr_an", "expr": "happy"}},
 lines=[
  L("l1", "dr_an", "He is himself again. {C385}", "R1", "happy", zh="你没事吧？"),
  L("l2", "dr_an", "The Village Key is yours. The sickness came from the graveyard — a clue, not a closing of the road.", "R1", "thinking"),
  L("l3", "dr_an", "Go on. Don't let the fog outrun you.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q6_cure_mayor"}]))

SCENES.append(scene(
 id="sc_q7_wind_truth_offer", title="The Wind Dragon's Truth (offer)", realm=7, zone="windy_cliffs", density="D5",
 trigger={"graph": "realm_7", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q7_wind_truth"}}},
 background="bg_cliffs", music="wind_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "granny_xue", "expr": "worried"}},
 lines=[
  L("l1", "granny_xue", "The sky road is closed. The Wind Dragon blocks the pass.", "R1", "worried", zh="我迷路了。"),
  L("l2", "granny_xue", "Travellers say they {C907} in the wind. He will not let anyone {C444}.", "R1", "sad"),
  L("l3", "hero", "We'll go up {C425} and talk to him.", "L1", "brave", choices=[
     C("c1", "We'll calm the dragon.", goto="l4", setFlags=["accept_q7_wind_truth"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "granny_xue", "Be kind. He is old, and he remembers more than he says.", "R1", "neutral", zh="到这儿。", end=True),
  L("l5", "granny_xue", "No one reaches the peaks until the pass is open.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q7_wind_truth"}, "acceptQuest": "q7_wind_truth"}]))

SCENES.append(scene(
 id="sc_q7_wind_truth_thanks", title="The Wind Dragon's Truth (turn-in)", realm=7, zone="windy_cliffs", density="D5",
 trigger={"graph": "realm_7", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q7_wind_truth"}},
 background="bg_cliffs", music="wind_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "thinking"}, "L2": {"char": "xiaolong", "expr": "sad"}, "R1": {"char": "granny_xue", "expr": "sad"}},
 lines=[
  L("l1", "granny_xue", "So he knew 小龙. And he told you the truth.", "R1", "sad", zh="他认识小龙。"),
  L("l2", "xiaolong", "Mom is {C426} — in the castle.", "L2", "sad", zh="妈妈在那儿。"),
  L("l3", "granny_xue", "The Golden Dragon is a prisoner of the Demon King. The peak is still ahead.", "R1", "worried"),
  L("l4", "granny_xue", "Go on. The storm still wears a crown.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q7_wind_truth"}]))

SCENES.append(scene(
 id="sc_q7_storm_crown_offer", title="The Storm Crown (offer)", realm=7, zone="griffin_summit", density="D5",
 trigger={"graph": "griffin_spire_1", "node": "npc_1", "on": "questOffer", "cond": {"not": {"questActive": "q7_storm_crown"}}},
 background="bg_spire", music="wind_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "worried"}, "R1": {"char": "yezi", "expr": "worried"}},
 lines=[
  L("l1", "yezi", "Mist's storm crown is on the Griffin King. The {C470} will not clear until you break it.", "R1", "worried", zh="下雨了。"),
  L("l2", "yezi", "The {C477} and the {C482} are his cage. Break the crown, or the sky road stays closed.", "R1", "sad"),
  L("l3", "hero", "We'll climb and calm him.", "L1", "brave", choices=[
     C("c1", "We'll break the crown.", goto="l4", setFlags=["accept_q7_storm_crown"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "yezi", "I will wait {C425}. Come back when the storm is gone.", "R1", "neutral", zh="这儿。", end=True),
  L("l5", "yezi", "No one can {C466} to the colosseum until the crown breaks.", "R1", "sad", end=True)],
 onEnd=[{"if": {"flag": "accept_q7_storm_crown"}, "acceptQuest": "q7_storm_crown"}]))

SCENES.append(scene(
 id="sc_q7_storm_crown_thanks", title="The Storm Crown (turn-in)", realm=7, zone="griffin_summit", density="D5",
 trigger={"graph": "griffin_spire_1", "node": "npc_1", "on": "questTurnIn", "cond": {"questReady": "q7_storm_crown"}},
 background="bg_spire", music="wind_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "yezi", "expr": "happy"}},
 lines=[
  L("l1", "yezi", "The storm crown broke. Mist was blown away. It has stopped {C473}.", "R1", "happy", zh="不下雨了。"),
  L("l2", "xiaolong", "We can {C466} again!", "L2", "happy", zh="可以飞了！"),
  L("l3", "yezi", "The road to the colosseum is open. The last gate before the castle.", "R1", "neutral", end=True)],
 onEnd=[{"completeQuest": "q7_storm_crown"}]))

SCENES.append(scene(
 id="sc_q8_win_tournament_offer", title="Win the Tournament (offer)", realm=8, zone="grand_colosseum", density="D5",
 trigger={"graph": "realm_8", "node": "entry_town", "on": "questOffer", "cond": {"not": {"questActive": "q8_win_tournament"}}},
 background="bg_pits", music="colosseum_theme", once=False,
 slots={"L1": {"char": "hero", "expr": "neutral"}, "L2": {"char": "xiaolong", "expr": "brave"}, "R1": {"char": "general_mo", "expr": "neutral"}},
 lines=[
  L("l1", "general_mo", "Win, and you may pass. The {C503} is the last gate before the castle.", "R1", "neutral", zh="要比赛。"),
  L("l2", "general_mo", "{C991} fight Dachui fairly? He is the {C956} of these pits.", "R1", "thinking"),
  L("l3", "hero", "We'll fight fair.", "L1", "brave", choices=[
     C("c1", "We accept.", goto="l4", setFlags=["accept_q8_win_tournament"]),
     C("c2", "Not now.", goto="l5")]),
  L("l4", "general_mo", "{C965}. Come back when the match is won.", "R1", "neutral", zh="坚持。", end=True),
  L("l5", "general_mo", "Then the castle road stays closed.", "R1", "neutral", end=True)],
 onEnd=[{"if": {"flag": "accept_q8_win_tournament"}, "acceptQuest": "q8_win_tournament"}]))

SCENES.append(scene(
 id="sc_q8_win_tournament_thanks", title="Win the Tournament (turn-in)", realm=8, zone="grand_colosseum", density="D5",
 trigger={"graph": "realm_8", "node": "entry_town", "on": "questTurnIn", "cond": {"questReady": "q8_win_tournament"}},
 background="bg_pits", music="colosseum_theme", once=True,
 slots={"L1": {"char": "hero", "expr": "happy"}, "L2": {"char": "xiaolong", "expr": "happy"}, "R1": {"char": "general_mo", "expr": "happy"}},
 lines=[
  L("l1", "general_mo", "You beat Dachui fairly. He laughed, and he pledged the beastfolk.", "R1", "happy", zh="你是冠军。"),
  L("l2", "general_mo", "A true {C955} can also be a friend. We will meet at the castle.", "R1", "neutral", zh="对手。"),
  L("l3", "xiaolong", "We did not give up. We had to {C965}!", "L2", "happy"),
  L("l4", "general_mo", "The last gate is open. Go.", "R1", "brave", end=True)],
 onEnd=[{"completeQuest": "q8_win_tournament"}]))

if __name__ == "__main__":
    for s in SCENES: print(s["id"], len(s["lines"]), "lines", s["words"])
