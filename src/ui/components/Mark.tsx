/** The BRINK mark: a gauge one tick from full. */
export function Mark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="BRINK mark">
      <circle cx="50" cy="50" r="40" fill="none" stroke="#ece7d8" stroke-width="3" opacity="0.9" />
      <path d="M50 10 A40 40 0 0 1 88.3 38.6" fill="none" stroke="#e03b3b" stroke-width="7" stroke-linecap="butt" />
      <circle cx="50" cy="50" r="3" fill="#ece7d8" />
      <line x1="50" y1="50" x2="79" y2="26" stroke="#ece7d8" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  );
}
