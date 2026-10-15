/**
 * Text that fits its fixed rect (STYLE 4, overflow rule): a name that shrinks rather than wraps.
 */
import type { JSX } from 'preact';
import { useLayoutEffect, useRef } from 'preact/hooks';

export function FitText({ text, max, min, class: cls }: { text: string; max: number; min: number; class?: string }): JSX.Element {
  const el = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const n = el.current;
    const box = n?.parentElement;
    if (!n || !box) return;
    n.style.fontSize = `${max}px`;
    const room = box.clientWidth;
    const need = n.scrollWidth;
    if (room > 0 && need > room) n.style.fontSize = `${Math.max(min, (max * room) / need - 0.2).toFixed(2)}px`;
  }, [text, max, min]);
  return (
    <span ref={el} class={`fit ${cls ?? ''}`}>
      {text}
    </span>
  );
}
