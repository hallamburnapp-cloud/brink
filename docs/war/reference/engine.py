"""Reference scoring engine for the winner design (prototype rules).
Momentum is held in integer TENTHS. Influence is an integer. Leverage = floor(I * M10 / 10).
"""
import itertools, copy
from board import REGIONS, LAND, LANES
import patterns as P

LADDER = [
  ('SINGLE','SINGLE',5,1,10,1),('LINK','LINK',10,2,15,1),('TWOLINK','TWO LINKS',20,2,20,1),
  ('WORLD','WORLDWIDE',30,2,25,2),('CHAIN','CHAIN',30,3,20,2),('FRONT','FRONT',45,4,25,3),
  ('SURR','SURROUND',50,5,30,3),('NETWORK','NETWORK',70,6,35,3),('BLOC','BLOC',90,8,40,4),
  ('WHOLE','WHOLE BLOC',140,12,50,4),('AROUND','AROUND THE WORLD',180,15,50,5)]
P.LADDER[:] = LADDER
P.RANK.clear(); P.RANK.update({k[0]: i for i, k in enumerate(LADDER)})
LAD = {k[0]: k for k in LADDER}

def mul10(m10, num, den):
  """multiply tenths by num/den, floor to tenths"""
  return (m10 * num) // den

class World:
  def __init__(self):
    self.reg = {r: dict(name=v[0], bloc=v[1], w=v[2], x=v[3], y=v[4], cap=v[5], port=False,
                        stamp=None, pins=0, retired=False) for r, v in REGIONS.items()}
    for a, b in LANES:
      self.reg[a]['port'] = True; self.reg[b]['port'] = True
    self.joins = set(frozenset(e) for e in list(LAND) + list(LANES))
    self.lanes = set(frozenset(e) for e in LANES)
    self.cables = set()
    self.traffic = {}
    self.levels = {k[0]: 1 for k in LADDER}
    self.staff = []  # list of dicts {id, var}
    self.funds = 5

  def adj(self, gridlock=False):
    has = lambda s: any(x['id'] == s for x in self.staff)
    a = {r: set() for r in self.reg if not self.reg[r]['retired']}
    for j in self.joins | self.cables:
      if gridlock and (j in self.lanes or j in self.cables): continue
      x, y = tuple(j)
      if x in a and y in a: a[x].add(y); a[y].add(x)
    if has('FERRY') and not gridlock:
      ports = [r for r in a if self.reg[r]['port']]
      for x, y in itertools.combinations(ports, 2):
        a[x].add(y); a[y].add(x)
    return a

def eff_staff(staff):
  """Resolve Deputy copies: returns list of effective ids in seat order."""
  out = []
  for i, s in enumerate(staff):
    if s['id'] == 'DEPUTY':
      j = i + 1
      while j < len(staff) and staff[j]['id'] == 'DEPUTY': j += 1
      out.append(dict(staff[j]) if j < len(staff) else {'id': 'NONE'})
    else:
      out.append(s)
  return out

