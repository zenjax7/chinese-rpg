#!/usr/bin/env python3
"""Copies whatever backgrounds / SFX / music / voice clips the artist has delivered into public/ and writes
public/assets-manifest.json listing only the files that exist, so the game never requests a missing file.

Sources (override with env vars, e.g. for testing with a scratch dir):
  ART_BG     default /workspace/art/backgrounds   -> public/bg/        bg_*.png
  AUDIO_DIR  default /workspace/audio             -> public/audio/sfx|music|vo   (sfx_*, mus_*, stg_* as .ogg/.mp3; vo/<itemId>.mp3|.ogg)
  ART_SPELLS default /workspace/art/spells        -> public/spells/** (Arty's spell art, mirrored: icons/, icons/64/, fx/, fx/add/, spells_fx.json ...)
             Skipped: the src/, tools/ and _scratch/ folders, __pycache__ and preview_*.png sheets.
             Manifest: spellIcons {<spell_id>: url} (icons/spell_<id>.png, else icons/64/spell_<id>.png), spellFx {manifest, recipes} when present.
             Optional sfx_spell_<spell_id>.ogg|mp3 in AUDIO_DIR/sfx are picked up by the sfx rule (cast sound; generic fallback otherwise).
Optional <folder>/manifest.json (sfx, music) may carry per-key extras, e.g. {"mus_village": {"loopStart": 2.5, "loopEnd": 64.0}}.
Run by `npm run build` / `npm run dev` (prebuild / predev). Safe to run when nothing exists yet.
If a source folder is missing (e.g. in CI, where /workspace/art and /workspace/audio don't exist), the matching
public/ folder and its section of the existing assets-manifest.json are kept untouched (committed assets are used).
"""
import json, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.normpath(os.path.join(HERE, '..', 'public'))
ART_BG = os.environ.get('ART_BG', '/workspace/art/backgrounds')
AUDIO = os.environ.get('AUDIO_DIR', '/workspace/audio')
ART_SPELLS = os.environ.get('ART_SPELLS', '/workspace/art/spells')
try:
    with open(os.path.join(HERE, '..', 'src', 'data', 'spells.json'), encoding='utf-8') as _f: SPELL_KNOWN = [x['id'] for x in json.load(_f)['spells']]
except Exception: SPELL_KNOWN = []

# Names the game knows how to use (anything else matching the patterns is copied too, but unused until wired).
BG_KNOWN = ['bg_village', 'bg_inn', 'bg_map_r1_starter_meadow', 'bg_map_r2_honeycomb_forest',
            'bg_battle_r1_starter_meadow', 'bg_battle_r2_honeycomb_forest', 'bg_battle_r2_honeycomb_forest_boss']
SFX_KNOWN = ['sfx_hit', 'sfx_miss', 'sfx_block', 'sfx_block_break', 'sfx_hurt', 'sfx_enemy_defeat', 'sfx_correct', 'sfx_wrong',
             'sfx_level_up', 'sfx_gold', 'sfx_chest', 'sfx_potion', 'sfx_ui_click']
MUS_KNOWN = ['mus_village', 'mus_battle_field', 'mus_battle_boss', 'stg_victory', 'stg_defeat']
AUDIO_EXT = ['ogg', 'mp3']   # Phaser gets them in this order and picks the first the browser can play


def fresh(d):
    if os.path.isdir(d): shutil.rmtree(d)
    os.makedirs(d, exist_ok=True)


def read_extra(folder):
    p = os.path.join(folder, 'manifest.json')
    try:
        with open(p, encoding='utf-8') as f: m = json.load(f)
        if isinstance(m, dict) and isinstance(m.get('files'), list):
            # audio-team format: {"files": [{"key", "loop_start_s", "loop_end_s", "suggested_volume", ...}]}
            out = {}
            for e in m['files']:
                if not isinstance(e, dict) or 'key' not in e: continue
                x = {}
                if e.get('loop') and isinstance(e.get('loop_start_s'), (int, float)) and isinstance(e.get('loop_end_s'), (int, float)):
                    x['loopStart'], x['loopEnd'] = e['loop_start_s'], e['loop_end_s']
                if isinstance(e.get('suggested_volume'), (int, float)): x['volume'] = e['suggested_volume']
                out[e['key']] = x
            return out
        return m if isinstance(m, dict) else {}
    except FileNotFoundError: return {}
    except Exception as e: print(f'  warning: bad {p}: {e}'); return {}


