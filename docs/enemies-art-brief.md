# Enemy Art Brief (50 enemies)

Generated from `enemies.json` (2026-09-28 PT). Grouped by realm, **P1 (realms 1–2, prototype) first**. Size is relative to the hero’s standing height (hero = 1.0). 
Every enemy needs 4 core animations: **idle** (loop), **attack**, **hit**, **defeat**. “Extra” lists any additional state.

**Global style rules (ages 10–12; Jack’s tone decision 2026-09-28):** detailed **painterly** fantasy style, less cartoony, matching the approved style anchor and Arty’s batch-1 sprites. Every enemy is **clearly hostile**: menacing eyes, aggressive stance, bared teeth, fangs, claws or stingers. Keep the personality props (goggles, pirate bandana, grandma nightgown, honey pot, nightcaps, crowns). **Kid-safe:** no blood, gore, wounds or realistic weapons (blunt, padded or fantasy); defeats never show death: enemies flee, retreat, get cured, go dormant, or vanish in smoke/sparkles. Western fantasy look by default; the only Asian-style creatures are the dragons (Chinese-style long dragons), because 龙 is positive (wild or corrupted in battle, allies later). The horned rabbit family always has exactly ONE horn and red eyes (the Swift Horned Rabbit’s horn is a yellow lightning bolt); never a white bunny or a pet. Zombies are **sick villagers** (Western-style 丧尸, not the Chinese hopping 僵尸): green-tinged skin, glowing eyes, bandages, no rot. Enemies face screen-LEFT (the hero stands on the left, max 3 enemies on screen). Sprite sheets: see `art/sprites/README.md` (7-frame strips: idle ×2, attack wind-up/strike/recover, hurt, hurt-flash).

| Size tier | Height vs hero | Examples |
|---|---|---|
| small | 0.4–0.75× | Horned Rabbit, Slime, Cave Bat, Imp |
| medium | 0.6–1.2× | Giant Bee, Road Bandit, Zombie, Harpy |
| large | 1.3–1.8× | Big Grey Wolf, Greedy Bear, Griffin, Minotaur |
| huge | 1.8–3× (may overflow the frame top) | Queen Bee, Hydra, Wind Dragon, Demon King |


---

# P1: realms 1–2 (prototype, needed first)


## Realm 1: Starter Meadow (新手草原)

Locations: L1.1 Village Meadow (村边草地), L1.2 Clover Hills (三叶草山坡), L1.3 Horned Rabbit Warren (角兔窝)


### Horned Rabbit · 角兔 (角兔, jiǎotù)

- **Role:** normal · L1.1 Village Meadow · Lv 1
- **Size:** small (~0.45× hero)
- **Sprite:** `art/sprites/rabbit.png` (drawn; brief matches it)
- **Prototype id:** `rabbit`
- **Art brief:** Feral wild rabbit with scruffy, matted gray-brown fur, crouched low and ready to spring. Exactly ONE sharp ivory horn juts from the center of its forehead. Glowing red eyes, ears swept back, bared buck teeth in a snarl, big clawed hind feet. It is a pest monster, never a white bunny or a pet.
- **Attack pose reference:** Horn Bonk (角角撞): Wiggles its nose, says hi, then bonks your shin with its little horn.
- **Animations:** idle: low crouch, hackles bristling, nose twitch, ears flatten; attack: coils back, lunges horn-first, recovers into the crouch; hit: recoils with a squeal, fur puffed out; defeat: tumbles, then bolts off into the grass.
- **Variants:** Darker brown and dusty-gray palette swaps. Always ONE horn and red eyes.

### Mushroom Imp · 蘑菇小妖 (蘑菇小妖, mógu xiǎoyāo)

- **Role:** normal · L1.1 Village Meadow · Lv 1
- **Size:** small (~0.55× hero)
- **Sprite:** `art/sprites/mushroom.png` (drawn; brief matches it)
- **Prototype id:** `mushroom`
- **Art brief:** Squat imp whose head is a broad red toadstool cap with cream spots. Knobbly tan skin, pot belly, long clawed fingers and toes. Burning yellow eyes under a heavy brow and a wide snarl of jagged teeth. Hunched forward with claws out, spoiling for a fight.
- **Attack pose reference:** Spore Puff (孢子喷喷): Pops out of the grass asking “谁?” (who’s there?), then puffs a sneezy cloud of sparkly spores.
- **Animations:** idle: hunched sway, cap bobbing, claws flexing; attack: rears back, then a cap headbutt or spore punch that bursts into a spore cloud; hit: cap wobbles, winces; defeat: shrivels and sinks into the soil in a puff of spores. Extra: doze (skip turn) = slumps with a grumbling snore, one eye still open.
- **Variants:** Blue-cap variant for L1.2.

### Wolf Pup · 小狼 (小狼, xiǎo láng)

- **Role:** normal · L1.2 Clover Hills · Lv 2
- **Size:** small (~0.6× hero)
- **Sprite:** `art/sprites/wolf_pup.png` (drawn; brief matches it)
- **Art brief:** Scrappy gray wolf pup with oversized paws and bristling fur. Piercing yellow eyes and a wrinkled snarl showing small sharp fangs. Pounces low and fast: young, but already a hunter.
- **Attack pose reference:** Puppy Pounce (小狼扑扑): Yips “你是谁?” at you, then pounces with a snapping paw swipe.
- **Animations:** idle: low growl, hackles up, tail stiff; attack: crouch, then a pouncing snap with a paw swipe; hit: yelps, ears flat; defeat: backs away snarling, then flees.
- **Variants:** Darker gray pup as the Big Grey Wolf’s minion (same stats).

### Swift Horned Rabbit · 疾风角兔 (疾風角兔, jífēng jiǎotù)

- **Role:** elite · L1.3 Horned Rabbit Warren · Lv 3
- **Size:** small (~0.6× hero)
- **Sprite:** `art/sprites/swift_horned_rabbit.png` (drawn; brief matches it)
- **Art brief:** Sleek electric-blue horned rabbit with a cream chest and exactly ONE yellow lightning-bolt horn. Brass aviator goggles are pushed up on its forehead. Narrowed eyes and a sharp-toothed smirk on a lean sprinter’s body, always coiled to dash.
- **Attack pose reference:** Zoom Horn (疾风角冲): A blur of fur yells “看!” and zips past, horn first, before you can even look.
- **Animations:** idle: bouncing on its toes, goggles glint; attack: crouch, then a horn-first dash across the screen leaving speed lines; hit: skids and spins; defeat: skids to a stop, panting, then zips off-screen.
- **Variants:** None (unique elite).

