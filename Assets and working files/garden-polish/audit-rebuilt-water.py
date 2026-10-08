"""Render technical water-mask guides over the new art; never modifies artwork."""
from pathlib import Path
from PIL import Image,ImageDraw
import json
base=Path(__file__).parent
plan=json.loads((base.parent/'waterfall-redesign/water-alignment-paths.json').read_text())['foreground']
art=Image.open(base/'foreground-burned-out-source.png').convert('RGBA')
overlay=Image.new('RGBA',art.size)
draw=ImageDraw.Draw(overlay)
for points in plan['paths'].values():
    draw.polygon([tuple(p) for p in points],fill=(30,210,240,50),outline=(30,240,255,200))
Image.alpha_composite(art,overlay).crop((590,600,970,1110)).resize((760,1020)).save(base/'rebuilt-water-mask-audit.png')
print('Saved technical registration audit for all seven foreground curtains.')
