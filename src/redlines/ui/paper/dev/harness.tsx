/**
 * A dev harness for the paper look: MOMENT.md's day 18 on the sheet (?call=1 for the call at 03:14,
 * ?empty=1 for a bare sheet, ?reduced=1 for reduced motion). Served by `vite` at
 * /src/redlines/ui/paper/dev/harness.html; the screenshot script in the map builder's scratch
 * folder shoots it at 390 x 844, DPR 2. Not part of the game: the screens builder mounts the real one.
 * The words here are the mock's; the game's come from strings.yaml.
 */
import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { BRAND } from '../../../../config';
import '../paper.css';
import { CALL_SHIFT } from '../geometry';
import type { PaperMap, PaperView } from '../contract';
import { PaperMapView } from '../PaperMap';
import { Calendar, CallerCard, Dim, FlipClock, Grain, Handset, IndexCard, IntelSlip, Lamp, NeatLine, Note, PaperRoom, SheetTitle, Tape, TornSlip, TypedCard, TypedForm, DebriefPage } from '../parts';

const q = new URLSearchParams(location.search);
const CALL = q.get('call') === '1';
const EMPTY = q.get('empty') === '1';
const REDUCED = q.get('reduced') === '1';
const ENDING = q.get('ending') === '1';
const DEBRIEF = q.get('debrief') === '1';

const DAY18: PaperView = {
  states: { DRF: 'fighting', KLP: 'pressed', LTL: 'pressed', BRK: 'pressed', GUL: 'pressed' },
  promises: [
    { region: 'VSY', solid: true },
    { region: 'LNK', solid: true },
    { region: 'LTL', solid: q.get('bluff') === '1' ? false : true },
  ],
  headings: [
    { from: 'KLM', to: 'KLP' },
    { from: 'WMS', to: 'VSY' },
  ],
  pieces: q.get('brigade') === '1' ? [{ kind: 'fleet', at: 'LNK' }, { kind: 'brigade', at: 'EDV' }] : [{ kind: 'fleet', at: 'LNK' }],
  tested: 'LTL',
  pressed: q.get('hold') ?? null,
  lifted: q.get('lift') === '1' ? 'fleet' : null,
};

const TAPE = [
  { tag: 'WK 2', text: 'Federation armour reaches the Lintel line' },
  { tag: 'WK 3', text: "Wintermast: 'a test of nerves, nothing more'" },
  { tag: 'WK 3', text: 'Farsouth recalls its envoy' },
];

function Day() {
  const mapRef = useRef<PaperMap | null>(null);
  const [view, setView] = useState<PaperView>(EMPTY ? { states: {}, promises: [], headings: [], pieces: [], tested: null, pressed: null } : DAY18);
  useEffect(() => {
    // The dev hook for the screenshot script and for poking the marks by hand.
    (window as unknown as { __paper: unknown }).__paper = {
      map: () => mapRef.current,
      set: (v: PaperView) => setView(v),
      day18: () => setView(DAY18),
      view: () => view,
    };
  }, [view]);
  return (
    <PaperRoom reduced={REDUCED}>
      <Grain />
      <NeatLine />
      <PaperMapView view={view} mapRef={mapRef} options={{ reducedMotion: REDUCED, label: 'Situation map, week 3' }} />
      <SheetTitle text={BRAND.name} />
      <Calendar head="WEEK" n={3} of="of 8" note="influence" value={31} />
      <Note text="They are pushing the Sound and have taken Driftholm. Your promise at Lintel is being tested now." />
      <IntelSlip head="INTEL" text="They think you'll back down. We are fairly sure." />
      <IndexCard
        war={{ label: 'WAR', count: 1, sub: '1 place fighting', last: 'WORLD WAR' }}
        treaty={{ label: 'TREATY', value: 22, sub: "the Federation's willingness to sign" }}
        they={{ label: 'THEY ARE', word: 'PUSHING' }}
        slip={{ text: 'SEND ORDERS', onTap: () => console.log('send') }}
      />
      <Tape lines={TAPE} />
      <Lamp />
    </PaperRoom>
  );
}

function Call() {
  const mapRef = useRef<PaperMap | null>(null);
  return (
    <PaperRoom call reduced={REDUCED}>
      <Grain id="ppcg" />
      <PaperMapView view={DAY18} mapRef={mapRef} options={{ reducedMotion: REDUCED, shift: CALL_SHIFT, desk: false, idPrefix: 'ppc', label: 'Situation map, the call' }} />
      <Dim />
      <Lamp />
      <Handset />
      <FlipClock big="03:14" small="WEEK 3" />
      <CallerCard name="GENERAL RUUN HALDER" lead="the" role="Hawk" text="Federation armour is at Lintel, the promise you inherited. Two brigades, lights on, not moving. They want to see what you do." />
      <TornSlip n={1} who="HAWK · GENERAL" text="Move now. Or never promise anything again." />
      <TornSlip n={2} who="DOVE · FOREIGN MINISTER" text="A brigade in the Sound is the thing they warned us about." />
      <TornSlip n={3} who="INTEL · DIRECTOR" text="Fourth place they've pushed. First promise they've tested." />
      <TypedForm n={1} word="BACK IT" cost="move the brigade up · costs 12 influence · we keep our word" onTap={() => console.log('back')} />
      <TypedForm n={2} word="BACK DOWN" cost="protest and hold · they'll believe us less · Lintel will likely fall" onTap={() => console.log('down')} />
      <TypedForm n={3} word="WAIT" cost="a week · Intel: Lintel may fall · a second source may arrive" onTap={() => console.log('wait')} />
      <Tape lines={TAPE.slice(0, 2)} />
    </PaperRoom>
  );
}

function Ending() {
  return (
    <PaperRoom reduced={REDUCED}>
      <Grain />
      <NeatLine />
      <PaperMapView view={DAY18} options={{ reducedMotion: REDUCED }} />
      <SheetTitle text={BRAND.name} />
      <Dim />
      <TypedCard
        head="THE ENDING"
        title="TREATY"
        tone="blue"
        lines={['Signed in week 6 with one place still fighting.', 'They stopped because they could not take Vessary and you gave them a way out.']}
        score={{ label: 'SCORE', value: 35 }}
        hand="now the debrief"
        style="top:430px"
      />
      <Lamp />
    </PaperRoom>
  );
}

function Debrief() {
  return (
    <PaperRoom reduced={REDUCED}>
      <Grain />
      <NeatLine />
      <PaperMapView view={DAY18} options={{ reducedMotion: REDUCED }} />
      <SheetTitle text={BRAND.name} />
      <Dim />
      <DebriefPage
        week="WEEK 3"
        tag="THE DEBRIEF"
        whatLabel="WHAT YOU DID"
        what={['Promised to defend Lintel.', 'Moved the fleet to Lantern Key.']}
        thoughtLabel="WHAT THEY THOUGHT"
        thoughts={['They were bluffing at Shoal. Backing it would have cost nothing.', 'Your fleet looked like an invasion.']}
        page="3 / 8"
      />
      <Lamp />
    </PaperRoom>
  );
}

render(CALL ? <Call /> : ENDING ? <Ending /> : DEBRIEF ? <Debrief /> : <Day />, document.getElementById('frame')!);
