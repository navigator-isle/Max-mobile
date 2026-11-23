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

// 8. Athens 2002 liability tiers for death and personal injury (Arts 3, 4bis, 7)
{
  let s = frame(400, 250);
  s += txt(200, 26, "Death / injury: per passenger, per occasion", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "(shipping incident, SDR)", { a: "middle", s: 9.5, c: L });
  const x0 = 60, W = 280, sc = W / 400; // 400,000 SDR = full width
  s += `<rect x="${x0}" y="64" width="${250 * sc}" height="40" fill="${G}" fill-opacity="0.35" stroke="${G}"/>`;
  s += `<rect x="${x0 + 250 * sc}" y="64" width="${150 * sc}" height="40" fill="${Y}" fill-opacity="0.35" stroke="${Y}"/>`;
  s += txt(x0 + 125 * sc, 88, "Strict liability", { a: "middle", s: 10.5, b: true });
  s += txt(x0 + 325 * sc, 88, "Fault presumed", { a: "middle", s: 9.5, b: true });
  s += txt(x0, 122, "0", { a: "middle", s: 10, c: L });
  s += txt(x0 + 250 * sc, 122, "250,000", { a: "middle", s: 10, c: G });
  s += txt(x0 + 400 * sc, 122, "400,000", { a: "middle", s: 10, c: Y });
  s += txt(200, 146, "Up to 250,000: carrier liable without proof of fault", { a: "middle", s: 10, c: G });
  s += txt(200, 160, "(defences: war, hostilities, exceptional natural phenomenon, third-party intent)", { a: "middle", s: 9, c: L });
  s += txt(200, 178, "250,000 to 400,000: carrier liable unless it proves no fault", { a: "middle", s: 10, c: Y });
  s += txt(200, 196, "Insurance (Art 4bis): at least 250,000 per passenger", { a: "middle", s: 10, c: A });
  s += txt(200, 210, "Ships registered in a Party, licensed for more than 12 passengers", { a: "middle", s: 9, c: L });
  s += txt(200, 232, "Time bar: 2 years · outer limit 5 years · direct action against insurer", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["athens-liability"] = svg(400, 250, s);
}

// 9. HNS 2010 two tiers (compensation limits, SDR)
{
  let s = frame(400, 230);
  s += txt(200, 26, "HNS 2010: two tiers of compensation", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "(per incident, million SDR)", { a: "middle", s: 9.5, c: L });
  const x0 = 70, sc = 260 / 250;
  s += `<rect x="${x0}" y="60" width="${100 * sc}" height="34" fill="${A}" fill-opacity="0.4" stroke="${A}"/>`;
  s += `<rect x="${x0}" y="98" width="${115 * sc}" height="34" fill="${A}" fill-opacity="0.25" stroke="${A}"/>`;
  s += `<rect x="${x0}" y="146" width="${250 * sc}" height="34" fill="${G}" fill-opacity="0.35" stroke="${G}"/>`;
  s += txt(x0 + 100 * sc + 6, 82, "Tier 1 shipowner: bulk, max 100", { s: 9.5 });
  s += txt(x0 + 115 * sc + 6, 120, "Tier 1 shipowner: packaged, max 115", { s: 9.5 });
  s += txt(x0 + 6, 168, "Total with Tier 2 (HNS Fund): max 250", { s: 10, b: true });
  s += txt(200, 204, "The 250 includes what the shipowner pays (Art 14(5)(a))", { a: "middle", s: 9.5, c: L });
  s += txt(200, 218, "In force 29 Nov 2027", { a: "middle", s: 9.5, c: Y });
  DIAGRAMS["hns-tiers"] = svg(400, 230, s);
}

// 10. LLMC limits per ton, general claims (1996 Protocol vs 2012)
{
  let s = frame(400, 250);
  s += txt(200, 26, "LLMC: added limit per ton, other (property) claims", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "SDR per ton on top of the base amount", { a: "middle", s: 9.5, c: L });
  const rows = [["2,001–30,000 GT", 400, 604], ["30,001–70,000 GT", 300, 453], ["Over 70,000 GT", 200, 302]];
  const x0 = 130, sc = 240 / 604;
  rows.forEach(([n, a, b], i) => {
    const y = 62 + i * 52;
    s += txt(x0 - 6, y + 22, n, { a: "end", s: 9.5 });
    s += `<rect x="${x0}" y="${y}" width="${a * sc}" height="18" fill="${L}" fill-opacity="0.4" stroke="${L}"/>` + txt(x0 + a * sc + 4, y + 13, `${a}`, { s: 9.5, c: L });
    s += `<rect x="${x0}" y="${y + 22}" width="${b * sc}" height="18" fill="${G}" fill-opacity="0.4" stroke="${G}"/>` + txt(x0 + b * sc + 4, y + 35, `${b}`, { s: 9.5, c: G });
  });
  s += `<rect x="130" y="224" width="10" height="10" fill="${L}" fill-opacity="0.4" stroke="${L}"/>` + txt(144, 233, "1996 Protocol", { s: 9.5 });
  s += `<rect x="236" y="224" width="10" height="10" fill="${G}" fill-opacity="0.4" stroke="${G}"/>` + txt(250, 233, "2012 (in force 8 Jun 2015)", { s: 9.5 });
  DIAGRAMS["llmc-per-ton"] = svg(400, 250, s);
}

// 11. Cape Town Agreement: length vs gross tonnage thresholds
{
  let s = frame(400, 230);
  s += txt(200, 26, "Cape Town Agreement: length and gross tonnage", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "Fishing vessels of 24 m and over", { a: "middle", s: 9.5, c: L });
  const pts = [[24, 300], [45, 950], [60, 2000], [75, 3000]];
  const bx = 50, by = 190, bw = 310, bh = 125;
  s += line(bx, by, bx + bw, by) + line(bx, by, bx, by - bh);
  const X = m => bx + (m - 15) / 70 * bw, Yp = g => by - g / 3200 * bh;
  let d = "";
  pts.forEach(([m, g], i) => {
    d += (i ? "L" : "M") + X(m).toFixed(1) + "," + Yp(g).toFixed(1);
  });
  s += `<path d="${d}" fill="none" stroke="${A}" stroke-width="1.6"/>`;
  pts.forEach(([m, g]) => {
    s += `<circle cx="${X(m)}" cy="${Yp(g)}" r="3.4" fill="${G}"/>` + txt(X(m), by + 14, `${m} m`, { a: "middle", s: 9.5 }) + txt(X(m) + 6, Yp(g) - 6, `${g.toLocaleString("en")} GT`, { s: 9.5, c: Y });
  });
  s += txt(200, 224, "Length (m) on the bottom, gross tonnage up the side", { a: "middle", s: 9, c: L });
  DIAGRAMS["capetown-thresholds"] = svg(400, 230, s);
}

// 12. Tonnage 1969: K1 against volume (log scale)
{
  let s = frame(400, 240);
  s += txt(200, 26, "Tonnage 1969: GT = K1 × V", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "K1 rises slowly as the ship's volume V (m³) grows", { a: "middle", s: 9.5, c: L });
  const pts = [[100, 0.24], [1000, 0.26], [10000, 0.28], [100000, 0.30], [1000000, 0.32]];
  const bx = 50, by = 190, bw = 310, bh = 120;
  s += line(bx, by, bx + bw, by) + line(bx, by, bx, by - bh);
  const X = v => bx + (Math.log10(v) - 2) / 4 * bw, Yp = k => by - (k - 0.22) / 0.12 * bh;
  let d = "";
  pts.forEach(([v, k], i) => { d += (i ? "L" : "M") + X(v).toFixed(1) + "," + Yp(k).toFixed(1); });
  s += `<path d="${d}" fill="none" stroke="${A}" stroke-width="1.6"/>`;
  pts.forEach(([v, k]) => {
    s += `<circle cx="${X(v)}" cy="${Yp(k)}" r="3.4" fill="${G}"/>` + txt(X(v), by + 14, v.toLocaleString("en"), { a: "middle", s: 8.5 }) + txt(X(v), Yp(k) - 8, k.toFixed(4), { a: "middle", s: 9, c: Y });
  });
  s += txt(200, 224, "Volume V (m³), log scale · net tonnage never less than 0.30 GT", { a: "middle", s: 9, c: L });
  DIAGRAMS["tonnage-k1"] = svg(400, 240, s);
}

// 13. AFS 2001 timeline
{
  let s = frame(400, 220);
  s += txt(200, 26, "AFS 2001: key dates", { a: "middle", b: true, s: 12 });
  s += line(40, 110, 360, 110, L, 2);
  const ev = [[60, "5 Oct 2001", "Adopted", T, 0], [130, "1 Jan 2003", "Organotin: no new application", R, 1], [200, "1 Jan 2008", "No organotin on hulls, or a barrier coating", R, 0], [250, "17 Sep 2008", "In force", G, 1], [335, "1 Jan 2023", "Cybutryne: no application or re-application", Y, 0]];
  ev.forEach(([x, d, t, c, up]) => {
    s += `<circle cx="${x}" cy="110" r="5" fill="${c}"/>`;
    const y = up ? 80 : 140, ty = up ? 62 : 158;
    s += line(x, 110, x, y, c, 1) + txt(x, ty, d, { a: "middle", s: 9.5, b: true, c });
    const words = t.split(" "); let l1 = words.slice(0, Math.ceil(words.length / 2)).join(" "), l2 = words.slice(Math.ceil(words.length / 2)).join(" ");
    s += txt(x, ty + (up ? -12 : 12), up ? l2 : l1, { a: "middle", s: 8.5, c: L }) ;
    s += txt(x, ty + (up ? -1 : 23), up ? "" : l2, { a: "middle", s: 8.5, c: L });
    if (up) s += txt(x, ty - 22, l1, { a: "middle", s: 8.5, c: L });
  });
  DIAGRAMS["afs-timeline"] = svg(400, 220, s);
}

// 14. Bunkers 2001: who is liable and who can be sued (Arts 1(3), 3, 7)
{
  let s = frame(400, 270);
  s += txt(200, 26, "Bunkers 2001: liability chain", { a: "middle", b: true, s: 12 });
  s += `<rect x="20" y="46" width="170" height="104" rx="6" fill="${A}" fill-opacity="0.15" stroke="${A}"/>`;
  s += txt(105, 64, '"Shipowner" (Art 1(3))', { a: "middle", b: true, s: 10.5, c: A });
  ["Owner (incl. registered owner)", "Bareboat charterer", "Manager", "Operator"].forEach((t, i) => { s += txt(105, 84 + i * 16, t, { a: "middle", s: 9.5 }); });
  s += txt(105, 164, "Strict, joint and several (Art 3)", { a: "middle", s: 9.5, c: Y });
  s += `<rect x="230" y="46" width="150" height="50" rx="6" fill="${G}" fill-opacity="0.15" stroke="${G}"/>`;
  s += txt(305, 66, "Insurer / security provider", { a: "middle", b: true, s: 10, c: G });
  s += txt(305, 82, "Ships over 1,000 GT (Art 7)", { a: "middle", s: 9.5 });
  s += `<rect x="230" y="116" width="150" height="34" rx="6" fill="${R}" fill-opacity="0.12" stroke="${R}"/>`;
  s += txt(305, 138, "Claimant", { a: "middle", b: true, s: 10.5, c: R });
  s += arrow(190, 133, 230, 133, R) + arrow(305, 116, 305, 96, G);
  s += txt(247, 108, "direct", { a: "middle", s: 8.5, c: G }) + txt(247, 118, "action", { a: "middle", s: 8.5, c: G });
  s += txt(200, 184, "Cover: up to the applicable limitation amount,", { a: "middle", s: 10 });
  s += txt(200, 198, "never more than the LLMC 1976 amount (as amended)", { a: "middle", s: 10 });
  s += txt(200, 220, "Certificate carried on board · copy with the registry authorities", { a: "middle", s: 9.5, c: L });
  s += txt(200, 236, "Insurer may use the shipowner's defences and wilful misconduct,", { a: "middle", s: 9, c: L });
  s += txt(200, 249, "but not bankruptcy or winding up", { a: "middle", s: 9, c: L });
  DIAGRAMS["bunkers-liability"] = svg(400, 270, s);
}

// 15. Bunkers 2001: time limits (Art 8)
{
  let s = frame(400, 190);
  s += txt(200, 26, "Time limits (Art 8)", { a: "middle", b: true, s: 12 });
  const x0 = 40, sc = 320 / 6;
  s += txt(x0, 56, "Counted from the damage", { s: 10, c: G });
  s += `<rect x="${x0}" y="62" width="${3 * sc}" height="20" fill="${G}" fill-opacity="0.35" stroke="${G}"/>` + txt(x0 + 1.5 * sc, 76, "3 years", { a: "middle", s: 10, b: true });
  s += txt(x0, 108, "Counted from the incident (outer limit)", { s: 10, c: Y });
  s += `<rect x="${x0}" y="114" width="${6 * sc}" height="20" fill="${Y}" fill-opacity="0.25" stroke="${Y}"/>` + txt(x0 + 3 * sc, 128, "6 years", { a: "middle", s: 10, b: true });
  s += txt(200, 156, "An action must be brought within 3 years of the damage,", { a: "middle", s: 9.5, c: L });
  s += txt(200, 170, "and never later than 6 years after the incident (first occurrence, for a series)", { a: "middle", s: 9, c: L });
  DIAGRAMS["bunkers-timebar"] = svg(400, 190, s);
}

// 16. FAL 1965: Annex structure (as replaced by FAL.14(46), in force 1 Jan 2024)
{
  let s = frame(400, 330);
  s += txt(200, 26, "FAL Annex: seven sections, three appendices", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "(text replaced by FAL.14(46), in force 1 Jan 2024)", { a: "middle", s: 9.5, c: L });
  const secs = [["1", "Definitions and general provisions"], ["2", "Arrival, stay and departure of the ship"], ["3", "Arrival and departure of persons"], ["4", "Stowaways"], ["5", "Arrival, stay and departure of cargo and other articles"], ["6", "Public health and quarantine"], ["7", "Miscellaneous provisions"]];
  secs.forEach(([n, t], i) => {
    const y = 54 + i * 28;
    s += `<rect x="20" y="${y}" width="360" height="23" rx="4" fill="${A}" fill-opacity="0.14" stroke="${A}" stroke-opacity="0.6"/>`;
    s += txt(34, y + 16, n, { b: true, c: A, s: 11 }) + txt(56, y + 16, t, { s: 10 });
  });
  const aps = [["1", "Maximum information for the declarations (Std 2.1bis)"], ["2", "Declarations allowed on paper in exceptional cases (Std 2.11)"], ["3", "Stowaway details (RP 4.6.2)"]];
  aps.forEach(([n, t], i) => {
    const y = 258 + i * 22;
    s += `<rect x="20" y="${y}" width="360" height="18" rx="4" fill="${Y}" fill-opacity="0.12" stroke="${Y}" stroke-opacity="0.6"/>`;
    s += txt(34, y + 13, `App ${n}`, { b: true, c: Y, s: 9.5 }) + txt(80, y + 13, t, { s: 9.5 });
  });
  DIAGRAMS["fal-annex-map"] = svg(400, 330, s);
}

// 17. FAL 1965: Annex amendments timeline (adopted / in force)
{
  let s = frame(400, 250);
  s += txt(200, 26, "FAL: adoption and entry into force", { a: "middle", b: true, s: 12 });
  const rows = [["Convention", "9 Apr 1965", "5 Mar 1967"], ["2002 amendments", "10 Jan 2002", "1 May 2003"], ["2005 amendments", "7 Jul 2005", "1 Nov 2006"], ["2009 amendments", "16 Jan 2009", "15 May 2010"], ["2016 amendments", "8 Apr 2016", "1 Jan 2018"], ["2022 amendments", "13 May 2022", "1 Jan 2024"]];
  s += txt(20, 52, "", {}) + txt(170, 52, "Adopted", { b: true, c: A, s: 10, a: "middle" }) + txt(290, 52, "In force", { b: true, c: G, s: 10, a: "middle" });
  rows.forEach(([n, a, f], i) => {
    const y = 60 + i * 26;
    s += `<rect x="16" y="${y}" width="368" height="22" rx="4" fill="#1d2036" fill-opacity="${i % 2 ? 0.4 : 0.8}"/>`;
    s += txt(26, y + 15, n, { s: 10 }) + txt(170, y + 15, a, { a: "middle", s: 10, c: A }) + txt(290, y + 15, f, { a: "middle", s: 10, c: G });
  });
  s += txt(200, 234, "2022: whole Annex replaced · single window mandatory from 1 Jan 2024", { a: "middle", s: 9.5, c: Y });
  DIAGRAMS["fal-dates"] = svg(400, 250, s);
}

// 18. BLU Code: procedure flow (Sections 3-6)
{
  let s = frame(400, 320);
  s += txt(200, 26, "BLU Code: from arrival to completion", { a: "middle", b: true, s: 12 });
  const st = [
    ["1", "Before arrival (Sec 3)", "Ship and terminal exchange information; ship confirms holds are clean", A],
    ["2", "Before cargo handling (Sec 4)", "Master and terminal representative agree and sign the plan and complete the checklist", Y],
    ["3", "Loading (Sec 5) or unloading (Sec 6)", "Ballast kept in step with cargo; hull stress within limits; plan changed only by a signed revised plan", G],
    ["4", "Completion", "Both parties agree in writing; plan kept 6 months", R]];
  st.forEach(([n, h, d, c], i) => {
    const y = 46 + i * 66;
    s += `<rect x="18" y="${y}" width="364" height="56" rx="6" fill="${c}" fill-opacity="0.13" stroke="${c}"/>`;
    s += `<circle cx="40" cy="${y + 28}" r="12" fill="${c}" fill-opacity="0.35" stroke="${c}"/>` + txt(40, y + 32, n, { a: "middle", b: true, s: 11 });
    s += txt(62, y + 22, h, { b: true, s: 10.5, c });
    const w = d.split(" "); let a = "", b = ""; w.forEach(x => { if ((a + " " + x).length < 56) a += (a ? " " : "") + x; else b += (b ? " " : "") + x; });
    s += txt(62, y + 36, a, { s: 9, c: L }) + (b ? txt(62, y + 48, b, { s: 9, c: L }) : "");
    if (i < 3) s += `<path d="M195,${y + 57} h10 l-5,6z" fill="${L}"/>`;
  });
  DIAGRAMS["blu-flow"] = svg(400, 320, s);
}

// 19. BLU Code: master and terminal duties
{
  let s = frame(400, 280);
  s += txt(200, 26, "Who does what during cargo handling", { a: "middle", b: true, s: 12 });
  const col = (x, title, c, items) => {
    let o = `<rect x="${x}" y="40" width="176" height="224" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>` + txt(x + 88, 58, title, { a: "middle", b: true, c, s: 11 });
    items.forEach((t, i) => { o += txt(x + 10, 80 + i * 26, "•", { c }) + txt(x + 20, 80 + i * 26, t[0], { s: 9.5 }) + (t[1] ? txt(x + 20, 91 + i * 26, t[1], { s: 9.5 }) : ""); });
    return o;
  };
  s += col(20, "Master (ship)", A, [["Responsible at all times for", "safe loading or unloading"], ["Completes the checklist", "with the terminal"], ["Controls ballast and cargo", "through the officer in charge"], ["Monitors hull stresses", ""], ["Controls hot work", ""], ["Reports deviations from the", "ballast plan; keeps ship upright"], ["May stop the operation", "(resolution para 3.4)"]]);
  s += col(204, "Terminal representative", Y, [["Follows the agreed hatch", "sequence and tonnages"], ["No deviation without", "consultation"], ["Keeps weight records", ""], ["Advises on rate changes and", "the weight of each pour"], ["Keeps the ship upright", "and balanced"], ["Weight-meters accurate to", "within 1% of rated quantity"], ["Reports damage when unloading", ""]]);
  DIAGRAMS["blu-roles"] = svg(400, 280, s);
}

// 20. CSS Code Annex 13: MSL as a percentage of breaking strength
{
  let s = frame(400, 280);
  s += txt(200, 26, "Maximum securing load (MSL)", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "as a percentage of breaking strength (Annex 13, Table 1)", { a: "middle", s: 9.5, c: L });
  const rows = [["Wire rope, single use", 80], ["Steel band, single use", 70], ["Shackles, rings, deckeyes, turnbuckles (mild steel)", 50], ["Web lashing", 50], ["Chains", 50], ["Fibre rope", 33], ["Wire rope, re-useable", 30]];
  const x0 = 24, sc = 340 / 100;
  rows.forEach(([n, v], i) => {
    const y = 56 + i * 31;
    s += txt(x0, y + 8, n, { s: 9.5 });
    s += `<rect x="${x0}" y="${y + 12}" width="${v * sc}" height="11" rx="2" fill="${v >= 70 ? G : v >= 50 ? A : Y}" fill-opacity="0.5" stroke="${v >= 70 ? G : v >= 50 ? A : Y}"/>`;
    s += txt(x0 + v * sc + 5, y + 21, `${v}%`, { s: 9.5, b: true });
  });
  DIAGRAMS["css-msl"] = svg(400, 280, s);
}

// 21. CSS Code Annex 13: rule-of-thumb transverse securing (section 5)
{
  let s = frame(400, 260);
  s += txt(200, 26, "Annex 13 rule of thumb (transverse, section 5)", { a: "middle", b: true, s: 12 });
  s += `<rect x="40" y="190" width="320" height="10" fill="#2a2d4a" stroke="${T}"/>` + txt(200, 216, "Deck", { a: "middle", s: 9.5, c: L });
  s += `<rect x="150" y="100" width="100" height="90" rx="3" fill="${A}" fill-opacity="0.25" stroke="${A}"/>` + txt(200, 148, "Cargo item", { a: "middle", s: 10.5, b: true }) + txt(200, 162, "weight in kN", { a: "middle", s: 9.5, c: L });
  s += line(150, 104, 70, 190, Y, 2) + line(250, 104, 330, 190, Y, 2);
  s += txt(66, 180, "MSL", { a: "end", s: 9.5, c: Y, b: true }) + txt(334, 180, "MSL", { s: 9.5, c: Y, b: true });
  s += txt(70, 132, "Port side", { a: "middle", s: 9.5, c: L }) + txt(330, 132, "Starboard side", { a: "middle", s: 9.5, c: L });
  s += txt(200, 56, "Total MSL of the devices on each side", { a: "middle", s: 10.5, c: G }) + txt(200, 71, "should equal the weight of the item", { a: "middle", s: 10.5, c: G });
  s += txt(200, 236, "Assumes 1 g (9.81 m/s²) transverse · lashing angle to deck: 60° at most", { a: "middle", s: 9.5, c: L });
  s += txt(200, 251, "Lashings above 60° do not count in the total", { a: "middle", s: 9, c: L });
  DIAGRAMS["css-rule-of-thumb"] = svg(400, 260, s);
}

// 22. Casualty Investigation Code: structure (MSC.255(84))
{
  let s = frame(400, 300);
  s += txt(200, 26, "Casualty Investigation Code: 26 chapters", { a: "middle", b: true, s: 12 });
  const parts = [
    ["Part I", "General provisions", "Ch 1–3", "Purpose · Definitions · Application", L, 46, 52],
    ["Part II", "Mandatory standards", "Ch 4–14", "Authority · Notification · Duty to investigate (very serious) · Powers · Parallel investigations · Co-operation · Independence · Evidence from seafarers · Draft reports · Final reports", R, 104, 96],
    ["Part III", "Recommended practices", "Ch 15–26", "Administration · Principles · Other casualties and incidents · Unlawful interference · Evidence · Confidentiality · Witness protection · Reports · Re-opening", G, 208, 84]];
  parts.forEach(([p, t, c, d, col, y, h]) => {
    s += `<rect x="18" y="${y}" width="364" height="${h}" rx="6" fill="${col}" fill-opacity="0.12" stroke="${col}"/>`;
    s += txt(30, y + 20, `${p} — ${t}`, { b: true, s: 11, c: col }) + txt(370, y + 20, c, { a: "end", s: 10, c: L });
    const w = d.split(" · "); let line1 = "", lines = [];
    w.forEach(x => { if ((line1 + " · " + x).length > 62 && line1) { lines.push(line1); line1 = x; } else line1 = line1 ? line1 + " · " + x : x; }); lines.push(line1);
    lines.forEach((l, i) => { s += txt(30, y + 38 + i * 14, l, { s: 9.5 }); });
  });
  DIAGRAMS["ci-structure"] = svg(400, 300, s);
}

// 23. Casualty Investigation Code: from casualty to final report
{
  let s = frame(400, 320);
  s += txt(200, 26, "Very serious marine casualty: the path", { a: "middle", b: true, s: 12 });
  const st = [
    ["Notification (Ch 5)", "Flag State, coastal State and other substantially interested States notify each other; not delayed for lack of information", A],
    ["Investigation (Ch 6–8)", "A marine safety investigation into every very serious marine casualty; flag State responsible unless another State agrees to lead", Y],
    ["Evidence (Ch 12)", "Seafarers informed of their rights, including legal advice and protection against self-incrimination", R],
    ["Draft report (Ch 13)", "Comments invited within 30 days, or another agreed period", G],
    ["Final report (Ch 14)", "Sent to IMO and made available to the public and industry", T]];
  st.forEach(([h, d, c], i) => {
    const y = 40 + i * 56;
    s += `<rect x="18" y="${y}" width="364" height="48" rx="6" fill="${c}" fill-opacity="0.12" stroke="${c}"/>`;
    s += txt(30, y + 17, h, { b: true, s: 10.5, c });
    const w = d.split(" "); let a = "", b = ""; w.forEach(x => { if ((a + " " + x).length < 66) a += (a ? " " : "") + x; else b += (b ? " " : "") + x; });
    s += txt(30, y + 31, a, { s: 9, c: L }) + (b ? txt(30, y + 42, b, { s: 9, c: L }) : "");
    if (i < 4) s += `<path d="M195,${y + 49} h10 l-5,6z" fill="${L}"/>`;
  });
  DIAGRAMS["ci-path"] = svg(400, 320, s);
}

// 24. ESP Code: structure (Annex A/B, Parts A/B, eight sections)
{
  let s = frame(400, 300);
  s += txt(200, 26, "2011 ESP Code (A.1049(27)): structure", { a: "middle", b: true, s: 12 });
  const box = (x, y, w, h, c, t1, t2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${c}" fill-opacity="0.13" stroke="${c}"/>` + txt(x + w / 2, y + 18, t1, { a: "middle", b: true, s: 10.5, c }) + (t2 ? txt(x + w / 2, y + 32, t2, { a: "middle", s: 9, c: L }) : "");
  s += box(18, 44, 178, 74, A, "Annex A: Bulk carriers", "");
  s += box(28, 72, 78, 38, A, "Part A", "single-side skin");
  s += box(112, 72, 78, 38, A, "Part B", "double-side skin");
  s += box(204, 44, 178, 74, Y, "Annex B: Oil tankers", "");
  s += box(214, 72, 78, 38, Y, "Part A", "double-hull");
  s += box(298, 72, 78, 38, Y, "Part B", "not double-hull");
  s += txt(200, 140, "Each part has the same eight sections", { a: "middle", s: 10.5, b: true });
  const secs = ["General", "Renewal survey", "Annual survey", "Intermediate survey", "Preparations for survey", "Documentation on board", "Thickness procedures", "Reporting and evaluation"];
  secs.forEach((t, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 18 + col * 186, y = 150 + row * 34;
    s += `<rect x="${x}" y="${y}" width="178" height="28" rx="4" fill="${G}" fill-opacity="0.12" stroke="${G}" stroke-opacity="0.6"/>`;
    s += txt(x + 10, y + 18, `${i + 1}`, { b: true, c: G, s: 10.5 }) + txt(x + 26, y + 18, t, { s: 9.5 });
  });
  DIAGRAMS["esp-structure"] = svg(400, 300, s);
}

// 25. ESP Code: survey cycle for bulk carriers (renewal, annual, intermediate)
{
  let s = frame(400, 230);
  s += txt(200, 26, "Five-year survey cycle (bulk carrier, Annex A)", { a: "middle", b: true, s: 12 });
  const x0 = 40, sc = 64;
  s += line(x0, 110, x0 + 5 * sc, 110, L, 2);
  for (let y = 0; y <= 5; y++) {
    s += line(x0 + y * sc, 102, x0 + y * sc, 118, T, 1.5) + txt(x0 + y * sc, 134, y === 0 ? "Start" : `Year ${y}`, { a: "middle", s: 9.5 });
  }
  for (let y = 1; y <= 4; y++) s += `<circle cx="${x0 + y * sc}" cy="110" r="5" fill="${A}"/>`;
  s += `<rect x="${x0 + 1.5 * sc}" y="76" width="${sc}" height="14" rx="3" fill="${Y}" fill-opacity="0.35" stroke="${Y}"/>` + txt(x0 + 2 * sc, 87, "Intermediate", { a: "middle", s: 9, b: true });
  s += `<rect x="${x0 + 3.5 * sc}" y="146" width="${1.5 * sc}" height="14" rx="3" fill="${R}" fill-opacity="0.35" stroke="${R}"/>` + txt(x0 + 4.25 * sc, 157, "Renewal window", { a: "middle", s: 9, b: true });
  s += `<circle cx="${x0 + 5 * sc}" cy="110" r="6" fill="${R}"/>`;
  s += `<circle cx="42" cy="186" r="4" fill="${A}"/>` + txt(52, 190, "Annual survey", { s: 9.5 });
  s += `<rect x="150" y="180" width="14" height="10" fill="${Y}" fill-opacity="0.35" stroke="${Y}"/>` + txt(170, 190, "At the 2nd or 3rd annual, or between", { s: 9.5 });
  s += txt(200, 214, "Renewal: may start at the 4th annual and finish by the 5th anniversary", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["esp-cycle"] = svg(400, 230, s);
}

// 26. FSS Code Chapter 2: international shore connection (Table 2.1)
{
  let s = frame(400, 280);
  s += txt(200, 26, "International shore connection (FSS Ch 2)", { a: "middle", b: true, s: 12 });
  const cx = 130, cy = 136, k = 0.62; // 178 mm -> 110 px
  const R1 = 89 * k * 1.0, R2 = 32 * k * 1.0, Rb = 66 * k * 1.0;
  const sc = 1.0;
  s += `<circle cx="${cx}" cy="${cy}" r="${R1 * 1.4}" fill="#2a2d4a" stroke="${T}" stroke-width="1.6"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${Rb * 1.4}" fill="none" stroke="${Y}" stroke-width="1" stroke-dasharray="4 3"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="${R2 * 1.4}" fill="${BG}" stroke="${T}" stroke-width="1.4"/>`;
  [45, 135, 225, 315].forEach(a => {
    const x = cx + Rb * 1.4 * Math.sin(a * Math.PI / 180), y = cy - Rb * 1.4 * Math.cos(a * Math.PI / 180);
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5.5" fill="${BG}" stroke="${G}" stroke-width="1.4"/>`;
  });
  s += line(cx - R1 * 1.4, cy + R1 * 1.4 + 12, cx + R1 * 1.4, cy + R1 * 1.4 + 12, A, 1.2) + txt(cx, cy + R1 * 1.4 + 25, "OD 178 mm", { a: "middle", s: 9.5, c: A });
  s += txt(250, 64, "Flange dimensions", { b: true, s: 10.5 });
  const rows = [["Outside diameter", "178 mm", A], ["Inside diameter", "64 mm", T], ["Bolt circle diameter", "132 mm", Y], ["Slots", "4 × 19 mm, equally spaced", G], ["Flange thickness", "at least 14.5 mm", T], ["Bolts", "4 × 16 mm dia., 50 mm long", T], ["Rating", "1.0 N/mm²", T]];
  rows.forEach(([a, b, c], i) => { s += txt(250, 84 + i * 26, a, { s: 9, c: L }) + txt(250, 97 + i * 26, b, { s: 10, c }); });
  s += txt(200, 264, "Carried with a gasket, four bolts, four nuts and eight washers", { a: "middle", s: 9, c: L });
  DIAGRAMS["fss-shore-connection"] = svg(400, 280, s);
}

// 27. FSS Code: 17 chapters (later additions highlighted)
{
  let s = frame(400, 320);
  s += txt(200, 26, "FSS Code: 17 chapters", { a: "middle", b: true, s: 12 });
  s += txt(200, 40, "Chapters 1–15 from 2000 · 16 and 17 added later", { a: "middle", s: 9.5, c: L });
  const ch = ["General", "International shore connections", "Personnel protection", "Fire extinguishers", "Fixed gas fire-extinguishing", "Fixed foam", "Water-spraying and water-mist", "Sprinkler, detection and alarm", "Fixed detection and alarm", "Sample extraction smoke detection", "Low-location lighting", "Fixed emergency fire pumps", "Means of escape", "Fixed deck foam", "Inert gas systems", "Fixed hydrocarbon gas detection", "Helicopter facility foam"];
  ch.forEach((t, i) => {
    const y = 52 + i * 15.6, c = i >= 15 ? Y : A;
    s += txt(36, y + 10, `${i + 1}`, { a: "end", b: true, c, s: 10 });
    s += `<rect x="44" y="${y}" width="340" height="13" rx="3" fill="${c}" fill-opacity="${i >= 15 ? 0.25 : 0.12}"/>` + txt(52, y + 10, t, { s: 9.5 });
  });
  DIAGRAMS["fss-chapters"] = svg(400, 320, s);
}

// 28. FTP Code: standard time-temperature curve T = 345 log10(8t+1) + 20
{
  let s = frame(400, 270);
  s += txt(200, 26, "Standard fire curve (FTP Code, definitions)", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "T = 345 log10(8t + 1) + 20   (t in minutes, T in °C)", { a: "middle", s: 9.5, c: L });
  const bx = 56, by = 220, bw = 320, bh = 150, tmax = 60, Tmax = 1000;
  const X = t => bx + t / tmax * bw, Y_ = T_ => by - T_ / Tmax * bh;
  s += line(bx, by, bx + bw, by) + line(bx, by, bx, by - bh);
  let d = "";
  for (let t = 0; t <= 60; t += 1) { const T_ = 345 * Math.log10(8 * t + 1) + 20; d += (t ? "L" : "M") + X(t).toFixed(1) + "," + Y_(T_).toFixed(1); }
  s += `<path d="${d}" fill="none" stroke="${R}" stroke-width="2"/>`;
  [[0, 20], [5, 576], [15, 739], [30, 842], [60, 945]].forEach(([t, T_]) => {
    s += `<circle cx="${X(t)}" cy="${Y_(T_)}" r="3.4" fill="${Y}"/>`;
    if (t) s += txt(X(t), Y_(T_) - 8, `${T_}`, { a: "middle", s: 9, c: Y });
    s += txt(X(t), by + 14, `${t}`, { a: "middle", s: 9.5 });
  });
  [0, 500, 1000].forEach(v => { s += txt(bx - 6, Y_(v) + 3, `${v}`, { a: "end", s: 9, c: L }); });
  s += txt(200, 250, "Time (minutes)  ·  values rounded from the formula", { a: "middle", s: 9, c: L });
  DIAGRAMS["ftp-fire-curve"] = svg(400, 270, s);
}

// 29. FTP Code Annex 1 Part 3: "A", "B" and "F" class insulation criteria
{
  let s = frame(400, 250);
  s += txt(200, 26, "Part 3: temperature rise on the unexposed side", { a: "middle", b: true, s: 12 });
  const rows = [["Class A", "A-60 · A-30 · A-15 · A-0", 140, 180, A], ["Class B", "B-15 · B-0", 140, 225, G], ["Class F", "F-15 · F-0", 140, 225, Y]];
  const x0 = 100, sc = 250 / 240;
  rows.forEach(([n, subs, avg, pt, c], i) => {
    const y = 60 + i * 56;
    s += txt(20, y + 12, n, { b: true, s: 11, c }) + txt(20, y + 26, subs, { s: 8.5, c: L });
    s += `<rect x="${x0 + 50}" y="${y}" width="${avg * sc * 0.55}" height="14" rx="2" fill="${c}" fill-opacity="0.5" stroke="${c}"/>`;
    s += `<rect x="${x0 + 50}" y="${y + 20}" width="${pt * sc * 0.55}" height="14" rx="2" fill="${c}" fill-opacity="0.25" stroke="${c}"/>`;
    s += txt(x0 + 56 + avg * sc * 0.55, y + 11, `${avg} °C average`, { s: 9 }) + txt(x0 + 56 + pt * sc * 0.55, y + 31, `${pt} °C any single point`, { s: 9 });
  });
  s += txt(200, 232, "Aluminium cores: rise no more than 200 °C · integrity: no flaming on the unexposed face", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["ftp-class-divisions"] = svg(400, 250, s);
}

// 30. Grain Code A 7.1: stability criteria (schematic)
{
  let s = frame(400, 290);
  s += txt(200, 26, "Grain Code A 7.1: stability after assumed grain shift", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "(schematic curves, not to scale)", { a: "middle", s: 9.5, c: L });
  const bx = 46, by = 220, bw = 330, bh = 140;
  s += line(bx, by, bx + bw, by) + line(bx, by, bx, by - bh);
  const X = a => bx + a / 60 * bw;
  // righting arm curve (rises, peaks ~40, falls)
  let r = "", h = "";
  for (let a = 0; a <= 60; a += 2) { const g = 105 * Math.sin(a * Math.PI / 90) * (1 - a / 150); r += (a ? "L" : "M") + X(a).toFixed(1) + "," + (by - g).toFixed(1); }
  for (let a = 0; a <= 60; a += 2) { const g = 24 + 0.32 * a; h += (a ? "L" : "M") + X(a).toFixed(1) + "," + (by - g).toFixed(1); }
  s += `<path d="${r}" fill="none" stroke="${G}" stroke-width="2"/><path d="${h}" fill="none" stroke="${R}" stroke-width="2"/>`;
  // shaded residual area between curves from ~12 to 40
  let area = `M${X(12)},${by - (24 + 0.32 * 12)}`;
  for (let a = 12; a <= 40; a += 2) { const g = 105 * Math.sin(a * Math.PI / 90) * (1 - a / 150); area += `L${X(a).toFixed(1)},${(by - g).toFixed(1)}`; }
  for (let a = 40; a >= 12; a -= 2) { const g = 24 + 0.32 * a; area += `L${X(a).toFixed(1)},${(by - g).toFixed(1)}`; }
  s += `<path d="${area}Z" fill="${Y}" fill-opacity="0.3" stroke="none"/>`;
  s += line(X(12), by, X(12), by - 120, A, 1, "4 3") + line(X(40), by, X(40), by - 120, A, 1, "4 3");
  s += txt(X(12), by + 14, "12°", { a: "middle", s: 9.5, c: A }) + txt(X(40), by + 14, "40°", { a: "middle", s: 9.5, c: A });
  s += txt(X(26), by - 50, "residual area", { a: "middle", s: 9, c: Y }) + txt(X(26), by - 38, "≥ 0.075 m·rad", { a: "middle", s: 9, c: Y, b: true });
  s += txt(X(50), by - 126, "Righting arm", { a: "middle", s: 9, c: G }) + txt(X(50), by - 76, "Heeling arm", { a: "middle", s: 9, c: R });
  s += txt(200, 248, "Heel from grain shift ≤ 12° (or deck-edge immersion angle if less, ships built from 1 Jan 1994)", { a: "middle", s: 8.5, c: L });
  s += txt(200, 261, "Area measured up to the smaller of: 40°, angle of flooding, angle of maximum difference", { a: "middle", s: 8.5, c: L });
  s += txt(200, 274, "Initial GM, corrected for free surface: at least 0.30 m", { a: "middle", s: 9, c: G, b: true });
  DIAGRAMS["grain-criteria"] = svg(400, 290, s);
}

// 31. Grain Code Part B: assumed grain surface shift angles
{
  let s = frame(400, 240);
  s += txt(200, 26, "Part B: assumed grain surface after shifting", { a: "middle", b: true, s: 12 });
  const panel = (x, title, ang, c, note) => {
    let o = `<rect x="${x}" y="44" width="112" height="140" rx="6" fill="${c}" fill-opacity="0.08" stroke="${c}"/>`;
    o += `<rect x="${x + 12}" y="70" width="88" height="90" fill="none" stroke="${L}" stroke-width="1.5"/>`;
    const dy = Math.tan(ang * Math.PI / 180) * 44;
    o += `<path d="M${x + 12},${115 + dy} L${x + 100},${115 - dy} L${x + 100},160 L${x + 12},160 Z" fill="${c}" fill-opacity="0.35" stroke="${c}"/>`;
    o += `<path d="M${x + 12},115 L${x + 100},115" stroke="${T}" stroke-width="1" stroke-dasharray="3 3"/>`;
    o += txt(x + 56, 60, title, { a: "middle", b: true, s: 9.5, c }) + txt(x + 56, 176, `${ang}°`, { a: "middle", b: true, s: 11, c });
    o += txt(x + 56, 200, note, { a: "middle", s: 8.5, c: L });
    return o;
  };
  s += panel(14, "Filled, trimmed", 15, G, "Ch B 2");
  s += panel(144, "Untrimmed", 25, Y, "Ch B 3 (generally)");
  s += panel(274, "Partly filled", 25, R, "Ch B 5 (unsecured)");
  s += txt(200, 226, "Partly filled and unsecured: total heeling moment × 1.12 (B 1.5) · section numbers of the 1991 text", { a: "middle", s: 9, c: L });
  DIAGRAMS["grain-shift-angles"] = svg(400, 240, s);
}

// 32. HSC Code: speed threshold  V = 3.7 * displacement^0.1667
{
  let s = frame(400, 260);
  s += txt(200, 26, "High-speed craft: speed threshold (1.4.30)", { a: "middle", b: true, s: 12 });
  s += txt(200, 41, "max speed (m/s) ≥ 3.7 × ∇^0.1667   (∇ = displacement, m³)", { a: "middle", s: 9.5, c: L });
  const bx = 56, by = 206, bw = 320, bh = 140;
  s += line(bx, by, bx + bw, by) + line(bx, by, bx, by - bh);
  const X = v => bx + (Math.log10(v) - 1) / 4 * bw, Yp = m => by - m / 25 * bh;
  let d = "", a = `M${bx},${by}`;
  for (let e = 1; e <= 5.001; e += 0.1) { const v = Math.pow(10, e), sp = 3.7 * Math.pow(v, 0.1667); const px = bx + (e - 1) / 4 * bw; d += (e > 1.01 ? "L" : "M") + px.toFixed(1) + "," + Yp(sp).toFixed(1); }
  const top = `M${bx},${by - bh}`;
  s += `<path d="${d} L${bx + bw},${by - bh} L${bx},${by - bh}Z" fill="${G}" fill-opacity="0.12" stroke="none"/>`;
  s += `<path d="${d}" fill="none" stroke="${G}" stroke-width="2"/>`;
  [[100, 7.97], [1000, 11.7], [10000, 17.2]].forEach(([v, m]) => {
    s += `<circle cx="${X(v)}" cy="${Yp(m)}" r="3.4" fill="${Y}"/>` + txt(X(v), Yp(m) + 16, `${m.toFixed(1)} m/s`, { a: "middle", s: 9, c: Y });
    s += txt(X(v), by + 14, v.toLocaleString("en"), { a: "middle", s: 9.5 });
  });
  s += txt(bx + 150, by - 118, "High-speed craft", { s: 10, b: true, c: G }) + txt(bx + 150, by - 104, "(at or above the line)", { s: 9, c: L });
  s += txt(bx + 180, by - 22, "Below the line: not high-speed", { s: 9, c: L });
  s += txt(200, 238, "Displacement at the design waterline (m³), log scale", { a: "middle", s: 9, c: L });
  s += txt(200, 252, "Values calculated from the formula · craft clear of the water on ground effect are excluded", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["hsc-speed-line"] = svg(400, 260, s);
}

// 33. HSC Code: craft types
{
  let s = frame(400, 290);
  s += txt(200, 26, "HSC Code: passenger and cargo craft", { a: "middle", b: true, s: 12 });
  const card = (y, h, c, t, l1, l2, l3) => `<rect x="18" y="${y}" width="364" height="${h}" rx="6" fill="${c}" fill-opacity="0.12" stroke="${c}"/>` + txt(30, y + 18, t, { b: true, s: 11, c }) + txt(30, y + 34, l1, { s: 9.5 }) + (l2 ? txt(30, y + 48, l2, { s: 9.5 }) : "") + (l3 ? txt(30, y + 62, l3, { s: 9.5 }) : "");
  s += card(42, 74, G, "Category A passenger craft (1.4.12)", "Not more than 450 passengers", "Rescue of all within the least of: time to prevent hypothermia,", "a time suited to the route, or 4 hours (shown by flag and port States)");
  s += card(124, 62, Y, "Category B passenger craft (1.4.13)", "Any high-speed passenger craft that is not Category A", "Keeps navigating safely if essential systems in one", "compartment are disabled");
  s += card(194, 48, A, "Cargo craft (1.4.10)", "Any high-speed craft that is not a passenger craft", "", "");
  s += txt(200, 262, "Voyage limits (1.3.4): passenger craft up to 4 h; cargo craft", { a: "middle", s: 9, c: L });
  s += txt(200, 276, "(500 GT and above) up to 8 h, at operational speed from a place of refuge", { a: "middle", s: 9, c: L });
  DIAGRAMS["hsc-craft-types"] = svg(400, 290, s);
}

// 34. IBC Code Chapter 2: ship types and cargo tank location (2.6.1)
{
  let s = frame(400, 290);
  s += txt(200, 26, "IBC Code: ship types and cargo tank location", { a: "middle", b: true, s: 12 });
  const panel = (x, title, c, side, bot, note) => {
    let o = `<rect x="${x}" y="40" width="120" height="180" rx="6" fill="${c}" fill-opacity="0.08" stroke="${c}"/>`;
    o += txt(x + 60, 58, title, { a: "middle", b: true, s: 11, c });
    // hull section
    o += `<path d="M${x + 14},76 L${x + 14},170 Q${x + 14},186 ${x + 28},186 L${x + 92},186 Q${x + 106},186 ${x + 106},170 L${x + 106},76 Z" fill="#2a2d4a" stroke="${T}" stroke-width="1.4"/>`;
    const sx = side ? 26 : 0, by = bot ? 22 : 0;
    o += `<rect x="${x + 14 + sx}" y="82" width="${92 - 2 * sx}" height="${100 - by - 6}" fill="${c}" fill-opacity="0.35" stroke="${c}"/>`;
    o += txt(x + 60, 126, "cargo", { a: "middle", s: 9.5 }) + txt(x + 60, 138, "tanks", { a: "middle", s: 9.5 });
    o += txt(x + 60, 210, note, { a: "middle", s: 8.5, c: L });
    return o;
  };
  s += panel(14, "Type 1", R, true, true, "side and bottom setback");
  s += panel(140, "Type 2", Y, false, true, "bottom setback only");
  s += panel(266, "Type 3", G, false, false, "no location requirement");
  s += txt(200, 240, "Type 1: most severe damage standard; Type 2 and 3: severe hazards", { a: "middle", s: 9, c: L });
  s += txt(200, 254, "Setbacks equal the damage extents: side B/5 or 11.5 m (less), bottom B/15 or 6 m (less)", { a: "middle", s: 9, c: L });
  s += txt(200, 268, "Types 1 and 2 also: at least 760 mm from the shell plating (2.6.1)", { a: "middle", s: 9, c: L, b: true });
  DIAGRAMS["ibc-ship-types"] = svg(400, 290, s);
}

// 35. IBC Code: key dates
{
  let s = frame(400, 230);
  s += txt(200, 26, "IBC Code: key dates", { a: "middle", b: true, s: 12 });
  const rows = [["17 Jun 1983", "MSC.4(48) adopts the Code (mandatory: MSC.6(48))", A], ["Dec 1985", "MEPC.19(22) extends it to pollution aspects", T], ["1 Jul 1986", "Applies to ships built on or after this date", G], ["10 Dec 2004", "MSC.176(79): 2004 amendments; in force 1 Jan 2007", Y], ["1 Jan 2021", "MEPC.318(74) / MSC.460(101): product chapters 17 and 18", Y], ["1 Jul 2024", "MEPC.345(78) / MSC.526(106): paragraph 2.9.2.1", R]];
  rows.forEach(([d, t, c], i) => {
    const y = 46 + i * 29;
    s += `<circle cx="34" cy="${y + 10}" r="5" fill="${c}"/>`;
    if (i < 5) s += line(34, y + 15, 34, y + 34, L, 1);
    s += txt(48, y + 14, d, { b: true, s: 10, c });
    s += txt(128, y + 14, t, { s: 9 });
  });
  DIAGRAMS["ibc-dates"] = svg(400, 230, s);
}

// 36. IGC Code: ship types and tank location (2.4.1)
{
  let s = frame(400, 280);
  s += txt(200, 26, "IGC Code: ship types and cargo tank location", { a: "middle", b: true, s: 12 });
  const panel = (x, title, sub, c, side) => {
    let o = `<rect x="${x}" y="40" width="120" height="170" rx="6" fill="${c}" fill-opacity="0.08" stroke="${c}"/>`;
    o += txt(x + 60, 58, title, { a: "middle", b: true, s: 11, c });
    o += txt(x + 60, 71, sub, { a: "middle", s: 8.5, c: L });
    o += `<path d="M${x + 14},84 L${x + 14},160 Q${x + 14},176 ${x + 28},176 L${x + 92},176 Q${x + 106},176 ${x + 106},160 L${x + 106},84 Z" fill="#2a2d4a" stroke="${T}" stroke-width="1.4"/>`;
    const sx = side ? 24 : 4;
    o += `<rect x="${x + 14 + sx}" y="88" width="${92 - 2 * sx}" height="66" fill="${c}" fill-opacity="0.35" stroke="${c}"/>`;
    o += txt(x + 60, 124, "cargo", { a: "middle", s: 9.5 }) + txt(x + 60, 136, "tanks", { a: "middle", s: 9.5 });
    o += txt(x + 60, 198, side ? "side + bottom setback" : "bottom setback", { a: "middle", s: 8.5, c: L });
    return o;
  };
  s += panel(14, "Type 1G", "maximum preventive", R, true);
  s += panel(140, "Type 2G / 2PG", "significant preventive", Y, false);
  s += panel(266, "Type 3G", "moderate preventive", G, false);
  s += txt(200, 228, "Side damage: B/5 or 11.5 m (less). Bottom damage, vertical: B/15 or 2 m (less)", { a: "middle", s: 9, c: L });
  s += txt(200, 242, "Minimum distance d from shell: 0.8 m to 2 m depending on tank volume Vc", { a: "middle", s: 9, c: L });
  s += txt(200, 256, "2PG: ships 150 m or less, type C tanks, MARVS at least 0.7 MPa, at least -55 °C", { a: "middle", s: 9, c: L, b: true });
  DIAGRAMS["igc-ship-types"] = svg(400, 280, s);
}

// 37. IGC Code: independent / membrane tank types
{
  let s = frame(400, 264);
  s += txt(200, 26, "IGC Code Chapter 4: containment types", { a: "middle", b: true, s: 12 });
  const rows = [["Type A", "Po below 0.07 MPa", "Complete secondary barrier below -10 °C", A], ["Type B", "Po below 0.07 MPa", "Partial barrier + small leak protection below -10 °C", G], ["Type C", "Po at least 0.2 + A·C·ρ^1.5 MPa", "Design pressure by formula (4.23.1.2)", Y], ["Membrane", "Po normally up to 0.025 MPa", "Complete secondary barrier below -10 °C", R], ["Semi-membrane", "Same limits as membrane", "Same limits as membrane", L], ["Integral", "Po normally up to 0.025 MPa", "Complete barrier if boiling point below -10 °C", T]];
  rows.forEach(([n, p, b, c], i) => {
    const y = 42 + i * 33;
    s += `<rect x="14" y="${y}" width="372" height="28" rx="4" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-opacity="0.6"/>`;
    s += txt(22, y + 12, n, { b: true, s: 10, c });
    s += txt(22, y + 24, p, { s: 8.5, c: L });
    s += txt(160, y + 18, b, { s: 8.5 });
  });
  s += txt(200, 254, "No secondary barrier needed if cargo is at or above -10 °C at atmospheric pressure (4.4.5)", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["igc-tank-types"] = svg(400, 264, s);
}

// 38. IGC Code: key dates
{
  let s = frame(400, 250);
  s += txt(200, 26, "IGC Code: key dates", { a: "middle", b: true, s: 12 });
  const rows = [["17 Jun 1983", "MSC.5(48) adopts the Code (mandatory: MSC.6(48))", A], ["1 Jul 1986", "Original Code in force for ships built from this date", G], ["22 May 2014", "MSC.370(93): complete revision adopted", Y], ["1 Jan 2016", "Revised Code in force; applies from keel 1 Jul 2016", Y], ["1 Jan 2024", "MSC.476(102) and MSC.492(104) in force", T], ["1 Jan 2026", "MSC.523(106): Table 6.3 replaced", T], ["1 Jul 2026", "MSC.566(109): paragraph 16.9.2 replaced", R]];
  rows.forEach(([d, t, c], i) => {
    const y = 42 + i * 28;
    s += `<circle cx="34" cy="${y + 10}" r="5" fill="${c}"/>`;
    if (i < 6) s += line(34, y + 15, 34, y + 33, L, 1);
    s += txt(48, y + 14, d, { b: true, s: 10, c });
    s += txt(128, y + 14, t, { s: 9 });
  });
  DIAGRAMS["igc-dates"] = svg(400, 250, s);
}

// 39. IGF Code structure
{
  let s = frame(400, 308);
  s += txt(200, 26, "IGF Code structure", { a: "middle", b: true, s: 12 });
  const box = (y, h, title, sub, c) => {
    let o = `<rect x="14" y="${y}" width="372" height="${h}" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    o += txt(24, y + 16, title, { b: true, s: 10.5, c });
    sub.forEach((t, i) => { o += txt(24, y + 31 + i * 13, t, { s: 9 }); });
    return o;
  };
  s += box(38, 58, "Part A: General", ["Ch 2 General (application, definitions, alternative design)", "Ch 3 Goal and functional requirements", "Ch 4 General requirements (risk assessment, explosion limits)"], A);
  s += box(104, 98, "Part A-1: Natural gas as fuel", ["Ch 5 Ship design and arrangement   Ch 6 Fuel containment system", "Ch 7 Material and pipe design   Ch 8 Bunkering", "Ch 9 Fuel supply to consumers   Ch 10 Power generation", "Ch 11 Fire safety   Ch 12 Explosion prevention", "Ch 13 Ventilation   Ch 14 Electrical   Ch 15 Control and safety"], G);
  s += box(210, 28, "Part B-1: Ch 16 Manufacture, workmanship and testing", [], Y);
  s += box(246, 24, "Part C-1: Ch 17 Drills   Ch 18 Operation", [], R);
  s += box(274, 24, "Part D: Ch 19 Training", [], L);
  DIAGRAMS["igf-structure"] = svg(400, 308, s);
}

// 40. IGF Code gas detection thresholds
{
  let s = frame(400, 190);
  s += txt(200, 26, "Gas detection set points (15.8)", { a: "middle", b: true, s: 12 });
  const bar = (y, label, a, b) => {
    let o = txt(14, y - 8, label, { s: 9.5, b: true });
    o += `<rect x="14" y="${y}" width="372" height="16" rx="3" fill="#2a2d4a"/>`;
    o += `<rect x="14" y="${y}" width="${372 * a / 100}" height="16" rx="3" fill="${Y}" fill-opacity="0.55"/>`;
    o += `<rect x="${14 + 372 * a / 100}" y="${y}" width="${372 * (b - a) / 100}" height="16" fill="${R}" fill-opacity="0.55"/>`;
    o += txt(14 + 372 * a / 100 - 4, y + 30, `${a}% LEL alarm`, { a: "end", s: 9, c: Y });
    o += txt(14 + 372 * b / 100 - 40, y + 30, `${b}% LEL safety system`, { a: "start", s: 9, c: R });
    return o;
  };
  s += bar(58, "Standard spaces (15.8.6)", 20, 40);
  s += bar(122, "Ventilated ducts around gas pipes in machinery spaces (15.8.7)", 30, 60);
  s += txt(200, 182, "Safety system acts on two detectors", { a: "middle", s: 9, c: L });
  DIAGRAMS["igf-gas-detection"] = svg(400, 190, s);
}

// 41. IGF Code key dates
{
  let s = frame(400, 232);
  s += txt(200, 26, "IGF Code: key dates", { a: "middle", b: true, s: 12 });
  const rows = [["11 Jun 2015", "MSC.391(95) adopts the Code", A], ["1 Jan 2017", "Code takes effect", G], ["1 Jan 2020", "MSC.422(98): paragraph 11.3", T], ["1 Jan 2024", "MSC.458(101) and MSC.475(102)", T], ["1 Jan 2026", "MSC.551(108): fire safety, bunkering, zones, more", Y], ["1 Jan 2028", "MSC.567(109): suction wells, zones, ventilation", Y], ["1 Jul 2028", "Draft: gases or low-flashpoint fuels (pending)", R]];
  rows.forEach(([d, t, c], i) => {
    const y = 40 + i * 27;
    s += `<circle cx="34" cy="${y + 10}" r="5" fill="${c}"/>`;
    if (i < 6) s += line(34, y + 15, 34, y + 31, L, 1);
    s += txt(48, y + 14, d, { b: true, s: 10, c });
    s += txt(128, y + 14, t, { s: 9 });
  });
  DIAGRAMS["igf-dates"] = svg(400, 232, s);
}

// 42. III Code structure
{
  let s = frame(400, 262);
  s += txt(200, 26, "III Code: four parts", { a: "middle", b: true, s: 12 });
  const box = (y, h, title, sub, c) => {
    let o = `<rect x="14" y="${y}" width="372" height="${h}" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    o += txt(24, y + 16, title, { b: true, s: 10.5, c });
    sub.forEach((t, i) => { o += txt(24, y + 31 + i * 13, t, { s: 9 }); });
    return o;
  };
  s += box(38, 44, "Part 1: Common areas (paras 1-14)", ["Objective, strategy, scope, initial actions, information, records, improvement"], A);
  s += box(90, 58, "Part 2: Flag States (paras 15-44)", ["Implementation, delegation of authority, enforcement,", "surveyors, investigations, evaluation and review"], G);
  s += box(156, 44, "Part 3: Coastal States (paras 45-51)", ["Implementation, enforcement, evaluation and review"], Y);
  s += box(208, 44, "Part 4: Port States (paras 52-63)", ["Implementation, enforcement, evaluation and review"], R);
  DIAGRAMS["iii-structure"] = svg(400, 262, s);
}

// 43. III Code key dates
{
  let s = frame(400, 232);
  s += txt(200, 26, "III Code and audit scheme: key dates", { a: "middle", b: true, s: 12 });
  const rows = [["Sep 2006", "Voluntary audits begin (to Dec 2015)", L], ["4 Dec 2013", "A.1070(28) adopts the III Code", A], ["4 Apr 2014", "MEPC.246(66) adopted (MARPOL)", T], ["22 May 2014", "MSC.366(93): new SOLAS chapter XIII", T], ["1 Jan 2016", "Audits and III Code mandatory", G], ["3 Dec 2025", "A.1211(34) adopted (new audit framework)", Y], ["30 Jun 2026", "A.1211(34) replaces A.1067(28)", R]];
  rows.forEach(([d, t, c], i) => {
    const y = 40 + i * 27;
    s += `<circle cx="34" cy="${y + 10}" r="5" fill="${c}"/>`;
    if (i < 6) s += line(34, y + 15, 34, y + 31, L, 1);
    s += txt(48, y + 14, d, { b: true, s: 10, c });
    s += txt(128, y + 14, t, { s: 9 });
  });
  DIAGRAMS["iii-dates"] = svg(400, 232, s);
}

// 44. IMDG Code structure
{
  let s = frame(400, 308);
  s += txt(200, 26, "IMDG Code: parts of the Code", { a: "middle", b: true, s: 12 });
  const rows = [
    ["Vol 1", "Part 1", "General provisions, definitions, training, security", A],
    ["Vol 1", "Part 2", "Classification: classes 1 to 9, marine pollutants (2.10)", A],
    ["Vol 2", "Part 3", "Dangerous Goods List (3.2), special provisions, quantities", G],
    ["Vol 1", "Part 4", "Packing and tank provisions", A],
    ["Vol 1", "Part 5", "Consignment: marking, labelling, placarding, documents", Y],
    ["Vol 1", "Part 6", "Construction and testing of packagings, IBCs, tanks", A],
    ["Vol 1", "Part 7", "Transport operations: stowage, segregation, incidents", R],
  ];
  rows.forEach(([v, p, t, c], i) => {
    const y = 40 + i * 36;
    s += `<rect x="14" y="${y}" width="372" height="30" rx="5" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-opacity="0.7"/>`;
    s += txt(22, y + 13, p, { b: true, s: 10.5, c });
    s += txt(22, y + 25, v, { s: 8.5, c: L });
    s += txt(74, y + 19, t, { s: 9 });
  });
  s += txt(200, 298, "Vol 1 = Parts 1, 2, 4 to 7; Vol 2 = Part 3 and appendices", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["imdg-structure"] = svg(400, 308, s);
}

// 45. IMDG Code amendment cycle
{
  let s = frame(400, 220);
  s += txt(200, 26, "IMDG Code: two-year amendment cycle", { a: "middle", b: true, s: 12 });
  const cols = [["41-22", "MSC.501(105)", "28 Apr 2022", "1 Jan 2023", "1 Jan 2024", T], ["42-24", "MSC.556(108)", "23 May 2024", "1 Jan 2025", "1 Jan 2026", A], ["43-26", "MSC.587(111)", "May 2026", "not confirmed", "1 Jan 2028", Y]];
  s += txt(14, 56, "Amendment", { s: 9, c: L }) + txt(14, 80, "Resolution", { s: 9, c: L }) + txt(14, 104, "Adopted", { s: 9, c: L }) + txt(14, 128, "Voluntary from", { s: 9, c: L }) + txt(14, 152, "Mandatory from", { s: 9, c: L });
  cols.forEach(([a, r, ad, v, m, c], i) => {
    const x = 120 + i * 92;
    s += `<rect x="${x - 4}" y="40" width="88" height="124" rx="5" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-opacity="0.7"/>`;
    s += txt(x + 40, 56, a, { a: "middle", b: true, s: 10.5, c });
    s += txt(x + 40, 80, r, { a: "middle", s: 9 });
    s += txt(x + 40, 104, ad, { a: "middle", s: 9 });
    s += txt(x + 40, 128, v, { a: "middle", s: 9 });
    s += txt(x + 40, 152, m, { a: "middle", s: 9, b: true });
  });
  s += txt(200, 190, "MSC adopts amendments every two years", { a: "middle", s: 9, c: L });
  s += txt(200, 206, "Voluntary use first, then mandatory under SOLAS", { a: "middle", s: 9, c: L });
  DIAGRAMS["imdg-cycle"] = svg(400, 220, s);
}

// 46. IMSBC cargo groups
{
  let s = frame(400, 248);
  s += txt(200, 26, "IMSBC Code: cargo groups (1.7)", { a: "middle", b: true, s: 12 });
  const card = (x, g, h1, h2, ex, c) => {
    let o = `<rect x="${x}" y="40" width="120" height="178" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    o += txt(x + 60, 62, g, { a: "middle", b: true, s: 14, c });
    h1.forEach((t, i) => { o += txt(x + 60, 86 + i * 13, t, { a: "middle", s: 9 }); });
    o += txt(x + 60, 150, "Examples", { a: "middle", s: 8.5, c: L, b: true });
    ex.forEach((t, i) => { o += txt(x + 60, 164 + i * 13, t, { a: "middle", s: 8.5, c: L }); });
    return o;
  };
  s += card(14, "Group A", ["Moisture hazard:", "liquefaction or", "dynamic separation", "above the TML"], 0, ["iron ore fines", "nickel ore", "mineral concentrates"], A);
  s += card(140, "Group B", ["Chemical hazard that", "could create a", "dangerous situation", "on a ship"], 0, ["ammonium nitrate", "fertilizers", "aluminium ferrosilicon"], R);
  s += card(266, "Group C", ["Neither Group A", "nor Group B", "", ""], 0, ["glass cullet"], G);
  s += txt(200, 238, "Coal: Group A and B, unless B only by a test set by the authority", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["imsbc-groups"] = svg(400, 248, s);
}

// 47. IMSBC Group A certificate timing
{
  let s = frame(400, 200);
  s += txt(200, 26, "Group A cargo: certificate timing (4.5)", { a: "middle", b: true, s: 12 });
  s += line(30, 100, 370, 100, L, 2);
  s += `<circle cx="300" cy="100" r="6" fill="${G}"/>`;
  s += txt(312, 122, "Start of loading", { a: "start", b: true, s: 10, c: G });
  s += `<rect x="36" y="70" width="264" height="14" rx="3" fill="${A}" fill-opacity="0.35" stroke="${A}"/>`;
  s += txt(168, 64, "TML test: within 6 months before loading (4.5.1)", { a: "middle", s: 9.5, c: A, b: true });
  s += `<rect x="252" y="106" width="48" height="12" rx="3" fill="${Y}" fill-opacity="0.45" stroke="${Y}"/>`;
  s += txt(252, 138, "Moisture sampling and testing:", { a: "end", s: 9.5, c: Y, b: true });
  s += txt(252, 152, "never more than 7 days before loading (4.5.2)", { a: "end", s: 9.5, c: Y });
  s += txt(200, 186, "New TML test if the cargo's composition or characteristics have changed", { a: "middle", s: 9, c: L });
  DIAGRAMS["imsbc-timing"] = svg(400, 200, s);
}

// 48. IMSBC amendment cycle
{
  let s = frame(400, 220);
  s += txt(200, 26, "IMSBC Code: recent amendments", { a: "middle", b: true, s: 12 });
  const rows = [["06-21", "MSC.500(105)", "1 Jan 2023", "1 Dec 2023", T], ["07-23", "MSC.539(107)", "1 Jan 2024", "1 Jan 2025", A], ["08-25", "MSC.575(110)", "1 Jan 2026", "1 Jan 2027", Y]];
  s += txt(22, 52, "Amendment", { s: 9, c: L }) + txt(100, 52, "Resolution", { s: 9, c: L }) + txt(204, 52, "Voluntary from", { s: 9, c: L }) + txt(300, 52, "Mandatory from", { s: 9, c: L });
  rows.forEach(([a, r, v, m, c], i) => {
    const y = 62 + i * 40;
    s += `<rect x="14" y="${y}" width="372" height="32" rx="5" fill="${c}" fill-opacity="0.1" stroke="${c}" stroke-opacity="0.7"/>`;
    s += txt(22, y + 20, a, { b: true, s: 11, c }) + txt(100, y + 20, r, { s: 9.5 }) + txt(204, y + 20, v, { s: 9.5 }) + txt(300, y + 20, m, { s: 9.5, b: true });
  });
  s += txt(200, 200, "Original Code: adopted 4 Dec 2008 (MSC.268(85)), mandatory 1 Jan 2011", { a: "middle", s: 9, c: L });
  DIAGRAMS["imsbc-amendments"] = svg(400, 220, s);
}

// 49. INF Code ship classes
{
  let s = frame(400, 232);
  s += txt(200, 26, "INF Code ship classes (1.1.2)", { a: "middle", b: true, s: 12 });
  const card = (x, t, lines, c) => {
    let o = `<rect x="${x}" y="40" width="120" height="150" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    o += txt(x + 60, 62, t, { a: "middle", b: true, s: 13, c });
    lines.forEach((l, i) => { o += txt(x + 60, 86 + i * 14, l, { a: "middle", s: 9, b: i === 0 }); });
    return o;
  };
  s += card(14, "INF 1", ["Less than", "4,000 TBq", "aggregate activity,", "any INF cargo"], G);
  s += card(140, "INF 2", ["Fuel or wastes:", "less than 2 x 10^6 TBq", "Plutonium:", "less than 2 x 10^5 TBq"], Y);
  s += card(266, "INF 3", ["No restriction on", "aggregate activity", "", "Not on passenger ships"], R);
  s += txt(200, 214, "Class is set by the total activity of INF cargo the ship carries", { a: "middle", s: 9, c: L });
  DIAGRAMS["inf-classes"] = svg(400, 232, s);
}

// 50. INF Code key figures
{
  let s = frame(400, 250);
  s += txt(200, 26, "INF Code: key figures", { a: "middle", b: true, s: 12 });
  const tile = (x, y, big, l1, l2, c) => {
    let o = `<rect x="${x}" y="${y}" width="182" height="92" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    o += txt(x + 91, y + 38, big, { a: "middle", b: true, s: 24, c });
    o += txt(x + 91, y + 60, l1, { a: "middle", s: 9.5 });
    o += txt(x + 91, y + 74, l2, { a: "middle", s: 8.5, c: L });
    return o;
  };
  s += tile(14, 40, "55 °C", "Cargo space average", "ambient temperature, at most (4.1)", Y);
  s += tile(204, 40, "36 h", "Alternative power", "INF 2 and 3 (7.2)", G);
  s += tile(14, 142, "1.5 g", "Securing: long. and transverse", "1.0 g vertically up, 2.0 g down (6.1)", A);
  s += tile(204, 142, "4,000 TBq", "INF 1 limit", "INF 2: 2 x 10^6 TBq (fuel), 2 x 10^5 (Pu)", R);
  DIAGRAMS["inf-requirements"] = svg(400, 250, s);
}

// 51. IP Code people thresholds
{
  let s = frame(400, 250);
  s += txt(200, 26, "IP Code: how many people on board", { a: "middle", b: true, s: 12 });
  // scale bar
  const X = (n) => 24 + (n / 300) * 352;
  s += `<rect x="${X(0)}" y="70" width="${X(12) - X(0)}" height="22" fill="${L}" fill-opacity="0.25" stroke="${L}"/>`;
  s += `<rect x="${X(12)}" y="70" width="${X(60) - X(12)}" height="22" fill="${G}" fill-opacity="0.3" stroke="${G}"/>`;
  s += `<rect x="${X(60)}" y="70" width="${X(240) - X(60)}" height="22" fill="${Y}" fill-opacity="0.3" stroke="${Y}"/>`;
  s += `<rect x="${X(240)}" y="70" width="${X(300) - X(240)}" height="22" fill="${R}" fill-opacity="0.3" stroke="${R}"/>`;
  [[0, "0"], [12, "12"], [60, "60"], [240, "240"]].forEach(([n, l]) => { s += txt(X(n), 108, l, { a: "middle", s: 9.5, b: true }); });
  const lines = [
    ["12 or fewer", "IP Code not triggered", L],
    ["Over 12", "IP Code applies: Industrial Personnel Safety Certificate", G],
    ["Over 60", "SOLAS III as passenger ships; fire safety as ship with 36 or fewer", Y],
    ["Over 240", "Subdivision and fire safety as passenger ship", R],
  ];
  lines.forEach(([a, b, c], i) => {
    const y = 134 + i * 26;
    s += `<rect x="14" y="${y - 12}" width="6" height="18" rx="2" fill="${c}"/>`;
    s += txt(28, y, a, { s: 9.5, b: true, c });
    s += txt(98, y, b, { s: 8.5 });
  });
  s += txt(200, 242, "Count = industrial personnel + special personnel + passengers (passengers capped at 12)", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["ip-thresholds"] = svg(400, 252, s);
}

// 52. IP Code flow: before and during transfer
{
  let s = frame(400, 250);
  s += txt(200, 26, "Industrial personnel: from joining to transfer", { a: "middle", b: true, s: 12 });
  const steps = [["1", "Fit and trained", "Age 16 or over, medical proof, training, documents to master", A], ["2", "Ship familiarization", "Before departure or on boarding: layout, muster, escape, alarms", G], ["3", "Transfer briefing", "Before transfer: procedures, arrangements, added safety equipment", Y], ["4", "Safe transfer", "Job safety analysis, checked equipment, lit route, headcount", R]];
  steps.forEach(([n, t, d, c], i) => {
    const y = 40 + i * 52;
    s += `<rect x="14" y="${y}" width="372" height="44" rx="6" fill="${c}" fill-opacity="0.1" stroke="${c}"/>`;
    s += `<circle cx="34" cy="${y + 22}" r="11" fill="${c}"/>` + txt(34, y + 26, n, { a: "middle", b: true, s: 11, c: BG });
    s += txt(56, y + 17, t, { b: true, s: 10.5, c });
    s += txt(56, y + 33, d, { s: 8.5 });
  });
  DIAGRAMS["ip-flow"] = svg(400, 250, s);
}

// 53. IS Code GZ curve criteria
{
  let s = frame(400, 318);
  s += txt(200, 26, "IS Code 2.2: righting lever (GZ) criteria", { a: "middle", b: true, s: 12 });
  const x0 = 50, y0 = 168, sx = 5.0, sy = 100;
  const X = (d) => x0 + d * sx, Y_ = (m) => y0 - m * sy;
  const gz = (d) => 0.0185 * d * Math.exp(-d / 38) * 3.2;
  const pts = (a, b) => { let p = []; for (let d = a; d <= b; d += 1) p.push(`${X(d)},${Y_(gz(d))}`); return p; };
  s += `<polygon points="${X(0)},${y0} ${pts(0, 30).join(" ")} ${X(30)},${y0}" fill="${A}" fill-opacity="0.3"/>`;
  s += `<polygon points="${X(30)},${y0} ${pts(30, 40).join(" ")} ${X(40)},${y0}" fill="${Y}" fill-opacity="0.4"/>`;
  s += line(x0, y0, x0 + 66 * sx, y0, L, 1.2) + line(x0, y0, x0, 46, L, 1.2);
  s += `<polyline points="${pts(0, 66).join(" ")}" fill="none" stroke="${G}" stroke-width="2.2"/>`;
  s += `<line x1="${X(30)}" y1="${y0}" x2="${X(30)}" y2="${Y_(0.2)}" stroke="${R}" stroke-width="1.5" stroke-dasharray="3 2"/>`;
  s += `<line x1="${x0}" y1="${Y_(0.2)}" x2="${X(30)}" y2="${Y_(0.2)}" stroke="${R}" stroke-width="1" stroke-dasharray="3 2"/>`;
  [0, 30, 40].forEach((d) => { s += txt(X(d), y0 + 13, d + "°", { a: "middle", s: 9, c: L }); });
  s += txt(x0 - 6, 50, "GZ", { a: "end", s: 8.5, c: L });
  s += txt(X(66), y0 + 13, "heel", { a: "end", s: 8.5, c: L });
  s += txt(X(15), Y_(0.07), "area to 30°", { a: "middle", s: 8.5, c: T });
  const lg = [["Area 0 to 30°: at least 0.055 m·rad", T], ["Area 0 to 40°: at least 0.09 m·rad", A], ["Area 30° to 40°: at least 0.03 m·rad", Y], ["GZ at 30° or more: at least 0.20 m", R], ["Maximum GZ at 25° or more", G], ["Initial GM at least 0.15 m", T]];
  lg.forEach(([a, c], i) => { s += `<rect x="30" y="${198 + i * 14 - 8}" width="8" height="8" rx="2" fill="${c}"/>` + txt(46, 198 + i * 14, a, { s: 9 }); });
  s += txt(200, 308, "Free surface is deducted; 40° or the downflooding angle, if less", { a: "middle", s: 8.5, c: L });
  DIAGRAMS["is-gz-criteria"] = svg(400, 318, s);
}

// 54. IS Code weather criterion
{
  let s = frame(400, 270);
  s += txt(200, 26, "IS Code 2.3: weather criterion", { a: "middle", b: true, s: 12 });
  const x0 = 40, y0 = 190, sx = 4.8, sy = 120;
  const X = (d) => x0 + d * sx, Y_ = (m) => y0 - m * sy;
  const gz = (d) => 0.0185 * d * Math.exp(-d / 40) * 3.6;
  s += line(x0, y0, x0 + 66 * sx, y0, L, 1.2) + line(x0, y0, x0, 48, L, 1.2);
  let p = []; for (let d = 0; d <= 66; d += 1) p.push(`${X(d)},${Y_(gz(d))}`);
  s += `<polyline points="${p.join(" ")}" fill="none" stroke="${G}" stroke-width="2.2"/>`;
  s += `<line x1="${x0}" y1="${Y_(0.25)}" x2="${X(60)}" y2="${Y_(0.25)}" stroke="${Y}" stroke-width="1.5"/>`;
  s += `<line x1="${x0}" y1="${Y_(0.375)}" x2="${X(60)}" y2="${Y_(0.375)}" stroke="${R}" stroke-width="1.5"/>`;
  s += txt(X(60) + 4, Y_(0.25) + 3, "lw1", { s: 9, c: Y, b: true }) + txt(X(60) + 4, Y_(0.375) + 3, "lw2", { s: 9, c: R, b: true });
  const f = (lv) => { for (let d = 1; d < 60; d += 0.1) if (gz(d) >= lv) return d; };
  const p0 = f(0.25);
  s += `<line x1="${X(p0)}" y1="${y0}" x2="${X(p0)}" y2="${Y_(0.25)}" stroke="${Y}" stroke-dasharray="3 2"/>`;
  s += txt(X(p0), y0 + 13, "φ0", { a: "middle", s: 9.5, c: Y, b: true });
  s += txt(200, 224, "Steady wind lever lw1 at 504 Pa; gust lever lw2 = 1.5 x lw1", { a: "middle", s: 9, c: T });
  s += txt(200, 238, "Heel under steady wind φ0: at most 16° or 80% of deck-edge immersion angle", { a: "middle", s: 9, c: L });
  s += txt(200, 252, "Area b must be at least area a (after rolling to windward by φ1)", { a: "middle", s: 9, c: L });
  DIAGRAMS["is-weather"] = svg(400, 270, s);
}

// 55. ISM elements
{
  let s = frame(400, 300);
  s += txt(200, 26, "ISM Code: 16 elements", { a: "middle", b: true, s: 12 });
  const A_ = ["1 General", "2 Policy", "3 Company duties", "4 Designated Person", "5 Master's authority", "6 Resources, personnel", "7 Shipboard operations", "8 Emergencies", "9 Reports, analysis", "10 Maintenance", "11 Documentation", "12 Review, audit"];
  s += txt(20, 48, "PART A: Implementation", { c: A, b: true, s: 10.5 });
  A_.forEach((a, i) => {
    const c = i % 2, r = Math.floor(i / 2);
    s += `<rect x="${20 + c * 182}" y="${56 + r * 24}" width="176" height="20" rx="4" fill="#1d2040" stroke="${A}" stroke-width="0.8"/>` + txt(28 + c * 182, 70 + r * 24, a, { s: 9.5 });
  });
  s += txt(20, 218, "PART B: Certification", { c: G, b: true, s: 10.5 });
  const B_ = ["13 Certification", "14 Interim", "15 Verification", "16 Forms"];
  B_.forEach((a, i) => {
    const c = i % 2, r = Math.floor(i / 2);
    s += `<rect x="${20 + c * 182}" y="${226 + r * 24}" width="176" height="20" rx="4" fill="#1d2040" stroke="${G}" stroke-width="0.8"/>` + txt(28 + c * 182, 240 + r * 24, a, { s: 9.5 });
  });
  s += txt(200, 284, "Part A: the SMS · Part B: certificates and audits", { a: "middle", s: 9, c: L });
  DIAGRAMS["ism-elements"] = svg(400, 300, s);
}

// 56. ISM certificate cycle
{
  let s = frame(400, 250);
  s += txt(200, 26, "5-year certificate cycle", { a: "middle", b: true, s: 12 });
  const x0 = 40, x1 = 360, y = 90, k = (x1 - x0) / 5;
  s += line(x0, y, x1, y, L, 2);
  for (let i = 0; i <= 5; i++) {
    s += `<circle cx="${x0 + i * k}" cy="${y}" r="4" fill="${i == 0 || i == 5 ? A : Y}"/>` + txt(x0 + i * k, y + 18, i == 0 ? "Issue" : i == 5 ? "Expiry" : "Year " + i, { a: "middle", s: 9, c: L });
  }
  s += `<rect x="${x0 + 2 * k}" y="${y - 30}" width="${k}" height="16" rx="3" fill="${G}" fill-opacity="0.35" stroke="${G}"/>` + txt(x0 + 2.5 * k, y - 18, "SMC intermediate", { a: "middle", s: 8.5 });
  s += txt(200, 140, "DOC: annual verification each year, ±3 months of anniversary", { a: "middle", s: 9.5, c: T });
  s += txt(200, 158, "SMC: at least one intermediate; if only one, year 2 to 3", { a: "middle", s: 9.5, c: T });
  s += txt(200, 186, "Interim DOC: up to 12 months", { a: "middle", s: 9.5, c: A });
  s += txt(200, 202, "Interim SMC: up to 6 months (+ up to 6 months)", { a: "middle", s: 9.5, c: A });
  s += txt(200, 226, "Endorsement up to 5 months · voyage extension up to 3 months", { a: "middle", s: 9, c: L });
  DIAGRAMS["ism-certificates"] = svg(400, 250, s);
}

// 57. ISM dates
{
  let s = frame(400, 290);
  s += txt(200, 26, "ISM Code timeline", { a: "middle", b: true, s: 12 });
  const rows = [["4 Nov 1993", "A.741(18) adopts the Code", A], ["1 Jul 1998", "Mandatory: passenger, tankers, bulk", G], ["1 Jul 2002", "Other cargo ships, MODUs; MSC.104(73)", G], ["1 Jul 2006", "MSC.179(79) in force", Y], ["1 Jan 2009", "MSC.195(80) in force", Y], ["1 Jul 2010", "MSC.273(85) in force", Y], ["1 Jan 2015", "MSC.353(92) in force", Y], ["1 Jan 2021", "Cyber risk by next DOC audit", R]];
  s += line(100, 44, 100, 268, L, 1.5);
  rows.forEach(([d, t, c], i) => {
    const y = 56 + i * 27;
    s += `<circle cx="100" cy="${y}" r="4.5" fill="${c}"/>` + txt(92, y + 4, d, { a: "end", s: 9.5, c: c, b: true }) + txt(112, y + 4, t, { s: 9.5 });
  });
  DIAGRAMS["ism-dates"] = svg(400, 290, s);
}

// 58. ISPS flow
{
  let s = frame(400, 250);
  s += txt(200, 26, "ISPS: assessment, plan, certificate", { a: "middle", b: true, s: 12 });
  const bx = (x, y, w, t, c) => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="6" fill="#1d2040" stroke="${c}"/>` + txt(x + w / 2, y + 21, t, { a: "middle", s: 10 });
  s += txt(20, 52, "SHIP", { c: A, b: true, s: 10 });
  s += bx(20, 58, 105, "SSA (CSO)", A) + bx(147, 58, 105, "SSP (approved)", A) + bx(274, 58, 106, "ISSC", G);
  s += arrow(125, 75, 147, 75, A) + arrow(252, 75, 274, 75, G);
  s += txt(20, 130, "PEOPLE", { c: Y, b: true, s: 10 });
  s += bx(20, 136, 105, "CSO (Company)", Y) + bx(147, 136, 105, "SSO (each ship)", Y) + bx(274, 136, 106, "Master: authority", R);
  s += txt(20, 198, "PORT FACILITY", { c: L, b: true, s: 10 });
  s += txt(20, 216, "PFSA  →  PFSP  →  PFSO   (Part A, 14–18)", { s: 10 });
  s += txt(200, 238, "Part A mandatory · Part B guidance", { a: "middle", s: 9, c: L });
  DIAGRAMS["isps-flow"] = svg(400, 250, s);
}

// 59. ISPS levels
{
  let s = frame(400, 214);
  s += txt(200, 26, "Security levels", { a: "middle", b: true, s: 12 });
  [["1", "Minimum measures, at all times", G], ["2", "Heightened risk: extra measures", Y], ["3", "Incident probable or imminent", R]].forEach(([n, t, c], i) => {
    const y = 42 + i * 50;
    s += `<rect x="20" y="${y}" width="360" height="40" rx="6" fill="#1d2040" stroke="${c}"/><circle cx="46" cy="${y + 20}" r="13" fill="${c}"/>` + txt(46, y + 25, n, { a: "middle", b: true, s: 14, c: BG }) + txt(70, y + 25, t, { s: 11 });
  });
  s += txt(200, 200, "Set by the Contracting Government · may go from 1 to 3", { a: "middle", s: 9, c: L });
  DIAGRAMS["isps-levels"] = svg(400, 214, s);
}

// 60. ISPS cycle
{
  let s = frame(400, 190);
  s += txt(200, 26, "ISSC: up to 5 years", { a: "middle", b: true, s: 12 });
  const x0 = 40, x1 = 360, y = 80, k = (x1 - x0) / 5;
  s += line(x0, y, x1, y, L, 2);
  for (let i = 0; i <= 5; i++) s += `<circle cx="${x0 + i * k}" cy="${y}" r="4" fill="${i == 0 || i == 5 ? A : Y}"/>` + txt(x0 + i * k, y + 18, i == 0 ? "Issue" : i == 5 ? "Renewal" : "Year " + i, { a: "middle", s: 9, c: L });
  s += `<rect x="${x0 + 2 * k}" y="${y - 30}" width="${k}" height="16" rx="3" fill="${G}" fill-opacity="0.35" stroke="${G}"/>` + txt(x0 + 2.5 * k, y - 18, "Intermediate", { a: "middle", s: 8.5 });
  s += txt(200, 134, "Interim ISSC: 6 months, cannot be extended", { a: "middle", s: 10, c: A });
  s += txt(200, 156, "Intermediate (one only): between 2nd and 3rd anniversary", { a: "middle", s: 9.5 });
  DIAGRAMS["isps-cycle"] = svg(400, 190, s);
}

// 61. LSA structure
{
  let s = frame(400, 290);
  s += txt(200, 26, "LSA Code: 7 chapters", { a: "middle", b: true, s: 12 });
  const ch = [["I", "General", L], ["II", "Personal LSA: lifebuoy, jacket, suit", A], ["III", "Visual signals", Y], ["IV", "Survival craft: rafts, lifeboats", G], ["V", "Rescue boats", G], ["VI", "Launching, embarkation", R], ["VII", "Line-throwing, alarms", L]];
  ch.forEach(([n, t, c], i) => {
    const y = 42 + i * 34;
    s += `<rect x="20" y="${y}" width="360" height="28" rx="5" fill="#1d2040" stroke="${c}"/><rect x="20" y="${y}" width="40" height="28" rx="5" fill="${c}" fill-opacity="0.35"/>` + txt(40, y + 19, n, { a: "middle", b: true, s: 11 }) + txt(70, y + 19, t, { s: 10.5 });
  });
  DIAGRAMS["lsa-structure"] = svg(400, 290, s);
}

// 62. LSA dates
{
  let s = frame(400, 300);
  s += txt(200, 26, "Entry into force", { a: "middle", b: true, s: 12 });
  const rows = [["1 Jul 1998", "MSC.48(66): the Code", A], ["1 Jul 2008", "MSC.218(82)", Y], ["1 Jul 2010", "MSC.207(81), MSC.272(85)", Y], ["1 Jan 2012", "MSC.293(87)", Y], ["1 Jan 2013", "MSC.320(89)", Y], ["1 Jan 2016", "MSC.368(93)", Y], ["1 Jan 2020", "MSC.425(98)", Y], ["1 Jan 2024", "MSC.459(101), MSC.485(103)", Y], ["1 Jan 2026", "MSC.535(107), MSC.554(108)", G], ["1 Jan 2029", "Enclosed lifeboat ventilation fitted", R]];
  s += line(100, 44, 100, 282, L, 1.5);
  rows.forEach(([d, t, c], i) => {
    const y = 54 + i * 24;
    s += `<circle cx="100" cy="${y}" r="4.5" fill="${c}"/>` + txt(92, y + 4, d, { a: "end", s: 9.5, c, b: true }) + txt(112, y + 4, t, { s: 9.5 });
  });
  DIAGRAMS["lsa-dates"] = svg(400, 300, s);
}

// 63. LSA craft numbers
{
  let s = frame(400, 250);
  s += txt(200, 26, "Survival craft key figures", { a: "middle", b: true, s: 12 });
  const t = [["18 m", "Liferaft drop test"], ["6", "Liferaft min persons"], ["3 / 10 min", "Boarding: cargo / passenger"], ["-15 °C", "Lifeboat engine, 2 min"], ["6 kn · 24 h", "Lifeboat speed, fuel"], ["8 min", "Fire-protected, oil fire"]];
  t.forEach(([a, b], i) => {
    const c = i % 2, r = Math.floor(i / 2), x = 20 + c * 186, y = 44 + r * 62;
    s += `<rect x="${x}" y="${y}" width="174" height="52" rx="7" fill="#1d2040" stroke="${[A, A, G, G, G, R][i]}"/>` + txt(x + 87, y + 24, a, { a: "middle", b: true, s: 15 }) + txt(x + 87, y + 42, b, { a: "middle", s: 9.5, c: L });
  });
  s += txt(200, 240, "Lifeboats: 4.4 · liferafts: 4.1", { a: "middle", s: 9, c: L });
  DIAGRAMS["lsa-craft"] = svg(400, 250, s);
}

// 64. MASS structure
{
  let s = frame(400, 290);
  s += txt(200, 26, "MASS Code structure", { a: "middle", b: true, s: 12 });
  const P = [["PART I", "Introduction", "Ch 1–4: purpose, application, structure, definitions", A, 44], ["PART II", "Principles", "Ch 5–15: certificates, approval, risk, ConOps, SMS, security, manning", G, 108], ["PART III", "Goals and requirements", "Ch 16–24: navigation, connectivity, remote ops, SAR, machinery", Y, 172]];
  P.forEach(([a, b, c, col, y]) => {
    s += `<rect x="20" y="${y}" width="360" height="56" rx="7" fill="#1d2040" stroke="${col}"/>` + txt(32, y + 20, a, { c: col, b: true, s: 10.5 }) + txt(100, y + 20, b, { b: true, s: 11 }) + txt(32, y + 42, c, { s: 9.2, c: L });
  });
  s += txt(200, 250, "Appendix: certificate and record formats", { a: "middle", s: 9.5, c: L });
  s += txt(200, 268, "Annex 1: approval process · Annex 2: ConOps framework", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["mass-structure"] = svg(400, 290, s);
}

// 65. MASS timeline
{
  let s = frame(400, 260);
  s += txt(200, 26, "MASS Code timeline", { a: "middle", b: true, s: 12 });
  const rows = [["21 May 2026", "Code adopted: MSC.595(111)", A], ["1 Jul 2026", "Takes effect (non-mandatory)", G], ["Dec 2026", "MSC 112: EBP working group", Y], ["2028", "Mandatory Code work starts", Y], ["By 1 Jul 2030", "Expected adoption", Y], ["1 Jan 2032", "Expected entry into force", R]];
  s += line(110, 44, 110, 234, L, 1.5);
  rows.forEach(([d, t, c], i) => {
    const y = 56 + i * 32;
    s += `<circle cx="110" cy="${y}" r="4.5" fill="${c}"/>` + txt(102, y + 4, d, { a: "end", s: 9.5, c, b: true }) + txt(122, y + 4, t, { s: 9.5 });
  });
  s += txt(200, 250, "Dates after 2026 are expected, not fixed", { a: "middle", s: 9, c: L });
  DIAGRAMS["mass-timeline"] = svg(400, 260, s);
}

// 66. MASS approval
{
  let s = frame(400, 270);
  s += txt(200, 26, "Approval: five steps (6.1.6)", { a: "middle", b: true, s: 12 });
  const st = ["1 Preliminary design development", "2 Preliminary design approval", "3 Testing, simulation, verification", "4 Final approval", "5 Operation"];
  st.forEach((t, i) => {
    const y = 42 + i * 40;
    s += `<rect x="30" y="${y}" width="340" height="30" rx="6" fill="#1d2040" stroke="${i == 4 ? G : A}"/>` + txt(44, y + 20, t, { s: 10.5 });
    if (i < 4) s += arrow(200, y + 30, 200, y + 40, L);
  });
  s += txt(200, 258, "ConOps is the base document at every step", { a: "middle", s: 9.5, c: L });
  DIAGRAMS["mass-approval"] = svg(400, 270, s);
}
