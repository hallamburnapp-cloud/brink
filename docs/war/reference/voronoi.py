"""Rasterise the greybox map: landmass outlines + per-landmass nearest-pin cells.
Checks that the borders the art would draw match the adjacency list, and reports region areas."""
import math
from board import REGIONS, LAND

OUTLINES = {
  'CAP': [(24,22),(120,12),(300,14),(354,38),(364,112),(300,130),(150,136),(60,126),(24,82)],
  'HMR': [(10,148),(128,144),(134,206),(128,290),(136,356),(80,366),(12,356),(6,250)],
  'SND': [(266,144),(382,148),(386,252),(382,360),(318,364),(270,354),(264,252)],
  'FRS': [(18,392),(150,380),(250,378),(368,392),(374,502),(250,514),(120,514),(20,500)],
}
ISLAND_R = 24  # Scatter islands: discs centred on the pins, radius in pt
CAUSEWAYS_DRAWN = True

def inside(poly, x, y):
  c = False; n = len(poly)
  for i in range(n):
    x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
    if (y1 > y) != (y2 > y):
      xi = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
      if x < xi: c = not c
  return c

def raster():
  W, H = 390, 520
  grid = [[None] * W for _ in range(H)]
  by_bloc = {}
  for r, v in REGIONS.items(): by_bloc.setdefault(v[1], []).append(r)
  for y in range(H):
    for x in range(W):
      px, py = x + .5, y + .5
      for b, poly in OUTLINES.items():
        if inside(poly, px, py):
          grid[y][x] = min(by_bloc[b], key=lambda r: (REGIONS[r][3]-px)**2 + (REGIONS[r][4]-py)**2)
          break
      else:
        for r in by_bloc['SCT']:
          if (REGIONS[r][3]-px)**2 + (REGIONS[r][4]-py)**2 <= ISLAND_R**2:
            grid[y][x] = r; break
  return grid

if __name__ == '__main__':
  g = raster()
  area = {}; touch = set()
  for y in range(520):
    for x in range(390):
      a = g[y][x]
      if a: area[a] = area.get(a, 0) + 1
      for dx, dy in ((1,0),(0,1)):
        if x+dx < 390 and y+dy < 520:
          b = g[y+dy][x+dx]
          if a and b and a != b: touch.add(frozenset((a,b)))
  land = set(frozenset(e) for e in LAND)
  print('drawn borders not in LAND:', sorted(tuple(sorted(t)) for t in touch - land))
  print('LAND joins with no drawn border (must be drawn as causeway/bridge):', sorted(tuple(sorted(t)) for t in land - touch))
  for r in sorted(area, key=lambda r: area[r]):
    print('%-14s area %5d pt^2  ~%3.0f pt square' % (REGIONS[r][0], area[r], math.sqrt(area[r])))
  # export a tiny SVG preview
  with open('preview.svg','w') as f:
    f.write('<svg xmlns="http://www.w3.org/2000/svg" width="390" height="520" viewBox="0 0 390 520"><rect width="390" height="520" fill="#0d1b2a"/>')
    col = {'CAP':'#7cc4ff','HMR':'#3fbfa0','SCT':'#e8c15a','SND':'#ef7f6a','FRS':'#a98bff'}
    for y in range(520):
      x = 0
      while x < 390:
        a = g[y][x]; x0 = x
        while x < 390 and g[y][x] == a: x += 1
        if a: f.write('<rect x="%d" y="%d" width="%d" height="1" fill="%s" opacity="%s"/>' % (x0, y, x-x0, col[REGIONS[a][1]], '0.55' if (sum(map(ord,a))%2) else '0.8'))
    from board import LANES
    for a,b in LANES:
      f.write('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#fff" stroke-dasharray="4 4" stroke-width="1.5"/>' % (REGIONS[a][3],REGIONS[a][4],REGIONS[b][3],REGIONS[b][4]))
    for r,v in REGIONS.items():
      f.write('<circle cx="%d" cy="%d" r="%d" fill="%s" stroke="#000"/><text x="%d" y="%d" font-size="8" fill="#fff" text-anchor="middle">%s %d</text>' % (v[3],v[4], 7 if v[5] else 4, '#ffd34d' if v[5] else '#fff', v[3], v[4]+15, v[0], v[2]))
    f.write('</svg>')
