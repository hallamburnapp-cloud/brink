/** The six bots by name, in the reference's report order (calibrate.py BOT_ORDER). */
import { GreedyBot, NoviceBot, PreviewBot, RandomBot, type Bot, type BotName } from './bots';
import { BreakerBot, SensibleBot } from './sensible';

export const BOT_NAMES: readonly BotName[] = ['random', 'novice', 'greedy', 'preview', 'sensible', 'breaker'];

const MAKERS: Readonly<Record<BotName, new (seed: string) => Bot>> = {
  random: RandomBot,
  novice: NoviceBot,
  greedy: GreedyBot,
  preview: PreviewBot,
  sensible: SensibleBot,
  breaker: BreakerBot,
};

/** A fresh bot for one game; its own stream is seeded from the game's seed. */
export function makeBot(name: BotName, seed: string): Bot {
  return new MAKERS[name](seed);
}

export function isBotName(x: string): x is BotName {
  return (BOT_NAMES as readonly string[]).includes(x);
}
