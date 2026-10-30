import { useState } from "react";
import { SKY_LAYERS } from "@roman-dvorak/caelum-sky";
import type { SkySettings } from "@roman-dvorak/caelum-sky/react";
import { t, type Key } from "../lib/i18n";

interface Props {
  /** Draw the sky at all. */
  on: boolean;
  onToggle: (on: boolean) => void;
  settings: SkySettings;
  onChange: (patch: { layer?: [string, boolean]; maxMagnitude?: number }) => void;
}

/** Switch for the sky over the picture; the parts and the faintest star live in a folded menu. */
export function SkyMenu({ on, onToggle, settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span className="sky-menu small">
      <label title={t("sky.title")}>
        <input type="checkbox" checked={on} onChange={(e) => onToggle(e.target.checked)} /> {t("sky.label")}
      </label>
      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen((v) => !v)} title={t("sky.options")}>
        ▾
      </button>
      {open && (
        <div className="sky-menu-body">
          {SKY_LAYERS.map((layer) => (
            <label key={layer}>
              <input
                type="checkbox"
                checked={!settings.hidden.has(layer)}
                onChange={(e) => onChange({ layer: [layer, e.target.checked] })}
              />{" "}
              {t(`sky.layer.${layer}` as Key)}
            </label>
          ))}
          <label className="col">
            {t("sky.faintest", { mag: settings.maxMagnitude.toFixed(1) })}
            <input
              type="range"
              min={0}
              max={5}
              step={0.5}
              value={settings.maxMagnitude}
              onChange={(e) => onChange({ maxMagnitude: Number(e.target.value) })}
            />
          </label>
        </div>
      )}
    </span>
  );
}
