# BRINK balance simulation

20000 runs per policy × 3 policies (random, greedy, heuristic) · seats: republic, federation, coalition · difficulty DEFCON 5 · mode endless · seed base `iter8`

Content: 450 cards, 64 pieces, 13 orders, 15 archetypes, 92 endings, 5 flashpoints. Final target 7000; "broke the game" at score ≥ 700000.

## Targets

| Status | Target | Value | Detail |
| --- | --- | --- | --- |
| PASS | T1 Heuristic win rate 5–12% at DEFCON 5 | 6.66% | 0.09% stand-down, 6.57% survival |
| PASS | T2 ≥ 10 archetypes reach the Endgame ≥ 10% of the time (heuristic, assembled by act 3, ≥ 20 runs) | 11 of 15 archetypes | 11 assembled in ≥ 20 runs: war_economy 26.72%, alliance_engine 29.95%, peace_movement 20.9%, accident_farmer 34.97%, intel_machine 30.15%, red_lines_gambler 44.44%, ledger 28.95%, sea_power 20%, quiet_diplomat 38.3%, hair_trigger 11.36%, shield_wall 27.59% |
| PASS | T3 No piece in more than 35% of winning builds (heuristic) | 0 over; top allied_basing 22.92% |  |
| PASS | T4 Heuristic median estimated minutes 15–25 | 17.85 min | p10 8.98, p90 22.23; 69.59 cards and 6.47 shops per run |
| FAIL | T5 ≥ 3% of heuristic runs score ≥ 100 × the final target ("broke the game") | 0.03% (5 runs ≥ 700000) | score median 5067, p90 11502.1, p99 36531.4, max 1449326 |

**4 PASS, 1 FAIL, 0 N/A.** Heuristic win rate: 6.66%.

## Summary

| Policy | Runs | Win % | Nuclear % | Median score | p99 score | Broke game % | Median min | Cards | Antes missed / run | Accidents fired / run | Timer expiry % | Near-miss % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| random | 20000 | 0 | 60.61 | 1802.5 | 10811.02 | 0 | 8.55 | 36.55 | 0.32 | 0.82 | 29.98 | 10.02 |
| greedy | 20000 | 0.09 | 3.89 | 811 | 5971.41 | 0 | 8.55 | 39.45 | 1.11 | 0.04 | 9.98 | 9.92 |
| heuristic | 20000 | 6.66 | 82.91 | 5067 | 36531.4 | 0.03 | 17.85 | 69.59 | 1.67 | 1.77 | 4.97 | 10.02 |
| all | 60000 | 2.25 | 49.14 | 1543 | 22210.02 | 0.01 | 9.85 | 48.53 | 1.03 | 0.88 | 12.82 | 10 |

## Policy: random

- Runs: **20000**
- Win rate (run_end ending on the last act): **0%**; stand-down 0%; nuclear 60.61%
- Score: median **1802.5**, mean 2495.37, p90 5139.4, p99 10811.02, max 42334; best single choice 356.11 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **8.55**, p10 4.13, p90 13.17
- Days: median 17.25, mean 17.6, p10 9.25, p90 26; cards per run 36.55
- Endless: 0 runs continued (0%), 0 endless acts on average, max 0
- Timer expiry rate: 29.98% (48598 expiries / 162104 timed cards)
- Near-miss rate: 10.02% (11175 / 111557 rolls)
- Average peak escalation: 83.1; false alarms per run: 0.296
- Top ending share: **15.3%** (nuclear_intercept_exchange)

### Endings (random)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| nuclear_intercept_exchange | nuclear | 3060 | 15.3 |
| removed_public_0_republic | removed | 1718 | 8.59 |
| removed_public_0_federation | removed | 1576 | 7.88 |
| removed_public_0_coalition | removed | 1398 | 6.99 |
| nuclear_forty_miles | nuclear | 1322 | 6.61 |
| removed_public_0_square | removed | 1147 | 5.74 |
| core_nuclear_rogue | nuclear | 1079 | 5.4 |
| nuclear_straits | nuclear | 1069 | 5.35 |
| nuclear_blind | nuclear | 930 | 4.65 |
| removed_military_0 | removed | 911 | 4.56 |
| core_nuclear_false_alarm | nuclear | 879 | 4.39 |
| core_nuclear_attribution | nuclear | 819 | 4.1 |
| core_nuclear_misread | nuclear | 792 | 3.96 |
| nuclear_midnight | nuclear | 547 | 2.74 |
| nuclear_after_vellmar | nuclear | 424 | 2.12 |
| nuclear_after_midnight | nuclear | 362 | 1.81 |
| removed_allies_0_federation | removed | 349 | 1.75 |
| nuclear_dark_sky | nuclear | 219 | 1.1 |
| removed_military_100_federation | removed | 137 | 0.69 |
| nuclear_last_card | nuclear | 131 | 0.66 |
| special_resigned | special | 129 | 0.65 |
| removed_military_0_unsigned | removed | 120 | 0.6 |
| removed_allies_0 | removed | 118 | 0.59 |
| nuclear_vestria | nuclear | 112 | 0.56 |
| core_nuclear_called | nuclear | 104 | 0.52 |
| nuclear_standing_orders | nuclear | 102 | 0.51 |
| nuclear_generals_war | nuclear | 94 | 0.47 |
| removed_allies_100 | removed | 68 | 0.34 |
| removed_allies_100_consulted | removed | 49 | 0.25 |
| removed_military_0_admiral | removed | 39 | 0.2 |
| removed_military_100 | removed | 35 | 0.18 |
| nuclear_deep_bunker | nuclear | 30 | 0.15 |
| removed_economy_0_federation | removed | 27 | 0.14 |
| nuclear_ladder | nuclear | 21 | 0.11 |
| removed_public_100 | removed | 19 | 0.1 |
| removed_allies_0_republic | removed | 18 | 0.09 |
| removed_military_100_hawk | removed | 16 | 0.08 |
| core_nuclear_leverage | nuclear | 9 | 0.05 |
| nuclear_second_use | nuclear | 7 | 0.04 |
| nuclear_believed | nuclear | 6 | 0.03 |
| removed_economy_0 | removed | 4 | 0.02 |
| nuclear_launch_on_warning | nuclear | 3 | 0.02 |
| removed_economy_0_reserve | removed | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 12121 | 60.61 | 12121 | 60.61 |
| removed | 7750 | 38.75 | 7750 | 38.75 |
| standdown | 0 | 0 | 0 | 0 |
| survival | 0 | 0 | 0 | 0 |
| special | 129 | 0.65 | 129 | 0.65 |

### Act reached (random)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 3944 | 19.72 |
| 2 | Week Two | 8635 | 43.18 |
| 3 | Week Three | 6429 | 32.15 |
| 4 | Week Four | 980 | 4.9 |
| 5 | Endgame | 12 | 0.06 |

### Antes per act (random)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 19933 | 18463 | 92.63 | 1470 | 7.37 | 1957 | 9.82 |
| 2 | Week Two | 12436 | 8489 | 68.26 | 3947 | 31.74 | 3541 | 28.47 |
| 3 | Week Three | 2196 | 1224 | 55.74 | 972 | 44.26 | 468 | 21.31 |
| 4 | Week Four | 86 | 24 | 27.91 | 62 | 72.09 | 3 | 3.49 |

### Accidents (random)

- Attached to 15.84% of cards (5.79 per run); 14.12% of those fired (0.82 per run)
- Fatal at once: 19.84% of fired; mean escalation per fired accident: 6.3

### Capital and orders (random)

- Capital earned 13.2 / spent 12.14 per run; 3.22 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 2.48 / sold 0 per run; orders bought 0.72 / used 0.62 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 11616 | 1202 | 10.35% | 1094 | 91.01% |
| say_it_again | 7137 | 201 | 2.82% | 171 | 85.07% |
| double_down | 7211 | 135 | 1.87% | 113 | 83.7% |
| intercept_package | 11500 | 1884 | 16.38% | 1685 | 89.44% |
| duty_officers_veto | 11717 | 1213 | 10.35% | 622 | 51.28% |
| lose_the_memo | 11670 | 1854 | 15.89% | 1634 | 88.13% |
| favour_owed | 11565 | 2791 | 24.13% | 2477 | 88.75% |
| one_more_call | 7210 | 744 | 10.32% | 673 | 90.46% |
| leaked_assessment | 6945 | 192 | 2.76% | 164 | 85.42% |
| calm_the_markets | 11755 | 1136 | 9.66% | 1032 | 90.85% |
| rally | 11477 | 1157 | 10.08% | 1047 | 90.49% |
| muster | 11667 | 1190 | 10.2% | 1098 | 92.27% |
| personal_letter | 7270 | 735 | 10.11% | 672 | 91.43% |

### Score distribution (random)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2495.37 | 584 | 928 | 1802.5 | 3328.25 | 5139.4 | 10811.02 | 42334 |

### Per seat (random)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 0 | 1917 | 17.75 | 63.68 | 35.48 | 0 | 0 | 0.84 |
| federation | 6667 | 0 | 1860 | 17.25 | 59.46 | 40.12 | 0 | 0 | 0.42 |
| republic | 6667 | 0 | 1629 | 17.25 | 58.68 | 40.65 | 0 | 0 | 0.67 |

### Piece buy rates (random)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 4906 | 652 | 13.29% | no |
| dove_fm | advisor | rare | 2072 | 109 | 5.26% | no |
| paranoid_intel | advisor | common | 6796 | 2328 | 34.26% | yes |
| cautious_intel | advisor | common | 7057 | 2392 | 33.9% | yes |
| spin_doctor | advisor | uncommon | 4865 | 646 | 13.28% | no |
| ambassador | advisor | uncommon | 4876 | 612 | 12.55% | no |
| cyber_director | advisor | uncommon | 4849 | 601 | 12.39% | no |
| treasury_hawk | advisor | common | 7585 | 2580 | 34.01% | yes |
| fixer | advisor | uncommon | 4902 | 633 | 12.91% | no |
| admiral | advisor | uncommon | 4799 | 619 | 12.9% | no |
| peace_leader | advisor | common | 7429 | 2548 | 34.3% | yes |
| contractor | advisor | rare | 2100 | 98 | 4.67% | no |
| iron_nerve | advisor | legendary | 962 | 34 | 3.53% | no |
| long_table | advisor | legendary | 1017 | 27 | 2.65% | no |
| field_marshal | advisor | rare | 2142 | 112 | 5.23% | no |
| press_office | advisor | rare | 2075 | 103 | 4.96% | no |
| attache | advisor | uncommon | 4825 | 631 | 13.08% | no |
| lobby | advisor | uncommon | 4686 | 606 | 12.93% | no |
| pollster | advisor | common | 7510 | 2538 | 33.79% | yes |
| early_warning | asset | uncommon | 4869 | 619 | 12.71% | no |
| back_channel | asset | uncommon | 4870 | 611 | 12.55% | no |
| cyber_unit | asset | uncommon | 4907 | 622 | 12.68% | no |
| missile_defence | asset | uncommon | 4790 | 617 | 12.88% | no |
| blue_water_fleet | asset | uncommon | 4791 | 571 | 11.92% | no |
| hardened_nc3 | asset | rare | 2050 | 100 | 4.88% | no |
| commercial_sat | asset | common | 7362 | 2503 | 34% | yes |
| allied_basing | asset | common | 7393 | 2450 | 33.14% | yes |
| strategic_reserve | asset | common | 7285 | 2544 | 34.92% | yes |
| rapid_response | asset | uncommon | 4828 | 613 | 12.7% | no |
| signals_intercept | asset | rare | 2086 | 109 | 5.23% | no |
| civil_defence | asset | uncommon | 4748 | 579 | 12.19% | no |
| deadman_switch | asset | legendary | 1021 | 34 | 3.33% | no |
| perfect_intel | asset | legendary | 992 | 34 | 3.43% | no |
| open_line | asset | legendary | 985 | 44 | 4.47% | no |
| war_economy | asset | legendary | 1017 | 33 | 3.24% | no |
| whispers | asset | rare | 2075 | 103 | 4.96% | no |
| ledger | asset | rare | 2037 | 82 | 4.03% | no |
| war_bonds | asset | rare | 2100 | 111 | 5.29% | no |
| tripwire | asset | rare | 2006 | 112 | 5.58% | no |
| quiet_room | asset | rare | 2038 | 93 | 4.56% | no |
| dockyards | asset | uncommon | 4791 | 638 | 13.32% | no |
| bunker | asset | uncommon | 4785 | 615 | 12.85% | no |
| war_room | asset | uncommon | 4767 | 621 | 13.03% | no |
| staff_college | asset | common | 7379 | 2498 | 33.85% | yes |
| trade_desk | asset | common | 7399 | 2527 | 34.15% | yes |
| courier | asset | common | 7324 | 2600 | 35.5% | yes |
| launch_on_warning | doctrine | rare | 2051 | 108 | 5.27% | no |
| deterrence_by_denial | doctrine | uncommon | 4781 | 603 | 12.61% | no |
| strategic_ambiguity | doctrine | uncommon | 4819 | 615 | 12.76% | no |
| no_first_use | doctrine | uncommon | 4738 | 617 | 13.02% | no |
| escalate_to_deescalate | doctrine | rare | 1948 | 108 | 5.54% | no |
| alliance_first | doctrine | common | 6946 | 2338 | 33.66% | yes |
| fortress | doctrine | common | 6894 | 2357 | 34.19% | yes |
| transparency | doctrine | uncommon | 4664 | 610 | 13.08% | no |
| red_lines | doctrine | rare | 2016 | 109 | 5.41% | no |
| hotline_protocol | doctrine | uncommon | 4740 | 565 | 11.92% | no |
| predelegation | doctrine | uncommon | 4840 | 631 | 13.04% | no |
| minimal_deterrence | doctrine | rare | 2040 | 105 | 5.15% | no |
| madman_theory | doctrine | legendary | 983 | 33 | 3.36% | no |
| brinkmanship | doctrine | legendary | 997 | 34 | 3.41% | no |
| domino_theory | doctrine | legendary | 1006 | 25 | 2.49% | no |
| the_button | doctrine | legendary | 1020 | 45 | 4.41% | no |
| second_strike | doctrine | rare | 2038 | 99 | 4.86% | no |
| propaganda | doctrine | uncommon | 4840 | 621 | 12.83% | no |

Outside band (51): hawk_general (13.29%), dove_fm (5.26%), spin_doctor (13.28%), ambassador (12.55%), cyber_director (12.39%), fixer (12.91%), admiral (12.9%), contractor (4.67%), iron_nerve (3.53%), long_table (2.65%), field_marshal (5.23%), press_office (4.96%), attache (13.08%), lobby (12.93%), early_warning (12.71%), back_channel (12.55%), cyber_unit (12.68%), missile_defence (12.88%), blue_water_fleet (11.92%), hardened_nc3 (4.88%), rapid_response (12.7%), signals_intercept (5.23%), civil_defence (12.19%), deadman_switch (3.33%), perfect_intel (3.43%), open_line (4.47%), war_economy (3.24%), whispers (4.96%), ledger (4.03%), war_bonds (5.29%), tripwire (5.58%), quiet_room (4.56%), dockyards (13.32%), bunker (12.85%), war_room (13.03%), launch_on_warning (5.27%), deterrence_by_denial (12.61%), strategic_ambiguity (12.76%), no_first_use (13.02%), escalate_to_deescalate (5.54%), transparency (13.08%), red_lines (5.41%), hotline_protocol (11.92%), predelegation (13.04%), minimal_deterrence (5.15%), madman_theory (3.36%), brinkmanship (3.41%), domino_theory (2.49%), the_button (4.41%), second_strike (4.86%), propaganda (12.83%)

### Card coverage (random)

- Cards never seen: 4 — adv_01_a_senior_defence_source, adv_26_the_square_does_not_keep_a_diary, cyberew_22_their_bombers, fp_intercept_fa_05_three_keys
- Rare cards (seen in < 0.5% of runs): 134 — adv_02_what_a_person_is_worth (17), adv_03_the_invoice (4), adv_04_over_her_head (1), adv_05_one_sentence (9), adv_06_you_may_prefer_not_to_know (89), adv_07_the_army_will_hear_it (75), adv_08_a_number_not_on_any_list (18), adv_11_over_dinner (10), adv_14_is_and_consistent_with (10), adv_19_both_sides_of_the_border (11), adv_22_seven_times_in_ten (15), adv_23_as_if_you_had_not_said_it (82), adv_24_engineers (22), adv_25_one_of_them_did (88), adv_27_no_hard_feelings (1), adv_28_the_florist (17), ally_18_a_form_of_words (21), blockade_22_two_days (59), blockade_07_her_ships (67), blockade_19_the_carrier (48), blockade_20_thirty_one_days (40), blockade_26_the_order (28), cyberew_03_correlator_word (58), cyberew_07_working_hours (87), cyberew_10_reciprocity (27), cyberew_11_their_reading (13), cyberew_13_page_eleven (25), cyberew_14_paper_and_phone (20), cyberew_15_thirty_one_attempts (6), cyberew_16_our_own_tool (29), cyberew_21_the_motion (23), debris_02_the_intercept (83), debris_04_the_premium (45), debris_08_the_question_mark (48), debris_11_calibrations (5), debris_15_the_glass_house (3), debris_16_supplier_or_combatant (72), debris_17_eleven_seconds (4), debris_18_without_consensus (32), debris_20_an_inch (31), defector_03_the_basement (52), defector_08_on_background (27), defector_09_everything_fits (57), defector_10_nine_days (75), defector_11_corroboration (2), defector_12_the_package (2), defector_17_tuesdays_assessment (15), defector_22_courtesies (18), dom_coa_13_nine_thousand (30), dom_coa_14_the_open (33), dom_coa_15_dual_use (29), dom_coa_16_thirty_per_cent (37), dom_fed_10_ninety_days (88), dom_fed_12_the_word (24), dom_fed_13_fourteen_billion (23), dom_fed_14_the_second_bulletin (30), dom_fed_15_the_toast (26), dom_rep_12_the_runways (83), dom_rep_13_the_list (26), dom_rep_15_two_capitals (28), dom_rep_16_the_open_letter (24), falarm_12_range_hot (73), falarm_13_sun_glint (24), falarm_15_salvo_notified (48), falarm_16_reflection (35), falarm_17_three_keys (11), falarm_18_the_doctrine (5), falarm_21_sirens (44), fp_cascade_08a_the_operator (34), fp_intercept_04a_the_layer_you_did_not_use (76), fp_intercept_fa_02_the_doctrine (4), fp_intercept_fa_06_the_sirens (14), fp_line_05a_the_carrier (63), fp_midnight_06_the_word_any (8), fp_midnight_07_two_statements (90), fp_midnight_08_two_readings (78), fp_midnight_09_the_protocol (60), fp_summit_02_the_photographs (20), fp_summit_03_flatbeds (2), fp_summit_07_in_writing (26), fp_summit_08_her_paragraph (12), fp_summit_09_the_lake_steps (29), fp_summit_10_four_lines (33), press_31_the_run (83), press_33_the_unity_government (84), press_35_the_list (93), press_36_the_delegation (82), press_37_the_ramps (87), press_38_the_last_call (90), press_39_amberline_flees (83), press_40_the_vigil (86), proxy_08_six_hours (82), proxy_09_an_afternoon (8), proxy_10_winnable (57), proxy_11_the_estimate (1), proxy_13_the_road_to_hollin (10), proxy_20_the_column (64), proxy_21_across_the_aum (28), proxy_24_contact (43), proxy_26_the_motion (26), blackout_10_consistent_with (33), blackout_11_the_hedge (47), blackout_12_same_orbit (42), blackout_13_the_inspector (17), blackout_15_nine_percent (67), blackout_16_do_it_back (29), blackout_17_footprints (50), blackout_26_in_the_way (68), summit_09_the_handshake (5), summit_15_the_deputys_lunch (1), summit_16_the_academic (7), summit_17_consecutive_days (76), summit_18_the_promise (3), summit_19_eleven_calls (2), summit_20_half_of_them (6), summit_21_the_other_half (37), summit_22_the_square (30), ultimatum_15_two_readings (10), ultimatum_16_the_wrong_signal (14), ultimatum_17_any_means_any (3), ultimatum_18_your_own_words (3), ultimatum_19_the_climbdown (22), ultimatum_20_the_half_life (10), ultimatum_21_the_open_line (8), ultimatum_22_three_calls (11), ultimatum_23_what_they_see (51), cables_05_the_detour (14), cables_22_a_week (9), cables_16_the_escort_line (19), cables_17_forty_minutes (15), cables_18_eleven_hundred_tonnes (36), cables_19_unsigned (47), cables_20_ninety_days (44), cables_21_my_nine (32)

## Policy: greedy

- Runs: **20000**
- Win rate (run_end ending on the last act): **0.09%**; stand-down 0.07%; nuclear 3.89%
- Score: median **811**, mean 1031.93, p90 1371, p99 5971.41, max 107885; best single choice 82.27 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **8.55**, p10 6.9, p90 12.98
- Days: median 17.5, mean 18.93, p10 14.25, p90 25.75; cards per run 39.45
- Endless: 17 runs continued (0.09%), 2.41 endless acts on average, max 5
- Timer expiry rate: 9.98% (14619 expiries / 146513 timed cards)
- Near-miss rate: 9.92% (9761 / 98445 rolls)
- Average peak escalation: 30.51; false alarms per run: 0.305
- Top ending share: **34.27%** (removed_military_0)

### Endings (greedy)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_military_0 | removed | 6853 | 34.27 |
| removed_public_0_federation | removed | 3631 | 18.16 |
| removed_public_0_republic | removed | 3391 | 16.95 |
| removed_public_0_coalition | removed | 3240 | 16.2 |
| removed_public_0_square | removed | 969 | 4.85 |
| removed_military_0_unsigned | removed | 422 | 2.11 |
| special_resigned | special | 328 | 1.64 |
| removed_military_0_admiral | removed | 261 | 1.31 |
| nuclear_generals_war | nuclear | 183 | 0.92 |
| nuclear_blind | nuclear | 141 | 0.71 |
| nuclear_midnight | nuclear | 91 | 0.46 |
| nuclear_intercept_exchange | nuclear | 65 | 0.33 |
| core_nuclear_rogue | nuclear | 55 | 0.28 |
| core_nuclear_called | nuclear | 46 | 0.23 |
| core_nuclear_misread | nuclear | 44 | 0.22 |
| core_nuclear_false_alarm | nuclear | 42 | 0.21 |
| core_nuclear_attribution | nuclear | 39 | 0.2 |
| removed_allies_0_federation | removed | 38 | 0.19 |
| removed_allies_0 | removed | 37 | 0.19 |
| nuclear_forty_miles | nuclear | 35 | 0.18 |
| removed_allies_0_republic | removed | 26 | 0.13 |
| nuclear_straits | nuclear | 19 | 0.1 |
| core_standdown_minimal | standdown | 13 | 0.07 |
| nuclear_vestria | nuclear | 9 | 0.05 |
| nuclear_standing_orders | nuclear | 6 | 0.03 |
| removed_economy_0_federation | removed | 5 | 0.03 |
| core_survival_ninety | survival | 3 | 0.02 |
| removed_military_100_hawk | removed | 3 | 0.02 |
| core_survival_called | survival | 1 | 0.01 |
| nuclear_after_vellmar | nuclear | 1 | 0.01 |
| nuclear_dark_sky | nuclear | 1 | 0.01 |
| nuclear_ladder | nuclear | 1 | 0.01 |
| removed_economy_0 | removed | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 778 | 3.89 | 779 | 3.9 |
| removed | 18877 | 94.39 | 18892 | 94.46 |
| standdown | 13 | 0.07 | 0 | 0 |
| survival | 4 | 0.02 | 0 | 0 |
| special | 328 | 1.64 | 329 | 1.65 |

