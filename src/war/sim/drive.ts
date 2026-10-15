/**
 * How a bot touches the game: only through the engine's public actions (pin, swap, send, buy,
 * sell, reroll, moveSeat). A refused action is a bot bug, so `must` throws with the engine's reason.
 */
import { clearPins, moveSeat, must, pinAll, tapOrder, type GameState, type RegionId, type StaffId } from '../engine';

/** Lift every pin, then pin `group` (a touching group) in an order that can be tapped. */
export function pinGroup(s: GameState, group: readonly RegionId[]): GameState {
  return pinAll(must(clearPins(s)), tapOrder(group));
}

export function seatIds(s: GameState): StaffId[] {
  return s.seats.map((x) => x.id);
}

/** Drag seats until they read `order` left to right (`order` is a permutation of the seated staff). */
export function arrangeSeats(s: GameState, order: readonly StaffId[]): GameState {
  for (let i = 0; i < order.length; i++) {
    const from = s.seats.findIndex((x) => x.id === order[i]);
    if (from < 0) throw new Error(`arrangeSeats: ${order[i]} is not seated`);
    if (from !== i) s = must(moveSeat(s, from, i));
  }
  return s;
}
