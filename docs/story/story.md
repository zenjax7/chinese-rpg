# Story — "The Silent Fog" (Desy, v1.2, approved Jack 2026-11-20 PT; from v1.1, 2026-10-02 PT)

Story bible for the Chinese-learning RPG: premise, cast, one arc per land, where story events sit on the maps, how dense the Chinese is, the dialogue format, and answers to GameDev's questions (architecture.md §11.3).

Related files: `characters.md` (portrait brief), `quests.md` (quests), `data/dialogue/*.json` (sample scenes), `data/quests/` (quest data), `data/levels/` (maps). Realm 1 uses real node ids from `data/levels/realm_1.json` (and `clover_hills.json`, `warren.json`). Later lands use the map ids in `data/levels/` (`realm_2`…`realm_9`, dungeons, `demon_castle_*`).

## 0. Decisions (director's calls 2026-10-02 22:49 PT, pending Jack)

- **2026-11-20 — Story rework (Jack).** New premise and opening: the egg has a history and hatches after the first main quest, not as a birthday surprise. The nine lands are stretches of the old Bell Road to the Demon King's Castle. 小龙 is option A, a bonded companion: the existing Friendship team attack is unchanged; three visible forms (hatch, fledgling, grown); he joins at the hatch, not in the first cutscene. Main quests carry each land's beat. Each land's world-map exit (`w12`…`w89`) locks until that land's climax main is turned in (exits only). `q2_lost_panda` stays an optional side quest, unchanged. Quest gold stays ~30 × G per land. **Ending: TBD** (Jack choosing between options); the old school ending is dropped and no new ending is written.
- **Companion = 小龙**, speaker id `xiaolong`. `panda` is renamed in data/world by the world-graph owner. Inn pandas are `innkeeper_panda`.
- **Ending: TBD (Jack 2026-11-20).** The old ending (the Demon King shrinks and goes to Teacher Zhang's school with Pipi) is dropped. Jack is choosing between options. Do not write a new ending until he picks one.
- **Escorts never fail:** the escortee can't be harmed; after a lost battle it is waiting at the last inn used (runtime rules: quests.md §2a).
- **The free Bubble Spell quest reward is approved.**
- **Quest gold target counts gold only:** 30 × G per realm, ±10%. Items, gear and spells are a bonus (quests.md §0, §3).
- **Names stay placeholders** (the cast names below, and NPC names) until Jack picks.

## 1. Premise

The Demon King **魔王** is spreading a **Silent Fog** down the old Bell Road, from his castle toward the nine lands and, at last, home. A creature caught in the fog forgets its kind words. It turns hostile, picks fights and shouts the few words it still remembers. **That is why speaking Chinese wins battles:** every correct answer is a kind word that thins the fog. A "defeated" monster is really a calmed one. It shakes off the fog, says 谢谢 or simply wanders home. Zombies are cured at 0 HP, exactly as `enemies.json` already says.

Long ago, the five peoples (humans 人类, elves 精灵, dwarves 矮人, beastfolk 兽人 and dragons 龙) beat the Demon King together by ringing the **Harmony Bell 和平钟**. Then they drifted apart, and the Bell went silent. The fog works because no one people can ring it alone. The game's spine is one road to the castle: open each blocked stretch, win back the five peoples, and ring the Bell again before Little Hill Village goes quiet.

Granny Bai, last of the old Bell party, has kept a golden dragon egg in the village since that war. It was cold for years. The hero does not find it "by the well this morning" on a birthday. The village wakes too quiet. Granny shows the egg and sends the hero to learn what is happening in the fields (`q1_quiet_morning`). After the hero reaches the old well — where she first hid the egg — the fog touches the village, the egg hatches, and 小龙 says 你好. Then she tells the truth: the Demon King is hunting the last free golden dragon; staying puts the village in his path; she is too old to walk the road. The hero's job is clear: take 小龙, follow the Bell Road, and ring the Bell before home goes silent.

Tone: stakes and mystery, never cruel. Nobody dies. Villains are fogged, misguided or proud, and almost all of them can be redeemed. The jokes are drier; the threat is the silence spreading toward home.

## 2. Cast (portraits and looks: characters.md)

| id | name | role | realms |
|---|---|---|---|
| `hero` | {hero} (player-named) | A kid from 小山村 Little Hill Village. Speaks in choices. | all |
| `xiaolong` | 小龙 Little Dragon | Bonded companion: the last free golden dragon, hunted by the Demon King. The Harmony Bell still answers a dragon's voice. Hatches after `q1_quiet_morning` (not on a birthday) and joins then. Knows only 你好 at first; his vocabulary grows each land. Three visible forms, story and art only: hatch (R1–R3), fledgling (from R4), grown (R9, after his mother is freed). In battle he uses the existing Friendship team attack (combat-spec.md §6.6); his forms do not change the combat rules. His hints are the "teach on a miss" voice. | all |
| `granny_bai` | 白奶奶 Granny Bai | Village elder and mentor, a retired hero of the old Bell party. Tea, terrible jokes, and a walking stick that is secretly a wand. Sends letters by her pigeon 咕咕 Gugu. Teaches Bubble Spell (R2) and Second Wind (R9). | 1, 2, 9 (+ letters) |
| `fei` | 林小飞 Fei | Rival. About 11, a sword-swinging show-off from Honey Town. Gets captured by bandits (R3), reconciles (R8: 我们是朋友) and becomes an ally (R9). His little sister is 小美 Xiaomei. | 2, 3, 5, 8, 9 |
| `pipi` | 皮皮 Pipi | Demon lieutenant 1: a small red imp prankster. Crowns the Rabbit King, steals royal jelly, rigs things. In R9 he holds the Golden Dragon's curse chain and surrenders. What happens to him after that is **TBD** with the ending. | 1–4, 8, 9 |
| `madame_mist` | 雾夫人 Madame Mist | Demon lieutenant 2: the fog-maker. Brews the Sickness Fiend (R6) and the storm crown (R7). Defeated, she is blown away into a harmless cloud. | 5–7 |
| `general_mo` | 墨将军 General Mo | Demon lieutenant 3: an honorable demon-knight. Refuses Mist's plan (R6 cameo), runs the R8 tournament fairly and disqualifies cheating Pipi, then steps aside in R9. | 6, 8, 9 |
| `golden_dragon` | 金龙 Golden Dragon | 小龙's mother. She is the Shadow-Cursed Dragon boss (R9); freed, she turns golden, says 谢谢 and joins the final battle. | 7 (mentioned), 9 |
| `wind_dragon` | 风龙 "Uncle Wind" | Wind Dragon boss (R7). After the L7.1 fight he bows, recognizes 小龙 and reveals that Mom was captured (the mid-game twist). Ally in R9. | 7, 9 |
| `demon_king` | 魔王 Demon King | Two-phase final boss who shouts 统治. When the Bell rings, the fog breaks. **Ending: TBD** (Jack choosing between options). No new ending is written here. | 9 |

Realm figures (quest givers and story NPCs): Farmer Li 李农夫, Xiaoming 小明, Grandpa Wang 王爷爷 (R1); Queen Bee 蜂后, elf ranger 叶子 Yezi, beekeeper 蜜奶奶 Granny Mi, little 朵朵 Duoduo (R2); 钱老板 Boss Qian of the market guild, Mayor Hu 胡镇长 (R3); dwarf foreman 石大叔 Uncle Shi, 张老师 Teacher Zhang (R4); clockkeeper 龟爷爷 Grandpa Turtle (R5); 安医生 Dr. An, 刘镇长 Mayor Liu, the cured Zombie Mayor (R6); Griffin King, 雪奶奶 Granny Xue, mapmaker 陆 Lu (R7); 大锤 Dachui, Ogre Champion and beastfolk chief (R8); the alliance council at Lantern Light Camp (R9).

**Companion: 小龙, speaker id `xiaolong`** (decided 2026-10-02 PT; role rewritten 2026-11-20, Jack approved Option A). He is not a pet who tags along. He is the last free golden dragon, and the reason the village is no longer safe once he hatches. The existing Friendship team attack is unchanged (gauge 100, +20 per miss, +5 per hit, 1.25 × ATK, no question). `joinParty` fires on the hatch turn-in, not in `sc_r1_opening`. Form flags (`xiaolong`, `xiaolong_fledgling`, `xiaolong_grown`) swap portraits and battle sprites only. Pandas stay as the innkeepers of the Sleepy Panda Inn, with a running gag that every inn in every land is run by a panda "cousin" (speaker `innkeeper_panda`). All story, quest and dialogue files use `xiaolong`.

## 3. Arc per realm (beginning / twist / climax)

The nine lands are stretches of the **old Bell Road** to the Demon King's Castle. Each land's story boss is the blockade on that stretch. The main quests of that land investigate the blockade and end on a reveal that names the next stretch. Curriculum pools (L1.1 … L9.2) are unchanged. Map ids follow `docs/data/levels/`.

| realm | zones (pools) | beginning | twist | climax and payoff |
|---|---|---|---|---|
| 1 新手草原 Starter Meadow | realm_1 L1.1, clover_hills L1.2, warren L1.3 | The village wakes too quiet. Granny Bai shows the cold egg and sends the hero to learn why (`q1_quiet_morning`). At the old well the egg hatches; 小龙 says 你好. | The rabbits aren't evil: a red imp **Pipi** put a fog crown on the Horned Rabbit King (`q1_bounty`, `q1_carrot`; first seen at the `w_camp` inn). | Horned Rabbit King calmed and crown shattered (`q1_shatter_crown`). Pipi flees toward Honey Town. Granny: if 小龙 stays, the village is next. The Bell Road starts east. |
| 2 蜂巢森林 Honeycomb Forest | realm_2 L2.1, great_hive_1 L2.2 | Honey Town. Rival **Fei** shows off and runs ahead (`q2_fei_boast`). Granny Bai's letter teaches Bubble Spell and says this town sits on the Bell Road (`q2_bubble_lesson`). | Pipi stole the Queen Bee's royal jelly and closed the east road (`q2_road_blocked`). Elf ranger **Yezi** helps (first elf). | Queen Bee calmed. Royal jelly returned → **Heal** (`q2_royal_jelly`). The Queen remembers the pact and names the Crossroads. |
| 3 十字路口集市 Crossroads | realm_3 L3.1, bazaar_cellars_1 L3.2 | Crossroads Market is the meeting of the roads, but bandits have shut them. | **Fei is captured** trying to be a hero alone (`q3_rescue_fei`). Pipi is selling "fog in a jar" (`q3_fog_jar`). | Bandit boss (and the Mimic King in the cellars) calmed. Boss Qian reopens the market. The cave road is open. |
| 4 哥布林洞穴 Goblin Caves | realm_4 L4.1, goblin_caves_1–3 L4.2–L4.3 | Miner's Camp. Dwarf **Uncle Shi** says the goblins kidnapped the village kids and Teacher Zhang. | The goblins kidnapped a teacher because **they want to learn**; Pipi told them "school is only for humans" (`q4_free_classmates`). 小龙's fledgling form begins after the school opens. | Goblin King defeated → kids and teacher freed (谢谢). Teacher Zhang opens a real **goblin school** (`q4_school_bell`). Uncle Shi: "Dwarves will stand with you," and shows the swamp road. |
| 5 九头蛇沼泽 Hydra Swamp | realm_5 L5.1, hydra_lair_1–2 L5.2 | Reed Village. The fog is thickest here. **Madame Mist** appears in person. The swamp is stuck in one evening, so no one can cross. | Mist fed **Grandpa Turtle's Time Pearl** to the Hydra (`q5_time_pearl`). | Hydra calmed and the pearl comes back: morning returns (`q5_fog_bottle` still seals Mist's bottle). Mist escapes. The path to the sick lands opens. Fei turns up humbler and helps escort villagers. |
| 6 丧尸之地 Zombie Lands | realm_6 L6.1, moonlit_crypt_1–2 L6.2 | Dawn Chapel. The villagers are "zombies": sick with fog, not dead. **Dr. An** needs herbs (`q6_medicine_herbs`). | General Mo cameo: he **refuses** Mist's sickness plan ("A soldier does not fight children.") and leaves. Mist made the **Sickness Fiend**. | Zombie Mayor cured (`q6_cure_mayor`) → Village Key and the clue "the sickness came from the graveyard". Sickness Fiend defeated → everyone cured. If the Fiend is left standing, the sickness will outrun the hero to the peaks. |
| 7 狮鹫山峰 Griffin Peaks | realm_7 L7.1, griffin_spire_1–3 L7.2 | Cloud Ridge. The storms have closed the sky road. The Wind Dragon blocks the pass. | **Mid-game twist:** the calmed Wind Dragon recognizes 小龙 (`q7_wind_truth`). His mother, the Golden Dragon, was captured and chained by the Demon King (`sc_r7_wind_dragon_truth`). | Griffin King freed from Mist's **storm crown** (`q7_storm_crown`). Crown breaks, griffins freed, Mist is blown away into a harmless cloud. The road to the colosseum opens. Yezi returns with the elves' promise. |
| 8 食人魔角斗场 Ogre Colosseum | realm_8 L8.1, undercroft_1–3 L8.2 | Arena Town. General Mo announces a tournament: "Win, and you may pass." It is the last gate before the castle. | Pipi rigs the matches (hidden fire demon, swapped medals). **Mo disqualifies Pipi**: an honorable enemy. **Fei and the hero reconcile** (我们是朋友). | Ogre Champion **Dachui** loses fairly (`q8_win_tournament`, `q8_singer_escort`) and pledges the beastfolk. Mo: "We will meet at the castle." |
| 9 魔王城堡 Demon King's Castle | realm_9 L9.1, demon_castle_1–5 L9.2 | Lantern Light Camp: the alliance council (Yezi, Uncle Shi, Dachui, Uncle Wind, Granny Bai) has to be persuaded to work together (pact quests). | At the gate, Pipi holds Mom's **curse chain** (+3 ATK). He surrenders when he sees how many friends the kid has (`q9_pipi_surrender`). The Shadow-Cursed Dragon is freed and turns golden. 小龙 takes his grown form. | General Mo steps aside (`sc_r9_before_demon_king`). All five peoples ring the Bell → the fog breaks. **Ending: TBD** (Jack choosing between options). |

