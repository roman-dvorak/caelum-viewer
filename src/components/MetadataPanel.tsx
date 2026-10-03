import type { DataSource } from "../data/types";
import type { Frame, FrameMeta } from "../data/archive";
import { fieldInfo, flattenAll } from "../lib/metadata";
import { utcDate, utcTime } from "../lib/time";

interface Props {
  frame?: Frame;
  meta?: FrameMeta;
  source: DataSource;
}

export function MetadataPanel({ frame, meta, source }: Props) {
  if (!frame) return null;
  const rows = meta ? flattenAll(meta) : [];
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
            Náhled
          </a>
        )}
        {(frame.meta || frame.rawMeta) && (
          <a className="btn" href={source.url((frame.meta ?? frame.rawMeta)!)} target="_blank" rel="noreferrer">
            JSON
          </a>
        )}
      </div>
      {meta ? (
        <table className="meta">
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
        <div className="muted small">{frame.meta || frame.rawMeta ? "Načítám metadata…" : "Bez metadat"}</div>
      )}
    </section>
  );
}
