"""Preserve the authored blossom silhouette when alpha textures are minified."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]/'public/void/textures/jagobo'
source=Image.open(root/'foliage-map.webp').convert('RGBA')
threshold=97
coverage=sum(a>=threshold for a in source.getchannel('A').getdata())/(source.width*source.height)
level=1
while source.width//(2**level)>=1:
    size=max(1,source.width//(2**level))
    image=source.resize((size,size),Image.Resampling.LANCZOS)
    alpha=image.getchannel('A');values=list(alpha.getdata());lo,hi=.25,8
    target=round(coverage*size*size)
    for _ in range(18):
        scale=(lo+hi)/2
        if sum(min(255,a*scale)>=threshold for a in values)<target:lo=scale
        else:hi=scale
    image.putalpha(alpha.point(lambda a:min(255,round(a*hi))))
    image.save(root/f'foliage-mip-{level}.webp',lossless=True)
    print('blossom mip',level,size,'alpha scale',round(hi,3))
    level+=1
