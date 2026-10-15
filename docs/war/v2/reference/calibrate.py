"""Calibration: plays N games per bot and prints the gate numbers.

    python3 calibrate.py                 5,000 games per bot, 4 processes
    python3 calibrate.py 1000 --jobs 8   fewer games, more processes
    python3 calibrate.py 2000 --set T0=70 --set STEP=2   try other tunables (see rules.P)
    python3 calibrate.py --write         also write RESULTS.txt next to this file

Seeds are 'W0' ... 'W{N-1}' for every bot, so all bots see the same war starts.
"""
import sys
sys.dont_write_bytecode = True

import argparse
import json
import os
import statistics
import time
from collections import Counter
from multiprocessing import Pool

import rules as R
import bots as B
import timing as TM

BOT_ORDER = ['random', 'novice', 'greedy', 'preview', 'sensible', 'breaker']


def _init(overrides):
    for k, v in overrides.items():
        if k.startswith('PRICE_'):
            s = k[6:]
            R.STAFF[s] = R.STAFF[s][:2] + (v,) + R.STAFF[s][3:]
        else:
            R.P[k] = v


def _job(args):
    bot, seed = args
    r = B.play(seed, bot)
    # keep the payload small
    r['min_std'] = TM.minutes(r, TM.STANDARD)
    r['min_first'] = TM.minutes(r, TM.FIRST)
    r['min_slow'] = TM.minutes(r, TM.SLOW)
    r['min_fast'] = TM.minutes(r, TM.FAST)
    r['best'] = max([t['score'] for t in r['log']] or [0])
    r['best_ratio'] = max([t['score'] / t['target'] for t in r['log']] or [0])
    r['max_regions'] = max([t['regions'] for t in r['log'] if t['result'] == 'win'] or [0])
    r['war_peak'] = max([t['red'] for t in r['log']] or [0])
    r['misses'] = sum(1 for t in r['log'] if t['result'] == 'miss')
    r['final_push'] = any(t['final'] for t in r['log'])
    r['on_crisis'] = (sum(1 for t in r['log'] if t['on_crisis']), len(r['log']))
    r['spreads'] = sum(1 for t in r['log'] if t.get('spread'))
    r['bought'] = sum(t.get('bought', 0) for t in r['log'])
    r['wins_sizes'] = [t['regions'] for t in r['log'] if t['result'] == 'win']
    # Dead deals (NO SEND CAN WIN) and the forgiving final push.
    r['nturns'] = len(r['log'])
    r['dead_dealt'] = sum(1 for t in r['log'] if t.get('dead_dealt'))
    r['dead_send'] = sum(1 for t in r['log'] if t.get('dead'))
    r['miss_dead'] = sum(1 for t in r['log'] if t['result'] == 'miss' and t.get('dead'))
    r['last_dead'] = bool(r['log'] and r['log'][-1].get('dead'))
    r['push_turns'] = sum(1 for t in r['log'] if t['final'])
    r['push_misses'] = sum(1 for t in r['log'] if t['final'] and t['result'] == 'miss')
    # REORDER STAFF TO WIN: deals no send wins as seated that a reorder wins, and the bot's reorders.
    r['reorder_dealt'] = sum(1 for t in r['log'] if t.get('reorder_dealt'))
    r['reordered'] = sum(1 for t in r['log'] if t.get('reordered'))
    # The push's crisis draw (A2): turns drawn from the red regions some fresh deal can win.
    r['push_any'] = sum(1 for t in r['log'] if t['final'] and t.get('push_draw') == 'any')
    # A CEASEFIRE's three misses: dead as dealt, SWAP unusable, nothing affordable at any shop after the
    # first push miss (even with a sale), and all three at once (no in-turn choice at all).
    pm = [i for i, t in enumerate(r['log']) if t['final'] and t['result'] == 'miss']
    if r['end'] == 'CEASEFIRE' and pm:
        shops = [t for t in r['log'][pm[0]:] if 'shop_affordable_sale' in t]
        dead = all(r['log'][i].get('dead_dealt') for i in pm)
        noswap = all(not r['log'][i].get('swap_ok') for i in pm)
        broke = all(not t['shop_affordable_sale'] for t in shops)
        r['cf_why'] = (dead, noswap, broke, dead and noswap and broke)
    else:
        r['cf_why'] = None
    r['tail'] = 0
    for t in reversed(r['log']):
        if t['result'] != 'miss':
            break
        r['tail'] += 1
    r['turn_rows'] = [(t['turn'], t['target'], t['score'], t['result'], t['regions'], t['gold'], t['red'], t['pins'], t['swaps'])
                      for t in r['log']]
    del r['log']
    return r


