# Characters and portraits: brief for Arty (Desy, v1, 2026-10-02 PT)

These are the dialogue portraits for `scene/0.2` scenes (story.md §7, architecture.md §11.1). Style follows `enemies-art-brief.md`: painterly, soft rim light, warm palette, round friendly shapes, kid-safe. Villains look mischievous, not frightening.

## 1. Key cast (all 7 expressions)

| id | name | look | palette | notes |
|---|---|---|---|---|
| `hero` | {hero} | Two variants (`hero_a` and `hero_b`, the player picks one). Age 8–10, adventurer tunic, satchel, Granny Bai's old stick. Kept neutral so any kid can see themselves in it. | moss green, cream, brown | Gear isn't shown on the portrait (it stays the same all game) |
| `xiaolong` | 小龙 Little Dragon | Baby golden dragon, about cat-sized. Huge eyes, stubby wings, a crumb of food usually on his cheek. Grows slightly bigger in R7+ (optional `xiaolong_big` set) | gold, cream belly, red-orange cheeks | Extra expressions: `hungry`, `brave` |
| `granny_bai` | 白奶奶 Granny Bai | Small, round, silver bun with a jade hairpin, tea cup, walking stick (a carved wand with a tiny hidden glow) | white, jade, plum | Extra expression: `wink`. Her pigeon 咕咕 Gugu can sit on her shoulder |
| `fei` | 林小飞 Fei | About 11, spiky hair, oversized wooden sword, a "hero" scarf that's too long | sky blue, red scarf | Extra `smug`. In R8+ a bandage on his cheek |
| `xiaomei` | 小美 Xiaomei | Fei's little sister, about 6, pigtails, holds a toy sword | pink, blue | neutral, happy, sad, surprised |
| `pipi` | 皮皮 Pipi | Small red imp, big ears, spade tail, cheeky grin, too-large horns. Carries a jar of fog | red, purple, gold buttons | Extra `smug`. R9 `ashamed` (surrender); ending: tiny school cap |
| `madame_mist` | 雾夫人 Madame Mist | Tall and elegant, a veil made of swirling fog, potion bottles on a belt, hands always mid-flourish | lavender, grey, teal glow | She mustn't look ghostly or scary: a theatrical stage-villain |
| `general_mo` | 墨将军 General Mo | Big demon-knight in ink-black armor with a red plume. Visor up to show tired, kind eyes | black, crimson, silver | Extra `bow` (respectful) |
| `wind_dragon` | 风龙 Uncle Wind | Long serpent-like blue dragon with cloud-tufted whiskers. Head and neck only (too big for the frame) | sky blue, white | Fogged version: grey eyes (use `angry`) |
| `golden_dragon` | 金龙 Golden Dragon | 小龙's mother, head and neck. Cursed version is the shadow-cursed palette with a chain. Freed version is radiant gold | gold, warm white / cursed: indigo | Two sets: `golden_dragon_cursed`, `golden_dragon` |
| `demon_king` | 魔王 Demon King | Phase 1: towering shadow armor with crown horns. After the Bell: a small grumpy demon in oversized armor pieces | black, violet / after: pink-red | Sets `demon_king` and `demon_king_small` |

The 7 standard expressions are **neutral, happy, sad, surprised, angry, worried, thinking**.

## 2. Named realm NPCs

Each named NPC is a **generic base** (§3) with a recolor and one prop, so the portrait budget stays at about 30 bases. The ✱ NPCs are story-important and should get unique paintings if time allows.

