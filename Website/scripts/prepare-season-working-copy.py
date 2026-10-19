"""Strip authoring-only references from an uncompressed WORKING copy.

Uses Blender's Asset Tracer DNA reader. Compressed downloaded originals are untouched.
This avoids loading millions of Geo-Scatter UI/property blocks just to export meshes.
"""
from pathlib import Path
import sys
from blender_asset_tracer import blendfile

root = Path(__file__).resolve().parents[2] / 'Assets and working files/seasons'
season = sys.argv[1]
path = root / 'sources' / (season + '.raw.blend')
with blendfile.BlendFile(path, mode='r+b') as source:
    def clear_pointer(block, field_path):
        try:
            field, offset = block.dna_type.field_from_path(source.header.pointer_size, field_path)
            source.fileobj.seek(block.file_offset + offset)
            source.fileobj.write(b'\x00' * source.header.pointer_size)
        except KeyError: pass
    for code in [b'OB', b'ME', b'MA', b'WO', b'SC', b'CO', b'NT', b'IM']:
        for block in source.code_index[code]:
            clear_pointer(block, (b'id', b'properties'))
            clear_pointer(block, b'adt')
            if code == b'OB':
                clear_pointer(block, (b'modifiers', b'first'))
                clear_pointer(block, (b'modifiers', b'last'))
                clear_pointer(block, (b'particlesystem', b'first'))
                clear_pointer(block, (b'particlesystem', b'last'))
    print('Prepared isolated authoring-free working copy', season, flush=True)
