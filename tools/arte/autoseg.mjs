// Segmenta una hoja de personaje (4 secciones) en cajas por figura y escribe un spec para cut.mjs.
// Uso: node autoseg.mjs hoja.png prefijo spec.json [splitX=0.555] [splitY=0.5] [bottomRight=casual,tarabuco,cueca]
import sharp from "sharp";
import fs from "node:fs";

const [src, prefix, specOut, sx = "0.555", sy = "0.5", br = "casual,tarabuco,cueca", bl = "mueve,sucre,bolivia,salta", tl = "frente,_tres,_perfil,_espalda"] = process.argv.slice(2);
const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
// color de fondo: mediana de las 4 esquinas
const px = (x, y) => [data[(y * W + x) * 3], data[(y * W + x) * 3 + 1], data[(y * W + x) * 3 + 2]];
const samples = [px(4, 4), px(W - 5, 4), px(4, H - 5), px(W - 5, H - 5), px(W >> 1, 4), px(W >> 1, H - 5)];
const bg = [0, 1, 2].map((k) => samples.map((s) => s[k]).sort((a, b) => a - b)[3]);
const fg = new Uint8Array(W * H);
for (let p = 0; p < W * H; p++) {
  const d = Math.hypot(data[p * 3] - bg[0], data[p * 3 + 1] - bg[1], data[p * 3 + 2] - bg[2]);
  fg[p] = d > 40 ? 1 : 0;
}
// dilata la máscara (radio R) para unir partes cercanas de una misma figura
const R = Math.max(3, Math.round(W * 0.0025));
const tmp = new Uint8Array(W * H), dil = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (!fg[y * W + x]) continue;
    for (let k = Math.max(0, x - R); k <= Math.min(W - 1, x + R); k++) tmp[y * W + k] = 1;
  }
}
for (let x = 0; x < W; x++) {
  for (let y = 0; y < H; y++) {
    if (!tmp[y * W + x]) continue;
    for (let k = Math.max(0, y - R); k <= Math.min(H - 1, y + R); k++) dil[k * W + x] = 1;
  }
}
const lab = new Int32Array(W * H).fill(-1);
const list = [];
for (let p0 = 0; p0 < W * H; p0++) {
  if (!dil[p0] || lab[p0] >= 0) continue;
  const id = list.length;
  const b = { x0: W, y0: H, x1: 0, y1: 0, n: 0 };
  const st = [p0];
  lab[p0] = id;
  while (st.length) {
    const p = st.pop();
    const x = p % W, y = (p / W) | 0;
    if (fg[p]) { b.n++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
    if (x > 0 && dil[p - 1] && lab[p - 1] < 0) { lab[p - 1] = id; st.push(p - 1); }
    if (x < W - 1 && dil[p + 1] && lab[p + 1] < 0) { lab[p + 1] = id; st.push(p + 1); }
    if (y > 0 && dil[p - W] && lab[p - W] < 0) { lab[p - W] = id; st.push(p - W); }
    if (y < H - 1 && dil[p + W] && lab[p + W] < 0) { lab[p + W] = id; st.push(p + W); }
  }
  if (b.n) list.push(b);
}
// quita etiquetas de texto pegadas debajo de la figura: busca una fila vacía cerca del borde inferior
for (const b of list) {
  if (b.y1 - b.y0 < H * 0.11) continue;
  const rowEmpty = (y) => {
    for (let x = b.x0; x <= b.x1; x++) if (fg[y * W + x]) return false;
    return true;
  };
  for (let pass = 0; pass < 3; pass++) {
    const limit = b.y1 - Math.round(H * (pass === 0 ? 0.065 : 0.05));
    let cut = false;
    for (let y = b.y1; y > limit; y--) {
      if (rowEmpty(y)) {
        let top = y;
        while (top > b.y0 && rowEmpty(top)) top--;
        b.y1 = top;
        cut = true;
        break;
      }
    }
    if (!cut) break;
  }
  // título o etiqueta pegada ARRIBA (p. ej. "FRENTE"): corta si lo de arriba es bajo como una línea de texto
  for (let y = b.y0; y < b.y0 + H * 0.045; y++) {
    if (rowEmpty(y)) {
      let t = y;
      while (t < b.y1 && rowEmpty(t)) t++;
      b.y0 = t;
      break;
    }
  }
}
// descarta texto (cajas bajas) y ruido
const minH = H * 0.11;
const figs = list.filter((b) => b.y1 - b.y0 >= minH && b.x1 - b.x0 >= W * 0.03);
const SX = W * Number(sx), SY = H * Number(sy);
const cx = (b) => (b.x0 + b.x1) / 2, cy = (b) => (b.y0 + b.y1) / 2;
const sec = { tl: [], tr: [], bl: [], br: [] };
for (const b of figs) sec[(cy(b) < SY ? "t" : "b") + (cx(b) < SX ? "l" : "r")].push(b);

// si una sección tiene menos figuras de las esperadas, parte la caja más ancha por la columna más vacía
const expected = { tl: tl.split(",").length, tr: 6, bl: bl.split(",").length, br: br.split(",").length };
const fgBox = (x0, x1, y0, y1) => {
  const b = { x0: W, y0: H, x1: 0, y1: 0, n: 0 };
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fg[y * W + x]) { b.n++; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
  return b;
};
for (const k of ["tl", "bl", "br"]) {
  while (sec[k].length < expected[k] && sec[k].length) {
    sec[k].sort((a, b) => (b.x1 - b.x0) - (a.x1 - a.x0));
    const b = sec[k].shift();
    let best = -1, bestN = Infinity;
    for (let x = Math.round(b.x0 + (b.x1 - b.x0) * 0.3); x <= b.x0 + (b.x1 - b.x0) * 0.7; x++) {
      let n = 0;
      for (let y = b.y0; y <= b.y1; y++) n += fg[y * W + x];
      if (n < bestN) { bestN = n; best = x; }
    }
    sec[k].push(fgBox(b.x0, best - 1, b.y0, b.y1), fgBox(best + 1, b.x1, b.y0, b.y1));
  }
}

// caras: si no salen 6, se usa una grilla 3x2 sobre la unión de la sección y se recortan las etiquetas
const trimText = (b) => {
  const rowEmpty = (y) => { for (let x = b.x0; x <= b.x1; x++) if (fg[y * W + x]) return false; return true; };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = b.y1; y > b.y1 - H * 0.07; y--) if (rowEmpty(y)) { let t = y; while (t > b.y0 && rowEmpty(t)) t--; b.y1 = t; break; }
    for (let y = b.y0; y < b.y0 + H * 0.07; y++) if (rowEmpty(y)) { let t = y; while (t < b.y1 && rowEmpty(t)) t++; b.y0 = t; break; }
  }
  return b;
};
if (sec.tr.length !== 6 && sec.tr.length) {
  const U = sec.tr.reduce((u, b) => ({ x0: Math.min(u.x0, b.x0), y0: Math.min(u.y0, b.y0), x1: Math.max(u.x1, b.x1), y1: Math.max(u.y1, b.y1) }), { x0: W, y0: H, x1: 0, y1: 0 });
  const cw = (U.x1 - U.x0 + 1) / 3, rh = (U.y1 - U.y0 + 1) / 2;
  sec.tr = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
    const b = fgBox(Math.round(U.x0 + c * cw), Math.round(U.x0 + (c + 1) * cw) - 1, Math.round(U.y0 + r * rh), Math.round(U.y0 + (r + 1) * rh) - 1);
    if (b.n) sec.tr.push(trimText(fgBox(b.x0, b.x1, trimText(b).y0, b.y1)));
  }
}
const byX = (a, b) => cx(a) - cx(b);
sec.tl.sort(byX);
sec.bl.sort(byX);
sec.br.sort(byX);
// caras: 2 filas de 3
sec.tr.sort((a, b) => (Math.abs(cy(a) - cy(b)) > H * 0.08 ? cy(a) - cy(b) : cx(a) - cx(b)));
// caras con etiqueta pegada (mano que toca el texto): se limita la altura a la mediana de las caras
if (sec.tr.length >= 3) {
  const hs = sec.tr.map((b) => b.y1 - b.y0).sort((a, b) => a - b);
  const med = hs[hs.length >> 1];
  for (const b of sec.tr) if (b.y1 - b.y0 > med * 1.1) b.y1 = b.y0 + Math.round(med * 1.04);
}
const names = {
  tl: tl.split(","),
  tr: ["cara-alegre", "cara-sorprendido", "cara-enojado", "cara-triste", "cara-pensativo", "cara-chistoso"],
  bl: bl.split(","),
  br: br.split(","),
};
const pad = 6;
const spec = [];
const report = [];
for (const k of ["tl", "tr", "bl", "br"]) {
  report.push(`${k}: ${sec[k].length} figuras (esperadas ${names[k].length})`);
  sec[k].forEach((b, i) => {
    const n = names[k][i];
    if (!n || n.startsWith("_")) return;
    const x = Math.max(0, b.x0 - pad), y = Math.max(0, b.y0 - pad);
    spec.push({ name: `${prefix}-${n}`, src, bg, x, y, w: Math.min(W, b.x1 + pad + 1) - x, h: Math.min(H, b.y1 + pad + 1) - y });
  });
}
fs.writeFileSync(specOut, JSON.stringify(spec));
console.log(`${W}x${H} bg=${bg} figs=${figs.length}\n` + report.join("\n"));
