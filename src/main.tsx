
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { AuthProvider } from "./contexts/AuthContext.tsx";
  import { AuditPeriodProvider } from "./contexts/AuditPeriodContext.tsx";

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <AuditPeriodProvider>
        <App />
      </AuditPeriodProvider>
    </AuthProvider>
  );