def canonical(stem, known, prefixes):
    """Exact key, or an unprefixed alias of a known key (hit.ogg -> sfx_hit, village.ogg -> mus_village, victory.ogg -> stg_victory)."""
    if stem in known: return stem
    for pre in prefixes:
        if pre + stem in known: return pre + stem
    return stem


def load_old_manifest():
    try:
        with open(os.path.join(PUB, 'assets-manifest.json'), encoding='utf-8') as f: m = json.load(f)
        return m if isinstance(m, dict) else {}
    except Exception: return {}


OLD = {}


def sync_audio(src, dst_rel, pattern, known=(), prefixes=(), section=None):
    if not os.path.isdir(src):
        print(f'  skip: {src} not found; keeping public/{dst_rel} as-is')
        return None
    dst = os.path.join(PUB, dst_rel); fresh(dst); out = {}
    extra = read_extra(src)
    for name in sorted(os.listdir(src)):
        stem, ext = os.path.splitext(name)
        if ext not in ('.ogg', '.mp3') or not os.path.isfile(os.path.join(src, name)): continue
        key = canonical(stem, known, prefixes)
        if not re.fullmatch(pattern, key): continue
        if key != stem and os.path.exists(os.path.join(src, key + ext)): continue   # exact name wins over alias
        if key != stem: print(f'  alias: {name} -> {key}{ext}')
        shutil.copy2(os.path.join(src, name), os.path.join(dst, key + ext))
        extra.setdefault(key, extra.get(stem))
    for name in sorted(os.listdir(dst)):
        out.setdefault(os.path.splitext(name)[0], {'urls': []})
    for key in out:
        out[key]['urls'] = [f'{dst_rel}/{key}.{e}' for e in AUDIO_EXT if os.path.exists(os.path.join(dst, f'{key}.{e}'))]
        if isinstance(extra.get(key), dict):
            for k in ('loopStart', 'loopEnd', 'volume'):
                if isinstance(extra[key].get(k), (int, float)): out[key][k] = extra[key][k]
    return out


SPELL_SKIP_DIRS = {'src', 'tools', '_scratch', '__pycache__'}


def sync_spells():
    """Mirrors Arty's spell art. Returns (icons, fx) manifest sections, or None when the source folder is missing."""
    if not os.path.isdir(ART_SPELLS):
        print(f'  skip: {ART_SPELLS} not found; keeping public/spells as-is')
        return None
    dst = os.path.join(PUB, 'spells'); fresh(dst); n = 0
    for root, dirs, files in os.walk(ART_SPELLS):
        rel = os.path.relpath(root, ART_SPELLS)
        dirs[:] = sorted(d for d in dirs if not (d in SPELL_SKIP_DIRS or d.startswith('.')))
        for name in sorted(files):
            if name.startswith('.') or name.startswith('preview_') or not re.search(r'\.(png|json|webp)$', name): continue
            os.makedirs(os.path.join(dst, rel), exist_ok=True); shutil.copy2(os.path.join(root, name), os.path.join(dst, rel, name)); n += 1
    icons = {}
    for sid in SPELL_KNOWN + ['locked']:
        for sub in ('icons', 'icons/64'):
            if os.path.isfile(os.path.join(dst, sub, f'spell_{sid}.png')): icons[sid] = f'spells/{sub}/spell_{sid}.png'; break
    fx = {}
    if os.path.isfile(os.path.join(dst, 'fx', 'manifest.json')):
        fx['manifest'] = 'spells/fx/manifest.json'
        try:
            tex = json.load(open(os.path.join(dst, 'fx', 'manifest.json'), encoding='utf-8')).get('textures', {})
            miss = [k for k, v in tex.items() if not os.path.isfile(os.path.join(dst, v.get('file', '')))]
            if miss: print('  warning: fx textures listed but missing: ' + ', '.join(miss))
        except Exception as e: print(f'  warning: fx/manifest.json unreadable ({e})')
    if os.path.isfile(os.path.join(dst, 'spells_fx.json')): fx['recipes'] = 'spells/spells_fx.json'
    print(f'  spell art: {n} files copied to public/spells')
    return icons, fx


