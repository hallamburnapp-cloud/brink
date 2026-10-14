/**
 * The Funds coin: a brass disc with a raised diamond, the game's currency mark (shown as ◆ in text,
 * where it is drawn with Glyph name="diamond"). Brass is a material, not an icon, so it may use gradients.
 */
import type { JSX } from 'preact';
import { Frame, useIconUid, type FrameProps } from './kit';

export function drawCoin(uid: string): JSX.Element {
  const rim = `${uid}-rim`;
  const face = `${uid}-face`;
  const gem = 'M32 18 L44 32 L32 46 L20 32 Z';
  return (
    <>
      <defs>
        <linearGradient id={rim} x1="0.15" y1="0.1" x2="0.85" y2="0.95">
          <stop offset="0" stop-color="#FBE7B0" />
          <stop offset="0.38" stop-color="#E3C078" />
          <stop offset="0.72" stop-color="#B58E46" />
          <stop offset="1" stop-color="#6A4F22" />
        </linearGradient>
        <linearGradient id={face} x1="0.85" y1="0.9" x2="0.15" y2="0.1">
          <stop offset="0" stop-color="#F3D699" />
          <stop offset="0.5" stop-color="#C9A35B" />
          <stop offset="1" stop-color="#7D5D27" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="34" r="27" fill="#2B1E0B" opacity="0.65" />
      <circle cx="32" cy="32" r="27" fill={`url(#${rim})`} stroke="#3A2A10" stroke-width="2" />
      <circle cx="32" cy="32" r="21" fill={`url(#${face})`} stroke="#7D5D27" stroke-width="1.2" />
      <circle cx="32" cy="32" r="23.6" fill="none" stroke="#FFF2C8" stroke-opacity="0.35" stroke-width="0.8" stroke-dasharray="1.2 2.2" />
      <path d={gem} fill="#7D5D27" transform="translate(1.2 1.6)" opacity="0.7" />
      <path d={gem} fill={`url(#${rim})`} stroke="#5A4219" stroke-width="1.2" stroke-linejoin="round" />
      <path d="M32 18 L44 32 L32 32 Z" fill="#FFF4D2" opacity="0.38" />
      <path d="M20 32 L32 46 L32 32 Z" fill="#3A2A10" opacity="0.25" />
      <path d="M15 22 Q20 13 30 10.6" fill="none" stroke="#FFFAF0" stroke-width="2.4" stroke-linecap="round" opacity="0.75" />
    </>
  );
}

/** The Funds coin. 20 px on the Big Board (spec 10). */
export function Coin({ size = 20, ...frame }: Partial<FrameProps>): JSX.Element {
  const uid = useIconUid();
  return (
    <Frame size={size} {...frame}>
      {drawCoin(uid)}
    </Frame>
  );
}