### Act reached (greedy)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 150 | 0.75 |
| 2 | Week Two | 12645 | 63.23 |
| 3 | Week Three | 6482 | 32.41 |
| 4 | Week Four | 674 | 3.37 |
| 5 | Endgame | 32 | 0.16 |
| 6 | Endless 1 | 9 | 0.05 |
| 7 | Endless 2 | 2 | 0.01 |
| 9 | Endless 4 | 2 | 0.01 |
| 10 | Endless 5 | 4 | 0.02 |

### Antes per act (greedy)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 20000 | 13609 | 68.05 | 6391 | 31.96 | 0 | 0 |
| 2 | Week Two | 15227 | 1387 | 9.11 | 13840 | 90.89 | 91 | 0.6 |
| 3 | Week Three | 1906 | 165 | 8.66 | 1741 | 91.34 | 63 | 3.31 |
| 4 | Week Four | 149 | 14 | 9.4 | 135 | 90.6 | 9 | 6.04 |
| 5 | Endgame | 24 | 1 | 4.17 | 23 | 95.83 | 1 | 4.17 |
| 6 | Endless 1 | 11 | 0 | 0 | 11 | 100 | 0 | 0 |
| 7 | Endless 2 | 6 | 0 | 0 | 6 | 100 | 0 | 0 |
| 8 | Endless 3 | 6 | 0 | 0 | 6 | 100 | 0 | 0 |
| 9 | Endless 4 | 4 | 0 | 0 | 4 | 100 | 0 | 0 |

### Accidents (greedy)

- Attached to 0.66% of cards (0.26 per run); 14.21% of those fired (0.04 per run)
- Fatal at once: 18.86% of fired; mean escalation per fired accident: 5.59

### Capital and orders (greedy)

- Capital earned 9.67 / spent 11.07 per run; 3.55 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 2.84 / sold 0 per run; orders bought 0.04 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 12962 | 785 | 6.06% | 35 | 4.46% |
| say_it_again | 7881 | 0 | 0% | 0 | — |
| double_down | 7933 | 0 | 0% | 0 | — |
| intercept_package | 12913 | 0 | 0% | 0 | — |
| duty_officers_veto | 12651 | 0 | 0% | 0 | — |
| lose_the_memo | 12892 | 0 | 0% | 0 | — |
| favour_owed | 12971 | 0 | 0% | 0 | — |
| one_more_call | 7829 | 0 | 0% | 0 | — |
| leaked_assessment | 7757 | 0 | 0% | 0 | — |
| calm_the_markets | 12737 | 0 | 0% | 0 | — |
| rally | 12834 | 0 | 0% | 0 | — |
| muster | 12971 | 0 | 0% | 0 | — |
| personal_letter | 7849 | 0 | 0% | 0 | — |

### Score distribution (greedy)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1031.93 | 584 | 691 | 811 | 1060 | 1371 | 5971.41 | 107885 |

### Per seat (greedy)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 0.06 | 862 | 18 | 4.59 | 93.46 | 0.03 | 0.03 | 1.89 |
| federation | 6667 | 0.06 | 778 | 17.25 | 3.48 | 95.13 | 0.04 | 0.01 | 1.33 |
| republic | 6667 | 0.13 | 802 | 17.5 | 3.6 | 94.57 | 0.12 | 0.01 | 1.69 |

### Piece buy rates (greedy)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 5324 | 709 | 13.32% | no |
| dove_fm | advisor | rare | 2219 | 56 | 2.52% | no |
| paranoid_intel | advisor | common | 7481 | 2672 | 35.72% | yes |
| cautious_intel | advisor | common | 7640 | 2832 | 37.07% | yes |
| spin_doctor | advisor | uncommon | 5292 | 725 | 13.7% | no |
| ambassador | advisor | uncommon | 5311 | 746 | 14.05% | no |
| cyber_director | advisor | uncommon | 5453 | 740 | 13.57% | no |
| treasury_hawk | advisor | common | 8236 | 2944 | 35.75% | yes |
| fixer | advisor | uncommon | 5319 | 742 | 13.95% | no |
| admiral | advisor | uncommon | 5215 | 709 | 13.6% | no |
| peace_leader | advisor | common | 8009 | 2948 | 36.81% | yes |
| contractor | advisor | rare | 2365 | 54 | 2.28% | no |
| iron_nerve | advisor | legendary | 1160 | 21 | 1.81% | no |
| long_table | advisor | legendary | 1137 | 32 | 2.81% | no |
| field_marshal | advisor | rare | 2294 | 45 | 1.96% | no |
| press_office | advisor | rare | 2242 | 63 | 2.81% | no |
| attache | advisor | uncommon | 5368 | 712 | 13.26% | no |
| lobby | advisor | uncommon | 5403 | 766 | 14.18% | no |
| pollster | advisor | common | 8206 | 2927 | 35.67% | yes |
| early_warning | asset | uncommon | 5432 | 735 | 13.53% | no |
| back_channel | asset | uncommon | 5386 | 815 | 15.13% | yes |
| cyber_unit | asset | uncommon | 5299 | 740 | 13.96% | no |
| missile_defence | asset | uncommon | 5347 | 721 | 13.48% | no |
| blue_water_fleet | asset | uncommon | 5262 | 761 | 14.46% | no |
| hardened_nc3 | asset | rare | 2284 | 54 | 2.36% | no |
| commercial_sat | asset | common | 8193 | 2934 | 35.81% | yes |
| allied_basing | asset | common | 8208 | 2941 | 35.83% | yes |
| strategic_reserve | asset | common | 8119 | 2932 | 36.11% | yes |
| rapid_response | asset | uncommon | 5326 | 735 | 13.8% | no |
| signals_intercept | asset | rare | 2278 | 63 | 2.77% | no |
| civil_defence | asset | uncommon | 5373 | 708 | 13.18% | no |
| deadman_switch | asset | legendary | 1111 | 26 | 2.34% | no |
| perfect_intel | asset | legendary | 1066 | 20 | 1.88% | no |
| open_line | asset | legendary | 1056 | 24 | 2.27% | no |
| war_economy | asset | legendary | 1107 | 25 | 2.26% | no |
| whispers | asset | rare | 2188 | 62 | 2.83% | no |
| ledger | asset | rare | 2352 | 69 | 2.93% | no |
| war_bonds | asset | rare | 2306 | 57 | 2.47% | no |
| tripwire | asset | rare | 2288 | 47 | 2.05% | no |
| quiet_room | asset | rare | 2313 | 63 | 2.72% | no |
| dockyards | asset | uncommon | 5379 | 714 | 13.27% | no |
| bunker | asset | uncommon | 5298 | 717 | 13.53% | no |
| war_room | asset | uncommon | 5258 | 733 | 13.94% | no |
| staff_college | asset | common | 8124 | 2898 | 35.67% | yes |
| trade_desk | asset | common | 8133 | 2876 | 35.36% | yes |
| courier | asset | common | 8218 | 2990 | 36.38% | yes |
| launch_on_warning | doctrine | rare | 2281 | 60 | 2.63% | no |
| deterrence_by_denial | doctrine | uncommon | 5279 | 661 | 12.52% | no |
| strategic_ambiguity | doctrine | uncommon | 5322 | 757 | 14.22% | no |
| no_first_use | doctrine | uncommon | 5313 | 761 | 14.32% | no |
| escalate_to_deescalate | doctrine | rare | 2279 | 43 | 1.89% | no |
| alliance_first | doctrine | common | 7591 | 2708 | 35.67% | yes |
| fortress | doctrine | common | 7632 | 2800 | 36.69% | yes |
| transparency | doctrine | uncommon | 5356 | 735 | 13.72% | no |
| red_lines | doctrine | rare | 2345 | 69 | 2.94% | no |
| hotline_protocol | doctrine | uncommon | 5294 | 702 | 13.26% | no |
| predelegation | doctrine | uncommon | 5202 | 707 | 13.59% | no |
| minimal_deterrence | doctrine | rare | 2328 | 63 | 2.71% | no |
| madman_theory | doctrine | legendary | 1096 | 11 | 1% | no |
| brinkmanship | doctrine | legendary | 1078 | 22 | 2.04% | no |
| domino_theory | doctrine | legendary | 1124 | 24 | 2.14% | no |
| the_button | doctrine | legendary | 1059 | 23 | 2.17% | no |
| second_strike | doctrine | rare | 2236 | 51 | 2.28% | no |
| propaganda | doctrine | uncommon | 5208 | 708 | 13.59% | no |

Outside band (50): hawk_general (13.32%), dove_fm (2.52%), spin_doctor (13.7%), ambassador (14.05%), cyber_director (13.57%), fixer (13.95%), admiral (13.6%), contractor (2.28%), iron_nerve (1.81%), long_table (2.81%), field_marshal (1.96%), press_office (2.81%), attache (13.26%), lobby (14.18%), early_warning (13.53%), cyber_unit (13.96%), missile_defence (13.48%), blue_water_fleet (14.46%), hardened_nc3 (2.36%), rapid_response (13.8%), signals_intercept (2.77%), civil_defence (13.18%), deadman_switch (2.34%), perfect_intel (1.88%), open_line (2.27%), war_economy (2.26%), whispers (2.83%), ledger (2.93%), war_bonds (2.47%), tripwire (2.05%), quiet_room (2.72%), dockyards (13.27%), bunker (13.53%), war_room (13.94%), launch_on_warning (2.63%), deterrence_by_denial (12.52%), strategic_ambiguity (14.22%), no_first_use (14.32%), escalate_to_deescalate (1.89%), transparency (13.72%), red_lines (2.94%), hotline_protocol (13.26%), predelegation (13.59%), minimal_deterrence (2.71%), madman_theory (1%), brinkmanship (2.04%), domino_theory (2.14%), the_button (2.17%), second_strike (2.28%), propaganda (13.59%)

### Card coverage (greedy)

- Cards never seen: 8 — adv_01_a_senior_defence_source, adv_26_the_square_does_not_keep_a_diary, blockade_26_the_order, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, summit_18_the_promise, ultimatum_17_any_means_any, ultimatum_18_your_own_words
- Rare cards (seen in < 0.5% of runs): 137 — adv_02_what_a_person_is_worth (14), adv_03_the_invoice (1), adv_04_over_her_head (5), adv_05_one_sentence (17), adv_08_a_number_not_on_any_list (7), adv_11_over_dinner (7), adv_14_is_and_consistent_with (8), adv_19_both_sides_of_the_border (9), adv_22_seven_times_in_ten (6), adv_24_engineers (8), adv_27_no_hard_feelings (1), adv_28_the_florist (40), ally_18_a_form_of_words (16), blockade_04_the_schedule (43), blockade_08_the_ferry_line (28), blockade_09_boarded (18), blockade_06_the_word (58), blockade_22_two_days (44), blockade_07_her_ships (26), blockade_19_the_carrier (20), blockade_20_thirty_one_days (19), cyberew_03_correlator_word (45), cyberew_09_what_it_asked (97), cyberew_10_reciprocity (41), cyberew_11_their_reading (5), cyberew_13_page_eleven (33), cyberew_14_paper_and_phone (19), cyberew_15_thirty_one_attempts (1), cyberew_16_our_own_tool (49), cyberew_21_the_motion (16), cyberew_22_their_bombers (2), debris_04_the_premium (60), debris_11_calibrations (2), debris_15_the_glass_house (3), debris_16_supplier_or_combatant (63), debris_17_eleven_seconds (3), debris_18_without_consensus (28), debris_20_an_inch (29), defector_03_the_basement (63), defector_08_on_background (25), defector_09_everything_fits (58), defector_10_nine_days (66), defector_11_corroboration (3), defector_12_the_package (2), defector_17_tuesdays_assessment (16), defector_22_courtesies (39), dom_coa_13_nine_thousand (33), dom_coa_14_the_open (37), dom_coa_15_dual_use (33), dom_coa_16_thirty_per_cent (91), dom_fed_10_ninety_days (52), dom_fed_12_the_word (17), dom_fed_13_fourteen_billion (11), dom_fed_14_the_second_bulletin (18), dom_fed_15_the_toast (17), dom_rep_13_the_list (31), dom_rep_15_two_capitals (37), dom_rep_16_the_open_letter (31), falarm_10_training_tape (85), falarm_11_high_cloud (97), falarm_12_range_hot (64), falarm_13_sun_glint (25), falarm_14_six_tracks (92), falarm_15_salvo_notified (49), falarm_16_reflection (33), falarm_17_three_keys (8), falarm_18_the_doctrine (8), falarm_21_sirens (70), falarm_26_the_call (76), fp_cascade_07_the_building (28), fp_cascade_08a_the_operator (2), fp_cascade_08b_the_shrug (9), fp_intercept_04a_the_layer_you_did_not_use (89), fp_intercept_08_second_track (99), fp_intercept_09_the_question (33), fp_intercept_fa_06_the_sirens (5), fp_line_05a_the_carrier (54), fp_line_06_the_seizure (30), fp_midnight_06_the_word_any (8), fp_summit_02_the_photographs (93), fp_summit_03_flatbeds (1), fp_summit_05_the_folder (94), fp_summit_07_in_writing (11), fp_summit_08_her_paragraph (6), fp_summit_09_the_lake_steps (24), fp_summit_10_four_lines (37), press_31_the_run (87), press_32_the_final_edition (99), press_33_the_unity_government (86), press_34_the_suitcase (73), press_35_the_list (86), press_36_the_delegation (75), press_37_the_ramps (82), press_38_the_last_call (95), press_39_amberline_flees (72), press_40_the_vigil (81), proxy_08_six_hours (84), proxy_09_an_afternoon (1), proxy_11_the_estimate (6), proxy_13_the_road_to_hollin (2), proxy_15_the_compact_battalion (48), proxy_20_the_column (5), proxy_21_across_the_aum (3), proxy_24_contact (3), proxy_26_the_motion (6), blackout_06_wrong_headland (61), blackout_10_consistent_with (29), blackout_11_the_hedge (36), blackout_12_same_orbit (23), blackout_13_the_inspector (20), blackout_15_nine_percent (33), blackout_16_do_it_back (25), blackout_17_footprints (27), blackout_26_in_the_way (60), summit_09_the_handshake (1), summit_15_the_deputys_lunch (4), summit_16_the_academic (9), summit_17_consecutive_days (91), summit_19_eleven_calls (1), summit_20_half_of_them (11), summit_21_the_other_half (19), summit_22_the_square (73), ultimatum_15_two_readings (6), ultimatum_16_the_wrong_signal (36), ultimatum_19_the_climbdown (31), ultimatum_20_the_half_life (5), ultimatum_21_the_open_line (12), ultimatum_22_three_calls (34), ultimatum_23_what_they_see (50), cables_05_the_detour (18), cables_22_a_week (22), cables_16_the_escort_line (28), cables_17_forty_minutes (40), cables_18_eleven_hundred_tonnes (40), cables_19_unsigned (62), cables_20_ninety_days (59), cables_21_my_nine (72)

## Policy: heuristic

- Runs: **20000** (1 hit the step cap without ending)
- Win rate (run_end ending on the last act): **6.66%**; stand-down 0.09%; nuclear 82.91%
- Score: median **5067**, mean 6921.95, p90 11502.1, p99 36531.4, max 1449326; best single choice 904.04 on average
- Broke the game (score ≥ 700000): **0.03%** (5 runs)
- Estimated minutes to the first ending: median **17.85**, p10 8.98, p90 22.23
- Days: median 34.5, mean 32.15, p10 17.75, p90 42.5; cards per run 69.59
- Endless: 1331 runs continued (6.66%), 1.24 endless acts on average, max 5
- Timer expiry rate: 4.97% (14958 expiries / 301123 timed cards)
- Near-miss rate: 10.02% (20728 / 206839 rolls)
- Average peak escalation: 94.65; false alarms per run: 0.642
- Top ending share: **21.7%** (core_nuclear_called)

### Endings (heuristic)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| core_nuclear_called | nuclear | 4340 | 21.7 |
| nuclear_midnight | nuclear | 1951 | 9.76 |
| core_nuclear_rogue | nuclear | 1800 | 9 |
| core_nuclear_false_alarm | nuclear | 1429 | 7.15 |
| core_nuclear_misread | nuclear | 1194 | 5.97 |
| nuclear_forty_miles | nuclear | 1182 | 5.91 |
| core_nuclear_attribution | nuclear | 1136 | 5.68 |
| nuclear_intercept_exchange | nuclear | 967 | 4.84 |
| nuclear_after_vellmar | nuclear | 940 | 4.7 |
| core_survival_called | survival | 907 | 4.54 |
| nuclear_blind | nuclear | 697 | 3.49 |
| nuclear_straits | nuclear | 581 | 2.91 |
| removed_public_0_square | removed | 507 | 2.54 |
| core_survival_ninety | survival | 382 | 1.91 |
| removed_public_0_coalition | removed | 317 | 1.59 |
| removed_public_0_republic | removed | 311 | 1.56 |
| removed_public_0_federation | removed | 295 | 1.48 |
| removed_military_0 | removed | 221 | 1.11 |
| nuclear_after_midnight | nuclear | 133 | 0.67 |
| removed_military_0_unsigned | removed | 96 | 0.48 |
| removed_economy_0 | removed | 87 | 0.44 |
| removed_economy_0_federation | removed | 71 | 0.36 |
| removed_allies_0_federation | removed | 58 | 0.29 |
| removed_allies_0_republic | removed | 56 | 0.28 |
| removed_allies_0 | removed | 46 | 0.23 |
| nuclear_generals_war | nuclear | 36 | 0.18 |
| nuclear_last_card | nuclear | 34 | 0.17 |
| nuclear_vestria | nuclear | 32 | 0.16 |
| nuclear_dark_sky | nuclear | 28 | 0.14 |
| nuclear_believed | nuclear | 22 | 0.11 |
| core_nuclear_leverage | nuclear | 20 | 0.1 |
| nuclear_standing_orders | nuclear | 18 | 0.09 |
| removed_military_0_admiral | removed | 17 | 0.09 |
| core_nuclear_deadman | nuclear | 16 | 0.08 |
| survival_empty_chair | survival | 15 | 0.08 |
| nuclear_ladder | nuclear | 14 | 0.07 |
| core_standdown_minimal | standdown | 11 | 0.06 |
| core_survival_borrowed | survival | 7 | 0.04 |
| nuclear_deep_bunker | nuclear | 7 | 0.04 |
| removed_economy_0_reserve | removed | 4 | 0.02 |
| nuclear_second_use | nuclear | 3 | 0.02 |
| standdown_communique | standdown | 3 | 0.02 |
| survival_they_blinked | survival | 3 | 0.02 |
| nuclear_launch_on_warning | nuclear | 2 | 0.01 |
| standdown_empty_sky | standdown | 2 | 0.01 |
| standdown_longer_table | standdown | 1 | 0.01 |
| unfinished | special | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 16582 | 82.91 | 17573 | 87.87 |
| removed | 2086 | 10.43 | 2426 | 12.13 |
| standdown | 17 | 0.09 | 0 | 0 |
| survival | 1314 | 6.57 | 0 | 0 |
| special | 1 | 0.01 | 1 | 0.01 |

### Act reached (heuristic)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 679 | 3.4 |
| 2 | Week Two | 2202 | 11.01 |
| 3 | Week Three | 3633 | 18.17 |
| 4 | Week Four | 8315 | 41.58 |
| 5 | Endgame | 3840 | 19.2 |
| 6 | Endless 1 | 1067 | 5.34 |
| 7 | Endless 2 | 215 | 1.08 |
| 8 | Endless 3 | 38 | 0.19 |
| 9 | Endless 4 | 10 | 0.05 |
| 10 | Endless 5 | 1 | 0.01 |

### Antes per act (heuristic)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 20000 | 18793 | 93.97 | 1207 | 6.04 | 5 | 0.03 |
| 2 | Week Two | 19259 | 8812 | 45.76 | 10447 | 54.24 | 1205 | 6.26 |
| 3 | Week Three | 15878 | 4802 | 30.24 | 11076 | 69.76 | 969 | 6.1 |
| 4 | Week Four | 9091 | 1358 | 14.94 | 7733 | 85.06 | 328 | 3.61 |
| 5 | Endgame | 2667 | 172 | 6.45 | 2495 | 93.55 | 25 | 0.94 |
| 6 | Endless 1 | 463 | 38 | 8.21 | 425 | 91.79 | 14 | 3.02 |
| 7 | Endless 2 | 77 | 10 | 12.99 | 67 | 87.01 | 3 | 3.9 |
| 8 | Endless 3 | 15 | 4 | 26.67 | 11 | 73.33 | 1 | 6.67 |
| 9 | Endless 4 | 1 | 0 | 0 | 1 | 100 | 0 | 0 |

### Accidents (heuristic)

- Attached to 18.52% of cards (12.89 per run); 13.76% of those fired (1.77 per run)
- Fatal at once: 14.87% of fired; mean escalation per fired accident: 7.38

### Capital and orders (heuristic)

- Capital earned 23.19 / spent 21.85 per run; 6.47 shop visits, 1.35 rerolls, 0.002 tags removed per run
- Pieces bought 2.7 / sold 0.001 per run; orders bought 2.06 / used 1.97 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 28515 | 2756 | 9.67% | 2561 | 92.92% |
| say_it_again | 17210 | 3999 | 23.24% | 3991 | 99.8% |
| double_down | 17336 | 2525 | 14.57% | 2513 | 99.52% |
| intercept_package | 28541 | 0 | 0% | 0 | — |
| duty_officers_veto | 28028 | 2694 | 9.61% | 2081 | 77.25% |
| lose_the_memo | 28333 | 243 | 0.86% | 220 | 90.53% |
| favour_owed | 28316 | 16167 | 57.09% | 16167 | 100% |
| one_more_call | 17086 | 5 | 0.03% | 0 | 0% |
| leaked_assessment | 17684 | 4158 | 23.51% | 3845 | 92.47% |
| calm_the_markets | 28180 | 2164 | 7.68% | 1808 | 83.55% |
| rally | 28359 | 3112 | 10.97% | 3009 | 96.69% |
| muster | 28068 | 3379 | 12.04% | 3299 | 97.63% |
| personal_letter | 17174 | 0 | 0% | 0 | — |

### Score distribution (heuristic)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6921.95 | 1243 | 3380 | 5067 | 7201.25 | 11502.1 | 36531.4 | 1449326 |

