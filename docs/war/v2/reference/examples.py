"""Prints every worked number the spec quotes (SPEC.md sections 4, 5 and 13). The positions are
fixed data, so the output never changes unless the rules do.

    python3 examples.py
"""
import sys
sys.dont_write_bytecode = True

import statistics

import rules as R
import bots as B


def fmt(n):
    return '{:,}'.format(n)


def m(m10):
    return '%d.%d' % divmod(m10, 10)


def owner_from(gold, red):
    o = {r: 'grey' for r in R.IDS}
    for r in gold:
        o[r] = 'gold'
    for r in red:
        o[r] = 'red'
    return o


def show_trace(pins, seats, owner, crisis, old=R.OLDHAND_START_M10):
    tr = []
    sc, pts, m10 = R.score_pins(pins, seats, owner, crisis, old, trace=tr)
    for e in tr:
        if e[0] == 'pin':
            print('    pin    %-13s +%-3d            points %-5d multiplier %s' % (R.NAME[e[1]], e[2], e[3], m(e[4])))
        elif e[0] == 'staff':
            _, seat, sid, reg, op, amt, p_, m_ = e
            where = ('from ' + R.NAME[reg]) if reg else ''
            if op == '+P':
                what = '+%d points' % amt
            elif op == '+M':
                what = '+%s multiplier' % m(amt)
            else:
                what = 'x%s multiplier' % amt
            print('    seat %d %-13s %-20s %-18s points %-5d multiplier %s' % (seat, R.STAFF[sid][0], what, where, p_, m(m_)))
        elif e[0] == 'crisis':
            print('    crisis %-13s x2 multiplier       points %-5d multiplier %s' % (R.NAME[e[1]], e[4], m(e[5])))
        else:
            print('    SCORE  %s' % fmt(e[1]))
    return sc


def spread(lit, crisis, owner, seats, T, old=R.OLDHAND_START_M10):
    held = sum(1 for r in R.IDS if owner[r] == 'gold')
    sc = R.Scorer(seats, held, old)
    vals = sorted(((sc(R.feats(g, owner, crisis)), g) for g in R.groups(lit, crisis)), reverse=True)
    med = statistics.median(v for v, _ in vals)
    wins = sum(1 for v, _ in vals if v >= T)
    return vals, med, wins


