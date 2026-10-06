from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

root=Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20/work/manga-site')
font=TTFont(root/'public/fonts/caveat.ttf');glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm
paths=[]
def line(text,size,y,color='#514c44'):
    scale=size/units;names=[cmap.get(ord(c),'space') for c in text]
    total=sum(glyphs[n].width for n in names)*scale;x=(1600-total)/2
    for name in names:
        pen=SVGPathPen(glyphs);glyphs[name].draw(pen);commands=pen.getCommands()
        if commands:paths.append(f'<path fill="{color}" d="{commands}" transform="translate({x:.3f},{y}) scale({scale:.5f},{-scale:.5f})"/>')
        x+=glyphs[name].width*scale
line('Between',165,840)
line('Spring and Winter',150,1008)
line('With love from Shyamu',94,1385)
line('for his Aami.',94,1500)
line('For all the days I dream of us.',63,1860,'#8e8274')
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="2400" viewBox="0 0 1600 2400"><rect width="1600" height="2400" fill="#f3eadb"/>'+''.join(paths)+'</svg>'
(root/'public/manga/title-letter.svg').write_text(svg,encoding='utf-8')
print('DEDICATION_READY',len(svg))
