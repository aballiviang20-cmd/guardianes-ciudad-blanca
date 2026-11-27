/**
 * Reconocimiento de monumentos EN EL DISPOSITIVO (Edge AI).
 * MobileNet v2 extrae un vector de características de la imagen y un clasificador KNN lo compara
 * con los ejemplos que el equipo capturó. Ninguna imagen sale del celular.
 * TensorFlow.js se carga bajo demanda para no pesar en el resto de la app.
 */
import type { KNNClassifier } from "@tensorflow-models/knn-classifier";
import type { MobileNet } from "@tensorflow-models/mobilenet";

export const OTHER = "otro";
export const K = 5;
/** Confianza mínima (votos de los K vecinos) y cuadros seguidos para aceptar un reconocimiento. */
export const THRESHOLD = 0.8;
export const STREAK = 3;

type Tf = typeof import("@tensorflow/tfjs");
let libs: Promise<{ tf: Tf; net: MobileNet; knn: typeof import("@tensorflow-models/knn-classifier") }> | null = null;

export function loadVision() {
  libs ??= (async () => {
    const tf = await import("@tensorflow/tfjs");
    const mobilenet = await import("@tensorflow-models/mobilenet");
    const knn = await import("@tensorflow-models/knn-classifier");
    await tf.ready();
    const net = await mobilenet.load({ version: 2, alpha: 1.0 });
    return { tf, net, knn };
  })();
  return libs;
}

export type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;
export type Example = { label: string; vec: number[] };

/** Vector de características (embedding) de una imagen. */
export async function embed(src: Source): Promise<number[]> {
  const { tf, net } = await loadVision();
  // dataSync: lectura sincrónica de un vector chico; no depende de requestAnimationFrame (pestañas en segundo plano).
  const vec = tf.tidy(() => Array.from((net.infer(src, true) as import("@tensorflow/tfjs").Tensor2D).dataSync()));
  return vec;
}

export async function buildClassifier(examples: Example[]): Promise<KNNClassifier> {
  const { tf, knn } = await loadVision();
  const c = knn.create();
  for (const ex of examples) {
    const t = tf.tensor1d(ex.vec);
    c.addExample(t, ex.label);
    t.dispose();
  }
  return c;
}

export async function predict(c: KNNClassifier, vec: number[]): Promise<{ label: string; confidence: number }> {
  const { tf } = await loadVision();
  if (c.getNumClasses() === 0) return { label: OTHER, confidence: 0 };
  const t = tf.tensor1d(vec);
  const r = await c.predictClass(t, K);
  t.dispose();
  return { label: r.label, confidence: r.confidences[r.label] ?? 0 };
}

export type Metrics = {
  accuracy: number;
  classes: string[];
  matrix: number[][];
  falsePositiveOther: number | null;
  nTrain: number;
  nTest: number;
  threshold: number;
  note: string;
};

/**
 * Evaluación honesta: separa el 20% de cada clase como prueba (estratificado), entrena con el resto
 * y mide sobre ejemplos que el modelo no vio. Las predicciones bajo el umbral cuentan como "otro".
 */
export async function evaluate(examples: Example[]): Promise<Metrics> {
  const classes = [...new Set(examples.map((e) => e.label))].sort((a, b) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b)));
  const train: Example[] = [];
  const test: Example[] = [];
  for (const cls of classes) {
    const rows = examples.filter((e) => e.label === cls);
    // Prueba = ejemplos repartidos a lo largo de la captura (cada 5º), no los últimos cuadros seguidos.
    rows.forEach((r, i) => ((i % 5 === 4 ? test : train).push(r)));
  }
  const c = await buildClassifier(train);
  const idx = Object.fromEntries(classes.map((cl, i) => [cl, i]));
  const matrix = classes.map(() => classes.map(() => 0));
  let ok = 0;
  for (const ex of test) {
    const p = await predict(c, ex.vec);
    const got = p.confidence >= THRESHOLD ? p.label : OTHER;
    if (idx[got] !== undefined) matrix[idx[ex.label]][idx[got]]++;
    if (got === ex.label) ok++;
  }
  c.dispose();
  const others = test.filter((t) => t.label === OTHER);
  const otherRow = idx[OTHER] !== undefined ? matrix[idx[OTHER]] : null;
  return {
    accuracy: test.length ? ok / test.length : 0,
    classes,
    matrix,
    falsePositiveOther: otherRow && others.length ? (others.length - otherRow[idx[OTHER]]) / others.length : null,
    nTrain: train.length,
    nTest: test.length,
    threshold: THRESHOLD,
    note: "Prueba con 1 de cada 5 ejemplos, no usados para entrenar. Si los ejemplos son cuadros de un mismo video, la precisión es optimista: validar con fotos tomadas otro día o en otro ángulo.",
  };
}
