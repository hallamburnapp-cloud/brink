# BRINK balance simulation

20000 runs per policy × 3 policies (random, greedy, heuristic) · seats: republic, federation, coalition · difficulty DEFCON 5 · mode endless · seed base `iter9`

Content: 451 cards, 64 pieces, 13 orders, 15 archetypes, 92 endings, 5 flashpoints. Final target 7000; "broke the game" at score ≥ 700000.

## Targets

| Status | Target | Value | Detail |
| --- | --- | --- | --- |
| PASS | T1 Heuristic win rate 5–12% at DEFCON 5 | 6.82% | 0.08% stand-down, 6.74% survival |
| PASS | T2 ≥ 10 archetypes reach the Endgame ≥ 10% of the time (heuristic, assembled by act 3, ≥ 20 runs) | 10 of 15 archetypes | 11 assembled in ≥ 20 runs: war_economy 26.23%, alliance_engine 32.53%, peace_movement 22.87%, accident_farmer 37.16%, intel_machine 33.27%, red_lines_gambler 49.53%, ledger 28.92%, sea_power 21.05%, quiet_diplomat 24.49%, shield_wall 40.63% |
| PASS | T3 No piece in more than 35% of winning builds (heuristic) | 0 over; top paranoid_intel 24.28% |  |
| PASS | T4 Heuristic median estimated minutes 15–25 | 17.93 min | p10 8.95, p90 22.27; 69.84 cards and 6.5 shops per run |
| FAIL | T5 ≥ 3% of heuristic runs score ≥ 100 × the final target ("broke the game") | 0% (0 runs ≥ 700000) | score median 5080, p90 11878.2, p99 36737.16, max 533791 |

**4 PASS, 1 FAIL, 0 N/A.** Heuristic win rate: 6.82%.

## Summary

| Policy | Runs | Win % | Nuclear % | Median score | p99 score | Broke game % | Median min | Cards | Antes missed / run | Accidents fired / run | Timer expiry % | Near-miss % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| random | 20000 | 0.02 | 61.02 | 1843 | 11696.05 | 0 | 8.55 | 36.61 | 0.32 | 0.81 | 29.93 | 9.95 |
| greedy | 20000 | 0.12 | 4.42 | 821 | 5830.01 | 0 | 8.6 | 39.79 | 1.13 | 0.04 | 9.94 | 9.95 |
| heuristic | 20000 | 6.82 | 83.38 | 5080 | 36737.16 | 0 | 17.93 | 69.84 | 1.69 | 1.76 | 5 | 9.87 |
| all | 60000 | 2.32 | 49.61 | 1571 | 22133.25 | 0 | 9.85 | 48.75 | 1.05 | 0.87 | 12.82 | 9.91 |

## Policy: random

- Runs: **20000**
- Win rate (run_end ending on the last act): **0.02%**; stand-down 0%; nuclear 61.02%
- Score: median **1843**, mean 2541.26, p90 5171.1, p99 11696.05, max 48823; best single choice 362.71 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **8.55**, p10 4.18, p90 13.22
- Days: median 17.25, mean 17.63, p10 9.25, p90 26; cards per run 36.61
- Endless: 2 runs continued (0.01%), 1 endless acts on average, max 1
- Timer expiry rate: 29.93% (48962 expiries / 163562 timed cards)
- Near-miss rate: 9.95% (11356 / 114152 rolls)
- Average peak escalation: 83.32; false alarms per run: 0.288
- Top ending share: **15.54%** (nuclear_intercept_exchange)

### Endings (random)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| nuclear_intercept_exchange | nuclear | 3108 | 15.54 |
| removed_public_0_republic | removed | 1613 | 8.07 |
| removed_public_0_federation | removed | 1574 | 7.87 |
| removed_public_0_coalition | removed | 1311 | 6.56 |
| nuclear_forty_miles | nuclear | 1303 | 6.52 |
| removed_public_0_square | removed | 1156 | 5.78 |
| core_nuclear_rogue | nuclear | 1063 | 5.32 |
| nuclear_straits | nuclear | 1036 | 5.18 |
| removed_military_0 | removed | 1002 | 5.01 |
| nuclear_blind | nuclear | 996 | 4.98 |
| core_nuclear_false_alarm | nuclear | 878 | 4.39 |
| core_nuclear_misread | nuclear | 782 | 3.91 |
| core_nuclear_attribution | nuclear | 743 | 3.72 |
| nuclear_midnight | nuclear | 552 | 2.76 |
| nuclear_after_vellmar | nuclear | 490 | 2.45 |
| nuclear_after_midnight | nuclear | 332 | 1.66 |
| removed_allies_0_federation | removed | 310 | 1.55 |
| nuclear_dark_sky | nuclear | 230 | 1.15 |
| nuclear_last_card | nuclear | 159 | 0.8 |
| nuclear_vestria | nuclear | 144 | 0.72 |
| removed_military_100_federation | removed | 143 | 0.72 |
| special_resigned | special | 137 | 0.69 |
| removed_military_0_unsigned | removed | 132 | 0.66 |
| nuclear_standing_orders | nuclear | 120 | 0.6 |
| removed_allies_0 | removed | 109 | 0.55 |
| core_nuclear_called | nuclear | 106 | 0.53 |
| nuclear_generals_war | nuclear | 88 | 0.44 |
| removed_allies_100 | removed | 71 | 0.36 |
| removed_allies_100_consulted | removed | 51 | 0.26 |
| removed_economy_0_federation | removed | 41 | 0.21 |
| removed_military_0_admiral | removed | 41 | 0.21 |
| nuclear_deep_bunker | nuclear | 36 | 0.18 |
| removed_military_100 | removed | 33 | 0.17 |
| removed_public_100 | removed | 32 | 0.16 |
| removed_allies_0_republic | removed | 24 | 0.12 |
| nuclear_ladder | nuclear | 15 | 0.08 |
| nuclear_believed | nuclear | 8 | 0.04 |
| removed_military_100_hawk | removed | 7 | 0.04 |
| nuclear_second_use | nuclear | 6 | 0.03 |
| core_nuclear_leverage | nuclear | 4 | 0.02 |
| core_nuclear_deadman | nuclear | 3 | 0.02 |
| removed_economy_0 | removed | 3 | 0.02 |
| core_survival_called | survival | 2 | 0.01 |
| nuclear_launch_on_warning | nuclear | 2 | 0.01 |
| removed_economy_0_reserve | removed | 2 | 0.01 |
| core_survival_ninety | survival | 1 | 0.01 |
| removed_allies_100_coalition | removed | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 12204 | 61.02 | 12205 | 61.03 |
| removed | 7656 | 38.28 | 7657 | 38.28 |
| standdown | 0 | 0 | 0 | 0 |
| survival | 3 | 0.02 | 1 | 0.01 |
| special | 137 | 0.69 | 137 | 0.69 |

### Act reached (random)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 3982 | 19.91 |
| 2 | Week Two | 8647 | 43.24 |
| 3 | Week Three | 6346 | 31.73 |
| 4 | Week Four | 1003 | 5.01 |
| 5 | Endgame | 20 | 0.1 |
| 6 | Endless 1 | 2 | 0.01 |

### Antes per act (random)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 19925 | 18580 | 93.25 | 1345 | 6.75 | 1999 | 10.03 |
| 2 | Week Two | 12496 | 8589 | 68.73 | 3907 | 31.27 | 3719 | 29.76 |
| 3 | Week Three | 2199 | 1187 | 53.98 | 1012 | 46.02 | 452 | 20.55 |
| 4 | Week Four | 109 | 31 | 28.44 | 78 | 71.56 | 15 | 13.76 |
| 5 | Endgame | 5 | 0 | 0 | 5 | 100 | 0 | 0 |

### Accidents (random)

- Attached to 15.9% of cards (5.82 per run); 13.85% of those fired (0.81 per run)
- Fatal at once: 19.28% of fired; mean escalation per fired accident: 6.29

### Capital and orders (random)

- Capital earned 13.44 / spent 12.26 per run; 3.22 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 2.51 / sold 0 per run; orders bought 0.72 / used 0.62 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 11431 | 1149 | 10.05% | 1043 | 90.77% |
| say_it_again | 7229 | 202 | 2.79% | 175 | 86.63% |
| double_down | 7055 | 146 | 2.07% | 130 | 89.04% |
| intercept_package | 11662 | 1896 | 16.26% | 1703 | 89.82% |
| duty_officers_veto | 11496 | 1183 | 10.29% | 578 | 48.86% |
| lose_the_memo | 11619 | 1809 | 15.57% | 1588 | 87.78% |
| favour_owed | 11712 | 2729 | 23.3% | 2436 | 89.26% |
| one_more_call | 7256 | 758 | 10.45% | 682 | 89.97% |
| leaked_assessment | 7220 | 172 | 2.38% | 144 | 83.72% |
| calm_the_markets | 11563 | 1195 | 10.33% | 1096 | 91.72% |
| rally | 11753 | 1165 | 9.91% | 1049 | 90.04% |
| muster | 11677 | 1162 | 9.95% | 1059 | 91.14% |
| personal_letter | 7071 | 742 | 10.49% | 679 | 91.51% |

### Score distribution (random)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2541.26 | 593 | 943 | 1843 | 3342 | 5171.1 | 11696.05 | 48823 |

### Per seat (random)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 0 | 1988 | 17.5 | 64.3 | 35 | 0 | 0 | 0.71 |
| federation | 6667 | 0.01 | 1851 | 17.25 | 59.19 | 40.09 | 0 | 0.01 | 0.7 |
| republic | 6667 | 0.03 | 1692 | 17.25 | 59.58 | 39.75 | 0 | 0.03 | 0.64 |

### Piece buy rates (random)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 4878 | 655 | 13.43% | no |
| dove_fm | advisor | rare | 2012 | 118 | 5.86% | no |
| paranoid_intel | advisor | common | 6991 | 2402 | 34.36% | yes |
| cautious_intel | advisor | common | 7069 | 2415 | 34.16% | yes |
| spin_doctor | advisor | uncommon | 4839 | 631 | 13.04% | no |
| ambassador | advisor | uncommon | 4797 | 592 | 12.34% | no |
| cyber_director | advisor | uncommon | 4784 | 624 | 13.04% | no |
| treasury_hawk | advisor | common | 7398 | 2472 | 33.41% | yes |
| fixer | advisor | uncommon | 5001 | 631 | 12.62% | no |
| admiral | advisor | uncommon | 4782 | 607 | 12.69% | no |
| peace_leader | advisor | common | 7546 | 2630 | 34.85% | yes |
| contractor | advisor | rare | 2019 | 113 | 5.6% | no |
| iron_nerve | advisor | legendary | 998 | 44 | 4.41% | no |
| long_table | advisor | legendary | 939 | 41 | 4.37% | no |
| field_marshal | advisor | rare | 2048 | 93 | 4.54% | no |
| press_office | advisor | rare | 2076 | 112 | 5.39% | no |
| attache | advisor | uncommon | 4829 | 630 | 13.05% | no |
| lobby | advisor | uncommon | 4721 | 591 | 12.52% | no |
| pollster | advisor | common | 7468 | 2572 | 34.44% | yes |
| early_warning | asset | uncommon | 4703 | 581 | 12.35% | no |
| back_channel | asset | uncommon | 4902 | 650 | 13.26% | no |
| cyber_unit | asset | uncommon | 4808 | 593 | 12.33% | no |
| missile_defence | asset | uncommon | 4835 | 626 | 12.95% | no |
| blue_water_fleet | asset | uncommon | 4824 | 623 | 12.91% | no |
| hardened_nc3 | asset | rare | 2066 | 104 | 5.03% | no |
| commercial_sat | asset | common | 7182 | 2526 | 35.17% | yes |
| allied_basing | asset | common | 7571 | 2562 | 33.84% | yes |
| strategic_reserve | asset | common | 7376 | 2516 | 34.11% | yes |
| rapid_response | asset | uncommon | 4726 | 617 | 13.06% | no |
| signals_intercept | asset | rare | 2020 | 114 | 5.64% | no |
| civil_defence | asset | uncommon | 4722 | 599 | 12.69% | no |
| deadman_switch | asset | legendary | 1033 | 32 | 3.1% | no |
| perfect_intel | asset | legendary | 1015 | 28 | 2.76% | no |
| open_line | asset | legendary | 975 | 29 | 2.97% | no |
| war_economy | asset | legendary | 1009 | 26 | 2.58% | no |
| whispers | asset | rare | 2060 | 105 | 5.1% | no |
| ledger | asset | rare | 2067 | 139 | 6.72% | no |
| war_bonds | asset | rare | 1950 | 130 | 6.67% | no |
| tripwire | asset | rare | 1963 | 104 | 5.3% | no |
| quiet_room | asset | rare | 2175 | 132 | 6.07% | no |
| dockyards | asset | uncommon | 4788 | 617 | 12.89% | no |
| bunker | asset | uncommon | 4840 | 609 | 12.58% | no |
| war_room | asset | uncommon | 4765 | 643 | 13.49% | no |
| staff_college | asset | common | 7507 | 2591 | 34.51% | yes |
| trade_desk | asset | common | 7476 | 2461 | 32.92% | yes |
| courier | asset | common | 7337 | 2516 | 34.29% | yes |
| launch_on_warning | doctrine | rare | 1974 | 139 | 7.04% | no |
| deterrence_by_denial | doctrine | uncommon | 4857 | 647 | 13.32% | no |
| strategic_ambiguity | doctrine | uncommon | 4727 | 651 | 13.77% | no |
| no_first_use | doctrine | uncommon | 4816 | 639 | 13.27% | no |
| escalate_to_deescalate | doctrine | rare | 2034 | 97 | 4.77% | no |
| alliance_first | doctrine | common | 6943 | 2324 | 33.47% | yes |
| fortress | doctrine | common | 6951 | 2382 | 34.27% | yes |
| transparency | doctrine | uncommon | 4785 | 647 | 13.52% | no |
| red_lines | doctrine | rare | 2086 | 125 | 5.99% | no |
| hotline_protocol | doctrine | uncommon | 4869 | 616 | 12.65% | no |
| predelegation | doctrine | uncommon | 4787 | 632 | 13.2% | no |
| minimal_deterrence | doctrine | rare | 2101 | 114 | 5.43% | no |
| madman_theory | doctrine | legendary | 1022 | 22 | 2.15% | no |
| brinkmanship | doctrine | legendary | 993 | 37 | 3.73% | no |
| domino_theory | doctrine | legendary | 1032 | 32 | 3.1% | no |
| the_button | doctrine | legendary | 1001 | 38 | 3.8% | no |
| second_strike | doctrine | rare | 2056 | 120 | 5.84% | no |
| propaganda | doctrine | uncommon | 4609 | 636 | 13.8% | no |

Outside band (51): hawk_general (13.43%), dove_fm (5.86%), spin_doctor (13.04%), ambassador (12.34%), cyber_director (13.04%), fixer (12.62%), admiral (12.69%), contractor (5.6%), iron_nerve (4.41%), long_table (4.37%), field_marshal (4.54%), press_office (5.39%), attache (13.05%), lobby (12.52%), early_warning (12.35%), back_channel (13.26%), cyber_unit (12.33%), missile_defence (12.95%), blue_water_fleet (12.91%), hardened_nc3 (5.03%), rapid_response (13.06%), signals_intercept (5.64%), civil_defence (12.69%), deadman_switch (3.1%), perfect_intel (2.76%), open_line (2.97%), war_economy (2.58%), whispers (5.1%), ledger (6.72%), war_bonds (6.67%), tripwire (5.3%), quiet_room (6.07%), dockyards (12.89%), bunker (12.58%), war_room (13.49%), launch_on_warning (7.04%), deterrence_by_denial (13.32%), strategic_ambiguity (13.77%), no_first_use (13.27%), escalate_to_deescalate (4.77%), transparency (13.52%), red_lines (5.99%), hotline_protocol (12.65%), predelegation (13.2%), minimal_deterrence (5.43%), madman_theory (2.15%), brinkmanship (3.73%), domino_theory (3.1%), the_button (3.8%), second_strike (5.84%), propaganda (13.8%)

### Card coverage (random)

- Cards never seen: 3 — adv_27_no_hard_feelings, debris_17_eleven_seconds, summit_18_the_promise
- Rare cards (seen in < 0.5% of runs): 136 — adv_02_what_a_person_is_worth (15), adv_03_the_invoice (1), adv_04_over_her_head (1), adv_05_one_sentence (7), adv_06_you_may_prefer_not_to_know (84), adv_07_the_army_will_hear_it (88), adv_08_a_number_not_on_any_list (16), adv_11_over_dinner (17), adv_14_is_and_consistent_with (12), adv_16_a_fellowship_abroad (96), adv_19_both_sides_of_the_border (16), adv_22_seven_times_in_ten (25), adv_23_as_if_you_had_not_said_it (89), adv_24_engineers (15), adv_25_one_of_them_did (84), adv_26_the_square_does_not_keep_a_diary (3), adv_28_the_florist (15), ally_18_a_form_of_words (24), blockade_22_two_days (69), blockade_07_her_ships (59), blockade_19_the_carrier (55), blockade_20_thirty_one_days (47), blockade_26_the_order (17), cyberew_03_correlator_word (60), cyberew_07_working_hours (75), cyberew_10_reciprocity (37), cyberew_11_their_reading (20), cyberew_13_page_eleven (23), cyberew_14_paper_and_phone (22), cyberew_15_thirty_one_attempts (7), cyberew_16_our_own_tool (33), cyberew_21_the_motion (27), cyberew_22_their_bombers (2), debris_02_the_intercept (95), debris_04_the_premium (43), debris_08_the_question_mark (54), debris_11_calibrations (2), debris_15_the_glass_house (1), debris_16_supplier_or_combatant (64), debris_18_without_consensus (24), debris_20_an_inch (21), defector_03_the_basement (43), defector_08_on_background (15), defector_09_everything_fits (59), defector_10_nine_days (66), defector_11_corroboration (5), defector_12_the_package (6), defector_17_tuesdays_assessment (11), defector_22_courtesies (14), defector_23_nothing_crossed (64), dom_coa_13_nine_thousand (40), dom_coa_14_the_open (30), dom_coa_15_dual_use (35), dom_coa_16_thirty_per_cent (38), dom_fed_10_ninety_days (90), dom_fed_12_the_word (33), dom_fed_13_fourteen_billion (28), dom_fed_14_the_second_bulletin (28), dom_fed_15_the_toast (29), dom_rep_12_the_runways (91), dom_rep_13_the_list (36), dom_rep_15_two_capitals (31), dom_rep_16_the_open_letter (26), falarm_11_high_cloud (95), falarm_12_range_hot (64), falarm_13_sun_glint (24), falarm_15_salvo_notified (48), falarm_16_reflection (31), falarm_17_three_keys (17), falarm_18_the_doctrine (11), falarm_21_sirens (66), fp_cascade_08a_the_operator (30), fp_intercept_04a_the_layer_you_did_not_use (81), fp_intercept_fa_02_the_doctrine (4), fp_intercept_fa_05_three_keys (3), fp_intercept_fa_06_the_sirens (16), fp_line_05a_the_carrier (71), fp_midnight_06_the_word_any (8), fp_midnight_07_two_statements (84), fp_midnight_08_two_readings (75), fp_midnight_09_the_protocol (73), fp_summit_02_the_photographs (22), fp_summit_03_flatbeds (4), fp_summit_07_in_writing (25), fp_summit_08_her_paragraph (5), fp_summit_09_the_lake_steps (32), fp_summit_10_four_lines (22), press_31_the_run (92), press_32_the_final_edition (91), press_33_the_unity_government (96), press_34_the_suitcase (91), press_35_the_list (94), press_36_the_delegation (90), press_38_the_last_call (89), press_39_amberline_flees (92), proxy_08_six_hours (60), proxy_09_an_afternoon (6), proxy_10_winnable (52), proxy_11_the_estimate (3), proxy_13_the_road_to_hollin (14), proxy_20_the_column (59), proxy_21_across_the_aum (26), proxy_24_contact (49), proxy_26_the_motion (33), blackout_10_consistent_with (24), blackout_11_the_hedge (58), blackout_12_same_orbit (36), blackout_13_the_inspector (22), blackout_15_nine_percent (67), blackout_16_do_it_back (25), blackout_17_footprints (44), summit_09_the_handshake (2), summit_15_the_deputys_lunch (7), summit_16_the_academic (10), summit_17_consecutive_days (96), summit_19_eleven_calls (2), summit_20_half_of_them (10), summit_21_the_other_half (34), summit_22_the_square (37), ultimatum_15_two_readings (14), ultimatum_16_the_wrong_signal (27), ultimatum_17_any_means_any (3), ultimatum_18_your_own_words (4), ultimatum_19_the_climbdown (17), ultimatum_20_the_half_life (3), ultimatum_21_the_open_line (10), ultimatum_22_three_calls (29), ultimatum_23_what_they_see (62), cables_05_the_detour (4), cables_22_a_week (13), cables_16_the_escort_line (12), cables_17_forty_minutes (20), cables_18_eleven_hundred_tonnes (24), cables_19_unsigned (25), cables_20_ninety_days (42), cables_21_my_nine (27)

## Policy: greedy

- Runs: **20000**
- Win rate (run_end ending on the last act): **0.12%**; stand-down 0.11%; nuclear 4.42%
- Score: median **821**, mean 1038.13, p90 1405.1, p99 5830.01, max 73424; best single choice 84.56 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **8.6**, p10 6.95, p90 13.05
- Days: median 17.75, mean 19.07, p10 14.25, p90 26; cards per run 39.79
- Endless: 23 runs continued (0.12%), 2.17 endless acts on average, max 7
- Timer expiry rate: 9.94% (14731 expiries / 148129 timed cards)
- Near-miss rate: 9.95% (9892 / 99458 rolls)
- Average peak escalation: 30.77; false alarms per run: 0.32
- Top ending share: **34.15%** (removed_military_0)

### Endings (greedy)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_military_0 | removed | 6829 | 34.15 |
| removed_public_0_federation | removed | 3599 | 18 |
| removed_public_0_republic | removed | 3304 | 16.52 |
| removed_public_0_coalition | removed | 3208 | 16.04 |
| removed_public_0_square | removed | 916 | 4.58 |
| removed_military_0_unsigned | removed | 452 | 2.26 |
| special_resigned | special | 358 | 1.79 |
| removed_military_0_admiral | removed | 291 | 1.46 |
| nuclear_generals_war | nuclear | 198 | 0.99 |
| nuclear_blind | nuclear | 194 | 0.97 |
| nuclear_midnight | nuclear | 99 | 0.5 |
| nuclear_intercept_exchange | nuclear | 68 | 0.34 |
| core_nuclear_rogue | nuclear | 63 | 0.32 |
| core_nuclear_false_alarm | nuclear | 56 | 0.28 |
| removed_allies_0_federation | removed | 51 | 0.26 |
| removed_allies_0 | removed | 49 | 0.25 |
| core_nuclear_called | nuclear | 44 | 0.22 |
| nuclear_forty_miles | nuclear | 42 | 0.21 |
| core_nuclear_attribution | nuclear | 38 | 0.19 |
| core_nuclear_misread | nuclear | 37 | 0.19 |
| removed_allies_0_republic | removed | 31 | 0.16 |
| nuclear_straits | nuclear | 22 | 0.11 |
| core_standdown_minimal | standdown | 21 | 0.11 |
| nuclear_standing_orders | nuclear | 10 | 0.05 |
| nuclear_vestria | nuclear | 9 | 0.05 |
| nuclear_ladder | nuclear | 4 | 0.02 |
| removed_economy_0_federation | removed | 4 | 0.02 |
| core_survival_ninety | survival | 1 | 0.01 |
| removed_economy_0 | removed | 1 | 0.01 |
| standdown_communique | standdown | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 884 | 4.42 | 885 | 4.43 |
| removed | 18735 | 93.68 | 18755 | 93.78 |
| standdown | 22 | 0.11 | 0 | 0 |
| survival | 1 | 0.01 | 0 | 0 |
| special | 358 | 1.79 | 360 | 1.8 |

