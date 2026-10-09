# Quests v2: 50 NPC and story quests (Desy, 2026-10-02 PT; gold rescaled 22:51 PT)

This replaces the v1 design (4 town-board quests per town, 36 quests). Quests are now given by NPCs standing on world-graph nodes, and every step happens at a world-graph event. The schema is **`quest/0.2`**: GameDev's `quest/0.1` (architecture.md §11.2) plus a few fields.

- Data: `data/quests.json` (schema `data/quests.schema.json`), `data/quests.csv`. Source: `build/story/quests_def.py`. Build and check: `python3 build/story/build_quests.py` (writes everything plus `build/story/quests_tables.md`; currently 0 errors).
- Old v1 files are kept unchanged as `data/quests_v1.json` / `data/quests_v1.csv`. `data/quests_full.json` is the older v1 artifact and is **superseded**.
- Story context: `story.md`. Place names, zones and nodes: `world-graph.md` v3.8 and `data/world/`.

## 0. Decisions (director's calls 2026-10-02 22:49 PT, pending Jack)

- **The quest target counts gold only.** Quest gold ≈ 30 × G per realm (±10%). Items, gear and spells are a bonus on top. Gold rewards were rescaled to match; items, gear and spells are unchanged.
- **The free Bubble Spell reward is approved** (q2_bubble_lesson). The Honey Town shelf shows "Quest reward" while the quest is open.
- **Escorts never fail.** After a lost battle the escortee waits at the last inn.
- **Ending approved.** The Demon King shrinks to a grumpy small demon and goes to Teacher Zhang's school with Pipi (story.md).
- **The companion is 小龙**, speaker id `xiaolong`. The world-graph owner is renaming `panda` → `xiaolong` in data/world. Inn pandas are `innkeeper_panda`.
- **Names stay placeholders** until Jack picks.

## 1. Design rules

1. **50 quests**: R1 3, R2 4, R3 5, R4 5, R5 6, R6 6, R7 7, R8 7, R9 7. Sized to the NPC slots in `quests_world.json` (v3.9: 55 slots, 29 quest hooks + 26 ambient), with more weight on later realms. 15 are main-story quests (they unlock or carry the realm arc) and 35 are side quests.
2. **Types** (mixed in every realm from R3 on): fetch 13, slay 11, rescue 8, find 7, deliver 6, escort 5.
3. **Placement.** Realm 1 uses real `realm_1.json` node and edge ids. Realms 2–9 use `{zone, nodeKind, position}` and, where a generated hook exists, `ref` = the hook's giver node (e.g. `great_hive_1/npc_1`), so the content survives graph regeneration.
4. **Words.** Each quest lists 4–6 curriculum items used in its scenes. All are met by the time the quest becomes available (the quest zone's pool, plus the next zone if the quest requires that zone's boss).
5. **No timers, no failure, no repeats.** Escorts never fail (decision §0): after a lost battle the escortee waits at the last inn. An active quest can be dropped and re-taken at the giver.
6. **Every quest has three scenes**: `sc_<id>_offer`, `sc_<id>_wait` (the progress line), `sc_<id>_thanks`. `sc_q1_hoe_offer` and `sc_q1_hoe_thanks` are written as samples.

## 2. Schema (`quest/0.2`): differences from GameDev `quest/0.1`

| field | 0.1 (GameDev) | 0.2 (here) |
|---|---|---|
| `giver` | `{npc, graph, node}` or `{board}` | same, plus `zone`/`nodeKind`/`position`/`ref` for generated realms. `alsoOnBoard` is kept (false everywhere for now). |
| `turnIn` | `"giver"` / `"auto"` | also `{npc, graph|zone, node|nodeKind}` for "hand in to someone else". `returnToGiver` bool added for the UI. |
| `objectives` | kill, collect, reach, talk, words, deliver | the same six, plus **`escort`** (new: `{npc, to}`, the escortee follows and joins battles as a non-target). Each objective is wrapped as `{id, event, objective, where, note}`, where `event` is the world-graph outcome that triggers it. My original step verbs are kept as `desyType`: pickup → `collect` (`source: nodeItem`), fight/boss → `kill`, turn_in → `talk` with `turnIn: true`. |
| `order` | any / sequence | `sequence` for all 50 quests |
| `rewards` | gold {G}, exp, items, gear, skills, spells, flags, cosmetics | same keys. `exp` is `{L}` (EXP = L × L_rec). Gear entries are `{id: shield_t3_fine, tier, slot, rarity, zh, en, stat, value, perk}` using gear.csv names. Computed values are added: `goldValue`, `expValue`, `valueG`, `spellValueGold`. |
| new | | `realm`, `zone`, `pool`, `story` (main/side), `type`, `words`, `summary`, `hook` (quests_world id) |

