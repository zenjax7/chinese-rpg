// Spell choreographer (spec v3.4 §6.7 visuals). Plays one cast from Arty's recipe (public/spells/spells_fx.json, schema in
// art/spells/README.md, written by art/spells/tools/build_recipes.py) with a per-frame timeline + Phaser particle emitters;
// textures come from public/spells/fx/manifest.json.
// - Recipes are authored for the 1280x720 frame (= the game frame): positions are anchors + offsets as fractions of the
//   target's (or hero's) height ("...Rel") or of the screen ("...Frac"); speeds/gravity/radii are 1280-frame px.
// - Textures are drawn at manifest displayScaleByCanvas['1280x720'] (0.6667) x the recipe scale. A layer with blendMode ADD
//   uses the black-background add_file (texture key fx_<name>_add) when it was delivered; NORMAL uses the alpha file.
// - Each cast runs for the recipe's own length (cast + delay + travel + stagger + longest impact part, or the longest ambient
//   layer: 1.5-2.9 s, super_blizzard ~4.2 s, meteor_shower ~4.0 s); capped at castAnim.maxMs. A tap / Enter / Space skips it.
// - No recipe for a spell: the recipe of the element's fallback spell (spellfx.json elementFallback) is used; no recipes at
//   all: a built-in orb. A texture that wasn't delivered: element-coloured orbs / a generated dot.
// - Statuses (soaked / dazed / chilled / frozen) are handed to the game when the impact ends (onStatus), as in the README.
import Phaser from 'phaser';
import CFG from '../data/spellfx.json';

export type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
/** top = top of the visible body, head = head anchor (snow hat / dazed stars), feet = ground point, h = sprite display height. */
export interface FxTarget { x: number; top: number; head: number; feet: number; h: number; body: Body; sprite: string | null; }
export interface FxHost { scene: Phaser.Scene; hero: Body; heroBox: { x: number; feet: number; w: number; h: number }; playOnce: (b: Body, id: string | null, anim: string) => boolean; hitStop: (b: Body) => void; }
export interface CastHandle { done: Promise<void>; skip: () => void; totalMs: number; naturalMs: number; mode: 'recipe' | 'element' | 'fallback'; missing: string[]; }