## 3a. Ending (TBD)

**TBD (Jack choosing between options).** The journey still ends at the Demon King's Castle: the five peoples ring the Harmony Bell and the Silent Fog breaks. What happens to the Demon King, to Pipi, and after the last fight is not written. The old school ending is dropped. Do not add a new ending scene until Jack picks one.

## 4. Story-event placement on the world graph

World-graph event outcomes: `story` (scene or dialogue), `quest_offer`, `miniboss`, `item`, `treasure`, `portal`, `nothing`. Scenes use GameDev's triggers (`firstEnter`, `enter`, `clear`, `leave`, `rest`, `talk`). Placement rules:

- **Beginning beats** go on the realm's first town/village node, as `firstEnter`.
- **Twist beats** go on the second zone's village or inn, or on a story node right after the first zone's boss (`clear` on the boss node).
- **Climax beats** are `enter` on the final boss node (pre-fight) plus `clear` (post-fight). The **boss-approach inn** (the inn on the `boss_approach` edge) holds the companion warning and the villain taunt.
- **Gate (`g*`) edges and zone exits** carry a short Granny Bai letter (Gugu the pigeon) when a new realm opens.
- Any extra NPC hooks that no quest uses become ambient NPCs with one-line banter (see quests.md §6).

### Realm 1 (real nodes, `realm_1.json`)

