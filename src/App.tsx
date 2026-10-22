import { useEffect, useState } from "react";
import { loadCatalog } from "./data/catalog";
import type { CameraConfig } from "./data/types";
import { StartScreen } from "./components/StartScreen";
import { Viewer } from "./components/Viewer";
import { cameraFromParams, readParams } from "./lib/urlState";

type State =
  | { kind: "start"; error?: string }
  | { kind: "loading" }
  | { kind: "ready"; cameras: CameraConfig[]; title?: string; fromCatalog: boolean };

export function App() {
  const [params] = useState(readParams);
  const [state, setState] = useState<State>(() => {
    if (params.catalog) return { kind: "loading" };
    const cam = cameraFromParams(params);
    return cam ? { kind: "ready", cameras: [cam], fromCatalog: false } : { kind: "start" };
  });

  useEffect(() => {
    if (!params.catalog) return;
    loadCatalog(params.catalog)
      .then((c) => setState({ kind: "ready", cameras: c.cameras, title: c.title, fromCatalog: true }))
      .catch((e: Error) => setState({ kind: "start", error: `Katalog: ${e.message}` }));
  }, [params.catalog]);

  if (state.kind === "loading") return <div className="center muted">Načítám katalog…</div>;
  if (state.kind === "start") return <StartScreen error={state.error} />;
  return <Viewer cameras={state.cameras} title={state.title} fromCatalog={state.fromCatalog} initial={params} />;
}