### Big-Beak Crow · 大嘴乌鸦 (大嘴烏鴉, dàzuǐ wūyā)

- **Role:** location boss · L1.1 Village Meadow · Lv 2 · comes with 1 Horned Rabbit
- **Size:** medium (~0.9× hero)
- **Sprite:** `art/sprites/big_beak_crow.png` (drawn; brief matches it)
- **Art brief:** Big black crow in a red pirate bandana, with a massive curved yellow beak and a scowling glare under a heavy brow. Wings folded like crossed arms, a leather satchel of stolen gold coins on a shoulder strap, and sharp gray talons. The meadow’s pirate thug.
- **Attack pose reference:** Shiny Snatch (抢亮晶晶): Squawks “什么? 什么?” and swoops for anything that sparkles, including your coins.
- **Animations:** idle: wings crossed, head cocked, glaring; attack: wings flare wide, then a lunging beak strike; hit: feathers burst out; defeat: drops the satchel (coins scatter) and flaps away squawking. Extra: steal (snatches a coin).
- **Variants:** None.

### Big Grey Wolf · 大灰狼 (大灰狼, dà huīláng)

- **Role:** location boss · L1.2 Clover Hills · Lv 3 · comes with 1 Wolf Pup
- **Size:** large (~1.4× hero)
- **Sprite:** `art/sprites/big_grey_wolf.png` (drawn; brief matches it)
- **Art brief:** Lanky gray wolf standing upright in a tattered white grandma nightgown and a lavender nightcap with a pom-pom. Hunched forward with long clawed hands, glinting yellow eyes and a wide sharp-toothed grin. The torn disguise fools nobody: a sly, predatory storybook villain.
- **Attack pose reference:** Huff and Puff (呼呼大风): Asks “你好吗?” in a too-sweet voice, then huffs a gust that knocks your hat off.
- **Animations:** idle: hunched, fingers drumming, sly grin; attack: cheeks puff (telegraph), then a gust or a clawed swipe; hit: nightcap knocked askew, snarls; defeat: nightgown rips, nightcap flies off, and he slinks away into the hedges. Extra: telegraph (cheeks inflate).
- **Variants:** None.

### Horned Rabbit King · 角兔王 (角兔王, jiǎotù wáng)

- **Role:** realm boss · L1.3 Horned Rabbit Warren · Lv 4 · comes with 1 Horned Rabbit
- **Size:** large (~1.3× hero)
- **Sprite:** `art/sprites/rabbitking.png` (drawn; brief matches it)
- **Prototype id:** `rabbitking`
- **Art brief:** Tall, upright gray-brown horned rabbit with exactly ONE sharp horn, glaring red eyes and bared buck teeth. A small gold crown set with rubies, a tattered crimson royal cape with gold trim fastened by a ruby clasp, and a gold scepter topped with a red orb. Scruffy, proud and cruel, he looks down on the hero.
- **Attack pose reference:** Royal Horn Stomp (兔王重踩): Booms “欢迎!” to his warren, then stomps so hard the carrots jump.
- **Animations:** idle: cape stirs, taps the scepter, glares down; attack: scepter raised, then a horn-first lunge; hit: crown knocked askew, snarls; defeat: stumbles, drops the scepter and flees into the warren. Extra: summon (slams the scepter down).
- **Variants:** None.

## Realm 2: Honeycomb Forest (蜂巢森林)

Locations: L2.1 Flower Glade (花海林地), L2.2 Great Hive (大蜂巢)


### Giant Bee · 巨蜂 (巨蜂, jùfēng)

- **Role:** normal · L2.1 Flower Glade · Lv 3
- **Size:** medium (~0.7× hero, dog-sized)
- **Sprite:** `art/sprites/bee.png` (drawn; brief matches it)
- **Prototype id:** `bee`
- **Art brief:** Oversized, dog-sized bumblebee with dense yellow-and-black fur and translucent wings mid-beat. A scowling, furrowed brow over dark eyes, spiny black legs and a sharp dark stinger aimed forward. Territorial and aggressive.
- **Attack pose reference:** Stinger Poke (蜂刺戳戳): Buzzes “蜂蜜! 蜂蜜!” and pokes you with a round rubbery stinger.
- **Animations:** idle: hover bob with wing blur, glaring; attack: pulls back, then a stinger jab; hit: knocked spinning, wings stutter; defeat: drops low and buzzes off toward the hive.
- **Variants:** The Queen Bee’s summoned worker uses a separate sprite (worker_bee): smaller and sleeker, with a big glaring eye and the stinger thrust forward (half HP, no drops; spec v3).

### Sapling Sprite · 小树精 (小樹精, xiǎo shùjīng)

- **Role:** normal · L2.1 Flower Glade · Lv 3
- **Size:** small (~0.75× hero)
- **Sprite:** `art/sprites/sapling_sprite.png` (drawn; brief matches it)
- **Art brief:** Knotted, bark-skinned tree sprite with thorny shoulder spikes and twig claws. A two-leaf sprout grows on its head and a pink blossom on its chest. Glowing amber eyes under a scowling brow. It stands in a fighter’s crouch and lashes out with a green vine whip.
- **Attack pose reference:** Root Trip (树根绊绊): Offers you a berry, chirps “尝一尝!”, and sneaks a root under your feet.
- **Animations:** idle: fists clenched, leaves rustling; attack: vine whip lash (roots burst up for Root Trip); hit: bark chips fly, leaves shake; defeat: roots itself into the ground and goes still as a young tree.
- **Variants:** Spring (pink blossom) and summer (green) palettes.

### Forest Spider · 森林蜘蛛 (森林蜘蛛, sēnlín zhīzhū)

- **Role:** normal · L2.1 Flower Glade · Lv 3
- **Size:** medium (~0.7× hero, wide and low)
- **Sprite:** `art/sprites/spider.png` (drawn; brief matches it)
- **Prototype id:** `spider`
- **Art brief:** Bulky forest spider whose body and legs are covered in thick green moss with bark-brown bands. Several glossy black eyes and a pair of curved ivory fangs. Crouched low, ready to lunge. Menacing but stylized, not realistic or hairy-creepy.
- **Attack pose reference:** Sticky Web (黏黏网): Mumbles “好吃… 好吃…” while eyeing you, and flings a gooey web ball.
- **Animations:** idle: low crouch, legs shifting, fangs flexing; attack: rears up, then a fang lunge or a spat web ball; hit: legs curl in; defeat: scuttles backward into the undergrowth.
- **Variants:** Purple night variant for L2.2.

