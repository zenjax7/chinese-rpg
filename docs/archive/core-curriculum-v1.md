# Core Curriculum v1: Chinese-learning RPG

Drafted 2026-09-28 (PT). The data lives in `core-curriculum.csv` (UTF-8 with BOM, 16 columns). Simplified is the default script. Traditional is kept in its own column for a future toggle.

## Totals

- **585 items**: **454 words** and **131 phrases/expressions**. Phrases here means type phrase, exclamation or sentence frame. Connectors, particles and measure words are counted as words.
- By type: word 375, phrase 89, connector 31, exclamation 28, number 15, pronoun 13, question word 10, measure word 10, sentence frame 9, particle 5
- Skill flags: listening Y = 585, speaking Y = 422, reading Y = 491
- Vertical slice items: 40
- One deliberate duplicate: 只 appears twice, as zhī (measure word, Traditional 隻) and as zhǐ ('only').

### By level

| Level | HSK 3.0 (2021) | YCT |
|---|---|---|
| 1 | 259 | 80 |
| 2 | 106 | 59 |
| 3 | 41 | 102 |
| 4 | 16 | 72 |
| 5 | 11 | – |
| 6 | 9 | – |
| 7-9 | 8 | – |
| none | 135 | 272 |

127 items are in neither list, and every one of them has a reason in `notes`. Most are multi-word phrases built entirely from listed words; the notes give each component's level. The rest are kid-essential words (kid slang, exclamations, RPG and fantasy terms, foods such as 披萨/薯条).

HSK levels above 3 are reported as they are (4, 5, 6, 7-9) rather than capped, so you can see which kid-common words HSK ranks as 'advanced': 厉害/棒 HSK5, 酷/哇 HSK6, 蜂蜜/蜜蜂 7-9, and so on.

### By realm

| # | Realm | Items | Words | Phrases | Slice | Avg HSK* | Avg YCT* | In neither list |
|---|---|---|---|---|---|---|---|---|
| 1 | Starter Meadow | 92 | 70 | 22 | 23 | 1.20 | 1.73 | 15 |
| 2 | Honeycomb Forest | 69 | 60 | 9 | 17 | 2.10 | 2.39 | 12 |
| 3 | Crossroads Market | 51 | 47 | 4 | 0 | 1.72 | 2.52 | 6 |
| 4 | Goblin Caves | 87 | 62 | 25 | 0 | 1.92 | 2.66 | 28 |
| 5 | Hydra Swamp | 57 | 52 | 5 | 0 | 1.44 | 2.60 | 9 |
| 6 | Zombie Lands | 68 | 55 | 13 | 0 | 1.93 | 2.93 | 13 |
| 7 | Griffin Peaks | 63 | 55 | 8 | 0 | 1.38 | 3.00 | 9 |
| 8 | Ogre Colosseum | 51 | 18 | 33 | 0 | 3.04 | 3.12 | 19 |
| 9 | Demon King's Castle | 47 | 35 | 12 | 0 | 3.05 | 3.57 | 16 |

\*The averages use effective levels. A phrase that isn't listed as a unit takes the highest level among its listed parts, and 7-9 counts as 7. YCT difficulty rises almost monotonically: Goblin Caves (2.66) and Hydra Swamp (2.60) are effectively tied. The HSK averages are noisier because HSK is built for adults and ranks kid words such as 厉害/酷/哇/蜂蜜 high. That is also why Honeycomb Forest's HSK average (2.10) looks higher than you'd expect for realm 2.

### By topic

