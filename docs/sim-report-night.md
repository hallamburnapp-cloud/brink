# BRINK balance simulation

5000 runs per policy × 3 policies (random, greedy, heuristic) · seats: republic, federation, coalition · difficulty DEFCON 5 · mode night · seed base `NIGHTBAL`

Content: 451 cards, 64 pieces, 13 orders, 15 archetypes, 94 endings, 5 flashpoints. Final target 7000; "broke the game" at score ≥ 700000.

## Targets

| Status | Target | Value | Detail |
| --- | --- | --- | --- |
| PASS | N1 Calm (heuristic) bot reaches dawn 45–65% of nights | 61.3% | 0.62% stand-down, 60.68% survival; fell: 6.54% removed, 32.16% nuclear |
| PASS | N2 Random bot reaches dawn in fewer than 10% of nights | 7.64% | 85.72% removed, 5.7% nuclear |
| PASS | N3 Calm bot's average night 2–4 minutes (7 s per card, 4 s per roll) | 3.7 min | 28.88 cards and 5.0 rolls per night |
| PASS | N4 No single ending in more than 35% of the calm bot's nights | survival_empty_chair 26.1% | 27 distinct endings |
| PASS | N5 The crisis ends 25–45% of the calm bot's nights that reach it | 37.7% | 4922 of 5000 nights reached the crisis (act 5); 1857 fell there, 78 fell earlier; ended by act: 2: 0.02%, 3: 0.16%, 4: 1.38%, 5: 98.44% |

**5 PASS, 0 FAIL, 0 N/A.** Heuristic win rate: 61.3%.

## Summary

| Policy | Runs | Win % | Nuclear % | Median score | p99 score | Broke game % | Median min | Cards | Antes missed / run | Accidents fired / run | Timer expiry % | Near-miss % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| random | 5000 | 7.64 | 5.7 | 624 | 3255.14 | 0 | 4.12 | 21.32 | 0 | 0 | 29.91 | 9.97 |
| greedy | 5000 | 19.96 | 3.76 | 513 | 1542.04 | 0 | 4.53 | 23.05 | 0 | 0 | 9.7 | 9.96 |
| heuristic | 5000 | 61.3 | 32.16 | 1393.5 | 3452.03 | 0 | 5.58 | 28.88 | 0 | 0 | 4.97 | 9.98 |
| all | 15000 | 29.63 | 13.87 | 757 | 3129.03 | 0 | 4.92 | 24.42 | 0 | 0 | 13.27 | 9.97 |

## Policy: random

- Runs: **5000**
- Win rate (run_end ending on the last act): **7.64%**; stand-down 0.48%; nuclear 5.7%
- Score: median **624**, mean 834.33, p90 1637.2, p99 3255.14, max 5247; best single choice 105.08 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **4.12**, p10 2.7, p90 5.45
- Days: median 3.1, mean 3.26, p10 2.4, p90 4.3; cards per run 21.32
- Endless: 0 runs continued (0%), 0 endless acts on average, max 0
- Timer expiry rate: 29.91% (7048 expiries / 23567 timed cards)
- Near-miss rate: 9.97% (1483 / 14873 rolls)
- Average peak escalation: 55.03; false alarms per run: 0.261
- Top ending share: **20.7%** (removed_public_0_republic)

### Endings (random)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_public_0_republic | removed | 1035 | 20.7 |
| removed_public_0_federation | removed | 830 | 16.6 |
| removed_public_0_coalition | removed | 774 | 15.48 |
| removed_military_0 | removed | 699 | 13.98 |
| removed_allies_0_federation | removed | 508 | 10.16 |
| removed_allies_0 | removed | 318 | 6.36 |
| survival_empty_chair | survival | 153 | 3.06 |
| nuclear_forty_miles | nuclear | 91 | 1.82 |
| survival_red_dawn | survival | 88 | 1.76 |
| survival_hollow_victory | survival | 69 | 1.38 |
| nuclear_intercept_exchange | nuclear | 66 | 1.32 |
| removed_allies_0_republic | removed | 63 | 1.26 |
| special_resigned | special | 47 | 0.94 |
| nuclear_after_midnight | nuclear | 43 | 0.86 |
| survival_they_blinked | survival | 39 | 0.78 |
| removed_economy_0_federation | removed | 35 | 0.7 |
| nuclear_midnight | nuclear | 34 | 0.68 |
| nuclear_after_vellmar | nuclear | 24 | 0.48 |
| core_standdown_minimal | standdown | 22 | 0.44 |
| nuclear_dark_sky | nuclear | 14 | 0.28 |
| removed_military_100_federation | removed | 11 | 0.22 |
| removed_allies_100 | removed | 9 | 0.18 |
| nuclear_last_card | nuclear | 8 | 0.16 |
| nuclear_vestria | nuclear | 5 | 0.1 |
| survival_long_watch | survival | 5 | 0.1 |
| removed_military_100 | removed | 2 | 0.04 |
| standdown_communique | standdown | 2 | 0.04 |
| survival_cold_peace | survival | 2 | 0.04 |
| survival_line_stays | survival | 2 | 0.04 |
| removed_economy_0 | removed | 1 | 0.02 |
| removed_public_100 | removed | 1 | 0.02 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 285 | 5.7 | 285 | 5.7 |
| removed | 4286 | 85.72 | 4286 | 85.72 |
| standdown | 24 | 0.48 | 24 | 0.48 |
| survival | 358 | 7.16 | 358 | 7.16 |
| special | 47 | 0.94 | 47 | 0.94 |

### Act reached (random)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 9 | 0.18 |
| 2 | Week Two | 243 | 4.86 |
| 3 | Week Three | 1271 | 25.42 |
| 4 | Week Four | 1692 | 33.84 |
| 5 | Endgame | 1785 | 35.7 |

### Antes per act (random)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Accidents (random)

- Attached to 0% of cards (0 per run); 0% of those fired (0 per run)
- Fatal at once: 0% of fired; mean escalation per fired accident: 0

### Capital and orders (random)

- Capital earned 6.14 / spent 0.27 per run; 0 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 0 / sold 0 per run; orders bought 0 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 0 | 0 | — | 0 | — |
| say_it_again | 0 | 0 | — | 0 | — |
| double_down | 0 | 0 | — | 0 | — |
| intercept_package | 0 | 0 | — | 0 | — |
| duty_officers_veto | 0 | 0 | — | 0 | — |
| lose_the_memo | 0 | 0 | — | 0 | — |
| favour_owed | 0 | 0 | — | 0 | — |
| one_more_call | 0 | 0 | — | 0 | — |
| leaked_assessment | 0 | 0 | — | 0 | — |
| calm_the_markets | 0 | 0 | — | 0 | — |
| rally | 0 | 0 | — | 0 | — |
| muster | 0 | 0 | — | 0 | — |
| personal_letter | 0 | 0 | — | 0 | — |

### Score distribution (random)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 834.33 | 310 | 419 | 624 | 1025 | 1637.2 | 3255.14 | 5247 |

### Per seat (random)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 1666 | 9.12 | 661.5 | 3.3 | 6.24 | 83.85 | 0.78 | 8.34 | 0.78 |
| federation | 1667 | 5.58 | 599 | 3 | 4.68 | 88.9 | 0.18 | 5.4 | 0.84 |
| republic | 1667 | 8.22 | 611 | 3.1 | 6.18 | 84.4 | 0.48 | 7.74 | 1.2 |

### Piece buy rates (random)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 0 | 0 | — | — |
| dove_fm | advisor | rare | 0 | 0 | — | — |
| paranoid_intel | advisor | common | 0 | 0 | — | — |
| cautious_intel | advisor | common | 0 | 0 | — | — |
| spin_doctor | advisor | uncommon | 0 | 0 | — | — |
| ambassador | advisor | uncommon | 0 | 0 | — | — |
| cyber_director | advisor | uncommon | 0 | 0 | — | — |
| treasury_hawk | advisor | common | 0 | 0 | — | — |
| fixer | advisor | uncommon | 0 | 0 | — | — |
| admiral | advisor | uncommon | 0 | 0 | — | — |
| peace_leader | advisor | common | 0 | 0 | — | — |
| contractor | advisor | rare | 0 | 0 | — | — |
| iron_nerve | advisor | legendary | 0 | 0 | — | — |
| long_table | advisor | legendary | 0 | 0 | — | — |
| field_marshal | advisor | rare | 0 | 0 | — | — |
| press_office | advisor | rare | 0 | 0 | — | — |
| attache | advisor | uncommon | 0 | 0 | — | — |
| lobby | advisor | uncommon | 0 | 0 | — | — |
| pollster | advisor | common | 0 | 0 | — | — |
| early_warning | asset | uncommon | 0 | 0 | — | — |
| back_channel | asset | uncommon | 0 | 0 | — | — |
| cyber_unit | asset | uncommon | 0 | 0 | — | — |
| missile_defence | asset | uncommon | 0 | 0 | — | — |
| blue_water_fleet | asset | uncommon | 0 | 0 | — | — |
| hardened_nc3 | asset | rare | 0 | 0 | — | — |
| commercial_sat | asset | common | 0 | 0 | — | — |
| allied_basing | asset | common | 0 | 0 | — | — |
| strategic_reserve | asset | common | 0 | 0 | — | — |
| rapid_response | asset | uncommon | 0 | 0 | — | — |
| signals_intercept | asset | rare | 0 | 0 | — | — |
| civil_defence | asset | uncommon | 0 | 0 | — | — |
| deadman_switch | asset | legendary | 0 | 0 | — | — |
| perfect_intel | asset | legendary | 0 | 0 | — | — |
| open_line | asset | legendary | 0 | 0 | — | — |
| war_economy | asset | legendary | 0 | 0 | — | — |
| whispers | asset | rare | 0 | 0 | — | — |
| ledger | asset | rare | 0 | 0 | — | — |
| war_bonds | asset | rare | 0 | 0 | — | — |
| tripwire | asset | rare | 0 | 0 | — | — |
| quiet_room | asset | rare | 0 | 0 | — | — |
| dockyards | asset | uncommon | 0 | 0 | — | — |
| bunker | asset | uncommon | 0 | 0 | — | — |
| war_room | asset | uncommon | 0 | 0 | — | — |
| staff_college | asset | common | 0 | 0 | — | — |
| trade_desk | asset | common | 0 | 0 | — | — |
| courier | asset | common | 0 | 0 | — | — |
| launch_on_warning | doctrine | rare | 0 | 0 | — | — |
| deterrence_by_denial | doctrine | uncommon | 0 | 0 | — | — |
| strategic_ambiguity | doctrine | uncommon | 0 | 0 | — | — |
| no_first_use | doctrine | uncommon | 0 | 0 | — | — |
| escalate_to_deescalate | doctrine | rare | 0 | 0 | — | — |
| alliance_first | doctrine | common | 0 | 0 | — | — |
| fortress | doctrine | common | 0 | 0 | — | — |
| transparency | doctrine | uncommon | 0 | 0 | — | — |
| red_lines | doctrine | rare | 0 | 0 | — | — |
| hotline_protocol | doctrine | uncommon | 0 | 0 | — | — |
| predelegation | doctrine | uncommon | 0 | 0 | — | — |
| minimal_deterrence | doctrine | rare | 0 | 0 | — | — |
| madman_theory | doctrine | legendary | 0 | 0 | — | — |
| brinkmanship | doctrine | legendary | 0 | 0 | — | — |
| domino_theory | doctrine | legendary | 0 | 0 | — | — |
| the_button | doctrine | legendary | 0 | 0 | — | — |
| second_strike | doctrine | rare | 0 | 0 | — | — |
| propaganda | doctrine | uncommon | 0 | 0 | — | — |

All offered pieces are inside the band.

### Card coverage (random)

- Cards never seen: 157 — adv_01_a_senior_defence_source, adv_02_what_a_person_is_worth, adv_03_the_invoice, adv_04_over_her_head, adv_05_one_sentence, adv_06_you_may_prefer_not_to_know, adv_07_the_army_will_hear_it, adv_08_a_number_not_on_any_list, adv_09_the_other_seven, adv_10_three_days, adv_11_over_dinner, adv_12_a_tourist_visa, adv_13_ninety_percent, adv_14_is_and_consistent_with, adv_15_the_word_ceiling, adv_16_a_fellowship_abroad, adv_17_forty_minutes, adv_18_as_a_person, adv_19_both_sides_of_the_border, adv_20_the_minutes, adv_22_seven_times_in_ten, adv_23_as_if_you_had_not_said_it, adv_24_engineers, adv_25_one_of_them_did, adv_26_the_square_does_not_keep_a_diary, adv_27_no_hard_feelings, adv_28_the_florist, ally_14_the_council_voted, ally_15_caldors_objection, ally_16_inside_the_ring, ally_17_the_fourth_call, ally_18_a_form_of_words, blockade_07_her_ships, blockade_19_the_carrier, blockade_20_thirty_one_days, blockade_26_the_order, blockade_23_two_numbers, blockade_24_eleven_days, bluff_01_the_shrug, bluff_02_the_editorial, bluff_03_the_ally, bluff_04_the_markets, bluff_05_the_staff, bluff_06_the_envoy, cyberew_07_working_hours, cyberew_10_reciprocity, cyberew_11_their_reading, cyberew_13_page_eleven, cyberew_14_paper_and_phone, cyberew_15_thirty_one_attempts, cyberew_16_our_own_tool, cyberew_22_their_bombers, debris_02_the_intercept, debris_08_the_question_mark, debris_11_calibrations, debris_15_the_glass_house, debris_16_supplier_or_combatant, debris_17_eleven_seconds, debris_18_without_consensus, defector_08_on_background, defector_09_everything_fits, defector_10_nine_days, defector_11_corroboration, defector_12_the_package, defector_17_tuesdays_assessment, dom_coa_06_the_lease, dom_fed_10_ninety_days, dom_rep_12_the_runways, falarm_11_high_cloud, falarm_12_range_hot, falarm_13_sun_glint, falarm_17_three_keys, falarm_18_the_doctrine, falarm_19_unsleeping, falarm_20_measured, falarm_21_sirens, fp_cascade_01_same_hour, fp_cascade_02_the_physics, fp_cascade_03_the_dark_board, fp_cascade_04_consistent_with, fp_cascade_07_the_building, fp_cascade_08a_the_operator, fp_cascade_08b_the_shrug, fp_cascade_09_the_call, fp_cascade_11_the_blind_minute, fp_cascade_12_the_pause, fp_cascade_13_the_name, fp_cascade_14_the_long_night, fp_intercept_04a_the_layer_you_did_not_use, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, fp_intercept_fa_06_the_sirens, fp_line_01_the_hail, fp_line_02_on_deck, fp_line_03_warned_off, fp_line_05a_the_carrier, fp_line_05b_the_chart, fp_line_06_the_seizure, fp_line_07_the_photographs, fp_line_08_hands_on_the_switch, fp_line_09_the_straits, fp_line_10a_the_second_line, fp_line_10b_the_line_tomorrow, fp_line_11_the_morning_count, fp_midnight_06_the_word_any, fp_midnight_07_two_statements, fp_midnight_08_two_readings, fp_midnight_09_the_protocol, fp_summit_02_the_photographs, fp_summit_03_flatbeds, fp_summit_04_candles, fp_summit_07_in_writing, fp_summit_08_her_paragraph, fp_summit_09_the_lake_steps, fp_summit_10_four_lines, proxy_08_six_hours, proxy_09_an_afternoon, proxy_10_winnable, proxy_11_the_estimate, proxy_12_your_runways, proxy_13_the_road_to_hollin, proxy_14_nothing_without, proxy_15_the_compact_battalion, blackout_10_consistent_with, blackout_11_the_hedge, blackout_12_same_orbit, blackout_13_the_inspector, blackout_14_the_shareholders, blackout_15_nine_percent, blackout_16_do_it_back, blackout_17_footprints, summit_09_the_handshake, summit_15_the_deputys_lunch, summit_16_the_academic, summit_17_consecutive_days, summit_18_the_promise, summit_19_eleven_calls, summit_20_half_of_them, summit_21_the_other_half, summit_22_the_square, ultimatum_15_two_readings, ultimatum_16_the_wrong_signal, ultimatum_17_any_means_any, ultimatum_18_your_own_words, ultimatum_19_the_climbdown, ultimatum_20_the_half_life, ultimatum_21_the_open_line, ultimatum_22_three_calls, cables_05_the_detour, cables_22_a_week, cables_15_forty_metres, cables_16_the_escort_line, cables_17_forty_minutes, cables_18_eleven_hundred_tonnes, cables_19_unsigned, cables_20_ninety_days, cables_21_my_nine
- Rare cards (seen in < 0.5% of runs): 18 — blockade_22_two_days (18), cyberew_21_the_motion (11), debris_20_an_inch (1), defector_22_courtesies (2), defector_23_nothing_crossed (13), dom_coa_16_thirty_per_cent (9), dom_rep_08_say_it_aloud (14), fp_intercept_09_the_question (7), fp_midnight_12_have_you_eaten (14), fp_midnight_13_the_record (19), fp_midnight_14_they_blinked (23), proxy_20_the_column (1), proxy_21_across_the_aum (4), proxy_24_contact (1), proxy_26_the_motion (2), blackout_26_in_the_way (11), summit_24_what_it_bought (12), ultimatum_23_what_they_see (4)

