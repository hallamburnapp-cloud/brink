"""Bots that play rules.py, and the game loop (play).

Each bot has pick(game, after_swap) -> ('send', pins) | ('swap', keep) and shop(game).

random    a random touching group of 1-5 pinnable regions; never swaps; buys each affordable offer
          half the time and seats at random.
novice    a weak human: a random touching group of 3-5 (it has read 'more pins score more'), but it
          never thinks about the crisis x2 or its staff; swaps only when it cannot make 3; buys the
          cheapest affordable offer into a free seat; never sells, rerolls or reorders.
greedy    the best send every turn (most regions, then the highest score); swaps once, keeping its
          best group, when that misses. Never shops.
preview   greedy play; at the shop it follows only the preview number printed on each card (the best
          send of the turn just played, rescored with that staff hired; with a full table, the best
          seat to replace) and buys while the number goes up.
sensible  greedy play; shops by looking ahead: buys what most raises its mean log best-score on 10
          sample deals two turns ahead, per coin; sells to upgrade; rerolls up to twice; seats
          adders before multipliers and tries every Deputy seat.
breaker   sensible, but buys the Crown pieces (Herald, Sovereign, Deputy, Harbourmaster) on sight.
"""
import math
import random
import statistics

import rules as R
from rules import P, IDS, ADJ


def best_send(g, sc=None, lit=None):
    """(regions won, score, pins) of the best legal send: most regions, then the highest score."""
    sc = sc or g.scorer()
    lit = g.lit if lit is None else lit
    best = (-1, -1, ())
    for grp in R.groups(lit, g.crisis):
        v = sc(R.feats(grp, g.owner, g.crisis))
        k = R.regions_won(v, g.target)
        if (k, v) > best[:2]:
            best = (k, v, grp)
    return best


def all_scores(g, sc=None):
    sc = sc or g.scorer()
    return [sc(R.feats(grp, g.owner, g.crisis)) for grp in R.groups(g.lit, g.crisis)]


def random_group(g, rng, kmin=1, kmax=5):
    pool = R.pinnable(g.lit, g.crisis)
    k = rng.randint(kmin, kmax)
    grp = [rng.choice(pool)]
    while len(grp) < k:
        nb = sorted({n for x in grp for n in ADJ[x] if n in pool and n not in grp})
        if not nb:
            break
        grp.append(rng.choice(nb))
    return tuple(sorted(grp))


# ------------------------------------------------------------------------------------------- bots
class RandomBot:
    name = 'random'

    def __init__(self, seed):
        self.rng = random.Random(str(seed) + ':bot')

    def pick(self, g, after_swap=False):
        return ('send', random_group(g, self.rng))

    def shop(self, g):
        for i, s in enumerate(list(g.offers)):
            if s and len(g.seats) < P['SEATS'] and g.coins >= R.price(s) and self.rng.random() < 0.5:
                g.buy(i)
        self.rng.shuffle(g.seats)


class NoviceBot(RandomBot):
    name = 'novice'

    def pick(self, g, after_swap=False):
        for _ in range(6):
            grp = random_group(g, self.rng, 3, 5)
            if len(grp) >= 3:
                return ('send', grp)
        if not after_swap and g.swaps_left:
            return ('swap', ())
        return ('send', grp)

    def shop(self, g):
        while len(g.seats) < P['SEATS']:
            ok = [(R.price(s), i) for i, s in enumerate(g.offers) if s and g.coins >= R.price(s)]
            if not ok:
                break
            g.buy(min(ok)[1])


class GreedyBot:
    name = 'greedy'

    def __init__(self, seed):
        self.rng = random.Random(str(seed) + ':bot')

    def pick(self, g, after_swap=False):
        k, v, grp = best_send(g)
        if k == 0 and not after_swap and g.swaps_left:
            return ('swap', grp)
        return ('send', grp)

    def shop(self, g):
        pass


# How a sensible player seats staff: flat adders first, then multipliers (weakest first).
RANK = {'QM': 0, 'DUTY': 1, 'SURVEYOR': 2, 'OLDHAND': 3, 'STRATEGIST': 4, 'GOVERNOR': 5,
        'HARBOUR': 6, 'SOVEREIGN': 7, 'HERALD': 8}


def seatings(staff):
    core = sorted([s for s in staff if s != 'DEPUTY'], key=lambda s: RANK[s])
    if 'DEPUTY' not in staff:
        return [core]
    return [core[:i] + ['DEPUTY'] + core[i:] for i in range(len(core))] or [['DEPUTY']]


def preview_number(g, seats):
    """The number printed on a shop card: the best score on the last turn's opening deal (its crisis
    and lit regions, on today's map) with these seats."""
    crisis, lit = g.last_opening
    sc = g.scorer(seats)
    return max(sc(R.feats(grp, g.owner, crisis)) for grp in R.groups(lit, crisis))


class PreviewBot(GreedyBot):
    name = 'preview'

    def shop(self, g):
        while True:
            base = preview_number(g, g.seats)
            best = None
            for i, s in enumerate(g.offers):
                if not s:
                    continue
                opts = []
                if len(g.seats) < P['SEATS']:
                    if g.coins >= R.price(s):
                        opts.append((preview_number(g, g.seats + [s]), None))
                else:
                    for j, old in enumerate(g.seats):
                        if g.coins + R.sell_value(old) >= R.price(s):
                            opts.append((preview_number(g, g.seats[:j] + [s] + g.seats[j + 1:]), j))
                for v, j in opts:
                    if v > base and (best is None or v > best[0]):
                        best = (v, i, j)
            if not best:
                break
            g.buy(best[1], best[2])


