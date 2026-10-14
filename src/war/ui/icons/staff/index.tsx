/**
 * StaffIcon: each of the 20 staff drawn as the object they keep (spec section 5).
 * No faces, hands or figures. Drawn at 34 px on the rail, 48 px on a Briefing card, 64 px and up for store art.
 */
import type { JSX } from 'preact';
import type { StaffId } from '../../../content/staff';
import { Frame, useIconUid, type Draw, type FrameProps } from '../kit';
import { cashBox, diplomaticBag, satchel, supplyCrate } from './cases';
import { deskLamp, morseKey, redPhone, shipsBell, telescope, theodolite } from './instruments';
import { carbonPaper, clipboard, ferryTimetable, foldedMap, paperCrown, railTimetable } from './papers';
import { signetRing, teacup, tinMug, waxSeal } from './table';

export type { StaffId };

/** One drawing per staff id; the Record type makes a missing staff a compile error. */
export const STAFF_DRAWINGS: Readonly<Record<StaffId, Draw>> = {
  DUTY: deskLamp,
  QM: supplyCrate,
  HARBOUR: shipsBell,
  SURVEYOR: theodolite,
  HOTLINE: redPhone,
  GOVERNOR: waxSeal,
  TREASURER: cashBox,
  OLDHAND: tinMug,
  RAILCLERK: railTimetable,
  MEDIATOR: teacup,
  STRATEGIST: foldedMap,
  ENVOY: diplomaticBag,
  COURIER: satchel,
  FERRY: ferryTimetable,
  SIGNALS: morseKey,
  ADMIRAL: telescope,
  CHIEF: clipboard,
  DEPUTY: carbonPaper,
  HERALD: paperCrown,
  SOVEREIGN: signetRing,
};

export interface StaffIconProps extends Partial<FrameProps> {
  id: StaffId;
}

/** A staff object. Put `drop-shadow(1.5px 2px 1.5px rgba(0,0,0,.6))` on it when it sits on felt. */
export function StaffIcon({ id, size = 34, ...frame }: StaffIconProps): JSX.Element {
  const uid = useIconUid();
  return (
    <Frame size={size} {...frame}>
      {STAFF_DRAWINGS[id](uid)}
    </Frame>
  );
}