| node | trigger | content | status |
|---|---|---|---|
| `village` | firstEnter | **sc_r1_opening**: the village is too quiet. Granny Bai shows the cold egg and sends the hero to find out why. 你好 is taught as a greeting, not as a hatch line. Then the existing `meadow_intro` line plays. 小龙 does **not** join yet. | rewrite the existing scene. village.1 still runs `scene sc_r1_opening` → `meadow_intro` → tutorial battle. |
| `village` | enter, cond bossDefeated clover_hills | **sc_r1_village_banter**: Farmer Li counts rabbits wrong (一 二 五 → 不对). Xiaoming mentions the crowned rabbit. | new |
| `m_farm` | talk / questOffer | Farmer Li offers q1_hoe (sc_q1_hoe_offer) and q1_bounty. | existing m_farm.1/.2 + new scenes |
| `m_well` | enter / quest | `well_hint` + item `farmers_hoe` (`q1_hoe` step). On `q1_quiet_morning` turn-in, or on reach while that quest is active: **sc_r1_hatch** — the egg hatches, 你好 / 谢谢, `joinParty` 小龙, Granny tells the truth about the King. | existing m_well.1/.3 + new hatch scene |
| `m_farm` | questTurnIn | sc_q1_hoe_thanks replaces `farmer_thanks`. `q1_bounty` thanks: the rabbits wore crown scraps and dropped a red button. | new / retone |
| `m_crow` | enter / clear | `crow_boss_intro`. On clear: the crow says 谢谢 and flies off (a one-liner to add). | existing + suggestion |
| `c_hills` / `c_ridge` | enter | `clover_sign` (一、二、三) | existing |
| `c_camp` | firstEnter | `camp_welcome`; panda innkeeper cousin #1 gag | existing + suggestion |
| `w_path` | talk | Xiaoming offers `q1_carrot` (now main). He saw a red imp crown a rabbit. | existing, retone |
| `w_nest` | miniboss | carrot thief (swift_horned_rabbit), q1_carrot step; `thief_gone` afterwards | existing |
| `w_lake` | item | `golden_carrot` (q1_carrot) | existing |
| `w_camp` | enter | `king_warning` + **Pipi's first appearance** (taunt from the rafters, steals a honey pot, vanishes). Suggested scene id `sc_r1_pipi_taunt`. | existing + new beat |
| `w_throne` | enter / clear | Rabbit King intro → on clear: `king_beaten` + crown shatters, Pipi flees toward Honey Town (`sc_r1_crown_breaks`, `q1_shatter_crown`). | existing + main-quest beat |
| world edge `w12` (realm_1 → realm_2) | leave | Granny Bai's letter #1 via Gugu (the Bell Road starts east; preview of Honey Town). If Jack approves the exit lock, this edge is `lockedUntilQuest: q1_shatter_crown`. | new (lock is a question) |

