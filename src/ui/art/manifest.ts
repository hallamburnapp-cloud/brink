/**
 * BRINK placeholder art manifest.
 *
 * Every piece of art in the game is looked up here by id, so any entry can be
 * swapped for a real illustration by changing it to `{ kind: 'url', url }` and
 * dropping a PNG/WebP into `public/art/`. See ./README.md for the full process.
 *
 * Colour conventions inside inline SVG bodies:
 *   - `currentColor`                     the accent colour (set by the component)
 *   - `var(--art-paper, #ece7d8)`        off-white briefing paper / the silhouette fill
 *   - `var(--art-ink, #0b1220)`          deep navy / dark fills
 */
export type ArtEntry = { kind: 'svg'; body: string } | { kind: 'url'; url: string };

/** CSS value for the paper (silhouette) fill. Override with `--art-paper`. */
export const PAPER = 'var(--art-paper, #ece7d8)';
/** CSS value for the ink (dark) fill. Override with `--art-ink`. */
export const INK = 'var(--art-ink, #0b1220)';

const svg = (body: string): ArtEntry => ({ kind: 'svg', body });

// ---------------------------------------------------------------------------
// Portraits (viewBox 0 0 100 100)
// ---------------------------------------------------------------------------

/** Dossier backdrop, drawn under the silhouette: dark photo card + accent tint. */
const BACK =
  `<rect x="2" y="2" width="96" height="96" rx="2" fill="${INK}"/>` +
  `<rect x="2" y="2" width="96" height="96" rx="2" fill="currentColor" opacity="0.14"/>`;

/** Dossier frame, drawn over the silhouette: corner brackets, hairline border, index tab, scan-lines. */
const FRONT =
  `<path d="M2 11V2h9M89 2h9v9M98 89v9h-9M11 98H2v-9" fill="none" stroke="currentColor" stroke-width="2.5"/>` +
  `<rect x="2" y="2" width="96" height="96" rx="2" fill="none" stroke="currentColor" stroke-width="1" opacity="0.55"/>` +
  `<rect x="8" y="8" width="14" height="3" fill="currentColor"/>` +
  `<path d="M2 14H98M2 22H98M2 30H98M2 38H98M2 46H98M2 54H98M2 62H98M2 70H98M2 78H98M2 86H98M2 94H98" stroke="currentColor" stroke-width="0.6" opacity="0.2"/>`;

const portrait = (...parts: string[]): ArtEntry => svg(BACK + parts.join('') + FRONT);

/** Head oval in paper. */
const head = (cx = 50, cy = 40, rx = 13, ry = 15): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${PAPER}"/>`;
/** Neck column in paper. */
const neck = (w = 12): string => `<rect x="${50 - w / 2}" y="48" width="${w}" height="18" fill="${PAPER}"/>`;
/** Shoulders in paper. `w` = half-width at the bottom edge, `top` = y of the shoulder line. */
const shoulders = (w = 34, top = 64): string =>
  `<path d="M${50 - w} 98C${50 - w} ${top + 12} ${50 - w / 2} ${top} 50 ${top}S${50 + w} ${top + 12} ${50 + w} 98Z" fill="${PAPER}"/>`;
/** A close-cropped or pulled-back hair cap over the top of the head, in ink. */
const hairCap = (): string =>
  `<path d="M37.5 38C38 27 43 25 50 25S62 27 62.5 38C60 32 55 30 50 30S41 32 37.5 38Z" fill="${INK}"/>`;
/** Shirt collar V in ink. */
const collar = (depth = 72, spread = 6): string =>
  `<path d="M${50 - spread} 64L50 ${depth}L${50 + spread} 64" fill="none" stroke="${INK}" stroke-width="2"/>`;
/** Jacket lapel lines from the collar point down to the bottom edge. */
const lapels = (from = 72, spread = 10, width = 1.5): string =>
  `<path d="M50 ${from}L${50 - spread} 98M50 ${from}L${50 + spread} 98" fill="none" stroke="${INK}" stroke-width="${width}"/>`;

