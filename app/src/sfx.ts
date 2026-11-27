import { useStore } from "./store";

/**
 * Sonidos sintetizados (WebAudio, sin archivos, funcionan offline) con timbres andinos:
 * - Charango: cuerda pulsada con síntesis Karplus-Strong (registro agudo, ataque brillante).
 * - Quena: onda casi senoidal con vibrato y soplido (ruido filtrado).
 * - Bombo: golpe grave con caída de tono.
 * Las melodías son originales, en escala pentatónica.
 */
let ctx: AudioContext | null = null;
const ac = () => (ctx ??= new AudioContext());

const NOTE: Record<string, number> = {
  A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880,
};

function pluck(freq: number, at: number, gain = 0.32, decay = 0.996) {
  const c = ac();
  const sr = c.sampleRate;
  const len = Math.floor(sr * 1.4);
  const buf = c.createBuffer(1, len, sr);
  const out = buf.getChannelData(0);
  const period = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const next = (idx + 1) % period;
    const v = decay * 0.5 * (ring[idx] + ring[next]);
    out[i] = ring[idx];
    ring[idx] = v;
    idx = next;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 180;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(hp).connect(g).connect(c.destination);
  src.start(c.currentTime + at);
}

function strum(notes: string[], at = 0, spread = 0.018, gain = 0.22) {
  notes.forEach((n, i) => pluck(NOTE[n], at + i * spread, gain));
}

function quena(note: string, at: number, dur: number, gain = 0.14) {
  const c = ac();
  const t0 = c.currentTime + at;
  const f = NOTE[note];
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(f * 0.985, t0);
  osc.frequency.linearRampToValueAtTime(f, t0 + 0.06);
  const vib = c.createOscillator();
  vib.frequency.value = 5.6;
  const vibGain = c.createGain();
  vibGain.gain.setValueAtTime(0, t0);
  vibGain.gain.linearRampToValueAtTime(f * 0.012, t0 + Math.min(0.25, dur * 0.6));
  vib.connect(vibGain).connect(osc.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.05);
  g.gain.setValueAtTime(gain, t0 + dur - 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.12);
  // soplido
  const noiseBuf = c.createBuffer(1, Math.floor(c.sampleRate * (dur + 0.2)), c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = noiseBuf;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = f * 2;
  bp.Q.value = 1.2;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0, t0);
  ng.gain.linearRampToValueAtTime(gain * 0.25, t0 + 0.03);
  ng.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  noise.connect(bp).connect(ng).connect(c.destination);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  vib.start(t0);
  noise.start(t0);
  osc.stop(t0 + dur + 0.2);
  vib.stop(t0 + dur + 0.2);
  noise.stop(t0 + dur + 0.2);
}

function bombo(at = 0, gain = 0.5) {
  const c = ac();
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(45, t0 + 0.25);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + 0.4);
}

function play(fn: () => void) {
  if (useStore.getState().muted) return;
  try {
    if (ac().state === "suspended") void ac().resume();
    fn();
  } catch {
    // Sin audio: se ignora.
  }
}

export const sfx = {
  tap: () => play(() => pluck(NOTE.A5, 0, 0.08, 0.99)),
  correct: () => play(() => {
    quena("E5", 0, 0.12, 0.12);
    quena("A5", 0.11, 0.28, 0.12);
  }),
  wrong: () => play(() => {
    bombo(0, 0.45);
    bombo(0.16, 0.3);
  }),
  combo: () => play(() => strum(["E4", "A4", "C5", "E5"], 0, 0.03, 0.18)),
  heart: () => play(() => bombo(0, 0.35)),
  star: (n: number) => play(() => pluck([NOTE.C5, NOTE.E5, NOTE.A5][n] ?? NOTE.A5, 0, 0.25)),
  reveal: () => play(() => {
    strum(["A3", "E4", "A4", "C5", "E5"], 0, 0.025, 0.2);
    quena("A5", 0.25, 0.5, 0.1);
  }),
  /** Fin de lección: rasgueo de charango y frase de quena (melodía original pentatónica). */
  complete: () => play(() => {
    strum(["A3", "E4", "A4", "C5", "E5"], 0, 0.02, 0.22);
    strum(["A3", "E4", "A4", "C5", "E5"], 0.32, 0.02, 0.16);
    const phrase: [string, number][] = [["E5", 0.18], ["G5", 0.18], ["E5", 0.18], ["D5", 0.18], ["C5", 0.3], ["A4", 0.55]];
    let t = 0.6;
    for (const [n, d] of phrase) {
      quena(n, t, d * 0.95);
      t += d;
    }
    strum(["A3", "E4", "A4", "C5", "E5"], t - 0.1, 0.03, 0.2);
  }),
  page: () => play(() => pluck(NOTE.E5, 0, 0.06, 0.985)),
};
