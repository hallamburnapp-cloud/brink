import engine, random, itertools, statistics
from collections import Counter
from board import REGIONS, ADJ
import patterns as P
lad = {k[0]: (k[2], k[3]) for k in P.LADDER}
def sc(sel, hot):
  k, s = P.detect(sel); bI, bM = lad[k]
  return k, (bI + sum(REGIONS[r][2] for r in s) + (REGIONS[hot][2] if hot in s else 0)) * bM
rng = random.Random(3); regs = list(REGIONS); N = 800
best_pat = Counter(); gain = []; nets = 0
for _ in range(N):
  deal = rng.sample(regs, 8); hot = deal[0]
  plain = max((sc(sel, hot) for n in range(1,6) for sel in itertools.combinations(deal, n)), key=lambda x: x[1])
  air = plain
  for n in range(1,5):
    for sel in itertools.combinations(deal, n):
      for a in regs:
        if a in deal: continue
        if not any(a in ADJ[s] for s in sel): continue
        r = sc(sel + (a,), hot)
        if r[1] > air[1]: air = r
  best_pat[air[0]] += 1; gain.append(air[1] / plain[1])
gain.sort()
print('touching-airlift: best pattern', {k: '%.1f%%' % (100*v/N) for k, v in best_pat.most_common()})
print('gain over no-airlift best: median %.2f p10 %.2f p90 %.2f' % (gain[N//2], gain[N//10], gain[9*N//10]))
