"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type Position = { page: number; tables: Record<string, number> };
const positionKey = "lss-demo-scroll-v1";

// A vista mantém o mesmo DOM ao recolher o menu ou expandir a tabela.
// Ao trocar de área, as posições ficam na sessão do cenário, sem dados financeiros.
export function useWorkspaceScroll(key: string, datasetId: string | undefined) {
  const positions = useRef<Record<string, Position>>({});
  const restoring = useRef(false);
  const activeKey = useRef(key);
  const loadedDataset = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    if (!datasetId) return;
    if (loadedDataset.current !== datasetId) {
      positions.current = {};
      try {
        const saved = JSON.parse(window.sessionStorage.getItem(positionKey) ?? "null");
        if (saved?.datasetId === datasetId && saved.positions && typeof saved.positions === "object") {
          for (const [key, value] of Object.entries(saved.positions).slice(0, 100)) {
            if (!value || typeof value !== "object") continue;
            const position = value as Partial<Position>;
            if (typeof position.page !== "number" || !Number.isFinite(position.page) || position.page < 0 || !position.tables || typeof position.tables !== "object") continue;
            positions.current[key] = { page: position.page, tables: Object.fromEntries(Object.entries(position.tables).filter(([, left]) => typeof left === "number" && Number.isFinite(left) && left >= 0)) };
          }
        }
      } catch { /* Restauro de posição opcional. */ }
      loadedDataset.current = datasetId;
    }
    activeKey.current = key;
    restoring.current = true;
    const frame = window.requestAnimationFrame(() => {
      const position = positions.current[key];
      window.scrollTo({ top: typeof position?.page === "number" ? position.page : 0, behavior: "instant" });
      document.querySelectorAll<HTMLElement>(".table-scroll").forEach((table, index) => {
        const left = position?.tables?.[table.dataset.scrollId ?? String(index)];
        table.scrollLeft = typeof left === "number" ? left : 0;
      });
      restoring.current = false;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [key, datasetId]);

  useEffect(() => {
    if (!datasetId) return;
    const flush = () => {
      try { window.sessionStorage.setItem(positionKey, JSON.stringify({ datasetId, positions: positions.current })); } catch { /* Não bloqueia o atendimento. */ }
    };
    const remember = (event: Event) => {
      if (restoring.current) return;
      const position = positions.current[activeKey.current] ?? { page: window.scrollY, tables: {} };
      if (event.target instanceof HTMLElement && event.target.matches(".table-scroll")) {
        const tables = [...document.querySelectorAll(".table-scroll")];
        position.tables[event.target.dataset.scrollId ?? String(tables.indexOf(event.target))] = event.target.scrollLeft;
      } else if (event.target === document || event.target === window) position.page = window.scrollY;
      positions.current[activeKey.current] = position;
      flush();
    };
    window.addEventListener("scroll", remember, true);
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("scroll", remember, true); window.removeEventListener("pagehide", flush); flush(); };
  }, [datasetId]);
}
