"""Side-by-side before/after composite: compare_shots.py before.png after.png out.png "caption"."""
import sys
from PIL import Image, ImageDraw, ImageFont
b, a = Image.open(sys.argv[1]).convert('RGB'), Image.open(sys.argv[2]).convert('RGB')
H = 900
def fit(im): return im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
b, a = fit(b), fit(a)
pad, top = 24, 90
out = Image.new('RGB', (b.width + a.width + pad * 3, H + top + pad), (18, 20, 32))
out.paste(b, (pad, top)); out.paste(a, (pad * 2 + b.width, top))
d = ImageDraw.Draw(out)
try: f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 40)
except OSError: f = ImageFont.load_default()
d.text((pad, 24), 'BEFORE (2026-09-28)', fill=(255, 140, 140), font=f)
d.text((pad * 2 + b.width, 24), 'AFTER (2026-09-29) · ' + (sys.argv[4] if len(sys.argv) > 4 else ''), fill=(140, 255, 170), font=f)
out.save(sys.argv[3]); print('saved', sys.argv[3], out.size)
