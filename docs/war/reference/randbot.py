import random
from engine import World, score
def crisis(target, rng, pick):
  w = World(); live = list(w.reg); rng.shuffle(live); hot = live[0]; lit = live[:8]; pile = live[8:]; spent=[]; total=0
  for s in range(4):
    sel = pick(lit, rng)
    lev = score(w, sel, lit, hot, commit=True)[0]; total += lev
    for r in sel: lit.remove(r); spent.append(r)
    need = 8-len(lit)
    if need > len(pile): rng.shuffle(spent); pile += spent; spent=[]
    lit += pile[:need]; del pile[:need]
    if total >= target: return True
  return False
def rand_pick(lit, rng):
  n = rng.randint(1,5); return tuple(rng.sample(lit, n))
def five_pick(lit, rng):
  return tuple(rng.sample(lit, 5))
for name, p in (('random 1-5 pins', rand_pick), ('random 5 pins', five_pick)):
  for t in (300,450,600,900,1350):
    rng = random.Random(2); N=2000
    print(name, t, '%.1f%%' % (100*sum(crisis(t, rng, p) for _ in range(N))/N))
