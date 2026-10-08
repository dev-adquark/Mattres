import Link from 'next/link';
import { cx } from '@/components/ui/cx';
import { EDITORIAL_BYLINE } from '@/lib/content/guides';
import type { ArticleContext, ArticleModule, ArticleSection } from '@/lib/content/types';
import { GuideToc } from './GuideToc';
import styles from './Content.module.css';

interface GuideArticleProps {
  article: ArticleModule;
  ctx: ArticleContext;
}

function GuideSectionBody({ section, ctx }: { section: ArticleSection; ctx: ArticleContext }) {
  return (
    <>
      <h2 id={section.id}>{section.title}</h2>
      {section.render(ctx)}
    </>
  );
}

/** The article body: sticky/collapsible TOC, key takeaways, sections, sources and method note. */
export function GuideArticle({ article, ctx }: GuideArticleProps) {
  const toc = article.sections.map(({ id, title }) => ({ id, title }));
  return (
    <section className={cx('section section--editorial section--flush-top', styles.articleSection)} aria-label="Article">
      <div className="container container--wide">
        <div className={styles.articleGrid}>
          <div className={styles.tocCol}>
            <GuideToc items={toc} />
          </div>
          <article id="guide-article" className={styles.article}>
            <aside className={styles.takeaways} aria-labelledby="takeaways-title">
              <h2 id="takeaways-title" className={styles.takeawaysTitle}>
                Key takeaways
              </h2>
              <ul>
                {article.takeaways.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </aside>

            <div className={cx('prose', styles.prose)}>
              {article.sections.map((s) => (
                <GuideSectionBody key={s.id} section={s} ctx={ctx} />
              ))}
            </div>

            <footer className={styles.articleFoot}>
              {article.sources && article.sources.length ? (
                <div>
                  <h2 className={styles.footTitle}>Sources and further reading</h2>
                  <ul className={styles.sourceList}>
                    {article.sources.map((src) => (
                      <li key={src.href}>
                        <a href={src.href} className="link" target="_blank" rel="noopener noreferrer">
                          {src.label}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div>
                <h2 className={styles.footTitle}>How this guide was made</h2>
                <p>
                  Written and published by {EDITORIAL_BYLINE}. Where this guide describes how mattresses are scored, it quotes the
                  published rules of scoring model v{ctx.rules.version}; the full model is on{' '}
                  <Link href="/methodology" className="link">
                    How It Works
                  </Link>
                  . We have not lab-tested any mattress ourselves, and this guide is not medical advice.
                </p>
              </div>
            </footer>
          </article>
        </div>
      </div>
    </section>
  );
}
