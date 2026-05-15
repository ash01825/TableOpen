import { useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { useConnectionStore } from "./stores/connection-store";
import "./styles/index.css";

function App() {
  const { loadSavedConnections } = useConnectionStore();

  // Load saved connections on mount
  useEffect(() => {
    loadSavedConnections();
  }, [loadSavedConnections]);

  return <AppShell />;
}

export default App;
