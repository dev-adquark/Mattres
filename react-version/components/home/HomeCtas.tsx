import { Button } from '@/components/ui/Button';

/** The homepage's primary CTA pair (hero and closing line). Rendered inside the caller's own actions wrapper. */
export function HomeCtas({ ghostClassName }: { ghostClassName?: string }) {
  return (
    <>
      <Button href="/find-match" size="lg" arrow magnetic>
        Find My Match
      </Button>
      <Button href="/mattresses" size="lg" variant="ghost" className={ghostClassName}>
        Explore Mattresses
      </Button>
    </>
  );
}
