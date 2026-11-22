// Original diagrams for Max's notes (drawn here, no copied pictures). Each is an SVG string; keys are used as
// <figure class="note-diagram" data-diagram="KEY"> in the .md notes (written as ![[diagram:KEY|caption]]).
const T = "#e6e7f2", L = "#aab0d0", A = "#7aa2ff", G = "#3ddc84", R = "#ff6b6b", Y = "#ffd166", BG = "#12131f";
const svg = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" font-family="system-ui,Arial,sans-serif" font-size="11" fill="${T}">${inner}</svg>`;
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" fill="${o.c || T}" text-anchor="${o.a || "start"}" font-size="${o.s || 11}"${o.b ? ' font-weight="700"' : ""}>${s}</text>`;
const line = (x1, y1, x2, y2, c = L, w = 1.5, d = "") => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}"${d ? ` stroke-dasharray="${d}"` : ""}/>`;
const arrow = (x1, y1, x2, y2, c = L) => line(x1, y1, x2, y2, c, 1.4) + `<circle cx="${x2}" cy="${y2}" r="2.6" fill="${c}"/>`;
// sector (pie slice) centered cx,cy radius r from angle a0 to a1 (degrees, 0 = up/ahead, clockwise)
const rad = d => (d - 90) * Math.PI / 180;
const sector = (cx, cy, r, a0, a1, fill, op = 0.35, stroke = fill) => {
  const x0 = cx + r * Math.cos(rad(a0)), y0 = cy + r * Math.sin(rad(a0)), x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `<path d="M${cx},${cy} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${large} 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z" fill="${fill}" fill-opacity="${op}" stroke="${stroke}" stroke-width="1.2"/>`;
};
const hull = (cx, cy, s = 1) => `<path d="M${cx},${cy - 38 * s} C${cx + 14 * s},${cy - 22 * s} ${cx + 14 * s},${cy + 20 * s} ${cx + 10 * s},${cy + 38 * s} L${cx - 10 * s},${cy + 38 * s} C${cx - 14 * s},${cy + 20 * s} ${cx - 14 * s},${cy - 22 * s} ${cx},${cy - 38 * s} Z" fill="#2a2d4a" stroke="${T}" stroke-width="1.3"/>`;

export const DIAGRAMS = {};
const frame = (w, h) => `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="8" fill="${BG}" stroke="#3a3c52"/>`;
const ship = (x, y, rot, col = T, k = 0.55) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${k})"><path d="M0,-38 C14,-22 14,20 10,38 L-10,38 C-14,20 -14,-22 0,-38 Z" fill="#2a2d4a" stroke="${col}" stroke-width="2"/></g>`;

