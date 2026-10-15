/** BRINK: THIRTY DAYS — the simulator (SPEC "Balance gates"). */
export { BOTS, BOT_NAMES, expectedCost, expectedDanger, expectedPressure, isBotName, partners, randomBot, sensibleBot, stackScore } from './bots.ts';
export type { Bot, BotName } from './bots.ts';
export { ACTION_BUDGET, CLOSE_CALL, playGame, record } from './play.ts';
export type { GameRecord } from './play.ts';
export { GATES, evaluateGates, summarise } from './gates.ts';
export type { BotStats, Gate } from './gates.ts';
export { simulate } from './simulate.ts';
export type { SimOptions, SimResult } from './simulate.ts';
export { curveLine, gatesTable, outcomesTable, piecesTable, teamSizeTable } from './report.ts';
export type { Format } from './report.ts';
export { mean, median, pct, quantile, share } from './stats.ts';