States are unchanged: locked → available → active → ready → completed.

**Step event → world outcome → objective:**

| step event | world-graph outcome | typical objective |
|---|---|---|
| quest_offer | `quest_offer` at the giver's node (`offerQuest` action) | talk |
| story | `story` (scene) | reach / talk |
| item, treasure | `item` / `treasure` (`openChest`), gated by `questActive` | collect (pickup) |
| miniboss | `miniboss` node clear | kill |
| boss | zone boss clear (`bossDefeated`) | kill |
| edge_battle | random battle on listed edges | collect (`dropFrom`, `dropChance`) or kill (count) |
| portal | `portal` (dungeon entry) | reach |
| nothing | plain node | reach / escort / deliver |

## 3. Rewards vs target

Target per realm: **quest gold = 30 × G** (±10%). This is **gold only** (decision §0); combat-spec §7.11 has quests at ≈ 15% of all gold income. Everything else is a **bonus** on top and is reported separately:
- items at shop G value (honey 1, big honey 2, mana tea 6, big mana tea 15, Return Feather 2: v3.9 prices it at 2 × G, the same as an inn night);
- gear at the common shop price × 1.15 (fine) or × 1.3 (heroic);
- spells at shop price;
- skills (Heal, Second Wind), which have no gold value.

EXP is L × L_rec, with L 10–30 per quest. The build fails if a realm's quest gold is outside ±10%.

| realm | G | quests | types | gold | gold (× G) | target 30 × G | gold vs target | flag | bonus: items (gold value) | bonus: gear (gold value) | bonus: spells (shop gold) | skills |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 Starter Meadow | 6 | 3 | fetch 1, find 1, slay 1 | 180 | 30 | 180 | 100% | ok | 24 | – | – | – |
| 2 Honeycomb Forest | 12 | 4 | fetch 3, find 1 | 360 | 30 | 360 | 100% | ok | 108 | – | 540 | heal |
| 3 Crossroads Market | 18 | 5 | escort 1, fetch 1, find 1, rescue 1, slay 1 | 540 | 30 | 540 | 100% | ok | 72 | 150 | – | – |
| 4 Goblin Caves | 27 | 5 | deliver 1, fetch 1, find 1, rescue 1, slay 1 | 810 | 30 | 810 | 100% | ok | 135 | 264 | – | – |
| 5 Hydra Swamp | 36 | 6 | deliver 1, escort 1, fetch 1, rescue 1, slay 2 | 1080 | 30 | 1080 | 100% | ok | 144 | 507 | – | – |
| 6 Zombie Lands | 45 | 6 | deliver 1, fetch 1, find 1, rescue 2, slay 1 | 1350 | 30 | 1350 | 100% | ok | 135 | 621 | – | – |
| 7 Griffin Peaks | 54 | 7 | deliver 1, escort 1, fetch 2, rescue 1, slay 2 | 1620 | 30 | 1620 | 100% | ok | 810 | – | 1080 | – |
| 8 Ogre Colosseum | 63 | 7 | deliver 1, escort 1, fetch 1, find 1, rescue 1, slay 2 | 1890 | 30 | 1890 | 100% | ok | 252 | 966 | – | – |
| 9 Demon King's Castle | 72 | 7 | deliver 1, escort 1, fetch 2, find 1, rescue 1, slay 1 | 2160 | 30 | 2160 | 100% | ok | 576 | – | – | second_wind |
| **all** | | **50** | | **9990** | | **9990** | **100%** | | 2256 | 2508 | 1620 | |
**Notes:**
- Quest gold now totals **9,990 gold = 100% of target** in every realm. Before the rescale it was 6,213 (62%), because items and gear were counted toward the target.
- Bonus on top: items 2,256 (was 1,908 before the v3.9 feather price), gear 2,508, spells 1,620. That is +64% of target in total, but most of it is consumables and gear the kid would otherwise buy.
- Five quests pay 0 gold because their reward is a spell or gear: q2_bubble_lesson (Bubble Spell), q5_fog_bottle (heroic 龟壳盾 Turtle-Shell Shield), q6_knight_dad (fine t6 shield), q7_glacier_roses (Snowball Volley), q8_fire_demon (fine t8 shield).
- **Bubble Spell** (approved): worth 540 gold, given free.
- **Snowball Volley**: worth 1,080 gold. It is a town-3 spell, so a kid who already owns it gets 1,080 gold instead. That gold sits outside the 30 × G target.
- Gear rewards: fine shields at t3, t4, t6 and t8, plus the heroic t5 shield (perk proposal: the first broken block each battle leaks 1 less).

