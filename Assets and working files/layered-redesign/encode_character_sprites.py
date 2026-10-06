from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np
from collections import deque
import json, shutil

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "Website" / "public" / "scene" / "layers"
SOURCE = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)
ASSETS = [
    dict(name="rabbit", source=Path("C:/Users/Shyam/.codex/generated_images/01a101e9-d07a-7a00-9903-608937902178/exec-9ea008d1-2386-487c-b2c6-0219b4b3c8f7.png"), frames=8, columns=4, cell=(256,384), scale=.63, baseline=345, quality=90),
    dict(name="crane", source=Path("C:/Users/Shyam/.codex/generated_images/01a101e9-d07a-7a00-9903-608937902178/exec-13029130-fb26-47b5-b320-b09e6717cc7a.png"), frames=6, columns=3, cell=(384,384), scale=.66, baseline=None, quality=88),
]

def components(alpha):
    mask = alpha > 128
    labels = np.zeros(mask.shape, dtype=np.int32)
    result = []
    index = 0
    h,w = mask.shape
    for y,x in np.argwhere(mask):
        y,x = int(y),int(x)
        if labels[y,x]: continue
        index += 1
        queue = deque([(y,x)])
        labels[y,x] = index
        count = 0
        x0,y0,x1,y1 = x,y,x,y
        while queue:
            cy,cx = queue.popleft()
            count += 1
            x0,y0 = min(x0,cx),min(y0,cy)
            x1,y1 = max(x1,cx),max(y1,cy)
            for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
                if 0<=ny<h and 0<=nx<w and mask[ny,nx] and not labels[ny,nx]:
                    labels[ny,nx]=index
                    queue.append((ny,nx))
        if count>1000: result.append(dict(id=index,count=count,bbox=(x0,y0,x1+1,y1+1)))
    return labels,result

report={}
for asset in ASSETS:
    name=asset["name"]
    original=Image.open(asset["source"]).convert("RGBA")
    shutil.copy2(asset["source"],SOURCE/f"{name}-sprite-source.png")
    rgba=np.asarray(original)
    labels,comps=components(rgba[:,:,3])
    selected=sorted(comps,key=lambda c:c["count"],reverse=True)[:asset["frames"]]
    selected.sort(key=lambda c:(int((c["bbox"][1]+c["bbox"][3])/2>=original.height/2),c["bbox"][0]))
    cell_w,cell_h=asset["cell"]
    sheet=Image.new("RGBA",(cell_w*asset["frames"],cell_h),(0,0,0,0))
    bounds=[]
    source_bounds=[]
    for i,comp in enumerate(selected):
        # Separate already-generated atlas sprites using their real alpha,
        # preserving the original RGBA around the animal and its soft edges.
        source_bounds.append(comp["bbox"])
        mask=Image.fromarray(np.uint8(labels==comp["id"])*255).filter(ImageFilter.MaxFilter(41))
        keep=np.asarray(mask)>0
        pixels=rgba.copy()
        pixels[:,:,3]=np.where(keep,rgba[:,:,3],0)
        sprite=Image.fromarray(pixels,"RGBA")
        crop_box=sprite.getchannel("A").point(lambda a:255 if a>10 else 0).getbbox()
        sprite=sprite.crop(crop_box)
        sprite=sprite.resize((round(sprite.width*asset["scale"]),round(sprite.height*asset["scale"])),Image.Resampling.LANCZOS)
        x=i*cell_w+(cell_w-sprite.width)//2
        if name=="rabbit":
            y=asset["baseline"]-sprite.height
        else:
            row=i//asset["columns"]
            head_y=303 if row==0 else 718
            y=196-round((head_y-crop_box[1])*asset["scale"])
        sheet.alpha_composite(sprite,(x,y))
        frame=sheet.crop((i*cell_w,0,(i+1)*cell_w,cell_h))
        bounds.append(frame.getchannel("A").point(lambda a:255 if a>50 else 0).getbbox())
    path=OUT/f"{name}-sprite.webp"
    sheet.save(path,"WEBP",quality=asset["quality"],method=6,exact=True)
    encoded=Image.open(path)
    preview=Image.new("RGBA",encoded.size,(37,54,44,255))
    preview.alpha_composite(encoded.convert("RGBA"))
    preview.convert("RGB").save(SOURCE/f"{name}-sprite-qa.jpg",quality=94)
    report[name]=dict(path=str(path),frames=asset["frames"],dimensions=encoded.size,cell=asset["cell"],alpha_range=encoded.getchannel("A").getextrema(),bytes=path.stat().st_size,frame_visible_bounds_alpha_gt_50=bounds,source_sprite_bounds_alpha_gt_128=source_bounds,notes="All coordinates are x0,y0,x1,y1. Static sprite sheet with preserved actual alpha. QA preview composites onto moss green because raw image viewers may display hidden RGB matte colors.")
(SOURCE/"character-asset-metadata.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
