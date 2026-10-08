// Keep this import first: it loads globals.css and the shell / shared-UI /
// motion CSS Modules as ONE render-blocking sheet. See
// components/ui/systemStyles.ts.
import '@/components/ui/systemStyles';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import Nav from '@/components/Nav';
import { navFeatureMedia } from '@/components/nav/navFeatureMedia';
import Footer from '@/components/Footer';
import { SectionJump } from '@/components/nav/SectionJump';
import { PageTransition } from '@/components/PageTransition';
import { CompareTray } from '@/components/compare/CompareTray';
import { JsonLd } from '@/components/ui/JsonLd';
import { VercelInsights } from '@/components/VercelInsights';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_TITLE, SITE_URL, SEARCH_PATH } from '@/lib/site';

// All three faces are self-hosted from OFL sources (license in
// app/fonts/OFL.txt) and split into two files per face with unicode-range:
//  - "core": Basic Latin plus the punctuation the site actually prints
//    (· – — ’ “ ” … × © ® ° • − ™, nbsp). Every page downloads only this.
//  - "rest": the remaining Latin-1 / Western glyphs (accented letters, €,
//    guillemets...). The browser fetches it only if a page renders one of
//    those characters, so nothing ever falls back to a different family.
// Mobile Lighthouse puts every font requested before first paint on the
// critical path (fonts are VeryHigh priority), so these bytes are paid on
// every route: the split cut them from ~94KB (~136KB with the italic) to
// ~67KB (~97KB). Subsets are rebuilt with fontTools pyftsubset, keeping all
// layout features and the variation axes:
//  - Fraunces upright: opsz + wght (300-700) variable, SOFT pinned at 40
//    (instanced earlier with `fonttools varLib.instancer <upright> SOFT=40
//    wght=300:700`; the CSS asks for 30-60, invisible at text sizes).
//  - Fraunces italic: static wght 300 / SOFT 100 / WONK 1 instance with opsz
//    kept variable - the only italic the design uses (editorial <em>
//    accents). It loads only when italic text renders. Declared for 300-700
//    so an italic set heavier never gets a synthesized faux-bold.
//  - Instrument Sans: wght 400-700 variable (the latin file Google Fonts
//    serves). Its family keeps the name "instrumentSans" that next/font
//    derives from the const below, so --font-instrument resolves to it.
// Fraunces faces all declare the family "Fraunces", so the browser merges
// them into one family and `font-style: italic` picks the italic files with
// no extra CSS. Preloading: only the upright Fraunces core (~45KB, the face
// of every LCP headline) is preloaded. With CSS shipped as <link> files
// (next.config: inlineCss is off) the faces were otherwise discovered only
// after the render-blocking sheets parsed, which put 3+ s of render delay on
// text LCP elements under mobile throttling. (An earlier preload delayed first
// paint, but that was measured while the CSS was inlined.) Instrument Sans
// and the italic / "rest" files stay unpreloaded so they never compete with
// the CSS. display: swap + adjustFontFallback (a Times New Roman / Arial
// fallback sized to each face's metrics) keep the swap shift-free; the
// "rest" files skip their own fallback face since they share the core's.
// next/font only accepts literal option values, so the unicode-range strings
// are written out in each call (core range identical in every face).
const fraunces = localFont({
  src: [{ path: './fonts/fraunces-upright-core.woff2', weight: '300 700', style: 'normal' }],
  declarations: [
    { prop: 'font-family', value: 'Fraunces' },
    { prop: 'unicode-range', value: 'U+0020-007E, U+00A0, U+00A9, U+00AE, U+00B0, U+00B7, U+00D7, U+2013-2014, U+2018-2019, U+201C-201D, U+2022, U+2026, U+2122, U+2212' },
  ],
  display: 'swap',
  preload: true,
  adjustFontFallback: 'Times New Roman',
  variable: '--font-fraunces',
});

