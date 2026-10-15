"""Replays TypeScript games in the Python reference (docs/war/v2/reference) on identical inputs.

    python3 replay.py games.jsonl     (one game a line, written by replay.ts; `tools/war-sim.ts --replay N` runs it)

The TypeScript engine draws from its own seeded generator (src/engine/rng.ts: xoshiro128** seeded
by FNV-1a and splitmix32, forked into 'war', 'crisis', 'deal' and 'shop' streams; each bot's own
stream is seeded '<seed>:bot'). This script ports that generator and hands it to the unmodified
reference in place of Python's random.Random, so rules.py and bots.py deal, draw and decide exactly
as the TypeScript game did. Every game is then played by the reference's own play() and compared
with the TypeScript game turn by turn, and calibrate.py's own gates are computed on the replayed
games. Prints one JSON object: {games, turns, identical, differences, gates}.

One ruling differs on purpose: the TypeScript engine refuses a SWAP when the pile is empty (the
engine README), where the reference plays it as a no-op. Such a swap is logged here as not made,
as the TypeScript game logs it (it only changes the time model, by 7 s).
"""
import json
import math
import os
import sys
from multiprocessing import Pool

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'docs', 'war', 'v2', 'reference'))

import bots as B  # noqa: E402
import calibrate as C  # noqa: E402
import rules as R  # noqa: E402

# ----------------------------------------------------------------- src/engine/rng.ts, in Python
M32 = 0xFFFFFFFF


def i32(x):
    """JavaScript's ToInt32."""
    x &= M32
    return x - 0x100000000 if x & 0x80000000 else x


def imul(a, b):
    return i32((a & M32) * (b & M32))


def rotl(x, k):
    return ((x << k) | ((x & M32) >> (32 - k))) & M32


def fnv1a32(text, seed):
    h = (0x811C9DC5 ^ seed) & M32
    for ch in text:
        h ^= ord(ch)  # charCodeAt: the seeds are ASCII
        h = (h * 0x01000193) & M32
    return h


def splitmix32(a):
    state = [a]

    def nxt():
        a = i32(state[0] + 0x9E3779B9)
        state[0] = a
        t = a ^ ((a & M32) >> 16)
        t = imul(t, 0x21F0AAAD)
        t = t ^ ((t & M32) >> 15)
        t = imul(t, 0x735A2D97)
        return (t ^ ((t & M32) >> 15)) & M32

    return nxt


class TsRandom:
    """rng.ts's Rng, with the methods of random.Random that the reference calls."""

    def __init__(self, seed):
        mix = splitmix32(fnv1a32(seed, 0x2545F491))
        self.s = [mix(), mix(), mix(), mix()]
        if not any(self.s):
            self.s[0] = 0x9E3779B9

    def fork(self, label):
        return TsRandom('%s:%d:%d:%d:%d' % (label, *self.s))

    def random(self):
        s = self.s
        result = imul(rotl(imul(s[1], 5) & M32, 7), 9) & M32
        t = (s[1] << 9) & M32
        s[2] = i32(s[2] ^ s[0])
        s[3] = i32(s[3] ^ s[1])
        s[1] = i32(s[1] ^ s[2])
        s[0] = i32(s[0] ^ s[3])
        s[2] = i32(s[2] ^ t)
        s[3] = rotl(s[3], 11)
        return result / 4294967296

    def _int(self, n):
        return math.floor(self.random() * n)

    def randint(self, a, b):
        return a + self._int(b - a + 1)

    def choice(self, seq):
        return seq[self._int(len(seq))]

    def shuffle(self, x):
        for i in range(len(x) - 1, 0, -1):
            j = self._int(i + 1)
            x[i], x[j] = x[j], x[i]


STREAMS = ('war', 'crisis', 'deal', 'shop')


class RandomModule:
    """Stands in for the `random` module inside rules.py and bots.py: the reference names its streams
    '<seed>:war' ... and '<seed>:bot'; the TypeScript game forks the first four from Rng(seed) and
    seeds a bot's stream Rng('<seed>:bot')."""

    @staticmethod
    def Random(name):
        seed, _, label = name.rpartition(':')
        return TsRandom(seed).fork(label) if label in STREAMS else TsRandom(name)


