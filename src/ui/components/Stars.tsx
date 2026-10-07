const WORDS = ['No stars', 'One star', 'Two stars', 'Three stars', 'Four stars', 'Five stars'];

/** A review's stars, brass on the dark screens and a darker brass on paper, read aloud as words. */
export function Stars({ n, onPaper = false, class: cls = '' }: { n: number; onPaper?: boolean; class?: string }) {
  const k = Math.max(0, Math.min(5, Math.round(n)));
  return (
    <span class={`stars inline-flex gap-[2px] leading-none ${cls}`} role="img" aria-label={`${WORDS[k]} out of five`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} class={i < k ? (onPaper ? 'text-brass-ink' : 'text-brass') : 'opacity-25'} aria-hidden="true">
          ★
        </span>
      ))}
    </span>
  );
}
