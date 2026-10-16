import './ProjectGallery.css';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';

/** One photo, prepared at build time: AVIF and WebP srcsets plus a JPEG fallback. */
export interface GalleryImage { avif: string; webp: string; src: string; width: number; height: number; alt: string; position?: string }
export interface GalleryProject { slug: string; title: string; location?: string; description: string; photos: GalleryImage[] }

const AUTOPLAY_MS = 4500;
/** Slides further than this from the front one are hidden. */
const VISIBLE = 3;
const SLIDE_SIZES = '(max-width: 640px) 64vw, 380px';
const CARD_SIZES = '(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 400px';

/** Shortest signed distance from the front slide, so the ring loops in both directions. */
const offsetOf = (i: number, active: number, n: number) => {
  let d = i - active;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
};

const photoCount = (n: number) => `${n} photo${n === 1 ? '' : 's'}`;

function Pic({ img, sizes, alt = img.alt, lazy = true }: { img: GalleryImage; sizes: string; alt?: string; lazy?: boolean }) {
  return (
    <picture>
      <source type="image/avif" srcSet={img.avif} sizes={sizes} />
      <source type="image/webp" srcSet={img.webp} sizes={sizes} />
      <img src={img.src} alt={alt} width={img.width} height={img.height} style={img.position ? { objectPosition: img.position } : undefined}
        loading={lazy ? 'lazy' : undefined} decoding="async" draggable={false} />
    </picture>
  );
}