const C: any = CFG;
const W = 1280, H = 720;
const KS = 1280 / (C.statusCanvas?.width || 960);       // status offsets in fx/manifest.json are 960-frame px
let MAN: any = null; let RECIPES: Record<string, any> = {};
const texInfo = (name?: string | null) => (name && MAN?.textures?.[name]) || null;
export const fxKey = (name: string) => `fx_${name}`;
const TEXS = () => MAN?.displayScaleByCanvas?.['1280x720'] ?? (MAN?.displayScale ?? 0.5) * 4 / 3;
/** Called by the scene once the fx manifest / recipes JSON are loaded. */
export function setFxData(manifest: any, recipes: any) {
  MAN = manifest && typeof manifest === 'object' ? manifest : null;
  RECIPES = {}; for (const r of recipes?.spells || []) if (r?.id) RECIPES[r.id] = r;
  const p = (window as any).__proto = (window as any).__proto || {};
  p.spellFx = { textures: Object.keys(MAN?.textures || {}), recipes: Object.keys(RECIPES), texScale: TEXS() };
}
/** Texture files to load: [key, url, frameWidth?, frameHeight?] (urls relative to public/). ADD versions load as fx_<name>_add. */
export function fxTextureList(): [string, string, number?, number?][] {
  const out: [string, string, number?, number?][] = [];
  for (const [k, t] of Object.entries<any>(MAN?.textures || {})) {
    if (!t?.file) continue;
    out.push([fxKey(k), `spells/${t.file}`, t.frameWidth, t.frameHeight]);
    if (t.add_file && !t.frameWidth) out.push([fxKey(k) + '_add', `spells/${t.add_file}`]);
  }
  return out;
}
export const recipeFor = (id: string) => RECIPES[id] || null;
const colorNum = (c?: string, d = 0xffffff) => (c && /^#?[0-9a-f]{6}$/i.test(c) ? parseInt(c.replace('#', ''), 16) : d);
export const elementColor = (el: string) => colorNum(C.elementColor?.[el], 0xffffff);
const isRed = (c: number) => { const r = c >> 16 & 255, g = c >> 8 & 255, b = c & 255; return r > 150 && r > g + 60 && r > b + 60; };
const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
const easeOut = (u: number) => 1 - (1 - u) * (1 - u);
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
const env = (t: number, start: number, i: number, hold: number, o: number) => {   // 0..1 fade-in / hold / fade-out envelope
  t -= start; if (t < 0 || t > i + hold + o) return 0; if (t < i) return t / Math.max(i, 1); if (t < i + hold) return 1; return 1 - (t - i - hold) / Math.max(o, 1); };

/** Wand tip in frame px: config offset from the hero sprite's bottom-centre (src/data/spellfx.json wandTip). */
export function wandTip(h: FxHost) { const b = h.heroBox; return { x: b.x + (C.wandTip?.x ?? 0.5) * b.w, y: b.feet + (C.wandTip?.y ?? -0.6) * b.h }; }

/** Built-in last resort (no spells_fx.json): an element-coloured orb from the wand to each target. */
const ORB: any = { targeting: { staggerMs: 120, impactDelayMs: 0 }, cast: { at: 'wand_tip', durationMs: 300, glow: null, particles: [] },
  projectile: { texture: null, path: 'straight', from: 'wand_tip', to: 'target_center', travelMs: 450, scale: 1, scaleFrom: 1, count: 1, intervalMs: 0 },
  impact: { texture: null, at: 'target_center', growMs: 0, holdMs: 0, fadeMs: 0, particles: [], enemyReaction: { type: 'hurt_shake', durationMs: 450 } }, ambient: [] };

/** Plays one cast. onImpact(k): the hit on target k lands (damage number, HP bar). onStatus(k): the impact on k is over (status overlay). */
export function playCast(h: FxHost, spell: { id: string; element: string; emoji: string; target: string }, targets: FxTarget[], onImpact: (k: number) => void, onStatus: (k: number) => void = () => {}, lasting: (k: number) => string | null = () => null): CastHandle {
  const s = h.scene; const col = elementColor(spell.element); const missing = new Set<string>();
  let rec = recipeFor(spell.id); let mode: CastHandle['mode'] = rec ? 'recipe' : 'element';
  if (!rec) rec = recipeFor(C.elementFallback?.[spell.element] || '') || recipeFor(C.elementFallback?.star || '');
  if (!rec) { rec = ORB; mode = 'fallback'; }
  const tg = rec.targeting || {}; const stagger = tg.staggerMs ?? rec.staggerMs ?? 0, delay = tg.impactDelayMs ?? rec.impactDelayMs ?? 0;
  const tgts = targets.slice(0, C.maxTargets || 3);
  const objs: Phaser.GameObjects.GameObject[] = []; const timers: Phaser.Time.TimerEvent[] = []; const resets: (() => void)[] = [];
  const fns: ((t: number) => void)[] = [];
  const impactsLeft = new Set(tgts.map((_, k) => k)); const statusLeft = new Set(tgts.map((_, k) => k));
  const track = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(o); return o; };
  const hasTex = (n?: string | null) => { if (!n) return false; const ok = s.textures.exists(fxKey(n)); if (!ok) missing.add(n); return ok; };
  const pr = rec.projectile || {}; const im = rec.impact || {}; const cast = rec.cast || {}; const amb = (rec.ambient || []) as any[];
  if (mode !== 'fallback' && ![pr.texture, im.texture, cast.glow?.texture, ...amb.map(a => a.texture)].filter(Boolean).some(t => hasTex(t))) mode = 'fallback';

  // ---- geometry (1280x720 frame)
  const hb = h.heroBox; const heroTop = hb.feet - hb.h;
  const body = (t: FxTarget) => ({ cx: t.x, cy: (t.top + t.feet) / 2, top: t.top, head: t.head ?? t.top, feet: t.feet, th: Math.max(40, t.feet - t.top) });
  const at0 = (name: string | undefined, t: FxTarget, rel = 0) => { const b = body(t);
    const y = name === 'target_head' ? b.head : name === 'target_feet' ? b.feet : b.cy; return { x: name === 'target_feet' ? t.x : b.cx, y: y + rel * b.th }; };
  const castPt = cast.at === 'above_hero' ? { x: hb.x, y: heroTop + (cast.offsetYRel || 0) * hb.h } : wandTip(h);

  // ---- textures
  const blendOf = (n: string | null | undefined, b?: string | null) => (b ?? texInfo(n)?.blendMode) === 'ADD' ? 'ADD' : 'NORMAL';
  const keyOf = (n: string, b: string) => b === 'ADD' && s.textures.exists(fxKey(n) + '_add') ? fxKey(n) + '_add' : fxKey(n);
  const texH = (n?: string | null) => (texInfo(n)?.frameHeight || texInfo(n)?.height || 100) * TEXS();
  /** An fx image (hidden until its timeline shows it). Scale unit: setScale(u * TEXS()) -> use sc(o, u). */
  const image = (n: string | null | undefined, depth = 9, b?: string | null, fallbackR = 18) => {
    if (n && hasTex(n)) { const bl = blendOf(n, b); const ti = texInfo(n);
      const o = s.add.image(-999, -999, keyOf(n, bl)).setDepth(depth).setBlendMode(bl === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setVisible(false);
      if (ti?.origin) o.setOrigin(ti.origin.x, ti.origin.y); if (ti?.frameWidth) o.setFrame(0); (o as any).__u = TEXS(); return track(o) as Phaser.GameObjects.Image; }
    const c: any = s.add.circle(-999, -999, fallbackR, col, 0.9).setStrokeStyle(3, 0xffffff, 0.8).setDepth(depth).setVisible(false); c.__u = 1; return track(c) as Phaser.GameObjects.Image;
  };
  const sc = (o: any, u: number, sx = 1, sy = 1) => o.setScale(u * o.__u * sx, u * o.__u * sy);
  const dot = () => { if (!s.textures.exists('fx__dot')) { const g = s.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8); g.generateTexture('fx__dot', 16, 16); g.destroy(); } return 'fx__dot'; };
  /** Arty's emitter -> Phaser particles (README "Particles"). countMul halves follow-up hits. */
  const emit = (e: any, x: number, y: number, follow?: Phaser.GameObjects.GameObject, depth = 10, countMul = 1) => {
    if (!e) return null; const ok = hasTex(e.texture); const bl = blendOf(e.texture, e.blendMode); const key = ok ? keyOf(e.texture, bl) : dot();
    const u = ok ? TEXS() : 0.5; const life = e.lifespanMs || 500; const spin = e.spinDegPerSec || 0;
    const em = s.add.particles(x, y, key, {
      speed: { min: e.speedMin ?? 40, max: e.speedMax ?? 100 }, angle: { min: e.angleMin ?? 0, max: e.angleMax ?? 360 },
      lifespan: life, gravityY: e.gravityY || 0, scale: { start: (e.scaleStart ?? 1) * u, end: (e.scaleEnd ?? 0.3) * u },
      alpha: { start: e.alphaStart ?? 1, end: e.alphaEnd ?? 0 }, blendMode: bl === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL,
      rotate: spin ? { onEmit: () => Math.random() * 360, onUpdate: (p: any, _k: string, t: number) => (p.__r0 ??= Math.random() * 360) + (p.__sg ??= Math.random() < 0.5 ? 1 : -1) * spin * t * life / 1000 } as any : 0,
      emitting: false, ...(ok ? {} : { tint: col }), ...(e.tint ? { tint: (Array.isArray(e.tint) ? e.tint : [e.tint]).map((c: string) => colorNum(c)) } : {}),
      ...(e.spawnRadius ? { emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, e.spawnRadius) } as any } : {}),
    }).setDepth(depth);
    track(em); if (follow) em.startFollow(follow as any);
    const n = Math.max(0, Math.round((e.count ?? 6) * countMul)) || (e.count ? 1 : 0);
    if (e.emitOverMs > 0 && n > 0) { em.frequency = e.emitOverMs / n; em.quantity = 1; em.start(); timers.push(s.time.delayedCall(e.emitOverMs, () => em.active && em.stop())); }
    else if (n > 0) em.explode(n);
    return em;
  };
  const at = (ms: number, fn: () => void) => { const t = s.time.delayedCall(Math.max(0, ms), fn); timers.push(t); return t; };
  const show = (o: any, x: number, y: number, alpha: number) => { o.setPosition(x, y).setAlpha(Math.max(0, Math.min(1, alpha))).setVisible(alpha > 0.003); };

  // ---- enemy reactions (README "Enemy reactions"; ported from the demo renderer)
  const react = (t: FxTarget, r: any, t0: number) => {
    const b: any = t.body; if (!b?.active || !r) return; const type = r.type || 'hurt_shake'; const d = r.durationMs || 400; const bb = body(t);
    const x0 = b.x, y0 = b.y, sx0 = b.scaleX, sy0 = b.scaleY;
    const restore = () => { if (b.active) { b.setPosition(x0, y0).setScale(sx0, sy0); } };
    resets.push(restore);
    if (type === 'hurt_shake') { h.hitStop(t.body); h.playOnce(t.body, t.sprite, 'hurt'); }
    if (type === 'lift_spin') h.playOnce(t.body, t.sprite, 'hurt');
    if (type === 'freeze' && b instanceof Phaser.GameObjects.Sprite) { b.stop(); b.setFrame(r.faceFrame ?? 5);
      resets.push(() => { if (b.active && t.sprite && s.anims.exists(`${t.sprite}_idle`)) b.play(`${t.sprite}_idle`); }); at(t0 + d, () => { if (b.active && t.sprite && s.anims.exists(`${t.sprite}_idle`)) b.play(`${t.sprite}_idle`); }); }
    let ended = false;
    fns.push(tt => { const u = (tt - t0) / d; if (u < 0 || ended || !b.active) return; if (u > 1) { ended = true; restore(); return; }
      let dx = 0, dy = 0, sx = 1, sy = 1;
      if (type === 'hurt_shake') dx = 7 * Math.sin(u * 2 * Math.PI * 6) * (1 - u);
      else if (type === 'shiver') dx = 3.5 * Math.sin(u * d / 1000 * 2 * Math.PI * 22) * (1 - u * 0.6);
      else if (type === 'lift_spin') { const prof = u < 0.75 ? Math.min(1, u / 0.25) : Math.max(0, 1 - (u - 0.75) / 0.2);
        dy = -(r.liftRel ?? 0.25) * bb.th * easeOut(prof); sx = Math.cos((r.turns ?? 2) * 2 * Math.PI * Math.min(1, u / 0.8)); if (Math.abs(sx) < 0.12) sx = sx >= 0 ? 0.12 : -0.12;
        if (u > 0.95 && r.plopSquash) sy = 1 - r.plopSquash * Math.sin((u - 0.95) / 0.05 * Math.PI); }
      else if (type === 'bounce') dy = -0.1 * bb.th * Math.sin(Math.PI * u);
      else if (type === 'hop') dy = -(r.heightRel ?? 0.12) * bb.th * Math.abs(Math.sin(Math.PI * (r.hops ?? 2) * u));
      b.setPosition(x0 + dx, y0 + dy).setScale(sx0 * sx, sy0 * sy); });
  };

  // ---- 1. cast: hero pose + glow at the wand tip
  const Cms = cast.durationMs ?? 250;
  if (h.hero instanceof Phaser.GameObjects.Sprite && h.hero.texture.key === 'hero') { const hero = h.hero; hero.stop(); hero.setFrame(cast.heroFrame ?? 3);
    at(Cms + 120, () => { if (hero.active && s.anims.exists('hero_idle')) hero.play('hero_idle'); }); }
  if (cast.glow) { const g = cast.glow; const o = image(g.texture, 9, g.blendMode, 14); const big = pr.path && pr.path !== 'none' && pr.texture === g.texture;
    fns.push(t => { if (t > Cms + (big ? 0 : 150)) { o.setVisible(false); return; } const u = Math.min(1, t / Cms);
      sc(o, lerp(g.scaleFrom ?? 0.4, g.scaleTo ?? 1.2, easeOut(u))); o.setAngle(t * 0.09);
      show(o, castPt.x, castPt.y, (g.alpha ?? 1) * Math.min(1, t / 80) * (big ? 1 : 1 - Math.max(0, (t - Cms) / 150))); }); }
  for (const e of cast.particles || []) emit(e, castPt.x, castPt.y);

  // ---- 2. ambient layers
  const cloudY = new Map<FxTarget, number>();
  for (const a of amb) {
    const st = a.startMs || 0;
    if (a.type === 'tint') { let c = colorNum(a.color, 0x000000); if (isRed(c)) c = 0x202040;   // never a red screen
      const r = track(s.add.rectangle(W / 2, H / 2, W, H, c, 1).setDepth(3).setAlpha(0)); fns.push(t => r.setAlpha(Math.min(0.6, a.alpha ?? 0.2) * env(t, st, a.inMs || 0, a.holdMs || 0, a.outMs || 0))); }
    else if (a.type === 'cloud_above_target') for (const t of tgts) {
      const b = body(t); const x = b.cx, y = b.top + (a.offsetYRel ?? -0.6) * b.th; cloudY.set(t, y);
      const o = image(a.texture, 9, a.blendMode, 30);
      fns.push(tt => { const k = env(tt, st, a.inMs || 0, a.holdMs || 0, a.outMs || 0); sc(o, (a.scale ?? 0.6) * (0.8 + 0.2 * k)); show(o, x + 3 * Math.sin(tt / 300), y, k); });
      if (a.rain) at(st + (a.inMs || 0), () => emit(a.rain, x, y + 25));
    }
    else if (a.type === 'puddle_under_target') for (const t of tgts) {
      const o = image(a.texture, 3, a.blendMode, 30);
      fns.push(tt => { const k = env(tt, st, a.inMs || 0, a.holdMs || 0, a.outMs || 0); sc(o, (a.scale ?? 0.6) * (0.3 + 0.7 * k)); show(o, t.x, t.feet - 2, Math.min(1, k * 1.3)); });
    }
    else if (a.type === 'swirl_emitter') {
      const n = a.count || 8, T = a.durationMs || 1000, travel = T * 0.55;
      for (let i = 0; i < n; i++) { const t0 = st + (T - travel) * i / n, y = lerp(a.yMinFrac ?? 0.1, a.yMaxFrac ?? 0.5, Math.random()) * H, s0 = lerp(a.scaleMin ?? 0.2, a.scaleMax ?? 0.4, Math.random()), ph = Math.random() * 6.28;
        const o = image(a.texture, 9.5, a.blendMode, 6); sc(o, s0);
        fns.push(t => { const u = (t - t0) / travel; if (u < 0 || u > 1) { o.setVisible(false); return; }
          o.setAngle((a.spinDegPerSec || 0) * (t - t0) / 1000);
          show(o, lerp(a.fromXFrac ?? 0, a.toXFrac ?? 1, u) * W, y + (a.swirlAmpRel ?? 0.1) * hb.h * Math.sin((t - t0) / (a.swirlPeriodMs || 600) * 6.28 + ph), (a.alpha ?? 0.9) * Math.min(1, u * 8, (1 - u) * 8)); }); }
    }
    else if (a.type === 'sideways_emitter') {
      const n = a.count || 60, T = a.durationMs || 1000, texs = (a.textures || [a.texture]).filter(Boolean), amp = (a.swirlAmpRel || 0) * hb.h, rtl = a.direction === 'right_to_left';
      for (let i = 0; i < n; i++) { const sp = lerp(a.speedMin ?? 600, a.speedMax ?? 900, Math.random()), life = (W + 200) / sp * 1000, t0 = st + Math.random() * Math.max(1, T - life * 0.7);
        const tex = texs[Math.floor(Math.random() * texs.length)]; const s0 = lerp(a.scaleMin ?? 0.2, a.scaleMax ?? 0.5, Math.random()) * (tex === 'snowflake_big' ? 0.45 : 1);
        const y = lerp(a.yMinFrac ?? 0, a.yMaxFrac ?? 1, Math.random()) * H, ph = Math.random() * 6.28, dr = (Math.random() * 2 - 1) * (a.driftY || 0);
        const o = image(tex, 9.5, a.blendMode, 5); sc(o, s0);
        fns.push(t => { const tt = t - t0; if (tt < 0 || tt > life) { o.setVisible(false); return; } const x = -100 + sp * tt / 1000;
          o.setAngle(tt * 0.3); show(o, rtl ? W - x : x, y + dr * tt / 1000 + amp * Math.sin(tt / 250 + ph), a.alpha ?? 0.9); }); }
    }
    else if (a.type === 'emblem') {
      const x = (a.xFrac ?? 0.5) * W, y = (a.yFrac ?? 0.3) * H; const gl = a.glow ? image(a.glow.texture, 9.55, a.glow.blendMode ?? 'ADD', 40) : null; const o = image(a.texture, 9.6, a.blendMode, 40);
      fns.push(t => { const k = env(t, st, a.inMs || 0, a.holdMs || 0, a.outMs || 0); if (k <= 0) { o.setVisible(false); gl?.setVisible(false); return; }
        const s0 = lerp(a.scaleFrom ?? 0.2, a.scaleTo ?? 1.5, easeOut(Math.min(1, (t - st) / Math.max(1, a.inMs || 1))));
        if (gl) { sc(gl, (a.glow.scale ?? 1) * s0 / (a.scaleTo ?? 1.5)); show(gl, x, y, (a.glow.alpha ?? 0.35) * k); }
        sc(o, s0); o.setAngle((a.spinDegPerSec || 0) * (t - st) / 1000); show(o, x, y, (a.alpha ?? 0.85) * k); });
    }
    else if (a.type === 'cloud_bank') {
      const n = a.count || 3;
      for (let i = 0; i < n; i++) { const x1 = lerp(0.48, 0.98, n > 1 ? i / (n - 1) : 0.5) * W; const o = image(a.texture, 3.5, a.blendMode, 40); sc(o, a.scale ?? 0.7);
        fns.push(t => { const k = env(t, st, a.inMs || 0, a.holdMs || 0, a.outMs || 0); if (k <= 0) { o.setVisible(false); return; }
          const slide = easeOut(Math.min(1, (t - st) / Math.max(1, a.inMs || 1))); const part = a.parting ? easeOut(clamp01((t - st - (a.inMs || 0) - 150) / 500)) : 0;
          show(o, lerp((a.fromXFrac ?? 1.1) * W + i * 140, x1, slide) + (i - (n - 1) / 2) * 45 * part, (a.yFrac ?? 0.07) * H + (i % 2) * 28, (a.alpha ?? 0.95) * k); }); }
    }
    else if (a.type === 'twinkle_emitter') {
      for (let i = 0; i < (a.count || 20); i++) { const t0 = st + Math.random() * (a.durationMs || 1000) * 0.8, x = Math.random() * W, y = lerp(a.yMinFrac ?? 0, a.yMaxFrac ?? 0.4, Math.random()) * H;
        const o = image(a.texture, 3.5, a.blendMode, 4); sc(o, lerp(a.scaleMin ?? 0.15, a.scaleMax ?? 0.35, Math.random()));
        fns.push(t => { const u = (t - t0) / 700; if (u < 0 || u > 1) { o.setVisible(false); return; } show(o, x, y, (a.alpha ?? 0.9) * Math.sin(Math.PI * u)); }); }
    }
    else if (a.type === 'background_stars') {
      const n = a.count || 5;
      for (let i = 0; i < n; i++) { const t0 = st + i * (a.durationMs || 2000) / n, x = lerp(0.1, 0.9, Math.random()) * W, y = lerp(0.02, 0.2, Math.random()) * H;
        const o = image(a.texture, 3.5, a.blendMode, 6); sc(o, a.scale ?? 0.35); o.setAngle(13);
        fns.push(t => { const u = (t - t0) / 600; if (u < 0 || u > 1) { o.setVisible(false); return; } show(o, x + 260 * u, y + 200 * u, (a.alpha ?? 0.6) * Math.min(1, u * 5, (1 - u) * 5)); }); }
    }
  }

  // ---- 3. projectiles -> 4. impacts
  const impTimes: number[] = []; const arrivals: number[] = []; const firstHit = new Map<number, number>();
  const imDur = (im.growMs || 0) + (im.holdMs || 0) + (im.fadeMs || 0);
  const addImpact = (k: number, t: FxTarget, t0: number, j: number) => {
    impTimes.push(t0); arrivals.push(t0); const small = j > 0 ? 0.6 : 1; const b = body(t);
    if (j === 0) { firstHit.set(k, t0); at(t0, () => { if (impactsLeft.delete(k)) onImpact(k); }); react(t, im.enemyReaction, t0); }
    let statusAt = t0 + Math.max(imDur, 250);
    if (im.texture) { const p = at0(im.at, t, im.offsetYRel || 0); let base = 1;
      if (im.fitTargetHeight) base = im.fitTargetHeight * b.th / texH(im.texture);
      if (im.spanFromCloud) { const cy = cloudY.get(t) ?? b.top - 150; base = Math.max(0.2, (p.y - cy) / (texH(im.texture) * (texInfo(im.texture)?.origin?.y ?? 0.9))); }
      const o = image(im.texture, 9, im.blendMode, 30);
      fns.push(tt => { const d = tt - t0; if (d < 0 || d > imDur) { o.setVisible(false); return; }
        const g = Math.min(1, d / Math.max(im.growMs || 0, 1)); const w = im.wobble ? im.wobble.amount * Math.sin(d / (im.wobble.periodMs || 300) * 2 * Math.PI) : 0;
        sc(o, base * small * lerp(im.scaleFrom ?? 0.4, im.scaleTo ?? 1, easeOut(g)), 1 + w, 1 - w); o.setAngle((im.spinDegPerSec || 0) * d / 1000);
        show(o, p.x, p.y, (im.alpha ?? 1) * (d < (im.growMs || 0) + (im.holdMs || 0) ? 1 : 1 - (d - (im.growMs || 0) - (im.holdMs || 0)) / Math.max(im.fadeMs || 0, 1))); });
      if (im.glow) { const gl = im.glow; const go = image(gl.texture, 8.9, gl.blendMode, 30); const fm = gl.fadeMs || 220;
        fns.push(tt => { const d = tt - t0; if (d < 0 || d > fm) { go.setVisible(false); return; } sc(go, (gl.scale ?? 0.5) * (0.7 + 0.3 * d / fm)); show(go, p.x, p.y, (gl.alpha ?? 0.7) * (1 - d / fm)); }); }
    } else if (mode === 'fallback' && j === 0) at(t0, () => { const e2 = track(s.add.text(b.cx, b.cy, spell.emoji, { fontSize: '96px', padding: { x: 8, y: 12 } }).setOrigin(0.5).setResolution(2).setDepth(10).setScale(0.4));
      s.tweens.add({ targets: e2, scale: 1.3, alpha: 0, duration: 520, ease: 'Quad.out' }); });
    const popEnd = im.popOut && !im.overlay;
    const parts = im.particles?.length ? im.particles : mode === 'fallback' ? [{ count: 10, speedMin: 60, speedMax: 160, lifespanMs: 500 }] : [];
    at(t0 + (popEnd ? imDur : 0), () => { for (const e of parts) emit(e, b.cx, b.cy, undefined, 10, j > 0 ? 0.5 : 1); });
    const ov = im.overlay;
    if (ov && j === 0 && lasting(k) === ov.status) statusAt = t0;   // the game keeps the status: its own overlay (same layers + enter anim) takes over at the hit
    else if (ov && j === 0) {   // super_blizzard: frozen cube inside the cast (back layer behind the enemy, front layer over it), pops at the end
      const stc = MAN?.status?.[ov.status] || {}; const front = stc.front || stc.texture || `${ov.status}_front`, back = stc.back || `${ov.status}_back`;
      const fit = (stc.fitToEnemy?.heightFactor ?? 1.1) * b.th / texH(front); const end = t0 + (ov.enterMs || 200) + (ov.holdMs || 1000);
      for (const [n, dp] of [[back, 3.6], [front, 4.6]] as [string, number][]) { if (!hasTex(n)) continue; const o = image(n, dp, 'NORMAL');
        fns.push(tt => { if (tt < t0 || tt > end) { o.setVisible(false); return; } const u = Math.min(1, (tt - t0) / Math.max(1, ov.enterMs || 200));
          sc(o, fit * lerp(ov.scaleFrom ?? 0.6, 1, easeOut(u))); show(o, b.cx, b.cy, Math.min(1, u * 1.5)); }); }
      at(end, () => { for (const e of im.popOut?.particles || []) emit(e, b.cx, b.cy, undefined, 10); });
      statusAt = Math.max(statusAt, end);
    }
    if (j === 0) at(statusAt, () => { if (statusLeft.delete(k)) onStatus(k); });
  };
  const hasProj = pr.path && pr.path !== 'none' && (pr.count ?? 1) > 0;
  if (!hasProj) tgts.forEach((t, k) => addImpact(k, t, Cms + delay + k * stagger, 0));
  else if (pr.path === 'sweep') {   // tornado: one ground-level traveller through every target, exits right
    const p0x = hb.x + 0.3 * hb.h, p1x = W + 150, T = pr.travelMs || 1200, t0 = Cms, gy = hb.feet;
    const o = image(pr.texture, 9, pr.blendMode, 30); const xpos = (t: number) => lerp(p0x, p1x, (t - t0) / T);
    fns.push(t => { const u = (t - t0) / T; if (u < 0 || u > 1) { o.setVisible(false); return; } sc(o, pr.scale ?? 1, 1 + 0.04 * Math.sin(t / 60), 1);
      show(o, xpos(t), gy + 6 + (pr.wobbleRel || 0) * 60 * Math.sin(t / 90), Math.min(1, u / 0.08, (1 - u) / 0.08)); });
    if (pr.trail) { const follow = track(s.add.zone(p0x, gy - 120, 1, 1)); fns.push(t => follow.setPosition(xpos(Math.max(t0, Math.min(t0 + T, t))), gy - 120));
      at(t0, () => emit({ ...pr.trail, emitOverMs: T }, 0, 0, follow)); }
    arrivals.push(t0 + T); tgts.forEach((t, k) => addImpact(k, t, t0 + (t.x - p0x) / (p1x - p0x) * T, 0));
  } else tgts.forEach((t, k) => {
    const n = Math.max(1, pr.count || 1), T = pr.travelMs || 400; const b = body(t);
    for (let j = 0; j < n; j++) {
      const t0 = Cms + delay + k * stagger + j * (pr.intervalMs || 0);
      let p0: { x: number; y: number }; let p1 = { x: b.cx, y: b.cy };
      if (pr.from === 'air_near_target') p0 = { x: b.cx - 0.6 * b.th + (Math.random() - 0.5) * 40, y: b.cy - 0.6 * b.th + (Math.random() - 0.5) * 50 };
      else if (pr.from === 'sky_upper_left_of_target') { p0 = { x: b.cx - 0.25 * W + (Math.random() - 0.5) * 120, y: -0.1 * H }; p1 = { x: p1.x + (Math.random() - 0.5) * 30, y: p1.y + (Math.random() - 0.5) * 30 }; }
      else if (pr.from === 'above_hero') p0 = { x: hb.x, y: heroTop + (cast.offsetYRel || 0) * hb.h };
      else if (pr.from === 'hero_front_ground') p0 = { x: hb.x + 0.3 * hb.h, y: hb.feet };
      else p0 = cast.at === 'wand_tip' || !cast.at ? castPt : wandTip(h);
      if (pr.to === 'target_head') p1 = { x: b.cx, y: b.head }; else if (pr.to === 'target_feet') p1 = { x: t.x, y: b.feet };
      const path = (u: number) => { if (pr.path === 'falls_from_sky') { const uu = u * u * 0.4 + u * 0.6; return { x: lerp(p0.x, p1.x, uu), y: lerp(p0.y, p1.y, uu) }; }
        let x = lerp(p0.x, p1.x, u), y = lerp(p0.y, p1.y, u); if (pr.path === 'arc') y -= 4 * (pr.arcHeightRel || 0) * b.th * u * (1 - u);
        if (pr.wobbleRel) y += pr.wobbleRel * b.th * Math.sin(u * 2 * Math.PI * 1.5); return { x, y }; };
      const tint = Array.isArray(pr.tint) ? colorNum(pr.tint[(j + k) % pr.tint.length]) : pr.tint ? colorNum(pr.tint) : null;
      const o: any = image(pr.texture, 9, pr.blendMode, 16); if (tint && o.setTint) o.setTint(tint);
      const native = pr.texture === 'shooting_star' ? 37 : 0; const heads = ['shooting_star', 'fireball_small', 'fireball'].includes(pr.texture);
      fns.push(t => { const u = (t - t0) / T; if (u < 0 || u > 1) { o.setVisible(false); return; } const q = path(u), q2 = path(Math.min(1, u + 0.02));
        let rot = heads && !pr.spinDegPerSec ? Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI - native : 0; rot += (pr.spinDegPerSec || 0) * (t - t0) / 1000;
        o.setAngle(rot); sc(o, lerp(pr.scaleFrom ?? pr.scale ?? 1, pr.scale ?? 1, Math.min(1, u * 4))); show(o, q.x, q.y, 1); });
      if (pr.trail) at(t0, () => { const em = emit({ ...pr.trail, emitOverMs: T }, 0, 0, o); if (em) at(t0 + T, () => em.active && em.stop()); });
      arrivals.push(t0 + T); if (j === 0 || pr.impactEach) addImpact(k, t, t0 + T, j);
    }
  });

  // ---- camera flash: only recipes that ask for one (lightning): one white flash, <100 ms, never red
  const fl = rec.cameraFlash ?? rec.flash;
  if (fl && impTimes.length) { let c = colorNum(fl.color); if (isRed(c)) c = colorNum(C.flash?.color);
    at(Math.min(...impTimes), () => { const r = track(s.add.rectangle(W / 2, H / 2, W, H, c, Math.min(0.8, fl.alpha ?? 0.6)).setDepth(20));
      const pp = (window as any).__proto; pp.cameraFlashes = (pp.cameraFlashes || 0) + 1; timers.push(s.time.delayedCall(Math.min(fl.durationMs || 70, C.flash?.maxMs ?? 100), () => r.destroy())); }); }

  // ---- timeline length (same rule as build_recipes.py timing(): cast + delay + travel + stagger + longest impact part, or ambient)
  const lifeMax = (list: any[] = []) => Math.max(0, ...list.filter(Boolean).map(e => e.lifespanMs || 0));
  const ptail = Math.max(lifeMax(im.particles), lifeMax(im.popOut?.particles));
  const ovMs = im.overlay ? (im.overlay.enterMs || 0) + (im.overlay.holdMs || 0) : 0;
  const tail = Math.max(imDur, ovMs, im.enemyReaction?.durationMs || 0, ptail + ovMs, 300);
  const ambEnd = Math.max(0, ...amb.map(a => (a.startMs || 0) + (a.inMs || 0) + (a.holdMs || 0) + (a.outMs || 0) + (a.durationMs || 0)));
  const natural2 = Math.max(Math.max(Cms, ...arrivals) + tail, ambEnd, Cms);
  const total = Math.min(C.castAnim?.maxMs ?? 5000, natural2);

  // ---- run
  const start = s.time.now; const tick = () => { const t = s.time.now - start; for (const f of fns) f(t); };
  s.events.on('update', tick); tick();
  let finish!: () => void; const done = new Promise<void>(r => (finish = r));
  let over = false;
  const cleanup = () => { if (over) return; over = true; s.events.off('update', tick); timers.forEach(t => t.remove(false)); resets.forEach(f => f());
    for (const o of objs) { s.tweens.killTweensOf(o); o.destroy(); }
    if (h.hero instanceof Phaser.GameObjects.Sprite && h.hero.active && s.anims.exists('hero_idle')) h.hero.play('hero_idle'); finish(); };
  // the scene clock can run a frame or two ahead of wall time; hold the end until `total` real ms have passed
  const t0w = performance.now();
  timers.push(s.time.delayedCall(total, () => { const left = total - (performance.now() - t0w); if (left > 0) setTimeout(cleanup, left); else cleanup(); }));
  const skip = () => { if (over) return; for (const k of [...impactsLeft].sort()) { impactsLeft.delete(k); onImpact(k); } for (const k of [...statusLeft].sort()) { statusLeft.delete(k); onStatus(k); } cleanup(); };
  done.then(() => { for (const k of [...impactsLeft].sort()) { impactsLeft.delete(k); onImpact(k); } for (const k of [...statusLeft].sort()) { statusLeft.delete(k); onStatus(k); } });
  const pr2 = (window as any).__proto = (window as any).__proto || {};
  pr2.spellAnims = [...(pr2.spellAnims || []), { id: spell.id, mode, totalMs: Math.round(total), naturalMs: Math.round(natural2), recipeMs: rec.totalMs ?? null,
    targets: tgts.length, flash: !!fl, missing: [...missing] }].slice(-20);
  return { done, skip, totalMs: total, naturalMs: natural2, mode, missing: [...missing] };
}

