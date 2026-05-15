import { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { useConnectionStore } from "./stores/connection-store";
import { useUiStore } from "./stores/ui-store";
import "./styles/index.css";

function App() {
  const { loadSavedConnections } = useConnectionStore();
  const { theme, toggleTheme } = useUiStore();

  useEffect(() => {
    loadSavedConnections();
  }, [loadSavedConnections]);

  return (
    <>
      {/* Global theme toggle — always visible regardless of connection state */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 z-tooltip w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
        title={`Theme: ${theme}`}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        ) : theme === "light" ? (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      <AppShell />
    </>
  );
}

export default App;
