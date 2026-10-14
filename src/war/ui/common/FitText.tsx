/**
 * Text that fits its fixed rect (STYLE 4, overflow rule): a name that shrinks rather than wraps,
 * and a wrapped rule that shrinks rather than clips.
 */
import type { JSX, Ref } from 'preact';
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

/**
 * A wrapped block that must never clip (a card's rule): if its text overflows the box, the font
 * steps down by half a point until it fits, never below `min`. Runs again when `key` changes.
 */
export function useFitBox(min: number, key: unknown): Ref<HTMLElement> {
  const el = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const n = el.current;
    if (!n) return;
    n.style.fontSize = '';
    let size = parseFloat(getComputedStyle(n).fontSize) || min;
    while (n.scrollHeight > n.clientHeight + 0.5 && size > min) {
      size = Math.max(min, size - 0.5);
      n.style.fontSize = `${size}px`;
    }
  }, [key, min]);
  return el;
}
