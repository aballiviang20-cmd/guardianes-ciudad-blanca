// Detecta los ojos de cada sprite (esclerótica blanca con pupila oscura adentro) y escribe
// app/public/personajes/ojos.json para que la app dibuje párpados que parpadean encima.
// Uso: node ojos.mjs <carpeta-personajes>
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
const out = {};
const hex = (r, g, b) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".webp"))) {
  const name = file.replace(/\.webp$/, "");
  const { data, info } = await sharp(path.join(dir, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const isFace = name.includes("-cara-");
  const maxY = Math.round(H * (isFace ? 0.85 : 0.42));
  const px = (x, y) => {
    const i = (y * W + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  const isWhite = (x, y) => {
    const p = px(x, y);
    return p[3] > 200 && p[0] > 212 && p[1] > 212 && p[2] > 205 && Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) < 34;
  };
  // componentes blancos en la zona de la cabeza
  const lab = new Int32Array(W * maxY).fill(-1);
  const comps = [];
  for (let y0 = 0; y0 < maxY; y0++)
    for (let x0 = 0; x0 < W; x0++) {
      if (lab[y0 * W + x0] >= 0 || !isWhite(x0, y0)) continue;
      const c = { x0, y0, x1: x0, y1: y0, n: 0 };
      const st = [y0 * W + x0];
      lab[y0 * W + x0] = comps.length;
      while (st.length) {
        const p = st.pop();
        const x = p % W, y = (p / W) | 0;
        c.n++;
        if (x < c.x0) c.x0 = x;
        if (x > c.x1) c.x1 = x;
        if (y < c.y0) c.y0 = y;
        if (y > c.y1) c.y1 = y;
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
          if (nx < 0 || ny < 0 || nx >= W || ny >= maxY) continue;
          const q = ny * W + nx;
          if (lab[q] < 0 && isWhite(nx, ny)) {
            lab[q] = comps.length;
            st.push(q);
          }
        }
      }
      comps.push(c);
    }
  // candidato a ojo: tamaño razonable y con pupila oscura dentro de su caja
  const minN = isFace ? 30 : 10;
  const cands = comps.filter((c) => {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    if (c.n < minN || w > W * (isFace ? 0.34 : 0.2) || h > H * (isFace ? 0.36 : 0.16) || w < 3 || h < 3) return false;
    let dark = 0, tot = 0;
    for (let y = c.y0; y <= c.y1; y++)
      for (let x = c.x0; x <= c.x1; x++) {
        tot++;
        if (lum(px(x, y)) < 95) dark++;
      }
    c.dark = dark / tot;
    // la pupila está en el centro: el contorno de un mechón blanco no cuenta
    let cd = 0, ct = 0;
    for (let y = Math.round(c.y0 + h * 0.2); y <= c.y1 - h * 0.2; y++)
      for (let x = Math.round(c.x0 + w * 0.2); x <= c.x1 - w * 0.2; x++) {
        ct++;
        if (lum(px(x, y)) < 95) cd++;
      }
    return c.dark > 0.08 && ct > 0 && cd / ct > 0.12;
  });
  // mejor par alineado horizontalmente
  let best = null;
  for (let i = 0; i < cands.length; i++)
    for (let j = i + 1; j < cands.length; j++) {
      const a = cands[i], b = cands[j];
      const ha = a.y1 - a.y0 + 1, hb = b.y1 - b.y0 + 1, wa = a.x1 - a.x0 + 1, wb = b.x1 - b.x0 + 1;
      const cya = (a.y0 + a.y1) / 2, cyb = (b.y0 + b.y1) / 2, cxa = (a.x0 + a.x1) / 2, cxb = (b.x0 + b.x1) / 2;
      const ratio = Math.max(a.n, b.n) / Math.min(a.n, b.n);
      const dx = Math.abs(cxa - cxb), avgW = (wa + wb) / 2;
      if (ratio > 3 || Math.abs(cya - cyb) > Math.max(ha, hb) * 0.7 || dx < avgW * 1.05 || dx > avgW * 6) continue;
      const score = a.n + b.n;
      if (!best || score > best.score) best = { a, b, score };
    }
  if (!best) continue;
  const eyes = [best.a, best.b].sort((p, q) => p.x0 - q.x0);
  // color de piel: entre los ojos o debajo; se descartan muestras oscuras o blancas
  const samples = [];
  const midX = Math.round((eyes[0].x1 + eyes[1].x0) / 2), midY = Math.round((eyes[0].y0 + eyes[0].y1 + eyes[1].y0 + eyes[1].y1) / 4);
  for (const [sx, sy] of [
    [midX, midY],
    [eyes[0].x0 - 3, midY],
    [eyes[1].x1 + 3, midY],
    [Math.round((eyes[0].x0 + eyes[0].x1) / 2), eyes[0].y1 + 5],
    [Math.round((eyes[1].x0 + eyes[1].x1) / 2), eyes[1].y1 + 5],
    [midX, midY + 6],
  ]) {
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
    const p = px(sx, sy);
    const L = lum(p);
    if (p[3] > 200 && L > 70 && !isWhite(sx, sy)) samples.push(p);
  }
  if (!samples.length) continue;
  samples.sort((p, q) => lum(p) - lum(q));
  const skin = samples[samples.length >> 1];
  out[name] = {
    w: W,
    h: H,
    skin: hex(skin[0], skin[1], skin[2]),
    eyes: eyes.map((e) => {
      const padX = (e.x1 - e.x0 + 1) * 0.12, padY = (e.y1 - e.y0 + 1) * 0.12;
      return [(e.x0 - padX) / W, (e.y0 - padY) / H, (e.x1 - e.x0 + 1 + 2 * padX) / W, (e.y1 - e.y0 + 1 + 2 * padY) / H].map((v) => Math.round(v * 1e4) / 1e4);
    }),
  };
}
fs.writeFileSync(path.join(dir, "ojos.json"), JSON.stringify(out));
const all = fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).length;
console.log(`ojos detectados en ${Object.keys(out).length} de ${all} sprites`);
console.log("sin ojos:", fs.readdirSync(dir).filter((f) => f.endsWith(".webp")).map((f) => f.replace(".webp", "")).filter((n) => !out[n]).join(" "));