class SensibleBot(GreedyBot):
    name = 'sensible'
    SAMPLES = 10
    REROLLS = 2

    def sample_deals(self, g):
        """Feature sets of sample deals two turns ahead (crises on today's frontier, today's map)."""
        deals = []
        pool, _ = g.crisis_pool()
        for _ in range(self.SAMPLES):
            c = self.rng.choice(pool)
            pile = [r for r in IDS if r != c and g.owner[r] != 'red' and R.DIST[c][r] <= P['NEAR']]
            self.rng.shuffle(pile)
            lit = pile[:P['LIT']]
            deals.append(sorted({R.feats(grp, g.owner, c) for grp in R.groups(lit, c)}))
        self.held = g.count('gold')
        return deals

    def value(self, g, staff, deals):
        T = R.target(g.turn + 2)
        old = g.oldhand_m10 if 'OLDHAND' in g.seats else R.OLDHAND_START_M10 + 3 * R.OLDHAND_STEP_M10
        best_v, best_seats = None, None
        for seats in seatings(staff):
            sc = R.Scorer(seats, self.held, old)
            v = sum(math.log(max(1, max(sc(f) for f in fs)) / T) for fs in deals) / len(deals)
            if best_v is None or v > best_v:
                best_v, best_seats = v, seats
        self._seats = best_seats
        return best_v

    def reseat(self, g, deals):
        self.value(g, g.seats, deals)
        g.seats = list(self._seats)

    def shop(self, g):
        deals = self.sample_deals(g)
        rerolls = 0
        while True:
            bought = True
            while bought:
                bought = False
                base = self.value(g, g.seats, deals)
                best = None
                for i, s in enumerate(g.offers):
                    if not s:
                        continue
                    p = R.price(s)
                    if len(g.seats) < P['SEATS']:
                        if g.coins >= p:
                            v = self.value(g, g.seats + [s], deals) - base
                            if v > 0.05 and (best is None or v / p > best[0]):
                                best = (v / p, i, None)
                    else:
                        for j, old in enumerate(g.seats):
                            if g.coins + R.sell_value(old) >= p:
                                st = g.seats[:j] + g.seats[j + 1:] + [s]
                                v = self.value(g, st, deals) - base
                                if v > 0.15 and (best is None or v / p > best[0]):
                                    best = (v / p, i, j)
                if best:
                    _, i, j = best
                    g.buy(i, j)
                    self.reseat(g, deals)
                    bought = True
            if rerolls < self.REROLLS and g.coins >= g.reroll_cost + 5:
                g.reroll()
                rerolls += 1
                continue
            break
        self.reseat(g, deals)


class BreakerBot(SensibleBot):
    name = 'breaker'
    WANT = ('HERALD', 'SOVEREIGN', 'DEPUTY', 'HARBOUR')

    def shop(self, g):
        for _ in range(3):
            for i, s in enumerate(g.offers):
                if s in self.WANT:
                    if len(g.seats) >= P['SEATS']:
                        others = [j for j, x in enumerate(g.seats) if x not in self.WANT]
                        if not others:
                            continue
                        j = min(others, key=lambda j: R.price(g.seats[j]))
                        if g.coins + R.sell_value(g.seats[j]) >= R.price(s):
                            g.buy(i, j)
                    elif g.coins >= R.price(s):
                        g.buy(i)
            if sum(1 for x in g.seats if x in self.WANT) < 4 and g.coins >= g.reroll_cost + 6:
                g.reroll()
                continue
            break
        SensibleBot.shop(self, g)


BOTS = {b.name: b for b in (RandomBot, NoviceBot, GreedyBot, PreviewBot, SensibleBot, BreakerBot)}


# ------------------------------------------------------------------------------------------- play
def play(seed, botname, max_turns=60, first_world=False):
    """Play one game. Returns a summary with the per-turn log and the choice-spread samples."""
    g = R.Game(seed, first_world=first_world)
    bot = BOTS[botname](seed)
    spread = []
    g.last_opening = None
    while not g.result and g.turn < max_turns:
        g.begin_turn()
        vals = all_scores(g)
        best, med = max(vals), statistics.median(vals)
        spread.append((best / max(1, med), R.regions_won(best, g.target), R.regions_won(int(med), g.target),
                       best >= g.target, med >= g.target, len(vals), g.turn))
        g.last_opening = (g.crisis, list(g.opening_lit))
        act = bot.pick(g)
        if act[0] == 'swap' and g.swaps_left:
            g.swap(act[1])
            act = bot.pick(g, after_swap=True)
        if act[0] == 'swap':
            act = ('send', best_send(g)[2])
        g.send(act[1])
        if g.shop_due():
            g.open_shop()
            g.log[-1]['shop_affordable'] = g.can_afford_any()
            before = list(g.seats)
            bot.shop(g)
            g.log[-1]['bought'] = sum(1 for s in g.seats if s not in before)
            g.close_shop()
    return dict(bot=botname, seed=seed, end=g.result or 'STALL', turns=g.turn, gold=g.count('gold'),
                red=g.count('red'), grey=g.count('grey'), log=g.log, spread=spread, seats=list(g.seats),
                shops=g.shop_visits)