### Per seat (heuristic)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 7.07 | 5086 | 34.75 | 82.84 | 10.1 | 0.11 | 6.96 | 0 |
| federation | 6667 | 5.05 | 4898 | 32.5 | 83.83 | 11.1 | 0.03 | 5.02 | 0.01 |
| republic | 6667 | 7.84 | 5245 | 35 | 82.06 | 10.09 | 0.12 | 7.72 | 0 |

### Piece buy rates (heuristic)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 11990 | 355 | 2.96% | no |
| dove_fm | advisor | rare | 5076 | 647 | 12.75% | no |
| paranoid_intel | advisor | common | 14989 | 3413 | 22.77% | yes |
| cautious_intel | advisor | common | 14895 | 2015 | 13.53% | no |
| spin_doctor | advisor | uncommon | 12010 | 389 | 3.24% | no |
| ambassador | advisor | uncommon | 12163 | 170 | 1.4% | no |
| cyber_director | advisor | uncommon | 12203 | 21 | 0.17% | no |
| treasury_hawk | advisor | common | 17903 | 2512 | 14.03% | no |
| fixer | advisor | uncommon | 12057 | 432 | 3.58% | no |
| admiral | advisor | uncommon | 11837 | 1685 | 14.24% | no |
| peace_leader | advisor | common | 17886 | 2401 | 13.42% | no |
| contractor | advisor | rare | 5131 | 172 | 3.35% | no |
| iron_nerve | advisor | legendary | 2576 | 208 | 8.07% | no |
| long_table | advisor | legendary | 2542 | 199 | 7.83% | no |
| field_marshal | advisor | rare | 5120 | 136 | 2.66% | no |
| press_office | advisor | rare | 5086 | 195 | 3.83% | no |
| attache | advisor | uncommon | 11854 | 827 | 6.98% | no |
| lobby | advisor | uncommon | 11712 | 1238 | 10.57% | no |
| pollster | advisor | common | 17661 | 3047 | 17.25% | yes |
| early_warning | asset | uncommon | 11405 | 2198 | 19.27% | yes |
| back_channel | asset | uncommon | 12055 | 102 | 0.85% | no |
| cyber_unit | asset | uncommon | 12181 | 6 | 0.05% | no |
| missile_defence | asset | uncommon | 11861 | 59 | 0.5% | no |
| blue_water_fleet | asset | uncommon | 11973 | 150 | 1.25% | no |
| hardened_nc3 | asset | rare | 5141 | 524 | 10.19% | no |
| commercial_sat | asset | common | 19311 | 134 | 0.69% | no |
| allied_basing | asset | common | 16879 | 3439 | 20.37% | yes |
| strategic_reserve | asset | common | 18188 | 2496 | 13.72% | no |
| rapid_response | asset | uncommon | 12023 | 60 | 0.5% | no |
| signals_intercept | asset | rare | 5108 | 277 | 5.42% | no |
| civil_defence | asset | uncommon | 11356 | 1919 | 16.9% | yes |
| deadman_switch | asset | legendary | 2472 | 88 | 3.56% | no |
| perfect_intel | asset | legendary | 2537 | 133 | 5.24% | no |
| open_line | asset | legendary | 2435 | 88 | 3.61% | no |
| war_economy | asset | legendary | 2561 | 186 | 7.26% | no |
| whispers | asset | rare | 5150 | 124 | 2.41% | no |
| ledger | asset | rare | 5025 | 189 | 3.76% | no |
| war_bonds | asset | rare | 5093 | 855 | 16.79% | yes |
| tripwire | asset | rare | 5203 | 552 | 10.61% | no |
| quiet_room | asset | rare | 5194 | 130 | 2.5% | no |
| dockyards | asset | uncommon | 11817 | 140 | 1.18% | no |
| bunker | asset | uncommon | 11711 | 1257 | 10.73% | no |
| war_room | asset | uncommon | 11876 | 913 | 7.69% | no |
| staff_college | asset | common | 18679 | 997 | 5.34% | no |
| trade_desk | asset | common | 17948 | 2428 | 13.53% | no |
| courier | asset | common | 18021 | 2392 | 13.27% | no |
| launch_on_warning | doctrine | rare | 5154 | 163 | 3.16% | no |
| deterrence_by_denial | doctrine | uncommon | 11988 | 60 | 0.5% | no |
| strategic_ambiguity | doctrine | uncommon | 11945 | 450 | 3.77% | no |
| no_first_use | doctrine | uncommon | 11769 | 1231 | 10.46% | no |
| escalate_to_deescalate | doctrine | rare | 5099 | 104 | 2.04% | no |
| alliance_first | doctrine | common | 15141 | 3570 | 23.58% | yes |
| fortress | doctrine | common | 15117 | 2836 | 18.76% | yes |
| transparency | doctrine | uncommon | 11618 | 1110 | 9.55% | no |
| red_lines | doctrine | rare | 5137 | 189 | 3.68% | no |
| hotline_protocol | doctrine | uncommon | 11874 | 999 | 8.41% | no |
| predelegation | doctrine | uncommon | 12010 | 138 | 1.15% | no |
| minimal_deterrence | doctrine | rare | 5139 | 152 | 2.96% | no |
| madman_theory | doctrine | legendary | 2482 | 219 | 8.82% | no |
| brinkmanship | doctrine | legendary | 2419 | 61 | 2.52% | no |
| domino_theory | doctrine | legendary | 2525 | 213 | 8.44% | no |
| the_button | doctrine | legendary | 2441 | 101 | 4.14% | no |
| second_strike | doctrine | rare | 5175 | 140 | 2.71% | no |
| propaganda | doctrine | uncommon | 11597 | 436 | 3.76% | no |

Outside band (56): hawk_general (2.96%), dove_fm (12.75%), cautious_intel (13.53%), spin_doctor (3.24%), ambassador (1.4%), cyber_director (0.17%), treasury_hawk (14.03%), fixer (3.58%), admiral (14.24%), peace_leader (13.42%), contractor (3.35%), iron_nerve (8.07%), long_table (7.83%), field_marshal (2.66%), press_office (3.83%), attache (6.98%), lobby (10.57%), back_channel (0.85%), cyber_unit (0.05%), missile_defence (0.5%), blue_water_fleet (1.25%), hardened_nc3 (10.19%), commercial_sat (0.69%), strategic_reserve (13.72%), rapid_response (0.5%), signals_intercept (5.42%), deadman_switch (3.56%), perfect_intel (5.24%), open_line (3.61%), war_economy (7.26%), whispers (2.41%), ledger (3.76%), tripwire (10.61%), quiet_room (2.5%), dockyards (1.18%), bunker (10.73%), war_room (7.69%), staff_college (5.34%), trade_desk (13.53%), courier (13.27%), launch_on_warning (3.16%), deterrence_by_denial (0.5%), strategic_ambiguity (3.77%), no_first_use (10.46%), escalate_to_deescalate (2.04%), transparency (9.55%), red_lines (3.68%), hotline_protocol (8.41%), predelegation (1.15%), minimal_deterrence (2.96%), madman_theory (8.82%), brinkmanship (2.52%), domino_theory (8.44%), the_button (4.14%), second_strike (2.71%), propaganda (3.76%)

### Card coverage (heuristic)

- Cards never seen: 10 — adv_01_a_senior_defence_source, adv_02_what_a_person_is_worth, adv_05_one_sentence, adv_11_over_dinner, adv_14_is_and_consistent_with, cyberew_22_their_bombers, debris_17_eleven_seconds, blackout_10_consistent_with, blackout_16_do_it_back, cables_05_the_detour
- Rare cards (seen in < 0.5% of runs): 74 — adv_03_the_invoice (5), adv_04_over_her_head (6), adv_07_the_army_will_hear_it (79), adv_12_a_tourist_visa (68), adv_13_ninety_percent (10), adv_19_both_sides_of_the_border (52), adv_22_seven_times_in_ten (39), adv_24_engineers (84), adv_25_one_of_them_did (41), adv_26_the_square_does_not_keep_a_diary (36), adv_27_no_hard_feelings (2), adv_28_the_florist (67), blockade_19_the_carrier (15), blockade_20_thirty_one_days (11), blockade_26_the_order (37), cyberew_07_working_hours (12), cyberew_10_reciprocity (1), cyberew_11_their_reading (1), cyberew_16_our_own_tool (1), debris_02_the_intercept (13), debris_08_the_question_mark (6), debris_11_calibrations (1), debris_15_the_glass_house (2), debris_16_supplier_or_combatant (16), debris_18_without_consensus (6), defector_08_on_background (41), defector_11_corroboration (32), defector_12_the_package (31), defector_17_tuesdays_assessment (82), dom_coa_06_the_lease (13), falarm_18_the_doctrine (35), fp_cascade_08a_the_operator (34), fp_intercept_04a_the_layer_you_did_not_use (2), fp_intercept_fa_02_the_doctrine (5), fp_intercept_fa_05_three_keys (22), fp_intercept_fa_06_the_sirens (56), fp_line_05a_the_carrier (35), fp_midnight_06_the_word_any (65), fp_summit_02_the_photographs (94), fp_summit_03_flatbeds (63), fp_summit_09_the_lake_steps (60), fp_summit_10_four_lines (25), proxy_08_six_hours (15), proxy_09_an_afternoon (3), proxy_10_winnable (48), proxy_11_the_estimate (1), proxy_13_the_road_to_hollin (19), proxy_20_the_column (87), proxy_21_across_the_aum (56), proxy_24_contact (37), proxy_26_the_motion (56), blackout_11_the_hedge (2), blackout_14_the_shareholders (14), blackout_15_nine_percent (8), blackout_17_footprints (1), summit_09_the_handshake (2), summit_15_the_deputys_lunch (2), summit_16_the_academic (2), summit_17_consecutive_days (83), summit_18_the_promise (12), summit_20_half_of_them (50), ultimatum_15_two_readings (30), ultimatum_17_any_means_any (16), ultimatum_18_your_own_words (7), ultimatum_19_the_climbdown (91), ultimatum_20_the_half_life (21), ultimatum_21_the_open_line (54), cables_22_a_week (59), cables_16_the_escort_line (14), cables_17_forty_minutes (15), cables_18_eleven_hundred_tonnes (23), cables_19_unsigned (48), cables_20_ninety_days (38), cables_21_my_nine (47)

## Policy: all

- Runs: **60000** (1 hit the step cap without ending)
- Win rate (run_end ending on the last act): **2.25%**; stand-down 0.05%; nuclear 49.14%
- Score: median **1543**, mean 3483.09, p90 7153, p99 22210.02, max 1449326; best single choice 447.48 on average
- Broke the game (score ≥ 700000): **0.01%** (5 runs)
- Estimated minutes to the first ending: median **9.85**, p10 5.72, p90 19.23
- Days: median 19.5, mean 22.89, p10 12.25, p90 37; cards per run 48.53
- Endless: 1348 runs continued (2.25%), 1.26 endless acts on average, max 5
- Timer expiry rate: 12.82% (78175 expiries / 609740 timed cards)
- Near-miss rate: 10% (41664 / 416841 rolls)
- Average peak escalation: 69.42; false alarms per run: 0.415
- Top ending share: **13.31%** (removed_military_0)

### Endings (all)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_military_0 | removed | 7985 | 13.31 |
| removed_public_0_federation | removed | 5502 | 9.17 |
| removed_public_0_republic | removed | 5420 | 9.03 |
| removed_public_0_coalition | removed | 4955 | 8.26 |
| core_nuclear_called | nuclear | 4490 | 7.48 |
| nuclear_intercept_exchange | nuclear | 4092 | 6.82 |
| core_nuclear_rogue | nuclear | 2934 | 4.89 |
| removed_public_0_square | removed | 2623 | 4.37 |
| nuclear_midnight | nuclear | 2589 | 4.32 |
| nuclear_forty_miles | nuclear | 2539 | 4.23 |
| core_nuclear_false_alarm | nuclear | 2350 | 3.92 |
| core_nuclear_misread | nuclear | 2030 | 3.38 |
| core_nuclear_attribution | nuclear | 1994 | 3.32 |
| nuclear_blind | nuclear | 1768 | 2.95 |
| nuclear_straits | nuclear | 1669 | 2.78 |
| nuclear_after_vellmar | nuclear | 1365 | 2.28 |
| core_survival_called | survival | 908 | 1.51 |
| removed_military_0_unsigned | removed | 638 | 1.06 |
| nuclear_after_midnight | nuclear | 495 | 0.83 |
| special_resigned | special | 457 | 0.76 |
| removed_allies_0_federation | removed | 445 | 0.74 |
| core_survival_ninety | survival | 385 | 0.64 |
| removed_military_0_admiral | removed | 317 | 0.53 |
| nuclear_generals_war | nuclear | 313 | 0.52 |
| nuclear_dark_sky | nuclear | 248 | 0.41 |
| removed_allies_0 | removed | 201 | 0.34 |
| nuclear_last_card | nuclear | 165 | 0.28 |
| nuclear_vestria | nuclear | 153 | 0.26 |
| removed_military_100_federation | removed | 137 | 0.23 |
| nuclear_standing_orders | nuclear | 126 | 0.21 |
| removed_economy_0_federation | removed | 103 | 0.17 |
| removed_allies_0_republic | removed | 100 | 0.17 |
| removed_economy_0 | removed | 92 | 0.15 |
| removed_allies_100 | removed | 68 | 0.11 |
| removed_allies_100_consulted | removed | 49 | 0.08 |
| nuclear_deep_bunker | nuclear | 37 | 0.06 |
| nuclear_ladder | nuclear | 36 | 0.06 |
| removed_military_100 | removed | 35 | 0.06 |
| core_nuclear_leverage | nuclear | 29 | 0.05 |
| nuclear_believed | nuclear | 28 | 0.05 |
| core_standdown_minimal | standdown | 24 | 0.04 |
| removed_military_100_hawk | removed | 19 | 0.03 |
| removed_public_100 | removed | 19 | 0.03 |
| core_nuclear_deadman | nuclear | 16 | 0.03 |
| survival_empty_chair | survival | 15 | 0.03 |
| nuclear_second_use | nuclear | 10 | 0.02 |
| core_survival_borrowed | survival | 7 | 0.01 |
| nuclear_launch_on_warning | nuclear | 5 | 0.01 |
| removed_economy_0_reserve | removed | 5 | 0.01 |
| standdown_communique | standdown | 3 | 0.01 |
| survival_they_blinked | survival | 3 | 0.01 |
| standdown_empty_sky | standdown | 2 | 0 |
| standdown_longer_table | standdown | 1 | 0 |
| unfinished | special | 1 | 0 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 29481 | 49.14 | 30473 | 50.79 |
| removed | 28713 | 47.86 | 29068 | 48.45 |
| standdown | 30 | 0.05 | 0 | 0 |
| survival | 1318 | 2.2 | 0 | 0 |
| special | 458 | 0.76 | 459 | 0.77 |

### Act reached (all)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 4773 | 7.96 |
| 2 | Week Two | 23482 | 39.14 |
| 3 | Week Three | 16544 | 27.57 |
| 4 | Week Four | 9969 | 16.61 |
| 5 | Endgame | 3884 | 6.47 |
| 6 | Endless 1 | 1076 | 1.79 |
| 7 | Endless 2 | 217 | 0.36 |
| 8 | Endless 3 | 38 | 0.06 |
| 9 | Endless 4 | 12 | 0.02 |
| 10 | Endless 5 | 5 | 0.01 |

### Antes per act (all)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 59933 | 50865 | 84.87 | 9068 | 15.13 | 1962 | 3.27 |
| 2 | Week Two | 46922 | 18688 | 39.83 | 28234 | 60.17 | 4837 | 10.31 |
| 3 | Week Three | 19980 | 6191 | 30.99 | 13789 | 69.01 | 1500 | 7.51 |
| 4 | Week Four | 9326 | 1396 | 14.97 | 7930 | 85.03 | 340 | 3.65 |
| 5 | Endgame | 2691 | 173 | 6.43 | 2518 | 93.57 | 26 | 0.97 |
| 6 | Endless 1 | 474 | 38 | 8.02 | 436 | 91.98 | 14 | 2.95 |
| 7 | Endless 2 | 83 | 10 | 12.05 | 73 | 87.95 | 3 | 3.61 |
| 8 | Endless 3 | 21 | 4 | 19.05 | 17 | 80.95 | 1 | 4.76 |
| 9 | Endless 4 | 5 | 0 | 0 | 5 | 100 | 0 | 0 |

### Accidents (all)

- Attached to 13.01% of cards (6.31 per run); 13.88% of those fired (0.88 per run)
- Fatal at once: 16.47% of fired; mean escalation per fired accident: 7.02

### Capital and orders (all)

- Capital earned 15.35 / spent 15.02 per run; 4.42 shop visits, 0.45 rerolls, 0.001 tags removed per run
- Pieces bought 2.67 / sold 0 per run; orders bought 0.94 / used 0.87 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 53093 | 4743 | 8.93% | 3690 | 77.8% |
| say_it_again | 32228 | 4200 | 13.03% | 4162 | 99.1% |
| double_down | 32480 | 2660 | 8.19% | 2626 | 98.72% |
| intercept_package | 52954 | 1884 | 3.56% | 1685 | 89.44% |
| duty_officers_veto | 52396 | 3907 | 7.46% | 2703 | 69.18% |
| lose_the_memo | 52895 | 2097 | 3.96% | 1854 | 88.41% |
| favour_owed | 52852 | 18958 | 35.87% | 18644 | 98.34% |
| one_more_call | 32125 | 749 | 2.33% | 673 | 89.85% |
| leaked_assessment | 32386 | 4350 | 13.43% | 4009 | 92.16% |
| calm_the_markets | 52672 | 3300 | 6.27% | 2840 | 86.06% |
| rally | 52670 | 4269 | 8.11% | 4056 | 95.01% |
| muster | 52706 | 4569 | 8.67% | 4397 | 96.24% |
| personal_letter | 32293 | 735 | 2.28% | 672 | 91.43% |

### Score distribution (all)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3483.09 | 624 | 816 | 1543 | 4501 | 7153 | 22210.02 | 1449326 |

### Per seat (all)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 19998 | 2.38 | 1628 | 20.5 | 50.37 | 46.34 | 0.05 | 2.33 | 0.91 |
| federation | 20001 | 1.7 | 1510 | 18.75 | 48.92 | 48.78 | 0.02 | 1.68 | 0.59 |
| republic | 20001 | 2.66 | 1498 | 19.5 | 48.11 | 48.44 | 0.08 | 2.58 | 0.79 |

### Piece buy rates (all)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 22220 | 1716 | 7.72% | no |
| dove_fm | advisor | rare | 9367 | 812 | 8.67% | no |
| paranoid_intel | advisor | common | 29266 | 8413 | 28.75% | yes |
| cautious_intel | advisor | common | 29592 | 7239 | 24.46% | yes |
| spin_doctor | advisor | uncommon | 22167 | 1760 | 7.94% | no |
| ambassador | advisor | uncommon | 22350 | 1528 | 6.84% | no |
| cyber_director | advisor | uncommon | 22505 | 1362 | 6.05% | no |
| treasury_hawk | advisor | common | 33724 | 8036 | 23.83% | yes |
| fixer | advisor | uncommon | 22278 | 1807 | 8.11% | no |
| admiral | advisor | uncommon | 21851 | 3013 | 13.79% | no |
| peace_leader | advisor | common | 33324 | 7897 | 23.7% | yes |
| contractor | advisor | rare | 9596 | 324 | 3.38% | no |
| iron_nerve | advisor | legendary | 4698 | 263 | 5.6% | no |
| long_table | advisor | legendary | 4696 | 258 | 5.49% | no |
| field_marshal | advisor | rare | 9556 | 293 | 3.07% | no |
| press_office | advisor | rare | 9403 | 361 | 3.84% | no |
| attache | advisor | uncommon | 22047 | 2170 | 9.84% | no |
| lobby | advisor | uncommon | 21801 | 2610 | 11.97% | no |
| pollster | advisor | common | 33377 | 8512 | 25.5% | yes |
| early_warning | asset | uncommon | 21706 | 3552 | 16.36% | yes |
| back_channel | asset | uncommon | 22311 | 1528 | 6.85% | no |
| cyber_unit | asset | uncommon | 22387 | 1368 | 6.11% | no |
| missile_defence | asset | uncommon | 21998 | 1397 | 6.35% | no |
| blue_water_fleet | asset | uncommon | 22026 | 1482 | 6.73% | no |
| hardened_nc3 | asset | rare | 9475 | 678 | 7.16% | no |
| commercial_sat | asset | common | 34866 | 5571 | 15.98% | yes |
| allied_basing | asset | common | 32480 | 8830 | 27.19% | yes |
| strategic_reserve | asset | common | 33592 | 7972 | 23.73% | yes |
| rapid_response | asset | uncommon | 22177 | 1408 | 6.35% | no |
| signals_intercept | asset | rare | 9472 | 449 | 4.74% | no |
| civil_defence | asset | uncommon | 21477 | 3206 | 14.93% | no |
| deadman_switch | asset | legendary | 4604 | 148 | 3.21% | no |
| perfect_intel | asset | legendary | 4595 | 187 | 4.07% | no |
| open_line | asset | legendary | 4476 | 156 | 3.49% | no |
| war_economy | asset | legendary | 4685 | 244 | 5.21% | no |
| whispers | asset | rare | 9413 | 289 | 3.07% | no |
| ledger | asset | rare | 9414 | 340 | 3.61% | no |
| war_bonds | asset | rare | 9499 | 1023 | 10.77% | no |
| tripwire | asset | rare | 9497 | 711 | 7.49% | no |
| quiet_room | asset | rare | 9545 | 286 | 3% | no |
| dockyards | asset | uncommon | 21987 | 1492 | 6.79% | no |
| bunker | asset | uncommon | 21794 | 2589 | 11.88% | no |
| war_room | asset | uncommon | 21901 | 2267 | 10.35% | no |
| staff_college | asset | common | 34182 | 6393 | 18.7% | yes |
| trade_desk | asset | common | 33480 | 7831 | 23.39% | yes |
| courier | asset | common | 33563 | 7982 | 23.78% | yes |
| launch_on_warning | doctrine | rare | 9486 | 331 | 3.49% | no |
| deterrence_by_denial | doctrine | uncommon | 22048 | 1324 | 6.01% | no |
| strategic_ambiguity | doctrine | uncommon | 22086 | 1822 | 8.25% | no |
| no_first_use | doctrine | uncommon | 21820 | 2609 | 11.96% | no |
| escalate_to_deescalate | doctrine | rare | 9326 | 255 | 2.73% | no |
| alliance_first | doctrine | common | 29678 | 8616 | 29.03% | yes |
| fortress | doctrine | common | 29643 | 7993 | 26.96% | yes |
| transparency | doctrine | uncommon | 21638 | 2455 | 11.35% | no |
| red_lines | doctrine | rare | 9498 | 367 | 3.86% | no |
| hotline_protocol | doctrine | uncommon | 21908 | 2266 | 10.34% | no |
| predelegation | doctrine | uncommon | 22052 | 1476 | 6.69% | no |
| minimal_deterrence | doctrine | rare | 9507 | 320 | 3.37% | no |
| madman_theory | doctrine | legendary | 4561 | 263 | 5.77% | no |
| brinkmanship | doctrine | legendary | 4494 | 117 | 2.6% | no |
| domino_theory | doctrine | legendary | 4655 | 262 | 5.63% | no |
| the_button | doctrine | legendary | 4520 | 169 | 3.74% | no |
| second_strike | doctrine | rare | 9449 | 290 | 3.07% | no |
| propaganda | doctrine | uncommon | 21645 | 1765 | 8.15% | no |