const frauncesRest = localFont({
  src: [{ path: './fonts/fraunces-upright-rest.woff2', weight: '300 700', style: 'normal' }],
  declarations: [
    { prop: 'font-family', value: 'Fraunces' },
    { prop: 'unicode-range', value: 'U+00A1-00A8, U+00AA-00AD, U+00AF, U+00B1-00B6, U+00B8-00D6, U+00D8-00FF, U+0131, U+0152-0153, U+02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303-0304, U+0308, U+201A, U+201E, U+2032-2033, U+2039-203A, U+2044, U+20AC, U+2215' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-fraunces-rest',
});

const frauncesItalic = localFont({
  src: [{ path: './fonts/fraunces-italic-core.woff2', weight: '300 700', style: 'italic' }],
  declarations: [
    { prop: 'font-family', value: 'Fraunces' },
    { prop: 'unicode-range', value: 'U+0020-007E, U+00A0, U+00A9, U+00AE, U+00B0, U+00B7, U+00D7, U+2013-2014, U+2018-2019, U+201C-201D, U+2022, U+2026, U+2122, U+2212' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-fraunces-italic',
});

const frauncesItalicRest = localFont({
  src: [{ path: './fonts/fraunces-italic-rest.woff2', weight: '300 700', style: 'italic' }],
  declarations: [
    { prop: 'font-family', value: 'Fraunces' },
    { prop: 'unicode-range', value: 'U+00A1-00A8, U+00AA-00AD, U+00AF, U+00B1-00B6, U+00B8-00D6, U+00D8-00FF, U+0131, U+0152-0153, U+02BC, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303-0304, U+0308, U+201A, U+201E, U+2032-2033, U+2039-203A, U+2044, U+20AC, U+2215, U+0323' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-fraunces-italic-rest',
});

const instrumentSans = localFont({
  src: [{ path: './fonts/instrument-sans-core.woff2', weight: '400 700', style: 'normal' }],
  declarations: [{ prop: 'unicode-range', value: 'U+0020-007E, U+00A0, U+00A9, U+00AE, U+00B0, U+00B7, U+00D7, U+2013-2014, U+2018-2019, U+201C-201D, U+2022, U+2026, U+2122, U+2212' }],
  display: 'swap',
  preload: false,
  adjustFontFallback: 'Arial',
  variable: '--font-instrument',
});

const instrumentSansRest = localFont({
  src: [{ path: './fonts/instrument-sans-rest.woff2', weight: '400 700', style: 'normal' }],
  declarations: [
    { prop: 'font-family', value: 'instrumentSans' },
    { prop: 'unicode-range', value: 'U+00A1-00A3, U+00A5, U+00A7-00A8, U+00AA-00AB, U+00AF, U+00B4, U+00B6, U+00B8, U+00BA-00BB, U+00BF-00D6, U+00D8-00FF, U+0102, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+0300-0301, U+0303-0304, U+0308, U+201A, U+201E, U+2039-203A, U+20AC, U+2191, U+2193' },
  ],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  variable: '--font-instrument-rest',
});

/**
 * Every face's variable class, so each @font-face rule ships with the layout.
 * Only --font-fraunces and --font-instrument are read by CSS; the others are
 * there so no face is dropped (a font's className would set font-family).
 */
const FONT_CLASSES = [fraunces, frauncesRest, frauncesItalic, frauncesItalicRest, instrumentSans, instrumentSansRest].map((f) => f.variable);

const DEFAULT_TITLE = SITE_TITLE;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: '/',
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  // Card type only: title, description and image auto-fill from each page's
  // openGraph (Next copies them when twitter does not set its own).
  twitter: {
    card: 'summary_large_image',
  },
  appleWebApp: {
    capable: true,
    title: 'Mattress Match',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false, date: false, address: false, email: false },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#050b16',
};

const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
};

const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_TAGLINE,
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}${SEARCH_PATH}?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
};

// Vercel Web Analytics / Speed Insights load their scripts from /_vercel/*,
// which only exists on a Vercel deployment. Mounting them anywhere else
// (`next start`, other hosts) produces 404s and MIME-type console errors.
const ON_VERCEL = Boolean(process.env.VERCEL);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={FONT_CLASSES.join(' ')}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Nav featureMedia={navFeatureMedia()} />
        <main id="main-content" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <SectionJump />
        <Footer />
        <CompareTray />
        <JsonLd data={organizationLd} />
        <JsonLd data={websiteLd} />
        {ON_VERCEL ? <VercelInsights /> : null}
      </body>
    </html>
  );
}
