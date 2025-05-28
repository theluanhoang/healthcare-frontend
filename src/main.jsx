import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import App from "./App.jsx";
import { AuthProvider } from "./contexts/AuthProvider.jsx";
import { SmartContractProvider } from "./contexts/SmartContractProvider.jsx";
import { TokenProvider } from "./contexts/TokenProvider.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SmartContractProvider>
      <AuthProvider>
        <TokenProvider>
          <BrowserRouter>
            <App />
            <ToastContainer />
          </BrowserRouter>
        </TokenProvider>
      </AuthProvider>
    </SmartContractProvider>
  </StrictMode>
);
