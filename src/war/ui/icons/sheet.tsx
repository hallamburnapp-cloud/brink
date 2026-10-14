/**
 * The icon contact sheet: every staff object, Order, paper good, the coin and the glyphs, each at
 * 34 px on the rail's leather and at 96 px on linen and on dark felt. A development page only:
 * `npx vite --port 5203` then open /src/war/ui/icons/sheet.html. The exported static copy lives at
 * docs/war/art/icons-sheet.html.
 */
import { render, type JSX } from 'preact';
import { COLOUR_ORDER } from '../../content/map';
import { ORDERS, type OrderId } from '../../content/orders';
import { PATTERNS } from '../../content/patterns';
import { STAFF, type Rarity, type StaffId } from '../../content/staff';
import { BlocGlyph, Coin, GLYPH_NAMES, Glyph, OrderIcon, PaperIcon, StaffIcon, type GlyphName, type PaperKind } from './index';
import { SHEET_CSS } from './sheet-css';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const RIM: Readonly<Record<Rarity, string>> = {
  common: '#8A8F98',
  uncommon: '#C9A35B',
  rare: '#9DB8D9',
  legendary: '#F2C94C',
};

/** What each seat chip feeds, for its colour (STYLE 5.5). */
const FEEDS: Partial<Record<StaffId, 'i' | 'm' | 'f'>> = {
  DUTY: 'm',
  QM: 'i',
  HARBOUR: 'i',
  SURVEYOR: 'i',
  HOTLINE: 'm',
  GOVERNOR: 'm',
  TREASURER: 'f',
  OLDHAND: 'i',
  RAILCLERK: 'i',
  MEDIATOR: 'm',
  STRATEGIST: 'm',
  ENVOY: 'm',
  ADMIRAL: 'm',
  CHIEF: 'm',
  SOVEREIGN: 'm',
};

const CHIP_GLYPHS: Readonly<Record<string, GlyphName>> = { '⚓': 'anchor', '★': 'star', '◆': 'diamond', '≤': 'atMost' };

/** A seat chip with the font-less characters swapped for glyphs. */
function Chip({ text, feeds }: { text: string; feeds: string }): JSX.Element {
  const parts = Array.from(text).map((ch, i) => {
    const g = CHIP_GLYPHS[ch];
    return g ? <Glyph key={i} name={g} size={8} /> : ch;
  });
  return <div class={`chip ${feeds}`}>{parts}</div>;
}

