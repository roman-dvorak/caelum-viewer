import { useEffect, useRef } from "react";
import { APP_BUILD_TIME, APP_COMMIT, APP_VERSION } from "../lib/build";
import { DEVELOPER_NAME, DEVELOPER_URL, DOCS_URL, REPO_URL, VIEWER_DOCS_URL } from "../lib/brand";
import { t } from "../lib/i18n";

interface Props {
  onClose: () => void;
}

/** "About" dialog: what the app is, its version and build. */
export function AboutDialog({ onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal?.();
  }, []);
  const built = new Date(APP_BUILD_TIME);
  const commitUrl = APP_COMMIT !== "unknown" ? `${REPO_URL}/commit/${APP_COMMIT}` : undefined;

  return (
    <dialog
      ref={ref}
      className="about"
      aria-labelledby="about-title"
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
    >
      <div className="about-body">
        <h2 id="about-title">
          <img src="./favicon.svg" alt="" /> Caelum Viewer
        </h2>
        <p>{t("about.text")}</p>
        <dl>
          <dt>{t("about.version")}</dt>
          <dd>{APP_VERSION}</dd>
          <dt>{t("about.build")}</dt>
          <dd>
            {commitUrl ? (
              <a href={commitUrl} target="_blank" rel="noreferrer">
                {APP_COMMIT}
              </a>
            ) : (
              APP_COMMIT
            )}
          </dd>
          <dt>{t("about.built")}</dt>
          <dd>{isNaN(built.getTime()) ? APP_BUILD_TIME : `${built.toISOString().slice(0, 16).replace("T", " ")} UTC`}</dd>
          <dt>{t("about.developer")}</dt>
          <dd>
            <a href={DEVELOPER_URL} target="_blank" rel="noreferrer">
              {DEVELOPER_NAME}
            </a>
          </dd>
        </dl>
        <p className="about-links">
          <a href={VIEWER_DOCS_URL} target="_blank" rel="noreferrer">{t("viewer.docs")}</a>
          <a href={DOCS_URL} target="_blank" rel="noreferrer">caelum ↗</a>
          <a href={REPO_URL} target="_blank" rel="noreferrer">GitHub ↗</a>
        </p>
        <form method="dialog">
          <button className="btn primary">{t("about.close")}</button>
        </form>
      </div>
    </dialog>
  );
}
