import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

// Tokens first — every later sheet resolves its colours from them.
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";

import { AppStore } from "./store/AppStore.jsx";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppStore>
      <App />
    </AppStore>
  </StrictMode>,
);