export const portraits: Record<string, ArtEntry> = {
  /** Private secretary: hair tied back in a low ponytail, blouse collar, lanyard with badge. */
  aide: portrait(
    shoulders(33),
    neck(),
    `<ellipse cx="60" cy="52" rx="5" ry="11" fill="${INK}"/>`,
    head(),
    hairCap(),
    collar(72, 6),
    `<path d="M45 66L48 82M55 66L52 82" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    `<rect x="45" y="81" width="10" height="7" rx="1" fill="currentColor" stroke="${INK}" stroke-width="1"/>`,
  ),

  /** Chief of the Defence Staff: peaked cap, square jaw, epaulettes, ribbon rack, uniform tie. */
  hawk_general: portrait(
    shoulders(38, 62),
    neck(14),
    head(50, 44, 13, 14),
    `<rect x="39" y="44" width="22" height="12" rx="3" fill="${PAPER}"/>`,
    `<path d="M33 36C33 24 40 20 50 19S67 24 67 36Z" fill="${INK}"/>`,
    `<rect x="33" y="33" width="34" height="4" fill="currentColor"/>`,
    `<circle cx="50" cy="28" r="2.5" fill="currentColor"/>`,
    `<path d="M31 37H69C69 40 60 42 50 42S31 40 31 37Z" fill="${INK}"/>`,
    `<path d="M23 72L36 65L37 69L24 76Z" fill="currentColor"/>`,
    `<path d="M77 72L64 65L63 69L76 76Z" fill="currentColor"/>`,
    `<path d="M32 80h4v3h-4zM37 80h4v3h-4zM42 80h4v3h-4zM32 84h4v3h-4zM37 84h4v3h-4z" fill="currentColor"/>`,
    `<path d="M44 66L50 74L56 66" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M50 72L47 76L50 94L53 76Z" fill="${INK}"/>`,
  ),

  /** Foreign Minister: sharp bob, loose scarf, small brooch. */
  dove_fm: portrait(
    shoulders(33),
    neck(),
    `<path d="M38 64C42 70 58 70 62 64L64 72C56 79 44 79 36 72Z" fill="currentColor"/>`,
    `<path d="M35 52V38C35 20 65 20 65 38V52Z" fill="${INK}"/>`,
    head(50, 41, 11.5, 13),
    `<path d="M36 74L34 98M64 74L66 98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<circle cx="34" cy="86" r="2.5" fill="currentColor"/>`,
  ),

  /** Director of National Intelligence: thinning hair, round tinted spectacles, narrow tie. */
  intel_director: portrait(
    shoulders(33),
    neck(),
    head(50, 40, 12.5, 15),
    `<path d="M39 32C41 25 59 25 61 32" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="44" cy="41" r="5" fill="currentColor" opacity="0.75"/>`,
    `<circle cx="56" cy="41" r="5" fill="currentColor" opacity="0.75"/>`,
    `<path d="M39 41a5 5 0 1 0 10 0a5 5 0 1 0-10 0M51 41a5 5 0 1 0 10 0a5 5 0 1 0-10 0M49 41h2M39 41l-2-1M61 41l2-1" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
    collar(72, 7),
    `<path d="M50 70L47.5 74L49.5 90L50 92L50.5 90L52.5 74Z" fill="${INK}"/>`,
    lapels(72, 12),
  ),

  /** Director of Communications: slicked hair with a widow's peak, earpiece, open collar, pocket square. */
  spin_doctor: portrait(
    shoulders(34),
    neck(),
    head(50, 40, 12.5, 15),
    `<path d="M37.5 38C38 26 43 24 50 26C57 24 62 26 62.5 38C60 32 55 29 50 32C45 29 40 32 37.5 38Z" fill="${INK}"/>`,
    `<circle cx="62" cy="43" r="2.6" fill="currentColor"/>`,
    `<path d="M63 45C67 52 65 60 61 66" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    collar(80, 10),
    lapels(80, 14),
    `<path d="M30 84L38 82L36 88Z" fill="currentColor"/>`,
  ),

  /** Ambassador-at-Large: hair at the temples only, moustache, wing collar, bow tie. */
  ambassador: portrait(
    shoulders(33),
    neck(),
    head(50, 40, 13, 15.5),
    `<path d="M37 36C38 30 40 27 44 26L44 31C41 32 39 34 38 40ZM63 36C62 30 60 27 56 26L56 31C59 32 61 34 62 40Z" fill="${INK}"/>`,
    `<path d="M44 47.5C46 45 49 46 50 47.5C51 46 54 45 56 47.5C54 50 46 50 44 47.5Z" fill="${INK}"/>`,
    `<path d="M44 64L48 70M56 64L52 70" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M42 68L49 71L42 74ZM58 68L51 71L58 74Z" fill="currentColor"/>`,
    `<rect x="48" y="69" width="4" height="4" fill="currentColor"/>`,
    lapels(74, 10),
  ),

  /** Director, Cyber & Space Command: high bun, visor bar, mandarin collar, circuit pin. */
  cyber_director: portrait(
    shoulders(32),
    neck(),
    `<circle cx="50" cy="26" r="6" fill="${INK}"/>`,
    head(50, 42, 12.5, 14.5),
    `<path d="M37.5 40C38 29 43 27 50 27S62 29 62.5 40C59 34 55 32 50 32S41 34 37.5 40Z" fill="${INK}"/>`,
    `<rect x="37" y="39" width="26" height="3.5" rx="1" fill="currentColor"/>`,
    `<rect x="42" y="62" width="16" height="6" rx="1" fill="${INK}"/>`,
    `<path d="M50 68V98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<path d="M36 78h6v6h-6zM39 78v-4M42 81h4" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  ),

  /** Treasury: bald, heavy-set, waistcoat with watch chain, wide lapels. */
  treasury: portrait(
    shoulders(38, 63),
    neck(16),
    head(50, 40, 14, 15),
    `<path d="M40 63L50 78L60 63" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M50 78L44 98M50 78L56 98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<circle cx="50" cy="82" r="1.3" fill="${INK}"/>`,
    `<circle cx="50" cy="88" r="1.3" fill="${INK}"/>`,
    `<circle cx="50" cy="94" r="1.3" fill="${INK}"/>`,
    `<path d="M50 86C56 84 62 88 66 94" fill="none" stroke="currentColor" stroke-width="1.6"/>`,
    `<circle cx="66" cy="94" r="2" fill="currentColor"/>`,
    `<path d="M40 63L30 98M60 63L70 98" fill="none" stroke="${INK}" stroke-width="2"/>`,
  ),

  /** Fleet Commander: white-topped peaked cap, badge, striped shoulder boards, double-breasted. */
  admiral: portrait(
    shoulders(37, 63),
    neck(),
    head(50, 44, 12.5, 14),
    `<path d="M32 36C32 25 40 21 50 21S68 25 68 36Z" fill="${PAPER}"/>`,
    `<rect x="31" y="34" width="38" height="4" fill="${INK}"/>`,
    `<path d="M29 38H71C71 41 61 43 50 43S29 41 29 38Z" fill="${INK}"/>`,
    `<path d="M46 30L50 26L54 30L50 33Z" fill="currentColor"/>`,
    `<path d="M32 36H68" stroke="currentColor" stroke-width="1.2"/>`,
    `<path d="M22 73L36 66L37.5 70L23.5 77Z" fill="currentColor"/>`,
    `<path d="M78 73L64 66L62.5 70L76.5 77Z" fill="currentColor"/>`,
    `<path d="M27 74L28 70M31 72L32 68M73 74L72 70M69 72L68 68" stroke="${INK}" stroke-width="1.2"/>`,
    `<path d="M43 77h2.5v2.5h-2.5zM43 85h2.5v2.5h-2.5zM43 93h2.5v2.5h-2.5zM54.5 77h2.5v2.5h-2.5zM54.5 85h2.5v2.5h-2.5zM54.5 93h2.5v2.5h-2.5z" fill="currentColor"/>`,
    `<path d="M44 66L50 74L56 66" fill="none" stroke="${INK}" stroke-width="2"/>`,
    `<path d="M50 72L47.5 76L50 92L52.5 76Z" fill="${INK}"/>`,
  ),

  /** Peace Movement Leader: hijab-style scarf in the accent colour framing the face, pin at the side. */
  peace_leader: portrait(
    shoulders(33),
    `<path d="M33 44C33 22 67 22 67 44C67 56 72 62 78 70L74 98H26L22 70C28 62 33 56 33 44Z" fill="currentColor"/>`,
    head(50, 42, 11.5, 14),
    `<path d="M38 52C40 64 38 80 34 98M62 52C60 64 62 80 66 98" fill="none" stroke="${INK}" stroke-width="1" opacity="0.5"/>`,
    `<circle cx="41" cy="66" r="2" fill="${INK}"/>`,
  ),

  /** Defence CEO: swept quiff, turtleneck, hexagonal company pin. */
  contractor: portrait(
    shoulders(33),
    neck(),
    head(50, 40, 12.5, 15),
    `<path d="M37.5 38C37 27 42 22 50 25C56 20 64 24 62.5 36C60 31 56 30 50 30S41 32 37.5 38Z" fill="${INK}"/>`,
    `<rect x="41" y="58" width="18" height="8" rx="3" fill="${INK}"/>`,
    `<path d="M41 66L34 98M59 66L66 98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<path d="M36 82l3-2 3 2v4l-3 2-3-2z" fill="currentColor" stroke="${INK}" stroke-width="1"/>`,
  ),

  /** Chief of Staff: cropped hair, earpiece, loosened tie, folder held up at the side. */
  fixer: portrait(
    shoulders(35),
    neck(),
    head(),
    hairCap(),
    `<circle cx="37.5" cy="43" r="2.6" fill="currentColor"/>`,
    `<path d="M36.5 45C33 51 35 59 39 66" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    collar(72, 6),
    lapels(72, 6),
    `<path d="M50 70L47 74L49 88L52 84Z" fill="currentColor"/>`,
    `<path d="M66 76L90 72L90 98H66Z" fill="${INK}"/>`,
    `<path d="M66 76L90 72" fill="none" stroke="currentColor" stroke-width="2"/>`,
  ),

  /** The Hotline: not a person. A red telephone handset off its cradle, ringing. */
  hotline: portrait(
    `<path d="M27 30Q62 32 71 75" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`,
    `<ellipse cx="24" cy="26" rx="12" ry="7.5" transform="rotate(-45 24 26)" fill="currentColor"/>`,
    `<ellipse cx="74" cy="78" rx="12" ry="7.5" transform="rotate(-45 74 78)" fill="currentColor"/>`,
    `<path d="M30 29Q60 31 68 66" fill="none" stroke="${PAPER}" stroke-width="1.2" opacity="0.5"/>`,
    `<path d="M68 90L62 86L58 92L52 88L48 94L42 90L38 96L32 92" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    `<path d="M70 14a12 12 0 0 1 10 10M74 8a18 18 0 0 1 14 14" fill="none" stroke="${PAPER}" stroke-width="2" stroke-linecap="round" opacity="0.85"/>`,
  ),

  /** Duty Officer: headset with boom mic, cropped hair, zipped flight jacket, name tape. */
  watch_officer: portrait(
    shoulders(34),
    neck(),
    head(50, 41, 12.5, 15),
    hairCap(),
    `<path d="M36 40C36 24 64 24 64 40" fill="none" stroke="${INK}" stroke-width="3.5"/>`,
    `<rect x="32" y="37" width="6" height="10" rx="2" fill="currentColor"/>`,
    `<rect x="62" y="37" width="6" height="10" rx="2" fill="currentColor"/>`,
    `<path d="M36 47C36 54 42 58 48 57" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
    `<circle cx="49" cy="57" r="2" fill="currentColor"/>`,
    collar(70, 6),
    `<path d="M50 70V98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<rect x="56" y="80" width="12" height="3" fill="currentColor"/>`,
  ),

  /** Political correspondent: asymmetric bob, handheld microphone, press badge. */
  press: portrait(
    shoulders(32),
    neck(),
    `<path d="M36 54V38C36 22 64 22 64 38V48Z" fill="${INK}"/>`,
    head(50, 41, 11.5, 13.5),
    `<path d="M35 84L29 98" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`,
    `<ellipse cx="36" cy="78" rx="5" ry="6" fill="${INK}"/>`,
    `<path d="M32 76h8M32 79h8" stroke="currentColor" stroke-width="1"/>`,
    collar(72, 10),
    `<path d="M50 72V98" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
    `<rect x="58" y="80" width="12" height="5" fill="${INK}"/>`,
    `<rect x="60" y="81.75" width="8" height="1.5" fill="currentColor"/>`,
  ),

  /** Allied Prime Minister: long straight hair, dotted necklace, blazer, flag pin. */
  ally_leader: portrait(
    shoulders(33),
    neck(),
    `<path d="M35 38C35 22 65 22 65 38L67 78H60L59 40H41L40 78H33Z" fill="${INK}"/>`,
    head(50, 42, 12, 14),
    `<path d="M42 66C45 71 55 71 58 66" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="0.1 3" stroke-linecap="round"/>`,
    `<path d="M40 66L34 98M60 66L66 98" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<path d="M50 72V98" fill="none" stroke="${INK}" stroke-width="1"/>`,
    `<rect x="36" y="80" width="6" height="4" fill="currentColor"/>`,
  ),

  /** Rival head of state: slicked hair, red tie, at a podium with two microphones. */
  rival_leader: portrait(
    shoulders(36, 62),
    neck(),
    head(),
    `<path d="M37 38C37 26 42 24 50 24S63 26 63 38C61 31 56 28 50 28S39 31 37 38Z" fill="${INK}"/>`,
    collar(72, 6),
    `<path d="M50 70L47.5 74L50 84L52.5 74Z" fill="currentColor"/>`,
    lapels(72, 8),
    `<path d="M24 98V84H76V98Z" fill="${INK}"/>`,
    `<path d="M24 84H76" stroke="currentColor" stroke-width="2"/>`,
    `<path d="M40 84C40 78 44 76 46 70M60 84C60 78 56 76 54 70" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<circle cx="46" cy="69" r="2.5" fill="${INK}"/>`,
    `<circle cx="54" cy="69" r="2.5" fill="${INK}"/>`,
  ),

  /** Third-power head of state: full beard, ceremonial sash, medal. */
  other_leader: portrait(
    shoulders(35),
    neck(),
    head(),
    `<path d="M37 38C37 26 42 24 50 24S63 26 63 38C61 31 56 29 50 29S39 31 37 38Z" fill="${INK}"/>`,
    `<path d="M38 44C38 58 44 62 50 62S62 58 62 44C60 52 55 55 50 55S40 52 38 44Z" fill="${INK}"/>`,
    `<path d="M34 67L44 65L84 98H72Z" fill="currentColor"/>`,
    `<path d="M33 74h6v6h-6z" fill="currentColor"/>`,
    `<circle cx="36" cy="84" r="4" fill="currentColor"/>`,
    `<path d="M44 64L50 70L56 64" fill="none" stroke="${INK}" stroke-width="2"/>`,
  ),

  /** Leader of the Opposition: sharp side parting, open collar, party rosette. */
  opposition: portrait(
    shoulders(33),
    neck(),
    head(50, 40, 12.5, 15),
    `<path d="M37.5 38C38 26 44 24 50 24S62 26 62.5 38C60 33 57 29 55 30L42 36C40 36 38.5 37 37.5 38Z" fill="${INK}"/>`,
    collar(78, 8),
    lapels(78, 12),
    `<circle cx="36" cy="80" r="4.5" fill="currentColor"/>`,
    `<circle cx="36" cy="80" r="2" fill="${INK}"/>`,
    `<path d="M34 84L33 92M38 84L39 92" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
  ),

  /** Your partner: hood up at 3am, drawstrings hanging. */
  family: portrait(
    shoulders(31, 66),
    `<path d="M30 98C28 78 30 60 34 46C34 22 66 22 66 46C70 60 72 78 70 98Z" fill="${INK}"/>`,
    head(50, 44, 11.5, 13),
    `<path d="M44 70L42 90M56 70L58 90" fill="none" stroke="currentColor" stroke-width="1.8"/>`,
    `<circle cx="42" cy="91" r="1.6" fill="currentColor"/>`,
    `<circle cx="58" cy="91" r="1.6" fill="currentColor"/>`,
  ),

  /** Chief Scientific Adviser: wild hair, rectangular spectacles, lab coat with a pen in the pocket. */
  scientist: portrait(
    shoulders(33),
    neck(),
    head(50, 41, 12.5, 15),
    `<path d="M34 38C30 30 34 22 40 24C42 18 58 18 60 24C66 22 70 30 66 38C62 30 56 28 50 28S38 30 34 38Z" fill="${INK}"/>`,
    `<path d="M38 39h10v7h-10zM52 39h10v7h-10z" fill="currentColor" opacity="0.65"/>`,
    `<path d="M38 39h10v7h-10zM52 39h10v7h-10zM48 42h4M38 41l-2-1M62 41l2-1" fill="none" stroke="${INK}" stroke-width="1.6"/>`,
    collar(76, 8),
    lapels(76, 4, 1.2),
    `<path d="M60 84h12v10h-12z" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
    `<path d="M64 78v10" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`,
  ),

  /** Secretary of the Assembly of Nations: tall head-tie, earrings, globe lapel pin. */
  envoy: portrait(
    shoulders(34),
    neck(),
    head(50, 44, 12.5, 14),
    `<path d="M34 40C30 30 36 18 46 20C52 12 66 14 68 26C72 30 70 38 66 40C62 34 56 32 50 32S38 34 34 40Z" fill="${INK}"/>`,
    `<path d="M40 30C46 26 56 26 62 30M38 36C44 31 58 31 64 36" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.8"/>`,
    `<circle cx="36" cy="49" r="1.8" fill="currentColor"/>`,
    `<circle cx="64" cy="49" r="1.8" fill="currentColor"/>`,
    collar(74, 10),
    `<path d="M50 74V98" fill="none" stroke="${INK}" stroke-width="1.2"/>`,
    `<circle cx="38" cy="82" r="4" fill="none" stroke="${INK}" stroke-width="1.5"/>`,
    `<path d="M34 82h8M38 78v8" fill="none" stroke="${INK}" stroke-width="1"/>`,
  ),

  /** Attorney General: centre-parted hair in a low chignon, gown facings, jabot. */
  legal: portrait(
    shoulders(34),
    neck(),
    `<circle cx="60" cy="50" r="6" fill="${INK}"/>`,
    head(50, 40, 12.5, 15),
    hairCap(),
    `<path d="M50 25V31" stroke="${PAPER}" stroke-width="0.8"/>`,
    `<path d="M44 64L28 98M56 64L72 98" fill="none" stroke="${INK}" stroke-width="4"/>`,
    `<path d="M46 64h8v14l-4 3l-4-3z" fill="currentColor"/>`,
    `<path d="M50 66V80" stroke="${INK}" stroke-width="1"/>`,
  ),
};

