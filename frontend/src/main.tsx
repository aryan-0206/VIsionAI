import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Global fetch interceptor to bypass ngrok's browser warning page
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const newInit = { ...init };
    const headers = new Headers(newInit.headers || {});
    headers.set("ngrok-skip-browser-warning", "69420");
    newInit.headers = headers;
    return originalFetch(input, newInit);
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