R.random = RandomModule
B.random = RandomModule

# ----------------------------------------------------------------- what the comparison reads
_begin_turn, _swap, _send, _close_shop = R.Game.begin_turn, R.Game.swap, R.Game.send, R.Game.close_shop


def begin_turn(self):
    self.refused_swap = False
    _begin_turn(self)


def swap(self, pins):
    if not self.pile:
        self.refused_swap = True
    _swap(self, pins)


def send(self, pins):
    rec = _send(self, pins)
    rec['sent'] = sorted(pins)
    if self.refused_swap:
        rec['swaps'] = 0
    return rec


def close_shop(self):
    self.log[-1]['seats_after'] = list(self.seats)
    self.log[-1]['coins_after'] = self.coins
    _close_shop(self)


R.Game.begin_turn, R.Game.swap, R.Game.send, R.Game.close_shop = begin_turn, swap, send, close_shop


# ----------------------------------------------------------------- replay and compare
def compare(ts, r):
    where = '%s %s' % (ts['bot'], ts['seed'])
    for a, b in zip(r['log'], ts['log']):
        fields = [
            ('crisis', a['crisis'], b['crisis']),
            ('pins', a['sent'], b['sent']),
            ('score', str(a['score']), b['score']),
            ('regions won', a['won'], b['won']),
            ('regions recoloured', a['regions'], b['recoloured']),
            ('swaps', a['swaps'], b['swaps']),
            ('firing staff', a['firing'], b['firing']),
            ('pops', a['pops'], b['pops']),
            ('gold', a['gold'], b['gold']),
            ('war', a['red'], b['red']),
            ('grey', a['grey'], b['grey']),
            ('coins', a['coins'], b['coins']),
            ('war spread to', a['spread'], b['spread']),
            ('final push', a['final'], b['finalPush']),
            ('pinned the crisis', a['on_crisis'], b['onCrisis']),
            ('shop affordable', a.get('shop_affordable'), b.get('shopAffordable')),
            ('staff bought', a.get('bought'), b.get('bought')),
            ('line-up after the shop', a.get('seats_after'), b.get('seats')),
            ('coins after the shop', a.get('coins_after'), b.get('coinsAfterShop')),
        ]
        diffs = ['%s turn %d %s: reference %s, TypeScript %s' % (where, a['turn'], name, x, y) for name, x, y in fields if x != y]
        if diffs:
            return diffs  # the first turn that differs; later turns would only echo it
    game = [
        ('ending', r['end'], ts['end']),
        ('turns', r['turns'], ts['turns']),
        ('gold', r['gold'], ts['gold']),
        ('war', r['red'], ts['red']),
        ('final line-up', r['seats'], ts['seats']),
    ]
    return ['%s %s: reference %s, TypeScript %s' % (where, name, x, y) for name, x, y in game if x != y]


def replay(line):
    """Play one game (a JSON line) in the reference; returns (bot, differences, turns, calibrate's digest)."""
    ts = json.loads(line)
    captured = {}
    play = B.play

    def capture(seed, bot, *a, **k):
        r = play(seed, bot, *a, **k)
        captured.update(r, log=list(r['log']))
        return r

    B.play = capture
    try:
        digest = C._job((ts['bot'], ts['seed']))
    finally:
        B.play = play
    return ts['bot'], compare(ts, captured), len(captured['log']), digest


def main():
    out = dict(games=0, turns=0, identical=0, differences=[], gates=[])
    by_bot = {}
    with open(sys.argv[1], encoding='utf-8') as f, Pool(os.cpu_count() or 2) as pool:
        results = list(pool.imap(replay, (line for line in f if line.strip()), chunksize=20))
    for bot, diffs, turns, digest in results:
        out['games'] += 1
        out['turns'] += turns
        out['identical'] += 0 if diffs else 1
        out['differences'] += diffs
        by_bot.setdefault(bot, []).append(digest)
    if set(C.BOT_ORDER) <= set(by_bot):
        S = {b: C.summarize(rs) for b, rs in by_bot.items()}
        out['gates'] = [[name.split()[0], str(value), bool(ok)] for name, value, ok in C.gates(S)]
    print(json.dumps(out))


if __name__ == '__main__':
    main()
