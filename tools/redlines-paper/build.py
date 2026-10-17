#!/usr/bin/env python3
"""Build frame.html and call.html for the PAPER look (analogue situation room)."""
import json, math, re, random, os

ROOT = "/tmp/claude-0/-home-user/8a83eba3-4efc-53f8-a9ad-433378148d32/scratchpad/looks"
OUT = os.path.join(ROOT, "paper")
geo = json.load(open(os.path.join(ROOT, "geo.json")))
R = {r["id"]: r for r in geo["regions"]}

# ---------------------------------------------------------------- geometry helpers
def tpath(d, sx, sy, ox, oy):
    """scale/translate every numeric pair in an M/L/Z path string."""
    toks = re.findall(r"[MLZ]|-?\d+\.?\d*", d)
    out, i = [], 0
    while i < len(toks):
        t = toks[i]
        if t in "ML":
            x, y = float(toks[i + 1]), float(toks[i + 2])
            out.append(f"{t}{x*sx+ox:.1f} {y*sy+oy:.1f}")
            i += 3
        elif t == "Z":
            out.append("Z"); i += 1
        else:
            i += 1
    return "".join(out)

def catmull_closed(pts, tension=1.0):
    n = len(pts)
    d = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension)
        d.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return "".join(d) + "Z"

def catmull_open(pts, tension=1.0):
    n = len(pts)
    d = [f"M{pts[0][0]:.1f} {pts[0][1]:.1f}"]
    for i in range(n - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, n - 1)]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6 * tension, p1[1] + (p2[1] - p0[1]) / 6 * tension)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6 * tension, p2[1] - (p3[1] - p1[1]) / 6 * tension)
        d.append(f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}")
    return "".join(d)

def island(cx, cy, r, seed, n=18):
    rnd = random.Random(seed)
    raw = [0.74 + 0.36 * rnd.random() for _ in range(n)]
    sm = [(raw[i - 1] + 2 * raw[i] + raw[(i + 1) % n]) / 4 for i in range(n)]
    # one bay and one headland to break the circle
    bay = rnd.randrange(n); head = (bay + n // 2 + rnd.randrange(-2, 3)) % n
    sm[bay] *= 0.7; sm[(bay + 1) % n] *= 0.82; sm[head] *= 1.18
    pts = []
    for i in range(n):
        a = i * 2 * math.pi / n + rnd.uniform(-0.08, 0.08)
        rr = r * sm[i]
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a) * 0.92))
    return catmull_closed(pts, 0.9)

def grease_ring(cx, cy, rx, ry, seed, turns=1.12, start=-1.1, wobble=1.6, n=40):
    rnd = random.Random(seed)
    pts = []
    total = int(n * turns)
    for i in range(total + 1):
        a = start + i / n * 2 * math.pi
        drift = 1 + 0.03 * math.sin(a * 2.3 + seed)
        pts.append((cx + (rx * drift + rnd.uniform(-wobble, wobble)) * math.cos(a) + (i / total) * 1.5,
                    cy + (ry * drift + rnd.uniform(-wobble, wobble)) * math.sin(a) - (i / total) * 1.0))
    return catmull_open(pts, 0.8)

def pencil_line(x1, y1, x2, y2, seed, wob=0.7, segs=6):
    rnd = random.Random(seed)
    pts = []
    for i in range(segs + 1):
        t = i / segs
        pts.append((x1 + (x2 - x1) * t + rnd.uniform(-wob, wob), y1 + (y2 - y1) * t + rnd.uniform(-wob, wob)))
    return catmull_open(pts, 0.9)

def arrow_head(x, y, ang, size=7):
    a1, a2 = ang + math.radians(150), ang - math.radians(150)
    return (f"M{x + size*math.cos(a1):.1f} {y + size*math.sin(a1):.1f}L{x:.1f} {y:.1f}"
            f"L{x + size*math.cos(a2):.1f} {y + size*math.sin(a2):.1f}")

