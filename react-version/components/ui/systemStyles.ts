/**
 * The site-wide stylesheet, as ONE module.
 *
 * app/layout.tsx imports this module first, and every shell / shared-UI
 * component reads its CSS Module class map from here (never from its own
 * `.module.css` file). That gives Turbopack one module and one fixed CSS order
 * for all of these styles on every route, so `experimental.cssChunking:
 * 'graph'` emits them as a single render-blocking sheet: global tokens and
 * base styles, the shell (Nav, Footer, search, compare tray), the shared UI
 * kit and the motion primitives.
 *
 * Why: when each component imported its own module, client components (Nav,
 * SearchDialog, CompareToggle...) and server pages pulled the same files in
 * different orders. The graph chunker can only merge files whose order agrees
 * on every route, so the shell was cut into 7-10 sheets per route, and
 * route-only modules (Brands, Content/Hub, Catalog, CategoryPage) were packed
 * in with them, blocking unrelated pages (certification: mobile LCP
 * 3.2-4.1 s, 230-355 KB of CSS per route). With this barrel /find-match
 * blocks on 3 sheets instead of 8.
 *
 * Rules (guarded by components/ui/systemStyles.test.ts):
 * - A component whose module is re-exported here imports the class map from
 *   '@/components/ui/systemStyles', not from './X.module.css'.
 * - Only CSS that (nearly) every route renders belongs here; it ships on
 *   every page. Route-only styles stay in their own module next to the route.
 * - Order is cascade order (all modules sit in @layer components, after
 *   globals.css): keep globals.css first, append new entries at the end.
 *
 * The side-effect imports at the end are small modules owned by other areas
 * that every route loads (root error / not-found states, the sponsored tag
 * inside ProductCard). Importing them here first pins their position in the
 * same sheet; their components keep importing them directly.
 */
import '@/app/globals.css';

import button from './Button.module.css';
import magnetic from './Magnetic.module.css';
import iconButton from './IconButton.module.css';
import wordmark from './Wordmark.module.css';
import mattressRender from './MattressRender.module.css';
import renderStill from './render-stills/RenderStill.module.css';
import nav from '../Nav.module.css';
import searchDialog from '../search/SearchDialog.module.css';
import footer from '../Footer.module.css';
import compareTray from '../compare/CompareTray.module.css';
import badge from './Badge.module.css';
import breadcrumbs from './Breadcrumbs.module.css';
import dataValue from './DataValue.module.css';
import deviceDataPanel from './DeviceDataPanel.module.css';
import emptyState from './EmptyState.module.css';
import skeleton from './Skeleton.module.css';
import reveal from './Reveal.module.css';
import scoreRing from './ScoreRing.module.css';
import scoreBars from './ScoreBars.module.css';
import riskFlagList from './RiskFlagList.module.css';
import compareToggle from '../compare/CompareToggle.module.css';
import productCard from './ProductCard.module.css';
import slider from '../motion/Slider.module.css';
import scrollProgress from '../motion/ScrollProgress.module.css';
import stickyStory from '../motion/StickyStory.module.css';
import chapterRail from '../motion/ChapterRail.module.css';

import '../trust/SponsoredTag.module.css';
import '../trust/ErrorStates.module.css';
import '../catalog/CategoryState.module.css';

export {
  button,
  magnetic,
  iconButton,
  wordmark,
  mattressRender,
  renderStill,
  nav,
  searchDialog,
  footer,
  compareTray,
  badge,
  breadcrumbs,
  dataValue,
  deviceDataPanel,
  emptyState,
  skeleton,
  reveal,
  scoreRing,
  scoreBars,
  riskFlagList,
  compareToggle,
  productCard,
  slider,
  scrollProgress,
  stickyStory,
  chapterRail,
};
