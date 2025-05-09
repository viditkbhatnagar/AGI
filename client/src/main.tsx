import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { HelmetProviderWrapper } from "@/components/helmet-provider";

createRoot(document.getElementById("root")!).render(
  <HelmetProviderWrapper>
    <ThemeProvider defaultTheme="light" storageKey="agi-theme">
      <App />
    </ThemeProvider>
  </HelmetProviderWrapper>
);