## Policy: greedy

- Runs: **5000** (998 hit the step cap without ending)
- Win rate (run_end ending on the last act): **19.96%**; stand-down 7.06%; nuclear 3.76%
- Score: median **513**, mean 566.62, p90 850, p99 1542.04, max 4028; best single choice 55.47 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **4.53**, p10 3.13, p90 5.63
- Days: median 3.4, mean 3.5, p10 2.6, p90 4.45; cards per run 23.05
- Endless: 0 runs continued (0%), 0 endless acts on average, max 0
- Timer expiry rate: 9.7% (2394 expiries / 24669 timed cards)
- Near-miss rate: 9.96% (1648 / 16553 rolls)
- Average peak escalation: 38.45; false alarms per run: 0.283
- Top ending share: **22.84%** (removed_military_0)

### Endings (greedy)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_military_0 | removed | 1142 | 22.84 |
| removed_public_0_federation | removed | 883 | 17.66 |
| removed_public_0_republic | removed | 780 | 15.6 |
| removed_public_0_coalition | removed | 743 | 14.86 |
| survival_empty_chair | survival | 435 | 8.7 |
| core_standdown_minimal | standdown | 344 | 6.88 |
| special_resigned | special | 150 | 3 |
| survival_hollow_victory | survival | 126 | 2.52 |
| nuclear_midnight | nuclear | 113 | 2.26 |
| nuclear_intercept_exchange | nuclear | 64 | 1.28 |
| removed_allies_0 | removed | 42 | 0.84 |
| removed_allies_0_federation | removed | 40 | 0.8 |
| survival_they_blinked | survival | 32 | 0.64 |
| survival_red_dawn | survival | 31 | 0.62 |
| removed_allies_0_republic | removed | 25 | 0.5 |
| removed_economy_0_federation | removed | 9 | 0.18 |
| survival_cold_peace | survival | 9 | 0.18 |
| standdown_unloved | standdown | 6 | 0.12 |
| survival_long_watch | survival | 6 | 0.12 |
| survival_quiet_dawn | survival | 4 | 0.08 |
| nuclear_after_midnight | nuclear | 3 | 0.06 |
| nuclear_after_vellmar | nuclear | 3 | 0.06 |
| nuclear_dark_sky | nuclear | 2 | 0.04 |
| nuclear_forty_miles | nuclear | 2 | 0.04 |
| standdown_communique | standdown | 2 | 0.04 |
| survival_frozen_front | survival | 2 | 0.04 |
| nuclear_last_card | nuclear | 1 | 0.02 |
| standdown_empty_sky | standdown | 1 | 0.02 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 188 | 3.76 | 188 | 3.76 |
| removed | 3664 | 73.28 | 3664 | 73.28 |
| standdown | 353 | 7.06 | 353 | 7.06 |
| survival | 645 | 12.9 | 645 | 12.9 |
| special | 150 | 3 | 150 | 3 |

### Act reached (greedy)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 2 | Week Two | 89 | 1.78 |
| 3 | Week Three | 942 | 18.84 |
| 4 | Week Four | 1577 | 31.54 |
| 5 | Endgame | 2392 | 47.84 |

### Antes per act (greedy)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Accidents (greedy)

- Attached to 0% of cards (0 per run); 0% of those fired (0 per run)
- Fatal at once: 0% of fired; mean escalation per fired accident: 0

### Capital and orders (greedy)

- Capital earned 6.67 / spent 0.33 per run; 0 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 0 / sold 0 per run; orders bought 0 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 0 | 0 | — | 0 | — |
| say_it_again | 0 | 0 | — | 0 | — |
| double_down | 0 | 0 | — | 0 | — |
| intercept_package | 0 | 0 | — | 0 | — |
| duty_officers_veto | 0 | 0 | — | 0 | — |
| lose_the_memo | 0 | 0 | — | 0 | — |
| favour_owed | 0 | 0 | — | 0 | — |
| one_more_call | 0 | 0 | — | 0 | — |
| leaked_assessment | 0 | 0 | — | 0 | — |
| calm_the_markets | 0 | 0 | — | 0 | — |
| rally | 0 | 0 | — | 0 | — |
| muster | 0 | 0 | — | 0 | — |
| personal_letter | 0 | 0 | — | 0 | — |

### Score distribution (greedy)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 566.62 | 324.9 | 394 | 513 | 674 | 850 | 1542.04 | 4028 |

### Per seat (greedy)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 1666 | 22.39 | 530 | 3.5 | 4.98 | 70.05 | 8.1 | 14.29 | 2.58 |
| federation | 1667 | 15.3 | 483 | 3.3 | 1.92 | 79.54 | 5.58 | 9.72 | 3.24 |
| republic | 1667 | 22.2 | 525 | 3.4 | 4.38 | 70.25 | 7.5 | 14.7 | 3.18 |

### Piece buy rates (greedy)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 0 | 0 | — | — |
| dove_fm | advisor | rare | 0 | 0 | — | — |
| paranoid_intel | advisor | common | 0 | 0 | — | — |
| cautious_intel | advisor | common | 0 | 0 | — | — |
| spin_doctor | advisor | uncommon | 0 | 0 | — | — |
| ambassador | advisor | uncommon | 0 | 0 | — | — |
| cyber_director | advisor | uncommon | 0 | 0 | — | — |
| treasury_hawk | advisor | common | 0 | 0 | — | — |
| fixer | advisor | uncommon | 0 | 0 | — | — |
| admiral | advisor | uncommon | 0 | 0 | — | — |
| peace_leader | advisor | common | 0 | 0 | — | — |
| contractor | advisor | rare | 0 | 0 | — | — |
| iron_nerve | advisor | legendary | 0 | 0 | — | — |
| long_table | advisor | legendary | 0 | 0 | — | — |
| field_marshal | advisor | rare | 0 | 0 | — | — |
| press_office | advisor | rare | 0 | 0 | — | — |
| attache | advisor | uncommon | 0 | 0 | — | — |
| lobby | advisor | uncommon | 0 | 0 | — | — |
| pollster | advisor | common | 0 | 0 | — | — |
| early_warning | asset | uncommon | 0 | 0 | — | — |
| back_channel | asset | uncommon | 0 | 0 | — | — |
| cyber_unit | asset | uncommon | 0 | 0 | — | — |
| missile_defence | asset | uncommon | 0 | 0 | — | — |
| blue_water_fleet | asset | uncommon | 0 | 0 | — | — |
| hardened_nc3 | asset | rare | 0 | 0 | — | — |
| commercial_sat | asset | common | 0 | 0 | — | — |
| allied_basing | asset | common | 0 | 0 | — | — |
| strategic_reserve | asset | common | 0 | 0 | — | — |
| rapid_response | asset | uncommon | 0 | 0 | — | — |
| signals_intercept | asset | rare | 0 | 0 | — | — |
| civil_defence | asset | uncommon | 0 | 0 | — | — |
| deadman_switch | asset | legendary | 0 | 0 | — | — |
| perfect_intel | asset | legendary | 0 | 0 | — | — |
| open_line | asset | legendary | 0 | 0 | — | — |
| war_economy | asset | legendary | 0 | 0 | — | — |
| whispers | asset | rare | 0 | 0 | — | — |
| ledger | asset | rare | 0 | 0 | — | — |
| war_bonds | asset | rare | 0 | 0 | — | — |
| tripwire | asset | rare | 0 | 0 | — | — |
| quiet_room | asset | rare | 0 | 0 | — | — |
| dockyards | asset | uncommon | 0 | 0 | — | — |
| bunker | asset | uncommon | 0 | 0 | — | — |
| war_room | asset | uncommon | 0 | 0 | — | — |
| staff_college | asset | common | 0 | 0 | — | — |
| trade_desk | asset | common | 0 | 0 | — | — |
| courier | asset | common | 0 | 0 | — | — |
| launch_on_warning | doctrine | rare | 0 | 0 | — | — |
| deterrence_by_denial | doctrine | uncommon | 0 | 0 | — | — |
| strategic_ambiguity | doctrine | uncommon | 0 | 0 | — | — |
| no_first_use | doctrine | uncommon | 0 | 0 | — | — |
| escalate_to_deescalate | doctrine | rare | 0 | 0 | — | — |
| alliance_first | doctrine | common | 0 | 0 | — | — |
| fortress | doctrine | common | 0 | 0 | — | — |
| transparency | doctrine | uncommon | 0 | 0 | — | — |
| red_lines | doctrine | rare | 0 | 0 | — | — |
| hotline_protocol | doctrine | uncommon | 0 | 0 | — | — |
| predelegation | doctrine | uncommon | 0 | 0 | — | — |
| minimal_deterrence | doctrine | rare | 0 | 0 | — | — |
| madman_theory | doctrine | legendary | 0 | 0 | — | — |
| brinkmanship | doctrine | legendary | 0 | 0 | — | — |
| domino_theory | doctrine | legendary | 0 | 0 | — | — |
| the_button | doctrine | legendary | 0 | 0 | — | — |
| second_strike | doctrine | rare | 0 | 0 | — | — |
| propaganda | doctrine | uncommon | 0 | 0 | — | — |

All offered pieces are inside the band.

### Card coverage (greedy)

- Cards never seen: 160 — adv_01_a_senior_defence_source, adv_02_what_a_person_is_worth, adv_03_the_invoice, adv_04_over_her_head, adv_05_one_sentence, adv_06_you_may_prefer_not_to_know, adv_07_the_army_will_hear_it, adv_08_a_number_not_on_any_list, adv_09_the_other_seven, adv_10_three_days, adv_11_over_dinner, adv_12_a_tourist_visa, adv_13_ninety_percent, adv_14_is_and_consistent_with, adv_15_the_word_ceiling, adv_16_a_fellowship_abroad, adv_17_forty_minutes, adv_18_as_a_person, adv_19_both_sides_of_the_border, adv_20_the_minutes, adv_22_seven_times_in_ten, adv_23_as_if_you_had_not_said_it, adv_24_engineers, adv_25_one_of_them_did, adv_26_the_square_does_not_keep_a_diary, adv_27_no_hard_feelings, adv_28_the_florist, ally_14_the_council_voted, ally_15_caldors_objection, ally_16_inside_the_ring, ally_17_the_fourth_call, ally_18_a_form_of_words, blockade_07_her_ships, blockade_19_the_carrier, blockade_20_thirty_one_days, blockade_26_the_order, blockade_23_two_numbers, blockade_24_eleven_days, bluff_01_the_shrug, bluff_02_the_editorial, bluff_03_the_ally, bluff_04_the_markets, bluff_05_the_staff, bluff_06_the_envoy, cyberew_07_working_hours, cyberew_10_reciprocity, cyberew_11_their_reading, cyberew_13_page_eleven, cyberew_14_paper_and_phone, cyberew_15_thirty_one_attempts, cyberew_16_our_own_tool, cyberew_22_their_bombers, debris_02_the_intercept, debris_08_the_question_mark, debris_11_calibrations, debris_15_the_glass_house, debris_16_supplier_or_combatant, debris_17_eleven_seconds, debris_18_without_consensus, defector_08_on_background, defector_09_everything_fits, defector_10_nine_days, defector_11_corroboration, defector_12_the_package, defector_17_tuesdays_assessment, defector_23_nothing_crossed, dom_coa_06_the_lease, dom_fed_10_ninety_days, dom_rep_12_the_runways, falarm_11_high_cloud, falarm_12_range_hot, falarm_13_sun_glint, falarm_17_three_keys, falarm_18_the_doctrine, falarm_19_unsleeping, falarm_20_measured, falarm_21_sirens, fp_cascade_01_same_hour, fp_cascade_02_the_physics, fp_cascade_03_the_dark_board, fp_cascade_04_consistent_with, fp_cascade_07_the_building, fp_cascade_08a_the_operator, fp_cascade_08b_the_shrug, fp_cascade_09_the_call, fp_cascade_11_the_blind_minute, fp_cascade_12_the_pause, fp_cascade_13_the_name, fp_cascade_14_the_long_night, fp_intercept_04a_the_layer_you_did_not_use, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, fp_intercept_fa_06_the_sirens, fp_line_01_the_hail, fp_line_02_on_deck, fp_line_03_warned_off, fp_line_05a_the_carrier, fp_line_05b_the_chart, fp_line_06_the_seizure, fp_line_07_the_photographs, fp_line_08_hands_on_the_switch, fp_line_09_the_straits, fp_line_10a_the_second_line, fp_line_10b_the_line_tomorrow, fp_line_11_the_morning_count, fp_midnight_06_the_word_any, fp_midnight_07_two_statements, fp_midnight_08_two_readings, fp_midnight_09_the_protocol, fp_summit_02_the_photographs, fp_summit_03_flatbeds, fp_summit_04_candles, fp_summit_07_in_writing, fp_summit_08_her_paragraph, fp_summit_09_the_lake_steps, fp_summit_10_four_lines, proxy_08_six_hours, proxy_09_an_afternoon, proxy_10_winnable, proxy_11_the_estimate, proxy_12_your_runways, proxy_13_the_road_to_hollin, proxy_14_nothing_without, proxy_15_the_compact_battalion, proxy_21_across_the_aum, proxy_24_contact, blackout_10_consistent_with, blackout_11_the_hedge, blackout_12_same_orbit, blackout_13_the_inspector, blackout_14_the_shareholders, blackout_15_nine_percent, blackout_16_do_it_back, blackout_17_footprints, summit_09_the_handshake, summit_15_the_deputys_lunch, summit_16_the_academic, summit_17_consecutive_days, summit_18_the_promise, summit_19_eleven_calls, summit_20_half_of_them, summit_21_the_other_half, summit_22_the_square, ultimatum_15_two_readings, ultimatum_16_the_wrong_signal, ultimatum_17_any_means_any, ultimatum_18_your_own_words, ultimatum_19_the_climbdown, ultimatum_20_the_half_life, ultimatum_21_the_open_line, ultimatum_22_three_calls, cables_05_the_detour, cables_22_a_week, cables_15_forty_metres, cables_16_the_escort_line, cables_17_forty_minutes, cables_18_eleven_hundred_tonnes, cables_19_unsigned, cables_20_ninety_days, cables_21_my_nine
- Rare cards (seen in < 0.5% of runs): 15 — blockade_09_boarded (15), blockade_06_the_word (1), blockade_22_two_days (13), cyberew_09_what_it_asked (11), cyberew_21_the_motion (7), debris_20_an_inch (4), defector_22_courtesies (2), dom_coa_16_thirty_per_cent (20), fp_midnight_12_have_you_eaten (12), proxy_20_the_column (1), proxy_26_the_motion (1), blackout_26_in_the_way (4), summit_24_what_it_bought (12), ultimatum_08_indicative (21), ultimatum_23_what_they_see (6)

