from pathlib import Path
from PIL import Image
import shutil

base = Path(__file__).resolve().parent
source = Path(r'C:\Users\Shyam\.codex\generated_images\01a101e8-e846-7f11-803f-b5c1d1bafa39\exec-619a85b1-e666-4784-95f6-3cf43663dda1.png')
saved = base / 'grounding-bank-source.png'
shutil.copy2(source, saved)
image = Image.open(saved).convert('RGBA')
assert image.getchannel('A').getextrema() == (0, 255), 'Grounding strip must have true alpha'
image = image.resize((1200, round(image.height * 1200 / image.width)), Image.Resampling.LANCZOS)
target = base.parents[1] / 'Website/public/scene/layers/grounding-bank.webp'
image.save(target, quality=86, method=6)
print(target, image.size, target.stat().st_size, 'bytes, alpha', image.getchannel('A').getextrema())
