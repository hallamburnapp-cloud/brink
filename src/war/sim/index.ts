/**
 * The WIN THE WORLD simulator (SPEC section 16): ports of the reference bots
 * (docs/war/v2/reference/bots.py) playing the TypeScript engine through its public actions, the
 * phone time model (timing.py), the 17 gates, the cross-check that replays every case of
 * fixtures.json through the engine, and the replay that has the Python reference play the same games
 * again (replay.py). The CLI is tools/war-sim.ts; the results are written up in
 * docs/war/v2/SIM-REPORT.md. Node only.
 */
export { GreedyBot, NoviceBot, PreviewBot, RandomBot } from './bots';
export type { Bot, BotName, Pick } from './bots';
export { BreakerBot, SensibleBot, seatings } from './sensible';
export { BOT_NAMES, isBotName, makeBot } from './roster';
export { bestSend, openingSpread, randomGroup } from './choose';
export type { SpreadSample } from './choose';
export { MAX_TURNS, playGame } from './play';
export type { GameLog, PlayObserver, PlayOptions, TurnRow } from './play';
export { FAST, FIRST, SLOW, STANDARD, minutes, seconds } from './timing';
export type { TimeModel } from './timing';
export { curve, digest, summarize } from './summary';
export type { BotStats, CurvePoint, GameDigest } from './summary';
export { GATES, evaluateGates } from './gates';
export type { GateResult, StatsByBot } from './gates';
export { collect, inProcess, planJobs, runJob, simulate } from './simulate';
export type { Executor, Job, JobResult, SimOptions, SimResults } from './simulate';
export { crosscheckFixtures, crosscheckText } from './crosscheck';
export type { CrosscheckResult, CrosscheckSection } from './crosscheck';
export { loadReference, parseReference, RESULTS_PATH } from './reference';
export type { Reference, ReferenceOutcome } from './reference';
export { recordGame, runReplay } from './replay';
export type { ReplayGame, ReplayResult } from './replay';
export { curveTable, detailTable, gatesTable, outcomesTable, staffLine, table } from './report';
export type { Format } from './report';
