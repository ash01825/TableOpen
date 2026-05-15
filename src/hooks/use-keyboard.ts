import { useEffect, useRef } from "react";

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  preventDefault?: boolean;
}

// Singleton: one persistent capture-phase listener, ref-fed handlers
// This avoids React's stale-closure issues with recreated callbacks.
const keyHandlerRef = { current: [] as KeyboardShortcut[] };
let listenerAttached = false;

export function useKeyboard(shortcuts: KeyboardShortcut[]) {
  // Keep ref updated on every render
  useEffect(() => {
    keyHandlerRef.current = shortcuts;
  });
}

/**
 * Global app keyboard shortcuts. Call once in AppShell.
 */
export function useAppKeyboardShortcuts(handlers: {
  onCommandPalette?: () => void;
  onNewQueryTab?: () => void;
  onCloseQueryTab?: () => void;
  onNewConnection?: () => void;
  onExecuteQuery?: () => void;
  onFocusEditor?: () => void;
  onToggleSidebar?: () => void;
  onExport?: () => void;
  onEscape?: () => void;
}) {
  // Use refs so we always call the latest handler version
  const h = useRef(handlers);
  h.current = handlers;

  const shortcuts: KeyboardShortcut[] = [];

  if (h.current.onCommandPalette) {
    shortcuts.push({ key: "k", metaKey: true, handler: h.current.onCommandPalette });
  }
  if (h.current.onNewQueryTab) {
    shortcuts.push({ key: "t", metaKey: true, handler: h.current.onNewQueryTab });
  }
  if (h.current.onCloseQueryTab) {
    shortcuts.push({ key: "w", metaKey: true, handler: h.current.onCloseQueryTab });
  }
  if (h.current.onNewConnection) {
    shortcuts.push({ key: "n", metaKey: true, handler: h.current.onNewConnection });
  }
  if (h.current.onExecuteQuery) {
    shortcuts.push({ key: "Enter", metaKey: true, handler: h.current.onExecuteQuery });
  }
  if (h.current.onFocusEditor) {
    shortcuts.push({ key: "l", metaKey: true, handler: h.current.onFocusEditor });
  }
  if (h.current.onToggleSidebar) {
    shortcuts.push({ key: "\\", metaKey: true, handler: h.current.onToggleSidebar });
  }
  if (h.current.onExport) {
    shortcuts.push({ key: "e", metaKey: true, shiftKey: true, handler: h.current.onExport });
  }
  if (h.current.onEscape) {
    shortcuts.push({ key: "Escape", handler: h.current.onEscape, preventDefault: false });
  }

  useKeyboard(shortcuts);
}

// ── Persistent capture-phase global listener ──────────────────────────

function handleGlobalKeyDown(e: KeyboardEvent) {
  for (const shortcut of keyHandlerRef.current) {
    const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
    const needsMod = shortcut.metaKey || shortcut.ctrlKey;
    const hasMod = needsMod ? (e.metaKey || e.ctrlKey) : true;
    const shiftMatch = shortcut.shiftKey ? e.shiftKey : true;

    if (keyMatch && hasMod && shiftMatch) {
      if (shortcut.preventDefault !== false) {
        e.preventDefault();
        e.stopPropagation();
      }
      shortcut.handler();
      return;
    }
  }
}

// Attach once
if (typeof window !== "undefined" && !listenerAttached) {
  window.addEventListener("keydown", handleGlobalKeyDown, { capture: true });
  listenerAttached = true;
}
