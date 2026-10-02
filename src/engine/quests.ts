// Town quest boards (spec v3.3 §7.11, desy/spells.md §6). Rules and numbers come from src/data/quests.json + towns.json.
import { QUESTS, QUEST, QUEST_RULES, TOWN, TOWNS, LOC, POOLS, CONS, questGold, QuestDef } from '../data';
import { S, save } from './state';
import { proficient } from './learning';

/** Towns whose board is open: a town of this build whose realm has an unlocked location. */
export function openTowns() { return TOWNS.filter(t => t.inBuild && t.realmLocs.some(id => S.locs[id]?.unlocked)); }
/** Realm (= town number) of a location. */
export const realmOf = (locId: string) => LOC[locId]?.tier ?? 0;
const realmWords = (town: number) => (TOWN[town]?.realmLocs || []).flatMap(id => POOLS[id] || []);
const realmBossBeaten = (town: number) => { const ls = TOWN[town]?.realmLocs || []; return ls.length > 0 && !!S.locs[ls[ls.length - 1]]?.bossDefeated; };

export type QuestView = { q: QuestDef; status: 'locked' | 'open' | 'active' | 'done' | 'claimed'; n: number; goal: number; why?: string };
/** Progress of one quest, for the board and the tests. */
export function questView(q: QuestDef): QuestView {
  const st = S.quests[q.id]; const goal = q.type === 'delivery' ? 1 : q.n;
  if (st?.s === 'claimed') return { q, status: 'claimed', n: goal, goal };
  if (!st) {
    if (q.type === 'delivery') {
      const to = q.toTown ? TOWN[q.toTown] : null;
      if (QUEST_RULES.deliveryAfterRealmBoss && !realmBossBeaten(q.town)) return { q, status: 'locked', n: 0, goal, why: 'after the realm boss' };
      if (!to?.inBuild) return { q, status: 'locked', n: 0, goal, why: `${to?.en || 'that town'} is not in this build yet` };
    }
    return { q, status: 'open', n: 0, goal };
  }
  const n = q.type === 'words' ? realmWords(q.town).filter(id => proficient(id) && !(st.base || []).includes(id)).length
    : q.type === 'delivery' ? (st.done ? 1 : 0) : st.n;
  return { q, status: n >= goal ? 'done' : 'active', n: Math.min(n, goal), goal };
}
export function accept(id: string): boolean {
  const q = QUEST[id]; if (!q || S.quests[id] || questView(q).status !== 'open') return false;
  S.quests[id] = { s: 'active', n: 0, at: Date.now(), ...(q.type === 'words' ? { base: realmWords(q.town).filter(w => proficient(w)) } : {}) };
  save(); return true;
}
export type Reward = { gold: number; item: string | null; cosmetic: string | null };
export function reward(q: QuestDef): Reward { return { gold: questGold(q), item: q.rewardItem && CONS[q.rewardItem] ? q.rewardItem : null, cosmetic: q.rewardCosmetic }; }
/** Pays a finished quest; returns the reward or null if it isn't finished. */
export function claim(id: string): Reward | null {
  const q = QUEST[id]; if (!q || questView(q).status !== 'done') return null;
  const r = reward(q); S.gold += r.gold; if (r.item) S.inv[r.item] = (S.inv[r.item] || 0) + 1;
  S.quests[id].s = 'claimed'; S.quests[id].done = Date.now(); save(); return r;
}
/** A kill in a battle at locId. Returns messages for the battle log ("🐰 Bounty 3/8", "🍄 小蘑菇 +1"). Summoned enemies don't count. */
export function onKill(enemyId: string, locId: string, summoned: boolean): string[] {
  const out: string[] = []; if (summoned) return out;
  for (const q of QUESTS) {
    const st = S.quests[q.id]; if (!st || st.s !== 'active' || q.enemy !== enemyId || q.town !== realmOf(locId)) continue;
    if (st.n >= q.n) continue;
    if (q.type === 'bounty') { st.n++; out.push(`📋 ${q.titleZh}: ${st.n}/${q.n}`); }
    else if (q.type === 'collect' && Math.random() < QUEST_RULES.collectDrop) { st.n++; out.push(`📋 ${q.dropZh} +1 (${st.n}/${q.n})`); }
  }
  if (out.length) save();
  return out;
}
/** Entering a location: a carried letter for the town of that realm is delivered and paid on arrival (spec: "paid on arrival"). */
export function onArrive(locId: string): { q: QuestDef; r: Reward }[] {
  const out: { q: QuestDef; r: Reward }[] = [];
  for (const q of QUESTS) {
    const st = S.quests[q.id]; if (q.type !== 'delivery' || !st || st.s !== 'active' || st.done) continue;
    const to = q.toTown ? TOWN[q.toTown] : null; if (!to?.inBuild || !to.realmLocs.includes(locId)) continue;
    st.done = Date.now(); const r = claim(q.id); if (r) out.push({ q, r });
  }
  return out;
}
/** Finished but not yet claimed (for the ❗ on the board). */
export const claimable = () => QUESTS.filter(q => S.quests[q.id] && questView(q).status === 'done');