| Realm | Topic | Items |
|---|---|---|
| Starter Meadow | Greetings & politeness | 20 |
| Starter Meadow | Pronouns & question words | 22 |
| Starter Meadow | Yes/no & core verbs | 18 |
| Starter Meadow | Particles | 5 |
| Starter Meadow | Numbers 1–10 | 10 |
| Starter Meadow | Adventure basics | 15 |
| Starter Meadow | Monster names | 1 |
| Starter Meadow | Animals | 1 |
| Honeycomb Forest | Food & drink | 37 |
| Honeycomb Forest | Wants & likes | 12 |
| Honeycomb Forest | Nature | 4 |
| Honeycomb Forest | Animals | 13 |
| Honeycomb Forest | Monster names | 1 |
| Honeycomb Forest | Exclamations & reactions | 2 |
| Crossroads Market | Shopping & money | 13 |
| Crossroads Market | Big numbers | 7 |
| Crossroads Market | Measure words | 8 |
| Crossroads Market | Colors | 9 |
| Crossroads Market | Clothes | 6 |
| Crossroads Market | Describing things | 8 |
| Goblin Caves | Dungeon & adventure | 7 |
| Goblin Caves | Monster names | 1 |
| Goblin Caves | School & classroom | 35 |
| Goblin Caves | Game & chat talk | 16 |
| Goblin Caves | Family & people | 18 |
| Goblin Caves | Requests & helping | 10 |
| Hydra Swamp | Time & dates | 27 |
| Hydra Swamp | Daily routine | 9 |
| Hydra Swamp | Connectors (basic) | 20 |
| Hydra Swamp | Monster names | 1 |
| Zombie Lands | Feelings | 30 |
| Zombie Lands | Body & health | 20 |
| Zombie Lands | Everyday actions | 17 |
| Zombie Lands | Monster names | 1 |
| Griffin Peaks | Places & directions | 34 |
| Griffin Peaks | Transportation | 11 |
| Griffin Peaks | Weather | 18 |
| Ogre Colosseum | Hobbies & sports | 21 |
| Ogre Colosseum | Exclamations & reactions | 30 |
| Demon King's Castle | Connectors (advanced) | 11 |
| Demon King's Castle | Opinions | 8 |
| Demon King's Castle | Heroic battle talk | 22 |
| Demon King's Castle | Races & story | 5 |
| Demon King's Castle | Monster names | 1 |

## Realm plan (difficulty rises with YCT/HSK)

| # | Realm | Monsters / boss | Topics taught | Theme |
|---|---|---|---|---|
| 1 | **Starter Meadow** (slice) | horned rabbits 角兔 | greetings & politeness, pronouns & question words, yes/no & core verbs, particles, numbers 1–10, adventure basics (救命, 小心, 快跑, 等一下, 帮忙) | Survive your first day and learn to say hi, count, and yell for help. |
| 2 | **Honeycomb Forest** (slice) | jumbo bees, Queen Bee 蜂后 | food & drink, wants & likes (我要……, 我喜欢……), nature, animals | Forage and trade for food in a giant-bee forest, then calm the Queen Bee. |
| 3 | **Crossroads Market** | mimics / slimes in the stalls | shopping & money, big numbers, measure words, colors, clothes, describing things | The town hub: buy gear, haggle (便宜一点儿吧) and describe items. |
| 4 | **Goblin Caves** | goblins 哥布林 | school & classroom, game & chat talk, family & people, requests & helping, dungeon basics (钥匙, 宝箱, 危险) | Goblins kidnapped the village kids and their teacher and turned the cave into a mock "school". Rescue your family and classmates. |
| 5 | **Hydra Swamp** | nine-headed hydra 九头蛇 | time & dates, daily routine, basic connectors (和, 也, 可是, 但是, 因为……所以……, 然后, 还是, 或者) | Each hydra head is part of a sentence. Chain clauses with connectors to cut them off in order. |
| 6 | **Zombie Lands** | zombies 丧尸 (Western style) | feelings, body & health, everyday actions | The zombies are sick villagers. Cure them by asking how they feel and what hurts (你怎么了? 我头疼). |
| 7 | **Griffin Peaks** | griffins / harpies | places & directions, transportation, weather | A sky road. Follow directions, read the weather, and call 马上到! to your allies. |
| 8 | **Ogre Colosseum** | ogre champions | hobbies & sports, exclamations & reactions (哇, 太棒了, 加油, 不会吧, 吓死我了, 好险) | An arena tournament where the crowd cheers and trash talk are the lesson. |
| 9 | **Demon King's Castle** | Demon King 魔王 | advanced connectors (虽然……但是……, 不但……而且……, 一边……一边……, 一……就……, 如果, 其实, 终于), opinions, heroic battle talk, races & story (人类, 精灵, 矮人, 兽人, 龙) | Persuade the other races to unite, then defeat the Demon King, who wants to rule them all by force. |

