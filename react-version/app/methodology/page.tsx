import type { Metadata } from 'next';
import { JsonLd } from '@/components/ui/JsonLd';
import { absoluteUrl, SITE_NAME, SITE_URL, SHARE_IMAGE } from '@/lib/site';
import { getMethodologyData } from '@/components/trust/methodologyData';
import {
  MethodologyHero,
  MeaningSection,
  InputsSection,
  DimensionsSection,
  WeightsSection,
  SubScoresSection,
  CalculationSection,
  TiersSection,
  FlagsSection,
  ProvenanceSection,
  MoneySection,
  LimitationsSection,
  VersionsSection,
  MethodologyClose,
} from '@/components/trust/MethodologySections';

const TITLE = 'How the Match Score works';
const DESCRIPTION =
  'The full Match Score method: the answers that matter, the six weighted dimensions, sourced vs estimated data, fit flags, data sources, limitations and version history.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/methodology' },
  openGraph: { title: `${TITLE} · ${SITE_NAME}`, description: DESCRIPTION, url: '/methodology', type: 'article', images: [SHARE_IMAGE] },
  twitter: { title: `${TITLE} · ${SITE_NAME}`, description: DESCRIPTION },
};

// Counts and the worked example are recomputed from the catalog at most once a day.
export const revalidate = 86400;

export default async function MethodologyPage() {
  const data = await getMethodologyData();
  const pageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${absoluteUrl('/methodology')}#webpage`,
    url: absoluteUrl('/methodology'),
    name: TITLE,
    description: DESCRIPTION,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <>
      <MethodologyHero data={data} />
      <MeaningSection data={data} />
      <InputsSection data={data} />
      <DimensionsSection data={data} />
      <WeightsSection data={data} />
      <SubScoresSection data={data} />
      <CalculationSection data={data} />
      <TiersSection />
      <FlagsSection data={data} />
      <ProvenanceSection data={data} />
      <MoneySection data={data} />
      <LimitationsSection data={data} />
      <VersionsSection data={data} />
      <MethodologyClose />
      <JsonLd data={pageLd} />
    </>
  );
}