def score(world, sel, lit, hot=None, twist=None, trace=None, commit=False):
  """sel: pinned regions; lit: currently lit regions (for standby). Returns leverage."""
  gridlock = twist == 'GRIDLOCK'
  adj = world.adj(gridlock)
  st = eff_staff(world.staff)
  ids = [s['id'] for s in st]
  is_cap = (lambda r: True) if 'HERALD' in ids else (lambda r: world.reg[r]['cap'])
  bloc_of = lambda r: world.reg[r]['bloc']
  regs_view = {r: (world.reg[r]['name'], world.reg[r]['bloc'], world.reg[r]['w'], world.reg[r]['x'], world.reg[r]['y'], world.reg[r]['cap']) for r in world.reg}
  live = [r for r in world.reg if not world.reg[r]['retired']]
  k, scoring = P.detect(sel, adj=adj, regions={r: regs_view[r] for r in live}, bloc_of=bloc_of, live_regions=live)
  _, name, bI, bM, lI, lM = LAD[k]
  lv = world.levels[k] - 1
  I = bI + lI * lv
  M10 = (bM + lM * lv) * 10
  log = trace if trace is not None else []
  log.append(('PATTERN', name, I, M10))
  order = sorted(scoring, key=lambda r: (world.reg[r]['x'], world.reg[r]['y']))
  scored = set(); contrib = {r: 0 for r in order}
  blackout = twist[1] if isinstance(twist, tuple) and twist[0] == 'BLACKOUT' else None
  for idx, r in enumerate(order):
    R = world.reg[r]
    if blackout and R['bloc'] == blackout:
      log.append(('DARK', r)); continue
    times = 1
    if r == hot: times += 1
    if R['stamp'] == 'ECHO': times += 1
    for s in st:
      if s['id'] == 'COURIER' and idx == 0: times += 1
      if s['id'] == 'SIGNALS' and is_cap(r): times += 1
    for t in range(times):
      gain = R['w'] + 5 * R['pins']
      I += gain; contrib[r] += gain
      log.append(('PIN', r, '+%d' % gain, I, M10))
      if t == 0:
        mult = 3 if 'RAILCLERK' in ids else 1
        for o in scored:
          j = frozenset((r, o))
          if o in adj[r]:
            tr = world.traffic.get(j, 0) * mult
            if tr:
              I += tr; contrib[r] += tr
              log.append(('THREAD', o, r, '+%d' % tr, I, M10))
      sp = R['stamp']
      if sp == 'FORTIFY': I += 20; contrib[r] += 20; log.append(('STAMP', r, 'FORTIFY +20', I, M10))
      if sp == 'BEACON': M10 += 40; log.append(('STAMP', r, 'BEACON +4', I, M10))
      if sp == 'RELAY': M10 = mul10(M10, 3, 2); log.append(('STAMP', r, 'RELAY x1.5', I, M10))
      for s in st:
        sid = s['id']
        if sid == 'HARBOUR' and R['port']: I += 15; contrib[r] += 15; log.append(('STAFF', sid, r, '+15', I, M10))
        if sid == 'SURVEYOR' and R['w'] <= 4: I += 15; contrib[r] += 15; log.append(('STAFF', sid, r, '+15', I, M10))
        if sid == 'GOVERNOR' and is_cap(r): M10 += 50; log.append(('STAFF', sid, r, '+5', I, M10))
        if sid == 'ADMIRAL' and R['port']: M10 = mul10(M10, 3, 2); log.append(('STAFF', sid, r, 'x1.5', I, M10))
        if sid == 'SOVEREIGN' and is_cap(r): M10 = M10 * 2; log.append(('STAFF', sid, r, 'x2', I, M10))
    scored.add(r)
  # STANDBY: lit, unpinned
  standby = sorted([r for r in lit if r not in sel], key=lambda r: (world.reg[r]['x'], world.reg[r]['y']))
  for r in standby:
    R = world.reg[r]
    if R['stamp'] == 'RESERVE': M10 = mul10(M10, 3, 2); log.append(('STANDBY', r, 'RESERVE x1.5', I, M10))
    for s in st:
      if s['id'] == 'CHIEF' and is_cap(r): M10 = mul10(M10, 3, 2); log.append(('STANDBY', r, 'CHIEF x1.5', I, M10))
  # DESK
  comps = P.components(scoring, adj)
  bigc = max(len(c) for c in comps) if comps else 0
  colours = len({bloc_of(r) for r in scoring})
  for s in st:
    sid = s['id']
    if sid == 'DUTY': M10 += 40
    elif sid == 'QM': I += 30
    elif sid == 'HOTLINE' and bigc >= 3: M10 += 80
    elif sid == 'MEDIATOR' and len(sel) <= 3: M10 *= 3
    elif sid == 'STRATEGIST' and bigc >= 4: M10 *= 2
    elif sid == 'ENVOY' and colours >= 4: M10 *= 2
    elif sid == 'OLDHAND': I += s.get('var', 0)
    else: continue
    log.append(('DESK', sid, I, M10))
  lev = (I * M10) // 10
  log.append(('SLAM', I, M10, lev))
  if commit:
    for x, y in itertools.combinations(scoring, 2):
      if y in adj[x]:
        j = frozenset((x, y)); world.traffic[j] = world.traffic.get(j, 0) + 1
    for s in world.staff:
      if s['id'] == 'OLDHAND': s['var'] = s.get('var', 0) + 5
  top = max(order, key=lambda r: (contrib[r], -world.reg[r]['x'])) if order else None
  return lev, k, scoring, top

def show(trace):
  for t in trace:
    print('   ', t)
