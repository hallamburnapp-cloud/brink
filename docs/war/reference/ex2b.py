import itertools, statistics
from engine import World, score, show
w = World()
lit2 = ['EDV','QLN','NWK','ICW','HRT','FRM','WNM','WMS']
t=[]; print(score(w,('NWK','FRM','WNM','WMS'),lit2,None,trace=t)); show(t)
vals=[]; best=[]
for n in range(1,6):
  for sel in itertools.combinations(lit2,n):
    lev,k,sc,top=score(w,sel,lit2,None); vals.append(lev); best.append((lev,k,sel))
best.sort(reverse=True)
print('deal2 median',statistics.median(vals),'top',best[:4])
