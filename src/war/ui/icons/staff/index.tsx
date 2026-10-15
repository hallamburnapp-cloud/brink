/**
 * StaffIcon: each of the 10 staff drawn as the object they keep (SPEC section 7).
 * No faces, hands or figures. Drawn at 34 px on the rail, 40 px on a shop card, 64 px and up for store art.
 */
import type { JSX } from 'preact';
import type { StaffId } from '../../../content/staff';
import { Frame, useIconUid, type Draw, type FrameProps } from '../kit';
import { supplyCrate } from './cases';
import { deskLamp, shipsBell, theodolite } from './instruments';
import { carbonPaper, foldedMap, paperCrown } from './papers';
import { signetRing, tinMug, waxSeal } from './table';

export type { StaffId };

/** One drawing per staff id; the Record type makes a missing staff a compile error. */
export const STAFF_DRAWINGS: Readonly<Record<StaffId, Draw>> = {
  DUTY: deskLamp,
  QM: supplyCrate,
  SURVEYOR: theodolite,
  OLDHAND: tinMug,
  SOVEREIGN: signetRing,
  STRATEGIST: foldedMap,
  GOVERNOR: waxSeal,
  HARBOUR: shipsBell,
  HERALD: paperCrown,
  DEPUTY: carbonPaper,
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
