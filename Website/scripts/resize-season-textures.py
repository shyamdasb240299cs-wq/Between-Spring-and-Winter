"""Offline texture conversion: preserve authored color/opacity, bound texture memory."""
from pathlib import Path
import json, sys
from PIL import Image, ImageOps

jobs = json.loads(Path(sys.argv[1]).read_text())
for job in jobs:
    try:
        with Image.open(job['source']) as source:
            image = source.convert('RGBA')
            image.thumbnail((1024, 1024), Image.Resampling.LANCZOS)
            if job.get('tint'):
                alpha=image.getchannel('A')
                colors=((65,14,6),(255,177,77)) if job['tint']=='autumn' else ((111,35,67),(255,209,228))
                image=ImageOps.colorize(ImageOps.grayscale(image),colors[0],colors[1]).convert('RGBA')
                image.putalpha(alpha)
            if job.get('opacity'):
                with Image.open(job['opacity']) as opacity:
                    alpha = ImageOps.grayscale(opacity).resize(image.size, Image.Resampling.LANCZOS)
                    image.putalpha(alpha)
            alpha = image.getchannel('A').getextrema()[0] < 250
            image.save(job['target'], format='PNG', optimize=True)
            job['alpha'] = alpha
            job['width'], job['height'] = image.size
    except Exception as error:
        job['error'] = str(error)
Path(sys.argv[1]).write_text(json.dumps(jobs, indent=2))
