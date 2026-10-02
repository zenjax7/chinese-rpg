# Core Curriculum v2: Chinese-learning RPG

Rebuilt 2026-09-28 (PT) for players aged 10–12. The data lives in `core-curriculum.csv` (UTF-8 with BOM, the same 16 columns as v1). The per-location split is in `data/curriculum_location_pools.csv`, and a spreadsheet version is in `core-curriculum.xlsx`. Simplified is the default script; Traditional is kept in its own column. v1 is preserved as `core-curriculum-v1.csv/.md/.xlsx`.

## What changed from v1

- **Bigger and harder.** 1,051 items (v1: 585): 466 new items plus 46 v1 items moved to an earlier realm. Every location now has 47–60 items (v1: about 30), and realms 1–3 went from 212 to 375 items.
- **More grammar early.** Items that teach a structure (sentence frames, connectors, measure words, particles, comparisons) went from 55 to 120. 67 of them are in realms 1–3 (v1: 18).
- **Higher levels.** The share of items at effective HSK ≥ 2 went from 42% to 53%. Through realm 3 there are 136 of them (v1: 64).
- **Relaxed skill rules** for 10–12-year-olds (see Column conventions). Speaking Y went from 422 to 861 items, and reading Y from 491 to 933. Existing items could only gain Y flags; v1 hand-set N flags were kept.
- **Location pools.** Each realm is split into its locations (`L1.1` … `L9.2`, the same ids as the combat spec and the enemy roster), in topic order.
- **Stable ids.** v1 ids C001–C585 are unchanged, even for moved items. New items are C586–C1051 (no zero padding past C999). Progress keyed by id carries over.
- **Slice:** 60 items (v1: 40), covering L1.1–L1.3 and L2.1–L2.2.

## Totals

- **1051 items**: **820 words** and **231 phrases/expressions**. Phrases means type phrase, exclamation or sentence frame. Connectors, particles and measure words are counted as words.
- By type: word 705, phrase 166, connector 42, sentence frame 36, exclamation 29, number 22, pronoun 17, measure word 15, question word 11, particle 8
- Skill flags: listening Y = 1051, speaking Y = 861, reading Y = 933
- Vertical slice items: 60
- One deliberate duplicate (kept from v1): 只 appears twice, as zhī (measure word, Traditional 隻) and as zhǐ ('only').

### By level

| level | hsk3_items | yct_items |
|---|---|---|
| 1 | 342 | 80 |
| 2 | 204 | 61 |
| 3 | 109 | 131 |
| 4 | 69 | 169 |
| 5 | 29 | – |
| 6 | 18 | – |
| 7-9 | 21 | – |
| none | 259 | 610 |

246 items are in neither list, and every one has a reason in `notes`. Most are multi-word phrases and sentence frames built entirely from listed words; the notes give each component's level. HSK levels above 3 are reported as they are, so kid-common words that HSK ranks as advanced stay visible (厉害/棒 HSK5, 酷/哇 HSK6, 蜂蜜/蜜蜂 7-9).

### By realm: v1 vs v2

Averages use effective levels: a phrase that isn't listed as a unit takes the highest level among its listed parts, and 7-9 counts as 7. "grammar" = sentence frames, connectors, measure words, particles and comparison/pattern items.

