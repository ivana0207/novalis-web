// Generates a seamless fruit & veg line-pattern tile (sizes/colours matched to the supplied reference image).
const fs = require('fs');
const W = 900, H = 1000, SW = 5;
const C = { green: '#1F2518', red: '#2A1916', orange: '#2B1F17', yellow: '#2B2517', pit: '#1F1914' };
const p = (d, c) => `<path d="${d}" stroke="${C[c]}"/>`;
const circ = (r, c, cy = 0) => `<circle cx="0" cy="${cy}" r="${r}" stroke="${C[c]}"/>`;

const spokes = Array.from({ length: 8 }, (_, k) => {
  const a = k * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
  return `M${(6 * c).toFixed(1)},${(6 * s).toFixed(1)} L${(40 * c).toFixed(1)},${(40 * s).toFixed(1)}`;
}).join(' ');
const petals = Array.from({ length: 8 }, (_, k) =>
  `<ellipse cx="0" cy="-23" rx="8" ry="13" transform="rotate(${k * 45})" stroke="${C.red}"/>`).join('');
const diamonds = [[28, 5], [8, -5], [-12, 5], [-32, -5], [-52, 5], [-72, -5]]
  .map(([cy, dx]) => `M${dx},${cy - 12} L${dx + 13},${cy} L${dx},${cy + 12} L${dx - 13},${cy} Z`).join(' ');

// name: [svg, bbox [x0,y0,x1,y1]]
const ICONS = {
  avocado: [p('M0,-58 C20,-58 28,-34 34,-8 C41,22 34,58 0,58 C-34,58 -41,22 -34,-8 C-28,-34 -20,-58 0,-58 Z', 'green') + circ(17, 'pit', 20), [-40, -61, 40, 61]],
  carrot: [p('M-28,-52 Q-28,-60 -20,-60 L20,-60 Q28,-60 28,-52 L6,88 Q0,97 -6,88 Z M-25,-30 h15 M-20,-2 h13 M-15,26 h11 M-11,54 h8', 'orange') +
    p('M0,-60 C-7,-78 -3,-94 0,-100 C3,-94 7,-78 0,-60 Z M-2,-60 C-10,-72 -24,-88 -34,-92 C-32,-78 -18,-64 -2,-60 Z M2,-60 C10,-72 24,-88 34,-92 C32,-78 18,-64 2,-60 Z', 'green'), [-37, -103, 37, 98]],
  asparagus: [p('M-9,40 L-9,98 Q-9,102 -5,102 L5,102 Q9,102 9,98 L9,20 ' + diamonds + ' M-7,-80 C-7,-98 7,-98 7,-80', 'green'), [-21, -97, 21, 105]],
  apple: [p('M0,-30 C12,-42 50,-42 52,-5 C54,30 30,48 12,46 C6,45 4,42 0,42 C-4,42 -6,45 -12,46 C-30,48 -54,30 -52,-5 C-50,-42 -12,-42 0,-30 Z M0,-30 C0,-38 2,-46 4,-52 M4,-44 C12,-54 24,-53 28,-49 C20,-40 10,-40 4,-44 Z', 'red'), [-56, -55, 56, 49]],
  orange: [circ(54, 'orange') + circ(44, 'orange') + circ(5, 'orange') + p(spokes, 'orange'), [-57, -57, 57, 57]],
  pomegranate: [circ(54, 'red') + circ(45, 'red') + petals + circ(6, 'red'), [-57, -57, 57, 57]],
  broccoli: [p('M-50,12 C-72,10 -74,-24 -52,-30 C-54,-56 -20,-66 -6,-48 C4,-70 44,-66 44,-38 C68,-40 76,-4 54,10 C40,20 22,12 14,8 L-14,8 C-24,14 -40,18 -50,12 Z M-44,-12 C-40,-22 -28,-22 -24,-12 M8,-28 C12,-38 26,-38 30,-28 M-16,-2 C-12,-12 0,-12 4,-2 M34,-6 C38,-14 48,-14 52,-6', 'green') +
    p('M-16,8 L-20,66 Q-20,70 -16,70 L16,70 Q20,70 20,66 L16,8 M-6,8 L-2,32 M8,8 L3,30', 'yellow'), [-74, -65, 72, 73]],
  lemon: [p('M-50,0 C-50,-26 -24,-38 0,-38 C24,-38 50,-26 50,0 C50,26 24,38 0,38 C-24,38 -50,26 -50,0 Z M-50,-7 C-60,-6 -60,6 -50,7 M50,-7 C60,-6 60,6 50,7 M-6,26 C14,28 30,18 34,4', 'yellow'), [-60, -41, 60, 41]],
  pear: [p('M0,-48 C14,-48 16,-30 20,-14 C25,2 42,16 42,38 C42,62 22,72 0,72 C-22,72 -42,62 -42,38 C-42,16 -25,2 -20,-14 C-16,-30 -14,-48 0,-48 Z M0,-48 L0,-66', 'green'), [-45, -68, 45, 75]],
  leaf: [p('M0,-30 C17,-14 17,14 0,30 C-17,14 -17,-14 0,-30 Z M0,-24 L0,24', 'green'), [-16, -33, 16, 33]]
};
const COUNTS = { broccoli: 3, orange: 3, pomegranate: 3, carrot: 4, asparagus: 4, pear: 4, avocado: 4, apple: 4, lemon: 3, leaf: 6 };

