import { useStore } from "./store";

/** Efectos de sonido sintetizados con WebAudio: sin archivos, funcionan offline. */
let ctx: AudioContext | null = null;

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.12) {
  if (!ctx) ctx = new AudioContext();
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function play(fn: () => void) {
  if (useStore.getState().muted) return;
  try {
    fn();
  } catch {
    // Sin audio disponible: se ignora.
  }
}

export const sfx = {
  tap: () => play(() => tone(660, 0, 0.06, "triangle", 0.05)),
  correct: () =>
    play(() => {
      tone(784, 0, 0.12, "triangle");
      tone(1175, 0.09, 0.2, "triangle");
    }),
  wrong: () =>
    play(() => {
      tone(220, 0, 0.16, "sawtooth", 0.06);
      tone(175, 0.12, 0.22, "sawtooth", 0.05);
    }),
  combo: () =>
    play(() => {
      [880, 1109, 1319].forEach((f, i) => tone(f, i * 0.07, 0.14, "triangle", 0.08));
    }),
  reveal: () =>
    play(() => {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.3, "sine", 0.1));
    }),
  complete: () =>
    play(() => {
      [523, 659, 784, 659, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, "triangle", 0.1));
    }),
};