### Act reached (greedy)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 154 | 0.77 |
| 2 | Week Two | 12497 | 62.49 |
| 3 | Week Three | 6591 | 32.96 |
| 4 | Week Four | 695 | 3.48 |
| 5 | Endgame | 40 | 0.2 |
| 6 | Endless 1 | 10 | 0.05 |
| 7 | Endless 2 | 7 | 0.04 |
| 8 | Endless 3 | 2 | 0.01 |
| 9 | Endless 4 | 2 | 0.01 |
| 10 | Endless 5 | 1 | 0.01 |
| 12 | Endless 7 | 1 | 0.01 |

### Antes per act (greedy)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 20000 | 13550 | 67.75 | 6450 | 32.25 | 0 | 0 |
| 2 | Week Two | 15515 | 1448 | 9.33 | 14067 | 90.67 | 119 | 0.77 |
| 3 | Week Three | 2057 | 159 | 7.73 | 1898 | 92.27 | 54 | 2.63 |
| 4 | Week Four | 170 | 8 | 4.71 | 162 | 95.29 | 4 | 2.35 |
| 5 | Endgame | 37 | 0 | 0 | 37 | 100 | 0 | 0 |
| 6 | Endless 1 | 17 | 0 | 0 | 17 | 100 | 0 | 0 |
| 7 | Endless 2 | 8 | 0 | 0 | 8 | 100 | 0 | 0 |
| 8 | Endless 3 | 4 | 0 | 0 | 4 | 100 | 0 | 0 |
| 9 | Endless 4 | 2 | 0 | 0 | 2 | 100 | 0 | 0 |
| 10 | Endless 5 | 1 | 0 | 0 | 1 | 100 | 0 | 0 |
| 11 | Endless 6 | 1 | 0 | 0 | 1 | 100 | 0 | 0 |

### Accidents (greedy)

- Attached to 0.69% of cards (0.27 per run); 13.28% of those fired (0.04 per run)
- Fatal at once: 18.71% of fired; mean escalation per fired accident: 5.92

### Capital and orders (greedy)

- Capital earned 9.91 / spent 11.26 per run; 3.58 shop visits, 0 rerolls, 0 tags removed per run
- Pieces bought 2.86 / sold 0 per run; orders bought 0.04 / used 0 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 12983 | 736 | 5.67% | 29 | 3.94% |
| say_it_again | 7778 | 0 | 0% | 0 | — |
| double_down | 7918 | 0 | 0% | 0 | — |
| intercept_package | 13043 | 0 | 0% | 0 | — |
| duty_officers_veto | 12947 | 0 | 0% | 0 | — |
| lose_the_memo | 12888 | 0 | 0% | 0 | — |
| favour_owed | 12943 | 0 | 0% | 0 | — |
| one_more_call | 8046 | 0 | 0% | 0 | — |
| leaked_assessment | 7892 | 0 | 0% | 0 | — |
| calm_the_markets | 12899 | 0 | 0% | 0 | — |
| rally | 12972 | 0 | 0% | 0 | — |
| muster | 12851 | 0 | 0% | 0 | — |
| personal_letter | 7882 | 0 | 0% | 0 | — |

### Score distribution (greedy)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1038.13 | 588 | 699 | 821 | 1075 | 1405.1 | 5830.01 | 73424 |

### Per seat (greedy)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 0.14 | 863 | 18 | 4.52 | 93.34 | 0.14 | 0 | 2.01 |
| federation | 6667 | 0.03 | 789 | 17.25 | 4.21 | 94.47 | 0.03 | 0 | 1.29 |
| republic | 6667 | 0.18 | 819 | 17.75 | 4.53 | 93.22 | 0.16 | 0.01 | 2.07 |

### Piece buy rates (greedy)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 5183 | 776 | 14.97% | no |
| dove_fm | advisor | rare | 2340 | 61 | 2.61% | no |
| paranoid_intel | advisor | common | 7552 | 2740 | 36.28% | yes |
| cautious_intel | advisor | common | 7632 | 2659 | 34.84% | yes |
| spin_doctor | advisor | uncommon | 5421 | 776 | 14.31% | no |
| ambassador | advisor | uncommon | 5283 | 724 | 13.7% | no |
| cyber_director | advisor | uncommon | 5268 | 731 | 13.88% | no |
| treasury_hawk | advisor | common | 8263 | 2891 | 34.99% | yes |
| fixer | advisor | uncommon | 5308 | 798 | 15.03% | yes |
| admiral | advisor | uncommon | 5260 | 751 | 14.28% | no |
| peace_leader | advisor | common | 8097 | 2894 | 35.74% | yes |
| contractor | advisor | rare | 2251 | 63 | 2.8% | no |
| iron_nerve | advisor | legendary | 1054 | 27 | 2.56% | no |
| long_table | advisor | legendary | 1121 | 24 | 2.14% | no |
| field_marshal | advisor | rare | 2310 | 62 | 2.68% | no |
| press_office | advisor | rare | 2280 | 64 | 2.81% | no |
| attache | advisor | uncommon | 5291 | 758 | 14.33% | no |
| lobby | advisor | uncommon | 5241 | 711 | 13.57% | no |
| pollster | advisor | common | 8293 | 2920 | 35.21% | yes |
| early_warning | asset | uncommon | 5230 | 760 | 14.53% | no |
| back_channel | asset | uncommon | 5408 | 766 | 14.16% | no |
| cyber_unit | asset | uncommon | 5436 | 826 | 15.19% | yes |
| missile_defence | asset | uncommon | 5429 | 783 | 14.42% | no |
| blue_water_fleet | asset | uncommon | 5317 | 788 | 14.82% | no |
| hardened_nc3 | asset | rare | 2352 | 58 | 2.47% | no |
| commercial_sat | asset | common | 8186 | 2920 | 35.67% | yes |
| allied_basing | asset | common | 8280 | 2902 | 35.05% | yes |
| strategic_reserve | asset | common | 8258 | 2897 | 35.08% | yes |
| rapid_response | asset | uncommon | 5231 | 781 | 14.93% | no |
| signals_intercept | asset | rare | 2245 | 61 | 2.72% | no |
| civil_defence | asset | uncommon | 5351 | 749 | 14% | no |
| deadman_switch | asset | legendary | 1132 | 29 | 2.56% | no |
| perfect_intel | asset | legendary | 1079 | 19 | 1.76% | no |
| open_line | asset | legendary | 1095 | 26 | 2.37% | no |
| war_economy | asset | legendary | 1150 | 22 | 1.91% | no |
| whispers | asset | rare | 2305 | 66 | 2.86% | no |
| ledger | asset | rare | 2345 | 52 | 2.22% | no |
| war_bonds | asset | rare | 2283 | 60 | 2.63% | no |
| tripwire | asset | rare | 2295 | 63 | 2.75% | no |
| quiet_room | asset | rare | 2208 | 61 | 2.76% | no |
| dockyards | asset | uncommon | 5332 | 798 | 14.97% | no |
| bunker | asset | uncommon | 5457 | 759 | 13.91% | no |
| war_room | asset | uncommon | 5479 | 803 | 14.66% | no |
| staff_college | asset | common | 8178 | 2836 | 34.68% | yes |
| trade_desk | asset | common | 8392 | 2969 | 35.38% | yes |
| courier | asset | common | 8310 | 2868 | 34.51% | yes |
| launch_on_warning | doctrine | rare | 2302 | 64 | 2.78% | no |
| deterrence_by_denial | doctrine | uncommon | 5327 | 812 | 15.24% | yes |
| strategic_ambiguity | doctrine | uncommon | 5294 | 727 | 13.73% | no |
| no_first_use | doctrine | uncommon | 5437 | 749 | 13.78% | no |
| escalate_to_deescalate | doctrine | rare | 2380 | 73 | 3.07% | no |
| alliance_first | doctrine | common | 7600 | 2650 | 34.87% | yes |
| fortress | doctrine | common | 7672 | 2674 | 34.85% | yes |
| transparency | doctrine | uncommon | 5406 | 783 | 14.48% | no |
| red_lines | doctrine | rare | 2311 | 73 | 3.16% | no |
| hotline_protocol | doctrine | uncommon | 5476 | 757 | 13.82% | no |
| predelegation | doctrine | uncommon | 5340 | 755 | 14.14% | no |
| minimal_deterrence | doctrine | rare | 2331 | 74 | 3.17% | no |
| madman_theory | doctrine | legendary | 1091 | 31 | 2.84% | no |
| brinkmanship | doctrine | legendary | 1141 | 25 | 2.19% | no |
| domino_theory | doctrine | legendary | 1138 | 28 | 2.46% | no |
| the_button | doctrine | legendary | 1045 | 26 | 2.49% | no |
| second_strike | doctrine | rare | 2382 | 68 | 2.85% | no |
| propaganda | doctrine | uncommon | 5236 | 757 | 14.46% | no |

Outside band (48): hawk_general (14.97%), dove_fm (2.61%), spin_doctor (14.31%), ambassador (13.7%), cyber_director (13.88%), admiral (14.28%), contractor (2.8%), iron_nerve (2.56%), long_table (2.14%), field_marshal (2.68%), press_office (2.81%), attache (14.33%), lobby (13.57%), early_warning (14.53%), back_channel (14.16%), missile_defence (14.42%), blue_water_fleet (14.82%), hardened_nc3 (2.47%), rapid_response (14.93%), signals_intercept (2.72%), civil_defence (14%), deadman_switch (2.56%), perfect_intel (1.76%), open_line (2.37%), war_economy (1.91%), whispers (2.86%), ledger (2.22%), war_bonds (2.63%), tripwire (2.75%), quiet_room (2.76%), dockyards (14.97%), bunker (13.91%), war_room (14.66%), launch_on_warning (2.78%), strategic_ambiguity (13.73%), no_first_use (13.78%), escalate_to_deescalate (3.07%), transparency (14.48%), red_lines (3.16%), hotline_protocol (13.82%), predelegation (14.14%), minimal_deterrence (3.17%), madman_theory (2.84%), brinkmanship (2.19%), domino_theory (2.46%), the_button (2.49%), second_strike (2.85%), propaganda (14.46%)

### Card coverage (greedy)

- Cards never seen: 11 — adv_26_the_square_does_not_keep_a_diary, adv_27_no_hard_feelings, blockade_26_the_order, cyberew_22_their_bombers, debris_17_eleven_seconds, defector_23_nothing_crossed, fp_intercept_fa_02_the_doctrine, fp_intercept_fa_05_three_keys, proxy_13_the_road_to_hollin, summit_15_the_deputys_lunch, summit_18_the_promise
- Rare cards (seen in < 0.5% of runs): 129 — adv_02_what_a_person_is_worth (13), adv_03_the_invoice (1), adv_04_over_her_head (2), adv_05_one_sentence (13), adv_08_a_number_not_on_any_list (8), adv_11_over_dinner (17), adv_14_is_and_consistent_with (19), adv_19_both_sides_of_the_border (6), adv_22_seven_times_in_ten (10), adv_23_as_if_you_had_not_said_it (82), adv_24_engineers (18), adv_28_the_florist (42), ally_18_a_form_of_words (8), blockade_04_the_schedule (75), blockade_08_the_ferry_line (28), blockade_09_boarded (38), blockade_06_the_word (77), blockade_22_two_days (56), blockade_07_her_ships (21), blockade_19_the_carrier (30), blockade_20_thirty_one_days (22), cyberew_03_correlator_word (47), cyberew_10_reciprocity (50), cyberew_11_their_reading (5), cyberew_13_page_eleven (30), cyberew_14_paper_and_phone (29), cyberew_15_thirty_one_attempts (1), cyberew_16_our_own_tool (39), cyberew_21_the_motion (17), debris_04_the_premium (45), debris_11_calibrations (2), debris_15_the_glass_house (3), debris_16_supplier_or_combatant (69), debris_18_without_consensus (25), debris_20_an_inch (38), defector_03_the_basement (59), defector_08_on_background (19), defector_09_everything_fits (65), defector_10_nine_days (50), defector_11_corroboration (2), defector_12_the_package (2), defector_17_tuesdays_assessment (12), defector_22_courtesies (39), dom_coa_13_nine_thousand (27), dom_coa_14_the_open (35), dom_coa_15_dual_use (36), dom_fed_10_ninety_days (68), dom_fed_12_the_word (27), dom_fed_13_fourteen_billion (23), dom_fed_14_the_second_bulletin (18), dom_fed_15_the_toast (21), dom_rep_13_the_list (28), dom_rep_15_two_capitals (41), dom_rep_16_the_open_letter (42), falarm_10_training_tape (92), falarm_12_range_hot (75), falarm_13_sun_glint (34), falarm_15_salvo_notified (61), falarm_16_reflection (33), falarm_17_three_keys (2), falarm_18_the_doctrine (11), falarm_21_sirens (64), falarm_26_the_call (79), fp_cascade_07_the_building (27), fp_cascade_08a_the_operator (4), fp_cascade_08b_the_shrug (10), fp_intercept_04a_the_layer_you_did_not_use (83), fp_intercept_09_the_question (50), fp_intercept_fa_06_the_sirens (3), fp_line_05a_the_carrier (52), fp_line_06_the_seizure (26), fp_midnight_06_the_word_any (13), fp_summit_02_the_photographs (92), fp_summit_03_flatbeds (1), fp_summit_07_in_writing (17), fp_summit_08_her_paragraph (4), fp_summit_09_the_lake_steps (28), fp_summit_10_four_lines (29), press_31_the_run (96), press_32_the_final_edition (95), press_33_the_unity_government (88), press_34_the_suitcase (89), press_35_the_list (79), press_36_the_delegation (93), press_37_the_ramps (95), press_40_the_vigil (82), proxy_08_six_hours (83), proxy_09_an_afternoon (1), proxy_10_winnable (95), proxy_11_the_estimate (3), proxy_15_the_compact_battalion (44), proxy_20_the_column (6), proxy_21_across_the_aum (1), proxy_24_contact (3), proxy_26_the_motion (2), blackout_06_wrong_headland (52), blackout_10_consistent_with (29), blackout_11_the_hedge (30), blackout_12_same_orbit (25), blackout_13_the_inspector (26), blackout_15_nine_percent (32), blackout_16_do_it_back (33), blackout_17_footprints (45), blackout_26_in_the_way (47), summit_09_the_handshake (5), summit_16_the_academic (4), summit_17_consecutive_days (87), summit_19_eleven_calls (4), summit_20_half_of_them (13), summit_21_the_other_half (22), summit_22_the_square (79), ultimatum_14_the_answer (97), ultimatum_15_two_readings (9), ultimatum_16_the_wrong_signal (24), ultimatum_17_any_means_any (3), ultimatum_18_your_own_words (3), ultimatum_19_the_climbdown (28), ultimatum_20_the_half_life (10), ultimatum_21_the_open_line (10), ultimatum_22_three_calls (36), ultimatum_23_what_they_see (52), cables_05_the_detour (18), cables_22_a_week (32), cables_16_the_escort_line (34), cables_17_forty_minutes (39), cables_18_eleven_hundred_tonnes (45), cables_19_unsigned (60), cables_20_ninety_days (63), cables_21_my_nine (86)

## Policy: heuristic

- Runs: **20000** (2 hit the step cap without ending)
- Win rate (run_end ending on the last act): **6.82%**; stand-down 0.08%; nuclear 83.38%
- Score: median **5080**, mean 6775.19, p90 11878.2, p99 36737.16, max 533791; best single choice 878.9 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **17.93**, p10 8.95, p90 22.27
- Days: median 34.5, mean 32.25, p10 17.75, p90 42.5; cards per run 69.84
- Endless: 1363 runs continued (6.82%), 1.23 endless acts on average, max 4
- Timer expiry rate: 5% (15166 expiries / 303292 timed cards)
- Near-miss rate: 9.87% (20572 / 208468 rolls)
- Average peak escalation: 94.65; false alarms per run: 0.673
- Top ending share: **22.29%** (core_nuclear_called)

### Endings (heuristic)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| core_nuclear_called | nuclear | 4457 | 22.29 |
| nuclear_midnight | nuclear | 1954 | 9.77 |
| core_nuclear_rogue | nuclear | 1786 | 8.93 |
| core_nuclear_false_alarm | nuclear | 1394 | 6.97 |
| core_nuclear_attribution | nuclear | 1212 | 6.06 |
| core_nuclear_misread | nuclear | 1196 | 5.98 |
| nuclear_forty_miles | nuclear | 1149 | 5.75 |
| nuclear_intercept_exchange | nuclear | 941 | 4.71 |
| core_survival_called | survival | 937 | 4.68 |
| nuclear_after_vellmar | nuclear | 866 | 4.33 |
| nuclear_blind | nuclear | 772 | 3.86 |
| nuclear_straits | nuclear | 566 | 2.83 |
| removed_public_0_square | removed | 485 | 2.42 |
| core_survival_ninety | survival | 393 | 1.97 |
| removed_public_0_federation | removed | 303 | 1.52 |
| removed_public_0_coalition | removed | 295 | 1.48 |
| removed_public_0_republic | removed | 252 | 1.26 |
| removed_military_0 | removed | 243 | 1.22 |
| nuclear_after_midnight | nuclear | 132 | 0.66 |
| removed_economy_0 | removed | 87 | 0.44 |
| removed_economy_0_federation | removed | 67 | 0.34 |
| removed_military_0_unsigned | removed | 65 | 0.33 |
| nuclear_vestria | nuclear | 51 | 0.26 |
| removed_allies_0_federation | removed | 48 | 0.24 |
| removed_allies_0_republic | removed | 43 | 0.22 |
| removed_allies_0 | removed | 40 | 0.2 |
| nuclear_generals_war | nuclear | 36 | 0.18 |
| nuclear_dark_sky | nuclear | 33 | 0.17 |
| nuclear_last_card | nuclear | 30 | 0.15 |
| nuclear_believed | nuclear | 21 | 0.11 |
| removed_military_0_admiral | removed | 19 | 0.1 |
| core_nuclear_deadman | nuclear | 17 | 0.09 |
| core_nuclear_leverage | nuclear | 17 | 0.09 |
| nuclear_standing_orders | nuclear | 16 | 0.08 |
| removed_economy_0_reserve | removed | 14 | 0.07 |
| nuclear_ladder | nuclear | 13 | 0.07 |
| survival_empty_chair | survival | 9 | 0.05 |
| core_standdown_minimal | standdown | 8 | 0.04 |
| nuclear_launch_on_warning | nuclear | 6 | 0.03 |
| core_survival_borrowed | survival | 5 | 0.03 |
| nuclear_deep_bunker | nuclear | 5 | 0.03 |
| nuclear_second_use | nuclear | 5 | 0.03 |
| standdown_empty_sky | standdown | 5 | 0.03 |
| survival_hollow_victory | survival | 3 | 0.02 |
| standdown_communique | standdown | 2 | 0.01 |
| survival_they_blinked | survival | 1 | 0.01 |
| unfinished | special | 1 | 0.01 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 16675 | 83.38 | 17692 | 88.46 |
| removed | 1961 | 9.81 | 2306 | 11.53 |
| standdown | 15 | 0.08 | 0 | 0 |
| survival | 1348 | 6.74 | 0 | 0 |
| special | 1 | 0.01 | 2 | 0.01 |

### Act reached (heuristic)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 673 | 3.37 |
| 2 | Week Two | 2241 | 11.21 |
| 3 | Week Three | 3455 | 17.27 |
| 4 | Week Four | 8225 | 41.13 |
| 5 | Endgame | 4043 | 20.22 |
| 6 | Endless 1 | 1102 | 5.51 |
| 7 | Endless 2 | 220 | 1.1 |
| 8 | Endless 3 | 35 | 0.18 |
| 9 | Endless 4 | 6 | 0.03 |

### Antes per act (heuristic)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 20000 | 18903 | 94.52 | 1097 | 5.49 | 13 | 0.07 |
| 2 | Week Two | 19272 | 8628 | 44.77 | 10644 | 55.23 | 1109 | 5.75 |
| 3 | Week Three | 15871 | 4732 | 29.82 | 11139 | 70.18 | 967 | 6.09 |
| 4 | Week Four | 9315 | 1416 | 15.2 | 7899 | 84.8 | 329 | 3.53 |
| 5 | Endgame | 2754 | 174 | 6.32 | 2580 | 93.68 | 31 | 1.13 |
| 6 | Endless 1 | 435 | 34 | 7.82 | 401 | 92.18 | 7 | 1.61 |
| 7 | Endless 2 | 84 | 11 | 13.1 | 73 | 86.9 | 4 | 4.76 |
| 8 | Endless 3 | 9 | 1 | 11.11 | 8 | 88.89 | 0 | 0 |

### Accidents (heuristic)

- Attached to 18.47% of cards (12.9 per run); 13.66% of those fired (1.76 per run)
- Fatal at once: 15.33% of fired; mean escalation per fired accident: 7.34

### Capital and orders (heuristic)

- Capital earned 23.24 / spent 21.94 per run; 6.5 shop visits, 1.35 rerolls, 0.002 tags removed per run
- Pieces bought 2.71 / sold 0.001 per run; orders bought 2.07 / used 1.99 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 28256 | 2733 | 9.67% | 2547 | 93.19% |
| say_it_again | 17411 | 4081 | 23.44% | 4073 | 99.8% |
| double_down | 17212 | 2551 | 14.82% | 2547 | 99.84% |
| intercept_package | 28207 | 0 | 0% | 0 | — |
| duty_officers_veto | 28267 | 2788 | 9.86% | 2163 | 77.58% |
| lose_the_memo | 28389 | 233 | 0.82% | 192 | 82.4% |
| favour_owed | 28373 | 16250 | 57.27% | 16250 | 100% |
| one_more_call | 17344 | 6 | 0.03% | 0 | 0% |
| leaked_assessment | 17446 | 4119 | 23.61% | 3805 | 92.38% |
| calm_the_markets | 28480 | 2148 | 7.54% | 1800 | 83.8% |
| rally | 28588 | 3031 | 10.6% | 2920 | 96.34% |
| muster | 28506 | 3494 | 12.26% | 3410 | 97.6% |
| personal_letter | 17285 | 0 | 0% | 0 | — |

### Score distribution (heuristic)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6775.19 | 1229.9 | 3361 | 5080 | 7337.25 | 11878.2 | 36737.16 | 533791 |

### Per seat (heuristic)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 6666 | 7.11 | 5110 | 35 | 83.6 | 9.27 | 0 | 7.11 | 0.02 |
| federation | 6667 | 5.14 | 4952 | 33 | 84.01 | 10.84 | 0.09 | 5.05 | 0 |
| republic | 6667 | 8.19 | 5164 | 35.25 | 82.51 | 9.3 | 0.13 | 8.05 | 0 |

