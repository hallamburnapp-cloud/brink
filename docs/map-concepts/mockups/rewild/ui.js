// REWILD — shared interface pieces.
window.RWUI = { raceBar(w = 342, h = 26) {
const nest = (svg, x, y) => svg.replace('<svg ', `<svg x="${x}" y="${y}" `);
const leaf = (x, y, a, f) => `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0C1.8-2.6 5.4-3.2 7.6-.9 5.6 1.6 2 1.6 0 0z" fill="${f}"/>`;
const VX = 108, AX = 250;
let leaves = '';
[[22,12,-28],[31,15,30],[41,11,-34],[50,15,26],[60,11,-30],[70,15.5,30],[80,11,-36],[89,15,24],[97,11,-30]].forEach(([x,y,a],i)=>{ leaves += leaf(x, y, a, i % 3 === 1 ? '#CDEFC2' : '#8FD694'); });
return `<svg width="${w}" height="${h}" viewBox="0 0 342 26" overflow="visible">
<defs>
 <clipPath id="trk"><rect width="342" height="26" rx="13"/></clipPath>
 <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4DAA6C"/><stop offset=".55" stop-color="#3E9B5F"/><stop offset="1" stop-color="#2F8552"/></linearGradient>
 <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#55575C"/><stop offset="1" stop-color="#3E4044"/></linearGradient>
 <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D3CBB9"/><stop offset=".5" stop-color="#DCD5C5"/><stop offset="1" stop-color="#E3DDCF"/></linearGradient>
 <radialGradient id="sgw"><stop offset=".55" stop-color="#8FD694" stop-opacity=".75"/><stop offset="1" stop-color="#8FD694" stop-opacity="0"/></radialGradient>
 <pattern id="grit" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="rgba(255,255,255,.12)"/><circle cx="4" cy="3.5" r=".45" fill="rgba(0,0,0,.18)"/><circle cx="2.5" cy="5" r=".35" fill="rgba(255,255,255,.08)"/></pattern>
</defs>
<rect width="342" height="26" rx="13" fill="url(#tg)"/>
<g clip-path="url(#trk)">
 <path d="M0 0H${VX-8}c4 2 7 4.5 5.4 8 3.6 1.6 4.4 4.6 1 6.6 1 3.6-2.6 6.8-7.4 11.4H0z" fill="url(#vg)"/>
 <path d="M0 0H${VX-8}c4 2 7 4.5 5.4 8" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
 <path d="M18 13.5c6-4.2 10 3.4 17-.6s9.6-4.2 15.4.2 9.4 4 15.6-.4 9.4-3.6 15.6.6 8.6 2.4 14-1.6" fill="none" stroke="#8FD694" stroke-width="1.5" stroke-linecap="round"/>
 ${leaves}
 <circle cx="56" cy="13.4" r="1.9" fill="#FFE9A8"/><circle cx="56" cy="13.4" r=".8" fill="#F2B33D"/>
 <circle cx="84" cy="13" r="1.6" fill="#FFE9A8"/>
 <path d="M${VX+1} 6.5c2.6-1 4.6.2 5 2.6-2.4.6-4.2-.2-5-2.6z" fill="#8FD694"/>
 <path d="M${VX+1} 18.5c2.4 1.2 4.2.4 4.8-1.8-2.2-.8-4 0-4.8 1.8z" fill="#3E9B5F"/>
 <path d="M${AX+4} 0H342V26H${AX+2}c-3-3.4 0-6-3-9.6 2.4-2.6-.6-5.4 2-8.4-1.6-3.4 1-5.6 3-8z" fill="url(#ag)"/>
 <path d="M${AX+4} 0H342V26H${AX+2}c-3-3.4 0-6-3-9.6 2.4-2.6-.6-5.4 2-8.4-1.6-3.4 1-5.6 3-8z" fill="url(#grit)"/>
 <path d="M296 13H316" stroke="#E8C547" stroke-width="1.6" stroke-dasharray="5 4" stroke-linecap="round"/>
 ${[257,266.5,276,285.5].map((x,i)=>`<path d="M${x+4} 8.6L${x} 13l${4} 4.4" fill="none" stroke="#E8C547" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" opacity="${1-i*0.12}"/>`).join('')}
</g>
<rect x=".5" y=".5" width="341" height="25" rx="12.5" fill="none" stroke="rgba(34,48,42,.13)"/>
<circle cx="13" cy="13" r="11" fill="#3E9B5F" stroke="#F4EFE4" stroke-width="1.6"/>
${nest(RWI.sprout('#fff', 15), 5.5, 5.2)}
<circle cx="329" cy="13" r="11" fill="#4A4C50" stroke="#F4EFE4" stroke-width="1.6"/>
${nest(RWI.lamp('#F4EFE4', 15), 321, 5.4)}
<circle cx="171" cy="13" r="22" fill="url(#sgw)"/>
<circle cx="171" cy="13" r="15" fill="#F4EBD3" stroke="#8FD694" stroke-width="2"/>
<circle cx="171" cy="13" r="15" fill="none" stroke="rgba(47,125,79,.25)" stroke-width=".8"/>
${nest(RWI.seed('#F2B33D', 20), 161, 3)}
</svg>`;
} };
