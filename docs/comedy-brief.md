# The comedy brief (for the owner, or a comedy editor)

The hotel's 163 cards and 61 endings were written by machine to the voice contract, then
given one machine editing pass (each file scored line by line, the flattest four to seven
lines rewritten). They read well; whether they are funny for two minutes a day for a month
is the risk the redesign rests on (RISKS.md 13). This is what a human pass should look at
first, in order of value:

1. **The five-star reviews and their quotes** (`content/endings/*.yaml`, `stars: 5`). The
   quote is the line people paste. Twelve Bookings, about fifteen five-star quotes.
2. **The heads** (the fifth spine card of each Booking, in the five o'clock hour) and their
   replies: the climax of every night.
3. **The openers** (slot 1): the first thing a new player reads.
4. **The pool's replies** (`content/cards/pool*.yaml`): 126 cards, a reply on every side; the
   one-line answers are where the running gags live (the Porter's theory, the Chef's "I'm
   not saying… I'm saying somebody did", the Owner's audible sum, The Majestic's "as a
   courtesy", Room 12's card by the lift, the Doorman's 1991, the Day Manager's own pen).

The validator holds the contract while editing: `BRINK_VOICE=strict npm run content:validate`
(cards ≤ 150 characters and two sentences, choices ≤ 34, replies ≤ 80, no weekday or
"tomorrow" words, moves between 8 and 25). Change words, not numbers, unless BALANCE.md
"The hotel" is re-run afterwards.

Budget: the owner for about three days, or a comedy editor at roughly £1,500–3,000 for the
same scope.

## What the authors flagged as thin, and what the editor changed

## wedding.yaml
best line: 'Pancakes.' She writes it under item one, in the hand people use for a will.
Thin spots for an editor: pool_chef_eggs ("Sixty down for breakfast and there are no eggs") can be drawn the same night as this Booking and will double the eggs premise; consider gating it with flags_none [booking:wedding] in pool.yaml, which I did not touch. The two-star review's quote puts the groom under 212 while beat 3 puts him under Room 12's window; read it as a bad night with several wrong windows, or move it to 12 if you prefer strict continuity. The five-star review mentions eggs at seven regardless of the eggs path (grocer, Majestic, cake kept); a flag-split variant (wedding:majestic_eggs) would be the next most valuable review to add.

## alarm.yaml
best line: 'On our way,' says a calm voice. 'Is this the hotel with the toast?'
Thin: the three survival reviews condition only on booking:alarm + stars, so their text hedges the cake/toaster truth ('covers toasters and cakes and does not distinguish') rather than naming the branch; an editor wanting the review to name the deed could add priority-45 variants keyed on flags_any [alarm:cake] / [alarm:toaster] or [alarm:serenade]. The fall review (fall_alarm_carpark, GUESTS at 0, priority 30) does not require alarm:evacuated, since the bell at 3:00 is true on every alarm night. The validator does not check clock times against slots, so I kept named times to 'at six', 'at seven', 'at nine', 'till six', all after any card that says them; 'at this hour' replaces specific times elsewhere.

## critic_check_in.yaml
best line: She reads it twice, pays it to the penny, and asks the Porter how you spell your name.
Thin spots an editor might tighten: the three-star and two-star reviews do not read beats' flags (only the laughed review does), so a night where the man was sent away at 3:00 still gets the chair in the lobby in the three-star text; the x_majestic left side moves only one bar (GUESTS −10 plus the Owner's patience +4); trust_secondary and intel both read the Critic, so her goodwill and her opinion are nearly the same value here and I leaned on intel.

## power_cut.yaml
best line: They borrowed my torch for the stairs. I have never been so politely robbed.
Thin spots an editor may want: the two-star review assumes the east wing is still dark and the five-star assumes lights_on, which a flags_any guard (power_cut:lights_on / power_cut:all_dark) could tighten; the head's "an electrician is at the door" on the candles path implies the Handyman rang him, which the text leaves unsaid; the Majestic card and the head both relight parts of the building, kept consistent only by the cable lighting "the lobby".

## flood.yaml
best line: 'God did not fit the tap,' she says, and writes that down herself, timed.
Thin spots: the Room 310 weather voice carries most of the comedy, so an editor may want one more weather word in beat 2 or the head; flood:wine_up/wine_left and flood:kitchen_umbrellas are set but no review reads them yet; no card reads flood:cellar or flood:sandbags (the head's odds could be tilted by them). No clock times named except at six, at nine, at eleven. Strict validator: 0 errors, 0 warnings, grep for flood ids prints nothing.

## inspector.yaml
best line: The Barman wakes on the brandy crates and asks the Inspector if he's a resident.
Thin spots: inspector:passed / inspector:failed are set but no review reads them yet (a 3-star "What He Was Having" on inspector:failed would be the natural add); the Owner beat (04) is the least tied to the deadline shape; hidden-value moves are all trust_secondary/commitment/trust_primary, nothing touches intel (the Critic only appears in the two-star byline). No card names a clock time before its own slot (the Owner card says "at this hour"; the head says "Twenty to six" like the wedding head).

## lift.yaml
best line: The lift people want three hundred pounds, and I've found the service book. The last entry is in the Owner's handwriting and says 'not this year'.
Thin spots: the bride is never a speaker (she only answers through the doors in replies), and lift:still_stuck is only reachable via the head's failure roll, so the two-star review assumes the lift may still be stuck without conditioning on it; lift_02's right side moves STAFF down for sandwiches at 3:40, which is a slightly soft reason.

## band.yaml
best line: "'No band.' A trombone disagrees. 'Of course,' says The Majestic. 'Remembered.'"
Thin spots: the Partner never appears in the Booking (left to the pool's four o'clock card); the money bar only moves on the Owner and head cards, so a night that never draws band_x_owner_sum sees MONEY move once; the 3-star review's "foot lower in the middle" assumes a building-heavy night and may jar if BUILDING is high; the head's two options both cost money, so there is no free way through the last card, which is deliberate (nobody booked them, somebody pays) but a balancer may want the right side's economy -14 eased.

## room7.yaml
best line: I was never here. The service, while I wasn't, was excellent.
Thin spots: the room7:written path has only one extra (Room 12), so the honest opener gets fewer Booking cards; the umbrella reveal lives on one head side and one review, so a kitchen-door player only learns it from the five-star review's aside; the pool card pool_concierge_cab also stars "the guest in 7" and sets room7:left, which these files do not read, so an editor may want to gate that pool card off when booking:room7 is on, or let the coincidence stand. The sentence regex counts a quoted full stop followed by a space as a sentence end, which the Majestic card respects (two sentences exactly).

## snow.yaml
best line: An audible sum. 'Snow is snow,' he says. 'Forty-one times nothing is nothing.'
Thin spots for an editor: the band reviews are written to work whether the coach came in or stayed in the car park, so they say "the coach" rather than "the ballroom"; only snow:on_the_house has its own review, so snow:found_forty_one, snow:the_glove and snow:porridge are set but unread (good candidates for a quote pool or a second flagged review); the Majestic and Chef beats both deliver bread, which is intentional but means a "bread never came" review line is only safe in the two-star band. Balance: every card trades two bars at ±8–14, the head's failure costs GUESTS 12 and STAFF 8 with no visible gain, and the opener's left is the only MONEY gain before the head, so a careful path exists (coach in, bake or porridge, take the loaves, send the Porter up, charge or forgive) but the simulator has not been run on it.

## pool_a.yaml
best line: 'The Barman.' You hear him write it down, in capitals, abroad.
(no thin spots noted)

## dogshow.yaml
best line: "He hands back nine. The other two, he says, are not ours, and he has a theory."
Thin spots for an editor: the Secretary speaks the opener and beat 3 and both high reviews, so she carries a lot of the voice; the judge is never a speaker (only reported), which is deliberate but means his allergies are all hearsay; trust_secondary swings are mostly against the player on the funnier choices, so a bot that always picks the Porter may find the Secretary cold by the head. No pool card was touched; lift:off is set here as a courtesy to pool cards that read it.

## pool_b.yaml
best line: I hear there was soup last night, at home, from a pan. I'm not saying the night manager doesn't trust this kitchen; I'm saying somebody doesn't.
(no thin spots noted)

## edit alarm.yaml scored 34 rewritten 6
  - alarm_01_panel right reply: "He goes up with the key, the big torch and a towel, in that order." -> "He takes the key, the torch and a towel. 'The towel's for either,' he says."
  - alarm_x_chef_gas left reply: "The gas comes back with a thump. He signs nothing, and nods at the fridge." -> "The gas comes back with a thump. 'Somebody's reset it,' he says, to the pan."
  - alarm_x_critic_bell left reply: "She orders the lot, and asks for it quietly, and writes down how long it takes." -> "She orders the whole left side of the menu and writes down when she asked."
  - alarm_07_serenade failure: "It is four songs. Room 12 comes down with the card from by the lift and adds a line to it." -> "Four songs. During the third, Room 12 unpins the card by the lift and adds a line to it."
  - review_alarm_two quote (endings/alarm.yaml): "Woken by a bell at three and by the apology at four. I came for the pillows." -> "Woken by a bell at three and by the apology at six. I came for the pillows." (the song is at six; also alarm_06 right reply lost its

## edit wedding.yaml scored 51 rewritten 7
  - wedding_02_groom_bar text: "He means it for the bride, I think, and the bridesmaid does not think that." → "The bride is in 214, which is two floors up and, in a sense, further." (the Barman does distances, not 'I think')
  - wedding_03_majestic_eggs left reply: "Five dozen cross the square in a box with their name on it. The Chef watches." → "Five dozen, boxed, their name on the lid. The Chef turns the lid to the wall."
  - wedding_04_window right reply: "He drinks it in the lobby and tells the Porter it all. The Porter has a theory." → "Two coffees and the whole story. The Porter has a theory, and the theory is 204."
  - wedding_x_owner_songs left reply: "'Good.' You can hear him divide something by four." → "'Good.' Down the line, something is multiplied by four." (per-song charge is a multiplication; the sum is now audible and correct)
  - review_wedding_five quote: "Sixty for breakfast and no eggs at three. Eggs at seven. I have ticked it." → "No eggs at three; eggs at seven. I have ticked it, and I do not tick lightly." (also review_wedding_two: "He sang under 212 ... I am in 212" → "He sang u

## edit power_cut.yaml scored 50 rewritten 4
  - power_cut_03_torch left reply: "Item one: nobody rang him. You have now. He ticks it by torch, almost kindly." → "Item one: 'Nobody asked.' You have now. He ticks it by torch, almost kindly." (he rang down himself in the opener; 'Nobody asked' is what the five
  - power_cut_x_chef_fridge text: "...I'm not saying somebody bought the cheap fuse; I'm saying somebody did." → "...I'm not saying the night manager bought the cheap fuse; I'm saying somebody did." (restores the Chef's passive-voice dodge; the old line was a taut
  - power_cut_x_chef_fridge left reply: "Sixty breakfasts go down in relays, in the dark. The Chef bows to the fridge." → "Sixty breakfasts go down in relays. The Chef counts fifty-nine and says nothing." (bowing to the fridge is lifted verbatim from full_staff_si
  - power_cut_x_chef_fridge left choice: "Cellar. It's cold down there" → "Carry it down to the cellar" (both choices led with 'cold'; now Carry vs Cook reads in a second)

## edit inspector.yaml scored 58 rewritten 5
  - inspector_03 text: "I had said nine; I find I can finish at six, which people prefer, if I see the cellar now. I understand someone is asleep in it." → "I can finish at six, not nine, which people prefer, if I see the cellar now. I gather someone is asleep in 
  - inspector_03 choices: "The cellar. Wake whoever it is" / "The cellar at six. Not before" → "Wake whoever it is. Now" / "Not before six. He sleeps"
  - inspector_03 right reply: "'Six.' He writes it down and draws a line under it, and then a second line." → "'Six.' He writes it down and draws two lines under it. The second one is slower."
  - inspector_04 left reply: "The east wing goes dark behind him. He switches to the torch without a word." → "The east wing goes dark behind him. The torch comes on, and so does the pen."
  - inspector_x_room12 right reply: "'The hotel,' she repeats, and goes to find a pen, and adds a rule about that." → "'The hotel,' she repeats, and finds a pen. The card gains a rule about honesty."

## edit flood.yaml scored 35 rewritten 5
  - flood_01_tap left reply: "The stopcock is under a card by the lift. He turns it; the tap slows to a sulk." → "He finds the stopcock where Room 12's card says it is. The tap slows to a sulk."
  - flood_05_wedding failure: "Sirens, a form, and a man who closes the ballroom until somebody has looked at it. The Owner does a sum aloud." → "Sirens, a form, and a man who closes the ballroom until someone qualified has seen it. The Owner does the sum aloud."
  - flood_x_critic_drip left reply: "She takes the key and asks, mildly, what 310 did to deserve her. You don't say." → "She takes the key and asks what's above 410. 'The roof.' She writes that down."
  - flood_x_critic_drip right reply: "The bucket goes on the bed. She sleeps in the chair, writing. The drip keeps on." → "The bucket gets the bed. She gets the chair and the brandy, and writes in time."
  - review_flood_five quote: "Water through three floors and into the ballroom. By six, dry, and they wrote it all down." → "Steady, turning heavy, turning clear by six. They wrote it all down, with the time."

## edit critic_check_in.yaml scored 35 rewritten 4
  - critic_check_in_01_desk left reply: "He leaves the flowers on the desk. The card says 'sorry' and nothing else." → "He leaves the flowers. The card says 'sorry'. One source, says the Concierge."
  - critic_check_in_03_chair left reply: "He takes the tea and says thank you to the whole lobby, by her real name, twice." → "He takes the tea and says her real name to the lobby, like a toast. Twice."
  - critic_check_in_x_majestic odds success: "'Certainly.' He is given a sea view and a bill, and asks for her at their desk instead of yours." → "A pause. 'Certainly.' He gets a sea view and a bill, and asks their desk for her every hour, on the hour."
  - critic_check_in_x_cake right reply: "'Good. Charge her for the sea view.' It is dark. Nobody mentions the sea again." → "'Good. Charge for the sea view.' At this hour the sea is a noise. He knows it."

## edit band.yaml scored 52 rewritten 4
  - band_01_ballroom left reply: "'Noted.' He counts them back in, quieter. A guest on the stairs says 'oh, good'." → "They stop mid-chord. A guest on the stairs says 'oh'. The trumpet: 'you did.'" (the old line read as if the band kept playing; the stop is now vi
  - band_x_owner_sum right reply: "He does the sum anyway, out loud. It comes to four hundred; he says it twice." → "A silence with numbers in it. 'Four hundred,' he says, and then again, slower." (the Owner's sum is now audible rather than reported)
  - band_x_handyman_plaster text: "...the ballroom plaster is from 1931. I can cut its power now, or you can trust the plaster." → "...the ballroom plaster is 1931. I can cut the ballroom power, or you can trust the plaster." ('its power' was ambiguous between cha
  - band_05_encore odds failure: "'The summer is The Majestic's,' he says, kindly, and packs the trumpets. Eleven dancers watch him do it." → "'The summer is The Majestic's,' he says, kindly. 'They rang. As a courtesy.' Eleven dancers watch him pack." (the rival's

## edit room7.yaml scored 51 rewritten 4
  - room7_02_coat odds success: "'Waiting for a gentleman,' he says. 'He'll know what for.' He does not say which gentleman, and goes back to it." → "'Waiting for a gentleman,' he says. 'He'll know what for.' Then he asks the Doorman, kindly, if he'd like to sit d
  - room7_04_cases right choice: "Fetch his cases. Our porter" → "Send the Porter for the cases"
  - room7_05_kitchen odds success: "He goes out past the Chef, who sees nobody and says so, to the fridge. The man in the coat waits on." → "He goes out past the Chef. 'Nobody came through here,' the Chef tells the fridge, 'and somebody should write that down.'"
  - room7_review_umbrella quote (endings/room7.yaml): "A man waited four hours in your lobby to give me an umbrella. I'd have waited too." → "A man sat in your lobby from three to six to hand me an umbrella. I don't own an umbrella." (three to six is three hours, 

## edit lift.yaml scored 52 rewritten 5
  - lift_04_the_dog left reply: "The dog, named, lies down. 'Unfair,' says the bride. 'Fair,' says the intercom." → "You write 'the dog'. It sits. 'That proves nothing,' says the bride."
  - lift_x_chef_sandwiches right reply: "'Nobody.' He makes three anyway, for the Porter: a theory and no supper." → "'Nobody,' he says, and makes three anyway. Somebody, it turns out, was hungry."
  - review_lift_took_blame text: "Five stars, and under them: 'Somebody took the blame. It wasn't the somebody.' You go home in the first light." → "Five stars, and one arrow, from the words 'took the blame' to his uncle's handwriting. You go home."
  - review_lift_three quote: "The lift stopped two hours. The card by it says to inform me. I have added 'promptly'." → "The lift stopped for two hours. The card says to inform me. I have added 'promptly'."
  - fall_lift_building quote: "The fire brigade had us out in four minutes. I told my uncle: four minutes was the point." → "The fire brigade took four minutes. The hotel took two hours. My uncle has both numbers."

## edit dogshow.yaml scored 30 rewritten 4
  - dogshow_03_sneezing.right reply: "Forty-one dogs under the chandelier. The Events Manager calls it a moment." → "Forty-one dogs sit under the chandelier as if told to. Nobody told them."
  - dogshow_x_chef_sausages.left reply: "The butcher answers on the sixth ring and asks how many dogs. You say forty-one." → "The butcher asks who for. 'Forty-one dogs and a judge.' He bills for forty-two."
  - dogshow_x_majestic_judge.left reply: "He crosses the square and stops sneezing at the kerb. 'Remembered,' it says." → "Halfway across the square, he stops sneezing. 'Remembered,' says the line."
  - review_dogshow_three quote (/home/user/brink/content-hotel/endings/dogshow.yaml): "Dogs in the lift. The rule is no dogs in the lift, and there is a card about it now." → "No dogs in the lift. It was not a rule when they arrived. It is on the card now."

## edit snow.yaml scored 51 rewritten 5
  - snow_02 text: "The bread van is on the cliff road, which is a place, not a time. I'm not saying somebody promised a coach party breakfast; I'm saying somebody did." → "The bread van is 'on its way', a direction, not a time. I'm not saying the night manager pro
  - snow_02 left reply: "The kitchen wakes. By five, bread; and the Chef is not speaking to the oven." → "The kitchen wakes. Bread by five, and the Chef has stopped speaking to the oven."
  - snow_02 right reply: "'Oats.' He says it once, and goes to measure the big pan with his arms." → "'Oats,' he says, and fetches the big pan, which is for soup and knows it." (was a copy of the pool's pancake line)
  - snow_04 right reply: "'Close enough,' he says, and writes 'forty' on his hand so he won't believe it." → "'Close enough,' he says, and looks at the coach, which has forty-one seats."
  - snow_x_porter_van left reply: "Back with van, baker and forty loaves. The baker says 'rumour' with feeling." → "The rope holds. Forty loaves, and a baker who has heard the word 'rumour'."

## edit pool_b.yaml scored 73 rewritten 10
  - pb_chef_soup_home right: "'The eggs,' he says, 'are fine,' in the voice of a man with a longer list." → "'The eggs,' he says, 'are fine. Somebody counted them.' He does not say who."
  - pb_partner_soup_again right: "A heart comes back, then 'Noted.' Later: 'The cat has your side again.'" → "A heart comes back. Then: 'The cat's on your side.' Then: 'Of the bed.'"
  - pb_majestic_towels right: "'Of course.' Somewhere above you, a guest asks for a towel, loudly." → "'Of course.' The line stays open just long enough to hear 310 ask for a towel."
  - pb_concierge_owner_knows right: "'Wondering,' says the Concierge, 'is what he does abroad. It's cheaper here.'" → "He rings twice more. 'Nothing,' says the Concierge. 'He's narrowing it down.'"
  - pb_room12_towel_lift left: "She writes it, in pen, and signs your name underneath, for the record." → "She writes it in pen, in capitals, and puts your name where the date should go."

## edit pool_a.yaml scored 72 rewritten 7
  - pa_3_chef_fridge.left: "Nine bags of ice. The Porter has a theory about who did it. The Chef has none." → "Nine bags. The Porter has a theory about who did it; the Chef has an eyebrow."
  - pa_3_concierge_key.left: "He goes up. The lift stops between three and four, which it has not done before." → "He goes up. The lift stops between three and four. One source: the lift."
  - pa_3_events_banner.left: "At eight a man reads it, laughs for a long time, and asks who translated it." → "The Concierge reads it in passing. 'Welcome,' he confirms. 'Broadly. To a ship.'"
  - pa_4_majestic_light.left: "'Noted.' A beat. 'The courtesy, I mean, not the light. Both.'" → "'Noted.' A pause. 'The apology, that is. The light we had already noted.'"
  - pa_3_housekeeper_pillow.left: "Fourteen pillows go up. She keeps the first; the other thirteen are a landmark." → "Fourteen go up. She keeps the first; the Porter sleeps on the other thirteen."

