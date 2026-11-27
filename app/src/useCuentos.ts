import { useEffect, useState } from "react";
import type { Cuento } from "./components/Comic";

const KEY = "guardianes-cuentos";
let memo: Record<string, Cuento> | null = null;

/** Cuentos del cómic: red primero y copia local para usarlos sin conexión. */
export function useCuentos() {
  const [data, setData] = useState<Record<string, Cuento> | null>(() => {
    if (memo) return memo;
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Record<string, Cuento>) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    fetch("/api/cuentos")
      .then((r) => r.json())
      .then((d: Record<string, Cuento>) => {
        memo = d;
        setData(d);
        try {
          localStorage.setItem(KEY, JSON.stringify(d));
        } catch {
          /* sin espacio: se ignora */
        }
      })
      .catch(() => {});
  }, []);
  return data;
}
