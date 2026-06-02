import shutil
from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / "src" / "assets"
public = root / "public"
logo = assets / "logo.png"
icon_png = assets / "logo-icon.png"

im = Image.open(logo)
w, h = im.size
crop = im.crop((0, 0, w, int(h * 0.58)))
crop.save(icon_png)

cw, ch = crop.size
svg = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {cw} {ch}" role="img" aria-label="Eagle Rise">
  <image width="{cw}" height="{ch}" xlink:href="logo-icon.png"/>
</svg>
"""
svg_public = f"""<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 {cw} {ch}" role="img" aria-label="Eagle Rise">
  <image width="{cw}" height="{ch}" xlink:href="/favicon.png"/>
</svg>
"""

(assets / "vite.svg").write_text(svg, encoding="utf-8")
(public / "favicon.svg").write_text(svg_public, encoding="utf-8")
shutil.copy2(icon_png, public / "favicon.png")
shutil.copy2(icon_png, public / "logo-icon.png")
print("OK", cw, ch)
