// Screenshots of the v3.4 spells + quests flow (runs the spell checks of tests/spells.mjs):
//   node tests/spellshots.mjs [baseUrl] [outPrefix]   → <outPrefix>{magic-shop,spellbook-locked,spellbook,spell-cast,quest-board}.png
import { spawnSync } from 'node:child_process';
const [BASE = 'http://127.0.0.1:8795/', OUT = '/tmp/spell-'] = process.argv.slice(2);
process.exit(spawnSync('node', [new URL('./spells.mjs', import.meta.url).pathname, BASE, OUT], { stdio: 'inherit' }).status ?? 1);
