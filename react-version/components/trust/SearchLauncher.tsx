'use client';

import { Search } from 'lucide-react';
import { openSiteSearch } from '@/components/search/searchEvents';
import { buttonClassName } from '@/components/ui/Button';

interface SearchLauncherProps {
  label?: string;
  /** Replaces the default large on-dark button look. */
  className?: string;
}

/** Opens the site-wide search dialog (mounted in the header). */
export function SearchLauncher({ label = 'Search the site', className }: SearchLauncherProps) {
  return (
    <button type="button" className={className || buttonClassName({ variant: 'onDark', size: 'lg' })} onClick={() => openSiteSearch()}>
      <Search aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