Outside band (50): hawk_general (7.72%), dove_fm (8.67%), spin_doctor (7.94%), ambassador (6.84%), cyber_director (6.05%), fixer (8.11%), admiral (13.79%), contractor (3.38%), iron_nerve (5.6%), long_table (5.49%), field_marshal (3.07%), press_office (3.84%), attache (9.84%), lobby (11.97%), back_channel (6.85%), cyber_unit (6.11%), missile_defence (6.35%), blue_water_fleet (6.73%), hardened_nc3 (7.16%), rapid_response (6.35%), signals_intercept (4.74%), civil_defence (14.93%), deadman_switch (3.21%), perfect_intel (4.07%), open_line (3.49%), war_economy (5.21%), whispers (3.07%), ledger (3.61%), war_bonds (10.77%), tripwire (7.49%), quiet_room (3%), dockyards (6.79%), bunker (11.88%), war_room (10.35%), launch_on_warning (3.49%), deterrence_by_denial (6.01%), strategic_ambiguity (8.25%), no_first_use (11.96%), escalate_to_deescalate (2.73%), transparency (11.35%), red_lines (3.86%), hotline_protocol (10.34%), predelegation (6.69%), minimal_deterrence (3.37%), madman_theory (5.77%), brinkmanship (2.6%), domino_theory (5.63%), the_button (3.74%), second_strike (3.07%), propaganda (8.15%)

### Card coverage (all)

- Cards never seen: 1 — adv_01_a_senior_defence_source
- Rare cards (seen in < 0.5% of runs): 92 — adv_02_what_a_person_is_worth (31), adv_03_the_invoice (10), adv_04_over_her_head (12), adv_05_one_sentence (26), adv_07_the_army_will_hear_it (265), adv_08_a_number_not_on_any_list (270), adv_11_over_dinner (17), adv_13_ninety_percent (244), adv_14_is_and_consistent_with (18), adv_19_both_sides_of_the_border (72), adv_22_seven_times_in_ten (60), adv_24_engineers (114), adv_25_one_of_them_did (262), adv_26_the_square_does_not_keep_a_diary (36), adv_27_no_hard_feelings (4), adv_28_the_florist (124), blockade_19_the_carrier (83), blockade_20_thirty_one_days (70), blockade_26_the_order (65), cyberew_07_working_hours (208), cyberew_10_reciprocity (69), cyberew_11_their_reading (19), cyberew_13_page_eleven (256), cyberew_15_thirty_one_attempts (117), cyberew_16_our_own_tool (79), cyberew_22_their_bombers (2), debris_02_the_intercept (225), debris_08_the_question_mark (193), debris_11_calibrations (8), debris_15_the_glass_house (8), debris_16_supplier_or_combatant (151), debris_17_eleven_seconds (7), debris_18_without_consensus (66), defector_08_on_background (93), defector_11_corroboration (37), defector_12_the_package (35), defector_17_tuesdays_assessment (113), dom_coa_06_the_lease (247), falarm_17_three_keys (171), falarm_18_the_doctrine (48), fp_cascade_08a_the_operator (70), fp_intercept_04a_the_layer_you_did_not_use (167), fp_intercept_fa_02_the_doctrine (9), fp_intercept_fa_05_three_keys (22), fp_intercept_fa_06_the_sirens (75), fp_line_05a_the_carrier (152), fp_midnight_06_the_word_any (81), fp_summit_02_the_photographs (207), fp_summit_03_flatbeds (66), fp_summit_09_the_lake_steps (113), fp_summit_10_four_lines (95), proxy_08_six_hours (181), proxy_09_an_afternoon (12), proxy_10_winnable (211), proxy_11_the_estimate (8), proxy_13_the_road_to_hollin (31), proxy_20_the_column (156), proxy_21_across_the_aum (87), proxy_24_contact (83), proxy_26_the_motion (88), blackout_10_consistent_with (62), blackout_11_the_hedge (85), blackout_12_same_orbit (246), blackout_13_the_inspector (224), blackout_15_nine_percent (108), blackout_16_do_it_back (54), blackout_17_footprints (78), summit_09_the_handshake (8), summit_15_the_deputys_lunch (7), summit_16_the_academic (18), summit_17_consecutive_days (250), summit_18_the_promise (15), summit_19_eleven_calls (193), summit_20_half_of_them (67), summit_21_the_other_half (259), summit_22_the_square (227), ultimatum_15_two_readings (46), ultimatum_16_the_wrong_signal (168), ultimatum_17_any_means_any (19), ultimatum_18_your_own_words (10), ultimatum_19_the_climbdown (144), ultimatum_20_the_half_life (36), ultimatum_21_the_open_line (74), ultimatum_22_three_calls (234), cables_05_the_detour (32), cables_22_a_week (90), cables_16_the_escort_line (61), cables_17_forty_minutes (70), cables_18_eleven_hundred_tonnes (99), cables_19_unsigned (157), cables_20_ninety_days (141), cables_21_my_nine (151)

## Cards never seen (all policies)

- adv_01_a_senior_defence_source

### Rare cards (seen in < 0.5% of runs, all policies)

| Card | Runs | % |
| --- | --- | --- |
| adv_02_what_a_person_is_worth | 31 | 0.05 |
| adv_03_the_invoice | 10 | 0.02 |
| adv_04_over_her_head | 12 | 0.02 |
| adv_05_one_sentence | 26 | 0.04 |
| adv_07_the_army_will_hear_it | 265 | 0.44 |
| adv_08_a_number_not_on_any_list | 270 | 0.45 |
| adv_11_over_dinner | 17 | 0.03 |
| adv_13_ninety_percent | 244 | 0.41 |
| adv_14_is_and_consistent_with | 18 | 0.03 |
| adv_19_both_sides_of_the_border | 72 | 0.12 |
| adv_22_seven_times_in_ten | 60 | 0.1 |
| adv_24_engineers | 114 | 0.19 |
| adv_25_one_of_them_did | 262 | 0.44 |
| adv_26_the_square_does_not_keep_a_diary | 36 | 0.06 |
| adv_27_no_hard_feelings | 4 | 0.01 |
| adv_28_the_florist | 124 | 0.21 |
| blockade_19_the_carrier | 83 | 0.14 |
| blockade_20_thirty_one_days | 70 | 0.12 |
| blockade_26_the_order | 65 | 0.11 |
| cyberew_07_working_hours | 208 | 0.35 |
| cyberew_10_reciprocity | 69 | 0.12 |
| cyberew_11_their_reading | 19 | 0.03 |
| cyberew_13_page_eleven | 256 | 0.43 |
| cyberew_15_thirty_one_attempts | 117 | 0.2 |
| cyberew_16_our_own_tool | 79 | 0.13 |
| cyberew_22_their_bombers | 2 | 0 |
| debris_02_the_intercept | 225 | 0.38 |
| debris_08_the_question_mark | 193 | 0.32 |
| debris_11_calibrations | 8 | 0.01 |
| debris_15_the_glass_house | 8 | 0.01 |
| debris_16_supplier_or_combatant | 151 | 0.25 |
| debris_17_eleven_seconds | 7 | 0.01 |
| debris_18_without_consensus | 66 | 0.11 |
| defector_08_on_background | 93 | 0.16 |
| defector_11_corroboration | 37 | 0.06 |
| defector_12_the_package | 35 | 0.06 |
| defector_17_tuesdays_assessment | 113 | 0.19 |
| dom_coa_06_the_lease | 247 | 0.41 |
| falarm_17_three_keys | 171 | 0.28 |
| falarm_18_the_doctrine | 48 | 0.08 |
| fp_cascade_08a_the_operator | 70 | 0.12 |
| fp_intercept_04a_the_layer_you_did_not_use | 167 | 0.28 |
| fp_intercept_fa_02_the_doctrine | 9 | 0.02 |
| fp_intercept_fa_05_three_keys | 22 | 0.04 |
| fp_intercept_fa_06_the_sirens | 75 | 0.13 |
| fp_line_05a_the_carrier | 152 | 0.25 |
| fp_midnight_06_the_word_any | 81 | 0.14 |
| fp_summit_02_the_photographs | 207 | 0.35 |
| fp_summit_03_flatbeds | 66 | 0.11 |
| fp_summit_09_the_lake_steps | 113 | 0.19 |
| fp_summit_10_four_lines | 95 | 0.16 |
| proxy_08_six_hours | 181 | 0.3 |
| proxy_09_an_afternoon | 12 | 0.02 |
| proxy_10_winnable | 211 | 0.35 |
| proxy_11_the_estimate | 8 | 0.01 |
| proxy_13_the_road_to_hollin | 31 | 0.05 |
| proxy_20_the_column | 156 | 0.26 |
| proxy_21_across_the_aum | 87 | 0.14 |
| proxy_24_contact | 83 | 0.14 |
| proxy_26_the_motion | 88 | 0.15 |
| blackout_10_consistent_with | 62 | 0.1 |
| blackout_11_the_hedge | 85 | 0.14 |
| blackout_12_same_orbit | 246 | 0.41 |
| blackout_13_the_inspector | 224 | 0.37 |
| blackout_15_nine_percent | 108 | 0.18 |
| blackout_16_do_it_back | 54 | 0.09 |
| blackout_17_footprints | 78 | 0.13 |
| summit_09_the_handshake | 8 | 0.01 |
| summit_15_the_deputys_lunch | 7 | 0.01 |
| summit_16_the_academic | 18 | 0.03 |
| summit_17_consecutive_days | 250 | 0.42 |
| summit_18_the_promise | 15 | 0.03 |
| summit_19_eleven_calls | 193 | 0.32 |
| summit_20_half_of_them | 67 | 0.11 |
| summit_21_the_other_half | 259 | 0.43 |
| summit_22_the_square | 227 | 0.38 |
| ultimatum_15_two_readings | 46 | 0.08 |
| ultimatum_16_the_wrong_signal | 168 | 0.28 |
| ultimatum_17_any_means_any | 19 | 0.03 |
| ultimatum_18_your_own_words | 10 | 0.02 |
| ultimatum_19_the_climbdown | 144 | 0.24 |
| ultimatum_20_the_half_life | 36 | 0.06 |
| ultimatum_21_the_open_line | 74 | 0.12 |
| ultimatum_22_three_calls | 234 | 0.39 |
| cables_05_the_detour | 32 | 0.05 |
| cables_22_a_week | 90 | 0.15 |
| cables_16_the_escort_line | 61 | 0.1 |
| cables_17_forty_minutes | 70 | 0.12 |
| cables_18_eleven_hundred_tonnes | 99 | 0.17 |
| cables_19_unsigned | 157 | 0.26 |
| cables_20_ninety_days | 141 | 0.24 |
| cables_21_my_nine | 151 | 0.25 |

## Archetypes (heuristic)

Runs in which the archetype (≥ 2 core pieces) was assembled when act 3 began, how often those runs reached the Endgame (act 5) and won, and their median score. Final = runs holding the archetype at the end.

| Archetype | Style | Assembled by act 3 | Reached Endgame | % | Won | Won % | Median score | Final |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| war_economy | hybrid | 1718 | 459 | 26.72 | 97 | 5.65 | 4777.5 | 2666 |
| alliance_engine | hybrid | 1686 | 505 | 29.95 | 139 | 8.24 | 5621 | 2754 |
| peace_movement | standdown | 756 | 158 | 20.9 | 39 | 5.16 | 4572 | 1337 |
| accident_farmer | brink | 692 | 242 | 34.97 | 69 | 9.97 | 11885.5 | 1365 |
| intel_machine | hybrid | 534 | 161 | 30.15 | 33 | 6.18 | 5445 | 920 |
| red_lines_gambler | brink | 108 | 48 | 44.44 | 19 | 17.59 | 9257 | 258 |
| ledger | hybrid | 76 | 22 | 28.95 | 5 | 6.58 | 5910.5 | 161 |
| sea_power | brink | 65 | 13 | 20 | 4 | 6.15 | 5234 | 114 |
| quiet_diplomat | standdown | 47 | 18 | 38.3 | 2 | 4.26 | 6311 | 116 |
| hair_trigger | brink | 44 | 5 | 11.36 | 1 | 2.27 | 6378 | 79 |
| shield_wall | brink | 29 | 8 | 27.59 | 2 | 6.9 | 5753 | 60 |
| deadman | brink | 9 | 3 | 33.33 | 2 | 22.22 | 5995 | 26 |
| cyber_ghost | hybrid | 8 | 2 | 25 | 0 | 0 | 4609.5 | 12 |
| the_ladder | brink | 7 | 1 | 14.29 | 0 | 0 | 5091 | 24 |
| madman | brink | 6 | 0 | 0 | 0 | 0 | 13356 | 16 |

## Piece share among winning builds (heuristic)

Share of winning runs that held each piece at the end (cap 35%).

| Piece | Pool | Rarity | Wins holding it | Share of wins | Δ win |
| --- | --- | --- | --- | --- | --- |
| allied_basing | asset | common | 305 | 22.92 | 2.67 |
| alliance_first | doctrine | common | 303 | 22.76 | 2.23 |
| paranoid_intel | advisor | common | 290 | 21.79 | 2.22 |
| civil_defence | asset | uncommon | 250 | 18.78 | 7.05 |
| pollster | advisor | common | 248 | 18.63 | 1.76 |
| dove_fm | advisor | rare | 217 | 16.3 | 27.78 |
| early_warning | asset | uncommon | 211 | 15.85 | 3.31 |
| fortress | doctrine | common | 201 | 15.1 | 0.51 |
| bunker | asset | uncommon | 181 | 13.6 | 8.26 |
| courier | asset | common | 174 | 13.07 | 0.71 |
| strategic_reserve | asset | common | 154 | 11.57 | -0.55 |
| peace_leader | advisor | common | 150 | 11.27 | -0.46 |
| admiral | advisor | uncommon | 147 | 11.04 | 2.26 |
| trade_desk | asset | common | 142 | 10.67 | -0.91 |
| cautious_intel | advisor | common | 140 | 10.52 | 0.33 |
| treasury_hawk | advisor | common | 137 | 10.29 | -1.37 |
| hotline_protocol | doctrine | uncommon | 124 | 9.32 | 6.06 |
| lobby | advisor | uncommon | 89 | 6.69 | 0.57 |
| war_room | asset | uncommon | 79 | 5.94 | 2.09 |
| spin_doctor | advisor | uncommon | 76 | 5.71 | 13.14 |
| war_bonds | asset | rare | 71 | 5.33 | 1.72 |
| attache | advisor | uncommon | 66 | 4.96 | 1.38 |
| staff_college | asset | common | 64 | 4.81 | -0.23 |
| hardened_nc3 | asset | rare | 63 | 4.73 | 5.51 |
| transparency | doctrine | uncommon | 60 | 4.51 | -1.32 |
| strategic_ambiguity | doctrine | uncommon | 52 | 3.91 | 5.01 |
| propaganda | doctrine | uncommon | 49 | 3.68 | 4.69 |
| tripwire | asset | rare | 42 | 3.16 | 0.98 |
| no_first_use | doctrine | uncommon | 37 | 2.78 | -3.89 |
| fixer | advisor | uncommon | 32 | 2.4 | 0.77 |
| minimal_deterrence | doctrine | rare | 27 | 2.03 | 11.19 |
| signals_intercept | asset | rare | 25 | 1.88 | 2.4 |
| iron_nerve | advisor | legendary | 23 | 1.73 | 4.45 |
| red_lines | doctrine | rare | 22 | 1.65 | 5.03 |
| ambassador | advisor | uncommon | 19 | 1.43 | 4.56 |
| press_office | advisor | rare | 17 | 1.28 | 2.08 |
| deadman_switch | asset | legendary | 16 | 1.2 | 11.58 |
| whispers | asset | rare | 16 | 1.2 | 6.29 |
| back_channel | asset | uncommon | 12 | 0.9 | 5.14 |
| long_table | advisor | legendary | 12 | 0.9 | -0.63 |
| madman_theory | doctrine | legendary | 11 | 0.83 | -1.65 |
| ledger | asset | rare | 9 | 0.68 | -1.91 |
| war_economy | asset | legendary | 9 | 0.68 | -1.83 |
| perfect_intel | asset | legendary | 8 | 0.6 | -0.64 |
| quiet_room | asset | rare | 8 | 0.6 | -0.5 |
| domino_theory | doctrine | legendary | 7 | 0.53 | -3.4 |
| commercial_sat | asset | common | 6 | 0.45 | -2.19 |
| hawk_general | advisor | uncommon | 6 | 0.45 | -5.05 |
| second_strike | doctrine | rare | 6 | 0.45 | -2.39 |
| field_marshal | advisor | rare | 5 | 0.38 | -3 |
| open_line | asset | legendary | 5 | 0.38 | -0.98 |
| predelegation | doctrine | uncommon | 5 | 0.38 | -3.05 |
| blue_water_fleet | asset | uncommon | 4 | 0.3 | -4.02 |
| contractor | advisor | rare | 4 | 0.3 | -4.37 |
| missile_defence | asset | uncommon | 4 | 0.3 | 0.13 |
| deterrence_by_denial | doctrine | uncommon | 3 | 0.23 | -1.66 |
| dockyards | asset | uncommon | 3 | 0.23 | -4.54 |
| escalate_to_deescalate | doctrine | rare | 3 | 0.23 | -3.79 |
| the_button | doctrine | legendary | 3 | 0.23 | -3.7 |
| rapid_response | asset | uncommon | 2 | 0.15 | -3.33 |
| cyber_director | advisor | uncommon | 1 | 0.08 | -1.9 |

## Combos (heuristic)

Pairs of pieces held together in ≥ 40 runs: 222. Pairs with |Δ win| ≥ 10pp vs runs holding neither: **38**.

| Piece A | Piece B | Runs | Win % | Nuclear % | Baseline win % | Baseline nuclear % | Δ win | Δ nuclear |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| admiral | dove_fm | 113 | 50.44 | 40.71 | 5.76 | 83.88 | 44.68 | -43.17 |
| alliance_first | dove_fm | 317 | 41.32 | 51.42 | 5.85 | 83.38 | 35.47 | -31.96 |
| allied_basing | dove_fm | 312 | 41.03 | 50.96 | 5.77 | 83.48 | 35.25 | -32.52 |
| bunker | iron_nerve | 40 | 35 | 57.5 | 6.14 | 83.18 | 28.86 | -25.68 |
| civil_defence | hardened_nc3 | 97 | 34.02 | 62.89 | 5.95 | 83.8 | 28.07 | -20.91 |
| dove_fm | pollster | 94 | 28.72 | 42.55 | 5.44 | 85.47 | 23.28 | -42.92 |
| bunker | civil_defence | 376 | 27.66 | 66.76 | 5.84 | 83.82 | 21.82 | -17.06 |
| hotline_protocol | spin_doctor | 106 | 27.36 | 68.87 | 6.2 | 83.72 | 21.16 | -14.85 |
| courier | dove_fm | 103 | 26.21 | 47.57 | 5.67 | 85.29 | 20.55 | -37.71 |
| courier | spin_doctor | 40 | 25 | 72.5 | 6.32 | 84.4 | 18.68 | -11.9 |
| ambassador | hotline_protocol | 41 | 24.39 | 68.29 | 6.35 | 83.63 | 18.04 | -15.34 |
| spin_doctor | strategic_ambiguity | 175 | 24 | 70.86 | 6.44 | 82.97 | 17.56 | -12.11 |
| propaganda | spin_doctor | 105 | 23.81 | 71.43 | 6.38 | 83.09 | 17.42 | -11.66 |
| bunker | hardened_nc3 | 98 | 23.47 | 70.41 | 6.06 | 83.16 | 17.41 | -12.75 |
| pollster | spin_doctor | 249 | 23.69 | 72.29 | 6.34 | 84.4 | 17.36 | -12.11 |
| bunker | pollster | 88 | 21.59 | 70.45 | 5.83 | 84.73 | 15.76 | -14.28 |
| early_warning | iron_nerve | 50 | 22 | 62 | 6.28 | 82.9 | 15.72 | -20.9 |
| hotline_protocol | propaganda | 51 | 21.57 | 70.59 | 6.28 | 83.72 | 15.29 | -13.13 |
| bunker | staff_college | 52 | 21.15 | 71.15 | 6.16 | 83.27 | 14.99 | -12.12 |
| early_warning | hardened_nc3 | 172 | 20.93 | 74.42 | 6.26 | 82.85 | 14.67 | -8.44 |

## Piece ending profiles

Win rate and ending-kind mix with vs without each piece (heuristic when run, otherwise all policies). Profile Δ is the total-variation distance in percentage points.

