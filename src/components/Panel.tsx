import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

interface Props {
  /** Key under which the open/closed state is remembered in the browser. */
  id: string;
  title: ReactNode;
  /** Shown next to the title even while collapsed (counts, a reset link…). */
  extra?: ReactNode;
  defaultOpen: boolean;
  className?: string;
  children: ReactNode;
}

const key = (id: string) => `caelum-viewer.panel.${id}`;

function loadOpen(id: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key(id));
    if (v === "1" || v === "0") return v === "1";
  } catch {
    /* storage unavailable */
  }
  return fallback;
}

/** Side panel card that collapses to its title. The body stays mounted while
 *  hidden, so a running export or typed filter values survive collapsing. */
export function Panel({ id, title, extra, defaultOpen, className, children }: Props) {
  const [open, setOpen] = useState(() => loadOpen(id, defaultOpen));
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(key(id), open ? "0" : "1");
    } catch {
      /* not remembered */
    }
  };
  return (
    <section className={`panel${open ? "" : " collapsed"}${className ? ` ${className}` : ""}`}>
      <h3>
        <button type="button" className="panel-toggle" aria-expanded={open} onClick={toggle}>
          <Icon name="chevron" />
          {title}
        </button>
        {extra}
      </h3>
      <div className="panel-body" hidden={!open}>
        {children}
      </div>
    </section>
  );
}