// seeded PRNG so the tile is reproducible
let seed = +(process.env.SEED || 7);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

const wrapD = (d, L) => { d = Math.abs(d) % L; return Math.min(d, L - d); };
function gap(a, b) { // separation between two placed bboxes on the torus
  const ax = (a.b[0] + a.b[2]) / 2 + a.x, ay = (a.b[1] + a.b[3]) / 2 + a.y;
  const bx = (b.b[0] + b.b[2]) / 2 + b.x, by = (b.b[1] + b.b[3]) / 2 + b.y;
  const gx = wrapD(ax - bx, W) - ((a.b[2] - a.b[0]) + (b.b[2] - b.b[0])) / 2;
  const gy = wrapD(ay - by, H) - ((a.b[3] - a.b[1]) + (b.b[3] - b.b[1])) / 2;
  return Math.max(gx, gy);
}
const order = Object.entries(COUNTS).flatMap(([k, n]) => Array(n).fill(k))
  .sort((a, b) => { const A = ICONS[a][1], B = ICONS[b][1]; return (B[2] - B[0]) * (B[3] - B[1]) - (A[2] - A[0]) * (A[3] - A[1]); });
const placed = [], MIN = +(process.env.MIN || 22), SAME = +(process.env.SAME || 110);
for (const t of order) {
  let best = null, bestScore = -1;
  for (let i = 0; i < 1500; i++) {
    const c = { t, b: ICONS[t][1], x: rnd() * W, y: rnd() * H };
    let score = Infinity, ok = true;
    for (const q of placed) {
      const g = gap(c, q);
      if (g < MIN || (q.t === c.t && g < SAME)) { ok = false; break; }
      score = Math.min(score, g);
    }
    if (ok && score > bestScore) { best = c; bestScore = score; }
  }
  if (best) placed.push(best); else console.error('could not place', t);
}

let uses = '';
for (const q of placed) for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) {
  const x = q.x + ox, y = q.y + oy;
  if (x + q.b[2] + 4 < 0 || x + q.b[0] - 4 > W || y + q.b[3] + 4 < 0 || y + q.b[1] - 4 > H) continue;
  uses += `<use href="#${q.t}" xlink:href="#${q.t}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<!-- Novalis fruit & veg line pattern · seamless tile · generated -->` +
  `<defs><g fill="none" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round">` +
  Object.entries(ICONS).map(([k, [s]]) => `<g id="${k}">${s}</g>`).join('') + `</g></defs>` +
  `<g fill="none" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round">${uses}</g></svg>\n`;
fs.writeFileSync(process.argv[2], svg);
console.log('placed', placed.length, 'of', order.length, '· bytes', svg.length);