# ---------------------------------------------------------------- map build
def build_map(SX, SY, OX, OY, dim=False, call=False):
    """Return svg inner markup (defs + layers) for the map, in frame coords."""
    T = lambda x, y: (x * SX + OX, y * SY + OY)
    P = lambda d: tpath(d, SX, SY, OX, OY)
    tint = {"CAP": "#d9dfd8", "HMR": "#e6e0b6", "SND": "#ead8a6", "FRS": "#dce3c0", "SCT": "#e8dcaf"}
    INK = "#2b2418"
    sea_regions = [r for r in geo["regions"] if r["sea"]]
    land_regions = [r for r in geo["regions"] if not r["sea"]]

    isl = {}
    seeds = {"GUL": 11, "DRF": 23, "TRN": 37, "LNK": 41, "PBB": 59, "SHL": 67}
    for r in sea_regions:
        cx, cy = T(r["disc"]["x"], r["disc"]["y"])
        isl[r["id"]] = island(cx, cy, 16.5 * SY, seeds[r["id"]])

    coasts = {k: P(v) for k, v in geo["coasts"].items()}

    o = []
    # --- defs
    o.append("""<defs>
<filter id="pp-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="pp-wash" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.08" numOctaves="3" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="0.6"/></filter>
<filter id="pp-ink" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.2 1.9" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>
<filter id="pp-shadow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="pp-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<pattern id="pp-hatch" width="4.6" height="4.6" patternUnits="userSpaceOnUse" patternTransform="rotate(-38)"><path d="M0 0V4.6" stroke="#b5261b" stroke-width="1.05" stroke-opacity="0.72" stroke-linecap="round"/><path d="M2.3 0V4.6" stroke="#b5261b" stroke-width="0.5" stroke-opacity="0.28"/></pattern>
<pattern id="pp-pencil" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(60)"><path d="M0 0V6" stroke="#6b5f4e" stroke-width="0.8" stroke-opacity="0.6"/></pattern>
<radialGradient id="pp-pinR" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ff8a80"/><stop offset="0.35" stop-color="#d32f2f"/><stop offset="1" stop-color="#6e0e0e"/></radialGradient>
<radialGradient id="pp-pinW" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.4" stop-color="#e9e2d2"/><stop offset="1" stop-color="#8d8370"/></radialGradient>
<linearGradient id="pp-chit" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f5567"/><stop offset="1" stop-color="#24323d"/></linearGradient>
</defs>""")
    # clip paths for relief shading
    for k, d in coasts.items():
        o.append(f'<clipPath id="pp-clip-{k}"><path d="{d}"/></clipPath>')
    for k, d in isl.items():
        o.append(f'<clipPath id="pp-clip-{k}"><path d="{d}"/></clipPath>')

    # --- sea lanes (under land so only sea shows)
    o.append('<g fill="none" stroke="#4a3f30" stroke-width="0.7" stroke-dasharray="2.6 2.4" stroke-opacity="0.5">')
    for a, b in geo["lanes"]:
        ax, ay = T(R[a]["x"], R[a]["y"]); bx, by = T(R[b]["x"], R[b]["y"])
        o.append(f'<path d="{pencil_line(ax, ay, bx, by, hash(a+b)%1000, 0.5)}"/>')
    o.append("</g>")

    # --- water lining
    o.append('<g fill="none" stroke="#4a3b25" stroke-linejoin="round">')
    for w, op in ((12, .05), (8.4, .08), (5.2, .13), (2.4, .22)):
        for d in list(coasts.values()) + list(isl.values()):
            o.append(f'<path d="{d}" stroke-width="{w}" stroke-opacity="{op}"/>')
    o.append("</g>")

    # --- land fills by region (bloc tint over paper), hatch, wash
    o.append('<g>')
    for r in land_regions:
        d = P(r["d"])
        o.append(f'<path d="{d}" fill="#f5eacd" fill-opacity="0.85"/><path d="{d}" fill="{tint[r["bloc"]]}" fill-opacity="0.5"/>')
    for r in sea_regions:
        o.append(f'<path d="{isl[r["id"]]}" fill="#f5eacd" fill-opacity="0.9"/><path d="{isl[r["id"]]}" fill="{tint["SCT"]}" fill-opacity="0.5"/>')
    o.append('</g>')
    # relief: inner coast shading (clipped) + hachure-ish hills
    o.append('<g fill="none" stroke="#5f4e32">')
    for k, d in list(coasts.items()) + list(isl.items()):
        o.append(f'<g clip-path="url(#pp-clip-{k})"><path d="{d}" stroke-width="5" stroke-opacity="0.16"/><path d="{d}" stroke-width="1.8" stroke-opacity="0.22"/></g>')
    o.append('</g>')

    def ridge(x, y, w, n=4, seed=1):
        rnd = random.Random(seed)
        parts = []
        step = w / n
        for i in range(n):
            bx = x + i * step + rnd.uniform(-1, 1); by = y + rnd.uniform(-1.2, 1.2)
            h = 3.2 + rnd.uniform(-0.6, 1.2)
            parts.append(f'<path d="M{bx:.1f} {by:.1f}L{bx+step*0.45:.1f} {by-h:.1f}L{bx+step*0.95:.1f} {by:.1f}" stroke="#4a3b25" stroke-width="0.6" fill="none" stroke-opacity="0.55"/>')
            for j in range(3):
                t = 0.25 + j * 0.25
                sx_ = bx + step * 0.45 + (step * 0.5) * t; sy_ = by - h + h * t
                parts.append(f'<path d="M{sx_:.1f} {sy_:.1f}L{sx_+0.6:.1f} {sy_+h*0.28:.1f}" stroke="#4a3b25" stroke-width="0.45" stroke-opacity="0.45"/>')
        return "".join(parts)
    for (x, y, w, n, s) in ((328, 44, 26, 4, 1), (150, 44, 22, 3, 2), (92, 150, 20, 3, 3), (320, 345, 24, 4, 4), (60, 352, 18, 3, 5), (240, 320, 18, 3, 6)):
        fx, fy = T(x, y)
        o.append(ridge(fx, fy, w, n, s))

    # pressure hatching
    pressure = ["KLP", "LTL", "BRK", "GUL"]
    o.append('<g filter="url(#pp-rough)">')
    for rid in pressure:
        d = P(R[rid]["d"]) if not R[rid]["sea"] else isl[rid]
        o.append(f'<path d="{d}" fill="url(#pp-hatch)" fill-opacity="0.95"/>')
        o.append(f'<path d="{d}" fill="none" stroke="#b5261b" stroke-width="1.1" stroke-opacity="0.55"/>')
    o.append('</g>')
    # fighting wash on Driftholm
    o.append(f'<path d="{isl["DRF"]}" fill="#b3261e" fill-opacity="0.5" filter="url(#pp-wash)"/>')
    o.append(f'<path d="{isl["DRF"]}" fill="none" stroke="#8e1a12" stroke-width="1.4" stroke-opacity="0.7"/>')

    # --- internal borders (dashed) and coasts (ink)
    o.append(f'<g fill="none" stroke="{INK}" stroke-width="0.55" stroke-dasharray="2.2 1.6" stroke-opacity="0.75">')
    for r in land_regions:
        o.append(f'<path d="{P(r["d"])}"/>')
    o.append("</g>")
    o.append(f'<g fill="none" stroke="{INK}" stroke-width="1.05" stroke-linejoin="round" filter="url(#pp-rough)">')
    for d in list(coasts.values()) + list(isl.values()):
        o.append(f'<path d="{d}"/>')
    o.append("</g>")

    # --- labels
    label_pos = {  # map coords override
        "WMS": (246, 31), "EDV": (84, 191), "GUL": (176, 126), "DRF": (226, 121), "TRN": (166, 221),
        "LNK": (226, 231), "PBB": (176, 273), "SHL": (228, 273), "TLM": (352, 189), "KLM": (316, 72),
        "MRD": (110, 248), "BRK": (357, 150), "KLP": (292, 128), "NWK": (58, 56),
    }
    # overflow bias for near-edge labels handled via text-anchor
    o.append('<g class="pp-names">')
    for r in geo["regions"]:
        x, y = label_pos.get(r["id"], (r["x"], r["y"]))
        fx, fy = T(x, y)
        cls = "pp-nm"
        if r["sea"]: cls += " pp-isle"
        if r["capital"]: cls += " pp-cap"
        if r["id"] == "DRF": cls += " pp-red"
        if r["id"] in ("BRK", "MRD"): cls += " pp-sm"
        o.append(f'<text class="{cls}" x="{fx:.1f}" y="{fy:.1f}" text-anchor="middle">{r["name"]}</text>')
        if r["capital"] and r["id"] not in ("EDV", "WMS"):
            # ringed dot capital mark, just left of the name start
            o.append(f'<g transform="translate({fx:.1f} {fy+ (6 if r["id"]!="LNK" else 7):.1f})"><circle r="2.3" fill="none" stroke="{INK}" stroke-width="0.7"/><circle r="0.9" fill="{INK}"/></g>')
    o.append('</g>')
    # bloc names
    blocs = [("THE CAP", 300, 52), ("HIGHMARCH", 68, 223), ("THE SOUND", 336, 273), ("FARSOUTH", 196, 346)]
    o.append('<g class="pp-blocs">')
    for name, x, y in blocs:
        fx, fy = T(x, y)
        o.append(f'<text x="{fx:.1f}" y="{fy:.1f}" text-anchor="middle">{name}</text>')
    o.append('</g>')

    # --- flags on pins (capitals of the two powers)
    def flag_pin(x, y, kind):
        g = [f'<g transform="translate({x:.1f} {y:.1f})">']
        g.append('<ellipse cx="1.5" cy="1.2" rx="3.2" ry="1.3" fill="#3b2a12" opacity="0.35"/>')
        g.append('<path d="M0 0V-13" stroke="#5a5048" stroke-width="0.9"/>')
        g.append('<path d="M0 -13V-11" stroke="#d9cfb8" stroke-width="0.9"/>')
        if kind == "REP":
            g.append('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="#1d4b6e"/>')
            g.append('<path d="M0 -4.5L12.5 -13" stroke="#f1e9d2" stroke-width="1.6"/>')
            g.append('<circle cx="3.4" cy="-9.8" r="1.5" fill="#e8b84a"/>')
        else:
            g.append('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="#8f1b1b"/>')
            g.append('<path d="M0 -13L5.5 -8.7L0 -4.5Z" fill="#1a1412"/>')
            g.append('<circle cx="8.3" cy="-8.7" r="1.6" fill="#f1e9d2"/>')
        g.append('<path d="M0 -13H12.5L11 -8.7L12.5 -4.5H0Z" fill="none" stroke="#1a1412" stroke-width="0.5" stroke-opacity="0.7"/>')
        g.append('<circle cx="0" cy="0" r="1.1" fill="#3b3028"/>')
        g.append('</g>')
        return "".join(g)
    o.append(flag_pin(*T(281, 40), "FED"))
    o.append(flag_pin(*T(110, 182), "REP"))

    # --- Federation forces: red pushpins + pencil arrows
    def pushpin(x, y):
        return (f'<g transform="translate({x:.1f} {y:.1f})">'
                f'<ellipse cx="-3" cy="5.5" rx="5.5" ry="2.2" fill="#2a1a08" opacity="0.38" filter="url(#pp-shadow)"/>'
                f'<path d="M0 0L-2.4 4.4" stroke="#7a7a7a" stroke-width="1.1"/>'
                f'<path d="M-1.2 2.1L0 0" stroke="#d8d8d8" stroke-width="0.5"/>'
                f'<circle r="5.2" fill="url(#pp-pinR)"/>'
                f'<circle r="5.2" fill="none" stroke="#4a0a0a" stroke-width="0.6" stroke-opacity="0.7"/>'
                f'<ellipse cx="-1.6" cy="-1.9" rx="1.6" ry="1" fill="#fff" opacity="0.55"/>'
                f'</g>')
    def pencil_arrow(pts, seed):
        rnd = random.Random(seed)
        pp = [(x + rnd.uniform(-0.6, 0.6), y + rnd.uniform(-0.6, 0.6)) for x, y in pts]
        d = catmull_open(pp, 0.9)
        (x1, y1), (x2, y2) = pp[-2], pp[-1]
        ang = math.atan2(y2 - y1, x2 - x1)
        return (f'<g fill="none" stroke="#2f2a24" stroke-width="1.7" stroke-opacity="0.85" stroke-linecap="round" stroke-linejoin="round" filter="url(#pp-rough)">'
                f'<path d="{d}"/><path d="{arrow_head(x2, y2, ang, 6.5)}"/>'
                f'<path d="{d}" stroke="#2f2a24" stroke-width="0.6" stroke-opacity="0.5" transform="translate(0.9 0.7)"/></g>')
    # Kellmark -> Kelpmouth
    o.append(pencil_arrow([T(302, 93), T(300, 104), T(298, 117)], 5))
    # Wintermast -> Vessary (west along the Cap, then down the strait)
    o.append(pencil_arrow([T(230, 54), T(170, 64), T(112, 64), T(74, 78), T(54, 92), T(52, 112)], 8))
    o.append(pushpin(*T(302, 92)))
    o.append(pushpin(*T(234, 52)))

    # --- our fleet counter at Lantern Key
    fx, fy = T(246, 205)
    o.append(f'<g transform="translate({fx:.1f} {fy:.1f}) rotate(-9)">'
             f'<rect x="-6.5" y="-5.5" width="15" height="13" rx="1" fill="#1a1208" opacity="0.35" filter="url(#pp-shadow)"/>'
             f'<rect x="-7.5" y="-7.5" width="15" height="13" rx="1" fill="url(#pp-chit)" stroke="#dbcfb0" stroke-width="0.8"/>'
             f'<path d="M-4 1.5h8l-1.3 2.2h-5.4zM-0.2 1.5v-5.5M-0.2 -4h2.6l-2.6 2.2" fill="#f1e9d2" stroke="#f1e9d2" stroke-width="0.6" stroke-linejoin="round"/>'
             f'<path d="M-4.6 2.6q2 1.4 4.4 0t4.4 0" fill="none" stroke="#f1e9d2" stroke-width="0.6"/>'
             f'</g>')

    # --- promises: grease pencil rings (ours, black wax)
    o.append('<g fill="none" stroke="#17120e" stroke-width="3.1" stroke-opacity="0.78" stroke-linecap="round" stroke-linejoin="round" filter="url(#pp-rough)">')
    vx, vy = T(40, 138); o.append(f'<path d="{grease_ring(vx, vy, 31, 25*SY, 3, 1.1, -1.3)}"/>')
    lx, ly = T(222, 198.5); o.append(f'<path d="{grease_ring(lx, ly, 25, 24*SY, 4, 1.12, -0.6)}"/>')
    tx, ty = T(290, 192); o.append(f'<path d="{grease_ring(tx, ty, 30, 34*SY, 5, 1.1, -2.0)}"/>')
    o.append('</g>')
    # --- the test on Lintel: red pencil ring, pressed hard, plus underline under the name
    o.append('<g fill="none" stroke="#c0271a" stroke-width="2.1" stroke-opacity="0.85" stroke-linecap="round" filter="url(#pp-rough)">')
    o.append(f'<path d="{grease_ring(tx, ty, 35, 39*SY, 6, 1.55, 0.6, 1.2)}"/>')
    nx, ny = T(290, 192)
    o.append(f'<path d="{pencil_line(nx-17, ny+2.6, nx+17, ny+3.4, 12, 0.5)}" stroke-width="1.5"/>')
    o.append(f'<path d="{pencil_line(nx-16, ny+4.4, nx+15, ny+5.2, 13, 0.5)}" stroke-width="1.1" stroke-opacity="0.6"/>')
    o.append('</g>')

    # --- handwritten marks (grease pencil words)
    hw = []
    def hwtext(x, y, txt, cls="pp-hw", rot=-6, anchor="middle"):
        fx, fy = T(x, y)
        return f'<text class="{cls}" transform="translate({fx:.1f} {fy:.1f}) rotate({rot})" text-anchor="{anchor}">{txt}</text>'
    hw.append(hwtext(46, 177, "WE DEFEND", rot=-5))
    hw.append(hwtext(226, 169, "WE DEFEND", rot=-4))
    hw.append(hwtext(286, 244, "WE DEFEND", rot=-4))
    hw.append(hwtext(292, 212, "TESTED", "pp-hw pp-hwred", rot=-3))
    # underline under TESTED
    ux, uy = T(292, 214)
    hw.append(f'<path d="{pencil_line(ux-16, uy+1.2, ux+17, uy+0.2, 21, 0.6)}" fill="none" stroke="#c0271a" stroke-width="1.6" stroke-opacity="0.85" stroke-linecap="round" filter="url(#pp-rough)"/>')
    o.append("".join(hw))

    # --- FIGHTING stamp over Driftholm
    sx_, sy_ = T(226, 144)
    o.append(f'<g transform="translate({sx_:.1f} {sy_:.1f}) rotate(-12)" filter="url(#pp-ink)" opacity="0.9">'
             f'<rect x="-26" y="-7" width="52" height="14" fill="none" stroke="#a51d12" stroke-width="1.2"/>'
             f'<text class="pp-stamp-sm" x="0" y="3.6" text-anchor="middle">FIGHTING</text></g>')
    if not call:
        # compass rose in the open sea, and a faint cup ring on the sheet
        o.append('<g transform="translate(336 534)" fill="none" stroke="#2b2418" stroke-opacity=".72">'
                 '<circle r="21" stroke-width=".6"/><circle r="17.5" stroke-width=".4"/>'
                 '<path d="M0 -25L3 -3L0 0L-3 -3Z" fill="#2b2418" fill-opacity=".85" stroke="none"/>'
                 '<path d="M0 25L3 3L0 0L-3 3ZM25 0L3 3L0 0L3 -3ZM-25 0L-3 3L0 0L-3 -3Z" fill="#2b2418" fill-opacity=".4" stroke="none"/>'
                 '<path d="M0 -25L3 -3L0 0L-3 -3ZM0 25L3 3L0 0L-3 3ZM25 0L3 3L0 0L3 -3ZM-25 0L-3 3L0 0L-3 -3Z" stroke-width=".5"/>'
                 '<path d="M16 -16L2.5 -2.5M16 16L2.5 2.5M-16 16L-2.5 2.5M-16 -16L-2.5 -2.5" stroke-width=".5"/>'
                 '<text y="-29" class="pp-nm" text-anchor="middle" style="font-size:7.5px">N</text></g>')
        o.append('<g filter="url(#pp-wash)" opacity=".55"><circle cx="118" cy="700" r="33" fill="none" stroke="#7a5a2a" stroke-width="3.5" stroke-opacity=".16"/>'
                 '<circle cx="118" cy="700" r="30.5" fill="none" stroke="#7a5a2a" stroke-width="1" stroke-opacity=".12"/></g>')
    return "\n".join(o)


