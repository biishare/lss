import { Window } from "happy-dom";

export const domWindow = new Window({ url: "http://localhost:3000" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "Node", "Document", "DocumentFragment", "ShadowRoot", "MutationObserver", "Event", "MouseEvent", "KeyboardEvent", "getComputedStyle"] as const) {
  const value = key === "window" ? domWindow : domWindow[key];
  Object.defineProperty(globalThis, key, { value: key === "getComputedStyle" ? domWindow.getComputedStyle.bind(domWindow) : value, configurable: true, writable: true });
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { value: true, writable: true });
