import { useState } from "react";
import { SKY_LAYERS, SKY_SLIDERS, skySliderLabel, skyText } from "@roman-dvorak/caelum-sky";
import type { SkySettings, SkySettingsPatch } from "@roman-dvorak/caelum-sky/react";
import { getLang, t } from "../lib/i18n";

interface Props {
  settings: SkySettings;
  onChange: (patch: SkySettingsPatch) => void;
}

/** Switch for the sky over the picture; the parts and sliders live in a folded menu, described by the sky package. */
export function SkyMenu({ settings, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const text = skyText(getLang());
  return (
    <span className="sky-menu small">
      <label title={t("sky.title")}>
        <input type="checkbox" checked={settings.on} onChange={(e) => onChange({ on: e.target.checked })} /> {t("sky.label")}
      </label>
      <button type="button" className="link" aria-expanded={open} onClick={() => setOpen((v) => !v)} title={text.options}>
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
              {text.layers[layer]}
            </label>
          ))}
          {SKY_SLIDERS.map((spec) => (
            <label key={spec.key} className="col">
              {skySliderLabel(spec, text, settings[spec.key])}
              <input
                type="range"
                min={spec.min}
                max={spec.max}
                step={spec.step}
                value={Math.round(settings[spec.key] * spec.factor * 100) / 100}
                onChange={(e) => onChange({ [spec.key]: Number(e.target.value) / spec.factor })}
              />
            </label>
          ))}
        </div>
      )}
    </span>
  );
}
