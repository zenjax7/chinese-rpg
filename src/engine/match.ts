// Spec §8.2 matching (lenient). Graded = the answer appears in any of the top recognition alternatives.
import { pinyin } from 'pinyin-pro';
import { ITEMS, Item } from '../data';

// Traditional -> Simplified, built from the curriculum's own traditional column (stand-in for OpenCC t2s).
const T2S: Record<string, string> = {};
for (const it of ITEMS) { const a = [...it.trad], b = [...it.zh]; if (a.length === b.length) a.forEach((c, i) => { if (c !== b[i]) T2S[c] = b[i]; }); }
// plus common characters a zh-TW/zh-HK recogniser (or a traditional-Chinese keyboard/IME default) may return
const T2S_EXTRA = '們们這这個个來来說说話话時时會会對对國国學学買买賣卖東东書书車车門门問问聽听開开關关見见謝谢' +
  '媽妈馬马飯饭現现餓饿蘋苹愛爱點点幾几號号歲岁兩两貓猫鳥鸟魚鱼雞鸡龍龙紅红綠绿藍蓝黃黄樂乐歡欢誰谁麼么沒没還还氣气錢钱塊块電电腦脑視视機机兒儿園园醫医飛飞島岛鐘钟頭头發发髮发裡里裏里麵面';
for (let i = 0; i + 1 < T2S_EXTRA.length; i += 2) if (T2S_EXTRA[i] !== T2S_EXTRA[i + 1]) T2S[T2S_EXTRA[i]] ??= T2S_EXTRA[i + 1];
const DIG = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function numToZh(n: number): string {
  if (n < 10) return DIG[n];
  if (n < 20) return '十' + (n % 10 ? DIG[n % 10] : '');
  if (n < 100) return DIG[Math.floor(n / 10)] + '十' + (n % 10 ? DIG[n % 10] : '');
  return String(n).split('').map(d => DIG[+d]).join('');
}
const FILLERS = ['那个', '啊', '呃', '嗯'];
/** Normalises a transcript or answer: full-width -> half-width (NFKC), no whitespace/punctuation/symbols (ASCII and CJK), traditional -> simplified,
 *  digits -> Chinese numerals, 两 = 二, leading/trailing fillers and a final 儿 dropped. */
export function normZh(s: string, keepFillers = false): string {
  let x = (s || '').normalize('NFKC').replace(/[\s\p{P}\p{S}\u3000]/gu, '');
  x = [...x].map(c => T2S[c] || c).join('');
  x = x.replace(/\d+/g, d => numToZh(parseInt(d, 10)));
  x = x.replace(/两/g, '二');                 // 二/两 both accepted
  if (!keepFillers) { let changed = true; while (changed) { changed = false; for (const f of FILLERS) { if (x.startsWith(f) && x.length > f.length) { x = x.slice(f.length); changed = true; } if (x.endsWith(f) && x.length > f.length) { x = x.slice(0, -f.length); changed = true; } } } }
  if (x.length > 1 && x.endsWith('儿')) x = x.slice(0, -1);
  return x;
}
function toneless(s: string): string[] { return s ? (pinyin(s, { toneType: 'none', type: 'array', v: true }) as string[]).map(p => p.toLowerCase()) : []; }
const LENIENT: [string, string][] = [['zh', 'z'], ['ch', 'c'], ['sh', 's'], ['l', 'n']];
function sylCost(a: string, b: string): number {
  if (a === b) return 0;
  const na = a.replace(/ng$/, 'n'), nb = b.replace(/ng$/, 'n'); if (na === nb) return 0.5;
  for (const [x, y] of LENIENT) { const f = (s: string) => s.startsWith(x) ? y + s.slice(x.length) : s; if (f(a) === f(b)) return 0.5; }
  return 1;
}
function sylSim(a: string[], b: string[]) {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + sylCost(a[i - 1], b[j - 1]));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1);
}
export function matchZh(alts: string[], item: Item): { ok: boolean; rule?: string; alt?: string } {
  const answers = [item.zh, ...item.altZh];
  for (const alt of alts) {
    for (const ans of answers) {
      const keep = FILLERS.some(f => ans.includes(f));
      const A = normZh(alt, keep), N = normZh(ans, keep); if (!A || !N) continue;
      if (A === N) return { ok: true, rule: 'exact', alt };
      if (A.includes(N) && (N.length >= 2 || A.length <= 4)) return { ok: true, rule: 'contained', alt };   // like speech-demo: the answer anywhere in the transcript (1-char answers: short transcripts only)
      const pa = toneless(A), pn = toneless(N);
      if (pa.join(' ') === pn.join(' ')) return { ok: true, rule: 'homophone', alt };
      if (pn.length >= 4 && sylSim(pa, pn) >= 0.8) return { ok: true, rule: 'fuzzy', alt };
    }
  }
  return { ok: false };
}

// ---------------- English ----------------
const EN_STOP = new Set(['a', 'an', 'the', 'to']);
function stem(w: string) { return w.replace(/(ies)$/, 'y').replace(/(es|s|ed|ing)$/, '') || w; }
export function normEnTokens(s: string): string[] {
  return (s || '').normalize('NFKC').toLowerCase().replace(/’/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(t => t && !EN_STOP.has(t)).map(stem);
}
export function senses(item: Item): string[] {
  return [...item.en.replace(/\([^)]*\)/g, ' ').split(/[;,/]/), ...item.altEn].map(s => s.trim()).filter(Boolean);
}
const WEAK = new Set(['be', 'i', 'you', 'it', 'is', 'am', 'are', 'of', 'one', "'m", 'm', 'thing']);
export function matchEn(alts: string[], item: Item): { ok: boolean; rule?: string; alt?: string } {
  const ss = senses(item).map(normEnTokens).filter(t => t.length);
  for (const alt of alts) {
    const A = normEnTokens(alt); if (!A.length) continue; const aj = A.join(' ');
    for (const S of ss) {
      if (aj === S.join(' ')) return { ok: true, rule: 'exact', alt };
      if ((' ' + aj + ' ').includes(' ' + S.join(' ') + ' ')) return { ok: true, rule: 'contained', alt };   // whole phrase inside a longer transcript
      const sa = new Set(A), sb = new Set(S); let inter = 0; sb.forEach(t => { if (sa.has(t)) inter++; });
      if ((2 * inter) / (sa.size + sb.size) >= 0.8) return { ok: true, rule: 'token-set', alt };
      if (S.length <= 2) {
        const head = S.filter(t => !WEAK.has(t)).sort((a, b) => b.length - a.length)[0];
        if (head && A.includes(head)) return { ok: true, rule: 'head-word', alt };
      }
    }
  }
  return { ok: false };
}
