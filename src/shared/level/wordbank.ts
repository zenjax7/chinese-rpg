/** The global word bank (level-editor.md §2.5.1), generated from curriculum.csv by tools/editor/build_wordbank.py. */
import bank from './wordbank.json' with { type: 'json' };
import type { WordRow } from './types.js';

export const WORDS = (bank as unknown as { words: WordRow[] }).words;
export const WORD_IDS = new Set(WORDS.map(w => w[0]));
