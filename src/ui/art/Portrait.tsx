import type { JSX } from 'preact';
import { getIcon, getPortrait, type ArtEntry } from './manifest';

export type ArtProps = {
  /** Art id from the manifest (e.g. `hawk_general`). Unknown ids fall back. */
  art: string;
  /** Accent colour, any CSS colour. Becomes `currentColor` inside the SVG. */
  accent: string;
  /** Rendered width and height in CSS px. Portraits default to 40, icons to 24. */
  size?: number;
  class?: string;
  /** Accessible name. When omitted the image is decorative (`aria-hidden`). */
  title?: string;
};

function ArtImage(props: ArtProps & { entry: ArtEntry; viewBox: string; defaultSize: number; baseClass: string }): JSX.Element {
  const { entry, viewBox, defaultSize, baseClass, accent, title } = props;
  const size = props.size ?? defaultSize;
  const cls = props.class ? `${baseClass} ${props.class}` : baseClass;
  const style = { color: accent, width: `${size}px`, height: `${size}px` };

  if (entry.kind === 'url') {
    return (
      <img
        src={entry.url}
        width={size}
        height={size}
        class={cls}
        style={style}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        decoding="async"
        draggable={false}
      />
    );
  }

  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      class={cls}
      style={style}
      role="img"
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      dangerouslySetInnerHTML={{ __html: entry.body }}
    />
  );
}

/**
 * Speaker portrait (square, viewBox 0 0 100 100).
 * Renders inline SVG with `color: accent`, or an `<img>` for `{ kind: 'url' }` entries.
 */
export function Portrait(props: ArtProps): JSX.Element {
  return <ArtImage {...props} entry={getPortrait(props.art)} viewBox="0 0 100 100" defaultSize={40} baseClass="brink-portrait" />;
}

/**
 * Piece icon (square, viewBox 0 0 48 48, monoline in the accent colour).
 * Renders inline SVG with `color: accent`, or an `<img>` for `{ kind: 'url' }` entries.
 */
export function PieceIcon(props: ArtProps): JSX.Element {
  return <ArtImage {...props} entry={getIcon(props.art)} viewBox="0 0 48 48" defaultSize={24} baseClass="brink-piece-icon" />;
}