### Realms 2–9 (zone + node kind + position)

| realm | beat | zone | node kind · position | trigger | scene id (planned) |
|---|---|---|---|---|---|
| 2 | Honey Town arrival, Fei shows off | forest | town · entry_town | firstEnter | sc_r2_fei_show_off |
| 2 | Granny Bai's letter: Bubble Spell lesson | forest | town · entry_town (magic shop) | talk | sc_q2_bubble_lesson_offer |
| 2 | Yezi the elf in the glade | forest | npc · mid-zone | talk | sc_r2_meet_yezi |
| 2 | Pipi stole the royal jelly (twist) | great_hive | story/inn · boss-approach inn | enter | sc_r2_jelly_thief |
| 2 | Queen Bee calmed → Heal | great_hive | boss · final | clear | sc_r2_queen_thanks |
| 3 | Market boom, bandits blocking the roads | crossroads_highway | town · entry_town | firstEnter | sc_r3_market |
| 3 | Fei captured (twist) | crossroads_highway | village · outpost after boss | clear (zone boss) | sc_r3_fei_taken |
| 3 | Fei rescued, grudging thanks | night_bazaar | miniboss · cellar end (bazaar_cellars_1) | clear | sc_q3_rescue_fei_thanks |
| 3 | Pipi selling "fog in a jar" | night_bazaar | npc · bazaar mid | enter | sc_r3_fog_jar |
| 4 | Uncle Shi: kids kidnapped | cave_mouth | village · Miner's Camp | firstEnter | sc_r4_uncle_shi |
| 4 | Goblins want school (twist) | crystal_tunnels | story · goblin_caves_2 mid | enter | sc_r4_goblins_want_school |
| 4 | King defeated, teacher freed, goblin school opens | goblin_school | boss · goblin_caves_3 final | clear | sc_r4_school_opens |
| 5 | Madame Mist in person | misty_marsh | village · Reed Village | firstEnter | sc_r5_mist_arrives |
| 5 | Time Pearl in the Hydra (twist) | hydra_s_lair | npc · Grandpa Turtle, hydra_lair_1 entry | talk | sc_r5_time_pearl |
| 5 | Morning returns | hydra_s_lair | boss · hydra_lair_2 final | clear | sc_r5_morning |
| 6 | Dr. An: they're sick, not dead | gloomy_village | town · Dawn Chapel | firstEnter | sc_r6_dr_an |
| 6 | General Mo refuses Mist (twist) | moonlit_graveyard | story · graveyard gate | enter | sc_r6_mo_refuses |
| 6 | Zombie Mayor cured: Village Key | gloomy_village | boss · zone boss | clear | sc_r6_mayor_cured |
| 6 | Sickness Fiend → everyone cured | moonlit_graveyard | boss · moonlit_crypt_2 final | clear | sc_r6_cured |
| 7 | **Wind Dragon's truth (mid-game twist)** | windy_cliffs | boss · boss_1 (realm_7.json) | clear | **sc_r7_wind_dragon_truth** (written) |
| 7 | Griffin King's storm crown breaks, Mist blown away | griffin_summit | boss · griffin_spire_3 final | clear | sc_r7_crown_breaks |
| 8 | General Mo announces the tournament | training_pits | town · Arena Town | firstEnter | sc_r8_tournament |
| 8 | Pipi disqualified; Fei reconciles (twist) | grand_colosseum | inn · undercroft_2 inn | rest | sc_r8_friends |
| 8 | Dachui loses fairly, pledges the beastfolk | grand_colosseum | boss · undercroft_3 final | clear | sc_r8_dachui |
| 9 | Alliance council | demon_king_s_gate | town · Lantern Light Camp | firstEnter | sc_r9_council |
| 9 | Pipi and the curse chain | demon_king_s_gate | boss · Shadow-Cursed Dragon (demon_castle_2) | enter | sc_r9_chain |
| 9 | Mom freed, golden, 谢谢 | demon_king_s_gate | boss · same | clear | sc_r9_mom_freed |
| 9 | **Mo steps aside** | throne_hall | boss · boss_9 (demon_castle_5) | enter | **sc_r9_before_demon_king** (written) |
| 9 | Bell rings. **Ending: TBD** (Jack choosing between options). Do not write `sc_r9_ending` until he picks one. | throne_hall | boss · boss_9 | clear | — |

