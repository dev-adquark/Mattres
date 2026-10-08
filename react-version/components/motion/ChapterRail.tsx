'use client';

import { useEffect, useState, type ElementType } from 'react';
import { cx } from '@/components/ui/cx';
import { chapterRail as s } from '@/components/ui/systemStyles';

export interface ChapterDef {
  id: string;
  label: string;
}

/** The six homepage chapters (brief v3 section 10). */
export const HOME_CHAPTERS: ChapterDef[] = [
  { id: 'discover', label: 'Discover' },
  { id: 'understand', label: 'Understand' },
  { id: 'match', label: 'Match' },
  { id: 'inspect', label: 'Inspect' },
  { id: 'compare', label: 'Compare' },
  { id: 'choose', label: 'Choose' },
];

/**
 * Chapter marker placed at the start of a chapter section:
 *   <Chapter index={2} label="Understand" />  ->  "02 — Understand"
 * Purely typographic (aria-hidden number, visible label). The chapter's
 * section must carry the matching id (ChapterRail links to #id).
 */
interface ChapterProps {
  index: number | string;
  label: string;
  className?: string;
  as?: ElementType;
}

export function Chapter({ index, label, className, as: Tag = 'p' }: ChapterProps) {
  return (
    <Tag className={cx(s.marker, className)} data-chapter-marker="">
      <span className={s.index} aria-hidden="true">
        {String(index).padStart(2, '0')}
      </span>
      <span className={s.rule} aria-hidden="true" />
      <span>{label}</span>
    </Tag>
  );
}

/**
 * Fixed chapter rail for long story pages (homepage). Desktop (>= 1200px):
 * vertical rail at the left edge, labels reveal on hover/focus, the active
 * chapter is marked with a signal-amber tick and aria-current="location".
 * Below 1200px the rail is hidden (it would sit on top of content);
 * the in-section <Chapter> markers carry the chapter on small screens.
 * Uses mix-blend-mode: difference so it reads on dark and light chapters.
 * Hidden until the first chapter enters the viewport.
 *
 * Props: chapters ([{id,label}], default HOME_CHAPTERS - each id must be a
 * section id on the page), label ('Chapters'), className.
 */
interface ChapterRailProps {
  /** Each id must be a section id on the page. */
  chapters?: ChapterDef[];
  label?: string;
  className?: string;
}

export function ChapterRail({ chapters = HOME_CHAPTERS, label = 'Chapters', className }: ChapterRailProps) {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const els = chapters.map((c) => document.getElementById(c.id)).filter((el): el is HTMLElement => el !== null);
    if (!els.length) return undefined;
    const visible = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
        // Active = the last chapter whose section crosses the viewport middle.
        let idx = -1;
        chapters.forEach((c, i) => {
          if (visible.get(c.id)) idx = i;
        });
        setActive(idx);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [chapters]);

  const current = chapters[active];
  return (
    <nav className={cx(s.rail, className)} aria-label={label} data-visible={active >= 0 ? 'true' : 'false'}>
      <ol className={s.list}>
        {chapters.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} className={s.link} aria-current={i === active ? 'location' : undefined}>
              <span className={s.num} aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className={s.label}>{c.label}</span>
            </a>
          </li>
        ))}
      </ol>
      {current ? (
        <p className={s.compact} aria-hidden="true">
          <span>{String(active + 1).padStart(2, '0')}</span> {current.label}
        </p>
      ) : null}
    </nav>
  );
}
