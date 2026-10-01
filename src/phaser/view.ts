// Phaser 4 layer: backdrop, hero and enemies, HP bars, hit/heal effects. All Chinese text and menus live in the HTML overlay.
// Sprites: loads sprites/manifest.json (Arty's format: {id: {file, frameWidth, frameHeight, origin{x,y}, flying, animations{idle,attack,hurt}}}).
// Any sprite id without a loaded sheet falls back to the emoji placeholder, so new art drops in by updating public/sprites (tools/sync_sprites.sh).
// Backgrounds + audio: loads assets-manifest.json (tools/sync_assets.py) and only the files it lists. A missing background keeps the
// procedural placeholder scene; missing audio is silent. Backgrounds are authored at 1920x1080 (feet line y=760) and scaled to 960x540 (BASE_Y 380).
import Phaser from 'phaser';
import { setAssetManifest } from '../assets';
import { attachSound } from '../audio/audio';

export interface ViewEnemy { sprite?: string; tint?: number | null; emoji: string; name: string; hp: number; maxHp: number; color: number; boss: boolean; tired?: boolean; }
const W = 960, H = 540, BASE_Y = 380, HERO_X = 210;
const SIZE = { hero: 150, normal: 125, boss: 190 };   // on-screen frame height in px
type Body = Phaser.GameObjects.Sprite | Phaser.GameObjects.Text;
interface FoeView { body: Body; blob: Phaser.GameObjects.Ellipse; bar: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text; data: ViewEnemy; x: number; y: number; h: number; sprite: string | null; }

