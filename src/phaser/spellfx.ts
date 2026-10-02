// Spell choreographer (spec v3.4 §6.7 visuals). Plays one cast from Arty's recipe (public/spells/spells_fx.json, schema written by
// art/spells/tools/build_recipes.py) with Phaser tweens + particle emitters, textures from public/spells/fx/manifest.json.
// - No recipe for a spell (or no spells_fx.json at all): the element default from src/data/spellfx.json (same schema) is used.
// - A texture that wasn't delivered: projectiles/impacts become element-coloured orbs, particles use a generated dot.
// - Arty's numbers are authored for a 960x540 canvas at 2x texture size (displayScale 0.5); the game frame is 1280x720,
//   so every px value is x4/3 and every texture is drawn at recipeScale x displayScale x 4/3 (≈0.667 for scale 1).
// - Each cast is fitted into castAnim.minMs..maxMs (src/data/spellfx.json) and can be skipped (skip()) by a tap.
import Phaser from 'phaser';
import CFG from '../data/spellfx.json';

export type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
export interface FxTarget { x: number; top: number; feet: number; h: number; body: Body; sprite: string | null; }
export interface FxHost { scene: Phaser.Scene; hero: Body; heroBox: { x: number; feet: number; w: number; h: number }; playOnce: (b: Body, id: string | null, anim: string) => boolean; hitStop: (b: Body) => void; }
export interface CastHandle { done: Promise<void>; skip: () => void; totalMs: number; naturalMs: number; mode: 'recipe' | 'element' | 'fallback'; missing: string[]; }

