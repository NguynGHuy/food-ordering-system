"""Local review contact sheets only; final assets are not edited."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[2]
entries = json.loads((root / '.build-check/demo-image-sources.json').read_text(encoding='utf-8-sig'))
out = root / '.build-check/demo-image-review'
out.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 15)
for restaurant in [x for x in entries if x['kind'] == 'restaurants']:
    assets = [restaurant] + [x for x in entries if x.get('restaurantId') == restaurant['id']]
    sheet = Image.new('RGB', (1200, ((len(assets) + 3) // 4) * 255), 'white')
    draw = ImageDraw.Draw(sheet)
    for index, asset in enumerate(assets):
        left, top = (index % 4) * 300, (index // 4) * 255
        with Image.open(root / 'DatMonAnOnline.API/wwwroot' / asset['path'].lstrip('/')) as image:
            image.thumbnail((294, 215))
            sheet.paste(image, (left + (300 - image.width) // 2, top))
        draw.text((left + 4, top + 218), f"{asset['id']}: {asset['name']}", fill='black', font=font)
    sheet.save(out / f"restaurant-{restaurant['id']}.jpg", quality=90)
print('Contact sheets ready')
