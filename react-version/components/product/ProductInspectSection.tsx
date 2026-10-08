import type { MattressEntry } from '@/lib/types';
import { Section } from '@/components/ui/Section';
import { Chapter } from '@/components/motion';
import { XrayInspector } from './XrayInspector';
import { buildWord } from './productPageModel';
import { componentsFor, independentRating, mapMaterialsToLayers, type RatedDimension } from './productDisplay';
import styles from './ProductPage.module.css';

const RATED: readonly RatedDimension[] = ['heat', 'motion', 'edge', 'durability'];

/** Chapter 3: the X-ray of a typical build, with the brand's published components matched to its layers. */
export function ProductInspectSection({ entry, name }: { entry: MattressEntry; name: string }) {
  const components = componentsFor(entry);
  const layerMaterials = mapMaterialsToLayers(components, entry.type);
  const ratings = Object.fromEntries(RATED.map((d) => [d, independentRating(entry, d)])) as Record<RatedDimension, number | null>;

  return (
    <Section mood="deep" id="inspect" width="wide" className={styles.inspect} aria-labelledby="inspect-title">
      <header className={styles.inspectHead}>
        <Chapter index={2} label="Inside" />
        <h2 id="inspect-title" className={styles.inspectTitle}>
          Inspect the mattress.
        </h2>
        <p className={styles.inspectIntro}>
          A typical {buildWord(entry)} build, layer by layer. Select a layer to see what it does, which parts of {entry.brand}&apos;s published materials list
          belong to it, and how that part of the bed scores.
        </p>
      </header>
      <XrayInspector type={entry.type} brand={entry.brand} layerMaterials={layerMaterials} componentCount={components.length} ratings={ratings} mattressName={name} firmnessSource={entry.firmnessSource} />
    </Section>
  );
}
