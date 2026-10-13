import sys, patterns as P, spread
variants = {
 'w20x3': {'WORLD': (20,3)},
 'w25x2': {'WORLD': (25,2)},
 'w15x3_c25': {'WORLD': (15,3), 'CHAIN': (25,3)},
 'w20x3_f50': {'WORLD': (20,3), 'FRONT': (50,4)},
}
base = {k[0]: list(k) for k in P.LADDER}
for name, ch in variants.items():
  lad = []
  for k in P.LADDER:
    k = list(k)
    if k[0] in ch: k[2], k[3] = ch[k[0]]
    lad.append(tuple(k))
  P.LADDER[:] = lad
  print('=====', name)
  spread.run(2000)
