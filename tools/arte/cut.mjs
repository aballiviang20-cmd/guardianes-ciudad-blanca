// Recorta personajes de las hojas: relleno por inundación desde el borde (quita fondo y sombra beige,
// respeta piel y zonas claras encerradas por contorno), bordes suavizados, recorte ajustado y WebP con alfa.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const [specFile, outDir, sheetOut] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
fs.mkdirSync(outDir, { recursive: true });
const results = [];

for (const s of spec) {
  const { data, info } = await sharp(s.src).extract({ left: s.x, top: s.y, width: s.w, height: s.h }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const rgba = Buffer.alloc(W * H * 4);
  const bg = s.bg;
  const dist = (i) => Math.hypot(data[i * 3] - bg[0], data[i * 3 + 1] - bg[1], data[i * 3 + 2] - bg[2]);
  const isBgLike = (i) => {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    const d = dist(i);
    // el fondo tiene una relación azul/verde fija: la piel clara (más rosada) no la cumple
    if (b - g > bg[2] - bg[1] + 12) return false;
    if (d <= (s.tol ?? 34)) return true;
    if (s.shadow === false) return false;
    // sombra beige del suelo: tono cálido poco saturado (no piel)
    return d <= 78 && r >= g && g >= b && r - b <= 74 && r - b >= 30 && r > 170;
  };
  const removed = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop();
    if (removed[p] || !isBgLike(p)) continue;
    removed[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }
  // Componentes conexos: se descartan fragmentos de poses vecinas (tocan el borde y son chicos).
  const comp = new Int32Array(W * H).fill(-1);
  const sizes = [];
  const touches = [];
  for (let p0 = 0; p0 < W * H; p0++) {
    if (removed[p0] || comp[p0] >= 0) continue;
    const id = sizes.length;
    let size = 0, edge = false;
    const st = [p0];
    comp[p0] = id;
    while (st.length) {
      const p = st.pop();
      size++;
      const x = p % W, y = (p / W) | 0;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) edge = true;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && !removed[q] && comp[q] < 0) {
          comp[q] = id;
          st.push(q);
        }
      }
    }
    sizes.push(size);
    touches.push(edge);
  }
  const biggest = Math.max(...sizes);
  for (let p = 0; p < W * H; p++) {
    const c = comp[p];
    if (c >= 0 && (sizes[c] < 12 || (touches[c] && sizes[c] < biggest * 0.35))) removed[p] = 1;
  }

  for (let p = 0; p < W * H; p++) {
    rgba[p * 4] = data[p * 3];
    rgba[p * 4 + 1] = data[p * 3 + 1];
    rgba[p * 4 + 2] = data[p * 3 + 2];
    let a = removed[p] ? 0 : 255;
    if (!removed[p]) {
      const x = p % W, y = (p / W) | 0;
      const nb = (x > 0 && removed[p - 1]) || (x < W - 1 && removed[p + 1]) || (y > 0 && removed[p - W]) || (y < H - 1 && removed[p + W]);
      if (nb) a = Math.max(60, Math.min(255, Math.round(((dist(p) - 20) / 60) * 255)));
    }
    rgba[p * 4 + 3] = a;
  }
  const out = path.join(outDir, `${s.name}.webp`);
  const buf = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 1 }).webp({ quality: 88, alphaQuality: 95 }).toBuffer({ resolveWithObject: true });
  fs.writeFileSync(out, buf.data);
  results.push({ name: s.name, file: out, w: buf.info.width, h: buf.info.height, bytes: buf.data.length });
}

// Hoja de contacto para revisar los recortes sobre un fondo de color.
if (sheetOut) {
  const cell = 160, cols = 8, rows = Math.ceil(results.length / cols);
  const comps = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const img = await sharp(r.file).resize(cell - 10, cell - 26, { fit: "inside" }).png().toBuffer();
    const meta = await sharp(img).metadata();
    comps.push({ input: img, left: (i % cols) * cell + Math.round((cell - meta.width) / 2), top: Math.floor(i / cols) * cell + 4 });
    const label = Buffer.from(`<svg width="${cell}" height="20"><text x="${cell / 2}" y="14" font-size="12" text-anchor="middle" font-family="Arial" fill="#000">${r.name}</text></svg>`);
    comps.push({ input: label, left: (i % cols) * cell, top: Math.floor(i / cols) * cell + cell - 20 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: { r: 120, g: 170, b: 210, alpha: 1 } } }).composite(comps).png().toFile(sheetOut);
}
console.log(results.map((r) => `${r.name} ${r.w}x${r.h} ${(r.bytes / 1024).toFixed(0)}KB`).join("\n"));
