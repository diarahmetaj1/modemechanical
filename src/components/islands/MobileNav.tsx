import { useEffect, useRef, useState, type CSSProperties } from 'react';
import './MobileNav.css';
import type { NavItem } from '../../data/site';

interface Props { nav: NavItem[]; phone: string; phoneHref: string; bookingUrl: string; currentPath: string }

/** Position in the open-menu cascade (read by MobileNav.css as --i). */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

export default function MobileNav({ nav, phone, phoneHref, bookingUrl, currentPath }: Props) {
  const [open, setOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggleRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="mnav">
      <button
        ref={toggleRef}
        type="button"
        className="mnav__toggle"
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="mnav__bars" data-open={open} aria-hidden="true"><span /><span /><span /></span>
      </button>

      <div id="mobile-menu" ref={panelRef} className="mnav__panel" data-open={open}>
        <nav aria-label="Mobile">
          <ul>
            {nav.map((item, i) =>
              item.children ? (
                <li key={item.label} className="mnav__item" style={stagger(i)}>
                  <button type="button" className="mnav__link mnav__sub-toggle"
                    aria-expanded={servicesOpen} aria-controls="mnav-services"
                    onClick={() => setServicesOpen((s) => !s)}>
                    {item.label}<span className="mnav__sign" aria-hidden="true" />
                  </button>
                  <div className="mnav__sub-wrap" data-open={servicesOpen}>
                    <ul id="mnav-services" className="mnav__sub">
                      {item.children.map((c) => (
                        <li key={c.href}>
                          <a className="mnav__link" href={c.href} aria-current={currentPath === c.href ? 'page' : undefined}>{c.label}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              ) : (
                <li key={item.href} className="mnav__item" style={stagger(i)}>
                  <a className="mnav__link" href={item.href} aria-current={currentPath === item.href ? 'page' : undefined}>{item.label}</a>
                </li>
              ),
            )}
          </ul>
        </nav>
        <a className="btn btn--primary mnav__btn mnav__item" style={stagger(nav.length)} href={bookingUrl}>Schedule Now</a>
        <a className="mnav__phone mnav__item" style={stagger(nav.length + 1)} href={phoneHref}>Call {phone}</a>
      </div>
    </div>
  );
}