## Policy: heuristic

- Runs: **5000** (3065 hit the step cap without ending)
- Win rate (run_end ending on the last act): **61.3%**; stand-down 0.62%; nuclear 32.16%
- Score: median **1393.5**, mean 1506.26, p90 2283.1, p99 3452.03, max 4905; best single choice 203.88 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **5.58**, p10 4.97, p90 6.38
- Days: median 4.45, mean 4.47, p10 4.1, p90 4.9; cards per run 28.88
- Endless: 0 runs continued (0%), 0 endless acts on average, max 0
- Timer expiry rate: 4.97% (1818 expiries / 36591 timed cards)
- Near-miss rate: 9.98% (2477 / 24825 rolls)
- Average peak escalation: 78.78; false alarms per run: 0.328
- Top ending share: **26.1%** (survival_empty_chair)

### Endings (heuristic)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| survival_empty_chair | survival | 1305 | 26.1 |
| survival_red_dawn | survival | 865 | 17.3 |
| nuclear_midnight | nuclear | 597 | 11.94 |
| nuclear_intercept_exchange | nuclear | 504 | 10.08 |
| survival_hollow_victory | survival | 352 | 7.04 |
| survival_they_blinked | survival | 331 | 6.62 |
| nuclear_after_vellmar | nuclear | 183 | 3.66 |
| nuclear_forty_miles | nuclear | 143 | 2.86 |
| nuclear_after_midnight | nuclear | 125 | 2.5 |
| removed_public_0_federation | removed | 86 | 1.72 |
| survival_line_stays | survival | 62 | 1.24 |
| removed_public_0_republic | removed | 60 | 1.2 |
| survival_long_watch | survival | 50 | 1 |
| removed_public_0_coalition | removed | 49 | 0.98 |
| removed_allies_0_federation | removed | 48 | 0.96 |
| survival_cold_peace | survival | 48 | 0.96 |
| core_standdown_minimal | standdown | 31 | 0.62 |
| removed_allies_0_republic | removed | 27 | 0.54 |
| removed_economy_0_federation | removed | 26 | 0.52 |
| nuclear_last_card | nuclear | 25 | 0.5 |
| nuclear_dark_sky | nuclear | 24 | 0.48 |
| removed_allies_0 | removed | 21 | 0.42 |
| survival_quiet_dawn | survival | 11 | 0.22 |
| survival_frozen_front | survival | 10 | 0.2 |
| removed_military_0 | removed | 9 | 0.18 |
| nuclear_vestria | nuclear | 7 | 0.14 |
| removed_economy_0 | removed | 1 | 0.02 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 1608 | 32.16 | 1608 | 32.16 |
| removed | 327 | 6.54 | 327 | 6.54 |
| standdown | 31 | 0.62 | 31 | 0.62 |
| survival | 3034 | 60.68 | 3034 | 60.68 |
| special | 0 | 0 | 0 | 0 |

### Act reached (heuristic)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 2 | Week Two | 1 | 0.02 |
| 3 | Week Three | 8 | 0.16 |
| 4 | Week Four | 69 | 1.38 |
| 5 | Endgame | 4922 | 98.44 |

### Antes per act (heuristic)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Accidents (heuristic)

- Attached to 0% of cards (0 per run); 0% of those fired (0 per run)
- Fatal at once: 0% of fired; mean escalation per fired accident: 0

### Capital and orders (heuristic)

- Capital earned 8.14 / spent 0.46 per run; 0 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 0 / sold 0 per run; orders bought 0 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 0 | 0 | — | 0 | — |
| say_it_again | 0 | 0 | — | 0 | — |
| double_down | 0 | 0 | — | 0 | — |
| intercept_package | 0 | 0 | — | 0 | — |
| duty_officers_veto | 0 | 0 | — | 0 | — |
| lose_the_memo | 0 | 0 | — | 0 | — |
| favour_owed | 0 | 0 | — | 0 | — |
| one_more_call | 0 | 0 | — | 0 | — |
| leaked_assessment | 0 | 0 | — | 0 | — |
| calm_the_markets | 0 | 0 | — | 0 | — |
| rally | 0 | 0 | — | 0 | — |
| muster | 0 | 0 | — | 0 | — |
| personal_letter | 0 | 0 | — | 0 | — |

### Score distribution (heuristic)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1506.26 | 851.9 | 1063 | 1393.5 | 1830 | 2283.1 | 3452.03 | 4905 |

### Per seat (heuristic)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 1666 | 64.23 | 1370 | 4.48 | 31.45 | 4.32 | 0.84 | 63.39 | 0 |
| federation | 1667 | 56.99 | 1437 | 4.45 | 33.29 | 9.72 | 0.36 | 56.63 | 0 |
| republic | 1667 | 62.69 | 1376 | 4.45 | 31.73 | 5.58 | 0.66 | 62.03 | 0 |

### Piece buy rates (heuristic)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 0 | 0 | — | — |
| dove_fm | advisor | rare | 0 | 0 | — | — |
| paranoid_intel | advisor | common | 0 | 0 | — | — |
| cautious_intel | advisor | common | 0 | 0 | — | — |
| spin_doctor | advisor | uncommon | 0 | 0 | — | — |
| ambassador | advisor | uncommon | 0 | 0 | — | — |
| cyber_director | advisor | uncommon | 0 | 0 | — | — |
| treasury_hawk | advisor | common | 0 | 0 | — | — |
| fixer | advisor | uncommon | 0 | 0 | — | — |
| admiral | advisor | uncommon | 0 | 0 | — | — |
| peace_leader | advisor | common | 0 | 0 | — | — |
| contractor | advisor | rare | 0 | 0 | — | — |
| iron_nerve | advisor | legendary | 0 | 0 | — | — |
| long_table | advisor | legendary | 0 | 0 | — | — |
| field_marshal | advisor | rare | 0 | 0 | — | — |
| press_office | advisor | rare | 0 | 0 | — | — |
| attache | advisor | uncommon | 0 | 0 | — | — |
| lobby | advisor | uncommon | 0 | 0 | — | — |
| pollster | advisor | common | 0 | 0 | — | — |
| early_warning | asset | uncommon | 0 | 0 | — | — |
| back_channel | asset | uncommon | 0 | 0 | — | — |
| cyber_unit | asset | uncommon | 0 | 0 | — | — |
| missile_defence | asset | uncommon | 0 | 0 | — | — |
| blue_water_fleet | asset | uncommon | 0 | 0 | — | — |
| hardened_nc3 | asset | rare | 0 | 0 | — | — |
| commercial_sat | asset | common | 0 | 0 | — | — |
| allied_basing | asset | common | 0 | 0 | — | — |
| strategic_reserve | asset | common | 0 | 0 | — | — |
| rapid_response | asset | uncommon | 0 | 0 | — | — |
| signals_intercept | asset | rare | 0 | 0 | — | — |
| civil_defence | asset | uncommon | 0 | 0 | — | — |
| deadman_switch | asset | legendary | 0 | 0 | — | — |
| perfect_intel | asset | legendary | 0 | 0 | — | — |
| open_line | asset | legendary | 0 | 0 | — | — |
| war_economy | asset | legendary | 0 | 0 | — | — |
| whispers | asset | rare | 0 | 0 | — | — |
| ledger | asset | rare | 0 | 0 | — | — |
| war_bonds | asset | rare | 0 | 0 | — | — |
| tripwire | asset | rare | 0 | 0 | — | — |
| quiet_room | asset | rare | 0 | 0 | — | — |
| dockyards | asset | uncommon | 0 | 0 | — | — |
| bunker | asset | uncommon | 0 | 0 | — | — |
| war_room | asset | uncommon | 0 | 0 | — | — |
| staff_college | asset | common | 0 | 0 | — | — |
| trade_desk | asset | common | 0 | 0 | — | — |
| courier | asset | common | 0 | 0 | — | — |
| launch_on_warning | doctrine | rare | 0 | 0 | — | — |
| deterrence_by_denial | doctrine | uncommon | 0 | 0 | — | — |
| strategic_ambiguity | doctrine | uncommon | 0 | 0 | — | — |
| no_first_use | doctrine | uncommon | 0 | 0 | — | — |
| escalate_to_deescalate | doctrine | rare | 0 | 0 | — | — |
| alliance_first | doctrine | common | 0 | 0 | — | — |
| fortress | doctrine | common | 0 | 0 | — | — |
| transparency | doctrine | uncommon | 0 | 0 | — | — |
| red_lines | doctrine | rare | 0 | 0 | — | — |
| hotline_protocol | doctrine | uncommon | 0 | 0 | — | — |
| predelegation | doctrine | uncommon | 0 | 0 | — | — |
| minimal_deterrence | doctrine | rare | 0 | 0 | — | — |
| madman_theory | doctrine | legendary | 0 | 0 | — | — |
| brinkmanship | doctrine | legendary | 0 | 0 | — | — |
| domino_theory | doctrine | legendary | 0 | 0 | — | — |
| the_button | doctrine | legendary | 0 | 0 | — | — |
| second_strike | doctrine | rare | 0 | 0 | — | — |
| propaganda | doctrine | uncommon | 0 | 0 | — | — |

All offered pieces are inside the band.

### Card coverage (heuristic)

- Cards never seen: 159 — adv_01_a_senior_defence_source, adv_02_what_a_person_is_worth, adv_03_the_invoice, adv_04_over_her_head, adv_05_one_sentence, adv_06_you_may_prefer_not_to_know, adv_07_the_army_will_hear_it, adv_08_a_number_not_on_any_list, adv_09_the_other_seven, adv_10_three_days, adv_11_over_dinner, adv_12_a_tourist_visa, adv_13_ninety_percent, adv_14_is_and_consistent_with, adv_15_the_word_ceiling, adv_16_a_fellowship_abroad, adv_17_forty_minutes, adv_18_as_a_person, adv_19_both_sides_of_the_border, adv_20_the_minutes, adv_22_seven_times_in_ten, adv_23_as_if_you_had_not_said_it, adv_24_engineers, adv_25_one_of_them_did, adv_26_the_square_does_not_keep_a_diary, adv_27_no_hard_feelings, adv_28_the_florist, ally_14_the_council_voted, ally_15_caldors_objection, ally_16_inside_the_ring, ally_17_the_fourth_call, ally_18_a_form_of_words, blockade_07_her_ships, blockade_19_the_carrier, blockade_20_thirty_one_days, blockade_26_the_order, blockade_23_two_numbers, blockade_24_eleven_days, bluff_01_the_shrug, bluff_02_the_editorial, bluff_03_the_ally, bluff_04_the_markets, bluff_05_the_staff, bluff_06_the_envoy, cyberew_07_working_hours, cyberew_10_reciprocity, cyberew_11_their_reading, cyberew_13_page_eleven, cyberew_14_paper_and_phone, cyberew_15_thirty_one_attempts, cyberew_16_our_own_tool, cyberew_22_their_bombers, debris_02_the_intercept, debris_08_the_question_mark, debris_11_calibrations, debris_15_the_glass_house, debris_16_supplier_or_combatant, debris_17_eleven_seconds, debris_18_without_consensus, debris_20_an_inch, defector_08_on_background, defector_09_everything_fits, defector_10_nine_days, defector_11_corroboration, defector_12_the_package, defector_17_tuesdays_assessment, dom_coa_06_the_lease, dom_fed_10_ninety_days, dom_rep_12_the_runways, falarm_11_high_cloud, falarm_12_range_hot, falarm_13_sun_glint, falarm_17_three_keys, falarm_18_the_doctrine, falarm_19_unsleeping, falarm_20_measured, falarm_21_sirens, fp_cascade_01_same_hour, fp_cascade_02_the_physics, fp_cascade_03_the_dark_board, fp_cascade_04_consistent_with, fp_cascade_07_the_building, fp_cascade_08a_the_operator, fp_cascade_08b_the_shrug, fp_cascade_09_the_call, fp_cascade_11_the_blind_minute, fp_cascade_12_the_pause, fp_cascade_13_the_name, fp_cascade_14_the_long_night, fp_intercept_04a_the_layer_you_did_not_use, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, fp_intercept_fa_06_the_sirens, fp_line_01_the_hail, fp_line_02_on_deck, fp_line_03_warned_off, fp_line_05a_the_carrier, fp_line_05b_the_chart, fp_line_06_the_seizure, fp_line_07_the_photographs, fp_line_08_hands_on_the_switch, fp_line_09_the_straits, fp_line_10a_the_second_line, fp_line_10b_the_line_tomorrow, fp_line_11_the_morning_count, fp_midnight_06_the_word_any, fp_midnight_07_two_statements, fp_midnight_08_two_readings, fp_midnight_09_the_protocol, fp_summit_02_the_photographs, fp_summit_03_flatbeds, fp_summit_04_candles, fp_summit_07_in_writing, fp_summit_08_her_paragraph, fp_summit_09_the_lake_steps, fp_summit_10_four_lines, proxy_08_six_hours, proxy_09_an_afternoon, proxy_10_winnable, proxy_11_the_estimate, proxy_12_your_runways, proxy_13_the_road_to_hollin, proxy_14_nothing_without, proxy_15_the_compact_battalion, proxy_26_the_motion, blackout_10_consistent_with, blackout_11_the_hedge, blackout_12_same_orbit, blackout_13_the_inspector, blackout_14_the_shareholders, blackout_15_nine_percent, blackout_16_do_it_back, blackout_17_footprints, summit_09_the_handshake, summit_15_the_deputys_lunch, summit_16_the_academic, summit_17_consecutive_days, summit_18_the_promise, summit_19_eleven_calls, summit_20_half_of_them, summit_21_the_other_half, summit_22_the_square, ultimatum_15_two_readings, ultimatum_16_the_wrong_signal, ultimatum_17_any_means_any, ultimatum_18_your_own_words, ultimatum_19_the_climbdown, ultimatum_20_the_half_life, ultimatum_21_the_open_line, ultimatum_22_three_calls, cables_05_the_detour, cables_22_a_week, cables_15_forty_metres, cables_16_the_escort_line, cables_17_forty_minutes, cables_18_eleven_hundred_tonnes, cables_19_unsigned, cables_20_ninety_days, cables_21_my_nine
- Rare cards (seen in < 0.5% of runs): 15 — cyberew_09_what_it_asked (10), cyberew_21_the_motion (11), debris_12_they_signed (5), defector_22_courtesies (13), defector_23_nothing_crossed (10), dom_coa_16_thirty_per_cent (6), dom_rep_08_say_it_aloud (14), fp_midnight_12_have_you_eaten (23), proxy_20_the_column (1), proxy_21_across_the_aum (2), proxy_24_contact (1), blackout_26_in_the_way (13), summit_24_what_it_bought (6), ultimatum_23_what_they_see (11), cables_11_war_risk (22)

## Policy: all

- Runs: **15000** (4063 hit the step cap without ending)
- Win rate (run_end ending on the last act): **29.63%**; stand-down 2.72%; nuclear 13.87%
- Score: median **757**, mean 969.07, p90 1890, p99 3129.03, max 5247; best single choice 121.48 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **4.92**, p10 3.13, p90 6.02
- Days: median 3.9, mean 3.74, p10 2.6, p90 4.7; cards per run 24.42
- Endless: 0 runs continued (0%), 0 endless acts on average, max 0
- Timer expiry rate: 13.27% (11260 expiries / 84827 timed cards)
- Near-miss rate: 9.97% (5608 / 56251 rolls)
- Average peak escalation: 57.42; false alarms per run: 0.291
- Top ending share: **12.62%** (survival_empty_chair)