class MainScene extends Phaser.Scene {
  bg!: Phaser.GameObjects.Rectangle; ground!: Phaser.GameObjects.Rectangle; art!: Phaser.GameObjects.Image;
  decor: Phaser.GameObjects.GameObject[] = [];
  hero!: Body; heroShadow!: Phaser.GameObjects.Ellipse;
  foes: FoeView[] = [];
  manifest: Record<string, any> = {};
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
      if (!this.sound || (this.sound as any).noAudio) return;
      for (const group of ['sfx', 'music'] as const) for (const [key, e] of Object.entries<any>(m[group] || {}))
        if (e?.urls?.length) this.load.audio(key, e.urls);   // [ogg, mp3]: Phaser picks the first the browser supports
    });
  }
  create() {
    const m = this.cache.json.get('spriteManifest');
    if (m && typeof m === 'object') for (const [id, s] of Object.entries<any>(m)) {
      if (!this.textures.exists(id)) continue; this.manifest[id] = s;
      for (const [anim, a] of Object.entries<any>(s.animations || {}))
        this.anims.create({ key: `${id}_${anim}`, frames: this.anims.generateFrameNumbers(id, { start: a.start, end: a.end }), frameRate: a.frameRate, repeat: a.repeat });
    }
    (window as any).__proto = (window as any).__proto || {}; (window as any).__proto.sprites = Object.keys(this.manifest);
    this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x87ceeb);
    this.ground = this.add.rectangle(W / 2, H * 0.78, W, H * 0.44, 0x6fbf4a);
    this.art = this.add.image(W / 2, H / 2, '__DEFAULT').setVisible(false);
    attachSound(this);
    this.heroShadow = this.add.ellipse(HERO_X, BASE_Y, 100, 24, 0x000000, 0.25);
    this.hero = this.makeBody('hero', '🧙', HERO_X, BASE_Y, SIZE.hero, null);
    ready(this);
  }
  has(id?: string | null) { return !!id && !!this.manifest[id]; }
  makeBody(id: string | undefined | null, emoji: string, x: number, y: number, h: number, tint: number | null | undefined): Body {
    if (this.has(id)) {
      const s = this.manifest[id!]; const sp = this.add.sprite(x, y, id!).setOrigin(s.origin?.x ?? 0.5, s.origin?.y ?? 0.92);
      sp.setScale(h / s.frameHeight); if (tint) sp.setTint(tint);
      if (this.anims.exists(`${id}_idle`)) sp.play(`${id}_idle`);
      return sp;
    }
    return this.add.text(x, y - h * 0.45, emoji, { fontSize: Math.round(h * 0.55) + 'px' }).setOrigin(0.5);
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
    const f = this.art.frame; const sc = Math.max(W / f.width, H / f.height);   // cover; 1920x1080 -> exactly 0.5
    this.art.setScale(sc).setPosition(W / 2, H / 2);
    this.bg.setVisible(false); this.ground.setVisible(false);
    return true;
  }
  setMode(mode: 'town' | 'map' | 'battle' | 'blank', color = 0x6fbf4a, bgKeys: string[] = []) {
    this.clearDecor(); this.clearFoes();
    this.ground.setFillStyle(color); this.bg.setFillStyle(mode === 'battle' ? 0x9ad7f5 : 0x87ceeb);
    this.hero.setVisible(mode === 'battle'); this.heroShadow.setVisible(mode === 'battle');
    if (this.setArt(mode === 'blank' ? [] : bgKeys)) return;
    const put = (x: number, y: number, s: string, size = 48) => this.decor.push(this.add.text(x, y, s, { fontSize: size + 'px' }).setOrigin(0.5));
    if (mode === 'town') {
      for (const [x, c] of [[150, 0xc0392b], [330, 0x2980b9], [620, 0x8e44ad], [800, 0x16a085]] as [number, number][]) {
        this.decor.push(this.add.rectangle(x, 250, 120, 90, 0xf3e5c0).setStrokeStyle(4, 0x5a3e1b));
        this.decor.push(this.add.triangle(x, 190, 0, 40, 70, -20, 140, 40, c));
      }
      put(480, 90, '☀️', 56); put(480, 270, '⛲', 64);
    } else if (mode === 'map') {
      put(120, 110, '☁️', 50); put(820, 80, '☁️', 40); put(80, 300, '🌳'); put(880, 320, '🌳'); put(700, 120, '⛰️', 70);
    } else if (mode === 'battle') { put(80, 60, '☁️', 44); put(880, 90, '☁️', 36); }
  }
  clearFoes() { for (const f of this.foes) { f.body.destroy(); f.blob.destroy(); f.bar.destroy(); f.label.destroy(); } this.foes = []; }
  setEnemies(list: ViewEnemy[]) {
    this.clearFoes();
    const xs = list.length === 1 ? [700] : list.length === 2 ? [610, 810] : [540, 690, 850];
    list.forEach((d, i) => {
      const x = xs[i] ?? 850, y = BASE_Y; const h = d.boss ? SIZE.boss : SIZE.normal;
      const sprite = this.has(d.sprite) ? d.sprite! : null;
      const blob = this.add.ellipse(x, y, h * 0.7, h * 0.16, 0x000000, 0.25);
      const body = this.makeBody(sprite, d.emoji, x, y, h, d.tint);
      const top = y - h * (sprite ? 0.85 : 0.8);
      const label = this.add.text(x, top - 22, d.name, { fontSize: '18px', fontFamily: '"Noto Sans SC","Noto Sans CJK SC","PingFang SC","Microsoft YaHei",sans-serif', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      const bar = this.add.graphics();
      if (!sprite) this.tweens.add({ targets: body, y: body.y - 6, duration: 700 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      const f: FoeView = { body, blob, bar, label, data: { ...d }, x, y, h, sprite }; this.foes.push(f); this.drawBar(f);
      if (d.hp <= 0) [body, blob, label, bar].forEach(o => o.setAlpha(0));
    });
  }
  drawBar(f: FoeView) {
    const w = 110, x = f.x - w / 2, y = f.y - f.h * (f.sprite ? 0.85 : 0.8) - 8;
    f.bar.clear(); f.bar.fillStyle(0x000000, 0.6); f.bar.fillRoundedRect(x - 2, y - 2, w + 4, 14, 5);
    const frac = Math.max(0, f.data.hp / f.data.maxHp);
    f.bar.fillStyle(frac > 0.5 ? 0x2ecc71 : frac > 0.25 ? 0xf1c40f : 0xe74c3c, 1); f.bar.fillRoundedRect(x, y, w * frac, 10, 4);
    f.label.setText(f.data.name + (f.data.tired ? ' 😪' : ''));
  }
  updateEnemy(i: number, hp: number, tired?: boolean) {
    const f = this.foes[i]; if (!f) return; const was = f.data.hp; f.data.hp = hp; if (tired !== undefined) f.data.tired = tired; this.drawBar(f);
    if (hp <= 0 && was > 0) {   // defeat: hurt frames, then fade out (no dedicated defeat frames)
      const fade = () => this.tweens.add({ targets: [f.body, f.blob, f.label, f.bar], alpha: 0, duration: 500 });
      if (f.sprite && this.anims.exists(`${f.sprite}_hurt`)) { const b = f.body as Phaser.GameObjects.Sprite; b.play(`${f.sprite}_hurt`); b.once('animationcomplete', () => { b.stop(); fade(); }); }
      else fade();
    }
  }
  float(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, { fontSize: '34px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }
  hitEnemy(i: number, dmg: number | string) {
    const f = this.foes[i]; if (!f) return;
    if (!this.playOnce(this.hero, 'hero', 'attack')) this.tweens.add({ targets: this.hero, x: HERO_X + 70, duration: 120, yoyo: true });
    if (dmg === 'MISS' || !this.playOnce(f.body, f.sprite, 'hurt')) this.tweens.add({ targets: f.body, angle: 12, duration: 70, yoyo: true, repeat: 2 });
    this.float(f.x, f.y - f.h * 0.6, typeof dmg === 'number' ? '-' + dmg : dmg, '#ffe066');
    (window as any).__proto.anims = ((window as any).__proto.anims || 0) + 1;
  }
  enemyAttack(i: number, dmg: number | string, blocked: boolean) {
    const f = this.foes[i]; if (!f) return;
    if (dmg !== 'Zzz' && !this.playOnce(f.body, f.sprite, 'attack')) this.tweens.add({ targets: f.body, x: f.body.x - 60, duration: 140, yoyo: true });
    this.float(HERO_X, BASE_Y - 170, typeof dmg === 'number' ? (dmg > 0 ? '-' + dmg : (blocked ? '🛡️ 0' : '0')) : dmg, blocked ? '#9be7ff' : '#ff6b6b');
    if (typeof dmg === 'number' && dmg > 0 && !this.playOnce(this.hero, 'hero', 'hurt')) this.tweens.add({ targets: this.hero, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
  }
  heroFloat(text: string, color = '#7dff9a') { this.float(HERO_X, BASE_Y - 170, text, color); }
}

let scene: MainScene | null = null; const queue: ((s: MainScene) => void)[] = [];
function ready(s: MainScene) { scene = s; queue.splice(0).forEach(f => f(s)); }
const call = (f: (s: MainScene) => void) => { if (scene) f(scene); else queue.push(f); };

export function startView(parent: string) {
  return new Phaser.Game({ type: Phaser.AUTO, parent, width: W, height: H, backgroundColor: '#87ceeb',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [MainScene], audio: { disableWebAudio: false } });
}
export const view = {
  /** bg: background keys in priority order (see BG in src/assets.ts); missing => placeholder scene. */
  mode: (m: 'town' | 'map' | 'battle' | 'blank', color?: number, bg?: string[]) => call(s => s.setMode(m, color, bg)),
  enemies: (l: ViewEnemy[]) => call(s => s.setEnemies(l)),
  updateEnemy: (i: number, hp: number, tired?: boolean) => call(s => s.updateEnemy(i, hp, tired)),
  hitEnemy: (i: number, d: number | string) => call(s => s.hitEnemy(i, d)),
  enemyAttack: (i: number, d: number | string, blocked: boolean) => call(s => s.enemyAttack(i, d, blocked)),
  heroFloat: (t: string, c?: string) => call(s => s.heroFloat(t, c)),
};
