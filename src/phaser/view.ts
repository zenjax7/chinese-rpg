// Phaser 4 layer: backdrop, hero and enemies, HP bars, hit/heal effects. All menus and most text live in the DOM frame (src/ui).
// World coordinates are the 1280x720 design frame (spec §2). The canvas renders at 1920x1080 with camera zoom 1.5, so the
// 1920x1080 backgrounds draw 1:1 and art stays crisp on retina tablets; Scale.FIT + CENTER_BOTH letterboxes the whole frame.
// Sprites: loads sprites/manifest.json (Arty's format: {id: {file, frameWidth, frameHeight, origin{x,y}, flying, animations{idle,attack,hurt}}}).
// Any sprite id without a loaded sheet falls back to the emoji placeholder, so new art drops in by updating public/sprites (tools/sync_sprites.sh).
// Backgrounds + audio: loads assets-manifest.json (tools/sync_assets.py) and only the files it lists. A missing background keeps the
// procedural placeholder scene; missing audio is silent. Backgrounds are authored at 1920x1080 and cover-scaled to 1280x720 (x2/3).
// The battle feet line is BASE_Y = 420 (spec §4.1) so fighters stand above the fixed command dock (y 464-700).
import Phaser from 'phaser';
import { setAssetManifest } from '../assets';
import { playCast, setFxData, fxTextureList, showStatus, clearStatus, StatusView, CastHandle, elementColor } from './spellfx';
import { attachSound } from '../audio/audio';

export interface ViewEnemy { sprite?: string; tint?: number | null; emoji: string; name: string; hp: number; maxHp: number; color: number; boss: boolean; tired?: boolean; }
export const W = 1280, H = 720, RENDER_ZOOM = 1.5;
export const BASE_Y = 420, HERO_X = 290, COMP_X = 150;
export const SIZE = { hero: 230, normal: 185, boss: 290 };   // on-screen frame height in frame px (spec §4.1)
const ZH_FONT = '"Noto Sans SC","PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
const NUM_FONT = '"Fredoka","Nunito",sans-serif';
const TXT_RES = 2;   // text textures at 2x so they stay sharp under the 1.5 camera zoom
type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
interface FoeView { body: Body; blob: Phaser.GameObjects.Ellipse; bar: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; data: ViewEnemy;
  x: number; y: number; h: number; sprite: string | null; ghost: number; shown: number; impactAt: number; mark?: Phaser.GameObjects.Text; orb?: Phaser.GameObjects.Arc; ward?: StatusView; status?: StatusView; }
/** Enemy slot x positions (spec §4.1); a boss leading a pack takes the middle slot. */
export function foeSlots(n: number, bossFirst: boolean): number[] {
  if (n <= 1) return [900];
  if (n === 2) return [820, 1040];
  return bossFirst ? [960, 780, 1140] : [780, 960, 1140];
}