Design notes:
- Exclamations are formally taught in realm 8, but 我的妈呀 and 太好了 are taught in the slice. The rest (哇, 哎呀, 加油…) should appear from realm 1 onward as listening-only flavor in NPC barks, so kids have heard them long before they're drilled.
- Items from earlier realms should keep coming back in later dialogue (spaced repetition). The realm column marks where an item is *introduced*, not the only place it's used.
- Asian creatures are kept for story arcs only. 龙 appears in Races & story as a possible ally, since dragons are positive in Chinese culture. 僵尸 (the hopping vampire) is deliberately *not* used for the Western zombies.

## Vertical slice (40 items: Starter Meadow 23 + Honeycomb Forest 17)

| # | Simplified | Traditional | Pinyin | English | Realm | YCT | HSK | Speak | Read |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 你好 | 你好 | nǐ hǎo | hello | Starter | none | none | Y | Y |
| 2 | 再见 | 再見 | zàijiàn | goodbye | Starter | 1 | 1 | Y | Y |
| 3 | 谢谢 | 謝謝 | xièxie | thank you | Starter | 1 | 1 | Y | Y |
| 4 | 不客气 | 不客氣 | bù kèqi | you're welcome | Starter | 2 | 1 | Y | Y |
| 5 | 对不起 | 對不起 | duìbuqǐ | sorry | Starter | 2 | 1 | Y | Y |
| 6 | 没关系 | 沒關係 | méi guānxi | it's okay; no problem | Starter | 2 | 1 | Y | Y |
| 7 | 我 | 我 | wǒ | I; me | Starter | 1 | 1 | Y | Y |
| 8 | 你 | 你 | nǐ | you | Starter | 1 | 1 | Y | Y |
| 9 | 是 | 是 | shì | to be; yes | Starter | 1 | 1 | Y | Y |
| 10 | 不 | 不 | bù | not; no | Starter | 1 | 1 | Y | Y |
| 11 | 一 | 一 | yī | one | Starter | 1 | 1 | Y | Y |
| 12 | 二 | 二 | èr | two | Starter | 1 | 1 | Y | Y |
| 13 | 三 | 三 | sān | three | Starter | 1 | 1 | Y | Y |
| 14 | 四 | 四 | sì | four | Starter | 1 | 1 | Y | Y |
| 15 | 五 | 五 | wǔ | five | Starter | 1 | 1 | Y | Y |
| 16 | 六 | 六 | liù | six | Starter | 1 | 1 | Y | Y |
| 17 | 七 | 七 | qī | seven | Starter | 1 | 1 | Y | Y |
| 18 | 八 | 八 | bā | eight | Starter | 1 | 1 | Y | Y |
| 19 | 九 | 九 | jiǔ | nine | Starter | 1 | 1 | Y | Y |
| 20 | 十 | 十 | shí | ten | Starter | 1 | 1 | Y | Y |
| 21 | 救命 | 救命 | jiùmìng | help! (save me!) | Starter | none | 6 | Y | Y |
| 22 | 小心 | 小心 | xiǎoxīn | be careful! watch out! | Starter | 4 | 2 | Y | Y |
| 23 | 兔子 | 兔子 | tùzi | rabbit | Starter | 4 | none | N | Y |
| 24 | 吃 | 吃 | chī | to eat | Honeycomb | 1 | 1 | Y | Y |
| 25 | 喝 | 喝 | hē | to drink | Honeycomb | 1 | 1 | Y | Y |
| 26 | 米饭 | 米飯 | mǐfàn | (cooked) rice | Honeycomb | 1 | 1 | Y | Y |
| 27 | 面条 | 麵條 | miàntiáo | noodles | Honeycomb | 1 | 1 | Y | Y |
| 28 | 苹果 | 蘋果 | píngguǒ | apple | Honeycomb | 1 | 3 | Y | Y |
| 29 | 水 | 水 | shuǐ | water | Honeycomb | 1 | 1 | Y | Y |
| 30 | 蜂蜜 | 蜂蜜 | fēngmì | honey | Honeycomb | none | 7-9 | N | Y |
| 31 | 好吃 | 好吃 | hǎochī | tasty (food) | Honeycomb | 2 | 1 | Y | Y |
| 32 | 饿 | 餓 | è | hungry | Honeycomb | 3 | 1 | Y | Y |
| 33 | 喜欢 | 喜歡 | xǐhuan | to like | Honeycomb | 1 | 1 | Y | Y |
| 34 | 不要 | 不要 | bù yào | don't want; don't! | Honeycomb | none | 2 | Y | Y |
| 35 | 我要…… | 我要…… | wǒ yào … | I want … | Honeycomb | none | none | Y | Y |
| 36 | 我饿了 | 我餓了 | wǒ è le | I'm hungry | Honeycomb | none | none | Y | Y |
| 37 | 花 | 花 | huā | flower | Honeycomb | 4 | 1 | Y | Y |
| 38 | 蜜蜂 | 蜜蜂 | mìfēng | bee | Honeycomb | none | 7-9 | N | Y |
| 39 | 我的妈呀 | 我的媽呀 | wǒ de mā ya | oh my gosh! (lit. 'oh my mom!') | Honeycomb | none | none | Y | N |
| 40 | 太好了 | 太好了 | tài hǎo le | great! awesome! | Honeycomb | none | none | Y | Y |

