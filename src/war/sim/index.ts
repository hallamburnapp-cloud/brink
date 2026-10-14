/**
 * The war-room simulator and balance gates (spec section 14): a port of the reference bots in
 * docs/war/reference (crisis.py, randbot.py, spread.py) on top of src/war/engine.
 * The CLI is tools/war-sim.ts; the results are written up in docs/war/SIM-REPORT.md.
 */
export { bestAirliftPlay, bestPlay, playGreedyCrisis, swapOut } from './greedy';
export type { BotStep, CrisisOutcome, Play } from './greedy';
export { playRandomCrisis } from './random-bot';
export { dealSpread, randomDeal, runSpread, summariseSpread } from './spread';
export type { DealSpread, SpreadStats } from './spread';
export { CALIBRATION, calibrationRow, median, playRowCrisis, rowCrisis, tallyRow } from './calibration';
export type { CalibrationRow, RowTally } from './calibration';
export { crisisState } from './setup';
export type { CrisisSetup, TwistSpec } from './setup';
export { playRun, playRuns, seatOrder, shopForStaff } from './builder';
export type { RunBot, RunOutcome } from './builder';
export { evaluateGates, GATE_ROWS, twoSigma } from './gates';
export type { GateCheck, GateResult } from './gates';
export { collect, inProcess, planJobs, simulate } from './simulate';
export type { Executor, SimOptions, SimResults } from './simulate';
export { runJob } from './jobs';
export type { Job, JobResult } from './jobs';
export { calibrationTable, gatesTable, runsReport, spreadReport } from './report';
export { SPREAD_REF } from './reference';