// ---------------- status overlays (fx/manifest.json "status": soaked, dazed, chilled, frozen) ----------------
export interface StatusView { objs: Phaser.GameObjects.GameObject[]; key: string; }
/** Draws a status overlay on an enemy: front layers above the enemy body (depth 4), back layers (and "behind") below it. */
export function showStatus(s: Phaser.Scene, key: string, t: FxTarget, emojiFallback: string): StatusView {
  const cfg = MAN?.status?.[key]; const objs: Phaser.GameObjects.GameObject[] = []; const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(o); return o; };
  const ctr = { x: t.x, y: (t.top + t.feet) / 2 }; const ps = (v: number | undefined) => (v || 0) * KS;
  const pos = (anchorName: string, off = 0) => anchorName === 'head' ? { x: t.x, y: (t.head ?? t.top) + ps(off) } : anchorName === 'feet' ? { x: t.x, y: t.feet + ps(off) } : { x: ctr.x, y: ctr.y + ps(off) };
  const layer = (texName: string | undefined, depthKind: string, c: any) => {
    if (!texName || !s.textures.exists(fxKey(texName))) return null;
    const p = pos(c.anchor || 'center', c.offsetY); const ti = texInfo(texName);
    const depth = depthKind === 'front' ? 4.6 : 3.6;
    const o: any = add(ti?.frameWidth ? s.add.sprite(p.x, p.y, fxKey(texName), 0) : s.add.image(p.x, p.y, fxKey(texName)));
    o.setDepth(depth).setBlendMode(c.blendMode === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (ti?.origin) o.setOrigin(ti.origin.x, ti.origin.y);
    let sc = TEXS();
    if (c.fitToEnemy && ti) sc = Math.max((t.h * 0.62 * (c.fitToEnemy.widthFactor || 1)) / ti.width * (ti.frameWidth ? ti.width / ti.frameWidth : 1), (t.feet - t.top) * (c.fitToEnemy.heightFactor || 1) / (ti.frameHeight || ti.height));
    o.setScale(sc, sc * (c.scaleY ?? 1)); o.setAlpha(c.alpha ?? 1);
    if (c.animation && ti?.frameWidth) { const ak = `${fxKey(texName)}_loop`;
      if (!s.anims.exists(ak)) s.anims.create({ key: ak, frames: s.anims.generateFrameNumbers(fxKey(texName), { start: 0, end: (c.animation.frames || ti.frames || 1) - 1 }), frameRate: c.animation.frameRate || 10, repeat: c.animation.repeat ?? -1 });
      o.play(ak); }
    if (c.bobPx) s.tweens.add({ targets: o, y: o.y - ps(c.bobPx), duration: c.bobMs || 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (c.alphaPulse) { o.setAlpha(c.alphaPulse.min ?? 0.4); s.tweens.add({ targets: o, alpha: c.alphaPulse.max ?? 0.85, duration: c.alphaPulse.ms || 1200, yoyo: true, repeat: -1 }); }
    if (c.rotateDegPerSec) s.tweens.add({ targets: o, angle: 360, duration: 360000 / c.rotateDegPerSec, repeat: -1 });
    if (c.enter) { o.setScale(sc * (c.enter.scaleFrom ?? 0.6)); s.tweens.add({ targets: o, scale: sc, duration: c.enter.ms || 180, ease: 'Back.out' }); }
    return o;
  };
  if (cfg) {
    const front = layer(cfg.front || cfg.texture, cfg.depth || 'front', cfg);   // frozen: front over the enemy (depth 4.6) ...
    const back = cfg.back || cfg.backTexture || (MAN?.textures?.[`${key}_back`] ? `${key}_back` : null);
    if (back) layer(back, cfg.backDepth || 'behind', cfg);                         // ... and the back layer behind it (3.6)
    if (cfg.particles && front) { const pc = cfg.particles; const p = pos(cfg.anchor || 'center', (cfg.offsetY || 0) + (pc.spawnOffsetY || 0));
      if (s.textures.exists(fxKey(pc.texture))) { const ds = TEXS();
        const em = s.add.particles(p.x, p.y, fxKey(pc.texture), { frequency: pc.frequencyMs || 300, quantity: pc.quantity || 1, lifespan: pc.lifespanMs || 600, gravityY: ps(pc.gravityY || 0),
          speedY: pc.speedY ? { min: ps(pc.speedY[0]), max: ps(pc.speedY[1]) } : undefined, speed: pc.speed ? { min: ps(pc.speed[0]), max: ps(pc.speed[1]) } : undefined,
          scale: { start: ds * (pc.scale?.[0] ?? 1), end: ds * (pc.scale?.[1] ?? 0.6) }, alpha: pc.alpha ? { start: pc.alpha[0], end: pc.alpha[1] } : 1,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-ps(pc.spawnWidth || 40) / 2, 0, ps(pc.spawnWidth || 40), 1) } as any }).setDepth(4.7);
        add(em); } }
    if (objs.length) return { objs, key };
  }
  // fallback: an emoji badge over the head
  const fb: Record<string, string> = { soaked: '💧', dazed: '💫', chilled: '🥶', frozen: '🧊' };
  { const e = add(s.add.text(t.x + 40, (t.head ?? t.top) - 10, fb[key] || emojiFallback, { fontSize: '40px', padding: { x: 6, y: 8 } }).setOrigin(0.5).setResolution(2).setDepth(4.7)); s.tweens.add({ targets: e, y: e.y - 6, duration: 700, yoyo: true, repeat: -1 }); }
  return { objs, key };
}
export function clearStatus(s: Phaser.Scene, v?: StatusView, popParticles = false) {
  if (!v) return;
  if (popParticles && v.key === 'frozen') { const o: any = v.objs[0]; const n = MAN?.status?.frozen?.exit?.particles;
    if (o && n && s.textures.exists(fxKey(n))) { const p = s.add.image(o.x, o.y, fxKey(n)).setDepth(4.8).setScale(TEXS() * 0.5); s.tweens.add({ targets: p, scale: p.scale * 2, alpha: 0, duration: MAN.status.frozen.exit.ms || 200, onComplete: () => p.destroy() }); } }
  for (const o of v.objs) { s.tweens.killTweensOf(o); o.destroy(); }
}
