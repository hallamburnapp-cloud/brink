from engine import World, score, show
def mk():
  w = World()
  w.levels['NETWORK'] = 3
  w.reg['KLP']['stamp'] = 'FORTIFY'
  for a,b,t in [('SHL','LTL',2),('LTL','TLM',3),('KLP','TLM',2),('KLM','KLP',1)]:
    w.traffic[frozenset((a,b))] = t
  return w
lit = ['SHL','LTL','TLM','KLP','KLM','EDV','ICW','DRF']
sel = ('SHL','LTL','TLM','KLP','KLM')
for staff in (['HARBOUR','HOTLINE','STRATEGIST'], ['HARBOUR','STRATEGIST','HOTLINE'], []):
  w = mk(); w.staff=[{'id':s} for s in staff]
  t=[]; r = score(w, sel, lit, 'TLM', trace=t); print(staff, r[0], r[1], r[3]); 
  if staff and staff[1]=='HOTLINE': show(t)
w = mk(); w.staff=[{'id':s} for s in ['HARBOUR','HOTLINE','STRATEGIST']]
t=[]; print('chain alt', score(w, ('LTL','TLM','DNM'), lit+['DNM'], 'TLM', trace=t)[:2])
t=[]; print('chain alt2', score(w, ('LTL','TLM','KLP'), lit, 'TLM', trace=t)[:2])
