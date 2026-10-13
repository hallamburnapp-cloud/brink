import itertools, statistics
from engine import World, score, show
w = World()
lit = ['LNK','GUL','SHL','EDV','QLN','NWK','ICW','HRT']
t=[]; print(score(w,('LNK','GUL','SHL'),lit,'LNK',trace=t)); show(t)
lit2 = ['EDV','QLN','NWK','ICW','HRT','FRM','WNM','GLM']
vals=[]; best=None
for n in range(1,6):
  for sel in itertools.combinations(lit,n):
    lev,k,sc,top=score(w,sel,lit,'LNK'); vals.append(lev)
    if best is None or lev>best[0]: best=(lev,k,sel)
print('deal1 median',statistics.median(vals),'best',best)
t=[]; print(score(w,('NWK','FRM','WNM','GLM'),lit2,None,trace=t)); show(t)
vals=[]; best=None
for n in range(1,6):
  for sel in itertools.combinations(lit2,n):
    lev,k,sc,top=score(w,sel,lit2,None); vals.append(lev)
    if best is None or lev>best[0]: best=(lev,k,sel)
print('deal2 median',statistics.median(vals),'best',best)
