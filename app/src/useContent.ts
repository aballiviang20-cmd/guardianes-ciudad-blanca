import { useEffect } from "react";
import { refreshContent } from "./api";
import { useStore } from "./store";

/** Devuelve el contenido aprobado (guardado para offline) y lo refresca en segundo plano si hay red. */
export function useContent() {
  const content = useStore((s) => s.content);
  useEffect(() => {
    void refreshContent();
  }, []);
  return content;
}

export function useMonument(id: string | undefined) {
  const content = useContent();
  return content?.monuments.find((m) => m.id === id) ?? null;
}