### Piece buy rates (heuristic)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 12102 | 337 | 2.78% | no |
| dove_fm | advisor | rare | 5075 | 662 | 13.04% | no |
| paranoid_intel | advisor | common | 14986 | 3407 | 22.73% | yes |
| cautious_intel | advisor | common | 14979 | 2010 | 13.42% | no |
| spin_doctor | advisor | uncommon | 11900 | 393 | 3.3% | no |
| ambassador | advisor | uncommon | 11928 | 192 | 1.61% | no |
| cyber_director | advisor | uncommon | 12119 | 28 | 0.23% | no |
| treasury_hawk | advisor | common | 18047 | 2455 | 13.6% | no |
| fixer | advisor | uncommon | 12099 | 429 | 3.55% | no |
| admiral | advisor | uncommon | 11614 | 1629 | 14.03% | no |
| peace_leader | advisor | common | 17997 | 2357 | 13.1% | no |
| contractor | advisor | rare | 5141 | 136 | 2.65% | no |
| iron_nerve | advisor | legendary | 2447 | 202 | 8.26% | no |
| long_table | advisor | legendary | 2510 | 206 | 8.21% | no |
| field_marshal | advisor | rare | 5182 | 140 | 2.7% | no |
| press_office | advisor | rare | 5171 | 193 | 3.73% | no |
| attache | advisor | uncommon | 11742 | 820 | 6.98% | no |
| lobby | advisor | uncommon | 11727 | 1259 | 10.74% | no |
| pollster | advisor | common | 17643 | 3019 | 17.11% | yes |
| early_warning | asset | uncommon | 11372 | 2180 | 19.17% | yes |
| back_channel | asset | uncommon | 12190 | 101 | 0.83% | no |
| cyber_unit | asset | uncommon | 12287 | 12 | 0.1% | no |
| missile_defence | asset | uncommon | 11944 | 66 | 0.55% | no |
| blue_water_fleet | asset | uncommon | 12079 | 155 | 1.28% | no |
| hardened_nc3 | asset | rare | 5145 | 620 | 12.05% | no |
| commercial_sat | asset | common | 19284 | 129 | 0.67% | no |
| allied_basing | asset | common | 16888 | 3460 | 20.49% | yes |
| strategic_reserve | asset | common | 17945 | 2507 | 13.97% | no |
| rapid_response | asset | uncommon | 12056 | 56 | 0.46% | no |
| signals_intercept | asset | rare | 5106 | 279 | 5.46% | no |
| civil_defence | asset | uncommon | 11520 | 1981 | 17.2% | yes |
| deadman_switch | asset | legendary | 2530 | 71 | 2.81% | no |
| perfect_intel | asset | legendary | 2554 | 122 | 4.78% | no |
| open_line | asset | legendary | 2483 | 87 | 3.5% | no |
| war_economy | asset | legendary | 2549 | 220 | 8.63% | no |
| whispers | asset | rare | 5025 | 127 | 2.53% | no |
| ledger | asset | rare | 5262 | 184 | 3.5% | no |
| war_bonds | asset | rare | 5073 | 863 | 17.01% | yes |
| tripwire | asset | rare | 5067 | 530 | 10.46% | no |
| quiet_room | asset | rare | 5210 | 137 | 2.63% | no |
| dockyards | asset | uncommon | 12040 | 136 | 1.13% | no |
| bunker | asset | uncommon | 11769 | 1253 | 10.65% | no |
| war_room | asset | uncommon | 11948 | 869 | 7.27% | no |
| staff_college | asset | common | 18545 | 963 | 5.19% | no |
| trade_desk | asset | common | 18286 | 2505 | 13.7% | no |
| courier | asset | common | 18327 | 2425 | 13.23% | no |
| launch_on_warning | doctrine | rare | 5121 | 172 | 3.36% | no |
| deterrence_by_denial | doctrine | uncommon | 12028 | 95 | 0.79% | no |
| strategic_ambiguity | doctrine | uncommon | 11949 | 474 | 3.97% | no |
| no_first_use | doctrine | uncommon | 11776 | 1245 | 10.57% | no |
| escalate_to_deescalate | doctrine | rare | 5300 | 112 | 2.11% | no |
| alliance_first | doctrine | common | 15278 | 3499 | 22.9% | yes |
| fortress | doctrine | common | 15284 | 2807 | 18.37% | yes |
| transparency | doctrine | uncommon | 11751 | 1136 | 9.67% | no |
| red_lines | doctrine | rare | 5130 | 197 | 3.84% | no |
| hotline_protocol | doctrine | uncommon | 11886 | 1044 | 8.78% | no |
| predelegation | doctrine | uncommon | 12232 | 151 | 1.23% | no |
| minimal_deterrence | doctrine | rare | 5176 | 115 | 2.22% | no |
| madman_theory | doctrine | legendary | 2447 | 215 | 8.79% | no |
| brinkmanship | doctrine | legendary | 2462 | 85 | 3.45% | no |
| domino_theory | doctrine | legendary | 2531 | 223 | 8.81% | no |
| the_button | doctrine | legendary | 2458 | 64 | 2.6% | no |
| second_strike | doctrine | rare | 5159 | 154 | 2.99% | no |
| propaganda | doctrine | uncommon | 11530 | 441 | 3.82% | no |

Outside band (56): hawk_general (2.78%), dove_fm (13.04%), cautious_intel (13.42%), spin_doctor (3.3%), ambassador (1.61%), cyber_director (0.23%), treasury_hawk (13.6%), fixer (3.55%), admiral (14.03%), peace_leader (13.1%), contractor (2.65%), iron_nerve (8.26%), long_table (8.21%), field_marshal (2.7%), press_office (3.73%), attache (6.98%), lobby (10.74%), back_channel (0.83%), cyber_unit (0.1%), missile_defence (0.55%), blue_water_fleet (1.28%), hardened_nc3 (12.05%), commercial_sat (0.67%), strategic_reserve (13.97%), rapid_response (0.46%), signals_intercept (5.46%), deadman_switch (2.81%), perfect_intel (4.78%), open_line (3.5%), war_economy (8.63%), whispers (2.53%), ledger (3.5%), tripwire (10.46%), quiet_room (2.63%), dockyards (1.13%), bunker (10.65%), war_room (7.27%), staff_college (5.19%), trade_desk (13.7%), courier (13.23%), launch_on_warning (3.36%), deterrence_by_denial (0.79%), strategic_ambiguity (3.97%), no_first_use (10.57%), escalate_to_deescalate (2.11%), transparency (9.67%), red_lines (3.84%), hotline_protocol (8.78%), predelegation (1.23%), minimal_deterrence (2.22%), madman_theory (8.79%), brinkmanship (3.45%), domino_theory (8.81%), the_button (2.6%), second_strike (2.99%), propaganda (3.82%)

### Card coverage (heuristic)

- Cards never seen: 8 — adv_02_what_a_person_is_worth, adv_03_the_invoice, adv_05_one_sentence, adv_11_over_dinner, adv_14_is_and_consistent_with, adv_27_no_hard_feelings, debris_11_calibrations, debris_17_eleven_seconds
- Rare cards (seen in < 0.5% of runs): 73 — adv_04_over_her_head (13), adv_07_the_army_will_hear_it (78), adv_13_ninety_percent (16), adv_19_both_sides_of_the_border (47), adv_22_seven_times_in_ten (38), adv_24_engineers (87), adv_25_one_of_them_did (47), adv_26_the_square_does_not_keep_a_diary (31), adv_28_the_florist (73), blockade_19_the_carrier (13), blockade_20_thirty_one_days (12), blockade_26_the_order (49), cyberew_07_working_hours (12), cyberew_10_reciprocity (6), cyberew_11_their_reading (3), cyberew_16_our_own_tool (8), cyberew_22_their_bombers (1), debris_02_the_intercept (16), debris_08_the_question_mark (15), debris_15_the_glass_house (2), debris_16_supplier_or_combatant (8), debris_18_without_consensus (4), defector_08_on_background (25), defector_11_corroboration (38), defector_12_the_package (54), defector_17_tuesdays_assessment (88), dom_coa_06_the_lease (8), falarm_18_the_doctrine (35), fp_cascade_08a_the_operator (23), fp_intercept_04a_the_layer_you_did_not_use (5), fp_intercept_fa_02_the_doctrine (9), fp_intercept_fa_05_three_keys (34), fp_intercept_fa_06_the_sirens (66), fp_line_05a_the_carrier (58), fp_midnight_06_the_word_any (82), fp_summit_03_flatbeds (51), fp_summit_09_the_lake_steps (69), fp_summit_10_four_lines (23), proxy_08_six_hours (12), proxy_09_an_afternoon (1), proxy_10_winnable (43), proxy_11_the_estimate (1), proxy_13_the_road_to_hollin (8), proxy_20_the_column (70), proxy_21_across_the_aum (49), proxy_24_contact (27), proxy_26_the_motion (62), blackout_10_consistent_with (3), blackout_11_the_hedge (3), blackout_14_the_shareholders (17), blackout_15_nine_percent (4), blackout_16_do_it_back (1), blackout_17_footprints (2), summit_09_the_handshake (4), summit_15_the_deputys_lunch (3), summit_16_the_academic (2), summit_17_consecutive_days (80), summit_18_the_promise (9), summit_20_half_of_them (56), ultimatum_15_two_readings (28), ultimatum_17_any_means_any (14), ultimatum_18_your_own_words (7), ultimatum_19_the_climbdown (81), ultimatum_20_the_half_life (21), ultimatum_21_the_open_line (68), cables_05_the_detour (1), cables_22_a_week (53), cables_16_the_escort_line (23), cables_17_forty_minutes (13), cables_18_eleven_hundred_tonnes (29), cables_19_unsigned (43), cables_20_ninety_days (49), cables_21_my_nine (45)

## Policy: all

- Runs: **60000** (2 hit the step cap without ending)
- Win rate (run_end ending on the last act): **2.32%**; stand-down 0.06%; nuclear 49.61%
- Score: median **1571**, mean 3451.53, p90 7282, p99 22133.25, max 533791; best single choice 442.06 on average
- Broke the game (score ≥ 700000): **0%** (0 runs)
- Estimated minutes to the first ending: median **9.85**, p10 5.72, p90 19.4
- Days: median 19.5, mean 22.98, p10 12.25, p90 37.25; cards per run 48.75
- Endless: 1388 runs continued (2.31%), 1.24 endless acts on average, max 7
- Timer expiry rate: 12.82% (78859 expiries / 614983 timed cards)
- Near-miss rate: 9.91% (41820 / 422078 rolls)
- Average peak escalation: 69.58; false alarms per run: 0.427
- Top ending share: **13.46%** (removed_military_0)

### Endings (all)

The first ending reached (a continuation into endless does not change it).

| Ending | Kind | Runs | % |
| --- | --- | --- | --- |
| removed_military_0 | removed | 8074 | 13.46 |
| removed_public_0_federation | removed | 5476 | 9.13 |
| removed_public_0_republic | removed | 5169 | 8.62 |
| removed_public_0_coalition | removed | 4814 | 8.02 |
| core_nuclear_called | nuclear | 4607 | 7.68 |
| nuclear_intercept_exchange | nuclear | 4117 | 6.86 |
| core_nuclear_rogue | nuclear | 2912 | 4.85 |
| nuclear_midnight | nuclear | 2605 | 4.34 |
| removed_public_0_square | removed | 2557 | 4.26 |
| nuclear_forty_miles | nuclear | 2494 | 4.16 |
| core_nuclear_false_alarm | nuclear | 2328 | 3.88 |
| core_nuclear_misread | nuclear | 2015 | 3.36 |
| core_nuclear_attribution | nuclear | 1993 | 3.32 |
| nuclear_blind | nuclear | 1962 | 3.27 |
| nuclear_straits | nuclear | 1624 | 2.71 |
| nuclear_after_vellmar | nuclear | 1356 | 2.26 |
| core_survival_called | survival | 939 | 1.57 |
| removed_military_0_unsigned | removed | 649 | 1.08 |
| special_resigned | special | 495 | 0.83 |
| nuclear_after_midnight | nuclear | 464 | 0.77 |
| removed_allies_0_federation | removed | 409 | 0.68 |
| core_survival_ninety | survival | 395 | 0.66 |
| removed_military_0_admiral | removed | 351 | 0.59 |
| nuclear_generals_war | nuclear | 322 | 0.54 |
| nuclear_dark_sky | nuclear | 263 | 0.44 |
| nuclear_vestria | nuclear | 204 | 0.34 |
| removed_allies_0 | removed | 198 | 0.33 |
| nuclear_last_card | nuclear | 189 | 0.32 |
| nuclear_standing_orders | nuclear | 146 | 0.24 |
| removed_military_100_federation | removed | 143 | 0.24 |
| removed_economy_0_federation | removed | 112 | 0.19 |
| removed_allies_0_republic | removed | 98 | 0.16 |
| removed_economy_0 | removed | 91 | 0.15 |
| removed_allies_100 | removed | 71 | 0.12 |
| removed_allies_100_consulted | removed | 51 | 0.09 |
| nuclear_deep_bunker | nuclear | 41 | 0.07 |
| removed_military_100 | removed | 33 | 0.06 |
| nuclear_ladder | nuclear | 32 | 0.05 |
| removed_public_100 | removed | 32 | 0.05 |
| core_standdown_minimal | standdown | 29 | 0.05 |
| nuclear_believed | nuclear | 29 | 0.05 |
| core_nuclear_leverage | nuclear | 21 | 0.04 |
| core_nuclear_deadman | nuclear | 20 | 0.03 |
| removed_economy_0_reserve | removed | 16 | 0.03 |
| nuclear_second_use | nuclear | 11 | 0.02 |
| survival_empty_chair | survival | 9 | 0.02 |
| nuclear_launch_on_warning | nuclear | 8 | 0.01 |
| removed_military_100_hawk | removed | 7 | 0.01 |
| core_survival_borrowed | survival | 5 | 0.01 |
| standdown_empty_sky | standdown | 5 | 0.01 |
| standdown_communique | standdown | 3 | 0.01 |
| survival_hollow_victory | survival | 3 | 0.01 |
| removed_allies_100_coalition | removed | 1 | 0 |
| survival_they_blinked | survival | 1 | 0 |
| unfinished | special | 1 | 0 |

| Kind | Runs | % | Final kind runs | Final % |
| --- | --- | --- | --- | --- |
| nuclear | 29763 | 49.61 | 30782 | 51.3 |
| removed | 28352 | 47.25 | 28718 | 47.86 |
| standdown | 37 | 0.06 | 0 | 0 |
| survival | 1352 | 2.25 | 1 | 0 |
| special | 496 | 0.83 | 499 | 0.83 |

### Act reached (all)

| Act | Name | Runs | % |
| --- | --- | --- | --- |
| 1 | Week One | 4809 | 8.02 |
| 2 | Week Two | 23385 | 38.98 |
| 3 | Week Three | 16392 | 27.32 |
| 4 | Week Four | 9923 | 16.54 |
| 5 | Endgame | 4103 | 6.84 |
| 6 | Endless 1 | 1114 | 1.86 |
| 7 | Endless 2 | 227 | 0.38 |
| 8 | Endless 3 | 37 | 0.06 |
| 9 | Endless 4 | 8 | 0.01 |
| 10 | Endless 5 | 1 | 0 |
| 12 | Endless 7 | 1 | 0 |

### Antes per act (all)

Met includes smashed (≥ 2× the target). Missed antes call the bluff before the flashpoint.

| Act | Name | Settled | Met | Met % | Missed | Missed % | Smashed | Smashed % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Week One | 59925 | 51033 | 85.16 | 8892 | 14.84 | 2012 | 3.36 |
| 2 | Week Two | 47283 | 18665 | 39.48 | 28618 | 60.52 | 4947 | 10.46 |
| 3 | Week Three | 20127 | 6078 | 30.2 | 14049 | 69.8 | 1473 | 7.32 |
| 4 | Week Four | 9594 | 1455 | 15.17 | 8139 | 84.83 | 348 | 3.63 |
| 5 | Endgame | 2796 | 174 | 6.22 | 2622 | 93.78 | 31 | 1.11 |
| 6 | Endless 1 | 452 | 34 | 7.52 | 418 | 92.48 | 7 | 1.55 |
| 7 | Endless 2 | 92 | 11 | 11.96 | 81 | 88.04 | 4 | 4.35 |
| 8 | Endless 3 | 13 | 1 | 7.69 | 12 | 92.31 | 0 | 0 |
| 9 | Endless 4 | 2 | 0 | 0 | 2 | 100 | 0 | 0 |
| 10 | Endless 5 | 1 | 0 | 0 | 1 | 100 | 0 | 0 |
| 11 | Endless 6 | 1 | 0 | 0 | 1 | 100 | 0 | 0 |

### Accidents (all)

- Attached to 12.99% of cards (6.33 per run); 13.71% of those fired (0.87 per run)
- Fatal at once: 16.6% of fired; mean escalation per fired accident: 7

### Capital and orders (all)

- Capital earned 15.53 / spent 15.15 per run; 4.43 shop visits, 0.45 rerolls, 0.001 tags removed per run
- Pieces bought 2.69 / sold 0 per run; orders bought 0.94 / used 0.87 per run

| Order | Offered | Bought | Buy rate | Used | Use rate |
| --- | --- | --- | --- | --- | --- |
| stand_down_order | 52670 | 4618 | 8.77% | 3619 | 78.37% |
| say_it_again | 32418 | 4283 | 13.21% | 4248 | 99.18% |
| double_down | 32185 | 2697 | 8.38% | 2677 | 99.26% |
| intercept_package | 52912 | 1896 | 3.58% | 1703 | 89.82% |
| duty_officers_veto | 52710 | 3971 | 7.53% | 2741 | 69.03% |
| lose_the_memo | 52896 | 2042 | 3.86% | 1780 | 87.17% |
| favour_owed | 53028 | 18979 | 35.79% | 18686 | 98.46% |
| one_more_call | 32646 | 764 | 2.34% | 682 | 89.27% |
| leaked_assessment | 32558 | 4291 | 13.18% | 3949 | 92.03% |
| calm_the_markets | 52942 | 3343 | 6.31% | 2896 | 86.63% |
| rally | 53313 | 4196 | 7.87% | 3969 | 94.59% |
| muster | 53034 | 4656 | 8.78% | 4469 | 95.98% |
| personal_letter | 32238 | 742 | 2.3% | 679 | 91.51% |

### Score distribution (all)

| Mean | p10 | p25 | Median | p75 | p90 | p99 | Max |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3451.53 | 633 | 826 | 1571 | 4499 | 7282 | 22133.25 | 533791 |

### Per seat (all)

| Seat | Runs | Win % | Median score | Median days | nuclear % | removed % | standdown % | survival % | special % |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coalition | 19998 | 2.42 | 1680 | 20.5 | 50.81 | 45.87 | 0.05 | 2.37 | 0.91 |
| federation | 20001 | 1.73 | 1507 | 18.75 | 49.14 | 48.47 | 0.04 | 1.69 | 0.66 |
| republic | 20001 | 2.8 | 1527 | 19.5 | 48.87 | 47.42 | 0.1 | 2.7 | 0.9 |

### Piece buy rates (all)

Bought / offered per piece (one offer per shop visit that showed it). Band: 15–60%.

| Piece | Pool | Rarity | Offered | Bought | Rate | In band |
| --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 22163 | 1768 | 7.98% | no |
| dove_fm | advisor | rare | 9427 | 841 | 8.92% | no |
| paranoid_intel | advisor | common | 29529 | 8549 | 28.95% | yes |
| cautious_intel | advisor | common | 29680 | 7084 | 23.87% | yes |
| spin_doctor | advisor | uncommon | 22160 | 1800 | 8.12% | no |
| ambassador | advisor | uncommon | 22008 | 1508 | 6.85% | no |
| cyber_director | advisor | uncommon | 22171 | 1383 | 6.24% | no |
| treasury_hawk | advisor | common | 33708 | 7818 | 23.19% | yes |
| fixer | advisor | uncommon | 22408 | 1858 | 8.29% | no |
| admiral | advisor | uncommon | 21656 | 2987 | 13.79% | no |
| peace_leader | advisor | common | 33640 | 7881 | 23.43% | yes |
| contractor | advisor | rare | 9411 | 312 | 3.32% | no |
| iron_nerve | advisor | legendary | 4499 | 273 | 6.07% | no |
| long_table | advisor | legendary | 4570 | 271 | 5.93% | no |
| field_marshal | advisor | rare | 9540 | 295 | 3.09% | no |
| press_office | advisor | rare | 9527 | 369 | 3.87% | no |
| attache | advisor | uncommon | 21862 | 2208 | 10.1% | no |
| lobby | advisor | uncommon | 21689 | 2561 | 11.81% | no |
| pollster | advisor | common | 33404 | 8511 | 25.48% | yes |
| early_warning | asset | uncommon | 21305 | 3521 | 16.53% | yes |
| back_channel | asset | uncommon | 22500 | 1517 | 6.74% | no |
| cyber_unit | asset | uncommon | 22531 | 1431 | 6.35% | no |
| missile_defence | asset | uncommon | 22208 | 1475 | 6.64% | no |
| blue_water_fleet | asset | uncommon | 22220 | 1566 | 7.05% | no |
| hardened_nc3 | asset | rare | 9563 | 782 | 8.18% | no |
| commercial_sat | asset | common | 34652 | 5575 | 16.09% | yes |
| allied_basing | asset | common | 32739 | 8924 | 27.26% | yes |
| strategic_reserve | asset | common | 33579 | 7920 | 23.59% | yes |
| rapid_response | asset | uncommon | 22013 | 1454 | 6.61% | no |
| signals_intercept | asset | rare | 9371 | 454 | 4.84% | no |
| civil_defence | asset | uncommon | 21593 | 3329 | 15.42% | yes |
| deadman_switch | asset | legendary | 4695 | 132 | 2.81% | no |
| perfect_intel | asset | legendary | 4648 | 169 | 3.64% | no |
| open_line | asset | legendary | 4553 | 142 | 3.12% | no |
| war_economy | asset | legendary | 4708 | 268 | 5.69% | no |
| whispers | asset | rare | 9390 | 298 | 3.17% | no |
| ledger | asset | rare | 9674 | 375 | 3.88% | no |
| war_bonds | asset | rare | 9306 | 1053 | 11.32% | no |
| tripwire | asset | rare | 9325 | 697 | 7.47% | no |
| quiet_room | asset | rare | 9593 | 330 | 3.44% | no |
| dockyards | asset | uncommon | 22160 | 1551 | 7% | no |
| bunker | asset | uncommon | 22066 | 2621 | 11.88% | no |
| war_room | asset | uncommon | 22192 | 2315 | 10.43% | no |
| staff_college | asset | common | 34230 | 6390 | 18.67% | yes |
| trade_desk | asset | common | 34154 | 7935 | 23.23% | yes |
| courier | asset | common | 33974 | 7809 | 22.99% | yes |
| launch_on_warning | doctrine | rare | 9397 | 375 | 3.99% | no |
| deterrence_by_denial | doctrine | uncommon | 22212 | 1554 | 7% | no |
| strategic_ambiguity | doctrine | uncommon | 21970 | 1852 | 8.43% | no |
| no_first_use | doctrine | uncommon | 22029 | 2633 | 11.95% | no |
| escalate_to_deescalate | doctrine | rare | 9714 | 282 | 2.9% | no |
| alliance_first | doctrine | common | 29821 | 8473 | 28.41% | yes |
| fortress | doctrine | common | 29907 | 7863 | 26.29% | yes |
| transparency | doctrine | uncommon | 21942 | 2566 | 11.69% | no |
| red_lines | doctrine | rare | 9527 | 395 | 4.15% | no |
| hotline_protocol | doctrine | uncommon | 22231 | 2417 | 10.87% | no |
| predelegation | doctrine | uncommon | 22359 | 1538 | 6.88% | no |
| minimal_deterrence | doctrine | rare | 9608 | 303 | 3.15% | no |
| madman_theory | doctrine | legendary | 4560 | 268 | 5.88% | no |
| brinkmanship | doctrine | legendary | 4596 | 147 | 3.2% | no |
| domino_theory | doctrine | legendary | 4701 | 283 | 6.02% | no |
| the_button | doctrine | legendary | 4504 | 128 | 2.84% | no |
| second_strike | doctrine | rare | 9597 | 342 | 3.56% | no |
| propaganda | doctrine | uncommon | 21375 | 1834 | 8.58% | no |