## 5. Key encounters

- **Horned Rabbit King (R1).** Pipi's crown is the visual tell: fog villains always wear a Pipi or Mist accessory that breaks on defeat.
- **Swift Horned Rabbit** (e11 scripted elite, q1_carrot thief): the first "named" mini-boss.
- **Wind Dragon (R7):** a boss fight, then a talk scene with no second fight. Sets up R9.
- **Fire demon "Blaze" (fire_elemental, R8 q8_fire_demon):** Pipi's secret weapon in the tournament.
- **Shadow-Cursed Dragon (R9):** the fight is framed as "breaking the chain". Pipi on the chain gives +3 ATK until he surrenders (q9_pipi_surrender can soften this).
- **Demon King (R9, 2 phases):** phase 2 starts when the Bell begins ringing. Every ally from §2 cameos with a line.

## 6. Chinese density plan

Rule zero, **"met"**: a line may only use curriculum items from the pool of the scene's location or an earlier one (each location's Preview runs before its content). The opening scene may "teach" up to 3 items with an automatic gloss. `build/story/validate_dialogue.py` enforces this, plus per-tier limits on tokens per line, the share of lines with tokens, and full-sentence length, and checks that every character of a free `zh` sentence is in an already-met item. Names (小龙, 皮皮…) are exempt.

