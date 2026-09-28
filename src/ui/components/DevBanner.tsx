import { useState } from 'preact/hooks';
import { contentIssues } from '../../content';

/** Dev-only: shows content validation issues so authors never leave the game. */
export function DevBanner() {
  const [open, setOpen] = useState(false);
  if (!import.meta.env.DEV) return null;
  const issues = contentIssues;
  const errors = issues.filter((i) => i.level === 'error');
  if (issues.length === 0) return null;
  return (
    <div class={`mono sticky top-0 z-[60] text-[11px] ${errors.length ? 'bg-red text-white' : 'bg-amber text-ink'}`}>
      <button class="w-full px-3 py-1 text-left" onClick={() => setOpen(!open)}>
        content: {errors.length} error(s), {issues.length - errors.length} warning(s) — {open ? 'hide' : 'show'}
      </button>
      {open && (
        <div class="scroll-thin max-h-[40vh] overflow-auto bg-navy px-3 py-2 text-paper">
          {issues.slice(0, 200).map((i, n) => (
            <div key={n} class={i.level === 'error' ? 'text-red' : 'text-amber'}>
              {i.level === 'error' ? '✖' : '⚠'} {i.where}: {i.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