Outside band (49): hawk_general (7.98%), dove_fm (8.92%), spin_doctor (8.12%), ambassador (6.85%), cyber_director (6.24%), fixer (8.29%), admiral (13.79%), contractor (3.32%), iron_nerve (6.07%), long_table (5.93%), field_marshal (3.09%), press_office (3.87%), attache (10.1%), lobby (11.81%), back_channel (6.74%), cyber_unit (6.35%), missile_defence (6.64%), blue_water_fleet (7.05%), hardened_nc3 (8.18%), rapid_response (6.61%), signals_intercept (4.84%), deadman_switch (2.81%), perfect_intel (3.64%), open_line (3.12%), war_economy (5.69%), whispers (3.17%), ledger (3.88%), war_bonds (11.32%), tripwire (7.47%), quiet_room (3.44%), dockyards (7%), bunker (11.88%), war_room (10.43%), launch_on_warning (3.99%), deterrence_by_denial (7%), strategic_ambiguity (8.43%), no_first_use (11.95%), escalate_to_deescalate (2.9%), transparency (11.69%), red_lines (4.15%), hotline_protocol (10.87%), predelegation (6.88%), minimal_deterrence (3.15%), madman_theory (5.88%), brinkmanship (3.2%), domino_theory (6.02%), the_button (2.84%), second_strike (3.56%), propaganda (8.58%)

### Card coverage (all)

- Cards never seen: 2 — adv_27_no_hard_feelings, debris_17_eleven_seconds
- Rare cards (seen in < 0.5% of runs): 90 — adv_02_what_a_person_is_worth (28), adv_03_the_invoice (2), adv_04_over_her_head (16), adv_05_one_sentence (20), adv_08_a_number_not_on_any_list (257), adv_11_over_dinner (34), adv_13_ninety_percent (267), adv_14_is_and_consistent_with (31), adv_19_both_sides_of_the_border (69), adv_22_seven_times_in_ten (73), adv_24_engineers (120), adv_25_one_of_them_did (288), adv_26_the_square_does_not_keep_a_diary (34), adv_28_the_florist (130), ally_18_a_form_of_words (297), blockade_19_the_carrier (98), blockade_20_thirty_one_days (81), blockade_26_the_order (66), cyberew_07_working_hours (193), cyberew_10_reciprocity (93), cyberew_11_their_reading (28), cyberew_13_page_eleven (258), cyberew_15_thirty_one_attempts (152), cyberew_16_our_own_tool (80), cyberew_22_their_bombers (3), debris_02_the_intercept (226), debris_08_the_question_mark (202), debris_11_calibrations (4), debris_15_the_glass_house (6), debris_16_supplier_or_combatant (141), debris_18_without_consensus (53), defector_08_on_background (59), defector_11_corroboration (45), defector_12_the_package (62), defector_17_tuesdays_assessment (111), dom_coa_06_the_lease (240), falarm_17_three_keys (192), falarm_18_the_doctrine (57), fp_cascade_08a_the_operator (57), fp_intercept_04a_the_layer_you_did_not_use (169), fp_intercept_fa_02_the_doctrine (13), fp_intercept_fa_05_three_keys (37), fp_intercept_fa_06_the_sirens (85), fp_line_05a_the_carrier (181), fp_midnight_06_the_word_any (103), fp_summit_02_the_photographs (216), fp_summit_03_flatbeds (56), fp_summit_09_the_lake_steps (129), fp_summit_10_four_lines (74), proxy_08_six_hours (155), proxy_09_an_afternoon (8), proxy_10_winnable (190), proxy_11_the_estimate (7), proxy_13_the_road_to_hollin (22), proxy_20_the_column (135), proxy_21_across_the_aum (76), proxy_24_contact (79), proxy_26_the_motion (97), blackout_10_consistent_with (56), blackout_11_the_hedge (91), blackout_12_same_orbit (251), blackout_13_the_inspector (223), blackout_15_nine_percent (103), blackout_16_do_it_back (59), blackout_17_footprints (91), summit_09_the_handshake (11), summit_15_the_deputys_lunch (10), summit_16_the_academic (16), summit_17_consecutive_days (263), summit_18_the_promise (9), summit_19_eleven_calls (194), summit_20_half_of_them (79), summit_21_the_other_half (283), summit_22_the_square (235), ultimatum_15_two_readings (51), ultimatum_16_the_wrong_signal (194), ultimatum_17_any_means_any (20), ultimatum_18_your_own_words (14), ultimatum_19_the_climbdown (126), ultimatum_20_the_half_life (34), ultimatum_21_the_open_line (88), ultimatum_22_three_calls (271), cables_05_the_detour (23), cables_22_a_week (98), cables_16_the_escort_line (69), cables_17_forty_minutes (72), cables_18_eleven_hundred_tonnes (98), cables_19_unsigned (128), cables_20_ninety_days (154), cables_21_my_nine (158)

## Cards never seen (all policies)

- adv_27_no_hard_feelings
- debris_17_eleven_seconds

### Rare cards (seen in < 0.5% of runs, all policies)

| Card | Runs | % |
| --- | --- | --- |
| adv_02_what_a_person_is_worth | 28 | 0.05 |
| adv_03_the_invoice | 2 | 0 |
| adv_04_over_her_head | 16 | 0.03 |
| adv_05_one_sentence | 20 | 0.03 |
| adv_08_a_number_not_on_any_list | 257 | 0.43 |
| adv_11_over_dinner | 34 | 0.06 |
| adv_13_ninety_percent | 267 | 0.45 |
| adv_14_is_and_consistent_with | 31 | 0.05 |
| adv_19_both_sides_of_the_border | 69 | 0.12 |
| adv_22_seven_times_in_ten | 73 | 0.12 |
| adv_24_engineers | 120 | 0.2 |
| adv_25_one_of_them_did | 288 | 0.48 |
| adv_26_the_square_does_not_keep_a_diary | 34 | 0.06 |
| adv_28_the_florist | 130 | 0.22 |
| ally_18_a_form_of_words | 297 | 0.5 |
| blockade_19_the_carrier | 98 | 0.16 |
| blockade_20_thirty_one_days | 81 | 0.14 |
| blockade_26_the_order | 66 | 0.11 |
| cyberew_07_working_hours | 193 | 0.32 |
| cyberew_10_reciprocity | 93 | 0.16 |
| cyberew_11_their_reading | 28 | 0.05 |
| cyberew_13_page_eleven | 258 | 0.43 |
| cyberew_15_thirty_one_attempts | 152 | 0.25 |
| cyberew_16_our_own_tool | 80 | 0.13 |
| cyberew_22_their_bombers | 3 | 0.01 |
| debris_02_the_intercept | 226 | 0.38 |
| debris_08_the_question_mark | 202 | 0.34 |
| debris_11_calibrations | 4 | 0.01 |
| debris_15_the_glass_house | 6 | 0.01 |
| debris_16_supplier_or_combatant | 141 | 0.24 |
| debris_18_without_consensus | 53 | 0.09 |
| defector_08_on_background | 59 | 0.1 |
| defector_11_corroboration | 45 | 0.08 |
| defector_12_the_package | 62 | 0.1 |
| defector_17_tuesdays_assessment | 111 | 0.19 |
| dom_coa_06_the_lease | 240 | 0.4 |
| falarm_17_three_keys | 192 | 0.32 |
| falarm_18_the_doctrine | 57 | 0.1 |
| fp_cascade_08a_the_operator | 57 | 0.1 |
| fp_intercept_04a_the_layer_you_did_not_use | 169 | 0.28 |
| fp_intercept_fa_02_the_doctrine | 13 | 0.02 |
| fp_intercept_fa_05_three_keys | 37 | 0.06 |
| fp_intercept_fa_06_the_sirens | 85 | 0.14 |
| fp_line_05a_the_carrier | 181 | 0.3 |
| fp_midnight_06_the_word_any | 103 | 0.17 |
| fp_summit_02_the_photographs | 216 | 0.36 |
| fp_summit_03_flatbeds | 56 | 0.09 |
| fp_summit_09_the_lake_steps | 129 | 0.22 |
| fp_summit_10_four_lines | 74 | 0.12 |
| proxy_08_six_hours | 155 | 0.26 |
| proxy_09_an_afternoon | 8 | 0.01 |
| proxy_10_winnable | 190 | 0.32 |
| proxy_11_the_estimate | 7 | 0.01 |
| proxy_13_the_road_to_hollin | 22 | 0.04 |
| proxy_20_the_column | 135 | 0.23 |
| proxy_21_across_the_aum | 76 | 0.13 |
| proxy_24_contact | 79 | 0.13 |
| proxy_26_the_motion | 97 | 0.16 |
| blackout_10_consistent_with | 56 | 0.09 |
| blackout_11_the_hedge | 91 | 0.15 |
| blackout_12_same_orbit | 251 | 0.42 |
| blackout_13_the_inspector | 223 | 0.37 |
| blackout_15_nine_percent | 103 | 0.17 |
| blackout_16_do_it_back | 59 | 0.1 |
| blackout_17_footprints | 91 | 0.15 |
| summit_09_the_handshake | 11 | 0.02 |
| summit_15_the_deputys_lunch | 10 | 0.02 |
| summit_16_the_academic | 16 | 0.03 |
| summit_17_consecutive_days | 263 | 0.44 |
| summit_18_the_promise | 9 | 0.02 |
| summit_19_eleven_calls | 194 | 0.32 |
| summit_20_half_of_them | 79 | 0.13 |
| summit_21_the_other_half | 283 | 0.47 |
| summit_22_the_square | 235 | 0.39 |
| ultimatum_15_two_readings | 51 | 0.09 |
| ultimatum_16_the_wrong_signal | 194 | 0.32 |
| ultimatum_17_any_means_any | 20 | 0.03 |
| ultimatum_18_your_own_words | 14 | 0.02 |
| ultimatum_19_the_climbdown | 126 | 0.21 |
| ultimatum_20_the_half_life | 34 | 0.06 |
| ultimatum_21_the_open_line | 88 | 0.15 |
| ultimatum_22_three_calls | 271 | 0.45 |
| cables_05_the_detour | 23 | 0.04 |
| cables_22_a_week | 98 | 0.16 |
| cables_16_the_escort_line | 69 | 0.12 |
| cables_17_forty_minutes | 72 | 0.12 |
| cables_18_eleven_hundred_tonnes | 98 | 0.16 |
| cables_19_unsigned | 128 | 0.21 |
| cables_20_ninety_days | 154 | 0.26 |
| cables_21_my_nine | 158 | 0.26 |

## Archetypes (heuristic)

Runs in which the archetype (≥ 2 core pieces) was assembled when act 3 began, how often those runs reached the Endgame (act 5) and won, and their median score. Final = runs holding the archetype at the end.

| Archetype | Style | Assembled by act 3 | Reached Endgame | % | Won | Won % | Median score | Final |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| war_economy | hybrid | 1750 | 459 | 26.23 | 96 | 5.49 | 4755.5 | 2676 |
| alliance_engine | hybrid | 1666 | 542 | 32.53 | 142 | 8.52 | 5714.5 | 2757 |
| peace_movement | standdown | 835 | 191 | 22.87 | 41 | 4.91 | 4614 | 1389 |
| accident_farmer | brink | 732 | 272 | 37.16 | 88 | 12.02 | 12620.5 | 1396 |
| intel_machine | hybrid | 520 | 173 | 33.27 | 31 | 5.96 | 5679 | 913 |
| red_lines_gambler | brink | 107 | 53 | 49.53 | 17 | 15.89 | 9164 | 291 |
| ledger | hybrid | 83 | 24 | 28.92 | 4 | 4.82 | 5984 | 176 |
| sea_power | brink | 57 | 12 | 21.05 | 1 | 1.75 | 5148 | 110 |
| quiet_diplomat | standdown | 49 | 12 | 24.49 | 4 | 8.16 | 9208 | 111 |
| hair_trigger | brink | 38 | 0 | 0 | 0 | 0 | 5192.5 | 83 |
| shield_wall | brink | 32 | 13 | 40.63 | 3 | 9.38 | 6260.5 | 79 |
| deadman | brink | 9 | 5 | 55.56 | 1 | 11.11 | 7547 | 25 |
| cyber_ghost | hybrid | 4 | 3 | 75 | 1 | 25 | 6590 | 16 |
| madman | brink | 4 | 0 | 0 | 0 | 0 | 18629.5 | 12 |
| the_ladder | brink | 4 | 1 | 25 | 0 | 0 | 3628.5 | 11 |

## Piece share among winning builds (heuristic)

Share of winning runs that held each piece at the end (cap 35%).

| Piece | Pool | Rarity | Wins holding it | Share of wins | Δ win |
| --- | --- | --- | --- | --- | --- |
| paranoid_intel | advisor | common | 331 | 24.28 | 3.5 |
| allied_basing | asset | common | 306 | 22.45 | 2.45 |
| alliance_first | doctrine | common | 273 | 20.03 | 1.2 |
| civil_defence | asset | uncommon | 265 | 19.44 | 7.28 |
| pollster | advisor | common | 254 | 18.64 | 1.9 |
| early_warning | asset | uncommon | 235 | 17.24 | 4.45 |
| fortress | doctrine | common | 219 | 16.07 | 1.16 |
| dove_fm | advisor | rare | 208 | 15.26 | 25.45 |
| courier | asset | common | 197 | 14.45 | 1.5 |
| bunker | asset | uncommon | 169 | 12.4 | 7.12 |
| trade_desk | asset | common | 160 | 11.74 | -0.49 |
| strategic_reserve | asset | common | 156 | 11.45 | -0.68 |
| peace_leader | advisor | common | 154 | 11.3 | -0.32 |
| admiral | advisor | uncommon | 147 | 10.79 | 2.4 |
| hotline_protocol | doctrine | uncommon | 142 | 10.42 | 7.16 |
| treasury_hawk | advisor | common | 140 | 10.27 | -1.27 |
| cautious_intel | advisor | common | 125 | 9.17 | -0.66 |
| hardened_nc3 | asset | rare | 91 | 6.68 | 8.11 |
| lobby | advisor | uncommon | 86 | 6.31 | 0.02 |
| spin_doctor | advisor | uncommon | 85 | 6.24 | 15.11 |
| war_room | asset | uncommon | 78 | 5.72 | 2.26 |
| attache | advisor | uncommon | 71 | 5.21 | 1.92 |
| war_bonds | asset | rare | 70 | 5.14 | 1.35 |
| strategic_ambiguity | doctrine | uncommon | 67 | 4.92 | 7.5 |
| propaganda | doctrine | uncommon | 60 | 4.4 | 6.94 |
| transparency | doctrine | uncommon | 58 | 4.26 | -1.81 |
| staff_college | asset | common | 50 | 3.67 | -1.69 |
| fixer | advisor | uncommon | 40 | 2.93 | 2.59 |
| tripwire | asset | rare | 34 | 2.49 | -0.41 |
| no_first_use | doctrine | uncommon | 32 | 2.35 | -4.53 |
| red_lines | doctrine | rare | 27 | 1.98 | 6.96 |
| signals_intercept | asset | rare | 27 | 1.98 | 2.9 |
| iron_nerve | advisor | legendary | 24 | 1.76 | 5.12 |
| press_office | advisor | rare | 20 | 1.47 | 3.58 |
| ambassador | advisor | uncommon | 17 | 1.25 | 2.06 |
| domino_theory | doctrine | legendary | 16 | 1.17 | 0.36 |
| war_economy | asset | legendary | 16 | 1.17 | 0.46 |
| long_table | advisor | legendary | 15 | 1.1 | 0.47 |
| minimal_deterrence | doctrine | rare | 15 | 1.1 | 6.26 |
| whispers | asset | rare | 14 | 1.03 | 4.24 |
| back_channel | asset | uncommon | 10 | 0.73 | 3.1 |
| deadman_switch | asset | legendary | 10 | 0.73 | 7.3 |
| ledger | asset | rare | 10 | 0.73 | -1.39 |
| predelegation | doctrine | uncommon | 10 | 0.73 | -0.19 |
| deterrence_by_denial | doctrine | uncommon | 9 | 0.66 | 2.67 |
| madman_theory | doctrine | legendary | 9 | 0.66 | -2.66 |
| perfect_intel | asset | legendary | 9 | 0.66 | 0.57 |
| missile_defence | asset | uncommon | 8 | 0.59 | 5.32 |
| quiet_room | asset | rare | 8 | 0.59 | -0.98 |
| commercial_sat | asset | common | 7 | 0.51 | -1.35 |
| dockyards | asset | uncommon | 6 | 0.44 | -2.42 |
| open_line | asset | legendary | 6 | 0.44 | 0.08 |
| second_strike | doctrine | rare | 6 | 0.44 | -2.94 |
| hawk_general | advisor | uncommon | 5 | 0.37 | -5.42 |
| blue_water_fleet | asset | uncommon | 4 | 0.29 | -4.27 |
| cyber_director | advisor | uncommon | 4 | 0.29 | 7.48 |
| escalate_to_deescalate | doctrine | rare | 4 | 0.29 | -3.26 |
| field_marshal | advisor | rare | 3 | 0.22 | -4.71 |
| cyber_unit | asset | uncommon | 2 | 0.15 | 9.86 |
| rapid_response | asset | uncommon | 2 | 0.15 | -3.25 |
| brinkmanship | doctrine | legendary | 1 | 0.07 | -5.66 |
| contractor | advisor | rare | 1 | 0.07 | -6.12 |
| the_button | doctrine | legendary | 1 | 0.07 | -5.27 |

## Combos (heuristic)

Pairs of pieces held together in ≥ 40 runs: 227. Pairs with |Δ win| ≥ 10pp vs runs holding neither: **40**.

| Piece A | Piece B | Runs | Win % | Nuclear % | Baseline win % | Baseline nuclear % | Δ win | Δ nuclear |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| admiral | dove_fm | 119 | 44.54 | 44.54 | 5.95 | 84.19 | 38.59 | -39.65 |
| allied_basing | dove_fm | 320 | 41.25 | 50 | 6.06 | 83.87 | 35.19 | -33.87 |
| alliance_first | dove_fm | 325 | 39.69 | 53.23 | 6.25 | 83.69 | 33.44 | -30.46 |
| hotline_protocol | propaganda | 54 | 31.48 | 64.81 | 6.34 | 84.22 | 25.14 | -19.4 |
| hotline_protocol | spin_doctor | 110 | 30.91 | 65.45 | 6.27 | 84.23 | 24.64 | -18.77 |
| bunker | hardened_nc3 | 122 | 30.33 | 65.57 | 6.25 | 83.6 | 24.08 | -18.03 |
| courier | dove_fm | 96 | 28.13 | 42.71 | 5.79 | 85.67 | 22.33 | -42.97 |
| civil_defence | hardened_nc3 | 107 | 27.1 | 70.09 | 5.92 | 84.26 | 21.18 | -14.16 |
| red_lines | spin_doctor | 70 | 27.14 | 71.43 | 6.52 | 83.53 | 20.62 | -12.1 |
| spin_doctor | staff_college | 42 | 26.19 | 69.05 | 6.63 | 83.56 | 19.56 | -14.51 |
| propaganda | spin_doctor | 108 | 25.93 | 72.22 | 6.46 | 83.59 | 19.46 | -11.37 |
| bunker | civil_defence | 359 | 24.51 | 71.03 | 5.94 | 84.27 | 18.57 | -13.24 |
| propaganda | red_lines | 56 | 25 | 67.86 | 6.64 | 83.46 | 18.36 | -15.61 |
| fortress | spin_doctor | 49 | 24.49 | 69.39 | 6.36 | 83.67 | 18.13 | -14.28 |
| early_warning | hardened_nc3 | 179 | 24.02 | 72.63 | 6.21 | 83.51 | 17.81 | -10.89 |
| pollster | spin_doctor | 253 | 24.11 | 72.33 | 6.44 | 84.87 | 17.67 | -12.54 |
| ambassador | hotline_protocol | 47 | 23.4 | 74.47 | 6.46 | 84.11 | 16.95 | -9.64 |
| spin_doctor | strategic_ambiguity | 189 | 23.28 | 73.54 | 6.5 | 83.54 | 16.79 | -9.99 |
| hotline_protocol | red_lines | 52 | 23.08 | 69.23 | 6.41 | 84.14 | 16.67 | -14.91 |
| hardened_nc3 | pollster | 40 | 22.5 | 75 | 6.26 | 84.96 | 16.24 | -9.96 |

## Piece ending profiles

Win rate and ending-kind mix with vs without each piece (heuristic when run, otherwise all policies). Profile Δ is the total-variation distance in percentage points.

