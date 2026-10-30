import { useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "../lib/i18n";
import { Icon } from "./Icon";

/**
 * Secondary top-bar items. On wide screens they stay inline in the bar; on small
 * screens they collapse behind a "more" button into a dropdown.
 */
export function TopMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  return (
    <div className={`topmenu${open ? " open" : ""}`} ref={ref}>
      <button type="button" className="topmenu-btn" aria-expanded={open} aria-haspopup="true" title={t("viewer.menu")} aria-label={t("viewer.menu")} onClick={() => setOpen((o) => !o)}>
        <Icon name="more" />
      </button>
      <div className="topmenu-items">{children}</div>
    </div>
  );
}
