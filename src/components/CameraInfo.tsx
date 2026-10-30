import { useEffect, useMemo, useRef, useState } from "react";
import { createDataSource } from "../data/factory";
import { fetchJson } from "../data/fetch";
import type { CameraConfig } from "../data/types";
import { t } from "../lib/i18n";
import { Icon } from "./Icon";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

/** Name of the station, camera type, owner and position: from the catalog entry, completed by the camera's manifest.json. */
function describe(data: Record<string, unknown>) {
  const loc = data.location as Record<string, unknown> | undefined;
  const lat = typeof loc?.lat === "number" ? loc.lat : undefined;
  const lon = typeof loc?.lon === "number" ? loc.lon : undefined;
  return {
    observatory: str(data.observatory_name),
    type: str(data.camera_type),
    owner: str(data.owner),
    description: str(data.description),
    location: lat !== undefined && lon !== undefined ? `${lat.toFixed(4)}°, ${lon.toFixed(4)}°` : undefined,
  };
}

/** The directory index of an https archive, when there is one to open in the browser. */
export function fileIndexUrl(camera: CameraConfig): string | undefined {
  if (camera.source.type !== "http-index" && camera.source.type !== "caelum-manifest") return undefined;
  const url = createDataSource(camera.source).url("");
  return url.startsWith("https://") ? url : undefined;
}

/** An ⓘ button with a bubble about the camera: what it is, where its data lives, links. */
export function CameraInfo({ camera }: { camera: CameraConfig }) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState<Record<string, unknown>>();
  const ref = useRef<HTMLSpanElement>(null);
  const source = useMemo(() => createDataSource(camera.source), [camera]);
  const index = fileIndexUrl(camera);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The camera's own published description, once, when the bubble is first opened.
  useEffect(() => {
    setManifest(undefined);
  }, [camera]);
  useEffect(() => {
    if (!open || manifest || source.kind === "caelum") return;
    const ctl = new AbortController();
    fetchJson<Record<string, unknown>>(source.url("manifest.json"), ctl.signal)
      .then(setManifest)
      .catch(() => {});
    return () => ctl.abort();
  }, [open, manifest, source]);

  const info = { ...describe(manifest ?? {}), ...Object.fromEntries(Object.entries(describe(camera)).filter(([, v]) => v)) };
  const rows: [string, string | undefined][] = [
    [t("info.observatory"), info.observatory],
    [t("info.type"), info.type],
    [t("info.owner"), info.owner],
    [t("info.location"), info.location],
  ];

  return (
    <span className="cam-info" ref={ref}>
      <button type="button" className="cam-info-btn" aria-expanded={open} aria-haspopup="true" title={t("info.title")} aria-label={t("info.title")} onClick={() => setOpen((o) => !o)}>
        <Icon name="info" />
      </button>
      {open && (
        <div className="cam-info-bubble" role="dialog" aria-label={camera.name}>
          <strong>{camera.name}</strong>
          {info.description && <p className="small">{info.description}</p>}
          <dl>
            {rows.map(([k, v]) =>
              v ? (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ) : null,
            )}
            <div>
              <dt>{t("info.source")}</dt>
              <dd>{source.label}</dd>
            </div>
          </dl>
          <div className="cam-info-links">
            {camera.link && (
              <a href={camera.link} target="_blank" rel="noreferrer">
                {t("viewer.cameraLink")} ↗
              </a>
            )}
            {index && (
              <a href={index} target="_blank" rel="noreferrer">
                {t("info.fileIndex")} ↗
              </a>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
