import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from './cx';

export type SectionMood = 'cinematic' | 'deep' | 'editorial' | 'linen' | 'sand' | 'product' | 'neutral' | 'none';
export type SectionWidth = 'narrow' | 'default' | 'wide' | 'full';
export type SectionHeaderLayout = 'left' | 'center' | 'split';
type SectionTag = 'section' | 'div' | 'article' | 'aside' | 'header' | 'footer' | 'main';
type SectionTitleTag = 'h1' | 'h2' | 'h3';

export interface SectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  mood?: SectionMood;
  width?: SectionWidth;
  header?: SectionHeaderLayout;
  eyebrow?: ReactNode;
  title?: ReactNode;
  titleAs?: SectionTitleTag;
  titleClassName?: string;
  intro?: ReactNode;
  actions?: ReactNode;
  tight?: boolean;
  spacious?: boolean;
  navTheme?: 'dark';
  as?: SectionTag;
  containerClassName?: string;
}

/**
 * Page section with a mood, a container and an optional header.
 *
 * mood: 'cinematic' (Night Ink + one moonlight glow) | 'deep' (flat Deep
 *       Night, for a second dark section) | 'editorial' (warm white, default)
 *       | 'linen' (Bedding Linen) | 'sand' (Warm Sand, use sparingly) |
 *       'product' (paper, clean product visuals) | 'neutral' (cool fog,
 *       comparison/utility) | 'none' (inherit)
 * tight / spacious: section rhythm (--section-y-sm / --section-y-lg).
 * width: 'narrow' | 'default' | 'wide' | 'full' (no container)
 * header: 'left' (default) | 'center' | 'split' (title left, intro right on desktop)
 * titleAs: heading tag for the title ('h2' default; use 'h1' only for a page's first section)
 * navTheme: 'dark' marks a first-on-page dark hero so the header overlays it transparently.
 */
export function Section({
  id,
  mood = 'editorial',
  width = 'default',
  header = 'left',
  eyebrow,
  title,
  titleAs: Title = 'h2',
  titleClassName,
  intro,
  actions,
  tight = false,
  spacious = false,
  navTheme,
  as: Tag = 'section',
  className,
  containerClassName,
  children,
  ...rest
}: SectionProps) {
  const titleId = id && title ? `${id}-title` : undefined;
  const moodClass = mood === 'none' ? null : mood === 'linen' ? 'section--editorial section--linen' : `section--${mood}`;
  const hasHeader = eyebrow || title || intro || actions;

  const headerEl = hasHeader ? (
    <header className={cx('section__header', header !== 'left' && `section__header--${header}`)}>
      {eyebrow ? <p className="eyebrow section__eyebrow">{eyebrow}</p> : null}
      {title ? (
        <Title id={titleId} className={cx(Title === 'h1' ? null : 'section__title', titleClassName)}>
          {title}
        </Title>
      ) : null}
      {intro ? <div className="section__intro">{typeof intro === 'string' ? <p>{intro}</p> : intro}</div> : null}
      {actions ? <div className="section__actions">{actions}</div> : null}
    </header>
  ) : null;

  const inner =
    width === 'full' ? (
      <>
        {headerEl ? <div className="container">{headerEl}</div> : null}
        {children}
      </>
    ) : (
      <div className={cx('container', width !== 'default' && `container--${width}`, containerClassName)}>
        {headerEl}
        {children}
      </div>
    );

  return (
    <Tag
      id={id}
      className={cx('section', moodClass, tight && 'section--tight', spacious && 'section--spacious', className)}
      aria-labelledby={Tag === 'section' ? titleId : undefined}
      data-nav-theme={navTheme}
      {...rest}
    >
      {inner}
    </Tag>
  );
}
