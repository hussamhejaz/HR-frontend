import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./i18n"; // Load i18n config

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Suspense fallback={<div>Loading…</div>}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </Suspense>
);