### Royal Guard Bee · 近卫蜂 (近衛蜂, jìnwèifēng)

- **Role:** elite · L2.2 Great Hive · Lv 5
- **Size:** medium (~0.9× hero)
- **Sprite:** `art/sprites/royal_guard_bee.png` (drawn; brief matches it)
- **Art brief:** Bee soldier in ornate golden plate armor with a honeycomb pattern and a crested helmet with a red plume. Fierce eyes glare through the visor. It carries a long golden spear and a round, honeycomb-embossed golden shield. Disciplined and rigid, ready to skewer intruders.
- **Attack pose reference:** Golden Spear (金蜂长枪): Snaps “不要!” and thrusts its golden spear at your chest.
- **Animations:** idle: shield up, spear upright, wings humming; attack: spear drawn back, then a full-length thrust; hit: shield clangs, staggers; defeat: drops its shield and retreats to the hive. Extra: shield block (first hit).
- **Variants:** None.

### Greedy Bear · 贪吃熊 (貪吃熊, tānchī xióng)

- **Role:** location boss · L2.1 Flower Glade · Lv 4 · comes with 1 Giant Bee (chasing the bear, but angry at everyone)
- **Size:** large (~1.4× hero)
- **Sprite:** `art/sprites/greedy_bear.png` (drawn; brief matches it)
- **Art brief:** Hulking brown bear with a paw-print napkin tied around its neck. Honey drips from snarling jaws full of teeth, it has long curved claws, and it clutches a dented honey pot. Greedy and furious at anyone near its honey.
- **Attack pose reference:** Belly Bump (大肚子撞): Rumbles “饿!” and belly-bumps you out of the way of the honey.
- **Animations:** idle: hunched, growling, honey dripping; attack: rears up, then a clawed swipe or honey-pot slam; hit: roars, honey splashes; defeat: lumbers off into the trees clutching its pot. Extra: snack heal (gulps honey from the pot).
- **Variants:** None.

### Queen Bee · 蜂后 (蜂后, fēnghòu)

- **Role:** realm boss · L2.2 Great Hive · Lv 6 · comes with 1 Giant Bee, plus summons
- **Size:** huge (~1.8× hero)
- **Sprite:** `art/sprites/queenbee.png` (drawn; brief matches it)
- **Prototype id:** `queenbee`
- **Art brief:** Huge regal queen bee with a long black-and-gold striped abdomen ending in a prominent stinger. A spiked gold crown, a golden armored collar set with a violet gem, translucent wings and a cold, furious glare. Imperious and dangerous, she hovers above her hive.
- **Attack pose reference:** Royal Buzz (女王嗡嗡): Demands “请给我…” in her royal voice, then sends a shockwave buzz.
- **Animations:** idle: slow hover, wings shimmering, glaring down; attack: rears back, then a stinger jab with a buzzing shockwave; hit: recoils, crown slips; defeat: retreats into the heart of the hive, wings drooping. Extra: summon (commanding gesture; a worker bursts from the comb).
- **Variants:** None.

---

# P2: realms 3–9


## Realm 3: Crossroads Market (十字路口集市)

Locations: L3.1 Crossroads Highway (十字大道), L3.2 Night Bazaar (夜市)


### Road Bandit · 山贼 (山賊, shānzéi)

- **Role:** normal · L3.1 Crossroads Highway · Lv 5
- **Size:** medium (~1× hero)
- **Sprite:** not drawn yet
- **Art brief:** Wiry road bandit in a patched green hood with a cloth bandana over the lower face. A precarious stack of stolen hats sits on his head and stolen wallets hang from his belt. Narrowed eyes and a sneering grin; he crouches with a padded cudgel, ready to jump you.
- **Attack pose reference:** Hat Snatch (抢帽子): Yells “钱包!” and tries to swipe the wallet right off your belt.
- **Animations:** idle: shifty crouch, eyes darting; attack: lunging grab for your wallet; hit: hat stack wobbles; defeat: hats topple and he sprints off. Extra: flee.
- **Variants:** Red hood and blue hood palette swaps.

### Slime · 史莱姆 (史萊姆, shǐláimǔ)

- **Role:** normal · L3.2 Night Bazaar · Lv 6
- **Size:** small (~0.4× hero)
- **Sprite:** not drawn yet
- **Art brief:** Glossy translucent jelly with a coin suspended inside, two narrow glowing eyes and a wide gummy frown baring rows of jelly teeth. It swells up before it lunges.
- **Attack pose reference:** Bouncy Splat (弹弹啪): Burbles its own color, “绿色!”, and belly-flops on your boots.
- **Animations:** idle: menacing pulse, swelling and shrinking; attack: rears high, then a body slam; hit: ripples violently; defeat: splats into a puddle that slithers away.
- **Variants:** Color variants: green (default), red, blue, yellow; bark changes to match (红色/蓝色/黄色).

### Mimic · 宝箱怪 (寶箱怪, bǎoxiāng guài)

- **Role:** elite · L3.2 Night Bazaar · Lv 7
- **Size:** medium (~0.7× hero)
- **Sprite:** not drawn yet
- **Art brief:** Iron-banded wooden treasure chest with a long lolling tongue and rows of blunt wooden fang-pegs along the lid. Narrow yellow eyes glow from the keyhole. It springs open to bite.
- **Attack pose reference:** Surprise Chomp (惊喜一口): Whispers “礼物…” like a gift, then snaps its lid shut on your sleeve.
- **Animations:** idle: sits still as a chest, then a keyhole eye flicks open; attack: lid flies open and chomps; hit: lid rattles, coins bounce out; defeat: lid falls open, tongue limp, coins spill.
- **Variants:** Plain wooden chest and red-lacquer chest skins.

### Bandit Boss · 山贼头目 (山賊頭目, shānzéi tóumù)

- **Role:** location boss · L3.1 Crossroads Highway · Lv 6 · comes with 1 Road Bandit
- **Size:** large (~1.3× hero)
- **Sprite:** not drawn yet
- **Art brief:** Barrel-chested bandit chief with a bushy red beard, an eye patch, a coin-studded vest and a heavy padded club with a price tag. Scowling gap-toothed snarl; he looms over the road like a wall.
- **Attack pose reference:** Toll Club (过路费棒): Sneers “多少钱?”, as in how much you’ve got, and swings a big foam-padded club.
- **Animations:** idle: slaps the club into his palm, glowering; attack: club wind-up, then a crushing swing; hit: coins fly from the vest; defeat: trips, eye patch flips up, and he flees down the road. Extra: telegraph (club tap).
- **Variants:** None.

