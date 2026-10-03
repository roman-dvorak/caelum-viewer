import type { Filters } from "../lib/filters";
import { NO_FILTERS, isFiltering } from "../lib/filters";
import { fieldInfo, PERIODS } from "../lib/metadata";

interface Props {
  filters: Filters;
  available: string[];
  total: number;
  shown: number;
  onChange: (f: Filters) => void;
}

const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));

export function FilterPanel({ filters, available, total, shown, onChange }: Props) {
  const togglePeriod = (p: string) =>
    onChange({
      ...filters,
      periods: filters.periods.includes(p) ? filters.periods.filter((x) => x !== p) : [...filters.periods, p],
    });

  return (
    <section className="panel">
      <h3>
        Filtr
        <span className="muted small">
          {shown} / {total} snímků
        </span>
        {isFiltering(filters) && (
          <button className="link" onClick={() => onChange(NO_FILTERS)}>
            zrušit
          </button>
        )}
      </h3>
      <div className="period-chips">
        {Object.entries(PERIODS).map(([p, { label, color }]) => (
          <button
            key={p}
            className={`period-chip${filters.periods.includes(p) ? " on" : ""}`}
            onClick={() => togglePeriod(p)}
          >
            <i style={{ background: color }} />
            {label}
          </button>
        ))}
      </div>
      {filters.rules.map((r, i) => (
        <div className="rule" key={i}>
          <select
            value={r.key}
            onChange={(e) => {
              const rules = [...filters.rules];
              rules[i] = { key: e.target.value };
              onChange({ ...filters, rules });
            }}
          >
            {available.map((k) => (
              <option key={k} value={k}>
                {fieldInfo(k).label}
              </option>
            ))}
          </select>
          <input
            placeholder="min"
            inputMode="decimal"
            defaultValue={r.min ?? ""}
            onChange={(e) => {
              const rules = [...filters.rules];
              rules[i] = { ...r, min: num(e.target.value) };
              onChange({ ...filters, rules });
            }}
          />
          <input
            placeholder="max"
            inputMode="decimal"
            defaultValue={r.max ?? ""}
            onChange={(e) => {
              const rules = [...filters.rules];
              rules[i] = { ...r, max: num(e.target.value) };
              onChange({ ...filters, rules });
            }}
          />
          <button title="Odebrat" onClick={() => onChange({ ...filters, rules: filters.rules.filter((_, j) => j !== i) })}>
            ×
          </button>
        </div>
      ))}
      <div className="row">
        {available.length > 0 && (
          <button
            className="link"
            onClick={() => onChange({ ...filters, rules: [...filters.rules, { key: available.includes("sky_state.sun_altitude_deg") ? "sky_state.sun_altitude_deg" : available[0] }] })}
          >
            + podmínka na hodnotu
          </button>
        )}
        <label className="small">
          <input
            type="checkbox"
            checked={filters.rawOnly}
            onChange={(e) => onChange({ ...filters, rawOnly: e.target.checked })}
          />{" "}
          jen s RAW
        </label>
      </div>
    </section>
  );
}
