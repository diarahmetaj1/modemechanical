import './ProjectGallery.css';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';

export interface Project { src: string; alt: string; caption: string }

// Reproduces the live site's Magnific Popup lightbox with a native <dialog>.
// Without JavaScript each thumbnail is a plain link to the full image.
export default function ProjectGallery({ items }: { items: Project[] }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const open = (i: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    openerRef.current = e.currentTarget;
    setIndex(i);
  };
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? i : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (index !== null && !dlg.open) dlg.showModal();
    if (index === null && dlg.open) { dlg.close(); openerRef.current?.focus(); }
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, step]);

  const current = index === null ? null : items[index];

  return (
    <>
      <ul className="gallery">
        {items.map((p, i) => (
          // The page's reveal script may add a class before hydration; that is expected.
          <li key={p.src} suppressHydrationWarning data-reveal="fade-up" style={{ '--reveal-delay': `${(i % 3) * 0.2}s` } as CSSProperties}>
            <a href={p.src} onClick={open(i)} aria-label={`Open larger image: ${p.alt}`}>
              <img src={p.src} alt={p.alt} width={600} height={600} loading="lazy" decoding="async" />
            </a>
            <p>{p.caption}</p>
          </li>
        ))}
      </ul>

      <dialog ref={dialogRef} className="lightbox" aria-label="Project photo" onClose={close}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {current && (
          <figure>
            <img src={current.src} alt={current.alt} />
            <figcaption>{current.caption} <span>{(index ?? 0) + 1} of {items.length}</span></figcaption>
          </figure>
        )}
        <button type="button" className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">×</button>
        <button type="button" className="lightbox__btn lightbox__prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
        <button type="button" className="lightbox__btn lightbox__next" onClick={() => step(1)} aria-label="Next photo">›</button>
      </dialog>
    </>
  );
}