## 4. Turn-in (answer to architecture.md §11.3)

- **Back to the giver:** 41 quests.
- **Hand in to someone else** (8): q1_carrot → Xiaoming in the village. q3_caravan → Boss Qian. q4_free_classmates → Uncle Shi. q4_school_bell → Teacher Zhang. q5_escort_xiaohe → Xiaohe's grandma. q7_lost_mapmaker → mapmaker Lu (Cloud Ridge). q7_griffin_chick → the griffin mother (griffin_spire_3 npc). q9_pipi_surrender → Granny Bai.
- **Auto** (1): q8_singer_escort completes when the singer reaches the arena.

## 5. All 50 quests

| id | realm · zone | type | giver | title | steps (event:objective) | back to giver | rewards | value (× G) | words |
|---|---|---|---|---|---|---|---|---|---|
| `q1_bounty` | 1 · meadow | slay | farmer_li | 赶走角兔 Rabbits in the Cabbages | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 48 g, 30 EXP, 1× Honey Potion | 9.0 | 你好 谢谢 多少 几 请 |
| `q1_hoe` | 1 · meadow | find | farmer_li | 找回锄头 The Lost Hoe | quest_offer:talk → story:reach → item:collect → quest_offer:talk | yes | 42 g, 20 EXP, 1× Honey Potion | 8.0 | 什么 哪儿 这里 那里 谢谢 |
| `q1_carrot` | 1 · warren | fetch | xiaoming | 金萝卜 The Golden Carrot Thief | quest_offer:talk → miniboss:kill → item:collect → quest_offer:talk | to xiaoming | 90 g, 40 EXP, 1× Return Feather | 17.0 | 救命 小心 快跑 朋友 帮忙 兔子 |
| `q2_lost_panda` | 2 · forest | find | duoduo | 找熊猫 Duoduo's Lost Panda | quest_offer:talk → story:reach → item:collect → quest_offer:talk | yes | 108 g, 40 EXP, 1× Honey Potion | 10.0 | 熊猫 森林 树 花 ……在哪儿 谢谢 |
| `q2_spider_silk` | 2 · forest | fetch | granny_mi | 收集蜘蛛丝 Silk for the Bee Veils | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 132 g, 60 EXP, 2× Honey Potion | 13.0 | 蜂蜜 渴 甜 好吃 饿 |
| `q2_bubble_lesson` | 2 · forest | fetch | granny_bai | 白奶奶的泡泡课 Granny Bai's Bubble Lesson | quest_offer:talk → item:collect → quest_offer:words → quest_offer:talk | yes | 0 g, 60 EXP, spell **Bubble Spell 泡泡术** | 0.0 | 吃 喝 水 甜 尝一尝 |
| `q2_royal_jelly` | 2 · great_hive | fetch | yezi | 蜂后的蜂王浆 The Queen's Stolen Jelly | quest_offer:talk → miniboss:kill → story:collect → boss:kill → quest_offer:talk | yes | 120 g, 100 EXP, 1× Mana Tea, skill **heal** | 16.0 | 要 给 请给我…… 不要 所以 因为 |
| `q3_rescue_fei` | 3 · crossroads_highway | rescue | xiaomei | 救小飞 Fei and the Bandit Cave | quest_offer:talk → story:reach → miniboss:kill → story:talk → quest_offer:talk | yes | 90 g, 150 EXP, Fine Round Shield | 13.3 | 多少钱 一共 钱 钱包 救命 朋友 |
| `q3_stolen_hats` | 3 · crossroads_highway | fetch | auntie_hat | 找帽子 Hats Off! | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 108 g, 90 EXP, 1× Honey Potion | 7.0 | 买 卖 商店 东西 颜色 |
| `q3_caravan` | 3 · crossroads_highway | escort | boss_qian | 护送马车 The Toy Caravan | quest_offer:talk → edge_battle:escort → story:reach → quest_offer:deliver | to boss_qian | 108 g, 90 EXP, 1× Return Feather | 8.0 | 贵 便宜 太贵了 便宜一点儿吧 玩具 一共 |
| `q3_lost_wallet` | 3 · night_bazaar | find | grandpa_lantern | 钱包不见了 The Wallet in the Cellar | quest_offer:talk → treasure:reach → miniboss:kill → item:collect → quest_offer:talk | yes | 144 g, 120 EXP, 1× Honey Potion | 9.0 | 钱包 红色 大 小 旧 大小 |
| `q3_slime_rainbow` | 3 · night_bazaar | slay | dye_maker_lan | 彩虹史莱姆 Slime Rainbow | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 90 g, 90 EXP | 5.0 | 红色 黄色 蓝色 绿色 粉色 紫色 |
| `q4_lost_schoolbag` | 4 · cave_mouth | find | xiaohu | 书包在哪儿 Xiaohu's Schoolbag | quest_offer:talk → portal:reach → item:collect → quest_offer:talk | yes | 189 g, 135 EXP, 1× Honey Potion | 8.0 | 书包 书 笔 铅笔 孩子 |
| `q4_glow_moss` | 4 · cave_mouth | fetch | uncle_shi | 石大叔的灯 Uncle Shi's Lamps | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 243 g, 135 EXP, 1× Honey Potion | 10.0 | 叔叔 孩子 小朋友 老师 |
| `q4_free_classmates` | 4 · crystal_tunnels | rescue | teacher_zhang | 救同学 Three Kids in the Crystal Tunnels | story:collect → story:talk → miniboss:kill → story:talk → quest_offer:talk | to uncle_shi | 108 g, 225 EXP, Fine Stone Shield | 13.8 | 同学 学生 老师 请再说一遍 我有问题 安静 |
| `q4_homework` | 4 · goblin_school | slay | teacher_zhang | 作业回来了 Homework Rescue | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 135 g, 135 EXP, 1× Honey Potion | 6.0 | 作业 考试 作弊 赢 输 不公平 |
| `q4_school_bell` | 4 · goblin_school | deliver | uncle_shi | 新学校的钟 A Bell for a Real School | quest_offer:talk → portal:reach → quest_offer:deliver | to teacher_zhang | 135 g, 180 EXP, 1× Return Feather | 7.0 | 学校 老师好 上课 下课 学习 帮助 |
| `q5_invitations` | 5 · misty_marsh | deliver | grandpa_turtle | 生日请帖 Grandpa Turtle's Birthday Invitations | quest_offer:talk → quest_offer:deliver → quest_offer:deliver → quest_offer:deliver → quest_offer:talk | yes | 216 g, 240 EXP, 1× Big Honey | 8.0 | 生日 年 月 号 星期 几点 |
| `q5_muddy_road` | 5 · misty_marsh | slay | ferry_auntie | 别迟到 Mud on the School Road | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 216 g, 180 EXP | 6.0 | 迟到 准时 早上 点 马上 |
| `q5_escort_xiaohe` | 5 · misty_marsh | escort | xiaohe | 送小荷回家 Xiaohe in the Mist | quest_offer:talk → edge_battle:escort → story:reach → quest_offer:talk | to xiaohe_grandma | 216 g, 180 EXP, 1× Honey Potion | 7.0 | 一会儿 现在 以后 以前 刚才 晚上 |
| `q5_pocket_watches` | 5 · hydra_s_lair | fetch | grandpa_turtle | 怀表 Tick-Tock Lizards | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 216 g, 180 EXP | 6.0 | 分钟 小时 时间 刻 现在几点 |
| `q5_lost_fishers` | 5 · hydra_s_lair | rescue | old_fisher | 迷路的渔夫 Two Sons in the Lair | quest_offer:talk → story:talk → story:talk → miniboss:kill → quest_offer:talk | yes | 216 g, 300 EXP, 1× Honey Potion | 7.0 | 半天 小时 时候 后来 从前 |
| `q5_fog_bottle` | 5 · hydra_s_lair | slay | grandpa_turtle | 雾瓶 Madame Mist's Fog Bottle | quest_offer:talk → portal:reach → miniboss:kill → item:collect → quest_offer:talk | yes | 0 g, 360 EXP, Turtle-Shell Shield | 14.1 | 虽然……但是…… 如果……就…… 先……然后…… 一……就…… 已经 |
| `q6_medicine_herbs` | 6 · gloomy_village | fetch | dr_an | 找草药 Herbs for Dr. An | quest_offer:talk → item:collect → story:reach → quest_offer:talk | yes | 360 g, 300 EXP | 8.0 | 药 医生 生病 休息 担心 别担心 |
| `q6_hot_soup` | 6 · gloomy_village | deliver | cook_ma | 送热汤 Hot Soup Rounds | quest_offer:talk → quest_offer:deliver → quest_offer:deliver → quest_offer:deliver → quest_offer:talk | yes | 225 g, 225 EXP, 1× Honey Potion | 6.0 | 汤 你怎么了 你没事吧 我头疼 没事 开心 |
| `q6_old_mine` | 6 · gloomy_village | rescue | miner_gao | 老矿井 Trapped in the Old Mine | portal:reach → quest_offer:talk → miniboss:kill → story:reach → quest_offer:talk | yes | 315 g, 375 EXP, 1× Honey Potion | 8.0 | 害怕 我很害怕 别怕 怕 受伤 我受伤了 |
| `q6_lost_dog` | 6 · moonlit_graveyard | find | gravekeeper_zhou | 小黑去哪儿了 Where's Blackie? | quest_offer:talk → nothing:reach → story:collect → quest_offer:talk | yes | 225 g, 225 EXP, 1× Honey Potion | 6.0 | 狗 找 找到 看见 回来 抱 |
| `q6_rattle_bones` | 6 · moonlit_graveyard | slay | gravekeeper_zhou | 吵闹的骷髅 Too Much Rattling | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 225 g, 225 EXP | 5.0 | 掉 扔 放 拿 打开 |
| `q6_knight_dad` | 6 · moonlit_graveyard | rescue | lingling | 骑士爸爸 Cure My Dad, the Knight | quest_offer:talk → story:reach → miniboss:kill → quest_offer:talk | yes | 0 g, 450 EXP, Fine Silver Shield | 13.8 | 爸爸 你好点儿了吗 舒服 治好 变 他变成了丧尸 |
| `q7_glacier_roses` | 7 · windy_cliffs | fetch | granny_xue | 三朵冰川玫瑰 Three Glacier Roses | quest_offer:talk → item:collect → portal:reach → item:collect → miniboss:kill → item:collect → quest_offer:talk | yes | 0 g, 450 EXP, spell **Snowball Volley 雪球术** | 0.0 | 冰 雪 下雪 冷 花 山 |
| `q7_lost_mapmaker` | 7 · windy_cliffs | escort | mapmaker_lu | 我迷路了 The Lost Map-Maker | quest_offer:talk → story:reach → edge_battle:escort → quest_offer:talk | to mapmaker_lu | 216 g, 270 EXP, 2× Return Feather | 8.0 | 我迷路了 迷路 地图 往左走 往右走 一直走 |
| `q7_harpy_socks` | 7 · windy_cliffs | slay | laundry_auntie | 鹰身女妖 Harpies on the Washing Line | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 216 g, 270 EXP, 1× Honey Potion | 5.0 | 上 下 上边 下边 远 近 |
| `q7_golem_sign` | 7 · windy_cliffs | slay | road_warden_he | 一直走的石头人 The Golem Who Only Walks Straight | quest_offer:talk → miniboss:kill → item:collect → quest_offer:talk | yes | 324 g, 360 EXP, 1× Honey Potion | 7.0 | 一直走 路口 东 西 南 北 |
| `q7_griffin_feathers` | 7 · griffin_summit | fetch | yezi | 狮鹫羽毛 Shed Griffin Feathers | quest_offer:talk → item:collect → quest_offer:talk | yes | 216 g, 270 EXP, 1× Honey Potion | 5.0 | 羽毛 飞 云 风 天空 |
| `q7_griffin_chick` | 7 · griffin_summit | rescue | griffin_chick | 小狮鹫回家 A Chick Far From the Nest | quest_offer:talk → miniboss:kill → edge_battle:escort → quest_offer:talk | to griffin_mother | 486 g, 450 EXP, 1× Mana Tea | 15.0 | 下去 上来 进去 出来 回去 到了 |
| `q7_forecast` | 7 · griffin_summit | deliver | weather_sage | 天气预报 Tomorrow's Weather | quest_offer:talk → quest_offer:deliver → quest_offer:deliver → quest_offer:talk | yes | 162 g, 270 EXP, 1× Return Feather | 5.0 | 天气预报 明天会下雨吗 天气 下雨 晴 打雷 |
| `q8_fire_demon` | 8 · training_pits | slay | farmer_wang | 火魔烧庄稼 The Fire Demon in the Wheat | quest_offer:talk → story:reach → miniboss:kill → quest_offer:talk | yes | 0 g, 525 EXP, Fine Tower Shield | 15.3 | 跳舞 跳 运动 努力 我们去玩吧 |
| `q8_lost_ball` | 8 · training_pits | find | troll_kid_dudu | 足球在哪儿 Ball Over the Wall | quest_offer:talk → portal:reach → item:collect → quest_offer:talk | yes | 252 g, 315 EXP, 1× Honey Potion | 5.0 | 足球 踢足球 打球 跳 我们去玩吧 |
| `q8_training` | 8 · training_pits | slay | coach_niu | 训练 Coach Niu's Drills | quest_offer:talk → edge_battle:kill → quest_offer:talk | yes | 252 g, 315 EXP, 1× Honey Potion | 5.0 | 训练 教练 练 努力 坚持 对手 |
| `q8_bronze_medals` | 8 · grand_colosseum | fetch | curator_bao | 铜奖牌 Medals for the Museum | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 378 g, 315 EXP | 6.0 | 冠军 第一名 胜利 失败 成功 |
| `q8_fan_letters` | 8 · grand_colosseum | deliver | fan_xiaoli | 球迷的信 Fan Mail for Dachui | quest_offer:talk → portal:reach → quest_offer:deliver → quest_offer:talk | yes | 252 g, 315 EXP, 1× Return Feather | 6.0 | 球迷 明星 真的吗 太棒了 恭喜 |
| `q8_singer_escort` | 8 · grand_colosseum | escort | singer_meimei | 开幕歌手 The Opening Song | quest_offer:talk → miniboss:kill → edge_battle:escort → story:reach | auto | 378 g, 525 EXP | 6.0 | 唱歌 歌 歌手 观众 表演 加油 |
| `q8_caged_beasts` | 8 · training_pits | rescue | vet_ji | 放动物出来 Open the Beast Pens | quest_offer:talk → portal:reach → miniboss:kill → story:reach → quest_offer:talk | yes | 378 g, 525 EXP | 6.0 | 大象 老虎 马 动物 跑步 |
| `q9_pact_elves` | 9 · demon_king_s_gate | find | yezi | 精灵的宝石 The Elves' Moonstone | quest_offer:talk → portal:reach → miniboss:kill → story:collect → quest_offer:talk | yes | 360 g, 720 EXP, 1× Big Honey | 7.0 | 认为 同意 我觉得…… 相信 其实 |
| `q9_pact_dwarves` | 9 · demon_king_s_gate | fetch | uncle_shi | 矮人的水晶 Shadow Crystals for the Forge | quest_offer:talk → edge_battle:collect → quest_offer:talk | yes | 288 g, 480 EXP, 1× Honey Potion | 5.0 | 只要……就…… 办法 好主意 必须 主意 |
| `q9_pact_beastfolk` | 9 · throne_hall | slay | dachui | 兽人的战斗 Side by Side with Dachui | quest_offer:talk → edge_battle:kill → story:reach → quest_offer:talk | yes | 288 g, 480 EXP, 1× Honey Potion | 5.0 | 兽人 人类 不但……而且…… 勇敢 团结 合作 |
| `q9_dragonlings` | 9 · demon_king_s_gate | rescue | wind_dragon | 救小龙们 The Caged Dragonlings | quest_offer:talk → story:talk → story:talk → miniboss:kill → story:talk → quest_offer:talk | yes | 432 g, 720 EXP, 1× Big Honey | 8.0 | 救 除了……以外 于是 终于 最后 |
| `q9_second_wind` | 9 · demon_king_s_gate | fetch | granny_bai | 白奶奶最后一课 Granny Bai's Last Lesson | quest_offer:talk → treasure:collect → quest_offer:words → quest_offer:talk | yes | 216 g, 720 EXP, skill **second_wind** | 3.0 | 不要放弃 放弃 勇敢 就算 一定 |
| `q9_pipi_surrender` | 9 · throne_hall | escort | pipi | 皮皮投降 Pipi Gives Up | quest_offer:talk → edge_battle:escort → quest_offer:talk | to granny_bai | 288 g, 480 EXP | 4.0 | 投降 逃跑 秘密 真相 坏人 |
| `q9_lanterns` | 9 · demon_king_s_gate | deliver | lantern_keeper_deng | 灯火 Light Every Lantern | quest_offer:talk → quest_offer:deliver → quest_offer:deliver → quest_offer:deliver → quest_offer:talk | yes | 288 g, 360 EXP, 1× Return Feather | 6.0 | 为了 否则 应该 可能 因此 |