### Endings (all)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| survival_empty_chair | survival | 1893 | 12.62 |
| removed_public_0_republic | removed | 1875 | 12.5 |
| removed_military_0 | removed | 1850 | 12.33 |
| removed_public_0_federation | removed | 1799 | 11.99 |
| removed_public_0_coalition | removed | 1566 | 10.44 |
| survival_red_dawn | survival | 984 | 6.56 |
| nuclear_midnight | nuclear | 744 | 4.96 |
| nuclear_intercept_exchange | nuclear | 634 | 4.23 |
| removed_allies_0_federation | removed | 596 | 3.97 |
| survival_hollow_victory | survival | 547 | 3.65 |
| survival_they_blinked | survival | 402 | 2.68 |
| core_standdown_minimal | standdown | 397 | 2.65 |
| removed_allies_0 | removed | 381 | 2.54 |
| nuclear_forty_miles | nuclear | 236 | 1.57 |
| nuclear_after_vellmar | nuclear | 210 | 1.4 |
| special_resigned | special | 197 | 1.31 |
| nuclear_after_midnight | nuclear | 171 | 1.14 |
| removed_allies_0_republic | removed | 115 | 0.77 |
| removed_economy_0_federation | removed | 70 | 0.47 |
| survival_line_stays | survival | 64 | 0.43 |
| survival_long_watch | survival | 61 | 0.41 |
| survival_cold_peace | survival | 59 | 0.39 |
| nuclear_dark_sky | nuclear | 40 | 0.27 |
| nuclear_last_card | nuclear | 34 | 0.23 |
| survival_quiet_dawn | survival | 15 | 0.1 |
| nuclear_vestria | nuclear | 12 | 0.08 |
| survival_frozen_front | survival | 12 | 0.08 |
| removed_military_100_federation | removed | 11 | 0.07 |
| removed_allies_100 | removed | 9 | 0.06 |
| standdown_unloved | standdown | 6 | 0.04 |
| standdown_communique | standdown | 4 | 0.03 |
| removed_economy_0 | removed | 2 | 0.01 |
| removed_military_100 | removed | 2 | 0.01 |
| removed_public_100 | removed | 1 | 0.01 |
| standdown_empty_sky | standdown | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 2081 | 13.87 | 2081 | 13.87 |
| removed | 8277 | 55.18 | 8277 | 55.18 |
| standdown | 408 | 2.72 | 408 | 2.72 |
| survival | 4037 | 26.91 | 4037 | 26.91 |
| special | 197 | 1.31 | 197 | 1.31 |

### Act reached (all)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 9 | 0.06 |
| 2 | Week Two | 333 | 2.22 |
| 3 | Week Three | 2221 | 14.81 |
| 4 | Week Four | 3338 | 22.25 |
| 5 | Endgame | 9099 | 60.66 |

### Antes per act (all)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

### Accidents (all)

- Attached to 0% of cards (0 per run); 0% of those fired (0 per run)
- Fatal at once: 0% of fired; mean escalation per fired accident: 0

### Capital and orders (all)

- Capital earned 6.98 / spent 0.35 per run; 0 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 0 / sold 0 per run; orders bought 0 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 0 | 0 | — | 0 | — |
| say_it_again | 0 | 0 | — | 0 | — |
| double_down | 0 | 0 | — | 0 | — |
| intercept_package | 0 | 0 | — | 0 | — |
| duty_officers_veto | 0 | 0 | — | 0 | — |
| lose_the_memo | 0 | 0 | — | 0 | — |
| favour_owed | 0 | 0 | — | 0 | — |
| one_more_call | 0 | 0 | — | 0 | — |
| leaked_assessment | 0 | 0 | — | 0 | — |
| calm_the_markets | 0 | 0 | — | 0 | — |
| rally | 0 | 0 | — | 0 | — |
| muster | 0 | 0 | — | 0 | — |
| personal_letter | 0 | 0 | — | 0 | — |

### Score distribution (all)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 969.07 | 347 | 474 | 757 | 1300 | 1890 | 3129.03 | 5247 |

### Per seat (all)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 4998 | 31.91 | 778 | 4.05 | 14.23 | 52.74 | 3.24 | 28.67 | 1.12 |
| federation | 5001 | 25.95 | 726 | 3.7 | 13.3 | 59.39 | 2.04 | 23.92 | 1.36 |
| republic | 5001 | 31.03 | 762 | 3.95 | 14.1 | 53.41 | 2.88 | 28.15 | 1.46 |

### Piece buy rates (all)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 0 | 0 | — | — |
| dove_fm | advisor | rare | 0 | 0 | — | — |
| paranoid_intel | advisor | common | 0 | 0 | — | — |
| cautious_intel | advisor | common | 0 | 0 | — | — |
| spin_doctor | advisor | uncommon | 0 | 0 | — | — |
| ambassador | advisor | uncommon | 0 | 0 | — | — |
| cyber_director | advisor | uncommon | 0 | 0 | — | — |
| treasury_hawk | advisor | common | 0 | 0 | — | — |
| fixer | advisor | uncommon | 0 | 0 | — | — |
| admiral | advisor | uncommon | 0 | 0 | — | — |
| peace_leader | advisor | common | 0 | 0 | — | — |
| contractor | advisor | rare | 0 | 0 | — | — |
| iron_nerve | advisor | legendary | 0 | 0 | — | — |
| long_table | advisor | legendary | 0 | 0 | — | — |
| field_marshal | advisor | rare | 0 | 0 | — | — |
| press_office | advisor | rare | 0 | 0 | — | — |
| attache | advisor | uncommon | 0 | 0 | — | — |
| lobby | advisor | uncommon | 0 | 0 | — | — |
| pollster | advisor | common | 0 | 0 | — | — |
| early_warning | asset | uncommon | 0 | 0 | — | — |
| back_channel | asset | uncommon | 0 | 0 | — | — |
| cyber_unit | asset | uncommon | 0 | 0 | — | — |
| missile_defence | asset | uncommon | 0 | 0 | — | — |
| blue_water_fleet | asset | uncommon | 0 | 0 | — | — |
| hardened_nc3 | asset | rare | 0 | 0 | — | — |
| commercial_sat | asset | common | 0 | 0 | — | — |
| allied_basing | asset | common | 0 | 0 | — | — |
| strategic_reserve | asset | common | 0 | 0 | — | — |
| rapid_response | asset | uncommon | 0 | 0 | — | — |
| signals_intercept | asset | rare | 0 | 0 | — | — |
| civil_defence | asset | uncommon | 0 | 0 | — | — |
| deadman_switch | asset | legendary | 0 | 0 | — | — |
| perfect_intel | asset | legendary | 0 | 0 | — | — |
| open_line | asset | legendary | 0 | 0 | — | — |
| war_economy | asset | legendary | 0 | 0 | — | — |
| whispers | asset | rare | 0 | 0 | — | — |
| ledger | asset | rare | 0 | 0 | — | — |
| war_bonds | asset | rare | 0 | 0 | — | — |
| tripwire | asset | rare | 0 | 0 | — | — |
| quiet_room | asset | rare | 0 | 0 | — | — |
| dockyards | asset | uncommon | 0 | 0 | — | — |
| bunker | asset | uncommon | 0 | 0 | — | — |
| war_room | asset | uncommon | 0 | 0 | — | — |
| staff_college | asset | common | 0 | 0 | — | — |
| trade_desk | asset | common | 0 | 0 | — | — |
| courier | asset | common | 0 | 0 | — | — |
| launch_on_warning | doctrine | rare | 0 | 0 | — | — |
| deterrence_by_denial | doctrine | uncommon | 0 | 0 | — | — |
| strategic_ambiguity | doctrine | uncommon | 0 | 0 | — | — |
| no_first_use | doctrine | uncommon | 0 | 0 | — | — |
| escalate_to_deescalate | doctrine | rare | 0 | 0 | — | — |
| alliance_first | doctrine | common | 0 | 0 | — | — |
| fortress | doctrine | common | 0 | 0 | — | — |
| transparency | doctrine | uncommon | 0 | 0 | — | — |
| red_lines | doctrine | rare | 0 | 0 | — | — |
| hotline_protocol | doctrine | uncommon | 0 | 0 | — | — |
| predelegation | doctrine | uncommon | 0 | 0 | — | — |
| minimal_deterrence | doctrine | rare | 0 | 0 | — | — |
| madman_theory | doctrine | legendary | 0 | 0 | — | — |
| brinkmanship | doctrine | legendary | 0 | 0 | — | — |
| domino_theory | doctrine | legendary | 0 | 0 | — | — |
| the_button | doctrine | legendary | 0 | 0 | — | — |
| second_strike | doctrine | rare | 0 | 0 | — | — |
| propaganda | doctrine | uncommon | 0 | 0 | — | — |

All offered pieces are inside the band.

### Card coverage (all)

- Cards never seen: 157 — adv_01_a_senior_defence_source, adv_02_what_a_person_is_worth, adv_03_the_invoice, adv_04_over_her_head, adv_05_one_sentence, adv_06_you_may_prefer_not_to_know, adv_07_the_army_will_hear_it, adv_08_a_number_not_on_any_list, adv_09_the_other_seven, adv_10_three_days, adv_11_over_dinner, adv_12_a_tourist_visa, adv_13_ninety_percent, adv_14_is_and_consistent_with, adv_15_the_word_ceiling, adv_16_a_fellowship_abroad, adv_17_forty_minutes, adv_18_as_a_person, adv_19_both_sides_of_the_border, adv_20_the_minutes, adv_22_seven_times_in_ten, adv_23_as_if_you_had_not_said_it, adv_24_engineers, adv_25_one_of_them_did, adv_26_the_square_does_not_keep_a_diary, adv_27_no_hard_feelings, adv_28_the_florist, ally_14_the_council_voted, ally_15_caldors_objection, ally_16_inside_the_ring, ally_17_the_fourth_call, ally_18_a_form_of_words, blockade_07_her_ships, blockade_19_the_carrier, blockade_20_thirty_one_days, blockade_26_the_order, blockade_23_two_numbers, blockade_24_eleven_days, bluff_01_the_shrug, bluff_02_the_editorial, bluff_03_the_ally, bluff_04_the_markets, bluff_05_the_staff, bluff_06_the_envoy, cyberew_07_working_hours, cyberew_10_reciprocity, cyberew_11_their_reading, cyberew_13_page_eleven, cyberew_14_paper_and_phone, cyberew_15_thirty_one_attempts, cyberew_16_our_own_tool, cyberew_22_their_bombers, debris_02_the_intercept, debris_08_the_question_mark, debris_11_calibrations, debris_15_the_glass_house, debris_16_supplier_or_combatant, debris_17_eleven_seconds, debris_18_without_consensus, defector_08_on_background, defector_09_everything_fits, defector_10_nine_days, defector_11_corroboration, defector_12_the_package, defector_17_tuesdays_assessment, dom_coa_06_the_lease, dom_fed_10_ninety_days, dom_rep_12_the_runways, falarm_11_high_cloud, falarm_12_range_hot, falarm_13_sun_glint, falarm_17_three_keys, falarm_18_the_doctrine, falarm_19_unsleeping, falarm_20_measured, falarm_21_sirens, fp_cascade_01_same_hour, fp_cascade_02_the_physics, fp_cascade_03_the_dark_board, fp_cascade_04_consistent_with, fp_cascade_07_the_building, fp_cascade_08a_the_operator, fp_cascade_08b_the_shrug, fp_cascade_09_the_call, fp_cascade_11_the_blind_minute, fp_cascade_12_the_pause, fp_cascade_13_the_name, fp_cascade_14_the_long_night, fp_intercept_04a_the_layer_you_did_not_use, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, fp_intercept_fa_06_the_sirens, fp_line_01_the_hail, fp_line_02_on_deck, fp_line_03_warned_off, fp_line_05a_the_carrier, fp_line_05b_the_chart, fp_line_06_the_seizure, fp_line_07_the_photographs, fp_line_08_hands_on_the_switch, fp_line_09_the_straits, fp_line_10a_the_second_line, fp_line_10b_the_line_tomorrow, fp_line_11_the_morning_count, fp_midnight_06_the_word_any, fp_midnight_07_two_statements, fp_midnight_08_two_readings, fp_midnight_09_the_protocol, fp_summit_02_the_photographs, fp_summit_03_flatbeds, fp_summit_04_candles, fp_summit_07_in_writing, fp_summit_08_her_paragraph, fp_summit_09_the_lake_steps, fp_summit_10_four_lines, proxy_08_six_hours, proxy_09_an_afternoon, proxy_10_winnable, proxy_11_the_estimate, proxy_12_your_runways, proxy_13_the_road_to_hollin, proxy_14_nothing_without, proxy_15_the_compact_battalion, blackout_10_consistent_with, blackout_11_the_hedge, blackout_12_same_orbit, blackout_13_the_inspector, blackout_14_the_shareholders, blackout_15_nine_percent, blackout_16_do_it_back, blackout_17_footprints, summit_09_the_handshake, summit_15_the_deputys_lunch, summit_16_the_academic, summit_17_consecutive_days, summit_18_the_promise, summit_19_eleven_calls, summit_20_half_of_them, summit_21_the_other_half, summit_22_the_square, ultimatum_15_two_readings, ultimatum_16_the_wrong_signal, ultimatum_17_any_means_any, ultimatum_18_your_own_words, ultimatum_19_the_climbdown, ultimatum_20_the_half_life, ultimatum_21_the_open_line, ultimatum_22_three_calls, cables_05_the_detour, cables_22_a_week, cables_15_forty_metres, cables_16_the_escort_line, cables_17_forty_minutes, cables_18_eleven_hundred_tonnes, cables_19_unsigned, cables_20_ninety_days, cables_21_my_nine
- Rare cards (seen in < 0.5% of runs): 17 — blockade_22_two_days (71), cyberew_09_what_it_asked (58), cyberew_21_the_motion (29), debris_12_they_signed (69), debris_20_an_inch (5), defector_22_courtesies (17), defector_23_nothing_crossed (23), dom_coa_16_thirty_per_cent (35), dom_rep_08_say_it_aloud (56), fp_midnight_12_have_you_eaten (49), proxy_20_the_column (3), proxy_21_across_the_aum (6), proxy_24_contact (2), proxy_26_the_motion (3), blackout_26_in_the_way (28), summit_24_what_it_bought (30), ultimatum_23_what_they_see (21)

## Cards never seen (all policies)

