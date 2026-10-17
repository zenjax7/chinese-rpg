// Character assembly (combat-spec §9.4) helpers shared by the battle loops.
export const ASM_LIVE = '[data-testid="tile"]:not([disabled])';
/** Answer the assembly question on screen: ok = tap the characters in order; else tap `rightFirst` correct tiles, then one wrong tile. */
export async function tapAsm(p, ok, rightFirst = 0) {
  const q = await p.evaluate(() => window.__proto.q); const ans = [...q.zh];
  const n = ok ? ans.length : Math.min(rightFirst, ans.length - 1);
  for (let i = 0; i < n; i++) await p.locator(`${ASM_LIVE}[data-t="${ans[i]}"]`).first().click();
  if (!ok) await p.locator(`${ASM_LIVE}:not([data-t="${ans[n]}"])`).first().click();
  return q;
}
