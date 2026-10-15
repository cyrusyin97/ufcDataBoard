import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from common import read_json


def generate(cache_root, mapping_path, output):
    cache = Path(cache_root)
    receipt = read_json(cache / 'receipt.json')
    names = {row['fighterId']: row['observations']['name'] for row in read_json(mapping_path)['mappings']}
    output = Path(output);output.mkdir(parents=True, exist_ok=True)
    for role, height in [('full_body', 440), ('half_body', 250), ('headshot', 160)]:
        entries = [(key, value) for key, value in receipt['assets'].items() if key.endswith(':' + role)]
        if not entries: continue
        columns = 8;rows = (len(entries) + columns - 1) // columns
        canvas = Image.new('RGB', (columns * 170, rows * (height + 45)), (28, 28, 29));draw = ImageDraw.Draw(canvas)
        for i, (key, asset) in enumerate(entries):
            with Image.open(cache / asset['file']) as image:
                image = image.convert('RGBA');image.thumbnail((160, height));x = i % columns * 170 + (170 - image.width) // 2;y = i // columns * (height + 45)
                canvas.paste(image, (x, y), image)
                draw.text((i % columns * 170 + 4, y + height + 4), names.get(key.split(':')[0], key)[:24], fill='white', font=ImageFont.load_default())
        canvas.save(output / (role + '-review.png'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default='work/media')
    parser.add_argument('--config', default='data/config/initial.json')
    parser.add_argument('--output', default='work/media-review')
    args = parser.parse_args();generate(args.cache, args.config, args.output)