| tier | realms | what appears | limits (validator) |
|---|---|---|---|
| D1 | 1 | single met words: greetings, yes/no, numbers | ≤ 1 token per line; ≤ 30% of lines (a scene may always have 2); no full zh sentences |
| D2 | 2 | 1–2 tokens, short phrases (太好了, 我饿了) | ≤ 2 per line, ≤ 50% of lines |
| D3 | 3–4 | phrase tokens + occasional mini-sentence | zh ≤ 6 characters, with English gloss |
| D4 | 5–6 | 2–3 tokens; one full sentence per beat | zh ≤ 10 characters; ≥ 15% of speaking lines |
| D5 | 7–8 | full short sentences in 30–50% of lines | zh ≤ 12 characters; ≥ 30% |
| D6 | 9 | most key lines carry a full sentence with connectors (因为…而且…) | zh ≤ 15 characters; ≥ 50%; gloss smaller but always shown |

The English line always carries the meaning, so no kid gets stuck on a story beat. A tapped token shows a gloss, **never pinyin**. 小龙's vocabulary grows on screen: he only says 你好 in R1 and speaks full sentences by R7.

Note: some existing world-graph dialogue lines carry full zh sentences above the D1 tier (`meadow_intro` 这里是新手草原！, `well_hint`). Suggest showing those as gloss-only at D1, or shortening them to single met items.