function Rail({ ids, first }: { ids: readonly StaffId[]; first: number }): JSX.Element {
  return (
    <div class="rail">
      <div class="stitch" style={{ top: '2.5px' }} />
      <div class="stitch" style={{ top: '60.5px' }} />
      {ids.map((id, i) => {
        const def = STAFF.find((s) => s.id === id)!;
        return (
          <div key={id} class={`seat ${def.rarity}`} style={{ left: `${17 + i * 73}px` }}>
            <div class="felt">
              <div class="no">{first + i}</div>
              <div class="obj">
                <StaffIcon id={id} size={34} />
              </div>
              <Chip text={id === 'OLDHAND' ? '+35I' : def.chip} feeds={FEEDS[id] ?? 'k'} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card(props: { small: JSX.Element; linen: JSX.Element; dark: JSX.Element; name: string; obj?: string; id: string; rim?: string }): JSX.Element {
  return (
    <div class="card">
      <div class="tiles">
        <div class="tile rail-c">
          {props.small}
          <span class="px">34</span>
        </div>
        <div class="tile linen">
          {props.linen}
          <span class="px">96</span>
        </div>
        <div class="tile dark big">
          {props.dark}
          <span class="px">96</span>
        </div>
      </div>
      <div class="cap">
        {props.rim ? <span class="rar" style={{ background: props.rim }} /> : null}
        <span class="name">{props.name}</span>
        {props.obj ? <span class="obj">{props.obj}</span> : null}
        <span class="id">{props.id}</span>
      </div>
    </div>
  );
}

/** What each stamp shows (orders.ts `mark` describes the map mark, not the stamp). */
const STAMP_LABEL: Readonly<Record<OrderId, string>> = {
  FORTIFY: 'star fort, hatched walls',
  RELAY: 'double ring',
  ECHO: 'two pin heads',
  CABLE: 'arc, two terminals',
  DEFECT: 'ink drop',
  PROMOTE: 'star in a ring',
  RETIRE: 'roller shutter',
  AIRLIFT: 'winged pin',
};

const PAPERS: ReadonlyArray<{ kind: PaperKind; name: string; obj: string }> = [
  { kind: 'PLAYBOOK', name: 'Playbook', obj: 'field manual, +1 Lv' },
  { kind: 'RECRUIT', name: 'Recruit Folder', obj: 'kraft, staff cards' },
  { kind: 'ORDERS', name: 'Orders Folder', obj: 'kraft, red tape' },
];

const GLYPH_LABEL: Readonly<Record<GlyphName, string>> = {
  swap: 'Swap',
  sweep: 'Sweep',
  lamp: 'Lamp',
  speed: 'Speed',
  info: 'Info',
  close: 'Close',
  settings: 'Settings',
  home: 'Home',
  soundOn: 'Sound on',
  soundOff: 'Sound off',
  sell: 'Sell tag',
  lock: 'Lock',
  reroll: 'Reroll',
  check: 'Check',
  back: 'Back',
  diamond: 'Funds ◆',
  anchor: 'Port ⚓',
  star: 'Capital ★',
  arrow: 'Arrow →',
  atMost: 'At most ≤',
};

function GlyphCell({ name }: { name: GlyphName }): JSX.Element {
  const text = name === 'diamond' || name === 'anchor' || name === 'star' || name === 'arrow' || name === 'atMost';
  return (
    <div class="g">
      <div class="on">
        <div class="c1">
          <Glyph name={name} size={text ? 12 : 16} />
          <Glyph name={name} size={text ? 18 : 24} />
        </div>
        <div class="c2">
          <Glyph name={name} size={text ? 18 : 24} />
        </div>
        <div class="c3">
          <Glyph name={name} size={text ? 18 : 24} />
        </div>
      </div>
      <div class="lbl">
        <span>{GLYPH_LABEL[name].replace(/ [◆⚓★→≤]$/, '')}</span>
        <i>{name}</i>
      </div>
    </div>
  );
}

function Sheet(): JSX.Element {
  const ids = STAFF.map((s) => s.id);
  return (
    <div class="page">
      <header class="masthead">
        <div>
          <h1>STAFF, ORDERS AND MARKS</h1>
          <p>
            Every staff member is the object they keep. Orders are rubber stamps on typed linen. One lamp, top left; one ink
            outline; three flat tones a material; one highlight. Hand-drawn inline SVG, no text inside any icon.
          </p>
        </div>
        <div class="rules">
          <span>
            <b>64</b> canvas
          </span>
          <span>
            <b>2.25</b> ink
          </span>
          <span>
            <b>3</b> tones
          </span>
          <span>
            <b>1</b> highlight
          </span>
        </div>
      </header>

      <section class="panel">
        <h2>
          On the rail <span>34 px, felt seats, rarity rims, seat chips</span>
        </h2>
        <div class="rails">
          <Rail ids={ids.slice(0, 5)} first={1} />
          <Rail ids={ids.slice(5, 10)} first={1} />
          <Rail ids={ids.slice(10, 15)} first={1} />
          <Rail ids={ids.slice(15, 20)} first={1} />
          <Rail ids={['DUTY', 'HOTLINE', 'HARBOUR', 'STRATEGIST', 'SOVEREIGN']} first={1} />
          <Rail ids={['QM', 'COURIER', 'ENVOY', 'TREASURER', 'DEPUTY']} first={1} />
        </div>
      </section>

      <section class="panel">
        <h2>
          The twenty staff <span>34 on leather · 96 on linen · 96 on felt</span>
        </h2>
        <div class="grid">
          {STAFF.map((s) => (
            <Card
              key={s.id}
              small={<StaffIcon id={s.id} size={34} />}
              linen={<StaffIcon id={s.id} size={96} />}
              dark={<StaffIcon id={s.id} size={96} />}
              name={s.name.replace(/^The /, '')}
              obj={s.object}
              id={s.id}
              rim={RIM[s.rarity]}
            />
          ))}
        </div>
      </section>

      <section class="panel">
        <h2>
          Silhouettes <span>every object in black at 20 px: if it cannot be named, it is redrawn</span>
        </h2>
        <div class="sil">
          {STAFF.map((s) => (
            <div key={s.id} class="s">
              <StaffIcon id={s.id} size={20} />
              <span>{s.object.replace(/^ship's /, '')}</span>
            </div>
          ))}
        </div>
      </section>

      <section class="panel">
        <h2>
          The eight Orders <span>slip at 34 · stamp at 96 on linen · slip at 96 on felt</span>
        </h2>
        <div class="grid">
          {ORDERS.map((o) => (
            <Card
              key={o.id}
              small={<OrderIcon id={o.id} size={34} />}
              linen={<OrderIcon id={o.id} size={96} variant="stamp" />}
              dark={<OrderIcon id={o.id} size={96} />}
              name={o.name}
              obj={STAMP_LABEL[o.id]}
              id={o.id}
            />
          ))}
        </div>
      </section>

      <section class="panel">
        <h2>
          Papers and Funds <span>the Briefing's goods and the currency mark</span>
        </h2>
        <div class="grid">
          {PAPERS.map((p) => (
            <Card
              key={p.kind}
              small={<PaperIcon kind={p.kind} size={34} />}
              linen={<PaperIcon kind={p.kind} size={96} />}
              dark={<PaperIcon kind={p.kind} size={96} />}
              name={p.name}
              obj={p.obj}
              id={p.kind}
            />
          ))}
          <Card small={<Coin size={34} />} linen={<Coin size={96} />} dark={<Coin size={96} />} name="Funds" obj="brass coin" id="Coin" />
        </div>
        <h2 style={{ marginTop: '28px' }}>
          Playbook covers <span>the cover diagram is the pattern it levels</span>
        </h2>
        <div class="books">
          {PATTERNS.map((p) => (
            <div key={p.id} class="book">
              <PaperIcon kind="PLAYBOOK" pattern={p.id} size={72} />
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section class="panel">
        <h2>
          Glyphs <span>console · paper · brass, in the colour of the text they sit in</span>
        </h2>
        <div class="glyphs">
          {GLYPH_NAMES.map((n) => (
            <GlyphCell key={n} name={n} />
          ))}
        </div>
        <div class="inline">
          <span class="tag">
            <Glyph name="diamond" size={14} />8
          </span>
          <span class="pill i">
            +15
            <Glyph name="anchor" size={13} />
          </span>
          <span class="pill m">
            ×2
            <Glyph name="star" size={12} />
          </span>
          <span class="pill i">
            +15
            <Glyph name="atMost" size={12} />4
          </span>
          <span class="btn">
            NEXT CRISIS
            <Glyph name="arrow" size={13} />
          </span>
          <span class="ghost">
            REROLL
            <Glyph name="diamond" size={13} color="#F7E0A3" />
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: '#F7E0A3', letterSpacing: 0 }}>4</span>
          </span>
          <span class="ghost">
            <Glyph name="sell" size={18} color="#F7E0A3" />
            SELL
            <Glyph name="diamond" size={13} color="#F7E0A3" />
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: '#F7E0A3', letterSpacing: 0 }}>3</span>
          </span>
          <span class="blocs">
            {COLOUR_ORDER.map((c) => (
              <BlocGlyph key={c} colour={c} size={14} />
            ))}
          </span>
        </div>
      </section>
      <footer>
        <span>src/war/ui/icons</span>
        <span>StaffIcon · OrderIcon · PaperIcon · Coin · Glyph · BlocGlyph</span>
      </footer>
    </div>
  );
}

function boot(): void {
  const style = document.createElement('style');
  style.id = 'sheet-css';
  style.textContent = SHEET_CSS;
  document.head.append(style);
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.id = 'fonts';
  fonts.href = `${import.meta.env.BASE_URL}war/fonts/fonts.css`;
  const loaded = new Promise<void>((resolve) => {
    fonts.onload = () => resolve();
    fonts.onerror = () => resolve();
  });
  document.head.append(fonts);
  render(<Sheet />, document.getElementById('sheet')!);
  void loaded
    .then(() => document.fonts.ready)
    .then(() => {
      window.__ready = true;
    });
}

boot();