## 6. Reconciliation with `quests_world.json` (world graph v3.9, final)

The v3.9 world has **55 NPC slots**:
- **29 quest hooks** (`status: quest`). Each lists its quest ids, and every one of those ids exists in quests.json.
- **26 ambient slots** (`status: ambient`, one banter line each).

The other 24 quests are offered at town, village or story nodes (`giverAt` zone + node kind) rather than at an NPC slot. The build checks every `ref` against the current graphs.

Story beats are played with the new v3.9 event action **`scene`**, which loads `data/dialogue/<id>.json`. Quest scenes (`sc_<id>_offer` / `_thanks`) are started by `offerQuest` and by turn-in.

Re-pointed after the world regenerations:
- **q6_hot_soup:** the second villager moved to the `realm_6/town_2` village.
- **q6_rattle_bones:** a follow-up quest on the gravekeeper hook `q6_moonlit_crypt_1_npc_1`, shared with q6_lost_dog.
- **q8_singer_escort:** the singer moved to `undercroft_1/npc_2`.
- **q6_old_mine:** back on its v3.9 hook `q6_old_mine_1_npc_1`.
- **q8_caged_beasts:** the pen-keeper fight moved from `beast_pens_1/miniboss_1`, which is a campfire **inn** in v3.9, to the dead end `beast_pens_1/deadend_3` (waypoint, off `inn_1`). The cage step moved to `beast_pens_2/deadend_1`. The beast_pens graphs have no miniboss-kind node. **World-graph follow-up:** its quest event `miniboss_1.1` (cond `questActive q8_caged_beasts`) sits on the inn. Move it to `deadend_3` as a quest-gated `fight` (outcome `miniboss`), or change `miniboss_1`'s kind to `miniboss`.
- **q8_caged_beasts giver (v3.9.1):** realm 8 has only two villages, so `outpost_3` does not exist. Vet Ji now gives and takes the quest at **`outpost_2`**, which resolves to `realm_8/town_3`, Arena Town outpost 2, right next to the Beast Pens door `portal_2`. The giver is given by position only, like the other town and village givers. If the world graph wants an explicit `offerQuest q8_caged_beasts`, put it on `realm_8/town_3`.
- **q3_slime_rainbow giver:** the `night_bazaar` overworld has no village (only the dungeon door `portal_1`). The dye-maker's stall moved to Crossroads Market (`crossroads_highway` `entry_town`), and the quest unlocks after the `crossroads_highway` boss. The quest stays in the `night_bazaar` zone, so its colour words (L3.2) are met in time, and the slimes are still fought anywhere in realm 3.
- **q6_hot_soup:** the second villager's position `branch` is now `outpost_1` (`realm_6/town_2`).
- **New build check:** every town or village position must exist in `realm_<n>.json`. `entry_town` must be the realm's town. `outpost_k` must be the k-th village of that zone. A plain `outpost` is allowed only when the zone has exactly one village.