def main():
    global OLD
    OLD = load_old_manifest()
    man = {'_note': 'Generated by tools/sync_assets.py. Lists only files present in public/. Do not edit by hand.',
           'bg': {}, 'sfx': {}, 'music': {}, 'vo': {}, 'spellIcons': {}, 'spellFx': {}}
    # backgrounds
    if not os.path.isdir(ART_BG):
        print(f'  skip: {ART_BG} not found; keeping public/bg as-is')
        man['bg'] = OLD.get('bg', {})
    else:
        dst = os.path.join(PUB, 'bg'); fresh(dst)
        for name in sorted(os.listdir(ART_BG)):
            if re.fullmatch(r'bg_[a-z0-9_]+\.png', name):
                shutil.copy2(os.path.join(ART_BG, name), dst); man['bg'][name[:-4]] = f'bg/{name}'
    sfx = sync_audio(os.path.join(AUDIO, 'sfx'), 'audio/sfx', r'sfx_[a-z0-9_]+', SFX_KNOWN, ['sfx_'])
    man['sfx'] = OLD.get('sfx', {}) if sfx is None else sfx
    mus = sync_audio(os.path.join(AUDIO, 'music'), 'audio/music', r'(?:mus|stg)_[a-z0-9_]+', MUS_KNOWN, ['mus_', 'stg_'])
    man['music'] = OLD.get('music', {}) if mus is None else mus
    vo = sync_audio(os.path.join(AUDIO, 'vo'), 'audio/vo', r'[A-Za-z0-9_.\-]+')
    man['vo'] = OLD.get('vo', {}) if vo is None else {k: v['urls'] for k, v in vo.items()}
    sp = sync_spells()
    if sp is None: man['spellIcons'], man['spellFx'] = OLD.get('spellIcons', {}), OLD.get('spellFx', {})
    else: man['spellIcons'], man['spellFx'] = sp
    with open(os.path.join(PUB, 'assets-manifest.json'), 'w', encoding='utf-8') as f: json.dump(man, f, ensure_ascii=False, indent=1)

    def report(label, have, known):
        miss = [k for k in known if k not in have]
        print(f'  {label}: {len(have)} present' + (f'; missing (fallback used): {", ".join(miss)}' if miss else ''))
    print(f'assets synced -> public/assets-manifest.json (bg from {ART_BG}, audio from {AUDIO})')
    report('backgrounds', man['bg'], BG_KNOWN); report('sfx', man['sfx'], SFX_KNOWN); report('music', man['music'], MUS_KNOWN)
    print(f'  voice clips: {len(man["vo"])}')
    report('spell icons', man['spellIcons'], SPELL_KNOWN)
    print(f"  spell fx: manifest {'yes' if man['spellFx'].get('manifest') else 'MISSING'}, recipes (spells_fx.json) {'yes' if man['spellFx'].get('recipes') else 'MISSING (built-in element fallbacks)'}")
    report('spell sfx', {k for k in man['sfx'] if k.startswith('sfx_spell_')}, [f'sfx_spell_{k}' for k in SPELL_KNOWN])
    for k, v in list(man['sfx'].items()) + list(man['music'].items()):
        if len(v['urls']) < 2: print(f'  note: {k} has only {v["urls"]} (both .ogg and .mp3 recommended)')


if __name__ == '__main__':
    sys.exit(main())