| Piece | Pool | Rarity | Offered | Buy rate | Held runs | Wins | Share of wins | Δ win | Δ nuclear | Profile Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 11990 | 2.96% | 355 | 6 | 0.45 | -5.05 | 7.36 | 7.36 |
| dove_fm | advisor | rare | 5076 | 12.75% | 647 | 217 | 16.3 | 27.78 | -33.29 | 33.29 |
| paranoid_intel | advisor | common | 14989 | 22.77% | 3413 | 290 | 21.79 | 2.22 | 1.74 | 3.99 |
| cautious_intel | advisor | common | 14895 | 13.53% | 2015 | 140 | 10.52 | 0.33 | 1.23 | 1.6 |
| spin_doctor | advisor | uncommon | 12010 | 3.24% | 389 | 76 | 5.71 | 13.14 | -7.21 | 13.22 |
| ambassador | advisor | uncommon | 12163 | 1.4% | 170 | 19 | 1.43 | 4.56 | -2.34 | 4.65 |
| cyber_director | advisor | uncommon | 12203 | 0.17% | 21 | 1 | 0.08 | -1.9 | -1.96 | 3.86 |
| treasury_hawk | advisor | common | 17903 | 14.03% | 2511 | 137 | 10.29 | -1.37 | 2.97 | 2.97 |
| fixer | advisor | uncommon | 12057 | 3.58% | 432 | 32 | 2.4 | 0.77 | -2.88 | 2.97 |
| admiral | advisor | uncommon | 11837 | 14.24% | 1685 | 147 | 11.04 | 2.26 | -0.72 | 2.26 |
| peace_leader | advisor | common | 17886 | 13.42% | 2401 | 150 | 11.27 | -0.46 | -22.18 | 22.7 |
| contractor | advisor | rare | 5131 | 3.35% | 172 | 4 | 0.3 | -4.37 | -25.57 | 29.94 |
| iron_nerve | advisor | legendary | 2576 | 8.07% | 208 | 23 | 1.73 | 4.45 | -5.56 | 5.65 |
| long_table | advisor | legendary | 2542 | 7.83% | 199 | 12 | 0.9 | -0.63 | 1.53 | 1.53 |
| field_marshal | advisor | rare | 5120 | 2.66% | 136 | 5 | 0.38 | -3 | -10.19 | 13.19 |
| press_office | advisor | rare | 5086 | 3.83% | 195 | 17 | 1.28 | 2.08 | -5.01 | 5.1 |
| attache | advisor | uncommon | 11854 | 6.98% | 827 | 66 | 4.96 | 1.38 | -0.84 | 1.38 |
| lobby | advisor | uncommon | 11712 | 10.57% | 1238 | 89 | 6.69 | 0.57 | 1.51 | 2.17 |
| pollster | advisor | common | 17661 | 17.25% | 3044 | 248 | 18.63 | 1.76 | -9.68 | 9.68 |
| early_warning | asset | uncommon | 11405 | 19.27% | 2198 | 211 | 15.85 | 3.31 | 0.19 | 3.59 |
| back_channel | asset | uncommon | 12055 | 0.85% | 102 | 12 | 0.9 | 5.14 | -1.55 | 5.22 |
| cyber_unit | asset | uncommon | 12181 | 0.05% | 6 | 0 | 0 | -6.66 | 17.1 | 17.1 |
| missile_defence | asset | uncommon | 11861 | 0.5% | 59 | 4 | 0.3 | 0.13 | 1.84 | 2.05 |
| blue_water_fleet | asset | uncommon | 11973 | 1.25% | 150 | 4 | 0.3 | -4.02 | 5.13 | 5.13 |
| hardened_nc3 | asset | rare | 5141 | 10.19% | 524 | 63 | 4.73 | 5.51 | -1.66 | 5.6 |
| commercial_sat | asset | common | 19311 | 0.69% | 134 | 6 | 0.45 | -2.19 | -1.58 | 3.77 |
| allied_basing | asset | common | 16879 | 20.37% | 3439 | 305 | 22.92 | 2.67 | 0.55 | 3.25 |
| strategic_reserve | asset | common | 18188 | 13.72% | 2496 | 154 | 11.57 | -0.55 | 2.96 | 2.96 |
| rapid_response | asset | uncommon | 12023 | 0.5% | 60 | 2 | 0.15 | -3.33 | 8.78 | 8.78 |
| signals_intercept | asset | rare | 5108 | 5.42% | 277 | 25 | 1.88 | 2.4 | -0.24 | 2.49 |
| civil_defence | asset | uncommon | 11356 | 16.9% | 1919 | 250 | 18.78 | 7.05 | -9.69 | 9.69 |
| deadman_switch | asset | legendary | 2472 | 3.56% | 88 | 16 | 1.2 | 11.58 | -25.07 | 25.16 |
| perfect_intel | asset | legendary | 2537 | 5.24% | 133 | 8 | 0.6 | -0.64 | 5.09 | 5.09 |
| open_line | asset | legendary | 2435 | 3.61% | 88 | 5 | 0.38 | -0.98 | 0.04 | 0.98 |
| war_economy | asset | legendary | 2561 | 7.26% | 186 | 9 | 0.68 | -1.83 | 4.23 | 4.23 |
| whispers | asset | rare | 5150 | 2.41% | 124 | 16 | 1.2 | 6.29 | -3.09 | 6.37 |
| ledger | asset | rare | 5025 | 3.76% | 189 | 9 | 0.68 | -1.91 | 6.04 | 6.04 |
| war_bonds | asset | rare | 5093 | 16.79% | 855 | 71 | 5.33 | 1.72 | -1.09 | 1.72 |
| tripwire | asset | rare | 5203 | 10.61% | 552 | 42 | 3.16 | 0.98 | 2.11 | 3.09 |
| quiet_room | asset | rare | 5194 | 2.5% | 130 | 8 | 0.6 | -0.5 | 1.72 | 1.72 |
| dockyards | asset | uncommon | 11817 | 1.18% | 140 | 3 | 0.23 | -4.54 | 5.7 | 5.7 |
| bunker | asset | uncommon | 11711 | 10.73% | 1257 | 181 | 13.6 | 8.26 | -4.17 | 8.35 |
| war_room | asset | uncommon | 11876 | 7.69% | 913 | 79 | 5.94 | 2.09 | -1.14 | 2.09 |
| staff_college | asset | common | 18679 | 5.34% | 994 | 64 | 4.81 | -0.23 | -2.24 | 2.59 |
| trade_desk | asset | common | 17948 | 13.53% | 2426 | 142 | 10.67 | -0.91 | 3.12 | 3.12 |
| courier | asset | common | 18021 | 13.27% | 2391 | 174 | 13.07 | 0.71 | -11.09 | 11.09 |
| launch_on_warning | doctrine | rare | 5154 | 3.16% | 163 | 0 | 0 | -6.71 | 14.76 | 14.76 |
| deterrence_by_denial | doctrine | uncommon | 11988 | 0.5% | 60 | 3 | 0.23 | -1.66 | 3.77 | 3.77 |
| strategic_ambiguity | doctrine | uncommon | 11945 | 3.77% | 450 | 52 | 3.91 | 5.01 | -1.16 | 5.1 |
| no_first_use | doctrine | uncommon | 11769 | 10.46% | 1231 | 37 | 2.78 | -3.89 | -10.96 | 14.85 |
| escalate_to_deescalate | doctrine | rare | 5099 | 2.04% | 104 | 3 | 0.23 | -3.79 | 2.68 | 3.8 |
| alliance_first | doctrine | common | 15141 | 23.58% | 3570 | 303 | 22.76 | 2.23 | 1.13 | 3.36 |
| fortress | doctrine | common | 15117 | 18.76% | 2833 | 201 | 15.1 | 0.51 | -0.73 | 0.75 |
| transparency | doctrine | uncommon | 11618 | 9.55% | 1110 | 60 | 4.51 | -1.32 | -2.79 | 4.12 |
| red_lines | doctrine | rare | 5137 | 3.68% | 189 | 22 | 1.65 | 5.03 | 0.16 | 5.28 |
| hotline_protocol | doctrine | uncommon | 11874 | 8.41% | 999 | 124 | 9.32 | 6.06 | -14.57 | 14.57 |
| predelegation | doctrine | uncommon | 12010 | 1.15% | 138 | 5 | 0.38 | -3.05 | 1.89 | 3.06 |
| minimal_deterrence | doctrine | rare | 5139 | 2.96% | 152 | 27 | 2.03 | 11.19 | -55.7 | 55.79 |
| madman_theory | doctrine | legendary | 2482 | 8.82% | 219 | 11 | 0.83 | -1.65 | 10.35 | 10.35 |
| brinkmanship | doctrine | legendary | 2419 | 2.52% | 61 | 0 | 0 | -6.68 | 13.85 | 13.85 |
| domino_theory | doctrine | legendary | 2525 | 8.44% | 213 | 7 | 0.53 | -3.4 | 3.99 | 3.99 |
| the_button | doctrine | legendary | 2441 | 4.14% | 101 | 3 | 0.23 | -3.7 | 7.23 | 7.23 |
| second_strike | doctrine | rare | 5175 | 2.71% | 140 | 6 | 0.45 | -2.39 | -0.05 | 2.44 |
| propaganda | doctrine | uncommon | 11597 | 3.76% | 436 | 49 | 3.68 | 4.69 | -4.33 | 4.77 |

## Weakest pieces

Lowest combined rank of buy rate and |Δ win|: pieces players do not want, or that do not change whether runs are won.

| # | Piece | Pool | Rarity | Buy rate | Held runs | Δ win |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | missile_defence | asset | uncommon | 0.5% | 59 | 0.13 |
| 2 | quiet_room | asset | rare | 2.5% | 130 | -0.5 |
| 3 | deterrence_by_denial | doctrine | uncommon | 0.5% | 60 | -1.66 |
| 4 | cyber_director | advisor | uncommon | 0.17% | 21 | -1.9 |
| 5 | commercial_sat | asset | common | 0.69% | 134 | -2.19 |

## Per-card table (heuristic)

Seen = presentations; L% = share of plays resolved left; Δesc = mean applied escalation; lev = mean leverage scored; swing = mean |Δ| over the five meters per play; gap = mean distance between the two previews; impact = swing + gap.

