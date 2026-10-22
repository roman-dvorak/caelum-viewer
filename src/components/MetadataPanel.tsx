import { useRef } from "react";
import type { DataSource } from "../data/types";
import type { Frame, FrameMeta } from "../data/archive";
import { fieldInfo, flattenAll } from "../lib/metadata";
import { utcDate, utcTime } from "../lib/time";
import { t } from "../lib/i18n";

interface Props {
  frame?: Frame;
  meta?: FrameMeta;
  source: DataSource;
}

export function MetadataPanel({ frame, meta, source }: Props) {
  // While the next frame's metadata is on its way (playback), keep the previous table
  // instead of collapsing to a one-line message — no flicker, no jumping layout.
  const last = useRef<FrameMeta | undefined>(undefined);
  const loading = !meta && !!(frame?.meta || frame?.rawMeta);
  if (meta) last.current = meta;
  const shown = meta ?? (loading ? last.current : undefined);
  if (!frame) return null;
  const rows = shown ? flattenAll(shown) : [];
  return (
    <section className="panel">
      <h3>
        {utcDate(frame.t)} {utcTime(frame.t)} <span className="muted small">UTC</span>
      </h3>
      <div className="downloads">
        {frame.raw && (
          <a className="btn primary" href={source.url(frame.raw)} download>
            ⬇ RAW ({frame.raw.split(".").pop()?.toUpperCase()})
          </a>
        )}
        {frame.thumb && (
          <a className="btn" href={source.url(frame.thumb)} target="_blank" rel="noreferrer">
            {t("meta.preview")}
          </a>
        )}
        {(frame.meta || frame.rawMeta) && (
          <a className="btn" href={source.url((frame.meta ?? frame.rawMeta)!)} target="_blank" rel="noreferrer">
            JSON
          </a>
        )}
      </div>
      {shown ? (
        <table className={loading ? "meta stale" : "meta"}>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th title={k}>{fieldInfo(k).label}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted small">{frame.meta || frame.rawMeta ? t("meta.loading") : t("meta.none")}</div>
      )}
    </section>
  );
}