// 3D coverflow of projects (front project faces the viewer, the rest turn away on either side),
// the front project's details below it, and a grid of every project. Photos open in a lightbox
// (a native <dialog>) that steps through each project's photos and on to the next project.
export default function ProjectGallery({ projects }: { projects: GalleryProject[] }) {
  const n = projects.length;
  const [active, setActive] = useState(0);
  const [view, setView] = useState<{ p: number; i: number } | null>(null); // open lightbox photo
  const [playing, setPlaying] = useState(true);
  const [paused, setPaused] = useState(false); // hover, focus, drag or off-screen
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ x: number; moved: boolean } | null>(null);

  const go = useCallback((i: number) => setActive(((i % n) + n) % n), [n]);
  const step = useCallback((d: number) => setActive((a) => (a + d + n) % n), [n]);

  // Lightbox: next/previous photo, crossing into the next/previous project at either end.
  const stepPhoto = useCallback((d: number) => setView((v) => {
    if (!v) return v;
    const i = v.i + d;
    if (i >= 0 && i < projects[v.p].photos.length) return { p: v.p, i };
    const p = (v.p + d + n) % n;
    return { p, i: d > 0 ? 0 : projects[p].photos.length - 1 };
  }), [projects, n]);

  const open = (p: number, opener: HTMLElement, i = 0) => { openerRef.current = opener; setView({ p, i }); };
  const close = useCallback(() => setView((v) => { if (v) setActive(v.p); return null; }), []);

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
    if (!playing || paused || view) return;
    const t = window.setTimeout(() => { if (!document.hidden) step(1); }, AUTOPLAY_MS);
    return () => window.clearTimeout(t);
  }, [playing, paused, view, active, step]);

  const isOpen = view !== null;
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (isOpen && !dlg.open) dlg.showModal();
    if (!isOpen && dlg.open) { dlg.close(); openerRef.current?.focus(); }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') stepPhoto(1);
      if (e.key === 'ArrowLeft') stepPhoto(-1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, stepPhoto]);

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

  const current = projects[active];
  const shown = view ? projects[view.p] : null;
  const shownPhoto = view && shown ? shown.photos[view.i] : null;

  return (
    <>
      <div
        ref={rootRef}
        className="cf"
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured HVAC projects"
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
            {projects.map((p, i) => {
              const o = offsetOf(i, active, n);
              const abs = Math.abs(o);
              const isFront = o === 0;
              const cover = p.photos[0];
              const style = { '--o': o, '--abs': abs, '--s': Math.sign(o), zIndex: 20 - abs } as CSSProperties;
              return (
                <li key={p.slug} className="cf__slide" data-front={isFront} data-hidden={abs > VISIBLE}
                  role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${p.title}`} aria-hidden={!isFront} style={style}>
                  {isFront ? (
                    <a className="cf__card" href={cover.src} draggable={false}
                      onClick={(e) => { e.preventDefault(); open(i, e.currentTarget); }}
                      onPointerMove={onTilt} onPointerLeave={resetTilt}
                      aria-label={`View ${photoCount(p.photos.length)}: ${p.title}`}>
                      <Pic img={cover} sizes={SLIDE_SIZES} lazy={false} />
                      <span className="cf__tag">
                        <span className="cf__pin" aria-hidden="true" /><span className="cf__tag-text">{p.title}</span>
                        {p.photos.length > 1 && <span className="cf__badge">{p.photos.length}</span>}
                        <span className="cf__zoom" aria-hidden="true">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                        </span>
                      </span>
                    </a>
                  ) : (
                    <button type="button" className="cf__card" tabIndex={-1} onClick={() => go(i)}>
                      <Pic img={cover} sizes={SLIDE_SIZES} alt="" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="cf__controls">
          <button type="button" className="cf__btn" onClick={() => step(-1)} aria-label="Previous project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="cf__meta">
            <div className="cf__progress" aria-hidden="true">
              <span className="cf__count">{String(active + 1).padStart(2, '0')}</span>
              <span className="cf__bar"><span style={{ width: `${((active + 1) / n) * 100}%` }} /></span>
              <span className="cf__count">{String(n).padStart(2, '0')}</span>
            </div>
          </div>
          <button type="button" className="cf__btn" onClick={() => step(1)} aria-label="Next project">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
          <button type="button" className="cf__btn cf__btn--play" onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} aria-pressed={!playing}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>}
          </button>
        </div>

        <div className="cf__info" aria-live={playing ? 'off' : 'polite'}>
          <p className="cf__caption">{current.title}</p>
          <p className="cf__sub">{[current.location, photoCount(current.photos.length)].filter(Boolean).join(' · ')}</p>
          <p className="cf__desc">{current.description}</p>
        </div>
      </div>

      <section className="pgrid" aria-labelledby="all-projects">
        <h2 id="all-projects" className="pgrid__title">All HVAC Projects</h2>
        <ul className="pgrid__list">
          {projects.map((p, i) => (
            <li key={p.slug} className="pgrid__item" id={p.slug}>
              <button type="button" className="pgrid__media" onClick={(e) => open(i, e.currentTarget)}
                aria-label={`View ${photoCount(p.photos.length)}: ${p.title}`}>
                <Pic img={p.photos[0]} sizes={CARD_SIZES} />
                {p.photos.length > 1 && <span className="pgrid__badge">{photoCount(p.photos.length)}</span>}
              </button>
              {p.photos.length > 1 && (
                <ul className="pgrid__thumbs">
                  {p.photos.slice(1).map((ph, k) => (
                    <li key={ph.src}>
                      <button type="button" onClick={(e) => open(i, e.currentTarget, k + 1)} aria-label={`View photo ${k + 2} of ${p.photos.length}: ${ph.alt}`}>
                        <Pic img={ph} sizes="96px" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pgrid__body">
                <h3>{p.title}</h3>
                {p.location && <p className="pgrid__loc">{p.location}, NY</p>}
                <p>{p.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <dialog ref={dialogRef} className="lightbox" aria-label="Project photos" onClose={close}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
        {shown && shownPhoto && view && (
          <figure>
            <Pic img={shownPhoto} sizes="100vw" lazy={false} />
            <figcaption>
              <strong>{shown.title}</strong>
              {shown.location && <span>{shown.location}</span>}
              <span>Photo {view.i + 1} of {shown.photos.length}</span>
            </figcaption>
          </figure>
        )}
        <button type="button" className="lightbox__btn lightbox__close" onClick={close} aria-label="Close">×</button>
        <button type="button" className="lightbox__btn lightbox__prev" onClick={() => stepPhoto(-1)} aria-label="Previous photo">‹</button>
        <button type="button" className="lightbox__btn lightbox__next" onClick={() => stepPhoto(1)} aria-label="Next photo">›</button>
      </dialog>
    </>
  );
}