def q(xs, p):
    xs = sorted(xs)
    if not xs:
        return None
    return xs[min(len(xs) - 1, int(p * len(xs)))]


def pct(x):
    return '%.1f%%' % (100 * x)


def summarize(rs):
    n = len(rs)
    ends = Counter(r['end'] for r in rs)
    wu = [r for r in rs if r['end'] == 'WORLD UNITED']
    cf = [r for r in rs if r['end'] == 'CEASEFIRE']
    lost = [r for r in rs if r['end'] == 'WAR']
    held = wu + cf
    sp = [s for r in rs for s in r['spread']]
    o = dict(
        n=n,
        world_united=len(wu) / n, ceasefire=len(cf) / n, war=len(lost) / n, stall=ends.get('STALL', 0) / n,
        not_lost=len(held) / n,
        turns=(statistics.median(r['turns'] for r in rs), q([r['turns'] for r in rs], .1), q([r['turns'] for r in rs], .9)),
        turns_wu=statistics.median([r['turns'] for r in wu]) if wu else None,
        turns_held=statistics.median([r['turns'] for r in held]) if held else None,
        turns_lost=statistics.median([r['turns'] for r in lost]) if lost else None,
        max_turns=max(r['turns'] for r in rs),
        spread2=sum(1 for s in sp if s[0] >= 2) / len(sp) if sp else 0,
        spread2_early=(lambda xs: sum(1 for s in xs if s[0] >= 2) / len(xs) if xs else 0)([s for s in sp if s[6] <= 5]),
        spread2_late=(lambda xs: sum(1 for s in xs if s[0] >= 2) / len(xs) if xs else 0)([s for s in sp if s[6] > 5]),
        spread3=sum(1 for s in sp if s[0] >= 3) / len(sp) if sp else 0,
        spread_med=statistics.median(s[0] for s in sp) if sp else 0,
        best_wins_med_misses=sum(1 for s in sp if s[3] and not s[4]) / len(sp) if sp else 0,
        regions_best_minus_med=statistics.mean(s[1] - s[2] for s in sp) if sp else 0,
        legal_med=statistics.median(s[5] for s in sp) if sp else 0,
        best_med=statistics.median(r['best'] for r in rs), best_p90=q([r['best'] for r in rs], .9),
        best_max=max(r['best'] for r in rs),
        million=sum(1 for r in rs if r['best'] >= 10 ** 6) / n,
        ratio10=sum(1 for r in rs for x in r['turn_rows'] if x[2] >= 10 * x[1]) / max(1, sum(len(r['turn_rows']) for r in rs)),
        max_regions_med=statistics.median(r['max_regions'] for r in rs),
        flood5=sum(1 for r in rs if r['max_regions'] >= 5) / n,
        sizes=Counter(x for r in rs for x in r['wins_sizes']),
        misses_med=statistics.median(r['misses'] for r in rs),
        tail_med=statistics.median([r['tail'] for r in lost]) if lost else None,
        tail_p90=q([r['tail'] for r in lost], .9) if lost else None,
        war_peak6_in_held=sum(1 for r in held if r['war_peak'] >= 6) / len(held) if held else 0,
        war_peak8_in_held=sum(1 for r in held if r['war_peak'] >= 8) / n,
        near_loss=sum(1 for r in lost if r['grey'] <= 4) / n,
        near_loss_gold18=sum(1 for r in lost if r['gold'] >= 18) / n,
        lost_gold_med=statistics.median([r['gold'] for r in lost]) if lost else None,
        lost_grey_med=statistics.median([r['grey'] for r in lost]) if lost else None,
        final_push=sum(1 for r in rs if r['final_push']) / n,
        cf_gold=Counter(r['gold'] for r in cf),
        long25=sum(1 for r in rs if r['turns'] >= 25) / n,
        on_crisis=sum(r['on_crisis'][0] for r in rs) / max(1, sum(r['on_crisis'][1] for r in rs)),
        spreads_med=statistics.median(r['spreads'] for r in rs),
        bought_med=statistics.median(r['bought'] for r in rs),
        hopeless=sum(1 for r in lost if r['gold'] <= 8) / n,
        dead_dealt=sum(r['dead_dealt'] for r in rs) / max(1, sum(r['nturns'] for r in rs)),
        dead_send=sum(r['dead_send'] for r in rs) / max(1, sum(r['nturns'] for r in rs)),
        miss_dead=sum(r['miss_dead'] for r in rs) / max(1, sum(r['misses'] for r in rs)),
        cf_dead=sum(1 for r in cf if r['last_dead']) / len(cf) if cf else None,
        push_turns=(lambda xs: (statistics.median(xs), q(xs, .9)) if xs else (None, None))(
            [r['push_turns'] for r in rs if r['final_push']]),
        push_wu=(lambda xs: sum(1 for r in xs if r['end'] == 'WORLD UNITED') / len(xs) if xs else None)(
            [r for r in rs if r['final_push']]),
        push_saved=(lambda xs: sum(1 for r in xs if r['push_misses'] and r['end'] == 'WORLD UNITED') / len(xs) if xs else None)(
            [r for r in rs if r['final_push']]),
        push_misses_med=(lambda xs: statistics.median(xs) if xs else None)([r['push_misses'] for r in rs if r['final_push']]),
        reorder_dealt=sum(r['reorder_dealt'] for r in rs) / max(1, sum(r['nturns'] for r in rs)),
        reordered=sum(r['reordered'] for r in rs) / max(1, sum(r['nturns'] for r in rs)),
        push_any=sum(r['push_any'] for r in rs) / max(1, sum(r['push_turns'] for r in rs)),
        cf_why=(lambda xs: tuple(sum(1 for x in xs if x[i]) / len(xs) for i in range(4)) if xs else None)(
            [r['cf_why'] for r in cf if r['cf_why']]),
    )
    for key, fld in (('std', 'min_std'), ('first', 'min_first'), ('slow', 'min_slow'), ('fast', 'min_fast')):
        xs = [r[fld] for r in rs]
        o['min_' + key] = (statistics.median(xs), q(xs, .1), q(xs, .9))
        ws = [r[fld] for r in held]
        o['min_' + key + '_held'] = (statistics.median(ws), q(ws, .1), q(ws, .9)) if ws else (None, None, None)
    o['staff_held'] = Counter(s for r in held for s in set(r['seats']))
    o['staff_all'] = Counter(s for r in rs for s in set(r['seats']))
    return o


