from pathlib import Path
from PIL import Image
import numpy as np
import json

folder = Path(__file__).resolve().parent
source = Image.open(folder / "rabbit-polished-source.png").convert("RGBA")
# The generated subjects have unequal transparent vertical gutters; split only
# those gutters, then place every untouched, uniformly scaled subject in a cell.
rows = [0, 362, 695, 1086]
column_width = 362
scale = 0.62
cell_size = 256
feet_baseline = 220
rear_body_left = 38
atlas = Image.new("RGBA", (cell_size * 4, cell_size * 3), (0, 0, 0, 0))
registration = []
frames = []

for index in range(12):
    row, column = divmod(index, 4)
    crop_box = (column * column_width, rows[row], (column + 1) * column_width, rows[row + 1])
    frame = source.crop(crop_box)
    alpha = np.asarray(frame)[:, :, 3]
    solid_y, solid_x = np.where(alpha > 240)
    body_left = int(solid_x.min())
    # Grazing leaves occur only at the right of the muzzle; use the paw region.
    paw_y = int(np.where(alpha[:, :230] > 240)[0].max())
    resized = frame.resize((round(frame.width * scale), round(frame.height * scale)), Image.Resampling.LANCZOS)
    offset_x = rear_body_left - round(body_left * scale)
    offset_y = feet_baseline - round(paw_y * scale)
    registered = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
    registered.alpha_composite(resized, (offset_x, offset_y))
    # Correct only the integer placement after resampling, preserving every alpha value.
    registered_alpha = np.asarray(registered)[:, :, 3]
    registered_paw_y = int(np.where(registered_alpha[:, :rear_body_left + round((230 - body_left) * scale)] > 240)[0].max())
    correction = feet_baseline - registered_paw_y
    if correction:
        registered = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
        registered.alpha_composite(resized, (offset_x, offset_y + correction))
    atlas.alpha_composite(registered, (column * cell_size, row * cell_size))
    frames.append(registered)
    registration.append({
        "frame": index, "source_crop": crop_box, "common_scale": scale,
        "offset": [offset_x, offset_y + correction], "feet_baseline": feet_baseline
    })

atlas.save(folder / "rabbit-polished.webp", "WEBP", lossless=True, method=6)
atlas.save(folder / "rabbit-polished.png")
preview = Image.new("RGBA", atlas.size, (46, 55, 43, 255))
preview.alpha_composite(atlas)
preview.convert("RGB").save(folder / "rabbit-polished-preview.jpg", quality=94)
metadata = {
    "source_dimensions": list(source.size), "atlas_dimensions": list(atlas.size),
    "columns": 4, "rows": 3, "cell_count": 12, "cell_dimensions": [256, 256],
    "feet_baseline_y": 220, "alpha_preserved": True,
    "processing": "Crop source gutters, common uniform Lanczos resize, per-frame integer translation, lossless WebP encode. No recoloring or alpha masking.",
    "registration": registration
}
(folder / "rabbit-polished-registration.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")
# A slow inspection loop for review only: feeding, lifting, steady look, then reverse.
sequence = frames + [frames[-1]] * 4 + frames[-2::-1]
sequence[0].save(folder / "rabbit-polished-preview.gif", save_all=True, append_images=sequence[1:], duration=180, loop=0, disposal=2)
print(json.dumps({key: value for key, value in metadata.items() if key != "registration"}))
print("bytes", (folder / "rabbit-polished.webp").stat().st_size)

