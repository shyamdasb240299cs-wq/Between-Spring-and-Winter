from collections import deque
from pathlib import Path
import json
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GENERATED = Path(r'C:\Users\Shyam\.codex\generated_images\01a110bc-77b8-76c2-9e8a-89aed85dad09\exec-609fd237-e784-4443-b8e2-348b118ce023.png')
SOURCE = ROOT / 'panda-run-polished-source.png'
shutil.copy2(GENERATED, SOURCE)
im = Image.open(SOURCE).convert('RGBA')
alpha = np.array(im.getchannel('A'))
mask = alpha > 16
h, w = mask.shape
seen = np.zeros(mask.shape, dtype=bool)
labels = np.zeros(mask.shape, dtype=np.int32)
components = []
component_id = 0
for y0, x0 in zip(*np.where(mask)):
    if seen[y0, x0]:
        continue
    queue = deque([(int(y0), int(x0))])
    component_id += 1
    seen[y0, x0] = True
    count = 0
    xmin = xmax = int(x0)
    ymin = ymax = int(y0)
    while queue:
        y, x = queue.popleft()
        labels[y, x] = component_id
        count += 1
        xmin, xmax = min(xmin, x), max(xmax, x)
        ymin, ymax = min(ymin, y), max(ymax, y)
        for yy, xx in ((y-1, x), (y+1, x), (y, x-1), (y, x+1)):
            if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True
                queue.append((yy, xx))
    if count > 1000:
        components.append({'id': component_id, 'area': count, 'bbox': (xmin, ymin, xmax+1, ymax+1)})

if len(components) != 8:
    raise ValueError(f'Expected 8 isolated pandas, found {len(components)}')
components.sort(key=lambda c: (int((c['bbox'][1]+c['bbox'][3])/2 > h/2), c['bbox'][0]))
max_width = max(c['bbox'][2] - c['bbox'][0] for c in components)
scale = 211 / max_width
sheet = Image.new('RGBA', (1024, 512), (0, 0, 0, 0))
records = []
for i, c in enumerate(components):
    # Include the source's feathered alpha around each substantial component.
    x0, y0, x1, y1 = c['bbox']
    crop_bbox = (max(0, x0-3), max(0, y0-3), min(w, x1+3), min(h, y1+3))
    crop = im.crop(crop_bbox)
    # Neighbouring source sprites nearly touch; exclude their substantial pixels.
    cx0, cy0, cx1, cy1 = crop_bbox
    crop_pixels = np.array(crop)
    other_component = (alpha[cy0:cy1, cx0:cx1] > 16) & (labels[cy0:cy1, cx0:cx1] != c['id'])
    crop_pixels[other_component, 3] = 0
    crop = Image.fromarray(crop_pixels)
    size = (round(crop.width*scale), round(crop.height*scale))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    significant = crop.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    if significant is None:
        raise ValueError('Empty frame')
    # Center shared-scale silhouettes; the low aerial phase floats above ground.
    left = round(128 - (significant[0]+significant[2])/2)
    vertical_lift = 23 if i == 6 else 0
    top = 220 - significant[3] - vertical_lift
    cell = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    cell.alpha_composite(crop, (left, top))
    sheet.alpha_composite(cell, ((i%4)*256, (i//4)*256))
    bbox = cell.getchannel('A').point(lambda a: 255 if a > 16 else 0).getbbox()
    records.append({'frame': i, 'source_component_bbox': c['bbox'], 'source_crop_bbox': crop_bbox, 'registered_bbox_alpha_gt_16': bbox, 'silhouette_size': (bbox[2]-bbox[0], bbox[3]-bbox[1]), 'ground_baseline': 220, 'vertical_lift': vertical_lift})

sheet.save(ROOT/'panda-run-polished.png')
sheet.save(ROOT/'panda-run-polished.webp', lossless=True, method=6, exact=True)
report = {'source_size': im.size, 'output_size': sheet.size, 'cell_size': 256, 'columns': 4, 'rows': 2, 'frames': 8, 'frame_order': 'left to right, top row then bottom row', 'shared_scale': scale, 'feet_baseline': 220, 'alpha': 'source alpha preserved through Lanczos resampling and lossless WebP', 'reference_max_width': 211, 'records': records}
(ROOT/'panda-run-polished-registration.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