| hook (quests_world.json) | giver node | used by | note |
|---|---|---|---|
| `q1_hoe` | `realm_1/m_farm` | q1_hoe (giver hook) | replaced by q1_hoe |
| `q1_carrot` | `realm_1/w_path` | q1_carrot (giver hook) | replaced by q1_carrot |
| `q2_great_hive_1_npc_1` | `great_hive_1/npc_1` | q2_royal_jelly (giver hook) | replaced by q2_royal_jelly |
| `q3_bazaar_cellars_1_npc_1` | `bazaar_cellars_1/npc_1` | q3_lost_wallet (giver hook) | replaced by q3_lost_wallet |
| `q4_goblin_caves_1_npc_1` | `goblin_caves_1/npc_1` | q4_glow_moss (giver hook) | replaced by q4_glow_moss |
| `q4_goblin_caves_3_story_1` | `goblin_caves_3/story_1` | q4_homework (step talk) | replaced by q4_homework |
| `q4_goblin_caves_2_story_1` | `goblin_caves_2/story_1` | q4_free_classmates (step pickup) | replaced by q4_free_classmates |
| `q5_realm_5_npc_1` | `realm_5/npc_1` | q5_escort_xiaohe (giver hook) | replaced by q5_escort_xiaohe |
| `q5_hydra_lair_1_npc_1` | `hydra_lair_1/npc_1` | q5_invitations (step deliver), q5_lost_fishers (giver hook) | replaced by q5_invitations |
| `q5_hydra_lair_1_npc_2` | `hydra_lair_1/npc_2` | q5_lost_fishers (step talk) | replaced by q5_lost_fishers |
| `q5_hydra_lair_1_npc_3` | `hydra_lair_1/npc_3` | q5_lost_fishers (step talk) | replaced by q5_lost_fishers |
| `q6_moonlit_crypt_1_npc_1` | `moonlit_crypt_1/npc_1` | q6_lost_dog (giver hook), q6_rattle_bones (giver hook) | replaced by q6_lost_dog |
| `q6_moonlit_crypt_2_npc_1` | `moonlit_crypt_2/npc_1` | q6_knight_dad (giver hook) | replaced by q6_knight_dad |
| `q6_realm_6_npc_1` | `realm_6/npc_1` | q6_hot_soup (step deliver) | replaced by q6_hot_soup |
| `q6_moonlit_crypt_2_npc_2` | `moonlit_crypt_2/npc_2` | q6_knight_dad (step turn_in) | replaced by q6_knight_dad |
| `q6_old_mine_1_npc_1` | `old_mine_1/npc_1` | q6_old_mine (giver hook) | replaced by q6_old_mine |
| `q7_realm_7_npc_1` | `realm_7/npc_1` | q7_lost_mapmaker (giver hook) | replaced by q7_lost_mapmaker |
| `q7_griffin_spire_1_npc_1` | `griffin_spire_1/npc_1` | q7_griffin_feathers (giver hook) | replaced by q7_griffin_feathers |
| `q7_griffin_spire_2_npc_1` | `griffin_spire_2/npc_1` | q7_griffin_chick (giver hook) | replaced by q7_griffin_chick |
| `q7_griffin_spire_3_npc_1` | `griffin_spire_3/npc_1` | q7_griffin_chick (step turn_in) | replaced by q7_griffin_chick |
| `q7_realm_7_npc_2` | `realm_7/npc_2` | q7_golem_sign (giver hook) | replaced by q7_golem_sign |
| `q7_realm_7_npc_3` | `realm_7/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q7_realm_7_npc_4` | `realm_7/npc_4` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q7_cloud_caves_1_npc_1` | `cloud_caves_1/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q7_realm_7_npc_5` | `realm_7/npc_5` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q7_realm_7_npc_6` | `realm_7/npc_6` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q7_cloud_caves_1_npc_2` | `cloud_caves_1/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_undercroft_2_npc_1` | `undercroft_2/npc_1` | q8_bronze_medals (giver hook) | replaced by q8_bronze_medals |
| `q8_realm_8_npc_1` | `realm_8/npc_1` | q8_lost_ball (giver hook) | replaced by q8_lost_ball |
| `q8_realm_8_npc_2` | `realm_8/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_undercroft_1_npc_1` | `undercroft_1/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_undercroft_1_npc_2` | `undercroft_1/npc_2` | q8_singer_escort (giver hook) | replaced by q8_singer_escort |
| `q8_realm_8_npc_3` | `realm_8/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_undercroft_1_npc_4` | `undercroft_1/npc_4` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_beast_pens_1_npc_1` | `beast_pens_1/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_realm_8_npc_4` | `realm_8/npc_4` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_realm_8_npc_5` | `realm_8/npc_5` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q8_undercroft_3_npc_1` | `undercroft_3/npc_1` | q8_fan_letters (step deliver) | replaced by q8_fan_letters |
| `q8_undercroft_1_npc_5` | `undercroft_1/npc_5` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_realm_9_npc_1` | `realm_9/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_2_npc_1` | `demon_castle_2/npc_1` | q9_dragonlings (step talk) | replaced by q9_dragonlings |
| `q9_demon_castle_4_npc_1` | `demon_castle_4/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_3_npc_1` | `demon_castle_3/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_realm_9_npc_2` | `realm_9/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_shadow_vault_1_npc_1` | `shadow_vault_1/npc_1` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_2_npc_2` | `demon_castle_2/npc_2` | q9_pipi_surrender (giver hook) | replaced by q9_pipi_surrender |
| `q9_demon_castle_2_npc_3` | `demon_castle_2/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_4_npc_2` | `demon_castle_4/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_3_npc_2` | `demon_castle_3/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_1_npc_1` | `demon_castle_1/npc_1` | q9_dragonlings (step talk) | replaced by q9_dragonlings |
| `q9_demon_castle_4_npc_3` | `demon_castle_4/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_shadow_vault_1_npc_2` | `shadow_vault_1/npc_2` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_realm_9_npc_3` | `realm_9/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_3_npc_3` | `demon_castle_3/npc_3` | – | free NPC slot: ambient/story NPC (see story.md §4) or a future quest |
| `q9_demon_castle_1_npc_2` | `demon_castle_1/npc_2` | q9_dragonlings (step talk) | replaced by q9_dragonlings |

## 7. Supersession notes

- v1 (`quests_v1.*`, `quests_full.json`): town-board quests, 4 per town. Superseded. Its reward rule (≈ 30 × G per realm) is kept.
- The `docs/data/spells/quests.csv` row in repo-manifest.md now points to the v2 `data/quests.csv`. See the manifest.
- The combat-spec mentions a "Honeycomb quest" (Heal) and a "Castle quest" (Second Wind): these are **q2_royal_jelly** and **q9_second_wind**.