def curve(rs, maxt=30):
    rows = []
    for t in range(1, maxt + 1):
        xs = [x for r in rs for x in r['turn_rows'] if x[0] == t]
        if len(xs) < max(30, len(rs) // 50):
            break
        rows.append((t, xs[0][1], len(xs), statistics.median(x[2] for x in xs),
                     sum(1 for x in xs if x[3] == 'win') / len(xs),
                     statistics.median(x[5] for x in xs), statistics.median(x[6] for x in xs)))
    return rows


def gates(S):
    s, g, r, nv, pv = S['sensible'], S['greedy'], S['random'], S['novice'], S['preview']
    held = s['staff_held']
    nheld = round(s['not_lost'] * s['n'])
    staff_lo = min((held.get(k, 0) / max(1, nheld), k) for k in R.STAFF)
    staff_hi = max((held.get(k, 0) / max(1, nheld), k) for k in R.STAFF)
    G = [
        ('G1  sensible holds the world (WORLD UNITED or CEASEFIRE) 55-70%', pct(s['not_lost']), 0.55 <= s['not_lost'] <= 0.70),
        ('G2  sensible WORLD UNITED, the whole map 30/30, at least 40%', pct(s['world_united']), s['world_united'] >= 0.40),
        ('G3  greedy, never shops: holds under 25%', pct(g['not_lost']), g['not_lost'] < 0.25),
        ('G4  random: holds under 5%', pct(r['not_lost']), r['not_lost'] < 0.05),
        ('G5  best send at least 2x the median send on 85%+ of turns (sensible, opening deal)', pct(s['spread2']), s['spread2'] >= 0.85),
        ('G6  sensible median game 15-19 turns', s['turns'][0], 15 <= s['turns'][0] <= 19),
        ('G7  first-game minutes: median 13-16', '%.1f' % s['min_first'][0], 13 <= s['min_first'][0] <= 16),
        ('G8  first-game minutes: p90 at most 18', '%.1f' % s['min_first'][2], s['min_first'][2] <= 18),
        ('G9  first-game minutes, games that hold: median 14-17', '%.1f' % s['min_first_held'][0], 14 <= s['min_first_held'][0] <= 17),
        ('G10 war is a race: 25%+ of held games see war at 6 or more', pct(s['war_peak6_in_held']), s['war_peak6_in_held'] >= 0.25),
        ('G11 close losses (WAR while holding 18+ gold) 6-14% of games', pct(s['near_loss_gold18']), 0.06 <= s['near_loss_gold18'] <= 0.14),
        ('G12 hopeless losses (WAR holding 8 or fewer gold) under 10% of games', pct(s['hopeless']), s['hopeless'] < 0.10),
        ('G13 a weak human (novice) lasts 7+ turns at the median', nv['turns'][0], nv['turns'][0] >= 7),
        ('G14 following the shop preview number alone holds 30%+', pct(pv['not_lost']), pv['not_lost'] >= 0.30),
        ('G15 every staff in 8%+ of held line-ups (lowest)', '%s %s' % (staff_lo[1], pct(staff_lo[0])), staff_lo[0] >= 0.08),
        ('G16 no staff in more than 85% of held line-ups (highest)', '%s %s' % (staff_hi[1], pct(staff_hi[0])), staff_hi[0] <= 0.85),
        ('G17 no game stalls (every bot)', sum(S[b]['stall'] for b in S), all(S[b]['stall'] == 0 for b in S)),
    ]
    return G


def report(S, curves, overrides, n, secs):
    L = []
    w = L.append
    w('WIN THE WORLD: calibration (rules.py as committed%s)' % ('' if not overrides else ', overrides %s' % overrides))
    w('%d games per bot, seeds W0-W%d. Elapsed %.0f s.' % (n, n - 1, secs))
    w('Tunables: ' + json.dumps({k: v for k, v in R.P.items()}))
    w('Targets: ' + ', '.join('{:,}'.format(R.target(t)) for t in range(1, 31)))
    w('')
    w('GATES')
    allok = True
    for name, val, ok in gates(S):
        w('  %-4s %-86s %s' % ('PASS' if ok else 'FAIL', name, val))
        allok &= ok
    w('  => %s' % ('ALL GATES PASS' if allok else 'SOME GATES FAIL'))
    w('')
    w('OUTCOMES')
    w('  %-9s %8s %8s %8s %8s %6s | %-15s %6s %6s %6s | %-17s %-17s %-17s %-17s' % (
        'bot', 'UNITED', 'CEASEF', 'held', 'WAR', 'stall', 'turns med p10-90', 'held', 'WU', 'lost',
        'std min med/p90', 'first med/p90', 'slow med/p90', 'fast med'))
    for b in BOT_ORDER:
        s = S[b]
        w('  %-9s %8s %8s %8s %8s %6s | %4s (%2s-%2s)      %6s %6s %6s | %5.1f / %5.1f     %5.1f / %5.1f     %5.1f / %5.1f     %5.1f' % (
            b, pct(s['world_united']), pct(s['ceasefire']), pct(s['not_lost']), pct(s['war']), pct(s['stall']),
            s['turns'][0], s['turns'][1], s['turns'][2], s['turns_held'], s['turns_wu'], s['turns_lost'],
            s['min_std'][0], s['min_std'][2], s['min_first'][0], s['min_first'][2], s['min_slow'][0], s['min_slow'][2],
            s['min_fast'][0]))
    w('')
    for b in ('sensible', 'preview', 'breaker', 'greedy', 'novice', 'random'):
        s = S[b]
        w('%s' % b.upper())
        w('  minutes, games that hold: std %.1f (p10 %.1f, p90 %.1f) | first game %.1f (p90 %.1f) | slow first-timer %.1f (p90 %.1f)' % (
            *(s['min_std_held'] if s['min_std_held'][0] else (0, 0, 0)),
            *(s['min_first_held'][::2] if s['min_first_held'][0] else (0, 0)),
            *(s['min_slow_held'][::2] if s['min_slow_held'][0] else (0, 0))))
        w('  choice on the opening deal: best >= 2x median %s, >= 3x %s, median best/median %.1fx; best wins where the median misses %s; '
          'best wins %.2f more regions than the median; legal sends per deal (median) %s' % (
              pct(s['spread2']), pct(s['spread3']), s['spread_med'], pct(s['best_wins_med_misses']),
              s['regions_best_minus_med'], s['legal_med']))
        w('  best send per game: median {:,}, p90 {:,}, max {:,}; games with a 1,000,000+ send {}; sends at 10x the target or more {}'.format(
            s['best_med'], s['best_p90'], s['best_max'], pct(s['million']), pct(s['ratio10'])))
        sizes = s['sizes']
        tot = sum(sizes.values()) or 1
        w('  regions per winning send: ' + ', '.join('%d: %s' % (k, pct(v / tot)) for k, v in sorted(sizes.items())) +
          '; biggest single send per game (median) %s; games with a 5+ region send %s' % (s['max_regions_med'], pct(s['flood5'])))
        w('  war: held games that saw war at 6+ %s; held games that saw war at 8-9 %s of all games; misses per game (median) %s; '
          'misses in a row ending a loss: median %s, p90 %s' % (
              pct(s['war_peak6_in_held']), pct(s['war_peak8_in_held']), s['misses_med'], s['tail_med'], s['tail_p90']))
        w('  losses: median gold held %s, median grey left %s; close losses (WAR holding 18+ gold) %s of games; '
          'WAR with <=4 grey left (the slice measure) %s' % (
              s['lost_gold_med'], s['lost_grey_med'], pct(s['near_loss_gold18']), pct(s['near_loss'])))
        w('  final push reached in %s of games; CEASEFIRE gold held: %s; games of 25+ turns %s' % (
            pct(s['final_push']), ', '.join('%d: %d' % kv for kv in sorted(s['cf_gold'].items())) or '-', pct(s['long25'])))
        w('  dead deals (NO SEND CAN WIN): %s of turns as dealt, %s at SEND (after any swap); misses on a dead deal %s of misses; '
          'CEASEFIREs ending on a dead deal %s' % (
              pct(s['dead_dealt']), pct(s['dead_send']), pct(s['miss_dead']), pct(s['cf_dead']) if s['cf_dead'] is not None else '-'))
        w('  REORDER STAFF TO WIN (no send wins as seated, a reorder does): %s of turns as dealt; turns the bot reordered %s' % (
            pct(s['reorder_dealt']), pct(s['reordered'])))
        w('  the push (three misses allowed): turns per push median %s, p90 %s; misses per push (median) %s; pushes ending WORLD UNITED %s; '
          'pushes that missed and still united %s; push crises drawn from all red (no fresh deal could win any) %s' % (
              s['push_turns'][0], s['push_turns'][1], s['push_misses_med'],
              pct(s['push_wu']) if s['push_wu'] is not None else '-', pct(s['push_saved']) if s['push_saved'] is not None else '-',
              pct(s['push_any']) if s['push_turns'][0] is not None else '-'))
        if s['cf_why']:
            w('  CEASEFIREs whose three misses were all on deals dead as dealt %s; with SWAP unusable on all three %s; '
              'with nothing affordable at any shop after the first miss %s; all three at once %s' % tuple(pct(x) for x in s['cf_why']))
        w('  sends that pin the crisis %s; war spreads on its own per game (median) %s; staff bought per game (median) %s; '
          'hopeless losses (WAR holding <=8 gold) %s of games' % (
              pct(s['on_crisis']), s['spreads_med'], s['bought_med'], pct(s['hopeless'])))
        if b in ('sensible', 'preview', 'breaker'):
            nh = max(1, round(s['not_lost'] * s['n']))
            w('  staff in final line-ups of held games: ' + ', '.join(
                '%s %s' % (k, pct(v / nh)) for k, v in s['staff_held'].most_common()))
            missing = [k for k in R.STAFF if k not in s['staff_held']]
            if missing:
                w('  never in a held line-up: ' + ', '.join(missing))
        w('')
    w('SENSIBLE BY TURN (games still going): turn, target, games, median score, share of sends that win, median gold after, median red after')
    for row in curves['sensible']:
        w('  %2d %8s %5d %10s %6s %4s %4s' % (row[0], '{:,}'.format(row[1]), row[2], '{:,}'.format(int(row[3])), pct(row[4]), row[5], row[6]))
    w('GREEDY BY TURN')
    for row in curves['greedy']:
        w('  %2d %8s %5d %10s %6s %4s %4s' % (row[0], '{:,}'.format(row[1]), row[2], '{:,}'.format(int(row[3])), pct(row[4]), row[5], row[6]))
    return '\n'.join(L), allok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('n', nargs='?', type=int, default=5000)
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 4)
    ap.add_argument('--set', action='append', default=[])
    ap.add_argument('--bots', default=','.join(BOT_ORDER))
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    overrides = {}
    for kv in a.set:
        k, v = kv.split('=')
        overrides[k] = json.loads(v) if not v.replace('.', '').isdigit() or '.' in v else int(v)
        if isinstance(overrides[k], list):
            overrides[k] = tuple(overrides[k])
        if '.' in v:
            overrides[k] = float(v)
    _init(overrides)
    R.selftest()
    bots = a.bots.split(',')
    t0 = time.time()
    tasks = [(b, 'W%d' % i) for b in bots for i in range(a.n)]
    with Pool(a.jobs, initializer=_init, initargs=(overrides,)) as pool:
        res = pool.map(_job, tasks, chunksize=25)
    secs = time.time() - t0
    S = {b: summarize([r for r in res if r['bot'] == b]) for b in bots}
    curves = {b: curve([r for r in res if r['bot'] == b]) for b in bots}
    if set(BOT_ORDER) <= set(bots):
        text, ok = report(S, curves, overrides, a.n, secs)
        print(text)
        if a.write:
            with open(os.path.join(R.HERE, 'RESULTS.txt'), 'w', encoding='utf-8') as f:
                f.write('$ python3 calibrate.py %d --write\n\n' % a.n + text + '\n')
    else:
        for b in bots:
            s = S[b]
            print('%-9s UNITED %s CEASEFIRE %s held %s WAR %s | turns %s held %s lost %s | first min %.1f p90 %.1f held %.1f | std %.1f | spread2 %s | '
                  'war6 %s near %s | best med %s 1M %s flood5 %s | fp %s long25 %s' % (
                      b, pct(s['world_united']), pct(s['ceasefire']), pct(s['not_lost']), pct(s['war']), s['turns'], s['turns_held'],
                      s['turns_lost'], s['min_first'][0], s['min_first'][2], s['min_first_held'][0] or 0, s['min_std'][0],
                      pct(s['spread2']), pct(s['war_peak6_in_held']), pct(s['near_loss']), s['best_med'], pct(s['million']),
                      pct(s['flood5']), pct(s['final_push']), pct(s['long25'])))
            if b in ('sensible', 'preview', 'breaker'):
                nh = max(1, round(s['not_lost'] * s['n']))
                print('   staff', ', '.join('%s %s' % (k, pct(v / nh)) for k, v in s['staff_held'].most_common()),
                      '| sizes', dict(sorted(s['sizes'].items())))
        print('elapsed %.0fs' % secs)


if __name__ == '__main__':
    main()
