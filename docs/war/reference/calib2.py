import random, statistics, sys
from engine import World
from crisis import play_crisis
N = int(sys.argv[1])
B = {'bare': [], 'duty': ['DUTY'], 'duty+hotline': ['DUTY','HOTLINE'],
     'hotline+duty+strategist': ['HOTLINE','DUTY','STRATEGIST'],
     'harbour+hotline+duty+strategist': ['HARBOUR','HOTLINE','DUTY','STRATEGIST']}
jobs = [('bare',[1350,1800,2500],None), ('bare',[600],'GRIDLOCK'),
        ('duty',[1800,2500,3750],None), ('duty+hotline',[1800],'BLACKOUT'),
        ('duty+hotline',[2500,3750,5000],None), ('hotline+duty+strategist',[3750,5000,9000],None),
        ('hotline+duty+strategist',[5000],'FULLTABLE'), ('harbour+hotline+duty+strategist',[9000,12000],None)]
for name, ts, tw in jobs:
  for t in ts:
    rng = random.Random(5); wins = 0; tots = []
    for i in range(N):
      w = World(); w.staff = [{'id': s} for s in B[name]]
      twist = ('BLACKOUT', rng.choice(['CAP','HMR','SCT','SND','FRS'])) if tw == 'BLACKOUT' else tw
      ok, tot, left, top = play_crisis(w, t, rng, use_air=False, twist=twist)
      wins += ok; tots.append(tot)
    print(f'{name:34s} {str(tw):9s} target {t:6d} clear {100*wins/N:5.1f}%  median total {statistics.median(tots):.0f}', flush=True)
