from pathlib import Path
from PIL import Image

source_dir = Path('/home/ubuntu/webdev-static-assets')
out_dir = source_dir / 'optimized-library-assets'
out_dir.mkdir(parents=True, exist_ok=True)

jobs = [
    ('arabic-leather-book-cover-texture.png', 'arabic-leather-book-cover-texture.webp', 1024, 78),
    ('walnut-shelf-texture.png', 'walnut-shelf-texture.webp', 1024, 78),
    ('library-mark.png', 'library-mark.webp', 512, 86),
]

for source_name, output_name, max_size, quality in jobs:
    source = source_dir / source_name
    if not source.exists():
        print(f'skip missing: {source}')
        continue
    image = Image.open(source)
    image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    if image.mode not in ('RGB', 'RGBA'):
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    output = out_dir / output_name
    image.save(output, 'WEBP', quality=quality, method=6)
    print(f'{source_name}: {Image.open(source).size} -> {image.size}, {output.stat().st_size} bytes')
