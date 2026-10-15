"""WIN THE WORLD: the reference rules for BRINK v2.

Pure Python 3, standard library only. This file is the rules; bots.py plays them, calibrate.py
measures them, examples.py prints every number the spec quotes, fixtures.py writes the cases the
TypeScript engine must match.

Arithmetic is integer only, exactly as the TypeScript engine does it with BigInt:
- POINTS is a whole number;
- the MULTIPLIER is held in tenths (M10 = 10 x multiplier) and every step is floored to a tenth
  (x1.5 is M10 * 15 // 10, x2 is M10 * 2, +4 is M10 + 40);
- SCORE = POINTS x M10 // 10.
Nothing depends on set or dict iteration order, so every run is the same on every machine.

The map is a byte-for-byte copy of src/war/content/map.json (30 regions, 45 land and causeway
joins, 9 sea lanes, 18 ports, 5 capitals).
"""
import json
import math
import os
import random
from collections import deque
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------------------------- map
_MAP = json.load(open(os.path.join(HERE, 'map.json'), encoding='utf-8'))
IDS = sorted(r['id'] for r in _MAP['regions'])
NAME = {r['id']: r['name'] for r in _MAP['regions']}
NUM = {r['id']: r['weight'] for r in _MAP['regions']}
CAPITAL = {r['id']: bool(r['capital']) for r in _MAP['regions']}
PORT = {r['id']: bool(r['port']) for r in _MAP['regions']}
X = {r['id']: r['x'] for r in _MAP['regions']}
Y = {r['id']: r['y'] for r in _MAP['regions']}
BLOC = {r['id']: r['colour'] for r in _MAP['regions']}
JOINS = [tuple(j) for j in _MAP['landJoins']] + [tuple(j) for j in _MAP['seaLanes']]
ADJ = {r: [] for r in IDS}
for _a, _b in JOINS:
    ADJ[_a].append(_b)
    ADJ[_b].append(_a)
for _r in IDS:
    ADJ[_r].sort()
ADJSET = {r: frozenset(ADJ[r]) for r in IDS}


def _bfs(src):
    d = {src: 0}
    q = deque([src])
    while q:
        r = q.popleft()
        for n in ADJ[r]:
            if n not in d:
                d[n] = d[r] + 1
                q.append(n)
    return d


DIST = {r: _bfs(r) for r in IDS}  # joins between any two regions (land, causeway or sea lane)


def west(r):
    """Scoring and display order: west to east, then north to south."""
    return (X[r], Y[r])


# ---------------------------------------------------------------------------------- tunables (final)
P = dict(
    HOME='LNK',            # Lantern Key starts gold: GOLD 1/30 from the first second
    START_WAR=3,           # war starts with 3 joined regions ...
    WAR_MIN_DIST=3,        # ... each at least 3 joins from home
    START_COINS=4,
    COIN_PER_REGION=1,     # every region won pays 1 coin; nothing else pays
    LOSE_AT=10,            # war holds 10: WAR
    LIT=10,                # regions lit each turn (the crisis region is lit as well) ...
    NEAR=3,                # ... dealt from the non-war regions within 3 joins of the crisis
    MAXPINS=5,             # the crisis region counts as a pin when pinned
    SWAPS=1,               # one swap a turn; pins stay
    T0=64, TR=(3, 2),      # target(t) = 64 x 1.5^(t-1), 2 significant figures
    LADDER=(4, 16),        # beat the target: 1 region; 4x: 2; 16x: 3 ...
    LADDER_THEN=2,         # ... then one more for every further doubling (32x: 4, 64x: 5, 128x: 6 ...)
    WAR_EVERY=3,           # after every 3rd turn, war spreads into one grey region on its own
    SHOP_FIRST=2,          # the first shop opens after turn 2 ...
    SHOP_EVERY=2,          # ... and then after every 2nd turn (4, 6, 8 ...)
    OFFERS=3, SEATS=5,
    REROLL=2,              # reroll costs 2, then 3, 4 ... in the same visit
    PUSH_MISSES=3,         # the final push forgives: a push miss changes no region; its 3rd miss is a CEASEFIRE
)

# The ten staff. id: (name, icon object, price, rule as printed (8 words or fewer), seat chip)
STAFF = {
    'DUTY':       ('Duty Officer',  'desk lamp',    3, '+4 multiplier.',                              '+4'),
    'QM':         ('Quartermaster', 'supply crate', 3, '+20 points.',                                 '+20'),
    'SURVEYOR':   ('Surveyor',      'theodolite',   4, '+1 multiplier for every 3 regions you hold.', '+{n}'),
    'OLDHAND':    ('Old Hand',      'tin mug',      4, '×1 multiplier. Grows by 0.2 every turn.',     '×{x}'),
    'SOVEREIGN':  ('Sovereign',     'signet ring',  5, '×2 multiplier for each capital pinned.',      '×2 CAPITAL'),
    'STRATEGIST': ('Strategist',    'folded map',   5, '×3 multiplier if you pin 4 or 5.',            '×3 IF 4+'),
    'GOVERNOR':   ('Governor',      'wax seal',     6, '×1.5 multiplier for each gold region pinned.', '×1.5 GOLD'),
    'HARBOUR':    ('Harbourmaster', "ship's bell",  6, '×1.5 multiplier for each port pinned.',       '×1.5 PORT'),
    'HERALD':     ('Herald',        'paper crown',  6, 'Every pin counts as a capital and port.',     'ALL PINS ★ ⚓'),
    'DEPUTY':     ('Deputy',        'carbon paper', 7, 'Copies the staff to its right.',              'COPY'),
}
STAFF_IDS = list(STAFF)  # the shop draws from this list (not seated), shuffled by the 'shop' stream
OLDHAND_START_M10 = 10   # x1.0 when hired
OLDHAND_STEP_M10 = 2     # +0.2 at the end of every turn it is seated


