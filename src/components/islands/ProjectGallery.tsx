import './ProjectGallery.css';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';

/** `src` is the full-size photo (lightbox); `thumb`, if given, is the smaller one shown in the slider. */
export interface Project { src: string; thumb?: string; alt: string; caption: string }

const AUTOPLAY_MS = 4500;
/** Slides further than this from the front one are hidden. */
const VISIBLE = 3;

/** Shortest signed distance from the front slide, so the ring loops in both directions. */
const offsetOf = (i: number, active: number, n: number) => {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
};

// 3D coverflow: the front photo faces the viewer, the rest turn away and recede on either side.
// Click the front photo for the lightbox (a native <dialog>); click a side photo to bring it forward.
// Without JavaScript the front photo is a plain link to the full image.
export default function ProjectGallery({ items }: { items: Project[] }) {
  const n = items.length;
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false); // hover, focus, drag or off-screen
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const frontRef = useRef<HTMLAnchorElement>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);
  const step = useCallback((d: number) => setActive((a) => (a + d + n) % n), [n]);

  // Reduced motion: no autoplay.
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) setPlaying(false);
  }, []);

  // Pause while the carousel is off-screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPaused((p) => (e.isIntersecting ? p && el.matches(':hover, :focus-within') : true)));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!playing || paused || lightbox) return;
    const t = window.setTimeout(() => { if (!document.hidden) step(1); }, AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, paused, lightbox, active, step]);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (lightbox && !dlg.open) dlg.showModal();
    if (!lightbox && dlg.open) { dlg.close(); frontRef.current?.focus(); }
  }, [lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, step]);

  // Swipe or drag the stage to change slides; a drag never counts as a click.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { x: e.clientX, moved: false };
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 40) { d.moved = true; step(dx < 0 ? 1 : -1); }
    window.setTimeout(() => { drag.current = null; }, 0);
  };
  const swallowDragClick = (e: MouseEvent) => { if (drag.current?.moved) { e.preventDefault(); e.stopPropagation(); } };

  // The front photo tilts toward the pointer.
  const onTilt = (e: PointerEvent<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--tx', String((e.clientX - r.left) / r.width - 0.5));
    e.currentTarget.style.setProperty('--ty', String((e.clientY - r.top) / r.height - 0.5));
  };
  const resetTilt = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--tx', '0');
    e.currentTarget.style.setProperty('--ty', '0');
  };

  const current = items[active];

  return (
    <>
      <div
        ref={rootRef}
        className="cf"
        role="region"
        aria-roledescription="carousel"
        aria-label="Project photos"
        data-reveal="fade-up"
        suppressHydrationWarning
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
        }}
      >
        <div className="cf__stage" onPointerDown={onPointerDown} onPointerUp={onPointerUp}
          onPointerCancel={() => { drag.current = null; }} onClickCapture={swallowDragClick}>
          <ul className="cf__track">
            {items.map((p, i) => {
              const o = offsetOf(i, active, n);
              const abs = Math.abs(o);
              const isFront = o === 0;
              const style = { '--o': o, '--abs': abs, '--s': Math.sign(o), zIndex: 20 - abs } as CSSProperties;
              return (
                <li key={p.src} className="cf__slide" data-front={isFront} data-hidden={abs > VISIBLE}
                  role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`} aria-hidden={!isFront} style={style}>
                  {isFront ? (
                    <a ref={frontRef} className="cf__card" href={p.src} draggable={false}
                      onClick={(e) => { e.preventDefault(); setLightbox(true); }}
                      onPointerMove={onTilt} onPointerLeave={resetTilt}
                      aria-label={`Open larger image: ${p.alt}`}>
                      <img src={p.thumb ?? p.src} alt={p.alt} width={600} height={750} decoding="async" draggable={false} />
                      <span className="cf__tag">
                        <span className="cf__pin" aria-hidden="true" /><span className="cf__tag-text">{p.caption}</span>
                        <span className="cf__zoom" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        </span>
                      </span>
                    </a>
                  ) : (
                    <button type="button" className="cf__card" tabIndex={-1} onClick={() => go(i)}>
                      <img src={p.thumb ?? p.src} alt="" width={600} height={750} loading="lazy" decoding="async" draggable={false} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="cf__controls">
          <button type="button" className="cf__btn" onClick={() => step(-1)} aria-label="Previous photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="cf__meta">
            <p className="cf__caption" aria-live={playing ? 'off' : 'polite'}>{current.caption}</p>
            <div className="cf__progress" aria-hidden="true">
              <span className="cf__count">{String(active + 1).padStart(2, '0')}</span>
              <span className="cf__bar"><span style={{ width: `${((active + 1) / n) * 100}%` }} /></span>
              <span className="cf__count">{String(n).padStart(2, '0')}</span>
            </div>
          </div>
          <button type="button" className="cf__btn" onClick={() => step(1)} aria-label="Next photo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <button type="button" className="cf__btn cf__btn--play" onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} aria-pressed={!playing}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>}
          </button>
        </div>
      </div>

      <dialog ref={dialogRef} className="lightbox" aria-label="Project photo" onClose={() => setLightbox(false)}
        onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}>
        {lightbox && (
          <figure>
            <img src={current.src} alt={current.alt} />
            <figcaption>{current.caption} <span>{active + 1} of {n}</span></figcaption>
          </figure>
        )}
        <button type="button" className="lightbox__btn lightbox__close" onClick={() => setLightbox(false)} aria-label="Close">×</button>
        <button type="button" className="lightbox__btn lightbox__prev" onClick={() => step(-1)} aria-label="Previous photo">‹</button>
        <button type="button" className="lightbox__btn lightbox__next" onClick={() => step(1)} aria-label="Next photo">›</button>
      </dialog>
    </>
  );
}