# ---------------------------------------------------------------- shared CSS (per look)
def common_css(K):
    return f"""
.{K}{{position:relative;width:390px;height:844px;overflow:hidden;box-sizing:border-box;margin:0;padding:0;
  background:#f0e2c0;
  background-image:
    radial-gradient(ellipse 80% 60% at 62% 38%, rgba(255,248,226,0.6) 0%, rgba(255,248,226,0) 60%),
    linear-gradient(170deg,#f3e5c2 0%,#ecdcb6 55%,#e3d1a8 100%);
  font-family:'Special Elite','Courier Prime','Courier New','Liberation Mono',monospace;color:#2b2418;
  -webkit-font-smoothing:antialiased;}}
.{K} *{{box-sizing:border-box;}}
.{K} .pp-grain{{position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;opacity:.9;}}
.{K} .pp-lamp{{position:absolute;inset:0;pointer-events:none;
  background:
   radial-gradient(circle at 62% 38%, rgba(0,0,0,0) 0, rgba(60,40,15,0.04) 38%, rgba(45,28,9,0.24) 70%, rgba(26,15,4,0.54) 100%);}}
.{K} .pp-lamp2{{position:absolute;inset:0;pointer-events:none;mix-blend-mode:overlay;
  background:radial-gradient(circle at 62% 38%, rgba(255,226,160,0.5) 0, rgba(255,226,160,0) 46%);}}
.{K} svg text{{user-select:none;}}
.{K} .pp-nm{{font-family:Georgia,'Bitstream Charter','Liberation Serif','Times New Roman',serif;font-size:8.4px;letter-spacing:.13em;text-transform:uppercase;fill:#2a2217;paint-order:stroke;stroke:#e9dcb8;stroke-width:1.6px;stroke-opacity:.55;stroke-linejoin:round;}}
.{K} .pp-isle{{font-size:7.1px;letter-spacing:.09em;}}
.{K} .pp-cap{{font-weight:700;font-size:8.9px;}}
.{K} .pp-red{{fill:#8e1a12;}}
.{K} .pp-sm{{font-size:7.4px;letter-spacing:.08em;}}
.{K} .pp-blocs text{{font-family:Georgia,'Bitstream Charter','Liberation Serif',serif;font-size:9.4px;letter-spacing:.34em;fill:#6a5a40;fill-opacity:.85;}}
.{K} .pp-hw{{font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive;font-size:12.5px;font-weight:700;fill:#17120e;fill-opacity:.82;letter-spacing:.02em;}}
.{K} .pp-hwred{{fill:#c0271a;fill-opacity:.9;font-size:13.5px;}}
.{K} .pp-stamp-sm{{font-family:'Special Elite','Courier New','Liberation Mono',monospace;font-size:8.6px;letter-spacing:.14em;fill:#a51d12;font-weight:700;}}
/* objects on the desk */
.{K} .pp-obj{{position:absolute;box-shadow:-2px 3px 5px rgba(50,32,10,.32),-6px 12px 18px rgba(50,32,10,.18);}}
.{K} .pp-ty{{font-family:'Special Elite','Courier Prime','Courier New','Liberation Mono',monospace;}}
.{K} .pp-hand{{font-family:'Caveat','Segoe Print','Bradley Hand','Comic Sans MS',cursive;}}
"""

