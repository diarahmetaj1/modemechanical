# Usage: python3 scripts/normalize-logos.py public/images/brands [preview.png]
# Reads the downloaded logos (npm run assets) and writes <brand>-logo.webp next to them.
# Normalizes the brand logos: trim to the visible mark, then scale each to the same visual area
# (with a small optical correction for very heavy or very light marks) on a 360x144 transparent canvas.
from PIL import Image
import math, sys
root = sys.argv[1]
src = {'trane': ('trane.webp', 1.12), 'daikin': ('daikin.webp', 1.0), 'mitsubishi-electric': ('mitsubishi-electric.png', 1.0),
       'fujitsu': ('fujitsu.png', 0.92), 'carrier': ('brand-unlabeled-1.webp', 1.0), 'lg': ('lg.png', 0.97), 'york': ('york.png', 0.78)}
CW, CH = 360, 144; AREA = 150 * 150; MAXW, MAXH = 330, 110
out = []
for slug, (f, k) in src.items():
    im = Image.open(f'{root}/{f}').convert('RGBA')
    mask = Image.new('L', im.size, 0); mp = mask.load(); px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a > 40 and not (r > 235 and g > 235 and b > 235): mp[x, y] = 255
    im = im.crop(mask.getbbox()); cp = im.load()
    for y in range(im.height):
        for x in range(im.width):
            if cp[x, y][3] <= 40: cp[x, y] = (0, 0, 0, 0)
    cw, ch = im.size; ar = cw / ch; tw = math.sqrt(AREA * ar) * k; th = tw / ar
    s = min(tw / cw, th / ch, MAXW / cw, MAXH / ch)
    nw, nh = round(cw * s), round(ch * s)
    im = im.resize((nw, nh), Image.LANCZOS)
    canvas = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); canvas.alpha_composite(im, ((CW - nw) // 2, (CH - nh) // 2))
    canvas.save(f'{root}/{slug}-logo.webp', 'WEBP', quality=92, method=6)
    out.append(canvas); print(slug, (nw, nh))
if len(sys.argv) > 2:
    sheet = Image.new('RGBA', (CW * 4 + 50, CH * 2 + 30), (246, 248, 251, 255))
    for i, c in enumerate(out): sheet.alpha_composite(c, ((i % 4) * (CW + 10) + 5, (i // 4) * (CH + 10) + 5))
    sheet.convert('RGB').save(sys.argv[2])