### Mimic King · 宝箱怪王 (寶箱怪王, bǎoxiāng guài wáng)

- **Role:** realm boss · L3.2 Night Bazaar · Lv 8 · comes with 1 Slime (lives inside him)
- **Size:** huge (~2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Giant gilded treasure chest wearing a jeweled crown, with a purple tongue and gems for eyes that glare coldly. Rows of gold-tooth pegs line the lid and coins spill from its jaws. Vain, greedy and eager to crush.
- **Attack pose reference:** Treasure Crush (宝箱大压): Brags “第一!”, number one treasure in town, and slams its giant lid.
- **Animations:** idle: lid breathing open and shut, coins rattling; attack: jump, then a lid slam (screen shake); hit: gems crack; defeat: bursts open, showering coins and a shield, and slumps empty. Extra: lid shut, slime pop-out.
- **Variants:** None.

## Realm 4: Goblin Caves (哥布林洞穴)

Locations: L4.1 Cave Mouth (洞口), L4.2 Crystal Tunnels (水晶隧道), L4.3 Goblin 'School' (哥布林学校)


### Cave Bat · 洞穴蝙蝠 (洞穴蝙蝠, dòngxué biānfú)

- **Role:** normal · L4.1 Cave Mouth · Lv 7
- **Size:** small (~0.4× hero)
- **Sprite:** not drawn yet
- **Art brief:** Small purple cave bat with huge ribbed ears, glowing yellow eyes, bared needle fangs and tattered wings. It dives in jittery zigzags.
- **Attack pose reference:** Flap Nip (翅膀拍拍): Squeaks “小朋友!” from behind you, then nips your ear.
- **Animations:** idle: jittery flutter, fangs bared; attack: zigzag dive and nip; hit: tumbles midair; defeat: flees back into the dark ceiling.
- **Variants:** Brown variant for L4.2.

### Goblin · 哥布林 (哥布林, gēbùlín)

- **Role:** normal · L4.2 Crystal Tunnels · Lv 8
- **Size:** small (~0.7× hero)
- **Sprite:** not drawn yet
- **Art brief:** Short green goblin with long pointed ears, a backwards cap and a stolen school backpack. Crooked sharp teeth in a sneering grin as it cocks a slingshot. Bratty and mean.
- **Attack pose reference:** Slingshot Pebble (弹弓石子): Cackles “开始!” and flicks a pebble at you before you’re ready.
- **Animations:** idle: bounces on its heels, jeering; attack: slingshot pull and release; hit: cap flies off; defeat: stumbles back and runs off shouting 我输了.
- **Variants:** Three skin tones (green, olive, teal) and cap colors.

### Goblin Hall Monitor · 哥布林班长 (哥布林班長, gēbùlín bānzhǎng)

- **Role:** normal · L4.3 Goblin 'School' · Lv 9
- **Size:** small (~0.75× hero)
- **Sprite:** not drawn yet
- **Art brief:** Goblin in a crooked prefect sash and round glasses, with a giant ruler raised like a weapon and a hand bell in the other fist. Eyes narrowed, teeth bared: a petty tyrant.
- **Attack pose reference:** Ruler Smack (尺子拍): Rings a bell, shouts “上课!”, and smacks its desk with a ruler (and your knuckles).
- **Animations:** idle: slaps the ruler in its palm, glaring over its glasses; attack: ruler swing; hit: glasses knocked askew; defeat: drops the sash and scurries off. Extra: bell ring (summon).
- **Variants:** None.

### Goblin Brute · 哥布林壮汉 (哥布林壯漢, gēbùlín zhuànghàn)

- **Role:** elite · L4.2 Crystal Tunnels · Lv 10
- **Size:** medium (~1.1× hero)
- **Sprite:** not drawn yet
- **Art brief:** Hulking goblin with a tiny head, huge arms and a school uniform bursting at the seams, a wooden desk hefted overhead. Jutting underbite tusks and a furious glare.
- **Attack pose reference:** Desk Slam (举桌猛砸): Grunts “作业!”, lifts a whole school desk overhead, and slams it down.
- **Animations:** idle: heavy breathing, flexing, desk on its shoulder; attack: desk overhead, then a slam; hit: staggers; defeat: the desk crashes down beside it and it lumbers away. Extra: telegraph lift.
- **Variants:** None.

### Giant Echo Bat · 回声大蝙蝠 (回聲大蝙蝠, huíshēng dà biānfú)

- **Role:** location boss · L4.1 Cave Mouth · Lv 8 · comes with 1 Cave Bat
- **Size:** large (~1.5× hero, wings 2.5×)
- **Sprite:** not drawn yet
- **Art brief:** Big lavender bat with satellite-dish ears and wide leathery wings spread across the cave ceiling. A broad fanged maw ringed by visible sound waves and glowing eyes. Loud and theatrical.
- **Attack pose reference:** Echo Screech (回声尖叫): Screeches “我不懂!” so loudly the words bounce around the cave.
- **Animations:** idle: hangs, ears swiveling, glowing eyes tracking the hero; attack: rears back, then a screech with sound-wave rings; hit: ears ring (stars); defeat: folds its wings and retreats into the dark. Extra: echo (rings pulse).
- **Variants:** None.

### Goblin Warden · 哥布林守卫 (哥布林守衛, gēbùlín shǒuwèi)

- **Role:** location boss · L4.2 Crystal Tunnels · Lv 9 · comes with 1 Goblin
- **Size:** large (~1.3× hero)
- **Sprite:** not drawn yet
- **Art brief:** Stocky goblin warden in an oversized iron helmet, with a huge ring of keys on its belt and a padlock-shaped shield. It glares through the visor slit with a snaggle-toothed snarl, guarding the school gate and letting no one through.
- **Attack pose reference:** Key Ring Whirl (钥匙圈旋风): Jingles its keys, hisses “请安静!”, and whirls the big key ring like a flail.
- **Animations:** idle: shield up, keys jangling, glaring; attack: key-ring whirl like a flail; hit: keys scatter; defeat: drops the big golden key and flees, helmet over its eyes.
- **Variants:** None.

### Goblin King (the 'Headmaster') · 哥布林大王 (哥布林大王, gēbùlín dàwáng)

- **Role:** realm boss · L4.3 Goblin 'School' · Lv 11 · comes with 1 Goblin Hall Monitor + 1 Goblin
- **Size:** large (~1.6× hero)
- **Sprite:** not drawn yet
- **Art brief:** Fat goblin in a tattered graduation gown with a crown worn over a mortarboard, tiny spectacles, a giant pointer stick and a stack of test papers. He sneers with yellowed fangs: a tyrant posing as a headmaster.
- **Attack pose reference:** Pop Quiz Slam (突击考试): Bellows “考试!” and slams a stack of fake test papers down like a hammer.
- **Animations:** idle: taps the pointer on a chalkboard, sneering; attack: paper-stack slam; hit: papers flutter everywhere; defeat: gown rips, crown rolls away, and he dives under a desk. Extra: bell ring.
- **Variants:** None.

## Realm 5: Hydra Swamp (九头蛇沼泽)

Locations: L5.1 Misty Marsh (迷雾沼泽), L5.2 Hydra's Lair (九头蛇巢穴)


### Bog Monster · 沼泽怪 (沼澤怪, zhǎozé guài)

- **Role:** normal · L5.1 Misty Marsh · Lv 10
- **Size:** medium (~1× hero)
- **Sprite:** not drawn yet
- **Art brief:** Lumpy green-brown mud creature with lily pads and cattails sprouting from its back, glowing eyes and a dripping maw. It rises from the swamp with heavy mud-caked arms.
- **Attack pose reference:** Mud Splash (泥巴泼泼): Gurgles “迟到!” and drags you into the mud so you really will be late.
- **Animations:** idle: bubbles popping, looming; attack: scoops and hurls mud; hit: splats flat, then reforms; defeat: sinks back into the swamp, leaving a lily pad.
- **Variants:** Darker L5.2 variant.

### Bog Lizard · 沼泽蜥蜴 (沼澤蜥蜴, zhǎozé xīyì)

- **Role:** normal · L5.2 Hydra's Lair · Lv 11
- **Size:** medium (~0.8× hero)
- **Sprite:** not drawn yet
- **Art brief:** Lean teal lizard with a flared frilled collar, slit-pupil eyes, needle teeth, a whip-like curled tail and a pocket watch on a chain. Twitchy and quick to strike.
- **Attack pose reference:** Tail Whip (尾巴甩甩): Hisses “马上!” and whips its tail before you can blink.
- **Animations:** idle: checks the watch, frill twitching, hissing; attack: spin and tail whip; hit: frill snaps open; defeat: scrambles off on two legs, dropping its watch.
- **Variants:** Orange-frill variant.

### Swamp Wisp · 鬼火 (鬼火, guǐhuǒ)

- **Role:** elite · L5.1 Misty Marsh · Lv 13
- **Size:** small (~0.5× hero, glow radius 1×)
- **Sprite:** not drawn yet
- **Art brief:** Floating teardrop of cold blue-green flame with hollow glowing eyes and a thin, wicked smile. It trails mist and lures travelers off the path.
- **Attack pose reference:** Glow Drain (幽光吸魔): Whispers “晚上…” and flickers a cold blue flash that drains your magic.
- **Animations:** idle: slow float and eerie flicker; attack: dims, then a cold flash; hit: flame gutters; defeat: shrinks to a spark and fades into the mist.
- **Variants:** None.

### Giant Bog Toad · 泥潭巨蛙 (泥潭巨蛙, nítán jùwā)

- **Role:** location boss · L5.1 Misty Marsh · Lv 11 · comes with 1 Bog Monster
- **Size:** huge (~1.8× hero)
- **Sprite:** not drawn yet
- **Art brief:** Giant olive toad in a sagging nightcap, with warty skin, a heavy-lidded glare and a huge wide mouth hiding a long sticky tongue coiled to lash. Grumpy and territorial.
- **Attack pose reference:** Tongue Grab (长舌卷卷): Croaks “一会儿…” in a bored voice and lashes out its sticky tongue.
- **Animations:** idle: slow breathing, throat pulsing, glaring; attack: tongue lash; hit: puffs up round; defeat: sinks into the mud with a sulky croak. Extra: potion-bag grab.
- **Variants:** None.

### Hydra · 九头蛇 (九頭蛇, jiǔtóushé)

- **Role:** realm boss · L5.2 Hydra's Lair · Lv 14 · comes with 2 Bog Lizards
- **Size:** huge (~2.5× hero)
- **Sprite:** not drawn yet
- **Art brief:** Big teal swamp serpent with nine heads on long necks, each with its own glare (one sneering, one hissing, one in spectacles), fin-like ears and fanged jaws. The heads squabble but all turn on the hero.
- **Attack pose reference:** Chain Bite (连环咬): Its heads all ask “现在几点?” at once, then snap one after another.
- **Animations:** idle: heads weave and hiss; attack: heads strike in sequence; hit: heads recoil and bonk each other; defeat: heads tangle into a knot and it sinks with bubbles. Extra: double bite, head duck-under.
- **Variants:** None.

## Realm 6: Zombie Lands (丧尸之地)

Locations: L6.1 Gloomy Village (灰雾村), L6.2 Moonlit Graveyard (月光墓园)


### Zombie · 丧尸 (喪屍, sàngshī)

- **Role:** normal · L6.1 Gloomy Village · Lv 13
- **Size:** medium (~1× hero)
- **Sprite:** not drawn yet
- **Art brief:** Sick villager with pale green skin, glowing green eyes, a thermometer in its mouth, a bandaged arm (no wounds), a torn scarf and farm clothes, arms outstretched in a lurching grab. Eerie and menacing, but no rot or gore.
- **Attack pose reference:** Sniffly Grab (软绵绵抓): Moans “我头疼…” and lurches forward with grasping hands.
- **Animations:** idle: slow sway, moaning; attack: lurch and grab; hit: staggers, sneezes; defeat: green mist swirls away, leaving a dazed, healthy villager. Extra: cure transform.
- **Variants:** Farmer, baker and grandma outfits (same stats).

### Rattle Skeleton · 骷髅 (骷髏, kūlóu)

- **Role:** normal · L6.2 Moonlit Graveyard · Lv 14
- **Size:** medium (~1× hero)
- **Sprite:** not drawn yet
- **Art brief:** Skeleton with a lopsided top hat, red pinpoint lights in its eye sockets, a clacking jaw and one missing rib, winding up to throw a bone boomerang. Stylized and clean, no gore.
- **Attack pose reference:** Bone Boomerang (骨头回旋镖): Rattles “找… 找…” while hunting for its missing rib, then throws a spare bone like a boomerang.
- **Animations:** idle: rattling, jaw clacking; attack: bone boomerang throw; hit: jaw knocked loose and snapped back; defeat: collapses into a pile of bones topped by the hat.
- **Variants:** Top hat and flower-crown variants.

### Zombie Knight · 丧尸骑士 (喪屍騎士, sàngshī qíshì)

- **Role:** elite · L6.2 Moonlit Graveyard · Lv 16
- **Size:** medium (~1.2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Hulking knight in dented, oversized armor with a green-tinged face and glowing eyes behind the visor. A drooping plume, a blanket for a cape, and a heavy dull sword dragged along the ground.
- **Attack pose reference:** Sleepy Sword (瞌睡剑): Sighs “我累了…”, drags its dull sword and swings it anyway.
- **Animations:** idle: heavy breathing, visor clanks; attack: slow, crushing overhead swing; hit: armor rattles; defeat: green mist leaves and the captain sinks to one knee, cured. Extra: shield up, cure transform.
- **Variants:** None.

### Zombie Mayor · 丧尸村长 (喪屍村長, sàngshī cūnzhǎng)

- **Role:** location boss · L6.1 Gloomy Village · Lv 14 · comes with 1 Zombie
- **Size:** large (~1.3× hero)
- **Sprite:** not drawn yet
- **Art brief:** Round, sick-green village mayor with a sash, top hat, monocle and cane, an ice pack tied on his head. Glowing green eyes and an unsettling empty grin.
- **Attack pose reference:** Mayor’s Cane Thump (村长拐杖敲): Mumbles “别担心…” out of old habit, then thumps his cane.
- **Animations:** idle: sways, monocle glinting; attack: cane thump with a small shockwave; hit: ice pack slips; defeat: cure transform, and he sits down dazed.
- **Variants:** None.

### Sickness Fiend · 病魔 (病魔, bìngmó)

- **Role:** realm boss · L6.2 Moonlit Graveyard · Lv 17 · comes with 2 Zombies
- **Size:** large (~1.7× hero)
- **Sprite:** not drawn yet
- **Art brief:** Floating green gremlin made of swirling, sickly cloud, with small horns, a runny red nose, a tattered doctor’s coat, a sharp grin and a bubbling potion flask. Gleeful malice.
- **Attack pose reference:** Sneezy Cloud (喷嚏云): Cackles “生病!” and sneezes a swirling green cloud at you.
- **Animations:** idle: floats, sniffling, cackling; attack: big inhale, then a sneeze cloud; hit: the cloud puffs apart and reforms; defeat: shrinks into a tiny sneeze and pops. Extra: summon.
- **Variants:** None.

## Realm 7: Griffin Peaks (狮鹫山峰)

Locations: L7.1 Windy Cliffs (大风悬崖), L7.2 Griffin Summit (狮鹫之巅)


### Harpy · 鹰身女妖 (鷹身女妖, yīngshēn nǚyāo)

- **Role:** normal · L7.1 Windy Cliffs · Lv 16
- **Size:** medium (~1× hero, wings 2×)
- **Sprite:** not drawn yet
- **Art brief:** Bird-woman with storm-grey wings for arms, taloned bird legs and wild cloud-shaped hair. Piercing yellow eyes and a screeching mouth, with a raincloud swirling over her head.
- **Attack pose reference:** Rain Feather (雨羽飞射): Screeches “往左走!”, then dives at you from the right with a flurry of feathers.
- **Animations:** idle: hover, wingbeats slow and threatening, cloud drizzling; attack: wing flap and feather volley; hit: feathers ruffled; defeat: the raincloud breaks up and she flees into the sky.
- **Variants:** Snow variant for L7.2 (bark 下雪).

### Griffin · 狮鹫 (獅鷲, shījiù)

- **Role:** normal · L7.2 Griffin Summit · Lv 17
- **Size:** large (~1.4× hero)
- **Sprite:** not drawn yet
- **Art brief:** Golden-brown griffin with a white-feathered eagle head, fierce amber eyes and a hooked beak open in a screech. Lion body with a tufted tail, talons spread for a dive.
- **Attack pose reference:** Dive Swoop (俯冲扑击): Caws “上!”, climbs into the clouds, then dives claws-first.
- **Animations:** idle: wings half-raised, tail lashing; attack: rise, then a dive swoop; hit: feathers fly; defeat: shakes off the spell (purple sparkles leave its eyes) and flies away.
- **Variants:** White snow-griffin variant.

### Cliff Golem · 石头人 (石頭人, shítou rén)

- **Role:** elite · L7.1 Windy Cliffs · Lv 19
- **Size:** large (~1.6× hero)
- **Sprite:** not drawn yet
- **Art brief:** Blocky mossy stone giant with glowing blue rune eyes, a signpost jammed into its shoulder, fists like boulders and a bird’s nest on its head. Slow, relentless and crushing.
- **Attack pose reference:** Boulder Step (巨石踩踏): Rumbles “一直走…” and marches straight at you, no matter what’s in the way.
- **Animations:** idle: grinding breath, pebbles falling, runes pulsing; attack: heavy stomp forward (screen shake); hit: chips fly; defeat: sinks down and hardens into a mossy hill. Extra: bump-into-rock.
- **Variants:** None.

### Wild Wind Dragon · 风龙 (風龍, fēnglóng)

- **Role:** location boss · L7.1 Windy Cliffs · Lv 17 · comes with 1 Harpy
- **Size:** huge (~2.5× hero)
- **Sprite:** not drawn yet
- **Art brief:** Long serpentine sky-blue Chinese-style dragon with a cloud-like mane, pearl whiskers, bared fangs and swirling wind trails. Its eyes flash a warning: wild and territorial, not evil, still majestic.
- **Attack pose reference:** Gale Breath (狂风吐息): Roars “远!” and blasts you far across the cliff with a whirling gale.
- **Animations:** idle: coils in the air, mane streaming, growling; attack: rears up, then a gale-breath swirl; hit: coils tighten; defeat: lands, lowers its head, and flies off into the clouds. Extra: impressed (a slow nod).
- **Variants:** None.

### Griffin King · 狮鹫王 (獅鷲王, shījiù wáng)

- **Role:** realm boss · L7.2 Griffin Summit · Lv 20 · comes with 2 Griffins
- **Size:** huge (~2.2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Majestic white-and-gold griffin with a lightning-shaped purple crown crackling with dark sparks. Glassy, spellbound eyes, a hooked beak open in a war cry, and storm clouds around its wings.
- **Attack pose reference:** Storm Dive (风暴俯冲): Commands “出发!” and leads a lightning-charged dive from the storm clouds.
- **Animations:** idle: wings half-open, crown crackling; attack: soar up, then a lightning dive; hit: crown flickers; defeat: the crown shatters into sparkles, his eyes clear, and he lands. Extra: telegraph circle.
- **Variants:** None.

## Realm 8: Ogre Colosseum (食人魔角斗场)

Locations: L8.1 Training Pits (训练场), L8.2 Grand Colosseum (大角斗场)


### Arena Troll · 巨魔 (巨魔, jùmó)

- **Role:** normal · L8.1 Training Pits · Lv 19
- **Size:** large (~1.5× hero)
- **Sprite:** not drawn yet
- **Art brief:** Tall lanky blue-green troll with a long nose, shaggy moss hair, a sweatband and a number 9 jersey. Jutting tusks and a mean grin as it winds up to kick a boulder.
- **Attack pose reference:** Boulder Kick (巨石射门): Yells “踢足球!” and kicks a boulder at you like a soccer ball.
- **Animations:** idle: juggles a rock on its knee, sneering; attack: boulder kick; hit: stumbles; defeat: trips over its boulder and limps off. Extra: regrow sparkle.
- **Variants:** Two jersey colors (red team, blue team).

### Ogre Gladiator · 食人魔斗士 (食人魔鬥士, shírénmó dòushì)

- **Role:** normal · L8.2 Grand Colosseum · Lv 20
- **Size:** large (~1.6× hero)
- **Sprite:** not drawn yet
- **Art brief:** Big orange ogre with a single jutting tusk, a horned helmet too small for his head, a padded club and a bottle-cap belt. Scowling and roaring to the crowd.
- **Attack pose reference:** Club Crash (大棒猛砸): Bellows “胜利!” at the crowd and crashes down with a padded club.
- **Animations:** idle: flexes and roars to the crowd; attack: club overhead crash; hit: helmet spins; defeat: drops to one knee and concedes.
- **Variants:** Green and purple skin variants.

### Fire Elemental · 火元素 (火元素, huǒ yuánsù)

- **Role:** elite · L8.2 Grand Colosseum · Lv 22
- **Size:** medium (~1.2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Figure of roaring orange and yellow flame with a white-hot core, blazing eyes and a flaming mohawk, arms flung wide as it spins into a fire ring. Showy and dangerous.
- **Attack pose reference:** Flame Dance (火焰舞): Crackles “跳舞!” and twirls into a spinning ring of flame.
- **Animations:** idle: flaring flame dance; attack: spins into a fire ring; hit: flames shrink and sputter; defeat: fizzles down to embers.
- **Variants:** Blue-flame variant (cosmetic).

### Minotaur · 牛头人 (牛頭人, niútóurén)

- **Role:** location boss · L8.1 Training Pits · Lv 20 · comes with 1 Arena Troll
- **Size:** large (~1.8× hero)
- **Sprite:** not drawn yet
- **Art brief:** Muscular bull-headed warrior with brown fur, a brass nose ring, a red cape and sweatbands. Steam blasts from its nostrils and its horns are lowered to charge.
- **Attack pose reference:** Bull Charge (蛮牛冲撞): Snorts “比赛!” and charges across the arena, horns first.
- **Animations:** idle: snorting steam, hoof scraping; attack: head-down charge; hit: horns ring; defeat: staggers and yields the arena. Extra: telegraph (hoof scrape).
- **Variants:** None.

### Ogre Champion · 食人魔冠军 (食人魔冠軍, shírénmó guànjūn)

- **Role:** realm boss · L8.2 Grand Colosseum · Lv 23 · comes with 2 Ogre Gladiators
- **Size:** huge (~2.2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Gigantic ogre with a shiny champion belt, a laurel wreath, a flowing purple cape and a huge padded hammer raised overhead, wearing a cocky tusked sneer.
- **Attack pose reference:** Champion Slam (冠军重锤): Laughs “没问题!” and slams the ground so hard the crowd bounces.
- **Animations:** idle: flexes to the crowd, hammer on shoulder; attack: hammer ground slam (screen shake); hit: belt jolts; defeat: drops to one knee and hands over the belt. Extra: show-off pose.
- **Variants:** None.

## Realm 9: Demon King's Castle (魔王城堡)

Locations: L9.1 Demon King's Gate (魔王城门), L9.2 Throne Hall (王座大厅)


### Imp · 小恶魔 (小惡魔, xiǎo èmó)

- **Role:** normal · L9.1 Demon King's Gate · Lv 22
- **Size:** small (~0.5× hero)
- **Sprite:** not drawn yet
- **Art brief:** Small red imp with stubby horns, bat wings, a barbed tail and a small pitchfork. A sly fanged grin and glowing yellow eyes: mischievous and spiteful.
- **Attack pose reference:** Pitchfork Poke (小叉戳戳): Snickers “其实…”, starting a fib, then pokes you with a tiny pitchfork.
- **Animations:** idle: darting flight, cackling; attack: pitchfork poke; hit: spins like a top; defeat: pops in a puff of red smoke.
- **Variants:** Purple and red variants.

### Demon Knight · 恶魔骑士 (惡魔騎士, èmó qíshì)

- **Role:** normal · L9.2 Throne Hall · Lv 23
- **Size:** large (~1.4× hero)
- **Sprite:** not drawn yet
- **Art brief:** Knight in black-and-purple armor with rounded spikes, glowing red eye slits, short horns on the helmet and a smoky cape, sword raised with a purple trail.
- **Attack pose reference:** Shadow Slash (暗影斩): Roars “攻击!” and swings a sword trailing purple smoke.
- **Animations:** idle: sword planted, cape billowing; attack: slash with a purple trail; hit: armor sparks; defeat: the armor falls apart empty and a puff of smoke escapes.
- **Variants:** Gold-trim captain variant (cosmetic).

### Gargoyle · 石像鬼 (石像鬼, shíxiàngguǐ)

- **Role:** elite · L9.1 Demon King's Gate · Lv 25
- **Size:** medium (~1.2× hero)
- **Sprite:** not drawn yet
- **Art brief:** Grey stone winged beast with a snarling dog-like face, stubby horns, cracked wings and moss patches, crouched on a pedestal with claws gripping the edge.
- **Attack pose reference:** Stone Pounce (石爪突袭): Suddenly wakes up, “终于!”, at last someone to scare, and pounces from its pedestal.
- **Animations:** idle (statue): motionless except one eye snapping open; awake idle: wings flare, snarling; attack: pounce; hit: chips fly; defeat: freezes back into a statue mid-snarl.
- **Variants:** None.

### Shadow-Cursed Dragon · 暗影龙 (暗影龍, ànyǐnglóng)

- **Role:** location boss · L9.1 Demon King's Gate · Lv 23 · comes with 1 Imp (holds the curse chain)
- **Size:** huge (~3× hero)
- **Sprite:** not drawn yet
- **Art brief:** Huge long Chinese-style dragon with golden scales half-covered in cracked purple shadow crust, glowing violet eyes, bared fangs and a dark chain collar; gold light leaks through the cracks. Dangerous while cursed, tragic rather than evil.
- **Attack pose reference:** Shadow Flame (暗影火焰): Growls “力量…” in the Demon King’s voice and breathes purple shadow fire.
- **Animations:** idle: coils, shadow smoke drifts off; attack: rears and breathes purple fire; hit: shadow cracks show gold light; defeat: shadow shatters, the golden dragon rises and bows. Extra: curse-break transform.
- **Variants:** Golden freed form (ally/NPC art, not an enemy).

### Demon King · 魔王 (魔王, mówáng)

- **Role:** realm boss · L9.2 Throne Hall · Lv 26 · comes with 2 Demon Knights
- **Size:** huge (~2.5× hero)
- **Sprite:** not drawn yet
- **Art brief:** A tall caped demon lord with curling ram horns, a crown of black spikes, glowing golden eyes, a purple-and-black cloak and a scepter with a red gem. Dramatic, theatrical, arrogant smirk; imposing but not grotesque.
- **Attack pose reference:** Rule by Force (武力统治): Thunders “统治!” and slams his scepter, sending out a wave of dark power.
- **Animations:** idle: cape billows, scepter gem pulses; attack: scepter slam + dark wave; hit: staggers, crown tilts; defeat: shrinks into a small grumpy imp-sized demon and flees. Extra: phase-2 transform (cape turns red), summon, telegraph charge.
- **Variants:** Phase 2 palette (red cape, burning eyes).

---

## Quick checklist

| # | Priority | Realm | Enemy | 中文 | Role | Size |
|---|---|---|---|---|---|---|
| 1 | P1 | 1 | Horned Rabbit | 角兔 | normal | small |
| 2 | P1 | 1 | Mushroom Imp | 蘑菇小妖 | normal | small |
| 3 | P1 | 1 | Wolf Pup | 小狼 | normal | small |
| 4 | P1 | 1 | Swift Horned Rabbit | 疾风角兔 | elite | small |
| 5 | P1 | 1 | Big-Beak Crow | 大嘴乌鸦 | location boss | medium |
| 6 | P1 | 1 | Big Grey Wolf | 大灰狼 | location boss | large |
| 7 | P1 | 1 | Horned Rabbit King | 角兔王 | realm boss | large |
| 8 | P1 | 2 | Giant Bee | 巨蜂 | normal | medium |
| 9 | P1 | 2 | Sapling Sprite | 小树精 | normal | small |
| 10 | P1 | 2 | Forest Spider | 森林蜘蛛 | normal | medium |
| 11 | P1 | 2 | Royal Guard Bee | 近卫蜂 | elite | medium |
| 12 | P1 | 2 | Greedy Bear | 贪吃熊 | location boss | large |
| 13 | P1 | 2 | Queen Bee | 蜂后 | realm boss | huge |
| 14 | P2 | 3 | Road Bandit | 山贼 | normal | medium |
| 15 | P2 | 3 | Slime | 史莱姆 | normal | small |
| 16 | P2 | 3 | Mimic | 宝箱怪 | elite | medium |
| 17 | P2 | 3 | Bandit Boss | 山贼头目 | location boss | large |
| 18 | P2 | 3 | Mimic King | 宝箱怪王 | realm boss | huge |
| 19 | P2 | 4 | Cave Bat | 洞穴蝙蝠 | normal | small |
| 20 | P2 | 4 | Goblin | 哥布林 | normal | small |
| 21 | P2 | 4 | Goblin Hall Monitor | 哥布林班长 | normal | small |
| 22 | P2 | 4 | Goblin Brute | 哥布林壮汉 | elite | medium |
| 23 | P2 | 4 | Giant Echo Bat | 回声大蝙蝠 | location boss | large |
| 24 | P2 | 4 | Goblin Warden | 哥布林守卫 | location boss | large |
| 25 | P2 | 4 | Goblin King (the 'Headmaster') | 哥布林大王 | realm boss | large |
| 26 | P2 | 5 | Bog Monster | 沼泽怪 | normal | medium |
| 27 | P2 | 5 | Bog Lizard | 沼泽蜥蜴 | normal | medium |
| 28 | P2 | 5 | Swamp Wisp | 鬼火 | elite | small |
| 29 | P2 | 5 | Giant Bog Toad | 泥潭巨蛙 | location boss | huge |
| 30 | P2 | 5 | Hydra | 九头蛇 | realm boss | huge |
| 31 | P2 | 6 | Zombie | 丧尸 | normal | medium |
| 32 | P2 | 6 | Rattle Skeleton | 骷髅 | normal | medium |
| 33 | P2 | 6 | Zombie Knight | 丧尸骑士 | elite | medium |
| 34 | P2 | 6 | Zombie Mayor | 丧尸村长 | location boss | large |
| 35 | P2 | 6 | Sickness Fiend | 病魔 | realm boss | large |
| 36 | P2 | 7 | Harpy | 鹰身女妖 | normal | medium |
| 37 | P2 | 7 | Griffin | 狮鹫 | normal | large |
| 38 | P2 | 7 | Cliff Golem | 石头人 | elite | large |
| 39 | P2 | 7 | Wild Wind Dragon | 风龙 | location boss | huge |
| 40 | P2 | 7 | Griffin King | 狮鹫王 | realm boss | huge |
| 41 | P2 | 8 | Arena Troll | 巨魔 | normal | large |
| 42 | P2 | 8 | Ogre Gladiator | 食人魔斗士 | normal | large |
| 43 | P2 | 8 | Fire Elemental | 火元素 | elite | medium |
| 44 | P2 | 8 | Minotaur | 牛头人 | location boss | large |
| 45 | P2 | 8 | Ogre Champion | 食人魔冠军 | realm boss | huge |
| 46 | P2 | 9 | Imp | 小恶魔 | normal | small |
| 47 | P2 | 9 | Demon Knight | 恶魔骑士 | normal | large |
| 48 | P2 | 9 | Gargoyle | 石像鬼 | elite | medium |
| 49 | P2 | 9 | Shadow-Cursed Dragon | 暗影龙 | location boss | huge |
| 50 | P2 | 9 | Demon King | 魔王 | realm boss | huge |
