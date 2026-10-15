#!/usr/bin/env python3
"""Turn a Vite build of BRINK: THIRTY DAYS (dist-thirty-page) into an artifact page: the head and body
content of index.html without the document skeleton, plus a files map of every asset the page loads.

usage: npm run build:thirty-page && python3 tools/thirty-page.py dist-thirty-page <out dir>
Writes <out dir>/thirty-days.html and <out dir>/files.json ({published path: source path}).
"""
import json, re, sys
from pathlib import Path

dist, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
out.mkdir(parents=True, exist_ok=True)
html = (dist / "index.html").read_text()

head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
body = re.search(r"<body[^>]*>(.*?)</body>", html, re.S).group(1)
# The skeleton supplies charset and viewport; the title must come first (only the first 8 KB is scanned).
head = re.sub(r'<meta charset="[^"]*"\s*/?>', "", head)
head = re.sub(r'<meta name="viewport"[^>]*>', "", head)
title = re.search(r"<title>.*?</title>", head, re.S).group(0)
head = head.replace(title, "")
# A service worker cannot run in an embedded page; drop the plugin's injected registration and the manifest.
head = re.sub(r'<script[^>]*registerSW\.js[^>]*></script>', "", head)
head = re.sub(r'<link rel="manifest"[^>]*>', "", head)
title = "<title>BRINK: Thirty Days</title>"
head = head.replace("<style>", "<style>:root{color-scheme:dark}", 1)
page = "\n".join([title, head.strip(), body.strip()]) + "\n"
(out / "thirty-days.html").write_text(page)

skip = {"index.html", "sw.js", "registerSW.js"}
files = {}
for f in sorted(dist.rglob("*")):
    rel = f.relative_to(dist).as_posix()
    if f.is_file() and rel not in skip and not rel.startswith("workbox-") and not rel.endswith(".map") and not rel.endswith(".md") and rel != "manifest.webmanifest":
        files[rel] = str(f)
(out / "files.json").write_text(json.dumps(files, indent=1))
print(f"page {len(page)} bytes, {len(files)} files, {sum(Path(p).stat().st_size for p in files.values()) // 1024} KB")
