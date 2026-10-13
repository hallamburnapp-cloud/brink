// NEVERSPRING line icons (inline SVG strings).
(function () {
const arm = (len, br, sw) => `<line x1="0" y1="0" x2="0" y2="${-len}"/><polyline points="${-br},${-len * 0.82 + br * 0.2} 0,${-len * 0.6} ${br},${-len * 0.82 + br * 0.2}"/><polyline points="${-br * 0.7},${-len * 0.44} 0,${-len * 0.28} ${br * 0.7},${-len * 0.44}"/>`;
function snowflake(size, color, sw = 1.8, len = 10, br = 3.2) {
  let g = ''; for (let i = 0; i < 6; i++) g += `<g transform="rotate(${i * 60})">${arm(len, br, sw)}</g>`;
  return `<svg width="${size}" height="${size}" viewBox="-12 -12 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${g}</svg>`;
}
function flame(size, c1 = '#F2A23A', c2 = '#FFD27A') {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24"><defs><linearGradient id="fl${size}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
  <path d="M12 2.2c.6 3.4 3.1 5.2 4.6 7.4 1.2 1.8 1.9 3.6 1.9 5.4A6.5 6.5 0 0 1 12 21.6 6.5 6.5 0 0 1 5.5 15c0-2.6 1.3-4.6 2.9-6.2.2 1.8.9 3 2 3.6-.4-3.6.4-7 1.6-10.2z" fill="url(#fl${size})"/>
  <path d="M12 12.4c1.6 1.6 2.8 2.9 2.8 4.4a2.8 2.8 0 0 1-5.6 0c0-1.5 1.2-3 2.8-4.4z" fill="#FFF3D6"/></svg>`;
}
function split(size, cw = '#F2F7FB', ca = '#F2A23A') {
  // left half: a white snowflake; right half: an amber sun; a hairline between
  let arms = ''; for (const a of [180, 240, 300, 0]) arms += `<g transform="rotate(${a})"><line x1="0" y1="0" x2="0" y2="-8.6"/><polyline points="-2.3,-6.9 0,-5.1 2.3,-6.9"/></g>`;
  let rays = ''; for (const a of [22, 56, 90, 124, 158]) rays += `<g transform="rotate(${a})"><line x1="0" y1="-6.3" x2="0" y2="-9.2"/></g>`;
  return `<svg width="${size}" height="${size}" viewBox="-12 -12 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <defs><clipPath id="sl${size}"><rect x="-12" y="-12" width="11.3" height="24"/></clipPath><clipPath id="sr${size}"><rect x="0.9" y="-12" width="12" height="24"/></clipPath></defs>
  <g clip-path="url(#sl${size})" stroke="${cw}" stroke-width="1.7">${arms}<circle r="1.6" fill="${cw}" stroke="none"/></g>
  <g clip-path="url(#sr${size})"><circle r="4.4" fill="${ca}"/><g stroke="${ca}" stroke-width="1.7">${rays}</g></g>
  <line x1="0" y1="-10.5" x2="0" y2="10.5" stroke="#C9D6E2" stroke-width=".8" opacity=".7"/></svg>`;
}
function dial(size) {
  // white winter arc, gold summer arc, now-dot in the white
  const r = 8, c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="-10 -10 20 20"><circle r="${r}" fill="none" stroke="#1C3047" stroke-width="2.6"/>
  <circle r="${r}" fill="none" stroke="#F2F7FB" stroke-width="2.6" stroke-dasharray="${c * 0.6 - 1.6} ${c}" transform="rotate(-200)" stroke-linecap="round"/>
  <circle r="${r}" fill="none" stroke="#E9B44C" stroke-width="2.6" stroke-dasharray="${c * 0.4 - 1.6} ${c}" transform="rotate(16)" stroke-linecap="round"/>
  <circle cx="${(r * Math.sin(-0.35)).toFixed(2)}" cy="${(-r * Math.cos(-0.35)).toFixed(2)}" r="2.6" fill="#0B1622" stroke="#9CC9E8" stroke-width="1.4"/></svg>`;
}
const pause = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 12 12"><rect x="2.5" y="2" width="2.4" height="8" rx="1" fill="${c}"/><rect x="7.1" y="2" width="2.4" height="8" rx="1" fill="${c}"/></svg>`;
const radio = (s, c) => `<svg width="${s}" height="${s}" viewBox="-8 -8 16 16" fill="none" stroke="${c}" stroke-width="1.4" stroke-linecap="round"><circle r="1.7" fill="${c}" stroke="none"/><path d="M-3.6 -3.6a5.1 5.1 0 0 0 0 7.2M3.6 -3.6a5.1 5.1 0 0 1 0 7.2"/><path d="M-6 -6a8.5 8.5 0 0 0 0 12M6 -6a8.5 8.5 0 0 1 0 12" opacity=".7"/></svg>`;
const disc = (s, c) => `<svg width="${s}" height="${s}" viewBox="-12 -12 24 24" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M-10.5 -6v-4.5h4.5M6 -10.5h4.5v4.5M10.5 6v4.5h-4.5M-6 10.5h-4.5v-4.5"/><circle r="6"/><path d="M-6 0.5c2.2-1.6 4-1.4 5.6 0s3.6 1.6 6.2-0.2" opacity=".75"/><circle r="2.6" opacity=".5"/></svg>`;
const cloud = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 32 24"><path d="M9 20h15.5a5.5 5.5 0 0 0 .6-11A8 8 0 0 0 9.8 7.6 6.2 6.2 0 0 0 9 20z" fill="${c}"/><path d="M8 22.5l-1.6 1.6M14 22.5l-1.6 1.6M20 22.5l-1.6 1.6" stroke="${c}" stroke-width="1.4" stroke-linecap="round" opacity=".7"/></svg>`;
const share = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5"/><path d="M7 11H5.5v9.5h13V11H17"/></svg>`;
const play = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 12 12"><path d="M3 1.8l7 4.2-7 4.2z" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/></svg>`;
const eye = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 16 12" fill="none" stroke="${c}" stroke-width="1.3"><path d="M1 6c2-3.3 4.3-5 7-5s5 1.7 7 5c-2 3.3-4.3 5-7 5s-5-1.7-7-5z"/><circle cx="8" cy="6" r="2" fill="${c}"/></svg>`;
const statusBar = (time = '9:41') => `<div class="status"><span class="time">${time}</span><span class="sys">
  <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" fill="#fff"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="#fff"/><rect x="10" y="3" width="3" height="9" rx="1" fill="#fff"/><rect x="15" y="0" width="3" height="12" rx="1" fill="#fff"/></svg>
  <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.4-2.9a3.6 3.6 0 0 0-4.8 0z" fill="#fff"/><path d="M3.5 6.6a6.6 6.6 0 0 1 9 0l-1.3 1.6a4.6 4.6 0 0 0-6.4 0z" fill="#fff"/><path d="M1.2 3.9a10 10 0 0 1 13.6 0l-1.3 1.6a8 8 0 0 0-11 0z" fill="#fff"/></svg>
  <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="22.5" height="12" rx="3.6" fill="none" stroke="#fff" opacity=".4"/><rect x="2.3" y="2.3" width="17" height="8.4" rx="2" fill="#fff"/><path d="M24.6 4.4v4.2c.9-.3 1.4-1.1 1.4-2.1s-.5-1.8-1.4-2.1z" fill="#fff" opacity=".45"/></svg></span></div>`;
// crystal marks: hush (closed curve) and storm (zigzag)
const hush = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 12 12" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round"><path d="M2 7.5c1.3-1.6 2.7-1.6 4 0s2.7 1.6 4 0"/></svg>`;
const loud = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 12 12" fill="none" stroke="${c}" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 1.5L3.6 6.6h3.2L5 10.5"/></svg>`;
// the NEVERSPRING wordmark: letter-spaced serif capitals between two frost rules, a snowflake on each
function wordmark(size = 15, color = '#EAF2F8') {
  const flake = (x) => `<path transform="translate(${x},10)" d="M0 -5.2 L1.05 -1.05 L5.2 0 L1.05 1.05 L0 5.2 L-1.05 1.05 L-5.2 0 L-1.05 -1.05Z" fill="#BFE0F4"/>`;
  return `<svg width="260" height="20" viewBox="-130 0 260 20" fill="none">
  <line x1="-122" y1="10" x2="-104" y2="10" stroke="#9CC9E8" stroke-opacity=".45" stroke-width="1"/>${flake(-97)}
  <text x="0" y="15.2" text-anchor="middle" font-family="Newsreader" font-weight="600" font-size="${size}" letter-spacing="4.2" fill="${color}">NEVERSPRING</text>
  ${flake(97)}<line x1="104" y1="10" x2="122" y2="10" stroke="#9CC9E8" stroke-opacity=".45" stroke-width="1"/></svg>`;
}
window.NSI = { wordmark,  snowflake, flame, split, dial, pause, radio, disc, cloud, share, play, eye, statusBar, hush, loud };
})();