| realm_no | realm | locations | v1_items | v2_items | new_items | moved_in | items_per_location | v1_avg_hsk | v2_avg_hsk | v1_avg_yct | v2_avg_yct | v1_share_hsk2plus | v2_share_hsk2plus | v1_grammar_items | v2_grammar_items | v2_phrases | v2_speaking_y | v2_reading_y | v2_in_neither_list |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Starter Meadow | 3 | 92 | 150 | 35 | 23 | 52/47/51 | 1.20 | 1.20 | 1.73 | 1.68 | 12% | 9% | 6 | 28 | 44 | 141 | 144 | 40 |
| 2 | Honeycomb Forest | 2 | 69 | 118 | 40 | 9 | 59/59 | 2.10 | 2.29 | 2.39 | 2.84 | 43% | 55% | 3 | 15 | 18 | 90 | 108 | 24 |
| 3 | Crossroads Market | 2 | 51 | 107 | 51 | 7 | 54/53 | 1.72 | 1.94 | 2.52 | 3.00 | 45% | 53% | 9 | 24 | 16 | 77 | 98 | 21 |
| 4 | Goblin Caves | 3 | 87 | 143 | 65 | 0 | 48/47/48 | 1.92 | 2.16 | 2.66 | 3.27 | 41% | 50% | 2 | 7 | 34 | 121 | 129 | 37 |
| 5 | Hydra Swamp | 2 | 57 | 94 | 51 | 6 | 47/47 | 1.44 | 1.78 | 2.60 | 2.88 | 33% | 48% | 21 | 20 | 20 | 83 | 88 | 29 |
| 6 | Zombie Lands | 2 | 68 | 120 | 58 | 1 | 60/60 | 1.93 | 2.33 | 2.93 | 3.15 | 49% | 67% | 0 | 4 | 23 | 101 | 110 | 24 |
| 7 | Griffin Peaks | 2 | 63 | 118 | 56 | 0 | 59/59 | 1.38 | 1.94 | 3.00 | 3.28 | 37% | 50% | 1 | 1 | 13 | 105 | 109 | 17 |
| 8 | Ogre Colosseum | 2 | 51 | 104 | 53 | 0 | 52/52 | 3.04 | 3.10 | 3.12 | 3.34 | 65% | 76% | 1 | 2 | 44 | 88 | 78 | 28 |
| 9 | Demon King's Castle | 2 | 47 | 97 | 57 | 0 | 48/49 | 3.05 | 3.48 | 3.57 | 3.75 | 77% | 90% | 12 | 19 | 19 | 55 | 69 | 26 |
| | **total** | 20 | 585 | 1051 | 466 | 46 | avg 52.5 | 1.88 | 2.18 | 2.54 | 2.82 | 42% | 53% | 55 | 120 | 231 | 861 | 933 | 246 |

**The ramp.** Cumulative through each early realm:

| through_realm | v1_items | v2_items | v1_hsk2plus_items | v2_hsk2plus_items | v1_grammar_items | v2_grammar_items |
|---|---|---|---|---|---|---|
| 1 | 92 | 150 | 11 | 14 | 6 | 28 |
| 2 | 161 | 268 | 41 | 79 | 9 | 43 |
| 3 | 212 | 375 | 64 | 136 | 18 | 67 |

How to read it:
- **Realm 1 is a denser foundation, not a higher-level one.** Its average level is the same as v1 (HSK 1.20), because the additions are HSK 1 family words, numbers to 99, connectors and sentence frames. What changed is that kids now *build sentences* from day one (28 pattern items vs 6).
- **From realm 2 on, the level rises**: average YCT is up 0.2–0.6 per realm and the HSK ≥ 2 share is up 8–18 points (realm 6: 49% → 67%, realm 9: 77% → 90%).
- Hydra Swamp's grammar count went from 21 to 20: its basic connectors (因为……所以……, 虽然……但是……) moved earlier and were replaced by harder ones (如果……就……, 先……然后……, 一……就……).

**Examples of tougher early items:**