## 7. Dialogue format (`scene/0.2`)

`data/dialogue/scene.schema.json` builds on GameDev's `scene/0.1` (architecture.md §11.1) and changes nothing they rely on:

- Kept: `id`, `background`, `music`, `once`, `slots` L1/L2/R1/R2 `{char, expr}`, `words`, `onEnd`, line `id`/`speaker`/`side`/`expr`/`vo`/`choices`/`goto`/`end`/`if`/`else`, and inline `{Cxxx}` tokens.
- Added at scene level: `realm`, `zone`, `density`, `title`, `teaches` (≤ 3 items glossed on first sight), and `trigger {graph, node | zone+nodeKind+position, on, cond, replaces}`. Two more `on` values: `questOffer` and `questTurnIn` (called by the quest system, not the graph).
- **Changed on lines:** `en` is the spoken line in English with `{Cxxx}` tokens. GameDev's `zh` becomes **optional** and holds only a full Chinese sentence (D3+). `zhTrad` is generated by OpenCC s2tw. `zhId` is set when the sentence is itself a curriculum item (e.g. C1038). `tokens` lists every item used (filled in by the generator). `setFlags`/`clearFlags` are lists. `swap {slot, char, expr}` changes a portrait mid-scene (for a fifth speaker). Choices carry `id`, `tokens` and `correct` (for "say the right word" choices, so the game can count words-used).
- `{hero}` is the player-name placeholder. `narrator` lines use `side: "none"` (no portrait).
- Written samples: `sc_r1_opening`, `sc_r1_village_banter`, `sc_q1_hoe_offer`, `sc_q1_hoe_thanks`, `sc_r7_wind_dragon_truth`, `sc_r9_before_demon_king`. Generated by `build/story/make_dialogue.py`, checked by `build/story/validate_dialogue.py` (0 errors).

## 8. Answers to GameDev (architecture.md §11.3)

**Desy**
1. *Is the scene format enough (≤ 4 portraits, choices, flags)?* Yes. I added `trigger`, `density`, `tokens`, optional `zh`/`zhTrad`, `swap` for the rare fifth speaker, and `correct` on choices (§7). Four slots is enough. Narrator lines need `side: "none"`.
2. *One file per quest or per realm?* **Scenes: one file per scene** (as you proposed). **Quests: one bundle, `quests.json`** (50 quests, about 130 KB), built from a single source by `build_quests.py`. Split it per realm (`quests_r1.json`…) at build time if loading needs it. Ids stay the same either way.
3. *Auto vs turn-in?* 41 quests go back to the giver. 8 hand in to a different named NPC (e.g. q1_carrot → Xiaoming in the village, q9_pipi_surrender → Granny Bai). **Only `q8_singer_escort` is `auto`**: it completes on arrival. Full list in quests.md §4.
4. *Timers, failure states, repeats?* **None.** No timers. Quests can't fail. Escorts never fail: the escortee can't be harmed, and if the kid loses a battle it is waiting at the last inn used. Runtime rules for `escort` and `words` are in quests.md §2a. Nothing repeats (`repeatable: false`). A kid-friendly rule: an active quest can be dropped and re-taken at the giver with no penalty.

**Arty** (full spec in characters.md §4)
5. *Which expressions?* neutral, happy, sad, surprised, angry, worried, and thinking. Key cast get all 7. Generic NPCs get neutral, happy and worried.
6. *Size and format?* 512×768 transparent PNG masters, shipped as WebP. Framing is bust to mid-thigh, with the head in the top third.
7. *Face right, and the left slot mirrors?* Yes. Paint every portrait in 3/4 view facing **screen-right**. The engine mirrors it for the right-hand slots so speakers face each other. Asymmetric details (Pipi's tail, Granny Bai's hairpin) must still read when mirrored. Text on clothing is not allowed.

The 14 questions in §18.2 are already answered in `world-graph.md` §13.
