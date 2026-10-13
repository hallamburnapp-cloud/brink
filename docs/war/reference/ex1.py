import itertools, statistics
from engine import World, score, show
w = World()
lit = ['LNK','GUL','SHL','EDV','RMH','NWK','ICW','HRT']
hot = 'LNK'
for sel in [('LNK',), ('LNK','GUL'), ('LNK','GUL','SHL'), ('EDV','RMH'), ('GUL','RMH','EDV'), ('LNK','GUL','SHL','RMH'), ('GUL','RMH','EDV','LNK','SHL'), ('LNK','GUL','RMH','EDV','SHL')]:
  t=[]; lev,k,sc,top = score(w, sel, lit, hot, trace=t); print(sel, k, lev, sorted(sc))
# all plays
vals=[]
best=None
for n in range(1,6):
  for sel in itertools.combinations(lit,n):
    lev,k,sc,top=score(w,sel,lit,hot); vals.append(lev)
    if best is None or lev>best[0]: best=(lev,k,sel)
print('n plays',len(vals),'median',statistics.median(vals),'best',best)
t=[]; print(score(w,('GUL','RMH','EDV','LNK','SHL'),lit,hot,trace=t)); show(t)
