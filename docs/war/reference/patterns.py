"""Pattern detection for the winner design. Pure functions over a region graph."""
import itertools
from board import REGIONS, ADJ

# ladder: (key, name, baseInfluence, baseMomentum, levelInf, levelMom)  ordered LOW -> HIGH rank
LADDER = [
  ('SINGLE',  'SINGLE',     5, 1, 10, 1),
  ('LINK',    'LINK',      10, 2, 15, 1),
  ('TWOLINK', 'TWO LINKS', 20, 2, 20, 1),
  ('CHAIN',   'CHAIN',     30, 3, 20, 2),
  ('WORLD',   'WORLDWIDE', 35, 3, 25, 2),
  ('FRONT',   'FRONT',     45, 4, 25, 3),
  ('SURR',    'SURROUND',  50, 5, 30, 3),
  ('NETWORK', 'NETWORK',   70, 6, 35, 3),
  ('BLOC',    'BLOC',      90, 8, 40, 4),
  # secrets
  ('WHOLE',   'WHOLE BLOC',      140, 12, 50, 4),
  ('AROUND',  'AROUND THE WORLD',180, 15, 50, 5),
]
SURR_MIN = 3
RANK = {k[0]: i for i, k in enumerate(LADDER)}

def components(sel, adj):
  sel = list(sel); seen = set(); comps = []
  for s in sel:
    if s in seen: continue
    stack = [s]; comp = set([s]); seen.add(s)
    while stack:
      x = stack.pop()
      for y in adj[x]:
        if y in sel and y not in seen:
          seen.add(y); comp.add(y); stack.append(y)
    comps.append(comp)
  return comps

def west_key(r, regions=REGIONS):
  return (regions[r][3], regions[r][4])

def heavier(a, b, regions=REGIONS):
  return sum(regions[x][2] for x in a) >= sum(regions[x][2] for x in b)

def detect(sel, adj=ADJ, regions=REGIONS, bloc_of=None, live_regions=None, enabled=None):
  """Return (patternKey, scoringSet). sel is a tuple/set of region ids (1..5)."""
  bloc_of = bloc_of or (lambda r: regions[r][1])
  sel = set(sel)
  n = len(sel)
  comps = components(sel, adj)
  big = max(comps, key=len)
  found = []
  blocs = {bloc_of(r) for r in sel}
  # AROUND THE WORLD
  if n == 5 and len(big) == 5 and len(blocs) == 5:
    found.append(('AROUND', sel))
  # WHOLE BLOC: pins cover every live region of one bloc (3..5 regions)
  if live_regions is not None:
    for b in blocs:
      members = {r for r in live_regions if bloc_of(r) == b}
      if 3 <= len(members) <= 5 and members <= sel:
        found.append(('WHOLE', members))
  if n == 5 and len(blocs) == 1:
    found.append(('BLOC', sel))
  if n == 5 and len(big) == 5:
    found.append(('NETWORK', sel))
  # SURROUND: an unpinned region with >=3 neighbours, all pinned
  best_s = None
  for r in regions:
    if r in sel: continue
    nb = adj[r]
    if len(nb) >= SURR_MIN and nb <= sel:
      if best_s is None or heavier(nb, best_s, regions): best_s = set(nb)
  if best_s is not None:
    found.append(('SURR', best_s))
  if len(big) >= 4:
    # FRONT: exactly the 4 heaviest connected? if comp has 4 -> that comp
    if len(big) == 4:
      found.append(('FRONT', big))
  if n == 5 and len(blocs) == 5:
    found.append(('WORLD', sel))
  if len(big) == 3:
    found.append(('CHAIN', big))
  # TWO LINKS: two disjoint joined pairs among comps
  pairs = [c for c in comps if len(c) == 2]
  if len(pairs) >= 2:
    found.append(('TWOLINK', pairs[0] | pairs[1]))
  if len(big) >= 2:
    if len(big) == 2:
      best_pair = max(pairs, key=lambda c: sum(regions[x][2] for x in c))
      found.append(('LINK', best_pair))
  found.append(('SINGLE', {max(sel, key=lambda r: (regions[r][2], -regions[r][3]))}))
  if enabled is not None:
    found = [f for f in found if f[0] in enabled]
  found.sort(key=lambda f: -RANK[f[0]])
  return found[0]
