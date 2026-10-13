import random, itertools, statistics, sys
from collections import Counter
from board import REGIONS, ADJ
import patterns as P

def score_plain(sel, hot, ladder):
  k, scoring = P.detect(sel)
  bI, bM = ladder[k]
  inf = bI + sum(REGIONS[r][2] for r in scoring) + (REGIONS[hot][2] if hot in scoring else 0)
  return k, inf * bM

def run(N=4000, seed=1, lit=8, airlift=False):
  ladder = {k[0]: (k[2], k[3]) for k in P.LADDER}
  rng = random.Random(seed)
  regs = list(REGIONS)
  ratios = []; ge3 = 0; bestpat = Counter(); avail = Counter(); bests = []; ratio2 = []
  for _ in range(N):
    deal = rng.sample(regs, lit)
    hot = deal[0]
    plays = []
    for n in range(1, 6):
      for sel in itertools.combinations(deal, n):
        plays.append(score_plain(sel, hot, ladder))
    if airlift:
      others = [r for r in regs if r not in deal]
      for n in range(0, 5):
        for sel in itertools.combinations(deal, n):
          for a in others:
            plays.append(score_plain(sel + (a,), hot, ladder))
    vals = sorted(v for _, v in plays)
    med = statistics.median(vals)
    bk, bv = max(plays, key=lambda p: p[1])
    ratios.append(bv / med); ge3 += bv >= 3 * med
    bestpat[bk] += 1; bests.append(bv)
    for k in {p[0] for p in plays}: avail[k] += 1
    other = max((v for k, v in plays if k != bk), default=0)
    ratio2.append(bv / other if other else 99)
  ratios.sort(); bests.sort(); ratio2.sort()
  q = lambda a, p: a[int(p * (len(a) - 1))]
  print(f'lit={lit} airlift={airlift} N={N}')
  print('best/median: median %.1f p10 %.1f p90 %.1f; >=3x in %.1f%%' % (q(ratios,.5), q(ratios,.1), q(ratios,.9), 100*ge3/N))
  print('best/next-pattern: median %.2f p10 %.2f p90 %.2f' % (q(ratio2,.5), q(ratio2,.1), q(ratio2,.9)))
  print('best score: p10 %d median %d p90 %d' % (q(bests,.1), q(bests,.5), q(bests,.9)))
  for k, *_ in P.LADDER:
    print('  %-8s available %5.1f%%  best %5.1f%%' % (k, 100*avail[k]/N, 100*bestpat[k]/N))

if __name__ == '__main__':
  run(int(sys.argv[1]) if len(sys.argv) > 1 else 3000, airlift=('air' in sys.argv))
