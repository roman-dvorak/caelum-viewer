import { getLang, LANGS, setLang, t, type Lang } from "../lib/i18n";

/** Language switcher; switching re-renders the whole app (see main.tsx). */
export function LangSwitch() {
  const lang = getLang();
  return (
    <span className="lang-switch" role="group" aria-label={t("start.language")}>
      {(Object.keys(LANGS) as Lang[]).map((l) => (
        <button key={l} type="button" className={l === lang ? "on" : ""} aria-pressed={l === lang} title={LANGS[l]} onClick={() => setLang(l)}>
          {l.toUpperCase()}
        </button>
      ))}
    </span>
  );
}