- adv_01_a_senior_defence_source
- adv_02_what_a_person_is_worth
- adv_03_the_invoice
- adv_04_over_her_head
- adv_05_one_sentence
- adv_06_you_may_prefer_not_to_know
- adv_07_the_army_will_hear_it
- adv_08_a_number_not_on_any_list
- adv_09_the_other_seven
- adv_10_three_days
- adv_11_over_dinner
- adv_12_a_tourist_visa
- adv_13_ninety_percent
- adv_14_is_and_consistent_with
- adv_15_the_word_ceiling
- adv_16_a_fellowship_abroad
- adv_17_forty_minutes
- adv_18_as_a_person
- adv_19_both_sides_of_the_border
- adv_20_the_minutes
- adv_22_seven_times_in_ten
- adv_23_as_if_you_had_not_said_it
- adv_24_engineers
- adv_25_one_of_them_did
- adv_26_the_square_does_not_keep_a_diary
- adv_27_no_hard_feelings
- adv_28_the_florist
- ally_14_the_council_voted
- ally_15_caldors_objection
- ally_16_inside_the_ring
- ally_17_the_fourth_call
- ally_18_a_form_of_words
- blockade_07_her_ships
- blockade_19_the_carrier
- blockade_20_thirty_one_days
- blockade_26_the_order
- blockade_23_two_numbers
- blockade_24_eleven_days
- bluff_01_the_shrug
- bluff_02_the_editorial
- bluff_03_the_ally
- bluff_04_the_markets
- bluff_05_the_staff
- bluff_06_the_envoy
- cyberew_07_working_hours
- cyberew_10_reciprocity
- cyberew_11_their_reading
- cyberew_13_page_eleven
- cyberew_14_paper_and_phone
- cyberew_15_thirty_one_attempts
- cyberew_16_our_own_tool
- cyberew_22_their_bombers
- debris_02_the_intercept
- debris_08_the_question_mark
- debris_11_calibrations
- debris_15_the_glass_house
- debris_16_supplier_or_combatant
- debris_17_eleven_seconds
- debris_18_without_consensus
- defector_08_on_background
- defector_09_everything_fits
- defector_10_nine_days
- defector_11_corroboration
- defector_12_the_package
- defector_17_tuesdays_assessment
- dom_coa_06_the_lease
- dom_fed_10_ninety_days
- dom_rep_12_the_runways
- falarm_11_high_cloud
- falarm_12_range_hot
- falarm_13_sun_glint
- falarm_17_three_keys
- falarm_18_the_doctrine
- falarm_19_unsleeping
- falarm_20_measured
- falarm_21_sirens
- fp_cascade_01_same_hour
- fp_cascade_02_the_physics
- fp_cascade_03_the_dark_board
- fp_cascade_04_consistent_with
- fp_cascade_07_the_building
- fp_cascade_08a_the_operator
- fp_cascade_08b_the_shrug
- fp_cascade_09_the_call
- fp_cascade_11_the_blind_minute
- fp_cascade_12_the_pause
- fp_cascade_13_the_name
- fp_cascade_14_the_long_night
- fp_intercept_04a_the_layer_you_did_not_use
- fp_intercept_fa_02_the_doctrine
- fp_intercept_fa_05_three_keys
- fp_intercept_fa_06_the_sirens
- fp_line_01_the_hail
- fp_line_02_on_deck
- fp_line_03_warned_off
- fp_line_05a_the_carrier
- fp_line_05b_the_chart
- fp_line_06_the_seizure
- fp_line_07_the_photographs
- fp_line_08_hands_on_the_switch
- fp_line_09_the_straits
- fp_line_10a_the_second_line
- fp_line_10b_the_line_tomorrow
- fp_line_11_the_morning_count
- fp_midnight_06_the_word_any
- fp_midnight_07_two_statements
- fp_midnight_08_two_readings
- fp_midnight_09_the_protocol
- fp_summit_02_the_photographs
- fp_summit_03_flatbeds
- fp_summit_04_candles
- fp_summit_07_in_writing
- fp_summit_08_her_paragraph
- fp_summit_09_the_lake_steps
- fp_summit_10_four_lines
- proxy_08_six_hours
- proxy_09_an_afternoon
- proxy_10_winnable
- proxy_11_the_estimate
- proxy_12_your_runways
- proxy_13_the_road_to_hollin
- proxy_14_nothing_without
- proxy_15_the_compact_battalion
- blackout_10_consistent_with
- blackout_11_the_hedge
- blackout_12_same_orbit
- blackout_13_the_inspector
- blackout_14_the_shareholders
- blackout_15_nine_percent
- blackout_16_do_it_back
- blackout_17_footprints
- summit_09_the_handshake
- summit_15_the_deputys_lunch
- summit_16_the_academic
- summit_17_consecutive_days
- summit_18_the_promise
- summit_19_eleven_calls
- summit_20_half_of_them
- summit_21_the_other_half
- summit_22_the_square
- ultimatum_15_two_readings
- ultimatum_16_the_wrong_signal
- ultimatum_17_any_means_any
- ultimatum_18_your_own_words
- ultimatum_19_the_climbdown
- ultimatum_20_the_half_life
- ultimatum_21_the_open_line
- ultimatum_22_three_calls
- cables_05_the_detour
- cables_22_a_week
- cables_15_forty_metres
- cables_16_the_escort_line
- cables_17_forty_minutes
- cables_18_eleven_hundred_tonnes
- cables_19_unsigned
- cables_20_ninety_days
- cables_21_my_nine

### Rare cards (seen in < 0.5% of runs, all policies)

| Card | Runs | % |
| --- | --- | --- |
| blockade_22_two_days | 71 | 0.47 |
| cyberew_09_what_it_asked | 58 | 0.39 |
| cyberew_21_the_motion | 29 | 0.19 |
| debris_12_they_signed | 69 | 0.46 |
| debris_20_an_inch | 5 | 0.03 |
| defector_22_courtesies | 17 | 0.11 |
| defector_23_nothing_crossed | 23 | 0.15 |
| dom_coa_16_thirty_per_cent | 35 | 0.23 |
| dom_rep_08_say_it_aloud | 56 | 0.37 |
| fp_midnight_12_have_you_eaten | 49 | 0.33 |
| proxy_20_the_column | 3 | 0.02 |
| proxy_21_across_the_aum | 6 | 0.04 |
| proxy_24_contact | 2 | 0.01 |
| proxy_26_the_motion | 3 | 0.02 |
| blackout_26_in_the_way | 28 | 0.19 |
| summit_24_what_it_bought | 30 | 0.2 |
| ultimatum_23_what_they_see | 21 | 0.14 |

## Archetypes (heuristic)

Runs in which the archetype (≥ 2 core pieces) was assembled when act 3 began, how often those runs reached the Endgame (act 5) and won, and their median score. Final = runs holding the archetype at the end.

| Archetype | Style | Assembled by act 3 | Reached Endgame | % | Won | Won % | Median score | Final |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| accident_farmer | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| alliance_engine | hybrid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cyber_ghost | hybrid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| deadman | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| hair_trigger | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| intel_machine | hybrid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ledger | hybrid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| madman | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| peace_movement | standdown | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| quiet_diplomat | standdown | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| red_lines_gambler | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sea_power | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| shield_wall | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| the_ladder | brink | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| war_economy | hybrid | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Piece share among winning builds (heuristic)

No winning runs.


## Combos (heuristic)

Pairs of pieces held together in ≥ 40 runs: 0. Pairs with |Δ win| ≥ 10pp vs runs holding neither: **0**.

No pair reached the minimum run count.

## Piece ending profiles

Win rate and ending-kind mix with vs without each piece (heuristic when run, otherwise all policies). Profile Δ is the total-variation distance in percentage points.

| Piece | Pool | Rarity | Offered | Buy rate | Held runs | Wins | Share of wins | Δ win | Δ nuclear | Profile Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| dove_fm | advisor | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| paranoid_intel | advisor | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| cautious_intel | advisor | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| spin_doctor | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| ambassador | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| cyber_director | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| treasury_hawk | advisor | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| fixer | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| admiral | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| peace_leader | advisor | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| contractor | advisor | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| iron_nerve | advisor | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| long_table | advisor | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| field_marshal | advisor | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| press_office | advisor | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| attache | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| lobby | advisor | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| pollster | advisor | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| early_warning | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| back_channel | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| cyber_unit | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| missile_defence | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| blue_water_fleet | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| hardened_nc3 | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| commercial_sat | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| allied_basing | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| strategic_reserve | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| rapid_response | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| signals_intercept | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| civil_defence | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| deadman_switch | asset | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| perfect_intel | asset | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| open_line | asset | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| war_economy | asset | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| whispers | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| ledger | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| war_bonds | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| tripwire | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| quiet_room | asset | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| dockyards | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| bunker | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| war_room | asset | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| staff_college | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| trade_desk | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| courier | asset | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| launch_on_warning | doctrine | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| deterrence_by_denial | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| strategic_ambiguity | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| no_first_use | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| escalate_to_deescalate | doctrine | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| alliance_first | doctrine | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| fortress | doctrine | common | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| transparency | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| red_lines | doctrine | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| hotline_protocol | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| predelegation | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| minimal_deterrence | doctrine | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| madman_theory | doctrine | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| brinkmanship | doctrine | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| domino_theory | doctrine | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| the_button | doctrine | legendary | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| second_strike | doctrine | rare | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |
| propaganda | doctrine | uncommon | 0 | — | 0 | 0 | 0 | 0 | 0 | 0 |

## Weakest pieces

Lowest combined rank of buy rate and |Δ win|: pieces players do not want, or that do not change whether runs are won.

No piece was offered.

## Per-card table (heuristic)

Seen = presentations; L% = share of plays resolved left; Δesc = mean applied escalation; lev = mean leverage scored; swing = mean |Δ| over the five meters per play; gap = mean distance between the two previews; impact = swing + gap.