GRAIN_SVG = """<svg class="pp-grain" width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<filter id="{id}-g"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="2" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.72  0 0 0 0 0.66  0 0 0 0 0.56  0 0 0 0 1"/><feComponentTransfer><feFuncA type="linear" slope="0.5" intercept="0.5"/></feComponentTransfer><feBlend in2="SourceGraphic" mode="multiply"/></filter>
<filter id="{id}-f"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="5" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.78  0 0 0 0 0.62  0 0 0 0 1"/><feComponentTransfer><feFuncA type="linear" slope="0.35" intercept="0.65"/></feComponentTransfer></filter>
<rect width="390" height="844" filter="url(#{id}-f)" opacity="0.42"/>
<rect width="390" height="844" filter="url(#{id}-g)" opacity="0.4"/>
</svg>"""

PAPERCLIP = """<svg class="pp-clip" width="14" height="34" viewBox="0 0 14 34" aria-hidden="true"><path d="M3.5 30V6.5a3.5 3.5 0 0 1 7 0V26a2.2 2.2 0 0 1-4.4 0V9" fill="none" stroke="#8c8a84" stroke-width="1.3"/><path d="M3.5 30V6.5a3.5 3.5 0 0 1 7 0V26a2.2 2.2 0 0 1-4.4 0V9" fill="none" stroke="#e8e6df" stroke-width="0.5" transform="translate(-0.4 -0.4)"/></svg>"""

