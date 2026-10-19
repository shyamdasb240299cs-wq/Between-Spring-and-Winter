"""Stream Zstandard .blend sources to disk so Blender can memory-map them."""
from pathlib import Path
import zstandard

root = Path(__file__).resolve().parents[2] / 'Assets and working files/seasons/sources'
for season in ['winter', 'summer', 'spring', 'autumn']:
    source = root / f'{season}.blend'
    target = root / f'{season}.raw.blend'
    if target.exists():
        continue
    partial=target.with_suffix('.partial')
    with source.open('rb') as compressed, partial.open('wb') as output:
        zstandard.ZstdDecompressor().copy_stream(compressed, output)
    partial.replace(target)
    print(season, target.stat().st_size, flush=True)
