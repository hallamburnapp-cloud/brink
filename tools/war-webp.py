#!/usr/bin/env python3
"""Convert the war-room screenshots and art frames (docs/war/screens, docs/war/art) from PNG to WebP.

The PNGs are DPR 3 captures with film grain (1-4 MB each) and stay out of git (see .gitignore);
the WebP copies are what the repository keeps. Needs Pillow: pip install pillow.
usage: python3 tools/war-webp.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
for folder in ("docs/war/screens", "docs/war/art", "docs/thirty-days/screens"):
    for png in sorted((ROOT / folder).glob("*.png")):
        webp = png.with_suffix(".webp")
        if webp.exists() and webp.stat().st_mtime >= png.stat().st_mtime:
            continue
        Image.open(png).save(webp, "WEBP", quality=82, method=6)
        print(f"{png.relative_to(ROOT)} -> {webp.name} ({webp.stat().st_size // 1024} KB)")