| Card | Seen | Runs % | Left | Right | L% | Timeouts | Buried | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adv_21_a_line_at_the_bottom | 49 | 0.98 | 0 | 49 | 0 | 0 | 0 | 0 | 65.9 | 23.33 | 23.37 | 46.69 |
| ally_01_what_will_you_do | 1283 | 25.66 | 886 | 397 | 69.1 | 0 | 0 | 2.07 | 31.3 | 11.67 | 25.47 | 37.14 |
| ally_02_the_resolution | 1089 | 21.78 | 853 | 236 | 78.3 | 0 | 0 | 0 | 29.4 | 7.64 | 20.17 | 27.81 |
| ally_03_the_liaison | 1300 | 26 | 795 | 505 | 61.2 | 64 | 0 | 0 | 21.4 | 13.29 | 27.34 | 40.64 |
| ally_04_northern_anvil | 1044 | 20.88 | 730 | 314 | 69.9 | 0 | 0 | 2.59 | 36.8 | 18.41 | 39.57 | 57.97 |
| ally_05_vestria_applies | 1300 | 26 | 932 | 368 | 71.7 | 0 | 0 | 2.87 | 43.4 | 12.47 | 27.94 | 40.4 |
| ally_06_stolen_paper | 1379 | 27.58 | 1170 | 209 | 84.8 | 0 | 0 | 0 | 47.8 | 11.16 | 30.63 | 41.79 |
| ally_07_the_runway_bill | 1086 | 21.72 | 682 | 404 | 62.8 | 0 | 0 | 0 | 18 | 16.33 | 32.41 | 48.74 |
| ally_08_whose_rules | 818 | 16.36 | 522 | 296 | 63.8 | 39 | 0 | 4.9 | 56.2 | 21.36 | 40.72 | 62.08 |
| ally_09_a_second_signature | 876 | 17.52 | 210 | 666 | 24 | 0 | 0 | -0.48 | 40.4 | 7.32 | 20.14 | 27.45 |
| ally_10_the_free_vote | 1359 | 27.18 | 954 | 405 | 70.2 | 0 | 0 | 0 | 33.9 | 18.45 | 38 | 56.45 |
| ally_11_is_a_grid_armed | 911 | 18.22 | 687 | 224 | 75.4 | 0 | 0 | 3.02 | 56.9 | 12.46 | 28.48 | 40.94 |
| ally_12_forty_observers | 675 | 13.5 | 432 | 243 | 64 | 0 | 0 | 1.97 | 51.8 | 12.61 | 34.54 | 47.15 |
| ally_13_two_of_eleven | 483 | 9.66 | 381 | 102 | 78.9 | 0 | 0 | -0.63 | 46.1 | 22 | 37.57 | 59.57 |
| blockade_01_the_quarantine | 1320 | 26.4 | 782 | 538 | 59.2 | 0 | 0 | 2.96 | 28.1 | 9.93 | 19.43 | 29.36 |
| blockade_02_the_generals_line | 440 | 8.8 | 29 | 411 | 6.6 | 0 | 0 | 4.26 | 32.7 | 9.99 | 15 | 24.99 |
| blockade_03_the_ferry | 537 | 10.74 | 415 | 122 | 77.3 | 32 | 0 | 4.64 | 65.8 | 17.49 | 38.79 | 56.28 |
| blockade_04_the_schedule | 1009 | 20.18 | 364 | 645 | 36.1 | 50 | 0 | 2.8 | 26.2 | 26.56 | 41.15 | 67.71 |
| blockade_05_the_manifest | 538 | 10.76 | 227 | 311 | 42.2 | 0 | 0 | 0.95 | 26.4 | 12.2 | 24.37 | 36.58 |
| blockade_08_the_ferry_line | 415 | 8.3 | 234 | 181 | 56.4 | 27 | 0 | 5.81 | 68.7 | 33.12 | 51.72 | 84.84 |
| blockade_09_boarded | 217 | 4.34 | 139 | 78 | 64.1 | 0 | 0 | 4.05 | 55.2 | 23.39 | 46.76 | 70.15 |
| blockade_10_the_release | 285 | 5.7 | 18 | 267 | 6.3 | 0 | 0 | 8.69 | 66.2 | 32.69 | 47.39 | 80.08 |
| blockade_06_the_word | 168 | 3.36 | 26 | 142 | 15.5 | 0 | 0 | 0.77 | 43.7 | 10.21 | 24.14 | 34.35 |
| blockade_14_the_first_hull | 579 | 11.58 | 517 | 62 | 89.3 | 34 | 0 | 9.61 | 46.5 | 25.62 | 48.89 | 74.51 |
| blockade_15_the_second_hull | 62 | 1.24 | 56 | 6 | 90.3 | 0 | 0 | 14.66 | 76.7 | 35.71 | 58.89 | 94.6 |
| blockade_17_hold_and_search | 253 | 5.06 | 3 | 250 | 1.2 | 0 | 0 | 2.06 | 45.4 | 8.15 | 17.05 | 25.2 |
| blockade_18_the_hole | 62 | 1.24 | 62 | 0 | 100 | 0 | 0 | 6 | 50.8 | 13 | 57.98 | 70.98 |
| blockade_12_the_call | 1565 | 31.3 | 1512 | 53 | 96.6 | 0 | 0 | -7.3 | 42.8 | 21.07 | 34.95 | 56.02 |
| blockade_16_eight_minutes | 476 | 9.52 | 77 | 399 | 16.2 | 22 | 0 | 5.04 | 129 | 20.64 | 57.55 | 78.19 |
| blockade_21_the_formula | 1565 | 31.3 | 29 | 1536 | 1.9 | 0 | 0 | 3.7 | 45.2 | 8.6 | 51.88 | 60.49 |
| blockade_11_the_queue | 275 | 5.5 | 193 | 82 | 70.2 | 0 | 0 | 0 | 48.5 | 21.29 | 31.92 | 53.21 |
| blockade_13_what_they_see | 141 | 2.82 | 9 | 132 | 6.4 | 0 | 0 | 3.23 | 69.9 | 10.01 | 48.69 | 58.7 |
| blockade_22_two_days | 40 | 0.8 | 23 | 17 | 57.5 | 0 | 0 | -2.17 | 59.6 | 27.35 | 53.38 | 80.72 |
| blockade_25_their_tankers | 208 | 4.16 | 174 | 34 | 83.7 | 0 | 0 | -8.04 | 60.1 | 24.54 | 44.91 | 69.46 |
| cyberew_01_resident | 708 | 14.16 | 75 | 633 | 10.6 | 0 | 0 | 1.79 | 17.2 | 5.73 | 25.33 | 31.06 |
| cyberew_02_liaison_sample | 563 | 11.26 | 169 | 394 | 30 | 0 | 0 | 0 | 24.9 | 10.83 | 22.06 | 32.89 |
| cyberew_03_correlator_word | 402 | 8.04 | 13 | 389 | 3.2 | 22 | 0 | 0 | 38.1 | 9.5 | 12.25 | 21.75 |
| cyberew_04_dark_sector | 75 | 1.5 | 59 | 16 | 78.7 | 3 | 0 | 1.57 | 21.3 | 10.73 | 26.21 | 36.95 |
| cyberew_05_it_writes | 633 | 12.66 | 496 | 137 | 78.4 | 27 | 0 | 1.92 | 30.6 | 7.69 | 20.15 | 27.84 |
| cyberew_06_consistent_with | 187 | 3.74 | 166 | 21 | 88.8 | 0 | 0 | 5.33 | 80.7 | 14.96 | 29.07 | 44.04 |
| cyberew_08_the_purge | 103 | 2.06 | 90 | 13 | 87.4 | 0 | 0 | 1.75 | 41.7 | 5.45 | 13.93 | 19.38 |
| cyberew_09_what_it_asked | 10 | 0.2 | 3 | 7 | 30 | 0 | 0 | 0.7 | 49.5 | 12.5 | 27.7 | 40.2 |
| cyberew_12_day_twenty_nine | 183 | 3.66 | 88 | 95 | 48.1 | 0 | 0 | 0 | 36.5 | 15.83 | 31.8 | 47.63 |
| cyberew_17_written_not_seen | 64 | 1.28 | 7 | 57 | 10.9 | 0 | 0 | 2.23 | 58.6 | 8.44 | 27.38 | 35.81 |
| cyberew_18_the_tasking | 66 | 1.32 | 46 | 20 | 69.7 | 0 | 0 | 3.48 | 57.2 | 9.8 | 20.97 | 30.77 |
| cyberew_19_the_hospitals | 86 | 1.72 | 12 | 74 | 14 | 0 | 0 | 1.72 | 36.9 | 12.92 | 35.01 | 47.93 |
| cyberew_20_clean_build | 73 | 1.46 | 3 | 70 | 4.1 | 0 | 0 | 1.92 | 64.2 | 13.9 | 49.25 | 63.15 |
| cyberew_21_the_motion | 11 | 0.22 | 0 | 11 | 0 | 0 | 0 | 4.18 | 73.4 | 37.18 | 55.36 | 92.55 |
| debris_01_the_cloud | 689 | 13.78 | 566 | 123 | 82.1 | 0 | 0 | 4.11 | 39 | 9.54 | 21 | 30.54 |
| debris_03_six_birds | 624 | 12.48 | 128 | 496 | 20.5 | 23 | 0 | 4.77 | 55.5 | 10.68 | 23.41 | 34.09 |
| debris_04_the_premium | 319 | 6.38 | 30 | 289 | 9.4 | 0 | 0 | 3.61 | 68.2 | 14.94 | 17.27 | 32.22 |
| debris_05_the_catalogue | 276 | 5.52 | 228 | 48 | 82.6 | 0 | 0 | 4.67 | 52.5 | 15.01 | 25.69 | 40.7 |
| debris_06_their_reply | 1530 | 30.6 | 1424 | 106 | 93.1 | 0 | 0 | 0.42 | 36.3 | 6.65 | 18.38 | 25.03 |
| debris_07_forty_one_delegations | 74 | 1.48 | 4 | 70 | 5.4 | 0 | 0 | 2.84 | 79.9 | 20.36 | 46.34 | 66.7 |
| debris_09_the_tug | 48 | 0.96 | 39 | 9 | 81.3 | 0 | 0 | 1.13 | 38.9 | 14.88 | 15.69 | 30.56 |
| debris_10_the_proposal | 151 | 3.02 | 7 | 144 | 4.6 | 0 | 0 | 3.44 | 86.8 | 18.01 | 55.86 | 73.87 |
| debris_12_they_signed | 5 | 0.1 | 1 | 4 | 20 | 0 | 0 | 2.2 | 53.8 | 10.6 | 25.2 | 35.8 |
| debris_13_the_offer | 133 | 2.66 | 18 | 115 | 13.5 | 0 | 0 | 0 | 33.6 | 5.08 | 21.86 | 26.94 |
| debris_14_the_second_breakup | 159 | 3.18 | 8 | 151 | 5 | 9 | 0 | 4.55 | 72.6 | 15.76 | 41.52 | 57.28 |
| debris_19_the_bill | 108 | 2.16 | 65 | 43 | 60.2 | 0 | 0 | 0 | 40 | 25.16 | 32.74 | 57.9 |
| debris_21_the_unwritten | 120 | 2.4 | 29 | 91 | 24.2 | 0 | 0 | 1.1 | 70.1 | 13.77 | 38.23 | 52 |
| debris_22_two_events | 39 | 0.78 | 20 | 19 | 51.3 | 1 | 0 | 6.92 | 45.8 | 25.9 | 30.64 | 56.54 |
| defector_01_the_ferry | 773 | 15.46 | 482 | 291 | 62.4 | 0 | 0 | 0 | 17.9 | 6.49 | 17 | 23.49 |
| defector_02_the_embassy_gate | 625 | 12.5 | 405 | 220 | 64.8 | 0 | 0 | -0.35 | 30.1 | 6.9 | 14.1 | 21 |
| defector_03_the_basement | 412 | 8.24 | 131 | 281 | 31.8 | 27 | 0 | 3.41 | 48.4 | 9.18 | 18.54 | 27.72 |
| defector_04_lantern | 1767 | 35.34 | 1306 | 461 | 73.9 | 0 | 0 | 4.43 | 46.3 | 11.05 | 21.98 | 33.03 |
| defector_05_the_exercise_order | 1027 | 20.54 | 914 | 113 | 89 | 0 | 0 | 5.53 | 76.2 | 12.66 | 20.5 | 33.17 |
| defector_06_the_seam | 617 | 12.34 | 252 | 365 | 40.8 | 0 | 0 | 0.73 | 48 | 11.07 | 24.07 | 35.14 |
| defector_07_nine_oclock | 94 | 1.88 | 63 | 31 | 67 | 0 | 0 | 3.35 | 69.7 | 10.31 | 18.99 | 29.3 |
| defector_13_seventy_two_hours | 113 | 2.26 | 104 | 9 | 92 | 0 | 0 | 0 | 33.1 | 3.7 | 14.68 | 18.38 |
| defector_14_absent_without_leave | 151 | 3.02 | 121 | 30 | 80.1 | 0 | 0 | -3.07 | 48.8 | 13.44 | 18.98 | 32.42 |
| defector_15_the_winter_colonel | 151 | 3.02 | 34 | 117 | 22.5 | 0 | 0 | 0 | 30 | 3.13 | 7 | 10.13 |
| defector_16_six_oclock | 261 | 5.22 | 233 | 28 | 89.3 | 15 | 0 | 4.89 | 44.5 | 9.25 | 19.39 | 28.63 |
| defector_18_the_straits_garrison | 94 | 1.88 | 14 | 80 | 14.9 | 5 | 0 | 3.74 | 64 | 12.4 | 20.53 | 32.94 |
| defector_19_the_guest | 28 | 0.56 | 13 | 15 | 46.4 | 0 | 0 | 1 | 40.7 | 9.71 | 7.36 | 17.07 |
| defector_20_page_forty | 51 | 1.02 | 23 | 28 | 45.1 | 4 | 0 | 4.06 | 61.3 | 14.25 | 28.69 | 42.94 |
| defector_21_the_nineteenth | 108 | 2.16 | 15 | 93 | 13.9 | 0 | 0 | 3.06 | 65 | 15.8 | 47.11 | 62.91 |
| defector_22_courtesies | 13 | 0.26 | 0 | 13 | 0 | 0 | 0 | 2 | 30.6 | 5 | 31.54 | 36.54 |
| defector_23_nothing_crossed | 10 | 0.2 | 10 | 0 | 100 | 0 | 0 | 0 | 25.1 | 2 | 11.2 | 13.2 |
| dom_coa_01_the_order_book | 276 | 5.52 | 48 | 228 | 17.4 | 0 | 0 | 0 | 22.7 | 12.47 | 25.87 | 38.34 |
| dom_coa_02_allies_or_customers | 300 | 6 | 230 | 70 | 76.7 | 0 | 0 | 0 | 19.2 | 11.01 | 21.49 | 32.51 |
| dom_coa_03_untested | 272 | 5.44 | 112 | 160 | 41.2 | 0 | 0 | 1.06 | 17.6 | 11.08 | 22.27 | 33.35 |
| dom_coa_04_the_dividend | 287 | 5.74 | 199 | 88 | 69.3 | 0 | 0 | 0 | 18.4 | 10.49 | 22.76 | 33.25 |
| dom_coa_05_the_component | 172 | 3.44 | 155 | 17 | 90.1 | 3 | 0 | 0 | 24 | 9.52 | 14 | 23.52 |
| dom_coa_07_the_drills | 130 | 2.6 | 72 | 58 | 55.4 | 0 | 0 | 0.45 | 14.5 | 7.55 | 15 | 22.55 |
| dom_coa_08_two_million_shareholders | 150 | 3 | 62 | 88 | 41.3 | 0 | 0 | 0 | 17.6 | 16.23 | 20.5 | 36.73 |
| dom_coa_09_the_switch | 194 | 3.88 | 123 | 71 | 63.4 | 0 | 0 | 5.07 | 50.1 | 16.6 | 31.76 | 48.37 |
| dom_coa_10_museum_with_a_budget | 119 | 2.38 | 104 | 15 | 87.4 | 0 | 0 | 3.37 | 46.1 | 15.19 | 33.84 | 49.03 |
| dom_coa_11_the_tender | 180 | 3.6 | 141 | 39 | 78.3 | 0 | 0 | 0 | 30.9 | 15.12 | 29.11 | 44.23 |
| dom_coa_12_the_relay_layer | 192 | 3.84 | 81 | 111 | 42.2 | 0 | 0 | 0.84 | 35 | 8.77 | 20.61 | 29.38 |
| dom_coa_13_nine_thousand | 132 | 2.64 | 123 | 9 | 93.2 | 0 | 0 | 4.66 | 65.1 | 17.45 | 30.59 | 48.05 |
| dom_coa_14_the_open | 113 | 2.2 | 108 | 5 | 95.6 | 3 | 0 | 0 | 26.6 | 15.14 | 12.29 | 27.43 |
| dom_coa_15_dual_use | 160 | 3.2 | 74 | 86 | 46.3 | 0 | 0 | 0 | 51.6 | 19.86 | 27.61 | 47.47 |
| dom_coa_16_thirty_per_cent | 6 | 0.12 | 0 | 6 | 0 | 0 | 0 | 0 | 29 | 7 | 33.33 | 40.33 |
| dom_fed_01_two_bulletins | 286 | 5.72 | 220 | 66 | 76.9 | 0 | 0 | 0 | 15 | 9.58 | 17.55 | 27.14 |
| dom_fed_02_sixty_one_days | 288 | 5.76 | 230 | 58 | 79.9 | 0 | 0 | 0 | 16 | 15.58 | 25.78 | 41.36 |
| dom_fed_03_accreditation | 287 | 5.74 | 276 | 11 | 96.2 | 0 | 0 | 0 | 15.7 | 7.38 | 18.46 | 25.84 |
| dom_fed_04_the_savings_bank | 163 | 3.26 | 6 | 157 | 3.7 | 0 | 0 | 0 | 18.2 | 8.17 | 16.51 | 24.68 |
| dom_fed_05_the_corridor | 152 | 3.04 | 151 | 1 | 99.3 | 0 | 0 | 0 | 24.3 | 16.95 | 31 | 47.95 |
| dom_fed_06_the_figures | 46 | 0.92 | 4 | 42 | 8.7 | 0 | 0 | 0 | 16.4 | 3.91 | 17.04 | 20.96 |
| dom_fed_07_the_straits_price | 95 | 1.9 | 31 | 64 | 32.6 | 0 | 0 | 0 | 22.5 | 16.96 | 24.53 | 41.48 |
| dom_fed_08_voskra | 150 | 3 | 126 | 24 | 84 | 6 | 0 | 0.16 | 29.7 | 12.34 | 28.08 | 40.42 |
| dom_fed_09_two_hundred_letters | 156 | 3.12 | 118 | 38 | 75.6 | 0 | 0 | 0 | 22.5 | 9.33 | 18.15 | 27.49 |
| dom_fed_11_three_hundred_names | 178 | 3.56 | 54 | 124 | 30.3 | 0 | 0 | -0.61 | 35.8 | 11.92 | 26.99 | 38.91 |
| dom_fed_12_the_word | 141 | 2.82 | 109 | 32 | 77.3 | 0 | 0 | 3.09 | 68.8 | 9.82 | 19.26 | 29.07 |
| dom_fed_13_fourteen_billion | 143 | 2.86 | 96 | 47 | 67.1 | 0 | 0 | 2.01 | 63.7 | 14.1 | 25.94 | 40.05 |
| dom_fed_14_the_second_bulletin | 146 | 2.92 | 14 | 132 | 9.6 | 7 | 0 | 0 | 25 | 16.82 | 19.66 | 36.47 |
| dom_fed_15_the_toast | 135 | 2.7 | 121 | 14 | 89.6 | 0 | 0 | 2.59 | 56.8 | 10.56 | 25.59 | 36.16 |
| dom_fed_16_the_yards | 251 | 5.02 | 75 | 176 | 29.9 | 0 | 0 | 0 | 33.2 | 15.4 | 42 | 57.39 |
| dom_rep_01_the_tracker | 289 | 5.78 | 225 | 64 | 77.9 | 0 | 0 | 0 | 17.2 | 5.14 | 13.27 | 18.41 |
| dom_rep_02_eight_minutes | 280 | 5.6 | 61 | 219 | 21.8 | 0 | 0 | 0 | 20.1 | 12.14 | 21.46 | 33.6 |
| dom_rep_03_the_arden_club | 276 | 5.52 | 211 | 65 | 76.4 | 0 | 0 | 0.76 | 17 | 8.04 | 15.55 | 23.59 |
| dom_rep_04_the_dockers | 294 | 5.88 | 240 | 54 | 81.6 | 0 | 0 | 0 | 19.8 | 9.86 | 18.46 | 28.32 |
| dom_rep_05_day_twelve | 166 | 3.32 | 166 | 0 | 100 | 0 | 0 | 0 | 21.2 | 17.28 | 15 | 32.28 |
| dom_rep_06_the_premiums | 170 | 3.4 | 149 | 21 | 87.6 | 0 | 0 | 0 | 24.7 | 12.39 | 16.04 | 28.43 |
| dom_rep_07_the_letter_of_intent | 163 | 3.26 | 131 | 32 | 80.4 | 0 | 0 | 1.61 | 27.4 | 14.1 | 26.99 | 41.1 |
| dom_rep_08_say_it_aloud | 14 | 0.28 | 2 | 12 | 14.3 | 0 | 0 | 0 | 18.4 | 8.29 | 22.43 | 30.71 |
| dom_rep_09_the_focus_group | 200 | 4 | 102 | 98 | 51 | 17 | 0 | 1.47 | 51 | 13.13 | 26.24 | 39.37 |
| dom_rep_10_the_steps | 179 | 3.58 | 171 | 8 | 95.5 | 0 | 0 | 0 | 26.6 | 6.28 | 19.18 | 25.46 |
| dom_rep_11_twenty_two | 180 | 3.6 | 10 | 170 | 5.6 | 0 | 0 | 0 | 21.8 | 14.31 | 25.54 | 39.86 |
| dom_rep_13_the_list | 147 | 2.94 | 22 | 125 | 15 | 8 | 0 | 4.25 | 66 | 12.31 | 26.24 | 38.54 |
| dom_rep_14_the_truce | 77 | 1.54 | 36 | 41 | 46.8 | 0 | 0 | 0 | 67.8 | 17.12 | 35 | 52.12 |
| dom_rep_15_two_capitals | 107 | 2.14 | 80 | 27 | 74.8 | 0 | 0 | 0.25 | 45.9 | 13.09 | 30.52 | 43.62 |
| dom_rep_16_the_open_letter | 166 | 3.32 | 134 | 32 | 80.7 | 0 | 0 | 0.81 | 45.8 | 11.01 | 25.29 | 36.3 |
| falarm_01_one_track | 1442 | 28.84 | 507 | 935 | 35.2 | 61 | 0 | 2.11 | 16.2 | 8.33 | 18.44 | 26.77 |
| falarm_02_real_launch | 941 | 18.82 | 479 | 462 | 50.9 | 0 | 0 | 5.74 | 27.6 | 15.34 | 28.44 | 43.78 |
| falarm_03_ghost_track | 501 | 10.02 | 301 | 200 | 60.1 | 0 | 0 | 0 | 16.8 | 8.02 | 16.44 | 24.46 |
| falarm_04_the_moon | 301 | 6.02 | 87 | 214 | 28.9 | 0 | 0 | 0.13 | 16.8 | 5.17 | 13.71 | 18.88 |
| falarm_05_straits_profile | 445 | 8.9 | 279 | 166 | 62.7 | 26 | 0 | 2.61 | 21.2 | 11.82 | 21.43 | 33.25 |
| falarm_06_boat_confirmed | 290 | 5.8 | 228 | 62 | 78.6 | 0 | 0 | 9.44 | 45.3 | 19.51 | 41.25 | 60.77 |
| falarm_07_sounding_rocket | 155 | 3.1 | 122 | 33 | 78.7 | 0 | 0 | -1.72 | 24.4 | 11.21 | 23 | 34.21 |
| falarm_08_exercise_window | 560 | 11.2 | 151 | 409 | 27 | 31 | 0 | 2.16 | 27.8 | 9.39 | 23.37 | 32.76 |
| falarm_09_outside_the_box | 345 | 6.9 | 22 | 323 | 6.4 | 10 | 0 | 6.07 | 57.6 | 27.43 | 22 | 49.43 |
| falarm_10_training_tape | 214 | 4.28 | 51 | 163 | 23.8 | 0 | 0 | 1.57 | 43.2 | 8.8 | 21.51 | 30.31 |
| falarm_14_six_tracks | 222 | 4.44 | 117 | 105 | 52.7 | 9 | 0 | 8.21 | 71.2 | 22.13 | 35.68 | 57.82 |
| falarm_15_salvo_notified | 128 | 2.56 | 105 | 23 | 82 | 0 | 0 | -1.8 | 78.1 | 23.75 | 52.66 | 76.41 |
| falarm_16_reflection | 94 | 1.88 | 62 | 32 | 66 | 0 | 0 | -0.62 | 66.4 | 12.56 | 25.36 | 37.93 |
| falarm_22_jonah | 341 | 6.82 | 282 | 59 | 82.7 | 0 | 0 | -0.83 | 21.6 | 4.75 | 12.64 | 17.38 |
| falarm_23_poisoned_board | 169 | 3.38 | 24 | 145 | 14.2 | 0 | 0 | 3.01 | 53.8 | 9.53 | 26.73 | 36.27 |
| falarm_24_the_pattern | 391 | 7.82 | 91 | 300 | 23.3 | 0 | 0 | 4.67 | 71.2 | 16.55 | 36.72 | 53.27 |
| falarm_25_post_mortem | 76 | 1.52 | 0 | 76 | 0 | 0 | 0 | 0 | 64.5 | 9 | 42.05 | 51.05 |
| falarm_26_the_call | 250 | 5 | 149 | 101 | 59.6 | 0 | 0 | 1.01 | 90.5 | 31.53 | 50.69 | 82.22 |
| fp_intercept_01_one_bird | 1316 | 26.32 | 1080 | 236 | 82.1 | 62 | 0 | 4.09 | 122 | 34.57 | 58 | 92.57 |
| fp_intercept_02_splash | 516 | 10.32 | 328 | 188 | 63.6 | 0 | 0 | 3.62 | 113.9 | 23.09 | 50 | 73.09 |
| fp_intercept_03_two_misses | 469 | 9.38 | 455 | 14 | 97 | 0 | 0 | 7.65 | 150.2 | 19.45 | 55 | 74.45 |
| fp_intercept_04b_splash_zone | 224 | 4.48 | 212 | 12 | 94.6 | 0 | 0 | 7.46 | 124.6 | 19.64 | 50 | 69.64 |
| fp_intercept_05_the_line | 214 | 4.28 | 8 | 206 | 3.7 | 0 | 0 | 5.51 | 151.5 | 16.75 | 52 | 68.75 |
| fp_intercept_06_the_package | 1190 | 23.8 | 969 | 221 | 81.4 | 60 | 0 | 9.91 | 175.1 | 26.28 | 77.61 | 103.89 |
| fp_intercept_07_the_morning_after | 229 | 4.58 | 4 | 225 | 1.7 | 0 | 0 | -7.05 | 102.1 | 21.12 | 35 | 56.12 |
| fp_intercept_08_second_track | 743 | 14.86 | 42 | 701 | 5.7 | 42 | 0 | 12.83 | 240.5 | 32.52 | 44 | 76.52 |
| fp_intercept_09_the_question | 195 | 3.9 | 125 | 70 | 64.1 | 0 | 0 | 2.04 | 307.8 | 26.97 | 46 | 72.97 |
| fp_intercept_fa_01_eleven_tracks | 428 | 8.56 | 325 | 103 | 75.9 | 0 | 0 | 5.04 | 99.3 | 20.7 | 37 | 57.7 |
| fp_intercept_fa_03_the_honest_number | 422 | 8.44 | 32 | 390 | 7.6 | 26 | 0 | 9.42 | 143.8 | 25.1 | 42 | 67.1 |
| fp_intercept_fa_04_the_tape | 409 | 8.18 | 271 | 138 | 66.3 | 0 | 0 | -6.99 | 154.2 | 22.94 | 34 | 56.94 |
| fp_midnight_01_one_chair | 1442 | 28.84 | 1341 | 101 | 93 | 0 | 0 | 2.79 | 112 | 10.19 | 35 | 45.19 |
| fp_midnight_02_their_hour | 405 | 8.1 | 78 | 327 | 19.3 | 0 | 0 | 3.23 | 128.7 | 9.12 | 25 | 34.12 |
| fp_midnight_03_our_hour | 238 | 4.76 | 18 | 220 | 7.6 | 0 | 0 | 5.08 | 133.9 | 14.69 | 40.69 | 55.38 |
| fp_midnight_04_full_readiness | 796 | 15.92 | 483 | 313 | 60.7 | 0 | 0 | 3.51 | 81.8 | 19.79 | 34 | 53.79 |
| fp_midnight_05_four_minutes | 578 | 11.56 | 23 | 555 | 4 | 0 | 0 | 6.37 | 121.9 | 18.92 | 63.87 | 82.79 |
| fp_midnight_10_the_hour_after | 1237 | 24.74 | 1144 | 93 | 92.5 | 60 | 0 | 11.5 | 179.2 | 37.05 | 70.24 | 107.3 |
| fp_midnight_11_nine_minutes | 774 | 15.48 | 325 | 449 | 42 | 39 | 0 | 6.48 | 261.2 | 29.95 | 64 | 93.95 |
| fp_midnight_12_have_you_eaten | 23 | 0.46 | 0 | 23 | 0 | 0 | 0 | 2 | 124.3 | 6 | 27 | 33 |
| fp_midnight_13_the_record | 261 | 5.22 | 124 | 137 | 47.5 | 0 | 0 | -2.38 | 125.3 | 19.02 | 39 | 58.02 |
| fp_midnight_14_they_blinked | 160 | 3.2 | 43 | 117 | 26.9 | 0 | 0 | -4.58 | 83.1 | 14.85 | 26 | 40.85 |
| fp_summit_01_the_lake_door | 1671 | 33.42 | 136 | 1535 | 8.1 | 0 | 0 | 0.84 | 86 | 5.22 | 23 | 28.22 |
| fp_summit_05_the_folder | 589 | 11.78 | 332 | 257 | 56.4 | 0 | 0 | 1.44 | 116.3 | 10.96 | 24 | 34.96 |
| fp_summit_06_not_a_knife | 1668 | 33.36 | 195 | 1473 | 11.7 | 87 | 0 | 2.41 | 124.9 | 11.52 | 33 | 44.52 |
| fp_summit_11_both_sides | 195 | 3.9 | 27 | 168 | 13.8 | 0 | 0 | 0.5 | 148.6 | 9.21 | 33 | 42.21 |
| fp_summit_12_the_third_chair | 1469 | 29.38 | 224 | 1245 | 15.2 | 0 | 0 | 1.45 | 113.4 | 8.74 | 29 | 37.74 |
| fp_summit_13_witness | 178 | 3.56 | 56 | 122 | 31.5 | 0 | 0 | -1.94 | 97.6 | 14.2 | 29 | 43.2 |
| fp_summit_14_the_cars | 1482 | 29.64 | 444 | 1038 | 30 | 72 | 0 | 3.78 | 126.2 | 19.98 | 32 | 51.98 |
| press_01_the_opening_bell | 887 | 17.74 | 726 | 161 | 81.8 | 0 | 0 | 0 | 18.5 | 8.8 | 9.25 | 18.06 |
| press_02_the_first_question | 909 | 18.18 | 375 | 534 | 41.3 | 36 | 0 | 0 | 10 | 6.47 | 10.27 | 16.74 |
| press_03_the_loyal_opposition | 867 | 17.34 | 238 | 629 | 27.5 | 0 | 0 | 0 | 11.8 | 6.8 | 14.5 | 21.29 |
| press_04_three_twenty | 766 | 14.4 | 766 | 0 | 100 | 0 | 0 | -2 | 13.5 | 4 | 9.3 | 13.3 |
| press_05_the_council_mood | 877 | 16.32 | 295 | 582 | 33.6 | 0 | 0 | 0.68 | 16.5 | 8.47 | 17.27 | 25.74 |
| press_06_what_you_may_do | 889 | 17.78 | 551 | 338 | 62 | 0 | 0 | 1.86 | 22.1 | 6.12 | 12.53 | 18.65 |
| press_07_the_generals_patience | 868 | 17.36 | 399 | 469 | 46 | 40 | 0 | 1.3 | 20.2 | 12.62 | 25.26 | 37.88 |
| press_08_the_call_from_varga | 910 | 18.2 | 625 | 285 | 68.7 | 0 | 0 | 0 | 19.2 | 6.63 | 15.26 | 21.89 |
| press_09_amberline_asks | 895 | 17.9 | 737 | 158 | 82.3 | 0 | 0 | 1.65 | 22.4 | 5.57 | 13.53 | 19.1 |
| press_10_the_square | 866 | 17.32 | 150 | 716 | 17.3 | 0 | 0 | 0 | 11.8 | 7.79 | 17.55 | 25.34 |
| press_11_the_currency | 499 | 9.7 | 332 | 167 | 66.5 | 0 | 0 | 0 | 21.1 | 13.23 | 18.8 | 32.03 |
| press_12_the_leak | 488 | 9.76 | 189 | 299 | 38.7 | 26 | 0 | 0 | 13.1 | 9.73 | 12 | 21.73 |
| press_13_the_confidence_motion | 483 | 9.66 | 56 | 427 | 11.6 | 0 | 0 | 0 | 17.8 | 11.91 | 14 | 25.91 |
| press_14_the_hospital | 352 | 7.04 | 245 | 107 | 69.6 | 0 | 0 | 0.3 | 17.9 | 7.7 | 15 | 22.7 |
| press_15_the_colonels_column | 444 | 8.88 | 166 | 278 | 37.4 | 0 | 0 | 0 | 16.7 | 10.09 | 19.93 | 30.02 |
| press_16_the_lawyer_at_midnight | 486 | 9.72 | 482 | 4 | 99.2 | 0 | 0 | 0 | 17.3 | 6.54 | 11 | 17.54 |
| press_17_the_joint_statement | 494 | 9.88 | 344 | 150 | 69.6 | 0 | 0 | 2.09 | 33.5 | 9.86 | 21.04 | 30.9 |
| press_18_the_rumour | 401 | 7.6 | 128 | 273 | 31.9 | 0 | 0 | 0.28 | 14.7 | 4.09 | 11 | 15.09 |
| press_19_caldor_asks | 485 | 9.7 | 156 | 329 | 32.2 | 0 | 0 | 1.84 | 18.4 | 12.34 | 27 | 39.34 |
| press_20_the_hunger_strike | 496 | 9.92 | 356 | 140 | 71.8 | 0 | 0 | 0 | 16.7 | 10.44 | 21.95 | 32.39 |
| press_21_the_bond_auction | 530 | 10.04 | 503 | 27 | 94.9 | 0 | 0 | 0 | 25.8 | 11.05 | 13.58 | 24.63 |
| press_22_the_interview | 538 | 10.76 | 382 | 156 | 71 | 29 | 0 | 0.29 | 49.1 | 12.98 | 25.11 | 38.09 |
| press_23_the_floor | 549 | 10.98 | 399 | 150 | 72.7 | 0 | 0 | 0 | 41.9 | 14.54 | 29.09 | 43.63 |
| press_24_the_birthday | 419 | 8.38 | 419 | 0 | 100 | 0 | 0 | -2 | 26 | 5 | 13.55 | 18.55 |
| press_25_the_minute | 518 | 10.36 | 198 | 320 | 38.2 | 0 | 0 | 1.85 | 33.3 | 10.78 | 21.1 | 31.88 |
| press_26_the_detainees | 604 | 12.08 | 141 | 463 | 23.3 | 0 | 0 | 0 | 37.8 | 8.59 | 17.18 | 25.77 |
| press_27_the_resignation | 531 | 10.62 | 450 | 81 | 84.7 | 26 | 0 | 5.63 | 66.5 | 22.57 | 50.11 | 72.68 |
| press_28_the_compact_vote | 523 | 10.46 | 238 | 285 | 45.5 | 0 | 0 | 0.52 | 36.8 | 14.78 | 21.52 | 36.3 |
| press_29_vestria_asks | 513 | 10.26 | 9 | 504 | 1.8 | 0 | 0 | 1.94 | 39.1 | 5.26 | 23.1 | 28.36 |
| press_30_the_march | 536 | 10.72 | 180 | 356 | 33.6 | 0 | 0 | 0.66 | 40.7 | 16.57 | 34.13 | 50.7 |
| press_31_the_run | 422 | 8.24 | 318 | 104 | 75.4 | 21 | 0 | 0 | 56.1 | 22.98 | 32.87 | 55.84 |
| press_32_the_final_edition | 437 | 8.74 | 344 | 93 | 78.7 | 23 | 0 | 0.64 | 57.5 | 13.79 | 31.89 | 45.68 |
| press_33_the_unity_government | 429 | 8.58 | 69 | 360 | 16.1 | 0 | 0 | 0 | 34.8 | 17.41 | 25.26 | 42.67 |
| press_34_the_suitcase | 419 | 8.38 | 9 | 410 | 2.1 | 0 | 0 | -0.94 | 22.9 | 3.24 | 17.29 | 20.53 |
| press_35_the_list | 429 | 8.58 | 320 | 109 | 74.6 | 0 | 0 | 0.75 | 49.8 | 15.29 | 30.59 | 45.88 |
| press_36_the_delegation | 428 | 8.56 | 320 | 108 | 74.8 | 0 | 0 | 3.98 | 64.5 | 12.57 | 26.3 | 38.87 |
| press_37_the_ramps | 410 | 8.2 | 328 | 82 | 80 | 17 | 0 | 4.6 | 66 | 15.02 | 32.19 | 47.21 |
| press_38_the_last_call | 443 | 8.86 | 424 | 19 | 95.7 | 0 | 0 | 3.83 | 76.3 | 18.19 | 33.5 | 51.69 |
| press_39_amberline_flees | 439 | 8.78 | 398 | 41 | 90.7 | 0 | 0 | 3.63 | 57 | 9.51 | 23.5 | 33 |
| press_40_the_vigil | 418 | 8.36 | 340 | 78 | 81.3 | 0 | 0 | -0.63 | 35.5 | 15.07 | 32.81 | 47.88 |
| proxy_01_kestrel_bridge | 1369 | 27.38 | 446 | 923 | 32.6 | 0 | 0 | 1.3 | 20 | 9.51 | 20.48 | 30 |
| proxy_02_what_will_you_do | 492 | 9.84 | 349 | 143 | 70.9 | 31 | 0 | 2.13 | 35.2 | 10.95 | 24.82 | 35.77 |
| proxy_03_the_quiet_war | 522 | 10.44 | 45 | 477 | 8.6 | 0 | 0 | 4.56 | 84.7 | 13.49 | 31.54 | 45.03 |
| proxy_04_the_team | 1449 | 28.98 | 706 | 743 | 48.7 | 0 | 0 | 2.97 | 29.8 | 10.92 | 14.08 | 24.99 |
| proxy_05_no_insignia | 1563 | 31.26 | 423 | 1140 | 27.1 | 0 | 0 | 0.54 | 26.7 | 4.74 | 14.38 | 19.11 |
| proxy_06_volunteers | 209 | 4.18 | 156 | 53 | 74.6 | 0 | 0 | 4.48 | 54.4 | 13.23 | 28.06 | 41.29 |
| proxy_07_the_brigade | 188 | 3.76 | 73 | 115 | 38.8 | 0 | 0 | 4.03 | 52.7 | 21.27 | 42.79 | 64.05 |
| proxy_16_what_they_see | 204 | 4.08 | 137 | 67 | 67.2 | 0 | 0 | -1.7 | 55.7 | 10.03 | 18.39 | 28.42 |
| proxy_17_monitors_on_the_aum | 324 | 6.48 | 75 | 249 | 23.1 | 0 | 0 | 0.13 | 42.3 | 10.55 | 29.92 | 40.47 |
| proxy_18_how_many | 846 | 16.92 | 166 | 680 | 19.6 | 0 | 0 | 0 | 21.6 | 4.71 | 15.56 | 20.27 |
| proxy_19_first_coffin | 548 | 10.96 | 474 | 74 | 86.5 | 39 | 0 | 1.73 | 41 | 6.93 | 19.12 | 26.06 |
| proxy_20_the_column | 1 | 0.02 | 1 | 0 | 100 | 0 | 0 | 18 | 100 | 41 | 42 | 83 |
| proxy_21_across_the_aum | 2 | 0.04 | 0 | 2 | 0 | 0 | 0 | 0 | 59.5 | 13 | 36 | 49 |
| proxy_22_bring_them_home | 142 | 2.84 | 0 | 142 | 0 | 0 | 0 | 5 | 75.9 | 10 | 81.82 | 91.82 |
| proxy_23_the_line | 32 | 0.64 | 5 | 27 | 15.6 | 0 | 0 | 1.28 | 47.5 | 9.94 | 39.03 | 48.97 |
| proxy_24_contact | 1 | 0.02 | 1 | 0 | 100 | 0 | 0 | 8 | 155 | 11 | 45 | 56 |
| proxy_25_the_radar | 143 | 2.86 | 78 | 65 | 54.5 | 0 | 0 | 5.36 | 49.5 | 12.4 | 22.76 | 35.15 |
| blackout_01_dark_sky | 1295 | 25.9 | 568 | 727 | 43.9 | 0 | 0 | 1.32 | 12.1 | 5.92 | 11.46 | 17.38 |
| blackout_02_during_the_exercise | 443 | 8.86 | 305 | 138 | 68.8 | 18 | 0 | 2.75 | 31.7 | 9.04 | 19.45 | 28.49 |
| blackout_03_eleven_hours | 531 | 10.62 | 202 | 329 | 38 | 21 | 0 | 3.72 | 54.4 | 11.56 | 16.84 | 28.39 |
| blackout_04_the_guess | 1202 | 24.04 | 1109 | 93 | 92.3 | 0 | 0 | 5.54 | 46.9 | 11.99 | 30.7 | 42.68 |
| blackout_05_the_report | 1121 | 22.42 | 938 | 183 | 83.7 | 0 | 0 | 1.63 | 22.8 | 9.51 | 23.16 | 32.67 |
| blackout_06_wrong_headland | 467 | 9.34 | 126 | 341 | 27 | 0 | 0 | 2.84 | 57 | 11.67 | 34.62 | 46.28 |
| blackout_07_their_answer | 1192 | 23.84 | 864 | 328 | 72.5 | 0 | 0 | -1.25 | 39.7 | 15.32 | 28.29 | 43.61 |
| blackout_08_the_north_cape | 110 | 2.2 | 77 | 33 | 70 | 0 | 0 | 0.19 | 30.2 | 10.86 | 17.96 | 28.83 |
| blackout_09_the_protest | 47 | 0.94 | 6 | 41 | 12.8 | 0 | 0 | 2.62 | 72.4 | 10.51 | 28.47 | 38.98 |
| blackout_18_the_window | 944 | 18.88 | 513 | 431 | 54.3 | 43 | 0 | 7.42 | 31 | 20.41 | 25.74 | 46.14 |
| blackout_19_quiet_understanding | 817 | 16.34 | 611 | 206 | 74.8 | 0 | 0 | -5.59 | 38.2 | 19.48 | 27.38 | 46.86 |
| blackout_20_the_third_chair | 216 | 4.32 | 58 | 158 | 26.9 | 0 | 0 | 0 | 30.3 | 4.84 | 13.56 | 18.41 |
| blackout_21_the_battery | 85 | 1.7 | 7 | 78 | 8.2 | 0 | 0 | -0.49 | 35 | 7.44 | 38.36 | 45.8 |
| blackout_22_nobody_did_this | 31 | 0.62 | 11 | 20 | 35.5 | 0 | 0 | -0.87 | 41.6 | 21.9 | 19.94 | 41.84 |
| blackout_23_the_replacement | 185 | 3.7 | 34 | 151 | 18.4 | 0 | 0 | 0.37 | 36.1 | 13.29 | 20.35 | 33.64 |
| blackout_24_the_leak | 43 | 0.86 | 1 | 42 | 2.3 | 5 | 0 | 1.86 | 40 | 19.26 | 19.07 | 38.33 |
| blackout_25_a_pattern | 81 | 1.62 | 54 | 27 | 66.7 | 0 | 0 | 2 | 43.1 | 9.59 | 18.79 | 28.38 |
| blackout_26_in_the_way | 13 | 0.26 | 5 | 8 | 38.5 | 0 | 0 | -0.69 | 31 | 10.38 | 25.31 | 35.69 |
| summit_01_a_lunch_in_amberline | 635 | 12.7 | 205 | 430 | 32.3 | 0 | 0 | 0.06 | 32 | 9.35 | 25.29 | 34.65 |
| summit_02_the_offer | 777 | 15.54 | 124 | 653 | 16 | 0 | 0 | 0 | 34.2 | 10.23 | 24.82 | 35.05 |
| summit_03_the_third_chair | 592 | 11.84 | 16 | 576 | 2.7 | 0 | 0 | 0 | 42.2 | 2.38 | 18.37 | 20.74 |
| summit_04_after_the_week | 359 | 7.18 | 41 | 318 | 11.4 | 0 | 0 | 2.09 | 57.8 | 11.39 | 39.37 | 50.75 |
| summit_05_preconditions | 344 | 6.88 | 34 | 310 | 9.9 | 0 | 0 | 2.21 | 37.9 | 9.75 | 34.12 | 43.87 |
| summit_06_silence_from_kaskad | 1193 | 23.86 | 390 | 803 | 32.7 | 0 | 0 | 2.38 | 43.4 | 10.46 | 24.84 | 35.3 |
| summit_07_the_venue | 1112 | 22.24 | 246 | 866 | 22.1 | 0 | 0 | 2.47 | 46.6 | 11.09 | 28.1 | 39.19 |
| summit_08_no_plans_to_travel | 1741 | 34.82 | 128 | 1613 | 7.4 | 84 | 0 | 4.66 | 68.1 | 15.53 | 32.43 | 47.96 |
| summit_10_the_night_before | 429 | 8.58 | 15 | 414 | 3.5 | 0 | 0 | 0 | 32.9 | 4.24 | 14.86 | 19.11 |
| summit_11_the_room | 429 | 8.58 | 27 | 402 | 6.3 | 21 | 0 | 0 | 39.2 | 2.54 | 13.07 | 15.61 |
| summit_12_the_last_sentence | 36 | 0.72 | 2 | 34 | 5.6 | 0 | 0 | -6.44 | 44.6 | 17.61 | 43.53 | 61.14 |
| summit_13_the_walkout | 401 | 8.02 | 23 | 378 | 5.7 | 18 | 0 | 7.66 | 65.7 | 18.18 | 42.06 | 60.25 |
| summit_14_the_empty_chair | 2078 | 41.56 | 772 | 1306 | 37.2 | 0 | 0 | 2.65 | 65.8 | 20.01 | 41.09 | 61.1 |
| summit_23_the_first_paragraph | 39 | 0.78 | 10 | 29 | 25.6 | 0 | 0 | 0 | 43.7 | 17.54 | 37.74 | 55.28 |
| summit_24_what_it_bought | 6 | 0.12 | 1 | 5 | 16.7 | 0 | 0 | 2.83 | 40.3 | 10.5 | 28.83 | 39.33 |
| ultimatum_01_seventy_two_hours | 653 | 13.06 | 520 | 133 | 79.6 | 0 | 0 | 3.98 | 40.3 | 9.89 | 22.44 | 32.33 |
| ultimatum_02_the_generals_clock | 827 | 16.54 | 623 | 204 | 75.3 | 0 | 0 | 5.26 | 55.4 | 13.08 | 20.58 | 33.66 |
| ultimatum_03_the_broadcast | 584 | 11.68 | 540 | 44 | 92.5 | 0 | 0 | 4.62 | 65.5 | 10.58 | 28.5 | 39.08 |
| ultimatum_04_the_pattern | 207 | 4.14 | 147 | 60 | 71 | 0 | 0 | 4.26 | 63 | 11.2 | 22.49 | 33.69 |
| ultimatum_05_on_the_record | 1207 | 24.14 | 1080 | 127 | 89.5 | 0 | 0 | 2.68 | 47.4 | 6.85 | 21.03 | 27.88 |
| ultimatum_06_the_call | 1441 | 28.82 | 774 | 667 | 53.7 | 0 | 0 | 1.31 | 58.9 | 30.12 | 41.38 | 71.5 |
| ultimatum_07_the_hour_after | 491 | 9.82 | 193 | 298 | 39.3 | 23 | 0 | 2.08 | 88 | 20.24 | 39.8 | 60.04 |
| ultimatum_08_indicative | 488 | 9.76 | 183 | 305 | 37.5 | 0 | 0 | 0.47 | 126.1 | 20.93 | 45.18 | 66.11 |
| ultimatum_09_the_wording | 623 | 12.46 | 287 | 336 | 46.1 | 0 | 0 | 3.38 | 50.9 | 8.01 | 12.33 | 20.34 |
| ultimatum_10_the_private_word | 204 | 4.08 | 167 | 37 | 81.9 | 0 | 0 | 3.55 | 54 | 10.49 | 29.83 | 40.31 |
| ultimatum_11_friday_noon | 789 | 15.78 | 708 | 81 | 89.7 | 43 | 0 | 6.67 | 54.8 | 20.05 | 51.92 | 71.97 |
| ultimatum_12_the_consequence | 579 | 11.58 | 556 | 23 | 96 | 31 | 0 | 13.22 | 113.4 | 35.49 | 81.97 | 117.46 |
| ultimatum_13_the_second_deadline | 81 | 1.62 | 81 | 0 | 100 | 0 | 0 | 5 | 75.5 | 9 | 54.06 | 63.06 |
| ultimatum_14_the_answer | 551 | 11.02 | 539 | 12 | 97.8 | 0 | 0 | -7.61 | 110 | 24.54 | 42.48 | 67.01 |
| ultimatum_23_what_they_see | 11 | 0.22 | 0 | 11 | 0 | 0 | 0 | 5 | 78.7 | 9 | 42.73 | 51.73 |
| ultimatum_24_the_operations_room | 47 | 0.94 | 36 | 11 | 76.6 | 0 | 0 | 1.83 | 48 | 10.7 | 24.64 | 35.34 |
| ultimatum_25_the_formula | 389 | 7.78 | 56 | 333 | 14.4 | 0 | 0 | 3.12 | 87.1 | 26.19 | 71.83 | 98.01 |
| ultimatum_26_the_ledger | 700 | 14 | 18 | 682 | 2.6 | 0 | 0 | 0 | 26.7 | 12.79 | 39.23 | 52.02 |
| cables_01_three_forty | 1374 | 27.48 | 1148 | 226 | 83.6 | 0 | 0 | 0 | 15 | 11.22 | 9.23 | 20.45 |
| cables_02_two_of_ours | 447 | 8.94 | 320 | 127 | 71.6 | 30 | 0 | 3.3 | 31 | 10.15 | 20.85 | 31 |
| cables_03_her_line | 467 | 9.34 | 372 | 95 | 79.7 | 27 | 0 | 3.19 | 56.7 | 14.43 | 33.13 | 47.55 |
| cables_04_the_trawler | 1916 | 38.32 | 1191 | 725 | 62.2 | 0 | 0 | 2.49 | 26 | 10.79 | 24.13 | 34.92 |
| cables_06_clean_cut | 725 | 14.5 | 545 | 180 | 75.2 | 0 | 0 | 2.36 | 15.3 | 13.46 | 18.9 | 32.36 |
| cables_07_the_tern | 2287 | 45.74 | 1553 | 734 | 67.9 | 102 | 0 | 0.91 | 19.7 | 15.24 | 20.01 | 35.25 |
| cables_08_two_corvettes | 734 | 14.68 | 427 | 307 | 58.2 | 0 | 0 | 3.75 | 44.3 | 13.25 | 22.31 | 35.56 |
| cables_09_fishing_story | 1037 | 20.74 | 621 | 416 | 59.9 | 0 | 0 | 2.4 | 35.2 | 9.28 | 20.5 | 29.78 |
| cables_10_wrong_boat | 491 | 9.82 | 14 | 477 | 2.9 | 0 | 0 | 2.91 | 28.5 | 4.44 | 25.02 | 29.45 |
| cables_11_war_risk | 22 | 0.44 | 10 | 12 | 45.5 | 0 | 0 | 0 | 47.4 | 22.09 | 30.59 | 52.68 |
| cables_12_turned_back | 690 | 13.8 | 472 | 218 | 68.4 | 31 | 0 | 4.1 | 44.9 | 14.68 | 26.91 | 41.59 |
| cables_13_the_splice | 2241 | 44.82 | 1968 | 273 | 87.8 | 0 | 0 | 2.63 | 34.5 | 5.64 | 15.34 | 20.98 |
| cables_14_open_water | 260 | 5.2 | 164 | 96 | 63.1 | 0 | 0 | -1.78 | 61.5 | 25.44 | 49.32 | 74.76 |

