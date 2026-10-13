import random, statistics, sys
from engine import World
from crisis import play_crisis
N = int(sys.argv[1])
builds = {
 'bare': [],
 'duty': ['DUTY'],
 'duty+hotline': ['DUTY','HOTLINE'],
 'hotline+duty+strategist': ['HOTLINE','DUTY','STRATEGIST'],
 'harbour+hotline+strategist+envoy': ['HARBOUR','HOTLINE','STRATEGIST','ENVOY'],
}
targets = [int(x) for x in sys.argv[2].split(',')]
for name in sys.argv[3].split(','):
  for t in targets:
    rng = random.Random(11); wins = 0; tots = []
    for i in range(N):
      w = World(); w.staff = [{'id': s} for s in builds[name]]
      ok, tot, left, top = play_crisis(w, t, rng, use_air=True)
      wins += ok; tots.append(tot)
    print(f'{name:35s} target {t:6d} clear {100*wins/N:5.1f}%  median total {statistics.median(tots):.0f}', flush=True)
