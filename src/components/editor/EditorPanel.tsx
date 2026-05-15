import { useCallback, useRef, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useConnectionStore } from "../../stores/connection-store";
import { useUiStore } from "../../stores/ui-store";
import { Spinner } from "../shared/Spinner";

export function EditorPanel() {
  const { connections, activeConnectionId, updateQueryContent, addQueryTab, closeQueryTab, setActiveQueryTab, executeQuery } =
    useConnectionStore();
  const { resolvedTheme } = useUiStore();

  const activeConnection = connections.find((c) => c.connectionId === activeConnectionId);
  const activeTab = activeConnection?.queryTabs.find(
    (t) => t.id === activeConnection.activeQueryTabId,
  );

  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleEditorMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
    editor.focus();
  }, []);

  // Update editor content when active tab changes
  useEffect(() => {
    if (editorRef.current && activeTab) {
      const currentValue = editorRef.current.getValue();
      if (currentValue !== activeTab.content) {
        editorRef.current.setValue(activeTab.content);
      }
    }
  }, [activeTab?.id]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (!activeConnectionId || !activeTab) return;
      updateQueryContent(activeConnectionId, activeTab.id, value ?? "");
    },
    [activeConnectionId, activeTab, updateQueryContent],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        if (activeConnectionId && activeTab) {
          const editor = editorRef.current;
          if (editor) {
            const selection = editor.getModel()?.getValueInRange(editor.getSelection()!);
            const sql = selection || editor.getValue();
            executeQuery(activeConnectionId, activeTab.id, sql);
          }
        }
      }
    },
    [activeConnectionId, activeTab, executeQuery],
  );

  if (!activeConnection || !activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-surface-0">
        <div className="text-center">
          <svg
            className="w-10 h-10 text-text-muted mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
          <p className="text-sm text-text-muted">Select or create a connection to start querying</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-surface-0" onKeyDown={handleKeyDown}>
      {/* Tab bar */}
      <div className="flex items-center bg-surface-1 border-b border-[var(--color-border)] min-h-0 flex-shrink-0">
        <div className="flex items-center flex-1 overflow-x-auto">
          {activeConnection.queryTabs.map((tab) => (
            <div
              key={tab.id}
              className={`
                flex items-center gap-1.5 h-9 px-3 text-xs whitespace-nowrap cursor-pointer
                border-r border-[var(--color-border)]
                transition-colors select-none
                ${
                  tab.id === activeConnection.activeQueryTabId
                    ? "bg-surface-0 text-text-primary border-t-2 border-t-accent"
                    : "bg-surface-1 text-text-muted hover:text-text-secondary hover:bg-surface-2"
                }
              `}
              onClick={() => setActiveQueryTab(activeConnection.connectionId, tab.id)}
            >
              {tab.isDirty && (
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted flex-shrink-0" />
              )}
              <span className="truncate max-w-[120px]">{tab.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeQueryTab(activeConnection.connectionId, tab.id);
                }}
                className="ml-1 w-4 h-4 flex items-center justify-center rounded-sm text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
                aria-label="Close tab"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => addQueryTab(activeConnection.connectionId)}
          className="flex-shrink-0 w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
          title="New query tab (Cmd+T)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0" data-monaco-editor>
        <Editor
          key={activeTab.id}
          defaultLanguage="sql"
          theme={resolvedTheme === "dark" ? "vs-dark" : "vs"}
          value={activeTab.content}
          onChange={handleChange}
          onMount={handleEditorMount}
          loading={<Spinner />}
          options={{
            fontSize: 13,
            fontFamily: 'var(--font-mono), "JetBrains Mono", "Fira Code", monospace',
            lineHeight: 1.6,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            renderWhitespace: "selection",
            tabSize: 2,
            insertSpaces: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            automaticLayout: true,
            wordWrap: "on",
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
            lineDecorationsWidth: 8,
            lineNumbersMinChars: 3,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            renderLineHighlight: "line",
            contextmenu: true,
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            formatOnPaste: true,
          }}
        />
      </div>
    </div>
  );
}
