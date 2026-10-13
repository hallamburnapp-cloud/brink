import random, itertools, statistics, sys
from engine import World, score

def best_play(w, lit, hot, avail_air, pile_unlit, twist):
  best = (-1, None, None)
  ns = [5] if twist == 'FULLTABLE' else range(1, 6)
  for n in ns:
    for sel in itertools.combinations(lit, n):
      lev, k, sc, top = score(w, sel, lit, hot, twist)
      if lev > best[0]: best = (lev, sel, None)
  bair = (-1, None, None)
  if avail_air:
    for n in ([4] if twist == 'FULLTABLE' else range(0, 5)):
      for sel in itertools.combinations(lit, n):
        for a in pile_unlit:
          lev, k, sc, top = score(w, sel + (a,), lit, hot, twist)
          if lev > bair[0]: bair = (lev, sel + (a,), a)
  return best, bair

def play_crisis(w, target, rng, sweeps=4, swaps=3, use_air=True, twist=None, verbose=False):
  live = [r for r in w.reg if not w.reg[r]['retired']]
  pile = live[:]; rng.shuffle(pile)
  hot = pile[0]
  lit = pile[:8]; pile = pile[8:]
  total = 0; air = use_air; used = 0; spent = []
  def refill():
    nonlocal pile, spent
    need = 8 - len(lit)
    if need > len(pile):
      rng.shuffle(spent); pile += spent; spent = []
    lit.extend(pile[:need]); del pile[:need]
  while sweeps > 0:
    remaining = target - total
    best, bair = best_play(w, lit, hot, air, pile, twist)
    # swap decision
    while swaps > 0 and best[0] * sweeps < remaining * 0.8 and max(best[0], bair[0]) * sweeps < remaining * 0.8:
      lev, k, sc, _ = score(w, best[1], lit, hot, twist)
      out = sorted([r for r in lit if r not in sc], key=lambda r: w.reg[r]['w'])[:5]
      if not out: break
      for r in out: lit.remove(r); spent.append(r)
      refill()
      swaps -= 1
      best, bair = best_play(w, lit, hot, air, pile, twist)
    pick = best
    if air and bair[0] > 0 and (bair[0] >= 1.5 * best[0] or sweeps == 1 or (best[0] < remaining <= bair[0])):
      pick = bair
    lev, k, sc, top = score(w, pick[1], lit, hot, twist, commit=True)
    if verbose: print('  sweep', k, lev, pick[1])
    total += lev; sweeps -= 1; used += 1
    if pick[2] is not None:
      air = False; pile.remove(pick[2]) if pick[2] in pile else None
    for r in pick[1]:
      if r in lit: lit.remove(r)
      spent.append(r)
    refill()
    if total >= target:
      return True, total, sweeps, top
  return False, total, sweeps, None

if __name__ == '__main__':
  N = int(sys.argv[1]) if len(sys.argv) > 1 else 200
  for air in (False, True):
    for target in (300, 450, 600, 900):
      rng = random.Random(7)
      wins = 0; totals = []
      for i in range(N):
        w = World()
        ok, tot, left, top = play_crisis(w, target, rng, use_air=air)
        wins += ok; totals.append(tot)
      print('air=%s target %d: clear %.0f%%  median total-at-end %d' % (air, target, 100 * wins / N, statistics.median(totals)))