| Card | Seen | Runs % | Left | Right | L% | Timeouts | Buried | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adv_03_the_invoice | 5 | 0.03 | 3 | 2 | 60 | 0 | 0 | 0 | 508 | 12.6 | 27.4 | 40 |
| adv_04_over_her_head | 6 | 0.03 | 5 | 1 | 83.3 | 0 | 0 | -1.5 | 266.5 | 8.5 | 23.17 | 31.67 |
| adv_06_you_may_prefer_not_to_know | 146 | 0.73 | 3 | 143 | 2.1 | 0 | 0 | 0 | 55.5 | 1.92 | 7.57 | 9.49 |
| adv_07_the_army_will_hear_it | 79 | 0.4 | 36 | 43 | 45.6 | 3 | 0 | 1.04 | 131.3 | 14.16 | 33.32 | 47.48 |
| adv_08_a_number_not_on_any_list | 245 | 1.23 | 18 | 226 | 7.4 | 0 | 1 | 0 | 110.9 | 3.23 | 10.42 | 13.65 |
| adv_09_the_other_seven | 1448 | 7.25 | 446 | 1002 | 30.8 | 0 | 0 | 0 | 125.7 | 6.36 | 16.99 | 23.35 |
| adv_10_three_days | 861 | 4.31 | 124 | 736 | 14.4 | 0 | 1 | 1.89 | 87.4 | 5.55 | 12.92 | 18.47 |
| adv_12_a_tourist_visa | 68 | 0.34 | 29 | 39 | 42.6 | 0 | 0 | 0 | 189.3 | 3.65 | 11.26 | 14.91 |
| adv_13_ninety_percent | 10 | 0.05 | 0 | 9 | 0 | 0 | 1 | 0 | 267.3 | 2.67 | 9.3 | 11.97 |
| adv_15_the_word_ceiling | 767 | 3.84 | 35 | 732 | 4.6 | 0 | 0 | 0 | 168.3 | 8.15 | 22.57 | 30.72 |
| adv_16_a_fellowship_abroad | 149 | 0.75 | 130 | 16 | 89 | 0 | 3 | 0 | 89.2 | 8.16 | 16.79 | 24.96 |
| adv_17_forty_minutes | 665 | 3.33 | 224 | 440 | 33.7 | 0 | 1 | -0.2 | 149.4 | 7.18 | 14.95 | 22.13 |
| adv_18_as_a_person | 859 | 4.3 | 648 | 210 | 75.5 | 0 | 1 | 0 | 62.3 | 12.64 | 27.15 | 39.8 |
| adv_19_both_sides_of_the_border | 52 | 0.26 | 24 | 27 | 47.1 | 0 | 1 | 0 | 102 | 7.96 | 16.02 | 23.98 |
| adv_20_the_minutes | 1016 | 5.09 | 598 | 418 | 58.9 | 0 | 0 | 0 | 65.9 | 6.68 | 10.71 | 17.39 |
| adv_21_a_line_at_the_bottom | 1651 | 8.28 | 0 | 1649 | 0 | 0 | 2 | 0 | 250.3 | 13.31 | 13.73 | 27.05 |
| adv_22_seven_times_in_ten | 39 | 0.2 | 11 | 28 | 28.2 | 0 | 0 | 0.95 | 350.6 | 7.69 | 16.72 | 24.41 |
| adv_23_as_if_you_had_not_said_it | 337 | 1.69 | 333 | 4 | 98.8 | 0 | 0 | 0 | 160.7 | 3.82 | 17.58 | 21.39 |
| adv_24_engineers | 84 | 0.42 | 62 | 22 | 73.8 | 0 | 0 | 5.79 | 371.3 | 17 | 37.95 | 54.95 |
| adv_25_one_of_them_did | 41 | 0.21 | 24 | 17 | 58.5 | 2 | 0 | 1.49 | 129.7 | 12.95 | 27.1 | 40.05 |
| adv_26_the_square_does_not_keep_a_diary | 36 | 0.18 | 14 | 22 | 38.9 | 0 | 0 | 0 | 59.8 | 7.5 | 14.83 | 22.33 |
| adv_27_no_hard_feelings | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | 0 | 77 | 13 | 23.5 | 36.5 |
| adv_28_the_florist | 67 | 0.34 | 60 | 5 | 92.3 | 0 | 2 | 0 | 70.8 | 6.45 | 15.07 | 21.52 |
| ally_01_what_will_you_do | 10800 | 54 | 5798 | 5002 | 53.7 | 0 | 0 | 1.62 | 48.4 | 9.6 | 19.17 | 28.77 |
| ally_02_the_resolution | 9657 | 48.3 | 7300 | 2357 | 75.6 | 0 | 0 | 0 | 54.1 | 6.59 | 14.32 | 20.91 |
| ally_03_the_liaison | 10888 | 54.45 | 4325 | 6562 | 39.7 | 518 | 1 | 0 | 47.3 | 10.06 | 19.95 | 30.01 |
| ally_04_northern_anvil | 9713 | 48.57 | 3396 | 6317 | 35 | 0 | 0 | -0.09 | 57.2 | 15.61 | 32.26 | 47.87 |
| ally_05_vestria_applies | 10987 | 54.96 | 5771 | 5214 | 52.5 | 0 | 2 | 2.25 | 91.5 | 10.46 | 20.95 | 31.41 |
| ally_06_stolen_paper | 11118 | 55.6 | 8723 | 2394 | 78.5 | 0 | 1 | 0 | 86.8 | 10.12 | 21.92 | 32.05 |
| ally_07_the_runway_bill | 9556 | 47.78 | 4850 | 4706 | 50.8 | 0 | 0 | 0 | 35.8 | 12.1 | 24.29 | 36.38 |
| ally_08_whose_rules | 7747 | 38.74 | 1530 | 6215 | 19.8 | 381 | 2 | -0.36 | 121.8 | 15.39 | 33.61 | 49 |
| ally_09_a_second_signature | 7327 | 36.64 | 3643 | 3684 | 49.7 | 0 | 0 | -0.99 | 108.8 | 7.65 | 15.47 | 23.12 |
| ally_10_the_free_vote | 11186 | 55.94 | 6417 | 4766 | 57.4 | 0 | 3 | 0 | 75.8 | 12.96 | 26.15 | 39.11 |
| ally_11_is_a_grid_armed | 7296 | 36.5 | 3531 | 3762 | 48.4 | 0 | 3 | 2.25 | 170 | 10.68 | 21.26 | 31.94 |
| ally_12_forty_observers | 5389 | 26.95 | 597 | 4791 | 11.1 | 0 | 1 | -1.99 | 183.6 | 12.54 | 26.9 | 39.43 |
| ally_13_two_of_eleven | 5269 | 26.35 | 3252 | 2015 | 61.7 | 0 | 2 | -1.16 | 169.5 | 14.11 | 24.55 | 38.66 |
| ally_14_the_council_voted | 1802 | 9.01 | 1408 | 394 | 78.1 | 0 | 0 | 7.17 | 210.3 | 21.85 | 42.96 | 64.81 |
| ally_15_caldors_objection | 1789 | 8.95 | 988 | 801 | 55.2 | 87 | 0 | -0.21 | 190.2 | 18.6 | 37.5 | 56.1 |
| ally_16_inside_the_ring | 1585 | 7.93 | 292 | 1293 | 18.4 | 0 | 0 | -0.75 | 158.8 | 18.07 | 42.59 | 60.66 |
| ally_17_the_fourth_call | 1061 | 5.31 | 853 | 208 | 80.4 | 0 | 0 | 0 | 159.5 | 14.98 | 30.05 | 45.03 |
| ally_18_a_form_of_words | 276 | 1.38 | 176 | 100 | 63.8 | 0 | 0 | 3.24 | 327.6 | 12.18 | 24.4 | 36.58 |
| blockade_01_the_quarantine | 11195 | 55.98 | 5123 | 6072 | 45.8 | 0 | 0 | 2.29 | 31.4 | 7.72 | 15.93 | 23.65 |
| blockade_02_the_generals_line | 2754 | 13.77 | 311 | 2442 | 11.3 | 0 | 1 | 4.91 | 69.4 | 9.96 | 11.87 | 21.84 |
| blockade_03_the_ferry | 2164 | 10.83 | 1041 | 1119 | 48.2 | 108 | 4 | 3.44 | 184 | 14.94 | 29.83 | 44.77 |
| blockade_04_the_schedule | 5875 | 29.38 | 1194 | 4681 | 20.3 | 286 | 0 | 1.55 | 33.3 | 17.77 | 31.53 | 49.3 |
| blockade_05_the_manifest | 6071 | 30.36 | 752 | 5319 | 12.4 | 0 | 0 | -1.13 | 27.7 | 9.25 | 19.98 | 29.23 |
| blockade_08_the_ferry_line | 1002 | 5.01 | 281 | 721 | 28 | 61 | 0 | 1.74 | 207.9 | 22.44 | 37.62 | 60.06 |
| blockade_09_boarded | 682 | 3.41 | 168 | 514 | 24.6 | 0 | 0 | -0.06 | 86.5 | 17.42 | 37.73 | 55.15 |
| blockade_10_the_release | 1795 | 8.98 | 936 | 856 | 52.2 | 0 | 3 | 2.44 | 154 | 25.1 | 36.15 | 61.25 |
| blockade_06_the_word | 474 | 2.37 | 132 | 342 | 27.8 | 0 | 0 | 1.34 | 89.9 | 6.78 | 16.96 | 23.74 |
| blockade_14_the_first_hull | 2887 | 14.44 | 2049 | 837 | 71 | 134 | 1 | 8 | 89.5 | 23.69 | 35.13 | 58.82 |
| blockade_15_the_second_hull | 746 | 3.73 | 213 | 533 | 28.6 | 0 | 0 | 1.62 | 158.7 | 26.03 | 43.36 | 69.39 |
| blockade_17_hold_and_search | 938 | 4.69 | 32 | 906 | 3.4 | 0 | 0 | 2.16 | 83.6 | 6.39 | 16.13 | 22.52 |
| blockade_18_the_hole | 809 | 4.05 | 771 | 37 | 95.4 | 0 | 1 | 5.87 | 125.4 | 14.18 | 41.04 | 55.22 |
| blockade_12_the_call | 12067 | 60.34 | 11968 | 97 | 99.2 | 0 | 2 | -7.83 | 53.1 | 15.05 | 29.43 | 44.48 |
| blockade_16_eight_minutes | 1399 | 7 | 789 | 608 | 56.5 | 79 | 2 | -2.2 | 259.5 | 21.77 | 43.77 | 65.53 |
| blockade_21_the_formula | 13431 | 67.18 | 8208 | 5219 | 61.1 | 0 | 4 | -5.47 | 65.2 | 20.21 | 37.12 | 57.32 |
| blockade_11_the_queue | 2294 | 11.48 | 1807 | 487 | 78.8 | 0 | 0 | 0 | 137.7 | 12.45 | 19.57 | 32.02 |
| blockade_13_what_they_see | 1826 | 9.14 | 586 | 1238 | 32.1 | 0 | 2 | 0.71 | 175.3 | 13.69 | 34.12 | 47.82 |
| blockade_22_two_days | 233 | 1.17 | 164 | 69 | 70.4 | 0 | 0 | -3.17 | 326.5 | 19.88 | 37.72 | 57.6 |
| blockade_25_their_tankers | 1610 | 8.05 | 1478 | 132 | 91.8 | 0 | 0 | -8.99 | 285.6 | 18.21 | 31.2 | 49.42 |
| blockade_07_her_ships | 254 | 1.27 | 24 | 230 | 9.4 | 0 | 0 | 1.69 | 202.6 | 8.64 | 26.95 | 35.59 |
| blockade_19_the_carrier | 15 | 0.08 | 3 | 12 | 20 | 0 | 0 | 2.33 | 238.1 | 13.13 | 25.87 | 39 |
| blockade_20_thirty_one_days | 11 | 0.06 | 4 | 7 | 36.4 | 0 | 0 | 1.55 | 116 | 12.09 | 22.27 | 34.36 |
| blockade_26_the_order | 37 | 0.19 | 32 | 5 | 86.5 | 0 | 0 | -0.41 | 491.3 | 16.14 | 40.38 | 56.51 |
| blockade_23_two_numbers | 415 | 2.08 | 156 | 259 | 37.6 | 0 | 0 | 1.68 | 177.5 | 6.32 | 13.36 | 19.68 |
| blockade_24_eleven_days | 329 | 1.65 | 252 | 76 | 76.8 | 0 | 1 | 0 | 154.9 | 13.47 | 27.22 | 40.69 |
| bluff_01_the_shrug | 5802 | 28.88 | 1940 | 3836 | 33.6 | 283 | 26 | 11.46 | 72.9 | 29.57 | 47.88 | 77.45 |
| bluff_02_the_editorial | 5604 | 28.02 | 3060 | 2544 | 54.6 | 0 | 0 | 6.62 | 58.6 | 20.35 | 38.8 | 59.15 |
| bluff_03_the_ally | 11358 | 27.31 | 3441 | 2020 | 63 | 0 | 5897 | 5.06 | 65.4 | 21.3 | 22.59 | 43.89 |
| bluff_04_the_markets | 5597 | 28 | 2531 | 3066 | 45.2 | 0 | 0 | 8.04 | 64.8 | 19.9 | 38.78 | 58.68 |
| bluff_05_the_staff | 5583 | 27.89 | 2974 | 2602 | 53.3 | 260 | 7 | 7.94 | 72.5 | 28.48 | 50.33 | 78.81 |
| bluff_06_the_envoy | 5437 | 27.19 | 4653 | 784 | 85.6 | 0 | 0 | -1.92 | 45.9 | 15.24 | 33.65 | 48.89 |
| cyberew_01_resident | 7109 | 35.56 | 474 | 6634 | 6.7 | 0 | 1 | 1.87 | 38.8 | 4.66 | 15.51 | 20.17 |
| cyberew_02_liaison_sample | 3652 | 18.27 | 2212 | 1440 | 60.6 | 0 | 0 | 0 | 84.6 | 6.13 | 12.77 | 18.9 |
| cyberew_03_correlator_word | 1597 | 8 | 67 | 1529 | 4.2 | 102 | 1 | 0 | 141.8 | 6.19 | 8.99 | 15.18 |
| cyberew_04_dark_sector | 470 | 2.35 | 368 | 102 | 78.3 | 18 | 0 | 1.57 | 54.8 | 8.95 | 18.28 | 27.23 |
| cyberew_05_it_writes | 6583 | 32.92 | 5093 | 1490 | 77.4 | 349 | 0 | 1.88 | 54.1 | 6.8 | 15.25 | 22.05 |
| cyberew_06_consistent_with | 3533 | 17.68 | 1584 | 1946 | 44.9 | 0 | 3 | 3.15 | 187.7 | 9.77 | 23.66 | 33.43 |
| cyberew_07_working_hours | 12 | 0.06 | 10 | 2 | 83.3 | 0 | 0 | 3.5 | 91.6 | 6.08 | 17.67 | 23.75 |
| cyberew_08_the_purge | 1998 | 9.99 | 1582 | 414 | 79.3 | 0 | 2 | 2.09 | 182 | 5.62 | 11.32 | 16.94 |
| cyberew_09_what_it_asked | 397 | 1.99 | 44 | 352 | 11.1 | 0 | 1 | -0.8 | 180.7 | 8.72 | 25.26 | 33.98 |
| cyberew_10_reciprocity | 1 | 0.01 | 1 | 0 | 100 | 0 | 0 | 18 | 276 | 22 | 33 | 55 |
| cyberew_11_their_reading | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 12 | 202 | 16 | 37 | 53 |
| cyberew_12_day_twenty_nine | 3465 | 17.35 | 1213 | 2249 | 35 | 0 | 3 | 0 | 132.5 | 9.56 | 20.48 | 30.04 |
| cyberew_13_page_eleven | 198 | 0.99 | 198 | 0 | 100 | 0 | 0 | 0 | 178.6 | 12.18 | 32.49 | 44.67 |
| cyberew_14_paper_and_phone | 381 | 1.91 | 73 | 308 | 19.2 | 0 | 0 | 2.13 | 439.1 | 5.79 | 13.59 | 19.38 |
| cyberew_15_thirty_one_attempts | 110 | 0.55 | 46 | 64 | 41.8 | 0 | 0 | 0.91 | 1343.8 | 6.85 | 13.96 | 20.81 |
| cyberew_16_our_own_tool | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 0 | 44 | 4 | 17 | 21 |
| cyberew_17_written_not_seen | 2395 | 11.98 | 651 | 1743 | 27.2 | 0 | 1 | 1.47 | 182.2 | 9.4 | 21.3 | 30.7 |
| cyberew_18_the_tasking | 3201 | 16.01 | 1559 | 1637 | 48.8 | 0 | 5 | 2.87 | 219.2 | 8.02 | 16.54 | 24.56 |
| cyberew_19_the_hospitals | 1383 | 6.92 | 391 | 989 | 28.3 | 0 | 3 | 1.87 | 183.1 | 9.56 | 21.29 | 30.85 |
| cyberew_20_clean_build | 2358 | 11.8 | 137 | 2221 | 5.8 | 0 | 0 | 2.48 | 247.8 | 13.9 | 35.75 | 49.65 |
| cyberew_21_the_motion | 965 | 4.83 | 414 | 551 | 42.9 | 0 | 0 | -1.21 | 446.7 | 24.81 | 43.32 | 68.13 |
| debris_01_the_cloud | 7005 | 35.03 | 4081 | 2923 | 58.3 | 0 | 1 | 3.11 | 56.1 | 7.94 | 15.44 | 23.37 |
| debris_02_the_intercept | 13 | 0.07 | 0 | 13 | 0 | 1 | 0 | 0 | 59.2 | 3 | 21.46 | 24.46 |
| debris_03_six_birds | 3852 | 19.27 | 1710 | 2141 | 44.4 | 180 | 1 | 3.97 | 126.4 | 9.54 | 18.93 | 28.47 |
| debris_04_the_premium | 1357 | 6.8 | 481 | 876 | 35.4 | 0 | 0 | 3.18 | 240.4 | 11.33 | 12.69 | 24.02 |
| debris_05_the_catalogue | 5032 | 25.18 | 3288 | 1738 | 65.4 | 0 | 6 | 4.08 | 101.6 | 11.27 | 19.33 | 30.6 |
| debris_06_their_reply | 9969 | 49.85 | 9399 | 568 | 94.3 | 0 | 2 | 0.35 | 96.8 | 6.47 | 15.71 | 22.18 |
| debris_07_forty_one_delegations | 980 | 4.91 | 148 | 831 | 15.1 | 0 | 1 | 2.68 | 162.3 | 14.19 | 30.71 | 44.9 |
| debris_08_the_question_mark | 6 | 0.03 | 3 | 3 | 50 | 0 | 0 | 2.17 | 228.5 | 17.17 | 34.5 | 51.67 |
| debris_09_the_tug | 1722 | 8.62 | 1176 | 546 | 68.3 | 0 | 0 | 1.07 | 70.5 | 8.94 | 11.12 | 20.06 |
| debris_10_the_proposal | 3314 | 16.59 | 514 | 2796 | 15.5 | 0 | 4 | 2.93 | 306.3 | 16.61 | 39.13 | 55.74 |
| debris_11_calibrations | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 0 | 103 | 11 | 20 | 31 |
| debris_12_they_signed | 491 | 2.46 | 345 | 146 | 70.3 | 0 | 0 | -2.11 | 236.7 | 10.39 | 20.52 | 30.91 |
| debris_13_the_offer | 2389 | 11.96 | 396 | 1992 | 16.6 | 0 | 1 | 0 | 142.4 | 4.13 | 12.84 | 16.97 |
| debris_14_the_second_breakup | 3297 | 16.5 | 917 | 2380 | 27.8 | 167 | 0 | 3.24 | 301.3 | 15.86 | 30.53 | 46.38 |
| debris_15_the_glass_house | 2 | 0.01 | 0 | 2 | 0 | 0 | 0 | 0 | 40.5 | 6.5 | 22.5 | 29 |
| debris_16_supplier_or_combatant | 16 | 0.08 | 8 | 7 | 53.3 | 0 | 1 | 3.27 | 305.2 | 12.47 | 23.13 | 35.59 |
| debris_18_without_consensus | 6 | 0.03 | 3 | 3 | 50 | 0 | 0 | 3.33 | 193 | 11.83 | 23.67 | 35.5 |
| debris_19_the_bill | 2904 | 14.53 | 1458 | 1443 | 50.3 | 0 | 3 | 0 | 166.7 | 15.5 | 18.16 | 33.66 |
| debris_20_an_inch | 360 | 1.8 | 289 | 71 | 80.3 | 0 | 0 | -5.8 | 695.2 | 11.29 | 18.75 | 30.04 |
| debris_21_the_unwritten | 2467 | 12.34 | 1279 | 1186 | 51.9 | 0 | 2 | -1.78 | 296.3 | 15.03 | 30.16 | 45.19 |
| debris_22_two_events | 2426 | 12.16 | 642 | 1778 | 26.5 | 116 | 6 | 3.03 | 246.5 | 15.99 | 26.87 | 42.86 |
| defector_01_the_ferry | 7358 | 36.79 | 7092 | 265 | 96.4 | 0 | 1 | 0 | 34.4 | 1.13 | 3.09 | 4.22 |
| defector_02_the_embassy_gate | 4004 | 20.02 | 2711 | 1292 | 67.7 | 0 | 1 | 0 | 73.7 | 1.49 | 3.64 | 5.13 |
| defector_03_the_basement | 1636 | 8.19 | 973 | 659 | 59.6 | 76 | 4 | 2.4 | 191.6 | 7.31 | 15.99 | 23.3 |
| defector_04_lantern | 12719 | 63.61 | 4785 | 7928 | 37.6 | 0 | 6 | 2.47 | 92.2 | 7.97 | 17.51 | 25.48 |
| defector_05_the_exercise_order | 7960 | 39.82 | 7201 | 748 | 90.6 | 0 | 11 | 5.23 | 140.8 | 13.36 | 19.29 | 32.66 |
| defector_06_the_seam | 4304 | 21.53 | 3228 | 1074 | 75 | 0 | 2 | -1.83 | 115.8 | 10.21 | 18.92 | 29.13 |
| defector_07_nine_oclock | 2093 | 10.47 | 1012 | 1079 | 48.4 | 0 | 2 | 2.78 | 145.6 | 8.03 | 16.66 | 24.69 |
| defector_08_on_background | 41 | 0.21 | 10 | 31 | 24.4 | 0 | 0 | 3.95 | 251.3 | 8.93 | 18.32 | 27.24 |
| defector_09_everything_fits | 482 | 2.42 | 122 | 360 | 25.3 | 0 | 0 | 2.04 | 468.5 | 8.23 | 21.22 | 29.45 |
| defector_10_nine_days | 270 | 1.35 | 57 | 213 | 21.1 | 0 | 0 | 2.76 | 226.2 | 6.43 | 12.85 | 19.28 |
| defector_11_corroboration | 32 | 0.16 | 16 | 16 | 50 | 0 | 0 | 1.25 | 115.2 | 4.16 | 6.84 | 11 |
| defector_12_the_package | 31 | 0.16 | 22 | 9 | 71 | 0 | 0 | 0.81 | 97.8 | 5.77 | 10.1 | 15.87 |
| defector_13_seventy_two_hours | 2085 | 10.43 | 2050 | 34 | 98.4 | 0 | 1 | 0 | 123.1 | 2.06 | 9.68 | 11.74 |
| defector_14_absent_without_leave | 3185 | 15.93 | 2998 | 186 | 94.2 | 0 | 1 | -4.38 | 170 | 9.28 | 14.24 | 23.53 |
| defector_15_the_winter_colonel | 2611 | 13.07 | 2193 | 415 | 84.1 | 0 | 3 | 0 | 101.1 | 0.77 | 5.21 | 5.99 |
| defector_16_six_oclock | 3302 | 16.54 | 3013 | 282 | 91.4 | 160 | 7 | 5.79 | 166.8 | 9.22 | 12.72 | 21.94 |
| defector_17_tuesdays_assessment | 82 | 0.41 | 77 | 5 | 93.9 | 0 | 0 | 4.68 | 317.5 | 9.05 | 18.67 | 27.72 |
| defector_18_the_straits_garrison | 2080 | 10.42 | 354 | 1722 | 17.1 | 99 | 4 | 4.38 | 206.5 | 11.59 | 17.06 | 28.65 |
| defector_19_the_guest | 1187 | 5.94 | 398 | 788 | 33.6 | 0 | 1 | 0.93 | 94.5 | 4.92 | 6.61 | 11.53 |
| defector_20_page_forty | 2267 | 11.35 | 679 | 1584 | 30 | 124 | 4 | 3.01 | 238.5 | 10.32 | 25.1 | 35.42 |
| defector_21_the_nineteenth | 1940 | 9.7 | 857 | 1082 | 44.2 | 0 | 1 | -0.75 | 226.9 | 16.56 | 34.73 | 51.29 |
| defector_22_courtesies | 683 | 3.42 | 341 | 341 | 50 | 0 | 1 | -1.62 | 220.9 | 10.65 | 21.55 | 32.19 |
| dom_coa_01_the_order_book | 2736 | 13.68 | 441 | 2295 | 16.1 | 0 | 0 | 0 | 46.3 | 9.73 | 18.93 | 28.66 |
| dom_coa_02_allies_or_customers | 2757 | 13.79 | 1749 | 1008 | 63.4 | 0 | 0 | 0 | 34.5 | 8.28 | 16.09 | 24.37 |
| dom_coa_03_untested | 2720 | 13.6 | 1213 | 1507 | 44.6 | 0 | 0 | 1.25 | 32.6 | 9.09 | 18.38 | 27.47 |
| dom_coa_04_the_dividend | 2695 | 13.48 | 1863 | 832 | 69.1 | 0 | 0 | 0 | 30.1 | 7.55 | 15.97 | 23.51 |
| dom_coa_05_the_component | 1698 | 8.49 | 1351 | 347 | 79.6 | 96 | 0 | 0 | 50.3 | 5.9 | 10.89 | 16.79 |
| dom_coa_06_the_lease | 13 | 0.07 | 9 | 4 | 69.2 | 0 | 0 | 0 | 58.5 | 5.62 | 11.31 | 16.92 |
| dom_coa_07_the_drills | 1424 | 7.12 | 1294 | 130 | 90.9 | 0 | 0 | 0.09 | 38.6 | 3.92 | 7.1 | 11.02 |
| dom_coa_08_two_million_shareholders | 1724 | 8.62 | 1169 | 555 | 67.8 | 0 | 0 | 0 | 50.9 | 10.19 | 14.92 | 25.11 |
| dom_coa_09_the_switch | 1634 | 8.17 | 538 | 1096 | 32.9 | 0 | 0 | 2.92 | 140.7 | 10.19 | 24.02 | 34.21 |
| dom_coa_10_museum_with_a_budget | 1676 | 8.38 | 1208 | 468 | 72.1 | 0 | 0 | 3.34 | 122.6 | 13.25 | 25.15 | 38.39 |
| dom_coa_11_the_tender | 1591 | 7.96 | 1085 | 506 | 68.2 | 0 | 0 | 0 | 135.8 | 10.31 | 19.7 | 30.01 |
| dom_coa_12_the_relay_layer | 1603 | 8.02 | 259 | 1344 | 16.2 | 0 | 0 | 0.36 | 90.2 | 2.47 | 14.67 | 17.15 |
| dom_coa_13_nine_thousand | 1229 | 6.16 | 806 | 420 | 65.7 | 0 | 3 | 3.97 | 247.8 | 14.87 | 23.79 | 38.66 |
| dom_coa_14_the_open | 1387 | 5.86 | 1303 | 84 | 93.9 | 76 | 0 | 0 | 154.3 | 7.79 | 5.72 | 13.51 |
| dom_coa_15_dual_use | 1123 | 5.62 | 687 | 436 | 61.2 | 0 | 0 | 0 | 287.2 | 12.18 | 19.86 | 32.03 |
| dom_coa_16_thirty_per_cent | 979 | 4.89 | 323 | 656 | 33 | 0 | 0 | 0 | 164 | 9.36 | 23.87 | 33.23 |
| dom_fed_01_two_bulletins | 2718 | 13.59 | 1553 | 1165 | 57.1 | 0 | 0 | 0 | 27.4 | 2.99 | 5.99 | 8.97 |
| dom_fed_02_sixty_one_days | 2624 | 13.12 | 1591 | 1033 | 60.6 | 0 | 0 | 0 | 37.7 | 9.56 | 17.94 | 27.5 |
| dom_fed_03_accreditation | 2694 | 13.47 | 1919 | 775 | 71.2 | 0 | 0 | 0 | 19.7 | 2.87 | 7 | 9.87 |
| dom_fed_04_the_savings_bank | 1558 | 7.79 | 800 | 758 | 51.3 | 0 | 0 | 0 | 100.9 | 6.37 | 11.26 | 17.63 |
| dom_fed_05_the_corridor | 1676 | 8.38 | 1533 | 143 | 91.5 | 0 | 0 | 0 | 71.1 | 13.16 | 22.05 | 35.21 |
| dom_fed_06_the_figures | 1107 | 5.54 | 43 | 1064 | 3.9 | 0 | 0 | 0 | 50.9 | 3.09 | 10.51 | 13.6 |
| dom_fed_07_the_straits_price | 1475 | 7.38 | 1145 | 330 | 77.6 | 0 | 0 | 0 | 80.6 | 8.99 | 14.63 | 23.62 |
| dom_fed_08_voskra | 1475 | 7.38 | 1275 | 199 | 86.5 | 64 | 1 | 0.14 | 112.7 | 8.58 | 18.77 | 27.35 |
| dom_fed_09_two_hundred_letters | 1463 | 7.32 | 897 | 565 | 61.4 | 0 | 1 | 0 | 136.9 | 6.04 | 11.87 | 17.91 |
| dom_fed_10_ninety_days | 258 | 1.29 | 85 | 172 | 33.1 | 0 | 1 | 0 | 128.4 | 9.27 | 20.45 | 29.72 |
| dom_fed_11_three_hundred_names | 1475 | 7.38 | 411 | 1064 | 27.9 | 0 | 0 | 0 | 174.4 | 2.76 | 6.2 | 8.97 |
| dom_fed_12_the_word | 974 | 4.88 | 519 | 451 | 53.5 | 0 | 4 | 2.63 | 226.3 | 8.36 | 16.61 | 24.97 |
| dom_fed_13_fourteen_billion | 926 | 4.64 | 411 | 514 | 44.4 | 0 | 1 | 1.71 | 237.5 | 8.81 | 18.96 | 27.77 |
| dom_fed_14_the_second_bulletin | 929 | 4.64 | 115 | 812 | 12.4 | 51 | 2 | 0 | 118 | 8.42 | 12.55 | 20.98 |
| dom_fed_15_the_toast | 923 | 4.62 | 688 | 235 | 74.5 | 0 | 0 | 2.69 | 213.7 | 10.49 | 20.17 | 30.66 |
| dom_fed_16_the_yards | 2559 | 12.8 | 574 | 1983 | 22.4 | 0 | 2 | 0 | 99.6 | 9.6 | 28.56 | 38.16 |
| dom_rep_01_the_tracker | 2735 | 13.68 | 1846 | 889 | 67.5 | 0 | 0 | 0 | 36 | 4.65 | 10.04 | 14.68 |
| dom_rep_02_eight_minutes | 2833 | 14.17 | 845 | 1988 | 29.8 | 0 | 0 | 0 | 49 | 8.51 | 16.25 | 24.77 |
| dom_rep_03_the_arden_club | 2736 | 13.68 | 2058 | 678 | 75.2 | 0 | 0 | 0.76 | 32.8 | 6.53 | 12.06 | 18.59 |
| dom_rep_04_the_dockers | 2646 | 13.23 | 2184 | 462 | 82.5 | 0 | 0 | 0 | 47 | 7.41 | 12.96 | 20.37 |
| dom_rep_05_day_twelve | 1808 | 9.04 | 1766 | 42 | 97.7 | 0 | 0 | 0 | 65.4 | 11.93 | 12.44 | 24.37 |
| dom_rep_06_the_premiums | 1739 | 8.7 | 1615 | 124 | 92.9 | 0 | 0 | 0 | 74.3 | 9.02 | 11.83 | 20.85 |
| dom_rep_07_the_letter_of_intent | 1641 | 8.21 | 1304 | 337 | 79.5 | 0 | 0 | 1.61 | 98.4 | 10.71 | 18.89 | 29.61 |
| dom_rep_08_say_it_aloud | 607 | 3.04 | 104 | 501 | 17.2 | 0 | 2 | 0.01 | 176.5 | 5.84 | 15.88 | 21.72 |
| dom_rep_09_the_focus_group | 1684 | 8.43 | 1158 | 524 | 68.8 | 66 | 2 | 1.1 | 310.2 | 10.11 | 20.45 | 30.56 |
| dom_rep_10_the_steps | 1670 | 8.35 | 1625 | 45 | 97.3 | 0 | 0 | 0 | 83.6 | 5.98 | 13.38 | 19.36 |
| dom_rep_11_twenty_two | 1657 | 8.29 | 128 | 1529 | 7.7 | 0 | 0 | 0 | 94.2 | 9.43 | 19.63 | 29.06 |
| dom_rep_12_the_runways | 617 | 3.09 | 191 | 426 | 31 | 0 | 0 | 0 | 129 | 9.23 | 19.17 | 28.4 |
| dom_rep_13_the_list | 1231 | 6.16 | 386 | 842 | 31.4 | 59 | 3 | 4.13 | 269.6 | 11.31 | 21.53 | 32.84 |
| dom_rep_14_the_truce | 2085 | 10.43 | 1046 | 1039 | 50.2 | 0 | 0 | 0 | 185 | 12.33 | 25.14 | 37.47 |
| dom_rep_15_two_capitals | 1333 | 6.67 | 1081 | 251 | 81.2 | 0 | 1 | 0.19 | 228.4 | 9.96 | 22.51 | 32.48 |
| dom_rep_16_the_open_letter | 1203 | 6.02 | 958 | 244 | 79.7 | 0 | 1 | 0.82 | 211.1 | 8.34 | 17.67 | 26.01 |
| falarm_01_one_track | 11452 | 57.27 | 2325 | 9127 | 20.3 | 543 | 0 | 1.23 | 17.1 | 5.44 | 15.01 | 20.45 |
| falarm_02_real_launch | 7489 | 37.45 | 4013 | 3476 | 53.6 | 0 | 0 | 6.18 | 30.6 | 14.2 | 24.99 | 39.19 |
| falarm_03_ghost_track | 3961 | 19.81 | 3564 | 397 | 90 | 0 | 0 | -1.48 | 18.6 | 5.45 | 13.18 | 18.63 |
| falarm_04_the_moon | 3519 | 17.6 | 1254 | 2265 | 35.6 | 0 | 0 | -0.07 | 22.9 | 4.61 | 10.39 | 14.99 |
| falarm_05_straits_profile | 3125 | 15.63 | 2498 | 627 | 79.9 | 157 | 0 | 1.62 | 37.7 | 7.08 | 17.39 | 24.47 |
| falarm_06_boat_confirmed | 1952 | 9.76 | 681 | 1271 | 34.9 | 0 | 0 | 4.67 | 63.5 | 14.08 | 33.77 | 47.85 |
| falarm_07_sounding_rocket | 1165 | 5.83 | 1015 | 150 | 87.1 | 0 | 0 | -2.22 | 44.5 | 8.6 | 17.69 | 26.29 |
| falarm_08_exercise_window | 1839 | 9.2 | 239 | 1599 | 13 | 98 | 1 | 1.2 | 89.5 | 5.18 | 19.45 | 24.63 |
| falarm_09_outside_the_box | 1040 | 5.2 | 116 | 922 | 11.2 | 44 | 2 | 7.86 | 173.4 | 22.56 | 23.16 | 45.72 |
| falarm_10_training_tape | 774 | 3.87 | 504 | 270 | 65.1 | 0 | 0 | -0.74 | 97.4 | 8.35 | 16.55 | 24.9 |
| falarm_11_high_cloud | 1064 | 5.32 | 914 | 149 | 86 | 53 | 1 | 0.94 | 409 | 4.81 | 16.11 | 20.92 |
| falarm_12_range_hot | 615 | 3.08 | 195 | 420 | 31.7 | 0 | 0 | 1.47 | 551.5 | 6.03 | 14.25 | 20.28 |
| falarm_13_sun_glint | 423 | 2.12 | 279 | 144 | 66 | 0 | 0 | -0.11 | 275.2 | 6.68 | 13.43 | 20.12 |
| falarm_14_six_tracks | 4038 | 20.23 | 1240 | 2784 | 30.8 | 190 | 14 | 7.52 | 291.4 | 15.7 | 28.79 | 44.48 |
| falarm_15_salvo_notified | 1876 | 9.39 | 1735 | 140 | 92.5 | 0 | 1 | -4.01 | 295.3 | 14.47 | 45.01 | 59.48 |
| falarm_16_reflection | 1856 | 9.28 | 1369 | 487 | 73.8 | 0 | 0 | -0.93 | 307 | 9.5 | 20.68 | 30.17 |
| falarm_17_three_keys | 152 | 0.76 | 53 | 99 | 34.9 | 0 | 0 | -0.7 | 522.1 | 6.38 | 14.76 | 21.14 |
| falarm_18_the_doctrine | 35 | 0.18 | 21 | 14 | 60 | 0 | 0 | 1.57 | 491.7 | 9.2 | 18.71 | 27.91 |
| falarm_19_unsleeping | 1220 | 6.1 | 83 | 1137 | 6.8 | 0 | 0 | -0.93 | 233.5 | 5.09 | 21.96 | 27.05 |
| falarm_20_measured | 512 | 2.56 | 446 | 66 | 87.1 | 0 | 0 | -0.39 | 122.9 | 4.02 | 13.27 | 17.29 |
| falarm_21_sirens | 584 | 2.92 | 345 | 238 | 59.2 | 0 | 1 | 0 | 394.3 | 5.68 | 10.54 | 16.22 |
| falarm_22_jonah | 5322 | 26.61 | 4704 | 618 | 88.4 | 0 | 0 | -0.88 | 81 | 4 | 9.04 | 13.04 |
| falarm_23_poisoned_board | 4706 | 23.54 | 1134 | 3571 | 24.1 | 0 | 1 | 2.89 | 169.5 | 9.87 | 21.29 | 31.15 |
| falarm_24_the_pattern | 5846 | 29.25 | 2960 | 2883 | 50.7 | 0 | 3 | 2.61 | 197.2 | 14.6 | 29.81 | 44.41 |
| falarm_25_post_mortem | 2861 | 14.32 | 26 | 2833 | 0.9 | 0 | 2 | 0.03 | 158.8 | 9.01 | 29.34 | 38.34 |
| falarm_26_the_call | 2687 | 13.44 | 2287 | 396 | 85.2 | 0 | 4 | -4.96 | 294.2 | 20.84 | 39.05 | 59.89 |
| fp_cascade_01_same_hour | 11485 | 57.43 | 8348 | 3137 | 72.7 | 0 | 0 | 5.32 | 130 | 14.02 | 16.71 | 30.73 |
| fp_cascade_02_the_physics | 3126 | 15.63 | 1704 | 1422 | 54.5 | 0 | 0 | 1.19 | 107.5 | 10.75 | 10.87 | 21.61 |
| fp_cascade_03_the_dark_board | 8088 | 40.44 | 1663 | 6425 | 20.6 | 382 | 0 | 0.73 | 107.6 | 12.57 | 32.6 | 45.18 |
| fp_cascade_04_consistent_with | 8122 | 40.61 | 1026 | 7096 | 12.6 | 0 | 0 | -1.24 | 97.2 | 17.2 | 29.3 | 46.49 |
| fp_cascade_07_the_building | 713 | 3.57 | 671 | 42 | 94.1 | 0 | 0 | 6.07 | 103.2 | 16.53 | 31.33 | 47.87 |
| fp_cascade_08a_the_operator | 34 | 0.17 | 34 | 0 | 100 | 0 | 0 | 6.65 | 123.1 | 11.62 | 34.85 | 46.47 |
| fp_cascade_08b_the_shrug | 271 | 1.36 | 251 | 20 | 92.6 | 0 | 0 | 5.61 | 107.8 | 11.86 | 29.66 | 41.52 |
| fp_cascade_09_the_call | 8507 | 42.54 | 525 | 7982 | 6.2 | 0 | 0 | 5.27 | 137.1 | 8.74 | 25.01 | 33.74 |
| fp_cascade_11_the_blind_minute | 1561 | 7.81 | 73 | 1488 | 4.7 | 73 | 0 | 17.03 | 170.6 | 27.79 | 47.06 | 74.85 |
| fp_cascade_12_the_pause | 244 | 1.22 | 8 | 236 | 3.3 | 0 | 0 | -7.24 | 126.4 | 11.68 | 22.19 | 33.88 |
| fp_cascade_13_the_name | 8900 | 44.5 | 2231 | 6669 | 25.1 | 0 | 0 | 4.88 | 175.6 | 14.34 | 24.95 | 39.29 |
| fp_cascade_14_the_long_night | 1140 | 5.7 | 795 | 345 | 69.7 | 0 | 0 | 10.69 | 246.8 | 23.42 | 30.81 | 54.23 |
| fp_intercept_01_one_bird | 15073 | 75.36 | 11689 | 3384 | 77.5 | 773 | 0 | 3.99 | 81.5 | 19.44 | 32.36 | 51.8 |
| fp_intercept_02_splash | 6378 | 31.89 | 762 | 5616 | 11.9 | 0 | 0 | -2.52 | 57.6 | 15.52 | 33.37 | 48.9 |
| fp_intercept_03_two_misses | 5204 | 26.02 | 4378 | 826 | 84.1 | 0 | 0 | 6.7 | 80.2 | 18.41 | 34.54 | 52.94 |
| fp_intercept_04a_the_layer_you_did_not_use | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | 8 | 96 | 22 | 40 | 62 |
| fp_intercept_04b_splash_zone | 3374 | 16.87 | 1468 | 1906 | 43.5 | 0 | 0 | 2.53 | 67.8 | 15.63 | 32.2 | 47.84 |
| fp_intercept_05_the_line | 8344 | 41.72 | 6594 | 1750 | 79 | 0 | 0 | -4.16 | 68.8 | 17.36 | 33.69 | 51.04 |
| fp_intercept_06_the_package | 8269 | 41.35 | 3003 | 5266 | 36.3 | 421 | 0 | 1.45 | 112.9 | 21.77 | 46.92 | 68.68 |
| fp_intercept_07_the_morning_after | 11860 | 59.3 | 3298 | 8562 | 27.8 | 0 | 0 | -7.64 | 49 | 16.07 | 21.26 | 37.33 |
| fp_intercept_08_second_track | 1924 | 9.62 | 105 | 1819 | 5.5 | 105 | 0 | 17.87 | 137.1 | 32.02 | 37.78 | 69.8 |
| fp_intercept_09_the_question | 919 | 4.6 | 917 | 2 | 99.8 | 0 | 0 | -2.21 | 162.1 | 17.51 | 35.91 | 53.42 |
| fp_intercept_fa_01_eleven_tracks | 1214 | 6.05 | 881 | 333 | 72.6 | 0 | 0 | 5.13 | 363 | 14.16 | 22.54 | 36.7 |
| fp_intercept_fa_02_the_doctrine | 5 | 0.03 | 1 | 4 | 20 | 1 | 0 | 11.8 | 187.2 | 21.8 | 47 | 68.8 |
| fp_intercept_fa_03_the_honest_number | 1056 | 5.28 | 228 | 828 | 21.6 | 51 | 0 | 8.94 | 310.7 | 19.55 | 26.63 | 46.18 |
| fp_intercept_fa_04_the_tape | 842 | 4.21 | 449 | 393 | 53.3 | 0 | 0 | -6.64 | 268.1 | 14.49 | 18.84 | 33.33 |
| fp_intercept_fa_05_three_keys | 22 | 0.11 | 6 | 16 | 27.3 | 0 | 0 | 5 | 671.3 | 11.68 | 25.64 | 37.32 |
| fp_intercept_fa_06_the_sirens | 56 | 0.28 | 12 | 44 | 21.4 | 0 | 0 | -6.36 | 713.8 | 13.88 | 20.54 | 34.41 |
| fp_line_01_the_hail | 15771 | 78.86 | 12701 | 3070 | 80.5 | 795 | 0 | 5.64 | 63.6 | 18.59 | 35.6 | 54.19 |
| fp_line_02_on_deck | 6892 | 34.46 | 583 | 6309 | 8.5 | 0 | 0 | -3.15 | 63.8 | 14.54 | 34.19 | 48.72 |
| fp_line_03_warned_off | 5641 | 28.21 | 5308 | 333 | 94.1 | 0 | 0 | 5.78 | 89 | 16.08 | 30.49 | 46.57 |
| fp_line_05a_the_carrier | 35 | 0.18 | 30 | 5 | 85.7 | 0 | 0 | 7.26 | 225.4 | 29.66 | 58.11 | 87.77 |
| fp_line_05b_the_chart | 3020 | 15.1 | 2756 | 264 | 91.3 | 0 | 0 | 7.23 | 77.9 | 19.39 | 41.65 | 61.04 |
| fp_line_06_the_seizure | 570 | 2.85 | 565 | 5 | 99.1 | 0 | 0 | -4.93 | 100 | 14.45 | 38.01 | 52.46 |
| fp_line_07_the_photographs | 6874 | 34.37 | 508 | 6366 | 7.4 | 0 | 0 | -6.18 | 57.7 | 14.81 | 24.08 | 38.89 |
| fp_line_08_hands_on_the_switch | 8023 | 40.12 | 1636 | 6387 | 20.4 | 406 | 0 | 3.67 | 74.9 | 22.05 | 26.7 | 48.75 |
| fp_line_09_the_straits | 4644 | 23.22 | 975 | 3669 | 21 | 0 | 0 | 3.5 | 94.1 | 31.16 | 40.32 | 71.47 |
| fp_line_10a_the_second_line | 455 | 2.28 | 252 | 203 | 55.4 | 0 | 0 | -1.47 | 152 | 21.1 | 44.06 | 65.16 |
| fp_line_10b_the_line_tomorrow | 146 | 0.73 | 64 | 82 | 43.8 | 0 | 0 | -3.42 | 47.8 | 20.86 | 40.77 | 61.63 |
| fp_line_11_the_morning_count | 2430 | 12.15 | 1082 | 1348 | 44.5 | 0 | 0 | 0.68 | 115.1 | 12.64 | 26.02 | 38.66 |
| fp_midnight_01_one_chair | 11979 | 59.9 | 9828 | 2151 | 82 | 0 | 0 | 2.59 | 156.7 | 9.9 | 19.94 | 29.84 |
| fp_midnight_02_their_hour | 4040 | 20.2 | 1590 | 2450 | 39.4 | 0 | 0 | 2.78 | 175.6 | 7.53 | 15.4 | 22.93 |
| fp_midnight_03_our_hour | 2345 | 11.73 | 766 | 1579 | 32.7 | 0 | 0 | 3.3 | 179.7 | 11.68 | 23.78 | 35.46 |
| fp_midnight_04_full_readiness | 5363 | 26.82 | 5033 | 330 | 93.8 | 0 | 0 | 0.5 | 60.2 | 7.96 | 23.1 | 31.06 |
| fp_midnight_05_four_minutes | 7362 | 36.81 | 3030 | 4332 | 41.2 | 0 | 0 | -0.34 | 131.1 | 18.98 | 35.77 | 54.75 |
| fp_midnight_06_the_word_any | 65 | 0.33 | 62 | 3 | 95.4 | 0 | 0 | 4.85 | 315.3 | 10.34 | 27.14 | 37.48 |
| fp_midnight_07_two_statements | 169 | 0.85 | 162 | 7 | 95.9 | 0 | 0 | 2.18 | 215.8 | 6.42 | 18.93 | 25.35 |
| fp_midnight_08_two_readings | 138 | 0.69 | 69 | 69 | 50 | 0 | 0 | 0.43 | 101.9 | 7.09 | 14.55 | 21.64 |
| fp_midnight_09_the_protocol | 250 | 1.25 | 214 | 36 | 85.6 | 0 | 0 | -2.73 | 162.9 | 9.42 | 15.59 | 25.01 |
| fp_midnight_10_the_hour_after | 6739 | 33.7 | 5119 | 1620 | 76 | 315 | 0 | 9.11 | 220.4 | 27.24 | 42.94 | 70.18 |
| fp_midnight_11_nine_minutes | 3052 | 15.26 | 457 | 2595 | 15 | 154 | 0 | 4.39 | 223.8 | 18.5 | 50.67 | 69.17 |
| fp_midnight_12_have_you_eaten | 3018 | 15.09 | 77 | 2941 | 2.6 | 0 | 0 | 2.04 | 83.2 | 6.04 | 13.68 | 19.72 |
| fp_midnight_13_the_record | 2849 | 14.25 | 1366 | 1483 | 47.9 | 0 | 0 | -2.43 | 137.8 | 9.99 | 20.5 | 30.5 |
| fp_midnight_14_they_blinked | 1655 | 8.28 | 79 | 1576 | 4.8 | 0 | 0 | -6.57 | 117.6 | 11.84 | 20.91 | 32.75 |
| fp_summit_01_the_lake_door | 8486 | 42.43 | 1923 | 6563 | 22.7 | 0 | 0 | 0.55 | 166.2 | 4.78 | 12.83 | 17.6 |
| fp_summit_02_the_photographs | 94 | 0.47 | 15 | 79 | 16 | 0 | 0 | -0.78 | 178.3 | 7.95 | 21.04 | 28.99 |
| fp_summit_03_flatbeds | 63 | 0.32 | 54 | 9 | 85.7 | 0 | 0 | 2.52 | 209.7 | 11.17 | 22.13 | 33.3 |
| fp_summit_04_candles | 995 | 4.97 | 813 | 182 | 81.7 | 0 | 0 | 0.18 | 126.7 | 17.01 | 31.71 | 48.72 |
| fp_summit_05_the_folder | 3063 | 15.32 | 2664 | 399 | 87 | 0 | 0 | 0.54 | 216.6 | 7.22 | 17.76 | 24.99 |
| fp_summit_06_not_a_knife | 8329 | 41.65 | 2088 | 6241 | 25.1 | 421 | 0 | 1.96 | 216.9 | 10.22 | 21.32 | 31.54 |
| fp_summit_07_in_writing | 415 | 2.08 | 67 | 348 | 16.1 | 0 | 0 | 0.18 | 183.3 | 7.83 | 25.35 | 33.18 |
| fp_summit_08_her_paragraph | 357 | 1.79 | 222 | 135 | 62.2 | 0 | 0 | -3.35 | 124.4 | 11.94 | 21.19 | 33.13 |
| fp_summit_09_the_lake_steps | 60 | 0.3 | 52 | 8 | 86.7 | 0 | 0 | -2.07 | 289.6 | 9.83 | 13.67 | 23.5 |
| fp_summit_10_four_lines | 25 | 0.13 | 22 | 3 | 88 | 0 | 0 | -0.48 | 324.8 | 9.76 | 15.36 | 25.12 |
| fp_summit_11_both_sides | 2087 | 10.44 | 1051 | 1036 | 50.4 | 0 | 0 | -2.62 | 230.8 | 10.39 | 23.05 | 33.44 |
| fp_summit_12_the_third_chair | 6148 | 30.74 | 3120 | 3028 | 50.7 | 0 | 0 | 0.25 | 197.4 | 9.57 | 19.07 | 28.64 |
| fp_summit_13_witness | 3101 | 15.51 | 1297 | 1804 | 41.8 | 0 | 0 | -2.25 | 154.8 | 8.9 | 16.51 | 25.41 |
| fp_summit_14_the_cars | 5051 | 25.26 | 1689 | 3362 | 33.4 | 236 | 0 | 4.24 | 215.1 | 12.59 | 18.77 | 31.36 |
| press_01_the_opening_bell | 8095 | 40.48 | 6555 | 1540 | 81 | 0 | 0 | 0 | 32.6 | 6.12 | 6.97 | 13.09 |
| press_02_the_first_question | 8254 | 41.27 | 2183 | 6071 | 26.4 | 413 | 0 | 0 | 22.8 | 4.58 | 8.01 | 12.58 |
| press_03_the_loyal_opposition | 8199 | 41 | 3595 | 4604 | 43.8 | 0 | 0 | 0 | 24 | 5.32 | 11.07 | 16.39 |
| press_04_three_twenty | 8338 | 34.73 | 8306 | 32 | 99.6 | 0 | 0 | -1.96 | 41.6 | 1.97 | 4.02 | 6 |
| press_05_the_council_mood | 10397 | 41.26 | 2898 | 7498 | 27.9 | 0 | 1 | 0.41 | 50.8 | 6.96 | 15.35 | 22.31 |
| press_06_what_you_may_do | 8089 | 40.45 | 4643 | 3445 | 57.4 | 0 | 1 | 1.73 | 40.8 | 5.17 | 10.06 | 15.23 |
| press_07_the_generals_patience | 8224 | 41.12 | 4152 | 4072 | 50.5 | 408 | 0 | 1.54 | 38.4 | 10.2 | 20.33 | 30.52 |
| press_08_the_call_from_varga | 8277 | 41.39 | 5152 | 3124 | 62.3 | 0 | 1 | 0 | 34.3 | 5.43 | 11.18 | 16.62 |
| press_09_amberline_asks | 8152 | 40.76 | 6007 | 2144 | 73.7 | 0 | 1 | 1.48 | 35.5 | 5.05 | 10.11 | 15.15 |
| press_10_the_square | 8129 | 40.65 | 2006 | 6123 | 24.7 | 0 | 0 | 0 | 26.6 | 5.84 | 13.25 | 19.09 |
| press_11_the_currency | 5944 | 25.57 | 4891 | 1052 | 82.3 | 0 | 1 | 0 | 81.2 | 7.81 | 11.65 | 19.47 |
| press_12_the_leak | 5150 | 25.75 | 2949 | 2201 | 57.3 | 254 | 0 | 0 | 46.7 | 4.54 | 8.97 | 13.51 |
| press_13_the_confidence_motion | 5053 | 25.27 | 265 | 4787 | 5.2 | 0 | 1 | 0 | 52 | 8.45 | 11.01 | 19.45 |
| press_14_the_hospital | 4182 | 20.91 | 4106 | 75 | 98.2 | 0 | 1 | 0.02 | 61 | 2.98 | 4.09 | 7.07 |
| press_15_the_colonels_column | 5167 | 25.84 | 1194 | 3972 | 23.1 | 0 | 1 | 0 | 48.9 | 7.2 | 13.85 | 21.05 |
| press_16_the_lawyer_at_midnight | 5164 | 25.82 | 4847 | 316 | 93.9 | 0 | 1 | 0 | 62.4 | 4.09 | 9.35 | 13.43 |
| press_17_the_joint_statement | 5520 | 27.6 | 2998 | 2521 | 54.3 | 0 | 1 | 1.65 | 77.2 | 7.98 | 15.93 | 23.91 |
| press_18_the_rumour | 4761 | 21.04 | 4004 | 757 | 84.1 | 0 | 0 | 0 | 55.4 | 0.96 | 6.99 | 7.95 |
| press_19_caldor_asks | 5289 | 26.45 | 617 | 4670 | 11.7 | 0 | 2 | 0.75 | 62.6 | 6.51 | 21.38 | 27.9 |
| press_20_the_hunger_strike | 5111 | 25.56 | 4430 | 680 | 86.7 | 0 | 1 | 0 | 58.9 | 7.09 | 14.7 | 21.79 |
| press_21_the_bond_auction | 5735 | 24.18 | 5658 | 75 | 98.7 | 0 | 2 | 0 | 99.6 | 6.3 | 7.53 | 13.83 |
| press_22_the_interview | 4663 | 23.32 | 3178 | 1484 | 68.2 | 227 | 1 | 0.35 | 147.2 | 9.24 | 18.14 | 27.38 |
| press_23_the_floor | 4826 | 24.13 | 3068 | 1751 | 63.7 | 0 | 7 | 0 | 111.6 | 8.99 | 18 | 26.99 |
| press_24_the_birthday | 3968 | 19.84 | 3945 | 23 | 99.4 | 0 | 0 | -1.98 | 72.2 | 2.98 | 4.07 | 7.05 |
| press_25_the_minute | 4772 | 23.87 | 2371 | 2398 | 49.7 | 0 | 3 | 1.68 | 116.3 | 8.25 | 16.93 | 25.18 |
| press_26_the_detainees | 4775 | 23.88 | 978 | 3792 | 20.5 | 0 | 5 | 0 | 122.3 | 5.25 | 9.92 | 15.17 |
| press_27_the_resignation | 4769 | 23.86 | 3464 | 1305 | 72.6 | 227 | 0 | 5.5 | 213.5 | 19.07 | 36.89 | 55.96 |
| press_28_the_compact_vote | 5118 | 25.59 | 2423 | 2692 | 47.4 | 0 | 3 | 0.58 | 148.9 | 10.72 | 18.67 | 29.39 |
| press_29_vestria_asks | 4801 | 24.01 | 775 | 4025 | 16.1 | 0 | 1 | 1.81 | 119.8 | 6.61 | 18.06 | 24.67 |
| press_30_the_march | 4733 | 23.68 | 2162 | 2569 | 45.7 | 0 | 2 | 0.56 | 136.3 | 11.3 | 23.2 | 34.5 |
| press_31_the_run | 3884 | 16.28 | 3140 | 737 | 81 | 212 | 7 | 0 | 292.7 | 13.51 | 20.51 | 34.02 |
| press_32_the_final_edition | 3275 | 16.39 | 2695 | 573 | 82.5 | 163 | 7 | 0.69 | 255.3 | 9.19 | 22.45 | 31.64 |
| press_33_the_unity_government | 3326 | 16.64 | 1189 | 2136 | 35.8 | 0 | 1 | 0 | 151.3 | 12.15 | 21.16 | 33.31 |
| press_34_the_suitcase | 3281 | 16.41 | 1 | 3280 | 0 | 0 | 0 | -1 | 99.4 | 2.98 | 12.51 | 15.49 |
| press_35_the_list | 3241 | 16.23 | 2506 | 731 | 77.4 | 0 | 4 | 0.8 | 213.9 | 10.92 | 20.95 | 31.87 |
| press_36_the_delegation | 3228 | 16.15 | 1226 | 2001 | 38 | 0 | 1 | 1.61 | 233.1 | 10.82 | 23.01 | 33.84 |
| press_37_the_ramps | 3267 | 16.35 | 2038 | 1226 | 62.4 | 182 | 3 | 4.48 | 215.4 | 13.43 | 25.56 | 38.99 |
| press_38_the_last_call | 3636 | 18.18 | 2672 | 958 | 73.6 | 0 | 6 | 3.7 | 327.3 | 15.95 | 24.14 | 40.09 |
| press_39_amberline_flees | 3254 | 16.28 | 1653 | 1597 | 50.9 | 0 | 4 | 2.51 | 224.1 | 9.02 | 18.36 | 27.37 |
| press_40_the_vigil | 3294 | 16.47 | 2626 | 666 | 79.8 | 0 | 2 | -0.59 | 162.7 | 11.02 | 23.02 | 34.04 |
| proxy_01_kestrel_bridge | 11302 | 56.51 | 3015 | 8287 | 26.7 | 0 | 0 | 1.07 | 25 | 6.9 | 17.07 | 23.97 |
| proxy_02_what_will_you_do | 3270 | 16.35 | 1844 | 1426 | 56.4 | 151 | 0 | 1.69 | 64.9 | 8.83 | 17.77 | 26.6 |
| proxy_03_the_quiet_war | 1860 | 9.32 | 370 | 1490 | 19.9 | 0 | 0 | 4.83 | 199 | 13.19 | 23.9 | 37.09 |
| proxy_04_the_team | 11890 | 59.46 | 3353 | 8535 | 28.2 | 0 | 2 | 2.62 | 43 | 8.89 | 11.21 | 20.09 |
| proxy_05_no_insignia | 7724 | 38.62 | 7354 | 368 | 95.2 | 0 | 2 | 0 | 72 | 5.16 | 4.35 | 9.51 |
| proxy_06_volunteers | 2632 | 13.16 | 1383 | 1249 | 52.5 | 0 | 0 | 3.6 | 125.9 | 11.08 | 22.09 | 33.17 |
| proxy_07_the_brigade | 2340 | 11.72 | 446 | 1894 | 19.1 | 0 | 0 | 2.08 | 163.7 | 12.21 | 35.36 | 47.57 |
| proxy_08_six_hours | 15 | 0.08 | 7 | 8 | 46.7 | 1 | 0 | 5.4 | 245.3 | 16.87 | 31.47 | 48.33 |
| proxy_09_an_afternoon | 3 | 0.02 | 1 | 2 | 33.3 | 0 | 0 | 1.33 | 178 | 23.33 | 47.67 | 71 |
| proxy_10_winnable | 48 | 0.24 | 26 | 21 | 55.3 | 0 | 1 | 4.53 | 613.7 | 13.6 | 23.9 | 37.49 |
| proxy_11_the_estimate | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 0 | 31 | 8 | 25 | 33 |
| proxy_12_your_runways | 1362 | 6.81 | 493 | 868 | 36.2 | 0 | 1 | 0 | 144.2 | 12.55 | 25.26 | 37.8 |
| proxy_13_the_road_to_hollin | 19 | 0.1 | 3 | 16 | 15.8 | 0 | 0 | -0.89 | 298.1 | 14.05 | 34.11 | 48.16 |
| proxy_14_nothing_without | 1333 | 6.67 | 679 | 654 | 50.9 | 0 | 0 | 1.67 | 164.5 | 15.91 | 32.11 | 48.02 |
| proxy_15_the_compact_battalion | 339 | 1.7 | 65 | 274 | 19.2 | 0 | 0 | -1.43 | 216.2 | 14.77 | 32.48 | 47.25 |
| proxy_16_what_they_see | 2580 | 12.9 | 2203 | 376 | 85.4 | 0 | 1 | -2.87 | 147.1 | 8.45 | 15.96 | 24.42 |
| proxy_17_monitors_on_the_aum | 5653 | 28.27 | 2995 | 2657 | 53 | 0 | 1 | -1.84 | 138.3 | 13.34 | 24.02 | 37.35 |
| proxy_18_how_many | 2957 | 14.79 | 395 | 2560 | 13.4 | 0 | 2 | 0 | 82.8 | 3.43 | 10.65 | 14.09 |
| proxy_19_first_coffin | 3520 | 17.61 | 3025 | 493 | 86 | 165 | 2 | 2.01 | 120.5 | 6.59 | 13.74 | 20.33 |
| proxy_20_the_column | 87 | 0.44 | 47 | 40 | 54 | 7 | 0 | 7.97 | 457.1 | 18.84 | 35.85 | 54.69 |
| proxy_21_across_the_aum | 56 | 0.28 | 9 | 47 | 16.1 | 0 | 0 | 0.54 | 337.8 | 9.43 | 35.55 | 44.98 |
| proxy_22_bring_them_home | 1810 | 9.05 | 84 | 1720 | 4.7 | 0 | 6 | 5.3 | 239.9 | 12.53 | 54.06 | 66.59 |
| proxy_23_the_line | 1429 | 7.15 | 848 | 579 | 59.4 | 0 | 2 | -3.21 | 94.9 | 14.73 | 27.58 | 42.31 |
| proxy_24_contact | 37 | 0.19 | 22 | 15 | 59.5 | 0 | 0 | 2.62 | 641.8 | 13.14 | 35.11 | 48.24 |
| proxy_25_the_radar | 4464 | 22.32 | 988 | 3473 | 22.1 | 0 | 3 | 3.02 | 149.7 | 9.56 | 21.67 | 31.23 |
| proxy_26_the_motion | 56 | 0.28 | 32 | 24 | 57.1 | 0 | 0 | -1.14 | 191.1 | 14.86 | 29.36 | 44.21 |
| blackout_01_dark_sky | 11166 | 55.83 | 2925 | 8241 | 26.2 | 0 | 0 | 0.79 | 13.4 | 4.48 | 8.02 | 12.5 |
| blackout_02_during_the_exercise | 2704 | 13.52 | 2199 | 505 | 81.3 | 131 | 0 | 3.57 | 60.7 | 8.06 | 14.86 | 22.92 |
| blackout_03_eleven_hours | 2005 | 10.03 | 1853 | 152 | 92.4 | 106 | 0 | 0.38 | 90.6 | 3.14 | 6.35 | 9.49 |
| blackout_04_the_guess | 5265 | 26.33 | 4618 | 646 | 87.7 | 0 | 1 | 5.41 | 53.4 | 11.56 | 23.42 | 34.98 |
| blackout_05_the_report | 11123 | 55.63 | 9251 | 1869 | 83.2 | 0 | 3 | 1.76 | 39.5 | 7.22 | 16.52 | 23.74 |
| blackout_06_wrong_headland | 1781 | 8.9 | 558 | 1223 | 31.3 | 0 | 0 | 2.68 | 61 | 9.61 | 23.45 | 33.06 |
| blackout_07_their_answer | 9068 | 45.34 | 8497 | 570 | 93.7 | 0 | 1 | -3.36 | 50.7 | 11 | 22 | 33 |
| blackout_08_the_north_cape | 2057 | 10.29 | 1508 | 549 | 73.3 | 0 | 0 | -0.58 | 56.6 | 8.86 | 13.31 | 22.17 |
| blackout_09_the_protest | 664 | 3.32 | 94 | 570 | 14.2 | 0 | 0 | 2.7 | 107.6 | 7 | 17.53 | 24.53 |
| blackout_11_the_hedge | 2 | 0.01 | 0 | 2 | 0 | 0 | 0 | 6 | 76 | 10 | 21 | 31 |
| blackout_12_same_orbit | 181 | 0.91 | 158 | 23 | 87.3 | 0 | 0 | -1.06 | 331.2 | 6.08 | 14.49 | 20.57 |
| blackout_13_the_inspector | 187 | 0.94 | 49 | 138 | 26.2 | 4 | 0 | 1.1 | 553 | 11.39 | 30.36 | 41.75 |
| blackout_14_the_shareholders | 14 | 0.07 | 1 | 13 | 7.1 | 0 | 0 | -2.14 | 96.3 | 10.07 | 18.93 | 29 |
| blackout_15_nine_percent | 8 | 0.04 | 5 | 3 | 62.5 | 0 | 0 | 0 | 200.5 | 12 | 15.88 | 27.88 |
| blackout_17_footprints | 1 | 0.01 | 1 | 0 | 100 | 0 | 0 | -4 | 61 | 9 | 19 | 28 |
| blackout_18_the_window | 6546 | 32.74 | 991 | 5551 | 15.1 | 342 | 4 | 2.21 | 44.9 | 9.48 | 21.24 | 30.71 |
| blackout_19_quiet_understanding | 8274 | 41.37 | 7522 | 751 | 90.9 | 0 | 1 | -6.86 | 59.2 | 14.47 | 20.31 | 34.77 |
| blackout_20_the_third_chair | 2787 | 13.94 | 1275 | 1511 | 45.8 | 0 | 1 | 0 | 61.3 | 4.13 | 8.51 | 12.64 |
| blackout_21_the_battery | 1492 | 7.46 | 253 | 1239 | 17 | 0 | 0 | -1.03 | 103.2 | 7.2 | 25.49 | 32.69 |
| blackout_22_nobody_did_this | 978 | 4.89 | 241 | 737 | 24.6 | 0 | 0 | -1.42 | 107.2 | 16.1 | 16.84 | 32.94 |
| blackout_23_the_replacement | 2033 | 10.18 | 504 | 1529 | 24.8 | 0 | 0 | 0.53 | 102.4 | 7.72 | 15.58 | 23.3 |
| blackout_24_the_leak | 889 | 4.45 | 60 | 829 | 6.7 | 48 | 0 | 1.89 | 166.7 | 12.19 | 14.83 | 27.02 |
| blackout_25_a_pattern | 1735 | 8.68 | 614 | 1119 | 35.4 | 0 | 2 | 1.17 | 121.5 | 6.89 | 15.78 | 22.67 |
| blackout_26_in_the_way | 378 | 1.89 | 249 | 129 | 65.9 | 0 | 0 | -2.51 | 149.5 | 10.34 | 17.94 | 28.28 |
| summit_01_a_lunch_in_amberline | 5807 | 29.04 | 4095 | 1712 | 70.5 | 0 | 0 | -2.18 | 61.1 | 10.55 | 17.45 | 28 |
| summit_02_the_offer | 5245 | 26.23 | 223 | 5022 | 4.3 | 0 | 0 | 0 | 56.9 | 5.94 | 15.45 | 21.39 |
| summit_03_the_third_chair | 2275 | 11.38 | 130 | 2144 | 5.7 | 0 | 1 | 0 | 106.3 | 2.14 | 10.12 | 12.25 |
| summit_04_after_the_week | 2204 | 11.02 | 752 | 1452 | 34.1 | 0 | 0 | 0.42 | 121.9 | 12.01 | 26.99 | 39 |
| summit_05_preconditions | 4442 | 22.21 | 326 | 4115 | 7.3 | 0 | 1 | 2.41 | 49.6 | 8.52 | 24.8 | 33.31 |
| summit_06_silence_from_kaskad | 5191 | 25.96 | 3993 | 1198 | 76.9 | 0 | 0 | -0.98 | 94.6 | 10.37 | 18.42 | 28.79 |
| summit_07_the_venue | 10036 | 50.18 | 5528 | 4506 | 55.1 | 0 | 2 | 1.62 | 81.7 | 8.44 | 18.66 | 27.1 |
| summit_08_no_plans_to_travel | 8560 | 42.8 | 1001 | 7558 | 11.7 | 429 | 1 | 4.9 | 120 | 12.08 | 22.76 | 34.84 |
| summit_10_the_night_before | 6791 | 33.96 | 458 | 6331 | 6.7 | 0 | 2 | 0 | 56.9 | 3.79 | 9.06 | 12.85 |
| summit_11_the_room | 6772 | 33.86 | 668 | 6104 | 9.9 | 369 | 0 | 0 | 76.1 | 3.1 | 8.71 | 11.82 |
| summit_12_the_last_sentence | 953 | 4.76 | 357 | 596 | 37.5 | 0 | 0 | -8.59 | 127.9 | 18.31 | 28.54 | 46.86 |
| summit_13_the_walkout | 6081 | 30.41 | 710 | 5369 | 11.7 | 305 | 2 | 8.36 | 107.2 | 16.08 | 30.79 | 46.87 |
| summit_14_the_empty_chair | 13761 | 68.82 | 9760 | 3997 | 70.9 | 0 | 4 | -0.25 | 88 | 13.29 | 27.87 | 41.16 |
| summit_09_the_handshake | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | 0 | 58 | 8 | 18.5 | 26.5 |
| summit_15_the_deputys_lunch | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | -2.5 | 63 | 8 | 10 | 18 |
| summit_16_the_academic | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | 0 | 78 | 9 | 15 | 24 |
| summit_17_consecutive_days | 83 | 0.42 | 79 | 4 | 95.2 | 0 | 0 | 0 | 152.7 | 3.4 | 16.98 | 20.37 |
| summit_18_the_promise | 12 | 0.06 | 3 | 9 | 25 | 0 | 0 | 1.08 | 36.2 | 7.92 | 21.58 | 29.5 |
| summit_19_eleven_calls | 190 | 0.95 | 25 | 165 | 13.2 | 0 | 0 | 2.97 | 195.7 | 10.64 | 25.37 | 36.02 |
| summit_20_half_of_them | 50 | 0.25 | 3 | 47 | 6 | 0 | 0 | 2.26 | 116.8 | 5.92 | 20.12 | 26.04 |
| summit_21_the_other_half | 203 | 1.01 | 121 | 82 | 59.6 | 13 | 0 | 9.08 | 194.2 | 20.26 | 28.3 | 48.56 |
| summit_22_the_square | 124 | 0.62 | 91 | 32 | 74 | 0 | 1 | 0 | 166.2 | 19.32 | 36.23 | 55.55 |
| summit_23_the_first_paragraph | 320 | 1.6 | 19 | 301 | 5.9 | 0 | 0 | 0 | 88.9 | 10.38 | 22.91 | 33.29 |
| summit_24_what_it_bought | 318 | 1.59 | 138 | 179 | 43.5 | 15 | 1 | 1.58 | 132.9 | 10.77 | 21.94 | 32.7 |
| ultimatum_01_seventy_two_hours | 5822 | 29.11 | 4371 | 1451 | 75.1 | 0 | 0 | 4.01 | 54.8 | 8.5 | 16.26 | 24.76 |
| ultimatum_02_the_generals_clock | 5367 | 26.84 | 4227 | 1138 | 78.8 | 0 | 2 | 5.79 | 90.5 | 12.18 | 16.03 | 28.21 |
| ultimatum_03_the_broadcast | 2403 | 12.02 | 1860 | 541 | 77.5 | 0 | 2 | 4.62 | 143.3 | 10.2 | 19.91 | 30.1 |
| ultimatum_04_the_pattern | 1789 | 8.95 | 392 | 1397 | 21.9 | 0 | 0 | 1.54 | 112.4 | 6.97 | 17.83 | 24.8 |
| ultimatum_05_on_the_record | 6567 | 32.84 | 6020 | 547 | 91.7 | 0 | 0 | 2.82 | 74.4 | 6.21 | 14.06 | 20.27 |
| ultimatum_06_the_call | 9871 | 49.36 | 8501 | 1362 | 86.2 | 0 | 8 | -5.16 | 104.7 | 21.11 | 28.97 | 50.08 |
| ultimatum_07_the_hour_after | 898 | 4.49 | 260 | 638 | 29 | 33 | 0 | 0.49 | 293.4 | 13.77 | 33.11 | 46.88 |
| ultimatum_08_indicative | 839 | 4.2 | 309 | 530 | 36.8 | 0 | 0 | 0.86 | 321.9 | 15.92 | 33.47 | 49.4 |
| ultimatum_09_the_wording | 4197 | 20.99 | 1700 | 2496 | 40.5 | 0 | 1 | 3.38 | 71 | 6.62 | 10.95 | 17.56 |
| ultimatum_10_the_private_word | 1122 | 5.61 | 490 | 632 | 43.7 | 0 | 0 | 0.74 | 116.8 | 11.4 | 22.32 | 33.72 |
| ultimatum_11_friday_noon | 4567 | 22.84 | 3427 | 1140 | 75 | 222 | 0 | 5.19 | 79.1 | 17.85 | 35.04 | 52.89 |
| ultimatum_12_the_consequence | 3319 | 16.61 | 2880 | 431 | 87 | 185 | 8 | 12.58 | 162.3 | 31.65 | 57.21 | 88.86 |
| ultimatum_13_the_second_deadline | 1138 | 5.7 | 1095 | 41 | 96.4 | 0 | 2 | 4.97 | 117.1 | 9.82 | 34.86 | 44.67 |
| ultimatum_14_the_answer | 2779 | 13.9 | 2746 | 33 | 98.8 | 0 | 0 | -7.82 | 135.6 | 16.51 | 34.52 | 51.03 |
| ultimatum_15_two_readings | 30 | 0.15 | 20 | 10 | 66.7 | 0 | 0 | 1.77 | 138.2 | 6.83 | 14.07 | 20.9 |
| ultimatum_16_the_wrong_signal | 118 | 0.59 | 71 | 47 | 60.2 | 0 | 0 | 1.73 | 201.4 | 14.42 | 29.73 | 44.14 |
| ultimatum_17_any_means_any | 16 | 0.08 | 8 | 8 | 50 | 0 | 0 | 7.06 | 400.6 | 24.75 | 48.5 | 73.25 |
| ultimatum_18_your_own_words | 7 | 0.04 | 7 | 0 | 100 | 0 | 0 | 7.71 | 720.3 | 14.29 | 39.71 | 54 |
| ultimatum_19_the_climbdown | 91 | 0.46 | 72 | 19 | 79.1 | 0 | 0 | 0 | 247.2 | 4.55 | 11.31 | 15.86 |
| ultimatum_20_the_half_life | 21 | 0.11 | 1 | 20 | 4.8 | 0 | 0 | 4.86 | 292.4 | 8.48 | 21.57 | 30.05 |
| ultimatum_21_the_open_line | 54 | 0.27 | 51 | 3 | 94.4 | 0 | 0 | -8.22 | 271.9 | 11.87 | 22.31 | 34.19 |
| ultimatum_22_three_calls | 189 | 0.95 | 39 | 150 | 20.6 | 8 | 0 | 3.16 | 205.7 | 8.59 | 31.32 | 39.9 |
| ultimatum_23_what_they_see | 484 | 2.42 | 216 | 267 | 44.7 | 0 | 1 | 0.62 | 225.9 | 13.94 | 29.66 | 43.6 |
| ultimatum_24_the_operations_room | 742 | 3.71 | 419 | 322 | 56.5 | 0 | 1 | 1.12 | 133.3 | 9.31 | 18.78 | 28.09 |
| ultimatum_25_the_formula | 2462 | 12.32 | 648 | 1808 | 26.4 | 0 | 6 | 1.46 | 226.2 | 22.63 | 50.78 | 73.41 |
| ultimatum_26_the_ledger | 9187 | 45.97 | 482 | 8699 | 5.2 | 0 | 6 | 0 | 47.6 | 9.33 | 22.86 | 32.19 |
| cables_01_three_forty | 11670 | 58.35 | 8048 | 3622 | 69 | 0 | 0 | 0 | 18.7 | 6.9 | 6.03 | 12.93 |
| cables_02_two_of_ours | 2650 | 13.25 | 1861 | 789 | 70.2 | 114 | 0 | 3.49 | 57.2 | 9.63 | 17.48 | 27.11 |
| cables_03_her_line | 1799 | 8.99 | 987 | 812 | 54.9 | 78 | 0 | 2.72 | 130.2 | 13.4 | 26.65 | 40.06 |
| cables_04_the_trawler | 15091 | 75.46 | 8945 | 6146 | 59.3 | 0 | 0 | 2.47 | 38.8 | 8.7 | 19.29 | 27.99 |
| cables_06_clean_cut | 6124 | 30.63 | 4467 | 1656 | 73 | 0 | 1 | 2.39 | 22.5 | 9.64 | 14.15 | 23.79 |
| cables_07_the_tern | 15953 | 79.77 | 5625 | 10327 | 35.3 | 794 | 1 | 0.48 | 35.5 | 9.96 | 14.2 | 24.16 |
| cables_08_two_corvettes | 10193 | 50.98 | 4874 | 5317 | 47.8 | 0 | 2 | 3.55 | 48.8 | 10.8 | 17.96 | 28.76 |
| cables_09_fishing_story | 8342 | 41.72 | 4646 | 3696 | 55.7 | 0 | 0 | 2.33 | 48 | 7.14 | 14.67 | 21.81 |
| cables_10_wrong_boat | 3344 | 16.73 | 133 | 3211 | 4 | 0 | 0 | 2.92 | 40.9 | 4.33 | 17.17 | 21.5 |
| cables_11_war_risk | 486 | 2.43 | 364 | 122 | 74.9 | 0 | 0 | 0 | 55.1 | 11.64 | 17.22 | 28.86 |
| cables_12_turned_back | 2470 | 12.35 | 665 | 1804 | 26.9 | 127 | 1 | 1.69 | 74.1 | 10.44 | 20.69 | 31.13 |
| cables_13_the_splice | 15511 | 77.57 | 7923 | 7586 | 51.1 | 0 | 2 | 1.57 | 42.3 | 5.08 | 10.33 | 15.41 |
| cables_14_open_water | 5452 | 27.26 | 3547 | 1905 | 65.1 | 0 | 0 | -1.84 | 144.3 | 19.51 | 37.02 | 56.53 |
| cables_22_a_week | 59 | 0.3 | 24 | 34 | 41.4 | 0 | 1 | -1.21 | 141.7 | 14.76 | 27.58 | 42.33 |
| cables_15_forty_metres | 640 | 3.2 | 179 | 461 | 28 | 0 | 0 | 3.31 | 117.1 | 11.53 | 22.36 | 33.89 |
| cables_16_the_escort_line | 14 | 0.07 | 6 | 8 | 42.9 | 0 | 0 | 2.43 | 105.2 | 13.64 | 28.36 | 42 |
| cables_17_forty_minutes | 15 | 0.08 | 7 | 8 | 46.7 | 1 | 0 | 3.87 | 191.7 | 11.93 | 16.6 | 28.53 |
| cables_18_eleven_hundred_tonnes | 23 | 0.12 | 11 | 12 | 47.8 | 0 | 0 | -1.04 | 186.5 | 10.7 | 22.22 | 32.91 |
| cables_19_unsigned | 48 | 0.24 | 30 | 18 | 62.5 | 0 | 0 | -0.75 | 39.8 | 8.85 | 18.27 | 27.13 |
| cables_20_ninety_days | 38 | 0.19 | 29 | 9 | 76.3 | 0 | 0 | 0 | 109.1 | 10.05 | 10.05 | 20.11 |
| cables_21_my_nine | 47 | 0.24 | 26 | 21 | 55.3 | 0 | 0 | 0 | 50.4 | 13.64 | 27.23 | 40.87 |

