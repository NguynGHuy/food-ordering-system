"""Convert explicitly generated demo assets; never overwrite an existing file.

Usage: python scripts/demo-images/prepare.py .build-check/demo-image-sources.json
The private input contains source PNG paths. It must not be committed.
"""
import hashlib
import io
import json
import re
import sys
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
WEBROOT = ROOT / "DatMonAnOnline.API/wwwroot"
MANIFEST = Path(__file__).with_name("manifest.json")
sources = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
old = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else []
entries = {entry["path"]: entry for entry in old}
for entry in sources:
    url = entry["path"]
    if not re.fullmatch(r"/uploads/(restaurants|foods)/demo-v1-[0-9]+-[a-z0-9-]+\.webp", url):
        raise ValueError("Unexpected output path")
    target = WEBROOT / url.lstrip("/")
    size = (1280, 720) if entry["kind"] == "restaurants" else (800, 600)
    if target.exists():
        prior = entries.get(url)
        if prior is None or hashlib.sha256(target.read_bytes()).hexdigest() != prior["sha256"]:
            raise ValueError(f"Refusing to overwrite existing asset: {url}")
        continue
    with Image.open(entry["source"]) as source:
        source.load()
        result = ImageOps.fit(ImageOps.exif_transpose(source).convert("RGB"), size, Image.Resampling.LANCZOS)
        buffer = io.BytesIO()
        result.save(buffer, format="WEBP", quality=82, method=6)
    content = buffer.getvalue()
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("xb") as output:
        output.write(content)
    entries[url] = {
        "kind": entry["kind"], "id": entry["id"], "name": entry["name"],
        "path": url, "origin": "AI generated with the built-in imagegen tool for this demo",
        "prompt": entry.get("prompt", entry["description"]),
        "width": size[0], "height": size[1], "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }
    # Checkpoint after every asset so interruption cannot produce an untracked overwrite.
    MANIFEST.write_text(json.dumps(list(entries.values()), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"assets": len(entries), "bytes": sum(x["bytes"] for x in entries.values())}))
