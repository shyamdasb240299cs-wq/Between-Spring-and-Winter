from pathlib import Path
from PIL import Image
import shutil, json
from collections import deque

def figure_box(alpha):
    # Reject neighboring cells' detached shadow strips while retaining fur.
    small = alpha.resize((max(1,alpha.width//4), max(1,alpha.height//4)), Image.Resampling.BOX)
    pixels = list(small.getdata())
    width, height = small.size
    seen, largest = set(), []
    for origin, value in enumerate(pixels):
        if value < 32 or origin in seen:
            continue
        queue, component = deque([origin]), []
        seen.add(origin)
        while queue:
            item = queue.popleft()
            component.append(item)
            x,y = item % width,item // width
            for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]:
                nx,ny = x+dx,y+dy
                nxt = ny*width+nx
                if 0 <= nx < width and 0 <= ny < height and nxt not in seen and pixels[nxt] >= 32:
                    seen.add(nxt)
                    queue.append(nxt)
        if len(component) > len(largest):
            largest = component
    assert largest
    xs = [p % width for p in largest]; ys = [p // width for p in largest]
    sx,sy = alpha.width/width,alpha.height/height
    return (max(0,int(min(xs)*sx)-2),max(0,int(min(ys)*sy)-2),min(alpha.width,int((max(xs)+1)*sx)+2),min(alpha.height,int((max(ys)+1)*sy)+2))

base = Path(__file__).resolve().parent
generated = Path(r'C:\Users\Shyam\.codex\generated_images\01a107ee-7cf6-7710-a020-02271bdcdd3c')
dest = base.parents[1] / 'Website/public/scene/layers'
sources = {
    'background-shrine': generated / 'exec-666e4bf5-cd5a-4850-a014-29fab0943016.png',
    'forest-foreground': generated / 'exec-9be5a99f-e3cc-4182-839b-a637eeab7f83.png',
    'panda-sheet': generated / 'exec-1d74107d-ac36-49f9-a2ae-ab8097ba03fe.png',
}
metadata = {}
for name, source in sources.items():
    target = base / (name + '-source.png')
    shutil.copy2(source, target)
    im = Image.open(target)
    metadata[name] = {'source': target.name, 'size': im.size}
    if name == 'background-shrine':
        for width, suffix, quality in [(1920, '', 85), (960, '-small', 81)]:
            out = im.convert('RGB').resize((width, width * 2), Image.Resampling.LANCZOS)
            path = dest / ('continuous-shrine' + suffix + '.webp')
            out.save(path, quality=quality, method=6)
            print(path.name, out.size, path.stat().st_size)
    elif name == 'forest-foreground':
        im = im.convert('RGBA')
        assert im.getchannel('A').getextrema() == (0, 255)
        out = im.resize((1600, 1600), Image.Resampling.LANCZOS)
        path = dest / 'forest-foreground.webp'
        out.save(path, quality=86, method=6)
        print(path.name, out.size, path.stat().st_size)

# Technical atlas registration: crop each generated figure, retain its alpha,
# and align feet. The running figures have wider source gutters than row one.
im = Image.open(base / 'panda-sheet-source.png').convert('RGBA')
w, h = im.size
rows = [0, round(h / 3), round(2 * h / 3), h]
cuts = [[0, .253, .506, .756, 1], [0, .255, .507, .748, 1], [0, .294, .524, .750, 1]]
frames = []
for row in range(3):
    for col in range(4):
        bounds = (round(cuts[row][col] * w), rows[row], round(cuts[row][col + 1] * w), rows[row + 1])
        cell = im.crop(bounds)
        alpha = cell.getchannel('A')
        box = figure_box(alpha)
        assert box, f'empty panda cell {row * 4 + col}'
        # Include fur antialiasing without carrying distant transparent noise.
        x0, y0, x1, y1 = box
        box = (max(0,x0-2),max(0,y0-2),min(cell.width,x1+2),min(cell.height,y1+2))
        frames.append(cell.crop(box))

# One shared source scale preserves the panda's physical size through poses.
factor = min(214 / max(f.width for f in frames), 205 / max(f.height for f in frames))
atlas = Image.new('RGBA', (1024, 768))
registered = []
for index, frame in enumerate(frames):
    frame = frame.resize((round(frame.width * factor), round(frame.height * factor)), Image.Resampling.LANCZOS)
    x = (256 - frame.width) // 2
    y = 220 - frame.height
    atlas.alpha_composite(frame, ((index % 4) * 256 + x, (index // 4) * 256 + y))
    registered.append({'index': index, 'size': frame.size, 'feet_y': 220, 'offset': [x,y]})
atlas.save(dest / 'panda-sprite.webp', quality=90, method=6)
atlas.save(base / 'panda-registered.png')
metadata['panda-sheet'].update({'atlas': [1024,768], 'cell': [256,256], 'feet': 220/256, 'frames': registered})
(base / 'asset-metadata.json').write_text(json.dumps(metadata, indent=2), encoding='utf-8')
print('panda-sprite.webp', atlas.size, (dest / 'panda-sprite.webp').stat().st_size)