| npc id | name | realm | base + variation |
|---|---|---|---|
| farmer_li | 李农夫 Farmer Li | 1 | farmer_m + straw hat, hoe |
| xiaoming | 小明 Xiaoming | 1 | kid_boy + carrot |
| elder_wang | 王爷爷 Grandpa Wang | 1 | elder_m |
| innkeeper_panda | 熊猫 Panda innkeeper (all inns, "cousins") | all | ✱ innkeeper_panda: apron, sleepy eyes. Each realm adds one accessory (scarf, miner hat, snow cap…) |
| grandma_wu | 吴奶奶 Grandma Wu (shop) | 1 | shopkeeper_f |
| duoduo | 朵朵 Duoduo | 2 | kid_girl + toy panda |
| granny_mi | 蜜奶奶 Granny Mi | 2 | beekeeper (elder_f + bee veil) |
| yezi | 叶子 Yezi | 2, 7, 9 | ✱ elf: leaf cloak, bow, green braid |
| queen_bee | 蜂后 Queen Bee | 2 | ✱ (reuse the enemy art as a portrait crop) |
| boss_qian | 钱老板 Boss Qian | 3 | merchant + abacus, gold cap |
| mayor_hu | 胡镇长 Mayor Hu | 3 | mayor (elder_m + sash) |
| auntie_hat, dye_maker_lan, road_warden_he, curator_bao | hat seller, dye maker, road warden, curator | 3 | shopkeeper_f / artisan / guard / scholar |
| uncle_shi | 石大叔 Uncle Shi | 4, 9 | ✱ dwarf: braided beard, mining lamp helmet |
| teacher_zhang | 张老师 Teacher Zhang | 4 | ✱ teacher: glasses, chalk, bun |
| miner_gao, lingling | Miner Gao, Lingling | 4 | dwarf_miner / kid_girl |
| grandpa_turtle | 龟爷爷 Grandpa Turtle | 5 | ✱ turtle elder with a clock on his shell |
| xiaohe, xiaohe_grandma, ferry_auntie, old_fisher | Xiaohe and Grandma, ferry auntie, old fisher | 5 | kid_girl / elder_f / sailor_f / fisher |
| dr_an | 安医生 Dr. An | 6 | ✱ doctor: white coat, herb basket |
| mayor_liu | 刘镇长 Mayor Liu (cured Zombie Mayor) | 6 | mayor + slightly green tint fading |
| cook_ma, gravekeeper_zhou, xiaohu, farmer_wang, laundry_auntie | cook, gravekeeper, boy, farmer, laundry | 6 | cook / elder_m + lantern / kid_boy / farmer_m / villager_f |
| granny_xue | 雪奶奶 Granny Xue | 7 | elder_f + snow shawl |
| mapmaker_lu, weather_sage, vet_ji | mapmaker, weather sage, vet | 7 | scholar + map / monk + windvane / doctor |
| griffin_king, griffin_mother, griffin_chick | griffins | 7 | enemy-art crops (griffin_chick gets a new chibi bust) |
| dachui | 大锤 Dachui | 8, 9 | ✱ ogre champion: huge, laurel, gap-toothed grin |
| coach_niu, singer_meimei, fan_xiaoli, troll_kid_dudu | coach, singer, fan, troll kid | 8 | guard / performer / kid_girl / troll_kid |
| grandpa_lantern, lantern_keeper_deng | lantern keepers | 9 | elder_m + lantern / villager_m |

## 3. Generic bases (26): neutral, happy, worried (+ surprised where noted)

| # | base id | description |
|---|---|---|
| 1 | innkeeper_panda | innkeeper panda (also gets surprised and sad for gags) |
| 2 | shopkeeper_f | item-shop lady, apron |
| 3 | smith | blacksmith, leather apron, hammer |
| 4 | magic_keeper | magic-shop keeper, star robe, tiny glasses |
| 5 | guard | town guard, spear, helmet |
| 6 | farmer_m | farmer, straw hat |
| 7 | villager_f | villager woman, headscarf |
| 8 | villager_m | villager man, vest |
| 9 | kid_boy | boy about 7 (+ surprised) |
| 10 | kid_girl | girl about 7 (+ surprised) |
| 11 | elder_m | grandpa, cane, beard |
| 12 | elder_f | grandma, bun, shawl |
| 13 | merchant | travelling merchant, backpack, abacus |
| 14 | bandit | bandit (calmed version is sheepish), bandana |
| 15 | scholar | scholar with scroll and ink brush |
| 16 | monk | mountain monk, prayer beads |
| 17 | fisher | fisher, conical hat, rod |
| 18 | sailor_f | ferry woman, oar |
| 19 | dwarf_miner | dwarf miner, pickaxe |
| 20 | elf | elf villager, leaf clothes |
| 21 | troll_kid | friendly little troll |
| 22 | doctor | nurse or doctor, white coat |
| 23 | cook | cook, ladle, steam |
| 24 | performer | singer or performer, ribbon |
| 25 | goblin_student | goblin student, school bag (R4 ending) |
| 26 | gugu | 咕咕 Gugu the postman pigeon, mail bag (letters) |

That makes about 11 key sets × 7 expressions plus 26 bases × 3 = about **155 images**. With variants (hero_b, golden_dragon_cursed, demon_king_small) it is about 175. Shipping order: R1 cast first (hero, xiaolong, granny_bai, farmer_li, xiaoming, pipi, innkeeper_panda).

## 4. Portrait spec (answer to GameDev §11.3 for Arty)

- **Canvas:** 512×768 px, transparent PNG master, exported to WebP (quality ~85) by the build. Framing is bust to mid-thigh, with the eye line at about 30% from the top. Leave about 24 px of transparent margin, so name plates can overlap the bottom 15%.
- **Facing:** paint every portrait in 3/4 view facing **screen-right**. The engine mirrors it for the R1/R2 slots so speakers face each other. Check that asymmetric details still read when mirrored. No text or lettering on clothing.
- **Expressions:** the same pose for all expressions of a character (only the face, hands and small props change), so swaps don't jump.
- **Delivery:** `portraits/<id>_<expression>.png` (e.g. `portraits/granny_bai_happy.png`), which the build maps to `content/assets/characters/<id>/<expression>.png`. Each character also needs a `portrait.json` with `{id, name:{zh,en}, defaultExpr, expressions:[...], mirror:true, anchorY}`.
- **Large creatures** (dragons, ogre, queen bee, griffins): head-and-shoulders crop that bleeds off the edge of the frame. Mark them with `"mirror": true` and `"big": true` so the engine can scale them up 1.2×.
- **Name plates:** names (小龙 · Little Dragon) are text drawn by the engine, not painted.