class MainScene extends Phaser.Scene {
  bg!: Phaser.GameObjects.Rectangle; ground!: Phaser.GameObjects.Rectangle; art!: Phaser.GameObjects.Image; dim!: Phaser.GameObjects.Rectangle;
  decor: Phaser.GameObjects.GameObject[] = [];
  hero!: Body; heroShadow!: Phaser.GameObjects.Ellipse; comp!: Phaser.GameObjects.Text; shieldBubble!: Phaser.GameObjects.Ellipse;
  targetMark!: Phaser.GameObjects.Text; targetRing!: Phaser.GameObjects.Ellipse;
  foes: FoeView[] = [];
  manifest: Record<string, any> = {};
  target = -1; focused = false;
  constructor() { super('main'); }
  preload() {
    this.load.on('loaderror', () => { /* missing art => placeholders */ });
    this.load.json('spriteManifest', 'sprites/manifest.json');
    this.load.once('filecomplete-json-spriteManifest', (_k: string, _t: string, m: any) => {
      if (!m || typeof m !== 'object') return;
      for (const [id, s] of Object.entries<any>(m)) if (s && s.file) this.load.spritesheet(id, `sprites/${s.file}`, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    });
    this.load.json('assetsManifest', 'assets-manifest.json');
    this.load.once('filecomplete-json-assetsManifest', (_k: string, _t: string, m: any) => {
      setAssetManifest(m);
      if (!m || typeof m !== 'object') return;
      for (const [key, url] of Object.entries<string>(m.bg || {})) this.load.image(key, url);
      // v3.4 spell art (Arty): fx texture manifest + optional per-spell recipes (spells_fx.json); see src/phaser/spellfx.ts
      const sf = m.spellFx || {};
      if (sf.recipes) this.load.json('spellFxRecipes', sf.recipes);
      if (sf.manifest) { this.load.json('spellFxManifest', sf.manifest);
        this.load.once('filecomplete-json-spellFxManifest', (_k2: string, _t2: string, fm: any) => { setFxData(fm, null);
          for (const [key, url, fw, fh] of fxTextureList()) { if (fw && fh) this.load.spritesheet(key, url, { frameWidth: fw, frameHeight: fh }); else this.load.image(key, url); } }); }
      if (!this.sound || (this.sound as any).noAudio) return;
      for (const group of ['sfx', 'music'] as const) for (const [key, e] of Object.entries<any>(m[group] || {}))
        if (e?.urls?.length) this.load.audio(key, e.urls);   // [ogg, mp3]: Phaser picks the first the browser supports
    });
  }
  create() {
    this.cameras.main.setZoom(RENDER_ZOOM).centerOn(W / 2, H / 2);
    const m = this.cache.json.get('spriteManifest');
    if (m && typeof m === 'object') for (const [id, s] of Object.entries<any>(m)) {
      if (!this.textures.exists(id)) continue; this.manifest[id] = s;
      for (const [anim, a] of Object.entries<any>(s.animations || {}))
        this.anims.create({ key: `${id}_${anim}`, frames: this.anims.generateFrameNumbers(id, { start: a.start, end: a.end }), frameRate: a.frameRate, repeat: a.repeat });
    }
    setFxData(this.cache.json.get('spellFxManifest'), this.cache.json.get('spellFxRecipes'));
    (window as any).__proto = (window as any).__proto || {}; (window as any).__proto.sprites = Object.keys(this.manifest);
    (window as any).__proto.spriteInfo = Object.fromEntries(Object.entries(this.manifest).map(([k, v]: any) => [k, { file: v.file, fw: v.frameWidth, fh: v.frameHeight }]));
    this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x87ceeb).setDepth(0);
    this.ground = this.add.rectangle(W / 2, H * 0.78, W, H * 0.44, 0x6fbf4a).setDepth(0);
    this.art = this.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false).setDepth(0);
    this.dim = this.add.rectangle(W / 2, H / 2, W, H, 0x0a1028, 0.2).setDepth(1).setVisible(false);
    attachSound(this);
    this.heroShadow = this.add.ellipse(HERO_X, BASE_Y, 120, 26, 0x000000, 0.28).setDepth(2);
    this.comp = this.add.text(COMP_X, BASE_Y - 36, '🐲', { fontSize: '64px', padding: { x: 6, y: 10 } }).setOrigin(0.5).setResolution(TXT_RES).setDepth(3);
    this.hero = this.makeBody('hero', '🧙', HERO_X, BASE_Y, SIZE.hero, null).setDepth(4);
    this.shieldBubble = this.add.ellipse(HERO_X, BASE_Y - SIZE.hero * 0.42, SIZE.hero * 0.72, SIZE.hero * 0.95, 0x6dd5fa, 0.12).setStrokeStyle(4, 0x9be7ff, 0.9).setDepth(5).setVisible(false);
    this.targetRing = this.add.ellipse(0, 0, 150, 34, 0xffffff, 0.22).setStrokeStyle(3, 0xffffff, 0.8).setDepth(2).setVisible(false);
    this.targetMark = this.add.text(0, 0, '▼', { fontSize: '40px', color: '#ffe27a', stroke: '#000', strokeThickness: 6, fontFamily: NUM_FONT }).setOrigin(0.5, 1).setResolution(TXT_RES).setDepth(9).setVisible(false);
    this.tweens.add({ targets: this.comp, y: '-=5', duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.tweens.add({ targets: this.shieldBubble, alpha: 0.6, duration: 600, yoyo: true, repeat: -1 });
    ready(this);
  }
  markY = 0;
  update(time: number) { if (this.targetMark?.visible) this.targetMark.y = this.markY + Math.sin(time / 140) * 5; }
  has(id?: string | null) { return !!id && !!this.manifest[id]; }
  makeBody(id: string | undefined | null, emoji: string, x: number, y: number, h: number, tint: number | null | undefined): Body {
    if (this.has(id)) {
      const s = this.manifest[id!]; const sp = this.add.sprite(x, y, id!).setOrigin(s.origin?.x ?? 0.5, s.origin?.y ?? 0.92);
      sp.setScale(h / s.frameHeight); if (tint) sp.setTint(tint);
      if (this.anims.exists(`${id}_idle`)) sp.play(`${id}_idle`);
      return sp;
    }
    return this.add.text(x, y - h * 0.45, emoji, { fontSize: Math.round(h * 0.55) + 'px', padding: { x: 8, y: 12 } }).setOrigin(0.5).setResolution(TXT_RES);
  }
  playOnce(b: Body, id: string | null, anim: string) {
    if (!(b instanceof Phaser.GameObjects.Sprite) || !id || !this.anims.exists(`${id}_${anim}`)) return false;
    b.play(`${id}_${anim}`); b.once('animationcomplete', () => { if (b.active && this.anims.exists(`${id}_idle`)) b.play(`${id}_idle`); }); return true;
  }
  clearDecor() { this.decor.forEach(d => d.destroy()); this.decor = []; }
  /** Shows the first background key that was delivered; returns false (=> draw the placeholder scene) if none. */
  setArt(keys: string[]): boolean {
    const key = keys.find(k => this.textures.exists(k));
    (window as any).__proto.bg = key || null;
    if (!key) { this.art.setVisible(false); this.bg.setVisible(true); this.ground.setVisible(true); return false; }
    this.art.setTexture(key).setVisible(true);
    const f = this.art.frame; const sc = Math.max(W / f.width, H / f.height);   // cover; 1920x1080 -> 2/3 (1:1 on the 1920 canvas)
    this.art.setScale(sc).setPosition(W / 2, H / 2);
    this.bg.setVisible(false); this.ground.setVisible(false);
    return true;
  }
  setMode(mode: 'town' | 'map' | 'battle' | 'blank', color = 0x6fbf4a, bgKeys: string[] = []) {
    this.wardOn = false; this.clearDecor(); this.clearFoes(); this.clearFocus(); this.shield(false);
    this.ground.setFillStyle(color); this.bg.setFillStyle(mode === 'battle' ? 0x9ad7f5 : 0x87ceeb);
    const b = mode === 'battle';
    this.hero.setVisible(b); this.heroShadow.setVisible(b); this.comp.setVisible(b);
    if (b) { this.hero.setPosition(HERO_X, this.hero instanceof Phaser.GameObjects.Sprite ? BASE_Y : BASE_Y - SIZE.hero * 0.45).setAlpha(1); if (this.hero instanceof Phaser.GameObjects.Sprite && this.anims.exists('hero_idle')) this.hero.play('hero_idle'); }
    if (this.setArt(mode === 'blank' ? [] : bgKeys)) return;
    const put = (x: number, y: number, s: string, size = 64) => this.decor.push(this.add.text(x, y, s, { fontSize: size + 'px', padding: { x: 6, y: 10 } }).setOrigin(0.5).setResolution(TXT_RES).setDepth(1));
    if (mode === 'town') {
      for (const [x, c] of [[200, 0xc0392b], [440, 0x2980b9], [830, 0x8e44ad], [1070, 0x16a085]] as [number, number][]) {
        this.decor.push(this.add.rectangle(x, 330, 160, 120, 0xf3e5c0).setStrokeStyle(5, 0x5a3e1b).setDepth(1));
        this.decor.push(this.add.triangle(x, 250, 0, 54, 94, -26, 188, 54, c).setDepth(1));
      }
      put(640, 120, '☀️', 74); put(640, 360, '⛲', 84);
    } else if (mode === 'map') {
      put(160, 150, '☁️', 66); put(1090, 110, '☁️', 54); put(110, 400, '🌳'); put(1170, 430, '🌳'); put(930, 160, '⛰️', 92);
    } else if (mode === 'battle') { put(110, 80, '☁️', 58); put(1170, 120, '☁️', 48); }
  }
  clearFoes() { for (const f of this.foes) { f.body.destroy(); f.blob.destroy(); f.bar.destroy(); f.label.destroy(); f.mark?.destroy(); f.orb?.destroy(); clearStatus(this, f.ward); clearStatus(this, f.status); } this.foes = []; this.target = -1; this.targetMark?.setVisible(false); this.targetRing?.setVisible(false); }
  foeTop(f: FoeView) { return f.y - f.h * (f.sprite ? 0.84 : 0.8); }
  setEnemies(list: ViewEnemy[]) {
    this.clearFoes();
    const xs = foeSlots(list.length, !!list[0]?.boss);
    list.forEach((d, i) => {
      const x = xs[i] ?? 1140, y = BASE_Y; const h = d.boss ? SIZE.boss : SIZE.normal;
      const sprite = this.has(d.sprite) ? d.sprite! : null;
      const blob = this.add.ellipse(x, y, h * 0.62, h * 0.14, 0x000000, 0.28).setDepth(2);
      const body = this.makeBody(sprite, d.emoji, x, y, h, d.tint).setDepth(4);
      const f: FoeView = { body, blob, bar: this.add.graphics().setDepth(8), label: null as any, data: { ...d }, x, y, h, sprite, ghost: d.hp, shown: d.hp, impactAt: 0 };
      const top = this.foeTop(f);
      // tall bosses: the name would sit under the spell banner, so put it beside the HP bar instead
      const inline = top - 26 - 40 < 160;
      f.label = this.add.text(inline ? x - 75 : x, inline ? top - 9 : top - 26, d.name, { fontSize: '28px', fontFamily: ZH_FONT, color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 6, padding: { x: 4, y: 6 } })
        .setOrigin(inline ? 1 : 0.5, inline ? 0.5 : 1).setResolution(TXT_RES).setDepth(8);
      if (!sprite) this.tweens.add({ targets: body, y: body.y - 6, duration: 700 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.foes.push(f); this.drawBar(f);
      if (d.hp <= 0) [body, blob, f.label, f.bar].forEach(o => o.setAlpha(0));
    });
    (window as any).__proto.foeLayout = this.foes.map(f => ({ x: f.x, top: this.foeTop(f), h: f.h }));
    if (this.wardOn) this.setWard(true);
  }
  // ---------------- v3.4 spells (choreography in ./spellfx.ts) ----------------
  wardOn = false; cast: CastHandle | null = null;
  fxTarget(f: FoeView) { return { x: f.x, top: this.foeTop(f), feet: f.y, h: f.h, body: f.body, sprite: f.sprite }; }
  fxHost() {
    const b = this.hero; const sp = b instanceof Phaser.GameObjects.Sprite ? b : null;
    const w = sp ? sp.displayWidth : SIZE.hero * 0.6, h = sp ? sp.displayHeight : SIZE.hero * 0.6;
    const box = sp ? { x: sp.x + (0.5 - sp.originX) * w, feet: sp.y + (1 - sp.originY) * h, w, h } : { x: HERO_X, feet: BASE_Y, w, h };
    return { scene: this as Phaser.Scene, hero: b, heroBox: box, playOnce: (x: Body, id: string | null, a: string) => this.playOnce(x, id, a), hitStop: (x: Body) => this.impact(x) };
  }
  /** Magic Ward 魔法护盾 (flag bossMagicWard, off in v3.4): Arty's violet ward ring under every enemy. */
  setWard(on: boolean) {
    this.wardOn = on;
    for (const f of this.foes) { clearStatus(this, f.ward); f.ward = undefined; if (on && f.data.hp > 0) f.ward = showStatus(this, 'ward', this.fxTarget(f), '🛡️'); }
  }
  /** Status overlay on enemy i: soaked | dazed | chilled | frozen, null clears it. */
  setStatus(i: number, key: string | null) {
    const f = this.foes[i]; if (!f) return; const was = f.status?.key;
    clearStatus(this, f.status, !key && was === 'frozen'); f.status = undefined;
    if (key && f.data.hp > 0) f.status = showStatus(this, key, this.fxTarget(f), '✨');
    (window as any).__proto.statusFx = this.foes.map(x => x.status?.key || null);
  }
  /** Plays a cast; at each impact the damage number pops, the HP bar drops and the status overlay appears. Resolves when the animation ends or is skipped. */
  castSpell(sp: { id: string; element: string; emoji: string; target: string }, targets: number[], dmgs: number[], hpAfter: number[], opts: { status?: (string | null)[]; tag?: string } = {}): Promise<void> {
    const fv = targets.map(i => this.foes[i]).filter(Boolean);
    const h = playCast(this.fxHost(), sp, fv.map(f => this.fxTarget(f)), k => {
      const f = fv[k]; if (!f || !f.body.active) return; const i = this.foes.indexOf(f);
      this.damageNumber(f.x + 30, this.foeTop(f) - 10, '-' + dmgs[k], '#' + elementColor(sp.element).toString(16).padStart(6, '0'), opts.tag);
      f.impactAt = 0; this.updateEnemy(i, hpAfter[k]);
      if (opts.status?.[k] && hpAfter[k] > 0) this.setStatus(i, opts.status[k]!);
    });
    this.cast = h; h.done.then(() => { if (this.cast === h) this.cast = null; });
    return h.done;
  }
  skipCast() { this.cast?.skip(); }
  /** Fizzle 失灵: a grey puff at the staff, nothing reaches the enemy. */
  fizzle(element: string) {
    const hp = this.heroPos(); const x = hp.x + 70, y = hp.y - 40;
    const spark = this.add.circle(x, y, 14, elementColor(element), 0.9).setDepth(9);
    this.tweens.add({ targets: spark, scale: 0.2, alpha: 0, duration: 260, onComplete: () => spark.destroy() });
    for (let k = 0; k < 7; k++) {
      const c = this.add.circle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, 12 + Math.random() * 10, 0x9aa0a8, 0.75).setDepth(9);
      this.tweens.add({ targets: c, x: c.x + (Math.random() - 0.3) * 90, y: c.y - 40 - Math.random() * 50, scale: 2, alpha: 0, duration: 800, delay: 120 + k * 30, onComplete: () => c.destroy() });
    }
    const t = this.txt(x, y - 70, '💨 失灵 Fizzle!', 36, '#dfe8ff', 12).setFontFamily(ZH_FONT);
    this.tweens.add({ targets: t, y: y - 130, alpha: 0, duration: 1200, delay: 400, onComplete: () => t.destroy() });
    const p = (window as any).__proto; p.fizzles = (p.fizzles || 0) + 1;
  }
  drawBar(f: FoeView) {
    const w = 130, x = f.x - w / 2, y = this.foeTop(f) - 20;
    f.bar.clear(); f.bar.fillStyle(0x000000, 0.65); f.bar.fillRoundedRect(x - 3, y - 3, w + 6, 22, 7);
    const frac = Math.max(0, f.shown / f.data.maxHp), gh = Math.max(frac, f.ghost / f.data.maxHp);
    if (gh > frac) { f.bar.fillStyle(0xffffff, 1); f.bar.fillRoundedRect(x, y, w * gh, 16, 5); }
    if (frac > 0) { f.bar.fillStyle(frac > 0.5 ? 0x2ecc71 : frac > 0.25 ? 0xf1c40f : 0xe74c3c, 1); f.bar.fillRoundedRect(x, y, Math.max(8, w * frac), 16, 5); }
    f.label.setText(f.data.name + (f.data.tired ? ' 😪' : ''));
  }
  updateEnemy(i: number, hp: number, tired?: boolean) {
    const f = this.foes[i]; if (!f) return; const was = f.data.hp; f.data.hp = hp; if (tired !== undefined) f.data.tired = tired;
    const apply = () => {
      if (!f.body.active) return;
      const before = f.shown; f.shown = f.data.hp;
      if (f.shown < before) {   // HP "ghost bar": the lost chunk turns white, then drains over 400 ms
        f.ghost = before; this.drawBar(f);
        this.tweens.addCounter({ from: before, to: f.shown, duration: 400, delay: 180, onUpdate: tw => { f.ghost = tw.getValue() ?? f.shown; if (f.bar.active) this.drawBar(f); } });
      } else { f.ghost = f.shown; this.drawBar(f); }
      if (f.data.hp <= 0 && was > 0) {   // defeat: hurt frames, then fade out (no dedicated defeat frames)
        if (this.target === i) this.setTarget(-1);
        clearStatus(this, f.ward); f.ward = undefined; clearStatus(this, f.status); f.status = undefined;
        const fade = () => this.tweens.add({ targets: [f.body, f.blob, f.label, f.bar], alpha: 0, duration: 500 });
        this.coinBurst(f.x, this.foeTop(f) + f.h * 0.4);
        if (f.sprite && this.anims.exists(`${f.sprite}_hurt`)) { const b = f.body as Phaser.GameObjects.Sprite; b.play(`${f.sprite}_hurt`); b.once('animationcomplete', () => { b.stop(); fade(); }); }
        else fade();
      }
    };
    const wait = f.impactAt - performance.now();
    if (wait > 0) setTimeout(apply, wait); else apply();
  }
  txt(x: number, y: number, s: string, size: number, color: string, depth = 10) {
    return this.add.text(x, y, s, { fontSize: size + 'px', color, fontFamily: NUM_FONT, fontStyle: 'bold', stroke: '#000', strokeThickness: Math.max(5, size / 9), padding: { x: 6, y: 8 } })
      .setOrigin(0.5).setResolution(TXT_RES).setDepth(depth);
  }
  float(x: number, y: number, text: string, color: string, size = 44) {
    const t = this.txt(x, y, text, size, color);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 1200, delay: 300, onComplete: () => t.destroy() });
  }
  /** Big damage number: pops to 1.3x, then floats up (spec §4.4). */
  damageNumber(x: number, y: number, text: string, color: string, tag?: string) {
    const t = this.txt(x, y, text, 64, color, 11).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1.3, duration: 120, ease: 'Back.out', yoyo: false, onComplete: () => this.tweens.add({ targets: t, scale: 1, duration: 120 }) });
    this.tweens.add({ targets: t, y: y - 80, alpha: 0, duration: 900, delay: 500, onComplete: () => t.destroy() });
    if (tag) { const g = this.txt(x, y + 46, tag, 26, '#9be7ff', 11); this.tweens.add({ targets: g, y: y - 20, alpha: 0, duration: 900, delay: 700, onComplete: () => g.destroy() }); }
  }
  sparkle(x: number, y: number, n = 6, color = 0xfff3b0) {
    for (let k = 0; k < n; k++) {
      const a = (Math.PI * 2 * k) / n + Math.random() * 0.4; const s = this.add.star(x, y, 5, 5, 12, color).setDepth(10);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * (60 + Math.random() * 40), y: y + Math.sin(a) * (50 + Math.random() * 30), angle: 180, alpha: 0, scale: 0.4, duration: 520, ease: 'Quad.out', onComplete: () => s.destroy() });
    }
  }
  coinBurst(x: number, y: number) {
    for (let k = 0; k < 7; k++) {
      const c = this.add.circle(x, y, 9, 0xffcf4a).setStrokeStyle(3, 0xb07a10).setDepth(12);
      const mx = x + (Math.random() - 0.5) * 160, my = y - 40 - Math.random() * 80;
      this.tweens.chain({ targets: c, tweens: [
        { x: mx, y: my, duration: 260, ease: 'Quad.out' },
        { x: 40, y: 146, scale: 0.6, duration: 520, delay: k * 40, ease: 'Quad.in', onComplete: () => c.destroy() }] });
    }
  }
  /** White fill flash + 70 ms hit-stop (spec §4.4). */
  impact(body: Body) {
    const sp = body instanceof Phaser.GameObjects.Sprite ? body : null;
    if (sp) sp.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.tweens.pauseAll(); this.anims.pauseAll();
    setTimeout(() => { if (sp?.active) { sp.clearTint(); sp.setTintMode(Phaser.TintModes.MULTIPLY); } }, 60);
    setTimeout(() => { this.tweens.resumeAll(); this.anims.resumeAll(); }, 70);
  }
  heroPos() { return { x: HERO_X, y: BASE_Y - SIZE.hero * 0.5 }; }
  /** Hero dashes at enemy i. dmg: number => hit juice, 'MISS' => whiff. */
  hitEnemy(i: number, dmg: number | string, opts: { spoken?: boolean; companion?: boolean } = {}) {
    const f = this.foes[i]; if (!f) return;
    const IMPACT = 180; f.impactAt = performance.now() + IMPACT + 70;
    const actor: any = opts.companion ? this.comp : this.hero;
    if (opts.companion) {
      const bub = this.txt(COMP_X + 20, BASE_Y - 150, '我来帮你!', 28, '#ffffff', 12).setFontFamily(ZH_FONT).setBackgroundColor('#ff5e9a');
      this.tweens.add({ targets: bub, alpha: 0, delay: 1100, duration: 300, onComplete: () => bub.destroy() });
      this.tweens.add({ targets: this.comp, x: f.x - 120, duration: IMPACT, yoyo: true, hold: 160, ease: 'Quad.in' });
    } else {
      this.playOnce(this.hero, 'hero', 'attack');
      this.tweens.add({ targets: actor, x: HERO_X + 150, duration: IMPACT, yoyo: true, hold: 120, ease: 'Quad.in' });
      const lines = this.add.graphics().setDepth(3); lines.lineStyle(4, 0xffffff, 0.7);
      for (let k = 0; k < 4; k++) { const yy = BASE_Y - 60 - k * 38; lines.lineBetween(HERO_X - 90, yy, HERO_X - 10, yy); }
      this.tweens.add({ targets: lines, alpha: 0, x: -40, duration: 300, onComplete: () => lines.destroy() });
    }
    const top = this.foeTop(f);
    setTimeout(() => {
      if (!f.body.active) return;
      if (dmg === 'MISS') {
        this.tweens.add({ targets: f.body, x: f.x + 40, duration: 110, yoyo: true, ease: 'Quad.out' });
        this.float(f.x, top + 20, 'MISS', '#dfe8ff', 44);
        return;
      }
      this.impact(f.body);
      setTimeout(() => {
        if (!this.playOnce(f.body, f.sprite, 'hurt')) this.tweens.add({ targets: f.body, angle: 12, duration: 70, yoyo: true, repeat: 2 });
        this.cameras.main.shake(150, 0.004);
        this.sparkle(f.x, top + f.h * 0.35);
        this.damageNumber(f.x + 30, top - 10, typeof dmg === 'number' ? '-' + dmg : String(dmg), '#ffe066', opts.spoken ? '×1.25 🎤 Voice!' : undefined);
      }, 70);
    }, IMPACT);
    (window as any).__proto.anims = ((window as any).__proto.anims || 0) + 1;
  }
  enemyAttack(i: number, dmg: number | string, blocked: boolean) {
    const f = this.foes[i]; if (!f) return; this.windUp(i, false);
    if (dmg === 'Zzz') { this.float(f.x, this.foeTop(f), '💤 Zzz', '#dfe8ff'); return; }
    if (!this.playOnce(f.body, f.sprite, 'attack')) this.tweens.add({ targets: f.body, x: f.body.x - 70, duration: 150, yoyo: true });
    else this.tweens.add({ targets: f.body, x: f.x - 50, duration: 150, yoyo: true });
    const hp = this.heroPos();
    setTimeout(() => {
      this.shield(false);
      if (blocked) {   // shield flashes bright blue, "Blocked!" floats, the enemy recoils
        const s = this.add.ellipse(HERO_X, BASE_Y - SIZE.hero * 0.42, SIZE.hero * 0.72, SIZE.hero * 0.95, 0x9be7ff, 0.55).setStrokeStyle(6, 0xffffff).setDepth(6);
        this.tweens.add({ targets: s, alpha: 0, scale: 1.15, duration: 450, onComplete: () => s.destroy() });
        this.float(hp.x, hp.y - 110, typeof dmg === 'number' && dmg > 0 ? `🛡️ Blocked! -${dmg}` : '🛡️ Blocked!', '#9be7ff', 38);
        this.tweens.add({ targets: f.body, x: f.x + 30, duration: 120, yoyo: true, delay: 60 });
      } else if (typeof dmg === 'number' && dmg > 0) {   // mild consequence: hurt frame, red number, soft red edge glow (no camera shake)
        if (!this.playOnce(this.hero, 'hero', 'hurt')) this.tweens.add({ targets: this.hero, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
        this.damageNumber(hp.x, hp.y - 110, '-' + dmg, '#ff6b6b');
        const e = document.getElementById('edge'); if (e) { e.classList.remove('hurt'); void e.offsetWidth; e.classList.add('hurt'); }
      } else this.float(hp.x, hp.y - 110, '0', '#ffffff');
    }, 170);
  }
  heroFloat(text: string, color = '#7dff9a') { const p = this.heroPos(); this.float(p.x, p.y - 110, text, color); this.sparkle(p.x, p.y, 5, 0x7dff9a); }
  /** Enemy wind-up telegraph: red tint, "!" and a pulsing spell orb. */
  windUp(i: number, on: boolean) {
    const f = this.foes[i]; if (!f) return;
    f.mark?.destroy(); f.orb?.destroy(); f.mark = undefined; f.orb = undefined;
    if (f.body instanceof Phaser.GameObjects.Sprite) { if (on) f.body.setTint(0xff9a9a); else if (f.data.tint) f.body.setTint(f.data.tint); else f.body.clearTint(); }
    if (!on) return;
    const top = this.foeTop(f);
    f.mark = this.txt(f.x + 78, top - 40, '!', 56, '#ff4d4d', 9);
    this.tweens.add({ targets: f.mark, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
    f.orb = this.add.circle(f.x - f.h * 0.45, top + f.h * 0.35, 16, 0xff6b6b, 0.85).setStrokeStyle(4, 0xffd0d0).setDepth(9);
    this.tweens.add({ targets: f.orb, scale: 1.5, alpha: 0.5, duration: 400, yoyo: true, repeat: -1 });
  }
  shield(on: boolean) { this.shieldBubble?.setVisible(on); }
  setTarget(i: number) {
    this.target = i; const f = this.foes[i];
    if (!f || f.data.hp <= 0) { this.targetMark.setVisible(false); this.targetRing.setVisible(false); return; }
    this.markY = this.foeTop(f) - 58; this.targetMark.setPosition(f.x, this.markY).setVisible(true);
    this.targetRing.setPosition(f.x, f.y).setSize(f.h * 0.8, f.h * 0.18).setVisible(true);
  }
  /** Question open: background dims 20%, hero in ready pose, other enemies fade to 55% (spec §4.2). */
  focus(opts: { target?: number; turn: string; attacker?: number }) {
    this.focused = true; this.dim.setVisible(true);
    if (this.hero instanceof Phaser.GameObjects.Sprite && this.manifest.hero) { this.hero.stop(); this.hero.setFrame(2); }
    if (opts.turn === 'defense') this.shield(true);
    const keep = opts.turn === 'attack' ? opts.target : opts.turn === 'defense' ? opts.attacker : undefined;
    this.foes.forEach((f, k) => { if (f.data.hp > 0) [f.body, f.label, f.bar].forEach(o => o.setAlpha(keep === undefined || k === keep ? 1 : 0.55)); });
    if (opts.turn === 'attack' && opts.target !== undefined) this.setTarget(opts.target); else this.setTarget(-1);
  }
  clearFocus() {
    if (!this.dim) return;
    this.focused = false; this.dim.setVisible(false); this.setTarget(-1);
    if (this.hero instanceof Phaser.GameObjects.Sprite && this.anims.exists('hero_idle') && !this.hero.anims.isPlaying) this.hero.play('hero_idle');
    this.foes.forEach(f => { if (f.data.hp > 0) [f.body, f.label, f.bar].forEach(o => o.setAlpha(1)); });
  }
}

let scene: MainScene | null = null; const queue: ((s: MainScene) => void)[] = [];
function ready(s: MainScene) { scene = s; queue.splice(0).forEach(f => f(s)); }
const call = (f: (s: MainScene) => void) => { if (scene) f(scene); else queue.push(f); };

export function startView(parent: string) {
  return new Phaser.Game({ type: Phaser.AUTO, parent, width: W * RENDER_ZOOM, height: H * RENDER_ZOOM, backgroundColor: '#0b1020',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [MainScene], audio: { disableWebAudio: false } });
}
export const view = {
  /** bg: background keys in priority order (see BG in src/assets.ts); missing => placeholder scene. */
  mode: (m: 'town' | 'map' | 'battle' | 'blank', color?: number, bg?: string[]) => call(s => s.setMode(m, color, bg)),
  enemies: (l: ViewEnemy[]) => call(s => s.setEnemies(l)),
  updateEnemy: (i: number, hp: number, tired?: boolean) => call(s => s.updateEnemy(i, hp, tired)),
  hitEnemy: (i: number, d: number | string, opts?: { spoken?: boolean; companion?: boolean }) => call(s => s.hitEnemy(i, d, opts)),
  enemyAttack: (i: number, d: number | string, blocked: boolean) => call(s => s.enemyAttack(i, d, blocked)),
  heroFloat: (t: string, c?: string) => call(s => s.heroFloat(t, c)),
  windUp: (i: number, on: boolean) => call(s => s.windUp(i, on)),
  setTarget: (i: number) => call(s => s.setTarget(i)),
  focus: (o: { target?: number; turn: string; attacker?: number }) => call(s => s.focus(o)),
  clearFocus: () => call(s => s.clearFocus()),
  /** Screen rects of the enemies in frame coordinates (for the DOM tap targets). */
  foeBoxes: (): { x: number; y: number; w: number; h: number; alive: boolean }[] =>
    scene ? scene.foes.map(f => ({ x: f.x - Math.max(80, f.h * 0.45), y: scene!.foeTop(f) - 60, w: Math.max(160, f.h * 0.9), h: Math.max(180, f.h * 0.84 + 60), alive: f.data.hp > 0 })) : [],
  spriteSheet: (id: string) => scene?.manifest[id] ? { file: scene.manifest[id].file as string, fw: scene.manifest[id].frameWidth as number, fh: scene.manifest[id].frameHeight as number,
    frames: Math.max(1, scene.textures.get(id).frameTotal - 1) } : null,
  onReady: (f: () => void) => call(() => f()),
  castSpell: (sp: { id: string; element: string; emoji: string; target: string }, targets: number[], dmgs: number[], hpAfter: number[], opts?: { status?: (string | null)[]; tag?: string }) =>
    scene ? scene.castSpell(sp, targets, dmgs, hpAfter, opts) : Promise.resolve(),
  skipCast: () => call(s => s.skipCast()),
  setStatus: (i: number, key: string | null) => call(s => s.setStatus(i, key)),
  fizzle: (element: string) => call(s => s.fizzle(element)),
  setWard: (on: boolean) => call(s => s.setWard(on)),
};
