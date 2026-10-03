"""Builds the self-hosted web fonts in src/fonts/ (committed, so `npm run build:ci` needs nothing extra).
Run manually after adding new Chinese text:  python3 tools/build_fonts.py   (needs: pip install fonttools brotli)

- Noto Sans SC (SIL OFL): subset of Noto Sans CJK SC (same glyph design) to every Han/CJK character used in src/ and
  desy/core-curriculum.csv, plus CJK punctuation. Weights 400 + 700.
- Nunito (OFL, body/UI) and Fredoka (OFL, titles/numbers): Latin subsets of the variable fonts.
Source font paths can be overridden with NOTO_REG / NOTO_BOLD / NUNITO / FREDOKA env vars."""
import os, re, glob, csv, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'fonts')
NOTO_REG = os.environ.get('NOTO_REG', '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
NOTO_BOLD = os.environ.get('NOTO_BOLD', '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
G = '/usr/share/fonts/truetype/sand-box/google'
NUNITO = os.environ.get('NUNITO', f'{G}/Nunito/Nunito-VariableFont_wght.ttf')
FREDOKA = os.environ.get('FREDOKA', f'{G}/Fredoka/Fredoka-VariableFont_wdth,wght.ttf')

han = set()
cjk = re.compile(r'[\u2E80-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u3000-\u303F]')
for f in glob.glob(os.path.join(ROOT, 'src', '**', '*.*'), recursive=True):
    if f.endswith(('.ts', '.json', '.css')): han.update(cjk.findall(open(f, encoding='utf-8').read()))
han.update(cjk.findall(open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()))
# v3.9.1 graph world: graph titles, dialogue, quest titles and scenes shown at run time (public/world/, tools/world/build_world.py)
for f in glob.glob(os.path.join(ROOT, 'public', 'world', '**', '*.json'), recursive=True): han.update(cjk.findall(open(f, encoding='utf-8').read()))
cur = os.path.join(ROOT, '..', '..', 'desy', 'core-curriculum.csv')
if os.path.exists(cur):
    for r in csv.DictReader(open(cur, encoding='utf-8-sig')): han.update(cjk.findall(r.get('simplified', '')))
han.update('，。！？：；、“”‘’（）《》…—·')
text = ''.join(sorted(han)) + ''.join(chr(c) for c in range(0x20, 0x7F))
os.makedirs(OUT, exist_ok=True)
def sub(src, out, extra):
    subprocess.run([sys.executable, '-m', 'fontTools.subset', src, f'--output-file={os.path.join(OUT, out)}', '--flavor=woff2',
                    '--layout-features=*', '--no-hinting', '--desubroutinize', *extra], check=True)
    print(out, os.path.getsize(os.path.join(OUT, out)) // 1024, 'KB')
sub(NOTO_REG, 'noto-sans-sc-400.woff2', ['--font-number=2', f'--text={text}'])
sub(NOTO_BOLD, 'noto-sans-sc-700.woff2', ['--font-number=2', f'--text={text}'])
latin = 'U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026,U+2190-2193,U+25B6,U+25C0,U+00D7'
sub(NUNITO, 'nunito.woff2', [f'--unicodes={latin}'])
sub(FREDOKA, 'fredoka.woff2', [f'--unicodes={latin}'])
print(len(han), 'CJK characters')
