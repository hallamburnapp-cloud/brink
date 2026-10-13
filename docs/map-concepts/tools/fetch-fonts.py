#!/usr/bin/env python3
"""Download Google Fonts (latin subset only) into a folder and write fonts.css that points at the local files.

usage: python3 fetch-fonts.py "<css2 family query>" <outdir>
e.g.   python3 fetch-fonts.py "family=Fraunces:opsz,wght@9..144,400;9..144,700&family=Inter+Tight:wght@400;600" ./fonts
Then in your HTML: <link rel="stylesheet" href="fonts/fonts.css">
"""
import os, re, sys, subprocess
q, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
url = "https://fonts.googleapis.com/css2?" + q + "&display=swap"
css = subprocess.run(["curl", "-sS", "-A", ua, url], capture_output=True, text=True, check=True).stdout
blocks = re.findall(r"/\* ([a-z\-]+) \*/\s*(@font-face\s*\{[^}]*\})", css)
keep = []
n = 0
for subset, block in blocks:
    if subset != "latin":
        continue
    m = re.search(r"url\((https://[^)]+)\)", block)
    fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    w = re.search(r"font-weight:\s*([0-9 ]+);", block).group(1).strip().replace(" ", "-")
    st = re.search(r"font-style:\s*(\w+);", block).group(1)
    fn = f"{fam.replace(' ', '')}-{w}-{st}-{n}.woff2"
    n += 1
    subprocess.run(["curl", "-sS", "-o", os.path.join(out, fn), m.group(1)], check=True)
    keep.append(block.replace(m.group(1), fn))
open(os.path.join(out, "fonts.css"), "w").write("\n".join(keep) + "\n")
print(f"{len(keep)} faces -> {out}/fonts.css")