STAMP_FILTER = """<filter id="{id}" x="-10%" y="-20%" width="120%" height="140%"><feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" seed="{seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 2.05" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>"""


# ---------------------------------------------------------------- FRAME (day 18)
def build_frame():
    K = "look-paper"
    SX, SY, OX, OY = 1.0, 1.08, 0.0, 58.0
    mapsvg = build_map(SX, SY, OX, OY)
    css = common_css(K) + f"""
.{K} .pp-map{{position:absolute;left:0;top:0;width:390px;height:844px;}}
.{K} .pp-neat{{position:absolute;left:9px;top:46px;width:372px;height:596px;border:1px solid rgba(43,36,24,.75);pointer-events:none;}}
.{K} .pp-neat:before{{content:"";position:absolute;inset:2px;border:.5px solid rgba(43,36,24,.45);}}
.{K} .pp-title{{position:absolute;left:0;right:0;top:26px;text-align:center;font-family:Georgia,'Bitstream Charter','Liberation Serif',serif;font-size:10.5px;letter-spacing:.46em;color:#4e4028;}}
.{K} .pp-title:before,.{K} .pp-title:after{{content:"";display:inline-block;width:26px;height:1px;background:#6e5f45;vertical-align:middle;margin:0 10px 2px;opacity:.7;}}
/* desk calendar */
.{K} .pp-cal{{left:8px;top:6px;width:86px;height:74px;background:#f3ead6;border-radius:2px;transform:rotate(-2.2deg);overflow:hidden;}}
.{K} .pp-cal .hd{{height:16px;background:#2e2922;color:#efe6d0;font-size:8.5px;letter-spacing:.3em;text-align:center;line-height:16px;}}
.{K} .pp-cal .hd i{{display:inline-block;width:3px;height:3px;border-radius:50%;background:#d9cfb8;margin:0 2px 1px;vertical-align:middle;}}
.{K} .pp-cal .num{{font-size:31px;line-height:33px;text-align:center;color:#1f1a14;margin-top:1px;}}
.{K} .pp-cal .nt{{font-size:13px;line-height:14px;text-align:center;color:#3a3129;margin-top:0;transform:rotate(-1deg);white-space:nowrap;letter-spacing:-.01em;}}
.{K} .pp-cal .nt b{{font-weight:600;color:#1f1a14;}}
/* play controls: pencil marks */
.{K} .pp-play{{position:absolute;right:14px;top:14px;width:64px;height:22px;}}
/* status card clipped to the corner */
.{K} .pp-card .nc{{position:absolute;left:12px;bottom:5px;font-size:13px;line-height:14px;color:#3a3129;transform:rotate(-1.2deg);white-space:nowrap;}}
.{K} .pp-card{{left:178px;top:562px;width:200px;height:138px;background:#f5efdd;transform:rotate(1.6deg);padding:9px 10px 8px 12px;
  background-image:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 15px,rgba(120,100,70,.14) 15px 16px);}}
.{K} .pp-card .pp-clip{{position:absolute;left:-2px;top:-9px;transform:rotate(8deg);}}
.{K} .pp-card .row{{position:relative;height:30px;}}
.{K} .pp-card .lab{{position:absolute;left:0;top:0;font-size:10px;letter-spacing:.12em;color:#2b2418;}}
.{K} .pp-card .sub{{position:absolute;left:0;top:17px;font-size:7.6px;letter-spacing:.02em;color:#5a4e3e;white-space:nowrap;}}
.{K} .pp-card .val{{position:absolute;right:0;top:0;font-size:10px;color:#2b2418;}}
.{K} .pp-card svg.bar{{position:absolute;left:58px;top:2px;}}
.{K} .pp-card .they{{position:relative;height:38px;margin-top:4px;}}
.{K} .pp-card .they .lab{{top:12px;}}
.{K} .pp-stamp{{position:absolute;left:62px;top:-8px;width:122px;height:40px;}}
.{K} .pp-stamp text{{font-family:'Special Elite','Courier New','Liberation Mono',monospace;font-size:19px;letter-spacing:.16em;font-weight:700;fill:#b4231a;}}
/* handwritten situation note and intel slip */
.{K} .pp-note{{position:absolute;left:16px;top:502px;width:170px;font-size:14.5px;line-height:16px;color:#2a241c;transform:rotate(-1.5deg);}}
.{K} .pp-note span{{display:inline-block;}}
.{K} .pp-intel{{left:20px;top:590px;width:156px;background:#efe6cf;padding:6px 8px 7px 9px;transform:rotate(-2.4deg);font-size:8.3px;line-height:11px;color:#2b2418;
  clip-path:polygon(0 3%,4% 0,30% 2%,55% 0,80% 2%,100% 0,99% 40%,100% 70%,98% 100%,60% 98%,30% 100%,0 97%);}}
.{K} .pp-intel b{{display:block;font-size:7px;letter-spacing:.22em;color:#6d5f49;margin-bottom:2px;}}
/* teleprinter tape */
.{K} .pp-tape{{left:6px;top:734px;width:378px;height:88px;background:#ecdfb4;transform:rotate(-1.2deg);padding:10px 12px 8px 14px;color:#2b2418;
  background-image:linear-gradient(90deg,rgba(0,0,0,0) 0,rgba(0,0,0,0) 100%),radial-gradient(circle at 50% 4px, rgba(90,70,40,.35) 0 1.4px, rgba(0,0,0,0) 1.9px);
  background-size:100% 100%, 9px 8px;background-repeat:no-repeat,repeat-x;
  clip-path:polygon(0 0,100% 0,100% 100%,0 100%);}}
.{K} .pp-tape .ln{{font-size:9.6px;line-height:19px;letter-spacing:.06em;white-space:nowrap;text-transform:uppercase;}}
.{K} .pp-tape .ln i{{font-style:normal;color:#7a6b52;margin-right:7px;font-size:8px;}}
.{K} .pp-tape:before{{content:"";position:absolute;left:0;right:0;top:0;height:7px;}}
.{K} .pp-desk{{position:absolute;left:0;right:0;bottom:0;height:0;}}
"""
    # status bars as svg (pencil)
    war_bar = ('<svg class="bar" width="118" height="14" viewBox="0 0 118 14">'
               '<path d="M1 11.5H116" stroke="#4e4436" stroke-width="0.8" stroke-opacity=".8"/>'
               '<path d="M1 3.5H116" stroke="#4e4436" stroke-width="0.6" stroke-opacity=".5"/>'
               + "".join(f'<path d="M{1+i*115/12:.1f} 2.6V12.6" stroke="#4e4436" stroke-width="{0.9 if i in (0,12) else 0.5}" stroke-opacity=".7"/>' for i in range(13))
               + '<rect x="1.4" y="3.8" width="9.2" height="7.6" fill="url(#pp-hatchcard)"/>'
               + '<path d="M1.4 3.8h9.2v7.6h-9.2z" fill="none" stroke="#b5261b" stroke-width="0.8" stroke-opacity=".8"/>'
               '</svg>')
    treaty_bar = ('<svg class="bar" width="118" height="14" viewBox="0 0 118 14">'
                  '<path d="M1 11.5H116" stroke="#4e4436" stroke-width="0.8" stroke-opacity=".8"/>'
                  '<path d="M1 3.5H116" stroke="#4e4436" stroke-width="0.6" stroke-opacity=".5"/>'
                  '<path d="M1 2.6V12.6M116 2.6V12.6" stroke="#4e4436" stroke-width="0.9" stroke-opacity=".7"/>'
                  + "".join(f'<path d="M{1+i*115/4:.1f} 9.4V12.6" stroke="#4e4436" stroke-width="0.5" stroke-opacity=".6"/>' for i in range(1,4))
                  + '<rect x="1.4" y="3.8" width="25.3" height="7.6" fill="url(#pp-hatchblue)"/>'
                  + '<path d="M1.4 3.8h25.3v7.6h-25.3z" fill="none" stroke="#2457a3" stroke-width="0.8" stroke-opacity=".75"/>'
                  '</svg>')
    stamp = ('<svg class="pp-stamp" viewBox="0 0 122 40" aria-hidden="false">'
             + STAMP_FILTER.format(id="pp-stampf", seed=4) +
             '<g transform="rotate(-7 61 20)" filter="url(#pp-stampf)">'
             '<rect x="7" y="7" width="108" height="26" fill="none" stroke="#b4231a" stroke-width="2"/>'
             '<rect x="10" y="10" width="102" height="20" fill="none" stroke="#b4231a" stroke-width="0.7"/>'
             '<text x="61" y="26.5" text-anchor="middle">PUSHING</text></g></svg>')
    play = ('<svg class="pp-play" viewBox="0 0 64 22" aria-hidden="true">'
            '<g fill="none" stroke="#3a3128" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" opacity=".8">'
            '<path d="M6 6.5v9.5M10.5 6.3v9.6"/>'
            '<path d="M26 6l9 5.3-9 5.3z"/>'
            '<path d="M46 6.4l6.5 4.9-6.5 4.9zM53 6.4l6.5 4.9-6.5 4.9z"/>'
            '<path d="M31 2.2c-6-1.4-10.8 3-10.4 8.6.4 5.4 5.6 9 11.6 8.1 5.4-.9 8.6-5.6 7.7-10.2-.7-3.6-3.5-6-7.6-6.6" stroke-width="1.1" stroke="#6b5f4e"/>'
            '</g></svg>')

    html = f"""<div class="{K}">
{GRAIN_SVG.format(id="ppg")}
<div class="pp-neat"></div>
<svg class="pp-map" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" aria-label="Situation map, day 18">
<defs><pattern id="pp-hatchcard" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><path d="M0 0V3.2" stroke="#b5261b" stroke-width="1.1" stroke-opacity=".75"/></pattern>
<pattern id="pp-hatchblue" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(-40)"><path d="M0 0V3.2" stroke="#2457a3" stroke-width="1.1" stroke-opacity=".7"/></pattern></defs>
{mapsvg}
</svg>
<div class="pp-title">BRINK</div>
{play}
<div class="pp-obj pp-cal"><div class="hd"><i></i>DAY<i></i></div><div class="num">18</div><div class="nt pp-hand">influence <b>31</b></div></div>
<div class="pp-note pp-hand"><span>They are pushing the Sound and have taken Driftholm. Your promise at Lintel is being tested now.</span></div>
<div class="pp-obj pp-intel pp-ty"><b>INTEL</b>They think you'll back down. We are fairly sure.</div>
<div class="pp-obj pp-card pp-ty">{PAPERCLIP}
 <div class="row"><div class="lab">WAR</div>{war_bar}<div class="sub">1 region fighting · world war at 12</div></div>
 <div class="row"><div class="lab">TREATY</div>{treaty_bar}<div class="val">22%</div><div class="sub">the Federation's willingness to sign</div></div>
 <div class="they"><div class="lab">THEY ARE</div>{stamp}</div>
 <div class="nc pp-hand">next call: day 21</div>
</div>
<div class="pp-obj pp-tape pp-ty">
 <div class="ln"><i>0612</i>Federation armour reaches the Lintel line</div>
 <div class="ln"><i>0640</i>Wintermast: 'a test of nerves, nothing more'</div>
 <div class="ln"><i>0701</i>Farsouth recalls its envoy</div>
</div>
<div class="pp-lamp2"></div>
<div class="pp-lamp"></div>
</div>
<style>{css}</style>
"""
    open(os.path.join(OUT, "frame.html"), "w").write(html)
    return html


