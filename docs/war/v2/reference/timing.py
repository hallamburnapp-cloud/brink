"""Phone time model, in seconds. It is a model built on the director's real animation timings
(src/war/ui/director/schedule.ts) plus assumed human decision times; it is not a measurement.

Send cascade (schedule.ts): 150 ms dim + 300 ms lead-in, ~300 ms per pin event, 240 ms hold,
250 ms per firing staff, 150 ms per extra per-region pop (x1.5 from a port, x2 from a capital),
320 ms hold after a multiplier, 300 ms still, 200 ms slam, ~660 ms print and roll. The whole
cascade is capped at 8 s (the director speeds up long cascades). The outcome stamp and coins take
1.2 s, then the map recolours one region at a time (0.8 s + 0.5 s a region, capped at 5 s).
"""

STANDARD = dict(
    intro=0, end=10,
    crisis=1.3, deal=1.2,                 # ring drops + board flip; regions light up
    think=14.0, per_pin=2.5, swap=7.0,    # choosing (the slowest of the three judges' constants)
    send_fixed=2.7, send_pin=0.30, send_staff=0.25, send_pop=0.15, cascade_cap=8.0,
    outcome=1.2, map_fixed=0.8, map_region=0.5, map_cap=5.0,
    shop=30.0, shop_broke=8.0,            # a visit; 8 s when no offer is affordable (look, tap NEXT)
    coach=dict(), coach_shop=0.0,
)
# A first game: the intro, plus the coach's scripted lines on turns 1-2 and at the first shop.
FIRST = dict(STANDARD, intro=25, coach={1: 15.0, 2: 6.0}, coach_shop=15.0)
# A slow first-timer.
SLOW = dict(FIRST, think=20.0, per_pin=3.0, swap=9.0, shop=50.0, shop_broke=12.0, intro=40)
# A practised, fast player.
FAST = dict(STANDARD, think=8.0, per_pin=1.8, swap=4.0, shop=20.0, shop_broke=5.0)


def seconds(game, m=STANDARD):
    t = m['intro'] + m['end']
    first_shop = True
    for r in game['log']:
        t += m['crisis'] + m['deal'] + m['think'] + m['per_pin'] * r['pins'] + m['swap'] * r['swaps']
        t += m['coach'].get(r['turn'], 0.0)
        casc = m['send_fixed'] + m['send_pin'] * r['pins'] + m['send_staff'] * r['firing'] + m['send_pop'] * r['pops']
        t += min(m['cascade_cap'], casc) + m['outcome']
        t += min(m['map_cap'], m['map_fixed'] + m['map_region'] * r['regions'])
        if 'shop_affordable' in r:
            t += m['shop'] if r['shop_affordable'] else m['shop_broke']
            if first_shop:
                t += m['coach_shop']
                first_shop = False
    return t


def minutes(game, m=STANDARD):
    return seconds(game, m) / 60.0
