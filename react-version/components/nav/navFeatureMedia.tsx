import type { ReactNode } from 'react';
import { NAV_MENU } from '@/lib/site';
import { MattressRender } from '@/components/ui/MattressRender';

export type NavFeatureMedia = Record<string, ReactNode>;

/**
 * The mega-panel feature stills, rendered on the SERVER (called from the
 * root layout) and handed to the client <Nav> as ready-made elements.
 * Rendering MattressRender inside the client NavDesktopMenu instead pulled
 * the whole still manifest (blur data URLs), the SVG illustration and the
 * still picker into the first-load JS of every route; as server output only
 * the small RenderStillImage client island ships.
 */
export function navFeatureMedia(): NavFeatureMedia {
  const media: NavFeatureMedia = {};
  for (const item of NAV_MENU) {
    if (!item.feature) continue;
    const { still } = item.feature;
    media[item.id] = <MattressRender type={still.type} aspect={still.aspect} seed={still.type} fill sizes="(min-width: 1080px) 420px, 1px" objectPosition="50% 60%" />;
  }
  return media;
}