The slice covers greetings and politeness, "me/you/is/not", numbers 1–10, the two most urgent RPG calls (救命, 小心), the rabbit, basic food, want/like frames, bees and flowers, and two big reactions. 兔子, 蜂蜜 and 蜜蜂 are listening/reading only because they're lower-value to *say*. 我的妈呀 is listening/speaking only because four characters is a lot to read this early.

## Column conventions

- **yct_level**: the lowest YCT level (1–4) in which the exact item appears. Otherwise `none`.
- **hsk3_level**: the HSK 3.0 (2021) level of the exact item: 1–6 or 7-9. Otherwise `none`. Erhua variants (哪儿↔哪, 一点儿, etc.) are matched to their list form.
- **notes**: for none-items, either "built from listed words A+B (parts max HSK x, YCT y)" or a short reason for inclusion. Also covers polyphones, tone sandhi and Taiwan wording.
- **pinyin**: dictionary citation tones, matching the HSK list and CC-CEDICT. 一 is written yī and 不 is written bù even where sandhi changes them in speech (一会儿 is said yíhuìr, 不客气 is said bú kèqi, 不要 is said bú yào). The notes point these out. **Recommendation:** have the game apply 一/不 sandhi automatically when displaying pinyin for audio/speech practice, or show both forms. Neutral tones follow the dictionary (xièxie, bàba, péngyou, duìbuqǐ).
- **listening**: Y for every item.
- **speaking**: Y for phrases and exclamations of 5 characters or fewer, and for short (2 characters or fewer) HSK/YCT level ≤2 words in everyday topics. N for particles, measure words, paired connectors (因为……所以……), monster names and long frames. A few items were adjusted by hand.
- **reading**: Y for visually distinct words of 3 characters or fewer at level ≤3, and for short phrases of 4 characters or fewer at level ≤2. N for monster names and long or advanced phrases. Slice items of 3 characters or fewer are always Y.
- **slice**: Y for the 40 slice items.

## Sources and method

| Source | URL | Use |
|---|---|---|
| HSK 3.0 (2021) full word list, all 11,092 entries, levels 1–6 and 7-9, machine-readable transcription | https://github.com/ivankra/hsk30 (raw: https://raw.githubusercontent.com/ivankra/hsk30/master/hsk30.csv) | Exact-match HSK level for every item |
| Official standard GF0025-2021 (MoE PDF, the original the transcription is based on) | http://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202103/W020210329527301787356.pdf | Reference |
| YCT levels 1–4 vocabulary (new words per level, TSV) | https://github.com/krmanik/HSK-3.0/tree/main/YCT (`yct_level_1.tsv` … `yct_level_4.tsv`) | Exact-match YCT level (lowest level wins) |
| Purple Culture YCT 1–4 lists | https://www.purpleculture.net/textbook-vocab-lists/?listid=10026 (…10027, 10028, 10029) | Cross-check of cumulative counts: krmanik has 83/153/306/603, Purple Culture has 83/153/303/600 |
| CC-CEDICT | https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.zip | Pinyin/definition check for non-list items |
| OpenCC (s2tw and s2twp) and pypinyin (Python) | https://github.com/BYVoid/OpenCC, https://github.com/mozillazg/python-pinyin | Traditional conversion and an automatic second opinion on pinyin |

