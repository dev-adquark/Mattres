import type { Metadata } from 'next';
import { SHARE_IMAGE } from '@/lib/site';
import Link from 'next/link';
import { PolicyPage, type PolicySection } from '@/components/trust/PolicyPage';
import { POLICY_UPDATED } from '@/components/trust/trustConfig';

const TITLE = 'Terms';
const DESCRIPTION =
  'The terms for using Mattress Match Score: what the score is and is not, data accuracy, links to other sites and fair use of the site.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/terms' },
  openGraph: { title: 'Terms · Mattress Match Score', description: DESCRIPTION, url: '/terms', type: 'website', images: [SHARE_IMAGE] },
};

const SECTIONS: readonly PolicySection[] = [
  {
    id: 'what-it-is',
    title: 'What this site is',
    body: (
      <p>
        Mattress Match Score compares the mattresses in its catalog against the sleep profile you describe and shows a
        rules-based score with the reasons behind it. It is a free decision aid. It doesn&apos;t sell mattresses, and using
        it doesn&apos;t create any account or agreement beyond these terms.
      </p>
    ),
  },
  {
    id: 'no-guarantee',
    title: 'A score is not a guarantee',
    body: (
      <p>
        A Match Score is the scoring rules applied to the data on file. It can&apos;t promise that you will find a
        mattress comfortable: feel is personal, and some of the data is estimated (always labeled). Use the
        manufacturer&apos;s trial period to decide. The method and its limits are set out in full on{' '}
        <Link href="/methodology">How it works</Link>.
      </p>
    ),
  },
  {
    id: 'not-medical',
    title: 'Not medical advice',
    body: (
      <p>
        Answers about discomfort only change how much each dimension counts. Nothing on this site diagnoses, treats or
        prevents any condition. If you have persistent pain or a sleep problem, talk to a qualified clinician.
      </p>
    ),
  },
  {
    id: 'accuracy',
    title: 'Data accuracy',
    body: (
      <>
        <p>
          Specs and prices are checked against the manufacturer&apos;s own page (or the retailer listing a mattress page names), and each mattress page shows when. A
          mattress is labeled Verified only when every required spec is on file with a source and a check date;
          anything else carries a label saying what is missing.
        </p>
        <p>
          Prices, trials and warranties change without notice. Always confirm them on the brand&apos;s site before you
          buy. If you spot an error, please report it (see below).
        </p>
      </>
    ),
  },
  {
    id: 'links',
    title: 'Links to other sites',
    body: (
      <p>
        Links to brands and review sources go to sites we don&apos;t control. Their content, prices and policies are their
        own. Today none of those links earns us anything; see the <Link href="/disclosures">disclosures</Link>.
      </p>
    ),
  },
  {
    id: 'fair-use',
    title: 'Fair use',
    body: (
      <ul>
        <li>Use the site and its match service for your own research, at a normal pace. Requests are rate-limited.</li>
        <li>Don&apos;t try to disrupt the service, get around its limits or access parts of it that aren&apos;t public.</li>
        <li>
          Brand and product names belong to their owners and are used only to identify the products. Photos credited
          to RTINGS belong to RTINGS. The mattress illustrations, text and scoring method are this site&apos;s own.
        </li>
      </ul>
    ),
  },
  {
    id: 'liability',
    title: 'As is',
    body: (
      <p>
        The site is provided as is, without warranties of any kind. To the extent the law allows, we are not liable for
        decisions made using it, including a purchase that doesn&apos;t suit you.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: (
      <p>
        If these terms change, the date at the top of this page changes with them. Continuing to use the site after a
        change means you accept the updated terms.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <PolicyPage
      path="/terms"
      crumb="Terms"
      eyebrow="Policy"
      title={
        <>
          The terms, <em>in plain words.</em>
        </>
      }
      lead="What using this site means, what a Match Score can and can't tell you, and what we ask in return."
      updated={POLICY_UPDATED}
      summary={[
        { label: 'Cost', value: 'Free' },
        { label: 'Accounts', value: 'None needed' },
        { label: 'What a score is', value: 'Decision support, not a guarantee' },
        { label: 'Medical advice', value: 'None given' },
      ]}
      sections={SECTIONS}
      related={[
        { href: '/privacy', kicker: 'What we collect', label: 'Privacy' },
        { href: '/disclosures', kicker: 'How we stay independent', label: 'Disclosures' },
      ]}
    />
  );
}