const C: any = CFG;
const K = 1280 / (C.artCanvas?.width || 960);          // art canvas px -> frame px
const px = (v: number | undefined) => (v || 0) * K;
let MAN: any = null; let RECIPES: Record<string, any> = {};
const texInfo = (name?: string | null) => (name && MAN?.textures?.[name]) || null;
export const fxKey = (name: string) => `fx_${name}`;
/** Called by the scene once the fx manifest / recipes JSON are loaded. */
export function setFxData(manifest: any, recipes: any) {
  MAN = manifest && typeof manifest === 'object' ? manifest : null;
  RECIPES = {}; for (const r of recipes?.spells || []) if (r?.id) RECIPES[r.id] = r;
  const p = (window as any).__proto = (window as any).__proto || {}; p.spellFx = { textures: Object.keys(MAN?.textures || {}), recipes: Object.keys(RECIPES) };
}
/** Texture files to load: [key, url, frameWidth?, frameHeight?] (urls relative to public/spells/). */
export function fxTextureList(): [string, string, number?, number?][] {
  return Object.entries<any>(MAN?.textures || {}).filter(([, t]) => t?.file).map(([k, t]) => [fxKey(k), `spells/${t.file}`, t.frameWidth, t.frameHeight]);
}
export const recipeFor = (id: string) => RECIPES[id] || null;
const colorNum = (c?: string, d = 0xffffff) => (c && /^#?[0-9a-f]{6}$/i.test(c) ? parseInt(c.replace('#', ''), 16) : d);
export const elementColor = (el: string) => colorNum(C.elementColor?.[el], 0xffffff);
const isRed = (c: number) => { const r = c >> 16 & 255, g = c >> 8 & 255, b = c & 255; return r > 150 && r > g + 60 && r > b + 60; };

/** Wand tip in frame px: config offset from the hero sprite's bottom-centre (src/data/spellfx.json wandTip). */
export function wandTip(h: FxHost) { const b = h.heroBox; return { x: b.x + (C.wandTip?.x ?? 0.5) * b.w, y: b.feet + (C.wandTip?.y ?? -0.6) * b.h }; }

export function playCast(h: FxHost, spell: { id: string; element: string; emoji: string; target: string }, targets: FxTarget[], onImpact: (k: number) => void): CastHandle {
  const s = h.scene; const col = elementColor(spell.element); const missing = new Set<string>();
  let rec = recipeFor(spell.id); let mode: CastHandle['mode'] = rec ? 'recipe' : 'element';
  if (!rec) rec = C.elementDefaults?.[spell.element] || C.elementDefaults?.star;
  const tgts = targets.slice(0, C.maxTargets || 3);
  const objs: Phaser.GameObjects.GameObject[] = []; const timers: Phaser.Time.TimerEvent[] = [];
  const impactsLeft = new Set(tgts.map((_, k) => k));
  const track = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(o); return o; };
  const hasTex = (n?: string | null) => { if (!n) return false; const ok = s.textures.exists(fxKey(n)); if (!ok) missing.add(n); return ok; };
  if (!rec || ![rec.projectile?.texture, rec.impact?.texture, rec.cast?.glow?.texture].filter(Boolean).some(t => hasTex(t))) mode = 'fallback';

  // ---- timeline (natural ms) -> fitted into castAnim min..max
  const pr = rec?.projectile || {}; const hasProj = pr.path && pr.path !== 'none' && (pr.count ?? 1) > 0;
  const castMs = rec?.cast?.durationMs ?? 250;
  const travel = hasProj ? (pr.travelMs || 400) + Math.max(0, (pr.count || 1) - 1) * (pr.intervalMs || 0) : 0;
  const sweep = pr.to === 'targets_sweep';
  const impactAt = (k: number) => castMs + (rec?.impactDelayMs || 0) + (sweep ? (pr.travelMs || 600) * (k + 1) / tgts.length : travel + k * (rec?.staggerMs || 0));
  const im = rec?.impact || {};
  const tail = Math.max((im.growMs || 0) + (im.holdMs || 0) + (im.fadeMs || 0), im.enemyReaction?.durationMs || 0, 300);
  const amb = (rec?.ambient || []) as any[];
  const ambEnd = Math.max(0, ...amb.map(a => (a.startMs || 0) + (a.inMs || 0) + (a.holdMs || a.durationMs || 0) + (a.outMs || 0)));
  const natural = Math.max(impactAt(tgts.length - 1) + tail, ambEnd, castMs);
  const A = C.castAnim || {}; const minMs = A.minMs ?? 0, maxMs = A.maxMs ?? 1e9;
  const f = natural < minMs ? Math.min(minMs / natural, A.maxStretch ?? 1.4) : natural > maxMs ? maxMs / natural : 1;
  const total = Math.min(maxMs, Math.max(minMs, natural * f));
  const T = (ms: number) => ms * f;
  const at = (ms: number, fn: () => void) => { const t = s.time.delayedCall(T(ms), fn); timers.push(t); return t; };
  const tw = (cfg: any) => s.tweens.add({ ...cfg, duration: T(cfg.duration ?? 300), delay: T(cfg.delay ?? 0) });

  // ---- helpers
  const anchor = (name: string | undefined, t?: FxTarget, extra: { offsetX?: number; offsetY?: number } = {}) => {
    const ctr = t ? { x: t.x, y: (t.top + t.feet) / 2 } : { x: 900, y: 260 };
    let p: { x: number; y: number };
    switch (name) {
      case 'wand_tip': p = wandTip(h); break;
      case 'above_hero': p = { x: h.heroBox.x, y: h.heroBox.feet - h.heroBox.h }; break;
      case 'hero_front_ground': p = { x: h.heroBox.x + px(60), y: h.heroBox.feet - 10 }; break;
      case 'target_head': p = t ? { x: t.x, y: t.top } : ctr; break;
      case 'target_feet': p = t ? { x: t.x, y: t.feet } : ctr; break;
      case 'air_near_target': p = { x: ctr.x - px(110), y: ctr.y - px(110) }; break;
      case 'sky_upper_left_of_target': p = { x: ctr.x - px(260), y: -60 }; break;
      default: p = ctr;
    }
    return { x: p.x + px(extra.offsetX), y: p.y + px(extra.offsetY) };
  };
  const scaleOf = (n: string | null | undefined, v = 1) => v * (texInfo(n)?.displayScale ?? 0.5) * K;
  const blend = (b?: string) => (b === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
  const image = (n: string | null | undefined, x: number, y: number, depth = 9, b?: string, fallbackR = 18) => {
    if (n && hasTex(n)) { const ti = texInfo(n); const im2 = s.add.image(x, y, fxKey(n)).setDepth(depth).setBlendMode(blend(b ?? ti?.blendMode));
      if (ti?.origin) im2.setOrigin(ti.origin.x, ti.origin.y); if (ti?.frameWidth) im2.setFrame(0); return track(im2) as Phaser.GameObjects.Image; }
    return track(s.add.circle(x, y, fallbackR, col, 0.9).setStrokeStyle(3, 0xffffff, 0.8).setDepth(depth)) as unknown as Phaser.GameObjects.Image;
  };
  const dot = () => { if (!s.textures.exists('fx__dot')) { const g = s.make.graphics({ x: 0, y: 0 }, false); g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8); g.generateTexture('fx__dot', 16, 16); g.destroy(); } return 'fx__dot'; };
  const emit = (e: any, x: number, y: number, follow?: Phaser.GameObjects.GameObject, depth = 10) => {
    if (!e) return null; const ok = hasTex(e.texture); const key = ok ? fxKey(e.texture) : dot();
    const sc = (v: number) => ok ? scaleOf(e.texture, v) : v * 0.5;
    const life = e.lifespanMs || 500;
    const em = s.add.particles(x, y, key, {
      speed: { min: px(e.speedMin ?? 40), max: px(e.speedMax ?? 100) }, angle: { min: e.angleMin ?? 0, max: e.angleMax ?? 360 },
      lifespan: life, gravityY: px(e.gravityY || 0), scale: { start: sc(e.scaleStart ?? 1), end: sc(e.scaleEnd ?? 0.3) },
      alpha: { start: e.alphaStart ?? 1, end: e.alphaEnd ?? 0 }, blendMode: blend(e.blendMode),
      rotate: e.spinDegPerSec ? { start: 0, end: e.spinDegPerSec * (life / 1000) } : 0, emitting: false,
      ...(ok ? {} : { tint: col }), ...(e.tint ? { tint: (Array.isArray(e.tint) ? e.tint : [e.tint]).map((c: string) => colorNum(c)) } : {}),
      ...(e.zoneRect ? { emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(e.zoneRect[0], e.zoneRect[1], e.zoneRect[2], e.zoneRect[3]) } as any }
        : e.spawnRadius ? { emitZone: { type: 'random', source: new Phaser.Geom.Circle(0, 0, px(e.spawnRadius)) } as any } : {}),
    }).setDepth(depth);
    track(em);
    if (follow) em.startFollow(follow as any);
    const n = Math.max(0, e.count ?? 6);
    if (e.emitOverMs > 0 && n > 0) { em.frequency = T(e.emitOverMs) / n; em.quantity = 1; em.start(); s.time.delayedCall(T(e.emitOverMs), () => em.active && em.stop()); }
    else if (n > 0) em.explode(n);
    return em;
  };
  const fadeLife = (o: any, inMs: number, holdMs: number, outMs: number, delay = 0, alpha = 1) => {
    o.setAlpha(0); tw({ targets: o, alpha, duration: inMs || 1, delay, onComplete: () => tw({ targets: o, alpha: 0, duration: outMs || 1, delay: holdMs || 0 }) });
  };
  const react = (t: FxTarget, r: any) => {
    const b: any = t.body; if (!b?.active) return; const type = r?.type || 'hurt_shake'; const d = r?.durationMs || 400; const y0 = b.y, x0 = b.x;
    h.hitStop(t.body);
    if (type === 'hurt_shake') { if (!h.playOnce(t.body, t.sprite, 'hurt')) tw({ targets: b, angle: 12, duration: 70, yoyo: true, repeat: 2, onComplete: () => b.setAngle(0) }); }
    else if (type === 'shiver') tw({ targets: b, x: x0 + 6, duration: 40, yoyo: true, repeat: Math.max(2, Math.round(d / 80)), onComplete: () => b.setX(x0) });
    else if (type === 'lift_spin') { h.playOnce(t.body, t.sprite, 'hurt'); tw({ targets: b, y: y0 - px(r.liftPx || 40), angle: 360 * (r.turns || 1), duration: d / 2, yoyo: true, ease: 'Sine.inOut', onComplete: () => { b.setAngle(0); b.setY(y0); } }); }
    else if (type === 'bounce' || type === 'hop') tw({ targets: b, y: y0 - (type === 'hop' ? 30 : 18), duration: d / (type === 'hop' ? 4 : 2) / 2, yoyo: true, repeat: type === 'hop' ? 1 : 0, ease: 'Quad.out', onComplete: () => b.setY(y0) });
    else if (type === 'freeze') { if (b.setTint) { b.setTint(0xbfe8ff); s.time.delayedCall(T(r?.freezeMs || d), () => b.active && b.clearTint && b.clearTint()); } }
    else h.playOnce(t.body, t.sprite, 'hurt');
  };

  // ---- 1. cast: hero pose + glow at the wand tip
  if (h.hero instanceof Phaser.GameObjects.Sprite && h.hero.texture.key === 'hero') { h.hero.stop(); h.hero.setFrame(rec?.cast?.heroFrame ?? 3); }
  const cg = rec?.cast?.glow; const c0 = anchor(rec?.cast?.at || 'wand_tip', undefined, { offsetY: rec?.cast?.offsetY });
  if (cg) { const g = image(cg.texture, c0.x, c0.y, 9, cg.blendMode, 14); g.setScale(scaleOf(cg.texture, cg.scaleFrom ?? 0.4)).setAlpha(cg.alpha ?? 1);
    tw({ targets: g, scale: scaleOf(cg.texture, cg.scaleTo ?? 1.2), duration: castMs, ease: 'Quad.out', onComplete: () => tw({ targets: g, alpha: 0, duration: 160 }) }); }
  for (const e of rec?.cast?.particles || []) emit(e, c0.x, c0.y);

  // ---- 2. ambient layers (tints, clouds, emitters, emblem)
  for (const a of amb) {
    const st = a.startMs || 0;
    if (a.type === 'tint') { let c = colorNum(a.color, 0x000000); if (isRed(c)) c = 0x202040;   // never a red screen
      const r = track(s.add.rectangle(640, 360, 1280, 720, c, 1).setDepth(3)); fadeLife(r, a.inMs, a.holdMs, a.outMs, st, Math.min(0.6, a.alpha ?? 0.2)); }
    else if (a.type === 'cloud_above_target' || a.type === 'puddle_under_target') for (const [k, t] of tgts.entries()) {
      const p = a.type === 'puddle_under_target' ? { x: t.x, y: t.feet } : { x: t.x, y: t.top + px(a.offsetY ?? -100) };
      const o = image(a.texture, p.x, p.y, a.type === 'puddle_under_target' ? 3 : 9, a.blendMode, 30); o.setScale(scaleOf(a.texture, a.scale ?? 0.6));
      const d0 = st + k * (rec?.staggerMs || 0); fadeLife(o, a.inMs, a.holdMs, a.outMs, d0, 1);
      if (a.rain) at(d0 + (a.inMs || 0), () => emit(a.rain, p.x, p.y + 20));
    }
    else if (a.type === 'cloud_bank') for (let i = 0; i < (a.count || 3); i++) {
      const o = image(a.texture, px(a.fromX ?? 1000) + i * px(a.spreadPx ?? 200) * 0.3, px(a.y ?? 40), 3.5, a.blendMode, 40); o.setScale(scaleOf(a.texture, a.scale ?? 0.7));
      fadeLife(o, a.inMs, a.holdMs, a.outMs, st, a.alpha ?? 0.95);
      tw({ targets: o, x: 1280 - px(a.spreadPx ?? 200) * (i + 1) * 0.9, duration: (a.inMs || 300) + (a.holdMs || 500), delay: st, ease: 'Sine.out' });
    }
    else if (a.type === 'swirl_emitter' || a.type === 'twinkle_emitter') for (let i = 0; i < (a.count || 8); i++) {
      const y = px((a.yMin ?? 60) + Math.random() * ((a.yMax ?? 300) - (a.yMin ?? 60)));
      const swirl = a.type === 'swirl_emitter'; const x = swirl ? px(a.fromX ?? -40) : 80 + Math.random() * 1120;
      const o = image(a.texture, x, y, 9.5, a.blendMode, 6); o.setScale(scaleOf(a.texture, (a.scaleMin ?? 0.2) + Math.random() * ((a.scaleMax ?? 0.4) - (a.scaleMin ?? 0.2))));
      const d0 = st + (swirl ? i * 60 : Math.random() * (a.durationMs || 1000) * 0.5); const dur = swirl ? (a.durationMs || 1000) : 500 + Math.random() * 500;
      fadeLife(o, 120, dur - 240, 120, d0, a.alpha ?? 0.9);
      if (swirl) tw({ targets: o, x: px(a.toX ?? 1000), y: y + px(a.swirlAmpPx ?? 40) * (i % 2 ? 1 : -1), angle: (a.spinDegPerSec || 0) * dur / 1000, duration: dur, delay: d0, ease: 'Sine.inOut' });
    }
    else if (a.type === 'sideways_emitter') {
      const texs = (a.textures || [a.texture]).filter(Boolean); const per = Math.ceil((a.count || 60) / Math.max(1, texs.length));
      for (const n of texs) at(st, () => emit({ texture: n, count: per, speedMin: a.speedMin, speedMax: a.speedMax, angleMin: a.direction === 'right_to_left' ? 175 : -5, angleMax: a.direction === 'right_to_left' ? 185 : 8,
        lifespanMs: 1300, gravityY: a.driftY || 0, scaleStart: a.scaleMax ?? 0.5, scaleEnd: a.scaleMin ?? 0.2, alphaStart: a.alpha ?? 0.9, alphaEnd: 0.6, emitOverMs: a.durationMs || 1000, spawnRadius: 0, spinDegPerSec: 120,
        zoneRect: [0, px(a.yMin ?? 0) - 360, 1, px((a.yMax ?? 540) - (a.yMin ?? 0))] }, a.direction === 'right_to_left' ? 1300 : -20, 360, undefined, 9.5));
    }
    else if (a.type === 'emblem') {
      const o = image(a.texture, px(a.x ?? 480), px(a.y ?? 230), 9.6, a.blendMode, 40); o.setScale(scaleOf(a.texture, a.scaleFrom ?? 0.2));
      fadeLife(o, a.inMs, a.holdMs, a.outMs, st, a.alpha ?? 0.85);
      tw({ targets: o, scale: scaleOf(a.texture, a.scaleTo ?? 1.5), angle: (a.spinDegPerSec || 0) * ((a.inMs || 0) + (a.holdMs || 0) + (a.outMs || 0)) / 1000, duration: (a.inMs || 300) + (a.holdMs || 500) + (a.outMs || 300), delay: st });
      if (a.glow) { const g = image(a.glow.texture, o.x, o.y, 9.55, a.glow.blendMode, 40); g.setScale(scaleOf(a.glow.texture, a.glow.scale ?? 1)); fadeLife(g, a.inMs, a.holdMs, a.outMs, st, a.glow.alpha ?? 0.35); }
    }
  }

  // ---- 3. projectiles (one volley per target)
  if (hasProj) tgts.forEach((t, k) => {
    if (sweep && k > 0) return;
    const n = Math.max(1, pr.count || 1);
    for (let j = 0; j < n; j++) {
      const delay = castMs + (sweep ? 0 : k * (rec?.staggerMs || 0)) + j * (pr.intervalMs || 0);
      at(delay, () => {
        const a0 = anchor(pr.from || 'wand_tip', t), a1 = anchor(sweep ? 'target_center' : pr.to || 'target_center', t);
        const tint = Array.isArray(pr.tint) ? colorNum(pr.tint[(k * n + j) % pr.tint.length]) : pr.tint ? colorNum(pr.tint) : null;
        const o: any = image(pr.texture, a0.x, a0.y, 9, undefined, 16); o.setScale(scaleOf(pr.texture, pr.scaleFrom ?? pr.scale ?? 1)); if (tint && o.setTint) o.setTint(tint);
        if (!sweep && !pr.spinDegPerSec && o.setRotation) o.setRotation(Math.atan2(a1.y - a0.y, a1.x - a0.x));   // textures are painted heading right
        const trail = pr.trail ? emit(pr.trail, a0.x, a0.y, o) : null;
        const pts = sweep ? tgts.map(tt => ({ x: tt.x, y: tt.feet - tt.h * 0.1 })) : [a1];
        const dur = (pr.travelMs || 400) / (sweep ? pts.length : 1);
        const step = (i: number) => {
          if (i >= pts.length) { if (sweep) tw({ targets: o, alpha: 0, duration: 200, onComplete: () => o.destroy() }); return; }
          const sx = o.x, sy = o.y, p1 = pts[i];
          tw({ targets: { v: 0 }, v: 1, duration: dur, ease: pr.path === 'falls_from_sky' ? 'Quad.in' : 'Linear',
            onUpdate: (tween: Phaser.Tweens.Tween) => { const v = (tween.targets[0] as any).v; if (!o.active) return;
              const wob = pr.wobblePx ? Math.sin(v * Math.PI * 4 + j) * px(pr.wobblePx) : 0;
              o.x = sx + (p1.x - sx) * v; o.y = sy + (p1.y - sy) * v - (pr.path === 'arc' ? Math.sin(v * Math.PI) * px(pr.arcHeight || 60) : 0) + wob;
              if (pr.scaleFrom !== undefined) o.setScale(scaleOf(pr.texture, pr.scaleFrom + (pr.scale - pr.scaleFrom) * v));
              if (pr.spinDegPerSec) o.angle += pr.spinDegPerSec / 60; },
            onComplete: () => { if (!sweep) { trail?.stop(); o.destroy(); } else step(i + 1); } });
        };
        step(0);
      });
    }
  });

  // ---- 4. impacts (+ the battle's damage number / HP bar via onImpact)
  let flashes = 0;
  tgts.forEach((t, k) => at(impactAt(k), () => {
    impactsLeft.delete(k);
    const p = anchor(im.at || 'target_center', t, im);
    if (im.texture) { const o = image(im.texture, p.x, p.y, 9, im.blendMode, 30); o.setScale(scaleOf(im.texture, im.scaleFrom ?? 0.4)).setAlpha(im.alpha ?? 1);
      tw({ targets: o, scale: scaleOf(im.texture, im.scaleTo ?? 1), duration: im.growMs || 100, ease: 'Quad.out', onComplete: () => tw({ targets: o, alpha: 0, duration: im.fadeMs || 300, delay: im.holdMs || 0 }) }); }
    else if (mode === 'fallback') { const em2 = s.add.text(p.x, p.y, spell.emoji, { fontSize: '96px', padding: { x: 8, y: 12 } }).setOrigin(0.5).setResolution(2).setDepth(10).setScale(0.4);
      track(em2); tw({ targets: em2, scale: 1.3, alpha: 0, duration: 520, ease: 'Quad.out' }); }
    if (im.glow) { const g = image(im.glow.texture, p.x, p.y, 8.9, im.glow.blendMode, 30); g.setScale(scaleOf(im.glow.texture, im.glow.scale ?? 0.5)).setAlpha(im.glow.alpha ?? 0.7); tw({ targets: g, alpha: 0, duration: im.glow.fadeMs || 220 }); }
    for (const e of im.particles?.length ? im.particles : mode === 'fallback' ? [{ count: 10, speedMin: 60, speedMax: 160, lifespanMs: 500 }] : []) emit(e, p.x, p.y);
    react(t, { ...im.enemyReaction, ...(im.freezeMs ? { freezeMs: im.freezeMs } : {}), liftPx: im.liftPx ?? im.enemyReaction?.liftPx, turns: im.turns ?? im.enemyReaction?.turns });
    const fl = rec?.cameraFlash; const maxF = C.flash?.maxPerCast ?? 1;
    if (fl && flashes < maxF && k === 0) { flashes++; let c = colorNum(fl.color); if (isRed(c)) c = colorNum(C.flash?.color);
      s.cameras.main.flash(Math.min(fl.durationMs || 70, C.flash?.maxMs ?? 100), c >> 16 & 255, c >> 8 & 255, c & 255, true); }
    onImpact(k);
  }));

  // ---- done / skip
  let finish!: () => void; const done = new Promise<void>(r => (finish = r));
  let over = false;
  const cleanup = () => { if (over) return; over = true; timers.forEach(t => t.remove(false)); for (const o of objs) { s.tweens.killTweensOf(o); o.destroy(); }
    if (h.hero instanceof Phaser.GameObjects.Sprite && s.anims.exists('hero_idle')) h.hero.play('hero_idle'); finish(); };
  // the scene clock can run a frame or two ahead of wall time; hold the end until `total` real ms have passed (2–3 s guarantee)
  const t0 = performance.now();
  const end = s.time.delayedCall(total, () => { const left = total - (performance.now() - t0); if (left > 0) setTimeout(cleanup, left); else cleanup(); }); timers.push(end);
  const skip = () => { if (over) return; for (const k of [...impactsLeft].sort()) { impactsLeft.delete(k); onImpact(k); } cleanup(); };
  const pr2 = (window as any).__proto = (window as any).__proto || {};
  pr2.spellAnims = [...(pr2.spellAnims || []), { id: spell.id, mode, totalMs: Math.round(total), naturalMs: Math.round(natural), targets: tgts.length, missing: [...missing] }].slice(-20);
  return { done, skip, totalMs: total, naturalMs: natural, mode, missing: [...missing] };
}