// ---------------------------------------------------------------------------
// Piece icons (viewBox 0 0 48 48) — monoline, 2px strokes, round caps.
// ---------------------------------------------------------------------------

const icon = (...parts: string[]): ArtEntry =>
  svg(
    `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g>`,
  );
const p = (d: string, extra = ''): string => `<path d="${d}"${extra}/>`;
const dot = (cx: number, cy: number, r = 1.75): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="currentColor" stroke="none"/>`;
const ring = (cx: number, cy: number, r: number, extra = ''): string => `<circle cx="${cx}" cy="${cy}" r="${r}"${extra}/>`;

export const icons: Record<string, ArtEntry> = {
  // --- advisor glyphs ---
  /** star */
  hawk_general: icon(p('M24 9L28 19.5L39.2 20.1L30.5 27.1L33.4 37.9L24 31.8L14.6 37.9L17.5 27.1L8.8 20.1L20 19.5Z')),
  /** dove */
  dove_fm: icon(
    p('M6 30c6 3 14 2 19-4l5-7c2-3 6-3 8-1l4 3-4 1c0 6-4 12-12 14H6'),
    p('M20 26c1-7 6-12 14-14c-3 5-4 10-8 14'),
    dot(32.5, 21.5, 1.25),
  ),
  /** eye */
  intel_director: icon(p('M4 24C10 14 18 10 24 10S38 14 44 24C38 34 30 38 24 38S10 34 4 24Z'), ring(24, 24, 6), dot(24, 24, 2)),
  /** megaphone */
  spin_doctor: icon(p('M8 20v8h6l14 8V12L14 20Z'), p('M14 28v8h6v-6'), p('M34 18a8 8 0 0 1 0 12M38 14a14 14 0 0 1 0 20')),
  /** quill */
  ambassador: icon(p('M38 8c-10 2-20 10-24 24l-2 8'), p('M14 32c10-2 18-10 22-22'), p('M18 26l4 2M22 20l4 2'), p('M22 42h16')),
  /** satellite dish */
  cyber_director: icon(p('M6 20A18 18 0 0 0 28 42Z'), p('M17 31l9-9'), dot(27, 21), p('M30 14a8 8 0 0 1 4 4M34 8a14 14 0 0 1 6 6')),
  /** coin */
  treasury: icon(ring(24, 24, 15), ring(24, 24, 10, ' stroke-dasharray="3 3"'), p('M24 17v14M20 21h8')),
  /** anchor */
  admiral: icon(ring(24, 9, 3.5), p('M24 12.5V42'), p('M16 20h16'), p('M10 28c0 8 6 14 14 14s14-6 14-14'), p('M10 28l-4 4M10 28l5 3M38 28l4 4M38 28l-5 3')),
  /** olive branch */
  peace_leader: icon(
    p('M8 40C14 30 22 18 40 8'),
    p('M14 32c-2-6 1-10 6-10c1 5-1 9-6 10z'),
    p('M20 26c6-2 10 1 10 6c-5 1-9-1-10-6z'),
    p('M22 20c-2-6 1-10 6-10c1 5-1 9-6 10z'),
    p('M28 14c6-2 10 1 10 6c-5 1-9-1-10-6z'),
  ),
  /** gear */
  contractor: icon(
    ring(24, 24, 11),
    ring(24, 24, 4),
    p('M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2'),
  ),
  /** key */
  fixer: icon(ring(14, 24, 6), ring(14, 24, 2), p('M20 24h20'), p('M34 24v5M39 24v4')),

  // --- doctrines ---
  /** Launch on Warning: stopwatch, hand a tick from the top */
  doctrine_low: icon(ring(24, 27, 13), p('M24 14V9M20 9h8'), p('M35 13l3 3'), p('M24 27l8-8'), dot(24, 27, 1.5)),
  /** Deterrence by Denial: shield with a bar */
  doctrine_denial: icon(p('M24 6L38 11V24C38 33 32 39 24 42C16 39 10 33 10 24V11Z'), p('M17 24h14')),
  /** Strategic Ambiguity: dashed circle, question mark */
  doctrine_ambiguity: icon(ring(24, 24, 16, ' stroke-dasharray="4 4"'), p('M18 19c0-4 3-6 6-6s6 2 6 5c0 4-6 4-6 9'), dot(24, 33)),
  /** No First Use: launch arrow struck through */
  doctrine_nfu: icon(ring(24, 24, 16), p('M24 34V14M18 20l6-6 6 6'), p('M12.7 12.7l22.6 22.6')),
  /** Escalate to De-escalate: climb sharply, then come down */
  doctrine_e2d: icon(p('M6 38L14 26L20 32L30 14'), p('M24 14h6v6'), p('M30 14c8 6 10 14 10 24'), p('M36 34l4 4 4-4')),
  /** Alliance First: interlocking rings */
  doctrine_alliance: icon(ring(18, 24, 10), ring(30, 24, 10)),
  /** Fortress: battlements and a gate */
  doctrine_fortress: icon(p('M8 42V16h6v-6h6v6h8v-6h6v6h6v26'), p('M19 42v-8a5 5 0 0 1 10 0v8'), p('M6 42h36')),
  /** Transparency: sunlight */
  doctrine_transparency: icon(
    ring(24, 24, 7),
    p('M24 6v4M24 38v4M6 24h4M38 24h4M11.3 11.3l2.8 2.8M33.9 33.9l2.8 2.8M11.3 36.7l2.8-2.8M33.9 14.1l2.8-2.8'),
  ),
  /** Red Lines: a line that stops the arrow */
  doctrine_red_lines: icon(p('M6 30h36'), p('M24 8v18M18 20l6 6 6-6'), p('M10 38h28', ' stroke-dasharray="4 4"')),
  /** Hotline Protocol: telephone handset */
  doctrine_hotline: icon(
    p('M12 6c-3 0-6 3-6 6 0 14 10 24 24 24 3 0 6-3 6-6v-4l-8-3-4 4c-4-2-7-5-9-9l4-4-3-8z'),
    p('M31 9a8 8 0 0 1 8 8M32 3a14 14 0 0 1 13 13'),
  ),
  /** Pre-delegation: one node hands down to three */
  doctrine_predelegation: icon(ring(24, 9, 3), p('M24 12v8M12 20h24M12 20v7M24 20v7M36 20v7'), ring(12, 30, 3), ring(24, 30, 3), ring(36, 30, 3)),
  /** Minimal Deterrence: one point inside a wide circle */
  doctrine_minimal: icon(ring(24, 24, 16), p('M24 6v3M24 39v3M6 24h3M39 24h3'), dot(24, 24, 2.5)),

  // --- assets ---
  /** Early-Warning Constellation: satellites on orbit above a small planet */
  asset_ew: icon(p('M6 30a18 18 0 0 1 36 0', ' stroke-dasharray="3 3"'), dot(8.4, 21), dot(24, 12), dot(39.6, 21), ring(24, 36, 6), p('M24 18v12')),
  /** Back-Channel: the front line is broken, the quiet arc holds */
  asset_back_channel: icon(p('M8 16h12M28 16h12'), p('M22 12l-2 8'), p('M8 22c0 16 32 16 32 0', ' stroke-dasharray="3 3"'), dot(8, 19), dot(40, 19)),
  /** Cyber Unit: terminal prompt */
  asset_cyber: icon(`<rect x="6" y="10" width="36" height="28" rx="3"/>`, p('M14 20l6 4-6 4'), p('M24 30h10')),
  /** Missile Defence Layer: a dome over the towers, something breaking on it */
  asset_md: icon(p('M8 34a16 16 0 0 1 32 0'), p('M4 40h40'), p('M19 34v-7M29 34v-10'), p('M42 6l-6 7'), dot(35, 14)),
  /** Blue-Water Fleet: a warship on the swell */
  asset_fleet: icon(p('M4 30l4 8h32l4-8z'), p('M14 30v-6h8v-4h6v4h6v6'), p('M22 20v-8'), p('M6 44c3-2 6-2 9 0s6 2 9 0 6-2 9 0 6 2 9 0')),
  /** Hardened NC3: a hardened node and its links */
  asset_nc3: icon(p('M24 6l15 9v18l-15 9-15-9V15z'), p('M24 24v-10M24 24l-9 5M24 24l9 5'), dot(24, 24, 2.5)),
  /** Commercial Satellite Deal: bus, panels, dish */
  asset_comsat: icon(
    `<rect x="19" y="19" width="10" height="10"/>`,
    `<rect x="5" y="21" width="12" height="6"/>`,
    `<rect x="31" y="21" width="12" height="6"/>`,
    p('M24 29v5M18 38a6 6 0 0 0 12 0M24 19v-5'),
    dot(24, 12),
  ),
  /** Allied Basing Rights: a flag planted beside a hangar */
  asset_basing: icon(p('M14 42V8'), p('M14 8h18l-4 6 4 6H14'), p('M6 42h36'), p('M26 42v-6a6 6 0 0 1 12 0v6')),
  /** Strategic Reserve: stacked crates */
  asset_reserve: icon(
    `<rect x="8" y="26" width="14" height="14" rx="1.5"/>`,
    `<rect x="26" y="26" width="14" height="14" rx="1.5"/>`,
    `<rect x="17" y="12" width="14" height="14" rx="1.5"/>`,
  ),
  /** Rapid-Response Brigade: parachute */
  asset_rrb: icon(p('M8 22a16 16 0 0 1 32 0'), p('M8 22q8 4 16 0t16 0'), p('M8 22L24 40L40 22'), dot(24, 42, 2.5)),
  /** Signals Intercept: headphones over a waveform */
  asset_sigint: icon(
    p('M10 30v-4a14 14 0 0 1 28 0v4'),
    `<rect x="6" y="28" width="7" height="10" rx="2"/>`,
    `<rect x="35" y="28" width="7" height="10" rx="2"/>`,
    p('M17 32l2-4 3 8 3-8 2 4'),
  ),
  /** Civil Defence Programme: the triangle in the circle */
  asset_civil: icon(ring(24, 24, 16), p('M24 36L12 16h24z')),

  /** Fallback for unknown ids: a blank index card */
  generic: icon(`<rect x="10" y="6" width="28" height="36" rx="3"/>`, p('M16 14h10M16 20h16M16 26h12'), dot(32, 34)),
};

/** Look up a portrait by art id; unknown ids fall back to the private secretary. */
export function getPortrait(art: string): ArtEntry {
  return portraits[art] ?? portraits.aide;
}

/** Look up a piece icon by art id; unknown ids fall back to the generic card glyph. */
export function getIcon(art: string): ArtEntry {
  return icons[art] ?? icons.generic;
}

/** All portrait ids, in manifest order (handy for galleries and tests). */
export const portraitIds: readonly string[] = Object.keys(portraits);
/** All icon ids, in manifest order. */
export const iconIds: readonly string[] = Object.keys(icons);
