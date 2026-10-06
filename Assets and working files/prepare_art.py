from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json, re

source = Path(r'C:/Users/Shyam/Desktop/apps/Between Spring and Winter')
public = Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20/work/manga-site/public/manga')
public.mkdir(parents=True, exist_ok=True)

def export(src, name, width=1400):
    image = Image.open(src).convert('RGB')
    image.thumbnail((width, int(width * 1.6)), Image.Resampling.LANCZOS)
    image.save(public / (name + '.webp'), quality=90, method=6)
    return '/manga/' + name + '.webp'

export(source / 'Cover/Cover-Front.png', 'cover-front', 1500)
export(source / 'Cover/Cover-Back.png', 'cover-back', 1500)
for face in ['Front','Back']:
    image = Image.open(source / f'Cover/Cover-{face}.png').convert('RGB')
    image.thumbnail((1200,1800), Image.Resampling.LANCZOS)
    image.save(public / f'model-{face.lower()}.jpg', quality=94)

chapters = []
for number, season, divider in [(1,'Spring','17,18,p1/Part 1.png'),(2,'Summer','Part-2.png'),(3,'Autumn','Part-3.png'),(4,'Winter','Part-4.png')]:
    folder = source / f'Part{number}'
    export(folder / divider, f'part-{number}', 1000)
    files = {}
    for f in folder.rglob('*.png'):
        match = re.fullmatch(r'(\d+)(-new)?', f.stem)
        if match:
            page = int(match[1])
            if page not in files or match[2]: files[page] = f
    pages = [{'number':page,'src':export(f,f'page-{page:03}',1700)} for page, f in sorted(files.items())]
    chapters.append({'id': number, 'title': season, 'cover': f'/manga/part-{number}.webp', 'pages': pages})

(public / 'chapters.json').write_text(json.dumps(chapters,indent=2))
data = Path(r'C:/Users/Shyam/Documents/Codex/2026-10-01/so-x20/work/manga-site/app/manga-data.ts')
data.write_text('export const chapters = ' + json.dumps(chapters,indent=2) + ' as const;\n')
print(json.dumps({'chapters':[{ 'season':c['title'],'pages':len(c['pages'])} for c in chapters], 'bytes':sum(f.stat().st_size for f in public.iterdir())}))