// ---------------- status overlays (fx/manifest.json "status": soaked, dazed, chilled, frozen, ward) ----------------
export interface StatusView { objs: Phaser.GameObjects.GameObject[]; key: string; }
/** Draws a status overlay on an enemy: front layers above the enemy body (depth 4), back layers (and "behind", e.g. the ward ring) below it. */
export function showStatus(s: Phaser.Scene, key: string, t: FxTarget, emojiFallback: string): StatusView {
  const cfg = MAN?.status?.[key]; const objs: Phaser.GameObjects.GameObject[] = []; const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(o); return o; };
  const ctr = { x: t.x, y: (t.top + t.feet) / 2 };
  const pos = (anchorName: string, off = 0) => anchorName === 'head' ? { x: t.x, y: t.top + px(off) } : anchorName === 'feet' ? { x: t.x, y: t.feet + px(off) } : { x: ctr.x, y: ctr.y + px(off) };
  const layer = (texName: string | undefined, depthKind: string, c: any) => {
    if (!texName || !s.textures.exists(fxKey(texName))) return null;
    const p = pos(c.anchor || 'center', c.offsetY); const ti = texInfo(texName);
    const depth = depthKind === 'front' ? 4.6 : 3.6;
    const o: any = add(ti?.frameWidth ? s.add.sprite(p.x, p.y, fxKey(texName), 0) : s.add.image(p.x, p.y, fxKey(texName)));
    o.setDepth(depth).setBlendMode(c.blendMode === 'ADD' ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (ti?.origin) o.setOrigin(ti.origin.x, ti.origin.y);
    let sc = (ti?.displayScale ?? 0.5) * K;
    if (c.fitToEnemy && ti) sc = Math.max((t.h * 0.62 * (c.fitToEnemy.widthFactor || 1)) / ti.width * (ti.frameWidth ? ti.width / ti.frameWidth : 1), (t.feet - t.top) * (c.fitToEnemy.heightFactor || 1) / (ti.frameHeight || ti.height));
    o.setScale(sc, sc * (c.scaleY ?? 1)); o.setAlpha(c.alpha ?? 1);
    if (c.animation && ti?.frameWidth) { const ak = `${fxKey(texName)}_loop`;
      if (!s.anims.exists(ak)) s.anims.create({ key: ak, frames: s.anims.generateFrameNumbers(fxKey(texName), { start: 0, end: (c.animation.frames || ti.frames || 1) - 1 }), frameRate: c.animation.frameRate || 10, repeat: c.animation.repeat ?? -1 });
      o.play(ak); }
    if (c.bobPx) s.tweens.add({ targets: o, y: o.y - px(c.bobPx), duration: c.bobMs || 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    if (c.alphaPulse) { o.setAlpha(c.alphaPulse.min ?? 0.4); s.tweens.add({ targets: o, alpha: c.alphaPulse.max ?? 0.85, duration: c.alphaPulse.ms || 1200, yoyo: true, repeat: -1 }); }
    if (c.rotateDegPerSec) s.tweens.add({ targets: o, angle: 360, duration: 360000 / c.rotateDegPerSec, repeat: -1 });
    if (c.enter) { o.setScale(sc * (c.enter.scaleFrom ?? 0.6)); s.tweens.add({ targets: o, scale: sc, duration: c.enter.ms || 180, ease: 'Back.out' }); }
    return o;
  };
  if (cfg) {
    const front = layer(cfg.texture, cfg.depth || 'front', cfg);
    if (cfg.backTexture || MAN?.textures?.[`${key}_back`]) layer(cfg.backTexture || `${key}_back`, 'behind', { ...cfg, ...(cfg.back || {}) });
    if (cfg.particles && front) { const pc = cfg.particles; const p = pos(cfg.anchor || 'center', (cfg.offsetY || 0) + (pc.spawnOffsetY || 0));
      if (s.textures.exists(fxKey(pc.texture))) { const ds = (texInfo(pc.texture)?.displayScale ?? 0.5) * K;
        const em = s.add.particles(p.x, p.y, fxKey(pc.texture), { frequency: pc.frequencyMs || 300, quantity: pc.quantity || 1, lifespan: pc.lifespanMs || 600, gravityY: px(pc.gravityY || 0),
          speedY: pc.speedY ? { min: px(pc.speedY[0]), max: px(pc.speedY[1]) } : undefined, speed: pc.speed ? { min: px(pc.speed[0]), max: px(pc.speed[1]) } : undefined,
          scale: { start: ds * (pc.scale?.[0] ?? 1), end: ds * (pc.scale?.[1] ?? 0.6) }, alpha: pc.alpha ? { start: pc.alpha[0], end: pc.alpha[1] } : 1,
          emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-px(pc.spawnWidth || 40) / 2, 0, px(pc.spawnWidth || 40), 1) } as any }).setDepth(4.7);
        add(em); } }
    if (objs.length) return { objs, key };
  }
  // fallback: an emoji badge over the head
  const fb: Record<string, string> = { soaked: '💧', dazed: '💫', chilled: '🥶', frozen: '🧊', ward: '🛡️' };
  if (key === 'ward') { const e = add(s.add.ellipse(t.x, t.feet - 6, t.h * 0.8, t.h * 0.2, 0xb48cff, 0.25).setStrokeStyle(4, 0xd7c2ff, 0.8).setDepth(3.6)); s.tweens.add({ targets: e, alpha: 0.6, duration: 900, yoyo: true, repeat: -1 }); }
  else { const e = add(s.add.text(t.x + 40, t.top - 10, fb[key] || emojiFallback, { fontSize: '40px', padding: { x: 6, y: 8 } }).setOrigin(0.5).setResolution(2).setDepth(4.7)); s.tweens.add({ targets: e, y: e.y - 6, duration: 700, yoyo: true, repeat: -1 }); }
  return { objs, key };
}
export function clearStatus(s: Phaser.Scene, v?: StatusView, popParticles = false) {
  if (!v) return;
  if (popParticles && v.key === 'frozen') { const o: any = v.objs[0]; const n = MAN?.status?.frozen?.exit?.particles;
    if (o && n && s.textures.exists(fxKey(n))) { const p = s.add.image(o.x, o.y, fxKey(n)).setDepth(4.8).setScale((texInfo(n)?.displayScale ?? 0.5) * K * 0.5); s.tweens.add({ targets: p, scale: p.scale * 2, alpha: 0, duration: MAN.status.frozen.exit.ms || 200, onComplete: () => p.destroy() }); } }
  for (const o of v.objs) { s.tweens.killTweensOf(o); o.destroy(); }
}
