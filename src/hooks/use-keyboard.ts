import { useEffect, useCallback } from "react";

interface KeyboardShortcut {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  handler: () => void;
  /** Prevent default browser behavior */
  preventDefault?: boolean;
}

interface UseKeyboardOptions {
  shortcuts: KeyboardShortcut[];
  /** Element to attach listener to (default: window) */
  element?: HTMLElement | Window | null;
  /** Only handle shortcuts when no input/textarea is focused */
  ignoreInputs?: boolean;
}

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (active.getAttribute("contenteditable") === "true") return true;
  if (active.closest("[data-monaco-editor]")) return true;
  return false;
}

export function useKeyboard({ shortcuts, element = null, ignoreInputs = true }: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (e: Event) => {
      const event = e as KeyboardEvent;
      if (ignoreInputs && isInputFocused()) return;

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const cmdOrCtrl = shortcut.metaKey || shortcut.ctrlKey;
        const hasModifier = cmdOrCtrl ? (event.metaKey || event.ctrlKey) : true;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !shortcut.shiftKey;

        if (keyMatch && hasModifier && shiftMatch) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
            event.stopPropagation();
          }
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts, ignoreInputs],
  );

  useEffect(() => {
    const target = element ?? window;
    // Use capture phase so our handler fires before Monaco/stadium eats the event
    target.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => target.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown, element]);
}

/**
 * Global app keyboard shortcuts.
 * Call this once in the AppShell or top-level component.
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
  const shortcuts: KeyboardShortcut[] = [];

  if (handlers.onCommandPalette) {
    shortcuts.push({ key: "k", metaKey: true, handler: handlers.onCommandPalette });
  }
  if (handlers.onNewQueryTab) {
    shortcuts.push({ key: "t", metaKey: true, handler: handlers.onNewQueryTab });
  }
  if (handlers.onCloseQueryTab) {
    shortcuts.push({ key: "w", metaKey: true, shiftKey: true, handler: handlers.onCloseQueryTab });
  }
  if (handlers.onNewConnection) {
    shortcuts.push({ key: "n", metaKey: true, handler: handlers.onNewConnection });
  }
  if (handlers.onExecuteQuery) {
    shortcuts.push({ key: "Enter", metaKey: true, handler: handlers.onExecuteQuery });
  }
  if (handlers.onFocusEditor) {
    shortcuts.push({ key: "l", metaKey: true, handler: handlers.onFocusEditor });
  }
  if (handlers.onToggleSidebar) {
    shortcuts.push({ key: "\\", metaKey: true, handler: handlers.onToggleSidebar });
  }
  if (handlers.onExport) {
    shortcuts.push({ key: "e", metaKey: true, shiftKey: true, handler: handlers.onExport });
  }
  if (handlers.onEscape) {
    shortcuts.push({ key: "Escape", handler: handlers.onEscape, preventDefault: false });
  }

  useKeyboard({ shortcuts, ignoreInputs: true });
}
