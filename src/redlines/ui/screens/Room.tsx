/**
 * The room: paper under a lamp, one sheet (the map) and the papers on it. Which papers are out
 * follows the game: the title's card over the world as it stands; the week's calendar, note, index
 * card and tape; the call (the sheet slides up under the handset, the room goes dark); the ending's
 * typed card and the debrief's pages; the explanation's slips; the menu. The map controller lives
 * as long as the room, so the sheet never rebuilds between screens.
 */
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { BRAND } from '../../../config';
import { CALL_SHIFT, Grain, Lamp, NeatLine, PaperMapView, PaperRoom, SheetTitle, type PaperMapRef } from '../paper';
import { BLOC_TITLES, content } from '../app/engine';
import { setMap } from '../app/mapRef';
import { curtain, explain, inGame, play, reduced, screen, shown } from '../app/store';
import { mapView } from '../app/view';
import { counterLabel } from '../app/words';
import { Ending } from './Ending';
import { Explain } from './Explain';
import { Sheets } from './Menu';
import { PhoneCall } from './Phone';
import { Title } from './Title';
import { Week } from './Week';

export function Room(): JSX.Element {
  const S = content.strings;
  const s = shown.value;
  const playing = play.value !== null;
  const game = inGame.value && s !== null;
  const explaining = explain.value !== null;
  const call = game && !playing && !explaining && s.phase === 'phone';
  const ended = game && !playing && !explaining && s.phase === 'ended';
  const mapRef = useRef<ReturnType<typeof Object> | null>(null) as unknown as PaperMapRef;
  const r = reduced.value;

  // The call: the sheet slides up under the handset and the desk's compass goes.
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    m.setShift(call ? CALL_SHIFT : 0);
    m.svg.classList.toggle('pp-nodesk', call);
  }, [call]);

  useEffect(() => {
    mapRef.current?.setReducedMotion(r);
  }, [r]);

  const words = {
    defend: S.words.defend,
    tested: S.words.tested,
    fighting: S.words.fighting,
    blocs: BLOC_TITLES,
    fleet: counterLabel(S, 'fleet'),
    brigade: counterLabel(S, 'brigade'),
  };

  return (
    <PaperRoom call={call} reduced={r}>
      <Grain />
      {!call && <NeatLine />}
      <PaperMapView
        view={mapView.value}
        mapRef={mapRef}
        options={{ reducedMotion: r, words, label: BRAND.name }}
        // The controller is handed to the screens' pointer handlers through mapRef.ts.
        onSettled={() => setMap(mapRef.current)}
      />
      <MapRegistrar mapRef={mapRef} />
      {!call && <SheetTitle text={BRAND.name} />}
      {game && !call && !ended && !explaining && <Week />}
      {call && <PhoneCall />}
      {!call && <Lamp />}
      {ended && <Ending />}
      {game && explaining && <Explain />}
      {(screen.value === 'title' || curtain.value !== null) && <Title lifting={curtain.value === 'lifting'} />}
      <Sheets />
    </PaperRoom>
  );
}

/** Registers the map controller for the pointer handlers as soon as it exists. */
function MapRegistrar({ mapRef }: { mapRef: PaperMapRef }): null {
  useEffect(() => {
    setMap(mapRef.current);
    return () => setMap(null);
  }, [mapRef]);
  return null;
}
