"""The prototype map: 30 regions, 5 blocs, 390x520 portrait map frame.
Coordinates are region centres (pin positions) in map-frame points, origin top-left.
"""
import itertools

# id: (name, bloc, weight, x, y, capital)
REGIONS = {
  # THE CAP (north) - bloc CAP
  'NWK': ('Northwake',   'CAP', 4,  62,  44, False),
  'FRM': ('Frostmere',   'CAP', 3, 158,  36, False),
  'WMS': ('Wintermast',  'CAP',10, 258,  40, True),
  'WNM': ('Wenmoor',     'CAP', 6, 104, 100, False),
  'GLM': ('Glassmoor',   'CAP', 5, 204, 104, False),
  'KLM': ('Kellmark',    'CAP', 7, 316,  94, False),
  # HIGHMARCH (west) - bloc HMR
  'VSY': ('Vessary',     'HMR', 5,  38, 176, False),
  'RMH': ('Rimeholt',    'HMR', 3, 104, 170, False),
  'QLN': ('Quillon',     'HMR', 4,  30, 250, False),
  'EDV': ('Edda Vale',   'HMR',10,  92, 248, True),
  'ASK': ('Ashkettle',   'HMR', 6,  40, 330, False),
  'MRD': ('Morrow Downs','HMR', 7, 110, 322, False),
  # THE SCATTER (centre islands) - bloc SCT
  'GUL': ('Gullrest',    'SCT', 3, 176, 192, False),
  'DRF': ('Driftholm',   'SCT', 4, 226, 186, False),
  'TRN': ('Tern Isle',   'SCT', 5, 172, 258, False),
  'LNK': ('Lantern Key', 'SCT',10, 222, 258, True),
  'PBB': ('Pebbleby',    'SCT', 6, 178, 324, False),
  'SHL': ('Shoal',       'SCT', 7, 228, 324, False),
  # SUNDRY (east) - bloc SND
  'KLP': ('Kelpmouth',   'SND', 5, 298, 172, False),
  'BRK': ('Brackwater',  'SND', 4, 362, 172, False),
  'LTL': ('Lintel',      'SND', 6, 290, 250, False),
  'TLM': ('Tallowmere',  'SND',10, 342, 246, True),
  'DNM': ('Dunmarrow',   'SND', 3, 298, 330, False),
  'ORN': ('Orrinth',     'SND', 7, 356, 334, False),
  # FARSOUTH (south) - bloc FRS
  'BRN': ('Brindle Coast','FRS',6,  60, 418, False),
  'MRM': ('Marram',      'FRS',10, 192, 410, True),
  'FLE': ('Floe End',    'FRS', 7, 324, 418, False),
  'ICW': ('Iceward',     'FRS', 4,  98, 480, False),
  'SLW': ('Saltwhite',   'FRS', 3, 196, 486, False),
  'HRT': ('Hearth',      'FRS', 5, 296, 480, False),
}

LAND = [
  # CAP (9)
  ('NWK','FRM'),('FRM','WMS'),('NWK','WNM'),('FRM','WNM'),('FRM','GLM'),
  ('WMS','GLM'),('WMS','KLM'),('WNM','GLM'),('GLM','KLM'),
  # HIGHMARCH (9)
  ('VSY','RMH'),('VSY','QLN'),('VSY','EDV'),('RMH','EDV'),('QLN','EDV'),
  ('QLN','ASK'),('EDV','ASK'),('EDV','MRD'),('ASK','MRD'),
  # SCATTER causeways (9)
  ('GUL','DRF'),('GUL','TRN'),('GUL','LNK'),('DRF','LNK'),('TRN','LNK'),
  ('TRN','PBB'),('LNK','PBB'),('LNK','SHL'),('PBB','SHL'),
  # SUNDRY (9)
  ('KLP','BRK'),('KLP','LTL'),('KLP','TLM'),('BRK','TLM'),('LTL','TLM'),
  ('LTL','DNM'),('TLM','DNM'),('TLM','ORN'),('DNM','ORN'),
  # FARSOUTH (9)
  ('BRN','MRM'),('MRM','FLE'),('BRN','ICW'),('MRM','ICW'),('MRM','SLW'),
  ('MRM','HRT'),('FLE','HRT'),('ICW','SLW'),('SLW','HRT'),
]

# sea lanes: every region has at most one, so 'Around the World' is impossible on the starting map
LANES = [
  ('NWK','VSY'),  # Cap - Highmarch (north-west strait)
  ('KLM','KLP'),  # Cap - Sundry (north-east strait)
  ('GLM','DRF'),  # Cap - Scatter
  ('RMH','GUL'),  # Highmarch - Scatter
  ('MRD','TRN'),  # Highmarch - Scatter
  ('ASK','BRN'),  # Highmarch - Farsouth (south-west strait)
  ('SHL','LTL'),  # Scatter - Sundry
  ('PBB','MRM'),  # Scatter - Farsouth
  ('ORN','FLE'),  # Sundry - Farsouth (south-east strait)
]

PORTS = sorted({a for l in LANES for a in l})

def build_adj(land=LAND, lanes=LANES, extra=()):
  adj = {r: set() for r in REGIONS}
  for a, b in list(land) + list(lanes) + list(extra):
    adj[a].add(b); adj[b].add(a)
  return adj

ADJ = build_adj()

def check():
  lane_count = {}
  for a, b in LANES:
    for r in (a, b):
      lane_count[r] = lane_count.get(r, 0) + 1
  assert max(lane_count.values()) == 1, lane_count
  for a, b in LANES:
    assert REGIONS[a][1] != REGIONS[b][1]
  for a, b in LAND:
    assert REGIONS[a][1] == REGIONS[b][1]
  degs = [len(ADJ[r]) for r in REGIONS]
  print('regions', len(REGIONS), 'joins', len(LAND) + len(LANES),
        'avg deg %.2f' % (sum(degs) / len(degs)), 'min', min(degs), 'max', max(degs))
  print('ports', len(PORTS), PORTS)
  for bloc in ['CAP','HMR','SCT','SND','FRS']:
    print(bloc, sum(v[2] for v in REGIONS.values() if v[1] == bloc))
  # min pairwise distance between pins
  import math
  md = min(math.dist(REGIONS[a][3:5], REGIONS[b][3:5]) for a, b in itertools.combinations(REGIONS, 2))
  print('min pin distance %.1f' % md)
  for a, b in itertools.combinations(REGIONS, 2):
    d = math.dist(REGIONS[a][3:5], REGIONS[b][3:5])
    if d < 52: print('  close', a, b, round(d, 1))

if __name__ == '__main__':
  check()
  for r in REGIONS:
    print(r, REGIONS[r][0], sorted(ADJ[r]))
