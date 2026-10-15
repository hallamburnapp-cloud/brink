/**
 * A hint line fitted to the map (pure, so it has a test). The map carries at most MAP_LABEL_MAX
 * characters beside a glowing place (the week-long guard fits); the card repeats the whole line, so the last clauses go first
 * and the DANGER clause always stays. A risky button's miss ("if not, Shoal heats") is one clause.
 */

/** The longest label the map carries. */
export const MAP_LABEL_MAX = 46;

/** The world clauses of a hint, the miss kept whole: 'if not, Shoal heats' is one clause, not two. */
export function clausesOf(world: string): string[] {
  const parts: string[] = [];
  for (const p of world.split(', ')) {
    if (parts.length && /^if not$/.test(parts[parts.length - 1])) parts[parts.length - 1] = `if not, ${p}`;
    else parts.push(p);
  }
  return parts;
}

export function mapLabel(hint: string, max = MAP_LABEL_MAX): string {
  if (hint.length <= max) return hint;
  const [danger, world = ''] = hint.split(' · ');
  const parts = clausesOf(world);
  while (parts.length > 0) {
    parts.pop();
    const out = parts.length ? `${danger} · ${parts.join(', ')}` : danger;
    if (out.length <= max) return out;
  }
  return danger.length <= max ? danger : `${danger.slice(0, max - 1)}…`;
}
