import patterns as P, spread
def ladder(rows):
  P.LADDER[:] = rows
  P.RANK.clear(); P.RANK.update({k[0]: i for i, k in enumerate(rows)})
A = [('SINGLE','SINGLE',5,1,10,1),('LINK','LINK',10,2,15,1),('TWOLINK','TWO LINKS',20,2,20,1),
     ('WORLD','WORLDWIDE',25,2,25,2),('CHAIN','CHAIN',30,3,20,2),('FRONT','FRONT',45,4,25,3),
     ('SURR','SURROUND',50,5,30,3),('NETWORK','NETWORK',70,6,35,3),('BLOC','BLOC',90,8,40,4),
     ('WHOLE','WHOLE BLOC',140,12,50,4),('AROUND','AROUND THE WORLD',180,15,50,5)]
B = [r if r[0]!='WORLD' else ('WORLD','WORLDWIDE',30,2,25,2) for r in A]
C = [r if r[0]!='CHAIN' else ('CHAIN','CHAIN',25,3,20,2) for r in A]
C = [r if r[0]!='WORLD' else ('WORLD','WORLDWIDE',30,2,25,2) for r in C]
for name, rows in [('A w25x2 below chain', A), ('B w30x2', B), ('C w30x2 c25x3', C)]:
  ladder(rows); print('=====', name); spread.run(2000)
