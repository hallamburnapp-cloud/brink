/**
 * The call (SPEC-SMALL "The phone"): the room goes dark, the handset is off the hook, the clock
 * says which week and whether this is the second or third week of the same call; the caller's card
 * (forty words), the three advisers on torn slips, in character; then the three typed forms, each
 * with its cost in plain words. The map (shifted up under the handset) still shows the tested
 * place. Nothing else is on screen.
 */
import type { JSX } from 'preact';
import { CallerCard, Dim, FlipClock, Handset, Lamp, Tape, TornSlip, TypedForm } from '../paper';
import { answer } from '../app/actions';
import { canAnswer, content, type Phone } from '../app/engine';
import { busy, shown } from '../app/store';
import { tapeFor } from '../app/tape';
import { adviserWho, callerLines, roundLine } from '../app/words';

export function PhoneCall(): JSX.Element | null {
  const s = shown.value;
  const phone = s?.phone;
  if (!s || !phone) return null;
  const S = content.strings;
  const A = content.advisers;
  const who = callerLines(phone);
  const opt = (key: Phone['options'][number]['key']) => phone.options.find((o) => o.key === key) ?? phone.options[0];
  const can = (key: 'back' | 'down' | 'wait') => !busy.value && canAnswer(s, key).ok;
  return (
    <>
      <Dim />
      <Lamp />
      <div class="rl-in" style="animation-delay:0ms">
        <Handset />
        <FlipClock big={`${S.words.week} ${s.week}`} small={roundLine(S, phone.round)} />
      </div>
      <div class="rl-in" style="animation-delay:120ms">
        <CallerCard name={who.name} lead={who.lead || undefined} role={who.role} text={phone.text} />
      </div>
      <div class="rl-in" style="animation-delay:260ms">
        <TornSlip n={1} who={adviserWho('hawk', A.hawk.role)} text={phone.advisers.hawk} />
        <TornSlip n={2} who={adviserWho('dove', A.dove.role)} text={phone.advisers.dove} />
        <TornSlip n={3} who={adviserWho('intel', A.intel.role)} text={phone.advisers.intel} />
      </div>
      <div class="rl-in" style="animation-delay:400ms">
        <TypedForm n={1} word={opt('back').label} cost={opt('back').cost} onTap={() => void answer('back')} disabled={!can('back')} />
        <TypedForm n={2} word={opt('down').label} cost={opt('down').cost} onTap={() => void answer('down')} disabled={!can('down')} />
        <TypedForm n={3} word={opt('wait').label} cost={opt('wait').cost} onTap={() => void answer('wait')} disabled={!can('wait')} />
        <Tape lines={tapeFor(s, 2)} />
      </div>
    </>
  );
}
