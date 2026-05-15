import React from "react";
import ReactDOM from "react-dom/client";

// Load fonts
import "@fontsource-variable/geist";
import "@fontsource/geist-mono";

import App from "./App";
import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
