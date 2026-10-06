from pathlib import Path
import json
import numpy as np
from PIL import Image

folder = Path(__file__).resolve().parent
source = Image.open(folder / 'panda-encounter-source.png').convert('RGBA')
assert source.size == (1254, 1254), source.size
rows = [0, 334, 632, 924, 1254]
columns = [0, 313, 627, 940, 1254]
scale = .65
atlas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
records = []
frames = []
for index in range(16):
    row, column = divmod(index, 4)
    crop_box = (columns[column], rows[row], columns[column + 1], rows[row + 1])
    crop = source.crop(crop_box)
    pixels = np.asarray(crop)
    ys, xs = np.where(pixels[:, :, 3] > 240)
    left, right, foot = int(xs.min()), int(xs.max()), int(ys.max())
    resized = crop.resize((round(crop.width * scale), round(crop.height * scale)), Image.Resampling.LANCZOS)
    offset_x = round(128 - (left + right) * scale / 2)
    offset_y = 220 - round(foot * scale)
    cell = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    cell.alpha_composite(resized, (offset_x, offset_y))
    atlas.alpha_composite(cell, (column * 256, row * 256))
    frames.append(cell)
    records.append({'frame': index, 'source_crop': crop_box, 'common_scale': scale, 'offset': [offset_x, offset_y], 'source_feet': foot, 'alpha_bounds': cell.getchannel('A').getbbox()})
atlas.save(folder / 'panda-encounter.png')
atlas.save(folder / 'panda-encounter.webp', 'WEBP', lossless=True, exact=True, method=6)
runtime = folder.parents[1] / 'Website/public/scene/layers/panda-encounter.webp'
atlas.save(runtime, 'WEBP', quality=90, exact=True, method=6)
metadata = {'mode': 'built-in imagegen', 'source': 'panda-encounter-source.png', 'prompt': 'panda-encounter-prompt.txt', 'source_size': list(source.size), 'output_size': list(atlas.size), 'grid': [4,4], 'cell': [256,256], 'feet_baseline': 220, 'processing': 'Crop transparent gutters, common-scale Lanczos resize, per-cell translation, WebP encode. No repainting or recoloring.', 'registration': records}
(folder / 'panda-encounter-registration.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
preview = Image.new('RGBA', atlas.size, '#29362e')
preview.alpha_composite(atlas)
preview.convert('RGB').save(folder / 'panda-encounter-preview.jpg', quality=94)
run_source = Image.open(folder.parent / 'final-polish/panda-run-polished.png').convert('RGBA')
run_atlas = Image.new('RGBA', run_source.size, (0,0,0,0))
run_scale = .93
for index in range(8):
    column, row = index % 4, index // 4
    cell = run_source.crop((column*256,row*256,(column+1)*256,(row+1)*256))
    cell = cell.resize((238,238), Image.Resampling.LANCZOS)
    registered = Image.new('RGBA',(256,256),(0,0,0,0))
    registered.alpha_composite(cell,(9,15))
    run_atlas.alpha_composite(registered,(column*256,row*256))
run_atlas.save(folder / 'panda-run-refined.png')
run_atlas.save(folder / 'panda-run-refined.webp','WEBP',lossless=True,exact=True,method=6)
run_runtime = runtime.with_name('panda-run-refined.webp')
run_atlas.save(run_runtime,'WEBP',quality=90,exact=True,method=6)
(folder / 'panda-run-refined-registration.json').write_text(json.dumps({'source':'../final-polish/panda-run-polished.png','common_scale':run_scale,'cell_resize':[238,238],'offset':[9,15],'feet_baseline':220,'processing':'Common technical resampling of the established run frames to match the new encounter silhouette; no repainting.'},indent=2),encoding='utf-8')
print(json.dumps({'frames':16, 'source':list(source.size), 'runtime':str(runtime), 'bytes':runtime.stat().st_size}))