def price(s):
    return STAFF[s][2]


def sell_value(s):
    return STAFF[s][2] // 2


def rule_words(text):
    return len(text.split())


assert all(rule_words(v[3]) <= 8 for v in STAFF.values())


# ------------------------------------------------------------------------------------------ targets
def _nice(x):
    """Round a positive Fraction to 2 significant figures, halves up (62, 93, 140, 210, 310 ...)."""
    if x < 100:
        return int(x + Fraction(1, 2))
    digits = len(str(int(x)))
    mag = 10 ** (digits - 2)
    return int(x / mag + Fraction(1, 2)) * mag


def target(t):
    num, den = P['TR']
    return _nice(Fraction(P['T0']) * Fraction(num, den) ** (t - 1))


def marks(T, upto):
    """The scores that each win one more region: T, 4T, 16T, then each mark double the last
    (32T, 64T, 128T ...). Yields every mark <= upto, then the first one above it."""
    yield T
    m = 1
    rungs = list(P['LADDER'])
    while True:
        m = rungs.pop(0) if rungs else m * P['LADDER_THEN']
        yield T * m
        if T * m > upto:
            return


def regions_won(score, T):
    """0 below the target; otherwise the number of marks the score reaches."""
    k = 0
    for bar in marks(T, score):
        if score >= bar:
            k += 1
        else:
            break
    return k


def next_bar(score, T):
    """The score that wins one more region than `score` does (the readout's NEXT REGION AT)."""
    for bar in marks(T, score):
        if score < bar:
            return bar
    raise AssertionError


# ------------------------------------------------------------------------------------------ scoring
def effective(seats):
    """What each seat fires as: a Deputy fires as the staff to its right (nothing at the far right)."""
    out = []
    for i, s in enumerate(seats):
        if s == 'DEPUTY':
            out.append(seats[i + 1] if i + 1 < len(seats) and seats[i + 1] != 'DEPUTY' else None)
        else:
            out.append(s)
    return out


