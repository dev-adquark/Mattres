'use client';

import { useRouter } from 'next/navigation';
import { Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { compareHref, setCompareIds } from '@/lib/compareStore';
import { track, EVENTS } from '@/lib/analytics';

interface CompareLineupButtonProps {
  ids: readonly string[];
  labels: Readonly<Record<string, string>>;
  brand: string;
}

/**
 * Replaces the compare selection with a brand's lineup (ids chosen on the
 * server by data coverage) and opens the workspace.
 */
export function CompareLineupButton({ ids, labels, brand }: CompareLineupButtonProps) {
  const router = useRouter();
  const open = () => {
    setCompareIds(ids, labels);
    track(EVENTS.COMPARISON_STARTED, { source: 'brand_lineup', brand, count: ids.length });
    router.push(compareHref(ids));
  };
  return (
    <div>
      <Button variant="secondary" onClick={open} icon={<Columns3 aria-hidden="true" />}>
        Compare the whole lineup ({ids.length})
      </Button>
    </div>
  );
}
