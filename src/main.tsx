import { StrictMode, useSyncExternalStore } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initClarity } from "./lib/analytics";
import { getLang, subscribeLang } from "./lib/i18n";
import "./styles.css";

/** Remounts the app on a language switch so every label is rendered again; the view itself lives in the URL. */
function Root() {
  const lang = useSyncExternalStore(subscribeLang, getLang);
  return <App key={lang} />;
}

document.documentElement.lang = getLang();
initClarity();
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