| Piece | Pool | Rarity | Offered | Buy rate | Held runs | Wins | Share of wins | Δ win | Δ nuclear | Profile Δ |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hawk_general | advisor | uncommon | 12102 | 2.78% | 337 | 5 | 0.37 | -5.42 | 5.74 | 5.97 |
| dove_fm | advisor | rare | 5075 | 13.04% | 662 | 208 | 15.26 | 25.45 | -29.99 | 29.99 |
| paranoid_intel | advisor | common | 14986 | 22.73% | 3407 | 331 | 24.28 | 3.5 | 0.62 | 4.2 |
| cautious_intel | advisor | common | 14979 | 13.42% | 2010 | 125 | 9.17 | -0.66 | 1.72 | 1.75 |
| spin_doctor | advisor | uncommon | 11900 | 3.3% | 393 | 85 | 6.24 | 15.11 | -8.74 | 15.19 |
| ambassador | advisor | uncommon | 11928 | 1.61% | 192 | 17 | 1.25 | 2.06 | 1.54 | 3.59 |
| cyber_director | advisor | uncommon | 12119 | 0.23% | 28 | 4 | 0.29 | 7.48 | 2.34 | 9.9 |
| treasury_hawk | advisor | common | 18047 | 13.6% | 2455 | 140 | 10.27 | -1.27 | 2.42 | 2.46 |
| fixer | advisor | uncommon | 12099 | 3.55% | 428 | 40 | 2.93 | 2.59 | -4.02 | 4.1 |
| admiral | advisor | uncommon | 11614 | 14.03% | 1629 | 147 | 10.79 | 2.4 | 0.05 | 2.46 |
| peace_leader | advisor | common | 17997 | 13.1% | 2357 | 154 | 11.3 | -0.32 | -21.02 | 21.36 |
| contractor | advisor | rare | 5141 | 2.65% | 136 | 1 | 0.07 | -6.12 | -38.79 | 44.91 |
| iron_nerve | advisor | legendary | 2447 | 8.26% | 202 | 24 | 1.76 | 5.12 | -5.21 | 5.29 |
| long_table | advisor | legendary | 2510 | 8.21% | 206 | 15 | 1.1 | 0.47 | 0.12 | 0.67 |
| field_marshal | advisor | rare | 5182 | 2.7% | 140 | 3 | 0.22 | -4.71 | -1.96 | 7.31 |
| press_office | advisor | rare | 5171 | 3.73% | 193 | 20 | 1.47 | 3.58 | -2.05 | 3.66 |
| attache | advisor | uncommon | 11742 | 6.98% | 820 | 71 | 5.21 | 1.92 | -1.61 | 1.92 |
| lobby | advisor | uncommon | 11727 | 10.74% | 1259 | 86 | 6.31 | 0.02 | 1.04 | 1.14 |
| pollster | advisor | common | 17643 | 17.11% | 3015 | 254 | 18.64 | 1.9 | -9.6 | 9.65 |
| early_warning | asset | uncommon | 11372 | 19.17% | 2180 | 235 | 17.24 | 4.45 | -1.37 | 4.53 |
| back_channel | asset | uncommon | 12190 | 0.83% | 101 | 10 | 0.73 | 3.1 | 0.79 | 3.96 |
| cyber_unit | asset | uncommon | 12287 | 0.1% | 12 | 2 | 0.15 | 9.86 | -0.04 | 9.93 |
| missile_defence | asset | uncommon | 11944 | 0.55% | 66 | 8 | 0.59 | 5.32 | -0.04 | 5.4 |
| blue_water_fleet | asset | uncommon | 12079 | 1.28% | 155 | 4 | 0.29 | -4.27 | 7 | 7 |
| hardened_nc3 | asset | rare | 5145 | 12.05% | 620 | 91 | 6.68 | 8.11 | -2.82 | 8.19 |
| commercial_sat | asset | common | 19284 | 0.67% | 128 | 7 | 0.51 | -1.35 | 1.01 | 1.36 |
| allied_basing | asset | common | 16888 | 20.49% | 3460 | 306 | 22.45 | 2.45 | 0.15 | 2.6 |
| strategic_reserve | asset | common | 17945 | 13.97% | 2507 | 156 | 11.45 | -0.68 | 1.68 | 1.68 |
| rapid_response | asset | uncommon | 12056 | 0.46% | 56 | 2 | 0.15 | -3.25 | 4.14 | 4.14 |
| signals_intercept | asset | rare | 5106 | 5.46% | 279 | 27 | 1.98 | 2.9 | -2.4 | 2.98 |
| civil_defence | asset | uncommon | 11520 | 17.2% | 1981 | 265 | 19.44 | 7.28 | -8.5 | 8.53 |
| deadman_switch | asset | legendary | 2530 | 2.81% | 71 | 10 | 0.73 | 7.3 | -17.24 | 17.32 |
| perfect_intel | asset | legendary | 2554 | 4.78% | 122 | 9 | 0.66 | 0.57 | 0.23 | 0.87 |
| open_line | asset | legendary | 2483 | 3.5% | 87 | 6 | 0.44 | 0.08 | 4 | 4.16 |
| war_economy | asset | legendary | 2549 | 8.63% | 220 | 16 | 1.17 | 0.46 | -5.71 | 5.79 |
| whispers | asset | rare | 5025 | 2.53% | 127 | 14 | 1.03 | 4.24 | 0.09 | 4.33 |
| ledger | asset | rare | 5262 | 3.5% | 184 | 10 | 0.73 | -1.39 | 3.61 | 3.61 |
| war_bonds | asset | rare | 5073 | 17.01% | 863 | 70 | 5.14 | 1.35 | 1.03 | 2.58 |
| tripwire | asset | rare | 5067 | 10.46% | 530 | 34 | 2.49 | -0.41 | 1.57 | 1.57 |
| quiet_room | asset | rare | 5210 | 2.63% | 137 | 8 | 0.59 | -0.98 | 2.78 | 2.78 |
| dockyards | asset | uncommon | 12040 | 1.13% | 136 | 6 | 0.44 | -2.42 | 7.11 | 7.11 |
| bunker | asset | uncommon | 11769 | 10.65% | 1253 | 169 | 12.4 | 7.12 | -3.89 | 7.2 |
| war_room | asset | uncommon | 11948 | 7.27% | 869 | 78 | 5.72 | 2.26 | -2.35 | 2.43 |
| staff_college | asset | common | 18545 | 5.19% | 961 | 50 | 3.67 | -1.69 | -0.79 | 2.49 |
| trade_desk | asset | common | 18286 | 13.7% | 2505 | 160 | 11.74 | -0.49 | 1.21 | 1.21 |
| courier | asset | common | 18327 | 13.23% | 2423 | 197 | 14.45 | 1.5 | -11.18 | 11.19 |
| launch_on_warning | doctrine | rare | 5121 | 3.36% | 172 | 0 | 0 | -6.87 | 15.01 | 15.01 |
| deterrence_by_denial | doctrine | uncommon | 12028 | 0.79% | 95 | 9 | 0.66 | 2.67 | -1.28 | 2.75 |
| strategic_ambiguity | doctrine | uncommon | 11949 | 3.97% | 474 | 67 | 4.92 | 7.5 | -3.5 | 7.5 |
| no_first_use | doctrine | uncommon | 11776 | 10.57% | 1245 | 32 | 2.35 | -4.53 | -9.51 | 14.04 |
| escalate_to_deescalate | doctrine | rare | 5300 | 2.11% | 112 | 4 | 0.29 | -3.26 | 3.25 | 3.27 |
| alliance_first | doctrine | common | 15278 | 22.9% | 3499 | 273 | 20.03 | 1.2 | 1.48 | 2.68 |
| fortress | doctrine | common | 15284 | 18.37% | 2804 | 219 | 16.07 | 1.16 | -0.95 | 1.28 |
| transparency | doctrine | uncommon | 11751 | 9.67% | 1136 | 58 | 4.26 | -1.81 | -2.25 | 4.18 |
| red_lines | doctrine | rare | 5130 | 3.84% | 197 | 27 | 1.98 | 6.96 | -2.69 | 7.03 |
| hotline_protocol | doctrine | uncommon | 11886 | 8.78% | 1044 | 142 | 10.42 | 7.16 | -14.7 | 14.7 |
| predelegation | doctrine | uncommon | 12232 | 1.23% | 151 | 10 | 0.73 | -0.19 | 0.74 | 1.33 |
| minimal_deterrence | doctrine | rare | 5176 | 2.22% | 115 | 15 | 1.1 | 6.26 | -45.38 | 45.46 |
| madman_theory | doctrine | legendary | 2447 | 8.79% | 215 | 9 | 0.66 | -2.66 | 9.75 | 9.75 |
| brinkmanship | doctrine | legendary | 2462 | 3.45% | 85 | 1 | 0.07 | -5.66 | 11.97 | 11.97 |
| domino_theory | doctrine | legendary | 2531 | 8.81% | 223 | 16 | 1.17 | 0.36 | -3.59 | 3.68 |
| the_button | doctrine | legendary | 2458 | 2.6% | 64 | 1 | 0.07 | -5.27 | 7.27 | 7.27 |
| second_strike | doctrine | rare | 5159 | 2.99% | 154 | 6 | 0.44 | -2.94 | 4.32 | 4.32 |
| propaganda | doctrine | uncommon | 11530 | 3.82% | 441 | 60 | 4.4 | 6.94 | -4.8 | 6.94 |

## Weakest pieces

Lowest combined rank of buy rate and |Δ win|: pieces players do not want, or that do not change whether runs are won.

| # | Piece | Pool | Rarity | Buy rate | Held runs | Δ win |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | predelegation | doctrine | uncommon | 1.23% | 151 | -0.19 |
| 2 | commercial_sat | asset | common | 0.67% | 128 | -1.35 |
| 3 | open_line | asset | legendary | 3.5% | 87 | 0.08 |
| 4 | quiet_room | asset | rare | 2.63% | 137 | -0.98 |
| 5 | dockyards | asset | uncommon | 1.13% | 136 | -2.42 |

## Per-card table (heuristic)

Seen = presentations; L% = share of plays resolved left; Δesc = mean applied escalation; lev = mean leverage scored; swing = mean |Δ| over the five meters per play; gap = mean distance between the two previews; impact = swing + gap.