| realm | location | examples |
|---|---|---|
| 1 Starter Meadow | L1.1–L1.3 | 好久不见 (long time no see), 这是…… (this is …), 你有没有……? (do you have …?), 我会…… (I can …), 跟 (with), 还有 (also; there's still), 九十九 (99) |
| 2 Honeycomb Forest | L2.2 | 因为……所以…… (moved from realm 5), 又……又…… (both … and …), 太……了 (too …!), 碗 / 瓶 as measure words, 我要一碗面条 (I'd like a bowl of noodles) |
| 3 Crossroads Market | L3.1–L3.2 | A比B…… (comparisons), 没有……那么…… (not as … as), 跟……一样 (the same as), 过 (experience), 更 (even more), 件 / 双, 千 / 万, 这件衣服多少钱?, 红的比蓝的贵 |
| 4 Goblin Caves | L4.2–L4.3 | 把 / 被 / 让 / 正在 / 着, 把门打开! (open the door!), 我被抓住了! (I've been caught!) |
| 5 Hydra Swamp | L5.2 | 如果……就……, 先……然后……, 虽然……但是…… (moved from realm 9) |
| 6 Zombie Lands | L6.1–L6.2 | 越来越……, ……得很好, 看起来, 失望, 咳嗽, 你哪儿不舒服?, 他变成了丧尸 |
| 7 Griffin Peaks | L7.1–L7.2 | 离这儿远吗?, 我迷路了, 上来 / 下去 / 进去 (directional complements), 天气预报, 明天会下雨吗? |
| 8 Ogre Colosseum | L8.1–L8.2 | 对……感兴趣, 坚持, 对手, 冠军, 没想到, 你敢吗?, 我不怕你 |
| 9 Demon King's Castle | L9.1–L9.2 | 无论……都……, 只要……就……, 只有……才……, 连……都……, 不是……而是……, 我们必须团结起来 |

## Locations (pools)

Each realm is split into its locations in topic order: items are grouped by topic, each topic keeps its authored order, and the cut between locations moves by up to 3 items so a topic isn't split mid-group. `location_global_no` (1–20) is the play order.

| location_id | location_name | location_name_zh | items | v1_items | new_items | moved_in | slice_items | speaking_y | reading_y | top_topics |
|---|---|---|---|---|---|---|---|---|---|---|
| L1.1 | Village Meadow | 村边草地 | 52 | 42 | 10 | 0 | 8 | 52 | 48 | Pronouns & question words (27); Greetings & politeness (25) |
| L1.2 | Clover Hills | 三叶草山坡 | 47 | 33 | 14 | 0 | 18 | 42 | 46 | Yes/no & core verbs (19); Sentence patterns (13); Numbers 1–10 (10); Particles (5) |
| L1.3 | Horned Rabbit Warren | 角兔窝 | 51 | 17 | 11 | 23 | 13 | 47 | 50 | Adventure basics (19); Family & people (9); Connectors (basic) (7); Numbers 1–100 (5) |
| L2.1 | Flower Glade | 花海林地 | 59 | 37 | 22 | 0 | 9 | 41 | 53 | Food & drink (59) |
| L2.2 | Great Hive | 大蜂巢 | 59 | 32 | 18 | 9 | 12 | 49 | 55 | Wants & likes (19); Animals (18); Connectors (basic) (8); Nature (5) |
| L3.1 | Crossroads Highway | 十字大道 | 54 | 31 | 23 | 0 | 0 | 34 | 51 | Shopping & money (32); Measure words (9); Big numbers (8); Colors (5) |
| L3.2 | Night Bazaar | 夜市 | 53 | 18 | 28 | 7 | 0 | 43 | 47 | Describing things (21); Clothes (11); Comparisons (8); Colors (6) |
| L4.1 | Cave Mouth | 洞口 | 48 | 41 | 7 | 0 | 0 | 45 | 47 | School & classroom (32); Family & people (16) |
| L4.2 | Crystal Tunnels | 水晶隧道 | 47 | 8 | 39 | 0 | 0 | 40 | 45 | School & classroom (37); Grammar words (5); Game & chat talk (5) |
| L4.3 | Goblin 'School' | 哥布林学校 | 48 | 29 | 19 | 0 | 0 | 36 | 37 | Game & chat talk (19); Dungeon & adventure (18); Requests & helping (10); Monster names (1) |
| L5.1 | Misty Marsh | 迷雾沼泽 | 47 | 24 | 23 | 0 | 0 | 45 | 47 | Time & dates (47) |
| L5.2 | Hydra's Lair | 九头蛇巢穴 | 47 | 13 | 28 | 6 | 0 | 38 | 41 | Daily routine (16); Connectors (basic) (13); Time & dates (11); Connectors (advanced) (6) |
| L6.1 | Gloomy Village | 灰雾村 | 60 | 44 | 16 | 0 | 0 | 52 | 56 | Feelings (37); Body & health (20); Sentence patterns (3) |
| L6.2 | Moonlit Graveyard | 月光墓园 | 60 | 17 | 42 | 1 | 0 | 49 | 54 | Everyday actions (39); Body & health (19); Connectors (advanced) (1); Monster names (1) |
| L7.1 | Windy Cliffs | 大风悬崖 | 59 | 33 | 26 | 0 | 0 | 56 | 56 | Places & directions (59) |
| L7.2 | Griffin Summit | 狮鹫之巅 | 59 | 29 | 30 | 0 | 0 | 49 | 53 | Weather (36); Transportation (19); Places & directions (4) |
| L8.1 | Training Pits | 训练场 | 52 | 21 | 31 | 0 | 0 | 45 | 46 | Hobbies & sports (52) |
| L8.2 | Grand Colosseum | 大角斗场 | 52 | 30 | 22 | 0 | 0 | 43 | 32 | Exclamations & reactions (43); Hobbies & sports (9) |
| L9.1 | Demon King's Gate | 魔王城门 | 48 | 22 | 26 | 0 | 0 | 33 | 39 | Opinions (20); Connectors (advanced) (18); Heroic battle talk (10) |
| L9.2 | Throne Hall | 王座大厅 | 49 | 18 | 31 | 0 | 0 | 22 | 30 | Heroic battle talk (32); Races & story (16); Monster names (1) |

### By topic

| realm | topic | items | new_in_v2 |
|---|---|---|---|
| Starter Meadow | Pronouns & question words | 27 | 5 |
| Starter Meadow | Greetings & politeness | 25 | 5 |
| Starter Meadow | Yes/no & core verbs | 19 | 1 |
| Starter Meadow | Adventure basics | 19 | 4 |
| Starter Meadow | Sentence patterns | 13 | 13 |
| Starter Meadow | Numbers 1–10 | 10 | 0 |
| Starter Meadow | Family & people | 9 | 0 |
| Starter Meadow | Connectors (basic) | 7 | 2 |
| Starter Meadow | Particles | 5 | 0 |
| Starter Meadow | Numbers 1–100 | 5 | 5 |
| Starter Meadow | Time & dates | 3 | 0 |
| Starter Meadow | Feelings | 3 | 0 |
| Starter Meadow | Big numbers | 1 | 0 |
| Starter Meadow | Measure words | 1 | 0 |
| Starter Meadow | Places & directions | 1 | 0 |
| Starter Meadow | Animals | 1 | 0 |
| Starter Meadow | Monster names | 1 | 0 |
| Honeycomb Forest | Food & drink | 59 | 22 |
| Honeycomb Forest | Wants & likes | 19 | 7 |
| Honeycomb Forest | Animals | 18 | 5 |
| Honeycomb Forest | Connectors (basic) | 8 | 1 |
| Honeycomb Forest | Nature | 5 | 1 |
| Honeycomb Forest | Measure words | 2 | 2 |
| Honeycomb Forest | Sentence patterns | 2 | 2 |
| Honeycomb Forest | Feelings | 2 | 0 |
| Honeycomb Forest | Exclamations & reactions | 2 | 0 |
| Honeycomb Forest | Monster names | 1 | 0 |
| Crossroads Market | Shopping & money | 32 | 19 |
| Crossroads Market | Describing things | 21 | 13 |
| Crossroads Market | Colors | 11 | 2 |
| Crossroads Market | Clothes | 11 | 5 |
| Crossroads Market | Measure words | 9 | 2 |
| Crossroads Market | Big numbers | 8 | 2 |
| Crossroads Market | Comparisons | 8 | 8 |
| Crossroads Market | Connectors (basic) | 5 | 0 |
| Crossroads Market | Feelings | 1 | 0 |
| Crossroads Market | Everyday actions | 1 | 0 |
| Goblin Caves | School & classroom | 69 | 34 |
| Goblin Caves | Game & chat talk | 24 | 8 |
| Goblin Caves | Dungeon & adventure | 18 | 11 |
| Goblin Caves | Family & people | 16 | 7 |
| Goblin Caves | Requests & helping | 10 | 0 |
| Goblin Caves | Grammar words | 5 | 5 |
| Goblin Caves | Monster names | 1 | 0 |
| Hydra Swamp | Time & dates | 58 | 34 |
| Hydra Swamp | Daily routine | 16 | 7 |
| Hydra Swamp | Connectors (basic) | 13 | 10 |
| Hydra Swamp | Connectors (advanced) | 6 | 0 |
| Hydra Swamp | Monster names | 1 | 0 |
| Zombie Lands | Body & health | 39 | 19 |
| Zombie Lands | Everyday actions | 39 | 23 |
| Zombie Lands | Feelings | 37 | 13 |
| Zombie Lands | Sentence patterns | 3 | 3 |
| Zombie Lands | Connectors (advanced) | 1 | 0 |
| Zombie Lands | Monster names | 1 | 0 |
| Griffin Peaks | Places & directions | 63 | 30 |
| Griffin Peaks | Weather | 36 | 18 |
| Griffin Peaks | Transportation | 19 | 8 |
| Ogre Colosseum | Hobbies & sports | 61 | 40 |
| Ogre Colosseum | Exclamations & reactions | 43 | 13 |
| Demon King's Castle | Heroic battle talk | 42 | 20 |
| Demon King's Castle | Opinions | 20 | 12 |
| Demon King's Castle | Connectors (advanced) | 18 | 14 |
| Demon King's Castle | Races & story | 16 | 11 |
| Demon King's Castle | Monster names | 1 | 0 |

## Realm plan (difficulty rises with YCT/HSK)

| realm_no | realm | monsters_boss | topics_taught | theme |
|---|---|---|---|---|
| 1 | **Starter Meadow** (slice) | horned rabbits 角兔, 角兔王 | greetings & politeness, pronouns & question words, yes/no & core verbs, numbers to 99, family & people, adventure basics, **sentence patterns** (这是……, 你有没有……, 我会……), basic connectors (和, 也, 跟, 还有) | Survive your first day: say hi, introduce your family, count, and yell for help. |
| 2 | **Honeycomb Forest** (slice) | jumbo bees, Queen Bee 蜂后 | food & drink, wants & likes, animals, nature, measure words 碗/瓶, patterns 太……了 / 又……又…… / 因为……所以…… | Forage and trade for food in a giant-bee forest, then calm the Queen Bee. |
| 3 | **Crossroads Market** | mimics / slimes, 宝箱怪王 | shopping & money, big numbers (千, 万), measure words, colors, clothes, describing things, **comparisons** (比, 没有……那么……, 跟……一样, 更), 过 | The town hub: buy gear, haggle (便宜一点儿吧), compare prices. |
| 4 | **Goblin Caves** | goblins 哥布林, 哥布林大王 | school & classroom, game & chat talk, family & people, requests & helping, dungeon basics, **grammar words** 把 / 被 / 让 / 正在 / 着 | Goblins turned the cave into a mock "school". Rescue your classmates. |
| 5 | **Hydra Swamp** | nine-headed hydra 九头蛇 | time & dates, daily routine, connectors (如果……就……, 先……然后……, 一……就……, 虽然……但是……) | Each hydra head is part of a sentence. Chain clauses with connectors to cut them off in order. |
| 6 | **Zombie Lands** | zombies 丧尸, 病魔 | feelings, body & health, everyday actions, 越来越……, ……得很好, 看起来 | The zombies are sick villagers. Cure them by asking how they feel and what hurts. |
| 7 | **Griffin Peaks** | griffins / harpies, 狮鹫王 | places & directions, transportation, weather, directional complements (上来, 下去, 进去) | A sky road: follow directions, read the weather, don't get lost (我迷路了!). |
| 8 | **Ogre Colosseum** | ogre champions | hobbies & sports, exclamations & reactions, competition talk (对手, 冠军, 坚持, 你敢吗?) | An arena tournament where the crowd's cheers and trash talk are the lesson. |
| 9 | **Demon King's Castle** | Demon King 魔王 | advanced connectors (无论……都……, 只要……就……, 只有……才……, 连……都……, 不是……而是……), opinions, heroic battle talk, races & story | Persuade the other races to unite, then defeat the Demon King. |

Design notes (unchanged from v1): exclamations appear from realm 1 as listening flavor before they're drilled in realm 8. The realm column marks where an item is *introduced*; earlier items keep coming back through review and carry-over. 龙 is kept as a possible ally, and 僵尸 (the hopping vampire) is deliberately not used for Western zombies.

## Vertical slice (60 items)

v1's 40 slice items, plus 10 new and 10 moved items, so the slice covers every location of realms 1–2 and includes early patterns.

| no | id | simplified | traditional | pinyin | english | location_id | yct_level | hsk3_level | speaking | reading |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | C001 | 你好 | 你好 | nǐ hǎo | hello | L1.1 | none | none | Y | Y |
| 2 | C005 | 再见 | 再見 | zàijiàn | goodbye | L1.1 | 1 | 1 | Y | Y |
| 3 | C007 | 谢谢 | 謝謝 | xièxie | thank you | L1.1 | 1 | 1 | Y | Y |
| 4 | C008 | 不客气 | 不客氣 | bù kèqi | you're welcome | L1.1 | 2 | 1 | Y | Y |
| 5 | C009 | 对不起 | 對不起 | duìbuqǐ | sorry | L1.1 | 2 | 1 | Y | Y |
| 6 | C010 | 没关系 | 沒關係 | méi guānxi | it's okay; no problem | L1.1 | 2 | 1 | Y | Y |
| 7 | C021 | 我 | 我 | wǒ | I; me | L1.1 | 1 | 1 | Y | Y |
| 8 | C022 | 你 | 你 | nǐ | you | L1.1 | 1 | 1 | Y | Y |
| 9 | C043 | 是 | 是 | shì | to be; yes | L1.2 | 1 | 1 | Y | Y |
| 10 | C044 | 不 | 不 | bù | not; no | L1.2 | 1 | 1 | Y | Y |
| 11 | C066 | 一 | 一 | yī | one | L1.2 | 1 | 1 | Y | Y |
| 12 | C067 | 二 | 二 | èr | two | L1.2 | 1 | 1 | Y | Y |
| 13 | C068 | 三 | 三 | sān | three | L1.2 | 1 | 1 | Y | Y |
| 14 | C069 | 四 | 四 | sì | four | L1.2 | 1 | 1 | Y | Y |
| 15 | C070 | 五 | 五 | wǔ | five | L1.2 | 1 | 1 | Y | Y |
| 16 | C071 | 六 | 六 | liù | six | L1.2 | 1 | 1 | Y | Y |
| 17 | C072 | 七 | 七 | qī | seven | L1.2 | 1 | 1 | Y | Y |
| 18 | C073 | 八 | 八 | bā | eight | L1.2 | 1 | 1 | Y | Y |
| 19 | C074 | 九 | 九 | jiǔ | nine | L1.2 | 1 | 1 | Y | Y |
| 20 | C075 | 十 | 十 | shí | ten | L1.2 | 1 | 1 | Y | Y |
| 21 | C597 | 这是…… | 這是…… | zhè shì … | this is … | L1.2 | none | none | Y | Y |
| 22 | C598 | 那是什么 | 那是什麼 | nà shì shénme | what is that? | L1.2 | none | none | Y | Y |
| 23 | C599 | 你是谁 | 你是誰 | nǐ shì shéi | who are you? | L1.2 | none | none | Y | Y |
| 24 | C600 | 我是…… | 我是…… | wǒ shì … | I am … | L1.2 | none | none | Y | Y |
| 25 | C602 | 我也是 | 我也是 | wǒ yě shì | me too | L1.2 | none | none | Y | Y |
| 26 | C604 | 我有…… | 我有…… | wǒ yǒu … | I have … | L1.2 | none | none | Y | Y |
| 27 | C076 | 救命 | 救命 | jiùmìng | help! (save me!) | L1.3 | none | 6 | Y | Y |
| 28 | C077 | 小心 | 小心 | xiǎoxīn | be careful! watch out! | L1.3 | 4 | 2 | Y | Y |
| 29 | C092 | 兔子 | 兔子 | tùzi | rabbit | L1.3 | 4 | none | N | Y |
| 30 | C176 | 两 | 兩 | liǎng | two (before measure words) | L1.3 | 2 | 1 | N | Y |
| 31 | C182 | 个 | 個 | gè | (general measure word) | L1.3 | 1 | 1 | N | Y |
| 32 | C273 | 爸爸 | 爸爸 | bàba | dad | L1.3 | 1 | 1 | Y | Y |
| 33 | C274 | 妈妈 | 媽媽 | māma | mom | L1.3 | 1 | 1 | Y | Y |
| 34 | C282 | 朋友 | 朋友 | péngyou | friend | L1.3 | 2 | 1 | Y | Y |
| 35 | C336 | 和 | 和 | hé | and; with | L1.3 | 1 | 1 | Y | Y |
| 36 | C337 | 也 | 也 | yě | also; too | L1.3 | 2 | 1 | Y | Y |
| 37 | C372 | 很 | 很 | hěn | very | L1.3 | 1 | 1 | Y | Y |
| 38 | C612 | 二十 | 二十 | èrshí | twenty | L1.3 | none | none | Y | Y |
| 39 | C617 | 我们走吧 | 我們走吧 | wǒmen zǒu ba | let's go | L1.3 | none | none | Y | Y |
| 40 | C093 | 吃 | 吃 | chī | to eat | L2.1 | 1 | 1 | Y | Y |
| 41 | C094 | 喝 | 喝 | hē | to drink | L2.1 | 1 | 1 | Y | Y |
| 42 | C096 | 米饭 | 米飯 | mǐfàn | (cooked) rice | L2.1 | 1 | 1 | Y | Y |
| 43 | C097 | 面条 | 麵條 | miàntiáo | noodles | L2.1 | 1 | 1 | Y | Y |
| 44 | C105 | 苹果 | 蘋果 | píngguǒ | apple | L2.1 | 1 | 3 | Y | Y |
| 45 | C107 | 水 | 水 | shuǐ | water | L2.1 | 1 | 1 | Y | Y |
| 46 | C115 | 蜂蜜 | 蜂蜜 | fēngmì | honey | L2.1 | none | 7-9 | N | Y |
| 47 | C118 | 好吃 | 好吃 | hǎochī | tasty (food) | L2.1 | 2 | 1 | Y | Y |
| 48 | C121 | 饿 | 餓 | è | hungry | L2.1 | 3 | 1 | Y | Y |
| 49 | C132 | 喜欢 | 喜歡 | xǐhuan | to like | L2.2 | 1 | 1 | Y | Y |
| 50 | C135 | 不要 | 不要 | bù yào | don't want; don't! | L2.2 | none | 2 | Y | Y |
| 51 | C136 | 我要…… | 我要…… | wǒ yào … | I want … | L2.2 | none | none | Y | Y |
| 52 | C139 | 我饿了 | 我餓了 | wǒ è le | I'm hungry | L2.2 | none | none | Y | Y |
| 53 | C142 | 花 | 花 | huā | flower | L2.2 | 4 | 1 | Y | Y |
| 54 | C144 | 蜜蜂 | 蜜蜂 | mìfēng | bee | L2.2 | none | 7-9 | N | Y |
| 55 | C160 | 我的妈呀 | 我的媽呀 | wǒ de mā ya | oh my gosh! (lit. 'oh my mom!') | L2.2 | none | none | Y | N |
| 56 | C161 | 太好了 | 太好了 | tài hǎo le | great! awesome! | L2.2 | none | none | Y | Y |
| 57 | C340 | 可是 | 可是 | kěshì | but | L2.2 | none | 2 | Y | Y |
| 58 | C343 | 因为 | 因為 | yīnwèi | because | L2.2 | 3 | 2 | Y | Y |
| 59 | C647 | 你想吃什么 | 你想吃什麼 | nǐ xiǎng chī shénme | what do you want to eat? | L2.2 | none | none | Y | Y |
| 60 | C652 | 太……了 | 太……了 | tài … le | too …; so …! | L2.2 | none | none | Y | Y |

## Column conventions

- **id**: stable. v1 ids (C001–C585) are unchanged, even when an item moved realm. New items are C586–C1051.
- **realm**: the realm where the item is introduced. The location is in `data/curriculum_location_pools.csv` (`location_id`, `location_no`, `location_global_no`, `origin` = v1/v2, `v1_realm`).
- **yct_level**: the lowest YCT level (1–4) in which the exact item appears. Otherwise `none`.
- **hsk3_level**: the HSK 3.0 (2021) level of the exact item: 1–6 or 7-9. Otherwise `none`. Erhua variants are matched to their list form.
- **notes**: for none-items, either "built from listed words A+B (parts max HSK x, YCT y)" or a short reason for inclusion. Also covers polyphones, tone sandhi and Taiwan wording.
- **pinyin**: dictionary citation tones (一 yī, 不 bù, no sandhi), matching the HSK list and CC-CEDICT. Recommendation: apply 一/不 sandhi automatically in the game's pinyin display.
- **listening**: Y for every item.
- **speaking** (relaxed for ages 10–12): Y for phrases, exclamations and sentence frames of **7 characters or fewer**, and for words of **3 characters or fewer at effective level ≤ 3** in everyday topics. N for particles, bare measure words, monster names and long frames. v1 hand-set N flags were kept.
- **reading** (relaxed): Y for words of **3 characters or fewer at level ≤ 4**, and for phrases of **6 characters or fewer at level ≤ 3**. N for monster names and long or advanced phrases. Slice items of 3 characters or fewer are always Y.
- **slice**: Y for the 60 slice items.

## Sources and method

| source | url | use |
|---|---|---|
| HSK 3.0 (2021) full word list, 11,092 entries, machine-readable transcription | https://github.com/ivankra/hsk30 | Exact-match HSK level for every item |
| Official standard GF0025-2021 (MoE PDF) | http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/W020210329527301787356.pdf | Reference |
| YCT levels 1–4 vocabulary (TSV) | https://github.com/krmanik/HSK-3.0/tree/main/YCT | Exact-match YCT level (lowest level wins) |
| Purple Culture YCT 1–4 lists | https://www.purpleculture.net/textbook-vocab-lists/?listid=10026 | Cross-check of cumulative counts |
| CC-CEDICT | https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip | Pinyin/definition check for non-list items |
| OpenCC (s2tw, s2twp) and pypinyin | https://github.com/BYVoid/OpenCC, https://github.com/mozillazg/python-pinyin | Traditional conversion and a second opinion on pinyin |

Method (v2): the 466 new items (`build/v2/items_add.txt`) and 46 moves (`build/v2/moves.txt`) were merged by `build/v2/build2.py`. It re-derives Traditional (OpenCC s2tw), levels (exact match, then erhua variants, then component levels for phrases) and skill flags, and checks pinyin against the HSK list, CC-CEDICT and pypinyin. Every disagreement was reviewed by hand. The location split and this document are generated (`build/v2/write_md.py`, `build/v2/stats.py`), so the numbers match the CSV.

## Caveats

1. **Traditional is script conversion only.** Where Taiwan uses a different word, the Taiwan word is in `notes` (e.g. 自行车 → 腳踏車, 公共汽车 → 公車, 地铁 → 捷運, 出租车 → 計程車, 米饭 → 白飯). A future Traditional toggle should use a separate `taiwan_wording` column.
2. **Erhua (儿) is mainland and northern** (哪儿, 这儿, 一点儿, 一会儿, 快点儿 …). Each note gives the Taiwan form.
3. **Colloquial items** (我的妈呀, 吓死我了, 哇塞, 恶心) are fine for kids but should appear in playful contexts.
4. **Level sources:** YCT is a community transcription, checked only against Purple Culture counts. HSK uses the 2021 standard; the revised syllabus announced in late 2025 has different boundaries, so re-run the build if you switch.
5. **HSK ranks kid and game words as advanced** (厉害/棒 HSK5, 救命/哇/酷 HSK6, 蜂蜜/彩虹/吉他 7-9). They're kept on purpose; realm order follows YCT and topic.
6. **Game and fantasy words** are coined or translated (角兔, 哥布林, 蜂后, 九头蛇, 丧尸, 精灵/矮人/兽人, 魔王).
7. **Polyphones for TTS:** 还, 长, 只, 喂, 哇, 嗯, 哦, 得 (de/dé/děi), 着 (zhe/zháo), 转 (zhuǎn/zhuàn). Give the TTS explicit pinyin for these.
8. **Audio:** use zh-CN voices to match Simplified. Parent-entered items use browser TTS.
9. **Size vs targets:** v2 deliberately exceeds v1's 300–450-word target (820 words, 231 phrases), because Jack asked for a harder curriculum for 10–12-year-olds. The combat spec's pacing (§5, §7.10) is tuned to these 47–60-item pools.