## Weakest cards (heuristic)

Lowest impact among cards that are actually seen: tiny effects, near-identical choices, or both. Candidates for a rewrite or a cut.

| # | Card | Seen | L% | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | defector_15_the_winter_colonel | 151 | 22.5 | 0 | 30 | 3.13 | 7 | 10.13 |
| 2 | press_04_three_twenty | 766 | 100 | -2 | 13.5 | 4 | 9.3 | 13.3 |
| 3 | press_18_the_rumour | 401 | 31.9 | 0.28 | 14.7 | 4.09 | 11 | 15.09 |
| 4 | summit_11_the_room | 429 | 6.3 | 0 | 39.2 | 2.54 | 13.07 | 15.61 |
| 5 | press_02_the_first_question | 909 | 41.3 | 0 | 10 | 6.47 | 10.27 | 16.74 |
| 6 | blackout_01_dark_sky | 1295 | 43.9 | 1.32 | 12.1 | 5.92 | 11.46 | 17.38 |
| 7 | falarm_22_jonah | 341 | 82.7 | -0.83 | 21.6 | 4.75 | 12.64 | 17.38 |
| 8 | press_16_the_lawyer_at_midnight | 486 | 99.2 | 0 | 17.3 | 6.54 | 11 | 17.54 |
| 9 | press_01_the_opening_bell | 887 | 81.8 | 0 | 18.5 | 8.8 | 9.25 | 18.06 |
| 10 | defector_13_seventy_two_hours | 113 | 92 | 0 | 33.1 | 3.7 | 14.68 | 18.38 |
| 11 | dom_rep_01_the_tracker | 289 | 77.9 | 0 | 17.2 | 5.14 | 13.27 | 18.41 |
| 12 | blackout_20_the_third_chair | 216 | 26.9 | 0 | 30.3 | 4.84 | 13.56 | 18.41 |
| 13 | press_24_the_birthday | 419 | 100 | -2 | 26 | 5 | 13.55 | 18.55 |
| 14 | press_06_what_you_may_do | 889 | 62 | 1.86 | 22.1 | 6.12 | 12.53 | 18.65 |
| 15 | falarm_04_the_moon | 301 | 28.9 | 0.13 | 16.8 | 5.17 | 13.71 | 18.88 |