| Card | Seen | Runs % | Left | Right | L% | Timeouts | Buried | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| adv_01_a_senior_defence_source | 315 | 1.58 | 37 | 278 | 11.7 | 0 | 0 | 0 | 110.9 | 8.29 | 19.34 | 27.63 |
| adv_04_over_her_head | 13 | 0.07 | 11 | 2 | 84.6 | 1 | 0 | -0.77 | 261.5 | 9.08 | 22.85 | 31.92 |
| adv_06_you_may_prefer_not_to_know | 169 | 0.85 | 8 | 159 | 4.8 | 0 | 2 | 0 | 65.1 | 2.04 | 7.43 | 9.47 |
| adv_07_the_army_will_hear_it | 78 | 0.39 | 28 | 50 | 35.9 | 2 | 0 | -0.06 | 155.2 | 14.59 | 33.59 | 48.18 |
| adv_08_a_number_not_on_any_list | 233 | 1.17 | 11 | 222 | 4.7 | 0 | 0 | 0 | 90.8 | 3.14 | 10.56 | 13.7 |
| adv_09_the_other_seven | 1479 | 7.4 | 400 | 1079 | 27 | 0 | 0 | 0 | 101.9 | 6.11 | 16.96 | 23.07 |
| adv_10_three_days | 873 | 4.37 | 137 | 735 | 15.7 | 0 | 1 | 1.9 | 84.5 | 5.62 | 13.03 | 18.65 |
| adv_12_a_tourist_visa | 106 | 0.53 | 57 | 49 | 53.8 | 0 | 0 | 0 | 171.7 | 3.66 | 10.95 | 14.61 |
| adv_13_ninety_percent | 16 | 0.08 | 0 | 16 | 0 | 0 | 0 | 0 | 228.4 | 2.5 | 9.88 | 12.38 |
| adv_15_the_word_ceiling | 734 | 3.67 | 28 | 706 | 3.8 | 0 | 0 | 0 | 161 | 8.16 | 22.6 | 30.76 |
| adv_16_a_fellowship_abroad | 156 | 0.78 | 140 | 13 | 91.5 | 0 | 3 | 0 | 72.2 | 8.25 | 16.92 | 25.17 |
| adv_17_forty_minutes | 630 | 3.15 | 223 | 407 | 35.4 | 0 | 0 | -0.07 | 140 | 7.29 | 15.11 | 22.41 |
| adv_18_as_a_person | 849 | 4.25 | 615 | 234 | 72.4 | 0 | 0 | 0 | 66.1 | 12.6 | 27.06 | 39.66 |
| adv_19_both_sides_of_the_border | 47 | 0.24 | 33 | 14 | 70.2 | 0 | 0 | 0 | 63.5 | 8.04 | 16.26 | 24.3 |
| adv_20_the_minutes | 975 | 4.88 | 553 | 421 | 56.8 | 0 | 1 | 0 | 91.7 | 6.67 | 10.75 | 17.42 |
| adv_21_a_line_at_the_bottom | 1594 | 8 | 0 | 1586 | 0 | 0 | 8 | 0 | 294.9 | 13.32 | 13.75 | 27.07 |
| adv_22_seven_times_in_ten | 38 | 0.19 | 9 | 29 | 23.7 | 0 | 0 | 0.79 | 222.3 | 7.16 | 15.92 | 23.08 |
| adv_23_as_if_you_had_not_said_it | 349 | 1.75 | 347 | 2 | 99.4 | 0 | 0 | 0 | 145.4 | 3.84 | 17.6 | 21.44 |
| adv_24_engineers | 86 | 0.44 | 75 | 11 | 87.2 | 0 | 0 | 7.27 | 353.9 | 16.07 | 37 | 53.07 |
| adv_25_one_of_them_did | 47 | 0.24 | 28 | 19 | 59.6 | 4 | 0 | 1.57 | 99.3 | 12.89 | 27.17 | 40.06 |
| adv_26_the_square_does_not_keep_a_diary | 31 | 0.16 | 6 | 25 | 19.4 | 0 | 0 | 0 | 75 | 7.58 | 15 | 22.58 |
| adv_28_the_florist | 73 | 0.37 | 66 | 5 | 93 | 0 | 2 | 0 | 92.1 | 6.39 | 14.86 | 21.26 |
| ally_01_what_will_you_do | 10746 | 53.73 | 5763 | 4982 | 53.6 | 0 | 1 | 1.62 | 43.8 | 9.6 | 19.18 | 28.78 |
| ally_02_the_resolution | 9501 | 47.52 | 7129 | 2372 | 75 | 0 | 0 | 0 | 51 | 6.6 | 14.33 | 20.92 |
| ally_03_the_liaison | 10897 | 54.49 | 4369 | 6528 | 40.1 | 544 | 0 | 0 | 48.7 | 10.03 | 19.93 | 29.96 |
| ally_04_northern_anvil | 9587 | 47.94 | 3353 | 6233 | 35 | 0 | 1 | -0.08 | 56.6 | 15.6 | 32.25 | 47.86 |
| ally_05_vestria_applies | 10968 | 54.84 | 5756 | 5211 | 52.5 | 0 | 1 | 2.25 | 73.5 | 10.45 | 20.97 | 31.42 |
| ally_06_stolen_paper | 11299 | 56.5 | 8857 | 2441 | 78.4 | 0 | 1 | 0 | 91.2 | 10.11 | 21.9 | 32.01 |
| ally_07_the_runway_bill | 9685 | 48.43 | 4893 | 4792 | 50.5 | 0 | 0 | 0 | 34 | 12.1 | 24.3 | 36.4 |
| ally_08_whose_rules | 7598 | 38 | 1468 | 6129 | 19.3 | 369 | 1 | -0.43 | 134.8 | 15.39 | 33.65 | 49.05 |
| ally_09_a_second_signature | 7428 | 37.14 | 3730 | 3697 | 50.2 | 0 | 1 | -1 | 105.5 | 7.67 | 15.47 | 23.13 |
| ally_10_the_free_vote | 11266 | 56.33 | 6440 | 4822 | 57.2 | 0 | 4 | 0 | 68.3 | 12.98 | 26.17 | 39.14 |
| ally_11_is_a_grid_armed | 7347 | 36.74 | 3646 | 3700 | 49.6 | 0 | 1 | 2.32 | 178 | 10.77 | 21.33 | 32.1 |
| ally_12_forty_observers | 5313 | 26.57 | 593 | 4719 | 11.2 | 0 | 1 | -2 | 168.4 | 12.52 | 26.9 | 39.42 |
| ally_13_two_of_eleven | 5356 | 26.79 | 3313 | 2043 | 61.9 | 0 | 0 | -1.15 | 148.8 | 14.13 | 24.56 | 38.69 |
| ally_14_the_council_voted | 1712 | 8.56 | 1339 | 372 | 78.3 | 0 | 1 | 7.16 | 217.3 | 21.85 | 43.02 | 64.87 |
| ally_15_caldors_objection | 1755 | 8.78 | 944 | 811 | 53.8 | 85 | 0 | -0.09 | 196.4 | 18.77 | 37.82 | 56.58 |
| ally_16_inside_the_ring | 1538 | 7.69 | 270 | 1268 | 17.6 | 0 | 0 | -0.87 | 158.6 | 18.06 | 42.68 | 60.74 |
| ally_17_the_fourth_call | 1050 | 5.26 | 860 | 188 | 82.1 | 0 | 2 | 0 | 151.3 | 15.07 | 30.06 | 45.12 |
| ally_18_a_form_of_words | 265 | 1.33 | 172 | 92 | 65.2 | 0 | 1 | 3.32 | 196.8 | 12.27 | 24.18 | 36.45 |
| blockade_01_the_quarantine | 11292 | 56.46 | 5034 | 6258 | 44.6 | 0 | 0 | 2.23 | 29.1 | 7.64 | 15.92 | 23.57 |
| blockade_02_the_generals_line | 2789 | 13.95 | 313 | 2475 | 11.2 | 0 | 1 | 4.9 | 75.9 | 9.95 | 11.86 | 21.81 |
| blockade_03_the_ferry | 2138 | 10.69 | 1059 | 1077 | 49.6 | 98 | 2 | 3.57 | 175.3 | 14.95 | 29.75 | 44.71 |
| blockade_04_the_schedule | 5770 | 28.85 | 1131 | 4639 | 19.6 | 297 | 0 | 1.52 | 28.2 | 17.74 | 31.47 | 49.21 |
| blockade_05_the_manifest | 6257 | 31.29 | 737 | 5520 | 11.8 | 0 | 0 | -1.17 | 24.2 | 9.23 | 19.98 | 29.21 |
| blockade_08_the_ferry_line | 1026 | 5.13 | 248 | 776 | 24.2 | 63 | 2 | 1.21 | 204.4 | 22.02 | 37.54 | 59.56 |
| blockade_09_boarded | 666 | 3.33 | 148 | 518 | 22.2 | 0 | 0 | -0.37 | 64.3 | 17.11 | 37.6 | 54.71 |
| blockade_10_the_release | 1812 | 9.07 | 965 | 844 | 53.3 | 0 | 3 | 2.12 | 156.4 | 24.91 | 35.97 | 60.89 |
| blockade_06_the_word | 456 | 2.28 | 122 | 334 | 26.8 | 0 | 0 | 1.33 | 88.9 | 6.76 | 17 | 23.76 |
| blockade_14_the_first_hull | 2892 | 14.47 | 2062 | 829 | 71.3 | 136 | 1 | 8.04 | 83.5 | 23.72 | 35.12 | 58.84 |
| blockade_15_the_second_hull | 746 | 3.74 | 175 | 570 | 23.5 | 0 | 1 | 0.36 | 169.7 | 25.4 | 43.32 | 68.72 |
| blockade_17_hold_and_search | 954 | 4.77 | 32 | 922 | 3.4 | 0 | 0 | 2.2 | 76.2 | 6.42 | 16.12 | 22.54 |
| blockade_18_the_hole | 811 | 4.06 | 773 | 37 | 95.4 | 0 | 1 | 5.87 | 131.2 | 14.2 | 41.07 | 55.27 |
| blockade_12_the_call | 12233 | 61.17 | 12137 | 96 | 99.2 | 0 | 0 | -7.83 | 50.6 | 15.03 | 29.41 | 44.44 |
| blockade_16_eight_minutes | 1358 | 6.8 | 818 | 539 | 60.3 | 80 | 1 | -2.96 | 222.3 | 22.07 | 43.9 | 65.97 |
| blockade_21_the_formula | 13653 | 68.27 | 8505 | 5145 | 62.3 | 0 | 3 | -5.67 | 63.1 | 20.45 | 37.05 | 57.5 |
| blockade_11_the_queue | 2218 | 11.1 | 1749 | 469 | 78.9 | 0 | 0 | 0 | 139.9 | 12.45 | 19.55 | 32 |
| blockade_13_what_they_see | 1817 | 9.09 | 613 | 1202 | 33.8 | 0 | 2 | 0.51 | 179.7 | 13.84 | 33.97 | 47.81 |
| blockade_22_two_days | 242 | 1.21 | 173 | 69 | 71.5 | 0 | 0 | -3.32 | 177.5 | 20.25 | 37.49 | 57.74 |
| blockade_25_their_tankers | 1585 | 7.93 | 1449 | 135 | 91.5 | 0 | 1 | -8.95 | 200.9 | 18.13 | 31.04 | 49.17 |
| blockade_07_her_ships | 251 | 1.25 | 27 | 224 | 10.8 | 0 | 0 | 2.02 | 151.1 | 9.12 | 26.84 | 35.96 |
| blockade_19_the_carrier | 13 | 0.07 | 5 | 8 | 38.5 | 0 | 0 | 2.85 | 385.7 | 13.08 | 24.69 | 37.77 |
| blockade_20_thirty_one_days | 12 | 0.06 | 5 | 7 | 41.7 | 0 | 0 | 1.58 | 198 | 11.08 | 21.75 | 32.83 |
| blockade_26_the_order | 48 | 0.25 | 43 | 5 | 89.6 | 0 | 0 | -0.31 | 308.5 | 15.77 | 40.25 | 56.02 |
| blockade_23_two_numbers | 446 | 2.23 | 186 | 260 | 41.7 | 0 | 0 | 1.9 | 152.8 | 6.59 | 13.4 | 19.99 |
| blockade_24_eleven_days | 352 | 1.77 | 286 | 66 | 81.3 | 0 | 0 | 0 | 153.8 | 13.57 | 27.55 | 41.12 |
| bluff_01_the_shrug | 5793 | 28.88 | 1951 | 3824 | 33.8 | 296 | 18 | 11.38 | 78.3 | 29.54 | 48.11 | 77.66 |
| bluff_02_the_editorial | 11503 | 28.01 | 3104 | 2496 | 55.4 | 0 | 5903 | 6.44 | 59.9 | 20.22 | 18.88 | 39.11 |
| bluff_03_the_ally | 5539 | 27.7 | 3494 | 2045 | 63.1 | 0 | 0 | 5.11 | 65.5 | 21.33 | 47.05 | 68.39 |
| bluff_04_the_markets | 11507 | 28.2 | 2488 | 3152 | 44.1 | 0 | 5867 | 8.17 | 62.3 | 20.07 | 19 | 39.07 |
| bluff_05_the_staff | 5737 | 28.69 | 3007 | 2730 | 52.4 | 256 | 0 | 8.21 | 66.4 | 28.71 | 50.33 | 79.04 |
| bluff_06_the_envoy | 5543 | 27.72 | 4729 | 814 | 85.3 | 0 | 0 | -1.88 | 52.3 | 15.26 | 33.71 | 48.98 |
| cyberew_01_resident | 7076 | 35.38 | 458 | 6617 | 6.5 | 0 | 1 | 1.87 | 34.6 | 4.63 | 15.52 | 20.14 |
| cyberew_02_liaison_sample | 3636 | 18.18 | 2165 | 1470 | 59.6 | 0 | 1 | 0 | 90.6 | 6.15 | 12.8 | 18.95 |
| cyberew_03_correlator_word | 1721 | 8.61 | 90 | 1630 | 5.2 | 102 | 1 | 0 | 140 | 6.24 | 9.01 | 15.24 |
| cyberew_04_dark_sector | 458 | 2.29 | 342 | 116 | 74.7 | 24 | 0 | 1.49 | 42.5 | 8.96 | 18.29 | 27.25 |
| cyberew_05_it_writes | 6553 | 32.77 | 5161 | 1392 | 78.8 | 292 | 0 | 1.95 | 53.7 | 6.75 | 15.22 | 21.97 |
| cyberew_06_consistent_with | 3559 | 17.81 | 1595 | 1964 | 44.8 | 0 | 0 | 3.22 | 181.8 | 9.97 | 23.72 | 33.69 |
| cyberew_07_working_hours | 12 | 0.06 | 11 | 1 | 91.7 | 0 | 0 | 3.42 | 200.4 | 6.33 | 18.67 | 25 |
| cyberew_08_the_purge | 1931 | 9.66 | 1551 | 379 | 80.4 | 0 | 1 | 2.1 | 161.9 | 5.6 | 11.3 | 16.9 |
| cyberew_09_what_it_asked | 364 | 1.82 | 51 | 313 | 14 | 0 | 0 | -0.5 | 188.9 | 9.08 | 25.77 | 34.84 |
| cyberew_10_reciprocity | 6 | 0.03 | 3 | 3 | 50 | 0 | 0 | 4.67 | 509.3 | 12.33 | 33.67 | 46 |
| cyberew_11_their_reading | 3 | 0.02 | 2 | 1 | 66.7 | 0 | 0 | -5.33 | 515.7 | 16.33 | 37 | 53.33 |
| cyberew_12_day_twenty_nine | 3475 | 17.39 | 1236 | 2237 | 35.6 | 0 | 2 | 0 | 123.9 | 9.56 | 20.47 | 30.03 |
| cyberew_13_page_eleven | 205 | 1.02 | 199 | 4 | 98 | 0 | 2 | 0 | 179.1 | 12.14 | 31.94 | 44.07 |
| cyberew_14_paper_and_phone | 421 | 2.11 | 72 | 349 | 17.1 | 0 | 0 | 2.22 | 549.8 | 5.95 | 13.57 | 19.52 |
| cyberew_15_thirty_one_attempts | 144 | 0.72 | 64 | 80 | 44.4 | 0 | 0 | 0.78 | 712.5 | 6.89 | 13.77 | 20.66 |
| cyberew_16_our_own_tool | 8 | 0.04 | 1 | 7 | 12.5 | 0 | 0 | 0.63 | 202.5 | 5.75 | 18.88 | 24.63 |
| cyberew_17_written_not_seen | 2313 | 11.57 | 611 | 1701 | 26.4 | 0 | 1 | 1.54 | 199.1 | 9.37 | 21.29 | 30.66 |
| cyberew_18_the_tasking | 3172 | 15.87 | 1539 | 1631 | 48.5 | 0 | 2 | 2.86 | 176.8 | 8.03 | 16.56 | 24.59 |
| cyberew_19_the_hospitals | 1428 | 7.14 | 395 | 1032 | 27.7 | 0 | 1 | 1.93 | 154.7 | 9.63 | 21.55 | 31.19 |
| cyberew_20_clean_build | 2355 | 11.78 | 125 | 2226 | 5.3 | 0 | 4 | 2.47 | 256.2 | 13.82 | 35.46 | 49.27 |
| cyberew_21_the_motion | 954 | 4.78 | 375 | 579 | 39.3 | 0 | 0 | -0.68 | 406 | 24.71 | 43.11 | 67.82 |
| cyberew_22_their_bombers | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | -13 | 137 | 27 | 57 | 84 |
| debris_01_the_cloud | 6825 | 34.13 | 3978 | 2847 | 58.3 | 0 | 0 | 3.11 | 51.9 | 7.93 | 15.43 | 23.36 |
| debris_02_the_intercept | 16 | 0.08 | 0 | 16 | 0 | 0 | 0 | 0 | 68.9 | 3.63 | 20.75 | 24.38 |
| debris_03_six_birds | 3974 | 19.88 | 1680 | 2292 | 42.3 | 196 | 2 | 4.11 | 136.6 | 9.62 | 18.95 | 28.57 |
| debris_04_the_premium | 1457 | 7.29 | 516 | 939 | 35.5 | 0 | 2 | 3.22 | 216.5 | 11.44 | 12.67 | 24.11 |
| debris_05_the_catalogue | 4979 | 24.9 | 3210 | 1767 | 64.5 | 0 | 2 | 3.99 | 98 | 11.21 | 19.34 | 30.55 |
| debris_06_their_reply | 10027 | 50.15 | 9460 | 567 | 94.3 | 0 | 0 | 0.35 | 101.8 | 6.46 | 15.76 | 22.22 |
| debris_07_forty_one_delegations | 972 | 4.86 | 158 | 814 | 16.3 | 0 | 0 | 2.65 | 144 | 14.16 | 30.61 | 44.78 |
| debris_08_the_question_mark | 15 | 0.08 | 9 | 6 | 60 | 0 | 0 | 0.93 | 198.9 | 16.6 | 33.87 | 50.47 |
| debris_09_the_tug | 1743 | 8.72 | 1139 | 604 | 65.3 | 0 | 0 | 1.06 | 72.1 | 8.73 | 11.16 | 19.89 |
| debris_10_the_proposal | 3364 | 16.82 | 497 | 2860 | 14.8 | 0 | 7 | 3.01 | 296.1 | 16.6 | 39.18 | 55.78 |
| debris_12_they_signed | 460 | 2.3 | 334 | 126 | 72.6 | 0 | 0 | -2.39 | 216.4 | 10.44 | 20.6 | 31.03 |
| debris_13_the_offer | 2407 | 12.04 | 404 | 2002 | 16.8 | 0 | 1 | 0 | 132.6 | 4.12 | 12.85 | 16.97 |
| debris_14_the_second_breakup | 3422 | 17.12 | 919 | 2500 | 26.9 | 170 | 3 | 3.34 | 269.5 | 15.83 | 30.49 | 46.32 |
| debris_15_the_glass_house | 2 | 0.01 | 0 | 2 | 0 | 0 | 0 | 0 | 182 | 7 | 24 | 31 |
| debris_16_supplier_or_combatant | 8 | 0.04 | 3 | 5 | 37.5 | 0 | 0 | 2.38 | 246.1 | 11.25 | 23.88 | 35.13 |
| debris_18_without_consensus | 4 | 0.02 | 3 | 1 | 75 | 0 | 0 | 1.25 | 109.3 | 9.5 | 21.5 | 31 |
| debris_19_the_bill | 2867 | 14.35 | 1389 | 1472 | 48.5 | 0 | 6 | 0 | 180.9 | 15.52 | 18.12 | 33.64 |
| debris_20_an_inch | 375 | 1.88 | 297 | 77 | 79.4 | 0 | 1 | -5.74 | 261.3 | 11.17 | 18.62 | 29.8 |
| debris_21_the_unwritten | 2544 | 12.72 | 1267 | 1277 | 49.8 | 0 | 0 | -1.49 | 276.4 | 14.85 | 30.11 | 44.95 |
| debris_22_two_events | 2521 | 12.62 | 679 | 1838 | 27 | 128 | 4 | 3.19 | 200.8 | 16.12 | 26.78 | 42.91 |
| defector_01_the_ferry | 7199 | 35.99 | 1512 | 5687 | 21 | 0 | 0 | 0 | 34.7 | 5.39 | 12.34 | 17.72 |
| defector_02_the_embassy_gate | 3997 | 19.99 | 2420 | 1577 | 60.5 | 0 | 0 | -0.39 | 78.1 | 3.81 | 8.03 | 11.84 |
| defector_03_the_basement | 1743 | 8.72 | 1024 | 717 | 58.8 | 84 | 2 | 2.41 | 167.9 | 7.3 | 15.87 | 23.17 |
| defector_04_lantern | 12606 | 63.04 | 5016 | 7584 | 39.8 | 0 | 6 | 2.63 | 89.9 | 8.15 | 17.55 | 25.7 |
| defector_05_the_exercise_order | 7459 | 37.32 | 6502 | 945 | 87.3 | 0 | 12 | 5.35 | 144.1 | 13.53 | 19.34 | 32.87 |
| defector_06_the_seam | 4648 | 23.24 | 3487 | 1160 | 75 | 0 | 1 | -1.82 | 102.6 | 10.21 | 18.91 | 29.12 |
| defector_07_nine_oclock | 1733 | 8.67 | 844 | 888 | 48.7 | 0 | 1 | 2.79 | 175.5 | 8.07 | 16.77 | 24.83 |
| defector_08_on_background | 25 | 0.13 | 4 | 21 | 16 | 0 | 0 | 4.2 | 371.9 | 9 | 18.84 | 27.84 |
| defector_09_everything_fits | 456 | 2.28 | 109 | 345 | 24 | 0 | 2 | 1.92 | 559.8 | 8.08 | 21.11 | 29.19 |
| defector_10_nine_days | 271 | 1.36 | 54 | 217 | 19.9 | 0 | 0 | 2.84 | 174.2 | 6.47 | 12.73 | 19.21 |
| defector_11_corroboration | 38 | 0.19 | 26 | 11 | 70.3 | 0 | 1 | 1.73 | 129.9 | 4.43 | 7.05 | 11.49 |
| defector_12_the_package | 54 | 0.27 | 28 | 26 | 51.9 | 0 | 0 | 1.3 | 142.5 | 5.83 | 10.67 | 16.5 |
| defector_13_seventy_two_hours | 1728 | 8.64 | 1508 | 218 | 87.4 | 0 | 2 | 0 | 116.4 | 3.48 | 10.3 | 13.78 |
| defector_14_absent_without_leave | 2937 | 14.69 | 2788 | 149 | 94.9 | 0 | 0 | -4.46 | 171.5 | 9.28 | 14.14 | 23.42 |
| defector_15_the_winter_colonel | 2540 | 12.71 | 1145 | 1392 | 45.1 | 0 | 3 | 0 | 120.2 | 2.46 | 7.28 | 9.74 |
| defector_16_six_oclock | 4213 | 21.07 | 3905 | 306 | 92.7 | 187 | 2 | 5.64 | 107.4 | 9 | 12.58 | 21.58 |
| defector_17_tuesdays_assessment | 88 | 0.44 | 79 | 9 | 89.8 | 0 | 0 | 4.42 | 277.4 | 8.98 | 18.57 | 27.55 |
| defector_18_the_straits_garrison | 1966 | 9.84 | 292 | 1670 | 14.9 | 92 | 4 | 4.3 | 226.6 | 11.38 | 17.21 | 28.59 |
| defector_19_the_guest | 1065 | 5.33 | 342 | 722 | 32.1 | 0 | 1 | 0.96 | 121.4 | 4.97 | 6.63 | 11.6 |
| defector_20_page_forty | 2259 | 11.3 | 686 | 1566 | 30.5 | 120 | 7 | 3.16 | 194.1 | 10.49 | 25.06 | 35.56 |
| defector_21_the_nineteenth | 1854 | 9.29 | 807 | 1044 | 43.6 | 0 | 3 | -0.6 | 289.4 | 16.52 | 34.66 | 51.18 |
| defector_22_courtesies | 750 | 3.75 | 402 | 348 | 53.6 | 0 | 0 | -1.99 | 307.2 | 11.08 | 21.73 | 32.81 |
| defector_23_nothing_crossed | 582 | 2.91 | 570 | 9 | 98.4 | 0 | 3 | 0 | 159.3 | 2.25 | 6.95 | 9.2 |
| dom_coa_01_the_order_book | 2718 | 13.59 | 416 | 2302 | 15.3 | 0 | 0 | 0 | 37.7 | 9.74 | 18.93 | 28.66 |
| dom_coa_02_allies_or_customers | 2810 | 14.05 | 1795 | 1015 | 63.9 | 0 | 0 | 0 | 38 | 8.28 | 16.07 | 24.35 |
| dom_coa_03_untested | 2680 | 13.4 | 1233 | 1447 | 46 | 0 | 0 | 1.31 | 29.6 | 9.08 | 18.31 | 27.38 |
| dom_coa_04_the_dividend | 2713 | 13.57 | 1819 | 894 | 67 | 0 | 0 | 0 | 29.1 | 7.61 | 15.97 | 23.58 |
| dom_coa_05_the_component | 1726 | 8.63 | 1418 | 308 | 82.2 | 84 | 0 | 0 | 51.2 | 5.84 | 10.89 | 16.72 |
| dom_coa_06_the_lease | 8 | 0.04 | 4 | 4 | 50 | 0 | 0 | 0 | 74.5 | 6.38 | 13.38 | 19.75 |
| dom_coa_07_the_drills | 1395 | 6.98 | 1203 | 192 | 86.2 | 0 | 0 | 0.14 | 59.6 | 5.72 | 10.08 | 15.8 |
| dom_coa_08_two_million_shareholders | 1689 | 8.45 | 1124 | 565 | 66.5 | 0 | 0 | 0 | 70.1 | 10.09 | 14.83 | 24.92 |
| dom_coa_09_the_switch | 1630 | 8.15 | 510 | 1120 | 31.3 | 0 | 0 | 2.78 | 126.3 | 10.08 | 24.01 | 34.09 |
| dom_coa_10_museum_with_a_budget | 1649 | 8.25 | 1227 | 422 | 74.4 | 0 | 0 | 3.46 | 125.3 | 13.24 | 25.07 | 38.31 |
| dom_coa_11_the_tender | 1688 | 8.44 | 1149 | 539 | 68.1 | 0 | 0 | 0 | 139.9 | 10.28 | 19.67 | 29.95 |
| dom_coa_12_the_relay_layer | 1642 | 8.22 | 289 | 1353 | 17.6 | 0 | 0 | 0.39 | 97.2 | 2.68 | 14.62 | 17.3 |
| dom_coa_13_nine_thousand | 1273 | 6.37 | 835 | 436 | 65.7 | 0 | 2 | 3.95 | 245 | 14.93 | 23.8 | 38.73 |
| dom_coa_14_the_open | 1386 | 5.91 | 1307 | 76 | 94.5 | 69 | 3 | 0 | 163 | 7.71 | 5.68 | 13.38 |
| dom_coa_15_dual_use | 1151 | 5.76 | 718 | 433 | 62.4 | 0 | 0 | 0 | 277.2 | 12.49 | 19.92 | 32.41 |
| dom_coa_16_thirty_per_cent | 1004 | 5.02 | 343 | 661 | 34.2 | 0 | 0 | 0 | 192.7 | 9.48 | 23.82 | 33.3 |
| dom_fed_01_two_bulletins | 2610 | 13.05 | 1467 | 1143 | 56.2 | 0 | 0 | 0 | 23.2 | 6.48 | 12.92 | 19.41 |
| dom_fed_02_sixty_one_days | 2685 | 13.43 | 1636 | 1049 | 60.9 | 0 | 0 | 0 | 24.9 | 9.6 | 17.93 | 27.53 |
| dom_fed_03_accreditation | 2700 | 13.5 | 1998 | 702 | 74 | 0 | 0 | 0 | 22.4 | 5.8 | 13.06 | 18.86 |
| dom_fed_04_the_savings_bank | 1656 | 8.28 | 813 | 843 | 49.1 | 0 | 0 | 0 | 51.9 | 6.27 | 11.29 | 17.55 |
| dom_fed_05_the_corridor | 1617 | 8.09 | 1455 | 162 | 90 | 0 | 0 | 0 | 76.1 | 13.06 | 22.03 | 35.09 |
| dom_fed_06_the_figures | 1056 | 5.28 | 46 | 1010 | 4.4 | 0 | 0 | 0 | 39 | 3.11 | 10.48 | 13.6 |
| dom_fed_07_the_straits_price | 1502 | 7.51 | 1146 | 356 | 76.3 | 0 | 0 | 0 | 84.4 | 9.04 | 14.69 | 23.73 |
| dom_fed_08_voskra | 1490 | 7.46 | 1275 | 212 | 85.7 | 73 | 3 | 0.15 | 90.3 | 8.6 | 18.77 | 27.37 |
| dom_fed_09_two_hundred_letters | 1411 | 7.06 | 802 | 608 | 56.9 | 0 | 1 | 0 | 80.3 | 5.98 | 11.84 | 17.82 |
| dom_fed_10_ninety_days | 268 | 1.34 | 90 | 178 | 33.6 | 0 | 0 | 0 | 155.5 | 9.31 | 20.57 | 29.88 |
| dom_fed_11_three_hundred_names | 1470 | 7.35 | 524 | 946 | 35.6 | 0 | 0 | -0.74 | 123.3 | 8.71 | 19.45 | 28.16 |
| dom_fed_12_the_word | 955 | 4.78 | 490 | 461 | 51.5 | 0 | 4 | 2.51 | 275.8 | 8.21 | 16.59 | 24.8 |
| dom_fed_13_fourteen_billion | 996 | 4.99 | 429 | 567 | 43.1 | 0 | 0 | 1.7 | 209.2 | 8.74 | 18.95 | 27.69 |
| dom_fed_14_the_second_bulletin | 955 | 4.78 | 131 | 822 | 13.7 | 45 | 2 | 0 | 125.6 | 9.14 | 12.56 | 21.69 |
| dom_fed_15_the_toast | 972 | 4.87 | 735 | 237 | 75.6 | 0 | 0 | 2.76 | 269.1 | 10.52 | 20.15 | 30.66 |
| dom_fed_16_the_yards | 2501 | 12.51 | 514 | 1986 | 20.6 | 0 | 1 | 0 | 87.5 | 9.29 | 28.56 | 37.85 |
| dom_rep_01_the_tracker | 2766 | 13.83 | 1818 | 948 | 65.7 | 0 | 0 | 0 | 32.6 | 4.68 | 10.04 | 14.72 |
| dom_rep_02_eight_minutes | 2743 | 13.72 | 789 | 1954 | 28.8 | 0 | 0 | 0 | 47.3 | 8.52 | 16.23 | 24.75 |
| dom_rep_03_the_arden_club | 2728 | 13.64 | 2075 | 653 | 76.1 | 0 | 0 | 0.78 | 29.3 | 6.56 | 12.08 | 18.63 |
| dom_rep_04_the_dockers | 2685 | 13.43 | 2198 | 486 | 81.9 | 0 | 1 | 0 | 31.4 | 7.37 | 12.94 | 20.31 |
| dom_rep_05_day_twelve | 1713 | 8.57 | 1670 | 43 | 97.5 | 0 | 0 | 0 | 67.4 | 11.98 | 12.4 | 24.38 |
| dom_rep_06_the_premiums | 1702 | 8.51 | 1554 | 148 | 91.3 | 0 | 0 | 0 | 78.4 | 8.94 | 11.79 | 20.73 |
| dom_rep_07_the_letter_of_intent | 1656 | 8.28 | 1312 | 343 | 79.3 | 0 | 1 | 1.61 | 113.9 | 10.7 | 18.84 | 29.53 |
| dom_rep_08_say_it_aloud | 585 | 2.93 | 98 | 487 | 16.8 | 0 | 0 | 0.02 | 130 | 5.87 | 16.05 | 21.92 |
| dom_rep_09_the_focus_group | 1660 | 8.3 | 1055 | 603 | 63.6 | 97 | 2 | 1.27 | 170.4 | 10.08 | 20.44 | 30.52 |
| dom_rep_10_the_steps | 1660 | 8.3 | 1629 | 30 | 98.2 | 0 | 1 | 0 | 75.8 | 5.96 | 13.37 | 19.33 |
| dom_rep_11_twenty_two | 1670 | 8.36 | 111 | 1557 | 6.7 | 0 | 2 | 0 | 98.8 | 9.16 | 19.56 | 28.72 |
| dom_rep_12_the_runways | 553 | 2.77 | 161 | 392 | 29.1 | 0 | 0 | 0 | 117.6 | 9.07 | 19.18 | 28.25 |
| dom_rep_13_the_list | 1239 | 6.2 | 407 | 831 | 32.9 | 56 | 1 | 4.07 | 259.8 | 11.24 | 21.5 | 32.74 |
| dom_rep_14_the_truce | 1974 | 9.87 | 963 | 1009 | 48.8 | 0 | 2 | 0 | 191.7 | 12.28 | 25.22 | 37.5 |
| dom_rep_15_two_capitals | 1281 | 6.42 | 1073 | 207 | 83.8 | 0 | 1 | 0.16 | 211.6 | 9.86 | 22.51 | 32.36 |
| dom_rep_16_the_open_letter | 1202 | 6.02 | 980 | 221 | 81.6 | 0 | 1 | 0.85 | 201.4 | 8.33 | 17.75 | 26.08 |
| falarm_01_one_track | 11365 | 56.83 | 2383 | 8982 | 21 | 558 | 0 | 1.26 | 17.2 | 5.48 | 15.02 | 20.5 |
| falarm_02_real_launch | 7324 | 36.62 | 3961 | 3363 | 54.1 | 0 | 0 | 6.11 | 30.7 | 14.16 | 24.98 | 39.13 |
| falarm_03_ghost_track | 4041 | 20.2 | 3580 | 461 | 88.6 | 0 | 0 | -1.41 | 18.5 | 5.49 | 13.2 | 18.69 |
| falarm_04_the_moon | 3541 | 17.7 | 1241 | 2300 | 35 | 0 | 0 | -0.05 | 21.9 | 4.55 | 10.35 | 14.9 |
| falarm_05_straits_profile | 3030 | 15.15 | 2347 | 683 | 77.5 | 161 | 0 | 1.81 | 37.1 | 7.25 | 17.39 | 24.64 |
| falarm_06_boat_confirmed | 1860 | 9.3 | 630 | 1229 | 33.9 | 0 | 1 | 4.59 | 53.8 | 13.93 | 33.65 | 47.58 |
| falarm_07_sounding_rocket | 1163 | 5.82 | 983 | 180 | 84.5 | 0 | 0 | -2.06 | 47.1 | 8.6 | 17.73 | 26.34 |
| falarm_08_exercise_window | 1895 | 9.48 | 271 | 1622 | 14.3 | 94 | 2 | 1.31 | 107.4 | 5.33 | 19.49 | 24.82 |
| falarm_09_outside_the_box | 1004 | 5.03 | 124 | 879 | 12.4 | 46 | 1 | 7.82 | 182.7 | 22.44 | 23.16 | 45.6 |
| falarm_10_training_tape | 857 | 4.29 | 531 | 326 | 62 | 0 | 0 | -0.52 | 115.4 | 8.33 | 16.64 | 24.97 |
| falarm_11_high_cloud | 1056 | 5.29 | 882 | 174 | 83.5 | 59 | 0 | 1.14 | 321.3 | 5.18 | 16.18 | 21.36 |
| falarm_12_range_hot | 616 | 3.08 | 192 | 424 | 31.2 | 0 | 0 | 1.44 | 309.9 | 6.05 | 14.24 | 20.29 |
| falarm_13_sun_glint | 420 | 2.11 | 285 | 135 | 67.9 | 0 | 0 | -0.17 | 299 | 6.77 | 13.65 | 20.42 |
| falarm_14_six_tracks | 4042 | 20.24 | 1256 | 2772 | 31.2 | 228 | 14 | 7.52 | 311.3 | 15.68 | 28.7 | 44.38 |
| falarm_15_salvo_notified | 1827 | 9.14 | 1689 | 138 | 92.4 | 0 | 0 | -4 | 305.4 | 14.5 | 45.04 | 59.55 |
| falarm_16_reflection | 1896 | 9.48 | 1358 | 537 | 71.7 | 0 | 1 | -0.75 | 332.6 | 9.49 | 20.62 | 30.11 |
| falarm_17_three_keys | 173 | 0.87 | 53 | 119 | 30.8 | 0 | 1 | -0.62 | 323.1 | 6.05 | 14.76 | 20.82 |
| falarm_18_the_doctrine | 35 | 0.18 | 26 | 9 | 74.3 | 0 | 0 | 2.54 | 225 | 9.2 | 18.2 | 27.4 |
| falarm_19_unsleeping | 1281 | 6.42 | 77 | 1204 | 6 | 0 | 0 | -0.97 | 231.5 | 5 | 22.04 | 27.04 |
| falarm_20_measured | 506 | 2.53 | 429 | 77 | 84.8 | 0 | 0 | -0.46 | 130.1 | 4.18 | 13.26 | 17.43 |
| falarm_21_sirens | 658 | 3.29 | 384 | 274 | 58.4 | 0 | 0 | 0 | 355.2 | 5.66 | 10.55 | 16.22 |
| falarm_22_jonah | 5340 | 26.7 | 4589 | 751 | 85.9 | 0 | 0 | -0.86 | 69.9 | 4.02 | 9.02 | 13.04 |
| falarm_23_poisoned_board | 4816 | 24.08 | 1116 | 3698 | 23.2 | 0 | 2 | 2.94 | 150.9 | 9.8 | 21.22 | 31.02 |
| falarm_24_the_pattern | 5743 | 28.74 | 2758 | 2980 | 48.1 | 0 | 5 | 2.91 | 215.3 | 14.7 | 29.81 | 44.51 |
| falarm_25_post_mortem | 2640 | 13.21 | 24 | 2615 | 0.9 | 0 | 1 | 0.02 | 162.6 | 8.98 | 29.37 | 38.35 |
| falarm_26_the_call | 2756 | 13.78 | 2394 | 361 | 86.9 | 0 | 1 | -5.22 | 287.6 | 20.88 | 39.14 | 60.02 |
| fp_cascade_01_same_hour | 11557 | 57.79 | 8563 | 2994 | 74.1 | 0 | 0 | 5.38 | 128.3 | 14.08 | 16.75 | 30.83 |
| fp_cascade_02_the_physics | 2993 | 14.97 | 1664 | 1329 | 55.6 | 0 | 0 | 1.22 | 108.1 | 10.82 | 10.85 | 21.67 |
| fp_cascade_03_the_dark_board | 8299 | 41.5 | 1784 | 6515 | 21.5 | 432 | 0 | 0.84 | 108.5 | 12.67 | 32.57 | 45.24 |
| fp_cascade_04_consistent_with | 8174 | 40.87 | 937 | 7237 | 11.5 | 0 | 0 | -1.31 | 98.2 | 17.23 | 29.32 | 46.55 |
| fp_cascade_07_the_building | 646 | 3.23 | 606 | 40 | 93.8 | 0 | 0 | 6.2 | 110.5 | 16.63 | 31.59 | 48.22 |
| fp_cascade_08a_the_operator | 23 | 0.12 | 23 | 0 | 100 | 0 | 0 | 6.43 | 92.3 | 11.43 | 34.3 | 45.74 |
| fp_cascade_08b_the_shrug | 264 | 1.32 | 247 | 17 | 93.6 | 0 | 0 | 5.7 | 110.5 | 11.82 | 29.63 | 41.44 |
| fp_cascade_09_the_call | 8544 | 42.72 | 555 | 7989 | 6.5 | 0 | 0 | 5.24 | 139.9 | 8.74 | 24.96 | 33.7 |
| fp_cascade_11_the_blind_minute | 1681 | 8.4 | 82 | 1599 | 4.9 | 82 | 0 | 17.89 | 149.5 | 28.54 | 46.87 | 75.42 |
| fp_cascade_12_the_pause | 270 | 1.35 | 8 | 262 | 3 | 0 | 0 | -7.32 | 131.2 | 12 | 22.5 | 34.5 |
| fp_cascade_13_the_name | 8833 | 44.17 | 2172 | 6661 | 24.6 | 0 | 0 | 4.89 | 181.1 | 14.31 | 24.96 | 39.27 |
| fp_cascade_14_the_long_night | 1190 | 5.95 | 853 | 337 | 71.7 | 0 | 0 | 10.72 | 249.8 | 23.38 | 30.74 | 54.13 |
| fp_intercept_01_one_bird | 15035 | 75.18 | 11632 | 3403 | 77.4 | 741 | 0 | 3.97 | 82.3 | 19.4 | 32.36 | 51.75 |
| fp_intercept_02_splash | 6313 | 31.57 | 768 | 5545 | 12.2 | 0 | 0 | -2.49 | 55.3 | 15.54 | 33.39 | 48.93 |
| fp_intercept_03_two_misses | 5187 | 25.94 | 4342 | 845 | 83.7 | 0 | 0 | 6.68 | 78.1 | 18.41 | 34.56 | 52.97 |
| fp_intercept_04a_the_layer_you_did_not_use | 5 | 0.03 | 5 | 0 | 100 | 0 | 0 | 9.2 | 282.4 | 24 | 40 | 64 |
| fp_intercept_04b_splash_zone | 3394 | 16.97 | 1472 | 1922 | 43.4 | 0 | 0 | 2.52 | 69.8 | 15.59 | 32.14 | 47.73 |
| fp_intercept_05_the_line | 8308 | 41.54 | 6652 | 1656 | 80.1 | 0 | 0 | -4.3 | 67.2 | 17.37 | 33.69 | 51.05 |
| fp_intercept_06_the_package | 8172 | 40.86 | 2793 | 5379 | 34.2 | 375 | 0 | 1.02 | 104.2 | 21.77 | 46.91 | 68.68 |
| fp_intercept_07_the_morning_after | 12030 | 60.15 | 3437 | 8593 | 28.6 | 0 | 0 | -7.62 | 50.7 | 16.06 | 21.28 | 37.34 |
| fp_intercept_08_second_track | 1813 | 9.07 | 77 | 1736 | 4.2 | 77 | 0 | 18.67 | 133.1 | 32.64 | 37.7 | 70.34 |
| fp_intercept_09_the_question | 826 | 4.13 | 821 | 5 | 99.4 | 0 | 0 | -2.07 | 171.1 | 17.35 | 36.04 | 53.4 |
| fp_intercept_fa_01_eleven_tracks | 1257 | 6.26 | 915 | 342 | 72.8 | 0 | 0 | 5.2 | 377.3 | 14.23 | 22.56 | 36.79 |
| fp_intercept_fa_02_the_doctrine | 9 | 0.05 | 0 | 9 | 0 | 0 | 0 | 18.67 | 268.3 | 28.11 | 44.44 | 72.56 |
| fp_intercept_fa_03_the_honest_number | 1089 | 5.45 | 249 | 840 | 22.9 | 54 | 0 | 8.82 | 316.4 | 19.44 | 26.52 | 45.96 |
| fp_intercept_fa_04_the_tape | 867 | 4.34 | 435 | 432 | 50.2 | 0 | 0 | -6.56 | 257.1 | 14.32 | 18.85 | 33.17 |
| fp_intercept_fa_05_three_keys | 34 | 0.17 | 10 | 24 | 29.4 | 0 | 0 | 4.82 | 998.1 | 12.18 | 25.91 | 38.09 |
| fp_intercept_fa_06_the_sirens | 66 | 0.33 | 15 | 51 | 22.7 | 0 | 0 | -6.32 | 574.3 | 13.77 | 20.65 | 34.42 |
| fp_line_01_the_hail | 15777 | 78.89 | 12606 | 3171 | 79.9 | 799 | 0 | 5.59 | 66.2 | 18.56 | 35.57 | 54.14 |
| fp_line_02_on_deck | 6832 | 34.16 | 548 | 6284 | 8 | 0 | 0 | -3.19 | 65.7 | 14.53 | 34.18 | 48.71 |
| fp_line_03_warned_off | 5601 | 28.01 | 5288 | 313 | 94.4 | 0 | 0 | 5.81 | 86.7 | 16.09 | 30.49 | 46.58 |
| fp_line_05a_the_carrier | 58 | 0.29 | 50 | 8 | 86.2 | 0 | 0 | 7.38 | 238.3 | 29.76 | 58.12 | 87.88 |
| fp_line_05b_the_chart | 3105 | 15.53 | 2803 | 302 | 90.3 | 0 | 0 | 7.11 | 77.6 | 19.5 | 41.72 | 61.23 |
| fp_line_06_the_seizure | 537 | 2.69 | 535 | 2 | 99.6 | 0 | 0 | -4.94 | 77.6 | 14.37 | 37.85 | 52.22 |
| fp_line_07_the_photographs | 6819 | 34.1 | 486 | 6333 | 7.1 | 0 | 0 | -6.2 | 59.8 | 14.82 | 24.06 | 38.88 |
| fp_line_08_hands_on_the_switch | 8079 | 40.4 | 1634 | 6445 | 20.2 | 400 | 0 | 3.57 | 73.7 | 22.04 | 26.71 | 48.75 |
| fp_line_09_the_straits | 4616 | 23.08 | 949 | 3667 | 20.6 | 0 | 0 | 3.3 | 94.5 | 31.13 | 40.37 | 71.51 |
| fp_line_10a_the_second_line | 458 | 2.29 | 261 | 197 | 57 | 0 | 0 | -1.19 | 156 | 20.78 | 43.85 | 64.63 |
| fp_line_10b_the_line_tomorrow | 163 | 0.82 | 66 | 97 | 40.5 | 0 | 0 | -3.87 | 55.1 | 21.49 | 41.31 | 62.8 |
| fp_line_11_the_morning_count | 2382 | 11.91 | 1067 | 1315 | 44.8 | 0 | 0 | 0.66 | 116.7 | 12.68 | 26.04 | 38.72 |
| fp_midnight_01_one_chair | 12218 | 61.09 | 10079 | 2139 | 82.5 | 0 | 0 | 2.6 | 154.8 | 9.87 | 19.96 | 29.83 |
| fp_midnight_02_their_hour | 4069 | 20.35 | 1682 | 2387 | 41.3 | 0 | 0 | 2.68 | 176.6 | 7.58 | 15.45 | 23.03 |
| fp_midnight_03_our_hour | 2465 | 12.33 | 813 | 1652 | 33 | 0 | 0 | 3.41 | 178.6 | 11.69 | 23.75 | 35.44 |
| fp_midnight_04_full_readiness | 5455 | 27.28 | 5144 | 311 | 94.3 | 0 | 0 | 0.49 | 59 | 7.93 | 23.12 | 31.04 |
| fp_midnight_05_four_minutes | 7626 | 38.13 | 3146 | 4480 | 41.3 | 0 | 0 | -0.44 | 136.1 | 18.98 | 35.89 | 54.87 |
| fp_midnight_06_the_word_any | 82 | 0.41 | 80 | 2 | 97.6 | 0 | 0 | 4.26 | 372.3 | 9.46 | 27.23 | 36.7 |
| fp_midnight_07_two_statements | 177 | 0.89 | 169 | 8 | 95.5 | 0 | 0 | 2.18 | 224.1 | 6.41 | 18.97 | 25.38 |
| fp_midnight_08_two_readings | 160 | 0.8 | 101 | 59 | 63.1 | 0 | 0 | 0.43 | 98.8 | 7.04 | 14.55 | 21.59 |
| fp_midnight_09_the_protocol | 256 | 1.28 | 212 | 44 | 82.8 | 0 | 0 | -2.5 | 152.8 | 9.32 | 15.71 | 25.04 |
| fp_midnight_10_the_hour_after | 6804 | 34.02 | 5168 | 1636 | 76 | 352 | 0 | 9.1 | 217.6 | 27.23 | 42.97 | 70.2 |
| fp_midnight_11_nine_minutes | 3134 | 15.67 | 455 | 2679 | 14.5 | 162 | 0 | 4.33 | 217.8 | 18.53 | 50.77 | 69.3 |
| fp_midnight_12_have_you_eaten | 3141 | 15.71 | 86 | 3055 | 2.7 | 0 | 0 | 2.04 | 87 | 6.07 | 13.78 | 19.85 |
| fp_midnight_13_the_record | 2878 | 14.39 | 1357 | 1521 | 47.2 | 0 | 0 | -2.39 | 145.3 | 9.98 | 20.56 | 30.55 |
| fp_midnight_14_they_blinked | 1713 | 8.57 | 75 | 1638 | 4.4 | 0 | 0 | -6.61 | 120.8 | 11.92 | 20.98 | 32.9 |
| fp_summit_01_the_lake_door | 8456 | 42.28 | 2022 | 6434 | 23.9 | 0 | 0 | 0.53 | 164.8 | 4.85 | 12.83 | 17.67 |
| fp_summit_02_the_photographs | 102 | 0.51 | 26 | 76 | 25.5 | 0 | 0 | -0.01 | 231.6 | 8.56 | 21.03 | 29.59 |
| fp_summit_03_flatbeds | 51 | 0.26 | 46 | 5 | 90.2 | 0 | 0 | 2.67 | 176.7 | 11.24 | 22.31 | 33.55 |
| fp_summit_04_candles | 962 | 4.81 | 794 | 168 | 82.5 | 0 | 0 | 0.17 | 125.7 | 17.08 | 31.64 | 48.72 |
| fp_summit_05_the_folder | 3082 | 15.41 | 2701 | 381 | 87.6 | 0 | 0 | 0.48 | 218.5 | 7.19 | 17.75 | 24.95 |
| fp_summit_06_not_a_knife | 8313 | 41.57 | 2176 | 6137 | 26.2 | 434 | 0 | 1.91 | 215.7 | 10.25 | 21.34 | 31.59 |
| fp_summit_07_in_writing | 389 | 1.95 | 53 | 336 | 13.6 | 0 | 0 | 0.32 | 182.8 | 7.58 | 25.35 | 32.93 |
| fp_summit_08_her_paragraph | 366 | 1.83 | 222 | 144 | 60.7 | 0 | 0 | -3.24 | 130.7 | 11.86 | 21.48 | 33.33 |
| fp_summit_09_the_lake_steps | 69 | 0.35 | 62 | 7 | 89.9 | 0 | 0 | -2.14 | 289.4 | 9.93 | 13.59 | 23.52 |
| fp_summit_10_four_lines | 23 | 0.12 | 16 | 7 | 69.6 | 0 | 0 | -1.74 | 362.6 | 8.52 | 15.61 | 24.13 |
| fp_summit_11_both_sides | 2174 | 10.87 | 1113 | 1061 | 51.2 | 0 | 0 | -2.72 | 220.1 | 10.48 | 23.04 | 33.52 |
| fp_summit_12_the_third_chair | 6046 | 30.23 | 3149 | 2897 | 52.1 | 0 | 0 | 0.06 | 198.3 | 9.7 | 19.12 | 28.82 |
| fp_summit_13_witness | 3324 | 16.62 | 1429 | 1895 | 43 | 0 | 0 | -2.29 | 155.4 | 8.95 | 16.52 | 25.47 |
| fp_summit_14_the_cars | 4829 | 24.15 | 1706 | 3123 | 35.3 | 212 | 0 | 4.15 | 213.5 | 12.63 | 18.82 | 31.45 |
| press_01_the_opening_bell | 8131 | 40.66 | 6561 | 1570 | 80.7 | 0 | 0 | 0 | 30.8 | 6.12 | 6.97 | 13.09 |
| press_02_the_first_question | 8185 | 40.92 | 2304 | 5880 | 28.2 | 431 | 1 | 0 | 15.8 | 4.51 | 8 | 12.51 |
| press_03_the_loyal_opposition | 8022 | 40.11 | 3476 | 4546 | 43.3 | 0 | 0 | 0 | 39.5 | 5.31 | 11.07 | 16.38 |
| press_04_three_twenty | 8390 | 34.78 | 8354 | 36 | 99.6 | 0 | 0 | -1.96 | 27.1 | 3.97 | 8.03 | 12 |
| press_05_the_council_mood | 10428 | 41.04 | 2952 | 7475 | 28.3 | 0 | 1 | 0.43 | 35 | 6.97 | 15.32 | 22.29 |
| press_06_what_you_may_do | 7939 | 39.7 | 4380 | 3558 | 55.2 | 0 | 1 | 1.66 | 37.5 | 5.12 | 10.04 | 15.16 |
| press_07_the_generals_patience | 8091 | 40.46 | 4064 | 4027 | 50.2 | 396 | 0 | 1.53 | 34.5 | 10.17 | 20.33 | 30.51 |
| press_08_the_call_from_varga | 8294 | 41.47 | 5196 | 3098 | 62.6 | 0 | 0 | 0 | 35.3 | 5.44 | 11.19 | 16.63 |
| press_09_amberline_asks | 8055 | 40.28 | 5905 | 2150 | 73.3 | 0 | 0 | 1.47 | 43.4 | 5.06 | 10.12 | 15.18 |
| press_10_the_square | 8283 | 41.42 | 1986 | 6297 | 24 | 0 | 0 | 0 | 23.5 | 5.82 | 13.24 | 19.05 |
| press_11_the_currency | 5828 | 25.18 | 4687 | 1139 | 80.4 | 0 | 2 | 0 | 79.9 | 7.83 | 11.69 | 19.52 |
| press_12_the_leak | 5031 | 25.17 | 3098 | 1933 | 61.6 | 236 | 0 | 0 | 40.3 | 4.4 | 8.96 | 13.36 |
| press_13_the_confidence_motion | 5157 | 25.79 | 275 | 4882 | 5.3 | 0 | 0 | 0 | 43.6 | 8.46 | 11.01 | 19.47 |
| press_14_the_hospital | 4090 | 20.45 | 3595 | 494 | 87.9 | 0 | 1 | 0.12 | 42.2 | 5.74 | 10.05 | 15.79 |
| press_15_the_colonels_column | 5123 | 25.62 | 1065 | 4058 | 20.8 | 0 | 0 | 0 | 58.5 | 7.22 | 13.85 | 21.07 |
| press_16_the_lawyer_at_midnight | 5099 | 25.51 | 4750 | 348 | 93.2 | 0 | 1 | 0 | 57.1 | 4.28 | 9.39 | 13.67 |
| press_17_the_joint_statement | 5539 | 27.7 | 2994 | 2544 | 54.1 | 0 | 1 | 1.64 | 92.5 | 7.97 | 15.94 | 23.91 |
| press_18_the_rumour | 4910 | 21.79 | 2648 | 2258 | 54 | 0 | 4 | 0.52 | 52.7 | 2.71 | 7.97 | 10.68 |
| press_19_caldor_asks | 5303 | 26.52 | 643 | 4659 | 12.1 | 0 | 1 | 0.76 | 53.4 | 6.55 | 21.35 | 27.89 |
| press_20_the_hunger_strike | 5164 | 25.82 | 4441 | 722 | 86 | 0 | 1 | 0 | 50.4 | 7.07 | 14.67 | 21.74 |
| press_21_the_bond_auction | 5887 | 24.47 | 5792 | 92 | 98.4 | 0 | 3 | 0 | 110.1 | 6.3 | 7.53 | 13.83 |
| press_22_the_interview | 4714 | 23.58 | 3084 | 1625 | 65.5 | 240 | 5 | 0.37 | 144.4 | 9.15 | 18.04 | 27.2 |
| press_23_the_floor | 4737 | 23.69 | 2983 | 1754 | 63 | 0 | 0 | 0 | 127.1 | 9 | 18.03 | 27.03 |
| press_24_the_birthday | 3957 | 19.79 | 3937 | 20 | 99.5 | 0 | 0 | -1.97 | 73.5 | 4.95 | 10.9 | 15.85 |
| press_25_the_minute | 4765 | 23.84 | 2373 | 2388 | 49.8 | 0 | 4 | 1.69 | 98.8 | 8.27 | 16.95 | 25.22 |
| press_26_the_detainees | 4767 | 23.85 | 1029 | 3735 | 21.6 | 0 | 3 | 0 | 109.5 | 5.25 | 9.94 | 15.19 |
| press_27_the_resignation | 4728 | 23.64 | 3501 | 1226 | 74.1 | 237 | 1 | 5.62 | 180.6 | 19.05 | 36.86 | 55.92 |
| press_28_the_compact_vote | 5118 | 25.6 | 2449 | 2668 | 47.9 | 0 | 1 | 0.56 | 125.6 | 10.7 | 18.74 | 29.44 |
| press_29_vestria_asks | 4800 | 24 | 776 | 4022 | 16.2 | 0 | 2 | 1.83 | 120.2 | 6.66 | 18.03 | 24.69 |
| press_30_the_march | 4811 | 24.07 | 2155 | 2656 | 44.8 | 0 | 0 | 0.57 | 131 | 11.27 | 23.22 | 34.48 |
| press_31_the_run | 3907 | 16.42 | 3123 | 777 | 80.1 | 217 | 7 | 0 | 315.8 | 13.51 | 20.44 | 33.95 |
| press_32_the_final_edition | 3409 | 17.05 | 2814 | 590 | 82.7 | 171 | 5 | 0.68 | 224.7 | 9.18 | 22.46 | 31.64 |
| press_33_the_unity_government | 3316 | 16.6 | 1159 | 2153 | 35 | 0 | 4 | 0 | 143.1 | 12.33 | 21.13 | 33.46 |
| press_34_the_suitcase | 3353 | 16.77 | 2 | 3351 | 0.1 | 0 | 0 | -1 | 102.2 | 2.97 | 12.45 | 15.42 |
| press_35_the_list | 3319 | 16.6 | 2606 | 707 | 78.7 | 0 | 6 | 0.82 | 210.2 | 10.95 | 20.88 | 31.83 |
| press_36_the_delegation | 3303 | 16.52 | 1273 | 2026 | 38.6 | 0 | 4 | 1.68 | 215.9 | 10.84 | 22.98 | 33.82 |
| press_37_the_ramps | 3305 | 16.53 | 2018 | 1283 | 61.1 | 173 | 4 | 4.36 | 234 | 13.34 | 25.46 | 38.8 |
| press_38_the_last_call | 3682 | 18.43 | 2670 | 1004 | 72.7 | 0 | 8 | 3.66 | 295.2 | 15.93 | 24.17 | 40.1 |
| press_39_amberline_flees | 3321 | 16.61 | 1698 | 1622 | 51.1 | 0 | 1 | 2.52 | 211.5 | 9.02 | 18.37 | 27.39 |
| press_40_the_vigil | 3304 | 16.53 | 2619 | 684 | 79.3 | 0 | 1 | -0.58 | 160.3 | 11.01 | 22.94 | 33.95 |
| proxy_01_kestrel_bridge | 11215 | 56.08 | 2953 | 8262 | 26.3 | 0 | 0 | 1.06 | 22.1 | 6.88 | 17.07 | 23.95 |
| proxy_02_what_will_you_do | 3159 | 15.8 | 1820 | 1338 | 57.6 | 175 | 1 | 1.73 | 65.3 | 8.83 | 17.74 | 26.57 |
| proxy_03_the_quiet_war | 1999 | 9.99 | 401 | 1596 | 20.1 | 0 | 2 | 4.8 | 190.1 | 13.17 | 23.9 | 37.07 |
| proxy_04_the_team | 11783 | 58.92 | 3247 | 8533 | 27.6 | 0 | 3 | 2.6 | 39.6 | 8.87 | 11.21 | 20.08 |
| proxy_05_no_insignia | 7662 | 38.31 | 2107 | 5555 | 27.5 | 0 | 0 | 0.55 | 38.8 | 3.92 | 11.44 | 15.36 |
| proxy_06_volunteers | 2633 | 13.17 | 1405 | 1228 | 53.4 | 0 | 0 | 3.65 | 124 | 11.14 | 22.14 | 33.28 |
| proxy_07_the_brigade | 2289 | 11.45 | 417 | 1869 | 18.2 | 0 | 3 | 2.05 | 147.2 | 12.05 | 35.27 | 47.32 |
| proxy_08_six_hours | 12 | 0.06 | 2 | 10 | 16.7 | 0 | 0 | 1.83 | 207.6 | 8.25 | 31.58 | 39.83 |
| proxy_09_an_afternoon | 1 | 0.01 | 1 | 0 | 100 | 0 | 0 | 12 | 77 | 22 | 46 | 68 |
| proxy_10_winnable | 42 | 0.22 | 32 | 10 | 76.2 | 0 | 0 | 6.19 | 389 | 14.62 | 24.31 | 38.93 |
| proxy_11_the_estimate | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 0 | 32 | 8 | 23 | 31 |
| proxy_12_your_runways | 1308 | 6.54 | 500 | 807 | 38.3 | 0 | 1 | 0 | 142.8 | 12.58 | 25.3 | 37.88 |
| proxy_13_the_road_to_hollin | 8 | 0.04 | 2 | 6 | 25 | 0 | 0 | 0.5 | 112.8 | 15.25 | 33.88 | 49.13 |
| proxy_14_nothing_without | 1275 | 6.38 | 616 | 659 | 48.3 | 0 | 0 | 1.75 | 162.2 | 16.01 | 32.08 | 48.09 |
| proxy_15_the_compact_battalion | 363 | 1.82 | 77 | 286 | 21.2 | 0 | 0 | -1.17 | 186.1 | 15.01 | 32.63 | 47.64 |
| proxy_16_what_they_see | 2605 | 13.03 | 2199 | 404 | 84.5 | 0 | 2 | -2.79 | 147.9 | 8.44 | 15.84 | 24.28 |
| proxy_17_monitors_on_the_aum | 5486 | 27.43 | 2915 | 2571 | 53.1 | 0 | 0 | -1.87 | 118 | 13.44 | 24.1 | 37.55 |
| proxy_18_how_many | 5226 | 26.14 | 858 | 4366 | 16.4 | 0 | 2 | 0 | 61.3 | 3.6 | 10.49 | 14.1 |
| proxy_19_first_coffin | 4435 | 22.19 | 3799 | 636 | 85.7 | 210 | 0 | 1.92 | 94 | 6.48 | 13.45 | 19.94 |
| proxy_20_the_column | 70 | 0.35 | 33 | 36 | 47.8 | 6 | 1 | 8.57 | 399.1 | 18.84 | 35.53 | 54.37 |
| proxy_21_across_the_aum | 49 | 0.25 | 5 | 44 | 10.2 | 0 | 0 | 1.92 | 396.6 | 10.53 | 35.45 | 45.98 |
| proxy_22_bring_them_home | 1952 | 9.77 | 121 | 1827 | 6.2 | 0 | 4 | 5.06 | 245.7 | 13.1 | 54.29 | 67.4 |
| proxy_23_the_line | 1415 | 7.08 | 856 | 559 | 60.5 | 0 | 0 | -3.34 | 130.1 | 14.93 | 27.76 | 42.7 |
| proxy_24_contact | 27 | 0.14 | 14 | 13 | 51.9 | 0 | 0 | 2.3 | 1978.6 | 13.78 | 34.81 | 48.59 |
| proxy_25_the_radar | 4331 | 21.67 | 962 | 3365 | 22.2 | 0 | 4 | 3.05 | 138.9 | 9.59 | 21.75 | 31.34 |
| proxy_26_the_motion | 62 | 0.31 | 29 | 33 | 46.8 | 0 | 0 | -0.94 | 230.4 | 13.84 | 28.61 | 42.45 |
| blackout_01_dark_sky | 11076 | 55.38 | 2796 | 8280 | 25.2 | 0 | 0 | 0.76 | 17.2 | 4.5 | 8.02 | 12.51 |
| blackout_02_during_the_exercise | 2777 | 13.89 | 2268 | 509 | 81.7 | 143 | 0 | 3.59 | 76.2 | 8.07 | 14.87 | 22.94 |
| blackout_03_eleven_hours | 2002 | 10.02 | 1553 | 447 | 77.7 | 109 | 2 | 1.58 | 134.1 | 8.46 | 15.41 | 23.87 |
| blackout_04_the_guess | 5476 | 27.38 | 4681 | 795 | 85.5 | 0 | 0 | 5.29 | 82 | 11.5 | 23.62 | 35.11 |
| blackout_05_the_report | 11024 | 55.13 | 9182 | 1837 | 83.3 | 0 | 5 | 1.72 | 37.7 | 7.17 | 16.49 | 23.66 |
| blackout_06_wrong_headland | 1808 | 9.04 | 516 | 1291 | 28.6 | 0 | 1 | 2.92 | 73.5 | 9.48 | 23.69 | 33.17 |
| blackout_07_their_answer | 8916 | 44.58 | 8389 | 527 | 94.1 | 0 | 0 | -3.4 | 51.7 | 11.01 | 22.03 | 33.04 |
| blackout_08_the_north_cape | 2051 | 10.26 | 1476 | 575 | 72 | 0 | 0 | -0.46 | 52.7 | 8.76 | 13.31 | 22.07 |
| blackout_09_the_protest | 679 | 3.4 | 106 | 572 | 15.6 | 0 | 1 | 2.66 | 91.4 | 7.15 | 17.57 | 24.72 |
| blackout_10_consistent_with | 3 | 0.02 | 3 | 0 | 100 | 0 | 0 | -1.33 | 58.7 | 7.33 | 17.67 | 25 |
| blackout_11_the_hedge | 3 | 0.02 | 1 | 2 | 33.3 | 0 | 0 | 3.33 | 65 | 9.67 | 19 | 28.67 |
| blackout_12_same_orbit | 190 | 0.95 | 160 | 30 | 84.2 | 0 | 0 | -0.79 | 330 | 6.22 | 14.51 | 20.72 |
| blackout_13_the_inspector | 175 | 0.88 | 58 | 117 | 33.1 | 14 | 0 | 2.17 | 300.1 | 12.47 | 30.07 | 42.54 |
| blackout_14_the_shareholders | 17 | 0.09 | 1 | 16 | 5.9 | 0 | 0 | -2.47 | 93.9 | 10.24 | 16.18 | 26.41 |
| blackout_15_nine_percent | 4 | 0.02 | 3 | 1 | 75 | 0 | 0 | 0 | 374.8 | 11.25 | 16.25 | 27.5 |
| blackout_16_do_it_back | 1 | 0.01 | 0 | 1 | 0 | 0 | 0 | 0 | 41 | 8 | 22 | 30 |
| blackout_17_footprints | 2 | 0.01 | 1 | 1 | 50 | 0 | 0 | 1.5 | 130 | 9.5 | 19.5 | 29 |
| blackout_18_the_window | 6610 | 33.07 | 1100 | 5507 | 16.6 | 348 | 3 | 2.41 | 43.8 | 9.77 | 21.26 | 31.03 |
| blackout_19_quiet_understanding | 8166 | 40.83 | 7350 | 815 | 90 | 0 | 1 | -6.73 | 60.6 | 14.36 | 20.3 | 34.66 |
| blackout_20_the_third_chair | 2776 | 13.89 | 1314 | 1461 | 47.4 | 0 | 1 | 0 | 76.5 | 4.17 | 8.54 | 12.71 |
| blackout_21_the_battery | 1495 | 7.48 | 250 | 1245 | 16.7 | 0 | 0 | -1.01 | 78 | 7.1 | 25.12 | 32.22 |
| blackout_22_nobody_did_this | 923 | 4.62 | 208 | 715 | 22.5 | 0 | 0 | -1.56 | 95.3 | 16.05 | 16.79 | 32.84 |
| blackout_23_the_replacement | 2094 | 10.48 | 571 | 1521 | 27.3 | 0 | 2 | 0.59 | 103.8 | 8.01 | 15.61 | 23.62 |
| blackout_24_the_leak | 900 | 4.5 | 65 | 833 | 7.2 | 47 | 2 | 1.85 | 101.3 | 12.25 | 14.38 | 26.63 |
| blackout_25_a_pattern | 1738 | 8.7 | 610 | 1125 | 35.2 | 0 | 3 | 1.16 | 162.9 | 6.91 | 15.81 | 22.72 |
| blackout_26_in_the_way | 379 | 1.9 | 244 | 135 | 64.4 | 0 | 0 | -2.33 | 139.2 | 10.25 | 18.12 | 28.36 |
| summit_01_a_lunch_in_amberline | 5901 | 29.51 | 4289 | 1612 | 72.7 | 0 | 0 | -2.31 | 63.7 | 10.74 | 17.43 | 28.17 |
| summit_02_the_offer | 5238 | 26.19 | 229 | 5009 | 4.4 | 0 | 0 | 0 | 56.3 | 5.92 | 15.45 | 21.37 |
| summit_03_the_third_chair | 2278 | 11.39 | 155 | 2121 | 6.8 | 0 | 2 | 0 | 100.2 | 2.19 | 10.1 | 12.29 |
| summit_04_after_the_week | 2183 | 10.92 | 730 | 1452 | 33.5 | 0 | 1 | 0.48 | 119.6 | 12.04 | 27.15 | 39.19 |
| summit_05_preconditions | 4668 | 23.34 | 339 | 4329 | 7.3 | 0 | 0 | 2.42 | 50.1 | 8.53 | 24.86 | 33.39 |
| summit_06_silence_from_kaskad | 5066 | 25.33 | 3926 | 1138 | 77.5 | 0 | 2 | -1.02 | 91 | 10.41 | 18.44 | 28.85 |
| summit_07_the_venue | 9947 | 49.75 | 5372 | 4571 | 54 | 0 | 4 | 1.67 | 83.7 | 8.45 | 18.67 | 27.12 |
| summit_08_no_plans_to_travel | 8751 | 43.78 | 1170 | 7579 | 13.4 | 447 | 2 | 4.8 | 120.3 | 12.15 | 22.77 | 34.92 |
| summit_10_the_night_before | 6759 | 33.81 | 470 | 6287 | 7 | 0 | 2 | 0 | 55.8 | 3.78 | 9.05 | 12.83 |
| summit_11_the_room | 6735 | 33.67 | 654 | 6081 | 9.7 | 324 | 0 | 0 | 74.6 | 3.09 | 8.68 | 11.77 |
| summit_12_the_last_sentence | 942 | 4.71 | 355 | 587 | 37.7 | 0 | 0 | -8.66 | 111.8 | 18.46 | 28.57 | 47.03 |
| summit_13_the_walkout | 6063 | 30.33 | 744 | 5317 | 12.3 | 298 | 2 | 8.35 | 107.6 | 16.1 | 30.77 | 46.87 |
| summit_14_the_empty_chair | 13834 | 69.17 | 9946 | 3881 | 71.9 | 0 | 7 | -0.34 | 92.2 | 13.27 | 27.88 | 41.15 |
| summit_09_the_handshake | 4 | 0.02 | 4 | 0 | 100 | 0 | 0 | 0 | 112.3 | 8.75 | 21.25 | 30 |
| summit_15_the_deputys_lunch | 3 | 0.02 | 3 | 0 | 100 | 0 | 0 | -5 | 223.3 | 9.67 | 10.67 | 20.33 |
| summit_16_the_academic | 2 | 0.01 | 2 | 0 | 100 | 0 | 0 | -2 | 207 | 8 | 16 | 24 |
| summit_17_consecutive_days | 80 | 0.4 | 73 | 7 | 91.3 | 0 | 0 | 0 | 165.7 | 3.88 | 16.81 | 20.69 |
| summit_18_the_promise | 9 | 0.05 | 2 | 7 | 22.2 | 0 | 0 | 0.89 | 41.7 | 7.78 | 21.33 | 29.11 |
| summit_19_eleven_calls | 187 | 0.94 | 28 | 159 | 15 | 0 | 0 | 2.88 | 146.8 | 10.76 | 25.33 | 36.09 |
| summit_20_half_of_them | 56 | 0.28 | 0 | 56 | 0 | 0 | 0 | 2.5 | 115.1 | 6.27 | 20.57 | 26.84 |
| summit_21_the_other_half | 227 | 1.14 | 117 | 110 | 51.5 | 7 | 0 | 8.77 | 223.8 | 19.89 | 28.48 | 48.37 |
| summit_22_the_square | 119 | 0.6 | 96 | 23 | 80.7 | 0 | 0 | 0 | 167.9 | 19.53 | 36.15 | 55.68 |
| summit_23_the_first_paragraph | 366 | 1.83 | 26 | 340 | 7.1 | 0 | 0 | 0 | 100.3 | 10.53 | 23.19 | 33.72 |
| summit_24_what_it_bought | 301 | 1.51 | 137 | 164 | 45.5 | 18 | 0 | 1.37 | 145.4 | 10.67 | 21.81 | 32.48 |
| ultimatum_01_seventy_two_hours | 5812 | 29.07 | 4334 | 1477 | 74.6 | 0 | 1 | 3.99 | 53.6 | 8.51 | 16.27 | 24.78 |
| ultimatum_02_the_generals_clock | 5322 | 26.62 | 4170 | 1150 | 78.4 | 0 | 2 | 5.76 | 89.2 | 12.12 | 15.97 | 28.09 |
| ultimatum_03_the_broadcast | 2444 | 12.23 | 1889 | 555 | 77.3 | 0 | 0 | 4.63 | 139.4 | 10.22 | 19.92 | 30.14 |
| ultimatum_04_the_pattern | 1767 | 8.84 | 413 | 1353 | 23.4 | 0 | 1 | 1.7 | 104.1 | 7.08 | 17.81 | 24.9 |
| ultimatum_05_on_the_record | 6583 | 32.92 | 6017 | 566 | 91.4 | 0 | 0 | 2.82 | 74.7 | 6.21 | 14.09 | 20.3 |
| ultimatum_06_the_call | 9866 | 49.34 | 8516 | 1347 | 86.3 | 0 | 3 | -5.22 | 101.4 | 21.12 | 29.03 | 50.14 |
| ultimatum_07_the_hour_after | 897 | 4.49 | 284 | 613 | 31.7 | 43 | 0 | 0.69 | 277.6 | 13.85 | 33.23 | 47.07 |
| ultimatum_08_indicative | 832 | 4.16 | 343 | 487 | 41.3 | 0 | 2 | 0.27 | 310.2 | 16.19 | 33.52 | 49.71 |
| ultimatum_09_the_wording | 4139 | 20.7 | 1696 | 2442 | 41 | 0 | 1 | 3.38 | 70.8 | 6.61 | 10.93 | 17.54 |
| ultimatum_10_the_private_word | 1128 | 5.64 | 514 | 614 | 45.6 | 0 | 0 | 0.92 | 102.1 | 11.28 | 22.23 | 33.51 |
| ultimatum_11_friday_noon | 4543 | 22.73 | 3378 | 1164 | 74.4 | 245 | 1 | 5.1 | 76.6 | 17.79 | 34.9 | 52.7 |
| ultimatum_12_the_consequence | 3290 | 16.47 | 2849 | 438 | 86.7 | 149 | 3 | 12.48 | 155.3 | 31.61 | 57.25 | 88.86 |
| ultimatum_13_the_second_deadline | 1158 | 5.79 | 1101 | 55 | 95.2 | 0 | 2 | 4.82 | 95.7 | 9.99 | 34.64 | 44.63 |
| ultimatum_14_the_answer | 2729 | 13.65 | 2711 | 18 | 99.3 | 0 | 0 | -7.91 | 129.3 | 16.51 | 34.58 | 51.09 |
| ultimatum_15_two_readings | 28 | 0.14 | 16 | 12 | 57.1 | 0 | 0 | 2.21 | 161.4 | 6.93 | 14.14 | 21.07 |
| ultimatum_16_the_wrong_signal | 143 | 0.72 | 81 | 62 | 56.6 | 0 | 0 | 2.37 | 223 | 14.69 | 30 | 44.69 |
| ultimatum_17_any_means_any | 14 | 0.07 | 12 | 2 | 85.7 | 2 | 0 | 16.29 | 500.2 | 30.07 | 49.93 | 80 |
| ultimatum_18_your_own_words | 7 | 0.04 | 6 | 1 | 85.7 | 0 | 0 | 6.43 | 289.4 | 16.29 | 38.71 | 55 |
| ultimatum_19_the_climbdown | 81 | 0.41 | 60 | 21 | 74.1 | 0 | 0 | 0 | 192.3 | 4.7 | 11.27 | 15.98 |
| ultimatum_20_the_half_life | 21 | 0.11 | 6 | 15 | 28.6 | 0 | 0 | 3.43 | 633.5 | 8.81 | 21.05 | 29.86 |
| ultimatum_21_the_open_line | 68 | 0.34 | 65 | 3 | 95.6 | 0 | 0 | -8.37 | 394.6 | 11.91 | 22.06 | 33.97 |
| ultimatum_22_three_calls | 206 | 1.03 | 41 | 165 | 19.9 | 6 | 0 | 3.33 | 170.7 | 8.32 | 31.06 | 39.37 |
| ultimatum_23_what_they_see | 534 | 2.67 | 231 | 303 | 43.3 | 0 | 0 | 0.84 | 201.1 | 13.65 | 29.43 | 43.08 |
| ultimatum_24_the_operations_room | 799 | 4 | 505 | 293 | 63.3 | 0 | 1 | 1.47 | 149.5 | 9.35 | 18.86 | 28.21 |
| ultimatum_25_the_formula | 2423 | 12.13 | 656 | 1766 | 27.1 | 0 | 1 | 1.36 | 189.3 | 22.78 | 50.84 | 73.62 |
| ultimatum_26_the_ledger | 9195 | 46 | 539 | 8654 | 5.9 | 0 | 2 | 0 | 48.4 | 9.35 | 22.87 | 32.22 |
| cables_01_three_forty | 11563 | 57.82 | 8152 | 3411 | 70.5 | 0 | 0 | 0 | 18.4 | 6.91 | 6.02 | 12.93 |
| cables_02_two_of_ours | 2779 | 13.9 | 1972 | 807 | 71 | 151 | 0 | 3.53 | 53.4 | 9.66 | 17.51 | 27.17 |
| cables_03_her_line | 1788 | 8.94 | 1022 | 766 | 57.2 | 88 | 0 | 2.84 | 145.4 | 13.46 | 26.6 | 40.06 |
| cables_04_the_trawler | 15069 | 75.35 | 8763 | 6306 | 58.2 | 0 | 0 | 2.42 | 39.2 | 8.61 | 19.28 | 27.89 |
| cables_05_the_detour | 1 | 0.01 | 1 | 0 | 100 | 0 | 0 | 0 | 16 | 4 | 11 | 15 |
| cables_06_clean_cut | 6276 | 31.39 | 4497 | 1778 | 71.7 | 0 | 1 | 2.39 | 22.1 | 9.57 | 14.14 | 23.72 |
| cables_07_the_tern | 15937 | 79.69 | 5578 | 10359 | 35 | 807 | 0 | 0.48 | 36.5 | 9.99 | 14.21 | 24.2 |
| cables_08_two_corvettes | 10207 | 51.04 | 4890 | 5314 | 47.9 | 0 | 3 | 3.56 | 51.4 | 10.81 | 17.95 | 28.76 |
| cables_09_fishing_story | 8141 | 40.71 | 4531 | 3610 | 55.7 | 0 | 0 | 2.32 | 47.6 | 7.14 | 14.65 | 21.79 |
| cables_10_wrong_boat | 3380 | 16.9 | 156 | 3224 | 4.6 | 0 | 0 | 2.89 | 46.9 | 4.38 | 17.19 | 21.57 |
| cables_11_war_risk | 434 | 2.17 | 313 | 121 | 72.1 | 0 | 0 | 0 | 38.3 | 11.6 | 17.15 | 28.75 |
| cables_12_turned_back | 2475 | 12.38 | 685 | 1790 | 27.7 | 111 | 0 | 1.75 | 70.7 | 10.47 | 20.69 | 31.16 |
| cables_13_the_splice | 15467 | 77.33 | 7834 | 7632 | 50.7 | 0 | 1 | 1.56 | 39.6 | 5.08 | 10.33 | 15.41 |
| cables_14_open_water | 5451 | 27.26 | 3631 | 1819 | 66.6 | 0 | 1 | -1.95 | 152.6 | 19.67 | 37.11 | 56.78 |
| cables_22_a_week | 53 | 0.27 | 28 | 25 | 52.8 | 0 | 0 | 0.43 | 155.4 | 13.92 | 28.23 | 42.15 |
| cables_15_forty_metres | 682 | 3.41 | 166 | 516 | 24.3 | 0 | 0 | 2.79 | 101.3 | 10.69 | 22.27 | 32.96 |
| cables_16_the_escort_line | 23 | 0.12 | 12 | 11 | 52.2 | 0 | 0 | 3 | 126 | 14.57 | 28.17 | 42.74 |
| cables_17_forty_minutes | 13 | 0.07 | 7 | 6 | 53.8 | 1 | 0 | 4.15 | 93.5 | 12.15 | 16.54 | 28.69 |
| cables_18_eleven_hundred_tonnes | 29 | 0.14 | 11 | 18 | 37.9 | 0 | 0 | -1.24 | 163.3 | 10.93 | 22.66 | 33.59 |
| cables_19_unsigned | 43 | 0.22 | 28 | 15 | 65.1 | 0 | 0 | -0.7 | 53.6 | 8.84 | 18.42 | 27.26 |
| cables_20_ninety_days | 49 | 0.25 | 36 | 13 | 73.5 | 0 | 0 | 0 | 85.4 | 9.92 | 10.1 | 20.02 |
| cables_21_my_nine | 45 | 0.23 | 25 | 20 | 55.6 | 0 | 0 | 0 | 59.9 | 13.67 | 27.56 | 41.22 |

