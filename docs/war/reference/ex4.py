from engine import World, score, show
def mk(order):
  w = World()
  w.levels['NETWORK'] = 6
  for a,b,t in [('EDV','MRD',6),('MRD','TRN',9),('TRN','LNK',7),('GUL','TRN',4),('GUL','LNK',3)]:
    w.traffic[frozenset((a,b))] = t
  w.reg['LNK']['pins'] = 2
  w.staff=[{'id':s} for s in order]
  return w
lit = ['EDV','MRD','TRN','LNK','GUL','ICW','HRT','BRK']
sel = ('EDV','MRD','TRN','LNK','GUL')
for order in (['HERALD','GOVERNOR','SIGNALS','DEPUTY','SOVEREIGN'], ['HERALD','SIGNALS','DEPUTY','SOVEREIGN','GOVERNOR'], ['HERALD','GOVERNOR','DEPUTY','SIGNALS','SOVEREIGN']):
  w = mk(order); t=[]; r = score(w, sel, lit, None, trace=t); print(order, r[0], '%.3e'%r[0], r[1])
  if order[1]=='GOVERNOR' and order[2]=='SIGNALS': show(t)