Method: every item was matched in code against both lists: exact form first, then erhua variants. Multi-word phrases that aren't listed as a unit were segmented against the combined HSK+YCT lexicon to record their component levels. Pinyin was compared with the HSK list pinyin, CC-CEDICT and pypinyin, and every disagreement was reviewed by hand. For example, pypinyin is wrong about 肚子 dùzi, 长 cháng, 只 zhī/zhǐ and 谁 shéi. Traditional forms come from OpenCC s2tw (script only, Taiwan glyph standard). s2twp phrase-level suggestions were reviewed by hand: valid wording differences went into notes, and bad suggestions were dropped (e.g. 打开→開啟). 只 (measure word) was fixed by hand to 隻. Build scripts and the source files are in `desy/build/` and `desy/sources/`. `build/items_full_backup.txt` is an earlier, longer version of 714 items, if you want more.

## Caveats

1. **The Traditional column is script conversion only.** Where Taiwan uses a *different word*, the Traditional cell still holds the converted mainland word, and the Taiwan word is in `notes`. A future Traditional toggle should probably use a separate `taiwan_wording` column. Items affected:
   - 自行车 → Taiwan 腳踏車
   - 公共汽车 → Taiwan 公車 (mainland colloquial is 公交车)
   - 视频 → Taiwan 影片
   - 米饭 → Taiwan 白飯
   - 粉色 → Taiwan 粉紅色
   - 早上好 → Taiwan 早安
   - 作业 → Taiwan also 功課
   - 熊猫 → Taiwan also 貓熊
   - 星期 → Taiwan also 禮拜
   - 男孩儿/女孩儿 → Taiwan 男生/女生
   - Words cut from this draft that would also differ: 出租车/計程車, 地铁/捷運, 本子/筆記本. 饭店 means "hotel" in Taiwan (restaurant is 餐廳).
2. **Erhua (儿) is mainland and especially northern.** Affected items: 哪儿, 这儿, 那儿, 一点儿, 有点儿, 一会儿, 快点儿, 画画儿, 男孩儿. Taiwan and southern speakers say 哪裡/這裡/那裡/一點/有點. These are kept because Simplified plus zh-CN audio is the default, and each note gives the Taiwan form.
3. **我的妈呀** is colloquial and very common in the north. It's widely understood but sounds casual or funny, so it fits kids and games. 天哪/天啊 is the more neutral alternative. **吓死我了 / 气死我了** are hyperbole and fine for kids. **死**, **讨厌** and **完了** are normal kid speech but should appear in playful contexts only.
4. **Level sources:** the YCT lists are a community transcription, checked against Purple Culture counts only; the row contents weren't fully visible to check. The small count difference (3 words, e.g. Purple Culture puts 超市 in YCT3) could shift a few yct_level values. HSK uses the 2021 standard as requested. The revised syllabus announced in late 2025 has different level boundaries (e.g. a smaller HSK1), so re-run `build.py` if you switch.
5. **HSK ranks kid words as advanced:** 厉害/棒 are HSK5, 哇/酷/救命 are HSK6, 蜂蜜/蜜蜂 are 7-9, and 兔子 isn't listed at all. They're kept on purpose. YCT is the better guide for kids, so realm order follows YCT.
6. **Game and fantasy words** aren't on any list and are coined or translated: 角兔 (coined, "horn rabbit"), 哥布林 (transliteration of "goblin"), 蜂后 (queen bee), 九头蛇, 丧尸 (mainland word for a Western zombie; 僵尸/殭屍 is the Chinese hopping vampire, and Taiwan often uses 殭屍 for both), 精灵/矮人/兽人 (the standard translations of elf, dwarf and orc), 魔王, 魔法, 城堡. 龙 has positive connotations, so avoid making it a purely evil monster without a story reason.
7. **Polyphones to handle in TTS:** 还 (hái/huán), 长 (cháng/zhǎng), 只 (zhī/zhǐ), 喂 (wéi on the phone; the list gives wèi), 哇 (list gives neutral wa, used here as the exclamation wā), 嗯 (ǹg/ńg, tone varies), 哦 (ò/ó). Give the TTS explicit pinyin or SSML phonemes for these.
8. **Audio:** the earlier memo recommended zh-TW audio. That's superseded: use zh-CN (Mandarin, Putonghua) voices to match Simplified.
9. **Exact targets:** 454 words (target 300–450) is 4 over the top of the range, and 131 phrases is within the 80–150 target. Cutting the 4 lowest-value words (e.g. 或者, 以前, 一直, 同意) would land exactly at 450.
