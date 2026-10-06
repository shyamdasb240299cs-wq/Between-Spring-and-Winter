from pathlib import Path
from PIL import Image
import json, shutil

base = Path(__file__).resolve().parent
destination = base.parents[1] / 'Website' / 'public' / 'scene' / 'layers'
destination.mkdir(parents=True, exist_ok=True)
spec = json.loads((base / 'scenery-prompts.json').read_text(encoding='utf-8'))
for name, item in spec.items():
    source = Path(item['source'])
    shutil.copy2(source, base / (name + '-source.png'))
    im = Image.open(source)
    if name in ('sunset', 'valley', 'forest', 'continuous-world'):
        im = im.convert('RGB')
        for width, suffix, quality in [(1920, '', 84), (960, '-small', 80)]:
            height = round(im.height * width / im.width)
            resized = im.resize((width, height), Image.Resampling.LANCZOS)
            target = destination / (name + suffix + '.webp')
            resized.save(target, quality=quality, method=6)
            print(name + suffix, resized.size, target.stat().st_size)
    else:
        im = im.convert('RGBA')
        max_width = {'house':1000, 'torii':600, 'canopy':1440}[name]
        if im.width > max_width:
            im = im.resize((max_width, round(im.height * max_width / im.width)), Image.Resampling.LANCZOS)
        target = destination / (name + '.webp')
        im.save(target, quality=86, method=6)
        print(name, im.size, target.stat().st_size, 'alpha', im.getchannel('A').getextrema())
