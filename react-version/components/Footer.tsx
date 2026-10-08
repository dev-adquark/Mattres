import { FOOTER_GROUPS, SITE_NAME } from '@/lib/site';
import { Wordmark } from '@/components/ui/Wordmark';
import { IntentLink } from '@/components/ui/IntentLink';
import { CommissionLine } from '@/components/trust/CommissionLine';
import { cx } from '@/components/ui/cx';
import { footer as s } from '@/components/ui/systemStyles';

/**
 * Site footer. data-site-footer lets the header theme sampler (Nav) treat it
 * as a dark block. Links prefetch on intent only (IntentLink): the footer is
 * on every page, so viewport prefetching would preload other routes' CSS.
 */
export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={cx(s.footer, 'section--cinematic')} aria-labelledby="site-footer-title" data-site-footer="">
      <div className="container container--wide">
        <h2 id="site-footer-title" className="sr-only">
          Site footer
        </h2>
        <div className={s.top}>
          <div>
            <Wordmark />
            <p className={s.statement}>
              Sleep is personal. <em>Your match should be too.</em>
            </p>
            <p className={s.honesty}>
              <CommissionLine />
            </p>
          </div>

          <nav className={s.nav} aria-label="Footer">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className={s.heading}>{group.title}</h3>
                <ul className={s.links}>
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <IntentLink href={link.href}>{link.label}</IntentLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className={s.bottom}>
          <p>
            © {year} {SITE_NAME}. Match scores come from a deterministic model: the same sleep profile and mattress data always produce the same result. Missing
            data is shown as missing, never filled in.
          </p>
          <p>
            <IntentLink href="/methodology" className="link">
              How scoring works
            </IntentLink>
          </p>
        </div>
      </div>
    </footer>
  );
}
