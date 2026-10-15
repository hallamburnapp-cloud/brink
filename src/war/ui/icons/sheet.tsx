/**
 * The icon contact sheet: the ten staff objects, the coin and the glyphs, each at 34 px on the
 * rail's leather and at 96 px on linen and on dark felt. A development page only:
 * `npx vite --port 5203` then open /src/war/ui/icons/sheet.html.
 */
import { render, type JSX } from 'preact';
import { COLOUR_ORDER } from '../../content/map';
import { seatChip, STAFF, type StaffId } from '../../content/staff';
import { BlocGlyph, Coin, GLYPH_NAMES, Glyph, StaffIcon, type GlyphName } from './index';
import { SHEET_CSS } from './sheet-css';

declare global {
  interface Window {
    __ready?: boolean;
  }
}

const CHIP_GLYPHS: Readonly<Record<string, GlyphName>> = { '⚓': 'anchor', '★': 'star', '◆': 'diamond' };

/** A seat chip with the font-less characters swapped for glyphs, cyan for points, amber for multiplier. */
function Chip({ id }: { id: StaffId }): JSX.Element {
  const def = STAFF.find((s) => s.id === id)!;
  const text = seatChip(id, { gold: 12, oldHandM10: 14 });
  const parts = Array.from(text).map((ch, i) => {
    const g = CHIP_GLYPHS[ch];
    return g ? <Glyph key={i} name={g} size={8} /> : ch;
  });
  return <div class={`chip ${def.tone === 'points' ? 'p' : 'm'}`}>{parts}</div>;
}

function Rail({ ids }: { ids: readonly StaffId[] }): JSX.Element {
  return (
    <div class="rail">
      <div class="stitch" style={{ top: '2.5px' }} />
      <div class="stitch" style={{ top: '60.5px' }} />
      {ids.map((id, i) => (
        <div key={id} class="seat" style={{ left: `${17 + i * 73}px` }}>
          <div class="felt">
            <div class="no">{i + 1}</div>
            <div class="obj">
              <StaffIcon id={id} size={34} />
            </div>
            <Chip id={id} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Card(props: { small: JSX.Element; linen: JSX.Element; dark: JSX.Element; name: string; obj?: string; id: string }): JSX.Element {
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
        <span class="name">{props.name}</span>
        {props.obj ? <span class="obj">{props.obj}</span> : null}
        <span class="id">{props.id}</span>
      </div>
    </div>
  );
}

const GLYPH_LABEL: Readonly<Record<GlyphName, string>> = {
  swap: 'Swap',
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
  diamond: 'Coins',
  anchor: 'Port',
  star: 'Capital',
  arrow: 'Arrow',
};

const TEXT_GLYPHS: ReadonlySet<GlyphName> = new Set(['diamond', 'anchor', 'star', 'arrow']);

function GlyphCell({ name }: { name: GlyphName }): JSX.Element {
  const text = TEXT_GLYPHS.has(name);
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
        <span>{GLYPH_LABEL[name]}</span>
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
          <h1>STAFF AND MARKS</h1>
          <p>
            Every staff member is the object they keep. One lamp, top left; one ink outline; three flat tones a material; one
            highlight. Hand-drawn inline SVG, no text inside any icon.
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
          On the rail <span>34 px, felt seats, seat chips: cyan adds points, amber adds multiplier</span>
        </h2>
        <div class="rails">
          <Rail ids={ids.slice(0, 5)} />
          <Rail ids={ids.slice(5, 10)} />
        </div>
      </section>

      <section class="panel">
        <h2>
          The ten staff <span>34 on leather · 96 on linen · 96 on felt</span>
        </h2>
        <div class="grid">
          {STAFF.map((s) => (
            <Card
              key={s.id}
              small={<StaffIcon id={s.id} size={34} />}
              linen={<StaffIcon id={s.id} size={96} />}
              dark={<StaffIcon id={s.id} size={96} />}
              name={s.name}
              obj={s.object}
              id={s.id}
            />
          ))}
          <Card small={<Coin size={34} />} linen={<Coin size={96} />} dark={<Coin size={96} />} name="Coin" obj="brass coin" id="Coin" />
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
          Glyphs <span>console · paper · brass, in the colour of the text they sit in</span>
        </h2>
        <div class="glyphs">
          {GLYPH_NAMES.map((n) => (
            <GlyphCell key={n} name={n} />
          ))}
        </div>
        <div class="inline">
          <span class="tag">
            <Glyph name="diamond" size={14} />6
          </span>
          <span class="pill p">+20</span>
          <span class="pill m">
            ×2
            <Glyph name="star" size={12} />
          </span>
          <span class="pill m">
            ×1.5
            <Glyph name="anchor" size={13} />
          </span>
          <span class="btn">
            NEXT TURN
            <Glyph name="arrow" size={13} />
          </span>
          <span class="ghost">
            REROLL
            <Glyph name="diamond" size={13} color="#F7E0A3" />
            <span style={{ fontFamily: 'var(--font-num)', fontWeight: 800, color: '#F7E0A3', letterSpacing: 0 }}>2</span>
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
        <span>StaffIcon · Coin · Glyph · BlocGlyph</span>
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
