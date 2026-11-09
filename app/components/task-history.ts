"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const stateKey = "lssTask";
type Task = { id: string; href: string; requestClose(): boolean };
const tasks: Task[] = [];
let listening = false;
let removingEntry = false;
const href = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

function mark(task: Task) {
  const previous = window.history.state?.[stateKey];
  const state = { ...window.history.state, [stateKey]: { id: task.id, href: task.href } };
  // Replacing a detail with a payment reuses the same task entry.
  window.history[previous?.href === task.href ? "replaceState" : "pushState"](state, "", task.href);
}

function stopListening() {
  if (!tasks.length && !removingEntry && listening) {
    window.removeEventListener("popstate", onBack);
    listening = false;
  }
}

function onBack() {
  const task = tasks.at(-1);
  if (removingEntry) {
    removingEntry = false;
    if (task && task.href === href()) mark(task);
    stopListening();
    return;
  }
  if (!task || task.href !== href()) return;
  if (window.history.state?.[stateKey]?.id === task.id) return;
  if (!task.requestClose()) mark(task);
}

export function useTaskHistory(open: boolean, id: string, requestClose: () => boolean) {
  const request = useRef(requestClose);
  useLayoutEffect(() => { request.current = requestClose; }, [requestClose]);
  useEffect(() => {
    if (!open) return;
    const task: Task = { id, href: href(), requestClose: () => request.current() };
    tasks.push(task);
    try {
      if (!listening) { window.addEventListener("popstate", onBack); listening = true; }
      if (!removingEntry) mark(task);
    } catch { /* Closing still works when history is unavailable. */ }
    return () => {
      const index = tasks.indexOf(task);
      if (index >= 0) tasks.splice(index, 1);
      // New surfaces register in the same commit before this cleanup runs.
      queueMicrotask(() => {
        const next = tasks.at(-1);
        if (next) return;
        if (window.history.state?.[stateKey]?.id === id && task.href === href()) {
          removingEntry = true;
          window.history.back();
        }
        stopListening();
      });
    };
  }, [open, id]);
}
