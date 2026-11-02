/** BRINK: Red Lines — the simulator (BUILD.md "The simulator"). */
export { BOTS, BOT_NAMES, GATED_BOTS, carefulBot, eventAnswer, farPromiseBot, farPromiseTarget, isBotName, noOrdersBot, passiveBot, promiseEverythingBot, sellableTarget, sellerBot, sensibleAct, sensibleAnswer, sensibleBot, threatened } from './bots.ts';
export type { Bot, BotName, Key } from './bots.ts';
export { ACTION_BUDGET, countUnfilled, playGame } from './play.ts';
export type { GameRecord } from './play.ts';
export { GATES, evaluateGates, summarise } from './gates.ts';
export type { BotStats, Gate } from './gates.ts';
export { simulate } from './simulate.ts';
export type { SimOptions, SimResult } from './simulate.ts';
export { dialsTable, gatesTable, handTable, invariantsLine, ladderTable, outcomesTable, phonesTable, treatyWeeksTable } from './report.ts';
export { brokenInvariants, FALL_KINDS, STEP_DOWN_KINDS } from './invariants.ts';
export type { Format } from './report.ts';
export { counts, mean, median, pct, share } from './stats.ts';
