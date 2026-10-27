import { useEffect, useState } from "react";
import { loadCatalog } from "./data/catalog";
import type { CameraConfig } from "./data/types";
import { Overview } from "./components/Overview";
import { StartScreen } from "./components/StartScreen";
import { Viewer } from "./components/Viewer";
import { buildSearch, cameraFromParams, readParams, type ViewParams } from "./lib/urlState";
import { t } from "./lib/i18n";

type State =
  | { kind: "start"; error?: string }
  | { kind: "loading" }
  | { kind: "ready"; cameras: CameraConfig[]; title?: string; description?: string; fromCatalog: boolean };

export function App() {
  const [params, setParams] = useState(readParams);
  /** Bumped on every switch between the overview and a camera, so the new view starts from the URL. */
  const [nav, setNav] = useState(0);
  const [state, setState] = useState<State>(() => {
    if (params.catalog) return { kind: "loading" };
    const cam = cameraFromParams(params);
    return cam ? { kind: "ready", cameras: [cam], fromCatalog: false } : { kind: "start" };
  });

  useEffect(() => {
    if (!params.catalog) return;
    loadCatalog(params.catalog)
      .then((c) => setState({ kind: "ready", cameras: c.cameras, title: c.title, description: c.description, fromCatalog: true }))
      .catch((e: Error) => setState({ kind: "start", error: t("app.catalogError", { msg: e.message }) }));
  }, [params.catalog]);

  // Back / forward between the overview and a camera.
  useEffect(() => {
    const onPop = () => {
      setParams(readParams());
      setNav((n) => n + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /** Opens another view of the same catalog as a new history entry. */
  const navigate = (next: ViewParams) => {
    history.pushState(null, "", `${location.pathname}${buildSearch(next)}${location.hash}`);
    setParams(readParams());
    setNav((n) => n + 1);
  };

  if (state.kind === "loading") return <div className="center muted">{t("app.loadingCatalog")}</div>;
  if (state.kind === "start") return <StartScreen error={state.error} />;

  // A catalog of several cameras opens on the overview; `camera=` opens one of them.
  const overview = state.fromCatalog && state.cameras.length > 1 && !state.cameras.some((c) => c.id === params.camera);
  if (overview)
    return (
      <Overview
        key={nav}
        cameras={state.cameras}
        title={state.title}
        description={state.description}
        initial={params}
        onOpen={(camera, time) => navigate({ ...readParams(), camera, time, from: undefined, to: undefined })}
      />
    );
  return (
    <Viewer
      key={nav}
      cameras={state.cameras}
      title={state.title}
      fromCatalog={state.fromCatalog}
      initial={params}
      onOverview={
        state.fromCatalog && state.cameras.length > 1
          ? () => navigate({ ...readParams(), camera: undefined, from: undefined, to: undefined })
          : undefined
      }
    />
  );
}