## Weakest cards (heuristic)

Lowest impact among cards that are actually seen: tiny effects, near-identical choices, or both. Candidates for a rewrite or a cut.

| # | Card | Seen | L% | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | defector_01_the_ferry | 7358 | 96.4 | 0 | 34.4 | 1.13 | 3.09 | 4.22 |
| 2 | defector_02_the_embassy_gate | 4004 | 67.7 | 0 | 73.7 | 1.49 | 3.64 | 5.13 |
| 3 | defector_15_the_winter_colonel | 2611 | 84.1 | 0 | 101.1 | 0.77 | 5.21 | 5.99 |
| 4 | press_04_three_twenty | 8338 | 99.6 | -1.96 | 41.6 | 1.97 | 4.02 | 6 |
| 5 | press_24_the_birthday | 3968 | 99.4 | -1.98 | 72.2 | 2.98 | 4.07 | 7.05 |
| 6 | press_14_the_hospital | 4182 | 98.2 | 0.02 | 61 | 2.98 | 4.09 | 7.07 |
| 7 | press_18_the_rumour | 4761 | 84.1 | 0 | 55.4 | 0.96 | 6.99 | 7.95 |
| 8 | dom_fed_01_two_bulletins | 2718 | 57.1 | 0 | 27.4 | 2.99 | 5.99 | 8.97 |
| 9 | dom_fed_11_three_hundred_names | 1475 | 27.9 | 0 | 174.4 | 2.76 | 6.2 | 8.97 |
| 10 | blackout_03_eleven_hours | 2005 | 92.4 | 0.38 | 90.6 | 3.14 | 6.35 | 9.49 |
| 11 | proxy_05_no_insignia | 7724 | 95.2 | 0 | 72 | 5.16 | 4.35 | 9.51 |
| 12 | dom_fed_03_accreditation | 2694 | 71.2 | 0 | 19.7 | 2.87 | 7 | 9.87 |
| 13 | dom_coa_07_the_drills | 1424 | 90.9 | 0.09 | 38.6 | 3.92 | 7.1 | 11.02 |
| 14 | defector_19_the_guest | 1187 | 33.6 | 0.93 | 94.5 | 4.92 | 6.61 | 11.53 |
| 15 | defector_13_seventy_two_hours | 2085 | 98.4 | 0 | 123.1 | 2.06 | 9.68 | 11.74 |
