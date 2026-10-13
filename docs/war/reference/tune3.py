import engine, spread, patterns as P
for m in (3,4):
  P.SURR_MIN = m
  print('==== SURR_MIN', m); spread.run(2500)