## Weakest cards (heuristic)

Lowest impact among cards that are actually seen: tiny effects, near-identical choices, or both. Candidates for a rewrite or a cut.

| # | Card | Seen | L% | Δesc | Lev | Swing | Gap | Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | defector_23_nothing_crossed | 582 | 98.4 | 0 | 159.3 | 2.25 | 6.95 | 9.2 |
| 2 | defector_15_the_winter_colonel | 2540 | 45.1 | 0 | 120.2 | 2.46 | 7.28 | 9.74 |
| 3 | press_18_the_rumour | 4910 | 54 | 0.52 | 52.7 | 2.71 | 7.97 | 10.68 |
| 4 | defector_19_the_guest | 1065 | 32.1 | 0.96 | 121.4 | 4.97 | 6.63 | 11.6 |
| 5 | summit_11_the_room | 6735 | 9.7 | 0 | 74.6 | 3.09 | 8.68 | 11.77 |
| 6 | defector_02_the_embassy_gate | 3997 | 60.5 | -0.39 | 78.1 | 3.81 | 8.03 | 11.84 |
| 7 | press_04_three_twenty | 8390 | 99.6 | -1.96 | 27.1 | 3.97 | 8.03 | 12 |
| 8 | summit_03_the_third_chair | 2278 | 6.8 | 0 | 100.2 | 2.19 | 10.1 | 12.29 |
| 9 | blackout_01_dark_sky | 11076 | 25.2 | 0.76 | 17.2 | 4.5 | 8.02 | 12.51 |
| 10 | press_02_the_first_question | 8185 | 28.2 | 0 | 15.8 | 4.51 | 8 | 12.51 |
| 11 | blackout_20_the_third_chair | 2776 | 47.4 | 0 | 76.5 | 4.17 | 8.54 | 12.71 |
| 12 | summit_10_the_night_before | 6759 | 7 | 0 | 55.8 | 3.78 | 9.05 | 12.83 |
| 13 | cables_01_three_forty | 11563 | 70.5 | 0 | 18.4 | 6.91 | 6.02 | 12.93 |
| 14 | falarm_22_jonah | 5340 | 85.9 | -0.86 | 69.9 | 4.02 | 9.02 | 13.04 |
| 15 | press_01_the_opening_bell | 8131 | 80.7 | 0 | 30.8 | 6.12 | 6.97 | 13.09 |