def main():
    print('TARGETS, turns 1-26 (64 x 1.5^(t-1), 2 significant figures)')
    print('  ' + ', '.join(fmt(R.target(t)) for t in range(1, 27)))
    print()
    print('LADDER at target 1,100 (turn 8): the score each extra region needs')
    print('  ' + ', '.join('%d region%s: %s' % (i + 1, '' if i == 0 else 's', fmt(b))
                           for i, b in enumerate(list(R.marks(1100, 1100 * 300))[:9])))
    for s in (1099, 1100, 4399, 4400, 17600, 35200, 140800, 1000000):
        print('  score %-9s -> %d region(s); next region at %s' % (fmt(s), R.regions_won(s, 1100), fmt(R.next_bar(s, 1100))))
    print()

    # ------------------------------------------------------------------ FIRST-WORLD turn 1
    g = R.Game('FIRST-WORLD', first_world=True)
    g.begin_turn()
    print('EXAMPLE 1. FIRST-WORLD, TURN 1. Target %s. Crisis %s. Gold: Lantern Key. War: %s.' % (
        fmt(g.target), R.NAME[g.crisis], ', '.join(R.NAME[r] for r in R.FIRST_WORLD['war'])))
    print('  lit: ' + ', '.join('%s %d%s%s' % (R.NAME[r], R.NUM[r], '★' if R.CAPITAL[r] else '', '⚓' if R.PORT[r] else '')
                               for r in g.lit))
    for pins in (['SHL'], ['SHL', 'LNK'], ['SHL', 'LNK', 'PBB'], ['SHL', 'LNK', 'PBB', 'MRM'],
                 ['SHL', 'LNK', 'PBB', 'MRM', 'TRN'], ['LNK', 'PBB', 'TRN', 'GUL', 'DRF']):
        p = g.preview(pins)
        print('  %-48s points %-3d x %-4s = %-5s %-16s next region at %s' % (
            ' + '.join(R.NAME[r] for r in pins), p['points'], m(p['m10']), fmt(p['score']), p['label'], fmt(p['next'])))
    vals, med, wins = spread(g.lit, g.crisis, g.owner, [], g.target)
    print('  legal sends %d; median %s; %d of them win; %d win 2 regions; best %s (%s)' % (
        len(vals), fmt(int(med)), wins, sum(1 for v, _ in vals if v >= 4 * g.target), fmt(vals[0][0]),
        ' + '.join(R.NAME[r] for r in vals[0][1])))
    pins = ['SHL', 'LNK', 'LTL', 'TLM']
    p = g.preview(pins)
    print('  pin it to claim it: %s = %s, %s -> %s (Pebbleby is nearer but not pinned)' % (
        ' + '.join(R.NAME[r] for r in pins), fmt(p['score']), p['label'], ' then '.join(R.NAME[r] for r in p['regions'])))
    rec = g.send(['SHL', 'LNK', 'PBB', 'MRM', 'TRN'])
    print('  SEND Shoal + Lantern Key + Pebbleby + Marram + Tern Isle: %s, WIN %d -> %s turn gold. GOLD %d/30, coins %d.' % (
        fmt(rec['score']), rec['regions'], ' then '.join(R.NAME[r] for r in rec['won']), rec['gold'], rec['coins']))
    print()

    # ------------------------------------------------------------------ FIRST-WORLD turn 2
    g.begin_turn()
    print('EXAMPLE 1, TURN 2. Target %s. Crisis %s.' % (fmt(g.target), R.NAME[g.crisis]))
    print('  lit: ' + ', '.join('%s %d%s' % (R.NAME[r], R.NUM[r], ' (gold)' if g.owner[r] == 'gold' else '') for r in g.lit))
    for pins in (['TRN', 'LNK', 'PBB', 'SHL', 'GUL'], ['TRN', 'MRD', 'EDV', 'LNK', 'PBB'], ['TRN', 'MRD', 'EDV', 'LNK', 'SHL']):
        p = g.preview(pins)
        print('  %-52s %-5s %-16s next region at %s' % (' + '.join(R.NAME[r] for r in pins), fmt(p['score']), p['label'], fmt(p['next'])))
    vals, med, wins = spread(g.lit, g.crisis, g.owner, [], g.target)
    print('  legal sends %d; median %s; %d win; %d win 2 regions' % (
        len(vals), fmt(int(med)), wins, sum(1 for v, _ in vals if v >= 4 * g.target)))
    rec = g.send(['TRN', 'MRD', 'EDV', 'LNK', 'SHL'])
    print('  SEND: %s, WIN %d -> %s. GOLD %d/30, coins %d.' % (
        fmt(rec['score']), rec['regions'], ' then '.join(R.NAME[r] for r in rec['won']), rec['gold'], rec['coins']))
    g.last_opening = (g.crisis, list(g.opening_lit))
    g.open_shop()
    print('  FIRST SHOP (fixed): ' + ', '.join('%s ◆%d' % (R.STAFF[s][0], R.price(s)) for s in g.offers))
    base = B.preview_number(g, [])
    for s in g.offers:
        print('    card %-14s "your best send last turn: %s -> %s"' % (R.STAFF[s][0], fmt(base), fmt(B.preview_number(g, [s]))))
    print('    Duty Officer + Quartermaster together: %s -> %s' % (fmt(base), fmt(B.preview_number(g, ['QM', 'DUTY']))))
    g.close_shop()
    print()

    # ------------------------------------------------------------------ EXAMPLE 2: mid-game
    gold = ['BRK', 'DRF', 'FLE', 'FRM', 'GLM', 'GUL', 'HRT', 'KLM', 'KLP', 'LNK', 'MRD', 'MRM', 'ORN', 'PBB',
            'RMH', 'SHL', 'SLW', 'TLM', 'TRN', 'WMS', 'WNM']
    red = ['ASK', 'BRN', 'EDV', 'NWK', 'VSY']
    owner = owner_from(gold, red)
    crisis, T = 'LTL', R.target(11)
    lit = ['LNK', 'DNM', 'MRM', 'GUL', 'PBB', 'TLM', 'FLE', 'ORN', 'DRF', 'WMS']
    seats = ['QM', 'DUTY', 'STRATEGIST', 'GOVERNOR', 'HARBOUR']
    print('EXAMPLE 2. TURN 11, TARGET %s. Crisis Lintel (grey). Gold %d, war %d (%s).' % (
        fmt(T), len(gold), len(red), ', '.join(R.NAME[r] for r in red)))
    print('  seats: ' + ', '.join('%d %s' % (i + 1, R.STAFF[s][0]) for i, s in enumerate(seats)))
    print('  lit: ' + ', '.join('%s %d%s%s%s' % (R.NAME[r], R.NUM[r], '★' if R.CAPITAL[r] else '', '⚓' if R.PORT[r] else '',
                                                 ' gold' if owner[r] == 'gold' else '') for r in lit))
    best = ['FLE', 'LTL', 'MRM', 'ORN', 'TLM']
    print('  BEST: ' + ' + '.join(R.NAME[r] for r in sorted(best, key=R.west)))
    sc = show_trace(best, seats, owner, crisis)
    k = R.regions_won(sc, T)
    print('  = %.1fx the target: WIN %d -> %s' % (sc / T, k, ', '.join(R.NAME[r] for r in R.win_order(crisis, owner, k, best))))
    vals, med, wins = spread(lit, crisis, owner, seats, T)
    print('  legal sends %d, median %s (%.1fx below best), %d of them win' % (len(vals), fmt(int(med)), vals[0][0] / med, wins))
    for pins, note in ((['LTL', 'TLM'], 'crisis + Tallowmere'),
                       (['LNK', 'PBB', 'MRM', 'FLE', 'DRF'], 'five gold regions, no crisis'),
                       (['LTL', 'DNM', 'TLM', 'ORN', 'FLE'], 'through grey Dunmarrow'),
                       (['LTL', 'TLM', 'ORN', 'FLE', 'MRM'], 'the best, again')):
        if not R.legal(pins, lit, crisis):
            print('  (illegal: %s)' % note)
            continue
        s = R.score_pins(pins, seats, owner, crisis)[0]
        print('  %-30s %-52s %8s  %s' % (note, ' + '.join(R.NAME[r] for r in sorted(pins, key=R.west)), fmt(s),
                                         ('WIN %d' % R.regions_won(s, T)) if s >= T else 'MISS'))
    for alt, note in ((['QM', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'DUTY'], 'Duty Officer moved to seat 5'),
                      (['DUTY', 'STRATEGIST', 'GOVERNOR', 'HARBOUR', 'QM'], 'Quartermaster moved to seat 5')):
        s = R.score_pins(best, alt, owner, crisis)[0]
        print('  seat order: %-34s %8s  WIN %d' % (note, fmt(s), R.regions_won(s, T)))
    s = R.score_pins(best, [], owner, crisis)[0]
    print('  the same pins with no staff: %s, %s' % (fmt(s), 'MISS' if s < T else 'WIN %d' % R.regions_won(s, T)))
    print()

    # ------------------------------------------------------------------ EXAMPLE 3: the Crown
    T3 = R.target(14)
    seats3 = ['DUTY', 'DEPUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD']
    print('EXAMPLE 3. THE CROWN (the break). Same map, turn 14, target %s.' % fmt(T3))
    print('  seats: ' + ', '.join('%d %s' % (i + 1, R.STAFF[s][0]) for i, s in enumerate(seats3)) + ' (the Deputy copies the Sovereign)')
    sc3 = show_trace(best, seats3, owner, crisis)
    k3 = R.regions_won(sc3, T3)
    print('  = %sx the target: WIN %d -> %s' % (fmt(sc3 // T3), k3, ', '.join(R.NAME[r] for r in R.win_order(crisis, owner, k3, best))))
    alt3 = ['DUTY', 'SOVEREIGN', 'DEPUTY', 'HARBOUR', 'HERALD']
    s3b = R.score_pins(best, alt3, owner, crisis)[0]
    print('  Deputy moved to seat 3 (it now copies the Harbourmaster): %s, %sx: WIN %d' % (fmt(s3b), fmt(s3b // T3), R.regions_won(s3b, T3)))
    s3c = R.score_pins(best, ['DUTY', 'SOVEREIGN', 'HARBOUR', 'HERALD'], owner, crisis)[0]
    print('  no Deputy: %s, %sx: WIN %d' % (fmt(s3c), fmt(s3c // T3), R.regions_won(s3c, T3)))
    print('  ceiling (five seats, five 10-point pins and the crisis): Duty, Deputy, Sovereign, Harbourmaster, Herald on 50 points: %s' % fmt(
        R.score_feats((50, 5, 5, 5, 5, 1), R.effective(seats3), True, 21, 10)))
    print()

    # ------------------------------------------------------------------ outcomes on the map
    print('EXAMPLE 4. OUTCOMES ON THE EXAMPLE 2 MAP (crisis Lintel, the best pins: only the crisis is not gold)')
    for k in (1, 2, 3, 5, 8):
        print('  WIN %d -> %s' % (k, ', '.join(R.NAME[r] for r in R.win_order('LTL', owner, k, best))))
    print('  MISS -> Lintel turns red (war %d -> %d)' % (len(red), len(red) + 1))
    o2 = dict(owner)
    r = R.war_spread_target(o2)
    print('  war spreads on its own (after turns 3, 6, 9 ...) -> %s' % (R.NAME[r] if r else 'nowhere'))
    print()

    # ------------------------------------------------------------------ FINAL PUSH
    gold5 = [r for r in R.IDS if r not in ('EDV', 'ASK', 'QLN')]
    o5 = owner_from(gold5, ['EDV', 'ASK', 'QLN'])
    print('EXAMPLE 5. THE FINAL PUSH. No grey left; war holds Edda Vale, Ashkettle, Quillon (27/30 gold).')
    gpool = [x for x in R.IDS if o5[x] == 'red' and any(o5[n] == 'gold' for n in R.ADJ[x])]
    print('  crises can flare on: ' + ', '.join(R.NAME[x] for x in gpool))
    for k in (1, 2, 3):
        print('  a win of %d on Edda Vale takes: %s' % (k, ', '.join(R.NAME[x] for x in R.win_order('EDV', o5, k))))
    g5 = R.Game('EXAMPLE-5')
    g5.owner = dict(o5)
    labels = []
    for _ in range(R.P['PUSH_MISSES']):
        g5.begin_turn()
        g5.crisis, g5.lit = 'EDV', []
        labels.append(g5.preview(['EDV'])['label'])
        g5.send(['EDV'])
    print('  a miss changes no region; the SEND label on each miss: %s; the %s miss: %s, %d of 30' % (
        ', '.join(labels), 'third' if R.P['PUSH_MISSES'] == 3 else '%dth' % R.P['PUSH_MISSES'], g5.result, g5.count('gold')))


if __name__ == '__main__':
    main()