def score_pins(pins, seats, owner, crisis, oldhand_m10=OLDHAND_START_M10, trace=None):
    """Score a set of pins with the seated staff. Returns (score, points, m10).

    Order (this is also the animation order):
      1. each pin, west to east: +its number to POINTS, +1 to MULTIPLIER;
      2. each staff, seat 1 to 5 (a Deputy fires as the staff to its right); a per-region staff
         (Governor, Harbourmaster, Sovereign) fires once per matching pin, west to east;
      3. the crisis region pinned: x2 MULTIPLIER;
      4. SCORE = POINTS x MULTIPLIER, rounded down.
    `trace`, when a list, receives:
      ('pin', region, +n, points, m10)
      ('staff', seat (1-5), id it fires as, region or None, op, amount, points, m10)
          op '+P' (amount in points), '+M' (amount in tenths), 'xM' (amount is the factor as text)
      ('crisis', region, 'xM', '2', points, m10)
      ('slam', score)"""
    order = sorted(pins, key=west)
    held = sum(1 for r in IDS if owner[r] == 'gold')
    herald = 'HERALD' in seats
    pts, m10 = 0, 0
    for r in order:
        pts += NUM[r]
        m10 += 10
        if trace is not None:
            trace.append(('pin', r, NUM[r], pts, m10))
    for i, s in enumerate(effective(seats)):
        seat = i + 1
        if s is None or s == 'HERALD':
            continue
        ev = []
        if s == 'DUTY':
            m10 += 40
            ev.append((None, '+M', 40, pts, m10))
        elif s == 'QM':
            pts += 20
            ev.append((None, '+P', 20, pts, m10))
        elif s == 'SURVEYOR':
            add = 10 * (held // 3)
            m10 += add
            ev.append((None, '+M', add, pts, m10))
        elif s == 'OLDHAND':
            m10 = m10 * oldhand_m10 // 10
            ev.append((None, 'xM', '%d.%d' % divmod(oldhand_m10, 10), pts, m10))
        elif s == 'STRATEGIST':
            if len(order) >= 4:
                m10 *= 3
                ev.append((None, 'xM', '3', pts, m10))
        elif s in ('GOVERNOR', 'HARBOUR', 'SOVEREIGN'):
            if s == 'GOVERNOR':
                hits = [r for r in order if owner[r] == 'gold']
            elif s == 'HARBOUR':
                hits = [r for r in order if PORT[r] or herald]
            else:
                hits = [r for r in order if CAPITAL[r] or herald]
            for r in hits:
                if s == 'SOVEREIGN':
                    m10 *= 2
                    ev.append((r, 'xM', '2', pts, m10))
                else:
                    m10 = m10 * 15 // 10
                    ev.append((r, 'xM', '1.5', pts, m10))
        else:
            raise ValueError(s)
        if trace is not None:
            for r, op, amt, p_, m_ in ev:
                trace.append(('staff', seat, s, r, op, amt, p_, m_))
    if crisis in order:
        m10 *= 2
        if trace is not None:
            trace.append(('crisis', crisis, 'xM', '2', pts, m10))
    score = pts * m10 // 10
    if trace is not None:
        trace.append(('slam', score))
    return score, pts, m10


def feats(pins, owner, crisis):
    """What a score depends on: (points, pins, capitals, ports, gold pins, crisis pinned)."""
    return (sum(NUM[r] for r in pins), len(pins), sum(CAPITAL[r] for r in pins),
            sum(PORT[r] for r in pins), sum(1 for r in pins if owner[r] == 'gold'),
            1 if crisis in pins else 0)


def score_feats(f, eff, herald, held, oldhand_m10):
    """Fast scorer for the bots; equal to score_pins (checked by selftest)."""
    pts, n, caps, ports, gold, on_crisis = f
    if herald:
        caps = ports = n
    m10 = 10 * n
    for s in eff:
        if s is None or s == 'HERALD':
            continue
        if s == 'DUTY':
            m10 += 40
        elif s == 'QM':
            pts += 20
        elif s == 'SURVEYOR':
            m10 += 10 * (held // 3)
        elif s == 'OLDHAND':
            m10 = m10 * oldhand_m10 // 10
        elif s == 'STRATEGIST':
            if n >= 4:
                m10 *= 3
        elif s == 'GOVERNOR':
            for _ in range(gold):
                m10 = m10 * 15 // 10
        elif s == 'HARBOUR':
            for _ in range(ports):
                m10 = m10 * 15 // 10
        elif s == 'SOVEREIGN':
            m10 <<= caps
    if on_crisis:
        m10 *= 2
    return pts * m10 // 10


class Scorer:
    """Caches scores by feature tuple for one line-up and one map."""

    def __init__(self, seats, held, oldhand_m10):
        self.eff = effective(seats)
        self.herald = 'HERALD' in seats
        self.held = held
        self.old = oldhand_m10
        self.cache = {}

    def __call__(self, f):
        v = self.cache.get(f)
        if v is None:
            v = score_feats(f, self.eff, self.herald, self.held, self.old)
            self.cache[f] = v
        return v


# ------------------------------------------------------------------------------------- seat order
# Seats can be dragged during a turn, so what a deal can score depends on every order of the line-up,
# not only the one it sits in. Two seatings score alike when they fire the same staff in the same
# order up to what commutes: the Quartermaster's +20 points (points are only multiplied at the end),
# an idle Deputy and the Herald (they fire nothing), and neighbouring + multiplier staff (Duty
# Officer, Surveyor: whole tenths added, nothing floored between them).
ADDS_M = ('DUTY', 'SURVEYOR')


def order_key(seats):
    """Two seatings with the same key give every send the same score."""
    eff = effective(seats)
    out, run = [], []
    for s in eff:
        if s is None or s in ('HERALD', 'QM'):
            continue
        if s in ADDS_M:
            run.append(s)
        else:
            out += sorted(run) + [s]
            run = []
    out += sorted(run)
    return (sum(1 for s in eff if s == 'QM'), tuple(out))


def seat_orders(seats):
    """Every seating of these staff that can score differently, the seated order first; the rest in
    the order itertools.permutations meets them (seat indices, lexicographic). At most 120 for five
    seats, usually far fewer once seatings that score alike are merged."""
    import itertools
    seen, out = set(), []
    for p in itertools.permutations(range(len(seats))):
        o = [seats[i] for i in p]
        k = order_key(o)
        if k not in seen:
            seen.add(k)
            out.append(o)
    return out


def reduce_feats(fs):
    """The feature tuples that can be a deal's best send under some line-up. A score never falls when
    any feature grows (points, pins, capitals, ports, gold pins, the crisis pinned: every step of the
    multiplier is monotone and points multiply at the end), so a tuple another one matches or beats
    in every feature is dropped. Sorted, highest first."""
    top = {}
    for f in fs:
        k = f[1:]
        if top.get(k, -1) < f[0]:
            top[k] = f[0]
    out = []
    for f in sorted(((p,) + k for k, p in top.items()), reverse=True):
        # A tuple that dominates f is lexicographically larger, so it is already in out.
        if not any(all(a >= b for a, b in zip(g, f)) for g in out):
            out.append(f)
    return out


def order_state(fs, seats, held, oldhand_m10, T):
    """'live': some send of these feature tuples reaches T with the seats as they sit; 'reorder': none
    does as seated, but one does under another seating; 'dead': none does under any seating."""
    for i, o in enumerate(seat_orders(seats)):
        sc = Scorer(o, held, oldhand_m10)
        if any(sc(f) >= T for f in fs):
            return 'live' if i == 0 else 'reorder'
    return 'dead'


def best_seating(fs, seats, held, oldhand_m10):
    """The seating whose best send scores most (ties to the first in seat_orders), and that score."""
    best = None
    for o in seat_orders(seats):
        sc = Scorer(o, held, oldhand_m10)
        v = max([sc(f) for f in fs] or [0])
        if best is None or v > best[1]:
            best = (o, v)
    return best


# ------------------------------------------------------------------------------------- legal groups
def pinnable(lit, crisis):
    """The lit regions and the crisis region (always lit, always pinnable)."""
    return list(lit) + [crisis]


def touching(regions):
    """True when the regions form one touching group (land border, causeway or sea lane)."""
    nodes = set(regions)
    if not nodes:
        return False
    start = min(nodes)
    reach = {start}
    todo = [start]
    while todo:
        r = todo.pop()
        for n in ADJ[r]:
            if n in nodes and n not in reach:
                reach.add(n)
                todo.append(n)
    return reach == nodes


def legal(pins, lit, crisis):
    """1 to 5 distinct pinnable regions that touch each other."""
    pins = list(pins)
    if not 1 <= len(pins) <= P['MAXPINS'] or len(set(pins)) != len(pins):
        return False
    pool = set(pinnable(lit, crisis))
    return all(r in pool for r in pins) and touching(pins)


def groups(lit, crisis, maxk=None):
    """Every legal pin set, as sorted tuples."""
    maxk = maxk or P['MAXPINS']
    pool = set(pinnable(lit, crisis))
    frontier = {(r,) for r in pool}
    out = set(frontier)
    for _ in range(maxk - 1):
        nxt = set()
        for g in frontier:
            gs = set(g)
            for r in g:
                for n in ADJ[r]:
                    if n in pool and n not in gs:
                        nxt.add(tuple(sorted(gs | {n})))
        nxt -= out
        out |= nxt
        frontier = nxt
    return sorted(out)


def can_add(pins, r, lit, crisis):
    """The UI's tap rule: a pinnable region can be pinned if nothing is pinned yet or it touches a pin."""
    return (r in pinnable(lit, crisis) and r not in pins and len(pins) < P['MAXPINS']
            and (not pins or any(n in pins for n in ADJ[r])))


def lift(pins, r):
    """The UI's lift rule: `pins` in tap order; lifting r also lifts every pin no longer touching the
    group that holds the earliest remaining pin. Returns the pins left, in tap order."""
    left = [p for p in pins if p != r]
    if not left:
        return []
    keep = {left[0]}
    todo = [left[0]]
    while todo:
        x = todo.pop()
        for n in ADJ[x]:
            if n in left and n not in keep:
                keep.add(n)
                todo.append(n)
    return [p for p in left if p in keep]


# -------------------------------------------------------------------------------------- spread order
def win_order(crisis, owner, k, pins=()):
    """The k regions a winning send turns gold. Pin it to claim it: the crisis first; then the pinned
    regions that are not gold; then the other regions that are not gold. Within each of the last two
    groups the nearest go first (fewest joins from the crisis); at equal distance war's before grey,
    then the higher number, then west, then north."""
    key = lambda r: (DIST[crisis][r], 0 if owner[r] == 'red' else 1, -NUM[r], X[r], Y[r])
    pinned = set(pins)
    mine = sorted((r for r in IDS if r != crisis and r in pinned and owner[r] != 'gold'), key=key)
    rest = sorted((r for r in IDS if r != crisis and r not in pinned and owner[r] != 'gold'), key=key)
    return ([crisis] + mine + rest)[:k]


def war_spread_target(owner):
    """Where war spreads on its own: the grey region touching war that is nearest your gold, then the
    higher number, then west, then north. None when war holds nothing or no grey region touches it."""
    if not any(owner[r] == 'red' for r in IDS):
        return None
    cand = [r for r in IDS if owner[r] == 'grey' and any(owner[n] == 'red' for n in ADJ[r])]
    if not cand:
        return None
    gold = [r for r in IDS if owner[r] == 'gold']
    cand.sort(key=lambda r: (min(DIST[r][g] for g in gold), -NUM[r], X[r], Y[r]))
    return cand[0]


# ------------------------------------------------------------------------------------- scripted game
# The first game on a device uses seed FIRST-WORLD: war's start, turns 1-2 and the first shop are fixed.
# turn: (crisis, lit in deal order, the pile that refills a swap, in order)
FIRST_WORLD = dict(
    seed='FIRST-WORLD',
    war=['DNM', 'ORN', 'FLE'],
    turns={
        1: ('SHL', ['LNK', 'PBB', 'TRN', 'GUL', 'DRF', 'LTL', 'MRM', 'MRD', 'KLP', 'TLM'],
            ['BRN', 'ICW', 'RMH', 'SLW', 'GLM', 'HRT', 'KLM', 'BRK']),
        2: ('TRN', ['LNK', 'SHL', 'PBB', 'GUL', 'MRD', 'RMH', 'EDV', 'ASK', 'DRF', 'GLM'],
            ['MRM', 'QLN', 'VSY', 'BRN', 'ICW', 'SLW', 'LTL', 'HRT']),
    },
    shop={2: ['DUTY', 'QM', 'HARBOUR']},
)


# The readout's line before any pin, by deal_state() ('live' keeps its hint).
READOUT_LINE = {'reorder': 'REORDER STAFF TO WIN', 'dead': 'NO SEND CAN WIN'}


# --------------------------------------------------------------------------------------------- game
class Game:
    """One game. Owner of each region: 'grey' (free), 'gold' (yours, for good) or 'red' (war's).
    Seeded streams, each its own random.Random: war (start), crisis, deal, shop."""

    def __init__(self, seed, first_world=False):
        s = str(seed)
        self.seed = s
        self.first_world = first_world
        self.rng_war = random.Random(s + ':war')
        self.rng_crisis = random.Random(s + ':crisis')
        self.rng_deal = random.Random(s + ':deal')
        self.rng_shop = random.Random(s + ':shop')
        self.owner = {r: 'grey' for r in IDS}
        self.owner[P['HOME']] = 'gold'
        if first_world:
            for r in FIRST_WORLD['war']:
                self.owner[r] = 'red'
        else:
            self._place_war()
        self.coins = P['START_COINS']
        self.seats = []
        self.oldhand_m10 = OLDHAND_START_M10
        self.turn = 0
        self.result = None          # 'WORLD UNITED' | 'CEASEFIRE' | 'WAR'
        self.final_push = False
        self.push_misses = 0        # misses in the final push; the PUSH_MISSES-th ends the game (CEASEFIRE)
        self.crisis = None
        self.target = None
        self.lit = []
        self.pile = []
        self.opening_lit = []
        self.swaps_left = 0
        self.log = []
        self.offers = None
        self.reroll_cost = P['REROLL']
        self.shop_visits = 0

    # ------------------------------------------------------------------ setup
    def _place_war(self):
        far = [r for r in IDS if DIST[P['HOME']][r] >= P['WAR_MIN_DIST']]
        self.owner[self.rng_war.choice(far)] = 'red'
        while self.count('red') < P['START_WAR']:
            nb = sorted({n for r in IDS if self.owner[r] == 'red' for n in ADJ[r]
                         if self.owner[n] == 'grey' and DIST[P['HOME']][n] >= P['WAR_MIN_DIST']})
            self.owner[self.rng_war.choice(nb)] = 'red'

    def count(self, k):
        return sum(1 for r in IDS if self.owner[r] == k)

    # ------------------------------------------------------------------ a turn
    def crisis_pool(self):
        """Grey regions touching gold; if none, any grey region; if no grey is left (the final push),
        red regions touching gold. Returns (pool, final_push)."""
        grey = [r for r in IDS if self.owner[r] == 'grey']
        if grey:
            front = [r for r in grey if any(self.owner[n] == 'gold' for n in ADJ[r])]
            return front or grey, False
        red = [r for r in IDS if self.owner[r] == 'red' and any(self.owner[n] == 'gold' for n in ADJ[r])]
        assert red
        return red, True

    def push_winnable(self, c):
        """In the final push: some legal send on a fresh deal for crisis c could reach this turn's target
        with the best seating of the line-up. A fresh deal lights 10 of the pile (the regions that are
        not red, within NEAR joins of c), and any touching group of up to 5 of the pile and c can be
        among them, so every such group counts."""
        pile = [r for r in IDS if r != c and self.owner[r] != 'red' and DIST[c][r] <= P['NEAR']]
        fs = reduce_feats({feats(g, self.owner, c) for g in groups(pile, c)})
        return order_state(fs, self.seats, self.count('gold'), self.oldhand_m10, self.target) != 'dead'

    def push_pool(self, red):
        """The final push draws its crisis from the red regions touching gold that the line-up can win on
        some fresh deal (with its best seating), when there are any, so its three misses are spent on
        real chances; otherwise from all of them. Sets push_draw: 'winnable' or 'any'."""
        ok = [c for c in red if self.push_winnable(c)]
        self.push_draw = 'winnable' if ok else 'any'
        return ok or red

    def begin_turn(self):
        self.turn += 1
        self.target = target(self.turn)
        script = FIRST_WORLD['turns'].get(self.turn) if self.first_world else None
        pool, self.final_push = self.crisis_pool()
        self.push_draw = None
        if self.final_push:
            pool = self.push_pool(pool)
        pick = self.rng_crisis.choice(pool)
        if script:
            assert script[0] in pool, (self.turn, script[0])
            self.crisis = script[0]
            assert all(DIST[self.crisis][r] <= P['NEAR'] for r in script[1] + script[2])
            ok = [r for r in script[1] + script[2] if self.owner[r] != 'red' and r != self.crisis]
            self.lit, self.pile = ok[:P['LIT']], ok[P['LIT']:]
        else:
            self.crisis = pick
            self._deal()
        self.swaps_left = P['SWAPS']
        self.opening_lit = list(self.lit)

    def _deal(self):
        """Light LIT regions, shuffled from the non-war regions within NEAR joins of the crisis. If
        none of them touches the crisis, the first one in the pile that does replaces the last lit."""
        c = self.crisis
        pile = [r for r in IDS if r != c and self.owner[r] != 'red' and DIST[c][r] <= P['NEAR']]
        self.rng_deal.shuffle(pile)
        n = P['LIT']
        if not any(r in ADJSET[c] for r in pile[:n]):
            for j in range(n, len(pile)):
                if pile[j] in ADJSET[c]:
                    pile[n - 1], pile[j] = pile[j], pile[n - 1]
                    break
        self.lit = pile[:n]
        self.pile = pile[n:]

    def swap(self, pins):
        """Every lit region not pinned goes dark and to the bottom of the pile; as many new ones light
        from the top. Pins (and the crisis) stay. If the pile runs short, dark ones come back."""
        assert self.swaps_left > 0
        keep = [r for r in self.lit if r in set(pins)]
        out = [r for r in self.lit if r not in set(pins)]
        need = len(out)
        self.pile += out
        new = self.pile[:need]
        self.pile = self.pile[need:]
        self.lit = keep + new
        self.swaps_left -= 1

    def scorer(self, seats=None):
        return Scorer(self.seats if seats is None else seats, self.count('gold'), self.oldhand_m10)

    def deal_feats(self):
        """The feature tuples of the lit regions' legal sends that can be best (reduce_feats)."""
        return reduce_feats({feats(g, self.owner, self.crisis) for g in groups(self.lit, self.crisis)})

    def deal_state(self):
        """What the game says of the deal before any pin (decision B, refined by B2):
        'live'     some legal send of the lit regions reaches the target with the line-up as it sits;
        'reorder'  none does as seated, but one does under another seating (seats can be dragged
                   during a turn): the readout says REORDER STAFF TO WIN;
        'dead'     none does under any seating: NO SEND CAN WIN ('· SWAP' while the turn's swap can
                   bring new regions). After a swap it is asked again of the new lit regions.
        The deal rule itself is unchanged."""
        key = (tuple(self.lit), self.crisis, tuple(self.seats), self.target, self.oldhand_m10,
               tuple(self.owner[r] for r in IDS))
        if getattr(self, '_state_key', None) != key:
            self._state_key = key
            self._state = order_state(self.deal_feats(), self.seats, self.count('gold'), self.oldhand_m10, self.target)
        return self._state

    def dead(self):
        """A dead deal: no legal send reaches the target under any seating of the line-up."""
        return self.deal_state() == 'dead'

    def reorder_wins(self):
        """Dead as seated, but another seating wins: the readout says REORDER STAFF TO WIN."""
        return self.deal_state() == 'reorder'

    def swap_usable(self):
        """SWAP can bring new regions now (the engine's swapProblem is null; no pins are down)."""
        return bool(self.swaps_left and self.pile and self.lit)

    def reseat_best(self):
        """Drag the staff into the seating whose best send on the lit regions scores most (what a
        player does on REORDER STAFF TO WIN)."""
        self.seats = list(best_seating(self.deal_feats(), self.seats, self.count('gold'), self.oldhand_m10)[0])

    def push_misses_left(self):
        """Misses the final push still allows; the last of them ends the game (the Big Board's strikes)."""
        return P['PUSH_MISSES'] - self.push_misses

    def preview(self, pins):
        """What the readout, the SEND lamp and the map preview show for these pins."""
        if not pins:
            # Before any pin the readout's line says what the deal allows (state): REORDER STAFF TO WIN
            # or NO SEND CAN WIN; on a dead deal the lever says what to do about it: SWAP while it can
            # bring new regions, else how the turn ends (a send that misses: in the push it spends a miss).
            state, label = self.deal_state(), 'PIN A REGION'
            if state == 'dead':
                label = 'NO SEND CAN WIN · ' + ('SWAP' if self.swap_usable() else 'USES A MISS' if self.final_push else 'SEND TO PASS')
            return dict(score=0, points=0, m10=0, won=0, regions=[], label=label, state=state,
                        line=READOUT_LINE.get(state), next=self.target, short=self.target)
        sc, pts, m10 = score_pins(pins, self.seats, self.owner, self.crisis, self.oldhand_m10)
        k = regions_won(sc, self.target)
        if k:
            # Never more regions than are left to win (the engine's LivePreview.regions).
            regions = win_order(self.crisis, self.owner, k, pins)
            label = 'WINS %d REGION%s' % (len(regions), '' if len(regions) == 1 else 'S')
        elif self.final_push:
            left = self.push_misses_left() - 1
            regions, label = [], 'MISS · CEASEFIRE' if left <= 0 else 'MISS · %d MISS%s LEFT' % (left, '' if left == 1 else 'ES')
        else:
            regions, label = [self.crisis], 'MISS · SHORT BY {:,}'.format(self.target - sc)
        return dict(score=sc, points=pts, m10=m10, won=k, regions=regions, label=label,
                    next=next_bar(sc, self.target), short=max(0, self.target - sc))

    def send(self, pins):
        """Score the pins and resolve the turn: outcome, war's own spread, Old Hand, end check."""
        pins = list(pins)
        assert legal(pins, self.lit, self.crisis), (pins, self.lit, self.crisis)
        sc = score_pins(pins, self.seats, self.owner, self.crisis, self.oldhand_m10)[0]
        T = self.target
        k = regions_won(sc, T)
        rec = dict(turn=self.turn, target=T, score=sc, pins=len(pins), crisis=self.crisis,
                   on_crisis=self.crisis in pins, swaps=P['SWAPS'] - self.swaps_left,
                   seats=len(self.seats), final=self.final_push, push_draw=getattr(self, 'push_draw', None),
                   firing=sum(1 for s in effective(self.seats) if s and s != 'HERALD'),
                   pops=self._pops(pins))
        if k:
            won = win_order(self.crisis, self.owner, k, pins)
            rec.update(result='win', regions=len(won), won=won,
                       retaken=sum(1 for r in won if self.owner[r] == 'red'))
            for r in won:
                self.owner[r] = 'gold'
            self.coins += P['COIN_PER_REGION'] * len(won)
        elif self.final_push:
            # The push forgives: a miss changes no region (no grey is left for war, and gold is gold
            # for good); the PUSH_MISSES-th miss ends the game as a CEASEFIRE.
            self.push_misses += 1
            rec.update(result='miss', regions=0, won=[], retaken=0)
            if self.push_misses >= P['PUSH_MISSES']:
                self.result = 'CEASEFIRE'
        else:
            self.owner[self.crisis] = 'red'
            rec.update(result='miss', regions=1, won=[], retaken=0, lost=[self.crisis])
        rec['spread'] = None
        if (not self.result and P['WAR_EVERY'] and self.turn % P['WAR_EVERY'] == 0
                and self.count('red') < P['LOSE_AT']):
            r = war_spread_target(self.owner)
            if r:
                self.owner[r] = 'red'
                rec['spread'] = r
        if 'OLDHAND' in self.seats:
            self.oldhand_m10 += OLDHAND_STEP_M10
        if not self.result:
            if self.count('red') >= P['LOSE_AT']:
                self.result = 'WAR'
            elif self.count('gold') == len(IDS):
                self.result = 'WORLD UNITED'
        rec.update(gold=self.count('gold'), red=self.count('red'), grey=self.count('grey'), coins=self.coins,
                   push_misses=self.push_misses)
        self.log.append(rec)
        return rec

    def _pops(self, pins):
        """Per-region multiplier pops in the cascade (for the time model)."""
        herald = 'HERALD' in self.seats
        n = 0
        for s in effective(self.seats):
            if s == 'GOVERNOR':
                n += sum(1 for r in pins if self.owner[r] == 'gold')
            elif s == 'HARBOUR':
                n += sum(1 for r in pins if PORT[r] or herald)
            elif s == 'SOVEREIGN':
                n += sum(1 for r in pins if CAPITAL[r] or herald)
        return n

    # ------------------------------------------------------------------ shop
    def shop_due(self):
        t = self.turn - P['SHOP_FIRST']
        return not self.result and t >= 0 and t % P['SHOP_EVERY'] == 0

    def open_shop(self):
        self.shop_visits += 1
        self.reroll_cost = P['REROLL']
        self._draw_offers()
        script = FIRST_WORLD['shop'].get(self.turn) if self.first_world else None
        if script:
            self.offers = list(script)

    def _draw_offers(self):
        avail = [s for s in STAFF_IDS if s not in self.seats]
        self.rng_shop.shuffle(avail)
        self.offers = avail[:P['OFFERS']]

    def can_afford_any(self, with_sale=False):
        """Any offer the coins in hand buy into a free seat; with_sale: also after selling one seat
        (the engine's shopView.nothingAffordable is the opposite of this with a sale)."""
        full = len(self.seats) >= P['SEATS']
        if any(s and not full and self.coins >= price(s) for s in self.offers):
            return True
        if not with_sale:
            return any(s and self.coins >= price(s) for s in self.offers)
        most = max([sell_value(x) for x in self.seats] or [0])
        return any(s and self.coins + most >= price(s) for s in self.offers)

    def buy(self, i, replace=None):
        """Buy offer i into the leftmost free seat, or in place of seat `replace` (that staff is sold)."""
        s = self.offers[i]
        assert s and s not in self.seats
        if replace is not None:
            old = self.seats[replace]
            assert self.coins + sell_value(old) >= price(s)
            self.coins += sell_value(old)
            self.seats[replace] = s
            if old == 'OLDHAND':
                self.oldhand_m10 = OLDHAND_START_M10
        else:
            assert len(self.seats) < P['SEATS'] and self.coins >= price(s)
            self.seats.append(s)
        self.coins -= price(s)
        self.offers[i] = None
        if s == 'OLDHAND':
            self.oldhand_m10 = OLDHAND_START_M10

    def sell(self, seat):
        s = self.seats.pop(seat)
        self.coins += sell_value(s)
        if s == 'OLDHAND':
            self.oldhand_m10 = OLDHAND_START_M10

    def reroll(self):
        assert self.coins >= self.reroll_cost
        self.coins -= self.reroll_cost
        self.reroll_cost += 1
        self._draw_offers()

    def move(self, a, b):
        """Drag the staff in seat a to seat b; the others slide aside."""
        s = self.seats.pop(a)
        self.seats.insert(b, s)

    def close_shop(self):
        self.offers = None


def selftest():
    """Fast scorer == traced scorer; groups() == legal(); the map is the one the slice ships."""
    assert len(IDS) == 30 and len(JOINS) == 54 and sum(PORT.values()) == 18 and sum(CAPITAL.values()) == 5
    rng = random.Random('selftest')
    for _ in range(3000):
        owner = {r: rng.choice(('grey', 'gold', 'red')) for r in IDS}
        seats = rng.sample(STAFF_IDS, rng.randint(0, 5))
        pins = rng.sample(IDS, rng.randint(1, 5))
        old = rng.randint(10, 60)
        c = rng.choice(IDS)
        a = score_pins(pins, seats, owner, c, old)[0]
        b = score_feats(feats(pins, owner, c), effective(seats), 'HERALD' in seats,
                        sum(1 for r in IDS if owner[r] == 'gold'), old)
        assert a == b, (pins, seats, a, b)
    # The forgiving push: a miss changes no region and says how many misses are left; the 3rd is a CEASEFIRE.
    g = Game('selftest-push')
    for r in IDS:
        g.owner[r] = 'red' if r in ('EDV', 'ASK', 'QLN') else 'gold'
    n = P['PUSH_MISSES']
    for i in range(n):
        g.begin_turn()
        assert g.final_push and g.push_misses_left() == n - i
        left = n - i - 1
        label = 'MISS · %d MISS%s LEFT' % (left, '' if left == 1 else 'ES') if left else 'MISS · CEASEFIRE'
        assert g.preview([g.crisis])['label'] == label, g.preview([g.crisis])
        before = dict(g.owner)
        rec = g.send([g.crisis])
        assert rec['result'] == 'miss' and g.owner == before and rec['push_misses'] == i + 1
        assert g.result == (None if i < n - 1 else 'CEASEFIRE')
    import itertools
    # Seat orders: the distinct seatings score every send as all the raw orders do, seated first.
    for _ in range(300):
        seats = rng.sample(STAFF_IDS, rng.randint(0, 5))
        orders = seat_orders(seats)
        assert orders[0] == seats and len(orders) <= max(1, math.factorial(len(seats)))
        held, old = rng.randint(1, 29), rng.randint(10, 60)
        fs = [(rng.randint(3, 50), n, rng.randint(0, n), rng.randint(0, n), rng.randint(0, n), rng.random() < 0.5)
              for n in (rng.randint(1, 5) for _ in range(12))]
        for p in itertools.permutations(seats):
            k = order_key(list(p))
            twin = next(o for o in orders if order_key(o) == k)
            assert [score_feats(f, effective(list(p)), 'HERALD' in seats, held, old) for f in fs] == \
                   [score_feats(f, effective(twin), 'HERALD' in seats, held, old) for f in fs], (p, twin)
    # reduce_feats keeps the best send of every line-up; order_state and best_seating agree with every
    # raw permutation of the seats.
    for _ in range(150):
        owner = {r: rng.choice(('grey', 'gold', 'red')) for r in IDS}
        c = rng.choice(IDS)
        lit = rng.sample([r for r in IDS if r != c], P['LIT'])
        raw = {feats(g, owner, c) for g in groups(lit, c)}
        fs = reduce_feats(raw)
        seats = rng.sample(STAFF_IDS, rng.randint(0, 5))
        held, old = sum(1 for r in IDS if owner[r] == 'gold'), rng.randint(10, 60)
        bests = [max(Scorer(list(p), held, old)(f) for f in raw) for p in itertools.permutations(seats)]
        assert all(max(Scorer(list(p), held, old)(f) for f in fs) == b
                   for p, b in zip(itertools.permutations(seats), bests))
        T = rng.choice((bests[0], bests[0] + 1, max(bests), max(bests) + 1, rng.randint(1, 2 * max(bests))))
        want = 'live' if bests[0] >= T else 'reorder' if max(bests) >= T else 'dead'
        assert order_state(fs, seats, held, old, T) == want, (seats, T, bests)
        assert best_seating(fs, seats, held, old)[1] == max(bests)
    for _ in range(200):
        c = rng.choice(IDS)
        lit = rng.sample([r for r in IDS if r != c], P['LIT'])
        gs = set(groups(lit, c))
        for k in range(1, 4):
            for comb in itertools.combinations(sorted(pinnable(lit, c)), k):
                assert (comb in gs) == legal(comb, lit, c)
    return True


if __name__ == '__main__':
    selftest()
    print('selftest ok')
    print('targets', ', '.join('{:,}'.format(target(t)) for t in range(1, 31)))