# ---------------------------------------------------------------- CALL (03:14)
def build_call():
    K = "look-paper-call"
    SX, SY, OX, OY = 1.0, 1.08, 0.0, -112.0   # Lintel sits near the top
    mapsvg = build_map(SX, SY, OX, OY, call=True).replace('id="pp-', 'id="ppc-').replace('url(#pp-', 'url(#ppc-')
    css = common_css(K) + f"""
.{K}{{background:#cdbb92;}}
.{K} .pp-map{{position:absolute;left:0;top:0;width:390px;height:844px;}}
.{K} .pp-lamp{{background:radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 0, rgba(45,28,9,0.18) 34%, rgba(30,18,6,0.62) 62%, rgba(14,8,2,0.9) 100%);}}
.{K} .pp-lamp2{{background:radial-gradient(circle at 50% 46%, rgba(255,226,160,0.5) 0, rgba(255,226,160,0) 46%);}}
.{K} .pp-dim{{position:absolute;inset:0;background:rgba(30,20,8,.36);pointer-events:none;}}
.{K} .pp-clock{{position:absolute;right:14px;top:12px;font-size:26px;line-height:28px;letter-spacing:.08em;color:#efe3c6;background:#1b1715;padding:5px 10px 4px 12px;border-radius:3px;
  box-shadow:-2px 3px 6px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08);}}
.{K} .pp-clock:after{{content:"";position:absolute;left:0;right:0;top:19px;height:1px;background:rgba(0,0,0,.6);}}
.{K} .pp-clock small{{display:block;font-size:7px;letter-spacing:.3em;color:#a79a80;text-align:right;margin-top:1px;line-height:9px;}}
.{K} .pp-handset{{position:absolute;left:0;top:0;width:270px;height:172px;}}
/* caller card */
.{K} .pp-caller{{left:17px;top:160px;width:356px;background:#f4ecd8;padding:14px 16px 13px 18px;transform:rotate(-1.1deg);
  background-image:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 17px,rgba(120,100,70,.16) 17px 18px);background-position:0 36px;}}
.{K} .pp-caller .pp-clip{{position:absolute;right:22px;top:-10px;transform:rotate(-6deg);}}
.{K} .pp-caller .who{{font-size:15.5px;letter-spacing:.1em;color:#1d1812;line-height:18px;}}
.{K} .pp-caller .role{{font-size:16px;color:#3a3129;line-height:16px;margin-top:1px;transform:rotate(-1.5deg);display:inline-block;}}
.{K} .pp-caller .role b{{font-weight:600;}}
.{K} .pp-caller .msg{{font-size:11.6px;line-height:18px;color:#2b2418;margin-top:9px;}}
.{K} .pp-caller .ring{{position:absolute;right:16px;top:12px;font-size:7.5px;letter-spacing:.25em;color:#b4231a;}}
/* advisers */
.{K} .pp-adv{{position:absolute;left:0;top:0;width:390px;height:844px;pointer-events:none;}}
.{K} .pp-slip{{position:absolute;left:22px;width:346px;background:#efe5cc;padding:6px 10px 7px 12px;color:#2b2418;}}
.{K} .pp-slip .who{{font-size:7.6px;letter-spacing:.24em;color:#6d5f49;display:block;margin-bottom:1px;}}
.{K} .pp-slip .q{{font-size:11px;line-height:15px;}}
.{K} .pp-s1{{top:316px;transform:rotate(.7deg);clip-path:polygon(0 4%,3% 0,40% 3%,70% 0,100% 2%,99% 60%,100% 100%,55% 97%,20% 100%,0 96%);}}
.{K} .pp-s2{{top:366px;transform:rotate(-.9deg);background:#f1e8d2;clip-path:polygon(0 0,35% 3%,65% 0,100% 3%,100% 100%,70% 97%,30% 100%,1% 97%);}}
.{K} .pp-s3{{top:430px;transform:rotate(.4deg);background:#ece2c7;clip-path:polygon(1% 3%,30% 0,60% 3%,100% 0,99% 97%,60% 100%,25% 97%,0 100%);}}
/* choices: typed slips */
.{K} .pp-ch{{position:absolute;left:18px;width:354px;height:74px;background:#f6f0dd;padding:9px 12px 8px 14px;color:#2b2418;}}
.{K} .pp-ch .w{{font-size:17px;letter-spacing:.12em;color:#1a1510;line-height:20px;display:inline-block;position:relative;}}
.{K} .pp-ch .w svg{{position:absolute;left:-4px;right:-6px;bottom:-5px;height:7px;width:calc(100% + 10px);}}
.{K} .pp-ch .c{{font-size:10.2px;line-height:14px;color:#3b322a;margin-top:6px;}}
.{K} .pp-ch .n{{position:absolute;right:12px;top:7px;font-size:16px;color:#6d5f49;transform:rotate(6deg);}}
.{K} .pp-c1{{top:518px;transform:rotate(-.8deg);}}
.{K} .pp-c2{{top:604px;transform:rotate(.9deg);background:#f2ead6;}}
.{K} .pp-c3{{top:690px;transform:rotate(-.5deg);background:#efe6cf;}}
/* the teleprinter keeps running in the dark */
.{K} .pp-tape{{left:6px;top:782px;width:378px;height:56px;background:#ecdfb4;transform:rotate(-1deg);padding:8px 12px 6px 14px;color:#2b2418;opacity:.85;
  background-image:radial-gradient(circle at 50% 4px, rgba(90,70,40,.35) 0 1.4px, rgba(0,0,0,0) 1.9px);background-size:9px 8px;background-repeat:repeat-x;}}
.{K} .pp-tape .ln{{font-size:9.6px;line-height:18px;letter-spacing:.06em;white-space:nowrap;text-transform:uppercase;}}
.{K} .pp-tape .ln i{{font-style:normal;color:#7a6b52;margin-right:7px;font-size:8px;}}
.{K} .pp-ch:after{{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:repeating-linear-gradient(180deg,rgba(0,0,0,0) 0 3px,rgba(90,70,40,.18) 3px 4px);}}
"""
    # coiled cord: small ellipses along the line from the mouthpiece rim to the frame edge
    cord = []
    x0, y0, x1, y1 = 31.0, 131.0, -4.0, 166.0
    ang = math.degrees(math.atan2(y1 - y0, x1 - x0))
    n_loops = 11
    for i in range(n_loops):
        t = i / (n_loops - 1)
        cx, cy = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
        cord.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="2.6" ry="5.4" transform="rotate({ang+90:.1f} {cx:.1f} {cy:.1f})" fill="none" stroke="#141110" stroke-width="1.9"/>')
    cord.append(f'<path d="M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}" stroke="#141110" stroke-width="1" fill="none"/>')
    cord_svg = '<g>' + "".join(cord) + '</g>'
    handset = """<svg class="pp-handset" viewBox="0 0 270 172" aria-label="Handset off the hook">
<defs>
 <linearGradient id="ppc-bk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4541"/><stop offset=".35" stop-color="#1d1a18"/><stop offset="1" stop-color="#090807"/></linearGradient>
 <radialGradient id="ppc-cup" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#5a544f"/><stop offset=".5" stop-color="#1f1c1a"/><stop offset="1" stop-color="#070606"/></radialGradient>
 <filter id="ppc-sh" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
</defs>
<g transform="translate(150 78) rotate(-24)">
 <g filter="url(#ppc-sh)" opacity=".55" transform="translate(-6 14)"><rect x="-96" y="-10" width="192" height="22" rx="11" fill="#1a0f04"/><ellipse cx="-100" cy="4" rx="30" ry="22" fill="#1a0f04"/><ellipse cx="100" cy="4" rx="30" ry="22" fill="#1a0f04"/></g>
 <rect x="-98" y="-12" width="196" height="24" rx="12" fill="url(#ppc-bk)"/>
 <path d="M-80 -6q80-5 160 0" stroke="#6b655f" stroke-width="1.2" fill="none" opacity=".55"/>
 <ellipse cx="-104" cy="2" rx="31" ry="23" fill="url(#ppc-cup)"/>
 <ellipse cx="104" cy="2" rx="31" ry="23" fill="url(#ppc-cup)"/>
 <ellipse cx="-104" cy="4" rx="17" ry="12" fill="#0b0a09"/>
 <ellipse cx="104" cy="4" rx="17" ry="12" fill="#0b0a09"/>
 <g fill="#2a2522">""" + "".join(
        f'<circle cx="{-104 + 7*math.cos(a*math.pi/3):.1f}" cy="{4 + 5*math.sin(a*math.pi/3):.1f}" r="1.6"/>' for a in range(6)) + '<circle cx="-104" cy="4" r="1.6"/>' + "".join(
        f'<circle cx="{104 + 7*math.cos(a*math.pi/3):.1f}" cy="{4 + 5*math.sin(a*math.pi/3):.1f}" r="1.6"/>' for a in range(6)) + """<circle cx="104" cy="4" r="1.6"/></g>
 <path d="M-118 -12q-10-8 -6-20" stroke="#8a847d" stroke-width="1" fill="none" opacity=".5"/>
</g>
""" + cord_svg + """
</svg>"""
    def underline(w_seed):
        return (f'<svg viewBox="0 0 100 7" preserveAspectRatio="none"><path d="{pencil_line(1, 3.5, 99, 3.2, w_seed, 0.9, 7)}" fill="none" stroke="#2f2a24" stroke-width="1.6" stroke-opacity=".8" stroke-linecap="round"/></svg>')
    html = f"""<div class="{K}">
{GRAIN_SVG.format(id="ppcg")}
<svg class="pp-map" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg" aria-label="Situation map, 03:14">
{mapsvg}
</svg>
<div class="pp-dim"></div>
<div class="pp-lamp2"></div>
<div class="pp-lamp"></div>
{handset}
<div class="pp-clock pp-ty">03:14<small>DAY 18</small></div>
<div class="pp-obj pp-caller pp-ty">{PAPERCLIP}
 <div class="who">GENERAL RUUN HALDER</div><div class="role pp-hand">the <b>Hawk</b></div>
 <div class="msg">Federation armour is at Lintel, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do.</div>
</div>
<div class="pp-obj pp-slip pp-s1 pp-ty"><span class="who">HAWK · GENERAL</span><div class="q">Move now. Or never promise anything again.</div></div>
<div class="pp-obj pp-slip pp-s2 pp-ty"><span class="who">DOVE · FOREIGN MINISTER</span><div class="q">A brigade in the Sound is the thing they warned us about.</div></div>
<div class="pp-obj pp-slip pp-s3 pp-ty"><span class="who">INTEL · DIRECTOR</span><div class="q">Fourth place they've pushed. First promise they've tested.</div></div>
<div class="pp-obj pp-ch pp-c1 pp-ty"><div class="w">BACK IT{underline(31)}</div><div class="n pp-hand">1</div><div class="c">move the brigade up · costs 12 influence · we keep our word</div></div>
<div class="pp-obj pp-ch pp-c2 pp-ty"><div class="w">BACK DOWN{underline(32)}</div><div class="n pp-hand">2</div><div class="c">protest and hold · they'll believe us less · Lintel will likely fall</div></div>
<div class="pp-obj pp-ch pp-c3 pp-ty"><div class="w">WAIT{underline(33)}</div><div class="n pp-hand">3</div><div class="c">a day · Intel: Lintel may fall · a second source may arrive</div></div>
<div class="pp-obj pp-tape pp-ty">
 <div class="ln"><i>0612</i>Federation armour reaches the Lintel line</div>
 <div class="ln"><i>0640</i>Wintermast: 'a test of nerves, nothing more'</div>
</div>
</div>
<style>{css}</style>
"""
    open(os.path.join(OUT, "call.html"), "w").write(html)
    return html


if __name__ == "__main__":
    f = build_frame(); c = build_call()
    open(os.path.join(OUT, "fonts.txt"), "w").write("Special Elite\nCaveat\n")
    print("frame.html", len(f.encode()), "bytes; call.html", len(c.encode()), "bytes")