// 1. Load line mark (Load Lines 1966, Annex I Regs 4-7)
{
  let s = frame(400, 300);
  s += txt(200, 24, "Load line mark (not to scale)", { a: "middle", b: true, s: 12 });
  s += `<rect x="40" y="44" width="64" height="5" fill="${T}"/>` + txt(112, 51, "Deck line 300 × 25 mm", { s: 10 });
  s += line(24, 47, 24, 140, Y, 1.2) + `<path d="M24,47 l-4,8 h8z M24,140 l-4,-8 h8z" fill="${Y}"/>` + txt(36, 100, "Freeboard", { c: Y, s: 9 });
  s += `<circle cx="72" cy="140" r="30" fill="none" stroke="${T}" stroke-width="5"/><rect x="36" y="137.5" width="72" height="5" fill="${T}"/>`;
  s += txt(72, 190, "Ring Ø 300 mm × 25 mm", { a: "middle", s: 10 }) + txt(72, 204, "Line 450 mm × 25 mm", { a: "middle", s: 10 });
  s += `<rect x="188" y="62" width="4" height="150" fill="${T}"/>`;
  s += arrow(72, 226, 190, 226, A) + txt(131, 221, "540 mm", { a: "middle", c: A, s: 10 });
  s += txt(190, 244, "Vertical line 25 mm wide, 540 mm forward of ring centre", { a: "middle", s: 9.5, c: L });
  for (const [k, y, n] of [["T", 86, "Tropical"], ["S", 140, "Summer"], ["W", 166, "Winter"], ["WNA", 190, "Winter North Atlantic"]]) {
    s += `<rect x="192" y="${y - 2.5}" width="46" height="5" fill="${T}"/>` + txt(244, y + 4, `<tspan font-weight="700">${k}</tspan>  ${n}`, { s: 10.5 });
  }
  for (const [k, y] of [["TF", 72], ["F", 112]]) {
    s += `<rect x="144" y="${y - 2.5}" width="44" height="5" fill="${T}"/>` + txt(138, y + 4, k, { a: "end", s: 10.5, b: true });
  }
  s += txt(244, 62, "Lines 230 mm × 25 mm", { s: 9.5, c: L });
  s += txt(200, 264, "F = fresh water · TF = tropical fresh water (abaft the vertical line)", { a: "middle", s: 9.5, c: L });
  s += txt(200, 280, "Assigning authority: up to 4 letters beside the ring, 115 × 75 mm", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["load-line-mark"] = svg(400, 300, s);
}

// 2. COLREG light arcs (Rule 21)
{
  let s = frame(400, 290);
  const cx = 200, cy = 158;
  s += txt(cx, 26, "Masthead light: white, 225°", { a: "middle", s: 11, b: true });
  s += txt(cx, 40, "from right ahead to 22.5° abaft the beam on each side", { a: "middle", s: 9.5, c: L });
  s += sector(cx, cy, 104, -112.5, 112.5, "#ffffff", 0.12, "#ffffff");
  s += sector(cx, cy, 84, 0, 112.5, G, 0.4);
  s += sector(cx, cy, 84, -112.5, 0, R, 0.4);
  s += sector(cx, cy, 66, 112.5, 247.5, "#ffffff", 0.28, "#ffffff");
  s += ship(cx, cy, 0, T, 1.1);
  s += txt(cx + 106, cy - 40, "Starboard: green", { c: G, s: 10.5 }) + txt(cx + 106, cy - 27, "112.5°", { c: G, s: 10.5 });
  s += txt(cx - 112, cy - 40, "Port: red", { a: "end", c: R, s: 10.5 }) + txt(cx - 112, cy - 27, "112.5°", { a: "end", c: R, s: 10.5 });
  s += txt(cx, 248, "Sternlight: white, 135°", { a: "middle", s: 11, b: true }) + txt(cx, 262, "67.5° each side from right aft", { a: "middle", s: 9.5, c: L });
  s += txt(cx, 278, "Towing light: yellow, same arc as the sternlight · all-round light: 360°", { a: "middle", s: 9, c: L });
  DIAGRAMS["colreg-light-arcs"] = svg(400, 290, s);
}

// 3. COLREG situations (Rules 13, 14, 15)
{
  let s = frame(400, 270);
  // panel 1 overtaking (centre x=66)
  s += txt(66, 24, "Rule 13", { a: "middle", b: true, s: 11 }) + txt(66, 38, "Overtaking", { a: "middle", b: true, s: 11 });
  s += sector(66, 100, 100, 112.5, 247.5, Y, 0.16, Y);
  s += ship(66, 100, 0, T, 0.75);
  s += ship(66, 195, 0, A, 0.6) + arrow(66, 165, 66, 150, A);
  s += txt(66, 236, "Overtaking vessel keeps clear", { a: "middle", s: 8.5, c: A }) + txt(66, 248, "Sector: more than 22.5°", { a: "middle", s: 8.5, c: Y }) + txt(66, 260, "abaft the beam", { a: "middle", s: 8.5, c: Y });
  // panel 2 head-on (centre x=200)
  s += txt(200, 24, "Rule 14", { a: "middle", b: true, s: 11 }) + txt(200, 38, "Head-on", { a: "middle", b: true, s: 11 });
  s += ship(200, 175, 0, T, 0.7) + ship(200, 85, 180, T, 0.7);
  s += arrow(200, 150, 226, 136, G) + arrow(200, 110, 174, 124, G);
  s += txt(200, 236, "Both alter course to starboard", { a: "middle", s: 8.5, c: G }) + txt(200, 248, "and pass port to port", { a: "middle", s: 8.5, c: G });
  // panel 3 crossing (centre x=334)
  s += txt(334, 24, "Rule 15", { a: "middle", b: true, s: 11 }) + txt(334, 38, "Crossing", { a: "middle", b: true, s: 11 });
  s += ship(310, 170, 0, A, 0.7) + ship(364, 100, 270, T, 0.7) + arrow(338, 100, 326, 100, L);
  s += txt(310, 208, "Give-way", { a: "middle", s: 8.5, c: A }) + txt(366, 78, "Stand-on", { a: "middle", s: 8.5, c: L });
  s += txt(334, 236, "Vessel with the other on her", { a: "middle", s: 8.5, c: A }) + txt(334, 248, "starboard side gives way and", { a: "middle", s: 8.5, c: A }) + txt(334, 260, "avoids crossing ahead", { a: "middle", s: 8.5, c: A });
  DIAGRAMS["colreg-situations"] = svg(400, 270, s);
}

// 4. BWM exchange distances (Reg B-4)
{
  let s = frame(400, 220);
  s += `<rect x="4" y="4" width="64" height="212" rx="8" fill="#3a3326"/>` + txt(36, 112, "LAND", { a: "middle", s: 10, c: Y });
  s += `<rect x="68" y="4" width="328" height="212" fill="#16304a" fill-opacity="0.55"/>`;
  s += txt(234, 24, "Ballast water exchange (D-1), Reg B-4", { a: "middle", b: true, s: 11.5 });
  s += line(134, 62, 134, 150, A, 1.6, "5 4") + txt(134, 44, "≥ 50 nm and ≥ 200 m deep", { a: "middle", s: 9.5, c: A }) + txt(134, 56, "if 200 nm is not possible", { a: "middle", s: 9, c: L });
  s += line(300, 62, 300, 150, G, 1.8, "5 4") + txt(300, 44, "≥ 200 nm and ≥ 200 m deep", { a: "middle", s: 9.5, c: G }) + txt(300, 56, "from the nearest land", { a: "middle", s: 9, c: L });
  s += arrow(68, 160, 134, 160, A) + txt(101, 155, "50 nm", { a: "middle", s: 9.5, c: A });
  s += arrow(68, 182, 300, 182, G) + txt(184, 177, "200 nm", { a: "middle", s: 9.5, c: G });
  s += txt(234, 206, "D-1 standard: at least 95% volumetric exchange", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["bwm-exchange-distance"] = svg(400, 220, s);
}

// 5. CLC / Fund / Supplementary Fund tiers
{
  let s = frame(400, 220);
  s += txt(200, 26, "Maximum compensation per incident (million SDR)", { a: "middle", b: true, s: 11.5 });
  const sc = 340 / 750, x0 = 24;
  const row = (y, v, col, label, val, inside) => txt(x0, y, label, { s: 10, c: L }) + `<rect x="${x0}" y="${y + 6}" width="${(v * sc).toFixed(1)}" height="24" rx="3" fill="${col}" fill-opacity="0.9"/>` + (inside ? txt(x0 + v * sc - 8, y + 23, val, { a: "end", s: 11, b: true, c: "#10111c" }) : txt(x0 + v * sc + 8, y + 23, val, { s: 11, b: true }));
  s += row(50, 89.77, A, "Tier 1: CLC 1992 (shipowner, maximum)", "89.77");
  s += row(96, 203, G, "Tier 2: CLC + Fund 1992 (total)", "203");
  s += row(142, 750, Y, "Tier 3: + Supplementary Fund 2003 (total)", "750", true);
  s += txt(200, 190, "CLC owner limit: 4.51 million SDR up to 5,000 GT,", { a: "middle", s: 9.5, c: L });
  s += txt(200, 204, "+ 631 SDR per extra GT, up to the 89.77 million maximum", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["clc-fund-tiers"] = svg(400, 220, s);
}

// 6. Hong Kong Convention flow
{
  let s = frame(400, 270);
  const box = (y, t1, t2, col) => `<rect x="20" y="${y}" width="360" height="46" rx="6" fill="#1b1d33" stroke="${col}" stroke-width="1.5"/>` + txt(32, y + 19, t1, { b: true, s: 11 }) + txt(32, y + 35, t2, { s: 9.5, c: L });
  s += txt(200, 24, "Ship recycling under the Hong Kong Convention", { a: "middle", b: true, s: 11.5 });
  s += box(36, "1  In service: IHM Part I kept up to date", "Initial survey → IHM certificate (≤ 5 years); renewal survey ≤ 5 years", A);
  s += arrow(200, 82, 200, 98, L);
  s += box(98, "2  Going to recycling: IHM Parts II and III added", "Authorized yard (DASR ≤ 5 years) prepares the Ship Recycling Plan", Y);
  s += arrow(200, 144, 200, 160, L);
  s += box(160, "3  Final survey", "IHM, Ship Recycling Plan and yard authorization checked", G);
  s += arrow(200, 206, 200, 220, L);
  s += `<rect x="20" y="220" width="360" height="36" rx="6" fill="#1b1d33" stroke="${R}" stroke-width="1.5"/>` + txt(32, 242, "4  Ready for Recycling Certificate (≤ 3 months)", { b: true, s: 11 });
  DIAGRAMS["hkc-flow"] = svg(400, 270, s);
}

// 7. Nairobi WRC convention area
{
  let s = frame(400, 220);
  s += `<rect x="4" y="4" width="60" height="212" rx="8" fill="#3a3326"/>` + txt(34, 112, "COAST", { a: "middle", s: 10, c: Y });
  s += `<rect x="64" y="4" width="96" height="212" fill="#1f4a6e" fill-opacity="0.6"/>` + txt(112, 26, "Territory and", { a: "middle", s: 9.5 }) + txt(112, 38, "territorial sea", { a: "middle", s: 9.5 });
  s += `<rect x="160" y="4" width="236" height="212" fill="#16304a" fill-opacity="0.55"/>`;
  s += txt(278, 26, "Exclusive economic zone", { a: "middle", b: true, s: 11 }) + txt(278, 40, "= Convention area", { a: "middle", s: 10, c: G });
  s += txt(112, 64, "Only if the State", { a: "middle", s: 9, c: Y }) + txt(112, 76, "opts in (Art 3(2));", { a: "middle", s: 9, c: Y }) + txt(112, 88, "then Arts 7–9 apply", { a: "middle", s: 9, c: Y });
  s += `<path d="M236,98 L300,106 L296,124 L232,118 Z" fill="#2a2d4a" stroke="${T}" stroke-width="1.6" transform="rotate(14 266 112)"/>`;
  s += txt(266, 146, "Wreck: owner must locate, mark", { a: "middle", s: 9.5 }) + txt(266, 158, "and remove it (strict liability)", { a: "middle", s: 9.5 });
  s += arrow(64, 186, 380, 186, G) + txt(222, 180, "up to 200 nm from the baselines if no EEZ is declared", { a: "middle", s: 9.5, c: G });
  s += txt(222, 206, "Convention area (Art 1)", { a: "middle", s: 9, c: L });
  DIAGRAMS["wrc-convention-area"] = svg(400, 220, s);
}
